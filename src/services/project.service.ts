import { prisma } from '../prisma.js';
import { ActivityAction, Role } from '@prisma/client';

export interface CreateProjectInput {
  name: string;
  description?: string;
  createdBy?: string;
  userRole?: Role;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  performedBy?: string;
  userRole?: Role;
}

export interface GetProjectsQuery {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  userId?: string;
  userRole?: Role;
}

export class ProjectService {
  static async createProject(input: CreateProjectInput) {
    // Only ADMIN or MANAGER can create projects
    if (input.userRole && input.userRole === Role.MEMBER) {
      throw { statusCode: 403, message: 'Members do not have permission to create projects. Contact an admin.' };
    }

    const trimmedName = input.name?.trim();
    if (!trimmedName) {
      throw { statusCode: 400, message: 'Project name is required' };
    }

    return await prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          name: trimmedName,
          description: input.description?.trim() || null,
          createdBy: input.createdBy || null,
        },
      });

      // Auto-assign creator as project member if createdBy is provided
      if (input.createdBy) {
        await tx.projectMember.create({
          data: {
            projectId: project.id,
            userId: input.createdBy,
          },
        });
      }

      await tx.activityLog.create({
        data: {
          projectId: project.id,
          performedBy: input.createdBy || null,
          action: ActivityAction.CREATE_PROJECT,
          newValue: {
            name: project.name,
            description: project.description,
          },
        },
      });

      // Create default lanes
      const defaultLanes = [
        { name: 'Todo', color: '#3b82f6', position: 65536 },
        { name: 'In Progress', color: '#f59e0b', position: 131072 },
        { name: 'Done', color: '#10b981', position: 196608 },
      ];

      for (const lane of defaultLanes) {
        const created = await tx.lane.create({
          data: {
            projectId: project.id,
            name: lane.name,
            color: lane.color,
            position: lane.position,
            createdBy: input.createdBy || null,
          },
        });

        await tx.activityLog.create({
          data: {
            projectId: project.id,
            laneId: created.id,
            performedBy: input.createdBy || null,
            action: ActivityAction.CREATE_LANE,
            newValue: {
              name: created.name,
              color: created.color,
              position: created.position,
            },
          },
        });
      }

      return project;
    });
  }

  static async getProjects(params: GetProjectsQuery) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 12));
    const skip = (page - 1) * limit;
    const search = params.search?.trim();
    const sortBy = params.sortBy || 'createdAt';
    const sortOrder = params.sortOrder === 'asc' ? 'asc' : 'desc';

    const where: any = {
      deletedAt: null,
    };

    // If user is not ADMIN, only show projects they are a member of or created
    if (params.userRole && params.userRole !== Role.ADMIN && params.userId) {
      where.OR = [
        { members: { some: { userId: params.userId } } },
        { createdBy: params.userId },
      ];
    }

    if (search) {
      const searchCondition = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
      if (where.OR) {
        where.AND = [
          { OR: where.OR },
          { OR: searchCondition },
        ];
        delete where.OR;
      } else {
        where.OR = searchCondition;
      }
    }

    const [total, items] = await Promise.all([
      prisma.project.count({ where }),
      prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                  role: true,
                },
              },
            },
          },
          _count: {
            select: {
              lanes: { where: { deletedAt: null } },
              cards: { where: { deletedAt: null } },
              members: true,
            },
          },
        },
      }),
    ]);

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getProjectById(id: string, userId?: string, userRole?: Role) {
    const project = await prisma.project.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        lanes: {
          where: { deletedAt: null },
          orderBy: { position: 'asc' },
          include: {
            _count: {
              select: { cards: { where: { deletedAt: null } } },
            },
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                role: true,
              },
            },
          },
        },
        _count: {
          select: {
            cards: { where: { deletedAt: null } },
            tags: { where: { deletedAt: null } },
            members: true,
          },
        },
      },
    });

    if (!project) {
      throw { statusCode: 404, message: 'Project not found' };
    }

    // Check if user has access to this project
    if (userRole && userRole !== Role.ADMIN && userId) {
      const isMember = project.members.some((m) => m.userId === userId);
      const isCreator = project.createdBy === userId;
      if (!isMember && !isCreator) {
        throw { statusCode: 403, message: 'You do not have access to this project' };
      }
    }

    return project;
  }

  static async updateProject(id: string, input: UpdateProjectInput) {
    const existing = await prisma.project.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw { statusCode: 404, message: 'Project not found' };
    }

    // Role check: Only ADMIN, MANAGER, or project creator can update
    if (input.userRole && input.userRole === Role.MEMBER && input.performedBy !== existing.createdBy) {
      throw { statusCode: 403, message: 'Only admins or project managers can alter project details' };
    }

    const updateData: any = {};
    if (input.name !== undefined) {
      const trimmedName = input.name.trim();
      if (!trimmedName) {
        throw { statusCode: 400, message: 'Project name cannot be empty' };
      }
      updateData.name = trimmedName;
    }
    if (input.description !== undefined) {
      updateData.description = input.description.trim() || null;
    }

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.project.update({
        where: { id },
        data: updateData,
      });

      await tx.activityLog.create({
        data: {
          projectId: id,
          performedBy: input.performedBy || null,
          action: ActivityAction.UPDATE_PROJECT,
          oldValue: {
            name: existing.name,
            description: existing.description,
          },
          newValue: {
            name: updated.name,
            description: updated.description,
          },
        },
      });

      return updated;
    });
  }

  static async deleteProject(id: string, performedBy?: string, userRole?: Role) {
    const existing = await prisma.project.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw { statusCode: 404, message: 'Project not found' };
    }

    // Role check: Only ADMIN or project creator can delete
    if (userRole && userRole !== Role.ADMIN && performedBy !== existing.createdBy) {
      throw { statusCode: 403, message: 'Only administrators or the project creator can delete this project' };
    }

    await prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          deletedBy: performedBy || null,
        },
      });

      await tx.activityLog.create({
        data: {
          projectId: id,
          performedBy: performedBy || null,
          action: ActivityAction.DELETE_PROJECT,
          oldValue: {
            name: existing.name,
          },
        },
      });
    });

    return { success: true, message: 'Project deleted successfully' };
  }
}

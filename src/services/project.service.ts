import { prisma } from '../prisma.js';
import { ActivityAction } from '@prisma/client';

export interface CreateProjectInput {
  name: string;
  description?: string;
  createdBy?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  performedBy?: string;
}

export interface GetProjectsQuery {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export class ProjectService {
  static async createProject(input: CreateProjectInput) {
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

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.project.count({ where }),
      prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: {
            select: {
              lanes: { where: { deletedAt: null } },
              cards: { where: { deletedAt: null } },
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

  static async getProjectById(id: string) {
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
        _count: {
          select: {
            cards: { where: { deletedAt: null } },
            tags: { where: { deletedAt: null } },
          },
        },
      },
    });

    if (!project) {
      throw { statusCode: 404, message: 'Project not found' };
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

  static async deleteProject(id: string, performedBy?: string) {
    const existing = await prisma.project.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw { statusCode: 404, message: 'Project not found' };
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

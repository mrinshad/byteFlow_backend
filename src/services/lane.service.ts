import { prisma } from '../prisma.js';
import { ActivityAction } from '@prisma/client';
import { emitToProject } from '../socket.js';

export interface CreateLaneInput {
  projectId: string;
  name: string;
  color?: string;
  createdBy?: string;
}

export interface UpdateLaneInput {
  name?: string;
  color?: string | null;
  performedBy?: string;
}

export interface ReorderLaneItem {
  id: string;
  position: number;
}

export class LaneService {
  static async createLane(input: CreateLaneInput) {
    const trimmedName = input.name?.trim();
    if (!trimmedName) {
      throw { statusCode: 400, message: 'Lane name is required' };
    }

    const project = await prisma.project.findFirst({
      where: { id: input.projectId, deletedAt: null },
    });

    if (!project) {
      throw { statusCode: 404, message: 'Project not found' };
    }

    // Check unique lane name within project (case-insensitive)
    const existingName = await prisma.lane.findFirst({
      where: {
        projectId: input.projectId,
        name: { equals: trimmedName, mode: 'insensitive' },
        deletedAt: null,
      },
    });

    if (existingName) {
      throw { statusCode: 400, message: `A lane named "${trimmedName}" already exists in this project` };
    }

    // Calculate position
    const lastLane = await prisma.lane.findFirst({
      where: { projectId: input.projectId, deletedAt: null },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const position = lastLane ? lastLane.position + 65536 : 65536;

    const lane = await prisma.$transaction(async (tx) => {
      const created = await tx.lane.create({
        data: {
          projectId: input.projectId,
          name: trimmedName,
          color: input.color || '#64748b',
          position,
          createdBy: input.createdBy || null,
        },
      });

      await tx.activityLog.create({
        data: {
          projectId: input.projectId,
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

      return created;
    });

    emitToProject(input.projectId, 'lane:created', lane);
    return lane;
  }

  static async getLanesByProject(projectId: string) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
    });

    if (!project) {
      throw { statusCode: 404, message: 'Project not found' };
    }

    return await prisma.lane.findMany({
      where: {
        projectId,
        deletedAt: null,
      },
      orderBy: { position: 'asc' },
      include: {
        _count: {
          select: {
            cards: { where: { deletedAt: null } },
          },
        },
      },
    });
  }

  static async getLaneById(id: string) {
    const lane = await prisma.lane.findFirst({
      where: { id, deletedAt: null },
      include: {
        _count: {
          select: {
            cards: { where: { deletedAt: null } },
          },
        },
      },
    });

    if (!lane) {
      throw { statusCode: 404, message: 'Lane not found' };
    }

    return lane;
  }

  static async updateLane(id: string, input: UpdateLaneInput) {
    const existing = await prisma.lane.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw { statusCode: 404, message: 'Lane not found' };
    }

    const updateData: any = {};

    if (input.name !== undefined) {
      const trimmedName = input.name.trim();
      if (!trimmedName) {
        throw { statusCode: 400, message: 'Lane name cannot be empty' };
      }

      // Check unique name in project
      const duplicate = await prisma.lane.findFirst({
        where: {
          projectId: existing.projectId,
          name: { equals: trimmedName, mode: 'insensitive' },
          id: { not: id },
          deletedAt: null,
        },
      });

      if (duplicate) {
        throw { statusCode: 400, message: `A lane named "${trimmedName}" already exists in this project` };
      }

      updateData.name = trimmedName;
    }

    if (input.color !== undefined) {
      updateData.color = input.color;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.lane.update({
        where: { id },
        data: updateData,
        include: {
          _count: {
            select: {
              cards: { where: { deletedAt: null } },
            },
          },
        },
      });

      await tx.activityLog.create({
        data: {
          projectId: existing.projectId,
          laneId: id,
          performedBy: input.performedBy || null,
          action: ActivityAction.UPDATE_LANE,
          oldValue: {
            name: existing.name,
            color: existing.color,
          },
          newValue: {
            name: result.name,
            color: result.color,
          },
        },
      });

      return result;
    });

    emitToProject(existing.projectId, 'lane:updated', updated);
    return updated;
  }

  static async reorderLanes(projectId: string, items: ReorderLaneItem[], performedBy?: string) {
    if (!Array.isArray(items) || items.length === 0) {
      throw { statusCode: 400, message: 'Invalid reorder items list' };
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
    });

    if (!project) {
      throw { statusCode: 404, message: 'Project not found' };
    }

    const reordered = await prisma.$transaction(async (tx) => {
      for (const item of items) {
        await tx.lane.update({
          where: { id: item.id },
          data: { position: item.position },
        });
      }

      await tx.activityLog.create({
        data: {
          projectId,
          performedBy: performedBy || null,
          action: ActivityAction.UPDATE_LANE,
          newValue: {
            reordered: items.map((i) => ({ id: i.id, position: i.position })),
          },
        },
      });

      return await tx.lane.findMany({
        where: { projectId, deletedAt: null },
        orderBy: { position: 'asc' },
        include: {
          _count: {
            select: { cards: { where: { deletedAt: null } } },
          },
        },
      });
    });

    emitToProject(projectId, 'lane:reordered', { items, lanes: reordered });
    return reordered;
  }

  static async deleteLane(id: string, performedBy?: string) {
    const existing = await prisma.lane.findFirst({
      where: { id, deletedAt: null },
      include: {
        _count: {
          select: {
            cards: { where: { deletedAt: null } },
          },
        },
      },
    });

    if (!existing) {
      throw { statusCode: 404, message: 'Lane not found' };
    }

    // Prevent deleting lanes containing active cards
    if (existing._count.cards > 0) {
      throw {
        statusCode: 400,
        message: `Cannot delete lane "${existing.name}" because it contains ${existing._count.cards} active ${existing._count.cards === 1 ? 'card' : 'cards'}. Please move or delete them first.`,
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.lane.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          deletedBy: performedBy || null,
        },
      });

      await tx.activityLog.create({
        data: {
          projectId: existing.projectId,
          laneId: id,
          performedBy: performedBy || null,
          action: ActivityAction.DELETE_LANE,
          oldValue: {
            name: existing.name,
          },
        },
      });
    });

    emitToProject(existing.projectId, 'lane:deleted', { id });
    return { success: true, message: 'Lane deleted successfully' };
  }
}

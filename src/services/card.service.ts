import { prisma } from '../prisma.js';
import { ActivityAction, Priority } from '@prisma/client';
import { emitToProject } from '../socket.js';

export interface CreateCardInput {
  projectId: string;
  laneId: string;
  title: string;
  description?: string;
  priority?: Priority;
  dueDate?: Date | string | null;
  assigneeId?: string | null;
  createdBy?: string;
}

export interface UpdateCardInput {
  title?: string;
  description?: string;
  priority?: Priority;
  dueDate?: Date | string | null;
  assigneeId?: string | null;
  performedBy?: string;
}

export interface MoveCardInput {
  targetLaneId: string;
  position: number;
  performedBy?: string;
}

export interface ReorderCardItem {
  id: string;
  laneId: string;
  position: number;
}

export interface CardFilterQuery {
  laneId?: string;
  priority?: Priority;
  assigneeId?: string;
  tagId?: string;
  dueDateFilter?: 'overdue' | 'today' | 'this_week' | 'no_date';
  fromDate?: Date | string;
  toDate?: Date | string;
  search?: string;
  includeDeleted?: boolean;
}

export class CardService {
  static async createCard(input: CreateCardInput) {
    const trimmedTitle = input.title?.trim();
    if (!trimmedTitle) {
      throw { statusCode: 400, message: 'Card title is required' };
    }

    const lane = await prisma.lane.findFirst({
      where: { id: input.laneId, projectId: input.projectId, deletedAt: null },
    });

    if (!lane) {
      throw { statusCode: 404, message: 'Lane not found in this project' };
    }

    // Calculate position in target lane
    const lastCard = await prisma.card.findFirst({
      where: { laneId: input.laneId, deletedAt: null },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const position = lastCard ? lastCard.position + 65536 : 65536;

    let parsedDueDate: Date | null = null;
    if (input.dueDate) {
      parsedDueDate = new Date(input.dueDate);
      if (isNaN(parsedDueDate.getTime())) {
        throw { statusCode: 400, message: 'Invalid due date format' };
      }
    }

    const card = await prisma.$transaction(async (tx) => {
      const created = await tx.card.create({
        data: {
          projectId: input.projectId,
          laneId: input.laneId,
          title: trimmedTitle,
          description: input.description?.trim() || null,
          priority: input.priority || Priority.MEDIUM,
          dueDate: parsedDueDate,
          assigneeId: input.assigneeId || null,
          position,
          createdBy: input.createdBy || null,
        },
        include: {
          lane: {
            select: { id: true, name: true, color: true },
          },
          tags: {
            include: { tag: true },
          },
          _count: {
            select: { comments: { where: { deletedAt: null } }, tags: true },
          },
        },
      });

      await tx.activityLog.create({
        data: {
          projectId: input.projectId,
          laneId: input.laneId,
          cardId: created.id,
          performedBy: input.createdBy || null,
          action: ActivityAction.CREATE_CARD,
          newValue: {
            title: created.title,
            priority: created.priority,
            dueDate: created.dueDate,
            assigneeId: created.assigneeId,
            position: created.position,
          },
        },
      });

      return created;
    });

    emitToProject(input.projectId, 'card:created', card);
    return card;
  }

  static async getCardsByProject(projectId: string, filters?: CardFilterQuery) {
    const where: any = {
      projectId,
    };

    if (!filters?.includeDeleted) {
      where.deletedAt = null;
    }

    if (filters?.laneId) {
      where.laneId = filters.laneId;
    }

    if (filters?.priority) {
      where.priority = filters.priority;
    }

    if (filters?.assigneeId) {
      where.assigneeId = filters.assigneeId;
    }

    if (filters?.tagId) {
      where.tags = {
        some: {
          tagId: filters.tagId,
        },
      };
    }

    if (filters?.dueDateFilter) {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      if (filters.dueDateFilter === 'overdue') {
        where.dueDate = {
          lt: startOfToday,
          not: null,
        };
      } else if (filters.dueDateFilter === 'today') {
        where.dueDate = {
          gte: startOfToday,
          lte: endOfToday,
        };
      } else if (filters.dueDateFilter === 'this_week') {
        const startOfWeek = new Date(startOfToday);
        startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        where.dueDate = {
          gte: startOfWeek,
          lte: endOfWeek,
        };
      } else if (filters.dueDateFilter === 'no_date') {
        where.dueDate = null;
      }
    } else if (filters?.fromDate || filters?.toDate) {
      const dateFilter: any = {};
      if (filters.fromDate) dateFilter.gte = new Date(filters.fromDate);
      if (filters.toDate) dateFilter.lte = new Date(filters.toDate);
      where.dueDate = dateFilter;
    }

    if (filters?.search?.trim()) {
      const search = filters.search.trim();
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    return await prisma.card.findMany({
      where,
      orderBy: { position: 'asc' },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
        _count: {
          select: {
            comments: { where: { deletedAt: null } },
            tags: true,
          },
        },
      },
    });
  }

  static async getCardById(id: string) {
    const card = await prisma.card.findFirst({
      where: { id, deletedAt: null },
      include: {
        lane: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
        _count: {
          select: {
            comments: { where: { deletedAt: null } },
            tags: true,
          },
        },
      },
    });

    if (!card) {
      throw { statusCode: 404, message: 'Card not found' };
    }

    return card;
  }

  static async updateCard(id: string, input: UpdateCardInput) {
    const existing = await prisma.card.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw { statusCode: 404, message: 'Card not found' };
    }

    const updateData: any = {};
    const activitiesToCreate: any[] = [];

    if (input.title !== undefined) {
      const trimmed = input.title.trim();
      if (!trimmed) {
        throw { statusCode: 400, message: 'Card title cannot be empty' };
      }
      updateData.title = trimmed;
    }

    if (input.description !== undefined) {
      updateData.description = input.description.trim() || null;
    }

    if (input.priority !== undefined && input.priority !== existing.priority) {
      updateData.priority = input.priority;
      activitiesToCreate.push({
        projectId: existing.projectId,
        cardId: id,
        laneId: existing.laneId,
        performedBy: input.performedBy || null,
        action: ActivityAction.CHANGE_PRIORITY,
        oldValue: { priority: existing.priority },
        newValue: { priority: input.priority },
      });
    }

    if (input.dueDate !== undefined) {
      const newDueDate = input.dueDate ? new Date(input.dueDate) : null;
      if (newDueDate && isNaN(newDueDate.getTime())) {
        throw { statusCode: 400, message: 'Invalid due date format' };
      }
      updateData.dueDate = newDueDate;
      activitiesToCreate.push({
        projectId: existing.projectId,
        cardId: id,
        laneId: existing.laneId,
        performedBy: input.performedBy || null,
        action: ActivityAction.CHANGE_DUE_DATE,
        oldValue: { dueDate: existing.dueDate },
        newValue: { dueDate: newDueDate },
      });
    }

    if (input.assigneeId !== undefined && input.assigneeId !== existing.assigneeId) {
      updateData.assigneeId = input.assigneeId || null;
      activitiesToCreate.push({
        projectId: existing.projectId,
        cardId: id,
        laneId: existing.laneId,
        performedBy: input.performedBy || null,
        action: input.assigneeId ? ActivityAction.ASSIGN_USER : ActivityAction.UNASSIGN_USER,
        oldValue: { assigneeId: existing.assigneeId },
        newValue: { assigneeId: input.assigneeId },
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.card.update({
        where: { id },
        data: updateData,
        include: {
          lane: {
            select: { id: true, name: true, color: true },
          },
          tags: {
            include: {
              tag: true,
            },
          },
          _count: {
            select: { comments: { where: { deletedAt: null } }, tags: true },
          },
        },
      });

      // If title or description changed, log general update
      if (
        (updateData.title && updateData.title !== existing.title) ||
        (updateData.description !== undefined && updateData.description !== existing.description)
      ) {
        activitiesToCreate.push({
          projectId: existing.projectId,
          cardId: id,
          laneId: existing.laneId,
          performedBy: input.performedBy || null,
          action: ActivityAction.UPDATE_CARD,
          oldValue: { title: existing.title, description: existing.description },
          newValue: { title: result.title, description: result.description },
        });
      }

      for (const act of activitiesToCreate) {
        await tx.activityLog.create({ data: act });
      }

      return result;
    });

    emitToProject(existing.projectId, 'card:updated', updated);
    return updated;
  }

  static async moveCard(id: string, input: MoveCardInput) {
    const existing = await prisma.card.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw { statusCode: 404, message: 'Card not found' };
    }

    const targetLane = await prisma.lane.findFirst({
      where: { id: input.targetLaneId, projectId: existing.projectId, deletedAt: null },
    });

    if (!targetLane) {
      throw { statusCode: 404, message: 'Target lane not found in this project' };
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.card.update({
        where: { id },
        data: {
          laneId: input.targetLaneId,
          position: input.position,
        },
        include: {
          lane: {
            select: { id: true, name: true, color: true },
          },
          tags: {
            include: {
              tag: true,
            },
          },
          _count: {
            select: { comments: { where: { deletedAt: null } }, tags: true },
          },
        },
      });

      if (existing.laneId !== input.targetLaneId) {
        await tx.activityLog.create({
          data: {
            projectId: existing.projectId,
            cardId: id,
            laneId: input.targetLaneId,
            performedBy: input.performedBy || null,
            action: ActivityAction.MOVE_CARD,
            oldValue: { laneId: existing.laneId, position: existing.position },
            newValue: { laneId: input.targetLaneId, position: input.position },
          },
        });
      }

      return result;
    });

    emitToProject(existing.projectId, 'card:moved', updated);
    return updated;
  }

  static async reorderCards(projectId: string, items: ReorderCardItem[], performedBy?: string) {
    if (!Array.isArray(items) || items.length === 0) {
      throw { statusCode: 400, message: 'Invalid reorder items list' };
    }

    const cards = await prisma.$transaction(async (tx) => {
      for (const item of items) {
        await tx.card.update({
          where: { id: item.id },
          data: {
            laneId: item.laneId,
            position: item.position,
          },
        });
      }

      await tx.activityLog.create({
        data: {
          projectId,
          performedBy: performedBy || null,
          action: ActivityAction.MOVE_CARD,
          newValue: {
            reorderedCount: items.length,
          },
        },
      });

      return await tx.card.findMany({
        where: { projectId, deletedAt: null },
        orderBy: { position: 'asc' },
        include: {
          tags: { include: { tag: true } },
          _count: {
            select: { comments: { where: { deletedAt: null } }, tags: true },
          },
        },
      });
    });

    emitToProject(projectId, 'card:reordered', { items, cards });
    return cards;
  }

  static async deleteCard(id: string, performedBy?: string) {
    const existing = await prisma.card.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw { statusCode: 404, message: 'Card not found' };
    }

    await prisma.$transaction(async (tx) => {
      await tx.card.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          deletedBy: performedBy || null,
        },
      });

      await tx.activityLog.create({
        data: {
          projectId: existing.projectId,
          laneId: existing.laneId,
          cardId: id,
          performedBy: performedBy || null,
          action: ActivityAction.DELETE_CARD,
          oldValue: {
            title: existing.title,
          },
        },
      });
    });

    emitToProject(existing.projectId, 'card:deleted', { id });
    return { success: true, message: 'Card deleted successfully' };
  }

  static async restoreCard(id: string, performedBy?: string) {
    const existing = await prisma.card.findFirst({
      where: { id, deletedAt: { not: null } },
    });

    if (!existing) {
      throw { statusCode: 404, message: 'Deleted card not found' };
    }

    const restored = await prisma.$transaction(async (tx) => {
      const card = await tx.card.update({
        where: { id },
        data: {
          deletedAt: null,
          deletedBy: null,
        },
        include: {
          lane: {
            select: { id: true, name: true, color: true },
          },
          tags: {
            include: { tag: true },
          },
          _count: {
            select: { comments: { where: { deletedAt: null } }, tags: true },
          },
        },
      });

      await tx.activityLog.create({
        data: {
          projectId: existing.projectId,
          laneId: existing.laneId,
          cardId: id,
          performedBy: performedBy || null,
          action: ActivityAction.RESTORE_CARD,
          newValue: {
            title: existing.title,
          },
        },
      });

      return card;
    });

    emitToProject(existing.projectId, 'card:created', restored);
    return restored;
  }
}

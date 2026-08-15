import { prisma } from '../prisma.js';
import { ActivityAction } from '@prisma/client';
import { emitToProject } from '../socket.js';

export interface CreateTagInput {
  projectId: string;
  name: string;
  color?: string;
  createdBy?: string;
}

export interface UpdateTagInput {
  name?: string;
  color?: string;
  performedBy?: string;
}

export class TagService {
  static async createTag(input: CreateTagInput) {
    const trimmedName = input.name?.trim();
    if (!trimmedName) {
      throw { statusCode: 400, message: 'Tag name is required' };
    }

    const project = await prisma.project.findFirst({
      where: { id: input.projectId, deletedAt: null },
    });

    if (!project) {
      throw { statusCode: 404, message: 'Project not found' };
    }

    // Check unique tag name in project
    const existing = await prisma.tag.findFirst({
      where: {
        projectId: input.projectId,
        name: { equals: trimmedName, mode: 'insensitive' },
        deletedAt: null,
      },
    });

    if (existing) {
      throw { statusCode: 400, message: `A tag named "${trimmedName}" already exists in this project` };
    }

    const tag = await prisma.$transaction(async (tx) => {
      const created = await tx.tag.create({
        data: {
          projectId: input.projectId,
          name: trimmedName,
          color: input.color || '#6366f1',
          createdBy: input.createdBy || null,
        },
      });

      await tx.activityLog.create({
        data: {
          projectId: input.projectId,
          tagId: created.id,
          performedBy: input.createdBy || null,
          action: ActivityAction.CREATE_TAG,
          newValue: {
            name: created.name,
            color: created.color,
          },
        },
      });

      return created;
    });

    emitToProject(input.projectId, 'tag:created', tag);
    return tag;
  }

  static async getTagsByProject(projectId: string) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
    });

    if (!project) {
      throw { statusCode: 404, message: 'Project not found' };
    }

    return await prisma.tag.findMany({
      where: {
        projectId,
        deletedAt: null,
      },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { cards: true },
        },
      },
    });
  }

  static async updateTag(id: string, input: UpdateTagInput) {
    const existing = await prisma.tag.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw { statusCode: 404, message: 'Tag not found' };
    }

    const updateData: any = {};

    if (input.name !== undefined) {
      const trimmedName = input.name.trim();
      if (!trimmedName) {
        throw { statusCode: 400, message: 'Tag name cannot be empty' };
      }

      // Check unique name in project
      const duplicate = await prisma.tag.findFirst({
        where: {
          projectId: existing.projectId,
          name: { equals: trimmedName, mode: 'insensitive' },
          id: { not: id },
          deletedAt: null,
        },
      });

      if (duplicate) {
        throw { statusCode: 400, message: `A tag named "${trimmedName}" already exists in this project` };
      }

      updateData.name = trimmedName;
    }

    if (input.color !== undefined) {
      updateData.color = input.color;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.tag.update({
        where: { id },
        data: updateData,
      });

      await tx.activityLog.create({
        data: {
          projectId: existing.projectId,
          tagId: id,
          performedBy: input.performedBy || null,
          action: ActivityAction.UPDATE_TAG,
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

    emitToProject(existing.projectId, 'tag:updated', updated);
    return updated;
  }

  static async deleteTag(id: string, performedBy?: string) {
    const existing = await prisma.tag.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw { statusCode: 404, message: 'Tag not found' };
    }

    await prisma.$transaction(async (tx) => {
      // Remove tag associations
      await tx.cardTag.deleteMany({
        where: { tagId: id },
      });

      await tx.tag.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          deletedBy: performedBy || null,
        },
      });

      await tx.activityLog.create({
        data: {
          projectId: existing.projectId,
          tagId: id,
          performedBy: performedBy || null,
          action: ActivityAction.DELETE_TAG,
          oldValue: {
            name: existing.name,
          },
        },
      });
    });

    emitToProject(existing.projectId, 'tag:deleted', { id });
    return { success: true, message: 'Tag deleted successfully' };
  }

  static async assignTagToCard(cardId: string, tagId: string, performedBy?: string) {
    const card = await prisma.card.findFirst({
      where: { id: cardId, deletedAt: null },
    });

    if (!card) {
      throw { statusCode: 404, message: 'Card not found' };
    }

    const tag = await prisma.tag.findFirst({
      where: { id: tagId, projectId: card.projectId, deletedAt: null },
    });

    if (!tag) {
      throw { statusCode: 404, message: 'Tag not found in this project' };
    }

    const cardTag = await prisma.$transaction(async (tx) => {
      const result = await tx.cardTag.upsert({
        where: {
          cardId_tagId: {
            cardId,
            tagId,
          },
        },
        create: {
          cardId,
          tagId,
        },
        update: {},
        include: {
          tag: true,
        },
      });

      await tx.activityLog.create({
        data: {
          projectId: card.projectId,
          cardId,
          tagId,
          performedBy: performedBy || null,
          action: ActivityAction.ADD_TAG_TO_CARD,
          newValue: {
            tagName: tag.name,
            tagColor: tag.color,
          },
        },
      });

      return result;
    });

    emitToProject(card.projectId, 'card:tag:added', { cardId, cardTag });
    return cardTag;
  }

  static async removeTagFromCard(cardId: string, tagId: string, performedBy?: string) {
    const card = await prisma.card.findFirst({
      where: { id: cardId, deletedAt: null },
    });

    if (!card) {
      throw { statusCode: 404, message: 'Card not found' };
    }

    const tag = await prisma.tag.findFirst({
      where: { id: tagId },
    });

    await prisma.$transaction(async (tx) => {
      await tx.cardTag.deleteMany({
        where: {
          cardId,
          tagId,
        },
      });

      await tx.activityLog.create({
        data: {
          projectId: card.projectId,
          cardId,
          tagId,
          performedBy: performedBy || null,
          action: ActivityAction.REMOVE_TAG_FROM_CARD,
          oldValue: {
            tagName: tag?.name,
          },
        },
      });
    });

    emitToProject(card.projectId, 'card:tag:removed', { cardId, tagId });
    return { success: true, message: 'Tag removed from card' };
  }
}

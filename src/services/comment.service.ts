import { prisma } from '../prisma.js';
import { ActivityAction } from '@prisma/client';
import { emitToProject } from '../socket.js';

export interface CreateCommentInput {
  cardId: string;
  comment: string;
  createdBy?: string;
}

export interface UpdateCommentInput {
  comment: string;
  performedBy?: string;
}

export class CommentService {
  static async createComment(input: CreateCommentInput) {
    const trimmedComment = input.comment?.trim();
    if (!trimmedComment) {
      throw { statusCode: 400, message: 'Comment content cannot be empty' };
    }

    const card = await prisma.card.findFirst({
      where: { id: input.cardId, deletedAt: null },
    });

    if (!card) {
      throw { statusCode: 404, message: 'Card not found' };
    }

    const comment = await prisma.$transaction(async (tx) => {
      const created = await tx.comment.create({
        data: {
          cardId: input.cardId,
          comment: trimmedComment,
          createdBy: input.createdBy || null,
        },
      });

      await tx.activityLog.create({
        data: {
          projectId: card.projectId,
          cardId: card.id,
          commentId: created.id,
          performedBy: input.createdBy || null,
          action: ActivityAction.CREATE_COMMENT,
          newValue: {
            comment: created.comment,
          },
        },
      });

      return created;
    });

    emitToProject(card.projectId, 'comment:created', { cardId: card.id, comment });
    return comment;
  }

  static async getCommentsByCard(cardId: string) {
    const card = await prisma.card.findFirst({
      where: { id: cardId, deletedAt: null },
    });

    if (!card) {
      throw { statusCode: 404, message: 'Card not found' };
    }

    return await prisma.comment.findMany({
      where: {
        cardId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  static async updateComment(id: string, input: UpdateCommentInput) {
    const existing = await prisma.comment.findFirst({
      where: { id, deletedAt: null },
      include: { card: { select: { projectId: true } } },
    });

    if (!existing) {
      throw { statusCode: 404, message: 'Comment not found' };
    }

    const trimmedComment = input.comment?.trim();
    if (!trimmedComment) {
      throw { statusCode: 400, message: 'Comment content cannot be empty' };
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.comment.update({
        where: { id },
        data: {
          comment: trimmedComment,
        },
      });

      await tx.activityLog.create({
        data: {
          projectId: existing.card.projectId,
          cardId: existing.cardId,
          commentId: id,
          performedBy: input.performedBy || null,
          action: ActivityAction.UPDATE_COMMENT,
          oldValue: {
            comment: existing.comment,
          },
          newValue: {
            comment: result.comment,
          },
        },
      });

      return result;
    });

    emitToProject(existing.card.projectId, 'comment:updated', {
      cardId: existing.cardId,
      comment: updated,
    });
    return updated;
  }

  static async deleteComment(id: string, performedBy?: string) {
    const existing = await prisma.comment.findFirst({
      where: { id, deletedAt: null },
      include: { card: { select: { projectId: true } } },
    });

    if (!existing) {
      throw { statusCode: 404, message: 'Comment not found' };
    }

    await prisma.$transaction(async (tx) => {
      await tx.comment.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          deletedBy: performedBy || null,
        },
      });

      await tx.activityLog.create({
        data: {
          projectId: existing.card.projectId,
          cardId: existing.cardId,
          commentId: id,
          performedBy: performedBy || null,
          action: ActivityAction.DELETE_COMMENT,
          oldValue: {
            comment: existing.comment,
          },
        },
      });
    });

    emitToProject(existing.card.projectId, 'comment:deleted', {
      cardId: existing.cardId,
      id,
    });
    return { success: true, message: 'Comment deleted successfully' };
  }
}

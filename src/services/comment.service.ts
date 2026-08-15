import { prisma } from '../prisma.js';
import { ActivityAction, NotificationType } from '@prisma/client';
import { emitToProject } from '../socket.js';
import { NotificationService } from './notification.service.js';

export interface CreateCommentInput {
  cardId: string;
  comment: string;
  createdBy?: string;
  senderId?: string;
  creatorName?: string;
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
      include: { project: { select: { name: true } } },
    });

    if (!card) {
      throw { statusCode: 404, message: 'Card not found' };
    }

    const author = input.creatorName || input.createdBy || 'A team member';

    const comment = await prisma.$transaction(async (tx) => {
      const created = await tx.comment.create({
        data: {
          cardId: input.cardId,
          comment: trimmedComment,
          createdBy: author,
        },
      });

      await tx.activityLog.create({
        data: {
          projectId: card.projectId,
          cardId: card.id,
          commentId: created.id,
          performedBy: author,
          action: ActivityAction.CREATE_COMMENT,
          newValue: {
            comment: created.comment,
          },
        },
      });

      return created;
    });

    // 1. Check for @mentions in comment and notify users
    const notifiedUserIds = await NotificationService.parseMentionsAndNotify({
      commentText: trimmedComment,
      cardId: card.id,
      projectId: card.projectId,
      senderId: input.senderId,
      senderName: author,
      commentId: comment.id,
    });

    // 2. If card has an assignee who wasn't the author and wasn't already mentioned, notify them
    if (
      card.assigneeId &&
      card.assigneeId !== input.senderId &&
      !notifiedUserIds.includes(card.assigneeId)
    ) {
      await NotificationService.createNotification({
        userId: card.assigneeId,
        senderId: input.senderId,
        senderName: author,
        type: NotificationType.CARD_COMMENT,
        title: `New comment on "${card.title}"`,
        message: `${author}: "${trimmedComment.length > 80 ? trimmedComment.slice(0, 80) + '...' : trimmedComment}"`,
        projectId: card.projectId,
        cardId: card.id,
        commentId: comment.id,
      });
    }

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

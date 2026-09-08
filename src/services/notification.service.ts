import { prisma } from '../prisma.js';
import { NotificationType } from '@prisma/client';
import { emitToUser } from '../socket.js';

export interface CreateNotificationInput {
  userId: string;
  senderId?: string;
  senderName?: string;
  type: NotificationType;
  title: string;
  message: string;
  projectId?: string;
  cardId?: string;
  commentId?: string;
}

export class NotificationService {
  static async createNotification(input: CreateNotificationInput) {
    if (!input.userId) return null;

    let targetUserId = input.userId;

    // Check if recipient exists by ID (UUID)
    const userById = await prisma.user.findFirst({
      where: { id: targetUserId, deletedAt: null },
      select: { id: true },
    });

    if (!userById) {
      // If not found by ID, check if username was passed instead
      const userByUsername = await prisma.user.findFirst({
        where: { username: targetUserId, deletedAt: null },
        select: { id: true },
      });

      if (userByUsername) {
        targetUserId = userByUsername.id;
      } else {
        console.warn(`[NotificationService] Skipping notification for non-existent userId/username: ${input.userId}`);
        return null;
      }
    }

    const notification = await prisma.notification.create({
      data: {
        userId: targetUserId,
        senderId: input.senderId || null,
        senderName: input.senderName || null,
        type: input.type,
        title: input.title,
        message: input.message,
        projectId: input.projectId || null,
        cardId: input.cardId || null,
        commentId: input.commentId || null,
      },
    });

    // Emit live real-time event to recipient
    emitToUser(targetUserId, 'notification:new', notification);

    return notification;
  }

  private static async getValidEntityIds(
    items: { cardId?: string | null; projectId?: string | null; commentId?: string | null }[]
  ) {
    const cardIds = [...new Set(items.filter((n) => n.cardId).map((n) => n.cardId!))];
    const projectIds = [...new Set(items.filter((n) => n.projectId).map((n) => n.projectId!))];
    const commentIds = [...new Set(items.filter((n) => n.commentId).map((n) => n.commentId!))];

    const [existingCards, existingProjects, existingComments] = await Promise.all([
      cardIds.length > 0
        ? prisma.card.findMany({
            where: {
              id: { in: cardIds },
              deletedAt: null,
              project: { deletedAt: null },
            },
            select: { id: true },
          })
        : [],
      projectIds.length > 0
        ? prisma.project.findMany({
            where: {
              id: { in: projectIds },
              deletedAt: null,
            },
            select: { id: true },
          })
        : [],
      commentIds.length > 0
        ? prisma.comment.findMany({
            where: {
              id: { in: commentIds },
              deletedAt: null,
              card: { deletedAt: null },
            },
            select: { id: true },
          })
        : [],
    ]);

    return {
      validCardIds: new Set(existingCards.map((c) => c.id)),
      validProjectIds: new Set(existingProjects.map((p) => p.id)),
      validCommentIds: new Set(existingComments.map((c) => c.id)),
    };
  }

  private static isNotificationValid(
    n: { cardId?: string | null; projectId?: string | null; commentId?: string | null },
    validSets: {
      validCardIds: Set<string>;
      validProjectIds: Set<string>;
      validCommentIds: Set<string>;
    }
  ) {
    if (n.cardId && !validSets.validCardIds.has(n.cardId)) {
      return false;
    }
    if (n.projectId && !validSets.validProjectIds.has(n.projectId)) {
      return false;
    }
    if (n.commentId && !validSets.validCommentIds.has(n.commentId)) {
      return false;
    }
    return true;
  }

  static async getUserNotifications(
    userId: string,
    options?: { type?: 'MENTION' | 'ALL'; page?: number; limit?: number }
  ) {
    const page = Math.max(1, Number(options?.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(options?.limit) || 30));
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (options?.type === 'MENTION') {
      where.type = NotificationType.MENTION;
    }

    const [items, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
    ]);

    // Filter out notifications whose referenced entities (card, project, comment) no longer exist
    const validSets = await this.getValidEntityIds(items);
    const filteredItems = items.filter((n) => this.isNotificationValid(n, validSets));
    const { unreadCount } = await this.getUnreadCount(userId);

    return {
      data: filteredItems,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        unreadCount,
      },
    };
  }

  static async getUnreadCount(userId: string) {
    const unread = await prisma.notification.findMany({
      where: { userId, isRead: false },
      select: { id: true, cardId: true, projectId: true, commentId: true },
    });

    if (unread.length === 0) {
      return { unreadCount: 0 };
    }

    const validSets = await this.getValidEntityIds(unread);
    const validUnreadCount = unread.filter((n) => this.isNotificationValid(n, validSets)).length;

    return { unreadCount: validUnreadCount };
  }

  static async markAsRead(notificationId: string, userId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw { statusCode: 404, message: 'Notification not found' };
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    emitToUser(userId, 'notification:read', { id: notificationId });

    return updated;
  }

  static async markAllAsRead(userId: string) {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    emitToUser(userId, 'notification:read:all', { userId });

    return { success: true, message: 'All notifications marked as read' };
  }

  /**
   * Parse @username mentions in comment and fire MENTION notifications
   */
  static async parseMentionsAndNotify(params: {
    commentText: string;
    cardId: string;
    projectId: string;
    senderId?: string;
    senderName?: string;
    commentId?: string;
  }) {
    const mentionRegex = /@([a-zA-Z0-9_.-]+)/g;
    const matches = params.commentText.match(mentionRegex);

    if (!matches || matches.length === 0) {
      return [];
    }

    // Extract unique usernames (stripping the leading '@')
    const rawUsernames = Array.from(
      new Set(matches.map((m) => m.slice(1).toLowerCase()))
    );

    if (rawUsernames.length === 0) return [];

    // Find users with these usernames
    const users = await prisma.user.findMany({
      where: {
        username: {
          in: rawUsernames,
          mode: 'insensitive',
        },
      },
      select: { id: true, username: true, name: true },
    });

    // Fetch Card for context
    const card = await prisma.card.findUnique({
      where: { id: params.cardId },
      select: { id: true, title: true },
    });

    const cardTitle = card?.title || 'a card';
    const sender = params.senderName || 'A team member';
    const preview =
      params.commentText.length > 80
        ? `${params.commentText.slice(0, 80)}...`
        : params.commentText;

    const notifiedUserIds: string[] = [];

    for (const user of users) {
      // Don't notify the sender if they mentioned themselves
      if (params.senderId && user.id === params.senderId) {
        continue;
      }

      await this.createNotification({
        userId: user.id,
        senderId: params.senderId,
        senderName: sender,
        type: NotificationType.MENTION,
        title: `${sender} mentioned you`,
        message: `On "${cardTitle}": "${preview}"`,
        projectId: params.projectId,
        cardId: params.cardId,
        commentId: params.commentId,
      });

      notifiedUserIds.push(user.id);
    }

    return notifiedUserIds;
  }
}

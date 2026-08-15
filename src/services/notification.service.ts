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
    const notification = await prisma.notification.create({
      data: {
        userId: input.userId,
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
    emitToUser(input.userId, 'notification:new', notification);

    return notification;
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

    const [items, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return {
      data: items,
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
    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { unreadCount };
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

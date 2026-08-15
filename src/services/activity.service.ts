import { prisma } from '../prisma.js';

export class ActivityService {
  static async getCardActivities(cardId: string, limit: number = 50) {
    return await prisma.activityLog.findMany({
      where: { cardId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
      include: {
        lane: {
          select: { id: true, name: true, color: true },
        },
        tag: {
          select: { id: true, name: true, color: true },
        },
        comment: {
          select: { id: true, comment: true },
        },
      },
    });
  }

  static async getProjectActivities(projectId: string, limit: number = 100) {
    return await prisma.activityLog.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 200),
      include: {
        card: {
          select: { id: true, title: true },
        },
        lane: {
          select: { id: true, name: true, color: true },
        },
        tag: {
          select: { id: true, name: true, color: true },
        },
      },
    });
  }
}

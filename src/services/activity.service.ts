import { prisma } from '../prisma.js';

export class ActivityService {
  private static async enrichActivities(activities: any[]) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const userIds = new Set<string>();

    for (const act of activities) {
      if (act.performedBy && uuidRegex.test(act.performedBy)) {
        userIds.add(act.performedBy);
      }
      if (act.newValue?.assigneeId && uuidRegex.test(act.newValue.assigneeId)) {
        userIds.add(act.newValue.assigneeId);
      }
    }

    if (userIds.size > 0) {
      const users = await prisma.user.findMany({
        where: { id: { in: Array.from(userIds) } },
        select: { id: true, name: true, username: true },
      });
      const userMap = new Map(users.map((u) => [u.id, u.name || `@${u.username}`]));

      for (const act of activities) {
        if (act.performedBy && userMap.has(act.performedBy)) {
          act.performedBy = userMap.get(act.performedBy);
        }
        if (act.newValue?.assigneeId && userMap.has(act.newValue.assigneeId)) {
          act.newValue.assigneeName = userMap.get(act.newValue.assigneeId);
        }
      }
    }

    return activities;
  }

  static async getCardActivities(cardId: string, limit: number = 50) {
    const activities = await prisma.activityLog.findMany({
      where: { cardId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
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
        comment: {
          select: { id: true, comment: true },
        },
      },
    });

    return await this.enrichActivities(activities);
  }

  static async getProjectActivities(projectId: string, limit: number = 100) {
    const activities = await prisma.activityLog.findMany({
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
        comment: {
          select: { id: true, comment: true },
        },
      },
    });

    return await this.enrichActivities(activities);
  }
}

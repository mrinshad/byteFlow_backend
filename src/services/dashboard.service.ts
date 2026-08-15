import { prisma } from '../prisma.js';
import { Priority } from '@prisma/client';

export class DashboardService {
  static async getProjectStats(projectId: string) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
    });

    if (!project) {
      throw { statusCode: 404, message: 'Project not found' };
    }

    const lanes = await prisma.lane.findMany({
      where: { projectId, deletedAt: null },
      orderBy: { position: 'asc' },
      include: {
        _count: {
          select: {
            cards: { where: { deletedAt: null } },
          },
        },
      },
    });

    const cards = await prisma.card.findMany({
      where: { projectId, deletedAt: null },
      select: {
        id: true,
        laneId: true,
        priority: true,
        dueDate: true,
      },
    });

    const totalCards = cards.length;
    const totalLanes = lanes.length;

    // Determine completion lane (e.g. named "Done", "Completed", or the last lane)
    let doneLaneId: string | null = null;
    const doneLane = lanes.find((l) =>
      /done|complete|closed|finished/i.test(l.name)
    );
    if (doneLane) {
      doneLaneId = doneLane.id;
    } else if (lanes.length > 1) {
      doneLaneId = lanes[lanes.length - 1].id;
    }

    const completedCards = doneLaneId
      ? cards.filter((c) => c.laneId === doneLaneId).length
      : 0;

    const completionPercentage =
      totalCards > 0 ? Math.round((completedCards / totalCards) * 100) : 0;

    const nowTimestamp = new Date().setHours(0, 0, 0, 0);
    const overdueCards = cards.filter((c) => {
      if (doneLaneId && c.laneId === doneLaneId) return false;
      if (!c.dueDate) return false;
      return new Date(c.dueDate).getTime() < nowTimestamp;
    }).length;

    const cardsByLane = lanes.map((lane) => {
      const count = lane._count.cards;
      const percentage =
        totalCards > 0 ? Math.round((count / totalCards) * 100) : 0;
      return {
        laneId: lane.id,
        laneName: lane.name,
        color: lane.color,
        count,
        percentage,
      };
    });

    const cardsByPriority = {
      LOW: cards.filter((c) => c.priority === Priority.LOW).length,
      MEDIUM: cards.filter((c) => c.priority === Priority.MEDIUM).length,
      HIGH: cards.filter((c) => c.priority === Priority.HIGH).length,
      CRITICAL: cards.filter((c) => c.priority === Priority.CRITICAL).length,
    };

    return {
      projectId,
      projectName: project.name,
      totalCards,
      totalLanes,
      completedCards,
      completionPercentage,
      overdueCards,
      cardsByLane,
      cardsByPriority,
    };
  }

  static async getGlobalStats() {
    const [totalProjects, totalCards, totalLanes] = await Promise.all([
      prisma.project.count({ where: { deletedAt: null } }),
      prisma.card.count({ where: { deletedAt: null } }),
      prisma.lane.count({ where: { deletedAt: null } }),
    ]);

    return {
      totalProjects,
      totalCards,
      totalLanes,
    };
  }
}

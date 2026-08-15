import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { prisma } from '../prisma.js';
import { NotificationService } from './notification.service.js';

export class AdminService {
  static async getStats() {
    const [totalProjects, totalUsers, totalCards, totalLanes, usersByRole, allProjects] = await Promise.all([
      prisma.project.count({ where: { deletedAt: null } }),
      prisma.user.count(),
      prisma.card.count({ where: { deletedAt: null } }),
      prisma.lane.count({ where: { deletedAt: null } }),
      prisma.user.groupBy({
        by: ['role'],
        _count: true,
      }),
      prisma.project.findMany({
        where: { deletedAt: null },
        include: {
          lanes: {
            where: { deletedAt: null },
            include: {
              _count: {
                select: { cards: { where: { deletedAt: null } } },
              },
            },
          },
          _count: {
            select: {
              cards: { where: { deletedAt: null } },
              members: true,
            },
          },
        },
      }),
    ]);

    let totalCompletedCards = 0;

    for (const project of allProjects) {
      const doneLanes = project.lanes.filter((l) =>
        /done|complete|completed|finished/i.test(l.name)
      );
      for (const lane of doneLanes) {
        totalCompletedCards += lane._count.cards;
      }
    }

    const completionRate = totalCards > 0 ? Math.round((totalCompletedCards / totalCards) * 100) : 0;

    const roleCounts = {
      ADMIN: 0,
      MANAGER: 0,
      MEMBER: 0,
    };

    for (const group of usersByRole) {
      if (group.role in roleCounts) {
        roleCounts[group.role as Role] = group._count;
      }
    }

    return {
      totalProjects,
      totalUsers,
      totalCards,
      totalLanes,
      totalCompletedCards,
      completionRate,
      roleCounts,
    };
  }

  static async getProjects() {
    const projects = await prisma.project.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        lanes: {
          where: { deletedAt: null },
          include: {
            _count: {
              select: { cards: { where: { deletedAt: null } } },
            },
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                role: true,
              },
            },
          },
        },
        _count: {
          select: {
            lanes: { where: { deletedAt: null } },
            cards: { where: { deletedAt: null } },
            members: true,
          },
        },
      },
    });

    return projects.map((p) => {
      const totalCards = p._count.cards;
      const doneLanes = p.lanes.filter((l) =>
        /done|complete|completed|finished/i.test(l.name)
      );
      const completedCards = doneLanes.reduce((sum, l) => sum + l._count.cards, 0);
      const completionPercentage = totalCards > 0 ? Math.round((completedCards / totalCards) * 100) : 0;

      return {
        id: p.id,
        name: p.name,
        description: p.description,
        createdBy: p.createdBy,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        totalLanes: p._count.lanes,
        totalCards,
        completedCards,
        completionPercentage,
        memberCount: p._count.members,
        members: p.members.map((m) => ({
          id: m.id,
          userId: m.userId,
          user: m.user,
          createdAt: m.createdAt,
        })),
      };
    });
  }

  static async updateProjectMembers(
    projectId: string,
    userIds: string[],
    assignerName?: string,
    assignerId?: string
  ) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      include: { members: { select: { userId: true } } },
    });

    if (!project) {
      throw { statusCode: 404, message: 'Project not found' };
    }

    const previousMemberIds = new Set(project.members.map((m) => m.userId));

    // Verify all userIds exist
    const uniqueUserIds = Array.from(new Set(userIds));
    if (uniqueUserIds.length > 0) {
      const existingUsers = await prisma.user.findMany({
        where: { id: { in: uniqueUserIds } },
        select: { id: true },
      });
      if (existingUsers.length !== uniqueUserIds.length) {
        throw { statusCode: 400, message: 'One or more selected users do not exist' };
      }
    }

    const updatedMembers = await prisma.$transaction(async (tx) => {
      // Remove current members
      await tx.projectMember.deleteMany({
        where: { projectId },
      });

      // Add new members
      if (uniqueUserIds.length > 0) {
        await tx.projectMember.createMany({
          data: uniqueUserIds.map((userId) => ({
            projectId,
            userId,
          })),
        });
      }

      // Return updated project members
      return await tx.projectMember.findMany({
        where: { projectId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              role: true,
            },
          },
        },
      });
    });

    // Notify newly assigned members
    const newlyAddedUserIds = uniqueUserIds.filter((id) => !previousMemberIds.has(id));
    for (const userId of newlyAddedUserIds) {
      if (assignerId && userId === assignerId) continue;
      await NotificationService.createNotification({
        userId,
        senderId: assignerId,
        senderName: assignerName || 'Administrator',
        type: 'ASSIGNED_TO_PROJECT' as any,
        title: `Added to project "${project.name}"`,
        message: `${assignerName || 'An administrator'} added you as a member of "${project.name}".`,
        projectId: project.id,
      });
    }

    return updatedMembers;
  }

  static async getUsers() {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        createdAt: true,
        projectMembers: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return users.map((u) => ({
      id: u.id,
      name: u.name,
      username: u.username,
      role: u.role,
      createdAt: u.createdAt,
      assignedProjects: u.projectMembers.map((pm) => ({
        id: pm.project.id,
        name: pm.project.name,
      })),
    }));
  }

  static async updateUserRole(userId: string, role: Role) {
    if (!Object.values(Role).includes(role)) {
      throw { statusCode: 400, message: `Invalid role: ${role}` };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw { statusCode: 404, message: 'User not found' };
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updated;
  }

  static async resetUserPassword(userId: string, newPassword: string) {
    if (!newPassword || newPassword.length < 6) {
      throw { statusCode: 400, message: 'Password must be at least 6 characters' };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw { statusCode: 404, message: 'User not found' };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { success: true, message: `Password reset successfully for @${user.username}` };
  }
}

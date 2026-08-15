import bcrypt from 'bcryptjs';
import { Role, ActivityAction } from '@prisma/client';
import { prisma } from '../prisma.js';
import { NotificationService } from './notification.service.js';
import { ActivityService } from './activity.service.js';

export class AdminService {
  static async getStats() {
    const [totalProjects, totalUsers, totalCards, totalLanes, usersByRole, allProjects] = await Promise.all([
      prisma.project.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.card.count({ where: { deletedAt: null, project: { deletedAt: null } } }),
      prisma.lane.count({ where: { deletedAt: null, project: { deletedAt: null } } }),
      prisma.user.groupBy({
        by: ['role'],
        where: { deletedAt: null },
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
      SUPER_ADMIN: 0,
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

  static async getProjects(includeDeleted = false) {
    const where: any = {};
    if (!includeDeleted) {
      where.deletedAt = null;
    }

    const projects = await prisma.project.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        lanes: {
          include: {
            _count: {
              select: { cards: true },
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
            lanes: true,
            cards: true,
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
        deletedAt: p.deletedAt,
        deletedBy: p.deletedBy,
        isDeleted: !!p.deletedAt,
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

  static async restoreProject(id: string, performedBy?: string) {
    const existing = await prisma.project.findUnique({
      where: { id },
    });

    if (!existing) {
      throw { statusCode: 404, message: 'Project not found' };
    }

    if (!existing.deletedAt) {
      return { success: true, message: 'Project is already active' };
    }

    await prisma.$transaction(async (tx) => {
      // 1. Restore the project
      await tx.project.update({
        where: { id },
        data: {
          deletedAt: null,
          deletedBy: null,
        },
      });

      // 2. Restore underlying lanes
      await tx.lane.updateMany({
        where: { projectId: id },
        data: {
          deletedAt: null,
          deletedBy: null,
        },
      });

      // 3. Restore underlying cards
      await tx.card.updateMany({
        where: { projectId: id },
        data: {
          deletedAt: null,
          deletedBy: null,
        },
      });

      // 4. Restore underlying tags
      await tx.tag.updateMany({
        where: { projectId: id },
        data: {
          deletedAt: null,
          deletedBy: null,
        },
      });

      // 5. Activity log
      await tx.activityLog.create({
        data: {
          projectId: id,
          performedBy: performedBy || null,
          action: ActivityAction.RESTORE_PROJECT,
          newValue: {
            name: existing.name,
          },
        },
      });
    });

    return { success: true, message: 'Project and underlying data restored successfully' };
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
        where: { id: { in: uniqueUserIds }, deletedAt: null },
        select: { id: true },
      });
      if (existingUsers.length !== uniqueUserIds.length) {
        throw { statusCode: 400, message: 'One or more selected users do not exist or are deactivated' };
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

  static async getUsers(includeDeleted = false) {
    const where: any = {};
    if (!includeDeleted) {
      where.deletedAt = null;
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        isLocked: true,
        deletedAt: true,
        deletedBy: true,
        createdAt: true,
        projectMembers: {
          where: {
            project: { deletedAt: null },
          },
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
      isLocked: u.isLocked,
      isDeleted: !!u.deletedAt,
      deletedAt: u.deletedAt,
      deletedBy: u.deletedBy,
      createdAt: u.createdAt,
      assignedProjects: u.projectMembers.map((pm) => ({
        id: pm.project.id,
        name: pm.project.name,
      })),
    }));
  }

  static async toggleLockUser(userId: string, isLocked: boolean, performedBy?: string, callerRole?: Role) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw { statusCode: 404, message: 'User not found' };
    }

    // Super Admin cannot be locked
    if (user.role === Role.SUPER_ADMIN) {
      throw { statusCode: 403, message: 'Super Administrator accounts cannot be locked' };
    }

    // Standard Admin cannot lock/unlock other Admins
    if (user.role === Role.ADMIN && callerRole !== Role.SUPER_ADMIN) {
      throw { statusCode: 403, message: 'Only a Super Administrator can lock or unlock Administrator accounts' };
    }

    if (user.role === Role.ADMIN && isLocked) {
      const activeAdminCount = await prisma.user.count({
        where: { role: { in: [Role.ADMIN, Role.SUPER_ADMIN] }, isLocked: false, deletedAt: null },
      });
      if (activeAdminCount <= 1) {
        throw { statusCode: 400, message: 'Cannot lock the only active administrator account' };
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isLocked },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        isLocked: true,
        updatedAt: true,
      },
    });

    return updated;
  }

  static async deleteUser(userId: string, performedBy?: string, callerRole?: Role) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw { statusCode: 404, message: 'User not found' };
    }

    // Super Admin cannot be deleted
    if (user.role === Role.SUPER_ADMIN) {
      throw { statusCode: 403, message: 'Super Administrator accounts cannot be deactivated' };
    }

    // Standard Admin cannot delete other Admins
    if (user.role === Role.ADMIN && callerRole !== Role.SUPER_ADMIN) {
      throw { statusCode: 403, message: 'Only a Super Administrator can deactivate Administrator accounts' };
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        deletedBy: performedBy || null,
      },
      select: {
        id: true,
        username: true,
        deletedAt: true,
      },
    });

    return { success: true, message: `User @${user.username} deactivated successfully` };
  }

  static async restoreUser(userId: string, performedBy?: string, callerRole?: Role) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw { statusCode: 404, message: 'User not found' };
    }

    if (user.role === Role.ADMIN && callerRole !== Role.SUPER_ADMIN) {
      throw { statusCode: 403, message: 'Only a Super Administrator can restore Administrator accounts' };
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: null,
        deletedBy: null,
      },
    });

    return { success: true, message: `User @${user.username} restored successfully` };
  }

  static async updateUserRole(userId: string, role: Role, callerRole?: Role) {
    if (!Object.values(Role).includes(role)) {
      throw { statusCode: 400, message: `Invalid role: ${role}` };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw { statusCode: 404, message: 'User not found' };
    }

    // Protection: Only Super Admin can change a Super Admin's role
    if (user.role === Role.SUPER_ADMIN && callerRole !== Role.SUPER_ADMIN) {
      throw { statusCode: 403, message: 'Only a Super Administrator can alter Super Administrator accounts' };
    }

    // Protection: Only Super Admin can alter an Admin's role
    if (user.role === Role.ADMIN && callerRole !== Role.SUPER_ADMIN) {
      throw { statusCode: 403, message: 'Only a Super Administrator can alter Administrator roles' };
    }

    // Protection: Disallow promoting anyone to Super Admin (only 1 Super Admin allowed)
    if (role === Role.SUPER_ADMIN) {
      throw { statusCode: 400, message: 'There can only be one Super Administrator in the system' };
    }

    // Protection: Only Super Admin can promote someone to Admin
    if (role === Role.ADMIN && callerRole !== Role.SUPER_ADMIN) {
      throw { statusCode: 403, message: 'Only a Super Administrator can assign Administrator roles' };
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

  static async resetUserPassword(userId: string, newPassword: string, callerRole?: Role) {
    if (!newPassword || newPassword.length < 6) {
      throw { statusCode: 400, message: 'Password must be at least 6 characters' };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw { statusCode: 404, message: 'User not found' };
    }

    // Only Super Admin can reset password of Super Admin
    if (user.role === Role.SUPER_ADMIN && callerRole !== Role.SUPER_ADMIN) {
      throw { statusCode: 403, message: 'Only a Super Administrator can reset the password of a Super Administrator' };
    }

    // Only Super Admin can reset password of Admin
    if (user.role === Role.ADMIN && callerRole !== Role.SUPER_ADMIN) {
      throw { statusCode: 403, message: 'Only a Super Administrator can reset the password of an Administrator' };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { success: true, message: `Password reset successfully for @${user.username}` };
  }

  static async createUser(
    input: {
      name: string;
      username: string;
      password: string;
      role?: Role;
    },
    callerRole?: Role,
    performedBy?: string
  ) {
    const trimmedName = input.name?.trim();
    const trimmedUsername = input.username?.trim();
    const password = input.password;
    const role = input.role || Role.MEMBER;

    if (!trimmedName) {
      throw { statusCode: 400, message: 'Name is required' };
    }
    if (!trimmedUsername) {
      throw { statusCode: 400, message: 'Username is required' };
    }
    if (!password || password.length < 6) {
      throw { statusCode: 400, message: 'Password must be at least 6 characters' };
    }

    // Constraint: Single Super Admin rule
    if (role === Role.SUPER_ADMIN) {
      throw { statusCode: 400, message: 'There can only be one Super Administrator in the system' };
    }

    // Constraint: Standard Admin cannot create another Admin
    if (role === Role.ADMIN && callerRole !== Role.SUPER_ADMIN) {
      throw { statusCode: 403, message: 'Only Super Administrator can create Administrator accounts' };
    }

    // Limit check: active users <= 10
    const userCount = await prisma.user.count({ where: { deletedAt: null } });
    if (userCount >= 10) {
      throw { statusCode: 400, message: 'User limit reached. Maximum 10 active users allowed.' };
    }

    const existing = await prisma.user.findUnique({
      where: { username: trimmedUsername },
    });
    if (existing) {
      throw { statusCode: 400, message: 'Username is already taken' };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name: trimmedName,
        username: trimmedUsername,
        password: hashedPassword,
        role,
      },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        createdAt: true,
      },
    });

    return newUser;
  }

  static async getActivityLogs(filters?: {
    page?: number;
    limit?: number;
    projectId?: string;
    action?: string;
    userId?: string;
    from?: string;
    to?: string;
  }) {
    return await ActivityService.getAllActivities(filters);
  }
}

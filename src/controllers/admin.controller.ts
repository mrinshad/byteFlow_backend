import type { Request, Response, NextFunction } from 'express';
import { AdminService } from '../services/admin.service.js';

export class AdminController {
  static async getStats(_req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await AdminService.getStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }

  static async getProjects(req: Request, res: Response, next: NextFunction) {
    try {
      const includeDeleted = req.query.includeDeleted === 'true';
      const projects = await AdminService.getProjects(includeDeleted);
      res.json({ success: true, data: projects });
    } catch (error) {
      next(error);
    }
  }

  static async restoreProject(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const performedBy = req.user?.id;
      const result = await AdminService.restoreProject(id, performedBy);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async updateProjectMembers(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { userIds } = req.body;

      if (!Array.isArray(userIds)) {
        res.status(400).json({
          success: false,
          error: { message: 'userIds must be an array of user IDs' },
        });
        return;
      }

      const assignerName = req.user?.name || req.user?.username;
      const assignerId = req.user?.id;
      const members = await AdminService.updateProjectMembers(id, userIds, assignerName, assignerId);
      res.json({ success: true, data: members });
    } catch (error) {
      next(error);
    }
  }

  static async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const includeDeleted = req.query.includeDeleted === 'true';
      const users = await AdminService.getUsers(includeDeleted);
      res.json({ success: true, data: users });
    } catch (error) {
      next(error);
    }
  }

  static async toggleLockUser(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { isLocked } = req.body;

      if (typeof isLocked !== 'boolean') {
        res.status(400).json({
          success: false,
          error: { message: 'isLocked must be a boolean' },
        });
        return;
      }

      const performedBy = req.user?.id;
      const callerRole = req.user?.role;
      const updated = await AdminService.toggleLockUser(id, isLocked, performedBy, callerRole);
      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  static async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const performedBy = req.user?.id;
      const callerRole = req.user?.role;
      const result = await AdminService.deleteUser(id, performedBy, callerRole);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async restoreUser(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const performedBy = req.user?.id;
      const callerRole = req.user?.role;
      const result = await AdminService.restoreUser(id, performedBy, callerRole);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async updateUserRole(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { role } = req.body;

      if (!role) {
        res.status(400).json({
          success: false,
          error: { message: 'Role is required' },
        });
        return;
      }

      const callerRole = req.user?.role;
      const updated = await AdminService.updateUserRole(id, role, callerRole);
      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { password } = req.body;

      if (!password) {
        res.status(400).json({
          success: false,
          error: { message: 'New password is required' },
        });
        return;
      }

      const callerRole = req.user?.role;
      const result = await AdminService.resetUserPassword(id, password, callerRole);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getActivityLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, projectId, action, userId, from, to } = req.query;
      const result = await AdminService.getActivityLogs({
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        projectId: projectId ? String(projectId) : undefined,
        action: action ? String(action) : undefined,
        userId: userId ? String(userId) : undefined,
        from: from ? String(from) : undefined,
        to: to ? String(to) : undefined,
      });
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }
}

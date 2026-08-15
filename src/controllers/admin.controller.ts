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

  static async getProjects(_req: Request, res: Response, next: NextFunction) {
    try {
      const projects = await AdminService.getProjects();
      res.json({ success: true, data: projects });
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

      const members = await AdminService.updateProjectMembers(id, userIds);
      res.json({ success: true, data: members });
    } catch (error) {
      next(error);
    }
  }

  static async getUsers(_req: Request, res: Response, next: NextFunction) {
    try {
      const users = await AdminService.getUsers();
      res.json({ success: true, data: users });
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

      const updated = await AdminService.updateUserRole(id, role);
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

      const result = await AdminService.resetUserPassword(id, password);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

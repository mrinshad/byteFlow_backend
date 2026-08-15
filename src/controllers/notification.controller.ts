import type { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notification.service.js';

export class NotificationController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw { statusCode: 401, message: 'Authentication required' };
      }

      const { type, page, limit } = req.query;
      const result = await NotificationService.getUserNotifications(userId, {
        type: type === 'MENTION' ? 'MENTION' : 'ALL',
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });

      res.status(200).json({
        success: true,
        data: result.data,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getUnreadCount(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw { statusCode: 401, message: 'Authentication required' };
      }

      const result = await NotificationService.getUnreadCount(userId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw { statusCode: 401, message: 'Authentication required' };
      }

      const id = req.params.id as string;
      const updated = await NotificationService.markAsRead(id, userId);

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  static async markAllAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw { statusCode: 401, message: 'Authentication required' };
      }

      const result = await NotificationService.markAllAsRead(userId);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

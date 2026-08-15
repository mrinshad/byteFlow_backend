import type { Request, Response, NextFunction } from 'express';
import { ActivityService } from '../services/activity.service.js';

export class ActivityController {
  static async listByCard(req: Request, res: Response, next: NextFunction) {
    try {
      const cardId = req.params.cardId as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

      const activities = await ActivityService.getCardActivities(cardId, limit);

      res.status(200).json({
        success: true,
        data: activities,
      });
    } catch (error) {
      next(error);
    }
  }

  static async listByProject(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.projectId as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;

      const activities = await ActivityService.getProjectActivities(projectId, limit);

      res.status(200).json({
        success: true,
        data: activities,
      });
    } catch (error) {
      next(error);
    }
  }
}

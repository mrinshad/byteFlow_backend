import type { Request, Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboard.service.js';

export class DashboardController {
  static async getProjectStats(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.projectId as string;
      const stats = await DashboardService.getProjectStats(projectId);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getGlobalStats(_req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await DashboardService.getGlobalStats();

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}

import type { Request, Response, NextFunction } from 'express';
import { LaneService } from '../services/lane.service.js';

export class LaneController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { projectId, name, color, createdBy } = req.body || {};
      const lane = await LaneService.createLane({
        projectId,
        name,
        color,
        createdBy,
      });

      res.status(201).json({
        success: true,
        data: lane,
      });
    } catch (error) {
      next(error);
    }
  }

  static async listByProject(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.projectId as string;
      const lanes = await LaneService.getLanesByProject(projectId);

      res.status(200).json({
        success: true,
        data: lanes,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const lane = await LaneService.getLaneById(id);

      res.status(200).json({
        success: true,
        data: lane,
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { name, color, performedBy } = req.body || {};
      const lane = await LaneService.updateLane(id, {
        name,
        color,
        performedBy,
      });

      res.status(200).json({
        success: true,
        data: lane,
      });
    } catch (error) {
      next(error);
    }
  }

  static async reorder(req: Request, res: Response, next: NextFunction) {
    try {
      const { projectId, items, performedBy } = req.body || {};
      if (!projectId) {
        throw { statusCode: 400, message: 'Project ID is required for reordering' };
      }

      const lanes = await LaneService.reorderLanes(projectId, items, performedBy);

      res.status(200).json({
        success: true,
        data: lanes,
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const performedBy = (req.body?.performedBy || req.query.performedBy) as string | undefined;
      const result = await LaneService.deleteLane(id, performedBy);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }
}

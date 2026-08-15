import type { Request, Response, NextFunction } from 'express';
import { ProjectService } from '../services/project.service.js';

export class ProjectController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, description } = req.body || {};
      const createdBy = req.user?.id;
      const userRole = req.user?.role;

      const project = await ProjectService.createProject({
        name,
        description,
        createdBy,
        userRole,
      });

      res.status(201).json({
        success: true,
        data: project,
      });
    } catch (error) {
      next(error);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { search, page, limit, sortBy, sortOrder } = req.query;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      const result = await ProjectService.getProjects({
        search: typeof search === 'string' ? search : undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        sortBy: sortBy as any,
        sortOrder: sortOrder as any,
        userId,
        userRole,
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

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      const project = await ProjectService.getProjectById(id, userId, userRole);

      res.status(200).json({
        success: true,
        data: project,
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { name, description } = req.body || {};
      const performedBy = req.user?.id;
      const userRole = req.user?.role;

      const updated = await ProjectService.updateProject(id, {
        name,
        description,
        performedBy,
        userRole,
      });

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const performedBy = req.user?.id;
      const userRole = req.user?.role;

      const result = await ProjectService.deleteProject(id, performedBy, userRole);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

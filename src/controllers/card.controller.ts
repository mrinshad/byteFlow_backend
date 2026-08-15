import type { Request, Response, NextFunction } from 'express';
import { CardService } from '../services/card.service.js';

export class CardController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { projectId, laneId, title, description, priority, dueDate, assigneeId, createdBy } =
        req.body || {};

      const author = createdBy || req.user?.name || req.user?.username;
      const senderId = req.user?.id;

      const card = await CardService.createCard({
        projectId,
        laneId,
        title,
        description,
        priority,
        dueDate,
        assigneeId,
        createdBy: author,
        senderId,
      });

      res.status(201).json({
        success: true,
        data: card,
      });
    } catch (error) {
      next(error);
    }
  }

  static async listByProject(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.projectId as string;
      const { laneId, priority, assigneeId, tagId, dueDateFilter, fromDate, toDate, search, includeDeleted } =
        req.query;

      const cards = await CardService.getCardsByProject(projectId, {
        laneId: typeof laneId === 'string' ? laneId : undefined,
        priority: priority as any,
        assigneeId: typeof assigneeId === 'string' ? assigneeId : undefined,
        tagId: typeof tagId === 'string' ? tagId : undefined,
        dueDateFilter: dueDateFilter as any,
        fromDate: typeof fromDate === 'string' ? fromDate : undefined,
        toDate: typeof toDate === 'string' ? toDate : undefined,
        search: typeof search === 'string' ? search : undefined,
        includeDeleted: includeDeleted === 'true',
      });

      res.status(200).json({
        success: true,
        data: cards,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const card = await CardService.getCardById(id);

      res.status(200).json({
        success: true,
        data: card,
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { title, description, priority, dueDate, assigneeId, performedBy } = req.body || {};
      const userPerformer = performedBy || req.user?.name || req.user?.username;
      const senderId = req.user?.id;

      const card = await CardService.updateCard(id, {
        title,
        description,
        priority,
        dueDate,
        assigneeId,
        performedBy: userPerformer,
        senderId,
      });

      res.status(200).json({
        success: true,
        data: card,
      });
    } catch (error) {
      next(error);
    }
  }

  static async move(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { targetLaneId, position, performedBy } = req.body || {};
      const userPerformer = performedBy || req.user?.name || req.user?.username;
      const senderId = req.user?.id;

      if (!targetLaneId || position === undefined) {
        throw { statusCode: 400, message: 'targetLaneId and position are required' };
      }

      const card = await CardService.moveCard(id, {
        targetLaneId,
        position: Number(position),
        performedBy: userPerformer,
        senderId,
      });

      res.status(200).json({
        success: true,
        data: card,
      });
    } catch (error) {
      next(error);
    }
  }

  static async reorder(req: Request, res: Response, next: NextFunction) {
    try {
      const { projectId, items, performedBy } = req.body || {};
      const userPerformer = performedBy || req.user?.name || req.user?.username;

      if (!projectId) {
        throw { statusCode: 400, message: 'Project ID is required for reordering' };
      }

      const cards = await CardService.reorderCards(projectId, items, userPerformer);

      res.status(200).json({
        success: true,
        data: cards,
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const performedBy = (req.body?.performedBy || req.query.performedBy || req.user?.name || req.user?.username) as string | undefined;
      const result = await CardService.deleteCard(id, performedBy);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  static async restore(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const performedBy = (req.body?.performedBy || req.query.performedBy || req.user?.name || req.user?.username) as string | undefined;
      const card = await CardService.restoreCard(id, performedBy);

      res.status(200).json({
        success: true,
        data: card,
      });
    } catch (error) {
      next(error);
    }
  }
}

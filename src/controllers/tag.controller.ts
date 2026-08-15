import type { Request, Response, NextFunction } from 'express';
import { TagService } from '../services/tag.service.js';

export class TagController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { projectId, name, color, createdBy } = req.body || {};
      const author = createdBy || req.user?.name || req.user?.username;

      const tag = await TagService.createTag({
        projectId,
        name,
        color,
        createdBy: author,
      });

      res.status(201).json({
        success: true,
        data: tag,
      });
    } catch (error) {
      next(error);
    }
  }

  static async listByProject(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.projectId as string;
      const tags = await TagService.getTagsByProject(projectId);

      res.status(200).json({
        success: true,
        data: tags,
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { name, color, performedBy } = req.body || {};
      const author = performedBy || req.user?.name || req.user?.username;

      const updated = await TagService.updateTag(id, {
        name,
        color,
        performedBy: author,
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
      const performedBy = (req.body?.performedBy || req.query.performedBy || req.user?.name || req.user?.username) as string | undefined;
      const result = await TagService.deleteTag(id, performedBy);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  static async assignToCard(req: Request, res: Response, next: NextFunction) {
    try {
      const cardId = req.params.cardId as string;
      const { tagId, performedBy } = req.body || {};
      const author = performedBy || req.user?.name || req.user?.username;

      if (!tagId) {
        throw { statusCode: 400, message: 'tagId is required' };
      }

      const cardTag = await TagService.assignTagToCard(cardId, tagId, author);

      res.status(200).json({
        success: true,
        data: cardTag,
      });
    } catch (error) {
      next(error);
    }
  }

  static async removeFromCard(req: Request, res: Response, next: NextFunction) {
    try {
      const cardId = req.params.cardId as string;
      const tagId = req.params.tagId as string;
      const performedBy = (req.body?.performedBy || req.query.performedBy || req.user?.name || req.user?.username) as string | undefined;

      const result = await TagService.removeTagFromCard(cardId, tagId, performedBy);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }
}

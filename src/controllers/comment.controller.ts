import type { Request, Response, NextFunction } from 'express';
import { CommentService } from '../services/comment.service.js';

export class CommentController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { cardId, comment, createdBy } = req.body || {};
      const senderId = req.user?.id;
      const author = createdBy || req.user?.name || req.user?.username || 'A team member';

      const newComment = await CommentService.createComment({
        cardId,
        comment,
        createdBy: author,
        senderId,
        creatorName: author,
      });

      res.status(201).json({
        success: true,
        data: newComment,
      });
    } catch (error) {
      next(error);
    }
  }

  static async listByCard(req: Request, res: Response, next: NextFunction) {
    try {
      const cardId = req.params.cardId as string;
      const comments = await CommentService.getCommentsByCard(cardId);

      res.status(200).json({
        success: true,
        data: comments,
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { comment, performedBy } = req.body || {};
      const author = performedBy || req.user?.name || req.user?.username;

      const updated = await CommentService.updateComment(id, {
        comment,
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
      const result = await CommentService.deleteComment(id, performedBy);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }
}

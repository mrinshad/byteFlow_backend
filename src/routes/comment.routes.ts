import { Router } from 'express';
import { CommentController } from '../controllers/comment.controller.js';

const router = Router();

router.post('/', CommentController.create);
router.get('/card/:cardId', CommentController.listByCard);
router.patch('/:id', CommentController.update);
router.delete('/:id', CommentController.delete);

export default router;

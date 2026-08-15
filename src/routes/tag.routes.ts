import { Router } from 'express';
import { TagController } from '../controllers/tag.controller.js';

const router = Router();

router.post('/', TagController.create);
router.get('/project/:projectId', TagController.listByProject);
router.patch('/:id', TagController.update);
router.delete('/:id', TagController.delete);
router.post('/card/:cardId/assign', TagController.assignToCard);
router.delete('/card/:cardId/tag/:tagId', TagController.removeFromCard);

export default router;

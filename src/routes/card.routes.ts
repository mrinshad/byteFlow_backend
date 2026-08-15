import { Router } from 'express';
import { CardController } from '../controllers/card.controller.js';

const router = Router();

router.post('/', CardController.create);
router.put('/reorder', CardController.reorder);
router.get('/project/:projectId', CardController.listByProject);
router.get('/:id', CardController.getById);
router.patch('/:id', CardController.update);
router.put('/:id/move', CardController.move);
router.delete('/:id', CardController.delete);
router.post('/:id/restore', CardController.restore);

export default router;

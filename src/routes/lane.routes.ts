import { Router } from 'express';
import { LaneController } from '../controllers/lane.controller.js';

const router = Router();

router.post('/', LaneController.create);
router.put('/reorder', LaneController.reorder);
router.get('/project/:projectId', LaneController.listByProject);
router.get('/:id', LaneController.getById);
router.patch('/:id', LaneController.update);
router.delete('/:id', LaneController.delete);

export default router;

import { Router } from 'express';
import { ActivityController } from '../controllers/activity.controller.js';

const router = Router();

router.get('/card/:cardId', ActivityController.listByCard);
router.get('/project/:projectId', ActivityController.listByProject);

export default router;

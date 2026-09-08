import { Router } from 'express';
import { ProjectController } from '../controllers/project.controller.js';

const router = Router();

router.post('/', ProjectController.create);
router.get('/', ProjectController.list);
router.get('/:id/members-summary', ProjectController.getMembersSummary);
router.get('/:id', ProjectController.getById);
router.patch('/:id', ProjectController.update);
router.delete('/:id', ProjectController.delete);

export default router;

import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller.js';

const router = Router();

router.get('/global', DashboardController.getGlobalStats);
router.get('/project/:projectId', DashboardController.getProjectStats);

export default router;

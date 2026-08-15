import { Router } from 'express';
import { Role } from '@prisma/client';
import { AdminController } from '../controllers/admin.controller.js';
import { requireRole } from '../middleware/role.middleware.js';

const router = Router();

// Protect all admin routes with ADMIN role
router.use(requireRole(Role.ADMIN));

router.get('/stats', AdminController.getStats);
router.get('/projects', AdminController.getProjects);
router.post('/projects/:id/restore', AdminController.restoreProject);
router.put('/projects/:id/members', AdminController.updateProjectMembers);

router.get('/users', AdminController.getUsers);
router.post('/users', AdminController.createUser);
router.patch('/users/:id/role', AdminController.updateUserRole);
router.patch('/users/:id/lock', AdminController.toggleLockUser);
router.delete('/users/:id', AdminController.deleteUser);
router.post('/users/:id/restore', AdminController.restoreUser);
router.post('/users/:id/reset-password', AdminController.resetPassword);

router.get('/activities', AdminController.getActivityLogs);

export default router;

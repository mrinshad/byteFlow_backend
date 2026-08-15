import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller.js';

const router = Router();

router.get('/', NotificationController.list);
router.get('/unread-count', NotificationController.getUnreadCount);
router.patch('/:id/read', NotificationController.markAsRead);
router.post('/mark-all-read', NotificationController.markAllAsRead);

export default router;

import express from 'express';
import { 
  getMyNotifications, 
  getUnreadCount, 
  markAsRead, 
  markAllAsRead,
  deleteNotification,
  getNotificationPreferences,
  updateNotificationPreferences,
  registerPushToken,
  deregisterPushToken,
  sendTestPush
} from '../controllers/notification.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/push-token', protect, registerPushToken);
router.delete('/push-token', protect, deregisterPushToken);
router.post('/test-push', protect, sendTestPush);

router.get('/unread-count', protect, getUnreadCount);
router.patch('/read-all', protect, markAllAsRead);
router.put('/read-all', protect, markAllAsRead);
router.post('/read-all', protect, markAllAsRead);
router.get('/preferences', protect, getNotificationPreferences);
router.patch('/preferences', protect, updateNotificationPreferences);
router.get('/', protect, getMyNotifications);
router.patch('/:id/read', protect, markAsRead);
router.put('/:id/read', protect, markAsRead);
router.post('/:id/read', protect, markAsRead);
router.delete('/:id', protect, deleteNotification);

export default router;

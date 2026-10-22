import express from 'express';
import {
  createReport,
  getMyReports,
  getAdminReports,
  getReportById,
  resolveReport
} from '../controllers/report.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { authorize, authorizeAdminRole } from '../middleware/role.middleware.js';

const router = express.Router();

// User endpoints
router.post('/', protect, createReport);
router.get('/my', protect, getMyReports);
router.get('/:id', protect, getReportById);

// Admin moderation endpoints
router.get('/admin/all', protect, authorize('admin'), getAdminReports);
router.get('/admin/:id', protect, authorize('admin'), getReportById);
router.patch('/admin/:id/resolve', protect, authorize('admin'), authorizeAdminRole('super_admin', 'support_admin', 'verification_admin'), resolveReport);

export default router;

import express from 'express';
import {
  applyForJob,
  getJobApplications,
  getVendorApplications,
  withdrawApplication,
  updateApplicationStatus
} from '../controllers/application.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';

const router = express.Router();

router.post('/', protect, authorize('vendor'), applyForJob);
router.get('/job/:jobId', protect, getJobApplications);
router.get('/vendor', protect, authorize('vendor'), getVendorApplications);
router.patch('/:id/withdraw', protect, authorize('vendor'), withdrawApplication);
router.put('/:id/withdraw', protect, authorize('vendor'), withdrawApplication);
router.patch('/:id/status', protect, updateApplicationStatus);
router.put('/:id/status', protect, updateApplicationStatus);

export default router;

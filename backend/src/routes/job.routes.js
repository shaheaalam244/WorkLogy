import express from 'express';
import {
  getJobs,
  getNearbyJobs,
  getJobById,
  createJob,
  updateJob,
  deleteJob,
  getMyCustomerJobs,
  updateJobStatus,
  uploadJobImage,
  claimJobInstant,
  getEmergencyLeads,
  declineJob,
  cancelJob,
  retryJobDispatch
} from '../controllers/job.controller.js';
import { protect, optionalAuth } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { validateCreateJob } from '../validators/job.validator.js';
import { upload, uploadSingleImage } from '../middleware/upload.middleware.js';

const router = express.Router();

router.get('/', optionalAuth, getJobs);
router.get('/nearby', protect, authorize('vendor'), getNearbyJobs);
router.get('/emergency-leads', protect, authorize('vendor'), getEmergencyLeads);
router.post('/', protect, authorize('customer', 'admin'), validateCreateJob, createJob);

router.post('/upload-image', protect, uploadSingleImage, uploadJobImage);
router.get('/my-customer-jobs', protect, authorize('customer', 'admin'), getMyCustomerJobs);
router.get('/my-jobs', protect, authorize('customer', 'admin'), getMyCustomerJobs);
router.get('/open', protect, authorize('vendor'), getNearbyJobs);
router.post('/:id/accept', protect, authorize('vendor'), claimJobInstant);
router.post('/:id/claim', protect, authorize('vendor'), claimJobInstant);
router.post('/:id/claim-instant', protect, authorize('vendor'), claimJobInstant);
router.post('/:id/decline', protect, authorize('vendor'), declineJob);
router.post('/:id/cancel', protect, cancelJob);
router.patch('/:id/cancel', protect, cancelJob);
router.post('/:id/retry-dispatch', protect, retryJobDispatch);
router.get('/:id', optionalAuth, getJobById);
router.put('/:id', protect, updateJob);
router.delete('/:id', protect, deleteJob);
router.patch('/:id/status', protect, updateJobStatus);

export default router;


import express from 'express';
import {
  createJobRequest,
  getVendorRequests,
  getCustomerRequests,
  updateRequestStatus
} from '../controllers/jobRequest.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';

const router = express.Router();

router.post('/', protect, authorize('customer'), createJobRequest);
router.get('/vendor', protect, authorize('vendor'), getVendorRequests);
router.get('/customer', protect, authorize('customer'), getCustomerRequests);
router.patch('/:id/status', protect, updateRequestStatus);

export default router;

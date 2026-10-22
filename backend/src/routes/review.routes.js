import express from 'express';
import { 
  createReview, 
  getVendorReviews, 
  getMyReviews, 
  respondToReview,
  checkReviewEligibility,
  getBookingReview,
  getAwaitingReviews
} from '../controllers/review.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';

const router = express.Router();

router.post('/', protect, authorize('customer', 'admin'), createReview);
router.get('/awaiting', protect, authorize('customer', 'admin'), getAwaitingReviews);
router.get('/eligible/:vendorId', protect, authorize('customer', 'admin'), checkReviewEligibility);
router.get('/booking/:bookingId', protect, getBookingReview);
router.get('/me', protect, authorize('vendor', 'admin'), getMyReviews);
router.get('/vendor/:vendorId', getVendorReviews);
router.post('/:id/respond', protect, authorize('vendor', 'admin'), respondToReview);

export default router;

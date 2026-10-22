import express from 'express';
import {
  createDirectBooking,
  respondDirectBooking,
  getVendorBookings,
  getBookingById,
  getBookingByJobId,
  approveBookingCompletion,
  updateBookingStatus,
  requestReschedule,
  getCustomerStartOtp,
  verifyArrival,
  verifyStartOtp,
  regenerateStartOtp
} from '../controllers/booking.controller.js';
import { getCustomerBookings } from '../controllers/customer.controller.js';
import { createReview, getBookingReview } from '../controllers/review.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';

const router = express.Router();

router.post('/:bookingId/reviews', protect, authorize('customer', 'admin'), createReview);
router.get('/:bookingId/reviews', protect, getBookingReview);
router.get('/:bookingId/review', protect, getBookingReview);

router.post('/direct', protect, authorize('customer', 'admin'), createDirectBooking);
router.patch('/:id/respond', protect, authorize('vendor', 'admin'), respondDirectBooking);
router.get('/vendor', protect, authorize('vendor', 'admin'), getVendorBookings);
router.get('/customer', protect, authorize('customer', 'admin'), getCustomerBookings);
router.get('/my', protect, getCustomerBookings);
router.get('/by-job/:jobId', protect, getBookingByJobId);
router.get('/:id/start-otp', protect, authorize('customer', 'admin'), getCustomerStartOtp);
router.post('/:id/verify-arrival', protect, authorize('vendor', 'admin'), verifyArrival);
router.post('/:id/verify-start-otp', protect, authorize('vendor', 'admin'), verifyStartOtp);
router.post('/:id/verify-start', protect, authorize('vendor', 'admin'), verifyStartOtp);
router.post('/:id/regenerate-start-otp', protect, authorize('customer', 'admin'), regenerateStartOtp);
router.post('/:id/approve-completion', protect, authorize('customer', 'admin'), approveBookingCompletion);
router.patch('/:id/approve-completion', protect, authorize('customer', 'admin'), approveBookingCompletion);
router.get('/:id', protect, getBookingById);
router.patch('/:id/status', protect, authorize('vendor', 'admin'), updateBookingStatus);
router.patch('/:id/reschedule', protect, authorize('vendor', 'admin'), requestReschedule);

export default router;

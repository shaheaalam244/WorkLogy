import express from 'express';
import {
  getCustomerDashboardSummary,
  getCustomerBookings,
  cancelCustomerBooking,
  getCustomerQuotations,
  getCustomerTransactions
} from '../controllers/customer.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';

const router = express.Router();

router.get('/dashboard/summary', protect, authorize('customer', 'admin'), getCustomerDashboardSummary);
router.get('/bookings', protect, authorize('customer', 'admin'), getCustomerBookings);
router.patch('/bookings/:id/cancel', protect, authorize('customer', 'admin'), cancelCustomerBooking);
router.get('/quotations', protect, authorize('customer', 'admin'), getCustomerQuotations);
router.get('/transactions', protect, authorize('customer', 'admin'), getCustomerTransactions);

export default router;

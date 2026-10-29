import express from 'express';
import {
  getCustomerDashboardSummary,
  getCustomerBookings,
  cancelCustomerBooking,
  getCustomerQuotations,
  getCustomerTransactions,
  getCustomerStats
} from '../controllers/customer.controller.js';
import {
  getAddresses,
  addAddress,
  updateAddress,
  removeAddress
} from '../controllers/user.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';

const router = express.Router();

router.get('/dashboard/summary', protect, authorize('customer', 'admin'), getCustomerDashboardSummary);
router.get('/stats', protect, authorize('customer', 'admin'), getCustomerStats);
router.get('/bookings', protect, authorize('customer', 'admin'), getCustomerBookings);
router.patch('/bookings/:id/cancel', protect, authorize('customer', 'admin'), cancelCustomerBooking);
router.get('/quotations', protect, authorize('customer', 'admin'), getCustomerQuotations);
router.get('/transactions', protect, authorize('customer', 'admin'), getCustomerTransactions);
router.get('/addresses', protect, authorize('customer', 'admin'), getAddresses);
router.post('/addresses', protect, authorize('customer'), addAddress);
router.put('/addresses/:addressId', protect, authorize('customer'), updateAddress);
router.delete('/addresses/:addressId', protect, authorize('customer'), removeAddress);

export default router;

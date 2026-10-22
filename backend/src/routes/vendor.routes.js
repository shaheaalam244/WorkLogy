import express from 'express';
import {
  getVendors,
  getVendorById,
  getVendorProfile,
  updateVendorProfile,
  submitVerificationDocs,
  getVerificationStatus,
  getVendorEarnings,
  getVendorTransactions,
  getVendorAvailability,
  updateVendorAvailability,
  getVendorCalendar,
  getVendorDashboardStats,
  getMyServices,
  createServiceListing,
  getServiceListingById,
  updateServiceListing,
  updateServiceListingStatus,
  deleteServiceListing
} from '../controllers/vendor.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';

const router = express.Router();

// Public routes
router.get('/', getVendors);

// Protected vendor routes
router.get('/profile', protect, authorize('vendor', 'admin'), getVendorProfile);
router.patch('/profile', protect, authorize('vendor', 'admin'), updateVendorProfile);
router.put('/profile', protect, authorize('vendor', 'admin'), updateVendorProfile);
router.get('/profile/me', protect, authorize('vendor', 'admin'), getVendorProfile);
router.put('/profile/me', protect, authorize('vendor', 'admin'), updateVendorProfile);
router.post('/verification', protect, authorize('vendor', 'admin'), submitVerificationDocs);
router.get('/verification/status', protect, authorize('vendor', 'admin'), getVerificationStatus);
router.get('/dashboard-stats', protect, authorize('vendor', 'admin'), getVendorDashboardStats);

// Services management
router.get('/services/my', protect, authorize('vendor', 'admin'), getMyServices);
router.post('/services', protect, authorize('vendor', 'admin'), createServiceListing);
router.get('/services/:id', protect, authorize('vendor', 'admin'), getServiceListingById);
router.put('/services/:id', protect, authorize('vendor', 'admin'), updateServiceListing);
router.patch('/services/:id/status', protect, authorize('vendor', 'admin'), updateServiceListingStatus);
router.delete('/services/:id', protect, authorize('vendor', 'admin'), deleteServiceListing);

// Financials & Transactions
router.get('/earnings', protect, authorize('vendor', 'admin'), getVendorEarnings);
router.get('/transactions', protect, authorize('vendor', 'admin'), getVendorTransactions);

// Availability & Calendar
router.get('/availability', protect, authorize('vendor', 'admin'), getVendorAvailability);
router.put('/availability', protect, authorize('vendor', 'admin'), updateVendorAvailability);
router.get('/calendar', protect, authorize('vendor', 'admin'), getVendorCalendar);

// Specific vendor profile (public)
router.get('/:id', getVendorById);

export default router;

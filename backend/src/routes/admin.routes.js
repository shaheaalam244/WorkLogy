import express from 'express';
import {
  getAdminStats,
  getVendors,
  getVendorById,
  updateVendorApproval,
  reviewVendorDocument,
  serveVendorDocument,
  getVerificationRequests,
  getVerificationRequestById,
  reviewVerificationRequest,
  addVendorAdminNote,
  toggleVendorService,
  getCustomers,
  updateCustomerStatus,
  getCategories,
  createCategory,
  updateCategory,
  toggleCategoryStatus,
  getCatalogServices,
  createCatalogService,
  updateCatalogService,
  toggleCatalogServiceStatus,
  getAdminJobs,
  reassignJob,
  retryEmergencyDispatch,
  getTransactions,
  getDisputes,
  resolveDispute,
  getReviews,
  moderateReview,
  getAdminReports,
  resolveAdminReport,
  getAdminNotifications,
  markAdminNotificationRead,
  getPlatformSettings,
  updatePlatformSettings,
  getSystemLogs
} from '../controllers/admin.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { authorize, authorizeAdminRole } from '../middleware/role.middleware.js';

const router = express.Router();

// All admin endpoints require authentication and base 'admin' role
router.use(protect, authorize('admin'));

// 1. Dashboard Overview
router.get('/stats', getAdminStats);

// 2. Professional Approvals & Management
router.get('/vendors', getVendors);
router.get('/vendors/:id', getVendorById);
router.patch('/vendors/:id/approval', authorizeAdminRole('super_admin', 'verification_admin'), updateVendorApproval);
router.patch('/vendors/:id/documents/:docIndex', authorizeAdminRole('super_admin', 'verification_admin'), reviewVendorDocument);
router.get('/vendors/:id/documents/:docIndex', serveVendorDocument);
router.get('/vendors/:id/documents/:docIndex/:mode', serveVendorDocument);
router.get('/verifications', authorizeAdminRole('super_admin', 'verification_admin'), getVerificationRequests);
router.get('/verifications/:id', authorizeAdminRole('super_admin', 'verification_admin'), getVerificationRequestById);
router.patch('/verifications/:id', authorizeAdminRole('super_admin', 'verification_admin'), reviewVerificationRequest);
router.post('/vendors/:id/notes', addVendorAdminNote);
router.patch('/vendors/:vendorId/services/:serviceId', toggleVendorService);

// 3. Customer Management
router.get('/customers', getCustomers);
router.patch('/customers/:id/status', updateCustomerStatus);

// 4. Categories & Catalog Services
router.get('/categories', getCategories);
router.post('/categories', authorizeAdminRole('super_admin', 'operations_admin'), createCategory);
router.put('/categories/:id', authorizeAdminRole('super_admin', 'operations_admin'), updateCategory);
router.patch('/categories/:id/status', authorizeAdminRole('super_admin', 'operations_admin'), toggleCategoryStatus);

router.get('/catalog-services', getCatalogServices);
router.post('/catalog-services', authorizeAdminRole('super_admin', 'operations_admin'), createCatalogService);
router.put('/catalog-services/:id', authorizeAdminRole('super_admin', 'operations_admin'), updateCatalogService);
router.patch('/catalog-services/:id/status', authorizeAdminRole('super_admin', 'operations_admin'), toggleCatalogServiceStatus);

// 5. Jobs, Bookings & Emergency Dispatch Control
router.get('/jobs', getAdminJobs);
router.patch('/jobs/:id/reassign', authorizeAdminRole('super_admin', 'operations_admin'), reassignJob);
router.post('/jobs/:id/retry-dispatch', authorizeAdminRole('super_admin', 'operations_admin'), retryEmergencyDispatch);

// 6. Payments & Transactions Ledger
router.get('/transactions', authorizeAdminRole('super_admin', 'finance_admin'), getTransactions);

// 7. Disputes & Review Moderation
router.get('/disputes', getDisputes);
router.patch('/disputes/:id/resolve', authorizeAdminRole('super_admin', 'support_admin'), resolveDispute);
router.get('/reports', getAdminReports);
router.patch('/reports/:id/resolve', authorizeAdminRole('super_admin', 'support_admin', 'verification_admin'), resolveAdminReport);
router.get('/reviews', getReviews);
router.patch('/reviews/:id/moderate', moderateReview);

// 8. Notifications Center
router.get('/notifications', getAdminNotifications);
router.patch('/notifications/:id/read', markAdminNotificationRead);

// 9. Platform Settings
router.get('/settings', getPlatformSettings);
router.put('/settings', authorizeAdminRole('super_admin'), updatePlatformSettings);

// 10. Audit Logs
router.get('/logs', getSystemLogs);

export default router;

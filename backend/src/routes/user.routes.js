import express from 'express';
import {
  getUserProfile,
  updateUserProfile,
  getCustomerProfile,
  updateCustomerProfile,
  getAddresses,
  addAddress,
  updateAddress,
  removeAddress,
  toggleSavedVendor
} from '../controllers/user.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';

const router = express.Router();

router.get('/profile', protect, getUserProfile);
router.get('/profile/:id', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);
router.get('/customer/profile', protect, authorize('customer', 'admin'), getCustomerProfile);
router.put('/customer/profile', protect, authorize('customer', 'admin'), updateCustomerProfile);
router.get('/customer/addresses', protect, authorize('customer', 'admin'), getAddresses);
router.post('/customer/addresses', protect, authorize('customer'), addAddress);
router.put('/customer/addresses/:addressId', protect, authorize('customer'), updateAddress);
router.delete('/customer/addresses/:addressId', protect, authorize('customer'), removeAddress);
router.post('/customer/saved-vendors', protect, authorize('customer'), toggleSavedVendor);

export default router;

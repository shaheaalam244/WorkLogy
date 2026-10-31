import express from 'express';
import {
  register,
  login,
  getMe,
  updateDetails,
  updatePassword,
  logout,
  forgotPassword,
  resetPassword,
  sendLoginOtp,
  verifyLoginOtp,
  checkVendorPhone,
  verifyWidgetAccessToken,
  refreshTokenSession,
  logoutSession,
  getOtpDeliveryStatus,
  handleMsg91DlrWebhook,
  retryOtpController
} from '../controllers/auth.controller.js';
import { protect, optionalAuth } from '../middleware/auth.middleware.js';
import { validateRegister, validateLogin } from '../validators/auth.validator.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/register', validateRegister, register);
router.post('/login', authLimiter, validateLogin, login);
router.post('/forgotpassword', forgotPassword);
router.post('/resetpassword/:token', resetPassword);
router.get('/me', protect, getMe);
router.put('/updatedetails', protect, updateDetails);
router.put('/updatepassword', protect, updatePassword);
router.post('/logout', logout);

// ── Mobile OTP & Persistent Session Routes ──
router.post('/vendor/check-phone', checkVendorPhone);
router.post('/check-phone', checkVendorPhone);
router.post('/otp/send', sendLoginOtp);
router.post('/otp/verify', verifyLoginOtp);
router.post('/otp/verify-widget', verifyWidgetAccessToken);
router.post('/otp/retry', retryOtpController);
router.get('/otp/status', getOtpDeliveryStatus);
router.post('/otp/msg91-dlr', handleMsg91DlrWebhook);
router.post('/token/refresh', refreshTokenSession);
router.post('/session/logout', optionalAuth, logoutSession);

export default router;

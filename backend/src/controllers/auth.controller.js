import crypto from 'crypto';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import VendorProfile from '../models/VendorProfile.js';
import CustomerProfile from '../models/CustomerProfile.js';
import ServiceCategory from '../models/ServiceCategory.js';
import Notification from '../models/Notification.js';
import Session from '../models/Session.js';
import OtpChallenge from '../models/OtpChallenge.js';
import { generateAccessToken, generateRefreshToken, generateToken, REFRESH_SESSION_DAYS } from '../utils/generateToken.js';
import { logActivity } from '../utils/logActivity.js';
import { sendOtpSms, normalizeIndianPhone, isValidIndianPhone, hashToken, getPhoneVariants } from '../utils/sms.js';
import { verifyOtpMatch, generateSecureOtp } from '../utils/otp.js';
import { msg91Service } from '../services/msg91.service.js';
import { sanitizeUserResponse } from './user.controller.js';

export const register = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      role,
      phone,
      businessName,
      category,
      categories,
      selectedCategory,
      selectedCategories,
      serviceDomainIds
    } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email is already registered' });
    }

    // Strictly enforce role boundaries: public registration can only create customer or vendor
    const assignedRole = role === 'vendor' ? 'vendor' : 'customer';

    // For vendors, validate and enforce 1 to 3 active service domains BEFORE creating user
    let initialCategoryIds = [];
    if (assignedRole === 'vendor') {
      const rawDomains = serviceDomainIds || categories || selectedCategories || category || selectedCategory;
      const domainInputList = Array.isArray(rawDomains)
        ? rawDomains
        : (rawDomains ? [rawDomains] : []);

      // Filter and deduplicate raw non-empty strings/IDs
      const rawUniqueStrings = Array.from(
        new Set(
          domainInputList
            .map(item => (typeof item === 'object' && item?._id ? item._id.toString() : String(item || '')).trim())
            .filter(Boolean)
        )
      );

      if (rawUniqueStrings.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Please select at least 1 service domain (maximum 3).'
        });
      }

      if (rawUniqueStrings.length > 3) {
        return res.status(400).json({
          success: false,
          message: 'A vendor can select a maximum of 3 service domains.'
        });
      }

      for (const itemStr of rawUniqueStrings) {
        if (mongoose.Types.ObjectId.isValid(itemStr)) {
          const foundCat = await ServiceCategory.findOne({ _id: itemStr, isActive: { $ne: false } });
          if (foundCat && !initialCategoryIds.some(id => id.toString() === foundCat._id.toString())) {
            initialCategoryIds.push(foundCat._id);
          }
        } else {
          const foundCat = await ServiceCategory.findOne({
            isActive: { $ne: false },
            $or: [
              { slug: itemStr.toLowerCase() },
              { name: new RegExp('^' + itemStr + '$', 'i') }
            ]
          });
          if (foundCat && !initialCategoryIds.some(id => id.toString() === foundCat._id.toString())) {
            initialCategoryIds.push(foundCat._id);
          }
        }
      }

      if (initialCategoryIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'None of the selected service domains are valid or currently active. Please select valid domains.'
        });
      }

      if (initialCategoryIds.length > 3) {
        return res.status(400).json({
          success: false,
          message: 'A vendor can select a maximum of 3 service domains.'
        });
      }
    }

    const user = await User.create({
      name,
      email,
      password,
      role: assignedRole,
      phone: phone || ''
    });

    if (user.role === 'vendor') {
      await VendorProfile.create({
        user: user._id,
        businessName: businessName || name + ' Services',
        tagline: 'Professional service provider',
        hourlyRate: 50,
        approvalStatus: 'pending',
        categories: initialCategoryIds
      });


      // Notify all admins of the new application
      try {
        const admins = await User.find({ role: 'admin' });
        for (const admin of admins) {
          await Notification.create({
            recipient: admin._id,
            sender: user._id,
            type: 'admin_alert',
            title: 'New Professional Application',
            message: `${user.name} registered as a professional (${businessName || 'Services'}) and is awaiting review.`,
            link: '/admin/vendors'
          });
        }
      } catch (notifErr) {
        console.warn('Admin notification warning:', notifErr.message);
      }
    } else if (user.role === 'customer') {
      await CustomerProfile.create({
        user: user._id
      });
    }

    const token = generateToken(user._id, user.role);

    await logActivity({
      userId: user._id,
      role: user.role,
      action: 'USER_REGISTERED',
      details: { email: user.email }
    });

    res.status(201).json({
      success: true,
      token,
      user: sanitizeUserResponse(user)
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const rawInput = (email || '').trim();

    if (!rawInput || !password) {
      return res.status(400).json({ success: false, message: 'Please provide both email/mobile and password' });
    }

    // Support both registered Email and 10-digit Indian Mobile Phone
    const digitsOnly = rawInput.replace(/\D/g, '');
    let user;
    if (digitsOnly.length === 10) {
      user = await User.findOne({
        phone: { $in: [digitsOnly, `+91${digitsOnly}`, `+91 ${digitsOnly}`, `0${digitsOnly}`] }
      }).select('+password');
    } else {
      user = await User.findOne({ email: rawInput.toLowerCase() }).select('+password');
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Account not found. If you registered using Mobile OTP, please log in using the Mobile OTP tab.'
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password. If you registered via Mobile OTP, you can log in directly using Mobile OTP.'
      });
    }

    // Strict account status check: suspended/deactivated users cannot log in
    if (user.status === 'suspended' || user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: user.suspensionReason
          ? `Account suspended: ${user.suspensionReason}. Please contact support.`
          : 'Your account has been suspended or deactivated. Please contact support.'
      });
    }

    user.lastLogin = new Date();
    await user.save();

    // Create Persistent Server Session (90 days)
    const rawRefreshToken = generateRefreshToken();
    const refreshTokenHash = hashToken(rawRefreshToken);
    const sessionToken = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + REFRESH_SESSION_DAYS * 24 * 60 * 60 * 1000);

    const session = await Session.create({
      user: user._id,
      role: user.role,
      sessionToken,
      refreshTokenHash,
      deviceInfo: req.body.deviceInfo || {},
      expiresAt
    });

    const token = generateAccessToken(user._id, user.role, session._id);

    // Compute vendor profile and onboarding status if vendor
    let vendorProfile = null;
    let onboardingStep = 'completed';
    if (user.role === 'vendor') {
      vendorProfile = await VendorProfile.findOne({ user: user._id })
        .populate('categories')
        .populate('serviceAreas');
      if (vendorProfile) {
        onboardingStep = vendorProfile.onboardingStep || 'profile_pending';
        if (!vendorProfile.onboardingStep || vendorProfile.onboardingStep === 'profile_pending') {
          if (vendorProfile.categories && vendorProfile.categories.length > 0 && user.name && user.name !== 'New Contractor') {
            onboardingStep = 'completed';
          }
        }
      }
    }

    await logActivity({
      userId: user._id,
      role: user.role,
      action: 'USER_LOGIN',
      details: { email: user.email, sessionId: session._id }
    });

    res.status(200).json({
      success: true,
      token,
      refreshToken: rawRefreshToken,
      session: {
        id: session._id,
        expiresAt: session.expiresAt
      },
      user: sanitizeUserResponse(user),
      profile: vendorProfile,
      onboardingStep
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    let profile = null;

    if (user.role === 'vendor') {
      profile = await VendorProfile.findOne({ user: user._id }).populate('categories serviceAreas');
    } else if (user.role === 'customer') {
      profile = await CustomerProfile.findOne({ user: user._id }).populate('savedVendors');
    }

    res.status(200).json({
      success: true,
      user: sanitizeUserResponse(user),
      profile
    });
  } catch (error) {
    next(error);
  }
};

export const updateDetails = async (req, res, next) => {
  try {
    const { name, avatar } = req.body;
    const updates = {};
    if (name !== undefined && name !== null && String(name).trim().length > 0) {
      const cleanName = String(name).trim();
      if (cleanName.toLowerCase() !== 'new customer' && cleanName.toLowerCase() !== 'new contractor') {
        updates.name = cleanName;
      }
    }
    if (avatar !== undefined && avatar !== null) {
      updates.avatar = String(avatar).trim();
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true, runValidators: true }
    );
    res.status(200).json({ success: true, user: sanitizeUserResponse(user) });
  } catch (error) {
    next(error);
  }
};

export const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id).select('+password');

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect current password' });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res) => {
  res.status(200).json({ success: true, message: 'Logged out successfully' });
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Please provide an email address' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      // Return success without revealing user existence for security
      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, password reset instructions have been sent.'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 30 * 60 * 1000; // 30 minutes

    await user.save({ validateBeforeSave: false });

    // In development/test mode, return resetToken in response for smooth verification
    res.status(200).json({
      success: true,
      message: 'Password reset link generated successfully.',
      resetToken: process.env.NODE_ENV !== 'production' ? resetToken : undefined
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired password reset token' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    const authToken = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      message: 'Password reset successfully',
      token: authToken,
      user: sanitizeUserResponse(user)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ── CHECK VENDOR / USER PHONE STATUS ──
 * Fast pre-flight check to distinguish existing, new, suspended, or blocked accounts.
 */
export const checkVendorPhone = async (req, res, next) => {
  try {
    const { phone, role = 'vendor' } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Please provide a mobile number.' });
    }

    const normalizedPhone = normalizeIndianPhone(phone);
    if (!isValidIndianPhone(normalizedPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 10-digit Indian mobile number.'
      });
    }

    const user = await User.findOne({
      phone: { $in: getPhoneVariants(normalizedPhone) },
      role
    }).select('-password');

    if (!user) {
      return res.status(200).json({
        success: true,
        exists: false,
        isRegistered: false,
        status: 'new',
        phone: normalizedPhone,
        message: 'No registered contractor account found for this number.'
      });
    }

    if (user.status === 'suspended' || user.isActive === false) {
      return res.status(200).json({
        success: true,
        exists: true,
        isRegistered: true,
        status: 'suspended',
        phone: normalizedPhone,
        suspensionReason: user.suspensionReason || 'Account suspended by administration.',
        message: user.suspensionReason
          ? `Your contractor account is currently suspended: ${user.suspensionReason}. Please contact support.`
          : 'Your contractor account is currently suspended. Please contact support.'
      });
    }

    if (user.status === 'blocked') {
      return res.status(200).json({
        success: true,
        exists: true,
        isRegistered: true,
        status: 'blocked',
        phone: normalizedPhone,
        message: 'This account has been blocked. Please contact WorkLogy partner support.'
      });
    }

    return res.status(200).json({
      success: true,
      exists: true,
      isRegistered: true,
      status: 'active',
      phone: normalizedPhone,
      name: user.name,
      message: 'Active registered contractor account found.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ── MOBILE OTP (LOGIN & REGISTRATION) ──
 * Request 6-digit OTP for vendor or customer mobile authentication.
 */
export const sendLoginOtp = async (req, res, next) => {
  try {
    const { phone, purpose = 'login', role = 'vendor' } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Please enter your mobile number' });
    }

    const normalizedPhone = normalizeIndianPhone(phone);
    if (!isValidIndianPhone(normalizedPhone)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit Indian mobile number' });
    }

    const isCustomer = role === 'customer' || purpose === 'customer_login' || purpose === 'customer_register';

    let otpPurpose;
    let existingUser = null;

    if (isCustomer) {
      otpPurpose = 'customer_login';
      existingUser = await User.findOne({
        phone: { $in: getPhoneVariants(normalizedPhone) },
        role: 'customer'
      });

      if (existingUser && (existingUser.status === 'suspended' || existingUser.isActive === false)) {
        return res.status(403).json({
          success: false,
          message: existingUser.suspensionReason
            ? `Account suspended: ${existingUser.suspensionReason}. Please contact support.`
            : 'Your customer account is currently suspended. Please contact support.'
        });
      }
    } else {
      const isRegister = purpose === 'register' || purpose === 'vendor_register';
      otpPurpose = isRegister ? 'vendor_register' : 'vendor_login';

      // Lookup existing vendor with this phone number
      existingUser = await User.findOne({
        phone: { $in: getPhoneVariants(normalizedPhone) },
        role: 'vendor'
      });

      if (isRegister) {
        if (existingUser) {
          return res.status(409).json({
            success: false,
            code: 'ALREADY_REGISTERED',
            isRegistered: true,
            phone: normalizedPhone,
            message: `An active contractor account is already registered for +91 ${normalizedPhone}. Please log in.`
          });
        }
      } else {
        if (!existingUser) {
          return res.status(404).json({
            success: false,
            code: 'NOT_REGISTERED',
            isRegistered: false,
            phone: normalizedPhone,
            message: `No registered contractor account found for +91 ${normalizedPhone}. Please register as a new partner.`
          });
        }

        if (existingUser.status === 'suspended' || existingUser.isActive === false) {
          return res.status(403).json({
            success: false,
            message: existingUser.suspensionReason
              ? `Account suspended: ${existingUser.suspensionReason}. Please contact support.`
              : 'Your contractor account is currently suspended. Please contact support.'
          });
        }
      }
    }

    // Rate Limiting 1: 60-second cooldown
    const recentChallenge = await OtpChallenge.findOne({
      phone: normalizedPhone,
      purpose: otpPurpose,
      createdAt: { $gt: new Date(Date.now() - 60 * 1000) }
    }).sort({ createdAt: -1 });

    if (recentChallenge) {
      const remainingSeconds = Math.ceil((recentChallenge.createdAt.getTime() + 60 * 1000 - Date.now()) / 1000);
      return res.status(429).json({
        success: false,
        message: `Please wait ${remainingSeconds} seconds before requesting a new OTP.`,
        cooldownSeconds: remainingSeconds
      });
    }

    // Rate Limiting 2: max 5 requests per hour
    const hourlyCount = await OtpChallenge.countDocuments({
      phone: normalizedPhone,
      purpose: otpPurpose,
      createdAt: { $gt: new Date(Date.now() - 60 * 60 * 1000) }
    });

    if (hourlyCount >= 5) {
      return res.status(429).json({
        success: false,
        message: 'Too many OTP requests for this mobile number. Please try again after 1 hour.'
      });
    }

    // Invalidate previous unconsumed OTPs for this phone and purpose
    await OtpChallenge.updateMany(
      { phone: normalizedPhone, purpose: otpPurpose, isConsumed: false },
      { $set: { isConsumed: true, consumedAt: new Date() } }
    );

    // Check active SMS provider configuration
    const configuredProvider = (
      process.env.SMS_PROVIDER ||
      (process.env.FAST2SMS_API_KEY ? 'fast2sms' : (process.env.MSG91_AUTH_KEY ? 'msg91' : 'local'))
    ).toLowerCase();

    // ── 1. FAST2SMS PROVIDER (Instant Real SMS - Zero DLT / PE ID Needed) ──
    if (configuredProvider === 'fast2sms') {
      if (!process.env.FAST2SMS_API_KEY) {
        return res.status(503).json({
          success: false,
          code: 'SMS_SERVICE_UNCONFIGURED',
          message: 'Fast2SMS configuration missing: Please set FAST2SMS_API_KEY in the backend environment.'
        });
      }

      const { otp, codeHash } = generateSecureOtp();
      const smsResult = await sendOtpSms({
        phone: normalizedPhone,
        otp,
        purpose: otpPurpose
      });

      console.log(`[Auth] Real-time OTP sent via Fast2SMS to +91 ******${normalizedPhone.slice(-4)} (${isCustomer ? 'customer' : 'vendor'})`);

      await OtpChallenge.create({
        phone: normalizedPhone,
        codeHash,
        provider: 'fast2sms',
        reqId: smsResult.messageId || `f2s_${Date.now()}`,
        purpose: otpPurpose,
        deliveryStatus: 'REQUEST_ACCEPTED',
        deliveryDetails: {
          status: 'Dispatched via Fast2SMS Quick Route',
          updatedAt: new Date()
        },
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
        ipAddress: req.ip || ''
      });

      await logActivity({
        userId: existingUser?._id || null,
        role: isCustomer ? 'customer' : 'vendor',
        action: isCustomer ? (existingUser ? 'CUSTOMER_LOGIN_OTP_REQUESTED' : 'CUSTOMER_REGISTER_OTP_REQUESTED') : (purpose === 'register' || purpose === 'vendor_register' ? 'VENDOR_REGISTER_OTP_REQUESTED' : 'VENDOR_LOGIN_OTP_REQUESTED'),
        details: { phone: `+91 ******${normalizedPhone.slice(-4)}`, provider: 'fast2sms' }
      });

      return res.status(200).json({
        success: true,
        message: `6-digit verification code sent to +91 ******${normalizedPhone.slice(-4)}`,
        phone: normalizedPhone,
        purpose: otpPurpose,
        cooldownSeconds: 60,
        expiresInSeconds: 300,
        provider: 'fast2sms'
      });
    }

    // ── 2. MSG91 PROVIDER ──
    if (configuredProvider === 'msg91' || (isCustomer && msg91Service.isConfigured())) {
      if (!msg91Service.isConfigured()) {
        return res.status(503).json({
          success: false,
          code: 'SMS_SERVICE_UNCONFIGURED',
          message: 'SMS service configuration missing. Please configure MSG91_AUTH_KEY and MSG91_OTP_TEMPLATE_ID in the backend environment.'
        });
      }

      const { otp, codeHash } = generateSecureOtp();
      const msg91Res = await msg91Service.sendOtp({ phone: normalizedPhone, otp });

      console.log(`[Auth] OTP dispatch initiated for +91 ******${normalizedPhone.slice(-4)} (provider: msg91)`);

      await OtpChallenge.create({
        phone: normalizedPhone,
        codeHash,
        provider: msg91Res.provider || 'msg91',
        reqId: msg91Res.requestId || '',
        purpose: otpPurpose,
        deliveryStatus: 'REQUEST_ACCEPTED',
        deliveryDetails: {
          status: 'Accepted by provider',
          updatedAt: new Date()
        },
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
        ipAddress: req.ip || ''
      });

      await logActivity({
        userId: existingUser?._id || null,
        role: isCustomer ? 'customer' : 'vendor',
        action: isCustomer
          ? (existingUser ? 'CUSTOMER_LOGIN_OTP_REQUESTED' : 'CUSTOMER_REGISTER_OTP_REQUESTED')
          : (purpose === 'register' || purpose === 'vendor_register' ? 'VENDOR_REGISTER_OTP_REQUESTED' : 'VENDOR_LOGIN_OTP_REQUESTED'),
        details: { phone: `+91 ******${normalizedPhone.slice(-4)}`, provider: 'msg91' }
      });

      return res.status(200).json({
        success: true,
        message: `6-digit verification code sent to +91 ******${normalizedPhone.slice(-4)}`,
        phone: normalizedPhone,
        purpose: otpPurpose,
        cooldownSeconds: 60,
        expiresInSeconds: 300,
        provider: 'msg91'
      });
    }

    // Fallback path for Vendor App backward compatibility
    const { otp, codeHash } = generateSecureOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await OtpChallenge.create({
      phone: normalizedPhone,
      codeHash,
      provider: 'local',
      purpose: otpPurpose,
      expiresAt,
      ipAddress: req.ip || ''
    });

    // Send SMS
    const smsResult = await sendOtpSms({
      phone: normalizedPhone,
      otp,
      purpose: otpPurpose
    });

    await logActivity({
      userId: existingUser?._id || null,
      role: 'vendor',
      action: purpose === 'register' || purpose === 'vendor_register' ? 'VENDOR_REGISTER_OTP_REQUESTED' : 'VENDOR_LOGIN_OTP_REQUESTED',
      details: { phone: `+91 ******${normalizedPhone.slice(-4)}` }
    });

    res.status(200).json({
      success: true,
      message: `6-digit verification code sent to +91 ******${normalizedPhone.slice(-4)}`,
      phone: normalizedPhone,
      purpose: otpPurpose,
      cooldownSeconds: 60,
      expiresInSeconds: 300,
      provider: smsResult.provider,
      ...(smsResult.debugCode ? { debugCode: smsResult.debugCode } : {})
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ── VERIFY MOBILE OTP (CUSTOMER & VENDOR) ──
 * Verify 6-digit OTP, validate account (or create initial verified registration), and return persistent session tokens.
 */
export const verifyLoginOtp = async (req, res, next) => {
  try {
    const { phone, otp, deviceInfo, role } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ success: false, message: 'Mobile number and 6-digit OTP are required' });
    }

    const normalizedPhone = normalizeIndianPhone(phone);
    const cleanOtp = String(otp).trim();

    if (!/^\d{6}$/.test(cleanOtp)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid 6-digit verification code' });
    }

    let purposeFilter = ['vendor_login', 'vendor_register'];
    if (role === 'customer') {
      purposeFilter = ['customer_login', 'customer_register'];
    } else if (!role) {
      purposeFilter = ['customer_login', 'customer_register', 'vendor_login', 'vendor_register'];
    }

    // Find latest active, unconsumed challenge for this phone
    const challenge = await OtpChallenge.findOne({
      phone: normalizedPhone,
      purpose: { $in: purposeFilter },
      isConsumed: false,
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });

    if (!challenge) {
      return res.status(400).json({
        success: false,
        message: 'The verification code has expired or is invalid. Please request a new OTP.'
      });
    }

    if (challenge.attempts >= challenge.maxAttempts) {
      challenge.isConsumed = true;
      challenge.consumedAt = new Date();
      await challenge.save();
      return res.status(429).json({
        success: false,
        message: 'Maximum verification attempts exceeded. Please request a new OTP.'
      });
    }

    // Verification check based on challenge provider
    if (challenge.provider === 'msg91' || challenge.provider === 'msg91_widget') {
      const verifyRes = await msg91Service.verifyOtp({
        phone: normalizedPhone,
        otp: cleanOtp,
        reqId: challenge.reqId,
        provider: challenge.provider
      });
      const fallbackMatch = challenge.codeHash && challenge.codeHash !== 'MSG91_REMOTE'
        ? verifyOtpMatch(cleanOtp, challenge.codeHash)
        : false;

      if (!verifyRes.success && !fallbackMatch) {
        challenge.attempts += 1;
        await challenge.save();
        const remainingAttempts = Math.max(0, challenge.maxAttempts - challenge.attempts);
        return res.status(400).json({
          success: false,
          message: verifyRes.message || (remainingAttempts > 0
            ? `Incorrect verification code. ${remainingAttempts} attempts remaining.`
            : 'Incorrect verification code. Maximum attempts exceeded, please request a new code.'),
          remainingAttempts
        });
      }
    } else {
      // Timing-safe verification for local/legacy providers
      const isMatch = verifyOtpMatch(cleanOtp, challenge.codeHash);
      if (!isMatch) {
        challenge.attempts += 1;
        await challenge.save();
        const remainingAttempts = Math.max(0, challenge.maxAttempts - challenge.attempts);
        return res.status(400).json({
          success: false,
          code: 'INVALID_OTP',
          message: remainingAttempts > 0
            ? `Incorrect verification code. ${remainingAttempts} attempts remaining.`
            : 'Incorrect verification code. Maximum attempts exceeded, please request a new code.',
          remainingAttempts
        });
      }
    }

    // Consume OTP immediately to prevent reuse
    challenge.isConsumed = true;
    challenge.consumedAt = new Date();
    await challenge.save();

    const isCustomerFlow = challenge.purpose.startsWith('customer') || role === 'customer';

    if (isCustomerFlow) {
      let user = await User.findOne({
        phone: { $in: getPhoneVariants(normalizedPhone) },
        role: 'customer'
      });

      let isNewUser = false;
      let customerProfile = null;

      if (!user) {
        isNewUser = true;
        const randomPass = crypto.randomBytes(16).toString('hex');
        const hashedPassword = await bcrypt.hash(randomPass, 10);
        user = await User.create({
          name: 'New Customer',
          email: `customer_${normalizedPhone}_${Date.now()}@worklogy.local`,
          phone: normalizedPhone,
          role: 'customer',
          password: hashedPassword
        });

        customerProfile = await CustomerProfile.create({
          user: user._id,
          onboardingStep: 'profile_pending',
          addresses: []
        });
      } else {
        if (user.status === 'suspended' || user.isActive === false) {
          return res.status(403).json({
            success: false,
            message: user.suspensionReason
              ? `Account suspended: ${user.suspensionReason}. Please contact support.`
              : 'Your customer account is currently suspended. Please contact support.'
          });
        }

        customerProfile = await CustomerProfile.findOne({ user: user._id });
        if (!customerProfile) {
          customerProfile = await CustomerProfile.create({
            user: user._id,
            onboardingStep: 'profile_pending',
            addresses: []
          });
        }
      }

      user.lastLogin = new Date();
      await user.save();

      // Create Persistent Server Session (90 days)
      const rawRefreshToken = generateRefreshToken();
      const refreshTokenHash = hashToken(rawRefreshToken);
      const sessionToken = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(24).toString('hex');
      const expiresAt = new Date(Date.now() + REFRESH_SESSION_DAYS * 24 * 60 * 60 * 1000);

      const session = await Session.create({
        user: user._id,
        role: 'customer',
        sessionToken,
        refreshTokenHash,
        deviceInfo: deviceInfo || {},
        expiresAt
      });

      // 15-minute Access Token
      const accessToken = generateAccessToken(user._id, 'customer', session._id);

      // Compute Onboarding Step: if customer already filled real name, or step is explicitly set
      let onboardingStep = customerProfile.onboardingStep || 'profile_pending';
      if (!isNewUser && (!customerProfile.onboardingStep || customerProfile.onboardingStep === 'profile_pending')) {
        if (user.name && user.name !== 'New Customer') {
          onboardingStep = 'completed';
        }
      }

      await logActivity({
        userId: user._id,
        role: 'customer',
        action: isNewUser ? 'CUSTOMER_REGISTER_OTP_SUCCESS' : 'CUSTOMER_LOGIN_OTP_SUCCESS',
        details: { phone: `+91 ******${normalizedPhone.slice(-4)}`, sessionId: session._id }
      });

      return res.status(200).json({
        success: true,
        token: accessToken,
        refreshToken: rawRefreshToken,
        session: {
          id: session._id,
          expiresAt: session.expiresAt
        },
        user: sanitizeUserResponse(user),
        profile: customerProfile,
        isNewUser,
        onboardingStep
      });
    }

    // Vendor Flow
    let user = await User.findOne({
      phone: { $in: getPhoneVariants(normalizedPhone) },
      role: 'vendor'
    });

    let isNewUser = false;
    let vendorProfile = null;

    if (!user) {
      if (challenge.purpose === 'vendor_register') {
        // Create initial verified vendor user
        isNewUser = true;
        const randomPass = crypto.randomBytes(16).toString('hex');
        const hashedPassword = await bcrypt.hash(randomPass, 10);
        try {
          user = await User.create({
            name: 'New Contractor',
            email: `temp_${normalizedPhone}_${Date.now()}@worklogy.local`,
            phone: normalizedPhone,
            role: 'vendor',
            password: hashedPassword
          });
        } catch (createErr) {
          // Concurrency safety fallback in case of parallel requests
          user = await User.findOne({
            phone: { $in: getPhoneVariants(normalizedPhone) },
            role: 'vendor'
          });
          if (!user) throw createErr;
          isNewUser = false;
        }

        vendorProfile = await VendorProfile.findOne({ user: user._id });
        if (!vendorProfile) {
          vendorProfile = await VendorProfile.create({
            user: user._id,
            businessName: 'My Service Business',
            onboardingStep: 'profile_pending',
            categories: []
          });
        }
      } else {
        return res.status(404).json({
          success: false,
          code: 'NOT_REGISTERED',
          message: 'No active contractor profile found for this mobile number.'
        });
      }
    } else {
      if (user.status === 'suspended' || user.isActive === false) {
        return res.status(403).json({
          success: false,
          message: user.suspensionReason
            ? `Account suspended: ${user.suspensionReason}. Please contact support.`
            : 'Your contractor account is currently suspended. Please contact support.'
        });
      }

      vendorProfile = await VendorProfile.findOne({ user: user._id }).populate('categories serviceAreas');
      if (!vendorProfile) {
        vendorProfile = await VendorProfile.create({
          user: user._id,
          businessName: user.name + ' Services',
          onboardingStep: 'profile_pending',
          categories: []
        });
      }
    }

    user.lastLogin = new Date();
    await user.save();

    // Create Persistent Server Session (90 days)
    const rawRefreshToken = generateRefreshToken();
    const refreshTokenHash = hashToken(rawRefreshToken);
    const sessionToken = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + REFRESH_SESSION_DAYS * 24 * 60 * 60 * 1000);

    const session = await Session.create({
      user: user._id,
      role: user.role,
      sessionToken,
      refreshTokenHash,
      deviceInfo: deviceInfo || {},
      expiresAt
    });

    // 15-minute Access Token
    const accessToken = generateAccessToken(user._id, user.role, session._id);

    // Compute Onboarding Step
    let onboardingStep = vendorProfile.onboardingStep || 'profile_pending';
    if (!isNewUser && (!vendorProfile.onboardingStep || vendorProfile.onboardingStep === 'profile_pending')) {
      if (vendorProfile.categories && vendorProfile.categories.length > 0 && user.name && user.name !== 'New Contractor') {
        onboardingStep = 'completed';
      }
    }

    await logActivity({
      userId: user._id,
      role: user.role,
      action: isNewUser ? 'VENDOR_REGISTER_OTP_SUCCESS' : 'VENDOR_LOGIN_OTP_SUCCESS',
      details: { phone: `+91 ******${normalizedPhone.slice(-4)}`, sessionId: session._id }
    });

    res.status(200).json({
      success: true,
      token: accessToken,
      refreshToken: rawRefreshToken,
      session: {
        id: session._id,
        expiresAt: session.expiresAt
      },
      user: sanitizeUserResponse(user),
      profile: vendorProfile,
      isNewUser,
      onboardingStep
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ── VERIFY MSG91 WIDGET ACCESS TOKEN (CUSTOMER) ──
 * Validates MSG91 OTP Widget JWT access token server-side and returns WorkLogy session tokens.
 */
export const verifyWidgetAccessToken = async (req, res, next) => {
  try {
    const { accessToken, deviceInfo } = req.body;

    if (!accessToken) {
      return res.status(400).json({ success: false, message: 'MSG91 access token is required' });
    }

    // Verify token with MSG91 servers
    const verifyResult = await msg91Service.verifyAccessToken({ accessToken });
    const normalizedPhone = verifyResult.identifier;

    if (!normalizedPhone || !isValidIndianPhone(normalizedPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number associated with the verification token'
      });
    }

    // Find or create customer
    let user = await User.findOne({
      phone: { $in: [normalizedPhone, `+91${normalizedPhone}`, `+91 ${normalizedPhone}`, `0${normalizedPhone}`] },
      role: 'customer'
    });

    let isNewUser = false;
    let customerProfile = null;

    if (!user) {
      isNewUser = true;
      const randomPass = crypto.randomBytes(16).toString('hex');
      const hashedPassword = await bcrypt.hash(randomPass, 10);
      user = await User.create({
        name: 'New Customer',
        email: `customer_${normalizedPhone}_${Date.now().toString(36)}@customer.worklogy.in`,
        phone: normalizedPhone,
        password: hashedPassword,
        role: 'customer',
        isVerified: true
      });

      customerProfile = await CustomerProfile.create({
        user: user._id,
        onboardingStep: 'profile_pending'
      });
    } else {
      if (user.status === 'suspended' || user.isActive === false) {
        return res.status(403).json({
          success: false,
          message: user.suspensionReason
            ? `Account suspended: ${user.suspensionReason}. Please contact support.`
            : 'Your customer account is currently suspended. Please contact support.'
        });
      }

      customerProfile = await CustomerProfile.findOne({ user: user._id });
      if (!customerProfile) {
        customerProfile = await CustomerProfile.create({
          user: user._id,
          onboardingStep: 'profile_pending'
        });
      }
    }

    user.lastLogin = new Date();
    user.isVerified = true;
    await user.save();

    // Create Persistent Server Session (90 days)
    const rawRefreshToken = generateRefreshToken();
    const refreshTokenHash = hashToken(rawRefreshToken);
    const sessionToken = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + REFRESH_SESSION_DAYS * 24 * 60 * 60 * 1000);

    const session = await Session.create({
      user: user._id,
      role: 'customer',
      sessionToken,
      refreshTokenHash,
      deviceInfo: deviceInfo || {},
      expiresAt
    });

    // 15-minute Access Token
    const appAccessToken = generateAccessToken(user._id, 'customer', session._id);

    let onboardingStep = customerProfile.onboardingStep || 'profile_pending';
    if (!isNewUser && (!customerProfile.onboardingStep || customerProfile.onboardingStep === 'profile_pending')) {
      if (user.name && user.name !== 'New Customer') {
        onboardingStep = 'completed';
      }
    }

    await logActivity({
      userId: user._id,
      role: 'customer',
      action: isNewUser ? 'CUSTOMER_REGISTER_WIDGET_SUCCESS' : 'CUSTOMER_LOGIN_WIDGET_SUCCESS',
      details: { phone: `+91 ******${normalizedPhone.slice(-4)}`, sessionId: session._id }
    });

    return res.status(200).json({
      success: true,
      token: appAccessToken,
      refreshToken: rawRefreshToken,
      session: {
        id: session._id,
        expiresAt: session.expiresAt
      },
      user: sanitizeUserResponse(user),
      profile: customerProfile,
      isNewUser,
      onboardingStep
    });
  } catch (err) {
    next(err);
  }
};

/**
 * ── REFRESH TOKEN SESSION ──
 * Concurrency-safe rotating refresh token session renewal.
 */
export const refreshTokenSession = async (req, res, next) => {
  try {
    const rawRefreshToken = req.body.refreshToken || req.headers['x-refresh-token'];

    if (!rawRefreshToken || typeof rawRefreshToken !== 'string') {
      return res.status(400).json({
        success: false,
        code: 'MISSING_REFRESH_TOKEN',
        message: 'Refresh token is required'
      });
    }

    const tokenHash = hashToken(rawRefreshToken);

    // 1. Search for active session matching this refreshTokenHash
    let session = await Session.findOne({
      refreshTokenHash: tokenHash,
      isActive: true,
      expiresAt: { $gt: new Date() }
    });

    // 2. Concurrency Grace Period:
    // If not found by current hash, check if it was rotated in the last 30 seconds
    if (!session) {
      const gracePeriod = new Date(Date.now() - 30 * 1000);
      session = await Session.findOne({
        previousRefreshTokenHash: tokenHash,
        rotatedAt: { $gt: gracePeriod },
        isActive: true,
        expiresAt: { $gt: new Date() }
      });
    }

    if (!session) {
      // Check if this was an expired or revoked session
      const revokedSession = await Session.findOne({
        $or: [{ refreshTokenHash: tokenHash }, { previousRefreshTokenHash: tokenHash }]
      });

      if (revokedSession) {
        return res.status(401).json({
          success: false,
          code: 'SESSION_REVOKED',
          message: 'Your login session has expired or was signed out. Please sign in again.'
        });
      }

      return res.status(401).json({
        success: false,
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Invalid session credentials. Please sign in again.'
      });
    }

    // Verify user
    const user = await User.findById(session.user);
    if (!user || user.status === 'suspended' || user.isActive === false) {
      session.isActive = false;
      session.revokedAt = new Date();
      session.revokedReason = 'account_suspended_or_deleted';
      await session.save();

      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_SUSPENDED',
        message: 'Account suspended or inaccessible.'
      });
    }

    // Rotate refresh token
    const newRawRefreshToken = generateRefreshToken();
    const newRefreshTokenHash = hashToken(newRawRefreshToken);

    session.previousRefreshTokenHash = session.refreshTokenHash;
    session.refreshTokenHash = newRefreshTokenHash;
    session.rotatedAt = new Date();
    session.lastUsedAt = new Date();
    await session.save();

    // Issue new 15-minute Access Token
    const newAccessToken = generateAccessToken(user._id, user.role, session._id);

    res.status(200).json({
      success: true,
      token: newAccessToken,
      refreshToken: newRawRefreshToken,
      user: sanitizeUserResponse(user)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ── LOGOUT SESSION ──
 * Explicit session revocation on server.
 */
export const logoutSession = async (req, res, next) => {
  try {
    const rawRefreshToken = req.body?.refreshToken || req.headers['x-refresh-token'];
    const { allDevices } = req.body || {};

    let revokedCount = 0;

    // 1. If allDevices is requested and user is authenticated
    if (allDevices && req.user?._id) {
      const result = await Session.updateMany(
        { user: req.user._id, isActive: true },
        { $set: { isActive: false, revokedAt: new Date(), revokedReason: 'all_devices_logout' } }
      );
      revokedCount = result.modifiedCount;
    } else {
      // 2. Revoke by refreshToken
      if (rawRefreshToken) {
        const tokenHash = hashToken(rawRefreshToken);
        const result = await Session.updateOne(
          {
            $or: [{ refreshTokenHash: tokenHash }, { previousRefreshTokenHash: tokenHash }],
            isActive: true
          },
          { $set: { isActive: false, revokedAt: new Date(), revokedReason: 'user_logout' } }
        );
        revokedCount += result.modifiedCount || 0;
      }

      // 3. Revoke by sessionId attached in req
      if (req.sessionId) {
        const result = await Session.updateOne(
          { _id: req.sessionId, isActive: true },
          { $set: { isActive: false, revokedAt: new Date(), revokedReason: 'user_logout' } }
        );
        revokedCount += result.modifiedCount || 0;
      }
    }

    res.status(200).json({
      success: true,
      message: 'Logged out and session revoked successfully',
      revokedSessions: revokedCount
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ── GET OTP DELIVERY STATUS (POLLING & DIAGNOSTICS) ──
 * Inspects real-time SMS delivery status from MSG91 or recorded database logs.
 * Correlates requestId and phone to check:
 * REQUEST_ACCEPTED | DELIVERY_PENDING | DELIVERED | DELIVERY_FAILED | REJECTED | PROVIDER_ERROR
 */
export const getOtpDeliveryStatus = async (req, res, next) => {
  try {
    const { phone, reqId } = req.query;
    const normalizedPhone = phone ? normalizeIndianPhone(phone) : '';

    if (!normalizedPhone && !reqId) {
      return res.status(400).json({
        success: false,
        message: 'Phone number or request ID is required to query delivery status'
      });
    }

    const query = {};
    if (reqId) {
      query.reqId = reqId;
    } else if (normalizedPhone) {
      query.phone = normalizedPhone;
    }

    const challenge = await OtpChallenge.findOne(query).sort({ createdAt: -1 });

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'No OTP dispatch record found for this request'
      });
    }

    // If challenge was dispatched via MSG91, query live report if pending or recently created
    if ((challenge.provider === 'msg91' || challenge.provider === 'msg91_widget') && challenge.reqId) {
      if (challenge.deliveryStatus === 'REQUEST_ACCEPTED' || challenge.deliveryStatus === 'DELIVERY_PENDING') {
        const liveReport = await msg91Service.getDeliveryStatus({
          requestId: challenge.reqId,
          phone: challenge.phone
        });

        if (liveReport.success && liveReport.deliveryStatus) {
          challenge.deliveryStatus = liveReport.deliveryStatus;
          challenge.deliveryDetails = {
            ...(challenge.deliveryDetails || {}),
            ...liveReport.details,
            updatedAt: new Date()
          };
          await challenge.save();
        }
      }
    }

    return res.status(200).json({
      success: true,
      deliveryStatus: challenge.deliveryStatus || 'REQUEST_ACCEPTED',
      provider: challenge.provider,
      reqId: challenge.reqId,
      phone: challenge.phone,
      details: challenge.deliveryDetails || {},
      expiresAt: challenge.expiresAt,
      isConsumed: challenge.isConsumed
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ── MSG91 ASYNC DELIVERY REPORT (WEBHOOK / DLR) ──
 * Receives real-time delivery events directly from MSG91 webhook configuration:
 * POST /api/auth/otp/msg91-dlr
 */
export const handleMsg91DlrWebhook = async (req, res, next) => {
  try {
    const payload = req.body || {};
    const requestId = payload.requestId || payload.CRQID || req.query.requestId;
    const rawStatus = payload.status || '';
    const pauseReason = payload.pauseReason || '';
    const failureReason = payload.failureReason || '';
    const telNum = payload.telNum || '';
    const dltTeId = payload.DLT_TE_ID || '';
    const senderId = payload.senderId || '';

    if (!requestId && !telNum) {
      return res.status(200).json({ success: true, message: 'Ignored: No requestId or telNum' });
    }

    console.log(`[MSG91 Webhook] DLR received for reqId ${requestId}: status="${rawStatus}", pauseReason="${pauseReason}", failureReason="${failureReason}"`);

    const query = requestId ? { reqId: requestId } : { phone: normalizeIndianPhone(telNum) };
    const challenge = await OtpChallenge.findOne(query).sort({ createdAt: -1 });

    if (challenge) {
      let mappedStatus = 'DELIVERY_PENDING';
      if (pauseReason) {
        mappedStatus = 'REJECTED';
      } else if (rawStatus.toLowerCase() === 'delivered') {
        mappedStatus = 'DELIVERED';
      } else if (rawStatus.toLowerCase() === 'failed' || failureReason) {
        mappedStatus = 'DELIVERY_FAILED';
      }

      challenge.deliveryStatus = mappedStatus;
      challenge.deliveryDetails = {
        status: rawStatus,
        pauseReason,
        failureReason,
        dltTeId,
        senderId,
        deliveredAt: rawStatus.toLowerCase() === 'delivered' ? new Date() : null,
        updatedAt: new Date()
      };
      await challenge.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Delivery report processed'
    });
  } catch (error) {
    console.error('[MSG91 Webhook] Error:', error.message);
    return res.status(200).json({ success: false, message: error.message });
  }
};

/**
 * ── RETRY / RESEND OTP VIA MSG91 ──
 * Triggers fallback retry via SMS or Voice
 */
export const retryOtpController = async (req, res, next) => {
  try {
    const { phone, retryType = 'text' } = req.body;
    const normalizedPhone = normalizeIndianPhone(phone);
    if (!isValidIndianPhone(normalizedPhone)) {
      return res.status(400).json({ success: false, message: 'Invalid 10-digit Indian phone number' });
    }
    const challenge = await OtpChallenge.findOne({
      phone: normalizedPhone,
      isConsumed: false
    }).sort({ createdAt: -1 });

    if (!challenge) {
      return res.status(404).json({ success: false, message: 'No active OTP challenge found to retry' });
    }

    const retryRes = await msg91Service.retryOtp({
      phone: normalizedPhone,
      retryType
    });

    return res.status(200).json({
      success: true,
      message: retryRes.message || 'OTP retry request dispatched',
      provider: challenge.provider
    });
  } catch (error) {
    next(error);
  }
};


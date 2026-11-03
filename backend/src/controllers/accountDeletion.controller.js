import crypto from 'crypto';
import User from '../models/User.js';
import OtpChallenge from '../models/OtpChallenge.js';
import AccountDeletionRequest from '../models/AccountDeletionRequest.js';
import { normalizeIndianPhone, isValidIndianPhone, getPhoneVariants, sendOtpSms } from '../utils/sms.js';
import { hashOtp, verifyOtpMatch, generateSecureOtp } from '../utils/otp.js';
import { msg91Service } from '../services/msg91.service.js';
import { logActivity } from '../utils/logActivity.js';

/**
 * 1. Request OTP for Account Deletion
 * POST /api/account-deletion/request-otp
 */
export const requestDeletionOtp = async (req, res) => {
  try {
    const { phone, role } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, message: 'Registered mobile number is required' });
    }

    const assignedRole = role === 'vendor' ? 'vendor' : 'customer';
    const normalizedPhone = normalizeIndianPhone(phone);

    if (!isValidIndianPhone(normalizedPhone)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit Indian mobile number' });
    }

    // 1. Check if an account exists for this role
    const existingUser = await User.findOne({
      phone: { $in: getPhoneVariants(normalizedPhone) },
      role: assignedRole
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        code: 'ACCOUNT_NOT_FOUND',
        message: `No active ${assignedRole === 'vendor' ? 'Vendor' : 'Customer'} account was found with mobile number +91 ${normalizedPhone}.`
      });
    }

    // 2. Prevent duplicate active requests
    const existingActiveRequest = await AccountDeletionRequest.findOne({
      phone: normalizedPhone,
      role: assignedRole,
      status: { $in: ['request_received', 'under_review', 'processing'] }
    });

    if (existingActiveRequest) {
      return res.status(409).json({
        success: false,
        code: 'DUPLICATE_ACTIVE_REQUEST',
        referenceId: existingActiveRequest.referenceId,
        message: `An active account deletion request is already under review for this account (Reference: ${existingActiveRequest.referenceId}). You can track its status using the tracking form below.`
      });
    }

    const otpPurpose = `${assignedRole}_deletion`;

    // 3. Rate limiting: 60-second cooldown
    const recentChallenge = await OtpChallenge.findOne({
      phone: normalizedPhone,
      purpose: otpPurpose,
      createdAt: { $gt: new Date(Date.now() - 60 * 1000) }
    }).sort({ createdAt: -1 });

    if (recentChallenge) {
      const remainingSeconds = Math.ceil((recentChallenge.createdAt.getTime() + 60 * 1000 - Date.now()) / 1000);
      return res.status(429).json({
        success: false,
        message: `Please wait ${remainingSeconds} seconds before requesting a new verification code.`,
        cooldownSeconds: remainingSeconds
      });
    }

    // Invalidate previous unconsumed deletion OTPs
    await OtpChallenge.updateMany(
      { phone: normalizedPhone, purpose: otpPurpose, isConsumed: false },
      { $set: { isConsumed: true, consumedAt: new Date() } }
    );

    // 4. Test / Reviewer Account Bypass (9876543210)
    if (normalizedPhone === '9876543210') {
      const demoOtp = '123456';
      const codeHash = hashOtp(demoOtp);
      await OtpChallenge.create({
        phone: normalizedPhone,
        codeHash,
        provider: 'local',
        reqId: `demo_del_${Date.now()}`,
        purpose: otpPurpose,
        deliveryStatus: 'DELIVERED',
        deliveryDetails: { status: 'Delivered (Demo Account)', updatedAt: new Date() },
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        ipAddress: req.ip || ''
      });

      return res.status(200).json({
        success: true,
        message: `Verification code sent to +91 ******${normalizedPhone.slice(-4)} (Demo: 123456)`,
        phone: normalizedPhone,
        cooldownSeconds: 60,
        expiresInSeconds: 600
      });
    }

    // 5. Send real OTP via configured provider (fast2sms or msg91)
    const configuredProvider = (
      process.env.SMS_PROVIDER ||
      (process.env.FAST2SMS_API_KEY ? 'fast2sms' : (process.env.MSG91_AUTH_KEY ? 'msg91' : 'local'))
    ).toLowerCase();

    if (configuredProvider === 'fast2sms' && process.env.FAST2SMS_API_KEY) {
      const { otp, codeHash } = generateSecureOtp();
      const smsResult = await sendOtpSms({
        phone: normalizedPhone,
        otp,
        purpose: 'deletion'
      });

      await OtpChallenge.create({
        phone: normalizedPhone,
        codeHash,
        provider: 'fast2sms',
        reqId: smsResult.messageId || `f2s_${Date.now()}`,
        purpose: otpPurpose,
        deliveryStatus: 'REQUEST_ACCEPTED',
        deliveryDetails: { status: 'Dispatched via Fast2SMS', updatedAt: new Date() },
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        ipAddress: req.ip || ''
      });
    } else if (msg91Service.isConfigured()) {
      const { otp, codeHash } = generateSecureOtp();
      const msg91Res = await msg91Service.sendOtp({ phone: normalizedPhone, otp });

      await OtpChallenge.create({
        phone: normalizedPhone,
        codeHash,
        provider: msg91Res.provider || 'msg91',
        reqId: msg91Res.requestId || '',
        purpose: otpPurpose,
        deliveryStatus: 'REQUEST_ACCEPTED',
        deliveryDetails: { status: 'Dispatched via MSG91', updatedAt: new Date() },
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        ipAddress: req.ip || ''
      });
    } else {
      // Local fallback for staging / development
      const { otp, codeHash } = generateSecureOtp();
      console.log(`[Account Deletion] Security OTP for +91 ${normalizedPhone}: ${otp}`);

      await OtpChallenge.create({
        phone: normalizedPhone,
        codeHash,
        provider: 'local',
        reqId: `local_${Date.now()}`,
        purpose: otpPurpose,
        deliveryStatus: 'DELIVERED',
        deliveryDetails: { status: 'Delivered (Local)', updatedAt: new Date() },
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        ipAddress: req.ip || ''
      });
    }

    return res.status(200).json({
      success: true,
      message: `A 6-digit verification code has been sent to +91 ******${normalizedPhone.slice(-4)}`,
      phone: normalizedPhone,
      cooldownSeconds: 60,
      expiresInSeconds: 600
    });
  } catch (error) {
    console.error('requestDeletionOtp error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to dispatch verification code. Please try again shortly or contact support.'
    });
  }
};

/**
 * 2. Verify OTP & Submit Deletion Request
 * POST /api/account-deletion/submit
 */
export const submitDeletionRequest = async (req, res) => {
  try {
    const { phone, role, otp, email, reason, confirmationAcknowledged } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ success: false, message: 'Registered mobile number and 6-digit OTP are required' });
    }

    if (!confirmationAcknowledged) {
      return res.status(400).json({
        success: false,
        message: 'You must acknowledge the deletion confirmation checkbox before proceeding.'
      });
    }

    const assignedRole = role === 'vendor' ? 'vendor' : 'customer';
    const normalizedPhone = normalizeIndianPhone(phone);
    const cleanOtp = String(otp).trim();

    if (!/^\d{6}$/.test(cleanOtp)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid 6-digit numeric verification code' });
    }

    const otpPurpose = `${assignedRole}_deletion`;

    // 1. Verify OTP Challenge
    const challenge = await OtpChallenge.findOne({
      phone: normalizedPhone,
      purpose: otpPurpose,
      isConsumed: false,
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });

    if (!challenge) {
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired or is invalid. Please request a new code.'
      });
    }

    if (challenge.attempts >= challenge.maxAttempts) {
      challenge.isConsumed = true;
      challenge.consumedAt = new Date();
      await challenge.save();
      return res.status(429).json({
        success: false,
        message: 'Maximum verification attempts exceeded. Please request a fresh code.'
      });
    }

    // Check code match
    let isMatch = false;
    if (challenge.provider === 'msg91' && challenge.reqId) {
      const verifyRes = await msg91Service.verifyOtp({
        phone: normalizedPhone,
        otp: cleanOtp,
        reqId: challenge.reqId
      });
      isMatch = verifyRes.success;
    } else {
      isMatch = verifyOtpMatch(cleanOtp, challenge.codeHash);
    }

    if (!isMatch) {
      challenge.attempts += 1;
      await challenge.save();
      const remaining = Math.max(0, challenge.maxAttempts - challenge.attempts);
      return res.status(400).json({
        success: false,
        message: `Incorrect verification code. ${remaining > 0 ? remaining + ' attempts remaining.' : 'Attempts exhausted, request a new code.'}`
      });
    }

    // Consume challenge
    challenge.isConsumed = true;
    challenge.consumedAt = new Date();
    await challenge.save();

    // 2. Fetch User Record
    const user = await User.findOne({
      phone: { $in: getPhoneVariants(normalizedPhone) },
      role: assignedRole
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: `No active ${assignedRole} account was found for this number.`
      });
    }

    // 3. Generate Reference ID (e.g., DEL-738291)
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const referenceId = `DEL-${randomSuffix}`;

    // 4. Create Deletion Record
    const deletionRequest = await AccountDeletionRequest.create({
      referenceId,
      user: user._id,
      role: assignedRole,
      phone: normalizedPhone,
      email: email ? String(email).trim().toLowerCase() : user.email || '',
      reason: reason ? String(reason).trim() : 'User initiated account deletion',
      status: 'request_received',
      statusHistory: [
        {
          status: 'request_received',
          notes: 'Deletion request submitted and mobile ownership verified via OTP.',
          timestamp: new Date()
        }
      ],
      ipAddress: req.ip || '',
      userAgent: req.get('user-agent') || ''
    });

    await logActivity({
      userId: user._id,
      role: assignedRole,
      action: 'ACCOUNT_DELETION_REQUESTED',
      details: {
        referenceId,
        scheduledDate: deletionRequest.scheduledDeletionDate
      }
    });

    return res.status(201).json({
      success: true,
      referenceId,
      status: deletionRequest.status,
      scheduledDeletionDate: deletionRequest.scheduledDeletionDate,
      message: 'Your account deletion request has been registered and verified successfully.'
    });
  } catch (error) {
    console.error('submitDeletionRequest error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process deletion request. Please try again or contact privacy@worklogy.com.'
    });
  }
};

/**
 * 3. Track Deletion Request Status
 * POST /api/account-deletion/status
 */
export const checkDeletionStatus = async (req, res) => {
  try {
    const { referenceId, phone } = req.body;

    if (!referenceId || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Both Reference ID (e.g., DEL-123456) and registered mobile number are required to track status.'
      });
    }

    const cleanRef = String(referenceId).trim().toUpperCase();
    const normalizedPhone = normalizeIndianPhone(phone);

    const record = await AccountDeletionRequest.findOne({
      referenceId: cleanRef,
      phone: normalizedPhone
    }).select('referenceId role status scheduledDeletionDate rejectionReason createdAt completedAt');

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'No deletion record was found matching this Reference ID and mobile number combination.'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        referenceId: record.referenceId,
        role: record.role,
        status: record.status,
        submittedAt: record.createdAt,
        scheduledDeletionDate: record.scheduledDeletionDate,
        completedAt: record.completedAt || null,
        rejectionReason: record.rejectionReason || ''
      }
    });
  } catch (error) {
    console.error('checkDeletionStatus error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve deletion status. Please try again shortly.'
    });
  }
};


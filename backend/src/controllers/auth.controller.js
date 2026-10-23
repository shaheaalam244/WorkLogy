import crypto from 'crypto';
import User from '../models/User.js';
import VendorProfile from '../models/VendorProfile.js';
import CustomerProfile from '../models/CustomerProfile.js';
import Notification from '../models/Notification.js';
import { generateToken } from '../utils/generateToken.js';
import { logActivity } from '../utils/logActivity.js';

export const register = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, businessName } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email is already registered' });
    }

    // Strictly enforce role boundaries: public registration can only create customer or vendor
    const assignedRole = role === 'vendor' ? 'vendor' : 'customer';

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
        approvalStatus: 'pending'
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
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      }
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
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

    const token = generateToken(user._id, user.role);

    await logActivity({
      userId: user._id,
      role: user.role,
      action: 'USER_LOGIN',
      details: { email: user.email }
    });

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      }
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
      user,
      profile
    });
  } catch (error) {
    next(error);
  }
};

export const updateDetails = async (req, res, next) => {
  try {
    const { name, phone, avatar } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, phone, avatar },
      { new: true, runValidators: true }
    );
    res.status(200).json({ success: true, user });
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
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      }
    });
  } catch (error) {
    next(error);
  }
};

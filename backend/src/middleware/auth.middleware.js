import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route (token missing)'
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'worklogy_super_secret_jwt_key_2026_secure'
    );
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists'
      });
    }
    if (user.status === 'suspended' || user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: user.suspensionReason
          ? `Account suspended: ${user.suspensionReason}. Please contact support.`
          : 'Account is suspended or deactivated. Access denied.'
      });
    }
    req.user = user;
    if (decoded.sessionId) {
      req.sessionId = decoded.sessionId;
    }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        code: 'TOKEN_EXPIRED',
        message: 'Authentication token has expired'
      });
    }
    return res.status(401).json({
      success: false,
      code: 'INVALID_TOKEN',
      message: 'Invalid authentication token'
    });
  }
};

export const optionalAuth = async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'worklogy_super_secret_jwt_key_2026_secure'
    );
    const user = await User.findById(decoded.id).select('-password');
    if (user) {
      req.user = user;
    }
  } catch (err) {
    // Ignore token errors in optionalAuth
  }
  next();
};

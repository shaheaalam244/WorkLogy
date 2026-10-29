import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export const ACCESS_TOKEN_EXPIRY = process.env.JWT_ACCESS_EXPIRE || '15m';
export const REFRESH_SESSION_DAYS = parseInt(process.env.REFRESH_SESSION_DAYS || '90', 10);

export const generateAccessToken = (id, role, sessionId = null) => {
  const payload = { id, role };
  if (sessionId) {
    payload.sessionId = String(sessionId);
  }
  return jwt.sign(
    payload,
    process.env.JWT_SECRET || 'worklogy_super_secret_jwt_key_2026_secure',
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
};

export const generateRefreshToken = () => {
  return crypto.randomBytes(40).toString('hex');
};

// Backward-compatible alias
export const generateToken = (id, role, sessionId = null) => {
  return generateAccessToken(id, role, sessionId);
};


import jwt from 'jsonwebtoken';

export const generateToken = (id, role) => {
  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET || 'worklogy_super_secret_jwt_key_2026_secure',
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

import { body } from 'express-validator';
import { validate } from '../middleware/validate.middleware.js';

export const validateRegister = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['customer', 'vendor']).withMessage('Role must be customer or vendor'),
  validate
];

export const validateLogin = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email or mobile number is required')
    .custom((value) => {
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      const isPhone = /^\d{10}$/.test(value.replace(/\D/g, ''));
      if (!isEmail && !isPhone) {
        throw new Error('Please enter a valid email address or 10-digit mobile number');
      }
      return true;
    }),
  body('password').notEmpty().withMessage('Password is required'),
  validate
];

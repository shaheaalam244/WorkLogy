import { body } from 'express-validator';
import { validate } from '../middleware/validate.middleware.js';

export const validateVendorUpdate = [
  body('businessName').optional().trim().notEmpty().withMessage('Business name cannot be empty'),
  body('hourlyRate').optional().isNumeric().withMessage('Hourly rate must be a number'),
  body('bio').optional().isString(),
  validate
];

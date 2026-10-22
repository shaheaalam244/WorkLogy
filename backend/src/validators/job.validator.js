import { body } from 'express-validator';
import { validate } from '../middleware/validate.middleware.js';

export const validateCreateJob = [
  body('title')
    .trim()
    .notEmpty().withMessage('Job title is required')
    .isLength({ min: 3, max: 120 }).withMessage('Job title must be between 3 and 120 characters'),
  body('description')
    .trim()
    .notEmpty().withMessage('Description is required')
    .isLength({ min: 10, max: 2000 }).withMessage('Description must be between 10 and 2000 characters'),
  body('category')
    .trim()
    .notEmpty().withMessage('Category is required'),
  body('budget.type')
    .optional()
    .isIn(['fixed', 'hourly', 'quote', 'range']).withMessage('Invalid budget type'),
  body('budget.amount')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 }).withMessage('Budget amount must be a non-negative number'),
  body('budget.minAmount')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 }).withMessage('Minimum budget must be a non-negative number'),
  body('budget.maxAmount')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 }).withMessage('Maximum budget must be a non-negative number')
    .custom((maxAmount, { req }) => {
      const minAmount = req.body.budget?.minAmount ?? req.body.budget?.min;
      if (req.body.budget?.type === 'range' && minAmount != null && maxAmount != null && maxAmount !== '') {
        if (Number(minAmount) > Number(maxAmount)) {
          throw new Error('Minimum budget cannot exceed maximum budget');
        }
      }
      return true;
    }),
  body('location.city')
    .trim()
    .notEmpty().withMessage('City is required'),
  body('location.zipCode')
    .optional({ checkFalsy: true })
    .matches(/^[1-9][0-9]{5}$/).withMessage('Please enter a valid 6-digit Indian PIN code (e.g. 226001)'),
  body('preferredDate')
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (!value) return true;
      const dateVal = new Date(value);
      if (isNaN(dateVal.getTime())) {
        throw new Error('Invalid preferred date format');
      }
      // Check against current date in Asia/Kolkata
      const todayIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
      const selectedDate = String(value).slice(0, 10);
      if (selectedDate < todayIST) {
        throw new Error('Preferred service date cannot be in the past');
      }
      return true;
    }),
  body('images')
    .optional()
    .isArray({ max: 5 }).withMessage('Maximum of 5 images allowed per job request'),
  body('images.*')
    .optional()
    .isString().withMessage('Image reference must be a string URL'),
  body('location.coordinates.lat')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  body('location.coordinates.lng')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  body('location.locationSource')
    .optional()
    .isIn(['gps', 'saved_address', 'manual'])
    .withMessage('Invalid location source'),
  validate
];

export const validateApplyJob = [
  body('proposedAmount').isNumeric().withMessage('Proposed amount is required'),
  body('coverLetter').trim().isLength({ min: 10 }).withMessage('Cover letter must be at least 10 characters'),
  validate
];

import { validationResult } from 'express-validator';

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorList = errors.array().map(err => ({
      field: err.path || err.param,
      message: err.msg
    }));
    return res.status(400).json({
      success: false,
      message: errorList[0]?.message || 'Validation failed. Please check the submitted fields.',
      errors: errorList
    });
  }
  next();
};

import express from 'express';
import {
  requestDeletionOtp,
  submitDeletionRequest,
  checkDeletionStatus
} from '../controllers/accountDeletion.controller.js';

const router = express.Router();

// Public routes accessible without prior authentication
router.post('/request-otp', requestDeletionOtp);
router.post('/submit', submitDeletionRequest);
router.post('/status', checkDeletionStatus);

export default router;


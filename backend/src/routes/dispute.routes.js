import express from 'express';
import {
  createDispute,
  getDisputes,
  getDisputeById,
  updateDisputeStatus
} from '../controllers/dispute.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/', protect, createDispute);
router.get('/', protect, getDisputes);
router.get('/:id', protect, getDisputeById);
router.patch('/:id/status', protect, updateDisputeStatus);

export default router;

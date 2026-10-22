import express from 'express';
import {
  getAreas,
  createArea,
  updateArea,
  deleteArea
} from '../controllers/area.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';

const router = express.Router();

router.get('/', getAreas);
router.post('/', protect, authorize('admin'), createArea);
router.put('/:id', protect, authorize('admin'), updateArea);
router.delete('/:id', protect, authorize('admin'), deleteArea);

export default router;

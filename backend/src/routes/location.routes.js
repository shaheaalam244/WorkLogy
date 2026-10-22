import express from 'express';
import { reverseGeocode } from '../controllers/location.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/reverse-geocode', protect, reverseGeocode);
router.get('/reverse-geocode', protect, reverseGeocode);

export default router;

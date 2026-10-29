import express from 'express';
import { reverseGeocode } from '../controllers/location.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/reverse-geocode', reverseGeocode);
router.get('/reverse-geocode', reverseGeocode);

export default router;

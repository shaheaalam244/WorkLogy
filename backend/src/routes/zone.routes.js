import express from 'express';
import {
  getAllZones,
  getAllLocalities,
  resolveLocation,
  getNearbyVendorsController,
  getZoneCoverage,
  reverseGeocodeLocation
} from '../controllers/zone.controller.js';

const router = express.Router();

// GET /api/zones - 18 zones with 90 localities
router.get('/', getAllZones);

// GET /api/zones/coverage - dynamic coverage preview for (lat, lng, radiusKm)
router.get('/coverage', getZoneCoverage);

// GET & POST /api/zones/reverse-geocode - reverse coordinates to canonical locality and PIN
router.get('/reverse-geocode', reverseGeocodeLocation);
router.post('/reverse-geocode', reverseGeocodeLocation);

// GET /api/zones/localities - flat list of 90 localities
router.get('/localities', getAllLocalities);

// GET /api/zones/resolve - resolve GPS coordinates or locality name
router.get('/resolve', resolveLocation);

// GET /api/zones/nearby - smart nearby vendor discovery and ranking
router.get('/nearby', getNearbyVendorsController);

export default router;


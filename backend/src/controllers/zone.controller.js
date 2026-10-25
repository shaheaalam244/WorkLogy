import Zone from '../models/Zone.js';
import Locality from '../models/Locality.js';
import {
  resolveLocationContext,
  discoverNearbyVendors,
  calculateHaversineDistanceKm
} from '../services/vendorDiscovery.service.js';


/**
 * Get all 18 zones with their nested 90 localities
 */
export const getAllZones = async (req, res, next) => {
  try {
    const [zones, localities] = await Promise.all([
      Zone.find({ isActive: true }).sort({ zoneId: 1 }).lean(),
      Locality.find({ isActive: true }).sort({ zoneId: 1, name: 1 }).lean()
    ]);

    const locMap = {};
    for (const loc of localities) {
      locMap[loc.zoneId] = locMap[loc.zoneId] || [];
      locMap[loc.zoneId].push({
        localityId: loc.localityId,
        name: loc.name,
        coordinates: loc.coordinates
      });
    }

    const zonesWithLocalities = zones.map((z) => ({
      ...z,
      localities: locMap[z.zoneId] || []
    }));

    res.status(200).json({
      success: true,
      count: zonesWithLocalities.length,
      zones: zonesWithLocalities
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all 90 localities flat list for fast client search/autocomplete
 */
export const getAllLocalities = async (req, res, next) => {
  try {
    const { zoneId, search } = req.query;
    const query = { isActive: true };

    if (zoneId) {
      query.zoneId = zoneId.toUpperCase();
    }
    if (search && search.trim()) {
      query.name = { $regex: search.trim(), $options: 'i' };
    }

    const localities = await Locality.find(query).sort({ zoneId: 1, name: 1 }).lean();

    res.status(200).json({
      success: true,
      count: localities.length,
      localities
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Resolves GPS coordinates or Locality Name to Canonical Zone and Locality
 */
export const resolveLocation = async (req, res, next) => {
  try {
    const { lat, lng, latitude, longitude, locality, zoneId } = req.query;

    const resolved = await resolveLocationContext({
      latitude: latitude ?? lat,
      longitude: longitude ?? lng,
      locality,
      zoneId
    });

    res.status(200).json({
      success: true,
      resolved
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Smart Nearby Vendor Discovery Endpoint
 */
export const getNearbyVendorsController = async (req, res, next) => {
  try {
    const {
      lat,
      lng,
      latitude,
      longitude,
      locality,
      zoneId,
      category,
      search,
      availableNow,
      verifiedOnly,
      sortBy,
      radiusKm,
      page,
      limit,
      mode
    } = req.query;

    const result = await discoverNearbyVendors({
      latitude: latitude ?? lat,
      longitude: longitude ?? lng,
      locality,
      zoneId,
      category,
      search,
      availableNow,
      verifiedOnly,
      sortBy,
      radiusKm,
      page,
      limit,
      mode: mode || 'nearby'
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/zones/coverage?lat=..&lng=..&radius=..
 * Dynamic coverage calculation for map exploration & radius preview
 * Validates coordinates: lat (-90 to 90), lng (-180 to 180)
 * Validates radius: strictly supported values [5, 10, 15, 20, 25, 30] km
 */
export const getZoneCoverage = async (req, res, next) => {
  try {
    const latRaw = req.query.lat ?? req.query.latitude;
    const lngRaw = req.query.lng ?? req.query.longitude;
    const lat = parseFloat(latRaw);
    const lng = parseFloat(lngRaw);

    if (latRaw === undefined || isNaN(lat) || lat < -90 || lat > 90) {
      return res.status(400).json({
        success: false,
        message: 'Invalid latitude. Must be a valid number between -90 and 90 degrees.'
      });
    }

    if (lngRaw === undefined || isNaN(lng) || lng < -180 || lng > 180) {
      return res.status(400).json({
        success: false,
        message: 'Invalid longitude. Must be a valid number between -180 and 180 degrees.'
      });
    }

    const SUPPORTED_RADII = [5, 10, 15, 20, 25, 30];
    const radiusParam = req.query.radius || req.query.radiusKm;
    const radiusKm = radiusParam !== undefined ? parseFloat(radiusParam) : 15;

    if (isNaN(radiusKm) || !SUPPORTED_RADII.includes(radiusKm)) {
      return res.status(400).json({
        success: false,
        message: `Invalid radius: ${radiusParam}. Supported radius values are: ${SUPPORTED_RADII.join(', ')} km.`
      });
    }

    const [zones, localities] = await Promise.all([
      Zone.find({ isActive: true }).sort({ zoneId: 1 }).lean(),
      Locality.find({ isActive: true }).sort({ zoneId: 1, name: 1 }).lean()
    ]);

    const zoneMap = new Map();
    zones.forEach(z => {
      zoneMap.set(z.zoneId, {
        zoneId: z.zoneId,
        zoneName: z.zoneName,
        centerArea: z.centerArea,
        city: z.city || 'Lucknow',
        coordinates: z.coordinates,
        localities: []
      });
    });

    let totalWithinRadius = 0;
    const touchedZones = new Set();

    localities.forEach(loc => {
      const distanceKm = calculateHaversineDistanceKm(lat, lng, loc.coordinates?.lat, loc.coordinates?.lng);
      const isWithinRadius = distanceKm != null && distanceKm <= radiusKm;
      if (isWithinRadius) {
        totalWithinRadius++;
        touchedZones.add(loc.zoneId);
      }

      const z = zoneMap.get(loc.zoneId);
      if (z) {
        z.localities.push({
          localityId: loc.localityId,
          name: loc.name,
          pinCode: loc.pinCode || '226001',
          coordinates: loc.coordinates,
          distanceKm,
          isWithinRadius
        });
      }
    });

    const groupedZones = Array.from(zoneMap.values()).map(z => ({
      ...z,
      totalCount: z.localities.length,
      withinRadiusCount: z.localities.filter(l => l.isWithinRadius).length
    }));

    res.status(200).json({
      success: true,
      center: { lat, lng },
      radiusKm,
      totalLocalities: localities.length,
      totalWithinRadius,
      zonesCoveredCount: touchedZones.size,
      zones: groupedZones
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/zones/reverse-geocode?lat=..&lng=..
 * Reverses coordinates to human-readable address with verified PIN code.
 * Uses Nominatim provider with 3s timeout and falls back to nearest canonical Lucknow locality without crashing.
 */
export const reverseGeocodeLocation = async (req, res, next) => {
  try {
    const latRaw = req.query.lat ?? req.query.latitude ?? req.body?.lat ?? req.body?.latitude;
    const lngRaw = req.query.lng ?? req.query.longitude ?? req.body?.lng ?? req.body?.longitude;
    const lat = parseFloat(latRaw);
    const lng = parseFloat(lngRaw);

    if (latRaw === undefined || isNaN(lat) || lat < -90 || lat > 90) {
      return res.status(400).json({
        success: false,
        message: 'Invalid latitude. Must be a valid number between -90 and 90 degrees.'
      });
    }

    if (lngRaw === undefined || isNaN(lng) || lng < -180 || lng > 180) {
      return res.status(400).json({
        success: false,
        message: 'Invalid longitude. Must be a valid number between -180 and 180 degrees.'
      });
    }

    // 1. Resolve nearest canonical Lucknow locality from database
    const localities = await Locality.find({ isActive: true }).lean();
    let minDistance = Infinity;
    let closestLoc = null;

    localities.forEach(loc => {
      const d = calculateHaversineDistanceKm(lat, lng, loc.coordinates?.lat, loc.coordinates?.lng);
      if (d != null && d < minDistance) {
        minDistance = d;
        closestLoc = loc;
      }
    });

    // 2. Try external geocoding provider (Nominatim with 3s timeout)
    let providerAddress = null;
    let providerLocality = null;
    let providerPin = null;
    let providerCity = 'Lucknow';
    let providerState = 'Uttar Pradesh';
    let providerStreet = null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'WorklogyMarketplace/1.0 (support@worklogy.in)',
          'Accept': 'application/json'
        }
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data?.address) {
          const addr = data.address;
          providerStreet = addr.road || addr.pedestrian || addr.suburb || addr.neighbourhood || null;
          providerLocality = addr.suburb || addr.neighbourhood || addr.residential || addr.quarter || addr.city_district || null;
          providerCity = addr.city || addr.town || addr.county || 'Lucknow';
          providerState = addr.state || 'Uttar Pradesh';
          providerPin = addr.postcode || null;
          if (data.display_name) {
            providerAddress = data.display_name;
          }
        }
      }
    } catch (providerErr) {
      // Non-fatal: fallback to canonical database locality
    }

    // Combine provider details with canonical Lucknow locality
    const resolvedLocality = providerLocality || (closestLoc ? closestLoc.name : 'Hazratganj');
    const resolvedCity = providerCity || 'Lucknow';
    const resolvedPin = providerPin || (closestLoc ? closestLoc.pinCode : '226001');
    const resolvedZoneId = closestLoc ? closestLoc.zoneId : 'LKO-Z01';
    const resolvedZoneName = closestLoc ? closestLoc.zoneName : 'Central Lucknow';

    let formattedAddress = providerAddress;
    if (!formattedAddress) {
      formattedAddress = `${resolvedLocality}, ${resolvedCity}, ${providerState} ${resolvedPin}`;
    }

    res.status(200).json({
      success: true,
      address: formattedAddress,
      street: providerStreet || resolvedLocality,
      locality: resolvedLocality,
      city: resolvedCity,
      state: providerState,
      pinCode: resolvedPin,
      zoneId: resolvedZoneId,
      zoneName: resolvedZoneName,
      distanceKm: minDistance !== Infinity ? minDistance : 0,
      source: providerAddress ? 'nominatim' : 'canonical_dataset'
    });
  } catch (error) {
    next(error);
  }
};


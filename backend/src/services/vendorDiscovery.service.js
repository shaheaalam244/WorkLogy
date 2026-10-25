import mongoose from 'mongoose';
import VendorProfile from '../models/VendorProfile.js';
import Zone from '../models/Zone.js';
import Locality from '../models/Locality.js';
import ServiceCategory from '../models/ServiceCategory.js';
import { sanitizePublicVendor } from '../utils/sanitizeVendor.js';

/**
 * Calculates straight-line distance in kilometres using the Haversine formula.
 */
export function calculateHaversineDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // 1 decimal place (e.g. 1.2 km)
}

/**
 * Resolves customer location from GPS coordinates or Locality/Zone name.
 */
export async function resolveLocationContext({ latitude, longitude, locality, zoneId }) {
  let centerLat = latitude != null ? Number(latitude) : null;
  let centerLng = longitude != null ? Number(longitude) : null;
  let resolvedLocality = null;
  let resolvedZone = null;
  let distanceSource = 'gps';

  // 1. If GPS coordinates provided, find closest canonical locality and zone
  if (centerLat != null && centerLng != null && !isNaN(centerLat) && !isNaN(centerLng)) {
    const allLocalities = await Locality.find({ isActive: true }).lean();
    let minDistance = Infinity;
    let closestLoc = null;

    for (const loc of allLocalities) {
      if (loc.coordinates?.lat && loc.coordinates?.lng) {
        const d = calculateHaversineDistanceKm(centerLat, centerLng, loc.coordinates.lat, loc.coordinates.lng);
        if (d != null && d < minDistance) {
          minDistance = d;
          closestLoc = loc;
        }
      }
    }

    if (closestLoc) {
      resolvedLocality = closestLoc.name;
      resolvedZone = {
        zoneId: closestLoc.zoneId,
        zoneName: closestLoc.zoneName
      };
    }
  } else if (locality && locality.trim()) {
    // 2. If locality name provided, resolve canonical locality & its zone
    const norm = locality.trim().toLowerCase().replace(/&/g, 'and');
    const matchedLoc = await Locality.findOne({
      $or: [
        { normalizedName: norm },
        { name: { $regex: new RegExp(`^${locality.trim()}$`, 'i') } },
        { name: { $regex: new RegExp(locality.trim().split(',')[0].trim(), 'i') } }
      ]
    }).lean();

    if (matchedLoc) {
      resolvedLocality = matchedLoc.name;
      centerLat = matchedLoc.coordinates.lat;
      centerLng = matchedLoc.coordinates.lng;
      resolvedZone = {
        zoneId: matchedLoc.zoneId,
        zoneName: matchedLoc.zoneName
      };
      distanceSource = 'locality_center';
    }
  }

  // 3. If zoneId provided and coordinates not yet found, resolve Zone center
  if (!resolvedZone && zoneId) {
    const matchedZone = await Zone.findOne({ zoneId: zoneId.toUpperCase() }).lean();
    if (matchedZone) {
      resolvedZone = {
        zoneId: matchedZone.zoneId,
        zoneName: matchedZone.zoneName
      };
      if (centerLat == null || centerLng == null) {
        centerLat = matchedZone.coordinates.lat;
        centerLng = matchedZone.coordinates.lng;
        distanceSource = 'zone_center';
      }
    }
  }

  // 4. Default Lucknow center if completely unresolved
  if (centerLat == null || centerLng == null) {
    centerLat = 26.8467;
    centerLng = 80.9462;
    distanceSource = 'city_default';
    if (!resolvedZone) {
      resolvedZone = { zoneId: 'LKO-Z07', zoneName: 'Central Lucknow' };
    }
    if (!resolvedLocality) {
      resolvedLocality = 'Hazratganj';
    }
  }

  return {
    centerLat,
    centerLng,
    locality: resolvedLocality,
    zoneId: resolvedZone?.zoneId || 'LKO-Z07',
    zoneName: resolvedZone?.zoneName || 'Central Lucknow',
    distanceSource
  };
}

/**
 * Discovers and ranks eligible vendors near the customer location.
 */
export async function discoverNearbyVendors({
  latitude,
  longitude,
  locality,
  zoneId,
  category,
  search,
  availableNow,
  verifiedOnly,
  sortBy = 'distance',
  radiusKm = 10,
  page = 1,
  limit = 20,
  mode = 'nearby'
}) {
  // Step 1: Resolve customer/job center coordinates
  const locContext = await resolveLocationContext({ latitude, longitude, locality, zoneId });
  const { centerLat, centerLng, distanceSource } = locContext;

  // Step 2: Build mandatory hard eligibility filter
  const query = {
    approvalStatus: 'approved'
  };

  if (verifiedOnly === 'true' || verifiedOnly === true) {
    query['verifiedBadge.status'] = { $in: ['verified', 'approved'] };
  }

  if (availableNow === 'true' || availableNow === true) {
    query['availability.isAvailableNow'] = true;
  }

  // Category filtering
  if (category && category !== 'all') {
    if (mongoose.Types.ObjectId.isValid(category)) {
      query.categories = category;
    } else {
      const searchPattern = category.replace(/(ing|s|ers|er)$/i, '');
      const catDocs = await ServiceCategory.find({
        $or: [
          { slug: { $regex: searchPattern || category, $options: 'i' } },
          { name: { $regex: searchPattern || category, $options: 'i' } }
        ]
      }).select('_id');

      if (catDocs.length > 0) {
        query.categories = { $in: catDocs.map((c) => c._id) };
      } else {
        query.$or = [
          { businessName: { $regex: category, $options: 'i' } },
          { skills: { $in: [new RegExp(category, 'i')] } },
          { 'services.title': { $regex: category, $options: 'i' } }
        ];
      }
    }
  }

  // Text search
  if (search && search.trim()) {
    const s = search.trim();
    const textFilter = [
      { businessName: { $regex: s, $options: 'i' } },
      { bio: { $regex: s, $options: 'i' } },
      { skills: { $in: [new RegExp(s, 'i')] } },
      { 'services.title': { $regex: s, $options: 'i' } },
      { locality: { $regex: s, $options: 'i' } }
    ];
    if (query.$or) {
      query.$and = [{ $or: query.$or }, { $or: textFilter }];
      delete query.$or;
    } else {
      query.$or = textFilter;
    }
  }

  // Step 3: Fetch candidates using 2dsphere geospatial filtering & field projection
  const maxSearchRadius = Math.max(1, Number(radiusKm) || 15);
  const radiusInRadians = maxSearchRadius / 6378.1;

  if (centerLat != null && centerLng != null) {
    const geoFilter = [
      { location: { $geoWithin: { $centerSphere: [[centerLng, centerLat], radiusInRadians] } } },
      ...(locContext.locality ? [{ locality: locContext.locality }] : []),
      ...(locContext.zoneId ? [{ zoneId: locContext.zoneId }] : [])
    ];
    if (query.$or) {
      query.$and = [{ $or: query.$or }, { $or: geoFilter }];
      delete query.$or;
    } else if (query.$and) {
      query.$and.push({ $or: geoFilter });
    } else {
      query.$or = geoFilter;
    }
  }

  const candidates = await VendorProfile.find(query)
    .select(
      'businessName tagline bio user categories services city zoneId zoneName locality vendorServiceRadiusKm baseVisitCharge coordinates location hourlyRate experienceYears rating completedJobsCount approvalStatus verifiedBadge availability'
    )
    .populate('user', 'name email avatar phone')
    .populate('categories', 'name slug icon')
    .lean();
  const eligibleVendors = [];

  for (const v of candidates) {
    const vLat = v.coordinates?.lat ?? v.location?.coordinates?.[1];
    const vLng = v.coordinates?.lng ?? v.location?.coordinates?.[0];

    const distKm =
      vLat != null && vLng != null
        ? calculateHaversineDistanceKm(centerLat, centerLng, vLat, vLng)
        : null;

    const vendorMaxRadius = v.vendorServiceRadiusKm || 10;
    // Allow coverage if within vendor's service radius OR within max search radius
    const isWithinCoverage = distKm == null || distKm <= Math.max(vendorMaxRadius, maxSearchRadius);

    if (isWithinCoverage) {
      eligibleVendors.push({
        ...v,
        distanceKm: distKm,
        isApproximateDistance: distanceSource !== 'gps',
        isSameLocality: Boolean(locContext.locality && v.locality?.toLowerCase() === locContext.locality.toLowerCase()),
        isSameZone: Boolean(locContext.zoneId && v.zoneId === locContext.zoneId)
      });
    }
  }

  // Step 5: Vendor Ranking Algorithm
  // Priority 1: Distance First (shortest actual customer-to-vendor distance)
  // Priority 2: Verified & Available Now
  // Priority 3: Rating & Completed Jobs count (quality rank among comparable distance)
  // Priority 4: Same Locality / Same Zone tie-breaker
  eligibleVendors.sort((a, b) => {
    // If user explicitly requested custom sort (rating, experience, price)
    if (sortBy === 'rating') {
      return (b.rating || 0) - (a.rating || 0) || (a.distanceKm || 999) - (b.distanceKm || 999);
    }
    if (sortBy === 'experience') {
      return (b.experienceYears || 0) - (a.experienceYears || 0) || (a.distanceKm || 999) - (b.distanceKm || 999);
    }
    if (sortBy === 'price_asc') {
      return (a.hourlyRate || a.baseVisitCharge || 0) - (b.hourlyRate || b.baseVisitCharge || 0);
    }

    // Default: Proximity-First Smart Ranking (Distance First, Quality Second)
    const distA = a.distanceKm != null ? a.distanceKm : 999;
    const distB = b.distanceKm != null ? b.distanceKm : 999;

    // Strict distance ordering when distance differs by 0.5 km or more
    // E.g. 1.2 km vendor ALWAYS ranks before 3.5 km vendor; 0 km ranks before 0.8 km
    const diff = Math.abs(distA - distB);
    if (diff >= 0.5) {
      return distA - distB;
    }

    // Within close proximity (< 0.5 km difference):
    // 1. Same Locality preference
    if (a.isSameLocality !== b.isSameLocality) {
      return a.isSameLocality ? -1 : 1;
    }

    // 2. Verified vendor trust
    const aVerified = a.verifiedBadge?.status === 'verified' || a.verifiedBadge?.status === 'approved' ? 1 : 0;
    const bVerified = b.verifiedBadge?.status === 'verified' || b.verifiedBadge?.status === 'approved' ? 1 : 0;
    if (aVerified !== bVerified) {
      return bVerified - aVerified;
    }

    // 3. Current Availability
    const aAvailable = a.availability?.isAvailableNow ? 1 : 0;
    const bAvailable = b.availability?.isAvailableNow ? 1 : 0;
    if (aAvailable !== bAvailable) {
      return bAvailable - aAvailable;
    }

    // 4. Rating & Completed Jobs quality rank
    const ratingScoreA = (a.rating || 4.5) * 10 + Math.min(20, (a.completedJobsCount || 0) * 0.1);
    const ratingScoreB = (b.rating || 4.5) * 10 + Math.min(20, (b.completedJobsCount || 0) * 0.1);
    if (Math.abs(ratingScoreA - ratingScoreB) > 2) {
      return ratingScoreB - ratingScoreA;
    }

    // 5. Same Zone tie-breaker
    if (a.isSameZone !== b.isSameZone) {
      return a.isSameZone ? -1 : 1;
    }

    // 6. Absolute distance deterministic tie-breaker
    return distA - distB;
  });

  // Step 6: Pagination & Sanitization
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const total = eligibleVendors.length;
  const startIndex = (pageNum - 1) * limitNum;
  const pagedVendors = eligibleVendors.slice(startIndex, startIndex + limitNum);

  const isGpsAvailable = distanceSource === 'gps';

  const formattedVendors = pagedVendors.map((v, index) => {
    const clean = sanitizePublicVendor(v);

    let displayDistanceText = 'Available in your area';
    if (isGpsAvailable && v.distanceKm != null) {
      displayDistanceText = `${v.distanceKm} km away`;
    } else if (v.isSameLocality) {
      displayDistanceText = `${v.locality} (Local)`;
    } else if (v.isSameZone) {
      displayDistanceText = `${v.locality} • ${v.zoneName || 'Same Zone'}`;
    } else if (v.locality) {
      displayDistanceText = `${v.locality} • ${v.zoneId || 'Nearby Zone'}`;
    }

    return {
      ...clean,
      distanceKm: isGpsAvailable ? v.distanceKm : null,
      rawDistanceKm: v.distanceKm,
      distanceText: displayDistanceText,
      isNearest: pageNum === 1 && index === 0,
      isApproximateDistance: !isGpsAvailable,
      zoneId: v.zoneId,
      zoneName: v.zoneName,
      locality: v.locality,
      vendorServiceRadiusKm: v.vendorServiceRadiusKm
    };
  });

  return {
    success: true,
    count: formattedVendors.length,
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum) || 1,
    searchCenter: {
      latitude: centerLat,
      longitude: centerLng,
      locality: locContext.locality,
      zoneId: locContext.zoneId,
      zoneName: locContext.zoneName,
      source: distanceSource,
      mode
    },
    radiusKm: maxSearchRadius,
    vendors: formattedVendors
  };
}

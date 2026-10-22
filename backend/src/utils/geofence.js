/**
 * WorkLogy GPS Geofence & Proximity Verification Utility
 * Calculates geographic distance using the Haversine formula
 * Validates vendor on-site arrival evidence against confirmed customer service destination.
 */

export function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const p1 = Number(lat1);
  const l1 = Number(lon1);
  const p2 = Number(lat2);
  const l2 = Number(lon2);

  if (isNaN(p1) || isNaN(l1) || isNaN(p2) || isNaN(l2)) {
    return Infinity;
  }

  // If coordinates are exact identical
  if (p1 === p2 && l1 === l2) {
    return 0;
  }

  const R = 6371e3; // Earth radius in metres
  const φ1 = (p1 * Math.PI) / 180;
  const φ2 = (p2 * Math.PI) / 180;
  const Δφ = ((p2 - p1) * Math.PI) / 180;
  const Δλ = ((l2 - l1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export const GEOFENCE_DEFAULT_RADIUS_METERS = parseInt(process.env.GEOFENCE_RADIUS_METERS || '150', 10);
export const GEOFENCE_DEFAULT_MAX_ACCURACY_METERS = parseInt(process.env.GEOFENCE_MAX_ACCURACY_METERS || '100', 10);
export const GEOFENCE_EVIDENCE_EXPIRY_MS = parseInt(process.env.GEOFENCE_EVIDENCE_EXPIRY_MS || String(30 * 60 * 1000), 10); // 30 minutes

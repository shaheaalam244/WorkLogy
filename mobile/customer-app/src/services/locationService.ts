import * as Location from 'expo-location';
import { secureStorage } from '../storage/secureStorage';
import { STORAGE_KEYS } from '../constants';
import { api } from '../api/client';
import type { ServiceAddress } from '../types';

export interface DetectedLocation {
  city: string;
  locality?: string;
  state?: string;
  pincode?: string;
  street?: string;
  fullAddress: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  method: 'gps' | 'ip' | 'saved' | 'default';
}

const DEFAULT_LOCATION: DetectedLocation = {
  city: 'Lucknow',
  locality: 'Gomti Nagar',
  state: 'Uttar Pradesh',
  pincode: '226010',
  fullAddress: 'Lucknow, Gomti Nagar',
  coordinates: {
    lat: 26.8467,
    lng: 80.9462
  },
  method: 'default'
};

/**
 * Parses any raw string or JSON representation of saved location
 */
export function parseLocationString(raw: string | null): DetectedLocation | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      const city = parsed.city || 'Lucknow';
      const locality = parsed.locality || '';
      const state = parsed.state || '';
      const pincode = parsed.pincode || parsed.zipCode || '';
      const fullAddress =
        parsed.fullAddress ||
        (locality ? `${city}, ${locality}` : city);
      return {
        city,
        locality,
        state,
        pincode,
        street: parsed.street || '',
        fullAddress,
        coordinates: parsed.coordinates,
        method: parsed.method || 'saved'
      };
    }
  } catch {
    // Plain string format, e.g. "Lucknow, Gomti Nagar" or "Noida, Sector 62"
  }

  const parts = raw.split(',').map((p) => p.trim());
  const city = parts[0] || 'Lucknow';
  const locality = parts.length > 1 ? parts.slice(1).join(', ') : '';
  return {
    city,
    locality,
    fullAddress: raw,
    method: 'saved'
  };
}

/**
 * Saves location to secure storage in a structured format
 */
export async function saveLocation(loc: DetectedLocation | string, details?: Partial<ServiceAddress>): Promise<void> {
  let locationObj: DetectedLocation;

  if (typeof loc === 'string') {
    const parsed = parseLocationString(loc);
    locationObj = {
      ...(parsed || DEFAULT_LOCATION),
      fullAddress: loc,
      city: details?.city || parsed?.city || loc.split(',')[0].trim(),
      locality: details?.locality || details?.street || parsed?.locality,
      state: details?.state || parsed?.state,
      pincode: details?.zipCode || details?.pincode || parsed?.pincode,
      street: details?.street || parsed?.street,
      coordinates: details?.coordinates || parsed?.coordinates
    };
  } else {
    locationObj = loc;
  }

  try {
    await secureStorage.setItem(STORAGE_KEYS.SAVED_LOCATION, JSON.stringify(locationObj));
  } catch {
    // Fallback to storing plain string if JSON serialization fails
    await secureStorage.setItem(STORAGE_KEYS.SAVED_LOCATION, locationObj.fullAddress);
  }
}

/**
 * Detect location via IP geolocation as a rapid fallback without requiring GPS permissions
 */
export async function detectLocationViaIP(): Promise<DetectedLocation | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch('https://ipwho.is/', {
      signal: controller.signal,
      headers: { Accept: 'application/json' }
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.city) {
        const city = data.city;
        const state = data.region || '';
        const pincode = data.postal || '';
        const fullAddress = `${city}${state ? ', ' + state : ''}`;
        return {
          city,
          locality: '',
          state,
          pincode,
          fullAddress,
          coordinates: {
            lat: data.latitude,
            lng: data.longitude
          },
          method: 'ip'
        };
      }
    }
  } catch {
    // Try secondary IP service
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      const res = await fetch('http://ip-api.com/json/?fields=status,country,regionName,city,zip,lat,lon', {
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        if (data && data.status === 'success' && data.city) {
          const city = data.city;
          const state = data.regionName || '';
          const pincode = data.zip || '';
          const fullAddress = `${city}${state ? ', ' + state : ''}`;
          return {
            city,
            locality: '',
            state,
            pincode,
            fullAddress,
            coordinates: {
              lat: data.lat,
              lng: data.lon
            },
            method: 'ip'
          };
        }
      }
    } catch {
      // ignore
    }
  }
  return null;
}

/**
 * Main automatic location detection routine
 * 1. Attempts device GPS via expo-location (with permission request)
 * 2. Reverse geocodes coordinates to street, locality, city, pincode
 * 3. Falls back to IP Geolocation if GPS is denied or unavailable
 * 4. Falls back to previously stored location or default
 */
export async function detectCurrentLocation(forceGps: boolean = false): Promise<DetectedLocation> {
  // If not forcing GPS and we already have a saved location, return it
  if (!forceGps) {
    const stored = await getStoredLocation(false);
    if (stored && stored.method !== 'default') {
      return stored;
    }
  }

  // 1. Try Device GPS via expo-location
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });

      const { latitude, longitude } = position.coords;

      // Try local reverse geocode
      try {
        const geocoded = await Location.reverseGeocodeAsync({
          latitude,
          longitude
        });

        if (geocoded && geocoded.length > 0) {
          const item = geocoded[0];
          const city = item.city || item.district || item.subregion || 'Lucknow';
          const locality = item.name || item.street || item.district || '';
          const state = item.region || 'Uttar Pradesh';
          const pincode = item.postalCode || '';
          const street = item.street || item.name || '';

          const displayLabel = locality && locality !== city
            ? `${city}, ${locality}`
            : `${city}${state ? ', ' + state : ''}`;

          const detected: DetectedLocation = {
            city,
            locality,
            state,
            pincode,
            street,
            fullAddress: displayLabel,
            coordinates: { lat: latitude, lng: longitude },
            method: 'gps'
          };

          await saveLocation(detected);
          return detected;
        }
      } catch {
        // Local reverse geocode failed, try backend reverse geocode
        try {
          const beRes = await api.location.reverseGeocode(latitude, longitude);
          if (beRes?.address) {
            const addr = beRes.address;
            const city = addr.city || 'Lucknow';
            const locality = addr.locality || addr.street || '';
            const displayLabel = locality && locality !== city
              ? `${city}, ${locality}`
              : `${city}${addr.state ? ', ' + addr.state : ''}`;

            const detected: DetectedLocation = {
              city,
              locality,
              state: addr.state,
              pincode: addr.zipCode,
              street: addr.street,
              fullAddress: displayLabel,
              coordinates: { lat: latitude, lng: longitude },
              method: 'gps'
            };

            await saveLocation(detected);
            return detected;
          }
        } catch {
          // ignore
        }
      }
    }
  } catch (gpsErr) {
    // GPS failed or permission denied
  }

  // 2. Fallback to IP Geolocation
  const ipLoc = await detectLocationViaIP();
  if (ipLoc) {
    await saveLocation(ipLoc);
    return ipLoc;
  }

  // 3. Fallback to Stored or Default
  const stored = await getStoredLocation(false);
  if (stored) return stored;

  await saveLocation(DEFAULT_LOCATION);
  return DEFAULT_LOCATION;
}

/**
 * Returns currently stored location or detects it automatically if missing
 */
export async function getStoredLocation(autoDetectIfMissing: boolean = true): Promise<DetectedLocation | null> {
  try {
    const raw = await secureStorage.getItem(STORAGE_KEYS.SAVED_LOCATION);
    if (raw) {
      const parsed = parseLocationString(raw);
      if (parsed) return parsed;
    }
  } catch {
    // ignore
  }

  if (autoDetectIfMissing) {
    return await detectCurrentLocation(false);
  }

  return null;
}

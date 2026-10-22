/**
 * WorkLogy Location Controller — Geolocation & Reverse Geocoding Service
 */

/**
 * Normalizes OpenStreetMap Nominatim response into WorkLogy standard address schema
 */
function normalizeNominatimAddress(data, lat, lng) {
  const addr = data.address || {};

  // 1. Street / Road / Colony
  let street = addr.road || addr.pedestrian || addr.street || addr.footway || addr.path || '';
  let locality = addr.suburb || addr.neighbourhood || addr.residential || addr.subdistrict || addr.quarter || addr.village || addr.hamlet || '';

  if (!street) {
    if (addr.residential) {
      street = addr.residential;
    } else if (addr.neighbourhood && addr.suburb) {
      street = addr.neighbourhood;
      locality = addr.suburb;
    } else if (addr.suburb) {
      street = addr.suburb;
      if (locality === street) {
        locality = addr.city_district || addr.county || '';
      }
    } else if (data.display_name) {
      const parts = data.display_name.split(',').map(s => s.trim());
      if (parts.length > 2) {
        street = parts[0];
      }
    }
  }

  // 2. City: Resolve true major city/district rather than administrative sub-tehsil
  let city = addr.city || addr.town || addr.municipality || '';
  if (!city) {
    if (addr.state_district && !addr.state_district.toLowerCase().includes('division')) {
      city = addr.state_district.replace(/district/i, '').trim();
    } else if (addr.city_district) {
      city = addr.city_district;
    } else if (addr.county) {
      city = addr.county;
    }
  }

  // If city is an administrative tehsil/block (e.g. Bakshi Ka Talab) while district is Lucknow
  if (addr.state_district && city && city.toLowerCase() !== addr.state_district.toLowerCase()) {
    const cleanDistrict = addr.state_district.replace(/district/i, '').trim();
    if (addr.county && city.toLowerCase() === addr.county.toLowerCase() && cleanDistrict) {
      if (!locality || locality === street) {
        locality = addr.county;
      }
      city = cleanDistrict;
    }
  }

  const state = addr.state || addr.province || '';
  const zipCode = addr.postcode || '';
  const country = addr.country || 'India';

  return {
    street: street.trim(),
    locality: locality.trim(),
    city: city.trim(),
    state: state.trim(),
    zipCode: zipCode.trim(),
    country: country.trim(),
    formattedAddress: data.display_name || '',
    coordinates: { lat, lng }
  };
}

/**
 * Normalizes BigDataCloud reverse geocode response
 */
function normalizeBDCAddress(data, lat, lng) {
  let locality = data.locality || '';
  let city = data.city || '';
  let state = data.principalSubdivision || '';
  let zipCode = data.postcode || '';
  let country = data.countryName || 'India';

  // Check administrative hierarchy for district and tehsil
  if (data.localityInfo?.administrative) {
    const admin = data.localityInfo.administrative;
    const distObj = admin.find(a => a.description?.toLowerCase().includes('district'));
    if (distObj && distObj.name) {
      city = distObj.name.replace(/district/i, '').trim();
    }
  }

  let street = locality || '';

  return {
    street,
    locality,
    city,
    state,
    zipCode,
    country,
    formattedAddress: `${locality ? locality + ', ' : ''}${city || ''}, ${state || ''}, ${country || ''}`.trim(),
    coordinates: { lat, lng }
  };
}

export const reverseGeocode = async (req, res, next) => {
  try {
    const lat = parseFloat(req.body?.latitude ?? req.query?.latitude ?? req.query?.lat);
    const lng = parseFloat(req.body?.longitude ?? req.query?.longitude ?? req.query?.lng);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      return res.status(400).json({
        success: false,
        message: 'Invalid latitude. Must be a numeric coordinate between -90 and 90.'
      });
    }

    if (isNaN(lng) || lng < -180 || lng > 180) {
      return res.status(400).json({
        success: false,
        message: 'Invalid longitude. Must be a numeric coordinate between -180 and 180.'
      });
    }

    let normalizedAddress = null;

    // 1. Primary provider: Nominatim (OpenStreetMap) with a 5s network timeout
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const osmRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`,
        {
          signal: controller.signal,
          headers: {
            'User-Agent': 'WorkLogy-Marketplace/1.0 (contact: support@worklogy.com)',
            'Accept': 'application/json'
          }
        }
      );
      clearTimeout(timeoutId);

      if (osmRes.ok) {
        const data = await osmRes.json();
        normalizedAddress = normalizeNominatimAddress(data, lat, lng);
      }
    } catch (osmErr) {
      console.warn('Nominatim reverse geocode attempt failed:', osmErr.message);
    }

    // 2. Secondary fallback provider: BigDataCloud reverse geocode client
    if (!normalizedAddress) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const bdcRes = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
          { signal: controller.signal }
        );
        clearTimeout(timeoutId);

        if (bdcRes.ok) {
          const data = await bdcRes.json();
          normalizedAddress = normalizeBDCAddress(data, lat, lng);
        }
      } catch (bdcErr) {
        console.warn('BigDataCloud reverse geocode attempt failed:', bdcErr.message);
      }
    }

    if (!normalizedAddress) {
      return res.status(502).json({
        success: false,
        message: 'Unable to resolve address components from GPS coordinates. Please enter your address details manually.'
      });
    }

    res.status(200).json({
      success: true,
      address: normalizedAddress
    });
  } catch (error) {
    next(error);
  }
};

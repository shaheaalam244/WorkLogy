import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Nearby Jobs Feed Test Suite
 * Tests vendor eligibility, category matching, service area coverage,
 * distance calculation (no fake distances), privacy masking, and status lifecycle.
 */

// Haversine Distance Calculation (matches backend/src/utils/geofence.js)
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const p1 = Number(lat1);
  const l1 = Number(lon1);
  const p2 = Number(lat2);
  const l2 = Number(lon2);

  if (isNaN(p1) || isNaN(l1) || isNaN(p2) || isNaN(l2)) {
    return Infinity;
  }

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

// Distance Formatter (Strict: Never fabricate distances)
function formatReliableDistance(jobCoords, vendorAreaCoords) {
  if (!jobCoords || !vendorAreaCoords || !vendorAreaCoords.length) {
    return { distanceKm: null, distanceFormatted: null };
  }

  const jobLat = Number(jobCoords.lat);
  const jobLng = Number(jobCoords.lng);

  if (isNaN(jobLat) || isNaN(jobLng) || (jobLat === 0 && jobLng === 0)) {
    return { distanceKm: null, distanceFormatted: null };
  }

  let minMeters = Infinity;
  for (const vCoord of vendorAreaCoords) {
    const vLat = Number(vCoord.lat);
    const vLng = Number(vCoord.lng);
    if (!isNaN(vLat) && !isNaN(vLng) && (vLat !== 0 || vLng !== 0)) {
      const meters = calculateDistanceMeters(vLat, vLng, jobLat, jobLng);
      if (meters < minMeters) minMeters = meters;
    }
  }

  if (minMeters === Infinity || minMeters > 200000) {
    return { distanceKm: null, distanceFormatted: null };
  }

  const km = Math.round((minMeters / 1000) * 10) / 10;
  return { distanceKm: km, distanceFormatted: `${km} km away` };
}

// Privacy Masking Function (matches backend/src/controllers/job.controller.js)
function sanitizeJobForVendor(job, requestingVendorId) {
  const isAssigned = Boolean(
    job.selectedVendor && job.selectedVendor.toString() === requestingVendorId.toString()
  );

  const sanitized = JSON.parse(JSON.stringify(job));

  if (!isAssigned) {
    if (sanitized.location) {
      sanitized.location.houseNumber = '';
      sanitized.location.street = '';
      sanitized.location.coordinates = { lat: 0, lng: 0 };
      sanitized.location.address = `${sanitized.location.locality ? sanitized.location.locality + ', ' : ''}${sanitized.location.city || ''}`;
      sanitized.location.isMaskedForPrivacy = true;
    }
    sanitized.contactPhone = '';
    if (sanitized.customer) {
      sanitized.customer = {
        _id: sanitized.customer._id,
        name: sanitized.customer.name,
        avatar: sanitized.customer.avatar
      };
    }
  } else {
    if (sanitized.location) {
      sanitized.location.isMaskedForPrivacy = false;
    }
  }

  return sanitized;
}

// Category and Area Matching Filter
function matchJobToVendor(job, vendorProfile) {
  if (!job || !vendorProfile) return false;

  // 1. Account status: suspended vendors get no actionable matches
  if (vendorProfile.userStatus === 'suspended') return false;

  // 2. Category matching: job category must be in vendor approved categories
  const approvedCategoryIds = (vendorProfile.categories || []).map(c => (c._id || c).toString());
  const jobCatId = (job.category?._id || job.category)?.toString();

  if (!jobCatId || !approvedCategoryIds.includes(jobCatId)) {
    return false;
  }

  // 3. Service area matching: city check
  const vendorCity = (vendorProfile.city || 'lucknow').toLowerCase().trim();
  const jobCity = (job.location?.city || 'lucknow').toLowerCase().trim();

  if (vendorCity !== jobCity) {
    return false;
  }

  // 4. Locality matching: if vendor configured specific localities
  const coverageAreas = (vendorProfile.serviceAreas || []).map(a => (a.name || a).toLowerCase().trim());
  const hasCityWide = coverageAreas.length === 0 || coverageAreas.some(a =>
    a.includes('all') || a.includes('entire') || a === vendorCity
  );

  if (!hasCityWide && coverageAreas.length > 0) {
    const jobLocality = (job.location?.locality || '').toLowerCase().trim();
    const matchesLocality = coverageAreas.some(area =>
      area.includes(jobLocality) || jobLocality.includes(area)
    );
    if (!matchesLocality) return false;
  }

  return true;
}

// Active Feed Status Filtering
function filterJobsByTab(jobs, tab, vendorId) {
  return jobs.filter(job => {
    if (job.isDeleted) return false;

    if (tab === 'assigned') {
      return job.selectedVendor?.toString() === vendorId.toString() &&
        ['assigned', 'in_progress', 'completion_pending', 'completed'].includes(job.status);
    }

    if (tab === 'cancelled') {
      return job.status === 'cancelled';
    }

    // Active opportunities ('all', 'new', 'open')
    if (!['open', 'dispatching'].includes(job.status) || job.selectedVendor) {
      return false;
    }

    if (tab === 'new') {
      const fortyEightHoursAgo = Date.now() - 48 * 60 * 60 * 1000;
      return new Date(job.createdAt).getTime() >= fortyEightHoursAgo;
    }

    return true;
  });
}

describe('Nearby Jobs Feed — Core Logic & Requirements', () => {

  describe('1. Category & Service Area Matching', () => {
    const sampleProfile = {
      userStatus: 'active',
      city: 'Lucknow',
      categories: ['cat_plumbing', 'cat_electrical'],
      serviceAreas: [{ name: 'Gomti Nagar' }, { name: 'Indira Nagar' }]
    };

    it('matches job with approved category and covered locality', () => {
      const job = {
        category: 'cat_plumbing',
        location: { city: 'Lucknow', locality: 'Gomti Nagar' }
      };
      assert.equal(matchJobToVendor(job, sampleProfile), true);
    });

    it('rejects job with unsupported category despite matching locality', () => {
      const job = {
        category: 'cat_carpentry', // Not in vendor profile
        location: { city: 'Lucknow', locality: 'Gomti Nagar' }
      };
      assert.equal(matchJobToVendor(job, sampleProfile), false);
    });

    it('rejects job in a different city', () => {
      const job = {
        category: 'cat_plumbing',
        location: { city: 'Kanpur', locality: 'Gomti Nagar' }
      };
      assert.equal(matchJobToVendor(job, sampleProfile), false);
    });

    it('rejects job outside configured localities when not city-wide', () => {
      const job = {
        category: 'cat_plumbing',
        location: { city: 'Lucknow', locality: 'Alambagh' } // Alambagh not in Gomti Nagar/Indira Nagar
      };
      assert.equal(matchJobToVendor(job, sampleProfile), false);
    });

    it('permits all localities when vendor coverage includes "All Localities"', () => {
      const cityWideProfile = {
        ...sampleProfile,
        serviceAreas: [{ name: 'All Localities' }]
      };
      const job = {
        category: 'cat_plumbing',
        location: { city: 'Lucknow', locality: 'Alambagh' }
      };
      assert.equal(matchJobToVendor(job, cityWideProfile), true);
    });
  });

  describe('2. Distance Calculation & Zero-Fabrication Guarantee', () => {
    const vendorCoords = [
      { lat: 26.8467, lng: 80.9462 } // Lucknow Hazratganj center
    ];

    it('calculates accurate distance when valid coordinates exist', () => {
      const jobCoords = { lat: 26.8530, lng: 80.9980 }; // Gomti Nagar ~5.2 km away
      const res = formatReliableDistance(jobCoords, vendorCoords);

      assert.ok(res.distanceKm > 4.5 && res.distanceKm < 6.0);
      assert.match(res.distanceFormatted, /^\d+(\.\d+)? km away$/);
    });

    it('returns null and never fabricates distance when job coordinates are missing or zero', () => {
      const zeroJobCoords = { lat: 0, lng: 0 };
      const res = formatReliableDistance(zeroJobCoords, vendorCoords);

      assert.equal(res.distanceKm, null);
      assert.equal(res.distanceFormatted, null);
    });

    it('returns null when vendor coordinates are empty', () => {
      const jobCoords = { lat: 26.8530, lng: 80.9980 };
      const res = formatReliableDistance(jobCoords, []);

      assert.equal(res.distanceKm, null);
      assert.equal(res.distanceFormatted, null);
    });
  });

  describe('3. Privacy Protection & Information Masking', () => {
    const rawJob = {
      _id: 'job_123',
      title: 'Fix Leaking Pipe',
      selectedVendor: null,
      contactPhone: '9876543210',
      customer: {
        _id: 'cust_456',
        name: 'Amit Sharma',
        phone: '9876543210',
        email: 'amit@example.com'
      },
      location: {
        houseNumber: 'Flat 402, Tower B',
        street: 'Vipin Khand',
        locality: 'Gomti Nagar',
        city: 'Lucknow',
        coordinates: { lat: 26.8530, lng: 80.9980 }
      }
    };

    it('masks exact house number, street, phone, and raw GPS for unassigned browsing vendors', () => {
      const sanitized = sanitizeJobForVendor(rawJob, 'vendor_789');

      assert.equal(sanitized.location.houseNumber, '');
      assert.equal(sanitized.location.street, '');
      assert.equal(sanitized.location.coordinates.lat, 0);
      assert.equal(sanitized.location.coordinates.lng, 0);
      assert.equal(sanitized.location.isMaskedForPrivacy, true);
      assert.equal(sanitized.contactPhone, '');
      assert.equal(sanitized.customer.phone, undefined);
      assert.equal(sanitized.customer.email, undefined);
      assert.equal(sanitized.location.locality, 'Gomti Nagar');
      assert.equal(sanitized.location.city, 'Lucknow');
    });

    it('reveals full address and contact details to the assigned vendor', () => {
      const assignedJob = { ...rawJob, selectedVendor: 'vendor_789' };
      const sanitized = sanitizeJobForVendor(assignedJob, 'vendor_789');

      assert.equal(sanitized.location.houseNumber, 'Flat 402, Tower B');
      assert.equal(sanitized.location.street, 'Vipin Khand');
      assert.equal(sanitized.location.isMaskedForPrivacy, false);
      assert.equal(sanitized.contactPhone, '9876543210');
    });
  });

  describe('4. Status Lifecycle & Tab Filtering', () => {
    const now = Date.now();
    const testJobs = [
      {
        _id: 'j1',
        status: 'open',
        selectedVendor: null,
        createdAt: new Date(now - 2 * 60 * 60 * 1000) // 2h ago -> New & Open
      },
      {
        _id: 'j2',
        status: 'open',
        selectedVendor: null,
        createdAt: new Date(now - 72 * 60 * 60 * 1000) // 72h ago -> Open, not New
      },
      {
        _id: 'j3',
        status: 'assigned',
        selectedVendor: 'vendor_me',
        createdAt: new Date(now - 10 * 60 * 60 * 1000)
      },
      {
        _id: 'j4',
        status: 'assigned',
        selectedVendor: 'vendor_other', // Assigned to someone else
        createdAt: new Date(now - 10 * 60 * 60 * 1000)
      },
      {
        _id: 'j5',
        status: 'cancelled',
        selectedVendor: null,
        createdAt: new Date(now - 5 * 60 * 60 * 1000)
      }
    ];

    it('"all" tab includes available open jobs only, never cancelled or assigned jobs', () => {
      const active = filterJobsByTab(testJobs, 'all', 'vendor_me');
      const ids = active.map(j => j._id);
      assert.deepEqual(ids, ['j1', 'j2']);
      assert.equal(ids.includes('j3'), false); // Assigned to me not in open opportunities
      assert.equal(ids.includes('j4'), false); // Assigned to other not in open opportunities
      assert.equal(ids.includes('j5'), false); // Cancelled not in open opportunities
    });

    it('"new" tab includes only available jobs created within 48 hours', () => {
      const newJobs = filterJobsByTab(testJobs, 'new', 'vendor_me');
      const ids = newJobs.map(j => j._id);
      assert.deepEqual(ids, ['j1']);
    });

    it('"assigned" tab returns only jobs assigned to the requesting vendor', () => {
      const assigned = filterJobsByTab(testJobs, 'assigned', 'vendor_me');
      const ids = assigned.map(j => j._id);
      assert.deepEqual(ids, ['j3']);
    });

    it('"cancelled" tab returns cancelled records for audit/history, strictly separate from active feed', () => {
      const cancelled = filterJobsByTab(testJobs, 'cancelled', 'vendor_me');
      const ids = cancelled.map(j => j._id);
      assert.deepEqual(ids, ['j5']);
    });
  });

  describe('5. Vendor Eligibility & Safety Constraints', () => {
    it('denies all opportunities to suspended vendors', () => {
      const suspendedVendor = {
        userStatus: 'suspended',
        city: 'Lucknow',
        categories: ['cat_plumbing']
      };
      const job = {
        category: 'cat_plumbing',
        location: { city: 'Lucknow', locality: 'Gomti Nagar' }
      };
      assert.equal(matchJobToVendor(job, suspendedVendor), false);
    });
  });

});

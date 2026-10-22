import mongoose from 'mongoose';
import VendorProfile from '../models/VendorProfile.js';
import ServiceListing from '../models/ServiceListing.js';
import Booking from '../models/Booking.js';
import User from '../models/User.js';

/**
 * Check if current time falls within vendor's emergency working hours
 */
export const isWithinEmergencyHours = (hoursConfig) => {
  if (!hoursConfig || hoursConfig.is24x7) return true;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const startStr = hoursConfig.start || '00:00';
  const endStr = hoursConfig.end || '23:59';

  const [startH, startM] = startStr.split(':').map(Number);
  const [endH, endM] = endStr.split(':').map(Number);

  const startMinutes = (isNaN(startH) ? 0 : startH) * 60 + (isNaN(startM) ? 0 : startM);
  const endMinutes = (isNaN(endH) ? 23 : endH) * 60 + (isNaN(endM) ? 59 : endM);

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }
  // Overnight shift (e.g., 20:00 to 06:00)
  return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
};

/**
 * Check whether vendor has matching skill, category or service
 */
export const vendorHasMatchingService = (profile, categoryId, categoryName = '', jobTitle = '') => {
  if (!profile) return false;

  const catIdStr = categoryId ? categoryId.toString() : '';
  const catNameLower = (categoryName || '').toLowerCase().trim();
  const titleLower = (jobTitle || '').toLowerCase().trim();

  // 1. Check emergencyAvailability categories
  if (profile.emergencyAvailability?.categories?.length) {
    const hasCat = profile.emergencyAvailability.categories.some(c => {
      const idMatch = (c?._id || c)?.toString() === catIdStr;
      const nameMatch = catNameLower && c?.name && c.name.toLowerCase() === catNameLower;
      return idMatch || nameMatch;
    });
    if (hasCat) return true;
  }

  // 2. Check emergencyAvailability category names
  if (profile.emergencyAvailability?.categoryNames?.length) {
    const hasName = profile.emergencyAvailability.categoryNames.some(name => {
      const n = (name || '').toLowerCase();
      return (catNameLower && n.includes(catNameLower)) || (titleLower && titleLower.includes(n));
    });
    if (hasName) return true;
  }

  // 3. Check profile primary categories
  if (profile.categories?.length) {
    const hasPrimaryCat = profile.categories.some(c => {
      const idMatch = (c?._id || c)?.toString() === catIdStr;
      const nameMatch = catNameLower && c?.name && c.name.toLowerCase() === catNameLower;
      const slugMatch = catNameLower && c?.slug && (
        c.slug.toLowerCase() === catNameLower ||
        c.slug.toLowerCase() === catNameLower.replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-')
      );
      return idMatch || nameMatch || slugMatch;
    });
    if (hasPrimaryCat) return true;
  }

  // 4. Check vendor's active Skills & Services list
  if (profile.services?.length) {
    const hasActiveSkill = profile.services.some(s => {
      if (s.isActive === false) return false;
      const sCatId = (s.category?._id || s.category)?.toString();
      const sCatName = (s.categoryName || '').toLowerCase();
      const sTitle = (s.title || '').toLowerCase();

      return (
        (catIdStr && sCatId === catIdStr) ||
        (catNameLower && sCatName.includes(catNameLower)) ||
        (titleLower && sTitle.includes(titleLower)) ||
        (titleLower && catNameLower && sTitle.includes(catNameLower))
      );
    });
    if (hasActiveSkill) return true;
  }

  return false;
};

/**
 * Check locality & service area matching
 */
export const vendorServesArea = (profile, jobLocality = '', jobCity = 'Lucknow') => {
  if (!profile) return true;

  const localityLower = (jobLocality || '').toLowerCase().trim();
  const cityLower = (jobCity || 'lucknow').toLowerCase().trim();
  const profCityLower = (profile.city || 'lucknow').toLowerCase().trim();

  // City check
  if (profCityLower && cityLower && profCityLower !== cityLower && !cityLower.includes(profCityLower)) {
    return false;
  }

  // Check emergency & skill service areas if configured
  const emergencyAreas = profile.emergencyAvailability?.serviceAreas || [];
  const skillAreas = (profile.services || []).map(s => s.serviceArea).filter(Boolean);
  const areas = [...emergencyAreas, ...skillAreas];

  if (Array.isArray(areas) && areas.length > 0) {
    const hasAll = areas.some(a => {
      const al = a.toLowerCase();
      return al.includes('all') || al.includes('entire') || al === 'lucknow';
    });
    if (hasAll) return true;

    if (localityLower) {
      return areas.some(a => {
        const al = a.toLowerCase();
        return al.includes(localityLower) || localityLower.includes(al);
      });
    }
  }

  return true;
};

/**
 * Matching engine to discover eligible vendors for instant job assignment
 */
export const matchEligibleVendors = async (job) => {
  if (!job) return [];

  const categoryId = job.category?._id || job.category;
  const categoryName = job.category?.name || '';
  const jobTitle = job.title || '';
  const jobCity = (job.location?.city || 'Lucknow').trim();
  const jobLocality = (job.location?.locality || '').trim();
  const isEmergency = job.urgency === 'emergency';
  const customerId = (job.customer?._id || job.customer)?.toString();

  // If Emergency job, strictly match emergency-enabled, active vendors within working hours
  if (isEmergency) {
    const profiles = await VendorProfile.find({
      approvalStatus: 'approved',
      'emergencyAvailability.isAvailable': true,
      'verifiedBadge.status': { $ne: 'rejected' },
      'availability.isAvailableNow': { $ne: false }
    })
      .populate('user', 'name email phone avatar role status')
      .populate('categories', 'name slug')
      .populate('emergencyAvailability.categories', 'name slug');

    const eligibleEmergencyVendors = [];

    for (const prof of profiles) {
      if (!prof.user || prof.user.role !== 'vendor') continue;
      if (prof.user.status === 'suspended') continue;
      const uid = prof.user._id.toString();
      if (uid === customerId) continue;

      // 1. Working hours validation
      if (!isWithinEmergencyHours(prof.emergencyAvailability?.hours)) {
        continue;
      }

      // 2. Service/skill category matching
      const hasSkill = vendorHasMatchingService(prof, categoryId, categoryName, jobTitle);
      if (!hasSkill) {
        continue;
      }

      // 3. Service area / locality matching
      if (!vendorServesArea(prof, jobLocality, jobCity)) {
        continue;
      }

      // 4. Capacity limit: max 5 active bookings for emergency responders
      const activeJobsCount = await Booking.countDocuments({
        vendor: prof.user._id,
        status: { $in: ['confirmed', 'scheduled', 'in_progress'] }
      });
      if (activeJobsCount >= 5) {
        continue;
      }

      eligibleEmergencyVendors.push({
        userId: prof.user._id,
        user: prof.user,
        businessName: prof.businessName,
        rating: prof.rating || 5.0,
        hourlyRate: prof.emergencyAvailability?.callOutFee || prof.hourlyRate || 500,
        callOutFee: prof.emergencyAvailability?.callOutFee || 499,
        verified: prof.verifiedBadge?.status === 'verified',
        isEmergencyResponder: true
      });
    }

    return eligibleEmergencyVendors;
  }

  // ---------------- Standard (Non-Emergency) Job Matching ----------------
  const profileQuery = {
    approvalStatus: 'approved',
    'verifiedBadge.status': { $ne: 'rejected' },
    'availability.isAvailableNow': { $ne: false }
  };

  if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
    const catObjId = new mongoose.Types.ObjectId(categoryId);
    profileQuery.$or = [
      { categories: catObjId },
      { 'services.category': catObjId }
    ];
  }

  const profiles = await VendorProfile.find(profileQuery)
    .populate('user', 'name email phone avatar role status')
    .populate('categories', 'name slug');

  const listingQuery = { status: 'published' };
  if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
    listingQuery.category = new mongoose.Types.ObjectId(categoryId);
  }

  const activeListings = await ServiceListing.find(listingQuery)
    .populate('vendor', 'name email phone avatar role status');

  const vendorMap = new Map();

  for (const prof of profiles) {
    if (!prof.user || prof.user.status === 'suspended') continue;
    const uid = prof.user._id.toString();
    if (uid === customerId) continue;
    if (!vendorServesArea(prof, jobLocality, jobCity)) continue;

    // Verify skill/category match
    const hasSkill = vendorHasMatchingService(prof, categoryId, categoryName, jobTitle);
    if (!hasSkill && prof.categories?.length > 0) continue;

    vendorMap.set(uid, {
      userId: prof.user._id,
      user: prof.user,
      businessName: prof.businessName,
      rating: prof.rating || 5.0,
      hourlyRate: prof.hourlyRate || 500,
      verified: prof.verifiedBadge?.status === 'verified',
      categories: prof.categories || []
    });
  }

  for (const list of activeListings) {
    if (!list.vendor || list.vendor.status === 'suspended') continue;
    const uid = list.vendor._id.toString();
    if (uid === customerId) continue;

    if (!vendorMap.has(uid)) {
      vendorMap.set(uid, {
        userId: list.vendor._id,
        user: list.vendor,
        businessName: list.title,
        rating: list.rating || 5.0,
        hourlyRate: list.pricing?.amount || 500,
        verified: true,
        categories: []
      });
    }
  }

  const candidateVendors = Array.from(vendorMap.values());
  const eligibleVendors = [];

  for (const cand of candidateVendors) {
    const activeJobsCount = await Booking.countDocuments({
      vendor: cand.userId,
      status: { $in: ['confirmed', 'scheduled', 'in_progress'] }
    });

    if (activeJobsCount < 10) {
      eligibleVendors.push(cand);
    }
  }

  return eligibleVendors;
};

/**
 * Check if a specific vendor is eligible to atomically accept and claim a job
 */
export const isVendorEligible = async (vendorUserId, job) => {
  if (!vendorUserId || !job) {
    return { eligible: false, reason: 'Invalid vendor or job details' };
  }

  const vendorIdStr = vendorUserId.toString();
  const customerIdStr = (job.customer?._id || job.customer)?.toString();

  // 1. Customer cannot claim own job
  if (vendorIdStr === customerIdStr) {
    return { eligible: false, reason: 'Customers cannot accept their own service requests' };
  }

  // 2. Verify vendor account
  const vendorUser = await User.findById(vendorUserId);
  if (!vendorUser || vendorUser.role !== 'vendor') {
    return { eligible: false, reason: 'Only registered and authorized service contractors can accept jobs' };
  }
  if (vendorUser.status === 'suspended') {
    return { eligible: false, reason: 'Contractor account is currently suspended' };
  }

  // 3. Verify vendor profile / verification
  const profile = await VendorProfile.findOne({ user: vendorUserId })
    .populate('categories')
    .populate('emergencyAvailability.categories');

  if (!profile) {
    return {
      eligible: false,
      reason: 'Your professional profile is not registered or approved to accept service assignments.'
    };
  }

  // Strict Administrator Approval Guard
  if (profile.approvalStatus !== 'approved') {
    const statusReasons = {
      pending: 'Your professional account is pending administrator review and approval. You will be able to accept jobs once approved.',
      under_review: 'Your professional application is currently under administrative review.',
      changes_required: `Changes are required on your profile before you can accept jobs: ${profile.rejectionReason || 'Please review administrative feedback and update your profile.'}`,
      rejected: `Your professional application was declined: ${profile.rejectionReason || 'Contact support for more details.'}`,
      suspended: `Your professional account is currently suspended: ${profile.rejectionReason || 'Contact support for more details.'}`
    };
    return {
      eligible: false,
      reason: statusReasons[profile.approvalStatus] || 'Your professional account is not approved to accept service assignments.'
    };
  }

  if (profile.verifiedBadge?.status === 'rejected') {
    return { eligible: false, reason: 'Your contractor verification has been declined by administration' };
  }
  if (profile.availability?.isAvailableNow === false) {
    return { eligible: false, reason: 'You are currently marked unavailable for instant jobs in your settings' };
  }

  // Mandatory Category & Skill matching for ALL jobs (both Emergency and Normal):
  const categoryId = job.category?._id || job.category;
  const categoryName = job.category?.name || '';
  const hasSkill = vendorHasMatchingService(profile, categoryId, categoryName, job.title);
  if (!hasSkill) {
    return {
      eligible: false,
      reason: `This ${job.urgency === 'emergency' ? 'emergency ' : ''}job requires ${categoryName || 'specific trade'} skills, which are not in your approved professional profile.`
    };
  }

  // Mandatory Service Area & Locality matching for ALL jobs:
  if (!vendorServesArea(profile, job.location?.locality, job.location?.city)) {
    return {
      eligible: false,
      reason: 'This job is outside your configured service area coverage.'
    };
  }

  // Emergency-specific validations
  if (job.urgency === 'emergency') {
    if (profile.emergencyAvailability?.isAvailable === false) {
      return {
        eligible: false,
        reason: 'Emergency availability is turned OFF in your profile. Please enable emergency jobs in your settings first.'
      };
    }

    if (!isWithinEmergencyHours(profile.emergencyAvailability?.hours)) {
      return {
        eligible: false,
        reason: 'Current time is outside your configured emergency working hours.'
      };
    }
  }

  // 4. Check capacity limits
  const isEmergency = job.urgency === 'emergency';
  const activeCount = await Booking.countDocuments({
    vendor: vendorUserId,
    status: { $in: ['confirmed', 'scheduled', 'in_progress'] }
  });
  const maxCapacity = isEmergency ? 5 : 10;
  if (activeCount >= maxCapacity) {
    return {
      eligible: false,
      reason: `You have reached the maximum active job capacity (${maxCapacity} active jobs). Please complete pending jobs first.`
    };
  }

  return { eligible: true, vendorUser, profile };
};


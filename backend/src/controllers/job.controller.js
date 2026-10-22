import mongoose from 'mongoose';
import Job from '../models/Job.js';
import User from '../models/User.js';
import Booking from '../models/Booking.js';
import Application from '../models/Application.js';
import ServiceCategory from '../models/ServiceCategory.js';
import CustomerProfile from '../models/CustomerProfile.js';
import VendorProfile from '../models/VendorProfile.js';
import Notification from '../models/Notification.js';
import { getIO } from '../config/socket.js';
import { uploadToCloudinary } from '../config/cloudinary.js';
import { matchEligibleVendors, isVendorEligible } from '../services/vendorMatching.service.js';
import { generateSecureOtp } from '../utils/otp.js';
import { calculateDistanceMeters } from '../utils/geofence.js';
import ServiceArea from '../models/ServiceArea.js';
import { notifyBookingConfirmed, notifyCancellation } from '../services/notification.service.js';

export const getJobs = async (req, res, next) => {
  try {
    const { category, status, urgency, city, search, limit } = req.query;
    let filter = { isDeleted: { $ne: true } };

    const isAdmin = req.user?.role === 'admin';

    if (category && category !== 'all') {
      if (mongoose.Types.ObjectId.isValid(category)) {
        filter.category = category;
      } else {
        const catDoc = await ServiceCategory.findOne({
          $or: [
            { slug: String(category).toLowerCase() },
            { name: new RegExp('^' + category + '$', 'i') }
          ]
        });
        if (catDoc) {
          filter.category = catDoc._id;
        }
      }
    }

    if (status && status !== 'all') {
      // Non-admins cannot browse cancelled or expired jobs via open marketplace endpoint
      if (!isAdmin && ['cancelled', 'expired'].includes(status)) {
        filter.status = { $nin: ['cancelled', 'expired'] };
      } else {
        filter.status = status;
      }
    } else if (!isAdmin) {
      // Default: Always strictly exclude cancelled and expired requests from all public, vendor, and search feeds
      filter.status = { $nin: ['cancelled', 'expired'] };
    }

    if (urgency && urgency !== 'all') {
      filter.urgency = urgency;
    }

    if (city && city.trim() !== '' && city !== 'All Locations') {
      filter['location.city'] = { $regex: city.trim(), $options: 'i' };
    }

    if (search && search.trim() !== '') {
      filter.$or = [
        { title: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    const maxJobs = limit ? parseInt(limit, 10) : 20;

    const jobs = await Job.find(filter)
      .populate('customer', 'name email avatar')
      .populate('category', 'name slug icon')
      .sort({ createdAt: -1 })
      .limit(maxJobs);

    const currentUserId = req.user?._id?.toString() || req.user?.id?.toString();

    // Privacy Protection: Mask house number, street, and exact coordinates on open job market browse
    const sanitizedJobs = jobs.map(job => {
      const isOwner = Boolean(currentUserId && job.customer?._id?.toString() === currentUserId);
      const isSelectedVendor = Boolean(
        currentUserId && job.selectedVendor && job.selectedVendor.toString() === currentUserId
      );

      if (isOwner || isAdmin || isSelectedVendor) {
        return job;
      }

      const jobObj = job.toObject();
      if (jobObj.location) {
        jobObj.location = {
          ...jobObj.location,
          houseNumber: '',
          street: '',
          address: `${jobObj.location.locality ? jobObj.location.locality + ', ' : ''}${jobObj.location.city || ''}`,
          coordinates: { lat: 0, lng: 0 },
          isMaskedForPrivacy: true
        };
      }
      return jobObj;
    });

    res.status(200).json({ success: true, count: sanitizedJobs.length, jobs: sanitizedJobs });
  } catch (error) {
    next(error);
  }
};

/**
 * Helper to compute status tab counts for vendor nearby jobs feed
 */
async function computeNearbyCounts(vendorUserId, approvedCategoryIds, vendorCity, hasCityWide, uniqueLocalities) {
  const baseCoverageQuery = {
    isDeleted: { $ne: true },
    category: { $in: approvedCategoryIds }
  };
  if (vendorCity) {
    baseCoverageQuery['location.city'] = { $regex: new RegExp('^' + vendorCity + '$', 'i') };
  }
  if (!hasCityWide && uniqueLocalities.length > 0) {
    baseCoverageQuery['location.locality'] = { $in: uniqueLocalities.map(loc => new RegExp(loc, 'i')) };
  }

  const [allAvailable, newJobs, assignedToMe, cancelled] = await Promise.all([
    // All available open opportunities
    Job.countDocuments({
      ...baseCoverageQuery,
      status: { $in: ['open', 'dispatching'] },
      selectedVendor: null,
      declinedVendors: { $ne: vendorUserId }
    }),
    // New available opportunities (<48 hours)
    Job.countDocuments({
      ...baseCoverageQuery,
      status: { $in: ['open', 'dispatching'] },
      selectedVendor: null,
      declinedVendors: { $ne: vendorUserId },
      createdAt: { $gte: new Date(Date.now() - 48 * 60 * 60 * 1000) }
    }),
    // Assigned to this vendor
    Job.countDocuments({
      isDeleted: { $ne: true },
      selectedVendor: vendorUserId,
      status: { $in: ['assigned', 'in_progress', 'completion_pending', 'completed'] }
    }),
    // Cancelled jobs relevant to vendor
    Job.countDocuments({
      ...baseCoverageQuery,
      status: 'cancelled'
    })
  ]);

  return {
    allAvailable,
    new: newJobs,
    open: allAvailable,
    assignedToMe,
    cancelled
  };
}

/**
 * Production-ready Nearby Jobs Feed for authorized vendors
 * GET /api/jobs/nearby
 */
export const getNearbyJobs = async (req, res, next) => {
  try {
    const vendorUserId = req.user?.id || req.user?._id;

    // 1. Verify vendor role and check suspension
    const vendorUser = await User.findById(vendorUserId);
    if (!vendorUser || vendorUser.role !== 'vendor') {
      return res.status(403).json({ success: false, message: 'Vendor access required' });
    }
    if (vendorUser.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Your contractor account is currently suspended. Please contact support.'
      });
    }

    // 2. Fetch Vendor Profile with categories & service areas
    const profile = await VendorProfile.findOne({ user: vendorUserId })
      .populate('categories', 'name slug icon')
      .populate('serviceAreas')
      .populate('emergencyAvailability.categories', 'name slug')
      .populate('services.category', 'name slug icon');

    if (!profile) {
      return res.status(200).json({
        success: true,
        configurationStatus: 'missing_profile',
        message: 'Please complete your vendor profile first.',
        jobs: [],
        total: 0,
        page: 1,
        totalPages: 0,
        counts: { allAvailable: 0, new: 0, open: 0, assignedToMe: 0, cancelled: 0 },
        vendorCoverage: { city: 'Lucknow', localities: [], hasCityWide: false, approvedCategoriesCount: 0, categories: [] },
        vendorEligibility: { approvalStatus: 'pending', canClaim: false, reason: 'Profile incomplete' }
      });
    }

    // 3. Extract vendor approved categories
    const approvedCategoryMap = new Map();
    if (Array.isArray(profile.categories)) {
      profile.categories.forEach(c => {
        if (c) {
          const id = (c._id || c).toString();
          if (id) approvedCategoryMap.set(id, { id, name: c.name || 'Trade Service', slug: c.slug || '' });
        }
      });
    }
    if (Array.isArray(profile.services)) {
      profile.services.forEach(s => {
        if (s && s.isActive !== false && s.category) {
          const c = s.category;
          const id = (c._id || c).toString();
          if (id && !approvedCategoryMap.has(id)) {
            approvedCategoryMap.set(id, { id, name: s.categoryName || c.name || 'Trade Service', slug: c.slug || '' });
          }
        }
      });
    }
    if (Array.isArray(profile.emergencyAvailability?.categories)) {
      profile.emergencyAvailability.categories.forEach(c => {
        if (c) {
          const id = (c._id || c).toString();
          if (id && !approvedCategoryMap.has(id)) {
            approvedCategoryMap.set(id, { id, name: c.name || 'Emergency Trade', slug: c.slug || '' });
          }
        }
      });
    }

    const approvedCategories = Array.from(approvedCategoryMap.values());
    const approvedCategoryIds = approvedCategories.map(c => new mongoose.Types.ObjectId(c.id));

    // 4. Extract vendor service areas & coverage
    const vendorCity = (profile.city || 'Lucknow').trim();
    const coverageLocalities = [];
    const validAreaCoords = [];

    if (Array.isArray(profile.serviceAreas)) {
      profile.serviceAreas.forEach(sa => {
        if (sa && sa.name) coverageLocalities.push(sa.name.trim());
        if (sa && sa.coordinates && (Number(sa.coordinates.lat) !== 0 || Number(sa.coordinates.lng) !== 0)) {
          validAreaCoords.push({
            lat: Number(sa.coordinates.lat),
            lng: Number(sa.coordinates.lng),
            radiusKm: sa.radiusKm || 30
          });
        }
      });
    }
    if (Array.isArray(profile.emergencyAvailability?.serviceAreas)) {
      profile.emergencyAvailability.serviceAreas.forEach(a => {
        if (a && a.trim()) coverageLocalities.push(a.trim());
      });
    }
    if (Array.isArray(profile.services)) {
      profile.services.forEach(s => {
        if (s && s.serviceArea && s.serviceArea.trim()) coverageLocalities.push(s.serviceArea.trim());
      });
    }

    const uniqueLocalities = [...new Set(coverageLocalities)];
    const hasCityWide = uniqueLocalities.length === 0 || uniqueLocalities.some(loc => {
      const l = loc.toLowerCase();
      return l.includes('all') || l.includes('entire') || l === vendorCity.toLowerCase();
    });

    // 5. Determine Configuration Status
    let configurationStatus = 'ready';
    if (approvedCategoryIds.length === 0) {
      configurationStatus = 'missing_categories';
    } else if (!vendorCity && (!profile.serviceAreas || profile.serviceAreas.length === 0)) {
      configurationStatus = 'missing_service_area';
    }

    // 6. Vendor eligibility to claim
    const isApproved = profile.approvalStatus === 'approved';
    const vendorEligibility = {
      approvalStatus: profile.approvalStatus || 'pending',
      canClaim: Boolean(isApproved && profile.availability?.isAvailableNow !== false && profile.verifiedBadge?.status !== 'rejected'),
      reason: isApproved ? '' : (profile.rejectionReason || 'Your contractor profile is pending administrative review. You can browse nearby jobs in read-only mode.')
    };

    // If missing categories or service area, return early with clear prompt
    if (configurationStatus !== 'ready') {
      return res.status(200).json({
        success: true,
        jobs: [],
        total: 0,
        page: 1,
        totalPages: 0,
        counts: { allAvailable: 0, new: 0, open: 0, assignedToMe: 0, cancelled: 0 },
        vendorCoverage: {
          city: vendorCity,
          localities: uniqueLocalities,
          hasCityWide,
          approvedCategoriesCount: approvedCategories.length,
          categories: approvedCategories
        },
        configurationStatus,
        vendorEligibility,
        message: configurationStatus === 'missing_categories'
          ? 'You have not configured any approved service categories yet. Please add your trade services in your profile.'
          : 'You have not configured your service area coverage yet. Please update your service localities in your profile.'
      });
    }

    // 7. Parse query params
    const tab = (req.query.tab || req.query.status || 'all').toLowerCase();
    const { category, locality, urgency, minBudget, maxBudget, search, sortBy } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    // 8. Build Base Query according to Tab
    let query = { isDeleted: { $ne: true } };

    // Standard city check: job must be in vendor's city
    if (vendorCity) {
      query['location.city'] = { $regex: new RegExp('^' + vendorCity + '$', 'i') };
    }

    // Non-city-wide locality filtering:
    if (!hasCityWide && uniqueLocalities.length > 0) {
      const locRegexes = uniqueLocalities.map(loc => new RegExp(loc, 'i'));
      query['location.locality'] = { $in: locRegexes };
    }

    // Category restriction: must be within vendor's approved categories!
    query.category = { $in: approvedCategoryIds };

    if (tab === 'assigned') {
      // Jobs assigned to this vendor
      query.selectedVendor = vendorUserId;
      query.status = { $in: ['assigned', 'in_progress', 'completion_pending', 'completed'] };
    } else if (tab === 'cancelled') {
      // Historical view of cancelled jobs matching vendor
      query.status = 'cancelled';
    } else {
      // Active opportunities ('all', 'new', 'open')
      query.status = { $in: ['open', 'dispatching'] };
      query.selectedVendor = null;
      query.declinedVendors = { $ne: vendorUserId };

      if (tab === 'new') {
        const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
        query.createdAt = { $gte: fortyEightHoursAgo };
      }
    }

    // 9. Apply User-Specified Filters
    // Category filter:
    if (category && category !== 'all') {
      let targetCatId = null;
      if (mongoose.Types.ObjectId.isValid(category)) {
        if (approvedCategoryMap.has(category.toString())) {
          targetCatId = new mongoose.Types.ObjectId(category);
        }
      } else {
        const found = approvedCategories.find(c => c.slug === category.toLowerCase() || c.name.toLowerCase() === category.toLowerCase());
        if (found) targetCatId = new mongoose.Types.ObjectId(found.id);
      }

      if (targetCatId) {
        query.category = targetCatId;
      } else {
        // Requested category not authorized for this vendor -> 0 results
        return res.status(200).json({
          success: true,
          jobs: [],
          total: 0,
          page,
          totalPages: 0,
          counts: await computeNearbyCounts(vendorUserId, approvedCategoryIds, vendorCity, hasCityWide, uniqueLocalities),
          vendorCoverage: {
            city: vendorCity,
            localities: uniqueLocalities,
            hasCityWide,
            approvedCategoriesCount: approvedCategories.length,
            categories: approvedCategories
          },
          configurationStatus,
          vendorEligibility
        });
      }
    }

    // Locality filter
    if (locality && locality.trim() !== '' && locality !== 'All Localities') {
      query['location.locality'] = { $regex: locality.trim(), $options: 'i' };
    }

    // Urgency filter
    if (urgency && urgency !== 'all') {
      query.urgency = urgency;
    }

    // Budget range filter
    if (minBudget || maxBudget) {
      query['budget.amount'] = {};
      if (minBudget) query['budget.amount'].$gte = Number(minBudget);
      if (maxBudget) query['budget.amount'].$lte = Number(maxBudget);
    }

    // Search query
    if (search && search.trim() !== '') {
      const s = search.trim();
      query.$or = [
        { title: { $regex: s, $options: 'i' } },
        { description: { $regex: s, $options: 'i' } },
        { 'location.locality': { $regex: s, $options: 'i' } }
      ];
    }

    // 10. Execute Query & Count
    const totalJobs = await Job.countDocuments(query);

    let sortObj = { createdAt: -1 };
    if (sortBy === 'oldest') sortObj = { createdAt: 1 };
    else if (sortBy === 'budget_high') sortObj = { 'budget.amount': -1 };
    else if (sortBy === 'budget_low') sortObj = { 'budget.amount': 1 };

    // Fetch jobs
    const jobs = await Job.find(query)
      .populate('category', 'name slug icon')
      .populate('customer', 'name email avatar phone')
      .populate('selectedVendor', 'name avatar')
      .sort(sortObj)
      .skip(sortBy === 'distance' ? 0 : skip)
      .limit(sortBy === 'distance' ? 100 : limit);

    // 11. Calculate Distance & Sanitize for Privacy
    let processedJobs = jobs.map(job => {
      const jobObj = job.toObject();
      const isAssignedToThisVendor = Boolean(
        job.selectedVendor && (job.selectedVendor._id || job.selectedVendor).toString() === vendorUserId.toString()
      );

      // Distance calculation: ONLY if coordinates exist on both sides
      let distanceKm = null;
      let distanceFormatted = null;

      const jobLat = jobObj.location?.coordinates?.lat;
      const jobLng = jobObj.location?.coordinates?.lng;
      const hasJobCoords = jobLat != null && jobLng != null && !isNaN(jobLat) && !isNaN(jobLng) && (jobLat !== 0 || jobLng !== 0);

      if (hasJobCoords && validAreaCoords.length > 0) {
        let minMeters = Infinity;
        for (const coord of validAreaCoords) {
          const meters = calculateDistanceMeters(coord.lat, coord.lng, jobLat, jobLng);
          if (meters < minMeters) minMeters = meters;
        }
        if (minMeters !== Infinity && minMeters < 200000) {
          distanceKm = Math.round((minMeters / 1000) * 10) / 10;
          distanceFormatted = `${distanceKm} km away`;
        }
      }

      jobObj.distanceKm = distanceKm;
      jobObj.distanceFormatted = distanceFormatted;

      // Privacy Masking:
      if (!isAssignedToThisVendor) {
        if (jobObj.location) {
          jobObj.location = {
            city: jobObj.location.city || vendorCity,
            locality: jobObj.location.locality || '',
            state: jobObj.location.state || '',
            address: `${jobObj.location.locality ? jobObj.location.locality + ', ' : ''}${jobObj.location.city || ''}`,
            houseNumber: '',
            street: '',
            coordinates: { lat: 0, lng: 0 },
            isMaskedForPrivacy: true
          };
        }
        jobObj.contactPhone = '';
        if (jobObj.customer) {
          jobObj.customer = {
            _id: jobObj.customer._id,
            name: jobObj.customer.name,
            avatar: jobObj.customer.avatar
          };
        }
      } else {
        if (jobObj.location) {
          jobObj.location.isMaskedForPrivacy = false;
        }
        jobObj.contactPhone = jobObj.contactPhone || jobObj.customer?.phone || '';
      }

      return jobObj;
    });

    // If sorting by distance:
    if (sortBy === 'distance') {
      processedJobs.sort((a, b) => {
        if (a.distanceKm == null && b.distanceKm == null) return 0;
        if (a.distanceKm == null) return 1;
        if (b.distanceKm == null) return -1;
        return a.distanceKm - b.distanceKm;
      });
      processedJobs = processedJobs.slice(skip, skip + limit);
    }

    // 12. Compute status tab counts for the vendor
    const counts = await computeNearbyCounts(vendorUserId, approvedCategoryIds, vendorCity, hasCityWide, uniqueLocalities);

    res.status(200).json({
      success: true,
      jobs: processedJobs,
      total: totalJobs,
      page,
      limit,
      totalPages: Math.ceil(totalJobs / limit) || 1,
      counts,
      vendorCoverage: {
        city: vendorCity,
        localities: uniqueLocalities,
        hasCityWide,
        approvedCategoriesCount: approvedCategories.length,
        categories: approvedCategories
      },
      configurationStatus,
      vendorEligibility
    });
  } catch (error) {
    next(error);
  }
};

export const getJobById = async (req, res, next) => {

  try {
    const job = await Job.findById(req.params.id)
      .populate('customer', 'name email avatar phone')
      .populate('category', 'name slug icon')
      .populate('selectedVendor', 'name email avatar');

    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    // Authorization check for precise service location:
    // Only job creator (customer), assigned vendor, or admin get exact coordinates & full house/street address.
    const currentUserId = req.user?._id?.toString() || req.user?.id?.toString();
    const isOwner = Boolean(
      currentUserId &&
      (job.customer?._id?.toString() === currentUserId || job.customer?.toString() === currentUserId)
    );
    const isAdmin = req.user?.role === 'admin';
    const isSelectedVendor = Boolean(
      currentUserId &&
      job.selectedVendor &&
      (job.selectedVendor?._id?.toString() === currentUserId || job.selectedVendor?.toString() === currentUserId)
    );

    const isAuthorizedForFullLocation = isOwner || isAdmin || isSelectedVendor;
    const jobObj = job.toObject();

    if (!isAuthorizedForFullLocation) {
      if (jobObj.location) {
        jobObj.location = {
          ...jobObj.location,
          houseNumber: '',
          street: '',
          landmark: '',
          address: `${jobObj.location.locality ? jobObj.location.locality + ', ' : ''}${jobObj.location.city || ''}`,
          coordinates: { lat: 0, lng: 0 },
          isMaskedForPrivacy: true
        };
      }
      if (jobObj.accessInstructions) {
        jobObj.accessInstructions = 'Detailed access directions provided upon assignment.';
      }
      if (jobObj.customer) {
        jobObj.customer = {
          _id: jobObj.customer._id,
          name: jobObj.customer.name,
          avatar: jobObj.customer.avatar,
          isVerified: Boolean(jobObj.customer.isVerified || true)
        };
      }
      jobObj.contactPhone = '';
    } else {
      if (jobObj.location) {
        jobObj.location.isMaskedForPrivacy = false;
      }
      jobObj.contactPhone = jobObj.contactPhone || jobObj.customer?.phone || '';
    }

    // Check if the current requesting vendor has an existing active quotation
    let existingProposal = null;
    if (currentUserId && (req.user?.role === 'vendor' || req.user?.role === 'admin')) {
      existingProposal = await Application.findOne({
        job: req.params.id,
        vendor: currentUserId,
        status: { $ne: 'withdrawn' }
      });
    }

    res.status(200).json({
      success: true,
      job: jobObj,
      isAuthorizedForFullLocation,
      existingProposal
    });
  } catch (error) {
    next(error);
  }
};

export const createJob = async (req, res, next) => {
  try {
    let categoryId = req.body.category;
    let foundCategory = null;

    if (mongoose.Types.ObjectId.isValid(categoryId)) {
      foundCategory = await ServiceCategory.findById(categoryId);
    } else if (typeof categoryId === 'string' && categoryId.trim()) {
      foundCategory = await ServiceCategory.findOne({
        $or: [
          { slug: categoryId.trim().toLowerCase() },
          { name: new RegExp('^' + categoryId.trim() + '$', 'i') }
        ]
      });
    }

    if (!foundCategory || foundCategory.isActive === false) {
      return res.status(400).json({
        success: false,
        message: 'The selected service category is invalid or currently inactive.'
      });
    }
    categoryId = foundCategory._id;

    const {
      title,
      description,
      subcategory,
      serviceRequirements,
      urgency,
      budget,
      location,
      scheduleType,
      preferredDate,
      preferredTime,
      preferredTimeSlot,
      alternateDate,
      images,
      contactPhone,
      phone,
      accessInstructions,
      additionalInstructions,
      saveAddressToProfile
    } = req.body;

    // Validate preferred date against today in Asia/Kolkata
    if (preferredDate) {
      const todayIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
      const selectedDate = String(preferredDate).slice(0, 10);
      if (selectedDate < todayIST) {
        return res.status(400).json({
          success: false,
          message: 'Preferred service date cannot be in the past.'
        });
      }
    }

    // Validate budget range
    const safeBudgetType = ['fixed', 'hourly', 'quote', 'range'].includes(budget?.type) ? budget.type : 'fixed';
    const minVal = Number(budget?.minAmount ?? budget?.min ?? 0);
    const maxVal = Number(budget?.maxAmount ?? budget?.max ?? 0);
    const amtVal = Number(budget?.amount ?? (safeBudgetType === 'range' ? maxVal : 0));

    if (safeBudgetType === 'range' && minVal > maxVal && maxVal > 0) {
      return res.status(400).json({
        success: false,
        message: 'Minimum budget cannot exceed maximum budget.'
      });
    }

    // Duplicate submission protection (within 30 seconds)
    const duplicateThreshold = new Date(Date.now() - 30 * 1000);
    const existingRecentJob = await Job.findOne({
      customer: req.user.id,
      title: title.trim(),
      category: categoryId,
      createdAt: { $gte: duplicateThreshold }
    });
    if (existingRecentJob) {
      return res.status(200).json({
        success: true,
        job: existingRecentJob,
        message: 'Job request already submitted.'
      });
    }

    // Validate coordinates if provided
    let safeLat = 0;
    let safeLng = 0;
    if (location?.coordinates?.lat != null && location?.coordinates?.lng != null) {
      const parsedLat = Number(location.coordinates.lat);
      const parsedLng = Number(location.coordinates.lng);
      if (!isNaN(parsedLat) && parsedLat >= -90 && parsedLat <= 90 &&
          !isNaN(parsedLng) && parsedLng >= -180 && parsedLng <= 180) {
        safeLat = parsedLat;
        safeLng = parsedLng;
      }
    }

    const validSources = ['gps', 'saved_address', 'manual'];
    const safeSource = validSources.includes(location?.locationSource) ? location.locationSource : 'manual';

    const safeContactPhone = (contactPhone || phone || '').trim();
    const safePreferredTime = preferredTime || preferredTimeSlot || 'Flexible';
    const safeInstructions = (additionalInstructions || accessInstructions || location?.instructions || '').trim();

    const jobData = {
      title: title.trim(),
      description: description.trim(),
      category: categoryId,
      subcategory: subcategory || '',
      serviceRequirements: serviceRequirements || {},
      urgency: urgency || 'medium',
      contactPhone: safeContactPhone,
      budget: {
        type: safeBudgetType,
        amount: amtVal >= 0 ? amtVal : 0,
        minAmount: minVal >= 0 ? minVal : 0,
        maxAmount: maxVal >= 0 ? maxVal : 0,
        currency: budget?.currency || 'INR'
      },
      location: {
        addressLabel: location?.addressLabel || 'Home',
        houseNumber: location?.houseNumber || '',
        street: location?.street || '',
        locality: location?.locality || '',
        landmark: location?.landmark || '',
        address: location?.address || `${location?.houseNumber ? location.houseNumber + ', ' : ''}${location?.street || ''}${location?.locality ? ', ' + location.locality : ''}`,
        city: location?.city || '',
        state: location?.state || 'Uttar Pradesh',
        zipCode: location?.zipCode || location?.pinCode || '',
        country: location?.country || 'India',
        locationSource: safeSource,
        locationAccuracyMeters: location?.locationAccuracyMeters != null ? Number(location.locationAccuracyMeters) : null,
        confirmedAt: location?.confirmedAt ? new Date(location.confirmedAt) : new Date(),
        coordinates: {
          lat: safeLat,
          lng: safeLng
        }
      },
      scheduleType: scheduleType || (preferredDate ? 'specific' : 'flexible'),
      preferredDate: preferredDate || '',
      preferredTime: safePreferredTime,
      preferredTimeSlot: safePreferredTime,
      alternateDate: alternateDate || '',
      accessInstructions: safeInstructions,
      additionalInstructions: safeInstructions,
      images: Array.isArray(images) ? images.slice(0, 5) : [],
      customer: req.user.id,
      status: urgency === 'emergency' ? 'dispatching' : 'open',
      dispatchExpiredAt: urgency === 'emergency' ? new Date(Date.now() + 180 * 1000) : null,
      eventHistory: [
        {
          event: urgency === 'emergency' ? 'emergency_dispatched' : 'job_created',
          note: urgency === 'emergency' ? 'Emergency request dispatched to nearby professionals' : 'Job created by customer',
          actor: req.user.id
        }
      ]
    };

    const newJob = await Job.create(jobData);
    if (safeContactPhone) {
      await User.findByIdAndUpdate(req.user.id, { phone: safeContactPhone }).catch(() => {});
    }
    const job = await Job.findById(newJob._id)
      .populate('customer', 'name email avatar phone')
      .populate('category', 'name slug icon');

    // Update customer stats and optional address save
    const profileUpdate = { $inc: { totalJobsPosted: 1 } };
    if (saveAddressToProfile && location?.street && location?.city) {
      profileUpdate.$push = {
        addresses: {
          label: location.addressLabel || 'Home',
          street: `${location.houseNumber ? location.houseNumber + ', ' : ''}${location.street}${location.locality ? ', ' + location.locality : ''}`,
          city: location.city,
          state: location.state || '',
          zipCode: location.zipCode || '',
          coordinates: { lat: safeLat, lng: safeLng },
          isDefault: false
        }
      };
    }

    await CustomerProfile.findOneAndUpdate(
      { user: req.user.id },
      profileUpdate,
      { upsert: true }
    );

    // Create an in-app notification for the customer confirming publication
    try {
      await Notification.create({
        recipient: req.user.id,
        title: 'Job Posted Successfully',
        message: `Your job "${job.title}" has been published and dispatched to eligible verified service professionals. First contractor to accept wins!`,
        type: 'job_alert',
        link: `/customer/bookings`
      });
    } catch (notifErr) {
      console.warn('Non-fatal: Failed to save post-job notification:', notifErr.message);
    }

    // Trigger vendor matching and dispatch persistent notifications to eligible contractors
    let eligibleVendors = [];
    const io = getIO();
    try {
      eligibleVendors = await matchEligibleVendors(job);

      if (eligibleVendors.length > 0) {
        await Job.findByIdAndUpdate(job._id, {
          notifiedVendors: eligibleVendors.map(v => v.userId)
        });
      }

      const isEmergency = job.urgency === 'emergency';
      for (const vendor of eligibleVendors) {
        try {
          await Notification.create({
            recipient: vendor.userId,
            sender: req.user.id,
            title: isEmergency
              ? `🚨 Emergency Job Available: ${job.title}`
              : `⚡ Instant Job Available: ${job.title}`,
            message: isEmergency
              ? `Emergency request in ${job.location?.locality || job.location?.city}. First contractor to accept wins!`
              : `New ${job.urgency} urgency request in ${job.location?.locality || job.location?.city}. First contractor to confirm price wins!`,
            type: 'job_alert',
            link: `/vendor/jobs/${job._id}`
          });

          if (io) {
            const leadPayload = {
              jobId: job._id,
              title: job.title,
              description: job.description,
              category: job.category?.name,
              categoryId: job.category?._id,
              urgency: job.urgency,
              location: {
                city: job.location?.city,
                locality: job.location?.locality,
                addressLabel: job.location?.addressLabel || 'Service Area',
                isMaskedForPrivacy: true
              },
              budget: job.budget,
              schedule: job.preferredDate || (isEmergency ? 'Immediate / Within 1 Hour' : 'Earliest available'),
              createdAt: job.createdAt,
              expiresInSeconds: 90
            };

            io.to('user_' + vendor.userId.toString()).emit('new_instant_job_lead', leadPayload);
            if (isEmergency) {
              io.to('user_' + vendor.userId.toString()).emit('emergency_job_lead', leadPayload);
            }
          }
        } catch (vErr) {
          console.warn('Non-fatal error notifying vendor:', vErr.message);
        }
      }
    } catch (matchErr) {
      console.warn('Vendor matching warning:', matchErr.message);
    }

    // Notify general socket streams with privacy-protected location
    if (io) {
      const publicJobPayload = {
        ...job.toObject(),
        location: {
          city: job.location?.city,
          state: job.location?.state,
          locality: job.location?.locality,
          addressLabel: job.location?.addressLabel,
          isMaskedForPrivacy: true
        }
      };
      io.emit('job_created', publicJobPayload);
      io.emit('new_lead_alert', {
        id: job._id,
        title: job.title,
        category: job.category,
        subcategory: job.subcategory,
        budget: job.budget,
        urgency: job.urgency,
        location: {
          city: job.location?.city,
          state: job.location?.state,
          locality: job.location?.locality
        },
        createdAt: job.createdAt
      });
    }

    res.status(201).json({
      success: true,
      job,
      eligibleVendorsCount: eligibleVendors.length,
      dispatchStatus: eligibleVendors.length > 0 ? 'dispatched' : 'awaiting_contractors'
    });
  } catch (error) {
    next(error);
  }
};

export const uploadJobImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please select an image to upload' });
    }

    const result = await uploadToCloudinary(req.file.buffer, 'worklogy/jobs');
    res.status(200).json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id
    });
  } catch (error) {
    next(error);
  }
};

export const updateJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const currentUserId = req.user._id ? req.user._id.toString() : req.user.id.toString();
    const isOwner = job.customer?.toString() === currentUserId;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this job' });
    }

    // 1. Status lifecycle checks
    if (['completed', 'cancelled', 'expired'].includes(job.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot edit a job that is already ${job.status}.`
      });
    }

    // If job is in active execution with an assigned contractor
    const isAssignedOrActive = ['assigned', 'in_progress', 'completion_pending'].includes(job.status);

    const {
      title,
      description,
      category,
      subcategory,
      serviceType,
      urgency,
      budget,
      location,
      scheduleType,
      preferredDate,
      preferredTime,
      alternateDate,
      additionalInstructions,
      accessInstructions,
      contactPhone
    } = req.body;

    // Disallow altering core category or pricing if assigned/active
    if (isAssignedOrActive) {
      if (category && category.toString() !== job.category?.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Cannot change service category while a contractor is already assigned to this job.'
        });
      }
      if (budget?.amount && Number(budget.amount) !== job.budget?.amount) {
        return res.status(400).json({
          success: false,
          message: 'Cannot modify agreed pricing while a contractor is actively assigned.'
        });
      }
    }

    // 2. Validate and apply editable fields
    if (title !== undefined) {
      if (!title || title.trim().length < 3) {
        return res.status(400).json({ success: false, message: 'Job title must be at least 3 characters long.' });
      }
      job.title = title.trim();
    }

    if (description !== undefined) {
      if (!description || description.trim().length < 10) {
        return res.status(400).json({ success: false, message: 'Job description must be at least 10 characters long.' });
      }
      job.description = description.trim();
    }

    if (!isAssignedOrActive && category) {
      let categoryId = category;
      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        const foundCategory = await ServiceCategory.findOne({
          $or: [
            { slug: String(category).toLowerCase() },
            { name: new RegExp('^' + category + '$', 'i') }
          ]
        });
        if (foundCategory) {
          categoryId = foundCategory._id;
        }
      }
      if (mongoose.Types.ObjectId.isValid(categoryId)) {
        job.category = categoryId;
      }
    }

    if (subcategory !== undefined) job.subcategory = subcategory;
    if (serviceType !== undefined) job.serviceType = serviceType;
    if (urgency !== undefined && ['low', 'medium', 'high', 'emergency'].includes(urgency)) {
      job.urgency = urgency;
    }

    if (!isAssignedOrActive && budget) {
      const bType = ['fixed', 'hourly', 'quote', 'range'].includes(budget.type) ? budget.type : job.budget?.type || 'fixed';
      const bAmount = budget.amount !== undefined ? Math.max(0, Number(budget.amount) || 0) : job.budget?.amount || 0;
      job.budget = {
        type: bType,
        amount: bAmount,
        minAmount: budget.minAmount ? Math.max(0, Number(budget.minAmount)) : 0,
        maxAmount: budget.maxAmount ? Math.max(0, Number(budget.maxAmount)) : 0
      };
    }

    if (location) {
      if (location.city && !location.city.trim()) {
        return res.status(400).json({ success: false, message: 'Service city is required.' });
      }
      job.location = {
        ...job.location?.toObject?.() || job.location,
        addressLabel: location.addressLabel || job.location?.addressLabel || 'Home',
        houseNumber: location.houseNumber !== undefined ? location.houseNumber : job.location?.houseNumber,
        street: location.street !== undefined ? location.street : job.location?.street,
        locality: location.locality !== undefined ? location.locality : job.location?.locality,
        landmark: location.landmark !== undefined ? location.landmark : job.location?.landmark,
        address: location.address !== undefined ? location.address : job.location?.address,
        city: location.city ? location.city.trim() : job.location?.city,
        state: location.state || job.location?.state || 'Uttar Pradesh',
        zipCode: location.zipCode !== undefined ? location.zipCode : job.location?.zipCode
      };
    }

    if (scheduleType !== undefined) job.scheduleType = scheduleType;
    if (preferredDate !== undefined) job.preferredDate = preferredDate;
    if (preferredTime !== undefined) job.preferredTime = preferredTime;
    if (alternateDate !== undefined) job.alternateDate = alternateDate;
    if (additionalInstructions !== undefined) job.additionalInstructions = additionalInstructions;
    if (accessInstructions !== undefined) job.accessInstructions = accessInstructions;
    if (contactPhone !== undefined) job.contactPhone = contactPhone.trim();

    job.eventHistory.push({
      event: 'job_edited',
      note: 'Job details updated by customer',
      actor: currentUserId,
      timestamp: new Date()
    });

    await job.save();

    const populatedJob = await Job.findById(job._id)
      .populate('category', 'name slug icon')
      .populate('selectedVendor', 'name avatar email phone')
      .populate('booking');

    // Real-time synchronization
    const io = getIO();
    if (io) {
      io.emit('job_updated', {
        jobId: job._id,
        title: job.title,
        category: populatedJob.category,
        budget: job.budget,
        urgency: job.urgency
      });
      io.to('user_' + job.customer.toString()).emit('job_updated', { jobId: job._id });
      if (job.selectedVendor) {
        io.to('user_' + (job.selectedVendor?._id || job.selectedVendor).toString()).emit('job_updated', { jobId: job._id });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Job details updated successfully',
      job: populatedJob
    });
  } catch (error) {
    next(error);
  }
};

export const deleteJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const currentUserId = req.user._id ? req.user._id.toString() : req.user.id.toString();
    const isOwner = job.customer?.toString() === currentUserId;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this job' });
    }

    // Status constraints
    if (['in_progress', 'completion_pending'].includes(job.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete a job with active work in progress. Please resolve or cancel with the assigned professional first.'
      });
    }

    if (job.status === 'assigned') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete a job with an assigned professional. Please cancel the job first.'
      });
    }

    // Soft delete / archive to preserve history, ratings, or audit records
    job.isDeleted = true;
    job.deletedAt = new Date();
    job.eventHistory.push({
      event: 'job_deleted',
      note: 'Job deleted by customer',
      actor: currentUserId,
      timestamp: new Date()
    });
    await job.save();

    // If there were any pending applications, reject them
    await Application.updateMany(
      { job: job._id, status: { $in: ['pending', 'shortlisted'] } },
      { status: 'rejected' }
    );

    const io = getIO();
    if (io) {
      io.to('user_' + job.customer.toString()).emit('job_deleted', { jobId: job._id });
      io.emit('job_taken', { jobId: job._id, title: job.title });
      io.emit('job_deleted', { jobId: job._id });
    }

    res.status(200).json({ success: true, message: 'Job removed successfully' });
  } catch (error) {
    next(error);
  }
};

export const getMyCustomerJobs = async (req, res, next) => {
  try {
    const jobs = await Job.find({ customer: req.user.id, isDeleted: { $ne: true } })
      .populate('category', 'name slug icon')
      .populate('selectedVendor', 'name avatar email phone')
      .populate('booking')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, jobs });
  } catch (error) {
    next(error);
  }
};

export const updateJobStatus = async (req, res, next) => {
  try {
    const { status, selectedVendor } = req.body;
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    job.status = status || job.status;
    if (selectedVendor) job.selectedVendor = selectedVendor;
    await job.save();

    const io = getIO();
    if (io) {
      io.to('job_' + job._id).emit('job_status_updated', {
        jobId: job._id,
        status: job.status,
        updatedBy: req.user.id
      });
    }

    res.status(200).json({ success: true, job });
  } catch (error) {
    next(error);
  }
};

/**
 * Atomic First-Accepted Job Claim
 * Concurrency-safe: Exactly one vendor wins the instant assignment.
 */
export const claimJobInstant = async (req, res, next) => {
  try {
    const {
      finalPrice,
      pricingType,
      hourlyRate,
      estimatedDuration,
      includedServices,
      materialCharges,
      scheduledDate,
      timeSlot
    } = req.body;

    const job = await Job.findById(req.params.id)
      .populate('category')
      .populate('customer', 'name email phone avatar');

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    // Idempotent: If already accepted by this exact vendor, return success
    const currentVendorId = (job.selectedVendor?._id || job.selectedVendor)?.toString();
    if (job.status === 'assigned' && currentVendorId === req.user.id.toString()) {
      const existingBooking = await Booking.findOne({ job: job._id, vendor: req.user.id });
      return res.status(200).json({
        success: true,
        message: 'Job accepted successfully',
        job,
        booking: existingBooking
      });
    }

    if (job.status === 'cancelled' || job.isDeleted) {
      return res.status(409).json({
        success: false,
        message: 'This request has already been cancelled or is no longer available.'
      });
    }

    if (!['open', 'dispatching'].includes(job.status) || job.selectedVendor) {
      return res.status(409).json({
        success: false,
        message: 'This job has already been accepted by another professional.'
      });
    }

    let priceNum = Number(finalPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      if (job.budget?.amount > 0) {
        priceNum = Number(job.budget.amount);
      } else {
        priceNum = 499; // Standard emergency call-out & diagnostics fee fallback
      }
    }

    // Server-side vendor eligibility verification
    const eligibility = await isVendorEligible(req.user.id, job);
    if (!eligibility.eligible) {
      return res.status(403).json({
        success: false,
        message: eligibility.reason || 'You are not eligible to claim this service assignment.'
      });
    }

    // Concurrency-Safe First-Accepted Allocation
    const claimedJob = await Job.findOneAndUpdate(
      {
        _id: req.params.id,
        status: { $in: ['open', 'dispatching'] },
        selectedVendor: null,
        isDeleted: { $ne: true }
      },
      {
        $set: {
          status: 'assigned',
          selectedVendor: req.user.id,
          assignedAt: new Date(),
          finalPrice: {
            amount: priceNum,
            pricingType: pricingType || 'fixed',
            hourlyRate: Number(hourlyRate) || 0,
            estimatedDuration: estimatedDuration || (job.urgency === 'emergency' ? 'Immediate / Within 1 Hour' : '1-2 hours'),
            includedServices: includedServices || 'Diagnostic inspection, certified labor, standard testing, and post-service cleanup',
            materialCharges: Number(materialCharges) || 0
          }
        },
        $push: {
          assignmentHistory: {
            vendor: req.user.id,
            assignedAt: new Date(),
            finalPrice: priceNum,
            status: 'assigned'
          },
          eventHistory: {
            event: 'assigned',
            note: `Emergency job assigned to contractor ${req.user.name || 'Pro'} for agreed fee ₹${priceNum}`,
            actor: req.user.id,
            timestamp: new Date()
          }
        }
      },
      { new: true }
    ).populate('category customer notifiedVendors');

    if (!claimedJob) {
      // Concurrency race check: Did customer cancel or another vendor claim?
      const latestJob = await Job.findById(req.params.id);
      if (!latestJob || latestJob.status === 'cancelled' || latestJob.isDeleted) {
        return res.status(409).json({
          success: false,
          message: 'This request has already been cancelled or is no longer available.'
        });
      }
      return res.status(409).json({
        success: false,
        message: 'This job has already been accepted by another professional.'
      });
    }

    // Generate cryptographically secure 6-digit OTP (stored hashed & encrypted)
    const { otp, codeHash, customerEncryptedOtp } = generateSecureOtp();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours validity

    const platformFee = Math.round(priceNum * 0.05);
    const vendorNet = priceNum - platformFee;

    const bookingRef = `BK-${Date.now().toString().slice(-4)}${Math.floor(1000 + Math.random() * 9000)}`;
    let scheduledDateTime = new Date(Date.now() + 86400000);
    if (scheduledDate && !isNaN(new Date(scheduledDate).getTime())) {
      scheduledDateTime = new Date(scheduledDate);
    } else if (claimedJob.preferredDate && !isNaN(new Date(claimedJob.preferredDate).getTime())) {
      scheduledDateTime = new Date(claimedJob.preferredDate);
    }

    const booking = await Booking.create({
      bookingReference: bookingRef,
      customer: claimedJob.customer._id || claimedJob.customer,
      vendor: req.user.id,
      job: claimedJob._id,
      serviceTitle: claimedJob.title,
      category: claimedJob.category?.name || 'Local Service',
      scheduledDate: scheduledDateTime,
      timeSlot: timeSlot || claimedJob.preferredTime || '10:00 AM - 01:00 PM',
      address: claimedJob.location,
      contactPhone: claimedJob.contactPhone || claimedJob.customer?.phone || '',
      urgency: claimedJob.urgency || 'emergency',
      pricing: {
        amount: priceNum,
        platformFee,
        vendorNet,
        isPaid: true,
        paymentMethod: 'escrow',
        paymentStatus: 'escrow_locked'
      },
      status: 'confirmed',
      startOtp: {
        otp,
        codeHash,
        customerEncryptedOtp,
        expiresAt,
        attempts: 0,
        maxAttempts: 5,
        isConsumed: false
      },
      statusHistory: [
        {
          status: 'confirmed',
          updatedBy: req.user.id,
          timestamp: new Date(),
          note: `Instant assignment won by contractor. Agreed price: ₹${priceNum}. Service-Start OTP generated.`
        }
      ]
    });

    // Link booking to job
    await Job.findByIdAndUpdate(claimedJob._id, { booking: booking._id });

    // Send persistent in-app & email notification to customer and vendor
    try {
      await notifyBookingConfirmed({
        customerId: claimedJob.customer._id || claimedJob.customer,
        vendorId: req.user.id,
        booking,
        jobTitle: claimedJob.title
      });
    } catch (notifErr) {
      console.warn('Booking confirmation notification error:', notifErr.message);
    }


    // Send in-app notification to other candidate vendors
    if (claimedJob.notifiedVendors && claimedJob.notifiedVendors.length > 0) {
      const otherVendors = claimedJob.notifiedVendors.filter(
        v => (v?._id || v).toString() !== req.user.id.toString()
      );
      for (const other of otherVendors) {
        try {
          const otherId = other?._id || other;
          await Notification.create({
            recipient: otherId,
            sender: req.user.id,
            type: 'job_alert',
            title: 'Job Already Assigned',
            message: `The ${claimedJob.urgency === 'emergency' ? 'emergency ' : ''}service request "${claimedJob.title}" has been accepted by another verified professional.`,
            link: '/vendor/browse-jobs'
          });
        } catch (e) {
          // non-fatal
        }
      }
    }

    // Broadcast real-time Socket events
    const io = getIO();
    if (io) {
      // 1. Notify the customer in real-time
      io.to('user_' + (claimedJob.customer._id || claimedJob.customer).toString()).emit('job_assigned', {
        jobId: claimedJob._id,
        bookingId: booking._id,
        bookingReference: booking.bookingReference,
        vendorName: req.user.name,
        vendorPhone: req.user.phone || '',
        vendorAvatar: req.user.avatar || '',
        finalPrice: priceNum,
        otp: booking.startOtp?.otp || ''
      });

      // 2. Broadcast to all vendors that the job has been taken
      io.emit('job_taken', {
        jobId: claimedJob._id,
        title: claimedJob.title,
        claimedBy: req.user.name
      });
    }

    res.status(200).json({
      success: true,
      message: 'Job accepted successfully',
      job: claimedJob,
      booking
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get active emergency leads for authenticated vendor
 */
export const getEmergencyLeads = async (req, res, next) => {
  try {
    const vendorProfile = await VendorProfile.findOne({ user: req.user.id });
    if (!vendorProfile || vendorProfile.approvalStatus !== 'approved' || !vendorProfile.emergencyAvailability?.isAvailable) {
      return res.status(200).json({ success: true, leads: [] });
    }

    const leads = await Job.find({
      urgency: 'emergency',
      status: { $in: ['open', 'dispatching'] },
      selectedVendor: null,
      declinedVendors: { $ne: req.user.id },
      isDeleted: { $ne: true }
    })
      .populate('category', 'name slug icon')
      .sort({ createdAt: -1 })
      .limit(20);

    const sanitizedLeads = leads.map(job => {
      const obj = job.toObject();
      if (obj.location) {
        obj.location = {
          city: obj.location.city,
          locality: obj.location.locality,
          state: obj.location.state,
          addressLabel: obj.location.addressLabel || 'Service Area',
          isMaskedForPrivacy: true
        };
      }
      obj.contactPhone = '';
      return obj;
    });

    res.status(200).json({ success: true, leads: sanitizedLeads });
  } catch (error) {
    next(error);
  }
};

/**
 * Vendor declines an incoming emergency request
 */
export const declineJob = async (req, res, next) => {
  try {
    const job = await Job.findByIdAndUpdate(
      req.params.id,
      { 
        $addToSet: { declinedVendors: req.user.id },
        $push: {
          eventHistory: {
            event: 'declined_by_vendor',
            note: `Declined by vendor ${req.user.name || 'Pro'}`,
            actor: req.user.id,
            timestamp: new Date()
          }
        }
      },
      { new: true }
    );
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }
    res.status(200).json({ success: true, message: 'Emergency request declined' });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel emergency or regular job tender (by customer or admin)
 * Concurrency-Safe Atomic Global Cancellation
 */
export const cancelJob = async (req, res, next) => {
  try {
    const currentUserId = req.user._id ? req.user._id.toString() : req.user.id.toString();
    const isAdmin = req.user.role === 'admin';

    const cancelReason = req.body.reason || 'Cancelled by customer';
    const comments = req.body.comments ? ` - ${req.body.comments}` : '';
    const fullReason = `${cancelReason}${comments}`;

    // Atomic conditional transition: only cancel if current status permits and user is authorized
    const updateQuery = {
      _id: req.params.id,
      status: { $nin: ['completed', 'cancelled'] },
      isDeleted: { $ne: true }
    };
    if (!isAdmin) {
      updateQuery.customer = currentUserId;
    }

    const updatedJob = await Job.findOneAndUpdate(
      updateQuery,
      {
        $set: {
          status: 'cancelled',
          cancellationReason: fullReason,
          dispatchExpiredAt: new Date()
        },
        $push: {
          eventHistory: {
            event: 'cancelled',
            note: fullReason,
            actor: currentUserId,
            timestamp: new Date()
          }
        }
      },
      { new: true }
    );

    if (!updatedJob) {
      const existingJob = await Job.findById(req.params.id);
      if (!existingJob) {
        return res.status(404).json({ success: false, message: 'Job not found' });
      }
      if (existingJob.customer?.toString() !== currentUserId && !isAdmin) {
        return res.status(403).json({ success: false, message: 'Not authorized to cancel this request' });
      }
      return res.status(400).json({
        success: false,
        message: `Cannot cancel request. It is already ${existingJob.status}.`
      });
    }

    // Invalidate associated Booking if present
    if (updatedJob.booking) {
      await Booking.findByIdAndUpdate(updatedJob.booking, {
        status: 'cancelled',
        declineReason: fullReason
      });
    }

    // Invalidate and reject all pending vendor applications/proposals
    await Application.updateMany(
      { job: updatedJob._id, status: { $in: ['pending', 'submitted', 'shortlisted'] } },
      { status: 'rejected' }
    );

    const populatedJob = await Job.findById(updatedJob._id)
      .populate('category', 'name slug icon')
      .populate('selectedVendor', 'name avatar email phone')
      .populate('booking');

    // Scoped Real-Time Socket.IO Synchronization Across All WorkLogy Surfaces
    const io = getIO();
    if (io) {
      const cancelPayload = {
        jobId: updatedJob._id.toString(),
        title: updatedJob.title,
        status: 'cancelled',
        reason: fullReason,
        cancelledAt: new Date().toISOString()
      };

      // 1. Broadcast global real-time removal events to all active browsing queues & modal popups
      io.emit('job_cancelled', cancelPayload);
      io.emit('job_taken', { jobId: updatedJob._id.toString(), title: updatedJob.title, reason: 'cancelled' });
      io.emit('job_status_updated', { jobId: updatedJob._id.toString(), status: 'cancelled' });

      // 2. Specific room emissions
      io.to('job_' + updatedJob._id.toString()).emit('job_cancelled', cancelPayload);
      io.to('job_' + updatedJob._id.toString()).emit('job_status_updated', { jobId: updatedJob._id.toString(), status: 'cancelled' });
      io.to('user_' + updatedJob.customer.toString()).emit('job_cancelled', cancelPayload);

      if (updatedJob.selectedVendor) {
        io.to('user_' + (updatedJob.selectedVendor?._id || updatedJob.selectedVendor).toString()).emit('job_cancelled', cancelPayload);
      }

      // Notify candidate contractors who received the lead alert
      if (Array.isArray(updatedJob.notifiedVendors)) {
        updatedJob.notifiedVendors.forEach(v => {
          const vId = (v?._id || v)?.toString();
          if (vId) {
            io.to('user_' + vId).emit('job_cancelled', cancelPayload);
            io.to('user_' + vId).emit('job_taken', { jobId: updatedJob._id.toString(), title: updatedJob.title });
          }
        });
      }
    }

    // Persistent In-App & Email notification to customer and assigned contractor
    try {
      await notifyCancellation({
        customerId: updatedJob.customer,
        vendorId: updatedJob.selectedVendor,
        cancelledByUserId: currentUserId,
        jobTitle: updatedJob.title,
        resourceId: updatedJob._id,
        resourceType: 'job',
        reason: fullReason
      });
    } catch (notifErr) {
      console.warn('Cancellation notification error:', notifErr.message);
    }


    res.status(200).json({ success: true, message: 'Request cancelled successfully', job: populatedJob });
  } catch (error) {
    next(error);
  }
};

/**
 * Retry emergency dispatch (customer or admin)
 */
export const retryJobDispatch = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('category customer');

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    if (['cancelled', 'completed', 'expired'].includes(job.status) || job.isDeleted) {
      return res.status(400).json({
        success: false,
        message: `Cannot dispatch a request that is ${job.status}.`
      });
    }

    const currentUserId = req.user._id ? req.user._id.toString() : req.user.id.toString();
    const isOwner = (job.customer?._id || job.customer)?.toString() === currentUserId;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to retry dispatch' });
    }

    if (job.selectedVendor) {
      return res.status(400).json({ success: false, message: 'Job is already assigned to a professional' });
    }

    const eligibleVendors = await matchEligibleVendors(job);
    job.status = 'dispatching';
    job.declinedVendors = [];
    job.notifiedVendors = eligibleVendors.map(v => v.userId);
    job.dispatchExpiredAt = new Date(Date.now() + 180 * 1000);
    job.eventHistory.push({
      event: 'dispatch_retried',
      note: `Emergency dispatch retried to ${eligibleVendors.length} professionals`,
      actor: currentUserId,
      timestamp: new Date()
    });
    await job.save();

    const io = getIO();
    if (io) {
      const leadPayload = {
        jobId: job._id,
        title: job.title,
        description: job.description,
        category: job.category?.name,
        categoryId: job.category?._id,
        urgency: job.urgency,
        location: {
          city: job.location?.city,
          locality: job.location?.locality,
          addressLabel: job.location?.addressLabel || 'Service Area',
          isMaskedForPrivacy: true
        },
        budget: job.budget,
        schedule: 'Immediate / Within 1 Hour',
        createdAt: new Date(),
        expiresInSeconds: 90
      };

      for (const v of eligibleVendors) {
        io.to('user_' + v.userId.toString()).emit('emergency_job_lead', leadPayload);
        io.to('user_' + v.userId.toString()).emit('new_instant_job_lead', leadPayload);
      }
    }

    res.status(200).json({
      success: true,
      message: `Emergency request redispatched to ${eligibleVendors.length} verified professionals.`,
      eligibleCount: eligibleVendors.length,
      job
    });
  } catch (error) {
    next(error);
  }
};


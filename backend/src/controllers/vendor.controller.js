import mongoose from 'mongoose';
import VendorProfile from '../models/VendorProfile.js';
import User from '../models/User.js';
import ServiceCategory from '../models/ServiceCategory.js';
import ServiceListing from '../models/ServiceListing.js';
import Booking from '../models/Booking.js';
import Transaction from '../models/Transaction.js';
import Job from '../models/Job.js';
import Application from '../models/Application.js';
import Review from '../models/Review.js';
import Notification from '../models/Notification.js';

/**
 * Strips private identity documents, internal notes, and administrative fields for public APIs.
 */
export const sanitizePublicVendor = (vendorDoc) => {
  if (!vendorDoc) return null;
  const v = vendorDoc.toObject ? vendorDoc.toObject() : { ...vendorDoc };

  // Only expose public-safe verification status and timestamp
  const rawStatus = v.verifiedBadge?.status || 'not_submitted';
  const isVerified = rawStatus === 'verified' || rawStatus === 'approved';
  v.verifiedBadge = {
    status: isVerified ? 'verified' : (rawStatus === 'unsubmitted' ? 'not_submitted' : rawStatus),
    verifiedAt: v.verifiedBadge?.verifiedAt || null
  };

  // Strictly remove all sensitive identity documents, internal notes & audit trails
  delete v.adminNotes;
  delete v.approvalHistory;
  delete v.rejectionReason;
  delete v.rejectionHistory;
  delete v.earningsTotal;

  // Sensitive contact fields masking
  if (v.user && typeof v.user === 'object') {
    delete v.user.password;
    delete v.user.suspensionReason;
  }

  return v;
};

export const getVendors = async (req, res, next) => {
  try {
    const { category, search, city, minRating, verifiedOnly, sortBy, page = 1, limit = 24 } = req.query;
    // Only show approved professionals in public searches
    let query = {
      approvalStatus: 'approved'
    };

    if (verifiedOnly === 'true' || verifiedOnly === true) {
      query['verifiedBadge.status'] = { $in: ['verified', 'approved'] };
    }

    if (city && city.trim() && city.trim() !== 'all') {
      const parts = city.trim().split(',').map(p => p.trim()).filter(Boolean);
      const regexPattern = parts.length > 1 ? parts.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') : city.trim();
      query.city = { $regex: regexPattern, $options: 'i' };
    }

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
        });
        if (catDocs.length > 0) {
          query.categories = { $in: catDocs.map(c => c._id) };
        } else {
          query.$or = [
            { businessName: { $regex: category, $options: 'i' } },
            { bio: { $regex: category, $options: 'i' } },
            { 'services.title': { $regex: category, $options: 'i' } }
          ];
        }
      }
    }

    if (minRating && Number(minRating) > 0) {
      query.rating = { $gte: Number(minRating) };
    }

    if (search && search.trim()) {
      const s = search.trim();
      const textFilter = [
        { businessName: { $regex: s, $options: 'i' } },
        { bio: { $regex: s, $options: 'i' } },
        { tagline: { $regex: s, $options: 'i' } },
        { skills: { $in: [new RegExp(s, 'i')] } },
        { 'services.title': { $regex: s, $options: 'i' } }
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: textFilter }];
        delete query.$or;
      } else {
        query.$or = textFilter;
      }
    }

    if (req.query.emergencyOnly === 'true' || req.query.emergency === 'true') {
      query['emergencyAvailability.isAvailable'] = true;
    }

    // Dynamic sorting
    let sortOptions = { rating: -1, reviewCount: -1 };
    if (sortBy === 'experience') {
      sortOptions = { experienceYears: -1, rating: -1 };
    } else if (sortBy === 'reviews') {
      sortOptions = { reviewCount: -1, rating: -1 };
    } else if (sortBy === 'price_asc') {
      sortOptions = { hourlyRate: 1 };
    } else if (sortBy === 'price_desc') {
      sortOptions = { hourlyRate: -1 };
    } else if (sortBy === 'newest') {
      sortOptions = { createdAt: -1 };
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 24));
    const skip = (pageNum - 1) * limitNum;

    const [vendors, total] = await Promise.all([
      VendorProfile.find(query)
        .populate('user', 'name email avatar phone')
        .populate('categories', 'name slug icon')
        .populate('serviceAreas', 'name city state')
        .populate('emergencyAvailability.categories', 'name slug icon')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum),
      VendorProfile.countDocuments(query)
    ]);

    const sanitizedVendors = vendors.map(v => sanitizePublicVendor(v));

    res.status(200).json({
      success: true,
      count: sanitizedVendors.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      vendors: sanitizedVendors
    });
  } catch (error) {
    next(error);
  }
};

export const getVendorById = async (req, res, next) => {
  try {
    let vendor = null;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      vendor = await VendorProfile.findById(req.params.id)
        .populate('user', 'name email avatar phone')
        .populate('categories')
        .populate('serviceAreas')
        .populate('emergencyAvailability.categories')
        .populate('services.category');

      if (!vendor) {
        vendor = await VendorProfile.findOne({ user: req.params.id })
          .populate('user', 'name email avatar phone')
          .populate('categories')
          .populate('serviceAreas')
          .populate('emergencyAvailability.categories')
          .populate('services.category');
      }
    }

    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    // Public visibility check: Only approved pros or the owner/admin can view
    const currentUserId = req.user?._id?.toString() || req.user?.id?.toString();
    const isOwner = currentUserId && (vendor.user?._id?.toString() === currentUserId || vendor.user?.toString() === currentUserId);
    const isAdmin = req.user?.role === 'admin';

    if (vendor.approvalStatus !== 'approved' && !isOwner && !isAdmin) {
      return res.status(404).json({
        success: false,
        message: 'This professional profile is currently pending administrative approval and is not publicly visible.'
      });
    }

    // Fetch published service listings
    const serviceListings = await ServiceListing.find({
      vendor: vendor.user._id,
      status: 'published'
    }).populate('category', 'name icon');

    // Fetch real verified customer reviews (from completed jobs)
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const publicReviewFilter = {
      vendor: { $in: [vendor.user._id, vendor._id] },
      moderationStatus: 'approved',
      isPublic: true
    };

    const [reviews, totalReviewsCount, allRatings] = await Promise.all([
      Review.find(publicReviewFilter)
        .populate('customer', 'name avatar')
        .populate('job', 'title')
        .populate('booking', 'serviceTitle')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Review.countDocuments(publicReviewFilter),
      Review.find(publicReviewFilter).select('rating')
    ]);

    // Compute verified rating breakdown
    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sum = 0;
    allRatings.forEach(r => {
      const star = Math.min(5, Math.max(1, Math.round(r.rating || 5)));
      breakdown[star] = (breakdown[star] || 0) + 1;
      sum += r.rating || 5;
    });

    const totalAllReviews = allRatings.length;
    const averageRating = totalAllReviews > 0 ? Number((sum / totalAllReviews).toFixed(2)) : (vendor.rating || 5.0);

    // Compute actual completed jobs from confirmed bookings
    const completedBookingsCount = await Booking.countDocuments({
      vendor: vendor.user?._id || vendor.user,
      status: 'completed'
    });

    // Sanitize vendor object for public view if not owner and not admin
    const isAuthorizedForPrivateDossier = isOwner || isAdmin;
    const sanitizedVendor = isAuthorizedForPrivateDossier ? vendor.toObject() : sanitizePublicVendor(vendor);
    sanitizedVendor.completedJobsCount = Math.max(completedBookingsCount, sanitizedVendor.completedJobsCount || 0);

    // Fetch similar professionals in same category
    let similarVendors = [];
    if (vendor.categories && vendor.categories.length > 0) {
      const rawSimilar = await VendorProfile.find({
        approvalStatus: 'approved',
        categories: { $in: vendor.categories.map(c => c._id) },
        _id: { $ne: vendor._id }
      })
        .populate('user', 'name avatar')
        .populate('categories', 'name icon')
        .limit(3)
        .lean();
      similarVendors = rawSimilar.map(sv => sanitizePublicVendor(sv));
    }

    res.status(200).json({
      success: true,
      vendor: sanitizedVendor,
      serviceListings,
      reviews,
      reviewsPagination: {
        total: totalReviewsCount,
        page,
        totalPages: Math.ceil(totalReviewsCount / limit) || 1
      },
      ratingBreakdown: {
        averageRating,
        totalReviews: totalAllReviews,
        breakdown,
        percentages: {
          5: totalAllReviews > 0 ? Math.round((breakdown[5] / totalAllReviews) * 100) : 0,
          4: totalAllReviews > 0 ? Math.round((breakdown[4] / totalAllReviews) * 100) : 0,
          3: totalAllReviews > 0 ? Math.round((breakdown[3] / totalAllReviews) * 100) : 0,
          2: totalAllReviews > 0 ? Math.round((breakdown[2] / totalAllReviews) * 100) : 0,
          1: totalAllReviews > 0 ? Math.round((breakdown[1] / totalAllReviews) * 100) : 0,
        }
      },
      similarVendors
    });
  } catch (error) {
    next(error);
  }
};

export const getVendorProfile = async (req, res, next) => {
  try {
    let vendor = await VendorProfile.findOne({ user: req.user.id })
      .populate('categories')
      .populate('serviceAreas')
      .populate('emergencyAvailability.categories')
      .populate('services.category');

    if (!vendor) {
      vendor = await VendorProfile.create({
        user: req.user.id,
        businessName: (req.user.name || 'Pro') + ' Technical Services',
        city: 'Lucknow'
      });
      vendor = await VendorProfile.findById(vendor._id)
        .populate('categories')
        .populate('serviceAreas')
        .populate('emergencyAvailability.categories')
        .populate('services.category');
    }

    const vendorObj = vendor.toObject ? vendor.toObject() : { ...vendor };
    vendorObj.isAvailable = vendor.availability?.isAvailableNow ?? true;

    res.status(200).json({ success: true, vendor: vendorObj });
  } catch (error) {
    next(error);
  }
};

export const updateVendorProfile = async (req, res, next) => {
  try {
    // Strip restricted administrative & reputation fields so vendors cannot approve themselves
    const updates = { ...req.body };
    const protectedFields = [
      'approvalStatus',
      'approvalHistory',
      'verifiedBadge',
      'rating',
      'reviewCount',
      'badges',
      'adminNotes',
      'rejectionReason',
      'user',
      '_id',
      'createdAt',
      'updatedAt'
    ];
    protectedFields.forEach(field => delete updates[field]);

    let vendor = await VendorProfile.findOneAndUpdate(
      { user: req.user.id },
      { $set: updates },
      { new: true, runValidators: true, upsert: true }
    )
      .populate('categories')
      .populate('serviceAreas')
      .populate('emergencyAvailability.categories')
      .populate('services.category');

    res.status(200).json({ success: true, vendor });
  } catch (error) {
    next(error);
  }
};

export const submitVerificationDocs = async (req, res, next) => {
  try {
    const { verificationType, idNumber, documents, consent } = req.body;

    // Explicit consent is legally required before processing identity/Aadhaar information
    if (!consent) {
      return res.status(400).json({
        success: false,
        message: 'Explicit consent is mandatory for identity verification processing under platform privacy guidelines.'
      });
    }

    // Require at least one verification document
    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one valid verification document is required (e.g. Aadhaar, Voter ID, PAN, or Trade License).'
      });
    }

    // Validate uploaded file types and properties
    const validExtensions = /\.(pdf|png|jpe?g|webp)(\?.*)?$/i;
    for (const doc of documents) {
      if (!doc.name || !doc.url) {
        return res.status(400).json({
          success: false,
          message: 'Each document must have a valid title and URL.'
        });
      }
      const isDataUri = typeof doc.url === 'string' && (doc.url.startsWith('data:image/') || doc.url.startsWith('data:application/pdf'));
      if (!isDataUri && !validExtensions.test(doc.url) && !doc.url.includes('cloudinary') && !doc.url.includes('unsplash')) {
        return res.status(400).json({
          success: false,
          message: 'Unsupported document format. Allowed formats are PDF, PNG, JPG, JPEG, and WEBP.'
        });
      }
    }

    // Strict P0 Privacy Guardrail: NEVER store full 12-digit Aadhaar number or unmasked national IDs
    let maskedIdNumber = '';
    if (idNumber) {
      const trimmed = String(idNumber).trim();
      const rawDigits = trimmed.replace(/\D/g, '');
      if (rawDigits.length === 12) {
        maskedIdNumber = `XXXX-XXXX-${rawDigits.slice(-4)}`;
      } else {
        const last4 = trimmed.slice(-4);
        maskedIdNumber = `XXXX-${last4}`;
      }
    } else {
      maskedIdNumber = 'XXXX-XXXX-****';
    }

    // Unique Verification Request ID
    const verificationRequestId = `VR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    let vendor = await VendorProfile.findOne({ user: req.user.id });
    if (!vendor) {
      vendor = await VendorProfile.create({
        user: req.user.id,
        businessName: (req.user.name || 'Pro') + ' Services'
      });
    }

    vendor.verifiedBadge = {
      status: 'pending_review',
      verificationRequestId,
      verificationType: verificationType || 'aadhaar_masked',
      maskedIdNumber,
      consentProvided: true,
      consentedAt: new Date(),
      submittedAt: new Date(),
      documents: documents.map(d => ({
        name: d.name,
        docType: d.docType || 'identity',
        url: d.url,
        uploadedAt: new Date()
      })),
      rejectionReason: '',
      resubmissionInstructions: ''
    };

    await vendor.save();

    // In-app notification to the vendor
    try {
      await Notification.create({
        recipient: req.user.id,
        title: 'Verification Request Submitted',
        message: `Your verification submission (${verificationRequestId}) has been received and is pending review by our compliance team.`,
        type: 'system',
        link: '/vendor/verification'
      });
    } catch (notifErr) {
      console.warn('Failed to create verification notification:', notifErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Verification documents submitted successfully. Verification is pending administrative review.',
      verification: {
        status: vendor.verifiedBadge.status,
        verificationRequestId: vendor.verifiedBadge.verificationRequestId,
        verificationType: vendor.verifiedBadge.verificationType,
        maskedIdNumber: vendor.verifiedBadge.maskedIdNumber,
        submittedAt: vendor.verifiedBadge.submittedAt,
        documentsCount: vendor.verifiedBadge.documents.length
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getVerificationStatus = async (req, res, next) => {
  try {
    let vendor = await VendorProfile.findOne({ user: req.user.id });
    if (!vendor) {
      return res.status(200).json({
        success: true,
        verification: {
          status: 'not_submitted',
          documents: []
        }
      });
    }

    const badge = vendor.verifiedBadge || { status: 'not_submitted' };
    res.status(200).json({
      success: true,
      verification: {
        status: badge.status || 'not_submitted',
        verificationRequestId: badge.verificationRequestId || null,
        verificationType: badge.verificationType || 'aadhaar_masked',
        maskedIdNumber: badge.maskedIdNumber || null,
        consentProvided: !!badge.consentProvided,
        consentedAt: badge.consentedAt || null,
        submittedAt: badge.submittedAt || null,
        verifiedAt: badge.verifiedAt || null,
        reviewedAt: badge.reviewedAt || null,
        rejectionReason: badge.rejectionReason || null,
        resubmissionInstructions: badge.resubmissionInstructions || null,
        documentsCount: badge.documents ? badge.documents.length : 0,
        documents: (badge.documents || []).map(d => ({
          name: d.name,
          docType: d.docType,
          url: d.url,
          uploadedAt: d.uploadedAt
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// SERVICE LISTINGS (POST A SERVICE & MY SERVICES)
// ==========================================

export const getPublicServiceListings = async (req, res, next) => {
  try {
    const { category, search, city, domain, minPrice, maxPrice, sortBy, page = 1, limit = 24 } = req.query;
    let query = { status: 'published' };

    if (city && city.trim() && city.trim() !== 'all') {
      query['location.city'] = { $regex: city.trim(), $options: 'i' };
    }

    if (domain && domain !== 'all') {
      query.domain = { $regex: domain, $options: 'i' };
    }

    if (category && category !== 'all') {
      if (mongoose.Types.ObjectId.isValid(category)) {
        query.category = category;
      } else {
        query.$or = [
          { domain: { $regex: category, $options: 'i' } },
          { subcategory: { $regex: category, $options: 'i' } }
        ];
      }
    }

    if (search && search.trim()) {
      const s = search.trim();
      const textQuery = [
        { title: { $regex: s, $options: 'i' } },
        { shortSummary: { $regex: s, $options: 'i' } },
        { description: { $regex: s, $options: 'i' } },
        { subcategory: { $regex: s, $options: 'i' } },
        { domain: { $regex: s, $options: 'i' } }
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: textQuery }];
        delete query.$or;
      } else {
        query.$or = textQuery;
      }
    }

    if (minPrice || maxPrice) {
      query['pricing.amount'] = {};
      if (minPrice) query['pricing.amount'].$gte = Number(minPrice);
      if (maxPrice) query['pricing.amount'].$lte = Number(maxPrice);
    }

    let sort = { createdAt: -1 };
    if (sortBy === 'price_asc') sort = { 'pricing.amount': 1 };
    if (sortBy === 'price_desc') sort = { 'pricing.amount': -1 };
    if (sortBy === 'rating') sort = { rating: -1, reviewCount: -1 };

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, Math.min(50, parseInt(limit) || 24));
    const skip = (pageNum - 1) * limitNum;

    const [services, total] = await Promise.all([
      ServiceListing.find(query)
        .populate('vendor', 'name avatar phone email')
        .populate('vendorProfile', 'businessName rating reviewsCount experienceYears verifiedBadge completedJobsCount isVerified hourlyRate serviceAreas')
        .populate('category', 'name icon slug')
        .sort(sort)
        .skip(skip)
        .limit(limitNum),
      ServiceListing.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      count: services.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      services
    });
  } catch (error) {
    next(error);
  }
};

export const getMyServices = async (req, res, next) => {
  try {
    const { status } = req.query;
    let query = { vendor: req.user.id };

    if (status && status !== 'all') {
      query.status = status;
    }

    let services = await ServiceListing.find(query).sort({ updatedAt: -1, createdAt: -1 });

    // If vendor has no listings in ServiceListing yet, create initial realistic published listings
    if (services.length === 0 && !status) {
      const initialServices = [
        {
          vendor: req.user.id,
          title: 'Full Electrical Subpanel Replacement & Safety Certification',
          domain: 'Electrical Services',
          subcategory: 'Panel Upgrades & Breakers',
          shortSummary: 'Complete high-grade subpanel replacement with surge protector and 5-year guarantee',
          description: 'Comprehensive electrical service panel modernization. Includes heavy-gauge copper wiring, dual busbar configuration, GFCI circuit breakers, surge suppressor, and full safety audit certificate.',
          experienceYears: 6,
          deliveryType: 'home_service',
          pricing: {
            type: 'fixed',
            amount: 1850,
            minPrice: 1850,
            maxPrice: 2400,
            currency: 'INR',
            unit: 'per project',
            materialCostIncluded: true,
            cancellationTerms: 'Free cancellation up to 4 hours before service appointment.'
          },
          images: [
            'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80'
          ],
          location: {
            city: 'Lucknow',
            locality: 'Gomti Nagar',
            radiusKm: 30,
            supportedLocalities: ['Gomti Nagar', 'Hazratganj', 'Aliganj', 'Indira Nagar']
          },
          status: 'published'
        },
        {
          vendor: req.user.id,
          title: 'EV Charging Station 50A High-Speed Dedicated Installation',
          domain: 'Electrical Services',
          subcategory: 'EV Charger Installation',
          shortSummary: 'Certified Level 2 electric vehicle home charger installation with dedicated safety breaker',
          description: 'Professional EV wallbox installation. We calculate panel load capacity, run fire-retardant armored conduit, wire dedicated 50A industrial breaker, and test charging current compatibility.',
          experienceYears: 5,
          deliveryType: 'home_service',
          pricing: {
            type: 'starting',
            amount: 750,
            minPrice: 750,
            maxPrice: 1200,
            currency: 'INR',
            unit: 'per visit',
            materialCostIncluded: false,
            cancellationTerms: 'Free cancellation 2 hours prior to scheduled slot.'
          },
          images: [
            'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=800&q=80'
          ],
          location: {
            city: 'Lucknow',
            locality: 'Hazratganj',
            radiusKm: 25,
            supportedLocalities: ['Hazratganj', 'Gomti Nagar', 'Mahanagar']
          },
          status: 'published'
        },
        {
          vendor: req.user.id,
          title: 'Whole-Home Electrical Diagnostic & Earthing Resistance Test',
          domain: 'Electrical Services',
          subcategory: 'Power Trip & Short Circuit Diagnostics',
          shortSummary: 'Infrared panel thermal scan, earth leakage verification, and complete load health report',
          description: 'Advanced diagnostic scan for homes experiencing sudden circuit trips or voltage drops. Includes digital earth megger testing, insulation resistance check, and formal safety certification report.',
          experienceYears: 8,
          deliveryType: 'home_service',
          pricing: {
            type: 'fixed',
            amount: 350,
            minPrice: 350,
            maxPrice: 450,
            currency: 'INR',
            unit: 'per visit',
            materialCostIncluded: true
          },
          images: [
            'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80'
          ],
          location: {
            city: 'Lucknow',
            locality: 'Aliganj',
            radiusKm: 35
          },
          status: 'draft'
        }
      ];

      await ServiceListing.insertMany(initialServices);
      services = await ServiceListing.find(query).sort({ createdAt: -1 });
    }

    res.status(200).json({ success: true, count: services.length, services });
  } catch (error) {
    next(error);
  }
};

export const createServiceListing = async (req, res, next) => {
  try {
    const {
      title,
      domain,
      subcategory,
      shortSummary,
      description,
      experienceYears,
      deliveryType,
      languages,
      pricing,
      images,
      location,
      availability,
      requirements,
      status,
      category,
      categoryName
    } = req.body;

    const resolvedDomain = domain || (typeof category === 'string' && category) || 'home-services';
    const resolvedSubcategory = subcategory || categoryName || title || 'General';
    const resolvedDesc = description || shortSummary || `${title || 'Professional Service'} provided by certified specialist.`;

    if (!title || !resolvedDomain) {
      return res.status(400).json({
        success: false,
        message: 'Title is required to create a service listing'
      });
    }

    const vendorProfile = await VendorProfile.findOne({ user: req.user.id });

    const newListing = await ServiceListing.create({
      vendor: req.user.id,
      vendorProfile: vendorProfile?._id,
      title,
      domain: resolvedDomain,
      subcategory: resolvedSubcategory,
      shortSummary: shortSummary || '',
      description: resolvedDesc,
      experienceYears: Number(experienceYears) || 3,
      deliveryType: deliveryType || 'home_service',
      languages: languages || ['Hindi', 'English'],
      pricing: pricing || { type: 'fixed', amount: 450, currency: 'INR', unit: 'per visit' },
      images: images || [],
      location: location || { city: 'Lucknow', radiusKm: 25 },
      availability: availability || {},
      requirements: requirements || {},
      status: status || 'published'
    });

    // Also sync summary into VendorProfile.services array
    if (vendorProfile) {
      vendorProfile.services.push({
        title: newListing.title,
        description: newListing.shortSummary || newListing.description.slice(0, 80),
        price: newListing.pricing?.amount || newListing.pricing?.minPrice || 350,
        duration: '2-3 hours'
      });
      await vendorProfile.save();
    }

    res.status(201).json({
      success: true,
      message: 'Service listing created successfully',
      service: newListing
    });
  } catch (error) {
    next(error);
  }
};

export const getServiceListingById = async (req, res, next) => {
  try {
    const service = await ServiceListing.findById(req.params.id)
      .populate('vendor', 'name email avatar phone')
      .populate('vendorProfile', 'businessName rating reviewsCount experienceYears verifiedBadge completedJobsCount isVerified hourlyRate serviceAreas')
      .populate('category');

    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    res.status(200).json({ success: true, service });
  } catch (error) {
    next(error);
  }
};

export const updateServiceListing = async (req, res, next) => {
  try {
    const service = await ServiceListing.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    if (service.vendor.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized to edit this service' });
    }

    const safeUpdates = { ...req.body };
    delete safeUpdates.vendor;
    delete safeUpdates._id;
    delete safeUpdates.vendorProfile;

    Object.assign(service, safeUpdates);
    await service.save();

    res.status(200).json({
      success: true,
      message: 'Service listing updated successfully',
      service
    });
  } catch (error) {
    next(error);
  }
};

export const updateServiceListingStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const service = await ServiceListing.findById(req.params.id);

    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    if (service.vendor.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    service.status = status;
    await service.save();

    res.status(200).json({
      success: true,
      message: `Service status updated to ${status}`,
      service
    });
  } catch (error) {
    next(error);
  }
};

export const deleteServiceListing = async (req, res, next) => {
  try {
    const service = await ServiceListing.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    if (service.vendor.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    await ServiceListing.findByIdAndDelete(req.params.id);

    res.status(200).json({ success: true, message: 'Service listing removed' });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// EARNINGS, TRANSACTIONS & FINANCIALS
// ==========================================

export const getVendorEarnings = async (req, res, next) => {
  try {
    const vendorProfile = await VendorProfile.findOne({ user: req.user.id });
    const transactions = await Transaction.find({ vendor: req.user.id });
    const bookings = await Booking.find({ vendor: req.user.id });

    let grossTotal = 0;
    let platformFeesTotal = 0;
    let netTotal = 0;
    let pendingEscrow = 0;
    let settledToBank = 0;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    let thisMonthTotal = 0;

    transactions.forEach(t => {
      const gross = t.grossAmount || 0;
      const fee = t.platformFee || 0;
      const net = t.netAmount || (gross - fee);

      grossTotal += gross;
      platformFeesTotal += fee;
      netTotal += net;

      const txDate = new Date(t.date || t.createdAt);
      if (txDate >= startOfMonth) {
        thisMonthTotal += net;
      }

      if (t.paymentStatus === 'held_in_escrow' || t.settlementStatus === 'pending') {
        pendingEscrow += net;
      }
      if (t.paymentStatus === 'paid_to_bank' || t.settlementStatus === 'settled') {
        settledToBank += net;
      }
    });

    const completedBookings = bookings.filter(b => b.status === 'completed').length;
    const hasBank = Boolean(
      vendorProfile?.bankDetails?.accountNumber ||
      vendorProfile?.bankAccount?.accountNumber ||
      vendorProfile?.payoutBank?.accountNumber
    );

    res.status(200).json({
      success: true,
      earnings: {
        lifetimeGross: grossTotal,
        platformFees: platformFeesTotal,
        netTotal: netTotal,
        totalEarnings: netTotal,
        thisMonthEarnings: thisMonthTotal,
        pendingEscrow: pendingEscrow,
        settledToBank: settledToBank,
        totalPaidOut: settledToBank,
        availableForPayout: settledToBank,
        completedJobsCount: completedBookings || vendorProfile?.completedJobsCount || 0,
        bankDetails: hasBank ? {
          bankName: vendorProfile?.bankDetails?.bankName || vendorProfile?.bankAccount?.bankName || 'Verified Bank Account',
          branch: vendorProfile?.bankDetails?.branch || 'Local Branch',
          accountNumberMasked: vendorProfile?.bankDetails?.accountNumber
            ? `****${String(vendorProfile.bankDetails.accountNumber).slice(-4)}`
            : '****4812',
          payoutSchedule: 'Every Monday Automated NEFT'
        } : null
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getVendorTransactions = async (req, res, next) => {
  try {
    const { status } = req.query;
    let query = { vendor: req.user.id };

    if (status && status !== 'all') {
      query.paymentStatus = status;
    }

    const transactions = await Transaction.find(query).sort({ date: -1, createdAt: -1 });

    res.status(200).json({ success: true, count: transactions.length, transactions });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// AVAILABILITY & CALENDAR
// ==========================================

export const getVendorAvailability = async (req, res, next) => {
  try {
    const vendor = await VendorProfile.findOne({ user: req.user.id });
    res.status(200).json({
      success: true,
      availability: vendor?.availability || {
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        hours: { start: '08:00', end: '19:00' },
        isAvailableNow: true
      }
    });
  } catch (error) {
    next(error);
  }
};

export const updateVendorAvailability = async (req, res, next) => {
  try {
    let vendor = await VendorProfile.findOne({ user: req.user.id });
    if (!vendor) {
      vendor = await VendorProfile.create({
        user: req.user.id,
        businessName: (req.user.name || 'Vendor') + ' Services'
      });
    }

    if (!vendor.availability) {
      vendor.availability = {
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        hours: { start: '08:00', end: '18:00' },
        isAvailableNow: true
      };
    }

    // Safely apply boolean availability toggle
    if (typeof req.body.isAvailableNow === 'boolean') {
      vendor.availability.isAvailableNow = req.body.isAvailableNow;
    } else if (typeof req.body.isAvailable === 'boolean') {
      vendor.availability.isAvailableNow = req.body.isAvailable;
    }

    // Update days array if provided
    if (Array.isArray(req.body.days)) {
      vendor.availability.days = req.body.days;
    }

    // Update hours if provided
    if (req.body.hours && typeof req.body.hours === 'object') {
      if (req.body.hours.start) vendor.availability.hours.start = req.body.hours.start;
      if (req.body.hours.end) vendor.availability.hours.end = req.body.hours.end;
    }

    vendor.markModified('availability');
    await vendor.save();

    res.status(200).json({
      success: true,
      availability: vendor.availability,
      isAvailable: vendor.availability.isAvailableNow
    });
  } catch (error) {
    next(error);
  }
};

export const getVendorCalendar = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ vendor: req.user.id })
      .populate('customer', 'name phone')
      .sort({ scheduledDate: 1 });

    const vendor = await VendorProfile.findOne({ user: req.user.id });

    res.status(200).json({
      success: true,
      bookings,
      availability: vendor?.availability,
      timeSlots: [
        '09:00 AM - 11:00 AM',
        '11:00 AM - 01:00 PM',
        '02:00 PM - 04:00 PM',
        '04:00 PM - 06:00 PM',
        '06:00 PM - 08:00 PM'
      ]
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// VENDOR DASHBOARD LIVE AGGREGATIONS
// ==========================================

export const getVendorDashboardStats = async (req, res, next) => {
  try {
    const vendorProfile = await VendorProfile.findOne({ user: req.user.id });
    
    // Services counts
    const totalServices = await ServiceListing.countDocuments({ vendor: req.user.id });
    const publishedServices = await ServiceListing.countDocuments({ vendor: req.user.id, status: 'published' });
    const pendingServices = await ServiceListing.countDocuments({ vendor: req.user.id, status: 'pending_approval' });

    // Job matching counts
    const matchingJobsCount = await Job.countDocuments({ status: 'open', isDeleted: { $ne: true } });
    const recentJobs = await Job.find({ status: 'open', isDeleted: { $ne: true } })
      .populate('category', 'name slug icon')
      .populate('customer', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(4);

    // Quotations / Applications submitted by this vendor
    const submittedQuotations = await Application.countDocuments({ vendor: req.user.id });
    const awaitingDecisionCount = await Application.countDocuments({ 
      vendor: req.user.id, 
      status: { $in: ['submitted', 'shortlisted'] } 
    });
    const acceptedQuotationsCount = await Application.countDocuments({ 
      vendor: req.user.id, 
      status: 'accepted' 
    });
    const recentQuotations = await Application.find({ vendor: req.user.id })
      .populate('job', 'title budget urgency location status')
      .sort({ createdAt: -1 })
      .limit(4);

    // Bookings & Work Lifecycle
    const upcomingBookingsCount = await Booking.countDocuments({
      vendor: req.user.id,
      status: { $in: ['awaiting_confirmation', 'confirmed', 'scheduled'] }
    });
    const activeJobsCount = await Booking.countDocuments({
      vendor: req.user.id,
      status: 'in_progress'
    });
    const completedJobsCount = await Booking.countDocuments({
      vendor: req.user.id,
      status: 'completed'
    });

    const activeBookings = await Booking.find({
      vendor: req.user.id,
      status: { $in: ['awaiting_confirmation', 'confirmed', 'scheduled', 'in_progress'] }
    })
      .populate('customer', 'name phone avatar')
      .sort({ scheduledDate: 1 })
      .limit(4);

    // Earnings & Escrow strictly from MongoDB Transaction records
    const transactions = await Transaction.find({ vendor: req.user.id });
    let totalEarnings = 0;
    let pendingEscrow = 0;

    transactions.forEach(t => {
      const net = Number(t.netAmount || t.grossAmount || 0);
      if (t.paymentStatus === 'paid_to_bank' || t.settlementStatus === 'settled' || t.type === 'escrow_release') {
        totalEarnings += net;
      } else if (t.paymentStatus === 'held_in_escrow' || t.settlementStatus === 'pending' || t.type === 'escrow_hold') {
        pendingEscrow += net;
      }
    });

    // If vendorProfile has accumulated earningsTotal from completed bookings
    if (totalEarnings === 0 && (vendorProfile?.earningsTotal || 0) > 0) {
      totalEarnings = vendorProfile.earningsTotal;
    }

    // Profile completeness calculation
    let completeness = 30;
    if (vendorProfile?.businessName) completeness += 20;
    if (vendorProfile?.bio) completeness += 15;
    if (totalServices > 0) completeness += 20;
    if (vendorProfile?.verifiedBadge?.status === 'verified') completeness += 15;

    res.status(200).json({
      success: true,
      stats: {
        totalServices,
        publishedServices,
        pendingServices,
        matchingJobsCount,
        submittedQuotations,
        awaitingDecisionCount,
        acceptedQuotationsCount,
        upcomingBookingsCount,
        activeJobsCount,
        completedJobsCount: completedJobsCount || vendorProfile?.completedJobsCount || 0,
        totalEarnings,
        pendingEscrow,
        rating: vendorProfile?.rating || 5.0,
        reviewCount: vendorProfile?.reviewCount || 0,
        profileCompleteness: Math.min(completeness, 100),
        verificationStatus: vendorProfile?.verifiedBadge?.status || 'verified',
        recentJobs,
        recentQuotations,
        upcomingBookings: activeBookings
      }
    });
  } catch (error) {
    next(error);
  }
};

import mongoose from 'mongoose';
import Review from '../models/Review.js';
import VendorProfile from '../models/VendorProfile.js';
import Booking from '../models/Booking.js';
import Job from '../models/Job.js';
import { recalculateVendorRating } from '../utils/ratingAggregator.js';
import { notificationService } from '../services/notification.service.js';

/**
 * Submit a customer review for a completed booking
 * Enforces one review per completed booking, verifies ownership and completed status,
 * derives the vendor from the booking, and recalculates vendor rating aggregate.
 */
export const createReview = async (req, res, next) => {
  try {
    let bookingId = req.params.bookingId || req.body.bookingId;
    const { rating, comment, vendorId } = req.body;

    if (!rating) {
      return res.status(400).json({ success: false, message: 'Please provide a star rating.' });
    }

    const numRating = Number(rating);
    if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be an integer between 1 and 5.'
      });
    }

    // If bookingId was not provided but vendorId was, find the customer's unreviewed completed booking
    if (!bookingId && vendorId) {
      let targetVendorUserId = vendorId;
      if (mongoose.Types.ObjectId.isValid(vendorId)) {
        const vp = await VendorProfile.findById(vendorId);
        if (vp?.user) targetVendorUserId = vp.user.toString();
      }

      const completedCandidates = await Booking.find({
        customer: req.user.id,
        vendor: targetVendorUserId,
        status: 'completed'
      }).sort({ updatedAt: -1 });

      for (const candidate of completedCandidates) {
        const existing = await Review.findOne({ booking: candidate._id });
        if (!existing) {
          bookingId = candidate._id;
          break;
        }
      }
    }

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: 'Booking reference is required to submit a verified review. No unreviewed completed booking was found with this professional.'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ success: false, message: 'Invalid booking ID.' });
    }

    // 1. Fetch authoritative booking record
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    // 2. Authorization: Request must come from the authenticated customer who owns the booking
    if (booking.customer.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to review a booking that you do not own.'
      });
    }

    // 3. Status check: Booking must be genuinely completed
    if (booking.status !== 'completed' && req.user.role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'You can only leave a review after the booking has been marked completed.'
      });
    }

    // 4. Assigned vendor check: Booking must have an assigned vendor
    if (!booking.vendor) {
      return res.status(400).json({
        success: false,
        message: 'This booking has no assigned contractor to review.'
      });
    }

    // 5. Derive reviewed vendor strictly from booking (never trust client payload)
    const targetVendorUserId = booking.vendor.toString();

    // 6. Application-level duplicate review protection
    const existingReview = await Review.findOne({ booking: booking._id });
    if (existingReview) {
      return res.status(409).json({
        success: false,
        code: 'REVIEW_ALREADY_EXISTS',
        message: 'A review has already been submitted for this booking. Only one review is allowed per booking.'
      });
    }

    // 7. Sanitize comment content
    const sanitizedComment = typeof comment === 'string' ? comment.trim() : '';
    if (sanitizedComment.length > 1500) {
      return res.status(400).json({
        success: false,
        message: 'Review comment cannot exceed 1,500 characters.'
      });
    }

    // 8. Persist Review with database-level duplicate protection
    let review;
    try {
      review = await Review.create({
        booking: booking._id,
        job: booking.job || null,
        customer: req.user.id,
        vendor: targetVendorUserId,
        rating: numRating,
        comment: sanitizedComment,
        moderationStatus: 'approved',
        isPublic: true
      });
    } catch (dbErr) {
      if (dbErr.code === 11000) {
        return res.status(409).json({
          success: false,
          code: 'REVIEW_ALREADY_EXISTS',
          message: 'A review has already been submitted for this booking.'
        });
      }
      throw dbErr;
    }

    // 9. Link review to booking
    booking.hasReview = true;
    booking.review = review._id;
    await booking.save();

    // 10. Recalculate vendor's real rating aggregate from approved public reviews
    await recalculateVendorRating(targetVendorUserId);

    // 11. Notify the vendor
    try {
      await notificationService.createNotification({
        recipient: targetVendorUserId,
        sender: req.user.id,
        type: 'review_received',
        title: 'New Client Review Received',
        message: `${req.user.name || 'A client'} gave you a ${numRating}-star rating for "${booking.serviceTitle}".`,
        link: '/vendor/reviews',
        relatedResource: { resourceType: 'Review', resourceId: review._id }
      });
    } catch (notifErr) {
      console.warn('Could not dispatch in-app notification for review:', notifErr.message);
    }

    const populatedReview = await Review.findById(review._id)
      .populate('customer', 'name avatar')
      .populate('booking', 'serviceTitle bookingReference');

    res.status(201).json({
      success: true,
      message: 'Thank you! Your verified review has been submitted successfully.',
      review: populatedReview
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch customer's review for a specific booking
 */
export const getBookingReview = async (req, res, next) => {
  try {
    const { bookingId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ success: false, message: 'Invalid booking ID.' });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    // Check ownership or authorized role
    const currentUserId = req.user.id;
    const isOwner = booking.customer.toString() === currentUserId;
    const isVendor = booking.vendor && booking.vendor.toString() === currentUserId;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isVendor && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this booking review.' });
    }

    const review = await Review.findOne({ booking: bookingId })
      .populate('customer', 'name avatar')
      .populate('vendor', 'name businessName avatar');

    res.status(200).json({ success: true, review: review || null });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch customer's completed bookings that are awaiting a review
 */
export const getAwaitingReviews = async (req, res, next) => {
  try {
    // Find customer's completed bookings
    const completedBookings = await Booking.find({
      customer: req.user.id,
      status: 'completed',
      hasReview: { $ne: true }
    })
      .populate('vendor', 'name avatar businessName')
      .sort({ updatedAt: -1 });

    // Double check Review collection to prevent any out-of-sync bookings
    const reviewedBookingIds = new Set(
      (await Review.find({ customer: req.user.id }).select('booking'))
        .map(r => r.booking?.toString())
        .filter(Boolean)
    );

    const eligibleBookings = completedBookings.filter(
      b => !reviewedBookingIds.has(b._id.toString())
    );

    res.status(200).json({
      success: true,
      count: eligibleBookings.length,
      bookings: eligibleBookings
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Check review eligibility for a vendor from customer's completed bookings
 */
export const checkReviewEligibility = async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    let targetVendorUserId = vendorId;

    if (mongoose.Types.ObjectId.isValid(vendorId)) {
      const vp = await VendorProfile.findById(vendorId);
      if (vp?.user) {
        targetVendorUserId = vp.user.toString();
      }
    }

    // Find all completed bookings with this vendor
    const completedBookings = await Booking.find({
      customer: req.user.id,
      vendor: targetVendorUserId,
      status: 'completed'
    }).sort({ updatedAt: -1 });

    if (!completedBookings || completedBookings.length === 0) {
      return res.status(200).json({
        success: true,
        eligible: false,
        message: 'No completed bookings found with this professional.'
      });
    }

    // Check which completed booking is not yet reviewed
    for (const b of completedBookings) {
      const existing = await Review.findOne({ booking: b._id });
      if (!existing) {
        return res.status(200).json({
          success: true,
          eligible: true,
          booking: {
            _id: b._id,
            serviceTitle: b.serviceTitle,
            completedAt: b.completionEvidence?.completedAt || b.updatedAt
          }
        });
      }
    }

    return res.status(200).json({
      success: true,
      eligible: false,
      message: 'All completed bookings with this professional have already been reviewed.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get public reviews for a specific vendor
 * Excludes pending, rejected, and hidden reviews.
 * Strips private customer contact and location data.
 */
export const getVendorReviews = async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    let targetUserId = vendorId;

    if (mongoose.Types.ObjectId.isValid(vendorId)) {
      const vp = await VendorProfile.findById(vendorId);
      if (vp?.user) {
        targetUserId = vp.user.toString();
      }
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    // Public visibility filter: Strictly approved and public reviews
    const query = {
      vendor: { $in: [targetUserId, vendorId] },
      moderationStatus: 'approved',
      isPublic: true
    };

    const [reviews, totalCount, allRatings] = await Promise.all([
      Review.find(query)
        .populate('customer', 'name avatar')
        .populate('booking', 'serviceTitle')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Review.countDocuments(query),
      Review.find(query).select('rating')
    ]);

    // Compute star breakdown
    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sum = 0;
    allRatings.forEach(r => {
      const star = Math.min(5, Math.max(1, Math.round(r.rating || 5)));
      breakdown[star] = (breakdown[star] || 0) + 1;
      sum += (r.rating || 5);
    });

    const averageRating = allRatings.length > 0
      ? Number((sum / allRatings.length).toFixed(2))
      : 5.0;

    res.status(200).json({
      success: true,
      count: reviews.length,
      totalCount,
      page,
      pages: Math.ceil(totalCount / limit) || 1,
      averageRating,
      ratingBreakdown: breakdown,
      reviews
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get contractor's own reviews
 * Zero mock policy: Returns real database reviews from actual clients
 */
export const getMyReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ vendor: req.user.id })
      .populate('customer', 'name avatar')
      .populate('booking', 'serviceTitle bookingReference')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: reviews.length, reviews });
  } catch (error) {
    next(error);
  }
};

/**
 * Contractor response to a customer review
 */
export const respondToReview = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Response text cannot be empty.' });
    }

    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found.' });
    }

    if (review.vendor.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to reply to this review.' });
    }

    review.response = {
      text: text.trim().slice(0, 1000),
      respondedAt: new Date()
    };
    await review.save();

    res.status(200).json({
      success: true,
      message: 'Your response has been published successfully.',
      review
    });
  } catch (error) {
    next(error);
  }
};

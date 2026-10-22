import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Ratings & Reviews System — Test Suite
 * Validates eligibility verification, one-review-per-booking duplicate prevention,
 * rating value constraints, admin moderation lifecycle, and public rating aggregation.
 */

// Simulated In-Memory Database for Review, Booking, and VendorProfile
class MockReviewDatabase {
  constructor() {
    this.bookings = [];
    this.reviews = [];
    this.vendorProfiles = [];
    this.activityLogs = [];
  }

  reset() {
    this.bookings = [];
    this.reviews = [];
    this.vendorProfiles = [];
    this.activityLogs = [];
  }

  // Booking helper
  createBooking(data) {
    const booking = {
      _id: data._id || `booking_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      bookingReference: data.bookingReference || `BK-${Math.floor(100000 + Math.random() * 900000)}`,
      customer: data.customer,
      vendor: data.vendor,
      status: data.status || 'scheduled',
      hasReview: false,
      review: null,
      serviceTitle: data.serviceTitle || 'Home Service Repair',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.bookings.push(booking);
    return booking;
  }

  // Vendor profile helper
  createVendorProfile(vendorUserId, initialRating = 5.0, initialReviewCount = 0) {
    const profile = {
      _id: `vp_${vendorUserId}`,
      user: vendorUserId,
      businessName: `Specialist ${vendorUserId}`,
      rating: initialRating,
      reviewCount: initialReviewCount
    };
    this.vendorProfiles.push(profile);
    return profile;
  }

  // Canonical rating re-aggregation engine (matches recalculateVendorRating in backend/src/utils/ratingAggregator.js)
  recalculateVendorRating(vendorUserId) {
    const approvedReviews = this.reviews.filter(
      r => r.vendor === vendorUserId && r.moderationStatus === 'approved' && r.isPublic === true
    );

    const count = approvedReviews.length;
    let averageRating = 5.0;

    if (count > 0) {
      const sum = approvedReviews.reduce((acc, r) => acc + Number(r.rating || 0), 0);
      averageRating = Number((sum / count).toFixed(2));
    }

    const vp = this.vendorProfiles.find(p => p.user === vendorUserId);
    if (vp) {
      vp.rating = averageRating;
      vp.reviewCount = count;
    }

    return { rating: averageRating, reviewCount: count };
  }

  // Service function: create review (matches createReview controller)
  submitReview(req) {
    const { user, params = {}, body = {} } = req;

    // 1. Authentication check
    if (!user || !user.id) {
      return { status: 401, data: { success: false, message: 'Authentication required' } };
    }

    const bookingId = params.bookingId || body.bookingId;
    const { rating, comment } = body;

    // 2. Rating validation: integer between 1 and 5
    if (rating === undefined || rating === null) {
      return { status: 400, data: { success: false, message: 'Please provide a star rating.' } };
    }

    const numRating = Number(rating);
    if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
      return {
        status: 400,
        data: { success: false, message: 'Rating must be an integer between 1 and 5.' }
      };
    }

    // 3. Booking reference required
    if (!bookingId) {
      return {
        status: 400,
        data: { success: false, message: 'Booking reference is required to submit a verified review.' }
      };
    }

    // 4. Booking existence
    const booking = this.bookings.find(b => b._id === bookingId);
    if (!booking) {
      return { status: 404, data: { success: false, message: 'Booking not found.' } };
    }

    // 5. Ownership verification: Customer must own the booking
    if (booking.customer !== user.id && user.role !== 'admin') {
      return {
        status: 403,
        data: { success: false, message: 'You are not authorized to review a booking that you do not own.' }
      };
    }

    // 6. Completion status: Must be genuinely completed
    if (booking.status !== 'completed' && user.role !== 'admin') {
      return {
        status: 400,
        data: { success: false, message: 'You can only leave a review after the booking has been marked completed.' }
      };
    }

    // 7. Assigned vendor check
    if (!booking.vendor) {
      return {
        status: 400,
        data: { success: false, message: 'This booking has no assigned contractor to review.' }
      };
    }

    // 8. Vendor is derived authoritatively from booking (ignoring any client-supplied vendorId)
    const targetVendor = booking.vendor;

    // 9. Application-level duplicate review protection
    const existing = this.reviews.find(r => r.booking === booking._id);
    if (existing) {
      return {
        status: 409,
        data: {
          success: false,
          code: 'REVIEW_ALREADY_EXISTS',
          message: 'A review has already been submitted for this booking. Only one review is allowed per booking.'
        }
      };
    }

    // 10. Database unique constraint simulation (booking index uniqueness)
    const dbKeyCollision = this.reviews.some(r => r.booking === booking._id);
    if (dbKeyCollision) {
      return {
        status: 409,
        data: {
          success: false,
          code: 'DUPLICATE_REVIEW',
          message: 'A review has already been submitted for this booking.'
        }
      };
    }

    // 11. Create Review
    const review = {
      _id: `review_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      booking: booking._id,
      customer: user.id,
      vendor: targetVendor,
      rating: numRating,
      comment: (comment || '').trim().slice(0, 1500),
      moderationStatus: 'approved',
      isPublic: true,
      isReported: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.reviews.push(review);

    // 12. Link to booking
    booking.hasReview = true;
    booking.review = review._id;

    // 13. Re-aggregate vendor rating
    this.recalculateVendorRating(targetVendor);

    return { status: 201, data: { success: true, review } };
  }

  // Admin moderation (matches moderateReview controller)
  moderateReview(adminUser, reviewId, { action, moderationStatus, isPublic, moderationReason }) {
    if (!adminUser || adminUser.role !== 'admin') {
      return { status: 403, data: { success: false, message: 'Access denied: Admin only' } };
    }

    const review = this.reviews.find(r => r._id === reviewId);
    if (!review) {
      return { status: 404, data: { success: false, message: 'Review not found' } };
    }

    if (action === 'approve' || moderationStatus === 'approved') {
      review.moderationStatus = 'approved';
      review.isPublic = true;
    } else if (action === 'reject' || moderationStatus === 'rejected') {
      review.moderationStatus = 'rejected';
      review.isPublic = false;
    } else if (action === 'hide' || moderationStatus === 'hidden') {
      review.moderationStatus = 'hidden';
      review.isPublic = false;
    } else if (action === 'restore') {
      review.moderationStatus = 'approved';
      review.isPublic = true;
    } else if (typeof isPublic === 'boolean') {
      review.isPublic = isPublic;
      review.moderationStatus = isPublic ? 'approved' : 'hidden';
    }

    review.moderatedBy = adminUser._id || adminUser.id;
    review.moderatedAt = new Date();
    review.moderationReason = moderationReason || 'Admin review decision';
    review.isReported = false;

    // Re-aggregate vendor rating
    this.recalculateVendorRating(review.vendor);

    this.activityLogs.push({
      action: 'REVIEW_MODERATED',
      reviewId: review._id,
      moderatedBy: adminUser.id,
      status: review.moderationStatus,
      isPublic: review.isPublic,
      reason: review.moderationReason
    });

    return { status: 200, data: { success: true, review } };
  }

  // Public vendor reviews query (matches getVendorReviews)
  getPublicVendorReviews(vendorId) {
    return this.reviews.filter(
      r => r.vendor === vendorId && r.moderationStatus === 'approved' && r.isPublic === true
    );
  }
}

describe('WorkLogy Ratings & Reviews System — Full Specification', () => {
  let db;

  beforeEach(() => {
    db = new MockReviewDatabase();
  });

  describe('1. Customer Review Submission & Eligibility Rules', () => {
    it('accepts review for a genuinely completed booking owned by the customer', () => {
      const customerId = 'cust_101';
      const vendorId = 'vend_201';

      db.createVendorProfile(vendorId, 5.0, 0);
      const booking = db.createBooking({
        _id: 'booking_1',
        customer: customerId,
        vendor: vendorId,
        status: 'completed'
      });

      const res = db.submitReview({
        user: { id: customerId, role: 'customer' },
        params: { bookingId: 'booking_1' },
        body: { rating: 5, comment: 'Punctual, thorough, and clean wiring work.' }
      });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.review.rating, 5);
      assert.strictEqual(res.data.review.vendor, vendorId);
      assert.strictEqual(booking.hasReview, true);
    });

    it('rejects review when booking is incomplete (e.g. in_progress, scheduled, or cancelled)', () => {
      const customerId = 'cust_101';
      const vendorId = 'vend_201';

      const bookingInProgress = db.createBooking({
        _id: 'booking_progress',
        customer: customerId,
        vendor: vendorId,
        status: 'in_progress'
      });

      const res = db.submitReview({
        user: { id: customerId, role: 'customer' },
        params: { bookingId: 'booking_progress' },
        body: { rating: 5, comment: 'Great so far' }
      });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.data.success, false);
      assert.match(res.data.message, /completed/i);
    });

    it('rejects review when booking belongs to another customer (IDOR protection)', () => {
      const legitCustomerId = 'cust_legit';
      const maliciousCustomerId = 'cust_attacker';
      const vendorId = 'vend_201';

      db.createBooking({
        _id: 'booking_private',
        customer: legitCustomerId,
        vendor: vendorId,
        status: 'completed'
      });

      const res = db.submitReview({
        user: { id: maliciousCustomerId, role: 'customer' },
        params: { bookingId: 'booking_private' },
        body: { rating: 1, comment: 'Malicious review attempt' }
      });

      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.data.success, false);
      assert.match(res.data.message, /not authorized/i);
    });

    it('derives vendor from authoritative booking record, ignoring client-supplied vendor ID', () => {
      const customerId = 'cust_101';
      const actualVendorId = 'vend_actual';
      const spoofedVendorId = 'vend_spoofed';

      db.createVendorProfile(actualVendorId);
      db.createVendorProfile(spoofedVendorId);

      db.createBooking({
        _id: 'booking_authoritative',
        customer: customerId,
        vendor: actualVendorId,
        status: 'completed'
      });

      const res = db.submitReview({
        user: { id: customerId, role: 'customer' },
        params: { bookingId: 'booking_authoritative' },
        body: {
          vendorId: spoofedVendorId, // Attacker tries to review a different vendor
          rating: 4,
          comment: 'Good service'
        }
      });

      assert.strictEqual(res.status, 201);
      // Vendor must be actualVendorId from booking, NOT spoofedVendorId from body
      assert.strictEqual(res.data.review.vendor, actualVendorId);
      assert.notStrictEqual(res.data.review.vendor, spoofedVendorId);
    });

    it('strictly enforces integer rating between 1 and 5', () => {
      const customerId = 'cust_101';
      const vendorId = 'vend_201';

      db.createBooking({
        _id: 'b_rating_test',
        customer: customerId,
        vendor: vendorId,
        status: 'completed'
      });

      // Test 0
      assert.strictEqual(db.submitReview({
        user: { id: customerId },
        params: { bookingId: 'b_rating_test' },
        body: { rating: 0, comment: 'Invalid 0' }
      }).status, 400);

      // Test 6
      assert.strictEqual(db.submitReview({
        user: { id: customerId },
        params: { bookingId: 'b_rating_test' },
        body: { rating: 6, comment: 'Invalid 6' }
      }).status, 400);

      // Test negative
      assert.strictEqual(db.submitReview({
        user: { id: customerId },
        params: { bookingId: 'b_rating_test' },
        body: { rating: -1, comment: 'Invalid negative' }
      }).status, 400);

      // Test decimal / float
      assert.strictEqual(db.submitReview({
        user: { id: customerId },
        params: { bookingId: 'b_rating_test' },
        body: { rating: 4.5, comment: 'Invalid decimal' }
      }).status, 400);

      // Test valid integer 4
      assert.strictEqual(db.submitReview({
        user: { id: customerId },
        params: { bookingId: 'b_rating_test' },
        body: { rating: 4, comment: 'Valid integer 4' }
      }).status, 201);
    });
  });

  describe('2. Duplicate Protection (One Review Per Booking Constraint)', () => {
    it('accepts first review and rejects second review for the same booking with 409 Conflict', () => {
      const customerId = 'cust_101';
      const vendorId = 'vend_201';

      db.createVendorProfile(vendorId);
      db.createBooking({
        _id: 'booking_dup_test',
        customer: customerId,
        vendor: vendorId,
        status: 'completed'
      });

      // First submission
      const res1 = db.submitReview({
        user: { id: customerId, role: 'customer' },
        params: { bookingId: 'booking_dup_test' },
        body: { rating: 5, comment: 'Initial review' }
      });
      assert.strictEqual(res1.status, 201);

      // Second submission for the same booking
      const res2 = db.submitReview({
        user: { id: customerId, role: 'customer' },
        params: { bookingId: 'booking_dup_test' },
        body: { rating: 1, comment: 'Attempting second review' }
      });
      assert.strictEqual(res2.status, 409);
      assert.strictEqual(res2.data.code, 'REVIEW_ALREADY_EXISTS');

      // Database should contain exactly 1 review
      const bookingReviews = db.reviews.filter(r => r.booking === 'booking_dup_test');
      assert.strictEqual(bookingReviews.length, 1);
    });
  });

  describe('3. Admin Moderation & Public Visibility Rules', () => {
    it('pending reviews do not appear in public vendor review listing', () => {
      const vendorId = 'vend_301';
      db.reviews.push({
        _id: 'rev_pending',
        vendor: vendorId,
        rating: 5,
        comment: 'Pending review',
        moderationStatus: 'pending',
        isPublic: false
      });

      const publicReviews = db.getPublicVendorReviews(vendorId);
      assert.strictEqual(publicReviews.length, 0);
    });

    it('approving a review makes it publicly visible and updates vendor rating', () => {
      const vendorId = 'vend_301';
      db.createVendorProfile(vendorId, 5.0, 0);

      const review = {
        _id: 'rev_to_approve',
        vendor: vendorId,
        rating: 4,
        comment: 'Great work',
        moderationStatus: 'pending',
        isPublic: false
      };
      db.reviews.push(review);

      // Before approval: 0 public reviews
      assert.strictEqual(db.getPublicVendorReviews(vendorId).length, 0);

      // Admin approves
      const adminUser = { id: 'admin_1', role: 'admin' };
      const modRes = db.moderateReview(adminUser, 'rev_to_approve', {
        action: 'approve',
        moderationReason: 'Verified invoice and customer signoff'
      });

      assert.strictEqual(modRes.status, 200);
      assert.strictEqual(review.moderationStatus, 'approved');
      assert.strictEqual(review.isPublic, true);

      // After approval: 1 public review and updated rating
      const publicReviews = db.getPublicVendorReviews(vendorId);
      assert.strictEqual(publicReviews.length, 1);
      assert.strictEqual(db.vendorProfiles.find(p => p.user === vendorId).rating, 4.0);
    });

    it('hiding or rejecting a review removes it from public results and updates public average', () => {
      const vendorId = 'vend_301';
      db.createVendorProfile(vendorId, 5.0, 0);

      // Add two approved reviews: 5 and 1
      db.reviews.push({
        _id: 'rev_legit',
        vendor: vendorId,
        rating: 5,
        moderationStatus: 'approved',
        isPublic: true
      });
      db.reviews.push({
        _id: 'rev_abusive',
        vendor: vendorId,
        rating: 1,
        comment: 'Spam abusive content',
        moderationStatus: 'approved',
        isPublic: true
      });

      db.recalculateVendorRating(vendorId);
      // (5 + 1) / 2 = 3.0
      assert.strictEqual(db.vendorProfiles.find(p => p.user === vendorId).rating, 3.0);
      assert.strictEqual(db.vendorProfiles.find(p => p.user === vendorId).reviewCount, 2);

      // Admin hides the abusive review
      const adminUser = { id: 'admin_1', role: 'admin' };
      db.moderateReview(adminUser, 'rev_abusive', {
        action: 'hide',
        moderationReason: 'Violates platform anti-harassment policy'
      });

      // Average must recalculate using ONLY the remaining approved review (5.0)
      const vp = db.vendorProfiles.find(p => p.user === vendorId);
      assert.strictEqual(vp.rating, 5.0);
      assert.strictEqual(vp.reviewCount, 1);

      // Public reviews should only contain the 1 legit review
      const publicReviews = db.getPublicVendorReviews(vendorId);
      assert.strictEqual(publicReviews.length, 1);
      assert.strictEqual(publicReviews[0]._id, 'rev_legit');
    });

    it('rejects unauthorized non-admin staff from executing moderation actions', () => {
      const customerUser = { id: 'cust_normal', role: 'customer' };
      const modRes = db.moderateReview(customerUser, 'rev_any', { action: 'approve' });
      assert.strictEqual(modRes.status, 403);
    });
  });

  describe('4. Rating Aggregation Math & Zero-Review Resilience', () => {
    it('accurately calculates average rating to two decimal places', () => {
      const vendorId = 'vend_math';
      db.createVendorProfile(vendorId);

      // Add approved reviews: 5, 4, 4 -> sum = 13, count = 3 -> 13 / 3 = 4.33
      db.reviews.push({ vendor: vendorId, rating: 5, moderationStatus: 'approved', isPublic: true });
      db.reviews.push({ vendor: vendorId, rating: 4, moderationStatus: 'approved', isPublic: true });
      db.reviews.push({ vendor: vendorId, rating: 4, moderationStatus: 'approved', isPublic: true });

      const agg = db.recalculateVendorRating(vendorId);
      assert.strictEqual(agg.rating, 4.33);
      assert.strictEqual(agg.reviewCount, 3);
    });

    it('handles zero-review vendor without divide-by-zero or NaN errors', () => {
      const vendorId = 'vend_zero';
      db.createVendorProfile(vendorId);

      const agg = db.recalculateVendorRating(vendorId);
      assert.strictEqual(agg.rating, 5.0);
      assert.strictEqual(agg.reviewCount, 0);
      assert.strictEqual(isNaN(agg.rating), false);
    });
  });
});

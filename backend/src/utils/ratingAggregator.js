import Review from '../models/Review.js';
import VendorProfile from '../models/VendorProfile.js';

/**
 * Canonical Rating Aggregation Engine for WorkLogy
 * 
 * Calculates and synchronizes the vendor's public rating and review count
 * using strictly approved and publicly visible reviews.
 * 
 * Formula: Sum(approved ratings) / Count(approved reviews)
 * 
 * Guardrails:
 * - Excludes pending, rejected, and hidden reviews.
 * - Handles zero reviews cleanly without divide-by-zero errors.
 * - Enforces 2 decimal place precision (e.g., 4.75).
 * - Synchronizes with VendorProfile in MongoDB.
 */
export const recalculateVendorRating = async (vendorUserId) => {
  if (!vendorUserId) return null;

  let resolvedUserId = vendorUserId;
  // If VendorProfile _id was passed, resolve to user _id
  if (typeof vendorUserId === 'string' || vendorUserId._id) {
    const vp = await VendorProfile.findById(vendorUserId).select('user');
    if (vp?.user) {
      resolvedUserId = vp.user.toString();
    }
  }

  const approvedReviews = await Review.find({
    vendor: resolvedUserId,
    moderationStatus: 'approved',
    isPublic: true
  }).select('rating');

  const count = approvedReviews.length;
  let averageRating = 5.0;

  if (count > 0) {
    const sum = approvedReviews.reduce((acc, r) => acc + Number(r.rating || 0), 0);
    averageRating = Number((sum / count).toFixed(2));
  }

  const updatedProfile = await VendorProfile.findOneAndUpdate(
    { user: resolvedUserId },
    {
      rating: averageRating,
      reviewCount: count
    },
    { new: true }
  );

  return { rating: averageRating, reviewCount: count, profile: updatedProfile };
};

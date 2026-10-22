import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Star, 
  MapPin, 
  ShieldCheck, 
  CheckCircle2, 
  CheckCircle, 
  Clock, 
  Calendar,
  MessageSquare,
  Bookmark,
  Heart,
  ChevronRight,
  ArrowRight,
  Check,
  AlertCircle,
  Wrench,
  Sparkles,
  User,
  Info,
  Building,
  Award,
  ThumbsUp,
  X,
  Share2,
  FileText,
  Zap
} from 'lucide-react';
import { vendorAPI } from '../../api/vendor.api';
import { customerAPI } from '../../api/customer.api';
import { reviewAPI } from '../../api/review.api';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import DirectBookingModal from '../../components/booking/DirectBookingModal';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { getServiceImage } from '../../constants/serviceImages';
import VerifiedBadge from '../../components/vendor/VerifiedBadge';

export default function ProfessionalProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Profile data state
  const [vendor, setVendor] = useState(null);
  const [serviceListings, setServiceListings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [ratingBreakdown, setRatingBreakdown] = useState(null);
  const [similarVendors, setSimilarVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Saved / Bookmarked state
  const [isSaved, setIsSaved] = useState(false);
  const [savingAction, setSavingAction] = useState(false);

  // Booking Modal State
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedServiceForBooking, setSelectedServiceForBooking] = useState(null);

  // Review Form Modal State
  const [reviewEligibility, setReviewEligibility] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState(false);

  // Fetch Vendor Profile & Services
  const fetchProfileData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await vendorAPI.getById(id);

      if (res?.success && res.vendor) {
        setVendor(res.vendor);
        setServiceListings(res.serviceListings || []);
        setReviews(res.reviews || []);
        setRatingBreakdown(res.ratingBreakdown || null);
        setSimilarVendors(res.similarVendors || []);
      } else {
        setError('Professional profile not found.');
      }
    } catch (err) {
      console.error('Failed to load professional profile:', err);
      setError(err.response?.data?.message || 'Could not load professional profile. Please check the URL.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  // Check if saved by customer
  useEffect(() => {
    if (!user || user.role !== 'customer') return;
    const checkSaved = async () => {
      try {
        const res = await customerAPI.getProfile();
        if (res?.profile?.savedVendors && vendor) {
          const savedIds = res.profile.savedVendors.map(v => v.toString());
          const isBookmarked = savedIds.includes(vendor._id.toString()) || 
            (vendor.user?._id && savedIds.includes(vendor.user._id.toString()));
          setIsSaved(isBookmarked);
        }
      } catch (e) {
        // Silent fallback
      }
    };
    if (vendor) checkSaved();
  }, [user, vendor]);

  // Check review eligibility for logged in customer
  useEffect(() => {
    if (!user || user.role !== 'customer' || !vendor) return;
    const checkReviewElig = async () => {
      try {
        const vendorUserId = vendor.user?._id || vendor.user;
        const res = await reviewAPI.checkEligibility(vendorUserId);
        if (res?.success && res.eligible) {
          setReviewEligibility(res.booking);
        } else {
          setReviewEligibility(null);
        }
      } catch (e) {
        // Ignore check failure
      }
    };
    checkReviewElig();
  }, [user, vendor]);

  // Handle Save / Bookmark
  const handleToggleSave = async () => {
    if (!user) {
      navigate(`/login?redirect=/professionals/${id}`);
      return;
    }
    if (!vendor) return;
    try {
      setSavingAction(true);
      await customerAPI.toggleSavedVendor(vendor._id);
      setIsSaved(prev => !prev);
    } catch (err) {
      console.error('Error toggling saved professional:', err);
    } finally {
      setSavingAction(false);
    }
  };

  // Open booking modal
  const handleStartBooking = (service = null) => {
    if (!user) {
      navigate(`/login?redirect=/professionals/${id}`);
      return;
    }
    setSelectedServiceForBooking(service);
    setIsBookingModalOpen(true);
  };

  // Handle Message
  const handleMessage = () => {
    if (!user) {
      navigate(`/login?redirect=/professionals/${id}`);
      return;
    }
    const vendorUserId = vendor?.user?._id || vendor?.user;
    navigate(`/customer/messages?recipientId=${vendorUserId}`);
  };

  // Submit Review
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) {
      setReviewError('Please write your review feedback.');
      return;
    }
    try {
      setSubmittingReview(true);
      setReviewError('');
      const vendorUserId = vendor?.user?._id || vendor?.user;
      const res = await reviewAPI.createReview({
        vendorId: vendorUserId,
        bookingId: reviewEligibility?._id || null,
        rating: newRating,
        comment: newComment.trim()
      });

      if (res?.success) {
        setReviewSuccess(true);
        if (res.review) {
          setReviews(prev => [res.review, ...prev]);
        }
        setReviewEligibility(null);
        setTimeout(() => {
          setIsReviewModalOpen(false);
          setReviewSuccess(false);
          setNewComment('');
        }, 1500);
      } else {
        setReviewError(res?.message || 'Failed to submit review.');
      }
    } catch (err) {
      console.error('Review submit error:', err);
      setReviewError(err.response?.data?.message || 'Failed to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="py-32 flex items-center justify-center">
        <Loader text="Loading professional profile..." />
      </div>
    );
  }

  if (error || !vendor) {
    return (
      <div className="max-w-xl mx-auto py-24 px-4 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8 text-rose-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Professional Not Found</h2>
        <p className="text-xs sm:text-sm text-slate-600">
          The requested professional profile could not be found or is temporarily unavailable.
        </p>
        <Link to="/professionals">
          <Button variant="primary" size="md">
            Browse All Professionals
          </Button>
        </Link>
      </div>
    );
  }

  // Profile data normalization
  const vendorName = vendor.user?.name || 'Professional Specialist';
  const businessName = vendor.businessName || vendorName;
  const avatarUrl = vendor.user?.avatar || vendor.avatar;
  const mainCategory = vendor.categories?.[0]?.name || 'Specialized Technical Trades';
  const isVerified = vendor.verifiedBadge?.status === 'verified';
  const completedJobs = vendor.completedJobsCount || 0;
  const hourlyRate = vendor.hourlyRate || 500;
  const isAvailableNow = vendor.availability?.isAvailableNow !== false;

  // Real review stats
  const totalReviewsCount = ratingBreakdown?.totalReviews ?? (reviews.length || vendor.reviewCount || 0);
  const averageRatingVal = ratingBreakdown?.averageRating ?? (vendor.rating || 5.0);
  const breakdown = ratingBreakdown?.breakdown || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  const percentages = ratingBreakdown?.percentages || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

  // Combine services from published ServiceListing collection and vendor.services
  const allServices = [];
  if (serviceListings && serviceListings.length > 0) {
    serviceListings.forEach(l => {
      allServices.push({
        _id: l._id,
        title: l.title,
        description: l.shortSummary || l.description,
        pricingType: l.pricing?.type || 'fixed',
        price: l.pricing?.amount || l.pricing?.minPrice || 0,
        maxPrice: l.pricing?.maxPrice || 0,
        unit: l.pricing?.unit || 'per service',
        duration: l.duration || '1 - 2 hours',
        visitFee: l.pricing?.visitFee || 0,
        isListing: true,
        category: l.category?.name || l.subcategory || mainCategory,
        inclusions: [
          'Diagnostic check and safety inspection',
          'Standard labor & tools provided',
          'Workmanship guarantee'
        ],
        exclusions: [
          'Material and replacement part costs'
        ]
      });
    });
  }

  if (vendor.services && vendor.services.length > 0) {
    vendor.services.forEach((s, idx) => {
      // Only include active services
      if (s.isActive === false) return;
      // Avoid duplicate titles
      if (!allServices.some(existing => existing.title.toLowerCase() === s.title.toLowerCase())) {
        allServices.push({
          _id: s._id || `vendor-srv-${idx}`,
          title: s.title,
          description: s.description || 'Verified trade skill executed according to WorkLogy safety standards.',
          pricingType: s.pricingType || 'fixed',
          price: s.price != null ? s.price : hourlyRate,
          duration: s.duration || '1 - 2 hours',
          unit: s.pricingType === 'quote' ? 'quote basis' : (s.pricingType === 'hourly' ? 'per hour' : 'fixed price'),
          category: s.categoryName || s.category?.name || mainCategory,
          inclusions: ['Direct on-site diagnosis and repair', 'Certified safety compliance testing'],
          exclusions: ['Parts replacement billed separately if needed']
        });
      }
    });
  }

  // Service Areas
  const serviceAreaNames = vendor.serviceAreas && vendor.serviceAreas.length > 0
    ? vendor.serviceAreas.map(a => a.name).join(', ')
    : 'Lucknow Metro, Gomti Nagar, Indira Nagar, Hazratganj & nearby areas';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8">
      
      {/* ── 1. PROFESSIONAL PROFILE HEADER ── */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          
          {/* Pro Identity & Info */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-6 min-w-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={businessName}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover ring-2 ring-emerald-600/30 border border-slate-200 shadow-2xs shrink-0"
              />
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-emerald-800 text-white font-black text-2xl flex items-center justify-center ring-2 ring-emerald-600/30 shadow-2xs shrink-0">
                {businessName.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
                  {businessName}
                </h1>
                <VerifiedBadge status={vendor.verifiedBadge?.status || (isVerified ? 'verified' : 'not_submitted')} size="sm" />
              </div>

              <p className="text-xs sm:text-sm text-slate-600 font-medium">
                <span className="font-bold text-slate-800">{vendorName}</span> · {mainCategory}
              </p>

              {/* Badges: Rating, Reviews, Completed Jobs, Availability */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs pt-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                  <span>{averageRatingVal.toFixed(2)} out of 5</span>
                  <span className="text-slate-400 font-normal">
                    ({totalReviewsCount} {totalReviewsCount === 1 ? 'review' : 'reviews'})
                  </span>
                </div>

                <span className="text-slate-300">·</span>

                <div className="flex items-center gap-1 text-slate-700 font-semibold">
                  <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>{completedJobs} completed jobs</span>
                </div>

                <span className="text-slate-300">·</span>

                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${isAvailableNow ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                  <span className="text-xs font-medium text-slate-700">
                    {isAvailableNow ? 'Available for New Jobs' : 'Accepting Scheduled Bookings'}
                  </span>
                </div>

                {vendor.emergencyAvailability?.isAvailable && (
                  <>
                    <span className="text-slate-300">·</span>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300">
                      <Zap className="w-3 h-3 fill-amber-500 text-amber-600" />
                      <span>Available for Emergency Service ({vendor.emergencyAvailability.hours?.is24x7 ? '24/7' : `${vendor.emergencyAvailability.hours?.start || '08:00'} - ${vendor.emergencyAvailability.hours?.end || '22:00'}`})</span>
                    </div>
                  </>
                )}
              </div>

              {/* Service Area */}
              <p className="text-xs text-slate-500 flex items-center gap-1.5 pt-0.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{serviceAreaNames}</span>
              </p>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 pt-2 lg:pt-0 shrink-0">
            <button
              onClick={handleToggleSave}
              disabled={savingAction}
              className={`p-2.5 rounded-xl border transition flex items-center justify-center gap-1.5 text-xs font-semibold ${
                isSaved 
                  ? 'bg-rose-50 border-rose-200 text-rose-700' 
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
              title={isSaved ? 'Saved to your saved professionals' : 'Save professional'}
              aria-label="Save professional"
            >
              <Heart className={`w-4 h-4 ${isSaved ? 'fill-rose-600 text-rose-600' : 'text-slate-500'}`} />
              <span className="hidden sm:inline">{isSaved ? 'Saved' : 'Save'}</span>
            </button>

            <Button
              variant="outline"
              size="md"
              icon={MessageSquare}
              onClick={handleMessage}
              className="text-xs sm:text-sm font-semibold"
            >
              Message Professional
            </Button>

            <Button
              variant="primary"
              size="md"
              icon={Calendar}
              onClick={() => handleStartBooking(null)}
              className="text-xs sm:text-sm font-bold !bg-emerald-700 hover:!bg-emerald-800 shadow-xs"
            >
              Book a Service
            </Button>
          </div>

        </div>
      </div>

      {/* ── Main Two-Column Layout (Desktop: Wide Left Column + Sticky Right Column) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* ── LEFT MAIN CONTENT COLUMN (8 of 12 Cols) ── */}
        <div className="lg:col-span-8 space-y-8">

          {/* ── 2. SERVICES OFFERED ── */}
          <section className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-2xs space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Services Offered
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Every service and specialty provided directly by {businessName}.
                </p>
              </div>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                {allServices.length} {allServices.length === 1 ? 'Service' : 'Services'}
              </span>
            </div>

            {allServices.length > 0 ? (
              <div className="space-y-4">
                {allServices.map((service) => {
                  const isQuote = service.pricingType === 'quote';
                  const isHourly = service.pricingType === 'hourly' || service.unit?.includes('hour');
                  const isStarting = service.pricingType === 'starting' || service.pricingType === 'range';

                  return (
                    <div 
                      key={service._id} 
                      className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/90 hover:border-emerald-600/50 hover:bg-emerald-50/10 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                    >
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        <img 
                          src={getServiceImage(service.category, service.title)} 
                          alt={service.title} 
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.style.display = 'none';
                          }}
                          className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-200 hidden sm:block shadow-2xs" 
                        />
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                            {service.category}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                            {isQuote ? 'Quote Required' : isHourly ? 'Hourly Rate' : 'Fixed Price'}
                          </span>
                        </div>

                        <h3 className="font-extrabold text-slate-900 text-base group-hover:text-emerald-900 transition-colors">
                          {service.title}
                        </h3>

                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {service.description}
                        </p>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
                          <span className="flex items-center gap-1 text-[11px]">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>Estimated {service.duration}</span>
                          </span>
                          <span>·</span>
                          <span className="text-[11px] text-emerald-800 font-semibold">
                            Available in {vendor.city || 'Lucknow'}
                          </span>
                        </div>
                      </div>
                    </div>

                      {/* Pricing & Booking Action */}
                      <div className="sm:text-right shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-200/80 flex sm:flex-col justify-between sm:justify-center items-center sm:items-end gap-3">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block sm:text-right">
                            {isQuote ? 'Inspection Quote' : isStarting ? 'Starting from' : 'Service Price'}
                          </span>
                          <span className="text-xl sm:text-2xl font-black text-emerald-800">
                            {isQuote ? 'On-Site Quote' : formatCurrency(service.price)}
                          </span>
                          {!isQuote && (
                            <span className="text-[10px] text-slate-500 block sm:text-right">
                              {service.unit ? `(${service.unit})` : 'fixed'}
                            </span>
                          )}
                        </div>

                        <Button
                          variant="primary"
                          size="sm"
                          icon={Calendar}
                          onClick={() => handleStartBooking(service)}
                          className="!bg-emerald-700 hover:!bg-emerald-800 text-xs font-bold whitespace-nowrap"
                        >
                          Book This Service
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Wrench className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">
                    No custom service packages listed
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    This professional provides specialized work based on direct diagnostic assessment and their standard rate of {formatCurrency(hourlyRate)}/hr.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleStartBooking(null)}
                  className="text-xs font-semibold"
                >
                  Book Professional Directly
                </Button>
              </div>
            )}
          </section>

          {/* ── 3. RATINGS & CUSTOMER REVIEWS ── */}
          <section className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-2xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 gap-2">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Ratings & Reviews
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Genuine verified reviews from customers who completed jobs with {vendorName}.
                </p>
              </div>

              {reviewEligibility && (
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Star}
                  onClick={() => setIsReviewModalOpen(true)}
                  className="self-start sm:self-auto text-xs font-bold text-emerald-800 border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
                >
                  Write a Review
                </Button>
              )}
            </div>

            {/* Rating Summary & Breakdown Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-5 sm:p-6 rounded-2xl bg-slate-50/80 border border-slate-200/90">
              
              {/* Left Score Block */}
              <div className="md:col-span-5 flex flex-col justify-center items-center text-center p-4 border-b md:border-b-0 md:border-r border-slate-200">
                <span className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
                  {averageRatingVal.toFixed(1)}
                </span>
                <span className="text-xs text-slate-500 mt-1 font-medium">out of 5 stars</span>
                <div className="flex items-center gap-1 text-amber-500 my-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-4 h-4 sm:w-5 sm:h-5 ${
                        s <= Math.round(averageRatingVal) ? 'fill-amber-500 text-amber-500' : 'text-slate-300'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-slate-600 font-semibold">
                  Based on {totalReviewsCount} verified {totalReviewsCount === 1 ? 'review' : 'reviews'}
                </p>
              </div>

              {/* Right 5-Star to 1-Star Breakdown */}
              <div className="md:col-span-7 space-y-2 flex flex-col justify-center">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const count = breakdown[stars] || 0;
                  const pct = percentages[stars] || 0;

                  return (
                    <div key={stars} className="flex items-center gap-3 text-xs">
                      <span className="w-12 font-bold text-slate-700 flex items-center gap-1 justify-end shrink-0">
                        {stars} <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full bg-emerald-700 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-16 text-slate-500 font-medium text-right shrink-0">
                        {count} {count === 1 ? 'review' : 'reviews'}
                      </span>
                    </div>
                  );
                })}
              </div>

            </div>

            {/* Reviews List */}
            {reviews.length > 0 ? (
              <div className="space-y-4 pt-2">
                {reviews.map((rev) => (
                  <div key={rev._id} className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {rev.customer?.avatar ? (
                          <img
                            src={rev.customer.avatar}
                            alt={rev.customer.name}
                            className="w-10 h-10 rounded-full object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-emerald-800 text-white font-bold text-xs flex items-center justify-center">
                            {rev.customer?.name?.[0]?.toUpperCase() || 'C'}
                          </div>
                        )}
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">
                            {rev.customer?.name || 'Verified Customer'}
                          </h4>
                          <span className="text-[11px] text-slate-500">
                            {formatDate(rev.createdAt)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                          <span>Verified Booking</span>
                        </span>
                        <div className="flex items-center gap-0.5 text-amber-500">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3.5 h-3.5 ${
                                s <= rev.rating ? 'fill-amber-500 text-amber-500' : 'text-slate-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                      {rev.comment}
                    </p>

                    {/* Pro Response if any */}
                    {rev.response?.text && (
                      <div className="mt-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                          Response from {businessName}:
                        </span>
                        <p className="text-slate-600 leading-relaxed">{rev.response.text}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs sm:text-sm text-slate-500 bg-slate-50/60 rounded-2xl border border-slate-200 p-6">
                <p className="font-semibold text-slate-700">No reviews yet.</p>
                <p className="mt-1">Reviews will appear here after customers complete their booked jobs.</p>
              </div>
            )}
          </section>

          {/* ── 4. ABOUT THIS PROFESSIONAL ── */}
          <section className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-2xs space-y-5">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight pb-3 border-b border-slate-100">
              About This Professional
            </h2>

            <div className="space-y-4">
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                {vendor.bio || vendor.tagline || `${businessName} is a verified professional service provider based in ${vendor.city || 'Lucknow'}, delivering quality craftsmanship and transparent pricing.`}
              </p>

              {/* Fast Facts Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {vendor.experienceYears && (
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                    <span className="font-bold text-slate-700 block">Experience:</span>
                    <span className="text-slate-600">{vendor.experienceYears} Years in Trade Operations</span>
                  </div>
                )}

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                  <span className="font-bold text-slate-700 block">Properties Served:</span>
                  <span className="text-slate-600">Residential Homes, Apartments & Commercial Offices</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                  <span className="font-bold text-slate-700 block">Languages Spoken:</span>
                  <span className="text-slate-600">Hindi, English</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                  <span className="font-bold text-slate-700 block">Working Hours:</span>
                  <span className="text-slate-600">
                    {vendor.availability?.hours?.start || '09:00 AM'} - {vendor.availability?.hours?.end || '07:00 PM'} (Mon - Sat)
                  </span>
                </div>
              </div>

              {/* Skills Tags */}
              {vendor.categories && vendor.categories.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-bold text-slate-700 block">Key Trade Disciplines:</span>
                  <div className="flex flex-wrap gap-2">
                    {vendor.categories.map((c) => (
                      <span 
                        key={c._id}
                        className="text-xs font-semibold text-emerald-900 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200/80"
                      >
                        {c.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Skills & Specialties */}
              {vendor.skills && vendor.skills.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-bold text-slate-700 block">Skills & Specialties:</span>
                  <div className="flex flex-wrap gap-2">
                    {vendor.skills.map((skill, sIdx) => (
                      <span 
                        key={sIdx}
                        className="text-xs font-medium text-slate-800 bg-slate-100 px-3 py-1 rounded-xl border border-slate-200"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Verified Trade Qualifications & Licenses */}
              {vendor.qualifications && vendor.qualifications.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-bold text-slate-700 block">Verified Trade Qualifications & Licenses:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {vendor.qualifications.map((q, qIdx) => (
                      <div key={qIdx} className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/80 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <Award className="w-4 h-4 text-emerald-700 shrink-0" />
                          <div>
                            <span className="font-bold text-slate-900 block">{q.title}</span>
                            {q.issuer && <span className="text-[11px] text-slate-600">{q.issuer}</span>}
                          </div>
                        </div>
                        {q.year && <span className="text-[11px] font-bold text-emerald-800">{q.year}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Work Portfolio Images */}
              {vendor.portfolio && vendor.portfolio.length > 0 && (
                <div className="space-y-2 pt-3">
                  <span className="text-xs font-bold text-slate-700 block">Completed Work Portfolio:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {vendor.portfolio.map((item, pIdx) => (
                      <div key={pIdx} className="rounded-2xl overflow-hidden border border-slate-200 group bg-slate-50">
                        <img 
                          src={item.image} 
                          alt={item.title || 'Work sample'} 
                          className="w-full h-28 sm:h-32 object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=400&q=80';
                          }}
                        />
                        <div className="p-2">
                          <p className="text-xs font-bold text-slate-900 truncate">{item.title}</p>
                          {item.description && <p className="text-[10px] text-slate-500 truncate">{item.description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ── 5. PRICES & PACKAGES ── */}
          <section className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-2xs space-y-6">
            <div className="pb-3 border-b border-slate-100">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Prices & Packages
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Transparent pricing structures and inclusions for common job scopes.
              </p>
            </div>

            {/* Pricing Type Explanations */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-xs space-y-1">
                <span className="font-bold text-emerald-950 block">Fixed Price</span>
                <p className="text-emerald-800 text-[11px] leading-relaxed">
                  Known set cost for clearly defined tasks and standard installations.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/80 text-xs space-y-1">
                <span className="font-bold text-blue-950 block">Hourly Rate</span>
                <p className="text-blue-800 text-[11px] leading-relaxed">
                  Billed per hour spent ({formatCurrency(hourlyRate)}/hr) for complex or exploratory troubleshooting.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs space-y-1">
                <span className="font-bold text-amber-950 block">Inspection Required</span>
                <p className="text-amber-800 text-[11px] leading-relaxed">
                  On-site physical inspection before confirming final contract scope.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-xs space-y-1">
                <span className="font-bold text-slate-900 block">Custom Quote</span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Tailored proposal for large remodels, custom piping or heavy renovations.
                </p>
              </div>
            </div>

            {/* Detailed Packages List */}
            {allServices.length > 0 && (
              <div className="space-y-4 pt-2">
                <h3 className="text-sm font-bold text-slate-800">
                  Standard Scope Inclusions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {allServices.slice(0, 4).map((pkg) => (
                    <div key={pkg._id} className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-2xs">
                      <div className="flex items-start gap-3">
                        <img
                          src={getServiceImage(pkg.category, pkg.title)}
                          alt={pkg.title}
                          className="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-200"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-bold text-slate-900 text-sm truncate">{pkg.title}</h4>
                            <span className="text-sm font-black text-emerald-800 shrink-0">
                              {formatCurrency(pkg.price)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <span className="font-semibold text-slate-700 block text-[11px]">Included Work:</span>
                        {pkg.inclusions.map((inc, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-slate-600 text-[11px]">
                            <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                            <span>{inc}</span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] text-slate-500">Duration: {pkg.duration}</span>
                        <button
                          type="button"
                          onClick={() => handleStartBooking(pkg)}
                          className="text-xs font-bold text-emerald-800 hover:underline"
                        >
                          Book Package →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* ── 6. LICENSE & VERIFICATION ── */}
          <section className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-2xs space-y-5">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight pb-3 border-b border-slate-100">
              License & Verification
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-emerald-700 text-white shrink-0 mt-0.5">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-emerald-950 text-sm">Identity & Background Verification</h4>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    {isVerified ? 'Government Photo ID and National Database Verified' : 'Under Periodic Review'}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-emerald-700 text-white shrink-0 mt-0.5">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-emerald-950 text-sm">Trade Competency & License</h4>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    {vendor.verifiedBadge?.documents?.[0]?.name || 'Trade License & Safety Compliance Checked'}
                  </p>
                </div>
              </div>
            </div>

            {vendor.verifiedBadge?.verifiedAt && (
              <p className="text-xs text-slate-500 pt-1">
                Verification confirmed on: {formatDate(vendor.verifiedBadge.verifiedAt)}
              </p>
            )}
          </section>

          {/* ── 7. WORKING HOURS AND SERVICE AREAS ── */}
          <section className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-2xs space-y-5">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight pb-3 border-b border-slate-100">
              Working Hours & Service Areas
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Working Hours */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Weekly Operating Schedule
                </h3>
                <div className="space-y-2 text-xs">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
                    <div key={day} className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="font-semibold text-slate-800">{day}</span>
                      <span className="text-slate-600">
                        {vendor.availability?.hours?.start || '09:00 AM'} - {vendor.availability?.hours?.end || '07:00 PM'}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between py-1 text-slate-400">
                    <span className="font-medium">Sunday</span>
                    <span>Emergency / By Appointment Only</span>
                  </div>
                </div>
              </div>

              {/* Service Areas */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Coverage Radius & Localities
                </h3>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                    <MapPin className="w-4 h-4 text-emerald-700" />
                    <span>Primary Base: {vendor.city || 'Lucknow'}, Uttar Pradesh</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    Provides dispatch and on-site trade services throughout {serviceAreaNames}.
                  </p>
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Travel Radius: 25 km</span>
                    <span className="text-emerald-800 font-semibold">Home Visit Included</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── 8. SIMILAR PROFESSIONALS ── */}
          {similarVendors && similarVendors.length > 0 && (
            <section className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-2xs space-y-5">
              <div className="pb-3 border-b border-slate-100">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Similar Verified Professionals
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Other top-rated specialists in {mainCategory}.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {similarVendors.map((sim) => (
                  <div 
                    key={sim._id} 
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-emerald-600/60 transition space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5">
                        {sim.user?.avatar ? (
                          <img
                            src={sim.user.avatar}
                            alt={sim.businessName}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-emerald-800 text-white font-bold text-xs flex items-center justify-center">
                            {sim.businessName?.[0]?.toUpperCase() || 'P'}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-900 text-xs truncate">
                            {sim.businessName}
                          </h4>
                          <span className="text-[10px] text-slate-500 block truncate">
                            {sim.user?.name}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-xs text-amber-600 font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                        <span>{sim.rating || 4.9}</span>
                        <span className="text-slate-400 font-normal">({sim.reviewCount || 10})</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between">
                      <span className="text-xs font-black text-emerald-800">
                        {formatCurrency(sim.hourlyRate || 500)}/hr
                      </span>
                      <Link
                        to={`/professionals/${sim._id}`}
                        className="text-xs font-bold text-emerald-800 hover:underline"
                      >
                        View Profile →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>

        {/* ── RIGHT STICKY ACTION PANEL (4 of 12 Cols) ── */}
        <aside className="lg:col-span-4 lg:sticky lg:top-24 space-y-5">
          
          {/* Main Booking Card */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-5">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Standard Professional Rate
              </span>
              <div className="text-3xl font-black text-emerald-800 mt-0.5">
                {formatCurrency(hourlyRate)}
                <span className="text-xs font-normal text-slate-500"> / hour</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Fixed service packages also available above.
              </p>
            </div>

            {/* Availability Badge */}
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/70 flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-emerald-950 block">Next Available Slot</span>
                <span className="text-emerald-800">Tomorrow, 10:00 AM - 01:00 PM</span>
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="space-y-2.5 pt-1">
              <Button
                variant="primary"
                size="md"
                icon={Calendar}
                onClick={() => handleStartBooking(null)}
                className="w-full justify-center !bg-emerald-700 hover:!bg-emerald-800 font-bold text-sm shadow-xs"
              >
                Book This Specialist
              </Button>

              <Button
                variant="outline"
                size="md"
                icon={MessageSquare}
                onClick={handleMessage}
                className="w-full justify-center text-xs font-semibold"
              >
                Message Professional
              </Button>
            </div>

            {/* Quick Metrics */}
            <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Response Time:</span>
                <span className="font-semibold text-slate-900">Within 15 minutes</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Jobs Completed:</span>
                <span className="font-semibold text-slate-900">{completedJobs}+ verified</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Payment Protection:</span>
                <span className="font-semibold text-emerald-800">100% Escrow Guarded</span>
              </div>
            </div>

            {/* Payment Protection Trust Box */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>WorkLogy Payment Protection</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-600">
                Your payment is held safely until the work is completed and you approve it.
              </p>
            </div>

            {/* Alternative: Request a Service Workflow */}
            <div className="text-center pt-2">
              <p className="text-xs text-slate-500">
                Want to receive multiple quotes?
              </p>
              <Link 
                to="/customer/create-job"
                className="text-xs font-bold text-emerald-800 hover:underline inline-flex items-center gap-1 mt-1"
              >
                <span>Post an Open Service Request</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

        </aside>

      </div>

      {/* ── Direct Booking Modal ── */}
      {isBookingModalOpen && (
        <DirectBookingModal
          vendor={vendor}
          preselectedService={selectedServiceForBooking}
          isOpen={isBookingModalOpen}
          onClose={() => {
            setIsBookingModalOpen(false);
            setSelectedServiceForBooking(null);
          }}
          onBookingSuccess={() => {
            setIsBookingModalOpen(false);
            setSelectedServiceForBooking(null);
            navigate('/customer/bookings');
          }}
        />
      )}

      {/* ── Write Review Modal for Eligible Customers ── */}
      {isReviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-black text-slate-900 text-lg">Leave a Review</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  For your completed job: {reviewEligibility?.serviceTitle || 'Home Service'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsReviewModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {reviewSuccess ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <h4 className="font-bold text-slate-900 text-sm">Review Submitted!</h4>
                <p className="text-xs text-slate-600">Thank you for rating your service experience.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="space-y-4">
                {reviewError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{reviewError}</span>
                  </div>
                )}

                {/* Star Selector */}
                <div className="space-y-1.5 text-center">
                  <label className="text-xs font-bold text-slate-700 block">
                    Your Rating
                  </label>
                  <div className="flex items-center justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setNewRating(star)}
                        className="p-1 hover:scale-110 transition"
                      >
                        <Star
                          className={`w-7 h-7 ${
                            star <= newRating ? 'fill-amber-500 text-amber-500' : 'text-slate-200'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <span className="text-xs font-bold text-amber-700">
                    {newRating} out of 5 stars
                  </span>
                </div>

                {/* Comment Textarea */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">
                    Your Review Feedback
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Describe the quality of work, punctuality, and professionalism..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-transparent text-slate-900 placeholder:text-slate-400"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    onClick={() => setIsReviewModalOpen(false)}
                    disabled={submittingReview}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    loading={submittingReview}
                    disabled={submittingReview}
                    className="!bg-emerald-700 hover:!bg-emerald-800 font-bold"
                  >
                    Submit Review
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

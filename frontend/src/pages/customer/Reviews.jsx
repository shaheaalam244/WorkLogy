import React, { useState, useEffect } from 'react';
import { Star, ShieldCheck, CheckCircle2, AlertCircle, MessageSquare } from 'lucide-react';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import { reviewAPI } from '../../api/review.api';
import { customerAPI } from '../../api/customer.api';
import { formatRelativeTime } from '../../utils/formatters';

export default function CustomerReviews() {
  const [completedBookings, setCompletedBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEligibleOrders = async () => {
      try {
        setLoading(true);
        const res = await customerAPI.getBookings({ status: 'completed' });
        if (res?.bookings) {
          setCompletedBookings(res.bookings);
          if (res.bookings.length > 0) {
            setSelectedBooking(res.bookings[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load completed orders:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEligibleOrders();
  }, []);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!selectedBooking) return;
    setError(null);
    setSuccess(false);

    try {
      setSubmitting(true);
      const res = await reviewAPI.createReview({
        job: selectedBooking.job?._id || selectedBooking.job,
        vendor: selectedBooking.vendor?._id || selectedBooking.vendor,
        rating,
        comment
      });

      if (res?.success) {
        setSuccess(true);
        setComment('');
      }
    } catch (err) {
      console.error('Review submit error:', err);
      setError(err.response?.data?.message || 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Reviews & Ratings
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          Share your experience to help others hire with confidence and reward great work.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Review Form */}
        <div className="lg:col-span-7 bg-white border border-slate-200/90 shadow-2xs rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-900">Write a Review</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Only customers with completed work can leave reviews.
            </p>
          </div>

          {success && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>Thank you! Your verified review has been published to the professional's profile.</span>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <Loader text="Checking completed work..." />
          ) : completedBookings.length === 0 ? (
            <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500 space-y-2">
              <p className="font-semibold text-slate-700">No completed work ready for review yet.</p>
              <p>Once a professional completes your job and you approve it, you can leave a review here.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Completed Work *
                </label>
                <select
                  value={selectedBooking?._id}
                  onChange={(e) => {
                    const found = completedBookings.find(b => b._id === e.target.value);
                    if (found) setSelectedBooking(found);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                >
                  {completedBookings.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.serviceTitle} — Pro: {b.vendor?.name} (#{b.bookingReference})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Overall Rating *
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setRating(star)}
                      className="p-1 hover:scale-110 transition"
                    >
                      <Star 
                        className={`w-6 h-6 ${
                          star <= rating 
                            ? 'text-amber-500 fill-amber-500' 
                            : 'text-slate-300'
                        }`} 
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-slate-700 ml-2">
                    {rating} of 5 Stars
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Your Review & Feedback *
                </label>
                <textarea
                  required
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share details about punctuality, cleanliness, craftsmanship, and communication..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={submitting}
                className="w-full sm:w-auto"
              >
                {submitting ? 'Submitting Review...' : 'Submit Review'}
              </Button>
            </form>
          )}
        </div>

        {/* Right Column: Review Policies & Guidance */}
        <div className="lg:col-span-5 bg-white border border-slate-200/90 shadow-2xs rounded-3xl p-6 sm:p-7 space-y-4">
          <div className="flex items-center gap-2 text-emerald-800">
            <ShieldCheck className="w-5 h-5 text-emerald-700" />
            <h3 className="font-bold text-sm text-slate-900">WorkLogy Trust Standards</h3>
          </div>

          <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
            <p>
              • <strong>Verified Work Only:</strong> Only customers who completed a booking with Payment Protection can leave reviews.
            </p>
            <p>
              • <strong>Fair Responses:</strong> Professionals are notified and can respond to your review.
            </p>
            <p>
              • <strong>Authentic Reviews:</strong> Reviews cannot be bought, altered, or hidden.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

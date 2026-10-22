import React, { useState, useEffect } from 'react';
import { Star, MessageSquare, CheckCircle2, AlertCircle, User } from 'lucide-react';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import { reviewAPI } from '../../api/review.api';

export default function VendorReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState({});
  const [replyingId, setReplyingId] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await reviewAPI.getMyReviews();
      if (res?.reviews) {
        setReviews(res.reviews);
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleReplySubmit = async (reviewId) => {
    const text = replyText[reviewId];
    if (!text || !text.trim()) return;

    try {
      setReplyingId(reviewId);
      const res = await reviewAPI.respondToReview(reviewId, text.trim());
      if (res?.success) {
        setSuccessMsg('Your response has been published to your public profile.');
        setReplyText(prev => ({ ...prev, [reviewId]: '' }));
        fetchReviews();
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err) {
      console.error('Error replying to review:', err);
    } finally {
      setReplyingId(null);
    }
  };

  if (loading) return <div className="py-20"><Loader text="Loading client feedback and ratings..." /></div>;

  return (
    <div className="space-y-6 w-full">
      <div>
        <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Reputation Management</span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5">Client Reviews & Star Ratings</h1>
        <p className="text-xs text-slate-600 mt-0.5">
          Verified property owner reviews from completed jobs in Lucknow. Respond to customer feedback.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700" />
          <span>{successMsg}</span>
        </div>
      )}

      {reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((rev) => (
            <div key={rev._id || rev.id} className="bg-white border border-slate-200 shadow-sm p-6 sm:p-7 rounded-3xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-sm">
                    {rev.customer?.name?.[0] || 'C'}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{rev.customer?.name || 'Verified Client'}</h4>
                    <div className="flex items-center gap-1 text-amber-500 text-xs mt-0.5">
                      {[...Array(rev.rating || 5)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-current" />
                      ))}
                      <span className="text-slate-400 ml-1.5 text-[11px]">
                        {new Date(rev.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  ✓ Verified Work Sign-Off
                </span>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed italic bg-slate-50 p-4 rounded-2xl border border-slate-100">
                "{rev.comment}"
              </p>

              {rev.response?.text ? (
                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 text-xs space-y-1">
                  <span className="font-bold text-emerald-900 block">Your Official Response:</span>
                  <p className="text-slate-700 leading-relaxed">{rev.response.text}</p>
                </div>
              ) : (
                <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                  <input
                    type="text"
                    placeholder="Write an official response visible to future homeowners..."
                    value={replyText[rev._id || rev.id] || ''}
                    onChange={(e) => setReplyText({ ...replyText, [rev._id || rev.id]: e.target.value })}
                    className="w-full sm:flex-1 bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700"
                  />
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    disabled={replyingId === (rev._id || rev.id)}
                    onClick={() => handleReplySubmit(rev._id || rev.id)}
                    className="w-full sm:w-auto"
                  >
                    {replyingId === (rev._id || rev.id) ? 'Posting...' : 'Post Public Reply'}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3">
          <Star className="w-8 h-8 text-amber-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">No Reviews Received Yet</h3>
          <p className="text-xs text-slate-600 max-w-sm mx-auto">
            Once you complete bookings, homeowners submit verified reviews and ratings that appear on your profile.
          </p>
        </div>
      )}
    </div>
  );
}

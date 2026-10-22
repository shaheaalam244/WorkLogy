import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  ShieldCheck, 
  Activity, 
  MessageSquare, 
  XCircle, 
  AlertCircle, 
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  User,
  DollarSign,
  Lock,
  Layers,
  Sparkles,
  Info,
  ArrowRight,
  X,
  FileText,
  AlertTriangle,
  Star
} from 'lucide-react';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import ServiceStartOtpCard from '../../components/booking/ServiceStartOtpCard';
import { customerAPI } from '../../api/customer.api';
import { reviewAPI } from '../../api/review.api';
import { formatCurrency, formatRelativeTime, formatFullAddress, formatDate } from '../../utils/formatters';
import { getServiceImage } from '../../constants/serviceImages';

const TABS = [
  { id: 'all', label: 'All Jobs' },
  { id: 'awaiting_response', label: 'Waiting for Response' },
  { id: 'quotations_received', label: 'Offers Received' },
  { id: 'confirmed', label: 'Confirmed Jobs' },
  { id: 'on_the_way', label: 'On the Way' },
  { id: 'in_progress', label: 'Current Work' },
  { id: 'completed', label: 'Completed Work' },
  { id: 'cancelled', label: 'Cancelled' }
];

export default function CustomerBookings() {
  const [searchParams] = useSearchParams();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'all');
  const [cancellingId, setCancellingId] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState(null);

  // Review submission state
  const [reviewModal, setReviewModal] = useState({
    open: false,
    booking: null,
    rating: 5,
    hoverRating: 0,
    comment: '',
    submitting: false,
    error: '',
    success: false
  });

  // Review view modal state
  const [viewReviewModal, setViewReviewModal] = useState({
    open: false,
    booking: null,
    review: null
  });

  const RATING_DESCRIPTIONS = {
    5: '5 Stars · Excellent — Exceptional workmanship, on-time & courteous',
    4: '4 Stars · Good — Satisfied with the completed job',
    3: '3 Stars · Average — Met standard expectations',
    2: '2 Stars · Poor — Subpar quality or significant delays',
    1: '1 Star · Terrible — Highly unsatisfactory service'
  };

  const openRateReviewModal = (booking) => {
    setReviewModal({
      open: true,
      booking,
      rating: 5,
      hoverRating: 0,
      comment: '',
      submitting: false,
      error: '',
      success: false
    });
  };

  const openViewReviewModal = (booking, review) => {
    setViewReviewModal({
      open: true,
      booking,
      review: review || booking.review
    });
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    const { booking, rating, comment } = reviewModal;
    if (!booking) return;

    try {
      setReviewModal(prev => ({ ...prev, submitting: true, error: '' }));

      const bookingId = booking._id || booking.id;
      const res = await reviewAPI.submitBookingReview(bookingId, {
        rating: Number(rating),
        comment: (comment || '').trim()
      });

      if (res?.success) {
        setReviewModal(prev => ({ ...prev, submitting: false, success: true }));

        // Optimistically update local booking list
        setBookings(prev => prev.map(b => {
          if (b._id === bookingId) {
            return { ...b, hasReview: true, review: res.review };
          }
          return b;
        }));

        if (selectedOrderForDetail && selectedOrderForDetail._id === bookingId) {
          setSelectedOrderForDetail(prev => ({ ...prev, hasReview: true, review: res.review }));
        }

        setTimeout(() => {
          setReviewModal({
            open: false,
            booking: null,
            rating: 5,
            hoverRating: 0,
            comment: '',
            submitting: false,
            error: '',
            success: false
          });
        }, 1500);
      }
    } catch (err) {
      console.error('Failed to submit review:', err);
      setReviewModal(prev => ({
        ...prev,
        submitting: false,
        error: err.response?.data?.message || 'Could not submit review. Please try again.'
      }));
    }
  };

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await customerAPI.getBookings({ status: activeTab });
      if (res?.bookings) {
        setBookings(res.bookings);
      }
    } catch (err) {
      console.error('Failed to load customer bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [activeTab]);

  const handleCancelBooking = async (bookingId) => {
    const reason = window.prompt('Please specify the cancellation reason:');
    if (!reason || !reason.trim()) return;

    try {
      setCancellingId(bookingId);
      const res = await customerAPI.cancelBooking(bookingId, reason.trim());
      if (res?.success) {
        setActionSuccess('Booking cancelled successfully. Any held escrow has been processed for refund.');
        fetchBookings();
      }
    } catch (err) {
      console.error('Cancellation error:', err);
      alert(err.response?.data?.message || 'Failed to cancel booking.');
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusBadge = (b) => {
    const status = b.status;
    if (status === 'pending_acceptance') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 uppercase">
          Awaiting Specialist Acceptance
        </span>
      );
    }
    if (status === 'quotations_received') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 uppercase">
          Quotations Received ({b.applicantsCount || 1})
        </span>
      );
    }
    if (status === 'open') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 uppercase">
          Open Lead · Awaiting Bids
        </span>
      );
    }
    if (['confirmed', 'scheduled', 'assigned'].includes(status)) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Confirmed & Assigned
        </span>
      );
    }
    if (status === 'on_the_way') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 uppercase animate-pulse flex items-center gap-1">
          <Activity className="w-3 h-3" /> Specialist On The Way
        </span>
      );
    }
    if (['in_progress', 'arrived'].includes(status)) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 uppercase flex items-center gap-1">
          <Activity className="w-3 h-3" /> Work In Progress
        </span>
      );
    }
    if (status === 'completed') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Completed
        </span>
      );
    }
    if (['cancelled', 'declined'].includes(status)) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 uppercase">
          {status === 'declined' ? 'Specialist Declined' : 'Cancelled'}
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
        {status?.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="space-y-6 w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Unified Customer Console</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            My Jobs & Bookings
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Track both open service requests and direct professional appointments in a single consolidated ledger.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/customer/explore">
            <Button variant="secondary" size="md">
              Find Specialist
            </Button>
          </Link>
          <Link to="/customer/create-job">
            <Button variant="primary" size="md">
              Post New Request
            </Button>
          </Link>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-xs font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto scrollbar-thin">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              activeTab === tab.id
                ? 'bg-emerald-800 text-white font-bold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="py-20">
          <Loader text="Loading your service requests & bookings..." />
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-md mx-auto shadow-2xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Orders in this View</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            {activeTab !== 'all' 
              ? `You currently have no orders in the "${TABS.find(t => t.id === activeTab)?.label}" category.`
              : 'You have not submitted any service requests or direct bookings yet.'}
          </p>
          <div className="pt-2 flex justify-center gap-2">
            <Link to="/customer/explore">
              <Button variant="secondary" size="sm">
                Explore Pros
              </Button>
            </Link>
            <Link to="/customer/create-job">
              <Button variant="primary" size="sm">
                Request Service
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {bookings.map((item) => {
            const isDirect = item.bookingType === 'direct_professional';
            const isConfirmedOrActive = ['confirmed', 'scheduled', 'assigned', 'on_the_way', 'arrived'].includes(item.status);
            const isInProgress = ['in_progress', 'arrived'].includes(item.status);
            const isCancellable = ['pending_acceptance', 'awaiting_confirmation', 'confirmed', 'scheduled'].includes(item.status);
            const hasQuotes = item.status === 'quotations_received' || (item.applicantsCount && item.applicantsCount > 0);
            const isCompleted = item.status === 'completed';

            return (
              <div 
                key={item._id}
                className="bg-white border border-slate-200 hover:border-slate-300 rounded-3xl p-6 shadow-2xs transition space-y-4"
              >
                {/* Header: Reference, Type Badge, Status */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-extrabold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                      #{item.bookingReference || `DIR-${item._id.slice(-6).toUpperCase()}`}
                    </span>

                    {/* Booking Type Pill */}
                    {isDirect ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-emerald-700" />
                        Direct Professional Booking
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1">
                        <Layers className="w-3 h-3 text-blue-700" />
                        Open Service Request
                      </span>
                    )}

                    {getStatusBadge(item)}
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Agreed / Budget</span>
                    <span className="text-xl font-black text-emerald-800">
                      {item.pricing?.amount > 0 ? formatCurrency(item.pricing.amount) : 'Quote Required'}
                    </span>
                  </div>
                </div>

                {/* Title & Service Details */}
                <div className="flex items-start gap-4">
                  <img
                    src={getServiceImage(item.category?.name || item.category, item.serviceTitle || item.subcategory)}
                    alt={item.serviceTitle || 'Service Image'}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover shrink-0 border border-slate-200/90 shadow-2xs"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = '/vite.svg';
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-slate-900 leading-snug">
                      {item.serviceTitle}
                    </h3>
                    {item.problemDescription && (
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                        {item.problemDescription}
                      </p>
                    )}
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                  {/* Schedule */}
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Appointment</span>
                    <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      {new Date(item.scheduledDate || item.createdAt).toLocaleDateString('en-US', { 
                        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' 
                      })}
                    </span>
                    <span className="text-slate-500 block text-[11px] mt-0.5">
                      <Clock className="w-3 h-3 inline mr-1 text-slate-400" />
                      {item.timeSlot || 'Flexible Window'}
                    </span>
                  </div>

                  {/* Specialist or Lead Status */}
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                      {isDirect ? 'Your Professional' : item.vendor ? 'Your Professional' : 'Matching Status'}
                    </span>
                    {item.vendor ? (
                      <div>
                        <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                          <User className="w-3.5 h-3.5 text-emerald-700" />
                          <span>{item.vendor.businessName || item.vendor.name || 'Verified Pro'}</span>
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                        </span>
                        <span className="text-slate-500 block text-[11px]">{item.vendor.phone || 'Verified via WorkLogy'}</span>
                      </div>
                    ) : (
                      <div>
                        <span className="font-bold text-slate-800 block mt-0.5">
                          {hasQuotes ? `${item.applicantsCount} Contractors Quoted` : 'Dispatching to Local Pros'}
                        </span>
                        <span className="text-slate-500 block text-[11px]">
                          {hasQuotes ? 'Review bids in Proposals' : 'Vetted technicians being notified'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Payment State */}
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Payment Details</span>
                    <span className="font-bold text-emerald-800 capitalize flex items-center gap-1 mt-0.5">
                      <Lock className="w-3.5 h-3.5 text-emerald-700" />
                      {item.pricing?.paymentStatus ? (item.pricing.paymentStatus === 'held_in_escrow' ? 'Payment Protected' : item.pricing.paymentStatus.replace('_', ' ')) : 'Payment Protected'}
                    </span>
                    <span className="text-slate-500 block text-[11px]">Funds released only upon customer approval</span>
                  </div>
                </div>

                {/* Service Start OTP (Displayed ONLY if confirmed/scheduled/on_the_way/arrived) */}
                {isConfirmedOrActive && (
                  <ServiceStartOtpCard 
                    bookingId={item._id} 
                    status={item.status} 
                    initialOtp={item.startOtp?.otp} 
                  />
                )}

                {/* Footer: Full Service Address & Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-start gap-1.5 text-xs text-slate-600 max-w-xl">
                    <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                    <span className="leading-snug">
                      {formatFullAddress(item.address)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* View Details Modal Trigger */}
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={() => setSelectedOrderForDetail(item)}
                    >
                      View Details
                    </Button>

                    {/* Messages button if vendor is assigned */}
                    {item.vendor && (
                      <Link to={`/customer/messages?recipientId=${item.vendor._id || item.vendor.id || ''}&jobId=${item.job?._id || item.job || ''}`}>
                        <Button variant="secondary" size="sm" icon={MessageSquare}>
                          Message Pro
                        </Button>
                      </Link>
                    )}

                    {/* Review Quotations button if quotes received */}
                    {hasQuotes && !item.vendor && (
                      <Link to={`/customer/applications?jobId=${item.jobId || item._id}`}>
                        <Button variant="primary" size="sm">
                          Review {item.applicantsCount} Quotes →
                        </Button>
                      </Link>
                    )}

                    {/* Job Tracking */}
                    {isInProgress && (
                      <Link to={`/customer/tracking?bookingId=${item._id}`}>
                        <Button variant="primary" size="sm" icon={Activity}>
                          Track Job
                        </Button>
                      </Link>
                    )}

                    {/* Rate & Review Button for Completed Bookings */}
                    {isCompleted && item.vendor && !item.hasReview && !item.review && (
                      <button
                        onClick={() => openRateReviewModal(item)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition shadow-xs hover:shadow-md cursor-pointer"
                      >
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span>Rate & Review</span>
                      </button>
                    )}

                    {/* View Submitted Review Button */}
                    {isCompleted && (item.hasReview || item.review) && (
                      <button
                        onClick={() => openViewReviewModal(item, item.review)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold transition shadow-2xs cursor-pointer"
                      >
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                        <span>Reviewed ({item.review?.rating || 5}★)</span>
                      </button>
                    )}

                    {/* Cancel button */}
                    {isCancellable && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        disabled={cancellingId === item._id}
                        onClick={() => handleCancelBooking(item._id)}
                        className="text-rose-600 border-rose-200 hover:bg-rose-50"
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Comprehensive Order Detail Modal */}
      {selectedOrderForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto border border-slate-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  #{selectedOrderForDetail.bookingReference || selectedOrderForDetail._id}
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 mt-1">
                  {selectedOrderForDetail.serviceTitle}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedOrderForDetail(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status Timeline */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Service Progression</h4>
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 relative">
                <div className="text-center">
                  <div className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center mx-auto mb-1 text-xs">✓</div>
                  <span>Submitted</span>
                </div>
                <div className="text-center">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center mx-auto mb-1 text-xs ${
                    ['confirmed', 'scheduled', 'assigned', 'on_the_way', 'arrived', 'in_progress', 'completed'].includes(selectedOrderForDetail.status)
                      ? 'bg-emerald-700 text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}>
                    {['confirmed', 'scheduled', 'assigned', 'on_the_way', 'arrived', 'in_progress', 'completed'].includes(selectedOrderForDetail.status) ? '✓' : '2'}
                  </div>
                  <span>Confirmed</span>
                </div>
                <div className="text-center">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center mx-auto mb-1 text-xs ${
                    ['on_the_way', 'arrived', 'in_progress', 'completed'].includes(selectedOrderForDetail.status)
                      ? 'bg-emerald-700 text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}>
                    {['on_the_way', 'arrived', 'in_progress', 'completed'].includes(selectedOrderForDetail.status) ? '✓' : '3'}
                  </div>
                  <span>On The Way</span>
                </div>
                <div className="text-center">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center mx-auto mb-1 text-xs ${
                    ['in_progress', 'completed'].includes(selectedOrderForDetail.status)
                      ? 'bg-emerald-700 text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}>
                    {['in_progress', 'completed'].includes(selectedOrderForDetail.status) ? '✓' : '4'}
                  </div>
                  <span>In Progress</span>
                </div>
                <div className="text-center">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center mx-auto mb-1 text-xs ${
                    selectedOrderForDetail.status === 'completed'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}>
                    {selectedOrderForDetail.status === 'completed' ? '✓' : '5'}
                  </div>
                  <span>Completed</span>
                </div>
              </div>
            </div>

            {/* OTP Card if confirmed */}
            {['confirmed', 'scheduled', 'assigned', 'on_the_way', 'arrived'].includes(selectedOrderForDetail.status) && (
              <ServiceStartOtpCard 
                bookingId={selectedOrderForDetail._id} 
                status={selectedOrderForDetail.status} 
                initialOtp={selectedOrderForDetail.startOtp?.otp} 
              />
            )}

            {/* What Needs to Be Done */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">What Needs to Be Done</h4>
              <p className="text-xs text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-200 leading-relaxed">
                {selectedOrderForDetail.problemDescription || 'Standard service requested as per platform package specifications.'}
              </p>
            </div>

            {/* Location & Appointment Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Full Service Address</span>
                <span className="font-bold text-slate-800 block leading-relaxed">
                  {formatFullAddress(selectedOrderForDetail.address)}
                </span>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Payment Details</span>
                <span className="text-lg font-black text-emerald-800 block">
                  {selectedOrderForDetail.pricing?.amount > 0 ? formatCurrency(selectedOrderForDetail.pricing.amount) : 'Quote Pending'}
                </span>
                <span className="text-slate-600 block">Status: {selectedOrderForDetail.pricing?.paymentStatus === 'held_in_escrow' ? 'Payment Protected' : selectedOrderForDetail.pricing?.paymentStatus || 'Payment Protected'}</span>
                <span className="text-slate-500 block text-[11px]">Platform 100% Satisfaction Guarantee</span>
              </div>
            </div>

            {/* Completed Service Review Card inside Modal */}
            {selectedOrderForDetail.status === 'completed' && (
              <div>
                {!selectedOrderForDetail.hasReview && !selectedOrderForDetail.review ? (
                  <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                        <span>Rate Your Specialist</span>
                      </div>
                      <p className="text-[11px] text-amber-800 mt-0.5">
                        Share your experience with {selectedOrderForDetail.vendor?.name || 'this specialist'} to help the WorkLogy community and build trusted reputation.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const target = selectedOrderForDetail;
                        setSelectedOrderForDetail(null);
                        openRateReviewModal(target);
                      }}
                      className="shrink-0 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span>Rate & Review</span>
                    </button>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-800">Your Verified Review</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          ✓ Recorded
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-amber-500 text-xs">
                        {[...Array(selectedOrderForDetail.review?.rating || 5)].map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-current" />
                        ))}
                      </div>
                    </div>
                    {selectedOrderForDetail.review?.comment && (
                      <p className="text-xs text-slate-700 italic bg-white p-3 rounded-xl border border-slate-100">
                        "{selectedOrderForDetail.review.comment}"
                      </p>
                    )}
                    {selectedOrderForDetail.review?.response?.text && (
                      <div className="mt-2 text-xs bg-emerald-50/60 border border-emerald-100 p-2.5 rounded-xl space-y-1">
                        <span className="text-[10px] font-bold uppercase text-emerald-900 block">Pro Response:</span>
                        <p className="text-slate-700 italic">"{selectedOrderForDetail.review.response.text}"</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button 
                variant="secondary" 
                size="md"
                onClick={() => setSelectedOrderForDetail(null)}
              >
                Close
              </Button>
              {selectedOrderForDetail.vendor && (
                <Link to={`/customer/messages?recipientId=${selectedOrderForDetail.vendor._id || selectedOrderForDetail.vendor.id || ''}`}>
                  <Button variant="primary" size="md" icon={MessageSquare}>
                    Message Specialist
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rate & Review Modal */}
      {reviewModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 border border-slate-200">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  Verified Client Feedback
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  Rate & Review Service
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Order: <span className="font-semibold text-slate-800">{reviewModal.booking?.serviceTitle}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewModal(prev => ({ ...prev, open: false }))}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error banner */}
            {reviewModal.error && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{reviewModal.error}</span>
              </div>
            )}

            {/* Success banner */}
            {reviewModal.success && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
                <span>Thank you! Your verified review has been submitted and recorded.</span>
              </div>
            )}

            {!reviewModal.success && (
              <form onSubmit={handleSubmitReview} className="space-y-4">
                {/* Specialist info strip */}
                <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-black text-sm flex items-center justify-center shrink-0">
                    {reviewModal.booking?.vendor?.name?.[0] || 'P'}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      {reviewModal.booking?.vendor?.name || 'Verified Specialist'}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Completed job #{reviewModal.booking?.bookingReference || reviewModal.booking?._id?.slice(-6)}
                    </p>
                  </div>
                </div>

                {/* Star rating selector */}
                <div className="space-y-1.5 text-center py-2 bg-slate-50/70 rounded-2xl border border-slate-200/70 p-4">
                  <label className="text-xs font-bold text-slate-700 block">
                    Overall Satisfaction Rating *
                  </label>
                  <div 
                    className="flex items-center justify-center gap-2 py-1"
                    role="radiogroup"
                    aria-label="Star rating"
                  >
                    {[1, 2, 3, 4, 5].map((star) => {
                      const isFilled = star <= (reviewModal.hoverRating || reviewModal.rating);
                      return (
                        <button
                          key={star}
                          type="button"
                          tabIndex={0}
                          role="radio"
                          aria-checked={reviewModal.rating === star}
                          aria-label={`${star} star`}
                          onClick={() => setReviewModal(prev => ({ ...prev, rating: star }))}
                          onMouseEnter={() => setReviewModal(prev => ({ ...prev, hoverRating: star }))}
                          onMouseLeave={() => setReviewModal(prev => ({ ...prev, hoverRating: 0 }))}
                          className="p-1 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-400 transition transform hover:scale-115 active:scale-95 cursor-pointer"
                        >
                          <Star
                            className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                              isFilled
                                ? 'fill-amber-400 text-amber-500 drop-shadow-xs'
                                : 'text-slate-300 hover:text-slate-400'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] font-semibold text-amber-800 min-h-[18px]">
                    {RATING_DESCRIPTIONS[reviewModal.hoverRating || reviewModal.rating]}
                  </p>
                </div>

                {/* Written review textarea */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-bold text-slate-700">Written Review (Optional)</label>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {reviewModal.comment.length} / 1500
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    maxLength={1500}
                    value={reviewModal.comment}
                    onChange={(e) => setReviewModal(prev => ({ ...prev, comment: e.target.value }))}
                    placeholder="Tell us about the quality of work, punctuality, and professionalism. What stood out?"
                    className="w-full p-3 text-xs rounded-2xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-700 leading-relaxed"
                  />
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Your verified review will be displayed publicly on this professional's WorkLogy profile. Private contact information and home addresses are never published.
                  </p>
                </div>

                {/* Form Actions */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={() => setReviewModal(prev => ({ ...prev, open: false }))}
                    disabled={reviewModal.submitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    disabled={reviewModal.submitting}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white min-w-[140px]"
                  >
                    {reviewModal.submitting ? 'Submitting...' : 'Submit Review'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* View Submitted Review Modal */}
      {viewReviewModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 border border-slate-200">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                  ✓ Verified Review
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">Your Service Feedback</h3>
                <p className="text-xs text-slate-500 mt-0.5">{viewReviewModal.booking?.serviceTitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setViewReviewModal({ open: false, booking: null, review: null })}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-1 text-amber-500">
                  {[...Array(viewReviewModal.review?.rating || 5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                  <span className="font-bold text-slate-800 ml-1 text-xs">
                    {viewReviewModal.review?.rating || 5}.0
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">
                  {viewReviewModal.review?.createdAt ? formatDate(viewReviewModal.review.createdAt) : 'Recently'}
                </span>
              </div>

              {viewReviewModal.review?.comment ? (
                <p className="text-xs text-slate-700 italic bg-slate-50 p-3.5 rounded-2xl border border-slate-100 leading-relaxed">
                  "{viewReviewModal.review.comment}"
                </p>
              ) : (
                <p className="text-xs text-slate-400 italic">No written comment provided.</p>
              )}

              {viewReviewModal.review?.response?.text && (
                <div className="bg-emerald-50/70 border border-emerald-100 p-3 rounded-2xl space-y-1">
                  <span className="text-[10px] font-bold uppercase text-emerald-900 block">Specialist Response:</span>
                  <p className="text-xs text-slate-700 italic">"{viewReviewModal.review.response.text}"</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setViewReviewModal({ open: false, booking: null, review: null })}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

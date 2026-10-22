import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  MapPin, 
  MessageSquare, 
  CheckCircle2, 
  Clock, 
  Check, 
  AlertTriangle,
  AlertCircle,
  Calendar,
  KeyRound,
  ExternalLink,
  ChevronDown,
  ArrowRight,
  Star,
  X,
  FileText,
  UserCheck
} from 'lucide-react';
import JobStatusTracker from '../../components/job/JobStatusTracker';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import { formatCurrency, formatDate, formatFullAddress, getDisplayName } from '../../utils/formatters';
import { bookingAPI } from '../../api/booking.api';
import { customerAPI } from '../../api/customer.api';
import { useSocketContext } from '../../context/SocketContext';
import { getServiceImage } from '../../constants/serviceImages';

/**
 * Customer Job Tracking Page (`/customer/tracking`)
 * 
 * Simple, clean, customer-friendly interface with WorkLogy green-and-white theme.
 * Fully connected to MongoDB live backend with authorized completion & payment release flow.
 */
export default function CustomerRequestTracking() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { socket } = useSocketContext();

  const bookingIdParam = searchParams.get('bookingId') || searchParams.get('id');
  const jobIdParam = searchParams.get('jobId');

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [booking, setBooking] = useState(null);
  const [customerBookings, setCustomerBookings] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  // Approval & Payment Release Modal State
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalSubmitting, setApprovalSubmitting] = useState(false);
  const [approvalError, setApprovalError] = useState(null);
  const [approvalSuccess, setApprovalSuccess] = useState(false);

  // Fetch Booking or Active Customer Jobs
  const loadTrackingData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch customer's bookings list to support job switcher and fallback
      let allBookings = [];
      try {
        const bookingsRes = await customerAPI.getBookings();
        if (bookingsRes?.success && Array.isArray(bookingsRes.bookings)) {
          allBookings = bookingsRes.bookings;
          setCustomerBookings(allBookings);
        }
      } catch (listErr) {
        console.warn('Could not fetch customer bookings list:', listErr);
      }

      // 2. Identify target booking
      let targetBooking = null;

      if (bookingIdParam) {
        // Direct booking lookup
        const res = await bookingAPI.getById(bookingIdParam);
        if (res?.success && res.booking) {
          targetBooking = res.booking;
        }
      } else if (jobIdParam) {
        // Job-associated booking lookup
        const res = await bookingAPI.getByJobId(jobIdParam);
        if (res?.success && res.booking) {
          targetBooking = res.booking;
        } else if (res?.success && res.jobOnly && res.job) {
          // Open job request without booking yet
          targetBooking = {
            _id: res.job._id,
            isJobOnly: true,
            job: res.job,
            bookingReference: `REQ-${res.job._id.toString().slice(-6).toUpperCase()}`,
            serviceTitle: res.job.title,
            category: res.job.category?.name || 'Home Services',
            status: res.job.status || 'open',
            scheduledDate: res.job.preferredDate || res.job.createdAt,
            timeSlot: res.job.preferredTime || 'Flexible',
            address: res.job.location || {},
            pricing: {
              amount: res.job.budget?.amount || res.job.budget?.maxAmount || 0,
              platformFee: 0,
              paymentStatus: 'pending'
            }
          };
        }
      }

      // If no param or target not found, select the most relevant customer booking
      if (!targetBooking && allBookings.length > 0) {
        // Priority: completion_pending > in_progress > assigned > confirmed > scheduled > any
        const priorityOrder = ['completion_pending', 'in_progress', 'arrived', 'on_the_way', 'assigned', 'confirmed', 'scheduled', 'pending_acceptance', 'open'];
        let matched = null;
        for (const pStatus of priorityOrder) {
          matched = allBookings.find(b => b.status === pStatus);
          if (matched) break;
        }
        targetBooking = matched || allBookings[0];

        // If matched is full booking, fetch its complete populated details
        if (targetBooking?._id && !targetBooking.isJobRequest) {
          try {
            const fullRes = await bookingAPI.getById(targetBooking._id);
            if (fullRes?.success && fullRes.booking) {
              targetBooking = fullRes.booking;
            }
          } catch (e) {
            // Keep targetBooking from list
          }
        }
      }

      if (!targetBooking) {
        setBooking(null);
      } else {
        setBooking(targetBooking);
      }
    } catch (err) {
      console.error('Failed to load tracking data:', err);
      setError(err.response?.data?.message || 'Unable to load tracking details. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [bookingIdParam, jobIdParam]);

  useEffect(() => {
    loadTrackingData();
  }, [loadTrackingData]);

  // Real-time socket sync
  useEffect(() => {
    if (!socket) return;
    const handleStatusSync = (data) => {
      if (!booking || data?.bookingId === booking._id || data?.jobId === booking.job?._id || data?.jobId === booking._id) {
        loadTrackingData();
      }
    };
    socket.on('booking_status_updated', handleStatusSync);
    socket.on('booking_updated', handleStatusSync);
    socket.on('job_assigned', handleStatusSync);
    socket.on('job_updated', handleStatusSync);
    return () => {
      socket.off('booking_status_updated', handleStatusSync);
      socket.off('booking_updated', handleStatusSync);
      socket.off('job_assigned', handleStatusSync);
      socket.off('job_updated', handleStatusSync);
    };
  }, [socket, booking, loadTrackingData]);

  // Switch between customer jobs
  const handleSelectJob = (e) => {
    const selectedId = e.target.value;
    if (!selectedId) return;
    setSearchParams({ bookingId: selectedId });
  };

  // Handle Approve Work & Release Payment
  const handleApproveWorkAndReleasePayment = async () => {
    if (!booking?._id) return;
    try {
      setApprovalSubmitting(true);
      setApprovalError(null);

      const res = await bookingAPI.approveCompletion(booking._id, {
        note: 'Customer inspected and approved completed work.'
      });

      if (res?.success) {
        setApprovalSuccess(true);
        if (res.booking) {
          setBooking(res.booking);
        }
        setShowApprovalModal(false);
      } else {
        setApprovalError(res?.message || 'Failed to release payment. Please retry.');
      }
    } catch (err) {
      console.error('Error releasing payment:', err);
      setApprovalError(err.response?.data?.message || 'Failed to release payment. Please try again.');
    } finally {
      setApprovalSubmitting(false);
    }
  };

  // Human-readable Appointment date/time
  const getAppointmentText = () => {
    if (!booking?.scheduledDate) return 'Flexible Scheduling';
    try {
      const d = new Date(booking.scheduledDate);
      if (isNaN(d.getTime())) return booking.timeSlot || 'Flexible Scheduling';
      const formattedDate = new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
      }).format(d);
      return `${formattedDate}, ${booking.timeSlot || '10:00 AM - 12:00 PM'}`;
    } catch (e) {
      return booking.timeSlot || 'Flexible Scheduling';
    }
  };

  // Current Human-Readable Status Badge
  const getStatusBadgeInfo = (st) => {
    switch (st) {
      case 'open':
      case 'pending_acceptance':
        return { label: 'Request Sent', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
      case 'assigned':
      case 'confirmed':
      case 'scheduled':
      case 'awaiting_confirmation':
        return { label: 'Professional Assigned', cls: 'bg-blue-50 text-blue-800 border-blue-200' };
      case 'on_the_way':
        return { label: 'Professional On the Way', cls: 'bg-indigo-50 text-indigo-800 border-indigo-200' };
      case 'arrived':
        return { label: 'Professional Arrived', cls: 'bg-indigo-50 text-indigo-800 border-indigo-200' };
      case 'in_progress':
        return { label: 'Work in Progress', cls: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 'completion_pending':
        return { label: 'Work Completed — Awaiting Your Approval', cls: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold' };
      case 'completed':
        return { label: 'Work Completed', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
      case 'cancelled':
      case 'declined':
        return { label: 'Cancelled', cls: 'bg-rose-50 text-rose-800 border-rose-200' };
      default:
        return { label: 'Work in Progress', cls: 'bg-slate-100 text-slate-800 border-slate-200' };
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex items-center justify-center">
        <Loader text="Loading your job details..." />
      </div>
    );
  }

  // Empty State: Customer has no jobs
  if (!booking && !loading) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center space-y-5">
        <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center mx-auto shadow-xs">
          <FileText className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">
            No Active Jobs Found
          </h2>
          <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
            You do not currently have any active service requests or bookings to track. Request a service or connect with a verified professional to get started.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link to="/customer/create-job">
            <Button variant="primary" size="md">
              Request a Service
            </Button>
          </Link>
          <Link to="/customer/explore">
            <Button variant="secondary" size="md">
              Find a Professional
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const status = booking?.status || 'open';
  const statusInfo = getStatusBadgeInfo(status);
  const formattedAddress = formatFullAddress(booking?.address || booking?.location);
  const isAddressIncomplete = !booking?.address?.street && !booking?.address?.houseNumber && !booking?.address?.locality;

  // Professional Information
  const vendor = booking?.vendor;
  const vendorProfile = booking?.vendorProfile;
  const vendorName = vendor?.name || 'Assigned Specialist';
  const vendorCategory = booking?.category || vendorProfile?.categories?.[0]?.name || 'Home Specialist';
  const vendorAvatar = vendor?.avatar || vendorProfile?.avatar;
  const isVendorVerified = vendorProfile?.verifiedBadge?.status === 'verified';
  const vendorLicense = vendorProfile?.verifiedBadge?.documents?.[0]?.name || vendorProfile?.licenseNumber;

  // Payment Details
  const pricing = booking?.pricing || {};
  const totalAmount = pricing.amount || booking?.finalPrice?.amount || booking?.job?.budget?.amount || 0;
  const platformFee = pricing.platformFee || 0;
  const paymentStatus = pricing.paymentStatus || 'escrow_locked';
  const isPaymentReleased = paymentStatus === 'released' || status === 'completed';

  // Completion Eligibility
  const completionEvidence = booking?.completionEvidence || {};
  const hasCompletionNotes = Boolean(completionEvidence.notes);
  const completionPhotos = Array.isArray(completionEvidence.images) ? completionEvidence.images : [];
  const isProMarkedComplete = status === 'completion_pending' || completionEvidence.completedAt || hasCompletionNotes;
  const isEligibleForPaymentRelease = isProMarkedComplete && !isPaymentReleased && status !== 'cancelled';

  // Service Start OTP (for scheduled or arrived status before work begins)
  const startOtpCode = booking?.startOtp?.otp;
  const isAwaitingArrivalOtp = (status === 'scheduled' || status === 'assigned' || status === 'arrived' || status === 'on_the_way') && startOtpCode;

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto pb-12">
      
      {/* ── Page Header & Job Selector ── */}
      <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-2xs">
        {/* Service Hero Image Banner */}
        <div className="relative h-36 sm:h-44 w-full bg-slate-100 overflow-hidden border-b border-slate-100">
          <img
            src={getServiceImage(booking?.category?.name || booking?.category, booking?.serviceTitle || booking?.job?.title)}
            alt={booking?.serviceTitle || 'Service Image'}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = '/vite.svg';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
          <div className="absolute bottom-3 left-4 sm:left-6 right-4 flex items-center justify-between gap-3 text-white">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-white/95 text-[#06684F] shadow-2xs">
              {getDisplayName(booking?.category) || 'Specialized Service'}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border backdrop-blur-xs ${statusInfo.cls}`}>
              {statusInfo.label}
            </span>
          </div>
        </div>

        <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
              Track Your Job
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">
              {booking?.serviceTitle || booking?.job?.title || 'Home Service'}
            </h1>
            <div className="flex flex-wrap items-center gap-2.5 mt-2 text-xs text-slate-600">
              <span className="font-bold text-slate-800">
                Job ID: #{booking?.bookingReference || booking?._id?.slice(-6).toUpperCase()}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1 text-slate-700">
                <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                Appointment: {getAppointmentText()}
              </span>
            </div>
          </div>

          {/* Switch Job Dropdown if Customer has multiple bookings */}
          {customerBookings.length > 1 && (
            <div className="shrink-0 flex items-center gap-2">
              <label htmlFor="job-switcher" className="text-xs font-semibold text-slate-600 whitespace-nowrap">
                Switch Job:
              </label>
              <div className="relative">
                <select
                  id="job-switcher"
                  value={booking?._id || ''}
                  onChange={handleSelectJob}
                  className="text-xs font-semibold bg-white border border-slate-300 rounded-xl py-2 pl-3 pr-8 text-slate-800 hover:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700 shadow-2xs appearance-none cursor-pointer"
                >
                  {customerBookings.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.serviceTitle || b.job?.title || 'Service'} (#{b.bookingReference || b._id.slice(-6).toUpperCase()})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Address & Service Location Alert Bar ── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-800 shrink-0 mt-0.5 border border-emerald-200/70">
            <MapPin className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Service Address
            </span>
            <p className="text-xs sm:text-sm font-semibold text-slate-800 break-words mt-0.5">
              {formattedAddress}
            </p>
          </div>
        </div>

        {isAddressIncomplete && status !== 'in_progress' && status !== 'completed' && (
          <Link
            to="/customer/addresses"
            className="shrink-0 text-xs font-bold text-emerald-800 hover:text-emerald-900 underline flex items-center gap-1 self-start sm:self-auto"
          >
            <span>Update Address Details</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        )}
      </div>

      {/* ── Service Start OTP Banner (When professional is assigned and arriving) ── */}
      {isAwaitingArrivalOtp && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 sm:p-5 text-emerald-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-700 text-white shrink-0 mt-0.5">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                Security Start Code
              </span>
              <h3 className="text-sm font-bold text-emerald-950 mt-0.5">
                Share this 6-digit code with your professional upon arrival
              </h3>
              <p className="text-xs text-emerald-800 mt-0.5">
                Work cannot commence until your professional verifies this code at your door.
              </p>
            </div>
          </div>
          <div className="bg-white px-5 py-2.5 rounded-xl border-2 border-emerald-600 shadow-xs text-center shrink-0">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Start Code</span>
            <span className="text-2xl font-black text-emerald-900 tracking-widest font-mono">
              {startOtpCode}
            </span>
          </div>
        </div>
      )}

      {/* ── Step Progress Tracker ── */}
      <JobStatusTracker status={status} />

      {/* ── Three Main Cards Grid (Desk: 3 Cols, Mobile: Stacked) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        
        {/* ── CARD 1: Your Professional ── */}
        <div className="bg-white border border-slate-200/90 shadow-2xs rounded-2xl p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Your Professional
              </h3>
              {vendor && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Assigned
                </span>
              )}
            </div>

            {vendor ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3.5">
                  {vendorAvatar ? (
                    <img
                      src={vendorAvatar}
                      alt={vendorName}
                      className="w-14 h-14 rounded-2xl object-cover ring-2 ring-emerald-600/30 shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-emerald-800 text-white font-black text-lg flex items-center justify-center ring-2 ring-emerald-600/30 shrink-0">
                      {vendorName.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-900 text-base truncate">
                      {vendorName}
                    </h4>
                    <p className="text-xs text-emerald-800 font-semibold truncate">
                      {vendorProfile?.businessName || vendorCategory}
                    </p>
                    
                    {/* Verification & License */}
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Verified Professional</span>
                      </span>

                      {vendorLicense && (
                        <span className="text-[11px] text-slate-500 truncate">
                          {vendorLicense}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {vendorProfile?.rating && (
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">Customer Rating:</span>
                    <span className="font-bold text-slate-900 flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      {vendorProfile.rating.toFixed(1)} ({vendorProfile.reviewCount || 0} reviews)
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">
                    Waiting for a professional
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    We are connecting your job request with verified local professionals in your area.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Action on Professional Card */}
          <div className="pt-2">
            {vendor ? (
              <Link
                to={`/customer/messages?recipientId=${vendor._id || vendor.id}&jobId=${booking.job?._id || booking.job || ''}`}
                className="w-full block"
              >
                <Button variant="outline" size="sm" icon={MessageSquare} className="w-full justify-center text-xs">
                  Message Professional
                </Button>
              </Link>
            ) : (
              <Link to={`/customer/applications?jobId=${booking?.job?._id || booking?._id}`} className="w-full block">
                <Button variant="secondary" size="sm" className="w-full justify-center text-xs">
                  Review Received Quotes
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* ── CARD 2: Payment Protection (Renamed from Escrow Security) ── */}
        <div className="bg-white border border-slate-200/90 shadow-2xs rounded-2xl p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Payment Protection
              </h3>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                isPaymentReleased
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}>
                {isPaymentReleased ? 'Payment Released' : 'Funds Protected'}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Total Job Price
              </span>
              <div className="text-3xl font-black text-emerald-800 mt-0.5">
                {formatCurrency(totalAmount)}
              </div>
            </div>

            {platformFee > 0 && (
              <div className="flex items-center justify-between text-xs text-slate-600 pt-1 border-t border-slate-100">
                <span>Platform Fee:</span>
                <span className="font-semibold text-slate-800">{formatCurrency(platformFee)}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
              <span>Amount Held for This Job:</span>
              <span className="font-bold text-emerald-800">{formatCurrency(totalAmount)}</span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
              Your payment is held safely until the work is completed and you approve it.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2 text-xs font-semibold text-emerald-800">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>Your Payment Is Protected</span>
          </div>
        </div>

        {/* ── CARD 3: Check Completed Work (Renamed from Final Inspection) ── */}
        <div className="bg-white border border-slate-200/90 shadow-2xs rounded-2xl p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Check Completed Work
              </h3>
              {isPaymentReleased ? (
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Approved
                </span>
              ) : isEligibleForPaymentRelease ? (
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                  Action Required
                </span>
              ) : (
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  In Progress
                </span>
              )}
            </div>

            {/* State A: Pro submitted work, customer can review and approve */}
            {isEligibleForPaymentRelease ? (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs">
                  <p className="font-bold">Your professional has marked this work as completed.</p>
                  <p className="text-emerald-800 mt-1">
                    Please inspect the finished work below. When you are satisfied, approve the work to release the payment.
                  </p>
                </div>

                {/* Completion Notes */}
                {hasCompletionNotes && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <span className="font-bold text-slate-700 block">Work Notes from Professional:</span>
                    <p className="text-slate-600 mt-1 leading-relaxed">{completionEvidence.notes}</p>
                  </div>
                )}

                {/* Completion Photos Gallery */}
                {completionPhotos.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-700 block">
                      Completion Photos ({completionPhotos.length}):
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {completionPhotos.map((url, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedPhoto(url)}
                          className="aspect-video rounded-xl overflow-hidden border border-slate-200 hover:ring-2 hover:ring-emerald-700 transition"
                        >
                          <img src={url} alt={`Evidence ${idx + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : isPaymentReleased ? (
              /* State B: Work completed & payment released */
              <div className="space-y-3 py-2">
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold">Work Approved & Payment Released</h5>
                    <p className="text-emerald-800 mt-0.5">
                      You have verified this work and authorized payment release. Thank you for using WorkLogy!
                    </p>
                  </div>
                </div>
              </div>
            ) : status === 'cancelled' ? (
              /* State C: Cancelled */
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs">
                <p className="font-bold">Job Request Cancelled</p>
                <p className="text-rose-700 mt-0.5">
                  No funds will be released for this job. Any escrow hold has been refunded.
                </p>
              </div>
            ) : (
              /* State D: Work still in progress */
              <div className="space-y-3 py-1">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Your professional is still working on this job. You can approve the work after it is completed.
                </p>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2 text-xs text-slate-500">
                  <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Work inspection will be available once work is marked complete.</span>
                </div>
              </div>
            )}
          </div>

          {/* Action Button for Card 3 */}
          <div className="pt-2 space-y-2">
            {isEligibleForPaymentRelease ? (
              <>
                <Button
                  variant="primary"
                  size="md"
                  icon={CheckCircle2}
                  onClick={() => setShowApprovalModal(true)}
                  className="w-full justify-center !bg-emerald-700 hover:!bg-emerald-800 font-bold text-xs sm:text-sm"
                >
                  Approve Work & Release Payment
                </Button>
                <p className="text-[11px] text-center text-slate-500">
                  Have an issue?{' '}
                  <Link
                    to={`/customer/support?orderRef=${booking?.bookingReference || ''}`}
                    className="text-emerald-800 font-bold hover:underline"
                  >
                    Contact Support
                  </Link>
                </p>
              </>
            ) : isPaymentReleased ? (
              <Link to="/customer/reviews" className="w-full block">
                <Button variant="secondary" size="sm" icon={Star} className="w-full justify-center text-xs">
                  Leave a Review
                </Button>
              </Link>
            ) : (
              <div className="w-full">
                <Button
                  variant="primary"
                  size="md"
                  disabled={true}
                  className="w-full justify-center text-xs opacity-60 cursor-not-allowed"
                >
                  Approve Work & Release Payment
                </Button>
                <p className="text-[10px] text-slate-400 text-center mt-1.5">
                  Available once professional submits completion
                </p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── Status-Specific Guidance Section ── */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 sm:p-6 text-xs text-slate-600 space-y-2">
        <h4 className="font-bold text-slate-800 text-sm">
          Next Steps for Your Request
        </h4>
        {status === 'open' || status === 'pending_acceptance' ? (
          <p>
            Your service request is currently visible to qualified local professionals. You will receive notifications when professionals submit proposals or accept your request.
          </p>
        ) : status === 'assigned' || status === 'confirmed' || status === 'scheduled' ? (
          <p>
            Your professional is preparing for your scheduled appointment on <strong className="text-slate-800">{getAppointmentText()}</strong>. Please ensure the service location is accessible.
          </p>
        ) : status === 'in_progress' ? (
          <p>
            Your professional is actively carrying out the requested tasks. Once finished, they will upload completion details for your review before payment is released.
          </p>
        ) : status === 'completion_pending' ? (
          <p>
            Work has been finished. Please inspect the completed work and click <strong className="text-slate-800">"Approve Work & Release Payment"</strong> above to conclude the contract.
          </p>
        ) : status === 'completed' ? (
          <p>
            This job has been completed and payment has been released. You can review past receipts on your{' '}
            <Link to="/customer/payments" className="text-emerald-800 font-bold underline">Payments page</Link>.
          </p>
        ) : (
          <p>
            If you need assistance with this booking, visit our{' '}
            <Link to="/customer/support" className="text-emerald-800 font-bold underline">Help & Support</Link> desk.
          </p>
        )}
      </div>

      {/* ── Confirmation Modal: Approve Work & Release Payment ── */}
      {showApprovalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                  <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    Approve Work & Release Payment
                  </h3>
                  <span className="text-xs text-slate-500">
                    Job #{booking?.bookingReference || booking?._id?.slice(-6).toUpperCase()}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowApprovalModal(false)}
                disabled={approvalSubmitting}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {approvalError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{approvalError}</span>
              </div>
            )}

            <div className="space-y-3 text-xs sm:text-sm text-slate-700">
              <p>
                Are you satisfied with the completed work?
              </p>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Service:</span>
                  <span className="font-bold text-slate-800">{booking?.serviceTitle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Professional:</span>
                  <span className="font-bold text-slate-800">{vendorName}</span>
                </div>
                <div className="flex justify-between text-sm pt-1 border-t border-slate-200">
                  <span className="font-bold text-slate-700">Amount to Release:</span>
                  <span className="font-black text-emerald-800">{formatCurrency(totalAmount)}</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                By confirming, funds will be released from Payment Protection directly to your professional's account. This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="md"
                disabled={approvalSubmitting}
                onClick={() => setShowApprovalModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                icon={CheckCircle2}
                loading={approvalSubmitting}
                disabled={approvalSubmitting}
                onClick={handleApproveWorkAndReleasePayment}
                className="!bg-emerald-700 hover:!bg-emerald-800 font-bold"
              >
                Confirm & Release Payment
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Photo Lightbox Modal ── */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-3xl w-full max-h-[85vh] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl p-2">
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-900/80 text-white hover:bg-slate-800 transition z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={selectedPhoto}
              alt="Work evidence preview"
              className="w-full h-auto max-h-[80vh] object-contain rounded-xl mx-auto"
            />
          </div>
        </div>
      )}

    </div>
  );
}

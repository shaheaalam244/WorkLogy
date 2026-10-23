import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft,
  CheckCircle2, 
  Clock, 
  MapPin, 
  Calendar, 
  DollarSign, 
  ShieldCheck, 
  Check, 
  Navigation, 
  ExternalLink, 
  Compass, 
  Lock, 
  RefreshCw, 
  AlertCircle,
  Phone,
  MessageSquare,
  Upload,
  X,
  FileText,
  AlertTriangle,
  Info,
  Star,
  Printer,
  XCircle,
  RotateCcw
} from 'lucide-react';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import { bookingAPI } from '../../api/booking.api';
import { jobAPI } from '../../api/job.api';
import { formatCurrency, formatDate, formatFullAddress, getDisplayName } from '../../utils/formatters';
import { getServiceImage } from '../../constants/serviceImages';

export default function VendorManageJob() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('assigned');

  // GPS Geofence Arrival State
  const [arrivalStatus, setArrivalStatus] = useState('NOT_CHECKED');
  const [arrivalData, setArrivalData] = useState(null);
  const [arrivalError, setArrivalError] = useState(null);
  const [vendorCoords, setVendorCoords] = useState(null);

  // OTP Verification State
  const [otpInput, setOtpInput] = useState('');
  const [otpSubmitting, setOtpSubmitting] = useState(false);
  const [otpError, setOtpError] = useState(null);
  const [startSuccessMessage, setStartSuccessMessage] = useState(null);

  // Completion Evidence Form State
  const [evidencePhotos, setEvidencePhotos] = useState([]);
  const [evidenceNote, setEvidenceNote] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [completionSubmitting, setCompletionSubmitting] = useState(false);
  const [completionError, setCompletionError] = useState(null);

  // On The Way Action State
  const [onTheWaySubmitting, setOnTheWaySubmitting] = useState(false);

  // Save Progress State
  const [progressSaving, setProgressSaving] = useState(false);
  const [progressSavedMsg, setProgressSavedMsg] = useState(null);

  // Reschedule Modal State
  const [rescheduleModal, setRescheduleModal] = useState({
    open: false,
    newDate: '',
    newTimeSlot: '10:00 AM - 01:00 PM',
    reason: '',
    submitting: false,
    error: null,
    success: false
  });

  // Cancel Modal State
  const [cancelModal, setCancelModal] = useState({
    open: false,
    reason: 'Contractor emergency / unable to reach',
    customNote: '',
    submitting: false,
    error: null
  });

  const fetchBooking = async () => {
    try {
      setLoading(true);
      setError(null);
      let res;
      try {
        res = await bookingAPI.getById(id);
      } catch (fetchErr) {
        // If not found by booking ID, fallback to job ID lookup
        if (fetchErr.response?.status === 404 || fetchErr.response?.status === 400) {
          res = await bookingAPI.getByJobId(id);
        } else {
          throw fetchErr;
        }
      }

      if (res?.booking) {
        setBooking(res.booking);
        setStatus(res.booking.status);
        
        if (res.booking.arrivalEvidence?.verified) {
          setArrivalStatus('ARRIVAL_VERIFIED');
          setArrivalData(res.booking.arrivalEvidence);
        }
        if (res.booking.completionEvidence?.images?.length) {
          setEvidencePhotos(res.booking.completionEvidence.images);
        }
        if (res.booking.completionEvidence?.notes) {
          setEvidenceNote(res.booking.completionEvidence.notes);
        }
      } else {
        setError('Booking order not found.');
      }
    } catch (err) {
      console.error('Error fetching booking details:', err);
      setError(err.response?.data?.message || 'Failed to load booking details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooking();
  }, [id]);

  const targetBookingId = booking?._id || id;

  // Stage 1: Verify Arrival via Browser Geolocation & Server Haversine Validation
  const handleVerifyArrival = () => {
    if (!navigator.geolocation) {
      setArrivalStatus('LOCATION_UNAVAILABLE');
      setArrivalError('Geolocation is not supported by your browser.');
      return;
    }

    setArrivalStatus('REQUESTING_LOCATION');
    setArrivalError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setVendorCoords({ lat: latitude, lng: longitude, accuracy });

        try {
          const res = await bookingAPI.verifyArrival(targetBookingId, {
            latitude,
            longitude,
            accuracy,
            timestamp: new Date(position.timestamp || Date.now())
          });

          if (res?.success) {
            setArrivalStatus('ARRIVAL_VERIFIED');
            setArrivalData(res);
            setArrivalError(null);
          } else {
            setArrivalStatus(res?.status || 'OUTSIDE_SERVICE_RADIUS');
            setArrivalError(res?.message || 'Arrival verification could not be confirmed.');
          }
        } catch (err) {
          const errData = err.response?.data;
          setArrivalStatus(errData?.status || 'OUTSIDE_SERVICE_RADIUS');
          setArrivalError(errData?.message || 'Failed to verify arrival. Please ensure you are within 150m of the destination.');
        }
      },
      (geoErr) => {
        console.error('Browser geolocation error:', geoErr);
        let msg = 'Unable to retrieve your location.';
        if (geoErr.code === 1) {
          setArrivalStatus('LOCATION_PERMISSION_DENIED');
          msg = 'Location permission was denied. Please allow location access in your browser settings to verify arrival.';
        } else if (geoErr.code === 2) {
          setArrivalStatus('LOCATION_UNAVAILABLE');
          msg = 'Position unavailable. Please ensure GPS/Location is enabled on your device.';
        } else if (geoErr.code === 3) {
          setArrivalStatus('LOCATION_UNAVAILABLE');
          msg = 'Location request timed out. Please retry.';
        } else {
          setArrivalStatus('LOCATION_UNAVAILABLE');
        }
        setArrivalError(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  // Stage 2: Verify 6-digit Customer OTP & Transition to IN_PROGRESS
  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    if (!otpInput || otpInput.trim().length !== 6) {
      setOtpError('Please enter the full 6-digit numeric OTP provided by the customer.');
      return;
    }

    try {
      setOtpSubmitting(true);
      setOtpError(null);
      const res = await bookingAPI.verifyStartOtp(targetBookingId, {
        otp: otpInput.trim(),
        latitude: vendorCoords?.lat,
        longitude: vendorCoords?.lng,
        accuracy: vendorCoords?.accuracy
      });

      if (res?.success) {
        setStatus('in_progress');
        setStartSuccessMessage('Service Started Successfully! Work has officially commenced.');
        if (res.booking) {
          setBooking(res.booking);
        }
        setOtpInput('');
      } else {
        setOtpError(res?.message || 'Invalid Service Start OTP.');
      }
    } catch (err) {
      console.error('OTP verification failed:', err);
      setOtpError(err.response?.data?.message || 'OTP verification failed. Please check the code with the customer.');
    } finally {
      setOtpSubmitting(false);
    }
  };

  // Mark On The Way
  const handleMarkOnTheWay = async () => {
    try {
      setOnTheWaySubmitting(true);
      const res = await bookingAPI.updateStatus(targetBookingId, {
        status: 'on_the_way',
        note: 'Specialist has departed and is on the way to the service location.'
      });
      if (res?.success) {
        setStatus('on_the_way');
        if (res.booking) setBooking(res.booking);
      }
    } catch (err) {
      console.error('Error marking on the way:', err);
      alert(err.response?.data?.message || 'Failed to update departure status.');
    } finally {
      setOnTheWaySubmitting(false);
    }
  };

  // Save Progress Notes & Photos without completing
  const handleSaveProgress = async () => {
    try {
      setProgressSaving(true);
      setProgressSavedMsg(null);
      const res = await bookingAPI.updateStatus(targetBookingId, {
        status: 'in_progress',
        note: evidenceNote.trim() || 'Work underway. Progress notes updated.',
        images: evidencePhotos
      });
      if (res?.success) {
        setProgressSavedMsg('Progress notes & photos saved successfully.');
        if (res.booking) setBooking(res.booking);
        setTimeout(() => setProgressSavedMsg(null), 3000);
      }
    } catch (err) {
      console.error('Error saving progress:', err);
      setCompletionError(err.response?.data?.message || 'Failed to save progress.');
    } finally {
      setProgressSaving(false);
    }
  };

  // Upload Real Completion Photo via Existing Backend Image Upload
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setCompletionError('Please select a valid image file (JPEG, PNG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setCompletionError('Image file size must be less than 5MB.');
      return;
    }

    try {
      setUploadingImage(true);
      setCompletionError(null);
      const res = await jobAPI.uploadImage(file);
      if (res?.url) {
        setEvidencePhotos(prev => [...prev, res.url]);
      } else {
        setCompletionError('Image upload failed. Please retry.');
      }
    } catch (err) {
      console.error('Error uploading evidence photo:', err);
      setCompletionError(err.response?.data?.message || 'Failed to upload photo.');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleRemovePhoto = (indexToRemove) => {
    setEvidencePhotos(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Submit Work Completion
  const handleSubmitCompletion = async (e) => {
    e?.preventDefault();
    try {
      setCompletionSubmitting(true);
      setCompletionError(null);

      const res = await bookingAPI.updateStatus(targetBookingId, {
        status: 'completion_pending',
        note: evidenceNote.trim() || 'Work executed according to safety standards and specifications.',
        images: evidencePhotos
      });

      if (res?.success) {
        setStatus('completion_pending');
        if (res.booking) {
          setBooking(res.booking);
        }
      } else {
        setCompletionError(res?.message || 'Failed to submit completion.');
      }
    } catch (err) {
      console.error('Error submitting completion:', err);
      setCompletionError(err.response?.data?.message || 'Failed to submit completion. Please retry.');
    } finally {
      setCompletionSubmitting(false);
    }
  };

  // Handle Reschedule Submit
  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!rescheduleModal.newDate) {
      setRescheduleModal(prev => ({ ...prev, error: 'Please choose an appointment date.' }));
      return;
    }

    try {
      setRescheduleModal(prev => ({ ...prev, submitting: true, error: null }));
      const res = await bookingAPI.reschedule(targetBookingId, {
        newDate: rescheduleModal.newDate,
        newTimeSlot: rescheduleModal.newTimeSlot,
        reason: rescheduleModal.reason
      });
      if (res?.success) {
        setRescheduleModal(prev => ({ ...prev, submitting: false, success: true }));
        if (res.booking) setBooking(res.booking);
        setTimeout(() => {
          setRescheduleModal({
            open: false,
            newDate: '',
            newTimeSlot: '10:00 AM - 01:00 PM',
            reason: '',
            submitting: false,
            error: null,
            success: false
          });
        }, 1500);
      }
    } catch (err) {
      console.error('Error rescheduling booking:', err);
      setRescheduleModal(prev => ({
        ...prev,
        submitting: false,
        error: err.response?.data?.message || 'Failed to reschedule. Please try again.'
      }));
    }
  };

  // Handle Cancel Submit
  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    const fullReason = cancelModal.customNote.trim()
      ? `${cancelModal.reason}: ${cancelModal.customNote.trim()}`
      : cancelModal.reason;

    if (!fullReason) {
      setCancelModal(prev => ({ ...prev, error: 'Please provide a cancellation reason.' }));
      return;
    }

    try {
      setCancelModal(prev => ({ ...prev, submitting: true, error: null }));
      const res = await bookingAPI.updateStatus(targetBookingId, {
        status: 'cancelled',
        note: fullReason
      });
      if (res?.success) {
        setStatus('cancelled');
        if (res.booking) setBooking(res.booking);
        setCancelModal({
          open: false,
          reason: 'Contractor emergency / unable to reach',
          customNote: '',
          submitting: false,
          error: null
        });
      }
    } catch (err) {
      console.error('Error cancelling booking:', err);
      setCancelModal(prev => ({
        ...prev,
        submitting: false,
        error: err.response?.data?.message || 'Failed to cancel booking. Please try again.'
      }));
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex items-center justify-center">
        <Loader text="Loading booking console..." />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-200">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Unable to Load Booking</h2>
        <p className="text-sm text-slate-600 mb-6">{error || 'Booking order was not found or has been removed.'}</p>
        <Link to="/vendor/bookings">
          <Button variant="primary" size="md">
            Return to All Bookings
          </Button>
        </Link>
      </div>
    );
  }

  // Derive coordinates and address
  const serviceLat = booking.address?.coordinates?.lat || booking.job?.location?.coordinates?.lat;
  const serviceLng = booking.address?.coordinates?.lng || booking.job?.location?.coordinates?.lng;
  const hasExactCoordinates = Boolean(
    serviceLat && serviceLng && 
    !isNaN(serviceLat) && !isNaN(serviceLng) && 
    (Number(serviceLat) !== 0 || Number(serviceLng) !== 0)
  );

  const fullStreetAddress = formatFullAddress(booking.address || booking.job?.location, { forceFull: true });

  const googleMapsUrl = hasExactCoordinates
    ? `https://www.google.com/maps/dir/?api=1&destination=${serviceLat},${serviceLng}`
    : fullStreetAddress
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullStreetAddress)}`
    : null;

  // Derive 4-Stage Status Tracker Index
  const getStageIndex = (st) => {
    switch (st) {
      case 'open':
        return 0;
      case 'assigned':
      case 'confirmed':
      case 'scheduled':
      case 'awaiting_confirmation':
        return 1;
      case 'on_the_way':
      case 'arrived':
      case 'in_progress':
      case 'completion_pending':
        return 2;
      case 'completed':
        return 3;
      case 'cancelled':
      case 'disputed':
        return -1;
      default:
        return 1;
    }
  };

  const currentStageIndex = getStageIndex(status);

  // Status Badge Helper
  const renderStatusBadge = (st) => {
    switch (st) {
      case 'assigned':
      case 'confirmed':
      case 'scheduled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
            Vendor Assigned
          </span>
        );
      case 'on_the_way':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
            <Navigation className="w-3.5 h-3.5 text-indigo-600" />
            Specialist On The Way
          </span>
        );
      case 'arrived':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
            <MapPin className="w-3.5 h-3.5 text-teal-600" />
            Arrived On Site
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
            Work In Progress
          </span>
        );
      case 'completion_pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200">
            <Clock className="w-3.5 h-3.5 text-purple-600" />
            Completion Pending Sign-Off
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <Check className="w-3.5 h-3.5 text-emerald-700" />
            Completed & Settled
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200 capitalize">
            {st?.replace('_', ' ')}
          </span>
        );
    }
  };

  const isAssignedOrScheduled = ['assigned', 'confirmed', 'scheduled', 'awaiting_confirmation', 'on_the_way', 'arrived'].includes(status);
  const isInProgress = status === 'in_progress';
  const isCompletionPending = status === 'completion_pending';
  const isCompleted = status === 'completed';
  const isCancelled = status === 'cancelled';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
      
      {/* ── 1. Page Breadcrumbs & Booking Header ── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
        <div>
          <Link 
            to="/vendor/bookings" 
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Confirmed Jobs
          </Link>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
            <div className="flex items-start gap-4 min-w-0">
              <img
                src={getServiceImage(booking.category, booking.serviceTitle)}
                alt={booking.serviceTitle || 'Service Image'}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover shrink-0 border border-slate-200/90 shadow-2xs mt-0.5"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = '/vite.svg';
                }}
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200/80">
                    {getDisplayName(booking.category || booking.serviceCategory || booking.service) || 'Local Service'}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md">
                    #{booking.bookingReference}
                  </span>
                  {renderStatusBadge(status)}
                </div>

                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
                  {booking.serviceTitle}
                </h1>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-600">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{formatDate(booking.scheduledDate)} · {booking.timeSlot}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                    <span>{booking.address?.locality || 'Gomti Nagar'}, {booking.address?.city || 'Lucknow'}</span>
                  </span>
                  <span>
                    Client: <strong className="text-slate-900">{booking.customer?.name || 'Verified Customer'}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {googleMapsUrl && (
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-200 transition"
                >
                  <Navigation className="w-3.5 h-3.5 text-emerald-700 fill-emerald-700" />
                  <span>Directions</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              )}

              <Link to={`/vendor/messages?recipientId=${booking.customer?._id || booking.customer?.id || ''}&jobId=${booking.job?._id || ''}`}>
                <Button variant="secondary" size="sm" icon={MessageSquare} className="text-xs">
                  Chat
                </Button>
              </Link>

              {booking.customer?.phone && (
                <a href={`tel:${booking.customer.phone}`}>
                  <Button variant="outline" size="sm" icon={Phone} className="text-xs">
                    Call
                  </Button>
                </a>
              )}

              {/* Status Specific Actions */}
              {['assigned', 'confirmed', 'scheduled', 'awaiting_confirmation'].includes(status) && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={Navigation}
                    loading={onTheWaySubmitting}
                    disabled={onTheWaySubmitting}
                    onClick={handleMarkOnTheWay}
                    className="text-xs text-indigo-700 hover:bg-indigo-50"
                  >
                    On The Way
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    icon={Calendar}
                    onClick={() => setRescheduleModal(prev => ({ ...prev, open: true }))}
                    className="text-xs text-slate-600 hover:text-slate-900"
                  >
                    Reschedule
                  </Button>
                </>
              )}

              {/* Allow Cancellation if not already completed or cancelled */}
              {!['completed', 'cancelled'].includes(status) && (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={XCircle}
                  onClick={() => setCancelModal(prev => ({ ...prev, open: true }))}
                  className="text-xs text-rose-600 hover:bg-rose-50"
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. 4-Stage Status Tracker ── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Booking Progress Stage
          </span>
          <span className="text-xs font-semibold text-slate-700">
            {currentStageIndex === 1 && 'Vendor Assigned — Scheduled for Service'}
            {currentStageIndex === 2 && (status === 'on_the_way' ? 'En Route — Specialist Traveling to Location' : status === 'arrived' ? 'On Site — Verify Customer OTP' : 'Work In Progress — Service Underway On-Site')}
            {currentStageIndex === 3 && 'Service Completed & Escrow Settled'}
            {currentStageIndex === -1 && 'Booking Cancelled'}
          </span>
        </div>

        {/* Horizontal Stepper */}
        <div className="relative flex items-center justify-between px-2 sm:px-6">
          <div className="absolute top-4 left-6 right-6 h-0.5 bg-slate-200 z-0" />
          
          {currentStageIndex >= 0 && (
            <div 
              className="absolute top-4 left-6 h-0.5 bg-emerald-700 z-0 transition-all duration-300"
              style={{ width: `${Math.min(100, (currentStageIndex / 3) * 100)}%` }}
            />
          )}

          {[
            { idx: 0, label: '1. Job Posted' },
            { idx: 1, label: '2. Assigned / Scheduled' },
            { idx: 2, label: '3. Work In Progress' },
            { idx: 3, label: '4. Completed & Paid' }
          ].map((step) => {
            const isCompletedStep = currentStageIndex > step.idx;
            const isCurrentStep = currentStageIndex === step.idx;

            return (
              <div key={step.idx} className="relative z-10 flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                    isCompletedStep
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : isCurrentStep
                      ? 'bg-white border-2 border-emerald-700 text-emerald-800 ring-4 ring-emerald-100 font-black'
                      : 'bg-white border border-slate-300 text-slate-400'
                  }`}
                >
                  {isCompletedStep ? <Check className="w-4 h-4" /> : step.idx + 1}
                </div>
                <span className={`text-[11px] mt-2 font-medium whitespace-nowrap hidden sm:block ${
                  isCurrentStep
                    ? 'text-emerald-900 font-extrabold'
                    : isCompletedStep
                    ? 'text-slate-800 font-semibold'
                    : 'text-slate-400'
                }`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 3. Main Workflow Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* ── Left Column: Primary Stage-Specific Action (2/3 width) ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Success Banner when service has just started */}
          {startSuccessMessage && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-3 shadow-2xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
              <span className="font-bold">{startSuccessMessage}</span>
            </div>
          )}

          {progressSavedMsg && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-3 shadow-2xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
              <span className="font-medium">{progressSavedMsg}</span>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              STAGE A: ASSIGNED / SCHEDULED / EN ROUTE — START VERIFICATION
             ══════════════════════════════════════════════════════════════════ */}
          {isAssignedOrScheduled && !isInProgress && !isCompletionPending && !isCompleted && !isCancelled && (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-5">
              <div className="flex items-start gap-3.5 pb-4 border-b border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    Start Service Verification
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    Confirm arrival on-site and enter the customer's 6-digit Service-Start OTP before beginning work.
                  </p>
                </div>
              </div>

              {/* 2-Step Stepper Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* ── Step 1: Confirm Arrival at Location ── */}
                <div className={`p-4 rounded-xl border transition-all ${
                  arrivalStatus === 'ARRIVAL_VERIFIED'
                    ? 'bg-emerald-50/60 border-emerald-200'
                    : 'bg-slate-50/70 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                        arrivalStatus === 'ARRIVAL_VERIFIED'
                          ? 'bg-emerald-700 text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}>
                        {arrivalStatus === 'ARRIVAL_VERIFIED' ? <Check className="w-3 h-3" /> : '1'}
                      </span>
                      <h3 className="text-xs font-bold text-slate-900">Step 1 — Confirm Arrival</h3>
                    </div>

                    {arrivalStatus === 'ARRIVAL_VERIFIED' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        Arrival Confirmed
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-600 mb-3 leading-relaxed">
                    Confirm your arrival at the customer's service address via GPS before requesting the customer PIN.
                  </p>

                  {arrivalStatus === 'ARRIVAL_VERIFIED' ? (
                    <div className="p-2.5 rounded-lg bg-emerald-100/70 border border-emerald-200 text-[11px] text-emerald-900 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>
                        Arrival confirmed at location {arrivalData?.distanceMeters !== undefined ? `(${arrivalData.distanceMeters}m away)` : ''}!
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {arrivalError && (
                        <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                          <span>{arrivalError}</span>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleVerifyArrival}
                        disabled={arrivalStatus === 'REQUESTING_LOCATION'}
                        className="w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-2xs active:scale-[0.99] disabled:opacity-60 cursor-pointer"
                      >
                        {arrivalStatus === 'REQUESTING_LOCATION' ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Checking location...</span>
                          </>
                        ) : (
                          <>
                            <Compass className="w-3.5 h-3.5 text-emerald-200" />
                            <span>Confirm Arrival at Location</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* ── Step 2: Verify Customer OTP ── */}
                <div className={`p-4 rounded-xl border transition-all ${
                  arrivalStatus === 'ARRIVAL_VERIFIED'
                    ? 'bg-white border-emerald-300 ring-2 ring-emerald-50'
                    : 'bg-slate-50/50 border-slate-200 opacity-60'
                }`}>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[11px] font-bold">
                        2
                      </span>
                      <h3 className="text-xs font-bold text-slate-900">Step 2 — Verify Customer OTP</h3>
                    </div>

                    {arrivalStatus !== 'ARRIVAL_VERIFIED' && (
                      <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                        <Lock className="w-3 h-3 text-slate-400" /> Locked
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-600 mb-3 leading-relaxed">
                    Ask the property owner for the 6-digit OTP displayed on their WorkLogy dashboard.
                  </p>

                  {otpError && (
                    <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-start gap-2 mb-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                      <span>{otpError}</span>
                    </div>
                  )}

                  <form onSubmit={handleVerifyOtp} className="space-y-2.5">
                    <input
                      type="text"
                      maxLength="6"
                      required
                      disabled={arrivalStatus !== 'ARRIVAL_VERIFIED'}
                      placeholder="Enter 6-digit OTP"
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                      className="w-full tracking-widest font-mono text-center text-lg font-bold bg-white border border-slate-300 rounded-xl py-2 px-3 text-slate-900 placeholder:text-slate-400 placeholder:tracking-normal placeholder:font-sans placeholder:text-xs focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
                    />

                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      loading={otpSubmitting}
                      disabled={otpSubmitting || otpInput.length !== 6 || arrivalStatus !== 'ARRIVAL_VERIFIED'}
                      icon={ShieldCheck}
                      className="w-full !bg-emerald-700 hover:!bg-emerald-800 font-bold text-xs"
                    >
                      Verify OTP & Start Work
                    </Button>
                  </form>
                </div>

              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              STAGE B: WORK IN PROGRESS — UPDATE NOTES & SUBMIT COMPLETION
             ══════════════════════════════════════════════════════════════════ */}
          {isInProgress && (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-6">
              
              {/* Active work status banner */}
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-sm text-emerald-950">Work In Progress • Service Underway</h3>
                  <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed">
                    Arrival and customer OTP have been verified. Execute the service, record progress notes, upload clear photos, and submit for customer sign-off when finished.
                  </p>
                </div>
              </div>

              {/* Completion Evidence Form */}
              <form onSubmit={handleSubmitCompletion} className="space-y-5">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-700" />
                    <span>Work Photos & Progress Notes</span>
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Upload photos of work done and describe tasks completed for customer inspection and payment release.
                  </p>
                </div>

                {completionError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{completionError}</span>
                  </div>
                )}

                {/* Photo Upload Area */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    Work Progress Photos (Optional)
                  </label>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {evidencePhotos.map((url, idx) => (
                      <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-100 group">
                        <img src={url} alt={`Evidence ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(idx)}
                          className="absolute top-1 right-1 p-1 rounded-full bg-slate-900/70 text-white hover:bg-rose-600 transition"
                          title="Remove photo"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    {/* Upload Button */}
                    <label className={`aspect-video rounded-xl border-2 border-dashed border-slate-300 hover:border-emerald-700 bg-slate-50 hover:bg-slate-100/70 flex flex-col items-center justify-center p-3 text-center cursor-pointer transition ${
                      uploadingImage ? 'opacity-50 pointer-events-none' : ''
                    }`}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                        disabled={uploadingImage}
                      />
                      {uploadingImage ? (
                        <>
                          <RefreshCw className="w-4 h-4 text-emerald-700 animate-spin mb-1" />
                          <span className="text-[10px] text-slate-600 font-medium">Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 text-slate-500 mb-1" />
                          <span className="text-[11px] font-bold text-slate-700">Add Photo</span>
                          <span className="text-[9px] text-slate-400">JPG, PNG up to 5MB</span>
                        </>
                      )}
                    </label>
                  </div>
                </div>

                {/* Execution Notes */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Technician Work Notes & Checklist
                  </label>
                  <textarea
                    rows="3"
                    required
                    placeholder="Describe tasks completed, materials used, tests and safety checks performed..."
                    value={evidenceNote}
                    onChange={(e) => setEvidenceNote(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-transparent text-slate-900 placeholder:text-slate-400"
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    loading={progressSaving}
                    disabled={progressSaving}
                    onClick={handleSaveProgress}
                    className="w-full sm:w-auto text-xs"
                  >
                    Save Progress Draft
                  </Button>

                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    loading={completionSubmitting}
                    disabled={completionSubmitting}
                    icon={CheckCircle2}
                    className="w-full sm:flex-1 !bg-emerald-700 hover:!bg-emerald-800 font-bold text-xs"
                  >
                    Mark Work Completed & Request Sign-Off
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              STAGE C: COMPLETION PENDING SIGN-OFF
             ══════════════════════════════════════════════════════════════════ */}
          {isCompletionPending && (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-5">
              <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 flex items-start gap-3">
                <Clock className="w-5 h-5 text-purple-700 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-sm text-purple-950">Completion Submitted — Awaiting Customer Confirmation</h3>
                  <p className="text-xs text-purple-800 mt-0.5 leading-relaxed">
                    You have submitted work evidence. The customer has been notified to review the completed service and confirm sign-off to release escrow payment.
                  </p>
                </div>
              </div>

              {evidenceNote && (
                <div className="space-y-1 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                  <span className="font-bold text-slate-700 block">Submitted Work Notes:</span>
                  <p className="text-slate-600 leading-relaxed">{evidenceNote}</p>
                </div>
              )}

              {evidencePhotos.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700 block">Submitted Photos:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {evidencePhotos.map((url, idx) => (
                      <div key={idx} className="aspect-video rounded-xl overflow-hidden border border-slate-200">
                        <img src={url} alt={`Evidence ${idx + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              STAGE D: COMPLETED & SETTLED
             ══════════════════════════════════════════════════════════════════ */}
          {isCompleted && (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-5">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex flex-col sm:flex-row items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-base text-emerald-950">Work Completed & Payment Released!</h3>
                    <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                      This job was successfully signed off by the customer. Net payout of{' '}
                      <strong>{formatCurrency(booking.pricing?.vendorNet || booking.pricing?.amount || 0)}</strong> has been credited to your transaction ledger.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 transition"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Receipt</span>
                  </button>

                  <Link to="/vendor/earnings">
                    <Button variant="primary" size="sm" className="!bg-emerald-700 hover:!bg-emerald-800 text-xs">
                      View Earnings
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Customer Rating and Review when available */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
                  <span>Customer Review & Rating</span>
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                </h4>

                {booking.review ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((starVal) => (
                          <Star
                            key={starVal}
                            className={`w-4 h-4 ${
                              starVal <= (booking.review.rating || 5)
                                ? 'text-amber-500 fill-amber-500'
                                : 'text-slate-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs font-bold text-slate-900">
                        {booking.review.rating} / 5 Stars
                      </span>
                    </div>
                    {booking.review.comment && (
                      <p className="text-xs text-slate-700 italic bg-white p-3 rounded-lg border border-slate-200/80">
                        "{booking.review.comment}"
                      </p>
                    )}
                    <span className="text-[10px] text-slate-400 block">
                      Submitted on {new Date(booking.review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">
                    The customer has not posted a written review for this booking yet.
                  </p>
                )}
              </div>

              {booking.completionEvidence?.notes && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
                  <span className="font-bold text-slate-900 block">Final Completion Notes:</span>
                  <p className="leading-relaxed">{booking.completionEvidence.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              STAGE E: CANCELLED
             ══════════════════════════════════════════════════════════════════ */}
          {isCancelled && (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-3">
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-sm text-rose-950">Booking Cancelled</h3>
                  <p className="text-xs text-rose-800 mt-0.5 leading-relaxed">
                    This service assignment was cancelled. Reason: {booking.statusHistory?.slice(-1)[0]?.note || booking.declineReason || 'Service cancelled.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Job Requirements & Problem Description */}
          {booking.job?.description && (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Customer Problem Description & Scope
              </h3>
              <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                {booking.job.description}
              </p>
            </div>
          )}

        </div>

        {/* ── Right Column: Customer Details, Address, Financials (1/3 width) ── */}
        <div className="lg:col-span-1 space-y-6">

          {/* ── Card 1: Customer & Confirmed Destination ── */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-100 flex items-center justify-between">
              <span>Customer & Destination</span>
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
            </h3>

            {/* Customer Info */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm shrink-0">
                {booking.customer?.avatar ? (
                  <img src={booking.customer.avatar} alt={booking.customer.name} className="w-full h-full object-cover rounded-full" />
                ) : (
                  <span>{(booking.customer?.name || 'C').charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-slate-900 truncate">
                  {booking.customer?.name || 'Verified Customer'}
                </h4>
                <p className="text-[11px] text-slate-500 truncate">
                  {booking.customer?.phone || 'Phone verified upon arrival'}
                </p>
              </div>
            </div>

            {/* Confirmed Address */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Full Service Address
              </span>
              <div className="flex items-start gap-2 text-xs text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
                <MapPin className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-900 leading-relaxed">
                    {fullStreetAddress}
                  </p>
                  {hasExactCoordinates && (
                    <p className="text-[10px] font-mono font-medium text-emerald-800 mt-1">
                      GPS: {Number(serviceLat).toFixed(4)}, {Number(serviceLng).toFixed(4)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Directions Action */}
            {googleMapsUrl && (
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-2xs"
              >
                <Navigation className="w-3.5 h-3.5 fill-white" />
                <span>Get Directions (Google Maps)</span>
                <ExternalLink className="w-3 h-3 text-emerald-200" />
              </a>
            )}
          </div>

          {/* ── Card 2: Payment Details Summary ── */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-100 flex items-center justify-between">
              <span>Payment Details</span>
              <DollarSign className="w-4 h-4 text-emerald-700" />
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span>Agreed Total:</span>
                <span className="font-bold text-slate-900 text-sm">
                  {formatCurrency(booking.pricing?.amount || 0)}
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-600">
                <span>Pricing Model:</span>
                <span className="font-medium text-slate-800 capitalize">
                  {booking.pricing?.pricingType || 'Fixed Scope'}
                </span>
              </div>

              {booking.pricing?.platformFee > 0 && (
                <div className="flex justify-between items-center text-slate-600">
                  <span>Platform Fee (5%):</span>
                  <span className="text-slate-500">
                    -{formatCurrency(booking.pricing?.platformFee)}
                  </span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                <span className="font-bold text-slate-900">Earnings After Fees:</span>
                <span className="font-black text-emerald-800 text-base">
                  {formatCurrency(booking.pricing?.vendorNet || booking.pricing?.amount || 0)}
                </span>
              </div>

              <div className="pt-2 flex justify-between items-center">
                <span className="text-slate-500">Payment Status:</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  booking.pricing?.paymentStatus === 'released'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {booking.pricing?.paymentStatus === 'released' ? 'Settled to Bank' : 'Payment Protected'}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-snug pt-2 border-t border-slate-100">
              Funds are secured in WorkLogy Escrow and disbursed automatically upon customer completion approval.
            </p>
          </div>

          {/* ── Card 3: Appointment Specifications ── */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-100">
              Service Schedule & Urgency
            </h3>

            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Scheduled Date:</span>
                <span className="font-bold text-slate-900">{formatDate(booking.scheduledDate)}</span>
              </div>
              <div className="flex justify-between">
                <span>Arrival Window:</span>
                <span className="font-semibold text-slate-800">{booking.timeSlot || '10:00 AM - 01:00 PM'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Urgency Level:</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  booking.job?.urgency === 'emergency'
                    ? 'bg-rose-100 text-rose-800'
                    : booking.job?.urgency === 'high'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {booking.job?.urgency || 'Standard'}
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* ── 4. Reschedule Modal ── */}
      {rescheduleModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-700" />
                <span>Request Appointment Reschedule</span>
              </h3>
              <button
                type="button"
                onClick={() => setRescheduleModal(prev => ({ ...prev, open: false }))}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {rescheduleModal.error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{rescheduleModal.error}</span>
              </div>
            )}

            {rescheduleModal.success ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h4 className="font-bold text-slate-900">Appointment Rescheduled!</h4>
                <p className="text-xs text-slate-600">The schedule has been updated and the customer notified.</p>
              </div>
            ) : (
              <form onSubmit={handleRescheduleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">New Date</label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={rescheduleModal.newDate}
                    onChange={(e) => setRescheduleModal(prev => ({ ...prev, newDate: e.target.value }))}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">New Time Slot</label>
                  <select
                    value={rescheduleModal.newTimeSlot}
                    onChange={(e) => setRescheduleModal(prev => ({ ...prev, newTimeSlot: e.target.value }))}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  >
                    <option value="09:00 AM - 12:00 PM">09:00 AM - 12:00 PM</option>
                    <option value="10:00 AM - 01:00 PM">10:00 AM - 01:00 PM</option>
                    <option value="01:00 PM - 04:00 PM">01:00 PM - 04:00 PM</option>
                    <option value="04:00 PM - 07:00 PM">04:00 PM - 07:00 PM</option>
                    <option value="Flexible">Flexible / Anytime</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">Reason for Rescheduling</label>
                  <textarea
                    rows="2"
                    placeholder="E.g. Travel delay, waiting on spare parts, weather conditions..."
                    value={rescheduleModal.reason}
                    onChange={(e) => setRescheduleModal(prev => ({ ...prev, reason: e.target.value }))}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setRescheduleModal(prev => ({ ...prev, open: false }))}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    loading={rescheduleModal.submitting}
                    disabled={rescheduleModal.submitting}
                  >
                    Confirm Reschedule
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── 5. Cancellation Modal ── */}
      {cancelModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <span>Cancel Assigned Booking</span>
              </h3>
              <button
                type="button"
                onClick={() => setCancelModal(prev => ({ ...prev, open: false }))}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
              <strong>Notice:</strong> Cancelling an active assignment will release the customer's escrow deposit and notify the property owner. Frequent cancellations impact your platform reliability score.
            </div>

            {cancelModal.error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{cancelModal.error}</span>
              </div>
            )}

            <form onSubmit={handleCancelSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">Cancellation Reason</label>
                <select
                  value={cancelModal.reason}
                  onChange={(e) => setCancelModal(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="Contractor emergency / unable to reach">Contractor emergency / illness</option>
                  <option value="Customer requested cancellation">Customer requested cancellation</option>
                  <option value="Required materials or spare parts unavailable">Required parts/materials unavailable</option>
                  <option value="Job site inaccessible or safety hazard">Job site inaccessible / safety hazard</option>
                  <option value="Disagreement on service scope or pricing">Disagreement on service scope</option>
                  <option value="other">Other reason</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">Additional Details</label>
                <textarea
                  rows="2"
                  placeholder="Provide brief context for the customer and audit log..."
                  value={cancelModal.customNote}
                  onChange={(e) => setCancelModal(prev => ({ ...prev, customNote: e.target.value }))}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setCancelModal(prev => ({ ...prev, open: false }))}
                >
                  Keep Booking
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={cancelModal.submitting}
                  disabled={cancelModal.submitting}
                  className="!bg-rose-600 hover:!bg-rose-700 text-white"
                >
                  Confirm Cancellation
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

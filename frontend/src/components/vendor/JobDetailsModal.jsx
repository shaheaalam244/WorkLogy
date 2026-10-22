import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, 
  MapPin, 
  DollarSign, 
  Clock, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck, 
  User, 
  Tag, 
  Flame, 
  Navigation, 
  ExternalLink, 
  Layers, 
  FileText, 
  Zap, 
  Send, 
  MessageSquare, 
  Info, 
  Lock, 
  Eye, 
  Maximize2,
  Wrench,
  Check,
  Camera,
  Compass
} from 'lucide-react';
import Button from '../common/Button';
import Loader from '../common/Loader';
import { jobAPI } from '../../api/job.api';
import { applicationAPI } from '../../api/application.api';
import { formatCurrency, formatRelativeTime, formatFullAddress, getDisplayName } from '../../utils/formatters';
import { resolveJobImage, getJobImage, handleImageFallback, FALLBACK_SERVICE_IMAGE } from '../../constants/serviceImages';
import { useSocketContext } from '../../context/SocketContext';

export default function JobDetailsModal({ jobId, isOpen, onClose, onJobUpdated }) {
  const navigate = useNavigate();
  const { socket } = useSocketContext();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthorizedForFullLocation, setIsAuthorizedForFullLocation] = useState(false);
  const [existingProposal, setExistingProposal] = useState(null);

  // Send Your Price (Quotation) Form State
  const [isQuoting, setIsQuoting] = useState(false);
  const [quoteSubmitting, setQuoteSubmitting] = useState(false);
  const [quoteSuccess, setQuoteSuccess] = useState(false);
  const [quoteError, setQuoteError] = useState(null);

  const [quoteData, setQuoteData] = useState({
    proposedAmount: '',
    pricingBasis: 'fixed',
    proposedSchedule: '',
    estimatedDuration: '2-4 hours',
    includedServices: 'Complete inspection, certified workmanship, standard testing, and post-service cleanup.',
    materialCharges: '0',
    coverLetter: ''
  });

  // Acceptance Form State (First-acceptance flow)
  const [isAccepting, setIsAccepting] = useState(false);
  const [acceptSubmitting, setAcceptSubmitting] = useState(false);
  const [acceptError, setAcceptError] = useState(null);
  const [acceptFinalPrice, setAcceptFinalPrice] = useState('');

  // Image lightbox preview state
  const [previewImage, setPreviewImage] = useState(null);

  // Prevent background scrolling while modal is open & listen for Escape key
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (previewImage) {
          setPreviewImage(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, previewImage, onClose]);

  // Real-time synchronization: If this job is cancelled or assigned while modal is open, update view immediately
  useEffect(() => {
    if (!socket || !isOpen || !jobId) return;

    const handleJobChange = (data) => {
      const changedId = (data?.jobId || data?.id || data?._id)?.toString();
      if (changedId === jobId.toString()) {
        const isCancelled = data?.status === 'cancelled' || data?.reason === 'cancelled';
        setJob((prev) => (prev ? { ...prev, status: isCancelled ? 'cancelled' : 'assigned' } : prev));
        setIsQuoting(false);
        setIsAccepting(false);
        setAcceptError(
          isCancelled
            ? 'This service request was cancelled by the customer and is no longer available.'
            : 'This job has already been accepted by another contractor.'
        );
      }
    };

    socket.on('job_cancelled', handleJobChange);
    socket.on('job_taken', handleJobChange);
    socket.on('job_status_updated', handleJobChange);

    return () => {
      socket.off('job_cancelled', handleJobChange);
      socket.off('job_taken', handleJobChange);
      socket.off('job_status_updated', handleJobChange);
    };
  }, [socket, isOpen, jobId]);

  // Fetch full persisted job details from backend
  useEffect(() => {
    if (!isOpen || !jobId) return;

    let isMounted = true;
    const fetchFullJob = async () => {
      try {
        setLoading(true);
        setError(null);
        setQuoteSuccess(false);
        setQuoteError(null);
        setAcceptError(null);

        const res = await jobAPI.getById(jobId);
        if (isMounted && res?.job) {
          const fetchedJob = res.job;
          setJob(fetchedJob);
          setIsAuthorizedForFullLocation(Boolean(res.isAuthorizedForFullLocation));

          if (res.existingProposal) {
            setExistingProposal(res.existingProposal);
          } else {
            try {
              const appsRes = await applicationAPI.getVendorApplications();
              if (appsRes?.applications) {
                const found = appsRes.applications.find(
                  (a) => (a.job?._id || a.job) === jobId && a.status !== 'withdrawn'
                );
                if (found) setExistingProposal(found);
              }
            } catch (err) {
              console.warn('Could not check vendor applications:', err);
            }
          }

          const budgetAmount = fetchedJob.budget?.amount || fetchedJob.budget?.maxAmount || 0;
          setQuoteData((prev) => ({
            ...prev,
            proposedAmount: budgetAmount > 0 ? String(budgetAmount) : '1500',
            proposedSchedule: fetchedJob.preferredDate 
              ? `${fetchedJob.preferredDate} (${fetchedJob.preferredTime || 'Morning'})`
              : 'Earliest Available Slot',
            coverLetter: `Hello! I have verified, licensed trade professionals available in ${fetchedJob.location?.city || 'Lucknow'}. We can inspect, diagnose, and execute "${fetchedJob.title}" with platform warranty guarantee.`
          }));

          setAcceptFinalPrice(budgetAmount > 0 ? String(budgetAmount) : '1500');
        }
      } catch (err) {
        console.error('Failed to load job details:', err);
        if (isMounted) setError(err.response?.data?.message || 'Failed to load complete job details.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchFullJob();
    return () => { isMounted = false; };
  }, [isOpen, jobId]);

  if (!isOpen) return null;

  // Handle Send Your Price Submission
  const handleSubmitQuotation = async (e) => {
    e.preventDefault();
    setQuoteError(null);

    const amountNum = Number(quoteData.proposedAmount);
    if (!amountNum || isNaN(amountNum) || amountNum <= 0) {
      setQuoteError('Please enter a valid price greater than 0 in INR.');
      return;
    }

    if (!quoteData.coverLetter || !quoteData.coverLetter.trim()) {
      setQuoteError('Please write a brief note to the customer describing your proposed work.');
      return;
    }

    try {
      setQuoteSubmitting(true);
      const payload = {
        jobId: job._id,
        proposedAmount: amountNum,
        pricingBasis: quoteData.pricingBasis,
        proposedSchedule: quoteData.proposedSchedule,
        estimatedDuration: quoteData.estimatedDuration,
        includedServices: quoteData.includedServices,
        materialCharges: Number(quoteData.materialCharges) || 0,
        coverLetter: quoteData.coverLetter.trim()
      };

      const res = await applicationAPI.apply(payload);
      if (res?.success) {
        setQuoteSuccess(true);
        setExistingProposal(res.application);
        setIsQuoting(false);
        if (onJobUpdated) onJobUpdated(job._id);
      } else {
        setQuoteError(res?.message || 'Failed to send your price.');
      }
    } catch (err) {
      console.error('Quotation submission failed:', err);
      setQuoteError(err.response?.data?.message || 'Failed to send your price. Please try again.');
    } finally {
      setQuoteSubmitting(false);
    }
  };

  // Handle Instant Job Claim (Atomic Acceptance)
  const handleConfirmAcceptJob = async (e) => {
    e.preventDefault();
    setAcceptError(null);

    const priceNum = Number(acceptFinalPrice);
    if (!priceNum || isNaN(priceNum) || priceNum <= 0) {
      setAcceptError('Please enter a valid final price greater than 0.');
      return;
    }

    try {
      setAcceptSubmitting(true);
      const payload = {
        finalPrice: priceNum,
        pricingType: 'fixed',
        scheduledDate: job.preferredDate || undefined,
        timeSlot: job.preferredTime || undefined
      };

      const res = await jobAPI.claimInstant(job._id, payload);
      if (res?.success) {
        if (onJobUpdated) onJobUpdated(job._id);
        if (res.booking?._id) {
          navigate(`/vendor/manage-job/${res.booking._id}`);
        } else {
          onClose();
        }
      } else {
        setAcceptError(res?.message || 'Failed to accept job.');
      }
    } catch (err) {
      console.error('Accept job error:', err);
      const status = err.response?.status;
      const msg = err.response?.data?.message || err.message || 'Error occurred while accepting job.';
      if (status === 409) {
        setAcceptError(err.response?.data?.message || 'This request has already been cancelled or is no longer available.');
        setJob((prev) => (prev ? { ...prev, status: 'cancelled' } : prev));
      } else {
        setAcceptError(msg);
      }
    } finally {
      setAcceptSubmitting(false);
    }
  };

  const getUrgencyBadge = (urgency) => {
    switch ((urgency || '').toLowerCase()) {
      case 'emergency':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200 uppercase tracking-wider animate-pulse">
            <Flame className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span>Emergency</span>
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 uppercase tracking-wider">
            High Priority
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 uppercase tracking-wider">
            Standard Priority
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-wider">
            Flexible
          </span>
        );
    }
  };

  const getStatusBadge = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'open':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            Open Job
          </span>
        );
      case 'assigned':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200 uppercase">
            Confirmed Job
          </span>
        );
      case 'in_progress':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 uppercase">
            Work in Progress
          </span>
        );
      case 'completed':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-700" /> Completed Work
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 uppercase">
            {status || 'Closed'}
          </span>
        );
    }
  };

  const hasCoordinates = Boolean(
    job?.location?.coordinates?.lat && 
    job?.location?.coordinates?.lng && 
    (Number(job.location.coordinates.lat) !== 0 || Number(job.location.coordinates.lng) !== 0)
  );

  const budgetDisplay = () => {
    if (!job?.budget) return 'Budget not specified';
    const { type, amount, minAmount, maxAmount } = job.budget;

    if (type === 'range' && minAmount && maxAmount && minAmount > 0 && maxAmount > 0) {
      return `${formatCurrency(minAmount)} - ${formatCurrency(maxAmount)} (Customer Budget Range)`;
    }
    if ((type === 'fixed' || type === 'hourly') && amount && Number(amount) > 0) {
      return `${formatCurrency(amount)}${type === 'hourly' ? ' per hour' : ''} (Customer's Expected Price)`;
    }
    if (type === 'quote') {
      return 'Inspection or Price Offer Required (Open to Offers)';
    }
    if (amount && Number(amount) > 0) {
      return `${formatCurrency(amount)} (Estimated)`;
    }
    return 'Budget not specified';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-none sm:rounded-3xl max-w-4xl w-full h-full sm:h-auto sm:max-h-[88vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="job-modal-title"
      >
        {/* ================================================================= */}
        {/* MODAL FIXED HEADER: Simple Title & Badges                         */}
        {/* ================================================================= */}
        <div className="px-6 py-4 sm:py-5 border-b border-slate-200 flex items-start justify-between gap-4 bg-slate-50/75 shrink-0">
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-extrabold text-slate-700 bg-white px-2.5 py-0.5 rounded-lg border border-slate-200 shadow-2xs">
                {job ? `#JOB-${job._id.slice(-6).toUpperCase()}` : '#JOB-PENDING'}
              </span>
              {job && getUrgencyBadge(job.urgency)}
              {job && getStatusBadge(job.status)}
              {(job?.category || job?.serviceCategory || job?.service) && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 truncate max-w-[200px]">
                  <Tag className="w-3 h-3 shrink-0" />
                  <span className="truncate">{getDisplayName(job.category || job.serviceCategory || job.service) || 'Specialized Trade'}</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Job Details</span>
            </div>

            <h2 id="job-modal-title" className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight truncate leading-snug">
              {loading ? 'Loading Job Details...' : job?.title || 'Service Request'}
            </h2>

            {job && (
              <p className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Posted {formatRelativeTime(job.createdAt)}</span>
                <span>·</span>
                <span>{new Date(job.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition shrink-0"
            aria-label="Close Job Details Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ================================================================= */}
        {/* MODAL SCROLLABLE BODY CONTENT                                     */}
        {/* ================================================================= */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 scrollbar-thin">
          {loading ? (
            <div className="py-24 space-y-4 text-center">
              <Loader text="Loading complete job details and service address..." />
            </div>
          ) : error ? (
            <div className="bg-rose-50 border border-rose-200 rounded-3xl p-8 text-center space-y-3 max-w-md mx-auto">
              <AlertCircle className="w-10 h-10 text-rose-600 mx-auto" />
              <h3 className="text-base font-bold text-rose-900">Failed to Load Job Details</h3>
              <p className="text-xs text-rose-700 leading-relaxed">{error}</p>
              <Button variant="secondary" size="sm" onClick={onClose} className="mt-2">
                Close
              </Button>
            </div>
          ) : !job ? null : (
            <>
              {/* Service Hero Banner */}
              <div className="relative h-44 sm:h-52 w-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/90 shadow-2xs">
                <img
                  src={getJobImage(job)}
                  alt={job.title || 'Service Image'}
                  className="w-full h-full object-cover"
                  onError={(e) => handleImageFallback(e, FALLBACK_SERVICE_IMAGE)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent pointer-events-none" />
                <div className="absolute bottom-3.5 left-4 right-4 flex items-center justify-between gap-3 text-white">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/95 text-slate-900 shadow-2xs backdrop-blur-xs">
                    <Tag className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span>{getDisplayName(job.category || job.serviceCategory || job.service) || 'Specialized Trade'}</span>
                    {job.subcategory && <span className="text-slate-500 font-normal">› {getDisplayName(job.subcategory)}</span>}
                  </span>
                  <span className="text-xs text-white/90 drop-shadow flex items-center gap-1 font-medium bg-black/40 px-2.5 py-1 rounded-full backdrop-blur-xs">
                    <Clock className="w-3.5 h-3.5 text-slate-200" />
                    Posted {formatRelativeTime(job.createdAt)}
                  </span>
                </div>
              </div>

              {/* Existing Proposal Banner */}
              {existingProposal && (
                <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-purple-900">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-purple-700 shrink-0" />
                    <div>
                      <span className="font-bold">Your Offer is Active:</span>
                      <span className="ml-1 font-extrabold text-purple-800">{formatCurrency(existingProposal.proposedAmount)}</span>
                      <span className="ml-1 text-[11px] text-purple-700">({existingProposal.pricingBasis || 'fixed'})</span>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold uppercase text-[10px] w-fit">
                    Waiting for Response
                  </span>
                </div>
              )}

              {/* Quotation Success Banner */}
              {quoteSuccess && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs text-emerald-800">
                  <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
                  <div>
                    <span className="font-bold">Your Price Has Been Sent!</span>
                    <span className="ml-1">The customer has been notified and can review and accept your offer.</span>
                  </div>
                </div>
              )}

              {/* ============================================================= */}
              {/* SECTION: WHAT NEEDS TO BE DONE                                */}
              {/* ============================================================= */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Wrench className="w-4 h-4 text-emerald-700" />
                    <span>What Needs to Be Done</span>
                  </h3>
                  {job.serviceType && (
                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 uppercase border border-slate-200">
                      Work Type: {job.serviceType}
                    </span>
                  )}
                </div>

                <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/80 space-y-3">
                  <p className="text-sm text-slate-800 whitespace-pre-line leading-relaxed font-normal">
                    {job.description}
                  </p>

                  {/* Customer Additional Instructions */}
                  {job.additionalInstructions && (
                    <div className="pt-3 border-t border-slate-200/70 text-xs">
                      <span className="font-bold text-slate-700 block mb-1">Customer Instructions:</span>
                      <p className="text-slate-600 italic">"{job.additionalInstructions}"</p>
                    </div>
                  )}

                  {/* Technical Questionnaire Answers */}
                  {job.serviceRequirements && Object.keys(job.serviceRequirements).length > 0 && (
                    <div className="pt-3 border-t border-slate-200/70">
                      <span className="font-bold text-slate-700 text-xs block mb-2">Job Specifications:</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {Object.entries(job.serviceRequirements).map(([key, val]) => {
                          if (!val) return null;
                          const cleanLabel = key
                            .replace(/([A-Z])/g, ' $1')
                            .replace(/^./, (str) => str.toUpperCase());
                          return (
                            <div key={key} className="bg-white p-2.5 rounded-xl border border-slate-200">
                              <span className="text-[10px] text-slate-400 font-semibold uppercase block">{cleanLabel}</span>
                              <span className="font-bold text-slate-800 block mt-0.5">{String(val)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ============================================================= */}
              {/* SECTION: PHOTOS                                               */}
              {/* ============================================================= */}
              {job.images && job.images.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-emerald-700" />
                      <span>Photos ({job.images.length})</span>
                    </h3>
                    <span className="text-[11px] text-slate-400">Click photo to zoom</span>
                  </div>

                  <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/80">
                    <div className="flex flex-wrap gap-3">
                      {job.images.map((imgUrl, idx) => (
                        <div 
                          key={idx}
                          onClick={() => setPreviewImage(imgUrl)}
                          className="relative group cursor-pointer w-20 h-20 sm:w-28 sm:h-28 rounded-xl overflow-hidden border border-slate-200 shadow-2xs hover:border-emerald-600 transition"
                        >
                          <img 
                            src={imgUrl} 
                            alt={`Work photo ${idx + 1}`} 
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-200" 
                          />
                          <div className="absolute inset-0 bg-slate-950/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                            <Maximize2 className="w-5 h-5 text-white" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================= */}
              {/* SECTION: FULL SERVICE ADDRESS                                 */}
              {/* ============================================================= */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-700" />
                    <span>Full Service Address</span>
                  </h3>
                  {isAuthorizedForFullLocation ? (
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Full Address Available
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-amber-700" /> Area View
                    </span>
                  )}
                </div>

                <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/80 space-y-3">
                  {isAuthorizedForFullLocation ? (
                    <div className="space-y-3 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Customer Service Location</span>
                        <p className="font-extrabold text-slate-900 text-sm leading-relaxed">
                          {formatFullAddress(job.location, { forceFull: true })}
                        </p>
                      </div>

                      {/* Map Navigation Link */}
                      {hasCoordinates && (
                        <div className="pt-1">
                          <a 
                            href={`https://www.google.com/maps/dir/?api=1&destination=${job.location.coordinates.lat},${job.location.coordinates.lng}`}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 hover:text-emerald-800 text-xs font-bold hover:bg-slate-100 shadow-2xs transition"
                          >
                            <Navigation className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Get Directions (Google Maps)</span>
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Job Location</span>
                        <p className="font-bold text-slate-900 text-sm">
                          {formatFullAddress(job.location)}
                        </p>
                      </div>

                      <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl flex items-start gap-2 text-xs text-amber-900">
                        <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">
                          Full address available after assignment. Exact house, flat number and street details are unlocked when the customer accepts your price or assigns the job.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ============================================================= */}
              {/* SECTION: DATE AND TIME & YOUR BUDGET                          */}
              {/* ============================================================= */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Date and Time */}
                <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/80 space-y-2.5">
                  <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span>Date and Time</span>
                  </span>

                  <div className="space-y-1.5 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">Preferred Service Date</span>
                      <span className="font-bold text-slate-900 text-sm block">
                        {job.preferredDate ? job.preferredDate : 'Flexible Date'}
                      </span>
                      <span className="text-slate-500 block text-[11px] mt-0.5">
                        Time Slot: {job.preferredTime || 'Anytime during working hours'}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-200/70">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">Appointment Preference</span>
                      <span className="font-semibold text-slate-700 capitalize">
                        {job.scheduleType === 'specific' ? 'Fixed Date Appointment' : 'Flexible Date Window'}
                      </span>
                      {job.alternateDate && (
                        <span className="text-slate-500 block text-[11px] mt-0.5">
                          Alternate Date: {job.alternateDate}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Your Budget */}
                <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/80 space-y-2.5">
                  <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-700" />
                    <span>Your Budget</span>
                  </span>

                  <div className="space-y-1.5 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">Customer's Budget</span>
                      <span className="font-black text-emerald-800 text-base sm:text-lg block">
                        {budgetDisplay()}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-200/70">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">Pricing Format</span>
                      <span className="font-semibold text-slate-700 capitalize">
                        {job.budget?.type === 'quote' ? 'Open to Offers (Send Your Price)' : `${job.budget?.type || 'Fixed'} Price Job`}
                      </span>
                    </div>

                    <div className="p-2 bg-emerald-50 border border-emerald-200/80 rounded-lg text-[11px] text-emerald-800 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span>Payment Protected: Held securely until work is completed.</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ============================================================= */}
              {/* SECTION: CUSTOMER DETAILS                                     */}
              {/* ============================================================= */}
              <div className="space-y-3">
                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <User className="w-4 h-4 text-slate-600" />
                  <span>Customer Details</span>
                </h3>

                <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-800 text-white flex items-center justify-center font-bold text-sm shrink-0">
                      {job.customer?.name?.[0]?.toUpperCase() || 'C'}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 text-sm">{job.customer?.name || 'Verified Customer'}</span>
                        <ShieldCheck className="w-4 h-4 text-emerald-700" title="Verified Customer" />
                      </div>
                      <span className="text-[11px] text-slate-500">Verified WorkLogy Customer · {job.location?.city || 'Lucknow'}</span>
                    </div>
                  </div>

                  <div className="text-slate-500 text-[11px] bg-white px-3 py-2 rounded-xl border border-slate-200/80 max-w-xs">
                    {isAuthorizedForFullLocation ? (
                      <span className="text-emerald-800 font-semibold">
                        Direct messaging is active on your confirmed job.
                      </span>
                    ) : (
                      <span>
                        Phone number and direct chat unlock automatically once your price is accepted.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* ============================================================= */}
              {/* INLINE SEND YOUR PRICE (QUOTATION) FORM                       */}
              {/* ============================================================= */}
              {isQuoting && (
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-3xl p-5 sm:p-6 space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Price Offer</span>
                      <h4 className="text-base font-extrabold text-slate-900">Send Your Price to the Customer</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsQuoting(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {quoteError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{quoteError}</span>
                    </div>
                  )}

                  <form onSubmit={handleSubmitQuotation} className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Your Price (₹ INR) *</label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={quoteData.proposedAmount}
                          onChange={(e) => setQuoteData({ ...quoteData, proposedAmount: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-bold text-sm focus:outline-none focus:border-emerald-700"
                          placeholder="e.g. 1500"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Pricing Format</label>
                        <select
                          value={quoteData.pricingBasis}
                          onChange={(e) => setQuoteData({ ...quoteData, pricingBasis: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-semibold focus:outline-none focus:border-emerald-700"
                        >
                          <option value="fixed">Fixed Price for Full Job</option>
                          <option value="hourly">Hourly Price</option>
                        </select>
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Estimated Time</label>
                        <input
                          type="text"
                          value={quoteData.estimatedDuration}
                          onChange={(e) => setQuoteData({ ...quoteData, estimatedDuration: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-emerald-700"
                          placeholder="e.g. 2-3 hours"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">When You Can Arrive</label>
                      <input
                        type="text"
                        value={quoteData.proposedSchedule}
                        onChange={(e) => setQuoteData({ ...quoteData, proposedSchedule: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-emerald-700"
                        placeholder="e.g. Tomorrow at 10:00 AM"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">What is Included</label>
                      <input
                        type="text"
                        value={quoteData.includedServices}
                        onChange={(e) => setQuoteData({ ...quoteData, includedServices: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-emerald-700"
                        placeholder="Inspection, labor, diagnostics and cleanup"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Note to Customer *</label>
                      <textarea
                        rows="3"
                        required
                        value={quoteData.coverLetter}
                        onChange={(e) => setQuoteData({ ...quoteData, coverLetter: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 leading-relaxed focus:outline-none focus:border-emerald-700"
                        placeholder="Explain your experience, materials you will use, and guarantee..."
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setIsQuoting(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        disabled={quoteSubmitting}
                        icon={Send}
                        className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold"
                      >
                        {quoteSubmitting ? 'Sending Price...' : 'Send Your Price'}
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {/* ============================================================= */}
              {/* INLINE ACCEPT JOB CONFIRMATION FORM                           */}
              {/* ============================================================= */}
              {isAccepting && (
                <div className="bg-amber-50/70 border border-amber-200 rounded-3xl p-5 sm:p-6 space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">Accept Job</span>
                      <h4 className="text-base font-extrabold text-slate-900">Confirm Your Price to Accept This Job</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAccepting(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {acceptError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{acceptError}</span>
                    </div>
                  )}

                  <form onSubmit={handleConfirmAcceptJob} className="space-y-4 text-xs">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Your Total Price (₹ INR) *</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={acceptFinalPrice}
                        onChange={(e) => setAcceptFinalPrice(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-bold text-sm focus:outline-none focus:border-emerald-700"
                        placeholder="e.g. 1500"
                      />
                      <span className="text-[11px] text-slate-500 mt-1 block">
                        The first professional to accept wins the job. The full service address will be shown right after confirmation.
                      </span>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setIsAccepting(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        disabled={acceptSubmitting}
                        icon={Zap}
                        className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold"
                      >
                        {acceptSubmitting ? 'Accepting Job...' : 'Confirm and Accept Job'}
                      </Button>
                    </div>
                  </form>
                </div>
              )}
            </>
          )}
        </div>

        {/* ================================================================= */}
        {/* MODAL FIXED ACTIONS FOOTER                                        */}
        {/* ================================================================= */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            {job?.status === 'cancelled' ? (
              <span className="text-rose-700 font-bold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                This service request has been cancelled by the customer.
              </span>
            ) : job?.status === 'assigned' ? (
              <span className="text-rose-700 font-bold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                This job has already been assigned and is closed.
              </span>
            ) : existingProposal ? (
              <span className="text-purple-800 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                Your price has been sent. Waiting for customer response.
              </span>
            ) : (
              <span>Check all details carefully before sending your price.</span>
            )}
          </div>

          <div className="flex items-center gap-2 justify-end">
            <Button variant="secondary" size="md" onClick={onClose}>
              Close
            </Button>

            {/* Action buttons only if job is open */}
            {job && job.status === 'open' && (
              <>
                {!existingProposal && !isQuoting && (
                  <Button
                    variant="secondary"
                    size="md"
                    icon={FileText}
                    onClick={() => {
                      setIsQuoting(true);
                      setIsAccepting(false);
                    }}
                    className="font-bold border-slate-300"
                  >
                    Send Your Price
                  </Button>
                )}

                {!isAccepting && (
                  <Button
                    variant="primary"
                    size="md"
                    icon={Zap}
                    onClick={() => {
                      setIsAccepting(true);
                      setIsQuoting(false);
                    }}
                    className="bg-emerald-800 hover:bg-emerald-900 font-bold"
                  >
                    Accept Job
                  </Button>
                )}
              </>
            )}

            {/* If assigned to this vendor, show message and navigation actions */}
            {isAuthorizedForFullLocation && (
              <>
                <Button
                  variant="secondary"
                  size="md"
                  icon={MessageSquare}
                  onClick={() => navigate('/vendor/messages')}
                >
                  Message Customer
                </Button>
                {hasCoordinates && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${job.location.coordinates.lat},${job.location.coordinates.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button
                      variant="primary"
                      size="md"
                      icon={Navigation}
                      className="bg-emerald-800 hover:bg-emerald-900"
                    >
                      Get Directions
                    </Button>
                  </a>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* FULL-SIZE IMAGE PREVIEW LIGHTBOX                                    */}
      {/* =================================================================== */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/90 animate-in fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img 
              src={previewImage} 
              alt="Work photo preview" 
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-slate-800" 
            />
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 p-2 bg-white rounded-full text-slate-800 hover:bg-slate-200 shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

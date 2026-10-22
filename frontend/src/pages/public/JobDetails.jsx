import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  Clock, 
  Users, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Tag, 
  FileText, 
  Send, 
  Check, 
  X, 
  Briefcase,
  User,
  PlusCircle,
  HelpCircle,
  Phone,
  Mail,
  Navigation,
  ExternalLink,
  Compass,
  Zap
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { jobAPI } from '../../api/job.api';
import { applicationAPI } from '../../api/application.api';
import { formatCurrency, formatFullAddress, formatRelativeTime } from '../../utils/formatters';
import Loader from '../../components/common/Loader';
import { getServiceImage, resolveJobImage, getJobImage, handleImageFallback, FALLBACK_SERVICE_IMAGE } from '../../constants/serviceImages';

export default function JobDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Vendor Quotation Form state
  const [proposal, setProposal] = useState({
    proposedAmount: '',
    pricingBasis: 'fixed',
    proposedSchedule: 'Tomorrow 10:00 AM',
    estimatedDuration: '1 Day (approx. 4-6 hours)',
    includedServices: 'Complete inspection, labor, parts fitment, testing and cleanup',
    materialCharges: 0,
    coverLetter: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [myProposal, setMyProposal] = useState(null);

  // Customer received proposals state (for homeowner)
  const [applications, setApplications] = useState([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(null);

  // Fetch Job Details
  useEffect(() => {
    let isMounted = true;
    const fetchJobData = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await jobAPI.getById(id);
        if (isMounted && res?.job) {
          setJob(res.job);
          if (res.job.budget?.amount) {
            setProposal(prev => ({
              ...prev,
              proposedAmount: res.job.budget.amount,
              pricingBasis: res.job.budget.type || 'fixed'
            }));
          }
        }
      } catch (err) {
        console.error('Error fetching job details:', err);
        if (isMounted) {
          setError(err.response?.data?.message || 'Job tender not found or was removed.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchJobData();
    return () => { isMounted = false; };
  }, [id]);

  // Fetch role-specific applications data
  useEffect(() => {
    if (!job || !user) return;

    const fetchRelatedProposals = async () => {
      try {
        if (user.role === 'vendor') {
          // Check if vendor already applied
          const appsRes = await applicationAPI.getVendorApplications();
          if (appsRes?.applications) {
            const existing = appsRes.applications.find(
              a => (a.job?._id === id || a.job === id) && a.status !== 'withdrawn'
            );
            if (existing) {
              setMyProposal(existing);
            }
          }
        } else if ((user.role === 'customer' || user.role === 'admin') && (String(job.customer?._id || job.customer) === String(user?.id || user?._id) || user.role === 'admin')) {
          // Homeowner who owns this job (or admin): load all applications
          setLoadingApps(true);
          const appsRes = await applicationAPI.getJobApplications(id);
          if (appsRes?.applications) {
            setApplications(appsRes.applications);
          }
        }
      } catch (err) {
        console.error('Error loading proposal context:', err);
      } finally {
        setLoadingApps(false);
      }
    };

    fetchRelatedProposals();
  }, [job, user, id]);

  // Vendor Instant Acceptance Handler (First-Come, First-Served)
  const handleInstantAccept = async () => {
    try {
      setSubmitting(true);
      setSubmitError(null);
      const price = job.budget?.amount || Number(proposal.proposedAmount) || 500;
      const res = await jobAPI.acceptJob(id, {
        finalPrice: price,
        pricingType: proposal.pricingBasis || 'fixed',
        estimatedDuration: proposal.estimatedDuration || '1-2 hours'
      });
      if (res?.success) {
        setSubmitSuccess(true);
        if (res.booking?._id) {
          navigate(`/vendor/manage-job/${res.booking._id}`);
        } else {
          navigate('/vendor/active-jobs');
        }
      }
    } catch (err) {
      if (err.response?.status === 409) {
        setSubmitError('This job has already been accepted by another professional.');
        setJob((prev) => (prev ? { ...prev, status: 'assigned' } : prev));
      } else {
        setSubmitError(err.response?.data?.message || 'Failed to accept job.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Vendor Submit Quotation Handler
  const handleQuotationSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    const amountNum = Number(proposal.proposedAmount);
    if (!amountNum || amountNum <= 0) {
      setSubmitError('Please enter a valid quotation amount greater than ₹0.');
      return;
    }

    if (!proposal.coverLetter.trim()) {
      setSubmitError('Please write a short message or cover note explaining your approach and qualifications.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        jobId: id,
        proposedAmount: amountNum,
        pricingBasis: proposal.pricingBasis,
        proposedSchedule: proposal.proposedSchedule,
        estimatedDuration: proposal.estimatedDuration,
        includedServices: proposal.includedServices,
        materialCharges: Number(proposal.materialCharges) || 0,
        coverLetter: proposal.coverLetter.trim()
      };

      const res = await applicationAPI.apply(payload);
      if (res?.success) {
        setSubmitSuccess(true);
        setMyProposal(res.application);
        // Refresh job to update applicant count
        const updated = await jobAPI.getById(id);
        if (updated?.job) setJob(updated.job);
      }
    } catch (err) {
      console.error('Error submitting quotation:', err);
      setSubmitError(err.response?.data?.message || 'Failed to submit quotation. Please verify your inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  // Vendor Withdraw Quotation Handler
  const handleWithdraw = async () => {
    if (!myProposal) return;
    if (!window.confirm('Are you sure you want to withdraw your quotation from this tender?')) return;

    try {
      setSubmitting(true);
      const res = await applicationAPI.withdraw(myProposal._id);
      if (res?.success) {
        setMyProposal(null);
        setSubmitSuccess(false);
        const updated = await jobAPI.getById(id);
        if (updated?.job) setJob(updated.job);
      }
    } catch (err) {
      console.error('Error withdrawing quotation:', err);
      alert(err.response?.data?.message || 'Failed to withdraw quotation.');
    } finally {
      setSubmitting(false);
    }
  };

  // Customer Accept Proposal Handler
  const handleAcceptProposal = async (applicationId) => {
    if (!window.confirm('Accept this quotation? This will assign the job to the contractor and create an escrow booking.')) return;
    try {
      setActionInProgress(applicationId);
      const res = await applicationAPI.updateStatus(applicationId, 'accepted');
      if (res?.success) {
        // Refresh applications and job status
        const appsRes = await applicationAPI.getJobApplications(id);
        if (appsRes?.applications) setApplications(appsRes.applications);
        const updatedJob = await jobAPI.getById(id);
        if (updatedJob?.job) setJob(updatedJob.job);
      }
    } catch (err) {
      console.error('Error accepting proposal:', err);
      alert(err.response?.data?.message || 'Failed to accept proposal.');
    } finally {
      setActionInProgress(null);
    }
  };

  // Customer Reject Proposal Handler
  const handleRejectProposal = async (applicationId) => {
    if (!window.confirm('Decline this quotation?')) return;
    try {
      setActionInProgress(applicationId);
      const res = await applicationAPI.updateStatus(applicationId, 'rejected');
      if (res?.success) {
        const appsRes = await applicationAPI.getJobApplications(id);
        if (appsRes?.applications) setApplications(appsRes.applications);
      }
    } catch (err) {
      console.error('Error rejecting proposal:', err);
      alert(err.response?.data?.message || 'Failed to reject proposal.');
    } finally {
      setActionInProgress(null);
    }
  };

  if (loading) {
    return (
      <div className="categories-container py-24">
        <Loader text="Loading job tender specifications..." />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="categories-container py-16">
        <div className="bg-white border border-slate-200 rounded-3xl p-10 sm:p-14 text-center max-w-xl mx-auto shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Job Tender Not Found</h2>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            {error || 'This job tender does not exist, has expired, or was removed by the property owner.'}
          </p>
          <Link
            to="/jobs"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Browse Jobs</span>
          </Link>
        </div>
      </div>
    );
  }

  const urgency = (job.urgency || 'medium').toLowerCase();
  const isEmergency = urgency === 'emergency';
  const isHigh = urgency === 'high';

  const urgencyBadgeStyle = isEmergency
    ? 'bg-rose-50 text-rose-700 border-rose-200'
    : isHigh
    ? 'bg-amber-50 text-amber-800 border-amber-200'
    : 'bg-emerald-50 text-emerald-800 border-emerald-200';

  const currentUserId = user?.id || user?._id;
  const isOwner = Boolean(user && currentUserId && (String(job.customer?._id || job.customer) === String(currentUserId)));
  const isVendor = user?.role === 'vendor';
  const isAdmin = user?.role === 'admin';
  const isGuest = !user;

  const locationDisplay = job.location?.city 
    ? (job.location.state ? `${job.location.city}, ${job.location.state}` : job.location.city)
    : (job.location?.address || 'Lucknow, UP');

  const isSelectedVendor = Boolean(
    isVendor && currentUserId && (
      String(job.selectedVendor?._id || job.selectedVendor) === String(currentUserId) ||
      myProposal?.status === 'accepted'
    )
  );

  const canViewPreciseLocation = isOwner || isAdmin || isSelectedVendor || (job.isAuthorizedForFullLocation && !job.location?.isMaskedForPrivacy);

  const serviceLat = job.location?.coordinates?.lat;
  const serviceLng = job.location?.coordinates?.lng;
  const hasExactCoordinates = Boolean(
    canViewPreciseLocation &&
    serviceLat && serviceLng &&
    !isNaN(serviceLat) && !isNaN(serviceLng) &&
    (Number(serviceLat) !== 0 || Number(serviceLng) !== 0)
  );  const fullStreetAddress = formatFullAddress(job.location, { forceFull: canViewPreciseLocation });

  const googleMapsUrl = hasExactCoordinates
    ? `https://www.google.com/maps/dir/?api=1&destination=${serviceLat},${serviceLng}`
    : canViewPreciseLocation && fullStreetAddress
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullStreetAddress)}`
    : null;

  return (
    <div className="categories-container py-8 sm:py-10 lg:py-12">
      {/* ── 1. Top Bar Navigation ── */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <Link 
          to="/jobs"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-emerald-800 transition py-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Find Available Jobs</span>
        </Link>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Job ID:</span>
          <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            #{job._id?.slice(-8).toUpperCase()}
          </span>
        </div>
      </div>

      {/* ── 2. Compact Page Header ── */}
      <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-xs mb-8">
        {/* Top Service Banner Image */}
        <div className="relative h-44 sm:h-56 w-full bg-slate-100 overflow-hidden border-b border-slate-100">
          <img
            src={getJobImage(job)}
            alt={job.title || 'Service Image'}
            className="w-full h-full object-cover"
            onError={(e) => handleImageFallback(e, FALLBACK_SERVICE_IMAGE)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
          <div className="absolute top-4 left-4 flex items-center gap-2 flex-wrap">
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border shadow-2xs backdrop-blur-xs ${urgencyBadgeStyle}`}>
              {job.urgency || 'Medium'} Urgency
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize border shadow-2xs backdrop-blur-xs ${
              job.status === 'open'
                ? 'bg-blue-600/90 text-white border-blue-400'
                : job.status === 'in_progress'
                ? 'bg-amber-600/90 text-white border-amber-400'
                : 'bg-slate-700/90 text-white border-slate-500'
            }`}>
              {job.status === 'open' ? 'Open for Offers' : job.status?.replace('_', ' ')}
            </span>
          </div>
          <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between gap-2">
            {job.category?.name && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/95 text-slate-900 shadow-2xs backdrop-blur-xs">
                <Tag className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>{job.category.name}</span>
                {job.subcategory && <span className="text-slate-500 font-normal">› {job.subcategory}</span>}
              </span>
            )}
            <span className="text-xs text-white/90 drop-shadow flex items-center gap-1 font-medium bg-black/40 px-2.5 py-1 rounded-full backdrop-blur-xs">
              <Clock className="w-3.5 h-3.5 text-slate-200" />
              Posted {formatRelativeTime(job.createdAt)}
            </span>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight mb-4">
            {job.title}
          </h1>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-6 text-xs text-slate-600">
            <span className="flex items-center gap-1.5 font-medium">
              <MapPin className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{fullStreetAddress || locationDisplay}</span>
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <Calendar className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>Preferred: {job.preferredDate || 'Flexible Schedule'} ({job.preferredTime || 'Anytime'})</span>
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <Users className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{job.applicantsCount || 0} offers received</span>
            </span>
          </div>

          {canViewPreciseLocation && googleMapsUrl && (
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs transition shadow-xs"
            >
              <Navigation className="w-3.5 h-3.5 fill-white" />
              <span>Get Directions</span>
              <ExternalLink className="w-3 h-3 text-emerald-200" />
            </a>
          )}
        </div>

        {canViewPreciseLocation ? (
          <div className="mt-4 p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>Full Service Address</span>
              </span>
              <p className="text-slate-700 font-medium">
                {fullStreetAddress}
              </p>
              {hasExactCoordinates && (
                <span className="inline-flex items-center gap-1 font-mono text-[11px] text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200">
                  <Compass className="w-3.5 h-3.5 text-emerald-700" />
                  Exact Coordinates: {Number(serviceLat).toFixed(4)}, {Number(serviceLng).toFixed(4)}
                </span>
              )}
            </div>
            {googleMapsUrl && (
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs transition shadow-xs whitespace-nowrap self-start sm:self-center"
              >
                <Navigation className="w-3.5 h-3.5 fill-white" />
                <span>Open in Google Maps</span>
                <ExternalLink className="w-3 h-3 text-emerald-200" />
              </a>
            )}
          </div>
        ) : (
          <div className="mt-3 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-500 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>Privacy Protected: Full street address will be unlocked once a professional is selected.</span>
          </div>
        )}
        </div>
      </div>

      {/* ── 3. Two-Column Desktop Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* ── LEFT COLUMN: Job Scope, Notes & Received Offers ── */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-8">
          {/* Section: What Needs to Be Done */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-emerald-700" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  What Needs to Be Done
                </h2>
              </div>
              <p className="text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50/80 p-5 rounded-2xl border border-slate-200/80">
                {job.description}
              </p>
            </div>

            {/* Additional Instructions / Access Notes */}
            {job.additionalInstructions && (
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Customer Instructions:
                </h3>
                <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 leading-relaxed">
                  {job.additionalInstructions}
                </div>
              </div>
            )}

            {/* Customer Details */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center font-bold text-emerald-900 text-sm overflow-hidden">
                  {job.customer?.avatar ? (
                    <img src={job.customer.avatar} alt={job.customer.name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{(job.customer?.name || 'Customer').charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span>{job.customer?.name || 'Verified Customer'}</span>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                  </h4>
                  <span className="text-[11px] text-slate-500">Verified Customer</span>
                </div>
              </div>

              {isOwner && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Your Job
                </span>
              )}
            </div>
          </div>

          {/* Customer's Received Offers Comparison Panel */}
          {isOwner && (
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-700" />
                    <span>Offers from Professionals ({applications.length})</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Compare price offers from professionals and hire the best match.
                  </p>
                </div>
              </div>

              {loadingApps ? (
                <Loader text="Loading received offers..." />
              ) : applications.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-200 p-6">
                  <p className="text-xs text-slate-600 font-medium">
                    No offers have been submitted yet. Professionals in your area are reviewing your job request.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {applications.map((app) => {
                    const isAccepted = app.status === 'accepted';
                    const isRejected = app.status === 'rejected';
                    const isPending = app.status === 'submitted';

                    return (
                      <div 
                        key={app._id}
                        className={`p-5 rounded-2xl border transition-all ${
                          isAccepted 
                            ? 'bg-emerald-50/50 border-emerald-300 ring-2 ring-emerald-600/20' 
                            : isRejected 
                            ? 'bg-slate-50 border-slate-200 opacity-60' 
                            : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden font-bold flex items-center justify-center text-slate-700">
                              {app.vendor?.avatar ? (
                                <img src={app.vendor.avatar} alt={app.vendor.name} className="w-full h-full object-cover" />
                              ) : (
                                <span>{(app.vendor?.name || 'P').charAt(0)}</span>
                              )}
                            </div>
                            <div>
                              <h4 className="font-bold text-sm text-slate-900">{app.vendor?.name || 'Verified Professional'}</h4>
                              <span className="text-[11px] text-slate-500">{app.vendor?.email}</span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Professional's Price</span>
                            <span className="text-lg font-black text-emerald-800">{formatCurrency(app.proposedAmount)}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs mb-3">
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-medium block">Estimated Time</span>
                            <span className="font-semibold text-slate-700">{app.estimatedDuration || '1-2 Days'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-medium block">Date and Time</span>
                            <span className="font-semibold text-slate-700">{app.proposedSchedule || 'Flexible'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-medium block">Job Status</span>
                            <span className={`font-bold capitalize ${isAccepted ? 'text-emerald-700' : isRejected ? 'text-rose-600' : 'text-blue-700'}`}>
                              {app.status}
                            </span>
                          </div>
                        </div>

                        {app.coverLetter && (
                          <div className="mb-4">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">Professional's Message:</span>
                            <p className="text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200 leading-relaxed italic">
                              "{app.coverLetter}"
                            </p>
                          </div>
                        )}

                        {/* Customer Accept/Reject Actions */}
                        {isPending && job.status === 'open' && (
                          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                            <button
                              type="button"
                              disabled={actionInProgress === app._id}
                              onClick={() => handleRejectProposal(app._id)}
                              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            >
                              Decline
                            </button>
                            <button
                              type="button"
                              disabled={actionInProgress === app._id}
                              onClick={() => handleAcceptProposal(app._id)}
                              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition shadow-2xs"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Accept Offer</span>
                            </button>
                          </div>
                        )}

                        {isAccepted && (
                          <div className="pt-2 text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                            <span>Offer accepted! Booking confirmed with Payment Protection.</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN: Budget Summary & Action Cards ── */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6 lg:sticky lg:top-24">
          {/* Service Category Visual Card */}
          <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-xs">
            <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
              <img
                src={getJobImage(job)}
                alt={job.category?.name || 'Service category'}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                onError={(e) => handleImageFallback(e, FALLBACK_SERVICE_IMAGE)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent flex flex-col justify-end p-4 sm:p-5">
                <span className="text-[10px] uppercase font-bold text-emerald-300 tracking-wider">
                  Verified Trade Domain
                </span>
                <span className="text-white text-base font-extrabold drop-shadow leading-snug">
                  {job.category?.name || 'WorkLogy Certified Service'}
                </span>
                {job.subcategory && (
                  <span className="text-slate-200 text-xs mt-0.5 line-clamp-1">
                    {job.subcategory}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Budget & Job Summary Card */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-5">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
                Your Budget
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl sm:text-4xl font-black text-emerald-800 tracking-tight">
                  {formatCurrency(job.budget?.amount || 0)}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  / {job.budget?.type === 'hourly' ? 'per hour' : 'budget'}
                </span>
              </div>
            </div>

            <div className="space-y-2.5 text-xs pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between text-slate-600">
                <span>Job Status</span>
                <span className="font-bold text-slate-900 capitalize">{job.status?.replace('_', ' ')}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Urgency Level</span>
                <span className="font-bold text-slate-900 capitalize">{job.urgency}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Offers Received</span>
                <span className="font-bold text-slate-900">{job.applicantsCount || 0}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>City</span>
                <span className="font-bold text-slate-900">{job.location?.city || 'Lucknow, UP'}</span>
              </div>
            </div>
          </div>

          {/* ── ACTION BOX: Vendor Offer Submission OR Role-Aware Card ── */}
          {isVendor ? (
            myProposal ? (
              /* Already Quoted Card */
              <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                    <h3 className="text-sm font-bold text-slate-900">Your Offer is Active</h3>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-blue-100 text-blue-800">
                    {myProposal.status}
                  </span>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Your Price:</span>
                    <strong className="text-emerald-800 text-sm font-black">{formatCurrency(myProposal.proposedAmount)}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Estimated Time:</span>
                    <strong className="text-slate-800">{myProposal.estimatedDuration}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Date and Time:</span>
                    <strong className="text-slate-800">{myProposal.proposedSchedule}</strong>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Your Message:</span>
                  <p className="text-xs text-slate-700 bg-white p-3 rounded-xl border border-slate-200 leading-relaxed italic">
                    "{myProposal.coverLetter}"
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Submitted {formatRelativeTime(myProposal.createdAt)}
                  </span>
                  {myProposal.status !== 'accepted' && (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleWithdraw}
                      className="text-xs font-bold text-rose-600 hover:text-rose-800 hover:underline"
                    >
                      Withdraw Offer
                    </button>
                  )}
                </div>
              </div>
            ) : job.status === 'open' ? (
              <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-5">
                {/* 1-Click Instant Job Acceptance */}
                <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-emerald-950 space-y-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-emerald-700 fill-emerald-700" />
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-emerald-900">
                      First-Accepted Instant Allocation
                    </h3>
                  </div>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    Want to take this assignment now? First verified contractor to confirm acceptance wins this job immediately.
                  </p>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleInstantAccept}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#06684F] hover:bg-[#055742] text-white font-bold text-xs transition shadow-xs disabled:opacity-50 active:scale-95 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 fill-white" />
                    <span>{submitting ? 'Accepting Job...' : `Accept Job Now (${formatCurrency(job.budget?.amount || proposal.proposedAmount || 500)})`}</span>
                  </button>
                </div>

                <div className="relative flex items-center justify-center">
                  <div className="border-t border-slate-200 w-full" />
                  <span className="bg-white px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider absolute">
                    Or Propose Custom Terms
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Send className="w-3.5 h-3.5 text-emerald-800" />
                    <span>Send Custom Price Proposal</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Provide a specific price, timeline, and cover note for the customer.
                  </p>
                </div>

                {submitError && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                {submitSuccess && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>Your price has been sent successfully!</span>
                  </div>
                )}

                <form onSubmit={handleQuotationSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Professional's Price (₹ INR) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="10"
                      value={proposal.proposedAmount}
                      onChange={(e) => setProposal({ ...proposal, proposedAmount: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-700 shadow-2xs"
                      placeholder="e.g. 1500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Pricing Basis</label>
                      <select
                        value={proposal.pricingBasis}
                        onChange={(e) => setProposal({ ...proposal, pricingBasis: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-700 shadow-2xs"
                      >
                        <option value="fixed">Fixed Price</option>
                        <option value="hourly">Hourly Rate</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Estimated Time</label>
                      <input
                        type="text"
                        value={proposal.estimatedDuration}
                        onChange={(e) => setProposal({ ...proposal, estimatedDuration: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-700 shadow-2xs"
                        placeholder="e.g. 1 Day"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Proposed Date and Time</label>
                    <input
                      type="text"
                      value={proposal.proposedSchedule}
                      onChange={(e) => setProposal({ ...proposal, proposedSchedule: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-700 shadow-2xs"
                      placeholder="e.g. Tomorrow 10:00 AM"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Message to Customer *
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={proposal.coverLetter}
                      onChange={(e) => setProposal({ ...proposal, coverLetter: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-700 shadow-2xs"
                      placeholder="Describe your qualifications, approach, and warranty..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs transition shadow-xs hover:shadow-sm disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submitting ? 'Sending Your Price...' : 'Send Your Price'}</span>
                  </button>
                </form>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-3xl p-6 text-center text-xs text-slate-500 shadow-xs">
                This job is no longer accepting new offers.
              </div>
            )
          ) : isOwner ? (
            /* Customer Guidance Card */
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-3xl p-6 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>You Posted This Job</span>
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed">
                Review verified offers on the left. Once you accept an offer, payment is protected until you approve the completed work.
              </p>
              <Link 
                to="/customer/my-jobs"
                className="inline-block text-xs font-bold text-emerald-900 underline hover:text-emerald-700"
              >
                Go to My Jobs &rarr;
              </Link>
            </div>
          ) : isGuest ? (
            /* Guest Sign In Call To Action */
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Are You a Service Professional?</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Sign in with your professional account to view job details and send your price.
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <Link 
                  to={`/login?redirect=${encodeURIComponent('/jobs/' + id)}`}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs transition shadow-xs"
                >
                  <span>Sign In to Send Your Price</span>
                </Link>
                <Link 
                  to="/register?role=vendor"
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition"
                >
                  <span>Register as a Professional</span>
                </Link>
              </div>
            </div>
          ) : (
            /* Logged in Customer (not owner) */
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <HelpCircle className="w-4 h-4 text-emerald-700" />
                <span>Customer Job Request</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                This request was submitted by a customer. Only verified professionals can send price offers.
              </p>
              <Link
                to="/customer/create-job"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:underline"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Request a Service</span>
              </Link>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

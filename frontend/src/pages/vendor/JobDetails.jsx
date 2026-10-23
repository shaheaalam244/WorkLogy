import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  MapPin, 
  DollarSign, 
  Clock, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle,
  Calendar,
  Layers,
  ArrowLeft,
  FileText,
  Navigation,
  ExternalLink,
  Compass,
  Zap,
  Camera,
  Eye,
  X
} from 'lucide-react';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import ClaimJobModal from '../../components/vendor/ClaimJobModal';
import { jobAPI } from '../../api/job.api';
import { applicationAPI } from '../../api/application.api';
import { useSocketContext } from '../../context/SocketContext';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency, formatFullAddress, getDisplayName } from '../../utils/formatters';

export default function VendorJobDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket } = useSocketContext();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [existingProposal, setExistingProposal] = useState(null);
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  // Proposal Form State
  const [proposal, setProposal] = useState({
    proposedAmount: 1450,
    pricingBasis: 'fixed',
    proposedSchedule: 'Tomorrow 10:00 AM',
    estimatedDuration: '1 Day (approx. 4-6 hours)',
    includedServices: 'Complete diagnostic, labor, parts fitment, testing and cleanup',
    materialCharges: 0,
    coverLetter: 'Hello! I have certified, verified technicians ready in Lucknow. We will arrive promptly with all necessary diagnostic equipment, conduct a complete inspection, and execute the work to full code compliance with a 30-day workmanship warranty.'
  });

  useEffect(() => {
    const fetchJob = async () => {
      try {
        setLoading(true);
        const res = await jobAPI.getById(id);
        if (res?.job) {
          setJob(res.job);
          if (res.job.budget?.amount) {
            setProposal(prev => ({
              ...prev,
              proposedAmount: res.job.budget.amount
            }));
          }
        }

        // Check if vendor already applied
        const appsRes = await applicationAPI.getVendorApplications();
        if (appsRes?.applications) {
          const found = appsRes.applications.find(a => a.job?._id === id || a.job === id);
          if (found) setExistingProposal(found);
        }
      } catch (err) {
        console.error('Error fetching job details:', err);
        setError('Failed to load job tender. Please verify the link or refresh.');
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [id]);

  // Real-time socket listener: When another pro accepts first, update state immediately
  useEffect(() => {
    if (!socket || !id) return;

    const handleJobTaken = (data) => {
      if (data?.jobId === id || data?.id === id) {
        setJob(prev => prev ? { ...prev, status: 'assigned', selectedVendor: data.claimedBy || 'another_pro' } : prev);
        setClaimModalOpen(false);
        setError('This job has already been accepted by another professional.');
      }
    };

    socket.on('job_taken', handleJobTaken);
    socket.on('job_assigned', handleJobTaken);

    return () => {
      socket.off('job_taken', handleJobTaken);
      socket.off('job_assigned', handleJobTaken);
    };
  }, [socket, id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        jobId: id,
        proposedAmount: Number(proposal.proposedAmount),
        pricingBasis: proposal.pricingBasis,
        proposedSchedule: proposal.proposedSchedule,
        estimatedDuration: proposal.estimatedDuration,
        includedServices: proposal.includedServices,
        materialCharges: Number(proposal.materialCharges) || 0,
        coverLetter: proposal.coverLetter
      };

      const res = await applicationAPI.apply(payload);
      if (res?.success) {
        setSuccess(true);
        setExistingProposal(res.application);
      }
    } catch (err) {
      console.error('Error submitting quotation:', err);
      setError(err.response?.data?.message || 'Failed to submit proposal. Please verify fields.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    if (!existingProposal) return;
    try {
      setSubmitting(true);
      const res = await applicationAPI.withdraw(existingProposal._id);
      if (res?.success) {
        setExistingProposal(null);
        setSuccess(false);
      }
    } catch (err) {
      console.error('Error withdrawing proposal:', err);
      setError(err.response?.data?.message || 'Failed to withdraw proposal.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="py-20"><Loader text="Loading job tender specifications..." /></div>;
  if (!job) return <div className="text-center py-20 text-slate-500">Job not found.</div>;

  const isAssigned = existingProposal?.status === 'accepted' || (job?.selectedVendor && ((job.selectedVendor?._id || job.selectedVendor).toString() === (user?._id || user?.id)?.toString())) || (!job?.location?.isMaskedForPrivacy && (job?.location?.street || job?.location?.coordinates?.lat));
  const serviceLat = job?.location?.coordinates?.lat;
  const serviceLng = job?.location?.coordinates?.lng;
  const hasCoordinates = Boolean(
    serviceLat && serviceLng &&
    !isNaN(serviceLat) && !isNaN(serviceLng) &&
    (Number(serviceLat) !== 0 || Number(serviceLng) !== 0)
  );

  const fullStreetAddress = formatFullAddress(job?.location, { forceFull: isAssigned });

  const googleMapsUrl = hasCoordinates
    ? `https://www.google.com/maps/dir/?api=1&destination=${serviceLat},${serviceLng}`
    : fullStreetAddress
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullStreetAddress)}`
    : null;

  return (
    <div className="w-full space-y-8">
      {/* Back button */}
      <div>
        <Link to="/vendor/browse-jobs" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition">
          <ArrowLeft className="w-4 h-4" /> Back to Find Available Jobs
        </Link>
      </div>

      {/* Job Details Card */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
              {job.urgency} Urgency
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 capitalize">
              Job Status: {job.status === 'open' ? 'Open for Offers' : job.status?.replace('_', ' ')}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-500 uppercase block font-medium">Customer Budget</span>
            <span className="text-xl sm:text-2xl font-black text-emerald-800">
              {job.budget?.type === 'quote'
                ? 'Competitive Quotes'
                : job.budget?.type === 'range'
                ? `₹${Number(job.budget?.minAmount || 0).toLocaleString()} - ₹${Number(job.budget?.maxAmount || 0).toLocaleString()}`
                : job.budget?.type === 'hourly'
                ? `₹${Number(job.budget?.amount || 0).toLocaleString()} / hr`
                : formatCurrency(job.budget?.amount || 0)}
            </span>
          </div>
        </div>

        <div>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Job Details</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
            {job.title}
          </h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-600 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Service Category</span>
            <span className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-700" />
              {getDisplayName(job.category || job.serviceCategory || job.service) || 'General Service'}
            </span>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Date and Time</span>
            <span className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              {job.preferredDate || 'Flexible'} ({job.preferredTime || 'Anytime'})
            </span>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Job Reference ID</span>
            <span className="font-mono font-bold text-slate-700">
              #{job._id?.slice(-8).toUpperCase()}
            </span>
          </div>
        </div>

        {/* Full Service Address */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-emerald-700" />
            <span>Full Service Address</span>
          </h3>
          {isAssigned ? (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="font-bold flex items-center gap-1.5 text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  <span>Confirmed Service Location (Authorized Professional Access)</span>
                </span>
                <p className="text-slate-800 font-medium">
                  {fullStreetAddress}
                </p>
                {hasCoordinates && (
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
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-xs transition-all active:scale-95 whitespace-nowrap shrink-0"
                >
                  <Navigation className="w-3.5 h-3.5 fill-white" />
                  <span>Get Directions</span>
                  <ExternalLink className="w-3 h-3 text-emerald-200" />
                </a>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="font-semibold text-slate-900">
                  {fullStreetAddress}
                </p>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>Privacy Protected: Full street address will be unlocked when your offer is accepted.</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* What Needs to Be Done */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">What Needs to Be Done</h3>
          <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-200 whitespace-pre-line">
            {job.description}
          </p>
        </div>

        {/* Attached Photos */}
        {job.images?.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-emerald-700" />
                <span>Customer Uploaded Photographs ({job.images.length})</span>
              </h3>
              <span className="text-[11px] text-slate-500">Click photo to view larger</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {job.images.map((imgUrl, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedPhoto(imgUrl)}
                  className="group relative aspect-square rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer shadow-xs hover:border-emerald-600 transition-all"
                >
                  <img
                    src={imgUrl}
                    alt={`Job condition evidence ${idx + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                    <Eye className="w-5 h-5 drop-shadow" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {job.additionalInstructions && (
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Customer Instructions:</h4>
            <p className="text-xs text-slate-600 bg-amber-50/70 p-3.5 rounded-xl border border-amber-200 leading-relaxed">
              {job.additionalInstructions}
            </p>
          </div>
        )}

        {/* Customer Details */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Customer Details</span>
            <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
              {job.customer?.name || 'Verified Customer'}
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
            </span>
          </div>

          {isAssigned && job.customer?._id && (
            <Link to={`/vendor/messages?customer=${job.customer._id}`}>
              <Button variant="secondary" size="sm">
                Message Customer
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Assigned / Instant Claim Header */}
      {isAssigned ? (
        <div className="bg-emerald-50 border border-emerald-300 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6 text-emerald-700" />
            </div>
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-200 text-emerald-900">
                You are Assigned
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-0.5">Contract Confirmed with Property Owner</h3>
              <p className="text-xs text-slate-600">
                Your price was accepted. Open your service console to verify arrival, enter customer OTP, and update progress.
              </p>
            </div>
          </div>
          <Link to={`/vendor/manage-job/${job.booking?._id || job.booking || job._id}`}>
            <Button variant="primary" size="md" icon={ArrowRight} className="!bg-emerald-800 hover:!bg-emerald-900 shrink-0">
              Open Job Console
            </Button>
          </Link>
        </div>
      ) : job.status === 'assigned' || job.selectedVendor ? (
        <div className="bg-slate-100 border border-slate-300 rounded-3xl p-6 sm:p-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-200 text-slate-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Job Already Assigned</h3>
              <p className="text-xs text-slate-600">This request has been accepted by a verified professional. Applications for this job are closed.</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-slate-200 text-slate-700 font-bold text-xs uppercase rounded-xl">Closed</span>
        </div>
      ) : (
        <div className={`rounded-3xl p-6 sm:p-8 text-white space-y-4 shadow-md border ${
          job.urgency === 'emergency'
            ? 'bg-gradient-to-r from-amber-950 via-slate-900 to-amber-900 border-amber-800'
            : 'bg-gradient-to-r from-emerald-900 via-slate-900 to-emerald-950 border-emerald-800'
        }`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                job.urgency === 'emergency'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}>
                <Zap className={`w-3 h-3 ${job.urgency === 'emergency' ? 'fill-amber-300' : 'fill-emerald-300'}`} />
                {job.urgency === 'emergency' ? '🚨 Emergency Job Dispatch' : 'First-Accepted Instant Allocation'}
              </span>
              <h3 className="text-xl font-bold tracking-tight">
                {job.urgency === 'emergency' ? 'Accept Emergency Job' : 'Accept Job Immediately'}
              </h3>
              <p className="text-xs text-slate-300 max-w-xl">
                {job.urgency === 'emergency'
                  ? 'Urgent emergency request! First qualified contractor to confirm acceptance wins this job immediately. Be ready to arrive within 1 hour.'
                  : 'Ready to take this job? Confirm your price to claim this assignment immediately.'}
              </p>
            </div>

            <Button
              variant="primary"
              size="lg"
              icon={Zap}
              onClick={() => setClaimModalOpen(true)}
              className={job.urgency === 'emergency'
                ? '!bg-amber-400 hover:!bg-amber-300 !text-slate-950 font-black shrink-0 shadow-lg shadow-amber-500/20'
                : '!bg-emerald-500 hover:!bg-emerald-400 !text-slate-950 font-black shrink-0 shadow-lg shadow-emerald-500/20'}
            >
              {job.urgency === 'emergency' ? 'Accept Emergency Job' : 'Accept Job'}
            </Button>
          </div>
        </div>
      )}

      {/* Existing Offer Notice */}
      {existingProposal && existingProposal.status !== 'withdrawn' ? (
        <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-700" />
              <h3 className="text-base font-bold text-slate-900">Your Offer is Active</h3>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-blue-100 text-blue-800">
              {existingProposal.status}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-50 text-xs">
            <div>
              <span className="text-[10px] text-slate-500 block uppercase">Your Price</span>
              <strong className="text-base font-bold text-emerald-800">{formatCurrency(existingProposal.proposedAmount)}</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block uppercase">Estimated Time</span>
              <strong className="text-slate-800">{existingProposal.estimatedDuration}</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block uppercase">Date and Time</span>
              <strong className="text-slate-800">{existingProposal.proposedSchedule}</strong>
            </div>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 uppercase block font-semibold mb-1">Message Sent to Customer:</span>
            <p className="text-xs text-slate-700 bg-white p-3 rounded-xl border border-slate-200 leading-relaxed">
              "{existingProposal.coverLetter}"
            </p>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <span className="text-xs text-slate-500">Submitted on {new Date(existingProposal.createdAt).toLocaleDateString()}</span>
            {existingProposal.status === 'accepted' ? (
              <Link to={`/vendor/manage-job/${job.booking?._id || job.booking || job._id}`}>
                <Button variant="primary" size="sm" icon={ArrowRight} className="!bg-emerald-800 hover:!bg-emerald-900">
                  Manage Job Console
                </Button>
              </Link>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                disabled={submitting}
                onClick={handleWithdraw}
                className="!text-rose-600 hover:!bg-rose-50"
              >
                Withdraw Offer
              </Button>
            )}
          </div>
        </div>
      ) : (
        /* Send Your Price Form */
        <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 sm:p-8 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-5 h-5 text-emerald-800" />
              <h3 className="text-lg font-bold text-slate-900">Send Your Price</h3>
            </div>
            <p className="text-xs text-slate-600">
              Provide your price, estimated time, and a message for the customer.
            </p>
          </div>

          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700" />
              <span>Your price has been sent successfully! The customer has been notified.</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Professional's Price (₹) *
                </label>
                <input
                  type="number"
                  required
                  min="50"
                  value={proposal.proposedAmount}
                  onChange={(e) => setProposal({ ...proposal, proposedAmount: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pricing Basis</label>
                <select
                  value={proposal.pricingBasis}
                  onChange={(e) => setProposal({ ...proposal, pricingBasis: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700"
                >
                  <option value="fixed">Fixed Price</option>
                  <option value="hourly">Hourly Rate</option>
                  <option value="estimate">Preliminary Estimate</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Estimated Time</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1 Day (approx. 4 hours)"
                  value={proposal.estimatedDuration}
                  onChange={(e) => setProposal({ ...proposal, estimatedDuration: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Proposed Date and Time</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tomorrow 10:00 AM"
                  value={proposal.proposedSchedule}
                  onChange={(e) => setProposal({ ...proposal, proposedSchedule: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Material Charges (₹, if any)</label>
                <input
                  type="number"
                  min="0"
                  value={proposal.materialCharges}
                  onChange={(e) => setProposal({ ...proposal, materialCharges: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Included Work</label>
              <input
                type="text"
                value={proposal.includedServices}
                onChange={(e) => setProposal({ ...proposal, includedServices: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Message to Customer *
              </label>
              <textarea
                rows="4"
                required
                placeholder="Explain your approach, why your experience is the best fit, safety guarantees..."
                value={proposal.coverLetter}
                onChange={(e) => setProposal({ ...proposal, coverLetter: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700"
              />
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={submitting}
                className="w-full"
              >
                {submitting ? 'Sending Your Price...' : 'Send Your Price'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Instant Claim Price Confirmation Modal */}
      <ClaimJobModal
        job={job}
        isOpen={claimModalOpen}
        onClose={() => setClaimModalOpen(false)}
        onClaimSuccess={() => {
          setClaimModalOpen(false);
          // Navigate to booking or refresh
        }}
      />

      {/* Lightbox Photo Preview Modal */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedPhoto(null)}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/90 transition-colors shadow-md"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={selectedPhoto}
              alt="Expanded Job Condition Evidence"
              className="max-h-[82vh] w-auto max-w-full rounded-2xl object-contain mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, 
  Zap, 
  ShieldCheck, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  MapPin, 
  Layers, 
  ArrowRight,
  Info
} from 'lucide-react';
import Button from '../common/Button';
import { jobAPI } from '../../api/job.api';
import { formatCurrency } from '../../utils/formatters';
import { useSocketContext } from '../../context/SocketContext';

export default function ClaimJobModal({ job, isOpen, onClose, onClaimSuccess }) {
  const navigate = useNavigate();
  const { socket } = useSocketContext();
  const [pricingType, setPricingType] = useState('fixed');
  const [finalPrice, setFinalPrice] = useState(job?.budget?.amount ? String(job.budget.amount) : '1500');
  const [hourlyRate, setHourlyRate] = useState('500');
  const [estimatedDuration, setEstimatedDuration] = useState('1-2 hours');
  const [includedServices, setIncludedServices] = useState('Complete diagnostic inspection, certified labor, standard testing, and post-service cleanup');
  const [materialCharges, setMaterialCharges] = useState('0');
  const [scheduledDate, setScheduledDate] = useState(job?.preferredDate || '');
  const [timeSlot, setTimeSlot] = useState(job?.preferredTime || '10:00 AM - 01:00 PM');
  
  const [submitting, setSubmitting] = useState(false);
  const [errorBanner, setErrorBanner] = useState(null);
  const [conflictError, setConflictError] = useState(false);

  // Real-time synchronization: Close modal if this request is cancelled or assigned
  React.useEffect(() => {
    if (!socket || !isOpen || !job?._id) return;

    const handleRemoteChange = (data) => {
      const cId = (data?.jobId || data?.id || data?._id)?.toString();
      if (cId === job._id.toString()) {
        const isCancelled = data?.status === 'cancelled' || data?.reason === 'cancelled';
        setConflictError(true);
        setErrorBanner(
          isCancelled
            ? 'This request was just cancelled by the customer.'
            : 'This job has already been accepted by another professional.'
        );
        setTimeout(() => {
          if (onClaimSuccess) onClaimSuccess({ jobTaken: true, jobId: job._id });
          onClose();
        }, 2200);
      }
    };

    socket.on('job_cancelled', handleRemoteChange);
    socket.on('job_taken', handleRemoteChange);

    return () => {
      socket.off('job_cancelled', handleRemoteChange);
      socket.off('job_taken', handleRemoteChange);
    };
  }, [socket, isOpen, job]);

  if (!isOpen || !job) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorBanner(null);
    setConflictError(false);

    const priceNum = Number(finalPrice);
    if (!priceNum || isNaN(priceNum) || priceNum <= 0) {
      setErrorBanner('Please enter a valid final service price greater than 0.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        finalPrice: priceNum,
        pricingType,
        hourlyRate: Number(hourlyRate) || 0,
        estimatedDuration,
        includedServices,
        materialCharges: Number(materialCharges) || 0,
        scheduledDate: scheduledDate || undefined,
        timeSlot: timeSlot || undefined
      };

      const res = await jobAPI.claimInstant(job._id, payload);

      if (res?.success) {
        if (onClaimSuccess) onClaimSuccess(res);
        // Direct winning vendor to their active booking with address navigation & OTP verification
        if (res.booking?._id) {
          navigate(`/vendor/manage-job/${res.booking._id}`);
        } else {
          onClose();
        }
      } else {
        setErrorBanner(res?.message || 'Failed to claim assignment.');
      }
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message || err.message || 'Error occurred while claiming job.';
      
      if (status === 409) {
        setConflictError(true);
        setErrorBanner(msg || 'This request has already been cancelled or is no longer available.');
        if (onClaimSuccess) {
          onClaimSuccess({ jobTaken: true, jobId: job._id });
        }
      } else if (status === 403) {
        setErrorBanner(msg || 'Eligibility Restriction: You are not authorized to accept this job.');
      } else {
        setErrorBanner(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const customerBudgetAmount = job.budget?.amount || 0;
  const platformFee = Math.round(Number(finalPrice || 0) * 0.05);
  const netEarnings = Math.max(0, Number(finalPrice || 0) - platformFee);
  const isEmergency = job.urgency === 'emergency';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
              isEmergency ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
            }`}>
              <Zap className={`w-5 h-5 ${isEmergency ? 'fill-amber-800' : 'fill-emerald-800'}`} />
            </div>
            <div>
              <span className={`text-[10px] font-extrabold uppercase tracking-wider block ${
                isEmergency ? 'text-amber-800' : 'text-emerald-800'
              }`}>
                {isEmergency ? '🚨 Emergency Job Dispatch' : 'First-Accepted Instant Allocation'}
              </span>
              <h3 className="text-lg font-bold text-slate-900 leading-snug">
                {isEmergency ? 'Accept Emergency Job' : 'Confirm Price & Claim Job'}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Conflict or Error Notification */}
          {conflictError && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3 text-xs leading-relaxed">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Job Already Assigned</strong>
                <span>This job has already been accepted by another professional.</span>
              </div>
            </div>
          )}

          {!conflictError && errorBanner && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 text-xs">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{errorBanner}</span>
            </div>
          )}

          {/* Job Snapshot Card */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-slate-900 line-clamp-1">{job.title}</span>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded text-[10px] uppercase shrink-0">
                {job.urgency || 'Standard'}
              </span>
            </div>
            <div className="flex items-center gap-3 text-slate-500 text-[11px]">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-emerald-700" />
                {job.location?.locality || job.location?.city || 'Lucknow'}
              </span>
              <span>•</span>
              <span>Customer Expectation: {customerBudgetAmount > 0 ? formatCurrency(customerBudgetAmount) : 'Open to confirmed quote'}</span>
            </div>
          </div>

          {/* Pricing Model Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-2">
              Select Pricing Model
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPricingType('fixed')}
                className={`p-3 rounded-2xl border text-left transition ${
                  pricingType === 'fixed'
                    ? 'border-emerald-700 bg-emerald-50/70 text-emerald-950 font-bold'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <span className="text-xs block">Fixed Total Price</span>
                <span className="text-[11px] font-normal text-slate-500">Comprehensive project charge</span>
              </button>

              <button
                type="button"
                onClick={() => setPricingType('hourly')}
                className={`p-3 rounded-2xl border text-left transition ${
                  pricingType === 'hourly'
                    ? 'border-emerald-700 bg-emerald-50/70 text-emerald-950 font-bold'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <span className="text-xs block">Hourly Rate Base</span>
                <span className="text-[11px] font-normal text-slate-500">Billed by verified hours</span>
              </button>
            </div>
          </div>

          {/* Price Input Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Confirmed Final Price (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                <input
                  type="number"
                  min="50"
                  step="50"
                  required
                  value={finalPrice}
                  onChange={(e) => setFinalPrice(e.target.value)}
                  placeholder="e.g. 1500"
                  className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-700 text-sm font-bold text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Estimated Duration *
              </label>
              <input
                type="text"
                value={estimatedDuration}
                onChange={(e) => setEstimatedDuration(e.target.value)}
                placeholder="e.g. 2-3 hours"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-700 text-xs font-semibold text-slate-800"
              />
            </div>
          </div>

          {/* Scope and Materials Included */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Included Scope & Labor Guarantee
            </label>
            <input
              type="text"
              value={includedServices}
              onChange={(e) => setIncludedServices(e.target.value)}
              placeholder="e.g. Diagnostics, labor, electrical testing & cleanup"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-700 text-xs text-slate-800"
            />
          </div>

          {/* Earnings Breakdown Summary */}
          <div className="bg-emerald-50/70 border border-emerald-200/90 rounded-2xl p-4 text-xs space-y-2">
            <div className="flex justify-between text-slate-700">
              <span>Customer Agreed Charge:</span>
              <span className="font-bold text-slate-900">{formatCurrency(Number(finalPrice) || 0)}</span>
            </div>
            <div className="flex justify-between text-slate-500 text-[11px]">
              <span>Platform Fee (5%):</span>
              <span>- {formatCurrency(platformFee)}</span>
            </div>
            <div className="pt-2 border-t border-emerald-200 flex justify-between items-center text-sm">
              <span className="font-bold text-emerald-950">Your Net Earnings (Escrow):</span>
              <span className="text-base font-black text-emerald-800">{formatCurrency(netEarnings)}</span>
            </div>
          </div>

          {/* Atomic FCFS Notice */}
          <div className="flex items-start gap-2 text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <Info className="w-3.5 h-3.5 text-emerald-800 shrink-0 mt-0.5" />
            <p>
              <strong>Atomic Winner Guarantee:</strong> Submitting commits your binding rate. The first valid acceptance recorded by the backend is immediately awarded the booking. You will be required to verify the customer's 6-digit OTP upon arrival before commencing work.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
            >
              Cancel
            </button>

            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={submitting || conflictError}
              loading={submitting}
              icon={Zap}
            >
              {conflictError ? 'Job Already Assigned' : (isEmergency ? 'Accept Emergency Job' : 'Accept Job Now')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

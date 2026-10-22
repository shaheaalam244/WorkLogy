import React, { useState, useEffect } from 'react';
import { 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Info,
  Loader2
} from 'lucide-react';
import { jobAPI } from '../../api/job.api';

const CANCELLATION_REASONS = [
  'No longer needed',
  'Incorrect job details',
  'Found another professional',
  'Schedule no longer works',
  'Budget concerns',
  'Other'
];

export default function CancelJobModal({ job, isOpen, onClose, onJobCancelled }) {
  const [selectedReason, setSelectedReason] = useState(CANCELLATION_REASONS[0]);
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedReason(CANCELLATION_REASONS[0]);
      setComments('');
      setErrorMsg(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !submitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, submitting, onClose]);

  if (!isOpen || !job) return null;

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);

    try {
      const res = await jobAPI.cancel(job._id, {
        reason: selectedReason,
        comments: comments.trim()
      });

      if (res?.success) {
        onJobCancelled(res.job);
        onClose();
      } else {
        setErrorMsg(res?.message || 'Failed to cancel job tender.');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'An error occurred while cancelling the job.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div 
        className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-job-title"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-rose-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 id="cancel-job-title" className="text-lg font-extrabold text-slate-900">
                Cancel Service Tender
              </h3>
              <p className="text-xs text-slate-500">
                Job #{job._id.slice(-6).toUpperCase()} • Current Status: {job.status?.replace('_', ' ')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition disabled:opacity-50"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleCancelSubmit} className="p-6 space-y-4">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Target Job
            </span>
            <h4 className="text-sm font-bold text-slate-900 line-clamp-2">
              {job.title}
            </h4>
          </div>

          {/* Cancellation Notice */}
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <span>
              Cancelling this job will withdraw it from the marketplace, reject any pending proposals, and release any active dispatch holds.
            </span>
          </div>

          {/* Error Alert */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800">
              <strong>Error:</strong> {errorMsg}
            </div>
          )}

          {/* Reason Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              Please select a reason for cancellation <span className="text-rose-500">*</span>
            </label>
            <div className="space-y-2">
              {CANCELLATION_REASONS.map((reason) => (
                <label 
                  key={reason}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer text-xs transition ${
                    selectedReason === reason
                      ? 'border-emerald-600 bg-emerald-50/50 text-slate-900 font-bold ring-1 ring-emerald-500/30'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="cancellationReason"
                    value={reason}
                    checked={selectedReason === reason}
                    onChange={() => setSelectedReason(reason)}
                    className="accent-emerald-700 w-4 h-4"
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Additional Details (Optional)
            </label>
            <textarea
              rows={2}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Provide any additional context for why you are cancelling..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition disabled:opacity-50"
            >
              Keep Job
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs transition shadow-sm flex items-center gap-2 disabled:opacity-50 active:scale-95"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Cancelling Job...</span>
                </>
              ) : (
                <span>Confirm Cancellation</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

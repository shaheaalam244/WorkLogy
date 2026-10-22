import React, { useState, useEffect } from 'react';
import { 
  X, 
  Trash2, 
  AlertTriangle, 
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { jobAPI } from '../../api/job.api';

export default function DeleteJobModal({ job, isOpen, onClose, onJobDeleted }) {
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (isOpen) {
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

  const isAssignedOrActive = ['assigned', 'in_progress', 'completion_pending'].includes(job.status);

  const handleDeleteSubmit = async (e) => {
    e.preventDefault();
    if (isAssignedOrActive) return;

    setErrorMsg(null);
    setSubmitting(true);

    try {
      const res = await jobAPI.delete(job._id);
      if (res?.success) {
        onJobDeleted(job._id);
        onClose();
      } else {
        setErrorMsg(res?.message || 'Failed to delete job tender.');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'An error occurred while deleting the job.');
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
        className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-job-title"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-rose-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 id="delete-job-title" className="text-lg font-extrabold text-slate-900">
                Delete Job Tender
              </h3>
              <p className="text-xs text-slate-500">
                Permanent record deletion
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
        <form onSubmit={handleDeleteSubmit} className="p-6 space-y-4">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Target Job
            </span>
            <h4 className="text-sm font-bold text-slate-900 line-clamp-2">
              {job.title}
            </h4>
          </div>

          {isAssignedOrActive ? (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900">
              <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                <strong>Cannot Delete:</strong> A verified contractor is currently assigned or executing work on this job. Please cancel the booking contract first if work has not commenced.
              </span>
            </div>
          ) : (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>
                Are you sure you want to delete this job tender? This will remove the request from your customer dashboard and close any existing bids.
              </span>
            </div>
          )}

          {/* Error Alert */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800">
              <strong>Error:</strong> {errorMsg}
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition disabled:opacity-50"
            >
              Cancel
            </button>

            {!isAssignedOrActive && (
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs transition shadow-sm flex items-center gap-2 disabled:opacity-50 active:scale-95"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Job Tender</span>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

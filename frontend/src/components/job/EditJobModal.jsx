import React, { useState, useEffect } from 'react';
import { 
  X, 
  Briefcase, 
  Tag, 
  MapPin, 
  Calendar, 
  Clock, 
  DollarSign, 
  AlertCircle, 
  CheckCircle2, 
  FileText,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import Button from '../common/Button';
import { jobAPI } from '../../api/job.api';
import { categoryAPI } from '../../api/category.api';

export default function EditJobModal({ job, isOpen, onClose, onJobUpdated }) {
  const [categories, setCategories] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const isAssignedOrActive = job && ['assigned', 'in_progress', 'completion_pending'].includes(job.status);

  const [formData, setFormData] = useState({
    title: '',
    category: '',
    subcategory: '',
    description: '',
    urgency: 'medium',
    budgetType: 'fixed',
    budgetAmount: '',
    city: '',
    locality: '',
    address: '',
    preferredDate: '',
    preferredTime: '',
    additionalInstructions: ''
  });

  // Load categories
  useEffect(() => {
    let isMounted = true;
    categoryAPI.getAll().then((res) => {
      if (isMounted && res?.categories) {
        setCategories(res.categories);
      }
    }).catch((err) => console.warn('Failed to load categories for edit:', err.message));
    return () => { isMounted = false; };
  }, []);

  // Prepopulate form when job changes or modal opens
  useEffect(() => {
    if (job && isOpen) {
      setErrorMsg(null);
      setFieldErrors({});
      setFormData({
        title: job.title || '',
        category: job.category?._id || job.category || '',
        subcategory: job.subcategory || '',
        description: job.description || '',
        urgency: job.urgency || 'medium',
        budgetType: job.budget?.type || 'fixed',
        budgetAmount: job.budget?.amount != null ? String(job.budget.amount) : '',
        city: job.location?.city || '',
        locality: job.location?.locality || '',
        address: job.location?.address || '',
        preferredDate: job.preferredDate || '',
        preferredTime: job.preferredTime || '',
        additionalInstructions: job.additionalInstructions || ''
      });
    }
  }, [job, isOpen]);

  // Handle escape key
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

  const validate = () => {
    const errors = {};
    if (!formData.title.trim() || formData.title.trim().length < 3) {
      errors.title = 'Title must be at least 3 characters long.';
    }
    if (!formData.description.trim() || formData.description.trim().length < 10) {
      errors.description = 'Description must be at least 10 characters long.';
    }
    if (!formData.city.trim()) {
      errors.city = 'Service city is required.';
    }
    if (formData.budgetAmount && Number(formData.budgetAmount) < 0) {
      errors.budgetAmount = 'Budget amount cannot be negative.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        subcategory: formData.subcategory.trim(),
        urgency: formData.urgency,
        location: {
          city: formData.city.trim(),
          locality: formData.locality.trim(),
          address: formData.address.trim()
        },
        preferredDate: formData.preferredDate,
        preferredTime: formData.preferredTime,
        additionalInstructions: formData.additionalInstructions.trim()
      };

      // Only include category and budget if not actively assigned
      if (!isAssignedOrActive) {
        if (formData.category) payload.category = formData.category;
        payload.budget = {
          type: formData.budgetType,
          amount: Number(formData.budgetAmount) || 0
        };
      }

      const res = await jobAPI.update(job._id, payload);
      if (res?.success) {
        onJobUpdated(res.job);
        onClose();
      } else {
        setErrorMsg(res?.message || 'Failed to update job tender.');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'An error occurred while saving changes.');
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
        className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-job-title"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#06684F] border border-emerald-100 flex items-center justify-center">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h3 id="edit-job-title" className="text-lg font-extrabold text-slate-900">
                Edit Service Tender
              </h3>
              <p className="text-xs text-slate-500">
                Update job scope, requirements, budget, or preferred schedule
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

        {/* Assigned Contractor Warning Banner */}
        {isAssignedOrActive && (
          <div className="px-6 py-3 bg-amber-50 border-b border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <span>
              <strong>Professional Assigned:</strong> Core category and agreed price are locked to protect the active booking contract. You can update address, timing, and service notes.
            </span>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong>Error updating job:</strong> {errorMsg}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Job Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Job Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Master Bedroom AC Cooling Repair & Gas Refill"
              className={`w-full px-4 py-2.5 rounded-xl border text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 transition ${
                fieldErrors.title ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200 bg-slate-50/50 focus:bg-white'
              }`}
            />
            {fieldErrors.title && (
              <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.title}</p>
            )}
          </div>

          {/* Category & Subcategory */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Service Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                disabled={isAssignedOrActive}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Specific Service / Subcategory
              </label>
              <input
                type="text"
                value={formData.subcategory}
                onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                placeholder="e.g. Split AC Gas Charging"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 transition"
              />
            </div>
          </div>

          {/* Problem Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Problem Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the issue in detail, symptoms, and specific requirements for contractors..."
              className={`w-full px-4 py-2.5 rounded-xl border text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 transition ${
                fieldErrors.description ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200 bg-slate-50/50 focus:bg-white'
              }`}
            />
            {fieldErrors.description && (
              <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.description}</p>
            )}
          </div>

          {/* Budget & Urgency */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Budget Type
              </label>
              <select
                value={formData.budgetType}
                onChange={(e) => setFormData({ ...formData, budgetType: e.target.value })}
                disabled={isAssignedOrActive}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
              >
                <option value="fixed">Fixed Price</option>
                <option value="hourly">Hourly Rate</option>
                <option value="quote">Quote on Request</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Estimated Budget (₹)
              </label>
              <input
                type="number"
                min="0"
                value={formData.budgetAmount}
                onChange={(e) => setFormData({ ...formData, budgetAmount: e.target.value })}
                placeholder="500"
                disabled={isAssignedOrActive}
                className={`w-full px-4 py-2.5 rounded-xl border text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition ${
                  fieldErrors.budgetAmount ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200 bg-slate-50/50 focus:bg-white'
                }`}
              />
              {fieldErrors.budgetAmount && (
                <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.budgetAmount}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Urgency
              </label>
              <select
                value={formData.urgency}
                onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 transition"
              >
                <option value="low">Low (Flexible)</option>
                <option value="medium">Medium (Within 2-3 Days)</option>
                <option value="high">High (Today / Tomorrow)</option>
                <option value="emergency">Emergency (Within 1 Hour)</option>
              </select>
            </div>
          </div>

          {/* Location Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                City <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="e.g. Lucknow"
                className={`w-full px-4 py-2.5 rounded-xl border text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 transition ${
                  fieldErrors.city ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200 bg-slate-50/50 focus:bg-white'
                }`}
              />
              {fieldErrors.city && (
                <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.city}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Locality / Area
              </label>
              <input
                type="text"
                value={formData.locality}
                onChange={(e) => setFormData({ ...formData, locality: e.target.value })}
                placeholder="e.g. Gomti Nagar, Indira Nagar"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Detailed Street Address
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="e.g. Flat 402, Royal Palms, Vibhuti Khand"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 transition"
            />
          </div>

          {/* Schedule */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Preferred Date
              </label>
              <input
                type="text"
                value={formData.preferredDate}
                onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
                placeholder="e.g. Tomorrow or 24 Oct"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Preferred Time Slot
              </label>
              <input
                type="text"
                value={formData.preferredTime}
                onChange={(e) => setFormData({ ...formData, preferredTime: e.target.value })}
                placeholder="e.g. Morning 10 AM - 1 PM"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 transition"
              />
            </div>
          </div>

          {/* Additional Instructions */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Special Access / Instructions
            </label>
            <input
              type="text"
              value={formData.additionalInstructions}
              onChange={(e) => setFormData({ ...formData, additionalInstructions: e.target.value })}
              placeholder="e.g. Ring bell twice, technician must carry safety ladder"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 transition"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-[#06684F] hover:bg-[#055742] text-white font-bold text-xs transition shadow-sm flex items-center gap-2 disabled:opacity-50 active:scale-95"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

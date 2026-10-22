import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/common/Button';
import { CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { authAPI } from '../../api/auth.api';

export default function CustomerEditProfile() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    avatar: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        avatar: user.avatar || ''
      });
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSaved(false);

    if (!formData.name.trim()) {
      setError('Please provide your full name');
      return;
    }

    try {
      setSubmitting(true);
      const res = await authAPI.updateDetails({
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        avatar: formData.avatar.trim() || undefined
      });

      if (res?.success && res?.user) {
        if (updateUser) {
          updateUser(res.user);
        }
        setSaved(true);
        setTimeout(() => {
          navigate('/customer/profile');
        }, 1200);
      }
    } catch (err) {
      console.error('Failed to update profile:', err);
      setError(err.response?.data?.message || 'Failed to save changes. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl bg-white border border-slate-200 shadow-sm rounded-3xl p-6 sm:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Edit Profile Details</h1>
          <p className="text-xs text-slate-600 mt-0.5">Update your personal contact details</p>
        </div>
        <button
          onClick={() => navigate('/customer/profile')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Profile</span>
        </button>
      </div>

      {saved && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-700" />
          <span>Profile changes saved to database! Returning to profile overview...</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
          <input
            type="tel"
            placeholder="+91 98765 43210"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Avatar Image URL</label>
          <input
            type="url"
            placeholder="https://..."
            value={formData.avatar}
            onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
            className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700"
          />
        </div>

        <div className="pt-2">
          <Button type="submit" variant="primary" size="md" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}

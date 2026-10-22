import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  ShieldCheck, 
  DollarSign, 
  Zap, 
  FileCheck, 
  Save, 
  RefreshCw, 
  Building, 
  Mail, 
  Phone,
  AlertCircle
} from 'lucide-react';
import { adminAPI } from '../../api/admin.api';
import Loader from '../../components/common/Loader';

export default function AdminSettings() {
  const [settings, setSettings] = useState({
    platformName: 'WorkLogy',
    supportEmail: 'support@worklogy.in',
    supportPhone: '+91 522 400 8900',
    operatingCity: 'Lucknow',
    commissionRate: 5,
    emergencyDispatch: {
      defaultRadiusKm: 15,
      responseTimeoutMins: 30,
      defaultCallOutFee: 499,
      enabled: true
    },
    approvalRules: {
      requireAdminApproval: true,
      requireDocuments: true,
      autoApproveVerified: false
    },
    cancellationRules: {
      freeCancellationMins: 15,
      cancellationPenaltyPercent: 10
    }
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getSettings();
      if (res?.settings) {
        setSettings(res.settings);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setSuccessMsg('');
      setErrorMsg('');

      const res = await adminAPI.updateSettings(settings);
      if (res?.settings) {
        setSettings(res.settings);
        setSuccessMsg('Platform settings successfully saved and audited!');
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20">
        <Loader text="Loading platform configuration..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-4xl">
      {/* Header */}
      <div className="bg-white border border-slate-200/90 shadow-2xs rounded-3xl p-6 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-purple-800 uppercase tracking-wider bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200/60">
              System Configuration
            </span>
            <span className="text-xs text-slate-500 font-medium">· Platform Controls</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
            Platform Settings
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl mt-1">
            Configure platform commission fees, professional approval rules, emergency dispatch parameters, and support channels.
          </p>
        </div>

        <button
          onClick={fetchSettings}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reload</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold animate-in fade-in">
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold animate-in fade-in">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        {/* 1. General Platform Identity */}
        <div className="bg-white border border-slate-200/90 shadow-2xs rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Building className="w-4 h-4 text-purple-700" />
            <span>Platform Identity & Support</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Platform Brand Name</label>
              <input
                type="text"
                value={settings.platformName || ''}
                onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-600"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Primary Operating City</label>
              <input
                type="text"
                value={settings.operatingCity || ''}
                onChange={(e) => setSettings({ ...settings, operatingCity: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-600"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Support Email</label>
              <input
                type="email"
                value={settings.supportEmail || ''}
                onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-600"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Support Helpline</label>
              <input
                type="text"
                value={settings.supportPhone || ''}
                onChange={(e) => setSettings({ ...settings, supportPhone: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-600"
              />
            </div>
          </div>
        </div>

        {/* 2. Platform Fees & Commission */}
        <div className="bg-white border border-slate-200/90 shadow-2xs rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span>Platform Commission Rate</span>
          </h3>

          <div className="max-w-xs space-y-1">
            <label className="text-xs font-bold text-slate-700">Standard Platform Fee Percentage (%)</label>
            <input
              type="number"
              min="0"
              max="50"
              value={settings.commissionRate ?? 5}
              onChange={(e) => setSettings({ ...settings, commissionRate: Number(e.target.value) })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-600"
            />
            <p className="text-[11px] text-slate-500">Automatically deducted from gross booking price into escrow fee.</p>
          </div>
        </div>

        {/* 3. Professional Approval Rules */}
        <div className="bg-white border border-slate-200/90 shadow-2xs rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-purple-700" />
            <span>Professional Registration & Approval Rules</span>
          </h3>

          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={!!settings.approvalRules?.requireAdminApproval}
                onChange={(e) => setSettings({
                  ...settings,
                  approvalRules: { ...settings.approvalRules, requireAdminApproval: e.target.checked }
                })}
                className="rounded text-purple-800"
              />
              <div>
                <p className="text-xs font-bold text-slate-800">Require Explicit Admin Approval</p>
                <p className="text-[11px] text-slate-500">New professionals remain hidden from public search until reviewed and approved.</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={!!settings.approvalRules?.requireDocuments}
                onChange={(e) => setSettings({
                  ...settings,
                  approvalRules: { ...settings.approvalRules, requireDocuments: e.target.checked }
                })}
                className="rounded text-purple-800"
              />
              <div>
                <p className="text-xs font-bold text-slate-800">Require Verification Documents for Regulated Trades</p>
                <p className="text-[11px] text-slate-500">Contractors must submit trade certificates before receiving approvals.</p>
              </div>
            </label>
          </div>
        </div>

        {/* 4. Emergency Dispatch Parameters */}
        <div className="bg-white border border-slate-200/90 shadow-2xs rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Emergency Dispatch Engine</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Dispatch Search Radius (km)</label>
              <input
                type="number"
                value={settings.emergencyDispatch?.defaultRadiusKm || 15}
                onChange={(e) => setSettings({
                  ...settings,
                  emergencyDispatch: { ...settings.emergencyDispatch, defaultRadiusKm: Number(e.target.value) }
                })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-600"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Call-out Base Fee (₹)</label>
              <input
                type="number"
                value={settings.emergencyDispatch?.defaultCallOutFee || 499}
                onChange={(e) => setSettings({
                  ...settings,
                  emergencyDispatch: { ...settings.emergencyDispatch, defaultCallOutFee: Number(e.target.value) }
                })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-600"
              />
            </div>

            <div className="flex items-center gap-2 pt-5">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!settings.emergencyDispatch?.enabled}
                  onChange={(e) => setSettings({
                    ...settings,
                    emergencyDispatch: { ...settings.emergencyDispatch, enabled: e.target.checked }
                  })}
                  className="rounded text-purple-800"
                />
                <span>Emergency Dispatch Enabled</span>
              </label>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple-800 hover:bg-purple-900 text-white text-xs font-bold shadow-xs transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving Platform Settings...' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

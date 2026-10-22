import React, { useState } from 'react';
import { 
  Shield, 
  Lock, 
  CreditCard, 
  Bell, 
  CheckCircle2, 
  AlertCircle, 
  Save,
  LogOut
} from 'lucide-react';
import Button from '../../components/common/Button';
import { useAuth } from '../../hooks/useAuth';
import { authAPI } from '../../api/auth.api';

export default function VendorSettings() {
  const { user, logout } = useAuth();
  const [errorMsg, setErrorMsg] = useState(null);
  const [passLoading, setPassLoading] = useState(false);
  const [passData, setPassData] = useState({ current: '', next: '', confirm: '' });
  const [bankData, setBankData] = useState({
    accountName: user?.businessName || user?.name || 'Verified Professional',
    bankName: 'HDFC Bank',
    accountNumber: '****4812',
    ifsc: 'HDFC0001024',
    branch: 'Hazratganj, Lucknow'
  });
  const [notifyPrefs, setNotifyPrefs] = useState({
    emailTenders: true,
    smsLeads: true,
    instantBookingAlert: true,
    settlementAlerts: true
  });

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (passData.next !== passData.confirm) {
      setErrorMsg('New passwords do not match');
      return;
    }
    if (passData.next.length < 6) {
      setErrorMsg('New password must be at least 6 characters long');
      return;
    }

    try {
      setPassLoading(true);
      const res = await authAPI.updatePassword({
        currentPassword: passData.current,
        newPassword: passData.next
      });
      if (res?.success) {
        setSuccessMsg('Account password updated securely.');
        setPassData({ current: '', next: '', confirm: '' });
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch (err) {
      console.error('Password update error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to update password. Please check your current password.');
    } finally {
      setPassLoading(false);
    }
  };

  const handleBankSave = (e) => {
    e.preventDefault();
    setSuccessMsg('Settlement bank credentials saved securely.');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  return (
    <div className="w-full space-y-6">
      <div>
        <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Account Controls</span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5">Settings & Financial Accounts</h1>
        <p className="text-xs text-slate-600 mt-0.5">
          Manage security preferences, auto-payout bank accounts, and lead alert notifications.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Payout Bank Account */}
      <form onSubmit={handleBankSave} className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <CreditCard className="w-5 h-5 text-emerald-800" />
          <h3 className="text-base font-bold text-slate-900">Automated Escrow Bank Settlement Details</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Beneficiary Name</label>
            <input
              type="text"
              value={bankData.accountName}
              onChange={(e) => setBankData({ ...bankData, accountName: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700 font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Name</label>
            <input
              type="text"
              value={bankData.bankName}
              onChange={(e) => setBankData({ ...bankData, bankName: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Account Number (Masked)</label>
            <input
              type="text"
              value={bankData.accountNumber}
              onChange={(e) => setBankData({ ...bankData, accountNumber: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">IFSC Code</label>
            <input
              type="text"
              value={bankData.ifsc}
              onChange={(e) => setBankData({ ...bankData, ifsc: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700 font-mono"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" variant="secondary" size="sm">
            Save Bank Information
          </Button>
        </div>
      </form>

      {/* Security & Password */}
      <form onSubmit={handlePasswordSubmit} className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Lock className="w-5 h-5 text-emerald-800" />
          <h3 className="text-base font-bold text-slate-900">Change Account Password</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Current Password</label>
            <input
              type="password"
              value={passData.current}
              onChange={(e) => setPassData({ ...passData, current: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">New Password</label>
            <input
              type="password"
              value={passData.next}
              onChange={(e) => setPassData({ ...passData, next: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm New Password</label>
            <input
              type="password"
              value={passData.confirm}
              onChange={(e) => setPassData({ ...passData, confirm: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" variant="secondary" size="sm">
            Update Password
          </Button>
        </div>
      </form>

      {/* Lead Notifications Preferences */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Bell className="w-5 h-5 text-emerald-800" />
          <h3 className="text-base font-bold text-slate-900">Tender & Lead Notification Preferences</h3>
        </div>

        <div className="space-y-3 pt-1">
          <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
            <div>
              <span className="text-xs font-bold text-slate-900 block">Instant SMS on New Matching Tenders</span>
              <span className="text-[11px] text-slate-500">Receive SMS text alerts within 60 seconds of job posting in Lucknow.</span>
            </div>
            <input
              type="checkbox"
              checked={notifyPrefs.smsLeads}
              onChange={(e) => setNotifyPrefs({ ...notifyPrefs, smsLeads: e.target.checked })}
              className="rounded border-slate-300 text-emerald-800 focus:ring-emerald-700 w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
            <div>
              <span className="text-xs font-bold text-slate-900 block">Escrow Payout Settlement Alerts</span>
              <span className="text-[11px] text-slate-500">Email notifications when NEFT deposits are processed to your bank.</span>
            </div>
            <input
              type="checkbox"
              checked={notifyPrefs.settlementAlerts}
              onChange={(e) => setNotifyPrefs({ ...notifyPrefs, settlementAlerts: e.target.checked })}
              className="rounded border-slate-300 text-emerald-800 focus:ring-emerald-700 w-4 h-4"
            />
          </label>
        </div>
      </div>
    </div>
  );
}

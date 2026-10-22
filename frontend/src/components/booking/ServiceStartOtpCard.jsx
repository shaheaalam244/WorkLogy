import React, { useState, useEffect } from 'react';
import { 
  Key, 
  ShieldCheck, 
  Copy, 
  Check, 
  RefreshCw, 
  AlertTriangle, 
  Clock, 
  Eye, 
  EyeOff, 
  Lock
} from 'lucide-react';
import { bookingAPI } from '../../api/booking.api';

export default function ServiceStartOtpCard({ bookingId, status, initialOtp, onStatusChange }) {
  const [otpData, setOtpData] = useState(initialOtp ? { success: true, otp: initialOtp } : null);
  const [loading, setLoading] = useState(!initialOtp);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [visible, setVisible] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  const fetchOtp = async () => {
    if (!bookingId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await bookingAPI.getStartOtp(bookingId);
      if (res?.success && res?.otp) {
        setOtpData(res);
      } else {
        setError(res?.message || 'Could not load service OTP.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Unable to retrieve service code.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialOtp) {
      setOtpData({ success: true, otp: initialOtp });
      setLoading(false);
    } else {
      fetchOtp();
    }
  }, [bookingId, initialOtp]);

  const handleCopy = () => {
    if (!otpData?.otp) return;
    navigator.clipboard.writeText(otpData.otp);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRegenerate = async () => {
    if (!window.confirm('Regenerate a new 6-digit Service Start OTP? The previous code will be invalidated immediately.')) {
      return;
    }
    try {
      setRegenerating(true);
      const res = await bookingAPI.regenerateStartOtp(bookingId);
      if (res?.success) {
        setOtpData(prev => ({
          ...prev,
          otp: res.otp,
          expiresAt: res.expiresAt,
          attempts: 0,
          isConsumed: false
        }));
        setError(null);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to regenerate OTP. Please try again.');
    } finally {
      setRegenerating(false);
    }
  };

  // If status is completed or cancelled, don't show active card
  if (['completed', 'cancelled'].includes(status)) {
    return null;
  }

  // If OTP is already verified and consumed
  if (otpData?.isConsumed || status === 'in_progress') {
    return (
      <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-emerald-800">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
          </div>
          <div>
            <span className="font-bold block text-emerald-900">Service Start OTP Verified</span>
            <span className="text-[11px] text-emerald-700">Professional verified arrival in person • Work officially started</span>
          </div>
        </div>
        <span className="px-2 py-0.5 bg-emerald-200/60 text-emerald-900 rounded font-semibold text-[10px] tracking-wider uppercase shrink-0">
          Verified On-Site
        </span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 animate-pulse flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-slate-200 shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="w-36 h-3 bg-slate-200 rounded" />
          <div className="w-24 h-2.5 bg-slate-100 rounded" />
        </div>
      </div>
    );
  }

  if (error || !otpData?.otp) {
    if (['confirmed', 'scheduled', 'assigned', 'awaiting_confirmation'].includes(status)) {
      return (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-emerald-900">
            <Key className="w-4 h-4 text-emerald-700 shrink-0" />
            <div>
              <span className="font-bold block">Service Start OTP</span>
              <span className="text-[11px] text-emerald-700">Required by the professional on arrival before work begins.</span>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchOtp}
            disabled={loading}
            className="px-3 py-1.5 bg-emerald-800 text-white rounded-xl font-bold text-xs hover:bg-emerald-900 transition flex items-center justify-center gap-1.5 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>View Service Start OTP</span>
          </button>
        </div>
      );
    }
    return null;
  }

  const digits = otpData.otp.split('');

  return (
    <div className="bg-gradient-to-br from-emerald-900 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-emerald-800/60 relative overflow-hidden">
      {/* Background ambient pattern */}
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 space-y-3">
        {/* Header Strip */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-800/80 text-emerald-300 ring-1 ring-emerald-500/30">
              <Key className="w-3.5 h-3.5" />
            </span>
            <div>
              <h4 className="text-xs font-bold tracking-tight text-white flex items-center gap-1.5">
                <span>Service Start OTP</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Required on Arrival
                </span>
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setVisible(!visible)}
              className="p-1 rounded text-slate-300 hover:text-white transition"
              title={visible ? 'Hide digits' : 'Reveal digits'}
            >
              {visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              disabled={regenerating}
              onClick={handleRegenerate}
              className="p-1 rounded text-slate-300 hover:text-white transition disabled:opacity-50"
              title="Regenerate a new OTP"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* OTP Digits Visual Blocks */}
        <div className="flex items-center justify-between gap-1.5 sm:gap-2 max-w-sm py-1">
          {digits.map((digit, index) => (
            <div
              key={index}
              className="flex-1 aspect-square max-w-[48px] rounded-xl bg-slate-950/80 border border-emerald-500/40 flex items-center justify-center font-mono text-xl sm:text-2xl font-black text-emerald-300 shadow-inner select-all"
            >
              {visible ? digit : '•'}
            </div>
          ))}

          <button
            type="button"
            onClick={handleCopy}
            className={`ml-2 px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 ${
              copied
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100 border border-emerald-600/50'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Safety instruction */}
        <div className="flex items-start gap-2 pt-1 border-t border-emerald-800/50 text-[11px] text-slate-300 leading-snug">
          <Lock className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
          <p>
            Share this 6-digit code with your professional <span className="text-white font-semibold underline decoration-emerald-400">only after they arrive in person</span> at your location. Never provide this code over phone, chat, or WhatsApp.
          </p>
        </div>
      </div>
    </div>
  );
}

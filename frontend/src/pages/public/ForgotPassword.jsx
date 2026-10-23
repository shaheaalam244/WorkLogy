import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, ShieldCheck, KeyRound } from 'lucide-react';
import Button from '../../components/common/Button';
import { authAPI } from '../../api/auth.api';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resetToken, setResetToken] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !email.trim()) {
      setError('Please enter your account email address.');
      return;
    }

    try {
      setLoading(true);
      const res = await authAPI.forgotPassword(email.trim().toLowerCase());
      if (res?.success) {
        setSuccess(true);
        if (res.resetToken) {
          setResetToken(res.resetToken);
        }
      } else {
        setError(res?.message || 'Failed to process password reset request.');
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to send reset instructions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#F7F9FC]">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-8 sm:p-10 shadow-sm space-y-6">
        
        {/* Back Link */}
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Login</span>
        </Link>

        {/* Icon & Heading */}
        <div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#06684F] flex items-center justify-center mb-4">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-[#111827] tracking-tight">
            Forgot Password?
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
            Enter the email address registered with your WorkLogy account to receive reset instructions.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
                <span>Reset Instructions Sent!</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                If an account exists for <strong className="text-slate-900">{email}</strong>, we have prepared password recovery credentials.
              </p>
            </div>

            {resetToken && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                <span className="font-bold text-slate-700 block">Direct Reset Link:</span>
                <Link
                  to={`/reset-password?token=${resetToken}`}
                  className="inline-flex items-center gap-1.5 text-[#06684F] font-bold hover:underline break-all"
                >
                  <span>Click here to set your new password</span>
                </Link>
              </div>
            )}

            <div className="pt-2">
              <Link to="/login">
                <Button variant="secondary" size="md" className="w-full">
                  Return to Sign In
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-bold text-slate-700 mb-1.5">
                Registered Email Address *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#06684F] focus:bg-white rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#06684F]/20 transition"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={loading}
              className="w-full bg-[#06684F] hover:bg-[#055742] text-white font-bold"
            >
              {loading ? 'Sending Instructions...' : 'Send Reset Link'}
            </Button>
          </form>
        )}

        <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
          <span>Remember your password? </span>
          <Link to="/login" className="font-bold text-[#06684F] hover:underline">
            Sign In
          </Link>
        </div>

      </div>
    </div>
  );
}

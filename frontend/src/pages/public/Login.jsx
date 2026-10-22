import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Wrench, Mail, Lock, ShieldCheck, UserCheck } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/common/Button';
import { authAPI } from '../../api/auth.api';

export default function Login() {
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get('redirect');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, switchRole } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await authAPI.login({ email, password });
      if (res?.success) {
        login(res.user, res.token);
        if (redirectUrl) navigate(redirectUrl);
        else if (res.user.role === 'vendor') navigate('/vendor/dashboard');
        else if (res.user.role === 'admin') navigate('/admin/dashboard');
        else navigate('/customer/dashboard');
      } else {
        setError(res?.message || 'Invalid credentials');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error signing in');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = (role) => {
    switchRole(role);
    if (redirectUrl) navigate(redirectUrl);
    else if (role === 'vendor') navigate('/vendor/dashboard');
    else if (role === 'admin') navigate('/admin/dashboard');
    else navigate('/customer/dashboard');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6">
        
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-3 shadow-sm">
            <Wrench className="w-6 h-6 text-emerald-800" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Sign In to Worklogy</h1>
          <p className="text-xs text-slate-600 mt-1">Access your customer or pro contractor portal</p>
        </div>

        {/* Quick 1-Click Demo Buttons */}
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
          <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block text-center">
            Instant 1-Click Demo Logins:
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleQuickDemo('customer')}
              className="py-1.5 px-2 rounded-xl text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200 transition"
            >
              Customer
            </button>
            <button
              onClick={() => handleQuickDemo('vendor')}
              className="py-1.5 px-2 rounded-xl text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200 transition"
            >
              Vendor Pro
            </button>
            <button
              onClick={() => handleQuickDemo('admin')}
              className="py-1.5 px-2 rounded-xl text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200 hover:bg-purple-200 transition"
            >
              Admin
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 shadow-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 shadow-sm"
              />
            </div>
          </div>

          <Button type="submit" variant="primary" size="md" loading={loading} className="w-full">
            Sign In to Account
          </Button>
        </form>

        <div className="text-center text-xs text-slate-600 pt-2 border-t border-slate-100">
          <span>Don't have an account yet? </span>
          <Link to="/register" className="text-emerald-800 font-bold hover:underline">
            Register here
          </Link>
        </div>

      </div>
    </div>
  );
}

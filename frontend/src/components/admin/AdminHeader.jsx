import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  ShieldCheck, 
  Bell, 
  Menu, 
  ChevronDown, 
  LogOut, 
  Settings, 
  Terminal, 
  Layers, 
  User, 
  Compass, 
  Briefcase,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import logoSvg from '../../assets/logo.svg';

const ROUTE_TITLES = {
  '/admin': 'Dashboard',
  '/admin/dashboard': 'Dashboard',
  '/admin/vendors': 'Professional Approvals',
  '/admin/users': 'Users & Customers',
  '/admin/categories': 'Categories & Services',
  '/admin/jobs': 'Jobs & Bookings',
  '/admin/payments': 'Payments & Escrow',
  '/admin/disputes': 'Disputes & Moderation',
  '/admin/areas': 'Service Areas',
  '/admin/notifications': 'Notifications',
  '/admin/settings': 'Platform Settings',
  '/admin/logs': 'Activity Logs',
  '/admin/analytics': 'Platform Analytics'
};

export default function AdminHeader({ unreadCount = 0, onOpenMobileMenu, adminRoleLabel = 'Super Admin' }) {
  const { user, logout, switchRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  const profileRef = useRef(null);
  const roleRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
      if (roleRef.current && !roleRef.current.contains(e.target)) {
        setRoleSwitcherOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRoleSwitch = async (role) => {
    if (switching) return;
    setSwitching(true);
    setRoleSwitcherOpen(false);
    try {
      const ok = await switchRole(role);
      if (ok) {
        if (role === 'customer') navigate('/customer/dashboard');
        else if (role === 'vendor') navigate('/vendor/dashboard');
        else if (role === 'guest') navigate('/');
      }
    } finally {
      setSwitching(false);
    }
  };

  const handleLogout = () => {
    setProfileDropdownOpen(false);
    logout();
    navigate('/login');
  };

  const currentTitle = ROUTE_TITLES[location.pathname] || 'Admin Console';

  return (
    <header className="h-16 px-4 sm:px-6 bg-white border-b border-slate-200/90 shadow-2xs flex items-center justify-between shrink-0 z-40 select-none">
      {/* Left: Mobile Menu Trigger + Brand + Breadcrumb */}
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        {/* Mobile menu button */}
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
          aria-label="Open Admin Navigation"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* WorkLogy Brand Mark & Admin Badge */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Link to="/admin/dashboard" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl bg-purple-800 text-white flex items-center justify-center font-black text-sm shadow-2xs group-hover:bg-purple-900 transition">
              <img src={logoSvg} alt="WorkLogy" className="w-4 h-4 invert brightness-0" />
            </div>
            <span className="text-base font-black tracking-tight text-slate-900">
              WorkLogy
            </span>
          </Link>
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200/80">
            Admin Console
          </span>
        </div>

        {/* Dynamic Breadcrumb / Page Title */}
        <div className="hidden md:flex items-center gap-2 pl-3 border-l border-slate-200 text-xs">
          <span className="text-slate-400 font-medium">Platform</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-900 font-bold">{currentTitle}</span>
        </div>
      </div>

      {/* Right: Status Pill + Demo Role Switcher + Notifications + Profile Menu */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Live Status Pill */}
        <div className="hidden xl:flex items-center gap-1.5 text-[11px] font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200/80">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
          <span>Live Oversight · Lucknow</span>
        </div>

        {/* Demo Role Switcher Dropdown (Preserved for seamless dev testing) */}
        <div className="relative" ref={roleRef}>
          <button
            onClick={() => setRoleSwitcherOpen(!roleSwitcherOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
            title="Switch demo portal mode"
          >
            <Layers className="w-3.5 h-3.5 text-purple-700" />
            <span className="hidden sm:inline">Role:</span>
            <span className="font-bold text-slate-900">Admin</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {roleSwitcherOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-1.5 border-b border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Demo Role Switcher</p>
                <p className="text-xs text-slate-600">Switch workspace views:</p>
              </div>

              <button
                onClick={() => handleRoleSwitch('customer')}
                disabled={switching}
                className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center justify-between transition"
              >
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  <span>Customer Portal</span>
                </div>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </button>

              <button
                onClick={() => handleRoleSwitch('vendor')}
                disabled={switching}
                className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center justify-between transition"
              >
                <div className="flex items-center gap-2">
                  <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Vendor Portal</span>
                </div>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </button>

              <button
                onClick={() => handleRoleSwitch('guest')}
                disabled={switching}
                className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center justify-between transition"
              >
                <div className="flex items-center gap-2">
                  <Compass className="w-3.5 h-3.5 text-purple-600" />
                  <span>Public Website</span>
                </div>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </button>
            </div>
          )}
        </div>

        {/* Admin Notifications Bell */}
        <Link
          to="/admin/notifications"
          className="relative p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
          aria-label="Admin Notifications"
          title="Admin Notifications Center"
        >
          <Bell className="w-4 h-4 text-slate-700" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white border-2 border-white">
              {unreadCount}
            </span>
          )}
        </Link>

        {/* Admin Profile Menu */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center gap-2 p-1.5 pl-2 rounded-xl hover:bg-slate-100 border border-transparent hover:border-slate-200 transition"
          >
            <div className="w-7 h-7 rounded-lg bg-purple-800 text-white font-bold text-xs flex items-center justify-center shrink-0">
              {user?.name?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-slate-900 leading-tight">
                {user?.name || 'Administrator'}
              </p>
              <p className="text-[10px] text-purple-700 font-semibold leading-tight">
                {adminRoleLabel}
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {profileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3.5 py-2.5 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900 truncate">{user?.name || 'Administrator'}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email || 'admin@worklogy.in'}</p>
                <span className="inline-block mt-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                  {adminRoleLabel}
                </span>
              </div>

              <div className="py-1">
                <Link
                  to="/admin/settings"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition"
                >
                  <Settings className="w-3.5 h-3.5 text-slate-500" />
                  <span>Platform Settings</span>
                </Link>

                <Link
                  to="/admin/logs"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition"
                >
                  <Terminal className="w-3.5 h-3.5 text-slate-500" />
                  <span>Activity Logs</span>
                </Link>
              </div>

              <div className="pt-1 border-t border-slate-100">
                <button
                  onClick={handleLogout}
                  className="w-full px-3.5 py-2 text-left text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 font-semibold transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Exit Admin / Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

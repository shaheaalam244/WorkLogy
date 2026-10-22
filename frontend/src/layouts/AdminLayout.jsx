import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { 
  ShieldAlert, 
  Users, 
  CheckSquare, 
  Layers, 
  Map, 
  Briefcase, 
  CreditCard,
  AlertTriangle,
  Bell,
  Settings,
  Terminal,
  LogOut,
  X,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import AdminHeader from '../components/admin/AdminHeader';
import { adminAPI } from '../api/admin.api';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const fetchUnread = async () => {
      try {
        const res = await adminAPI.getNotifications();
        if (isMounted && res?.unreadCount !== undefined) {
          setUnreadNotifs(res.unreadCount);
        }
      } catch (err) {
        // Silently tolerate if unauthorized or offline
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const links = [
    { to: '/admin/dashboard', label: 'Admin Dashboard', icon: ShieldAlert },
    { to: '/admin/vendors', label: 'Professional Approvals', icon: CheckSquare },
    { to: '/admin/users', label: 'Users & Customers', icon: Users },
    { to: '/admin/categories', label: 'Categories & Services', icon: Layers },
    { to: '/admin/jobs', label: 'Jobs & Bookings', icon: Briefcase },
    { to: '/admin/payments', label: 'Payments & Escrow', icon: CreditCard },
    { to: '/admin/disputes', label: 'Disputes & Moderation', icon: AlertTriangle },
    { to: '/admin/areas', label: 'Service Areas', icon: Map },
    { to: '/admin/notifications', label: 'Notifications', icon: Bell, badge: unreadNotifs },
    { to: '/admin/settings', label: 'Platform Settings', icon: Settings },
    { to: '/admin/logs', label: 'Activity Logs', icon: Terminal },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const adminRoleLabel = user?.adminRole
    ? user.adminRole.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
    : 'Super Admin';

  return (
    <div className="h-screen flex flex-col bg-slate-50 text-slate-900 overflow-hidden">
      {/* Dedicated Admin Header (Replaces Public Website Navbar) */}
      <AdminHeader
        unreadCount={unreadNotifs}
        onOpenMobileMenu={() => setMobileMenuOpen(true)}
        adminRoleLabel={adminRoleLabel}
      />

      {/* Mobile & Tablet Off-Canvas Drawer Backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 lg:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile & Tablet Drawer Panel */}
      {mobileMenuOpen && (
        <div className="fixed inset-y-0 left-0 w-[280px] sm:w-[320px] bg-white z-50 p-4 flex flex-col justify-between shadow-2xl lg:hidden overflow-y-auto animate-in slide-in-from-left duration-200">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-purple-700" />
                <span>Admin Console</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Profile Status Card in Drawer */}
            <div className="p-3 mb-4 rounded-xl bg-purple-50 border border-purple-200/80">
              <p className="text-[10px] text-purple-800 font-bold uppercase tracking-wider">Platform Administration</p>
              <h3 className="text-sm font-bold text-slate-900 truncate mt-0.5">{adminRoleLabel}</h3>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">{user?.email || 'admin@worklogy.in'}</p>
            </div>

            {/* Navigation Links in Drawer */}
            <nav className="space-y-1">
              {links.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-purple-800 text-white shadow-xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`
                    }
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate whitespace-nowrap">{item.label}</span>
                    </div>
                    {item.badge > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-rose-500 text-white rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* Drawer Logout */}
          <div className="pt-3 border-t border-slate-100 mt-4">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleLogout();
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Exit Admin</span>
            </button>
          </div>
        </div>
      )}

      {/* Dashboard Body Shell (Fixed Height viewport container) */}
      <div className="flex-1 min-h-0 w-full overflow-hidden">
        <div className="admin-layout">
          {/* Desktop Admin Sidebar (Stationary 260px Column) */}
          <aside className="hidden lg:flex w-[260px] shrink-0 h-full flex-col py-6">
            <div className="bg-white border border-slate-200/90 shadow-2xs rounded-2xl p-4 h-full flex flex-col justify-between overflow-hidden">
              <div className="flex-1 min-h-0 flex flex-col">
                {/* Profile Card */}
                <div className="p-3 mb-3.5 rounded-xl bg-purple-50 border border-purple-200/80 shrink-0">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-purple-800 font-bold uppercase tracking-wider">Security & Control</p>
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 truncate mt-0.5">{adminRoleLabel}</h3>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">{user?.email || 'admin@worklogy.in'}</p>
                </div>

                {/* Navigation links (Stationary container with internal scroll only if items exceed viewport) */}
                <nav className="space-y-0.5 flex-1 min-h-0 overflow-y-auto pr-1 admin-sidebar-scroll">
                  {links.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                          `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                            isActive
                              ? 'bg-purple-800 text-white shadow-xs font-semibold'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                          }`
                        }
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-4 h-4 shrink-0 transition-colors" />
                          <span className="truncate whitespace-nowrap">{item.label}</span>
                        </div>
                        {item.badge > 0 && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-rose-500 text-white rounded-full">
                            {item.badge}
                          </span>
                        )}
                      </NavLink>
                    );
                  })}
                </nav>
              </div>

              {/* Exit Admin Button pinned to bottom */}
              <div className="mt-2 pt-3 border-t border-slate-100 shrink-0">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Exit Admin</span>
                </button>
              </div>
            </div>
          </aside>

          {/* Main Content Area: Independently Scrolling on the Right */}
          <main className="admin-main flex-1 min-w-0 h-full overflow-y-auto py-6 sm:py-8 pr-1 lg:pr-2 admin-main-scroll">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

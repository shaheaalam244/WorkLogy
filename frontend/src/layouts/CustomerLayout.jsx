import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Compass, 
  PlusCircle, 
  Briefcase, 
  FileText, 
  Activity, 
  MessageSquare, 
  Bookmark, 
  MapPin, 
  Bell, 
  User, 
  LogOut,
  ShieldCheck,
  Menu,
  X,
  Calendar,
  CreditCard,
  Star,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useSocketContext } from '../context/SocketContext';
import { useNotifications } from '../context/NotificationContext';
import Navbar from '../components/common/Navbar';
import MobileNavigation from '../components/common/MobileNavigation';
import chatAPI from '../api/chat.api';

export default function CustomerLayout() {
  const { user, logout } = useAuth();
  const { socket } = useSocketContext();
  const { unreadCount: unreadNotifications } = useNotifications();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    const fetchUnreadMessages = async () => {
      try {
        const res = await chatAPI.getUnreadCount();
        if (res?.success) setUnreadMessages(res.unreadCount || 0);
      } catch (err) {
        // Graceful handling
      }
    };
    fetchUnreadMessages();
  }, []);

  // Real-time unread messages listener
  useEffect(() => {
    if (!socket) return;
    const handleSync = () => {
      chatAPI.getUnreadCount().then(res => {
        if (res?.success) setUnreadMessages(res.unreadCount || 0);
      }).catch(() => {});
    };
    socket.on('new_message_notification', handleSync);
    socket.on('messages_read', handleSync);
    return () => {
      socket.off('new_message_notification', handleSync);
      socket.off('messages_read', handleSync);
    };
  }, [socket]);

  const links = [
    { to: '/customer/dashboard', label: 'Overview', icon: LayoutDashboard },
    { to: '/customer/explore', label: 'Find a Professional', icon: Compass },
    { to: '/customer/create-job', label: 'Request a Service', icon: PlusCircle, badge: 'New' },
    { to: '/customer/my-jobs', label: 'My Jobs', icon: FileText },
    { to: '/customer/bookings', label: 'Bookings', icon: Calendar },
    { to: '/customer/messages', label: 'Messages', icon: MessageSquare, count: unreadMessages },
    { to: '/customer/saved', label: 'Saved Professionals', icon: Bookmark },
    { to: '/customer/addresses', label: 'Saved Addresses', icon: MapPin },
    { to: '/customer/payments', label: 'Payments', icon: CreditCard },
    { to: '/customer/reviews', label: 'Reviews & Ratings', icon: Star },
    { to: '/customer/notifications', label: 'Notifications', icon: Bell, count: unreadNotifications },
    { to: '/customer/profile', label: 'Account Profile', icon: User },
    { to: '/customer/support', label: 'Help & Support', icon: HelpCircle },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 text-slate-900 overflow-hidden">
      {/* Fixed Top Navbar (Shrink-0) */}
      <div className="shrink-0 z-40">
        <Navbar />
      </div>

      {/* Mobile/Tablet Sub-Header Bar (Hidden on lg: 1024px+) */}
      <div className="lg:hidden shrink-0 bg-white border-b border-slate-200/90 px-4 sm:px-6 py-3 flex items-center justify-between shadow-2xs z-30">

        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-emerald-800 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
            {user?.name?.[0]?.toUpperCase() || 'C'}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 truncate max-w-[200px] sm:max-w-xs">
              {user?.name || 'Customer Portal'}
            </p>
            <p className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              Verified Client · Lucknow
            </p>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
          aria-label="Open Customer Navigation"
        >
          <Menu className="w-4 h-4" />
          <span>Customer Menu</span>
        </button>
      </div>

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
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>Customer Console</span>
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
            <div className="p-3 mb-4 rounded-xl bg-emerald-50 border border-emerald-200/80">
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-800 font-bold uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                <span>WorkLogy Homeowner</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 truncate mt-0.5">
                {user?.name || 'Customer'}
              </h3>
              <p className="text-xs text-slate-500 truncate mt-0.5">{user?.email}</p>
            </div>

            {/* Primary Actions in Drawer */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <NavLink
                to="/customer/create-job"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-800 text-white text-xs font-bold shadow-xs"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Request Service</span>
              </NavLink>
              <NavLink
                to="/customer/explore"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold"
              >
                <Compass className="w-3.5 h-3.5 text-emerald-800" />
                <span>Find Pro</span>
              </NavLink>
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
                          ? 'bg-emerald-800 text-white shadow-xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`
                    }
                  >
                    <div className="flex items-center gap-3 truncate">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate whitespace-nowrap">{item.label}</span>
                    </div>

                    {item.badge && (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {item.badge}
                      </span>
                    )}

                    {item.count > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500 text-white">
                        {item.count}
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
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* Dashboard Body Shell (Fixed Height viewport container) */}
      <div className="flex-1 min-h-0 w-full overflow-hidden">
        <div className="customer-layout">
          {/* Desktop Sidebar (Stationary 260px Column) */}
          <aside className="hidden lg:flex w-[260px] shrink-0 h-full flex-col py-6">
            <div className="bg-white border border-slate-200/90 shadow-2xs rounded-2xl p-4 h-full flex flex-col justify-between overflow-hidden">
              <div className="flex-1 min-h-0 flex flex-col">
                {/* Customer Profile Status Banner */}
                <div className="p-3 mb-3.5 rounded-xl bg-emerald-50 border border-emerald-200/80 shrink-0">
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-800 font-bold uppercase tracking-wider">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Customer Portal</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 truncate mt-0.5">
                    {user?.name || 'Customer'}
                  </h3>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">{user?.email}</p>
                </div>

                {/* Primary Customer Actions */}
                <div className="grid grid-cols-2 gap-1.5 mb-3 shrink-0">
                  <NavLink
                    to="/customer/create-job"
                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-center transition shadow-xs group"
                  >
                    <PlusCircle className="w-4 h-4 mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold leading-tight">Request Service</span>
                  </NavLink>
                  <NavLink
                    to="/customer/explore"
                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-center transition border border-slate-200/80 group"
                  >
                    <Compass className="w-4 h-4 mb-1 text-emerald-800 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold leading-tight">Find Pro</span>
                  </NavLink>
                </div>

                {/* Navigation Links (Independent subtle scroll if viewport is short) */}
                <nav className="space-y-0.5 flex-1 min-h-0 overflow-y-auto pr-1 customer-sidebar-scroll">
                  {links.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                          `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all group ${
                            isActive
                              ? 'bg-emerald-800 text-white shadow-xs font-semibold'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                          }`
                        }
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <Icon className="w-4 h-4 shrink-0 transition-colors" />
                          <span className="truncate whitespace-nowrap">{item.label}</span>
                        </div>

                        {item.badge && (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            {item.badge}
                          </span>
                        )}

                        {item.count > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500 text-white">
                            {item.count}
                          </span>
                        )}
                      </NavLink>
                    );
                  })}
                </nav>
              </div>

              {/* Logout Button */}
              <div className="pt-3 border-t border-slate-100 mt-2 shrink-0">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </aside>

          {/* Main Content Area: Independently Scrolling on the Right */}
          <main className="customer-main flex-1 min-w-0 h-full overflow-y-auto py-6 sm:py-8 pr-1 lg:pr-2 pb-20 lg:pb-8 customer-main-scroll">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Persistent Mobile Bottom Navigation */}
      <MobileNavigation />
    </div>
  );
}

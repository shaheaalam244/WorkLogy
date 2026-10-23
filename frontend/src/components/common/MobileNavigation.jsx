import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Wrench, Calendar, Bell, User } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../context/NotificationContext';

export default function MobileNavigation() {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();

  const navItems = [
    {
      to: '/',
      label: 'Home',
      icon: Home,
      exact: true
    },
    {
      to: '/categories',
      label: 'Services',
      icon: Wrench
    },
    {
      to: user ? '/customer/bookings' : '/login?redirect=/customer/bookings',
      label: 'Bookings',
      icon: Calendar
    },
    {
      to: user ? '/customer/notifications' : '/login?redirect=/customer/notifications',
      label: 'Alerts',
      icon: Bell,
      badge: unreadCount > 0 ? unreadCount : null
    },
    {
      to: user ? '/customer/profile' : '/login',
      label: user ? 'Profile' : 'Log In',
      icon: User
    }
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] px-2 py-1.5 safe-bottom"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all duration-150 min-h-[48px] relative ${
                  isActive
                    ? 'text-[#06684F] font-bold'
                    : 'text-slate-500 hover:text-slate-900 font-medium'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="relative">
                    <Icon
                      className={`w-5 h-5 transition-transform duration-150 ${
                        isActive ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'
                      }`}
                    />
                    {item.badge && (
                      <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white text-[9px] font-black flex items-center justify-center shadow-xs">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] mt-1 tracking-tight truncate max-w-[64px] ${
                      isActive ? 'font-bold text-[#06684F]' : 'font-medium text-slate-500'
                    }`}
                  >
                    {item.label}
                  </span>
                  {isActive && (
                    <span className="absolute bottom-0 w-8 h-0.5 rounded-full bg-[#06684F]" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

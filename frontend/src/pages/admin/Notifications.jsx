import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  CheckCheck, 
  ShieldAlert, 
  AlertTriangle, 
  Zap, 
  UserCheck, 
  CreditCard, 
  FileText, 
  RefreshCw,
  Clock
} from 'lucide-react';
import { adminAPI } from '../../api/admin.api';
import Loader from '../../components/common/Loader';
import { formatDate } from '../../utils/formatters';

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getNotifications();
      if (res?.notifications) {
        setNotifications(res.notifications);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await adminAPI.markNotificationRead('all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleMarkSingleRead = async (id) => {
    try {
      await adminAPI.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const getNotifIcon = (title) => {
    const t = (title || '').toLowerCase();
    if (t.includes('emergency') || t.includes('alert')) return <Zap className="w-5 h-5 text-amber-500" />;
    if (t.includes('application') || t.includes('professional')) return <UserCheck className="w-5 h-5 text-purple-700" />;
    if (t.includes('payment') || t.includes('refund')) return <CreditCard className="w-5 h-5 text-emerald-600" />;
    if (t.includes('dispute')) return <AlertTriangle className="w-5 h-5 text-rose-600" />;
    return <Bell className="w-5 h-5 text-blue-600" />;
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="bg-white border border-slate-200/90 shadow-2xs rounded-3xl p-6 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-purple-800 uppercase tracking-wider bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200/60">
              Platform Alerts
            </span>
            <span className="text-xs text-slate-500 font-medium">· Real-time Events</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
            Notifications & Communications
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl mt-1">
            In-app notification center for new professional registrations, emergency requests, payment events, and security notifications.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-800 hover:bg-purple-900 text-white text-xs font-bold transition shadow-xs"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Mark All as Read ({unreadCount})</span>
            </button>
          )}

          <button
            onClick={fetchNotifications}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="py-20">
          <Loader text="Loading notification alerts..." />
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center">
          <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No notifications</h3>
          <p className="text-xs text-slate-500 mt-1">You are all caught up!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n._id}
              onClick={() => !n.isRead && handleMarkSingleRead(n._id)}
              className={`bg-white border p-5 rounded-2xl shadow-2xs flex items-start gap-4 transition cursor-pointer ${
                n.isRead ? 'border-slate-200/80 bg-slate-50/30' : 'border-purple-200 bg-purple-50/20'
              }`}
            >
              <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs">
                {getNotifIcon(n.title)}
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-sm ${n.isRead ? 'font-semibold text-slate-800' : 'font-black text-slate-900'}`}>
                      {n.title}
                    </h3>
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse"></span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(n.createdAt)}
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>

                {n.sender && (
                  <p className="text-[10px] text-slate-400">
                    Triggered by: {n.sender.name || n.sender.email}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

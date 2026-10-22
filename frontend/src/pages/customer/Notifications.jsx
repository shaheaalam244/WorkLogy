import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  CheckCheck, 
  Check, 
  Briefcase, 
  MessageSquare, 
  Star, 
  ShieldCheck, 
  Clock, 
  ArrowRight,
  Settings,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  X,
  Zap,
  Mail,
  RefreshCw
} from 'lucide-react';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import { useNotifications } from '../../context/NotificationContext';

export default function CustomerNotifications() {
  const { 
    notifications, 
    unreadCount, 
    loading, 
    markAsRead, 
    markAllAsRead, 
    preferences, 
    updatePreferences,
    fetchNotifications 
  } = useNotifications();
  
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [localPrefs, setLocalPrefs] = useState({ ...preferences });
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsSuccess, setPrefsSuccess] = useState(false);

  const getIcon = (type) => {
    switch (type) {
      case 'quotation_received':
      case 'application_received':
        return <DollarSign className="w-5 h-5 text-emerald-700" />;
      case 'booking_confirmed':
      case 'proposal_accepted':
        return <CheckCircle2 className="w-5 h-5 text-emerald-700" />;
      case 'status_change':
        return <Zap className="w-5 h-5 text-blue-700" />;
      case 'cancellation':
        return <AlertTriangle className="w-5 h-5 text-rose-600" />;
      case 'job_alert':
      case 'job_assigned':
        return <Briefcase className="w-5 h-5 text-emerald-700" />;
      case 'message':
        return <MessageSquare className="w-5 h-5 text-purple-700" />;
      case 'review':
        return <Star className="w-5 h-5 text-amber-500 fill-current" />;
      case 'verification':
        return <ShieldCheck className="w-5 h-5 text-blue-700" />;
      default:
        return <Bell className="w-5 h-5 text-slate-600" />;
    }
  };

  const formatTime = (createdAt) => {
    if (!createdAt) return 'Recently';
    const date = new Date(createdAt);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleCardClick = (item) => {
    const notifId = item._id || item.id;
    if (!item.isRead && notifId) {
      markAsRead(notifId);
    }
    if (item.link) {
      navigate(item.link);
    }
  };

  const handleOpenPreferences = () => {
    setLocalPrefs({ ...preferences });
    setPrefsSuccess(false);
    setIsPreferencesOpen(true);
  };

  const handleSavePreferences = async (e) => {
    e.preventDefault();
    setSavingPrefs(true);
    setPrefsSuccess(false);
    const res = await updatePreferences(localPrefs);
    setSavingPrefs(false);
    if (res?.success) {
      setPrefsSuccess(true);
      setTimeout(() => {
        setIsPreferencesOpen(false);
        setPrefsSuccess(false);
      }, 1500);
    }
  };

  const filteredNotifications = filter === 'unread'
    ? notifications.filter(n => !n.isRead)
    : notifications;

  if (loading && notifications.length === 0) {
    return (
      <div className="py-20 flex justify-center">
        <Loader text="Loading your notifications..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl w-full">
      {/* ── 1. Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Activity Center</span>
            {unreadCount > 0 ? (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500 text-white shadow-2xs">
                {unreadCount} unread
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                All caught up
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 tracking-tight">Notifications</h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Real-time alerts regarding pro quotations, booking confirmations, milestone updates, and cancellations.
          </p>
        </div>

        {/* Header Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={handleOpenPreferences}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            <span>Email Preferences</span>
          </button>

          {unreadCount > 0 && (
            <Button 
              variant="secondary" 
              size="sm" 
              icon={CheckCheck} 
              onClick={markAllAsRead}
            >
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      {/* ── 2. Filter Tabs (All vs Unread) ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition border ${
              filter === 'all'
                ? 'bg-emerald-800 text-white border-emerald-800 shadow-2xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            All Notifications ({notifications.length})
          </button>

          <button
            type="button"
            onClick={() => setFilter('unread')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition border ${
              filter === 'unread'
                ? 'bg-emerald-800 text-white border-emerald-800 shadow-2xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span>Unread Only</span>
            {unreadCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                filter === 'unread' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-700'
              }`}>
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={() => fetchNotifications(true)}
          className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 transition"
        >
          <RefreshCw className="w-3 h-3 text-slate-400" />
          <span>Sync feed</span>
        </button>
      </div>

      {/* ── 3. Notifications List ── */}
      {filteredNotifications.length > 0 ? (
        <div className="space-y-3">
          {filteredNotifications.map((item) => {
            const notifId = item._id || item.id;
            return (
              <div
                key={notifId}
                onClick={() => handleCardClick(item)}
                className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-4 ${
                  item.isRead 
                    ? 'bg-white border-slate-200 hover:border-slate-300' 
                    : 'bg-emerald-50/40 border-emerald-200 hover:bg-emerald-50/70 shadow-2xs'
                }`}
              >
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200 shrink-0 shadow-2xs mt-0.5">
                    {getIcon(item.type)}
                  </div>
                  
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className={`text-sm ${item.isRead ? 'font-semibold text-slate-800' : 'font-bold text-slate-900'}`}>
                        {item.title}
                      </h2>
                      {!item.isRead && (
                        <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed break-words">
                      {item.message}
                    </p>
                    <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(item.createdAt)}
                      </span>
                      {item.link && (
                        <span className="text-emerald-700 font-semibold flex items-center gap-0.5 hover:underline">
                          View details <ArrowRight className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {!item.isRead && notifId && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(notifId);
                      }}
                      className="px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:text-emerald-900 hover:bg-emerald-100/60 rounded-lg transition"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3 shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Bell className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900">
            {filter === 'unread' ? 'No Unread Notifications' : 'No Notifications'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
            {filter === 'unread'
              ? 'You have read all your alerts. Switch to "All Notifications" to review your complete activity history.'
              : 'You are completely caught up! New quotations, pro messages, and service milestones will appear here in real time.'}
          </p>
          {filter === 'unread' && (
            <button
              type="button"
              onClick={() => setFilter('all')}
              className="px-3.5 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Show All Notifications
            </button>
          )}
        </div>
      )}

      {/* ── 4. Notification Preferences Modal ── */}
      {isPreferencesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-2xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Email Preferences</h3>
                  <p className="text-[11px] text-slate-500">Manage what email updates you receive</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPreferencesOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePreferences} className="space-y-4">
              <div className="space-y-3">
                <label className="flex items-start justify-between gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/70 transition">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">New Quotation Alerts</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Receive an email when verified pros submit quotes on your jobs.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={localPrefs.emailQuotations !== false}
                    onChange={(e) => setLocalPrefs({ ...localPrefs, emailQuotations: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-800 focus:ring-emerald-700 mt-1 cursor-pointer"
                  />
                </label>

                <label className="flex items-start justify-between gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/70 transition">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Booking Confirmations</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Receive booking confirmation emails with schedule & OTP info.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={localPrefs.emailBookings !== false}
                    onChange={(e) => setLocalPrefs({ ...localPrefs, emailBookings: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-800 focus:ring-emerald-700 mt-1 cursor-pointer"
                  />
                </label>

                <label className="flex items-start justify-between gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/70 transition">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Service Milestone Updates</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Receive emails when work commences on-site and when completion is ready for review.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={localPrefs.emailStatusUpdates !== false}
                    onChange={(e) => setLocalPrefs({ ...localPrefs, emailStatusUpdates: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-800 focus:ring-emerald-700 mt-1 cursor-pointer"
                  />
                </label>

                <label className="flex items-start justify-between gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/70 transition">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Cancellation Notices</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Receive important emails if a booking or tender is cancelled.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={localPrefs.emailCancellations !== false}
                    onChange={(e) => setLocalPrefs({ ...localPrefs, emailCancellations: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-800 focus:ring-emerald-700 mt-1 cursor-pointer"
                  />
                </label>
              </div>

              {prefsSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-700" />
                  <span>Preferences saved successfully!</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPreferencesOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPrefs}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-800 hover:bg-emerald-900 text-white transition shadow-xs disabled:opacity-50"
                >
                  {savingPrefs ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

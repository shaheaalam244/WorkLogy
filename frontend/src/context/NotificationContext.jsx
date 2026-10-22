import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { notificationAPI } from '../api/notification.api';
import { useAuthContext } from './AuthContext';
import { useSocketContext } from './SocketContext';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuthContext();
  const { socket } = useSocketContext();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // In-flight guard to prevent duplicate rapid clicks
  const markingIdsRef = useRef(new Set());
  const markingAllRef = useRef(false);

  // Fetch all notifications & true unread count from MongoDB
  const fetchNotifications = useCallback(async (quiet = false) => {
    const currentUserId = user?.id || user?._id;
    if (!currentUserId) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      if (!quiet) setLoading(true);
      setError(null);
      const res = await notificationAPI.getAll({ limit: 50 });
      if (res?.success) {
        setNotifications(res.notifications || []);
        // Strict source of truth from backend DB count
        const serverUnread = typeof res.unreadCount === 'number' 
          ? res.unreadCount 
          : (res.notifications || []).filter(n => !n.isRead).length;
        setUnreadCount(serverUnread);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err?.response?.data?.message || err.message || 'Failed to load notifications');
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [user]);

  // Sync unread count only (lightweight)
  const syncUnreadCount = useCallback(async () => {
    const currentUserId = user?.id || user?._id;
    if (!currentUserId) return;
    try {
      const res = await notificationAPI.getUnreadCount();
      if (res?.success && typeof res.unreadCount === 'number') {
        setUnreadCount(res.unreadCount);
      }
    } catch (err) {
      // Quiet fail on network hiccup
    }
  }, [user]);

  // Preferences state
  const [preferences, setPreferences] = useState({
    emailQuotations: true,
    emailBookings: true,
    emailStatusUpdates: true,
    emailCancellations: true,
    emailMarketing: false
  });

  const fetchPreferences = useCallback(async () => {
    const currentUserId = user?.id || user?._id;
    if (!currentUserId) return;
    try {
      const res = await notificationAPI.getPreferences();
      if (res?.success && res.preferences) {
        setPreferences(res.preferences);
      }
    } catch (err) {
      // Quiet fallback
    }
  }, [user]);

  const updatePreferences = useCallback(async (newPrefs) => {
    try {
      const res = await notificationAPI.updatePreferences(newPrefs);
      if (res?.success && res.preferences) {
        setPreferences(res.preferences);
        return { success: true, preferences: res.preferences };
      }
      return { success: false, message: res?.message };
    } catch (err) {
      return { success: false, error: err?.response?.data?.message || err.message };
    }
  }, []);

  // Fetch when authenticated user changes or logs in
  useEffect(() => {
    const currentUserId = user?.id || user?._id;
    if (currentUserId) {
      fetchNotifications();
      fetchPreferences();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user, fetchNotifications, fetchPreferences]);


  // Socket.IO real-time event listeners
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (data) => {
      if (!data) return;
      const notif = data.notification || data;
      
      setNotifications(prev => {
        // Prevent duplicate notifications in list
        const exists = prev.some(n => (n._id && n._id === notif._id) || (n.id && n.id === notif.id));
        if (exists) return prev;
        return [notif, ...prev];
      });

      if (typeof data.unreadCount === 'number') {
        setUnreadCount(data.unreadCount);
      } else {
        setUnreadCount(prev => prev + 1);
      }
    };

    const handleNotificationsRead = (data) => {
      if (!data) return;

      if (data.all) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      } else if (data.id) {
        setNotifications(prev => prev.map(n => 
          (n._id === data.id || n.id === data.id) ? { ...n, isRead: true } : n
        ));
        if (typeof data.unreadCount === 'number') {
          setUnreadCount(data.unreadCount);
        } else {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      } else if (data.deletedId) {
        setNotifications(prev => prev.filter(n => n._id !== data.deletedId && n.id !== data.deletedId));
        if (typeof data.unreadCount === 'number') {
          setUnreadCount(data.unreadCount);
        }
      }
    };

    // Generic lead alerts can also trigger a quiet sync
    const handleLeadAlert = () => {
      fetchNotifications(true);
    };

    socket.on('new_notification', handleNewNotification);
    socket.on('notifications_read', handleNotificationsRead);
    socket.on('new_lead_alert', handleLeadAlert);
    socket.on('new_instant_job_lead', handleLeadAlert);

    return () => {
      socket.off('new_notification', handleNewNotification);
      socket.off('notifications_read', handleNotificationsRead);
      socket.off('new_lead_alert', handleLeadAlert);
      socket.off('new_instant_job_lead', handleLeadAlert);
    };
  }, [socket, fetchNotifications]);

  // Mark single notification as read
  const markAsRead = useCallback(async (id) => {
    if (!id || markingIdsRef.current.has(id)) return;

    // Check if it's already read locally
    const target = notifications.find(n => n._id === id || n.id === id);
    if (target && target.isRead) return;

    markingIdsRef.current.add(id);

    // Optimistic UI update
    setNotifications(prev => prev.map(n => 
      (n._id === id || n.id === id) ? { ...n, isRead: true } : n
    ));
    setUnreadCount(prev => Math.max(0, prev - 1));

    try {
      const res = await notificationAPI.markAsRead(id);
      if (res?.success && typeof res.unreadCount === 'number') {
        setUnreadCount(res.unreadCount);
      }
    } catch (err) {
      console.error('Failed to mark notification as read on backend:', err);
      // Revert if backend rejected
      fetchNotifications(true);
    } finally {
      markingIdsRef.current.delete(id);
    }
  }, [notifications, fetchNotifications]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (markingAllRef.current || unreadCount === 0) return;

    markingAllRef.current = true;

    // Optimistic UI update
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);

    try {
      const res = await notificationAPI.markAllAsRead();
      if (res?.success) {
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Failed to mark all as read on backend:', err);
      fetchNotifications(true);
    } finally {
      markingAllRef.current = false;
    }
  }, [unreadCount, fetchNotifications]);

  const value = {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    syncUnreadCount,
    markAsRead,
    markAllAsRead,
    preferences,
    fetchPreferences,
    updatePreferences
  };


  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationContext;

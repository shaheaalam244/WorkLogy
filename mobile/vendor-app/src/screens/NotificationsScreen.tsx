import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/client';
import { socketService } from '../services/socketService';
import { COLORS, SOCKET_EVENTS } from '../constants';
import { formatDate } from '../utils/formatters';
import type { NotificationItem } from '../types';

export default function NotificationsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const isMountedRef = useRef<boolean>(true);

  // Helper to deduplicate and sort notifications newest first
  const normalizeNotifications = (list: NotificationItem[]): NotificationItem[] => {
    const map = new Map<string, NotificationItem>();
    list.forEach((n) => {
      if (n?._id) {
        map.set(n._id, {
          ...n,
          isRead: Boolean(n.isRead || n.read),
          read: Boolean(n.isRead || n.read)
        });
      }
    });

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  };

  const loadNotifications = useCallback(async (isSilent: boolean = false) => {
    try {
      if (!isSilent) setLoading(true);
      setError(null);

      const res = await api.notifications.getAll();
      if (!isMountedRef.current) return;

      if (res?.success && Array.isArray(res.notifications)) {
        setNotifications((prev) => {
          // Merge newly fetched notifications with any existing ones to ensure no items are lost
          const combined = [...res.notifications, ...prev];
          return normalizeNotifications(combined);
        });
      }
    } catch (err: any) {
      if (!isMountedRef.current) return;
      console.warn('Failed to load notifications:', err);
      if (!isSilent) {
        setError(err?.message || 'Could not load notifications. Please check your connection.');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    loadNotifications();

    let socket: any = null;
    const initSocket = async () => {
      try {
        if (user?._id) {
          socket = await socketService.connect(user._id);

          // Handle incoming live notification
          socket.on(SOCKET_EVENTS.NEW_NOTIFICATION, (data: any) => {
            if (!isMountedRef.current) return;
            const newDoc = data?.notification || data;
            if (newDoc?._id) {
              setNotifications((prev) => normalizeNotifications([newDoc, ...prev]));
            }
          });

          // Handle real-time read notifications
          socket.on(SOCKET_EVENTS.NOTIFICATIONS_READ, (data: any) => {
            if (!isMountedRef.current) return;
            if (data?.all) {
              setNotifications((prev) =>
                prev.map((n) => ({ ...n, isRead: true, read: true }))
              );
            } else if (data?.id || data?.notificationId) {
              const targetId = data.id || data.notificationId;
              setNotifications((prev) =>
                prev.map((n) =>
                  n._id === targetId ? { ...n, isRead: true, read: true } : n
                )
              );
            }
          });
        }
      } catch (e) {
        // Fallback silently to polling / pull-to-refresh
      }
    };

    initSocket();

    return () => {
      isMountedRef.current = false;
      if (socket) {
        socket.off(SOCKET_EVENTS.NEW_NOTIFICATION);
        socket.off(SOCKET_EVENTS.NOTIFICATIONS_READ);
      }
    };
  }, [user?._id, loadNotifications]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadNotifications(true);
  };

  // Mark a single notification as read with optimistic update and rollback
  const handleMarkAsRead = async (item: NotificationItem) => {
    if (item.isRead || item.read) return;

    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n._id === item._id ? { ...n, isRead: true, read: true } : n))
    );

    try {
      await api.notifications.markAsRead(item._id);
    } catch (err: any) {
      console.warn('Failed to mark notification as read:', err);
      // Rollback on failure
      if (isMountedRef.current) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === item._id ? { ...n, isRead: false, read: false } : n))
        );
      }
    }
  };

  // Mark all notifications as read
  const handleMarkAllRead = async () => {
    if (markingAll) return;
    const previousState = [...notifications];

    try {
      setMarkingAll(true);
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, read: true }))
      );

      await api.notifications.markAllRead();
    } catch (err: any) {
      console.warn('Failed to mark all as read:', err);
      if (isMountedRef.current) {
        setNotifications(previousState);
        Alert.alert('Action Failed', 'Could not mark all notifications as read. Please try again.');
      }
    } finally {
      if (isMountedRef.current) {
        setMarkingAll(false);
      }
    }
  };

  // Extract navigation target from notification payload
  const handleNotificationPress = async (item: NotificationItem) => {
    // 1. Mark as read immediately
    handleMarkAsRead(item);

    // 2. Resolve destination ID
    const relRes = item.relatedResource;
    const resType = relRes?.resourceType;
    const resId = relRes?.resourceId ? String(relRes.resourceId) : undefined;

    const dataBookingId = item.data?.bookingId || (item as any).bookingId;
    const dataJobId = item.data?.jobId || (item as any).jobId;
    const dataConvId = item.data?.conversationId || (item as any).conversationId;

    // Link parsing fallback
    const linkStr = item.link || '';
    let linkBookingId: string | undefined;
    let linkJobId: string | undefined;
    let linkConvId: string | undefined;

    if (linkStr.includes('/booking/')) {
      linkBookingId = linkStr.split('/booking/')[1]?.split('/')[0]?.split('?')[0];
    } else if (linkStr.includes('/bookings/')) {
      linkBookingId = linkStr.split('/bookings/')[1]?.split('/')[0]?.split('?')[0];
    }

    if (linkStr.includes('/job/')) {
      linkJobId = linkStr.split('/job/')[1]?.split('/')[0]?.split('?')[0];
    } else if (linkStr.includes('/jobs/')) {
      linkJobId = linkStr.split('/jobs/')[1]?.split('/')[0]?.split('?')[0];
    }

    if (linkStr.includes('/chat/')) {
      linkConvId = linkStr.split('/chat/')[1]?.split('/')[0]?.split('?')[0];
    }

    // Destination: Booking
    const resolvedBookingId = (resType === 'booking' ? resId : undefined) || dataBookingId || linkBookingId;
    if (resolvedBookingId) {
      navigation.navigate('VendorJobDetail', {
        bookingId: resolvedBookingId
      });
      return;
    }

    // Destination: Job
    const resolvedJobId = (resType === 'job' ? resId : undefined) || dataJobId || linkJobId;
    if (resolvedJobId) {
      navigation.navigate('VendorJobDetail', {
        jobId: resolvedJobId
      });
      return;
    }

    // Destination: Chat / Conversation
    const resolvedConvId =
      (resType === 'conversation' || resType === 'chat' ? resId : undefined) ||
      dataConvId ||
      linkConvId ||
      (item.type === 'message' && resId);

    if (resolvedConvId) {
      navigation.navigate('ChatDetail', {
        conversationId: resolvedConvId,
        title: item.title || 'Customer Chat'
      });
      return;
    }

    // Destination: Quotation / Application -> Jobs Tab
    if (
      resType === 'quotation' ||
      resType === 'application' ||
      item.type === 'quotation_received' ||
      item.type === 'application_received'
    ) {
      navigation.navigate('JobsTab');
      return;
    }

    // Default fallback: If it mentions job or booking, navigate to Jobs
    if (item.type.includes('job') || item.type.includes('emergency')) {
      navigation.navigate('JobsTab');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'job_alert':
      case 'emergency_lead':
      case 'job_request':
        return { name: 'flash', color: '#DC2626', bg: '#FEE2E2' };
      case 'proposal_accepted':
      case 'quote_accepted':
      case 'booking_confirmed':
      case 'job_assigned':
        return { name: 'checkmark-circle', color: '#10B981', bg: '#ECFDF5' };
      case 'payment_received':
      case 'payout_processed':
        return { name: 'cash', color: '#059669', bg: '#D1FAE5' };
      case 'verification_update':
      case 'proposal_rejected':
        return { name: 'shield-checkmark', color: '#2563EB', bg: '#EFF6FF' };
      case 'cancellation':
        return { name: 'close-circle', color: '#EF4444', bg: '#FEF2F2' };
      case 'message':
        return { name: 'chatbubble-ellipses', color: '#06684F', bg: '#E0F2FE' };
      case 'review':
        return { name: 'star', color: '#F59E0B', bg: '#FEF3C7' };
      default:
        return { name: 'notifications', color: '#4B5563', bg: '#F3F4F6' };
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead && !n.read).length;

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const isUnread = !item.isRead && !item.read;
    const iconConfig = getNotificationIcon(item.type);

    return (
      <TouchableOpacity
        style={[styles.notifCard, isUnread && styles.unreadCard]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.8}
      >
        <View style={[styles.iconBox, { backgroundColor: iconConfig.bg }]}>
          <Ionicons name={iconConfig.name as any} size={20} color={iconConfig.color} />
        </View>

        <View style={styles.contentBox}>
          <View style={styles.topRow}>
            <Text style={[styles.title, isUnread && styles.boldTitle]} numberOfLines={1}>
              {item.title}
            </Text>
            {isUnread && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.message} numberOfLines={2}>
            {item.message}
          </Text>
          <View style={styles.footerRow}>
            <Text style={styles.timestamp}>{formatDate(item.createdAt)}</Text>
            {isUnread && (
              <TouchableOpacity
                onPress={() => handleMarkAsRead(item)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.singleMarkReadBtn}
              >
                <Text style={styles.singleMarkReadText}>Mark read</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* ── HEADER ACTION BAR ── */}
      <View style={styles.actionHeader}>
        <Text style={styles.headerCount}>
          {notifications.length} {notifications.length === 1 ? 'Alert' : 'Alerts'}
          {unreadCount > 0 ? ` (${unreadCount} unread)` : ''}
        </Text>
        {unreadCount > 0 && (
          <TouchableOpacity
            onPress={handleMarkAllRead}
            disabled={markingAll}
            style={styles.markReadBtn}
            activeOpacity={0.7}
          >
            {markingAll ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Text style={styles.markReadText}>Mark all as read</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* ── CONTENT BODY ── */}
      {loading && !refreshing ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : error ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={44} color="#EF4444" />
          <Text style={styles.emptyTitle}>Could Not Load Notifications</Text>
          <Text style={styles.emptySubtext}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadNotifications()}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="notifications-off-outline" size={36} color="#9CA3AF" />
          </View>
          <Text style={styles.emptyTitle}>No Notifications Yet</Text>
          <Text style={styles.emptySubtext}>
            You will receive updates here for incoming job leads, accepted quotes, customer messages, and payments.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[COLORS.primary]}
            />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  actionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  headerCount: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary
  },
  markReadBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8
  },
  markReadText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary
  },
  listContent: {
    padding: 16
  },
  notifCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1
  },
  unreadCard: {
    borderColor: '#93C5FD',
    backgroundColor: '#F8FAFC'
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  contentBox: {
    flex: 1
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  title: {
    fontSize: 14,
    color: COLORS.textDark,
    fontWeight: '600',
    flex: 1
  },
  boldTitle: {
    fontWeight: '800'
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563EB',
    marginLeft: 6
  },
  message: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 6
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2
  },
  timestamp: {
    fontSize: 11,
    color: COLORS.textMuted
  },
  singleMarkReadBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  singleMarkReadText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary
  },
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: COLORS.textMuted
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 6,
    textAlign: 'center'
  },
  emptySubtext: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 19
  },
  retryBtn: {
    marginTop: 14,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 8
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13
  }
});

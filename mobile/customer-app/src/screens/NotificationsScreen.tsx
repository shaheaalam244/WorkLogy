import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { COLORS } from '../theme/colors';
import { formatDate } from '../utils/formatters';

export default function NotificationsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, [user]);

  const loadNotifications = async () => {
    if (!user) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      setLoading(true);
      const res = await api.notifications.getAll();
      if (res?.notifications) {
        setNotifications(res.notifications);
      }
    } catch (err) {
      console.warn('Failed to load notifications:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleMarkAllRead = async () => {
    const previous = notifications;
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true, readAt: n.readAt || new Date().toISOString() })));
    try {
      await api.notifications.markAllAsRead();
    } catch (err) {
      console.warn('Failed to mark all as read:', err);
      setNotifications(previous);
    }
  };

  const handlePressNotification = async (item: any) => {
    const notifId = item._id || item.id;
    if (!item.isRead) {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) =>
          (n._id === notifId || n.id === notifId)
            ? { ...n, isRead: true, readAt: new Date().toISOString() }
            : n
        )
      );
      try {
        await api.notifications.markAsRead(notifId);
      } catch (err) {
        console.warn('Failed to mark notification as read:', err);
        // Rollback on network failure
        setNotifications((prev) =>
          prev.map((n) =>
            (n._id === notifId || n.id === notifId)
              ? { ...n, isRead: false, readAt: null }
              : n
          )
        );
      }
    }

    // Related resource navigation
    const resourceType = item.relatedResource?.resourceType || item.type;
    const rawResourceId = item.relatedResource?.resourceId || item.bookingId || item.jobId;
    const resourceId = typeof rawResourceId === 'object' ? (rawResourceId?._id || rawResourceId?.id) : rawResourceId;

    // Check if notification text/link contains a human-readable booking or request reference (e.g., BK-86251993, REQ-CF663C, DIR-12345678)
    const textToScan = `${item.title || ''} ${item.message || ''} ${item.link || ''}`;
    const refMatch = textToScan.match(/\b(BK-[A-Z0-9]+|REQ-[A-Z0-9]+|DIR-[A-Z0-9]+)\b/i);
    const discoveredRef = refMatch ? refMatch[1] : null;

    const effectiveId = resourceId || discoveredRef;

    if (
      (resourceType === 'booking' ||
        resourceType === 'booking_update' ||
        resourceType === 'booking_confirmed' ||
        resourceType === 'status_change' ||
        resourceType === 'cancellation') &&
      effectiveId
    ) {
      navigation.navigate('JobDetail', { bookingId: effectiveId, id: effectiveId });
    } else if (
      (resourceType === 'job' ||
        resourceType === 'job_alert' ||
        resourceType === 'application_received' ||
        resourceType === 'quotation_received' ||
        resourceType === 'job_assigned') &&
      effectiveId
    ) {
      navigation.navigate('JobDetail', { bookingId: effectiveId, jobId: effectiveId, id: effectiveId });
    } else if (resourceType === 'chat' || resourceType === 'message') {
      navigation.navigate('MessagesTab');
    } else if (item.link) {
      const matchBooking = String(item.link).match(/\/bookings\/([a-zA-Z0-9-]+)/);
      const matchJob = String(item.link).match(/\/jobs\/([a-zA-Z0-9-]+)/);
      if (matchBooking && matchBooking[1]) {
        navigation.navigate('JobDetail', { bookingId: matchBooking[1], id: matchBooking[1] });
      } else if (matchJob && matchJob[1]) {
        navigation.navigate('JobDetail', { bookingId: matchJob[1], jobId: matchJob[1], id: matchJob[1] });
      } else if (item.link.includes('booking') || item.link.includes('job')) {
        navigation.navigate('MyJobs');
      }
    } else if (effectiveId) {
      navigation.navigate('JobDetail', { bookingId: effectiveId, id: effectiveId });
    }
  };

  const getNotificationIcon = (type?: string) => {
    switch (type) {
      case 'booking':
      case 'booking_update':
      case 'booking_confirmed':
        return <Ionicons name="briefcase" size={20} color={COLORS.primary} />;
      case 'emergency':
        return <Ionicons name="warning" size={20} color="#DC2626" />;
      case 'chat':
      case 'message':
        return <Ionicons name="chatbubble-ellipses" size={20} color="#2563EB" />;
      case 'payment':
        return <Ionicons name="card" size={20} color="#16A34A" />;
      case 'job_alert':
      case 'quotation_received':
        return <Ionicons name="pricetag" size={20} color="#F59E0B" />;
      default:
        return <Ionicons name="notifications" size={20} color={COLORS.primary} />;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header Bar with Mark All Read */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>Updates about your jobs & bookings</Text>
        </View>
        {notifications.some((n) => !n.isRead) && (
          <TouchableOpacity onPress={handleMarkAllRead} style={styles.markReadBtn} activeOpacity={0.7}>
            <Text style={styles.markReadText}>Mark all as read</Text>
          </TouchableOpacity>
        )}
      </View>

      {!user ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="lock-closed-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>Sign in to view alerts</Text>
          <Text style={styles.emptyText}>
            Log in to your WorkLogy account to receive technician arrival alerts and booking updates.
          </Text>
          <TouchableOpacity style={styles.loginBtn} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginBtnText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      ) : loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>No notifications yet</Text>
          <Text style={styles.emptyText}>
            When a technician is dispatched, provides an OTP, or completes a job, you'll see real-time updates here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id || item.id || String(Math.random())}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadNotifications(); }} />}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, !item.isRead && styles.unreadCard]}
              activeOpacity={0.75}
              onPress={() => handlePressNotification(item)}
            >
              <View style={styles.iconCircle}>{getNotificationIcon(item.type)}</View>
              <View style={styles.cardBody}>
                <View style={styles.cardTop}>
                  <Text style={[styles.cardTitle, !item.isRead && styles.unreadCardTitle]}>
                    {item.title || 'Service Notification'}
                  </Text>
                  {!item.isRead && <View style={styles.unreadDot} />}
                </View>
                <Text style={styles.cardMessage}>{item.message || item.body || item.text}</Text>
                <View style={styles.cardBottomRow}>
                  <Text style={styles.cardTime}>{formatDate(item.createdAt || new Date())}</Text>
                  {(item.relatedResource?.resourceId || item.bookingId || item.link) && (
                    <Text style={styles.viewDetailsHint}>View details ›</Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textDark
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  markReadBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8
  },
  markReadText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '700'
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
    marginTop: 12
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18
  },
  loginBtn: {
    marginTop: 16,
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700'
  },
  listContent: {
    padding: 12
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: COLORS.border
  },
  unreadCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0'
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  cardBody: {
    flex: 1
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark
  },
  unreadCardTitle: {
    color: '#065F46',
    fontWeight: '800'
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary
  },
  cardMessage: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 16
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6
  },
  cardTime: {
    fontSize: 10,
    color: COLORS.textMuted
  },
  viewDetailsHint: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '700'
  }
});

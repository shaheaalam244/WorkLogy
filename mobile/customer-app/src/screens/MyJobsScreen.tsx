import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert
} from 'react-native';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { COLORS } from '../theme/colors';
import { formatCurrency, formatDate, getStatusColor, formatStatusText } from '../utils/formatters';
import type { Booking } from '../types';

export default function MyJobsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed' | 'cancelled'>('active');

  useEffect(() => {
    if (!user) {
      setLoading(false);
      setBookings([]);
      return;
    }
    loadBookings();
  }, [user, activeTab]);

  const loadBookings = async () => {
    if (!user) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      setLoading(true);
      const res = await api.bookings.getMyBookings();
      if (res?.bookings) {
        setBookings(res.bookings);
      }
    } catch (err: any) {
      if (!err?.message?.includes('token missing') && !err?.message?.includes('Not authorized')) {
        console.warn('Failed to load bookings:', err);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadBookings();
  };

  const handleCancel = (bookingId: string) => {
    Alert.alert(
      'Cancel Service',
      'Are you sure you want to cancel this booking? Cancellation before technician dispatch incurs zero fee.',
      [
        { text: 'Keep Booking', style: 'cancel' },
        {
          text: 'Cancel Job',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.bookings.cancelBooking(bookingId, 'Customer requested cancellation via mobile app.');
              Alert.alert('Booking Cancelled', 'Your request has been cancelled.');
              loadBookings();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Could not cancel booking.');
            }
          }
        }
      ]
    );
  };

  const filteredBookings = bookings.filter((b) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'active') {
      return [
        'open',
        'quotations_received',
        'pending_acceptance',
        'awaiting_confirmation',
        'assigned',
        'confirmed',
        'scheduled',
        'on_the_way',
        'arrived',
        'in_progress',
        'completion_pending',
        'payment_pending',
        'pending'
      ].includes(b.status);
    }
    if (activeTab === 'completed') return b.status === 'completed';
    if (activeTab === 'cancelled') return ['cancelled', 'declined', 'disputed'].includes(b.status);
    return true;
  });

  const renderBookingCard = ({ item }: { item: any }) => {
    const isEmergency = item.jobId?.isEmergency || item.urgency === 'emergency' || item.serviceTitle?.toLowerCase().includes('emergency');
    const isCompleted = item.status === 'completed';
    const canCancel = ['pending', 'pending_acceptance', 'open', 'confirmed', 'scheduled'].includes(item.status);
    const amount = item.pricing?.amount ?? item.totalAmount ?? item.amount ?? 0;
    const title = item.serviceTitle || item.title || 'Home Service';
    const refCode = item.bookingReference || (item._id ? `#${item._id.slice(-6).toUpperCase()}` : '');
    const vendorName = item.vendor?.businessName || item.vendor?.name || item.vendorName;

    return (
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            {isEmergency && (
              <View style={styles.emergencyPill}>
                <Text style={styles.emergencyPillText}>EMERGENCY ⚡</Text>
              </View>
            )}
            {item.isJobRequest && (
              <View style={[styles.emergencyPill, { backgroundColor: '#E0E7FF' }]}>
                <Text style={[styles.emergencyPillText, { color: '#3730A3' }]}>POSTED JOB</Text>
              </View>
            )}
            <Text style={styles.bookingId}>{refCode}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
            <Text style={[styles.statusBadgeText, { color: getStatusColor(item.status) }]}>
              {formatStatusText(item.status)}
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.serviceTitle}>{title}</Text>
        <Text style={styles.serviceDate}>
          📅 {formatDate(item.scheduledDate || item.date || item.createdAt)} • {item.timeSlot || item.scheduledTime || 'Flexible'}
        </Text>

        {/* Vendor or Applicant info */}
        {vendorName ? (
          <Text style={{ fontSize: 13, color: '#475569', marginTop: 4, fontWeight: '600' }}>
            Specialist: {vendorName}
          </Text>
        ) : item.isJobRequest && (item.applicantsCount || 0) > 0 ? (
          <Text style={{ fontSize: 13, color: '#059669', marginTop: 4, fontWeight: '700' }}>
            💬 {item.applicantsCount} Professional Quotes Received
          </Text>
        ) : null}

        {/* Arrival OTP Display for Customer */}
        {item.arrivalOtp && !item.isOtpVerified && (
          <View style={styles.otpCard}>
            <View style={styles.otpHeader}>
              <Text style={styles.otpIcon}>🔐</Text>
              <Text style={styles.otpTitle}>ARRIVAL SECURITY PIN (OTP)</Text>
            </View>
            <Text style={styles.otpCode}>{item.arrivalOtp}</Text>
            <Text style={styles.otpDesc}>
              Do NOT share this code over phone. Provide it to the technician in person upon physical arrival.
            </Text>
          </View>
        )}

        {/* Amount & Actions */}
        <View style={styles.cardFooter}>
          <Text style={styles.amountText}>
            {amount > 0 ? formatCurrency(amount) : 'Quote Based'}
          </Text>
          <View style={styles.actionRow}>
            {canCancel && (
              <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(item._id)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            )}
            {isCompleted && !item.hasReview && (
              <TouchableOpacity
                style={styles.reviewBtn}
                onPress={() => navigation.navigate('ReviewModal', { bookingId: item._id, vendorName: item.vendor?.businessName })}
              >
                <Text style={styles.reviewBtnText}>Write Review ⭐</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.detailsBtn}
              onPress={() => navigation.navigate('JobDetail', { bookingId: item._id })}
            >
              <Text style={styles.detailsBtnText}>Details ›</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header Tabs */}
      <View style={styles.header}>
        <Text style={styles.screenTitle}>My Service Bookings</Text>
        <View style={styles.tabBar}>
          {(['active', 'completed', 'all', 'cancelled'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabItemText, activeTab === tab && styles.tabItemTextActive]}>
                {tab === 'active' ? 'Active' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Bookings List */}
      {!user ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🔒</Text>
          <Text style={styles.emptyTitle}>Sign in to view your orders</Text>
          <Text style={styles.emptySubtitle}>
            Log in to manage bookings, view 6-digit arrival security PINs, and track active services in real time.
          </Text>
          <TouchableOpacity
            style={styles.bookNowBtn}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.bookNowBtnText}>Log In to WorkLogy</Text>
          </TouchableOpacity>
        </View>
      ) : loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Fetching orders...</Text>
        </View>
      ) : filteredBookings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.emptyTitle}>No {activeTab} bookings found</Text>
          <Text style={styles.emptySubtitle}>
            {activeTab === 'active'
              ? 'You have no active orders in progress right now.'
              : 'Your booking records will appear here.'}
          </Text>
          <TouchableOpacity
            style={styles.bookNowBtn}
            onPress={() => navigation.navigate('ExploreTab')}
          >
            <Text style={styles.bookNowBtnText}>Browse Available Services</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredBookings}
          keyExtractor={(item: Booking) => item._id}
          renderItem={renderBookingCard}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
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
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.textDark,
    marginBottom: 12
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8
  },
  tabItemActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2
  },
  tabItemText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary
  },
  tabItemTextActive: {
    color: COLORS.primary,
    fontWeight: '800'
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
    gap: 12
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  emergencyPill: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  emergencyPillText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#DC2626'
  },
  bookingId: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800'
  },
  serviceTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textDark,
    marginTop: 2
  },
  serviceDate: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  otpCard: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    borderRadius: 12,
    padding: 12,
    marginVertical: 10,
    alignItems: 'center'
  },
  otpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  otpIcon: {
    fontSize: 14
  },
  otpTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#92400E',
    letterSpacing: 0.5
  },
  otpCode: {
    fontSize: 24,
    fontWeight: '900',
    color: '#B45309',
    letterSpacing: 6,
    marginVertical: 4
  },
  otpDesc: {
    fontSize: 9,
    color: '#92400E',
    textAlign: 'center'
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },
  amountText: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.primary
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  cancelBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FEE2E2'
  },
  cancelBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626'
  },
  reviewBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FEF3C7'
  },
  reviewBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309'
  },
  detailsBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9'
  },
  detailsBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textDark
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingText: {
    marginTop: 10,
    fontSize: 12,
    color: COLORS.textSecondary
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30
  },
  emptyEmoji: {
    fontSize: 36,
    marginBottom: 8
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark
  },
  emptySubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16
  },
  bookNowBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10
  },
  bookNowBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800'
  }
});

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator,
  Platform,
  StatusBar
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { COLORS } from '../theme/colors';
import { formatCurrency, formatDate, getStatusColor, formatStatusText } from '../utils/formatters';
import type { Booking } from '../types';

export default function JobDetailScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0
  );
  const { bookingId } = route.params || {};
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBooking();
  }, [bookingId]);

  const loadBooking = async () => {
    try {
      setLoading(true);
      const res = await api.bookings.getBookingById(bookingId);
      if (res?.booking) {
        setBooking(res.booking);
      }
    } catch (err) {
      console.warn('Failed to load booking details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCallTechnician = (phone?: string) => {
    if (!phone) {
      Alert.alert('No Phone', 'Assigned professional contact number is not available yet.');
      return;
    }
    Linking.openURL(`tel:${phone}`);
  };

  const handleOpenChat = () => {
    if (!booking) return;
    navigation.navigate('ChatDetail', {
      bookingId: booking._id,
      otherUser: booking.vendor?.user || booking.vendor,
      title: booking.serviceTitle
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading booking dossier...</Text>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Booking details not found.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const vendorName = booking.vendor?.businessName || booking.vendor?.name || 'Assigned Technician';
  const vendorPhone = booking.vendor?.phone || booking.vendor?.user?.phone;
  const isEmergency = booking.jobId?.isEmergency || booking.serviceTitle?.toLowerCase().includes('emergency');

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 10 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackBtn}>
            <Text style={styles.headerBackText}>‹ Back</Text>
          </TouchableOpacity>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) + '15' }]}>
            <Text style={[styles.statusBadgeText, { color: getStatusColor(booking.status) }]}>
              {formatStatusText(booking.status)}
            </Text>
          </View>
        </View>

        <Text style={styles.title}>{booking.serviceTitle}</Text>
        <Text style={styles.bookingRef}>Order #{booking._id.slice(-8).toUpperCase()}</Text>
      </View>

      {/* Emergency Alert */}
      {isEmergency && (
        <View style={styles.emergencyBanner}>
          <Text style={styles.emergencyIcon}>⚡</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.emergencyTitle}>EMERGENCY DISPATCH IN PROGRESS</Text>
            <Text style={styles.emergencyDesc}>Technician dispatched with rapid priority ETA 30–45 minutes.</Text>
          </View>
        </View>
      )}

      {/* Arrival Security OTP Banner */}
      {booking.arrivalOtp && !booking.isOtpVerified && (
        <View style={styles.otpCard}>
          <View style={styles.otpHeader}>
            <Text style={styles.otpIcon}>🔐</Text>
            <Text style={styles.otpTitle}>PHYSICAL ARRIVAL VERIFICATION PIN</Text>
          </View>
          <Text style={styles.otpNumber}>{booking.arrivalOtp}</Text>
          <Text style={styles.otpDesc}>
            Only share this PIN when the technician physically arrives at your door. This unlocks the service in-progress status.
          </Text>
        </View>
      )}

      {/* Assigned Technician Card */}
      {booking.vendor ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Assigned Service Professional</Text>
          <View style={styles.vendorCard}>
            <View style={styles.vendorHeader}>
              <View style={styles.vendorAvatar}>
                <Text style={styles.vendorAvatarText}>{vendorName.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.vendorName}>{vendorName}</Text>
                <Text style={styles.vendorStatus}>✓ WorkLogy Verified Pro</Text>
              </View>
            </View>

            <View style={styles.actionRow}>
              {vendorPhone ? (
                <TouchableOpacity
                  style={styles.callBtn}
                  onPress={() => handleCallTechnician(vendorPhone)}
                >
                  <Text style={styles.callBtnText}>Call Technician 📞</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity style={styles.chatBtn} onPress={handleOpenChat}>
                <Text style={styles.chatBtnText}>Direct Message 💬</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.waitingCard}>
          <Text style={styles.waitingEmoji}>📡</Text>
          <Text style={styles.waitingTitle}>Locating Available Local Pros</Text>
          <Text style={styles.waitingDesc}>
            Your request has been broadcasted. You will receive an instant assignment notification as soon as a technician accepts.
          </Text>
        </View>
      )}

      {/* Service Location */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Service Location</Text>
        <View style={styles.infoCard}>
          <Text style={styles.addressStreet}>{booking.address?.street || 'Address on file'}</Text>
          <Text style={styles.addressCity}>
            {booking.address?.city} {booking.address?.pincode ? `- ${booking.address.pincode}` : ''}
          </Text>
        </View>
      </View>

      {/* Pricing & Escrow */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment & Escrow Protection</Text>
        <View style={styles.infoCard}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Total Service Value</Text>
            <Text style={styles.priceValue}>{formatCurrency(booking.totalAmount)}</Text>
          </View>
          <View style={styles.escrowNotice}>
            <Text style={styles.escrowText}>
              🛡️ Payment Status: {booking.pricing?.paymentStatus?.replace(/_/g, ' ') || 'Held in Escrow'}. Funds are released to the professional only after you confirm satisfactory work completion.
            </Text>
          </View>
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  loadingText: {
    marginTop: 10,
    fontSize: 12,
    color: COLORS.textSecondary
  },
  errorText: {
    fontSize: 14,
    color: COLORS.textSecondary
  },
  backBtn: {
    marginTop: 12,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: '700'
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  headerBackBtn: {
    paddingVertical: 4
  },
  headerBackText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary
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
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textDark
  },
  bookingRef: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2
  },
  emergencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#F87171',
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 14,
    padding: 12,
    gap: 10
  },
  emergencyIcon: {
    fontSize: 22
  },
  emergencyTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#991B1B'
  },
  emergencyDesc: {
    fontSize: 10,
    color: '#7F1D1D',
    marginTop: 2
  },
  otpCard: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 14,
    alignItems: 'center'
  },
  otpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  otpIcon: {
    fontSize: 16
  },
  otpTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#92400E',
    letterSpacing: 0.5
  },
  otpNumber: {
    fontSize: 32,
    fontWeight: '900',
    color: '#B45309',
    letterSpacing: 8,
    marginVertical: 4
  },
  otpDesc: {
    fontSize: 10,
    color: '#92400E',
    textAlign: 'center',
    lineHeight: 14
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 16
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 8
  },
  vendorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  vendorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  vendorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  vendorAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold'
  },
  vendorName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textDark
  },
  vendorStatus: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '700',
    marginTop: 2
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14
  },
  callBtn: {
    flex: 1,
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center'
  },
  callBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800'
  },
  chatBtn: {
    flex: 1,
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center'
  },
  chatBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800'
  },
  waitingCard: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border
  },
  waitingEmoji: {
    fontSize: 32,
    marginBottom: 8
  },
  waitingTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textDark
  },
  waitingDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  addressStreet: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark
  },
  addressCity: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  priceLabel: {
    fontSize: 13,
    color: COLORS.textSecondary
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.primary
  },
  escrowNotice: {
    marginTop: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8
  },
  escrowText: {
    fontSize: 10,
    color: COLORS.textSecondary,
    lineHeight: 14
  }
});

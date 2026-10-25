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
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { COLORS } from '../theme/colors';
import { dataSyncService } from '../services/dataSyncService';
import { formatCurrency, formatDate, getStatusColor, formatStatusText } from '../utils/formatters';
import type { Booking } from '../types';

export default function JobDetailScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0
  );

  const rawParams = route.params || {};
  const targetId = (
    (typeof rawParams.bookingId === 'string' ? rawParams.bookingId : rawParams.bookingId?._id || rawParams.bookingId?.id) ||
    (typeof rawParams.jobId === 'string' ? rawParams.jobId : rawParams.jobId?._id || rawParams.jobId?.id) ||
    (typeof rawParams.id === 'string' ? rawParams.id : rawParams.id?._id || rawParams.id?.id) ||
    rawParams.reference ||
    rawParams.bookingReference ||
    rawParams.orderId ||
    ''
  );

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    loadBooking();
  }, [targetId]);

  useEffect(() => {
    const unsubscribe = dataSyncService.subscribe('BOOKINGS_CHANGED', () => {
      loadBooking();
    });
    return () => {
      unsubscribe();
    };
  }, [targetId]);

  const normalizeJobToBooking = (job: any): Booking => {
    return {
      _id: (job._id || job.id || '').toString(),
      jobId: (job._id || job.id || '').toString(),
      bookingReference: job.bookingReference || `REQ-${((job._id || job.id || 'ORDER').toString()).slice(-6).toUpperCase()}`,
      bookingType: 'open_request',
      serviceTitle: job.title || job.serviceTitle || 'Service Request',
      category: job.category?.name || job.category || 'Home Services',
      status: job.status || 'open',
      urgency: job.urgency || 'medium',
      scheduledDate: job.preferredDate || job.createdAt || new Date().toISOString(),
      timeSlot: job.preferredTime || job.preferredTimeSlot || 'Flexible',
      address: job.location || {
        addressLabel: 'Service Address',
        street: 'Service location on file',
        city: 'Lucknow',
        state: 'Uttar Pradesh'
      },
      pricing: {
        amount: job.budget?.amount || job.finalPrice?.amount || job.pricing?.amount || 0,
        paymentStatus: 'pending',
        isPaid: false
      },
      totalAmount: job.budget?.amount || job.finalPrice?.amount || job.totalAmount || 0,
      problemDescription: job.description || job.problemDescription || '',
      isJobRequest: true,
      customer: job.customer,
      vendor: job.selectedVendor ? {
        _id: job.selectedVendor._id || job.selectedVendor,
        name: job.selectedVendor.name || job.selectedVendor.businessName || 'Assigned Specialist',
        businessName: job.selectedVendor.businessName || job.selectedVendor.name,
        phone: job.selectedVendor.phone,
        avatar: job.selectedVendor.avatar,
        rating: job.selectedVendor.rating || 4.9
      } : null,
      createdAt: job.createdAt || new Date().toISOString(),
      updatedAt: job.updatedAt || new Date().toISOString()
    } as any;
  };

  const loadBooking = async () => {
    if (!targetId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await api.bookings.getBookingById(targetId);
      if (res?.booking) {
        setBooking(res.booking);
      } else if ((res as any)?.job) {
        setBooking(normalizeJobToBooking((res as any).job));
      } else {
        // Fallback to direct job endpoint
        try {
          const jobRes = await api.jobs.getJobById(targetId);
          if (jobRes?.job) {
            setBooking(normalizeJobToBooking(jobRes.job));
          }
        } catch {
          // not found
        }
      }
    } catch (err) {
      console.warn('Failed to load booking details from booking endpoint:', err);
      // Fallback: If booking ID was actually a job ID
      try {
        const jobRes = await api.jobs.getJobById(targetId);
        if (jobRes?.job) {
          setBooking(normalizeJobToBooking(jobRes.job));
          return;
        }
      } catch {
        // neither booking nor job
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (!booking || cancelling) return;
    const canCancel = ['pending', 'pending_acceptance', 'open', 'confirmed', 'scheduled'].includes(booking.status);
    if (!canCancel) {
      Alert.alert('Cannot Cancel', `This booking is already ${booking.status} and cannot be cancelled.`);
      return;
    }

    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking? Held escrow will be processed for refund.',
      [
        { text: 'Keep Booking', style: 'cancel' },
        {
          text: 'Cancel Service',
          style: 'destructive',
          onPress: async () => {
            try {
              setCancelling(true);
              const identifier = booking._id || (booking as any).jobId || (booking as any).bookingReference;
              await api.bookings.cancelBooking(identifier, 'Customer requested cancellation from booking dossier.');

              setBooking((prev) => (prev ? { ...prev, status: 'cancelled' } : prev));
              dataSyncService.notify('BOOKINGS_CHANGED', { bookingId: booking._id, status: 'cancelled' });
              Alert.alert('Booking Cancelled', 'Your request has been cancelled.');
              loadBooking();
            } catch (err: any) {
              Alert.alert('Cancellation Error', err.message || 'Could not cancel booking.');
            } finally {
              setCancelling(false);
            }
          }
        }
      ]
    );
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
      <View style={styles.recoveryCenter}>
        <View style={styles.recoveryCard}>
          <View style={styles.recoveryIconCircle}>
            <Ionicons name="document-text-outline" size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.recoveryTitle}>Booking Dossier Unavailable</Text>
          <Text style={styles.recoverySubtitle}>
            This booking reference could not be found or may have been completed, archived, or cancelled.
          </Text>

          <View style={styles.recoveryBtnCol}>
            <TouchableOpacity
              style={styles.recoveryPrimaryBtn}
              onPress={() => navigation.navigate('MyJobs')}
              activeOpacity={0.8}
            >
              <Ionicons name="briefcase-outline" size={16} color="#FFFFFF" />
              <Text style={styles.recoveryPrimaryBtnText}>View My Service Bookings</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.recoverySecondaryBtn}
              onPress={() => navigation.navigate('HomeTab')}
              activeOpacity={0.8}
            >
              <Ionicons name="home-outline" size={16} color={COLORS.primary} />
              <Text style={styles.recoverySecondaryBtnText}>Back to Homepage</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.recoveryBackTextBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Text style={styles.recoveryBackText}>‹ Return to Previous Screen</Text>
            </TouchableOpacity>
          </View>
        </View>
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
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.vendorHeader}
              onPress={() => {
                const targetVendorId = booking.vendor?._id || booking.vendor?.id || booking.vendor?.user?._id || booking.vendor;
                if (targetVendorId) {
                  navigation.navigate('ProfessionalProfile', { vendorId: targetVendorId, vendor: booking.vendor });
                }
              }}
            >
              <View style={styles.vendorAvatar}>
                <Text style={styles.vendorAvatarText}>{vendorName.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.vendorName}>{vendorName}</Text>
                <Text style={styles.vendorStatus}>✓ WorkLogy Verified Pro • Tap to view profile & reviews ›</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>

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

      {/* Review Actions when Completed */}
      {booking.status === 'completed' && !booking.hasReview && (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.reviewServiceBtn}
            activeOpacity={0.85}
            onPress={() => {
              const targetVendorId = booking.vendor?._id || booking.vendor?.id || booking.vendor?.user?._id || booking.vendor;
              navigation.navigate('ReviewModal', {
                bookingId: booking._id,
                vendorName,
                vendorId: targetVendorId
              });
            }}
          >
            <Text style={styles.reviewServiceBtnText}>Rate Service & Leave Review ⭐</Text>
          </TouchableOpacity>
        </View>
      )}

      {booking.status === 'completed' && booking.hasReview && (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.viewProfileReviewBtn}
            activeOpacity={0.85}
            onPress={() => {
              const targetVendorId = booking.vendor?._id || booking.vendor?.id || booking.vendor?.user?._id || booking.vendor;
              if (targetVendorId) {
                navigation.navigate('ProfessionalProfile', { vendorId: targetVendorId, vendor: booking.vendor });
              }
            }}
          >
            <Text style={styles.viewProfileReviewBtnText}>View Your Review on Professional Profile ⭐ ›</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Cancellation Action */}
      {['pending', 'pending_acceptance', 'open', 'confirmed', 'scheduled'].includes(booking.status) && (
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.cancelBookingBtn, cancelling && { opacity: 0.6 }]}
            onPress={handleCancel}
            disabled={cancelling}
          >
            {cancelling ? (
              <ActivityIndicator size="small" color="#DC2626" />
            ) : (
              <Text style={styles.cancelBookingBtnText}>Cancel Booking</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

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
  recoveryCenter: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  recoveryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3
  },
  recoveryIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  recoveryTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textDark,
    textAlign: 'center',
    marginBottom: 8
  },
  recoverySubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20
  },
  recoveryBtnCol: {
    width: '100%',
    gap: 10
  },
  recoveryPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 12
  },
  recoveryPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700'
  },
  recoverySecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingVertical: 12,
    borderRadius: 12
  },
  recoverySecondaryBtnText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700'
  },
  recoveryBackTextBtn: {
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 4
  },
  recoveryBackText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary
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
  },
  cancelBookingBtn: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8
  },
  cancelBookingBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#DC2626'
  },
  reviewServiceBtn: {
    backgroundColor: '#06684F',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8
  },
  reviewServiceBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  viewProfileReviewBtn: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8
  },
  viewProfileReviewBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#06684F'
  }
});

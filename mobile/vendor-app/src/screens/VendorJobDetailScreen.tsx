import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator,
  TextInput,
  Modal
} from 'react-native';
import { api } from '../api/client';
import { COLORS } from '../theme/colors';
import { formatCurrency, getStatusColor, formatStatusText } from '../utils/formatters';
import type { Booking } from '../types';

export default function VendorJobDetailScreen({ route, navigation }: any) {
  const initialBooking: Booking = route.params?.booking;
  const [booking, setBooking] = useState<Booking>(initialBooking);

  // OTP modal
  const [otpModal, setOtpModal] = useState({
    open: false,
    code: '',
    submitting: false
  });

  // Completion modal
  const [completeModal, setCompleteModal] = useState({
    open: false,
    notes: '',
    submitting: false
  });

  if (!booking) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>No booking details provided.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleUpdateStatus = async (nextStatus: string) => {
    try {
      const res = await api.bookings.updateStatus(booking._id, nextStatus);
      Alert.alert('Status Updated', `Job marked as ${nextStatus.replace(/_/g, ' ')}.`);
      if (res?.booking) {
        setBooking(res.booking);
      } else {
        setBooking((prev) => ({ ...prev, status: nextStatus as any }));
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update job status.');
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpModal.code || otpModal.code.trim().length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter the 6-digit Arrival OTP from customer.');
      return;
    }

    try {
      setOtpModal((prev) => ({ ...prev, submitting: true }));
      const res = await api.bookings.verifyArrivalOtp(booking._id, otpModal.code.trim());
      Alert.alert('Arrival Verified! 🎉', 'Arrival OTP verified. Service is now in progress.');
      setOtpModal({ open: false, code: '', submitting: false });
      if (res?.booking) {
        setBooking(res.booking);
      } else {
        setBooking((prev) => ({ ...prev, status: 'in_progress', isOtpVerified: true }));
      }
    } catch (err: any) {
      Alert.alert('Verification Failed', err.message || 'Invalid Arrival OTP.');
      setOtpModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  const handleSignoff = async () => {
    try {
      setCompleteModal((prev) => ({ ...prev, submitting: true }));
      const res = await api.bookings.completeSignoff(booking._id, {
        feedback: completeModal.notes || 'Service performed and signed off by certified technician.'
      });
      Alert.alert('Service Completed! 🎉', 'Service completion recorded. Payment will be released.');
      setCompleteModal({ open: false, notes: '', submitting: false });
      if (res?.booking) {
        setBooking(res.booking);
      } else {
        setBooking((prev) => ({ ...prev, status: 'completed' }));
      }
    } catch (err: any) {
      Alert.alert('Sign-off Error', err.message || 'Failed to complete signoff.');
      setCompleteModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  const customerName = booking.customer?.name || 'Customer';
  const customerPhone = booking.customer?.phone || '';
  const fullAddress = `${booking.address?.houseNumber ? booking.address.houseNumber + ', ' : ''}${booking.address?.street || ''}, ${booking.address?.city || ''} ${booking.address?.pincode ? '- ' + booking.address.pincode : ''}`;

  const isEmergency = booking.jobId?.isEmergency || booking.serviceTitle?.toLowerCase().includes('emergency');
  const isOtpNeeded = ['confirmed', 'on_the_way', 'arrived'].includes(booking.status) && !booking.isOtpVerified;

  const grossAmount = booking.totalAmount || 0;
  const platformFee = Math.round(grossAmount * 0.1);
  const netTakeHome = grossAmount - platformFee;

  return (
    <ScrollView style={styles.container}>
      {/* Header Bar */}
      <View style={styles.header}>
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
        <Text style={styles.bookingId}>Order #{booking._id.slice(-8).toUpperCase()}</Text>
      </View>

      {/* Emergency Notice */}
      {isEmergency && (
        <View style={styles.emergencyBox}>
          <Text style={styles.emergencyIcon}>⚡</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.emergencyTitle}>EMERGENCY DISPATCH TENDER</Text>
            <Text style={styles.emergencyDesc}>Immediate response requested. Standard arrival within 30-45 minutes.</Text>
          </View>
        </View>
      )}

      {/* Client Dossier */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Customer & Contact</Text>
        <View style={styles.card}>
          <View style={styles.customerRow}>
            <View style={styles.customerAvatar}>
              <Text style={styles.customerAvatarText}>{customerName.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.customerName}>{customerName}</Text>
              <Text style={styles.customerPhone}>📞 {customerPhone || 'WorkLogy Verified Client'}</Text>
            </View>
          </View>

          <View style={styles.actionBtnRow}>
            {customerPhone ? (
              <TouchableOpacity
                style={styles.contactBtn}
                onPress={() => Linking.openURL(`tel:${customerPhone}`)}
              >
                <Text style={styles.contactBtnText}>Call Customer 📞</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={[styles.contactBtn, { backgroundColor: '#3B82F6' }]}
              onPress={() =>
                navigation.navigate('ChatDetail', {
                  bookingId: booking._id,
                  otherUser: booking.customer,
                  title: booking.serviceTitle
                })
              }
            >
              <Text style={styles.contactBtnText}>Open Chat 💬</Text>
            </TouchableOpacity>
          </View>

          {/* Full Unmasked Address */}
          <View style={styles.addressBox}>
            <Text style={styles.addressLabel}>Service Delivery Address:</Text>
            <Text style={styles.addressText}>{fullAddress || 'Address on file'}</Text>
            <TouchableOpacity
              style={styles.mapsBtn}
              onPress={() => {
                const q = encodeURIComponent(`${booking.address?.houseNumber || ''} ${booking.address?.street || ''}, ${booking.address?.city || ''}`);
                Linking.openURL(`https://maps.google.com/?q=${q}`);
              }}
            >
              <Text style={styles.mapsBtnText}>Navigate via Google Maps 🗺️</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Arrival OTP Section */}
      {isOtpNeeded && (
        <View style={styles.section}>
          <View style={styles.otpCard}>
            <Text style={styles.otpTitle}>🔐 Physical Arrival Verification</Text>
            <Text style={styles.otpDesc}>
              Before you begin technical repairs, ask the client for the 6-digit Arrival OTP shown on their screen.
            </Text>
            <TouchableOpacity
              style={styles.otpBtn}
              onPress={() => setOtpModal({ open: true, code: '', submitting: false })}
            >
              <Text style={styles.otpBtnText}>Enter Arrival OTP 🔑</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Financial Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment & Earnings Breakdown</Text>
        <View style={styles.card}>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Gross Job Billing</Text>
            <Text style={styles.feeValue}>{formatCurrency(grossAmount)}</Text>
          </View>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>WorkLogy Service Fee (10%)</Text>
            <Text style={[styles.feeValue, { color: '#DC2626' }]}>-{formatCurrency(platformFee)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.feeRow}>
            <Text style={styles.totalFeeLabel}>Net Contractor Take-Home</Text>
            <Text style={styles.totalFeeValue}>{formatCurrency(netTakeHome)}</Text>
          </View>
          <View style={styles.escrowNotice}>
            <Text style={styles.escrowText}>
              🛡️ Payment status: {booking.pricing?.paymentStatus?.replace(/_/g, ' ') || 'Held in Escrow'}. Funds disburse to your verified bank account upon client signoff.
            </Text>
          </View>
        </View>
      </View>

      {/* Status Controls */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Workflow Status Controls</Text>
        {booking.status === 'confirmed' && (
          <TouchableOpacity
            style={[styles.statusActionBtn, { backgroundColor: '#2563EB' }]}
            onPress={() => handleUpdateStatus('on_the_way')}
          >
            <Text style={styles.statusActionBtnText}>Start Journey (On The Way) 🚗</Text>
          </TouchableOpacity>
        )}

        {booking.status === 'on_the_way' && (
          <TouchableOpacity
            style={[styles.statusActionBtn, { backgroundColor: '#D97706' }]}
            onPress={() => handleUpdateStatus('arrived')}
          >
            <Text style={styles.statusActionBtnText}>Mark Arrived at Location 📍</Text>
          </TouchableOpacity>
        )}

        {booking.status === 'in_progress' && (
          <TouchableOpacity
            style={[styles.statusActionBtn, { backgroundColor: COLORS.primary }]}
            onPress={() => setCompleteModal({ open: true, notes: '', submitting: false })}
          >
            <Text style={styles.statusActionBtnText}>Complete Work & Sign Off ✅</Text>
          </TouchableOpacity>
        )}

        {booking.status === 'completed' && (
          <View style={styles.completedBadgeBox}>
            <Text style={styles.completedBadgeText}>✓ Work Complete & Handover Verified</Text>
          </View>
        )}
      </View>

      <View style={{ height: 40 }} />

      {/* OTP Modal */}
      <Modal visible={otpModal.open} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalEmoji}>🔐</Text>
            <Text style={styles.modalTitle}>Enter Arrival OTP</Text>
            <Text style={styles.modalSubtitle}>
              Ask the customer for the 6-digit OTP displayed on their WorkLogy app to unlock the job.
            </Text>

            <TextInput
              style={styles.otpInput}
              placeholder="e.g. 123456"
              placeholderTextColor="#94A3B8"
              keyboardType="number-pad"
              maxLength={6}
              value={otpModal.code}
              onChangeText={(val) => setOtpModal((prev) => ({ ...prev, code: val }))}
              autoFocus
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setOtpModal({ open: false, code: '', submitting: false })}
                disabled={otpModal.submitting}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleVerifyOtp}
                disabled={otpModal.submitting}
              >
                {otpModal.submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Verify OTP</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Sign-off Modal */}
      <Modal visible={completeModal.open} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalEmoji}>🛠️</Text>
            <Text style={styles.modalTitle}>Complete Service Sign-Off</Text>
            <Text style={styles.modalSubtitle}>
              Document the repair actions taken to finalize this order for escrow payout.
            </Text>

            <TextInput
              style={styles.textArea}
              placeholder="Describe repairs completed, parts replaced..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={4}
              value={completeModal.notes}
              onChangeText={(val) => setCompleteModal((prev) => ({ ...prev, notes: val }))}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setCompleteModal({ open: false, notes: '', submitting: false })}
                disabled={completeModal.submitting}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: COLORS.primary }]}
                onPress={handleSignoff}
                disabled={completeModal.submitting}
              >
                {completeModal.submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Sign Off & Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
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
  bookingId: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2
  },
  emergencyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
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
    fontSize: 12,
    fontWeight: '900',
    color: '#991B1B'
  },
  emergencyDesc: {
    fontSize: 10,
    color: '#7F1D1D',
    marginTop: 2
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  customerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  customerAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold'
  },
  customerName: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textDark
  },
  customerPhone: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14
  },
  contactBtn: {
    flex: 1,
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center'
  },
  contactBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800'
  },
  addressBox: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },
  addressLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase'
  },
  addressText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark,
    marginTop: 2
  },
  mapsBtn: {
    marginTop: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center'
  },
  mapsBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563EB'
  },
  otpCard: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    borderRadius: 16,
    padding: 16
  },
  otpTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#92400E'
  },
  otpDesc: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 4,
    lineHeight: 16,
    marginBottom: 12
  },
  otpBtn: {
    backgroundColor: '#D97706',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center'
  },
  otpBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800'
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6
  },
  feeLabel: {
    fontSize: 12,
    color: COLORS.textSecondary
  },
  feeValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 8
  },
  totalFeeLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textDark
  },
  totalFeeValue: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.primary
  },
  escrowNotice: {
    marginTop: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8
  },
  escrowText: {
    fontSize: 10,
    color: COLORS.textSecondary,
    lineHeight: 14
  },
  statusActionBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginVertical: 6
  },
  statusActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800'
  },
  completedBadgeBox: {
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center'
  },
  completedBadgeText: {
    color: '#065F46',
    fontSize: 12,
    fontWeight: '800'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalBox: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    alignItems: 'center'
  },
  modalEmoji: {
    fontSize: 36,
    marginBottom: 8
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textDark
  },
  modalSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 18
  },
  otpInput: {
    width: '80%',
    height: 52,
    borderWidth: 2,
    borderColor: '#D97706',
    borderRadius: 14,
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 8,
    color: COLORS.textDark,
    backgroundColor: '#FFFBEB',
    marginBottom: 20
  },
  textArea: {
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: COLORS.textDark,
    textAlignVertical: 'top',
    height: 90,
    marginBottom: 20
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%'
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center'
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary
  },
  modalSubmitBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#D97706',
    alignItems: 'center'
  },
  modalSubmitBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF'
  }
});

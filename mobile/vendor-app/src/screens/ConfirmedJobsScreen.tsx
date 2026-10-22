import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
  Linking
} from 'react-native';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { COLORS } from '../theme/colors';
import { formatCurrency, formatDate, getStatusColor, formatStatusText } from '../utils/formatters';
import type { Booking } from '../types';

export default function ConfirmedJobsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed' | 'cancelled'>('active');

  // OTP Verification Modal
  const [otpModal, setOtpModal] = useState<{
    open: boolean;
    booking: Booking | null;
    otpCode: string;
    submitting: boolean;
  }>({
    open: false,
    booking: null,
    otpCode: '',
    submitting: false
  });

  // Completion Signoff Modal
  const [completeModal, setCompleteModal] = useState<{
    open: boolean;
    booking: Booking | null;
    notes: string;
    submitting: boolean;
  }>({
    open: false,
    booking: null,
    notes: '',
    submitting: false
  });

  useEffect(() => {
    loadBookings();
  }, [activeTab]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const res = await api.bookings.getMyBookings();
      if (res?.bookings) {
        setBookings(res.bookings);
      }
    } catch (err) {
      console.warn('Failed to load vendor bookings:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadBookings();
  };

  const filteredBookings = bookings.filter((b) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'active') {
      return ['confirmed', 'on_the_way', 'arrived', 'in_progress', 'payment_pending'].includes(b.status);
    }
    if (activeTab === 'completed') return b.status === 'completed';
    if (activeTab === 'cancelled') return ['cancelled', 'disputed'].includes(b.status);
    return true;
  });

  const handleUpdateStatus = async (bookingId: string, nextStatus: string) => {
    try {
      await api.bookings.updateStatus(bookingId, nextStatus);
      Alert.alert('Status Updated', `Job marked as ${nextStatus.replace(/_/g, ' ')}.`);
      setBookings((prev) =>
        prev.map((item) => (item._id === bookingId ? { ...item, status: nextStatus as any } : item))
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update job status.');
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpModal.booking) return;
    if (!otpModal.otpCode || otpModal.otpCode.trim().length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter the 6-digit Arrival OTP provided by the customer.');
      return;
    }

    try {
      setOtpModal((prev) => ({ ...prev, submitting: true }));
      await api.bookings.verifyArrivalOtp(otpModal.booking._id, otpModal.otpCode.trim());
      Alert.alert('Arrival Verified! 🎉', 'Arrival OTP verified successfully. The service is now In Progress.');
      setOtpModal({ open: false, booking: null, otpCode: '', submitting: false });
      loadBookings();
    } catch (err: any) {
      Alert.alert('Verification Failed', err.message || 'Incorrect Arrival OTP. Please check with customer.');
      setOtpModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  const handleSignoffCompletion = async () => {
    if (!completeModal.booking) return;

    try {
      setCompleteModal((prev) => ({ ...prev, submitting: true }));
      await api.bookings.completeSignoff(completeModal.booking._id, {
        feedback: completeModal.notes || 'Service performed and signed off by certified technician.'
      });
      Alert.alert('Service Completed! 🎉', 'Work signoff recorded. Earnings will be credited upon client confirmation.');
      setCompleteModal({ open: false, booking: null, notes: '', submitting: false });
      loadBookings();
    } catch (err: any) {
      Alert.alert('Completion Error', err.message || 'Failed to sign off completion.');
      setCompleteModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  const handleCallCustomer = (phone?: string) => {
    if (!phone) {
      Alert.alert('No Phone', 'Customer contact number is not available.');
      return;
    }
    Linking.openURL(`tel:${phone}`);
  };

  const handleOpenMaps = (address?: any) => {
    if (!address) return;
    const query = encodeURIComponent(`${address.houseNumber || ''} ${address.street || ''}, ${address.city || ''}`);
    Linking.openURL(`https://maps.google.com/?q=${query}`);
  };

  const renderBookingCard = ({ item }: { item: Booking }) => {
    const isEmergency = item.jobId?.isEmergency || item.serviceTitle?.toLowerCase().includes('emergency');
    const isOtpNeeded = ['confirmed', 'on_the_way', 'arrived'].includes(item.status);
    const isInProgress = item.status === 'in_progress';
    const isCompleted = item.status === 'completed';

    const customerName = item.customer?.name || 'Customer';
    const customerPhone = item.customer?.phone || '';
    const fullAddress = `${item.address?.houseNumber ? item.address.houseNumber + ', ' : ''}${item.address?.street || ''}, ${item.address?.city || ''} ${item.address?.pincode ? '- ' + item.address.pincode : ''}`;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            {isEmergency && (
              <View style={styles.emergencyBadge}>
                <Text style={styles.emergencyBadgeText}>EMERGENCY ⚡</Text>
              </View>
            )}
            <Text style={styles.bookingId}>#{item._id.slice(-6).toUpperCase()}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
            <Text style={[styles.statusBadgeText, { color: getStatusColor(item.status) }]}>
              {formatStatusText(item.status)}
            </Text>
          </View>
        </View>

        <Text style={styles.serviceTitle}>{item.serviceTitle}</Text>
        <Text style={styles.scheduledTime}>
          📅 {formatDate(item.scheduledDate || item.createdAt)} • {item.scheduledTime || 'Immediate Arrival'}
        </Text>

        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>Total Job Value:</Text>
          <Text style={styles.amountValue}>{formatCurrency(item.totalAmount)}</Text>
        </View>

        {/* Customer Dossier */}
        <View style={styles.customerDossier}>
          <View style={styles.customerRow}>
            <View style={styles.customerAvatar}>
              <Text style={styles.customerAvatarText}>{customerName.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.customerInfo}>
              <Text style={styles.customerName}>{customerName}</Text>
              <Text style={styles.customerPhone}>📞 {customerPhone || 'Verified WorkLogy Client'}</Text>
            </View>
            <View style={styles.contactActions}>
              {customerPhone ? (
                <TouchableOpacity
                  style={styles.actionIconBtn}
                  onPress={() => handleCallCustomer(customerPhone)}
                >
                  <Text style={styles.actionIconEmoji}>📞</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={styles.actionIconBtn}
                onPress={() =>
                  navigation.navigate('ChatDetail', {
                    bookingId: item._id,
                    otherUser: item.customer,
                    title: item.serviceTitle
                  })
                }
              >
                <Text style={styles.actionIconEmoji}>💬</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Full Unmasked Address */}
          <TouchableOpacity
            style={styles.addressContainer}
            onPress={() => handleOpenMaps(item.address)}
          >
            <Text style={styles.addressIcon}>📍</Text>
            <Text style={styles.addressText} numberOfLines={2}>
              {fullAddress || 'Service Address on File'}
            </Text>
            <Text style={styles.mapLinkText}>Maps ↗</Text>
          </TouchableOpacity>
        </View>

        {/* Arrival OTP Banner */}
        {isOtpNeeded && (
          <View style={styles.otpBanner}>
            <View style={styles.otpBannerHeader}>
              <Text style={styles.otpBannerIcon}>🔐</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.otpBannerTitle}>Arrival OTP Required</Text>
                <Text style={styles.otpBannerDesc}>
                  Ask customer for the 6-digit OTP displayed on their WorkLogy app upon physical arrival.
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.otpVerifyBtn}
              onPress={() => setOtpModal({ open: true, booking: item, otpCode: '', submitting: false })}
            >
              <Text style={styles.otpVerifyBtnText}>Enter 6-Digit Arrival OTP 🔑</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Workflow Action Controls */}
        <View style={styles.workflowRow}>
          {item.status === 'confirmed' && (
            <TouchableOpacity
              style={[styles.workflowBtn, { backgroundColor: '#2563EB' }]}
              onPress={() => handleUpdateStatus(item._id, 'on_the_way')}
            >
              <Text style={styles.workflowBtnText}>Start Travel (On The Way) 🚗</Text>
            </TouchableOpacity>
          )}

          {item.status === 'on_the_way' && (
            <TouchableOpacity
              style={[styles.workflowBtn, { backgroundColor: '#D97706' }]}
              onPress={() => handleUpdateStatus(item._id, 'arrived')}
            >
              <Text style={styles.workflowBtnText}>Mark Arrived at Location 📍</Text>
            </TouchableOpacity>
          )}

          {isInProgress && (
            <TouchableOpacity
              style={[styles.workflowBtn, { backgroundColor: COLORS.primary }]}
              onPress={() => setCompleteModal({ open: true, booking: item, notes: '', submitting: false })}
            >
              <Text style={styles.workflowBtnText}>Complete Work & Sign Off ✅</Text>
            </TouchableOpacity>
          )}

          {isCompleted && (
            <View style={styles.completedBanner}>
              <Text style={styles.completedBannerText}>✓ Service Completed & Verified</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.dossierBtn}
            onPress={() => navigation.navigate('VendorJobDetail', { booking: item })}
          >
            <Text style={styles.dossierBtnText}>Full Dossier 📄</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Confirmed Work & Field Tasks</Text>
        <Text style={styles.screenSubtitle}>Manage live dispatch, OTP arrival, and signoff</Text>

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

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading assigned orders...</Text>
        </View>
      ) : filteredBookings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.emptyTitle}>No {activeTab} jobs found</Text>
          <Text style={styles.emptySubtitle}>
            {activeTab === 'active'
              ? 'You do not have any active work assignments in progress. Check Available Jobs to bid or claim.'
              : 'Past bookings will appear here once archived.'}
          </Text>
          <TouchableOpacity
            style={styles.findJobsBtn}
            onPress={() => navigation.navigate('AvailableTab')}
          >
            <Text style={styles.findJobsBtnText}>Browse Available Tenders ⚡</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredBookings}
          keyExtractor={(item) => item._id}
          renderItem={renderBookingCard}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        />
      )}

      {/* Modal: Arrival OTP Entry */}
      <Modal visible={otpModal.open} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalEmoji}>🔐</Text>
            <Text style={styles.modalTitle}>Verify Customer Arrival OTP</Text>
            <Text style={styles.modalSubtitle}>
              Enter the 6-digit PIN code displayed on the customer's phone to verify physical presence and unlock work.
            </Text>

            <TextInput
              style={styles.otpInput}
              placeholder="e.g. 482910"
              placeholderTextColor="#94A3B8"
              keyboardType="number-pad"
              maxLength={6}
              value={otpModal.otpCode}
              onChangeText={(val) => setOtpModal((prev) => ({ ...prev, otpCode: val }))}
              autoFocus
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setOtpModal({ open: false, booking: null, otpCode: '', submitting: false })}
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
                  <Text style={styles.modalSubmitBtnText}>Verify & Start Work</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Completion Signoff */}
      <Modal visible={completeModal.open} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalEmoji}>🛠️</Text>
            <Text style={styles.modalTitle}>Service Sign-Off</Text>
            <Text style={styles.modalSubtitle}>
              Confirm all requested tasks are completed according to WorkLogy professional standards.
            </Text>

            <Text style={styles.fieldLabel}>Work Notes & Summary</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Describe work performed, parts replaced, or diagnostic results..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={4}
              value={completeModal.notes}
              onChangeText={(val) => setCompleteModal((prev) => ({ ...prev, notes: val }))}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setCompleteModal({ open: false, booking: null, notes: '', submitting: false })}
                disabled={completeModal.submitting}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: COLORS.primary }]}
                onPress={handleSignoffCompletion}
                disabled={completeModal.submitting}
              >
                {completeModal.submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Submit Sign-Off ✅</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    color: COLORS.textDark
  },
  screenSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
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
    gap: 14
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
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
  emergencyBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  emergencyBadgeText: {
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
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
    marginTop: 4
  },
  scheduledTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  amountBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 10
  },
  amountLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600'
  },
  amountValue: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.primary
  },
  customerDossier: {
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 12,
    marginVertical: 4
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  customerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  customerAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold'
  },
  customerInfo: {
    flex: 1
  },
  customerName: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textDark
  },
  customerPhone: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  contactActions: {
    flexDirection: 'row',
    gap: 6
  },
  actionIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border
  },
  actionIconEmoji: {
    fontSize: 16
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 6
  },
  addressIcon: {
    fontSize: 14
  },
  addressText: {
    flex: 1,
    fontSize: 11,
    color: COLORS.textDark,
    fontWeight: '600'
  },
  mapLinkText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563EB'
  },
  otpBanner: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    borderRadius: 14,
    padding: 12,
    marginVertical: 10
  },
  otpBannerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8
  },
  otpBannerIcon: {
    fontSize: 18
  },
  otpBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E'
  },
  otpBannerDesc: {
    fontSize: 11,
    color: '#B45309',
    lineHeight: 15,
    marginTop: 2
  },
  otpVerifyBtn: {
    backgroundColor: '#D97706',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center'
  },
  otpVerifyBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800'
  },
  workflowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10
  },
  workflowBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center'
  },
  workflowBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800'
  },
  dossierBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center'
  },
  dossierBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textDark
  },
  completedBanner: {
    flex: 1,
    backgroundColor: '#ECFDF5',
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8
  },
  completedBannerText: {
    color: '#065F46',
    fontSize: 11,
    fontWeight: '800'
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: COLORS.textSecondary
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textDark
  },
  emptySubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    marginBottom: 20
  },
  findJobsBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12
  },
  findJobsBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
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
    color: COLORS.textDark,
    textAlign: 'center'
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
  fieldLabel: {
    width: '100%',
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 6
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

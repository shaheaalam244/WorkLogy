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
  TextInput,
  Modal,
  Image,
  Dimensions,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { useNavigation } from '../context/NavigationContext';
import { COLORS } from '../theme/colors';
import { formatCurrency, getStatusColor, formatStatusText, formatDate } from '../utils/formatters';
import { getServiceImage } from '../utils/serviceImages';
import type { Booking, Job } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function VendorJobDetailScreen({ route, navigation }: any) {
  const appNav = useNavigation();
  const initialBooking: Booking | undefined = route.params?.booking;
  const bookingId: string | undefined = route.params?.bookingId;
  const jobId: string | undefined = route.params?.jobId;

  const [booking, setBooking] = useState<Booking | null>(initialBooking || null);
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(!initialBooking);

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

  // Cancellation modal
  const [cancelModal, setCancelModal] = useState({
    open: false,
    reason: 'Emergency schedule conflict',
    customNote: '',
    submitting: false
  });

  // Register Android back handler for open modals
  useEffect(() => {
    if (!otpModal.open && !completeModal.open && !cancelModal.open) return;
    const unregister = appNav.registerBackHandler(() => {
      if (otpModal.open) {
        setOtpModal((prev) => ({ ...prev, open: false }));
        return true;
      }
      if (completeModal.open) {
        setCompleteModal((prev) => ({ ...prev, open: false }));
        return true;
      }
      if (cancelModal.open) {
        setCancelModal((prev) => ({ ...prev, open: false }));
        return true;
      }
      return false;
    });
    return unregister;
  }, [otpModal.open, completeModal.open, cancelModal.open, appNav]);

  useEffect(() => {
    loadDossier();
  }, [bookingId, jobId]);

  const loadDossier = async () => {
    try {
      if (bookingId) {
        setLoading(true);
        const res = await api.bookings.getById(bookingId);
        if (res?.booking) {
          setBooking(res.booking);
        }
      } else if (jobId) {
        setLoading(true);
        try {
          const bRes = await api.bookings.getByJobId(jobId);
          if (bRes?.booking) {
            setBooking(bRes.booking);
            return;
          }
        } catch {
          // fallback to job details
        }
        const res = await api.jobs.getJobDetails(jobId);
        if (res?.job) {
          setJob(res.job);
        }
      }
    } catch (err: any) {
      console.warn('Failed to load dossier:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (nextStatus: string) => {
    if (!booking) return;
    try {
      const res = await api.bookings.updateStatus(booking._id, nextStatus);
      Alert.alert('Status Updated', `Job marked as ${nextStatus.replace(/_/g, ' ')}.`);
      if (res?.booking) {
        setBooking(res.booking);
      } else {
        setBooking((prev: any) => ({ ...prev, status: nextStatus }));
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update job status.');
    }
  };

  const handleVerifyOtp = async () => {
    if (!booking) return;
    const cleanCode = otpModal.code.trim();
    if (!cleanCode || cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
      Alert.alert('Invalid OTP', 'Please enter a valid 6-digit numeric Arrival OTP from customer.');
      return;
    }

    try {
      setOtpModal((prev) => ({ ...prev, submitting: true }));
      const res = await api.bookings.verifyArrivalOtp(booking._id, cleanCode);
      Alert.alert('Arrival Verified! 🎉', 'Arrival OTP verified. Service is now in progress.');
      setOtpModal({ open: false, code: '', submitting: false });
      if (res?.booking) {
        setBooking({
          ...res.booking,
          status: 'in_progress',
          isOtpVerified: true,
          arrivalEvidence: { ...(res.booking.arrivalEvidence || {}), verified: true }
        });
      } else {
        setBooking((prev: any) => ({
          ...prev,
          status: 'in_progress',
          isOtpVerified: true,
          arrivalEvidence: { ...(prev?.arrivalEvidence || {}), verified: true }
        }));
      }
    } catch (err: any) {
      Alert.alert('Verification Failed', err.message || 'Invalid Arrival OTP.');
      setOtpModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  const handleSignoff = async () => {
    if (!booking) return;
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
        setBooking((prev: any) => ({ ...prev, status: 'completed' }));
      }
    } catch (err: any) {
      Alert.alert('Sign-off Error', err.message || 'Failed to complete signoff.');
      setCompleteModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  const handleCancelBooking = async () => {
    if (!booking) return;
    try {
      setCancelModal((prev) => ({ ...prev, submitting: true }));
      const fullNote = cancelModal.customNote.trim()
        ? `${cancelModal.reason}: ${cancelModal.customNote.trim()}`
        : cancelModal.reason;
      const res = await api.bookings.updateStatus(booking._id, 'cancelled', fullNote);
      Alert.alert('Booking Cancelled', 'The booking has been cancelled and customer notified.');
      setCancelModal({ open: false, reason: 'Emergency schedule conflict', customNote: '', submitting: false });
      if (res?.booking) {
        setBooking(res.booking);
      } else {
        setBooking((prev: any) => ({ ...prev, status: 'cancelled' }));
      }
    } catch (err: any) {
      Alert.alert('Cancellation Error', err.message || 'Failed to cancel booking.');
      setCancelModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  if (loading) {
    return (
      <View style={styles.centerLoading}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading Job Dossier...</Text>
      </View>
    );
  }

  // Fallback if neither booking nor job was found
  if (!booking && !job) {
    return (
      <View style={styles.centerLoading}>
        <Ionicons name="document-text-outline" size={54} color="#94A3B8" />
        <Text style={styles.errorTitle}>Booking or Job Unavailable</Text>
        <Text style={[styles.errorSubtitle, { textAlign: 'center', paddingHorizontal: 24 }]}>
          This service record may have been completed, cancelled, or is no longer accessible for your vendor account.
        </Text>
        <View style={{ flexDirection: 'row', marginTop: 16 }}>
          <TouchableOpacity
            style={[styles.backBtn, { marginRight: 8, backgroundColor: COLORS.primary }]}
            onPress={() => navigation.navigate('JobsTab')}
          >
            <Text style={styles.backBtnText}>View Available Jobs</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: '#64748B' }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Normalization for Booking vs Open Job
  const isBooking = !!booking;
  const title = isBooking ? booking.serviceTitle : job?.title;
  const status = isBooking ? booking.status : (job?.urgency === 'emergency' ? 'emergency' : 'open');
  const catSlug = isBooking ? (booking.jobId?.category as any)?.slug || booking.serviceTitle : (job?.category as any)?.slug || job?.title;
  const heroImage = getServiceImage(catSlug || title);

  const customerName = isBooking ? (booking.customer?.name || 'Customer') : (job?.customer?.name || 'Verified Homeowner');
  const customerPhone = isBooking ? (booking.customer?.phone || '') : (job?.contactPhone || job?.customer?.phone || '');
  const locality = isBooking
    ? `${booking.address?.houseNumber ? booking.address.houseNumber + ', ' : ''}${booking.address?.street || ''}, ${booking.address?.city || ''}`
    : `${job?.location?.locality ? job.location.locality + ', ' : ''}${job?.location?.city || job?.address?.city || 'Lucknow'}`;

  const isEmergency = isBooking ? (booking.jobId?.isEmergency || booking.serviceTitle?.toLowerCase().includes('emergency')) : (job?.urgency === 'emergency');

  const isOtpVerified = Boolean(
    booking?.isOtpVerified ||
    booking?.startOtp?.isConsumed ||
    booking?.arrivalEvidence?.verified ||
    ['in_progress', 'completion_pending', 'completed'].includes(booking?.status || '')
  );

  // Arrival OTP prompt is strictly shown when vendor has arrived and OTP is pending verification
  const isOtpNeeded = isBooking && booking.status === 'arrived' && !isOtpVerified;

  const grossAmount = isBooking
    ? (booking.pricing?.amount ?? (booking as any).totalAmount ?? 0)
    : (job?.budget?.amount ?? (job as any).pricing?.amount ?? 0);
  const platformFee = isBooking
    ? (booking.pricing?.platformFee ?? Math.round(grossAmount * 0.05))
    : Math.round(grossAmount * 0.1);
  const netTakeHome = isBooking
    ? (booking.pricing?.vendorNet ?? (grossAmount - platformFee))
    : (grossAmount - platformFee);
  const feePercent = isBooking && booking.pricing?.platformFee && grossAmount > 0
    ? Math.round((booking.pricing.platformFee / grossAmount) * 100)
    : (isBooking ? 5 : 10);

  // Active Location & Turn-by-Turn Navigation Details
  const activeAddress = isBooking ? booking.address : job?.location;
  const isMaskedForPrivacy = !isBooking && (job?.location?.isMaskedForPrivacy === true);
  const houseNumber = activeAddress?.houseNumber || '';
  const street = activeAddress?.street || '';
  const landmark = activeAddress?.landmark || '';
  const localityName = activeAddress?.locality || '';
  const cityName = activeAddress?.city || 'Lucknow';
  const zipCode = (activeAddress as any)?.pincode || (activeAddress as any)?.zipCode || '';
  const accessNotes = job?.accessInstructions || (booking?.jobId as any)?.accessInstructions || '';
  const coords = activeAddress?.coordinates;
  const hasValidCoords = Boolean(
    coords &&
    coords.lat != null &&
    coords.lng != null &&
    (Number(coords.lat) !== 0 || Number(coords.lng) !== 0)
  );
  const accuracyMeters = (activeAddress as any)?.locationAccuracyMeters;

  const handleNavigateToCustomer = () => {
    if (hasValidCoords && coords) {
      const lat = Number(coords.lat);
      const lng = Number(coords.lng);

      const navUrl = Platform.OS === 'android'
        ? `google.navigation:q=${lat},${lng}`
        : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

      Linking.canOpenURL(navUrl)
        .then((supported) => {
          if (supported) {
            Linking.openURL(navUrl);
          } else {
            Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
          }
        })
        .catch(() => {
          Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
        });
    } else {
      const fullQuery = [
        houseNumber,
        street,
        landmark ? 'Near ' + landmark : '',
        localityName,
        cityName,
        zipCode
      ]
        .filter(Boolean)
        .join(', ');
      Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(fullQuery || cityName || 'Lucknow')}`);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* ── 1. SERVICE HERO BANNER (MATCHING SCREENSHOTS) ── */}
      <View style={styles.heroContainer}>
        <Image source={heroImage} style={styles.heroImage} resizeMode="cover" />
        <TouchableOpacity style={styles.heroBackBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.statusPill}>
          <Text style={styles.statusPillText}>{status.replace(/_/g, ' ').toUpperCase()}</Text>
        </View>
      </View>

      {/* ── 2. HEADER DETAILS CARD ── */}
      <View style={styles.card}>
        <Text style={styles.categoryBadge}>{(catSlug || 'Home Service').toUpperCase()}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.localityText}>📍 {locality}</Text>

        {isEmergency && (
          <View style={styles.emergencyNotice}>
            <Ionicons name="flash" size={16} color="#DC2626" />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.emergencyNoticeTitle}>24/7 EMERGENCY CALL</Text>
              <Text style={styles.emergencyNoticeSub}>Immediate response requested. Standard arrival within 30-45 minutes.</Text>
            </View>
          </View>
        )}
      </View>

      {/* ── 3. CUSTOMER DOSSIER & CONTACT ── */}
      <View style={styles.card}>
        <Text style={styles.cardHeading}>Customer Information</Text>
        <View style={styles.customerRow}>
          <View style={styles.customerAvatar}>
            <Text style={styles.customerAvatarText}>{customerName.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.customerName}>{customerName}</Text>
            <Text style={styles.customerPhone}>
              {customerPhone ? `📞 ${customerPhone}` : 'Verified Customer (Phone unmasked upon booking)'}
            </Text>
          </View>
        </View>

        {isBooking && (
          <View style={styles.contactRow}>
            {customerPhone ? (
              <TouchableOpacity
                style={styles.callBtn}
                onPress={() => Linking.openURL(`tel:${customerPhone}`)}
                activeOpacity={0.8}
              >
                <Ionicons name="call" size={15} color="#FFFFFF" />
                <Text style={styles.callBtnText}>Call Customer</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={styles.chatBtn}
              onPress={() =>
                navigation.navigate('ChatDetail', {
                  bookingId: booking._id,
                  otherUser: booking.customer,
                  title: booking.serviceTitle
                })
              }
              activeOpacity={0.8}
            >
              <Ionicons name="chatbubble-ellipses" size={15} color="#152B3C" />
              <Text style={styles.chatBtnText}>Open Chat</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── 3.5. SERVICE LOCATION & DIRECT GPS NAVIGATION ── */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardHeading}>Service Location</Text>
          {hasValidCoords && !isMaskedForPrivacy && (
            <View style={styles.gpsVerifiedBadge}>
              <Ionicons name="radio" size={11} color="#059669" />
              <Text style={styles.gpsVerifiedBadgeText}>100% GPS PIN</Text>
            </View>
          )}
        </View>

        {isMaskedForPrivacy ? (
          <View style={styles.maskedLocationBox}>
            <View style={styles.locationRow}>
              <Ionicons name="location" size={18} color="#D97706" style={{ marginTop: 2 }} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.generalLocalityText}>
                  {localityName ? `${localityName}, ${cityName}` : cityName}
                </Text>
                <Text style={styles.maskedPrivacyNotice}>
                  🔒 Doorstep house number, landmark, and exact GPS coordinates are masked on open tender and will be revealed immediately once this job is accepted.
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.fullLocationContainer}>
            {/* Doorstep Address Breakdown */}
            <View style={styles.addressLineRow}>
              <Ionicons name="business" size={16} color="#475569" style={{ marginTop: 2 }} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.addressPrimaryText}>
                  {[houseNumber, street].filter(Boolean).join(', ') || 'Doorstep Service Address'}
                </Text>
                <Text style={styles.addressSecondaryText}>
                  {[localityName, cityName, zipCode].filter(Boolean).join(', ')}
                </Text>
              </View>
            </View>

            {/* Landmark Badge if provided */}
            {landmark ? (
              <View style={styles.landmarkBox}>
                <Ionicons name="flag" size={13} color="#D97706" />
                <Text style={styles.landmarkText}>
                  <Text style={{ fontWeight: '700' }}>Landmark: </Text>
                  {landmark}
                </Text>
              </View>
            ) : null}

            {/* Access / Gate Instructions */}
            {accessNotes ? (
              <View style={styles.accessNotesBox}>
                <Ionicons name="information-circle" size={14} color="#0284C7" />
                <Text style={styles.accessNotesText}>
                  <Text style={{ fontWeight: '700' }}>Gate / Entry Note: </Text>
                  {accessNotes}
                </Text>
              </View>
            ) : null}

            {/* GPS Satellite Pin Coordinates */}
            {hasValidCoords && coords && (
              <View style={styles.gpsCoordsBox}>
                <Ionicons name="locate" size={13} color="#059669" />
                <Text style={styles.gpsCoordsText}>
                  Pin: {Number(coords.lat).toFixed(6)}, {Number(coords.lng).toFixed(6)}
                  {accuracyMeters ? ` • GPS Accuracy ±${accuracyMeters}m` : ''}
                </Text>
              </View>
            )}

            {/* Direct Google Maps 1-Tap Navigation Button */}
            <TouchableOpacity
              style={styles.directNavBtn}
              onPress={handleNavigateToCustomer}
              activeOpacity={0.85}
            >
              <Ionicons name="navigate" size={16} color="#FFFFFF" />
              <Text style={styles.directNavBtnText}>
                {hasValidCoords
                  ? 'Start Google Maps Navigation (Exact GPS Pin)'
                  : 'Navigate via Google Maps'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── 4. PHYSICAL ARRIVAL OTP VERIFICATION (Shown only when arrived & unverified) ── */}
      {isOtpNeeded && (
        <View style={[styles.card, styles.otpCard]}>
          <View style={styles.otpHeader}>
            <Ionicons name="key" size={20} color="#D97706" />
            <Text style={styles.otpTitle}>Service Arrival Verification</Text>
          </View>
          <Text style={styles.otpDesc}>
            Ask the homeowner for their 6-digit Arrival OTP to verify physical presence and unlock the "In Progress" work state.
          </Text>
          <TouchableOpacity
            style={styles.otpActionBtn}
            onPress={() => setOtpModal({ open: true, code: '', submitting: false })}
            activeOpacity={0.85}
          >
            <Ionicons name="key-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.otpActionBtnText}>Enter 6-Digit Arrival OTP</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Arrival Verified confirmation banner (when in_progress or already verified) */}
      {isBooking && (booking.status === 'in_progress' || isOtpVerified) && !['completed', 'cancelled'].includes(booking.status) && (
        <View style={[styles.card, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0', borderWidth: 1 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#15803D', marginLeft: 8 }}>
              Arrival Verified — In Progress
            </Text>
          </View>
          <Text style={{ fontSize: 13, color: '#166534', marginTop: 4, lineHeight: 18 }}>
            Customer physical presence confirmed. Perform the scheduled service and tap "Complete Work" below when finished.
          </Text>
        </View>
      )}

      {/* ── 5. FINANCIAL & ESCROW SUMMARY ── */}
      <View style={styles.card}>
        <Text style={styles.cardHeading}>Financial Breakdown (₹ INR)</Text>
        <View style={styles.feeRow}>
          <Text style={styles.feeLabel}>Gross Job Quotation</Text>
          <Text style={styles.feeVal}>
            {grossAmount > 0 ? formatCurrency(grossAmount) : 'Quotation pending'}
          </Text>
        </View>
        <View style={styles.feeRow}>
          <Text style={styles.feeLabel}>WorkLogy Platform Fee ({feePercent}%)</Text>
          <Text style={[styles.feeVal, { color: '#DC2626' }]}>
            {grossAmount > 0 ? `-${formatCurrency(platformFee)}` : '—'}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.feeRow}>
          <Text style={styles.netLabel}>Net Contractor Payout</Text>
          <Text style={styles.netVal}>
            {grossAmount > 0 ? formatCurrency(netTakeHome) : 'Pending agreement'}
          </Text>
        </View>
        <Text style={styles.escrowNotice}>
          🔒 Escrow Protected: Funds are released automatically to your verified bank account upon customer sign-off.
        </Text>
      </View>

      {/* ── 6. WORKFLOW STATUS CONTROLS ── */}
      {isBooking && (
        <View style={styles.card}>
          <Text style={styles.cardHeading}>Workflow Controls</Text>

          {['confirmed', 'scheduled', 'assigned'].includes(booking.status) && (
            <TouchableOpacity
              style={[styles.workflowBtn, { backgroundColor: '#2563EB' }]}
              onPress={() => handleUpdateStatus('on_the_way')}
              activeOpacity={0.85}
            >
              <Ionicons name="car" size={16} color="#FFFFFF" />
              <Text style={styles.workflowBtnText}>Mark as "On The Way"</Text>
            </TouchableOpacity>
          )}

          {['confirmed', 'scheduled', 'assigned', 'on_the_way'].includes(booking.status) && (
            <TouchableOpacity
              style={[styles.workflowBtn, { backgroundColor: '#7C3AED' }]}
              onPress={() => handleUpdateStatus('arrived')}
              activeOpacity={0.85}
            >
              <Ionicons name="location" size={16} color="#FFFFFF" />
              <Text style={styles.workflowBtnText}>Mark as "Arrived at Customer Site"</Text>
            </TouchableOpacity>
          )}

          {/* When status is 'arrived', the OTP card in Section 4 provides the single verification action. We do NOT duplicate it here! */}
          {booking.status === 'arrived' && !isOtpVerified && (
            <View style={{ backgroundColor: '#FEF3C7', padding: 12, borderRadius: 8, flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="information-circle" size={18} color="#D97706" />
              <Text style={{ marginLeft: 8, color: '#92400E', fontSize: 13, flex: 1, fontWeight: '500' }}>
                Please enter the 6-digit Arrival OTP in the verification box above to start work.
              </Text>
            </View>
          )}

          {booking.status === 'in_progress' && (
            <TouchableOpacity
              style={[styles.workflowBtn, { backgroundColor: '#059669' }]}
              onPress={() => setCompleteModal({ open: true, notes: '', submitting: false })}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-done" size={16} color="#FFFFFF" />
              <Text style={styles.workflowBtnText}>Complete Work & Request Customer Sign-off</Text>
            </TouchableOpacity>
          )}

          {booking.status === 'completion_pending' && (
            <View style={styles.waitingSignoff}>
              <Ionicons name="time-outline" size={20} color="#D97706" />
              <Text style={styles.waitingSignoffText}>
                Work marked complete. Awaiting homeowner's sign-off and payment release.
              </Text>
            </View>
          )}

          {booking.status === 'completed' && (
            <View style={styles.completedNotice}>
              <Ionicons name="checkmark-circle" size={24} color="#059669" />
              <Text style={styles.completedNoticeText}>
                Job completed and verified! Earnings credited to your WorkLogy weekly payout ledger.
              </Text>
            </View>
          )}

          {booking.status === 'cancelled' && (
            <View style={[styles.waitingSignoff, { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}>
              <Ionicons name="close-circle" size={20} color="#DC2626" />
              <Text style={[styles.waitingSignoffText, { color: '#B91C1C' }]}>
                This booking has been cancelled and cannot be reopened.
              </Text>
            </View>
          )}

          {/* Cancel button only if not already terminal */}
          {!['completed', 'cancelled', 'completion_pending'].includes(booking.status) && (
            <TouchableOpacity
              style={styles.cancelBtnOutline}
              onPress={() => setCancelModal((prev) => ({ ...prev, open: true }))}
              activeOpacity={0.85}
            >
              <Ionicons name="close-circle-outline" size={16} color="#DC2626" />
              <Text style={styles.cancelBtnOutlineText}>Cancel Booking</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── 6b. OPEN JOB ACTION CONTROLS (FOR TENDER CLAIMS / PROPOSALS) ── */}
      {!isBooking && job && (
        <View style={styles.card}>
          <Text style={styles.cardHeading}>Available Actions</Text>
          <View style={{ gap: 10 }}>
            <TouchableOpacity
              style={[styles.workflowBtn, { backgroundColor: '#059669' }]}
              onPress={() => {
                Alert.alert(
                  isEmergency ? 'Claim Emergency Job ⚡' : 'Accept Assignment',
                  `Are you ready to accept "${job.title}"?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Accept Job',
                      onPress: async () => {
                        try {
                          if (isEmergency) {
                            await api.jobs.claimEmergencyLead(job._id);
                          } else {
                            await api.jobs.acceptJob(job._id);
                          }
                          Alert.alert('Job Confirmed! 🎉', 'You have accepted this assignment.');
                          navigation.navigate('JobsTab', { initialTab: 'accepted' });
                        } catch (err: any) {
                          Alert.alert('Error', err.message || 'Could not claim job.');
                        }
                      }
                    }
                  ]
                );
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="flash" size={16} color="#FFFFFF" />
              <Text style={styles.workflowBtnText}>
                {isEmergency ? 'Claim Emergency Lead ⚡' : 'Accept Job Assignment'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.workflowBtn, { backgroundColor: '#1E40AF' }]}
              onPress={() => {
                navigation.navigate('JobsTab', { initialTab: 'all' });
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="send" size={16} color="#FFFFFF" />
              <Text style={styles.workflowBtnText}>Submit Quotation from Board</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={{ height: 40 }} />

      {/* ── ARRIVAL OTP MODAL ── */}
      <Modal visible={otpModal.open} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Enter Arrival OTP</Text>
              <TouchableOpacity onPress={() => setOtpModal({ ...otpModal, open: false })}>
                <Ionicons name="close" size={24} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>
              Please enter the 6-digit verification code provided by the customer at the site.
            </Text>
            <TextInput
              style={styles.otpInput}
              keyboardType="numeric"
              maxLength={6}
              value={otpModal.code}
              onChangeText={(t) => setOtpModal({ ...otpModal, code: t })}
              placeholder="Enter 6-digit start code"
              placeholderTextColor="#9CA3AF"
            />
            <TouchableOpacity
              style={styles.submitOtpBtn}
              onPress={handleVerifyOtp}
              disabled={otpModal.submitting}
            >
              {otpModal.submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitOtpBtnText}>Verify OTP & Start Job</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── COMPLETION MODAL ── */}
      <Modal visible={completeModal.open} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Service Sign-Off</Text>
              <TouchableOpacity onPress={() => setCompleteModal({ ...completeModal, open: false })}>
                <Ionicons name="close" size={24} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>
              Describe the completed service and any components replaced for the customer's warranty record.
            </Text>
            <TextInput
              style={[styles.otpInput, styles.completeTextInput]}
              multiline
              numberOfLines={3}
              value={completeModal.notes}
              onChangeText={(t) => setCompleteModal({ ...completeModal, notes: t })}
              placeholder="Summarize work completed, components replaced, and any customer instructions..."
              placeholderTextColor="#9CA3AF"
            />
            <TouchableOpacity
              style={styles.submitOtpBtn}
              onPress={handleSignoff}
              disabled={completeModal.submitting}
            >
              {completeModal.submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitOtpBtnText}>Submit Sign-Off & Close Work</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── CANCELLATION MODAL ── */}
      <Modal visible={cancelModal.open} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: '#DC2626' }]}>Cancel Booking</Text>
              <TouchableOpacity onPress={() => setCancelModal({ ...cancelModal, open: false })}>
                <Ionicons name="close" size={24} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>
              Please select a reason for cancelling this booking. The homeowner will be notified immediately.
            </Text>

            <View style={styles.reasonsList}>
              {[
                'Emergency schedule conflict',
                'Unable to reach service location',
                'Parts / specialized tools unavailable',
                'Customer requested cancellation',
                'Safety or site access issue'
              ].map((reason) => {
                const isSelected = cancelModal.reason === reason;
                return (
                  <TouchableOpacity
                    key={reason}
                    style={[styles.reasonOption, isSelected && styles.reasonOptionActive]}
                    onPress={() => setCancelModal((prev) => ({ ...prev, reason }))}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={isSelected ? COLORS.primary : COLORS.textMuted}
                    />
                    <Text style={[styles.reasonOptionText, isSelected && styles.reasonOptionTextActive]}>
                      {reason}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput
              style={[styles.otpInput, styles.completeTextInput, { marginTop: 10 }]}
              multiline
              numberOfLines={2}
              value={cancelModal.customNote}
              onChangeText={(t) => setCancelModal((prev) => ({ ...prev, customNote: t }))}
              placeholder="Explain why you need to cancel this booking (optional)..."
              placeholderTextColor="#9CA3AF"
            />

            <TouchableOpacity
              style={[styles.submitOtpBtn, { backgroundColor: '#DC2626' }]}
              onPress={handleCancelBooking}
              disabled={cancelModal.submitting}
            >
              {cancelModal.submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitOtpBtnText}>Confirm Cancellation</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  heroContainer: {
    width: '100%',
    height: 180,
    backgroundColor: '#0F172A',
    position: 'relative'
  },
  heroImage: {
    width: '100%',
    height: '100%'
  },
  heroBackBtn: {
    position: 'absolute',
    top: 14,
    left: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  statusPill: {
    position: 'absolute',
    bottom: 12,
    right: 14,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  categoryBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.5
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textDark,
    marginTop: 2
  },
  localityText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4
  },
  emergencyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    borderColor: '#FECDD3',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 12
  },
  emergencyNoticeTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#991B1B'
  },
  emergencyNoticeSub: {
    fontSize: 11,
    color: '#881337',
    marginTop: 1
  },
  cardHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 10
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  customerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center'
  },
  customerAvatarText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#3730A3'
  },
  customerName: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textDark
  },
  customerPhone: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2
  },
  contactRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12
  },
  callBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 9,
    borderRadius: 8,
    gap: 6
  },
  callBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  chatBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 9,
    borderRadius: 8,
    gap: 6
  },
  chatBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#152B3C'
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  gpsVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5
  },
  gpsVerifiedBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#059669'
  },
  maskedLocationBox: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 8,
    padding: 10
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  generalLocalityText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E'
  },
  maskedPrivacyNotice: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 3,
    lineHeight: 15
  },
  fullLocationContainer: {
    gap: 8
  },
  addressLineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  addressPrimaryText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.textDark
  },
  addressSecondaryText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2
  },
  landmarkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6
  },
  landmarkText: {
    fontSize: 11.5,
    color: '#92400E'
  },
  accessNotesBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6
  },
  accessNotesText: {
    flex: 1,
    fontSize: 11.5,
    color: '#0369A1',
    lineHeight: 15
  },
  gpsCoordsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6
  },
  gpsCoordsText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#047857'
  },
  directNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 4,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3
  },
  directNavBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  otpCard: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A'
  },
  otpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6
  },
  otpTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400E'
  },
  otpDesc: {
    fontSize: 12,
    color: '#B45309',
    lineHeight: 16
  },
  otpActionBtn: {
    backgroundColor: '#D97706',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10
  },
  otpActionBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  feeLabel: {
    fontSize: 12,
    color: COLORS.textMuted
  },
  feeVal: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: 8
  },
  netLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textDark
  },
  netVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#065F46'
  },
  escrowNotice: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 8,
    lineHeight: 15
  },
  workflowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 8,
    gap: 6
  },
  workflowBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  waitingSignoff: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: 8,
    gap: 8
  },
  waitingSignoffText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
    flex: 1
  },
  completedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 12,
    borderRadius: 8,
    gap: 8
  },
  completedNoticeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
    flex: 1
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: COLORS.textMuted
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
    marginTop: 10
  },
  errorSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4
  },
  backBtn: {
    marginTop: 14,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  backBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textDark
  },
  modalSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 17,
    marginBottom: 12
  },
  otpInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 4,
    textAlign: 'center',
    color: COLORS.textDark
  },
  completeTextInput: {
    fontSize: 13,
    letterSpacing: 0,
    textAlign: 'left',
    height: 70,
    textAlignVertical: 'top'
  },
  submitOtpBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 14
  },
  submitOtpBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  cancelledNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    marginTop: 8
  },
  cancelledNoticeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#991B1B',
    flex: 1
  },
  cancelBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10
  },
  cancelBtnOutlineText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626'
  },
  reasonsList: {
    gap: 8,
    marginVertical: 8
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC'
  },
  reasonOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#EFF6FF'
  },
  reasonOptionText: {
    fontSize: 13,
    color: COLORS.textDark,
    flex: 1
  },
  reasonOptionTextActive: {
    fontWeight: '700',
    color: COLORS.primary
  }
});

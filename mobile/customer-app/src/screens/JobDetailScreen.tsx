import React, { useEffect, useState, useCallback } from 'react';
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
  StatusBar,
  Image,
  Modal
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
  const [quotations, setQuotations] = useState<any[]>([]);
  const [acceptingQuoteId, setAcceptingQuoteId] = useState<string | null>(null);
  const [rejectingQuoteId, setRejectingQuoteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  // Customer selection confirmation modal state
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [selectedQuoteForConfirmation, setSelectedQuoteForConfirmation] = useState<any | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'price_asc' | 'price_desc'>('date');
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressSavedToProfile, setAddressSavedToProfile] = useState(false);

  const handleSaveBookingAddressToProfile = async () => {
    if (!booking?.address) return;
    try {
      setSavingAddress(true);
      const addr: any = booking.address;
      await api.customer.addAddress({
        label: 'Home',
        houseNumber: addr.houseNumber || '',
        street: addr.street || addr.address || 'Service Location',
        locality: addr.locality || '',
        city: addr.city || 'Lucknow',
        state: addr.state || 'Uttar Pradesh',
        zipCode: addr.pincode || addr.zipCode || '226010',
        coordinates: addr.coordinates || { lat: 0, lng: 0 }
      });
      setAddressSavedToProfile(true);
      dataSyncService.notify('PROFILE_CHANGED');
      Alert.alert(
        'Address Saved 🎉',
        'This service address has been saved to your Customer Profile. You can select it with 1-tap for future bookings.'
      );
    } catch (err: any) {
      Alert.alert('Save Failed', err.message || 'Could not save address to profile.');
    } finally {
      setSavingAddress(false);
    }
  };

  useEffect(() => {
    loadBooking();
    const unsubNav = navigation?.addListener?.('focus', () => {
      loadBooking();
    });
    return () => {
      if (typeof unsubNav === 'function') unsubNav();
    };
  }, [targetId, navigation]);

  useEffect(() => {
    const unsubBookings = dataSyncService.subscribe('BOOKINGS_CHANGED', (payload: any) => {
      if (payload?.hasReview && (payload?.bookingId === targetId || payload?.bookingId === booking?._id)) {
        setBooking((prev) => (prev ? { ...prev, hasReview: true, review: payload.reviewId || prev.review } : prev));
      }
      loadBooking();
    });
    const unsubQuotes = dataSyncService.subscribe('QUOTES_CHANGED', () => {
      loadBooking();
    });
    return () => {
      unsubBookings();
      unsubQuotes();
    };
  }, [targetId, booking?._id]);

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
      hasReview: Boolean(job.hasReview),
      review: job.review || null,
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
      let loadedBooking: any = null;
      let loadedQuotes: any[] = [];

      const res = await api.bookings.getBookingById(targetId);
      if (res?.booking) {
        loadedBooking = res.booking;
        loadedQuotes = res.quotations || res.booking.quotations || [];
      } else if ((res as any)?.job) {
        loadedBooking = normalizeJobToBooking((res as any).job);
        loadedQuotes = (res as any).quotations || [];
      } else {
        // Fallback to direct job endpoint
        try {
          const jobRes = await api.jobs.getJobById(targetId);
          if (jobRes?.job) {
            loadedBooking = normalizeJobToBooking(jobRes.job);
          }
        } catch {
          // not found
        }
      }

      // If quotations were empty or booking has no assigned vendor, unconditionally query applications
      const actualJobId = loadedBooking?.jobId || (loadedBooking?.job?._id || loadedBooking?.job) || loadedBooking?._id || targetId;
      if ((!loadedQuotes || loadedQuotes.length === 0) && actualJobId && !loadedBooking?.vendor) {
        try {
          const appsRes = await api.applications.getJobApplications(actualJobId);
          if (appsRes?.applications && Array.isArray(appsRes.applications) && appsRes.applications.length > 0) {
            loadedQuotes = appsRes.applications;
          }
        } catch {
          // Ignore background quote load error
        }
      }

      if (loadedBooking) {
        // Canonical status sync: if unassigned but quotations exist, reflect quotations_received
        if (!loadedBooking.vendor && loadedQuotes.length > 0) {
          loadedBooking.status = 'quotations_received';
          loadedBooking.displayStatus = 'Quotations Received';
          loadedBooking.quotationsCount = loadedQuotes.length;
          loadedBooking.quotedAmount = loadedQuotes[0].proposedAmount;
        }

        // Resilient arrival OTP retrieval for customer when arrived or on the way
        if (!loadedBooking.arrivalOtp && !loadedBooking.isOtpVerified && ['arrived', 'on_the_way', 'confirmed', 'scheduled'].includes(loadedBooking.status)) {
          try {
            const otpRes = await api.bookings.getStartOtp(loadedBooking._id || targetId);
            if (otpRes?.otp && !otpRes.isConsumed) {
              loadedBooking.arrivalOtp = otpRes.otp;
            }
          } catch {
            // Non-fatal fallback
          }
        }

        setBooking(loadedBooking);
        setQuotations(loadedQuotes);
      }
    } catch (err) {
      console.warn('Failed to load booking details from booking endpoint:', err);
      try {
        const jobRes = await api.jobs.getJobById(targetId);
        if (jobRes?.job) {
          const b = normalizeJobToBooking(jobRes.job);
          let qList: any[] = [];
          try {
            const appsRes = await api.applications.getJobApplications(jobRes.job._id);
            if (appsRes?.applications && Array.isArray(appsRes.applications)) {
              qList = appsRes.applications;
            }
          } catch {}
          if (qList.length > 0) {
            b.status = 'quotations_received';
            b.displayStatus = 'Quotations Received';
            b.quotationsCount = qList.length;
            b.quotedAmount = qList[0].proposedAmount;
          }
          setBooking(b);
          setQuotations(qList);
          return;
        }
      } catch {
        // neither booking nor job
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSelectConfirmation = (quote: any) => {
    setSelectedQuoteForConfirmation(quote);
    setConfirmModalVisible(true);
  };

  const handleConfirmAssignment = async () => {
    if (!selectedQuoteForConfirmation || acceptingQuoteId) return;
    const quoteId = selectedQuoteForConfirmation._id || selectedQuoteForConfirmation.id || selectedQuoteForConfirmation.applicationId;
    if (!quoteId) return;

    try {
      setAcceptingQuoteId(quoteId);
      const res = await api.applications.acceptQuotation(quoteId);
      if (res.success) {
        setConfirmModalVisible(false);
        const assignedVendor = res.booking?.vendor || selectedQuoteForConfirmation.vendor;
        const vDisplayName = selectedQuoteForConfirmation.vendorName || assignedVendor?.name || 'The specialist';

        if (res.booking) {
          setBooking(res.booking);
        }
        setQuotations([]);

        dataSyncService.notify('BOOKINGS_CHANGED', { bookingId: res.booking?._id || targetId });
        dataSyncService.notify('QUOTES_CHANGED', {});

        Alert.alert(
          'Professional Assigned! 🎉',
          `You have confirmed ${vDisplayName} for ${formatCurrency(selectedQuoteForConfirmation.proposedAmount)}. WorkLogy Escrow Protection is active.`,
          [{ text: 'View Booking', onPress: () => loadBooking() }]
        );
      } else {
        Alert.alert('Unable to Assign', res.message || 'Please try again later.');
        loadBooking();
      }
    } catch (err: any) {
      if (err?.status === 409 || err?.message?.includes('already')) {
        Alert.alert('Request Updated', 'This service request has already been assigned or updated. Refreshing latest state...');
        loadBooking();
      } else {
        Alert.alert('Assignment Error', err.message || 'Failed to assign professional.');
      }
    } finally {
      setAcceptingQuoteId(null);
    }
  };

  const handleRejectQuote = async (quote: any) => {
    const quoteId = quote._id || quote.id || quote.applicationId;
    if (!quoteId || rejectingQuoteId) return;

    Alert.alert(
      'Decline Quotation',
      'Are you sure you want to decline this professional quote?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              setRejectingQuoteId(quoteId);
              const res = await api.applications.rejectQuotation(quoteId);
              if (res.success) {
                setQuotations((prev) => prev.filter((q) => (q._id || q.id) !== quoteId));
                dataSyncService.notify('QUOTES_CHANGED', {});
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to decline quotation.');
            } finally {
              setRejectingQuoteId(null);
            }
          }
        }
      ]
    );
  };

  const handleChatWithVendor = (quote: any) => {
    const vendorId =
      quote.vendor?._id ||
      quote.vendor?.user?._id ||
      quote.vendor?.user ||
      quote.vendor ||
      quote.vendorId;

    navigation.navigate('ChatDetail', {
      recipientId: vendorId,
      otherUser: {
        _id: vendorId,
        name: quote.vendorName || quote.vendor?.name || 'Service Professional',
        avatar: quote.vendorAvatar || quote.vendor?.avatar,
        phone: quote.vendorPhone || quote.vendor?.phone
      },
      jobId: booking?._id || targetId,
      title: quote.vendorName || 'Professional Chat'
    });
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
    <View style={styles.screenWrapper}>
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
      {(booking.arrivalOtp || (booking as any)?.startOtp?.otp) && !booking.isOtpVerified && (
        <View style={styles.otpCard}>
          <View style={styles.otpHeader}>
            <Text style={styles.otpIcon}>🔐</Text>
            <Text style={styles.otpTitle}>PHYSICAL ARRIVAL VERIFICATION PIN</Text>
          </View>
          <Text style={styles.otpNumber}>{booking.arrivalOtp || (booking as any)?.startOtp?.otp}</Text>
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
      ) : quotations.length > 0 ? (
        <View style={styles.quotesReceivedCard}>
          <View style={styles.quotesHeaderRow}>
            <View style={styles.quotesIconBubble}>
              <Text style={{ fontSize: 24 }}>📋</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.quotesReceivedTitle}>
                {quotations.length === 1 ? '1 Professional Quote Received' : `${quotations.length} Professional Quotes Received`}
              </Text>
              <Text style={styles.quotesReceivedDesc}>
                Review proposals from verified local specialists below. Compare rates and select your preferred professional to confirm with WorkLogy Escrow Protection.
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.waitingCard}>
          <Text style={styles.waitingEmoji}>📡</Text>
          <Text style={styles.waitingTitle}>Locating Available Local Pros</Text>
          <Text style={styles.waitingDesc}>
            Your request has been broadcasted. You will receive quotes from verified local technicians shortly.
          </Text>
        </View>
      )}

      {/* Quotations Received List */}
      {quotations.length > 0 && !booking.vendor && (
        <View style={styles.section}>
          <View style={styles.quotesSectionHeader}>
            <Text style={styles.sectionTitle}>
              Quotations Received ({quotations.length})
            </Text>
            {quotations.length > 1 && (
              <View style={styles.sortPillsRow}>
                <TouchableOpacity
                  style={[styles.sortPill, sortBy === 'date' && styles.sortPillActive]}
                  onPress={() => setSortBy('date')}
                >
                  <Text style={[styles.sortPillText, sortBy === 'date' && styles.sortPillTextActive]}>Latest</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sortPill, sortBy === 'price_asc' && styles.sortPillActive]}
                  onPress={() => setSortBy('price_asc')}
                >
                  <Text style={[styles.sortPillText, sortBy === 'price_asc' && styles.sortPillTextActive]}>Lowest Price</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {(() => {
            const sortedQuotes = [...quotations].sort((a, b) => {
              if (sortBy === 'price_asc') return (a.proposedAmount || 0) - (b.proposedAmount || 0);
              if (sortBy === 'price_desc') return (b.proposedAmount || 0) - (a.proposedAmount || 0);
              return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
            });

            return sortedQuotes.map((quote, idx) => {
              const vName = quote.vendorName || quote.vendor?.businessName || quote.vendor?.name || 'Verified Specialist';
              const vAvatar = quote.vendorAvatar || quote.vendor?.avatar;
              const vRating = quote.vendorRating || 4.9;
              const vReviews = quote.vendorProfile?.reviewCount || 0;
              const isAccepting = acceptingQuoteId === (quote._id || quote.id);
              const isRejecting = rejectingQuoteId === (quote._id || quote.id);
              const targetVendorId = quote.vendor?._id || quote.vendor?.id || quote.vendor?.user?._id || quote.vendor;

              return (
                <View key={quote._id || idx} style={styles.quoteCard}>
                  {/* Vendor Header */}
                  <View style={styles.quoteCardHeader}>
                    <TouchableOpacity
                      style={styles.quoteVendorAvatar}
                      onPress={() => {
                        if (targetVendorId) {
                          navigation.navigate('ProfessionalProfile', { vendorId: targetVendorId, vendor: quote.vendor });
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      {vAvatar ? (
                        <Image source={{ uri: vAvatar }} style={styles.quoteAvatarImg} />
                      ) : (
                        <Text style={styles.quoteAvatarText}>{vName.charAt(0).toUpperCase()}</Text>
                      )}
                    </TouchableOpacity>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.quoteVendorName}>{vName}</Text>
                      <Text style={styles.quoteVendorSub}>
                        ✓ WorkLogy Verified Pro • ⭐ {vRating}{vReviews > 0 ? ` (${vReviews} reviews)` : ''}
                      </Text>
                      <Text style={styles.quoteCategoryTag}>
                        {booking.category || 'Home Services'}
                      </Text>
                    </View>
                    <View style={styles.quoteAmountBadge}>
                      <Text style={styles.quoteAmountText}>{formatCurrency(quote.proposedAmount)}</Text>
                      <Text style={styles.quoteAmountType}>{quote.pricingBasis || 'Fixed Quote'}</Text>
                    </View>
                  </View>

                  {/* Scope & Schedule */}
                  <View style={styles.quoteDetailsBox}>
                    {quote.coverLetter ? (
                      <Text style={styles.quoteCoverLetter}>"{quote.coverLetter}"</Text>
                    ) : null}

                    {quote.materialCharges > 0 && (
                      <View style={styles.quoteBreakdownBox}>
                        <Text style={styles.quoteBreakdownText}>
                          Labor & Service: {formatCurrency(quote.proposedAmount - quote.materialCharges)}
                        </Text>
                        <Text style={styles.quoteBreakdownDot}>•</Text>
                        <Text style={styles.quoteBreakdownText}>
                          Materials: {formatCurrency(quote.materialCharges)}
                        </Text>
                      </View>
                    )}

                    <View style={styles.quotePillsRow}>
                      <View style={styles.quotePill}>
                        <Ionicons name="calendar-outline" size={13} color="#06684F" />
                        <Text style={styles.quotePillText}>{quote.proposedSchedule || 'Flexible Schedule'}</Text>
                      </View>
                      <View style={styles.quotePill}>
                        <Ionicons name="time-outline" size={13} color="#06684F" />
                        <Text style={styles.quotePillText}>{quote.estimatedDuration || '1-2 hours'}</Text>
                      </View>
                      <View style={styles.quotePill}>
                        <Ionicons name="time" size={13} color="#64748B" />
                        <Text style={[styles.quotePillText, { color: '#64748B' }]}>
                          Sent {formatDate(quote.createdAt)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Actions */}
                  <View style={styles.quoteActionRow}>
                    <TouchableOpacity
                      style={[styles.quoteAcceptBtn, isAccepting && { opacity: 0.7 }]}
                      onPress={() => handleOpenSelectConfirmation(quote)}
                      disabled={isAccepting || isRejecting}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.quoteAcceptBtnText}>Select Professional 🛡️</Text>
                    </TouchableOpacity>

                    <View style={{ flexDirection: 'row', marginTop: 8, gap: 8 }}>
                      <TouchableOpacity
                        style={styles.quoteProfileBtn}
                        onPress={() => {
                          if (targetVendorId) {
                            navigation.navigate('ProfessionalProfile', { vendorId: targetVendorId, vendor: quote.vendor });
                          }
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.quoteProfileBtnText}>View Profile ›</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.quoteChatBtn}
                        onPress={() => handleChatWithVendor(quote)}
                        disabled={isAccepting || isRejecting}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.quoteChatBtnText}>Chat with Pro 💬</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.quoteDeclineBtn}
                        onPress={() => handleRejectQuote(quote)}
                        disabled={isAccepting || isRejecting}
                        activeOpacity={0.8}
                      >
                        {isRejecting ? (
                          <ActivityIndicator size="small" color="#64748B" />
                        ) : (
                          <Text style={styles.quoteDeclineBtnText}>Decline</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            });
          })()}
        </View>
      )}

      {/* Service Location */}
      <View style={styles.section}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text style={styles.sectionTitle}>Service Location</Text>
          {booking.address && (booking.address.street || booking.address.city) && (
            <TouchableOpacity
              style={styles.saveAddressToProfileBtn}
              onPress={handleSaveBookingAddressToProfile}
              disabled={savingAddress || addressSavedToProfile}
              activeOpacity={0.7}
            >
              {savingAddress ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : addressSavedToProfile ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="checkmark-circle" size={13} color="#059669" />
                  <Text style={styles.saveAddressSavedText}>Saved to Profile</Text>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="bookmark-outline" size={13} color={COLORS.primary} />
                  <Text style={styles.saveAddressBtnText}>Save Address to Profile</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.addressStreet}>{booking.address?.street || (booking.address as any)?.address || 'Address on file'}</Text>
          <Text style={styles.addressCity}>
            {[
              (booking.address as any)?.locality,
              booking.address?.city,
              booking.address?.pincode || (booking.address as any)?.zipCode
            ]
              .filter(Boolean)
              .join(', ')}
          </Text>
        </View>
      </View>

      {/* Pricing & Escrow */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment & Escrow Protection</Text>
        <View style={styles.infoCard}>
          {booking.vendor ? (
            <>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Confirmed Service Value</Text>
                <Text style={styles.priceValue}>{formatCurrency(booking.totalAmount)}</Text>
              </View>
              <View style={styles.escrowNotice}>
                <Text style={styles.escrowText}>
                  🛡️ Payment Status: {booking.pricing?.paymentStatus?.replace(/_/g, ' ') || 'Held in Escrow'}. Funds are released to the professional only after you confirm satisfactory work completion with your completion PIN.
                </Text>
              </View>
            </>
          ) : quotations.length > 0 ? (
            <>
              <View style={styles.priceRow}>
                <View>
                  <Text style={styles.priceLabel}>Quoted Amount (Awaiting Selection)</Text>
                  <Text style={{ fontSize: 11, color: '#059669', fontWeight: '600', marginTop: 2 }}>
                    Final amount not confirmed
                  </Text>
                </View>
                <Text style={[styles.priceValue, { color: '#06684F' }]}>
                  {quotations.length === 1
                    ? formatCurrency(quotations[0].proposedAmount)
                    : `From ${formatCurrency(Math.min(...quotations.map((q: any) => q.proposedAmount)))}`}
                </Text>
              </View>
              <View style={styles.escrowNotice}>
                <Text style={styles.escrowText}>
                  🛡️ {quotations.length === 1 ? '1 quotation' : `${quotations.length} quotations`} received. Final amount is confirmed once you select and confirm a professional quotation. WorkLogy Escrow Protection will hold payment securely upon assignment.
                </Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Total Service Value</Text>
                <Text style={[styles.priceValue, { color: '#64748B', fontSize: 14 }]}>
                  Awaiting quotation
                </Text>
              </View>
              <View style={styles.escrowNotice}>
                <Text style={styles.escrowText}>
                  🛡️ Quote-based service request. Once local specialists review your requirements and submit bids, you can compare quotes and confirm the best rate.
                </Text>
              </View>
            </>
          )}
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
                jobId: booking.jobId || (booking as any).job?._id || (booking as any).job,
                bookingReference: booking.bookingReference,
                serviceTitle: booking.serviceTitle,
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
      {['pending', 'pending_acceptance', 'open', 'quotations_received', 'confirmed', 'scheduled'].includes(booking.status) && (
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

    {/* Customer Selection Confirmation Modal */}
    <Modal
      visible={confirmModalVisible && Boolean(selectedQuoteForConfirmation)}
      transparent
      animationType="slide"
      onRequestClose={() => {
        if (!acceptingQuoteId) setConfirmModalVisible(false);
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>Confirm Professional 🛡️</Text>
              <Text style={styles.modalSubtitle}>Review quote details before final assignment</Text>
            </View>
            <TouchableOpacity
              onPress={() => setConfirmModalVisible(false)}
              disabled={Boolean(acceptingQuoteId)}
              style={styles.modalCloseBtn}
            >
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {selectedQuoteForConfirmation && (
            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {/* Specialist Profile Card */}
              <View style={styles.modalVendorCard}>
                <View style={styles.modalVendorAvatar}>
                  {selectedQuoteForConfirmation.vendorAvatar ? (
                    <Image
                      source={{ uri: selectedQuoteForConfirmation.vendorAvatar }}
                      style={styles.modalAvatarImg}
                    />
                  ) : (
                    <Text style={styles.modalAvatarText}>
                      {(selectedQuoteForConfirmation.vendorName || 'P').charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.modalVendorName}>
                    {selectedQuoteForConfirmation.vendorName || selectedQuoteForConfirmation.vendor?.name || 'Service Professional'}
                  </Text>
                  <Text style={styles.modalVendorSub}>
                    ✓ WorkLogy Verified Pro • ⭐ {selectedQuoteForConfirmation.vendorRating || 4.9}
                  </Text>
                  <Text style={styles.modalCategoryText}>
                    {booking.category || 'Home Services'}
                  </Text>
                </View>
              </View>

              {/* Quoted Rate Summary */}
              <View style={styles.modalPriceBox}>
                <View style={styles.modalPriceRow}>
                  <Text style={styles.modalPriceLabel}>Agreed Service Total</Text>
                  <Text style={styles.modalPriceValue}>
                    {formatCurrency(selectedQuoteForConfirmation.proposedAmount)}
                  </Text>
                </View>
                {selectedQuoteForConfirmation.materialCharges > 0 && (
                  <View style={styles.modalBreakdownRow}>
                    <Text style={styles.modalBreakdownText}>
                      Labor & Diagnostics: {formatCurrency(selectedQuoteForConfirmation.proposedAmount - selectedQuoteForConfirmation.materialCharges)}
                    </Text>
                    <Text style={styles.modalBreakdownText}>
                      Parts/Materials: {formatCurrency(selectedQuoteForConfirmation.materialCharges)}
                    </Text>
                  </View>
                )}
                <View style={styles.modalEscrowBadge}>
                  <Ionicons name="shield-checkmark" size={14} color="#06684F" />
                  <Text style={styles.modalEscrowText}>
                    100% Escrow Protected: Funds released only after satisfactory service
                  </Text>
                </View>
              </View>

              {/* Scope & Schedule */}
              <View style={styles.modalInfoSection}>
                <Text style={styles.modalSectionLabel}>Service Scope & Proposal</Text>
                {selectedQuoteForConfirmation.coverLetter ? (
                  <Text style={styles.modalCoverLetter}>
                    "{selectedQuoteForConfirmation.coverLetter}"
                  </Text>
                ) : null}

                <View style={styles.modalPillsRow}>
                  <View style={styles.modalPill}>
                    <Ionicons name="calendar-outline" size={13} color="#06684F" />
                    <Text style={styles.modalPillText}>
                      {selectedQuoteForConfirmation.proposedSchedule || 'Flexible Schedule'}
                    </Text>
                  </View>
                  <View style={styles.modalPill}>
                    <Ionicons name="time-outline" size={13} color="#06684F" />
                    <Text style={styles.modalPillText}>
                      {selectedQuoteForConfirmation.estimatedDuration || '1-2 hours'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Terms Agreement Note */}
              <View style={styles.modalTermsBox}>
                <Text style={styles.modalTermsText}>
                  By confirming, you assign this service request exclusively to this professional under WorkLogy booking terms. Other active quotations will be politely declined.
                </Text>
              </View>
            </ScrollView>
          )}

          {/* Modal Actions */}
          <View style={styles.modalActionRow}>
            <TouchableOpacity
              style={[styles.modalConfirmBtn, acceptingQuoteId && { opacity: 0.7 }]}
              onPress={handleConfirmAssignment}
              disabled={Boolean(acceptingQuoteId)}
              activeOpacity={0.85}
            >
              {acceptingQuoteId ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.modalConfirmBtnText}>Confirm & Assign Professional 🛡️</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setConfirmModalVisible(false)}
              disabled={Boolean(acceptingQuoteId)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalCancelBtnText}>Review Other Quotes</Text>
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
  quotesReceivedCard: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#86EFAC'
  },
  quotesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  quotesIconBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BBF7D0'
  },
  quotesReceivedTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#166534'
  },
  quotesReceivedDesc: {
    fontSize: 11,
    color: '#15803D',
    marginTop: 3,
    lineHeight: 16
  },
  quoteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2
  },
  quoteCardHeader: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  quoteVendorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#06684F',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  quoteAvatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22
  },
  quoteAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800'
  },
  quoteVendorName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textDark
  },
  quoteVendorSub: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
    marginTop: 2
  },
  quoteAmountBadge: {
    alignItems: 'flex-end',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0'
  },
  quoteAmountText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#06684F'
  },
  quoteAmountType: {
    fontSize: 9,
    color: '#047857',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 1
  },
  quoteDetailsBox: {
    marginTop: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10
  },
  quoteCoverLetter: {
    fontSize: 12,
    color: '#334155',
    fontStyle: 'italic',
    lineHeight: 16,
    marginBottom: 8
  },
  quotePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  quotePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  quotePillText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600'
  },
  quoteActionRow: {
    marginTop: 12
  },
  quoteAcceptBtn: {
    backgroundColor: '#06684F',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  quoteAcceptBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800'
  },
  quoteChatBtn: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center'
  },
  quoteChatBtnText: {
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '700'
  },
  quoteDeclineBtn: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  quoteDeclineBtnText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700'
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
  },
  screenWrapper: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  quotesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  sortPillsRow: {
    flexDirection: 'row',
    gap: 6
  },
  sortPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  sortPillActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0'
  },
  sortPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B'
  },
  sortPillTextActive: {
    color: '#06684F',
    fontWeight: '800'
  },
  quoteCategoryTag: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2
  },
  quoteBreakdownBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    marginBottom: 8
  },
  quoteBreakdownText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600'
  },
  quoteBreakdownDot: {
    fontSize: 11,
    color: '#94A3B8'
  },
  quoteProfileBtn: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center'
  },
  quoteProfileBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#06684F'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end'
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textDark
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9'
  },
  modalVendorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  modalVendorAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#06684F',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  modalAvatarImg: {
    width: 46,
    height: 46,
    borderRadius: 23
  },
  modalAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800'
  },
  modalVendorName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textDark
  },
  modalVendorSub: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
    marginTop: 2
  },
  modalCategoryText: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2
  },
  modalPriceBox: {
    marginTop: 12,
    backgroundColor: '#ECFDF5',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#A7F3D0'
  },
  modalPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  modalPriceLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46'
  },
  modalPriceValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#06684F'
  },
  modalBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#A7F3D0'
  },
  modalBreakdownText: {
    fontSize: 11,
    color: '#047857',
    fontWeight: '600'
  },
  modalEscrowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8
  },
  modalEscrowText: {
    fontSize: 10,
    color: '#166534',
    fontWeight: '700',
    flex: 1
  },
  modalInfoSection: {
    marginTop: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  modalSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6
  },
  modalCoverLetter: {
    fontSize: 12,
    color: '#334155',
    fontStyle: 'italic',
    lineHeight: 17,
    marginBottom: 10
  },
  modalPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  modalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  modalPillText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600'
  },
  modalTermsBox: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A'
  },
  modalTermsText: {
    fontSize: 11,
    color: '#92400E',
    lineHeight: 15
  },
  modalActionRow: {
    marginTop: 16,
    gap: 8
  },
  modalConfirmBtn: {
    backgroundColor: '#06684F',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalConfirmBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800'
  },
  modalCancelBtn: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalCancelBtnText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700'
  },
  saveAddressToProfileBtn: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0'
  },
  saveAddressBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary
  },
  saveAddressSavedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669'
  }
});

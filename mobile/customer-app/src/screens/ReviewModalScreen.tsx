import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { COLORS } from '../theme/colors';
import { dataSyncService } from '../services/dataSyncService';

type FormLifecycleState = 'editing' | 'submitting' | 'published' | 'closing';

const RATING_DESCRIPTIONS: Record<number, string> = {
  1: 'Poor — Unsatisfactory service',
  2: 'Fair — Needs noticeable improvement',
  3: 'Good — Standard satisfactory work',
  4: 'Very Good — High quality & professional',
  5: 'Excellent — Flawless, highly recommended!'
};

export default function ReviewModalScreen({ route, navigation }: any) {
  const params = route.params || {};
  const initialBookingId = params.bookingId || params.id || params.jobId || '';
  const initialVendorId = params.vendorId || '';
  const initialVendorName = params.vendorName || '';
  const initialServiceTitle = params.serviceTitle || '';

  const [bookingId, setBookingId] = useState<string>(initialBookingId);
  const [vendorId, setVendorId] = useState<string>(initialVendorId);
  const [vendorName, setVendorName] = useState<string>(initialVendorName);
  const [serviceTitle, setServiceTitle] = useState<string>(initialServiceTitle);

  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form lifecycle state machine: 'editing' | 'submitting' | 'published' | 'closing'
  const [lifecycleState, setLifecycleState] = useState<FormLifecycleState>('editing');
  const lifecycleStateRef = useRef<FormLifecycleState>('editing');
  const hasNavigatedAwayRef = useRef<boolean>(false);
  const publishedReviewRef = useRef<any>(null);

  // Synchronize ref with state for event listeners & closures
  useEffect(() => {
    lifecycleStateRef.current = lifecycleState;
  }, [lifecycleState]);

  // Eligibility checking state
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [eligibilityChecked, setEligibilityChecked] = useState(false);
  const [noEligibleBooking, setNoEligibleBooking] = useState(false);

  useEffect(() => {
    // If no bookingId provided, look up eligible completed bookings for this vendor
    if (!bookingId && vendorId) {
      resolveEligibleBooking(vendorId);
    } else {
      setEligibilityChecked(true);
    }
  }, [bookingId, vendorId]);

  const resolveEligibleBooking = async (targetVendorId: string) => {
    try {
      setCheckingEligibility(true);
      const res = await api.reviews.checkEligibility(targetVendorId);
      if (res?.eligible && res.booking?._id) {
        setBookingId(res.booking._id);
        if (res.booking.serviceTitle) {
          setServiceTitle(res.booking.serviceTitle);
        }
        setNoEligibleBooking(false);
      } else {
        // Fallback: fetch awaiting reviews list
        const awaitingRes = await api.reviews.getAwaiting();
        if (awaitingRes?.bookings && Array.isArray(awaitingRes.bookings) && awaitingRes.bookings.length > 0) {
          const match = awaitingRes.bookings.find(
            (b: any) =>
              (b.vendor?._id && b.vendor._id.toString() === targetVendorId) ||
              (b.vendor?.id && b.vendor.id.toString() === targetVendorId) ||
              (b.vendor && b.vendor.toString() === targetVendorId)
          );
          if (match) {
            setBookingId(match._id);
            if (match.serviceTitle) setServiceTitle(match.serviceTitle);
            if (match.vendor?.name) setVendorName(match.vendor.businessName || match.vendor.name);
            setNoEligibleBooking(false);
          } else {
            setNoEligibleBooking(true);
          }
        } else {
          setNoEligibleBooking(true);
        }
      }
    } catch {
      setNoEligibleBooking(true);
    } finally {
      setCheckingEligibility(false);
      setEligibilityChecked(true);
    }
  };

  /**
   * Evaluates if form has unsaved modifications.
   * Only true in 'editing' lifecycle. In 'submitting', 'published', or 'closing',
   * unsaved changes are strictly false to prevent the discard loop.
   */
  const hasUnsavedChanges = useCallback(() => {
    if (lifecycleStateRef.current !== 'editing') {
      return false;
    }
    return comment.trim().length > 0 || title.trim().length > 0;
  }, [comment, title]);

  /**
   * Safe exit helper to close the review screen cleanly.
   */
  const performSafeExit = useCallback(() => {
    if (hasNavigatedAwayRef.current) return;
    hasNavigatedAwayRef.current = true;
    setLifecycleState('closing');
    lifecycleStateRef.current = 'closing';

    if (navigation?.canGoBack?.()) {
      navigation.goBack(true); // force=true bypasses all registered back handlers
    } else if (navigation?.replace) {
      navigation.replace('MyJobsTab');
    } else if (navigation?.navigate) {
      navigation.navigate('MyJobsTab');
    }
  }, [navigation]);

  /**
   * Shows confirmation when discarding unpublished feedback.
   */
  const showDiscardConfirmation = useCallback(() => {
    if (lifecycleStateRef.current !== 'editing') return;

    Alert.alert(
      'Discard Review?',
      'You have entered feedback. Are you sure you want to discard your review?',
      [
        {
          text: 'Keep Editing',
          style: 'cancel',
          onPress: () => {
            // No-op: remain on review form in editing mode
          }
        },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            performSafeExit();
          }
        }
      ]
    );
  }, [performSafeExit]);

  /**
   * Handles user tapping "Done" in the success dialog:
   * 1. Closes success dialog
   * 2. Closes the review form
   * 3. Navigates to previous screen (completed booking dossier or bookings list)
   * 4. Dispatches dataSync events to update canonical data
   * 5. Prevents reopening or discard confirmation
   */
  const handleDone = useCallback(() => {
    if (hasNavigatedAwayRef.current) return;
    hasNavigatedAwayRef.current = true;
    setLifecycleState('closing');
    lifecycleStateRef.current = 'closing';

    // Broadcast synchronization notifications
    dataSyncService.notify('BOOKINGS_CHANGED', {
      bookingId,
      hasReview: true,
      reviewId: publishedReviewRef.current?._id
    });
    dataSyncService.notify('REVIEWS_CHANGED', {
      vendorId,
      bookingId
    });
    dataSyncService.notify('PROFILE_CHANGED');

    // Safe exit navigation
    if (navigation?.canGoBack?.()) {
      navigation.goBack(true);
    } else if (navigation?.replace) {
      navigation.replace('MyJobsTab');
    } else if (navigation?.navigate) {
      navigation.navigate('MyJobsTab');
    }
  }, [bookingId, vendorId, navigation]);

  /**
   * Handles user tapping "View on Profile" in the success dialog:
   * 1. Closes the review form
   * 2. Replaces review screen with Professional Profile (so Back returns to booking, NOT review form)
   * 3. Dispatches dataSync events to refresh reviews and aggregate rating
   */
  const handleViewOnProfile = useCallback(() => {
    if (hasNavigatedAwayRef.current) return;
    hasNavigatedAwayRef.current = true;
    setLifecycleState('closing');
    lifecycleStateRef.current = 'closing';

    const targetVendorId =
      vendorId ||
      publishedReviewRef.current?.vendor?._id ||
      publishedReviewRef.current?.vendor;

    // Broadcast synchronization notifications
    dataSyncService.notify('BOOKINGS_CHANGED', {
      bookingId,
      hasReview: true,
      reviewId: publishedReviewRef.current?._id
    });
    dataSyncService.notify('REVIEWS_CHANGED', {
      vendorId: targetVendorId,
      bookingId
    });
    dataSyncService.notify('PROFILE_CHANGED');

    if (targetVendorId && navigation?.replace) {
      navigation.replace('ProfessionalProfile', { vendorId: targetVendorId });
    } else if (targetVendorId && navigation?.navigate) {
      navigation.navigate('ProfessionalProfile', { vendorId: targetVendorId });
    } else if (navigation?.canGoBack?.()) {
      navigation.goBack(true);
    } else if (navigation?.replace) {
      navigation.replace('MyJobsTab');
    }
  }, [bookingId, vendorId, navigation]);

  /**
   * Register back handler for navigation header & Android hardware Back button
   */
  useEffect(() => {
    const unregister = navigation?.registerBackHandler?.(() => {
      // 1. If currently closing, block further back actions to prevent double navigation
      if (lifecycleStateRef.current === 'closing') {
        return true;
      }

      // 2. If submitting, block navigation while request is in flight
      if (lifecycleStateRef.current === 'submitting') {
        return true;
      }

      // 3. If published, never show discard confirmation; exit cleanly immediately
      if (lifecycleStateRef.current === 'published') {
        handleDone();
        return true;
      }

      // 4. In editing: if user has unsaved draft changes, prompt discard confirmation
      if (hasUnsavedChanges()) {
        showDiscardConfirmation();
        return true;
      }

      // 5. No changes: allow standard navigation without blocking
      return false;
    });

    return () => {
      unregister?.();
    };
  }, [navigation, hasUnsavedChanges, showDiscardConfirmation, handleDone]);

  /**
   * Cancel button on the screen body
   */
  const handleCancelPress = () => {
    if (lifecycleStateRef.current !== 'editing') return;
    if (hasUnsavedChanges()) {
      showDiscardConfirmation();
    } else {
      performSafeExit();
    }
  };

  /**
   * Submit Review flow with comprehensive duplicate protection & state lifecycle
   */
  const handleSubmit = async () => {
    if (lifecycleStateRef.current !== 'editing' || submitting) return;

    if (!comment.trim()) {
      Alert.alert('Feedback Required', 'Please share a brief comment about the technician and service quality.');
      return;
    }

    if (comment.trim().length < 5) {
      Alert.alert('Feedback Too Short', 'Please enter at least 5 characters describing your service experience.');
      return;
    }

    if (!bookingId) {
      Alert.alert(
        'Booking Reference Missing',
        'Could not identify an unreviewed completed booking. Only verified completed services can receive customer reviews.'
      );
      return;
    }

    try {
      setSubmitting(true);
      setLifecycleState('submitting');
      lifecycleStateRef.current = 'submitting';

      const res = await api.reviews.submit({
        booking: bookingId,
        bookingId: bookingId,
        vendorId: vendorId || undefined,
        rating,
        title: title.trim() || undefined,
        comment: comment.trim()
      });

      const createdReview = res?.review;
      publishedReviewRef.current = createdReview;
      setLifecycleState('published');
      lifecycleStateRef.current = 'published';

      // Immediately synchronize booking review state
      dataSyncService.notify('BOOKINGS_CHANGED', {
        bookingId,
        hasReview: true,
        reviewId: createdReview?._id
      });
      dataSyncService.notify('REVIEWS_CHANGED', {
        vendorId,
        bookingId
      });

      Alert.alert(
        'Review Published! ⭐',
        `Thank you! Your verified rating and review are now published directly on ${vendorName || 'the professional'}'s profile.`,
        [
          ...(vendorId
            ? [
                {
                  text: 'View on Profile',
                  onPress: handleViewOnProfile
                }
              ]
            : []),
          {
            text: 'Done',
            onPress: handleDone
          }
        ],
        { cancelable: false }
      );
    } catch (err: any) {
      const isDuplicate =
        err?.code === 'REVIEW_ALREADY_EXISTS' ||
        err?.status === 409 ||
        (err?.message && /already.*submitted/i.test(err.message));

      if (isDuplicate) {
        // Reconcile as published
        setLifecycleState('published');
        lifecycleStateRef.current = 'published';
        dataSyncService.notify('BOOKINGS_CHANGED', {
          bookingId,
          hasReview: true
        });

        Alert.alert(
          'Review Already Published! ⭐',
          `A verified review has already been submitted for this booking with ${vendorName || 'the professional'}.`,
          [
            ...(vendorId
              ? [
                  {
                    text: 'View on Profile',
                    onPress: handleViewOnProfile
                  }
                ]
              : []),
            {
              text: 'Done',
              onPress: handleDone
            }
          ],
          { cancelable: false }
        );
        return;
      }

      // Network or other transient error: keep entered rating & comment so customer can retry
      setLifecycleState('editing');
      lifecycleStateRef.current = 'editing';
      const msg = err?.message || 'Could not submit review. Please check your network and try again.';
      Alert.alert('Submission Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingEligibility) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Verifying completed service booking...</Text>
      </View>
    );
  }

  if (eligibilityChecked && noEligibleBooking && !bookingId) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.card}>
          <View style={styles.iconCircleWarning}>
            <Ionicons name="shield-outline" size={32} color="#D97706" />
          </View>
          <Text style={styles.title}>Verified Review Notice</Text>
          <Text style={styles.noticeBody}>
            WorkLogy enforces authentic, verified reviews. Reviews can only be submitted for completed services that
            have not already been reviewed.
          </Text>
          <Text style={styles.noticeSub}>
            No unreviewed completed booking was found with {vendorName || 'this professional'}. If you recently completed a service,
            please check your bookings status.
          </Text>

          <View style={{ width: '100%', gap: 10, marginTop: 16 }}>
            <TouchableOpacity
              style={styles.primaryActionBtn}
              onPress={() => {
                if (navigation?.replace) {
                  navigation.replace('MyJobsTab');
                } else if (navigation?.navigate) {
                  navigation.navigate('MyJobsTab');
                }
              }}
            >
              <Ionicons name="receipt-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.primaryActionText}>View My Bookings</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelActionBtn} onPress={performSafeExit}>
              <Text style={styles.cancelActionText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.iconCircleSuccess}>
            <Ionicons name="star" size={28} color="#F59E0B" />
          </View>
          <Text style={styles.title}>Rate Your Experience</Text>
          <Text style={styles.subtitle}>
            How was the service provided by{' '}
            <Text style={{ fontWeight: '800', color: COLORS.textDark }}>
              {vendorName || 'your professional'}
            </Text>
            ?
          </Text>

          {serviceTitle ? (
            <View style={styles.serviceBadge}>
              <Ionicons name="checkmark-circle" size={13} color={COLORS.primary} style={{ marginRight: 4 }} />
              <Text style={styles.serviceBadgeText} numberOfLines={1}>
                {serviceTitle}
              </Text>
            </View>
          ) : null}

          {/* 1-5 Star Selector */}
          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => {
                  if (lifecycleState === 'editing') {
                    setRating(star);
                  }
                }}
                activeOpacity={lifecycleState === 'editing' ? 0.7 : 1}
                disabled={lifecycleState !== 'editing'}
                style={styles.starTouchArea}
              >
                <Text style={[styles.starIcon, rating >= star ? styles.starFilled : styles.starEmpty]}>
                  ★
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Rating Description */}
          <View style={styles.ratingDescBadge}>
            <Text style={styles.ratingDescText}>{RATING_DESCRIPTIONS[rating] || ''}</Text>
          </View>

          {/* Headline */}
          <Text style={styles.fieldLabel}>Review Headline (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Prompt arrival, excellent wiring repair"
            placeholderTextColor={COLORS.textMuted}
            value={title}
            onChangeText={setTitle}
            maxLength={100}
            editable={lifecycleState === 'editing'}
          />

          {/* Detailed Comment */}
          <Text style={styles.fieldLabel}>Detailed Feedback *</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Share details on punctuality, diagnosis, clean-up, and professionalism..."
            placeholderTextColor={COLORS.textMuted}
            multiline
            numberOfLines={4}
            value={comment}
            onChangeText={setComment}
            maxLength={1500}
            editable={lifecycleState === 'editing'}
          />

          {/* Submission Buttons */}
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.cancelBtn, lifecycleState !== 'editing' && { opacity: 0.5 }]}
              onPress={handleCancelPress}
              disabled={lifecycleState !== 'editing' || submitting}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, (submitting || lifecycleState !== 'editing') && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={submitting || lifecycleState !== 'editing'}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                  <Text style={styles.submitBtnText}>Post Verified Review</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    padding: 16,
    paddingVertical: 24
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3
  },
  iconCircleSuccess: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10
  },
  iconCircleWarning: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textDark,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 10
  },
  serviceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    marginBottom: 14
  },
  serviceBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46'
  },
  noticeBody: {
    fontSize: 13,
    color: COLORS.textDark,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 8
  },
  noticeSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8
  },
  starRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  starTouchArea: {
    padding: 4
  },
  starIcon: {
    fontSize: 38
  },
  starFilled: {
    color: '#F59E0B'
  },
  starEmpty: {
    color: '#E2E8F0'
  },
  ratingDescBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 16
  },
  ratingDescText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textDark
  },
  fieldLabel: {
    alignSelf: 'flex-start',
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 6
  },
  input: {
    width: '100%',
    height: 46,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 13,
    color: COLORS.textDark,
    marginBottom: 14
  },
  textArea: {
    width: '100%',
    height: 96,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: COLORS.textDark,
    textAlignVertical: 'top',
    marginBottom: 20
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%'
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center'
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary
  },
  submitBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 12,
    width: '100%'
  },
  primaryActionText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  cancelActionBtn: {
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%'
  },
  cancelActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600'
  }
});

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, getStoredAuthToken } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../theme/colors';
import { formatCurrency, formatDate } from '../utils/formatters';
import { getServiceImage } from '../utils/serviceImages';
import Header from '../components/Header';
import type { Job, Booking } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type JobTab = 'requests' | 'new' | 'quoted' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';

export default function JobsScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const initialTab: JobTab = route?.params?.initialTab || 'new';
  const categoryFilter: string | undefined = route?.params?.category;

  const [activeTab, setActiveTab] = useState<JobTab>(initialTab);
  const [openJobs, setOpenJobs] = useState<Job[]>([]);
  const [myApplications, setMyApplications] = useState<any[]>([]);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  // Auth & Error Handling States
  const [authRequired, setAuthRequired] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Configuration and Eligibility Status
  const [configurationStatus, setConfigurationStatus] = useState<
    'ready' | 'missing_categories' | 'missing_service_area'
  >('ready');
  const [serverCounts, setServerCounts] = useState<{
    allAvailable: number;
    new: number;
    open: number;
    assignedToMe: number;
    cancelled: number;
  } | null>(null);
  const [vendorCoverage, setVendorCoverage] = useState<any>(null);
  const [vendorEligibility, setVendorEligibility] = useState<any>(null);

  // Quotation Modal State
  const [quoteModalVisible, setQuoteModalVisible] = useState(false);
  const [selectedJobForQuote, setSelectedJobForQuote] = useState<Job | null>(null);
  const [serviceCharge, setServiceCharge] = useState('');
  const [labourCharge, setLabourCharge] = useState('');
  const [materialCharge, setMaterialCharge] = useState('');
  const [additionalCharge, setAdditionalCharge] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('1-2 hours');
  const [proposedSchedule, setProposedSchedule] = useState('Tomorrow Morning');
  const [workDescription, setWorkDescription] = useState('');
  const [submittingQuote, setSubmittingQuote] = useState(false);

  const loadAllJobsData = useCallback(
    async (isSilent = false) => {
      try {
        if (isSilent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setApiError(null);
        setAuthRequired(false);

        const token = await getStoredAuthToken();
        if (!token) {
          setAuthRequired(true);
          setOpenJobs([]);
          setMyApplications([]);
          setMyBookings([]);
          return;
        }

        // Fetch active opportunities with tab='all' so open jobs are not filtered out by the 48-hour age cutoff
        const [jobsRes, appsRes, bookRes, notifRes] = await Promise.all([
          api.jobs.getOpenJobs({ tab: 'all', category: categoryFilter }),
          api.applications.getMyApplications().catch((e) => {
            console.warn('Applications fetch warning:', e);
            return { applications: [] };
          }),
          api.bookings.getMyBookings().catch((e) => {
            console.warn('Bookings fetch warning:', e);
            return { bookings: [] };
          }),
          api.notifications.getUnreadCount().catch(() => ({ count: 0 }))
        ]);

        if (jobsRes) {
          setOpenJobs(jobsRes.jobs || []);
          if (jobsRes.configurationStatus) {
            setConfigurationStatus(jobsRes.configurationStatus);
          }
          if (jobsRes.counts) {
            setServerCounts(jobsRes.counts);
          }
          if (jobsRes.vendorEligibility) {
            setVendorEligibility(jobsRes.vendorEligibility);
          }
          if (jobsRes.vendorCoverage) {
            setVendorCoverage(jobsRes.vendorCoverage);
          }
        }
        if (appsRes?.applications) setMyApplications(appsRes.applications);
        if (bookRes?.bookings) setMyBookings(bookRes.bookings);
        if (notifRes?.count) setUnreadCount(notifRes.count);
      } catch (err: any) {
        const msg = err?.message || '';
        if (
          msg.includes('Not authorized') ||
          msg.includes('token missing') ||
          msg.includes('401') ||
          msg.includes('jwt')
        ) {
          setAuthRequired(true);
        } else {
          setApiError(msg || 'Unable to connect to jobs server. Please check your network connection.');
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [categoryFilter]
  );

  useEffect(() => {
    loadAllJobsData();
  }, [loadAllJobsData]);

  const handleRefresh = () => {
    loadAllJobsData(true);
  };

  // Quotation calculation
  const totalQuoteAmount =
    (parseFloat(serviceCharge) || 0) +
    (parseFloat(labourCharge) || 0) +
    (parseFloat(materialCharge) || 0) +
    (parseFloat(additionalCharge) || 0);

  const handleOpenQuoteModal = (job: Job) => {
    setSelectedJobForQuote(job);
    const base = job.budget?.amount || job.pricing?.amount || 350;
    setServiceCharge(base.toString());
    setLabourCharge('150');
    setMaterialCharge('0');
    setAdditionalCharge('0');
    setWorkDescription(`Comprehensive diagnostic inspection and professional repair for "${job.title}". Includes verified parts warranty.`);
    setQuoteModalVisible(true);
  };

  const handleSubmitQuote = async () => {
    if (!selectedJobForQuote) return;
    if (totalQuoteAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please specify charges greater than ₹0.');
      return;
    }
    if (!workDescription.trim()) {
      Alert.alert('Description Required', 'Please provide a brief description of the work.');
      return;
    }

    try {
      setSubmittingQuote(true);
      await api.jobs.submitProposal(selectedJobForQuote._id, {
        proposedAmount: totalQuoteAmount,
        coverLetter: workDescription.trim(),
        estimatedDuration,
        materialCharges: parseFloat(materialCharge) || 0,
        pricingBasis: 'fixed'
      });

      Alert.alert('Quote Submitted! 📋', 'Your proposal was sent directly to the customer. You will be notified when they accept.');
      setQuoteModalVisible(false);
      await loadAllJobsData();
      setActiveTab('quoted');
    } catch (err: any) {
      Alert.alert('Submission Error', err.message || 'Could not submit proposal.');
    } finally {
      setSubmittingQuote(false);
    }
  };

  // Claim/Accept Job directly
  const handleClaimJob = (job: Job) => {
    const isEmergency = job.urgency === 'emergency';
    Alert.alert(
      isEmergency ? 'Claim Emergency Job ⚡' : 'Accept Job Assignment',
      `Are you ready to accept "${job.title}"? Once confirmed, this job will move to your Accepted Jobs tab where you can navigate to the customer location.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept Job',
          style: 'default',
          onPress: async () => {
            try {
              setRespondingId(job._id);
              if (isEmergency) {
                await api.jobs.claimEmergencyLead(job._id);
              } else {
                await api.jobs.acceptJob(job._id);
              }
              Alert.alert('Job Confirmed! 🎉', 'You have accepted this assignment. It is now moved to your Accepted Jobs list.');
              await loadAllJobsData();
              setActiveTab('accepted');
            } catch (err: any) {
              Alert.alert('Claim Failed', err.message || 'Could not accept job.');
            } finally {
              setRespondingId(null);
            }
          }
        }
      ]
    );
  };

  const handleAcceptDirectRequest = async (booking: any) => {
    Alert.alert(
      'Accept Direct Booking?',
      `Are you ready to accept this booking for "${booking.serviceTitle || 'Service'}"? Once accepted, a verified service-start OTP will be generated.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept Booking',
          style: 'default',
          onPress: async () => {
            try {
              setRespondingId(booking._id);
              await api.bookings.respondDirectBooking(booking._id, 'accept');
              Alert.alert(
                'Booking Confirmed! 🎉',
                'You have accepted this direct booking. It is now moved to Accepted Jobs where you can view navigation coordinates and verify the start OTP upon arrival.'
              );
              await loadAllJobsData();
              setActiveTab('accepted');
            } catch (err: any) {
              Alert.alert('Action Failed', err.message || 'Could not accept booking.');
            } finally {
              setRespondingId(null);
            }
          }
        }
      ]
    );
  };

  const handleDeclineDirectRequest = (booking: any) => {
    Alert.alert(
      'Decline Booking Request',
      'Are you sure you want to decline this customer inquiry? This cannot be undone.',
      [
        { text: 'Keep Request', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              setRespondingId(booking._id);
              await api.bookings.respondDirectBooking(booking._id, 'decline', 'Vendor unavailable at requested schedule');
              Alert.alert('Request Declined', 'The customer has been notified.');
              await loadAllJobsData();
            } catch (err: any) {
              Alert.alert('Decline Failed', err.message || 'Could not decline booking.');
            } finally {
              setRespondingId(null);
            }
          }
        }
      ]
    );
  };

  // Filter items based on active tab
  const getFilteredItems = () => {
    switch (activeTab) {
      case 'requests':
        return myBookings.filter((b) => b.status === 'pending_acceptance');
      case 'new':
        return openJobs;
      case 'quoted':
        return myApplications;
      case 'accepted':
        return myBookings.filter((b) =>
          ['confirmed', 'scheduled', 'assigned', 'awaiting_confirmation'].includes(b.status)
        );
      case 'in_progress':
        return myBookings.filter((b) =>
          ['on_the_way', 'arrived', 'in_progress', 'completion_pending'].includes(b.status)
        );
      case 'completed':
        return myBookings.filter((b) => b.status === 'completed');
      case 'cancelled':
        return myBookings.filter((b) => b.status === 'cancelled' || b.status === 'disputed' || b.status === 'declined');
      default:
        return [];
    }
  };

  const currentItems = getFilteredItems();

  const getStatusBadge = (status: string, urgency?: string) => {
    if (urgency === 'emergency') {
      return { text: '⚡ EMERGENCY', bg: '#FEE2E2', color: '#DC2626' };
    }
    if (urgency === 'high') {
      return { text: 'HIGH PRIORITY', bg: '#FEF3C7', color: '#B45309' };
    }
    switch (status) {
      case 'pending_acceptance':
        return { text: 'DIRECT INQUIRY', bg: '#FEF3C7', color: '#B45309' };
      case 'open':
        return { text: 'OPEN TENDER', bg: '#EFF6FF', color: '#1D4ED8' };
      case 'emergency':
        return { text: '⚡ EMERGENCY', bg: '#FEE2E2', color: '#DC2626' };
      case 'pending':
        return { text: 'AWAITING RESPONSE', bg: '#FEF3C7', color: '#B45309' };
      case 'confirmed':
      case 'scheduled':
        return { text: 'CONFIRMED', bg: '#ECFDF5', color: '#047857' };
      case 'on_the_way':
        return { text: 'ON THE WAY', bg: '#E0E7FF', color: '#4338CA' };
      case 'arrived':
        return { text: 'ARRIVED AT SITE', bg: '#EDE9FE', color: '#6D28D9' };
      case 'in_progress':
        return { text: 'IN PROGRESS', bg: '#DBEAFE', color: '#1E40AF' };
      case 'completion_pending':
        return { text: 'PENDING SIGN-OFF', bg: '#FEF3C7', color: '#B45309' };
      case 'completed':
        return { text: 'COMPLETED ✓', bg: '#ECFDF5', color: '#059669' };
      case 'cancelled':
        return { text: 'CANCELLED', bg: '#FEE2E2', color: '#B91C1C' };
      default:
        return { text: (status || 'AVAILABLE').toUpperCase(), bg: '#F3F4F6', color: '#374151' };
    }
  };

  const renderJobCard = ({ item }: { item: any }) => {
    // Discriminate between Job, Application, and Booking
    const isRequest = activeTab === 'requests';
    const isApplication = activeTab === 'quoted';
    const isBooking = isRequest || activeTab === 'accepted' || activeTab === 'in_progress' || activeTab === 'completed' || activeTab === 'cancelled';
    const isOpenJob = activeTab === 'new';

    const title = isBooking
      ? item.serviceTitle || item.jobId?.title
      : isApplication
      ? item.job?.title || 'Quoted Job'
      : item.title;

    const catSlug = isBooking
      ? item.jobId?.category?.slug || item.serviceTitle
      : isApplication
      ? item.job?.category?.slug || item.job?.title
      : item.category?.slug || item.category?.name || item.title;

    const categoryName = isBooking
      ? item.jobId?.category?.name || item.serviceTitle
      : isApplication
      ? item.job?.category?.name || 'Home Service'
      : item.category?.name || 'Home Service';

    const jobImage = getServiceImage(catSlug || title);

    // Customer-provided location formatting
    const locality = isBooking
      ? item.address?.locality
        ? `${item.address.locality}, ${item.address.city || 'Lucknow'}`
        : item.address?.city || 'Lucknow'
      : isApplication
      ? item.job?.address?.locality
        ? `${item.job.address.locality}, ${item.job.address.city || 'Lucknow'}`
        : item.job?.address?.city || 'Lucknow'
      : item.location?.locality
      ? `${item.location.locality}, ${item.location.city || 'Lucknow'}`
      : item.location?.city || item.address?.city || 'Lucknow';

    const statusBadge = getStatusBadge(item.status, item.urgency);

    const displayAmount = isBooking
      ? item.pricing?.totalAmount || item.totalAmount
      : isApplication
      ? item.proposedAmount
      : item.budget?.amount || item.pricing?.amount;

    const isEmergency = item.urgency === 'emergency';

    return (
      <View style={[styles.jobCard, isEmergency && styles.emergencyBorder]}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.imageAndTitle}>
            <Image source={jobImage} style={styles.thumbImage} resizeMode="cover" />
            <View style={styles.titleArea}>
              <View style={styles.badgeRow}>
                <View style={[styles.badge, { backgroundColor: statusBadge.bg }]}>
                  <Text style={[styles.badgeText, { color: statusBadge.color }]}>
                    {statusBadge.text}
                  </Text>
                </View>
                <View style={styles.categoryPill}>
                  <Text style={styles.categoryPillText} numberOfLines={1}>
                    {categoryName}
                  </Text>
                </View>
              </View>

              <Text style={styles.jobTitle} numberOfLines={2}>
                {title}
              </Text>

              <Text style={styles.localityText}>📍 {locality}</Text>
            </View>
          </View>
        </View>

        {/* Job Description Preview for New Requests */}
        {isOpenJob && item.description ? (
          <Text style={styles.jobDescriptionPreview} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        {/* Optional problem description for direct booking requests */}
        {isRequest && item.problemDescription ? (
          <View style={styles.requestNoteBox}>
            <Text style={styles.requestNoteLabel}>Customer Request Notes:</Text>
            <Text style={styles.requestNoteText} numberOfLines={2}>
              {item.problemDescription}
            </Text>
          </View>
        ) : null}

        {/* Schedule & Price Row */}
        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Ionicons name="calendar-outline" size={14} color={COLORS.textMuted} />
            <Text style={styles.detailText}>
              {formatDate(item.preferredDate || item.scheduledDate || item.createdAt)}
            </Text>
          </View>

          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>
              {isApplication ? 'Your Quotation' : isBooking ? 'Booking Total' : 'Budget / Est.'}
            </Text>
            <Text style={styles.priceValue}>
              {displayAmount && displayAmount > 0
                ? formatCurrency(displayAmount)
                : item.budget?.type === 'quote'
                ? 'Request for Quote'
                : 'Open Quote'}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          {isRequest ? (
            <View style={styles.directActionRow}>
              <TouchableOpacity
                style={[styles.directAcceptBtn, respondingId === item._id && { opacity: 0.7 }]}
                onPress={() => handleAcceptDirectRequest(item)}
                disabled={respondingId === item._id}
                activeOpacity={0.85}
              >
                {respondingId === item._id ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                    <Text style={styles.directAcceptBtnText}>Accept Booking</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.directDeclineBtn, respondingId === item._id && { opacity: 0.7 }]}
                onPress={() => handleDeclineDirectRequest(item)}
                disabled={respondingId === item._id}
                activeOpacity={0.8}
              >
                <Ionicons name="close-circle-outline" size={16} color="#DC2626" />
                <Text style={styles.directDeclineBtnText}>Decline</Text>
              </TouchableOpacity>
            </View>
          ) : isOpenJob ? (
            <View style={styles.newRequestsActionRow}>
              <TouchableOpacity
                style={styles.quoteBtn}
                onPress={() => handleOpenQuoteModal(item)}
                activeOpacity={0.85}
              >
                <Ionicons name="send" size={14} color="#FFFFFF" />
                <Text style={styles.quoteBtnText}>Send Quote</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.acceptBtn, respondingId === item._id && { opacity: 0.7 }]}
                onPress={() => handleClaimJob(item)}
                disabled={respondingId === item._id}
                activeOpacity={0.85}
              >
                {respondingId === item._id ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="flash" size={14} color="#FFFFFF" />
                    <Text style={styles.acceptBtnText}>{isEmergency ? 'Claim ⚡' : 'Accept'}</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.detailsBtn}
                onPress={() => navigation.navigate('VendorJobDetail', { jobId: item._id })}
                activeOpacity={0.8}
              >
                <Text style={styles.detailsBtnText}>View Dossier</Text>
              </TouchableOpacity>
            </View>
          ) : isBooking ? (
            <TouchableOpacity
              style={styles.manageBtn}
              onPress={() =>
                navigation.navigate('VendorJobDetail', {
                  bookingId: item._id,
                  jobId: item.jobId?._id || item.jobId
                })
              }
              activeOpacity={0.85}
            >
              <Text style={styles.manageBtnText}>
                {activeTab === 'in_progress' ? 'Manage Live Operations & OTP ›' : 'View Booking Details ›'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.detailsBtnFull}
              onPress={() =>
                navigation.navigate('VendorJobDetail', { jobId: item.job?._id || item.job })
              }
              activeOpacity={0.8}
            >
              <Text style={styles.detailsBtnText}>View Proposal Status</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const tabs: Array<{ key: JobTab; label: string; count: number }> = [
    {
      key: 'requests',
      label: 'Direct Inquiries',
      count: myBookings.filter((b) => b.status === 'pending_acceptance').length
    },
    {
      key: 'new',
      label: 'New Requests',
      count: serverCounts?.allAvailable ?? openJobs.length
    },
    { key: 'quoted', label: 'Quoted', count: myApplications.length },
    {
      key: 'accepted',
      label: 'Accepted',
      count:
        serverCounts?.assignedToMe ??
        myBookings.filter((b) =>
          ['confirmed', 'scheduled', 'assigned', 'awaiting_confirmation'].includes(b.status)
        ).length
    },
    {
      key: 'in_progress',
      label: 'In Progress',
      count: myBookings.filter((b) =>
        ['on_the_way', 'arrived', 'in_progress', 'completion_pending'].includes(b.status)
      ).length
    },
    {
      key: 'completed',
      label: 'Completed',
      count: myBookings.filter((b) => b.status === 'completed').length
    },
    {
      key: 'cancelled',
      label: 'Cancelled',
      count: myBookings.filter((b) => b.status === 'cancelled' || b.status === 'disputed' || b.status === 'declined').length
    }
  ];

  return (
    <View style={styles.container}>
      <Header
        unreadCount={unreadCount}
        userName={user?.name || 'Verified Vendor'}
        userAvatar={typeof user?.avatar === 'string' ? user.avatar : undefined}
        onPressNotifications={() => navigation.navigate('Notifications')}
        onPressProfile={() => navigation.navigate('ProfileTab')}
      />

      {/* Tabs Filter Bar */}
      <View style={styles.tabsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScroll}
        >
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabItem, activeTab === tab.key && styles.tabItemActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
              {tab.count > 0 && (
                <View
                  style={[
                    styles.tabCountBadge,
                    activeTab === tab.key && styles.tabCountBadgeActive
                  ]}
                >
                  <Text
                    style={[
                      styles.tabCountText,
                      activeTab === tab.key && styles.tabCountTextActive
                    ]}
                  >
                    {tab.count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── ACTIONABLE CONFIGURATION BANNER (Missing Categories or Location) ── */}
      {activeTab === 'new' && configurationStatus === 'missing_categories' ? (
        <View style={styles.configBannerCard}>
          <View style={styles.configBannerIcon}>
            <Ionicons name="construct-outline" size={24} color="#B45309" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.configBannerTitle}>No Trade Categories Configured</Text>
            <Text style={styles.configBannerSub}>
              You have not configured your approved trade categories yet. Please add your trade services (e.g., Electrical, Plumbing, AC Repair) to receive customer job dispatches in your area.
            </Text>
            <TouchableOpacity
              style={styles.configActionBtn}
              onPress={() => navigation.navigate('ProfileTab')}
              activeOpacity={0.8}
            >
              <Text style={styles.configActionBtnText}>Configure Categories in Profile →</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : activeTab === 'new' && configurationStatus === 'missing_service_area' ? (
        <View style={styles.configBannerCard}>
          <View style={styles.configBannerIcon}>
            <Ionicons name="location-outline" size={24} color="#B45309" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.configBannerTitle}>Service Area Coverage Needed</Text>
            <Text style={styles.configBannerSub}>
              You have not set your service localities yet. Please update your service localities in your profile to view matching customer requests in Lucknow.
            </Text>
            <TouchableOpacity
              style={styles.configActionBtn}
              onPress={() => navigation.navigate('ProfileTab')}
              activeOpacity={0.8}
            >
              <Text style={styles.configActionBtnText}>Set Service Area in Profile →</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* ── MAIN CONTENT STATE (AUTH, ERROR, LOADING, EMPTY, LIST) ── */}
      {authRequired ? (
        <View style={styles.authBannerCard}>
          <Ionicons name="lock-closed" size={40} color="#D97706" />
          <Text style={styles.authCardTitle}>Sign In as Verified Professional</Text>
          <Text style={styles.authCardSub}>
            Please sign in with your contractor credentials to view and claim available customer requests.
          </Text>
          <TouchableOpacity
            style={styles.authActionBtn}
            onPress={() => navigation.navigate('VendorLogin')}
            activeOpacity={0.85}
          >
            <Text style={styles.authActionBtnText}>Sign In to WorkLogy Pro</Text>
          </TouchableOpacity>
        </View>
      ) : apiError ? (
        <View style={styles.errorStateCard}>
          <Ionicons name="cloud-offline-outline" size={44} color="#EF4444" />
          <Text style={styles.errorStateTitle}>Connection Failed</Text>
          <Text style={styles.errorStateSub}>{apiError}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadAllJobsData()} activeOpacity={0.8}>
            <Ionicons name="refresh" size={16} color="#FFFFFF" />
            <Text style={styles.retryBtnText}>Retry Connection</Text>
          </TouchableOpacity>
        </View>
      ) : loading && !refreshing ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading jobs feed...</Text>
        </View>
      ) : currentItems.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="folder-open-outline" size={44} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>No Jobs Found</Text>
          <Text style={styles.emptySubtext}>
            There are currently no items in the "{tabs.find((t) => t.key === activeTab)?.label}" tab.
          </Text>
          <TouchableOpacity style={styles.exploreBtn} onPress={handleRefresh} activeOpacity={0.8}>
            <Ionicons name="refresh-outline" size={14} color="#FFFFFF" />
            <Text style={styles.exploreBtnText}>Refresh Feed</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={currentItems}
          keyExtractor={(item) => item._id || Math.random().toString()}
          renderItem={renderJobCard}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ── 8. QUOTATION MODAL ── */}
      <Modal visible={quoteModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Submit Professional Quote</Text>
                <Text style={styles.modalSubtitle} numberOfLines={1}>
                  {selectedJobForQuote?.title}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setQuoteModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* Pricing Breakdown Inputs */}
              <Text style={styles.inputSectionTitle}>Pricing Breakdown (₹ INR)</Text>

              <View style={styles.inputRow}>
                <View style={styles.halfInput}>
                  <Text style={styles.inputLabel}>Service / Diagnostic Fee</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={serviceCharge}
                    onChangeText={setServiceCharge}
                    placeholder="350"
                  />
                </View>
                <View style={styles.halfInput}>
                  <Text style={styles.inputLabel}>Labour Charges</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={labourCharge}
                    onChangeText={setLabourCharge}
                    placeholder="150"
                  />
                </View>
              </View>

              <View style={styles.inputRow}>
                <View style={styles.halfInput}>
                  <Text style={styles.inputLabel}>Material / Parts (Est.)</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={materialCharge}
                    onChangeText={setMaterialCharge}
                    placeholder="0"
                  />
                </View>
                <View style={styles.halfInput}>
                  <Text style={styles.inputLabel}>Additional / Travel</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={additionalCharge}
                    onChangeText={setAdditionalCharge}
                    placeholder="0"
                  />
                </View>
              </View>

              {/* Total Quotation Summary */}
              <View style={styles.totalBox}>
                <Text style={styles.totalLabel}>Total Quotation</Text>
                <Text style={styles.totalAmount}>{formatCurrency(totalQuoteAmount)}</Text>
              </View>

              {/* Duration & Proposed Schedule */}
              <View style={styles.inputRow}>
                <View style={styles.halfInput}>
                  <Text style={styles.inputLabel}>Est. Completion Time</Text>
                  <TextInput
                    style={styles.textInput}
                    value={estimatedDuration}
                    onChangeText={setEstimatedDuration}
                    placeholder="1-2 hours"
                  />
                </View>
                <View style={styles.halfInput}>
                  <Text style={styles.inputLabel}>Proposed Schedule</Text>
                  <TextInput
                    style={styles.textInput}
                    value={proposedSchedule}
                    onChangeText={setProposedSchedule}
                    placeholder="Tomorrow 10 AM"
                  />
                </View>
              </View>

              {/* Description of Work */}
              <Text style={styles.inputLabel}>Description of Work & Warranty</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                multiline
                numberOfLines={3}
                value={workDescription}
                onChangeText={setWorkDescription}
                placeholder="Detail what is included in your service..."
              />

              <Text style={styles.modalDisclaimer}>
                🔒 100% Escrow Protected: Payment is held by WorkLogy and released upon customer sign-off.
              </Text>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setQuoteModalVisible(false)}
              >
                <Text style={styles.cancelModalBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitModalBtn}
                onPress={handleSubmitQuote}
                disabled={submittingQuote}
              >
                {submittingQuote ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.submitModalBtnText}>Submit Quote ({formatCurrency(totalQuoteAmount)})</Text>
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
    backgroundColor: COLORS.background
  },
  tabsWrapper: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  tabsScroll: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6'
  },
  tabItemActive: {
    backgroundColor: '#152B3C'
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary
  },
  tabTextActive: {
    color: '#FFFFFF'
  },
  tabCountBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    marginLeft: 6
  },
  tabCountBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)'
  },
  tabCountText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textDark
  },
  tabCountTextActive: {
    color: '#FFFFFF'
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
    gap: 12
  },
  jobCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2
  },
  emergencyBorder: {
    borderColor: '#FECACA',
    backgroundColor: '#FFFBFB'
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  imageAndTitle: {
    flexDirection: 'row',
    flex: 1
  },
  thumbImage: {
    width: 68,
    height: 68,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    marginRight: 12
  },
  titleArea: {
    flex: 1
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
    flexWrap: 'wrap'
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3
  },
  categoryPill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  categoryPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#4B5563'
  },
  jobTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textDark,
    lineHeight: 18
  },
  localityText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 3
  },
  jobDescriptionPreview: {
    fontSize: 12,
    color: '#475569',
    marginTop: 8,
    lineHeight: 17
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  detailText: {
    fontSize: 11,
    color: COLORS.textSecondary
  },
  priceContainer: {
    alignItems: 'flex-end'
  },
  priceLabel: {
    fontSize: 10,
    color: COLORS.textMuted
  },
  priceValue: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primaryDark
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12
  },
  newRequestsActionRow: {
    flexDirection: 'row',
    gap: 6,
    width: '100%'
  },
  quoteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 9,
    borderRadius: 8,
    gap: 4
  },
  quoteBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  acceptBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 9,
    borderRadius: 8,
    gap: 4
  },
  acceptBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  detailsBtn: {
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center'
  },
  detailsBtnFull: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center'
  },
  detailsBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textDark
  },
  manageBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#152B3C',
    paddingVertical: 10,
    borderRadius: 8
  },
  manageBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: COLORS.textMuted
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
    marginTop: 12
  },
  emptySubtext: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18
  },
  exploreBtn: {
    marginTop: 16,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  exploreBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF'
  },

  // Configuration Notice Banner
  configBannerCard: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    margin: 16,
    marginBottom: 0,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start'
  },
  configBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center'
  },
  configBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E'
  },
  configBannerSub: {
    fontSize: 11,
    color: '#78350F',
    marginTop: 3,
    lineHeight: 16
  },
  configActionBtn: {
    marginTop: 8,
    alignSelf: 'flex-start'
  },
  configActionBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B45309'
  },

  // Auth Banner Card
  authBannerCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32
  },
  authCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
    marginTop: 12
  },
  authCardSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
    marginBottom: 16
  },
  authActionBtn: {
    backgroundColor: '#1E40AF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8
  },
  authActionBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF'
  },

  // Error Card
  errorStateCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32
  },
  errorStateTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
    marginTop: 12
  },
  errorStateSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
    marginBottom: 16
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 8
  },
  retryBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF'
  },

  // ── Modal Styles ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    padding: 18
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textDark
  },
  modalSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
    maxWidth: SCREEN_WIDTH * 0.75
  },
  modalScroll: {
    marginBottom: 14
  },
  inputSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 8
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10
  },
  halfInput: {
    flex: 1
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 4
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: COLORS.textDark
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top'
  },
  totalBox: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46'
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#064E3B'
  },
  modalDisclaimer: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 10,
    textAlign: 'center'
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingTop: 12
  },
  cancelModalBtn: {
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F3F4F6'
  },
  cancelModalBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark
  },
  submitModalBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  submitModalBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  requestNoteBox: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 8,
    padding: 8,
    marginHorizontal: 12,
    marginBottom: 10
  },
  requestNoteLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#92400E',
    textTransform: 'uppercase',
    marginBottom: 2
  },
  requestNoteText: {
    fontSize: 12,
    color: '#78350F',
    lineHeight: 16
  },
  directActionRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%'
  },
  directAcceptBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6
  },
  directAcceptBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13
  },
  directDeclineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 4
  },
  directDeclineBtnText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 13
  }
});

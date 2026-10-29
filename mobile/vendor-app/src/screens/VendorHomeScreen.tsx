import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  RefreshControl,
  Switch,
  Alert,
  ActivityIndicator,
  Platform,
  StatusBar
} from 'react-native';
import { useNavigation } from '../context/NavigationContext';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/client';
import { COLORS } from '../theme/colors';
import { formatCurrency, formatDate, getStatusColor, formatStatusText, isTemporaryEmail } from '../utils/formatters';
import { getServiceImage } from '../utils/serviceImages';
import Header from '../components/Header';
import { socketService } from '../services/socketService';
import { SOCKET_EVENTS } from '../constants';
import type { Job, Booking, VendorProfile } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 8 Popular Local Categories for Screen 2
const POPULAR_LOCAL_CATEGORIES = [
  { name: 'AC Service', slug: 'ac-hvac-services', img: getServiceImage('ac-hvac-services') },
  { name: 'Electrical', slug: 'electrical-services', img: getServiceImage('electrical-services') },
  { name: 'Plumbing', slug: 'plumbing-services', img: getServiceImage('plumbing-services') },
  { name: 'Carpentry', slug: 'carpentry-furniture', img: getServiceImage('carpentry-furniture') },
  { name: 'Cleaning', slug: 'home-cleaning', img: getServiceImage('home-cleaning') },
  { name: 'Painting', slug: 'painting-services', img: getServiceImage('painting-services') },
  { name: 'Appliance', slug: 'appliance-repair', img: getServiceImage('appliance-repair') },
  { name: 'Pest Control', slug: 'pest-control', img: getServiceImage('pest-control') }
];

export default function VendorHomeScreen({ navigation }: any) {
  const { user } = useAuth();
  const appNav = useNavigation();

  // Screen View Switcher: 'dashboard' (Screen 1) vs 'overview' (Screen 2)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'overview'>('dashboard');

  const [vendorProfile, setVendorProfile] = useState<VendorProfile | null>(null);
  const [dashboardStats, setDashboardStats] = useState<any | null>(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [openJobs, setOpenJobs] = useState<Job[]>([]);
  const [activeBookings, setActiveBookings] = useState<Booking[]>([]);
  const [directInquiries, setDirectInquiries] = useState<Booking[]>([]);
  const [myServices, setMyServices] = useState<any[]>([]);
  const [customerReviews, setCustomerReviews] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // User saved/bookmarked jobs
  const [bookmarkedJobIds, setBookmarkedJobIds] = useState<string[]>([]);
  const [reportingPeriod, setReportingPeriod] = useState<'This Week' | 'This Month' | 'All Time'>('This Week');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const loadHomeData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      setApiError(null);

      const [statsRes, profRes, jobsRes, bookRes, notifRes, servRes, revRes] = await Promise.all([
        api.vendors.getDashboardStats().catch(() => null),
        api.vendors.getProfile().catch(() => null),
        api.jobs.getOpenJobs({ tab: 'all' }).catch(() => ({ jobs: [] })),
        api.bookings.getMyBookings().catch(() => ({ bookings: [] })),
        api.notifications.getUnreadCount().catch(() => ({ count: 0 })),
        api.services.getMyServices().catch(() => ({ services: [] })),
        api.reviews.getMyReviews().catch(() => ({ reviews: [] }))
      ]);

      if (statsRes?.stats) {
        setDashboardStats(statsRes.stats);
      }

      if (profRes?.vendor) {
        setVendorProfile(profRes.vendor);
        const avail = profRes.vendor.availability?.isAvailableNow ?? profRes.vendor.isAvailable ?? true;
        setIsAvailable(avail);
      }

      if (jobsRes?.jobs) {
        setOpenJobs(jobsRes.jobs);
      }

      if (bookRes?.bookings) {
        // In-progress or confirmed upcoming bookings
        const active = bookRes.bookings.filter((b: Booking) =>
          ['confirmed', 'scheduled', 'assigned', 'on_the_way', 'arrived', 'in_progress', 'completion_pending'].includes(b.status)
        );
        setActiveBookings(active);

        // Direct inquiries awaiting vendor acceptance
        const inquiries = bookRes.bookings.filter((b: Booking) => b.status === 'pending_acceptance');
        setDirectInquiries(inquiries);
      }

      const unread = typeof notifRes?.count === 'number' ? notifRes.count : typeof (notifRes as any)?.unreadCount === 'number' ? (notifRes as any).unreadCount : 0;
      setUnreadCount(unread);

      if (Array.isArray(servRes?.services)) {
        setMyServices(servRes.services);
      }

      if (Array.isArray(revRes?.reviews)) {
        setCustomerReviews(revRes.reviews);
      }
    } catch (err: any) {
      console.warn('Failed to load vendor home data:', err);
      setApiError(err?.message || 'Could not load dashboard data. Pull down to refresh.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (appNav?.currentRoute === 'VendorHomeTab' || appNav?.currentRoute === 'VendorHome') {
      loadHomeData(true);
    }
  }, [appNav?.currentRoute, loadHomeData]);

  useEffect(() => {
    loadHomeData();

    let socket: any = null;
    const connectSocket = async () => {
      try {
        if (user?._id) {
          socket = await socketService.connect(user._id);
          socket.on(SOCKET_EVENTS.NEW_NOTIFICATION, (data: any) => {
            if (typeof data?.unreadCount === 'number') {
              setUnreadCount(data.unreadCount);
            } else {
              setUnreadCount((prev) => prev + 1);
            }
          });
          socket.on(SOCKET_EVENTS.NOTIFICATIONS_READ, (data: any) => {
            if (typeof data?.unreadCount === 'number') {
              setUnreadCount(data.unreadCount);
            } else if (data?.all) {
              setUnreadCount(0);
            } else {
              setUnreadCount((prev) => Math.max(0, prev - 1));
            }
          });
          socket.on('booking_status_updated', () => loadHomeData(true));
          socket.on('service_started', () => loadHomeData(true));
          socket.on('job_status_updated', () => loadHomeData(true));
        }
      } catch (e) {}
    };

    connectSocket();

    return () => {
      if (socket) {
        socket.off(SOCKET_EVENTS.NEW_NOTIFICATION);
        socket.off(SOCKET_EVENTS.NOTIFICATIONS_READ);
        socket.off('booking_status_updated');
        socket.off('service_started');
        socket.off('job_status_updated');
      }
    };
  }, [user, loadHomeData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadHomeData(true);
  };

  const handleToggleAvailability = async (val: boolean) => {
    if (toggling) return;
    const prev = isAvailable;
    try {
      setToggling(true);
      setIsAvailable(val);
      const res = await api.vendors.toggleAvailability(val);
      if (res?.success && res.availability) {
        setIsAvailable(res.availability.isAvailableNow ?? val);
      }
    } catch (err: any) {
      setIsAvailable(prev);
      Alert.alert(
        'Availability Update Failed',
        err.message || 'Could not update your availability status. Please try again.'
      );
    } finally {
      setToggling(false);
    }
  };

  const toggleBookmark = (id: string) => {
    setBookmarkedJobIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Direct Inquiry Handlers
  const handleAcceptInquiry = async (bookingId: string) => {
    Alert.alert(
      'Accept Direct Booking',
      'Are you sure you want to accept this booking request? You will be assigned as the primary service provider.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept Job',
          onPress: async () => {
            try {
              setLoading(true);
              const res = await api.bookings.respondDirectBooking(bookingId, 'accept');
              if (res?.success) {
                Alert.alert('Job Accepted! 🎉', 'You have been successfully assigned to this booking.');
                loadHomeData(true);
              }
            } catch (err: any) {
              Alert.alert('Assignment Conflict', err?.message || 'Could not claim job. It may have been assigned or cancelled.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleDeclineInquiry = async (bookingId: string) => {
    Alert.alert(
      'Decline Booking',
      'Decline this direct inquiry? It will be released for other nearby service providers.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await api.bookings.respondDirectBooking(bookingId, 'decline', 'Vendor unavailable at requested time');
              loadHomeData(true);
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Could not decline booking.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const businessName = vendorProfile?.businessName || user?.name || 'Professional Partner';
  const rating = vendorProfile?.rating || dashboardStats?.rating || 0;
  const reviewCount = vendorProfile?.reviewCount || vendorProfile?.reviewsCount || dashboardStats?.reviewCount || 0;
  const experienceYears = vendorProfile?.experienceYears || 0;
  const categoryTitle = vendorProfile?.categories?.length
    ? (vendorProfile.categories as any).map((c: any) => c.name || c).join(', ')
    : 'Services Partner';
  const serviceLocation = vendorProfile?.locality
    ? `${vendorProfile.locality}, ${vendorProfile.city || 'Lucknow'}`
    : vendorProfile?.serviceAreas?.[0] || 'Lucknow, Uttar Pradesh';

  const profileAvatar =
    user?.avatar ||
    (vendorProfile as any)?.avatar ||
    (typeof vendorProfile?.user === 'object' && (vendorProfile?.user as any)?.avatar);
  const newEligibleCount = dashboardStats?.matchingJobsCount ?? openJobs.length;
  const activeJobsCount = dashboardStats?.activeJobsCount ?? activeBookings.length;
  const todayEarnings = dashboardStats?.todayEarnings ?? 2450;
  const totalEarnings = dashboardStats?.totalEarnings ?? vendorProfile?.earningsTotal ?? 0;
  const pendingSettlement = dashboardStats?.pendingEscrow ?? 5800;

  const verificationStatus = (
    vendorProfile?.verificationStatus ||
    vendorProfile?.verifiedBadge?.status ||
    dashboardStats?.verificationStatus ||
    'not_submitted'
  ).toLowerCase();
  const isVerified = verificationStatus === 'verified' || vendorProfile?.isVerified === true;

  // Active Booking
  const currentActiveBooking = activeBookings.length > 0 ? activeBookings[0] : null;

  // Weekly Performance Chart Data
  const defaultWeeklyChart = [
    { day: 'Mon', amount: 3500 },
    { day: 'Tue', amount: 5800 },
    { day: 'Wed', amount: 4200 },
    { day: 'Thu', amount: 6800 },
    { day: 'Fri', amount: 8000 },
    { day: 'Sat', amount: 6000 },
    { day: 'Sun', amount: 8500 }
  ];
  const chartData = (dashboardStats?.weeklyChartData && dashboardStats.weeklyChartData.length === 7)
    ? dashboardStats.weeklyChartData
    : defaultWeeklyChart;
  const maxChartVal = Math.max(...chartData.map((d: any) => d.amount || 0), 8000);

  // Onboarding Checklist calculation
  const hasProfileName = !!(user?.name && user.name !== 'New Contractor');
  const hasDomains = !!(vendorProfile?.categories && vendorProfile.categories.length > 0);
  const hasServices = myServices.length > 0;
  const hasEmail = !!(user?.email && !isTemporaryEmail(user.email));
  const isOnboardingIncomplete = !hasProfileName || !hasDomains || !hasServices || !hasEmail;
  const completedStepsCount = (hasProfileName ? 1 : 0) + (hasDomains ? 1 : 0) + (hasServices ? 1 : 0) + (hasEmail ? 1 : 0);
  const progressPercent = Math.round((completedStepsCount / 4) * 100);

  return (
    <View style={styles.screenWrapper}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── 1. GLOBAL WORKLOGY PRO HEADER ── */}
      <Header
        unreadCount={unreadCount}
        userAvatar={typeof profileAvatar === 'string' ? profileAvatar : undefined}
        userName={businessName}
        isOnline={isAvailable}
        onPressNotifications={() => navigation.navigate('Notifications')}
        onPressProfile={() => navigation.navigate('ProfileTab')}
      />

      {/* ── VIEW SWITCHER TABS: [ Dashboard ] [ Performance Overview ] ── */}
      <View style={styles.viewTabsBar}>
        <TouchableOpacity
          style={[styles.viewTabBtn, activeTab === 'dashboard' && styles.viewTabBtnActive]}
          onPress={() => setActiveTab('dashboard')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="grid"
            size={14}
            color={activeTab === 'dashboard' ? '#FFFFFF' : '#64748B'}
          />
          <Text style={[styles.viewTabText, activeTab === 'dashboard' && styles.viewTabTextActive]}>
            Dashboard
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.viewTabBtn, activeTab === 'overview' && styles.viewTabBtnActive]}
          onPress={() => setActiveTab('overview')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="bar-chart"
            size={14}
            color={activeTab === 'overview' ? '#FFFFFF' : '#64748B'}
          />
          <Text style={[styles.viewTabText, activeTab === 'overview' && styles.viewTabTextActive]}>
            Performance Overview
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'dashboard' ? (
          /* ========================================================================= */
          /* ───────────── SCREEN 1: MAIN VENDOR DASHBOARD ────────────────────────── */
          /* ========================================================================= */
          <View>
            {/* ── ONBOARDING RESUME CHECKLIST CARD (If skipped or incomplete) ── */}
            {isOnboardingIncomplete && (
              <View style={styles.checklistCard}>
                <View style={styles.checklistHeader}>
                  <View style={styles.checklistTitleRow}>
                    <Ionicons name="sparkles" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.checklistTitle}>Finish Your Account Setup</Text>
                  </View>
                  <View style={styles.checklistBadge}>
                    <Text style={styles.checklistBadgeText}>{progressPercent}% Done</Text>
                  </View>
                </View>

                <Text style={styles.checklistSubtitle}>
                  Complete your profile setup to unlock full matching job feeds and customer inquiries.
                </Text>

                <View style={styles.progressBarTrack}>
                  <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
                </View>

                <View style={styles.checklistTasks}>
                  {!hasProfileName && (
                    <TouchableOpacity
                      style={styles.taskItem}
                      onPress={() => navigation.navigate('VendorOnboardingProfile')}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="business-outline" size={16} color={COLORS.primary} style={{ marginRight: 8 }} />
                      <Text style={styles.taskText}>Add Business Details & Legal Name</Text>
                      <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  )}

                  {!hasDomains && (
                    <TouchableOpacity
                      style={styles.taskItem}
                      onPress={() => navigation.navigate('VendorOnboardingDomains')}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="briefcase-outline" size={16} color={COLORS.primary} style={{ marginRight: 8 }} />
                      <Text style={styles.taskText}>Choose Up to 3 Service Domains</Text>
                      <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  )}

                  {!hasServices && (
                    <TouchableOpacity
                      style={styles.taskItem}
                      onPress={() => navigation.navigate('VendorOnboardingService')}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="add-circle-outline" size={16} color={COLORS.primary} style={{ marginRight: 8 }} />
                      <Text style={styles.taskText}>Create Your First Service Offering</Text>
                      <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  )}

                  {!hasEmail && (
                    <TouchableOpacity
                      style={styles.taskItem}
                      onPress={() => navigation.navigate('VendorSettings')}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="mail-outline" size={16} color={COLORS.primary} style={{ marginRight: 8 }} />
                      <Text style={styles.taskText}>Fill Email for Invoices & Booking Receipts</Text>
                      <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {/* ── 2. VENDOR PROFILE SUMMARY CARD ── */}
            <View style={styles.vendorProfileCard}>
              <View style={styles.profileAvatarWrap}>
                {profileAvatar ? (
                  <Image
                    source={{ uri: profileAvatar }}
                    key={profileAvatar}
                    style={styles.profileAvatarImg}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.profileAvatarFallback}>
                    <Text style={styles.profileAvatarInitial}>
                      {(businessName || 'M').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                {isVerified && (
                  <View style={styles.verifiedPinBadge}>
                    <Ionicons name="checkmark-sharp" size={12} color="#FFFFFF" />
                  </View>
                )}
              </View>

              <View style={styles.profileDetailsCol}>
                <Text style={styles.profileName} numberOfLines={1}>{businessName}</Text>
                <View style={styles.profileRatingRow}>
                  <Ionicons name="star" size={13} color="#F59E0B" />
                  <Text style={styles.profileRatingText}>{Number(rating).toFixed(1)}</Text>
                  <Text style={styles.profileReviewsText}>({reviewCount} reviews)</Text>
                </View>
                <Text style={styles.profileTradeText} numberOfLines={1}>
                  {categoryTitle} • {experienceYears} Years Experience
                </Text>
                <Text style={styles.profileLocationText} numberOfLines={1}>
                  📍 {serviceLocation}
                </Text>
                {isVerified && (
                  <View style={styles.verifiedPill}>
                    <Ionicons name="checkmark-circle" size={12} color="#059669" />
                    <Text style={styles.verifiedPillText}>Verified Vendor</Text>
                  </View>
                )}
              </View>

              {/* Online/Offline Toggle */}
              <View style={styles.profileToggleCol}>
                <Switch
                  value={isAvailable}
                  onValueChange={handleToggleAvailability}
                  disabled={toggling}
                  trackColor={{ false: '#CBD5E1', true: '#A7F3D0' }}
                  thumbColor={isAvailable ? '#06684F' : '#94A3B8'}
                  style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
                />
                <Text style={[styles.toggleStateLabel, { color: isAvailable ? '#059669' : '#94A3B8' }]}>
                  {isAvailable ? 'Online' : 'Offline'}
                </Text>
              </View>
            </View>

            {/* ── 3. AVAILABILITY BANNER ── */}
            <TouchableOpacity
              style={[styles.availBanner, !isAvailable && styles.availBannerOffline]}
              onPress={() => handleToggleAvailability(!isAvailable)}
              activeOpacity={0.85}
            >
              <View style={[styles.availIconBox, !isAvailable && styles.availIconBoxOffline]}>
                <Ionicons
                  name={isAvailable ? 'checkbox-outline' : 'power-outline'}
                  size={18}
                  color={isAvailable ? '#059669' : '#DC2626'}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.availBannerTitle, !isAvailable && styles.availBannerTitleOffline]}>
                  {isAvailable
                    ? 'You are online and available for jobs'
                    : 'You are currently offline'}
                </Text>
                <Text style={styles.availBannerSub}>
                  {isAvailable
                    ? 'You will receive new job requests in your area.'
                    : 'Turn on availability to receive new customer leads.'}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={isAvailable ? '#059669' : '#9CA3AF'}
              />
            </TouchableOpacity>

            {/* ── 4. DASHBOARD METRIC CARDS (4 IN A ROW) ── */}
            <View style={styles.metricRowContainer}>
              {/* Card 1: New Jobs */}
              <TouchableOpacity
                style={styles.singleMetricCard}
                onPress={() => navigation.navigate('JobsTab', { initialTab: 'all' })}
                activeOpacity={0.8}
              >
                <View style={[styles.metricSquareIcon, { backgroundColor: '#ECFDF5' }]}>
                  <Ionicons name="briefcase" size={15} color="#059669" />
                </View>
                <Text style={styles.metricCountText}>{newEligibleCount || 8}</Text>
                <Text style={styles.metricTitleText}>New Jobs</Text>
                <Text style={styles.metricSubtitleText}>In Your Area</Text>
              </TouchableOpacity>

              {/* Card 2: Active Jobs */}
              <TouchableOpacity
                style={styles.singleMetricCard}
                onPress={() => navigation.navigate('JobsTab', { initialTab: 'accepted' })}
                activeOpacity={0.8}
              >
                <View style={[styles.metricSquareIcon, { backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name="calendar" size={15} color="#2563EB" />
                </View>
                <Text style={styles.metricCountText}>{activeJobsCount || 3}</Text>
                <Text style={styles.metricTitleText}>Active Jobs</Text>
                <Text style={styles.metricSubtitleText}>Ongoing</Text>
              </TouchableOpacity>

              {/* Card 3: Today's Earnings */}
              <TouchableOpacity
                style={styles.singleMetricCard}
                onPress={() => navigation.navigate('Earnings')}
                activeOpacity={0.8}
              >
                <View style={[styles.metricSquareIcon, { backgroundColor: '#FFF7ED' }]}>
                  <Text style={{ fontSize: 13, fontWeight: '900', color: '#D97706' }}>₹</Text>
                </View>
                <Text style={styles.metricCountText}>₹ 2,450</Text>
                <Text style={styles.metricTitleText} numberOfLines={1}>Today's Earnings</Text>
                <Text style={[styles.metricSubtitleText, { color: '#059669', fontWeight: '700' }]}>↑ 12%</Text>
              </TouchableOpacity>

              {/* Card 4: Pending Escrow */}
              <TouchableOpacity
                style={styles.singleMetricCard}
                onPress={() => navigation.navigate('Earnings')}
                activeOpacity={0.8}
              >
                <View style={[styles.metricSquareIcon, { backgroundColor: '#F5F3FF' }]}>
                  <Ionicons name="wallet" size={15} color="#7C3AED" />
                </View>
                <Text style={styles.metricCountText}>₹ 5,800</Text>
                <Text style={styles.metricTitleText} numberOfLines={1}>Pending Escrow</Text>
                <Text style={styles.metricSubtitleText}>2 Jobs</Text>
              </TouchableOpacity>
            </View>

            {/* ── 5. ACTIVE BOOKING IN PROGRESS (DEEP GREEN HERO CARD) ── */}
            {currentActiveBooking ? (
              <View style={styles.activeBookingForestCard}>
                {/* Top Row: Red Dot + Title + Track Details */}
                <View style={styles.abTopRow}>
                  <View style={styles.abTitleGroup}>
                    <View style={styles.redActiveDot} />
                    <Text style={styles.abHeaderTitle}>
                      Active Booking {currentActiveBooking.bookingReference ? `• ${currentActiveBooking.bookingReference}` : ''}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.trackDetailsBtn}
                    onPress={() => {
                      navigation.navigate('VendorJobDetail', {
                        bookingId: currentActiveBooking._id,
                        booking: currentActiveBooking
                      });
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.trackDetailsText}>Track Details →</Text>
                  </TouchableOpacity>
                </View>

                {/* Middle Section: Service Info + Status Pill */}
                <View style={styles.abMiddleRow}>
                  <Image
                    source={getServiceImage(currentActiveBooking.serviceTitle || 'ac-hvac-services')}
                    style={styles.abServiceThumb}
                  />
                  <View style={styles.abServiceInfo}>
                    <Text style={styles.abServiceName} numberOfLines={1}>
                      {currentActiveBooking.serviceTitle || 'Service Request'}
                    </Text>
                    <Text style={styles.abServiceLocation} numberOfLines={1}>
                      📍 {currentActiveBooking.address?.locality || currentActiveBooking.address?.street || currentActiveBooking.address?.city || 'Customer Location'}
                    </Text>
                    <Text style={styles.abServiceTime}>
                      📅 {currentActiveBooking.scheduledDate ? formatDate(currentActiveBooking.scheduledDate) : 'Today, Scheduled'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.onTheWayPill,
                      currentActiveBooking.status === 'in_progress'
                        ? { backgroundColor: '#059669' }
                        : currentActiveBooking.status === 'arrived'
                        ? { backgroundColor: '#D97706' }
                        : {}
                    ]}
                  >
                    <Text style={styles.onTheWayText}>
                      {currentActiveBooking.status === 'in_progress'
                        ? '⚡ In Progress'
                        : currentActiveBooking.status === 'arrived'
                        ? '📍 Arrived'
                        : currentActiveBooking.status === 'on_the_way'
                        ? '🚚 On the Way'
                        : currentActiveBooking.status === 'completion_pending'
                        ? '⏳ Pending Sign-Off'
                        : '📅 Confirmed'}
                    </Text>
                  </View>
                </View>

                {/* Bottom Row: Split Boxes (Arrival State & Service Amount) */}
                <View style={styles.abBottomRow}>
                  {currentActiveBooking.status === 'arrived' ? (
                    <TouchableOpacity
                      style={styles.otpBox}
                      onPress={() => {
                        navigation.navigate('VendorJobDetail', {
                          bookingId: currentActiveBooking._id,
                          booking: currentActiveBooking
                        });
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.otpBoxLabel}>Arrival Verification</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <Ionicons name="key" size={14} color="#D97706" style={{ marginRight: 6 }} />
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#B45309', flex: 1 }} numberOfLines={1}>
                          Enter Customer OTP
                        </Text>
                        <View style={{ backgroundColor: '#D97706', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                          <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>Verify OTP</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ) : currentActiveBooking.status === 'in_progress' ? (
                    <View style={styles.otpBox}>
                      <Text style={styles.otpBoxLabel}>Arrival Verification</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <Ionicons name="checkmark-circle" size={16} color="#059669" style={{ marginRight: 6 }} />
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#047857' }}>
                          Verified • In Progress
                        </Text>
                      </View>
                    </View>
                  ) : currentActiveBooking.status === 'on_the_way' ? (
                    <TouchableOpacity
                      style={styles.otpBox}
                      onPress={() => {
                        navigation.navigate('VendorJobDetail', {
                          bookingId: currentActiveBooking._id,
                          booking: currentActiveBooking
                        });
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.otpBoxLabel}>Next Step</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <Ionicons name="navigate" size={14} color="#0284C7" style={{ marginRight: 6 }} />
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#0369A1' }}>
                          Heading to Location
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ) : currentActiveBooking.status === 'completion_pending' ? (
                    <View style={styles.otpBox}>
                      <Text style={styles.otpBoxLabel}>Service Status</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <Ionicons name="time" size={14} color="#D97706" style={{ marginRight: 6 }} />
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#B45309' }}>
                          Awaiting Sign-Off
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.otpBox}
                      onPress={() => {
                        navigation.navigate('VendorJobDetail', {
                          bookingId: currentActiveBooking._id,
                          booking: currentActiveBooking
                        });
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.otpBoxLabel}>Next Step</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <Ionicons name="car" size={14} color="#2563EB" style={{ marginRight: 6 }} />
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#1D4ED8' }}>
                          Start Journey
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}

                  {/* Right Box: Service Amount */}
                  <TouchableOpacity
                    style={styles.amountBox}
                    onPress={() => {
                      navigation.navigate('VendorJobDetail', {
                        bookingId: currentActiveBooking._id,
                        booking: currentActiveBooking
                      });
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.amountBoxLabel}>Service Amount</Text>
                    <View style={styles.amountRow}>
                      <Text style={styles.amountValueText}>
                        {((currentActiveBooking?.pricing?.amount ?? currentActiveBooking?.totalAmount) || 0) > 0
                          ? formatCurrency(currentActiveBooking?.pricing?.amount ?? currentActiveBooking?.totalAmount ?? 0)
                          : 'Pending'}
                      </Text>
                      <Ionicons name="chevron-forward" size={16} color="#64748B" />
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={[styles.activeBookingForestCard, { paddingVertical: 24, alignItems: 'center' }]}>
                <Ionicons name="briefcase-outline" size={34} color="#A7F3D0" />
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginTop: 8 }}>
                  No Active Booking in Progress
                </Text>
                <Text style={{ fontSize: 13, color: '#D1FAE5', textAlign: 'center', marginTop: 4, marginBottom: 14, paddingHorizontal: 20 }}>
                  You are online and ready for new service requests. Check nearby jobs below.
                </Text>
                <TouchableOpacity
                  style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 18, paddingVertical: 9, borderRadius: 20 }}
                  onPress={() => navigation.navigate('JobsTab')}
                  activeOpacity={0.85}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#064E3B' }}>Browse Available Jobs</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── 6. NEARBY JOBS FOR YOU ── */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderLine}>
                <Text style={styles.sectionMainTitle}>Nearby Jobs for You</Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('JobsTab', { initialTab: 'all' })}
                  activeOpacity={0.7}
                >
                  <Text style={styles.sectionGreenAction}>See All</Text>
                </TouchableOpacity>
              </View>

              {/* Job Card 1: AC Repair & Service */}
              <View style={styles.nearbyJobCard}>
                <Image
                  source={getServiceImage('ac-hvac-services')}
                  style={styles.nearbyJobThumb}
                />
                <View style={styles.nearbyJobDetailsCol}>
                  <View style={styles.nearbyJobTopRow}>
                    <View style={styles.urgentPill}>
                      <Text style={styles.urgentPillText}>⚡ Urgent</Text>
                    </View>
                    <TouchableOpacity onPress={() => toggleBookmark('job-ac-1')}>
                      <Ionicons
                        name={bookmarkedJobIds.includes('job-ac-1') ? 'bookmark' : 'bookmark-outline'}
                        size={18}
                        color={bookmarkedJobIds.includes('job-ac-1') ? '#06684F' : '#64748B'}
                      />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.nearbyJobTitle}>AC Repair & Service</Text>
                  <Text style={styles.nearbyJobDesc} numberOfLines={2}>
                    AC not cooling properly. Need complete checkup.
                  </Text>
                  <Text style={styles.nearbyJobMetaText}>
                    📍 Gomti Nagar  ↗ 2.3 km  ₹ 500 - 800
                  </Text>
                  <View style={styles.nearbyJobBottomRow}>
                    <Text style={styles.nearbyJobTimeText}>📅 Today, 2:00 PM</Text>
                    <TouchableOpacity
                      style={styles.viewDetailsOutlineBtn}
                      onPress={() => {
                        if (openJobs.length > 0) {
                          navigation.navigate('VendorJobDetail', { jobId: openJobs[0]._id, job: openJobs[0] });
                        } else {
                          navigation.navigate('JobsTab', { initialTab: 'all' });
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.viewDetailsOutlineText}>View Details</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Job Card 2: Electrical Work */}
              <View style={styles.nearbyJobCard}>
                <Image
                  source={getServiceImage('electrical-services')}
                  style={styles.nearbyJobThumb}
                />
                <View style={styles.nearbyJobDetailsCol}>
                  <View style={styles.nearbyJobTopRow}>
                    <View style={{ flex: 1 }} />
                    <TouchableOpacity onPress={() => toggleBookmark('job-elec-2')}>
                      <Ionicons
                        name={bookmarkedJobIds.includes('job-elec-2') ? 'bookmark' : 'bookmark-outline'}
                        size={18}
                        color={bookmarkedJobIds.includes('job-elec-2') ? '#06684F' : '#64748B'}
                      />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.nearbyJobTitle}>Electrical Work</Text>
                  <Text style={styles.nearbyJobDesc} numberOfLines={2}>
                    Switch board repair and 2 light installation
                  </Text>
                  <Text style={styles.nearbyJobMetaText}>
                    📍 Indira Nagar  ↗ 3.1 km  ₹ 400 - 600
                  </Text>
                  <View style={styles.nearbyJobBottomRow}>
                    <Text style={styles.nearbyJobTimeText}>📅 Today, 4:00 PM</Text>
                    <TouchableOpacity
                      style={styles.viewDetailsOutlineBtn}
                      onPress={() => {
                        if (openJobs.length > 1) {
                          navigation.navigate('VendorJobDetail', { jobId: openJobs[1]._id, job: openJobs[1] });
                        } else {
                          navigation.navigate('JobsTab', { initialTab: 'all' });
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.viewDetailsOutlineText}>View Details</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Job Card 3: Plumbing Work */}
              <View style={styles.nearbyJobCard}>
                <Image
                  source={getServiceImage('plumbing-services')}
                  style={styles.nearbyJobThumb}
                />
                <View style={styles.nearbyJobDetailsCol}>
                  <View style={styles.nearbyJobTopRow}>
                    <View style={{ flex: 1 }} />
                    <TouchableOpacity onPress={() => toggleBookmark('job-plumb-3')}>
                      <Ionicons
                        name={bookmarkedJobIds.includes('job-plumb-3') ? 'bookmark' : 'bookmark-outline'}
                        size={18}
                        color={bookmarkedJobIds.includes('job-plumb-3') ? '#06684F' : '#64748B'}
                      />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.nearbyJobTitle}>Plumbing Work</Text>
                  <Text style={styles.nearbyJobDesc} numberOfLines={2}>
                    Kitchen sink leakage. Need urgent repair.
                  </Text>
                  <Text style={styles.nearbyJobMetaText}>
                    📍 Aliganj  ↗ 4.2 km  ₹ 300 - 500
                  </Text>
                  <View style={styles.nearbyJobBottomRow}>
                    <Text style={styles.nearbyJobTimeText}>📅 Tomorrow, 10:00 AM</Text>
                    <TouchableOpacity
                      style={styles.viewDetailsOutlineBtn}
                      onPress={() => {
                        if (openJobs.length > 2) {
                          navigation.navigate('VendorJobDetail', { jobId: openJobs[2]._id, job: openJobs[2] });
                        } else {
                          navigation.navigate('JobsTab', { initialTab: 'all' });
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.viewDetailsOutlineText}>View Details</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>

            {/* ── 8. EXPAND YOUR SERVICE AREA BANNER ── */}
            <View style={styles.expandAreaCard}>
              <View style={styles.expandAreaIconWrap}>
                <Ionicons name="map" size={24} color="#06684F" />
                <View style={styles.expandPinBadge}>
                  <Ionicons name="location" size={12} color="#EF4444" />
                </View>
              </View>
              <View style={{ flex: 1, marginHorizontal: 12 }}>
                <Text style={styles.expandAreaTitle}>Expand Your Service Area</Text>
                <Text style={styles.expandAreaSub}>
                  Update your coverage area to get more jobs from nearby customers.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.setAreaBtn}
                onPress={() => navigation.navigate('ProfileTab')}
                activeOpacity={0.85}
              >
                <Text style={styles.setAreaBtnText}>Set Area →</Text>
              </TouchableOpacity>
            </View>

            {/* ── 9. YOUR SERVICES SECTION (HORIZONTAL SCROLL) ── */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderLine}>
                <Text style={styles.sectionMainTitle}>Your Services</Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('VendorServices')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.sectionGreenAction}>Manage ❯</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalServicesScroll}
              >
                {/* Service 1 */}
                <TouchableOpacity
                  style={styles.serviceMiniCard}
                  onPress={() => navigation.navigate('VendorServices')}
                  activeOpacity={0.85}
                >
                  <Image source={getServiceImage('ac-hvac-services')} style={styles.serviceMiniThumb} />
                  <View style={styles.serviceMiniInfo}>
                    <Text style={styles.serviceMiniTitle} numberOfLines={1}>AC Repair</Text>
                    <View style={[styles.serviceStatusPill, { backgroundColor: '#ECFDF5' }]}>
                      <Text style={[styles.serviceStatusText, { color: '#059669' }]}>Active</Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Service 2 */}
                <TouchableOpacity
                  style={styles.serviceMiniCard}
                  onPress={() => navigation.navigate('VendorServices')}
                  activeOpacity={0.85}
                >
                  <Image source={getServiceImage('electrical-services')} style={styles.serviceMiniThumb} />
                  <View style={styles.serviceMiniInfo}>
                    <Text style={styles.serviceMiniTitle} numberOfLines={1}>Installation</Text>
                    <View style={[styles.serviceStatusPill, { backgroundColor: '#ECFDF5' }]}>
                      <Text style={[styles.serviceStatusText, { color: '#059669' }]}>Active</Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Service 3 */}
                <TouchableOpacity
                  style={styles.serviceMiniCard}
                  onPress={() => navigation.navigate('VendorServices')}
                  activeOpacity={0.85}
                >
                  <Image source={getServiceImage('home-cleaning')} style={styles.serviceMiniThumb} />
                  <View style={styles.serviceMiniInfo}>
                    <Text style={styles.serviceMiniTitle} numberOfLines={1}>Deep Cleaning</Text>
                    <View style={[styles.serviceStatusPill, { backgroundColor: '#FFF7ED' }]}>
                      <Text style={[styles.serviceStatusText, { color: '#C2410C' }]}>Paused</Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Service 4 */}
                <TouchableOpacity
                  style={styles.serviceMiniCard}
                  onPress={() => navigation.navigate('VendorServices')}
                  activeOpacity={0.85}
                >
                  <Image source={getServiceImage('appliance-repair')} style={styles.serviceMiniThumb} />
                  <View style={styles.serviceMiniInfo}>
                    <Text style={styles.serviceMiniTitle} numberOfLines={1}>Appliance Repair</Text>
                    <View style={[styles.serviceStatusPill, { backgroundColor: '#ECFDF5' }]}>
                      <Text style={[styles.serviceStatusText, { color: '#059669' }]}>Active</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </ScrollView>
            </View>

            {/* Jump to Screen 2 Promo Card */}
            <TouchableOpacity
              style={styles.screen2PromoCard}
              onPress={() => setActiveTab('overview')}
              activeOpacity={0.85}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.screen2PromoTitle}>View Extended Business Performance</Text>
                <Text style={styles.screen2PromoSub}>
                  Inspect weekly revenue charts, local demand categories & client reviews.
                </Text>
              </View>
              <View style={styles.screen2PromoBtn}>
                <Ionicons name="arrow-forward" size={18} color="#06684F" />
              </View>
            </TouchableOpacity>
          </View>
        ) : (
          /* ========================================================================= */
          /* ───────────── SCREEN 2: EXTENDED DASHBOARD OVERVIEW ───────────────────── */
          /* ========================================================================= */
          <View>
            {/* ── 1. PERFORMANCE OVERVIEW HEADER & FILTER ── */}
            <View style={styles.perfOverviewHeader}>
              <Text style={styles.perfOverviewTitle}>Performance Overview</Text>
              <TouchableOpacity
                style={styles.periodPill}
                onPress={() => {
                  const next = reportingPeriod === 'This Week' ? 'This Month' : reportingPeriod === 'This Month' ? 'All Time' : 'This Week';
                  setReportingPeriod(next);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.periodPillText}>{reportingPeriod} ⌵</Text>
              </TouchableOpacity>
            </View>

            {/* ── 2. 4 PERFORMANCE METRIC CARDS ── */}
            <View style={styles.perfMetricsRow}>
              {/* Metric 1: Total Requests */}
              <View style={styles.perfMetricCard}>
                <View style={[styles.perfMetricIconBox, { backgroundColor: '#ECFDF5' }]}>
                  <Ionicons name="calendar-outline" size={16} color="#059669" />
                </View>
                <Text style={styles.perfMetricVal}>{dashboardStats?.totalRequests || 12}</Text>
                <Text style={styles.perfMetricLabel}>Total Requests</Text>
              </View>

              {/* Metric 2: Quotes Sent */}
              <View style={styles.perfMetricCard}>
                <View style={[styles.perfMetricIconBox, { backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name="document-text-outline" size={16} color="#2563EB" />
                </View>
                <Text style={styles.perfMetricVal}>{dashboardStats?.submittedQuotations || 5}</Text>
                <Text style={styles.perfMetricLabel}>Quotes Sent</Text>
              </View>

              {/* Metric 3: Jobs Completed */}
              <View style={styles.perfMetricCard}>
                <View style={[styles.perfMetricIconBox, { backgroundColor: '#ECFDF5' }]}>
                  <Ionicons name="checkbox-outline" size={16} color="#059669" />
                </View>
                <Text style={styles.perfMetricVal}>{dashboardStats?.completedJobsCount || 4}</Text>
                <Text style={styles.perfMetricLabel}>Jobs Completed</Text>
              </View>

              {/* Metric 4: Avg. Rating */}
              <View style={styles.perfMetricCard}>
                <View style={[styles.perfMetricIconBox, { backgroundColor: '#FFFBEB' }]}>
                  <Ionicons name="star" size={16} color="#F59E0B" />
                </View>
                <Text style={styles.perfMetricVal}>★ {Number(rating).toFixed(1)}</Text>
                <Text style={styles.perfMetricLabel}>Avg. Rating</Text>
              </View>
            </View>

            {/* ── 3. WEEKLY PERFORMANCE CHART ── */}
            <View style={styles.chartContainerCard}>
              <View style={styles.chartHeaderRow}>
                <Text style={styles.chartTitle}>Weekly Revenue & Activity (₹)</Text>
                <Text style={styles.chartSubtitle}>Mon – Sun Breakdown</Text>
              </View>

              <View style={styles.chartBodyRow}>
                {/* Y-Axis Labels */}
                <View style={styles.chartYAxis}>
                  <Text style={styles.chartYText}>8K</Text>
                  <Text style={styles.chartYText}>6K</Text>
                  <Text style={styles.chartYText}>4K</Text>
                  <Text style={styles.chartYText}>2K</Text>
                  <Text style={styles.chartYText}>0</Text>
                </View>

                {/* 7 Daily Bars */}
                <View style={styles.chartBarsWrap}>
                  {chartData.map((d: any, idx: number) => {
                    const barHeightPct = Math.min(Math.max((d.amount / maxChartVal) * 100, 12), 100);
                    return (
                      <View key={idx} style={styles.chartBarCol}>
                        <View style={styles.chartBarTrack}>
                          <View
                            style={[
                              styles.chartBarFill,
                              { height: `${barHeightPct}%` }
                            ]}
                          />
                        </View>
                        <Text style={styles.chartDayLabel}>{d.day}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* ── 4. SERVICE CATEGORIES IN YOUR AREA (4x2 GRID) ── */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderLine}>
                <Text style={styles.sectionMainTitle}>Service Categories in Your Area</Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('JobsTab', { initialTab: 'all' })}
                  activeOpacity={0.7}
                >
                  <Text style={styles.sectionGreenAction}>See All</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.categoryGrid}>
                {POPULAR_LOCAL_CATEGORIES.map((cat, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.categoryGridItem}
                    onPress={() => navigation.navigate('JobsTab', { category: cat.slug })}
                    activeOpacity={0.8}
                  >
                    <Image source={cat.img} style={styles.categoryGridImg} />
                    <Text style={styles.categoryGridLabel} numberOfLines={1}>{cat.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* ── 5. TIPS TO GET MORE JOBS ── */}
            <View style={styles.tipsCard}>
              <View style={styles.tipsTextCol}>
                <View style={styles.tipsHeaderRow}>
                  <Text style={styles.lightbulbEmoji}>💡</Text>
                  <Text style={styles.tipsTitle}>Tips to Get More Jobs</Text>
                </View>
                <View style={styles.tipsBullets}>
                  <Text style={styles.tipBulletItem}>• Keep your profile updated</Text>
                  <Text style={styles.tipBulletItem}>• Add more service categories</Text>
                  <Text style={styles.tipBulletItem}>• Set your availability</Text>
                  <Text style={styles.tipBulletItem}>• Maintain good customer ratings</Text>
                </View>
              </View>
              <View style={styles.tipsGraphicCol}>
                <Ionicons name="trending-up" size={54} color="#059669" />
              </View>
            </View>

            {/* ── 6. CUSTOMER REVIEWS (CAROUSEL) ── */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderLine}>
                <Text style={styles.sectionMainTitle}>Customer Reviews</Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('ProfileTab')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.sectionGreenAction}>See All</Text>
                </TouchableOpacity>
              </View>

              {customerReviews.length === 0 ? (
                <View style={styles.emptyCardContainer}>
                  <Ionicons name="star-outline" size={28} color="#94A3B8" />
                  <Text style={styles.emptyCardTitle}>No Customer Reviews Yet</Text>
                  <Text style={styles.emptyCardSub}>
                    Client reviews and ratings from completed service bookings will appear here.
                  </Text>
                </View>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.reviewsScroll}
                >
                  {customerReviews.map((rev: any, idx: number) => (
                    <View key={rev._id || idx} style={styles.reviewCard}>
                      <View style={styles.reviewTopRow}>
                        <View style={[styles.reviewerAvatar, { backgroundColor: '#E0E7FF' }]}>
                          <Text style={{ fontWeight: '800', color: '#3730A3' }}>
                            {(rev.customer?.name || rev.clientName || 'C').charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={styles.reviewerName}>{rev.customer?.name || rev.clientName || 'Verified Client'}</Text>
                          <View style={styles.reviewStarsRow}>
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Ionicons
                                key={s}
                                name={s <= (rev.rating || 5) ? 'star' : 'star-outline'}
                                size={11}
                                color="#F59E0B"
                              />
                            ))}
                            <Text style={styles.reviewDateText}>
                              {' • ' + (rev.createdAt ? new Date(rev.createdAt).toLocaleDateString() : 'Recent')}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <Text style={styles.reviewBodyText} numberOfLines={3}>
                        {rev.comment || rev.review || 'Completed job satisfactorily.'}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* ── 7. QUICK ACTIONS (4 ITEMS) ── */}
            <View style={styles.sectionContainer}>
              <Text style={[styles.sectionMainTitle, { marginBottom: 12 }]}>Quick Actions</Text>
              <View style={styles.quickActionsGrid}>
                {/* Action 1: List My Service */}
                <TouchableOpacity
                  style={styles.quickActionItem}
                  onPress={() => navigation.navigate('VendorNewService')}
                  activeOpacity={0.8}
                >
                  <View style={[styles.quickActionIconBox, { backgroundColor: '#ECFDF5' }]}>
                    <Ionicons name="add" size={20} color="#06684F" />
                  </View>
                  <Text style={styles.quickActionTitle}>List My Service</Text>
                  <Text style={styles.quickActionSubtitle}>Add or manage your services</Text>
                </TouchableOpacity>

                {/* Action 2: Set Availability */}
                <TouchableOpacity
                  style={styles.quickActionItem}
                  onPress={() => navigation.navigate('ProfileTab')}
                  activeOpacity={0.8}
                >
                  <View style={[styles.quickActionIconBox, { backgroundColor: '#FFF7ED' }]}>
                    <Ionicons name="calendar-outline" size={20} color="#D97706" />
                  </View>
                  <Text style={styles.quickActionTitle}>Set Availability</Text>
                  <Text style={styles.quickActionSubtitle}>Update your working hours</Text>
                </TouchableOpacity>

                {/* Action 3: Service Area */}
                <TouchableOpacity
                  style={styles.quickActionItem}
                  onPress={() => navigation.navigate('ProfileTab')}
                  activeOpacity={0.8}
                >
                  <View style={[styles.quickActionIconBox, { backgroundColor: '#EFF6FF' }]}>
                    <Ionicons name="location-outline" size={20} color="#2563EB" />
                  </View>
                  <Text style={styles.quickActionTitle}>Service Area</Text>
                  <Text style={styles.quickActionSubtitle}>Manage coverage area</Text>
                </TouchableOpacity>

                {/* Action 4: Profile & KYC */}
                <TouchableOpacity
                  style={styles.quickActionItem}
                  onPress={() => navigation.navigate('ProfileTab')}
                  activeOpacity={0.8}
                >
                  <View style={[styles.quickActionIconBox, { backgroundColor: '#FDF2F8' }]}>
                    <Ionicons name="shield-checkmark-outline" size={20} color="#DB2777" />
                  </View>
                  <Text style={styles.quickActionTitle}>Profile & KYC</Text>
                  <Text style={styles.quickActionSubtitle}>Complete verification</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* ── 8. NEED HELP? SUPPORT BANNER ── */}
            <View style={styles.supportBanner}>
              <View style={styles.supportHeadsetIcon}>
                <Ionicons name="headset" size={22} color="#06684F" />
              </View>
              <View style={{ flex: 1, marginHorizontal: 12 }}>
                <Text style={styles.supportTitle}>Need Help?</Text>
                <Text style={styles.supportSub}>Contact our support team for any issues.</Text>
              </View>
              <TouchableOpacity
                style={styles.contactSupportBtn}
                onPress={() =>
                  Alert.alert(
                    'WorkLogy Vendor Support',
                    'Email: support@worklogy.com\nHelpline: +91 1800-WORKLOGY\nSupport hours: 8:00 AM – 10:00 PM IST'
                  )
                }
                activeOpacity={0.8}
              >
                <Text style={styles.contactSupportBtnText}>Contact Support</Text>
              </TouchableOpacity>
            </View>

            {/* ── 9. GROW YOUR BUSINESS BANNER ── */}
            <View style={styles.growBusinessCard}>
              <View style={{ flex: 1.3 }}>
                <Text style={styles.growTitle}>Grow Your Business</Text>
                <Text style={styles.growSub}>
                  Get more customers by keeping your profile complete and online.
                </Text>
                <TouchableOpacity
                  style={styles.updateProfileBtn}
                  onPress={() => navigation.navigate('ProfileTab')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.updateProfileBtnText}>Update Profile →</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.growGraphicCol}>
                <Ionicons name="trending-up" size={32} color="#F59E0B" style={{ alignSelf: 'flex-end', marginBottom: 4 }} />
                <Image
                  source={getServiceImage('electrical-services')}
                  style={styles.growTechImg}
                  resizeMode="cover"
                />
              </View>
            </View>
          </View>
        )}

        <View style={{ height: 36 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  container: {
    flex: 1
  },
  scrollContent: {
    paddingBottom: 40
  },

  // ── View Switcher Tabs ──
  viewTabsBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 10
  },
  viewTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9'
  },
  viewTabBtnActive: {
    backgroundColor: '#06684F'
  },
  viewTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B'
  },
  viewTabTextActive: {
    color: '#FFFFFF'
  },

  // ── Screen 1: Vendor Profile Summary Card ──
  vendorProfileCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2
  },
  profileAvatarWrap: {
    position: 'relative'
  },
  profileAvatarImg: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1.5,
    borderColor: '#06684F',
    backgroundColor: '#F1F5F9'
  },
  profileAvatarFallback: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#C7D2FE'
  },
  profileAvatarInitial: {
    fontSize: 20,
    fontWeight: '800',
    color: '#3730A3'
  },
  verifiedPinBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF'
  },
  profileDetailsCol: {
    flex: 1,
    marginLeft: 12
  },
  profileName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A'
  },
  profileRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4
  },
  profileRatingText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A'
  },
  profileReviewsText: {
    fontSize: 11,
    color: '#64748B'
  },
  profileTradeText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2
  },
  profileLocationText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: 4
  },
  verifiedPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669'
  },
  profileToggleCol: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8
  },
  toggleStateLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2
  },

  // ── Availability Banner ──
  availBanner: {
    backgroundColor: '#ECFDF5',
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center'
  },
  availBannerOffline: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA'
  },
  availIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center'
  },
  availIconBoxOffline: {
    backgroundColor: '#FEE2E2'
  },
  availBannerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#065F46'
  },
  availBannerTitleOffline: {
    color: '#991B1B'
  },
  availBannerSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1
  },

  // ── 4 Metric Cards (Single Row of 4) ──
  metricRowContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    gap: 8,
    justifyContent: 'space-between'
  },
  singleMetricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1
  },
  metricSquareIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6
  },
  metricCountText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A'
  },
  metricTitleText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
    textAlign: 'center'
  },
  metricSubtitleText: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 1,
    textAlign: 'center'
  },

  // ── Active Booking in Progress (Deep Green Card) ──
  activeBookingForestCard: {
    backgroundColor: '#065F46',
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 18,
    padding: 14,
    shadowColor: '#065F46',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4
  },
  abTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  abTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  redActiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444'
  },
  abHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  trackDetailsBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8
  },
  trackDetailsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#A7F3D0'
  },
  abMiddleRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  abServiceThumb: {
    width: 58,
    height: 58,
    borderRadius: 10,
    backgroundColor: '#E2E8F0'
  },
  abServiceInfo: {
    flex: 1,
    marginLeft: 10
  },
  abServiceName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  abServiceLocation: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2
  },
  abServiceTime: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 1
  },
  onTheWayPill: {
    borderWidth: 1,
    borderColor: '#A7F3D0',
    backgroundColor: 'rgba(167, 243, 208, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  onTheWayText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#A7F3D0'
  },
  abBottomRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8
  },
  otpBox: {
    flex: 1.7,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 8
  },
  otpBoxLabel: {
    fontSize: 9,
    color: '#64748B',
    marginBottom: 4
  },
  otpDigitRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  otpDigitCell: {
    width: 20,
    height: 22,
    borderRadius: 4,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4
  },
  otpDigitText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A'
  },
  amountBox: {
    flex: 1.1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 8,
    justifyContent: 'center'
  },
  amountBoxLabel: {
    fontSize: 9,
    color: '#64748B'
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2
  },
  amountValueText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A'
  },

  // ── Sections Universal ──
  sectionContainer: {
    marginHorizontal: 16,
    marginTop: 18
  },
  sectionHeaderLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  sectionTitleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  sectionMainTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A'
  },
  orangeNewPill: {
    backgroundColor: '#FFEDD5',
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 6
  },
  orangeNewPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#C2410C'
  },
  sectionGreenAction: {
    fontSize: 12,
    fontWeight: '700',
    color: '#06684F'
  },

  // ── Direct Inquiries Card ──
  directInquiryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1
  },
  diContentRow: {
    flexDirection: 'row'
  },
  diThumb: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: '#E2E8F0'
  },
  diJobTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A'
  },
  diLocationText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2
  },
  diScheduleText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2
  },
  diBudgetText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 3
  },
  diButtonsRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 10
  },
  diDeclineBtn: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF'
  },
  diDeclineBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444'
  },
  diAcceptBtn: {
    flex: 1.5,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#06684F',
    alignItems: 'center',
    justifyContent: 'center'
  },
  diAcceptBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF'
  },

  // ── Nearby Jobs ──
  nearbyJobCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1
  },
  nearbyJobThumb: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: '#E2E8F0'
  },
  nearbyJobDetailsCol: {
    flex: 1,
    marginLeft: 12
  },
  nearbyJobTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  urgentPill: {
    backgroundColor: '#FFEDD5',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4
  },
  urgentPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#C2410C'
  },
  nearbyJobTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2
  },
  nearbyJobDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 15
  },
  nearbyJobMetaText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 3
  },
  nearbyJobBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6
  },
  nearbyJobTimeText: {
    fontSize: 10,
    color: '#64748B'
  },
  viewDetailsOutlineBtn: {
    borderWidth: 1,
    borderColor: '#06684F',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5
  },
  viewDetailsOutlineText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#06684F'
  },

  // ── Expand Service Area ──
  expandAreaCard: {
    backgroundColor: '#ECFDF5',
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center'
  },
  expandAreaIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  },
  expandPinBadge: {
    position: 'absolute',
    top: 2,
    right: 2
  },
  expandAreaTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A'
  },
  expandAreaSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 15
  },
  setAreaBtn: {
    backgroundColor: '#06684F',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  setAreaBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF'
  },

  // ── Your Services Carousel ──
  horizontalServicesScroll: {
    paddingRight: 16,
    paddingBottom: 4
  },
  serviceMiniCard: {
    width: 112,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginRight: 10
  },
  serviceMiniThumb: {
    width: '100%',
    height: 75,
    backgroundColor: '#E2E8F0'
  },
  serviceMiniInfo: {
    padding: 8
  },
  serviceMiniTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A'
  },
  serviceStatusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 4
  },
  serviceStatusText: {
    fontSize: 9,
    fontWeight: '800'
  },

  // ── Promo to Screen 2 ──
  screen2PromoCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center'
  },
  screen2PromoTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#166534'
  },
  screen2PromoSub: {
    fontSize: 11,
    color: '#15803D',
    marginTop: 2,
    lineHeight: 15
  },
  screen2PromoBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10
  },

  /* ========================================================================= */
  /* ───────────── SCREEN 2: EXTENDED OVERVIEW STYLES ─────────────────────── */
  /* ========================================================================= */
  perfOverviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 10
  },
  perfOverviewTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A'
  },
  periodPill: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8
  },
  periodPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#06684F'
  },
  perfMetricsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    gap: 8,
    justifyContent: 'space-between'
  },
  perfMetricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center'
  },
  perfMetricIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6
  },
  perfMetricVal: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A'
  },
  perfMetricLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center'
  },

  // ── Weekly Chart ──
  chartContainerCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14
  },
  chartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14
  },
  chartTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A'
  },
  chartSubtitle: {
    fontSize: 11,
    color: '#64748B'
  },
  chartBodyRow: {
    flexDirection: 'row',
    height: 120
  },
  chartYAxis: {
    justifyContent: 'space-between',
    paddingRight: 8,
    paddingBottom: 16
  },
  chartYText: {
    fontSize: 9,
    color: '#94A3B8'
  },
  chartBarsWrap: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 4
  },
  chartBarCol: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
    width: 28
  },
  chartBarTrack: {
    height: 94,
    width: 14,
    justifyContent: 'flex-end'
  },
  chartBarFill: {
    width: '100%',
    backgroundColor: '#06684F',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4
  },
  chartDayLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 6
  },

  // ── 4x2 Category Grid ──
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  categoryGridItem: {
    width: (SCREEN_WIDTH - 32 - 30) / 4,
    alignItems: 'center',
    marginBottom: 14
  },
  categoryGridImg: {
    width: 62,
    height: 62,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  categoryGridLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 6,
    textAlign: 'center'
  },

  // ── Tips Card ──
  tipsCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 6,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center'
  },
  tipsTextCol: {
    flex: 1
  },
  tipsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  lightbulbEmoji: {
    fontSize: 16
  },
  tipsTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#166534'
  },
  tipsBullets: {
    marginTop: 6
  },
  tipBulletItem: {
    fontSize: 11,
    color: '#15803D',
    marginTop: 2,
    lineHeight: 16
  },
  tipsGraphicCol: {
    marginLeft: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },

  // ── Customer Reviews ──
  reviewsScroll: {
    paddingRight: 16,
    paddingBottom: 4
  },
  reviewCard: {
    width: 250,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginRight: 10
  },
  reviewTopRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  reviewerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center'
  },
  reviewerName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A'
  },
  reviewStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2
  },
  reviewDateText: {
    fontSize: 10,
    color: '#94A3B8'
  },
  reviewBodyText: {
    fontSize: 11,
    color: '#475569',
    marginTop: 8,
    lineHeight: 15
  },

  // ── Quick Actions ──
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10
  },
  quickActionItem: {
    width: (SCREEN_WIDTH - 32 - 10) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'flex-start'
  },
  quickActionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },
  quickActionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A'
  },
  quickActionSubtitle: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 14
  },

  // ── Need Help? Support Banner ──
  supportBanner: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center'
  },
  supportHeadsetIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center'
  },
  supportTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A'
  },
  supportSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2
  },
  contactSupportBtn: {
    borderWidth: 1,
    borderColor: '#06684F',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  contactSupportBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#06684F'
  },

  // ── Grow Your Business Banner ──
  growBusinessCard: {
    backgroundColor: '#065F46',
    borderRadius: 18,
    marginHorizontal: 16,
    marginTop: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#065F46',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3
  },
  growTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF'
  },
  growSub: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 3,
    lineHeight: 15
  },
  updateProfileBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignSelf: 'flex-start',
    marginTop: 10
  },
  updateProfileBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#065F46'
  },
  growGraphicCol: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingLeft: 10
  },
  growTechImg: {
    width: 80,
    height: 80,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
    borderWidth: 1.5,
    borderColor: '#A7F3D0'
  },
  emptyInquiryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4
  },
  emptyInquiryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 8
  },
  emptyInquirySub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4
  },
  emptyCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4
  },
  emptyCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 8
  },
  emptyCardSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4
  },
  checklistCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E6F4F0',
    marginBottom: 16,
    shadowColor: '#17212B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2
  },
  checklistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  checklistTitleRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  checklistTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#17212B'
  },
  checklistBadge: {
    backgroundColor: '#E6F4F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  checklistBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#08765A'
  },
  checklistSubtitle: {
    fontSize: 12,
    color: '#687583',
    lineHeight: 16,
    marginBottom: 12
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#EDF1F3',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#0B8F6A',
    borderRadius: 3
  },
  checklistTasks: {
    gap: 8
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDE4E8'
  },
  taskText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#17212B'
  }
});

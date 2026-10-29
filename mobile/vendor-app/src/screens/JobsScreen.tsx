import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';

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
  Dimensions,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, getStoredAuthToken } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '../context/NavigationContext';
import { COLORS } from '../theme/colors';
import { formatCurrency, formatDate } from '../utils/formatters';
import { getServiceImage } from '../utils/serviceImages';
import Header from '../components/Header';
import type { Job, Booking } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export type JobTab =
  | 'all'
  | 'quoted'
  | 'accepted'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

interface TabDefinition {
  key: JobTab;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  emptyTitle: string;
  emptySubtext: string;
}

const TAB_DEFINITIONS: TabDefinition[] = [
  {
    key: 'all',
    label: 'All Jobs',
    icon: 'briefcase-outline',
    emptyTitle: 'No matching jobs found',
    emptySubtext: 'Try another domain or refresh the feed.'
  },
  {
    key: 'quoted',
    label: 'My Quotes',
    icon: 'document-text-outline',
    emptyTitle: 'No Active Quotations',
    emptySubtext: 'Proposals you submit on open customer requests will be tracked here.'
  },
  {
    key: 'accepted',
    label: 'Accepted',
    icon: 'checkmark-circle-outline',
    emptyTitle: 'No Accepted Jobs',
    emptySubtext: 'Confirmed bookings and job offers accepted by customers will appear here ready for execution.'
  },
  {
    key: 'in_progress',
    label: 'In Progress',
    icon: 'time-outline',
    emptyTitle: 'No Jobs In Progress',
    emptySubtext: 'Jobs currently on the way, arrived at site, or under active repair will appear here.'
  },
  {
    key: 'completed',
    label: 'Completed',
    icon: 'checkbox-outline',
    emptyTitle: 'No Completed Jobs Yet',
    emptySubtext: 'Finished jobs with customer sign-offs and final settlements will be listed here.'
  },
  {
    key: 'cancelled',
    label: 'Cancelled',
    icon: 'close-circle-outline',
    emptyTitle: 'No Cancelled Jobs',
    emptySubtext: 'Declined or cancelled bookings will be recorded here.'
  }
];

const normalizeTab = (tab?: string): JobTab => {
  if (!tab || tab === 'new' || tab === 'requests' || tab === 'all') return 'all';
  if (tab === 'quoted' || tab === 'my_quotes') return 'quoted';
  if (tab === 'accepted') return 'accepted';
  if (tab === 'in_progress') return 'in_progress';
  if (tab === 'completed') return 'completed';
  if (tab === 'cancelled') return 'cancelled';
  return 'all';
};

function formatTimeAgo(dateInput?: string | Date): string {
  if (!dateInput) return 'Recently';
  const diffMs = Date.now() - new Date(dateInput).getTime();
  if (isNaN(diffMs) || diffMs < 0) return 'Recently';
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(typeof dateInput === 'string' ? dateInput : dateInput.toISOString());
}

export default function JobsScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const appNav = useNavigation();
  const initialTab: JobTab = normalizeTab(route?.params?.initialTab);
  const categoryFilter: string | undefined = route?.params?.category;

  const [activeTab, setActiveTab] = useState<JobTab>(initialTab);
  const [openJobs, setOpenJobs] = useState<Job[]>([]);
  const [assignedJobs, setAssignedJobs] = useState<Job[]>([]);
  const [myApplications, setMyApplications] = useState<any[]>([]);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [approvedCategoriesList, setApprovedCategoriesList] = useState<any[]>([]);

  // Domain Filter & Search State
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    categoryFilter || null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

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

  // Debounce search query to prevent unnecessary re-computations
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 280);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Synchronize active domain and initial tab when navigated from My Domains or other screens
  useEffect(() => {
    const target = route?.params?.category ?? route?.params?.activeDomain;
    if (target !== undefined) {
      setSelectedCategory(!target || target === 'all' ? null : target);
    }
    if (route?.params?.initialTab) {
      setActiveTab(normalizeTab(route.params.initialTab));
    }
  }, [route?.params?.category, route?.params?.activeDomain, route?.params?.initialTab]);

  useEffect(() => {
    if (!quoteModalVisible) return;
    const unregister = appNav.registerBackHandler(() => {
      setQuoteModalVisible(false);
      return true;
    });
    return unregister;
  }, [quoteModalVisible, appNav]);

  const isFetchingRef = useRef(false);

  const loadAllJobsData = useCallback(
    async (isSilent = false) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
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
          setAssignedJobs([]);
          setMyApplications([]);
          setMyBookings([]);
          return;
        }

        // Concurrent fetch of all required streams including catalogue categories
        const [jobsRes, assignedRes, appsRes, bookRes, notifRes, catRes] = await Promise.all([
          api.jobs.getOpenJobs({ tab: 'all' }).catch((e) => {
            console.warn('Open jobs fetch warning:', e);
            return { jobs: [], configurationStatus: 'ready' as const, vendorCoverage: undefined };
          }),
          api.jobs.getOpenJobs({ tab: 'assigned' }).catch((e) => {
            console.warn('Assigned jobs fetch warning:', e);
            return { jobs: [] };
          }),
          api.applications.getMyApplications().catch((e) => {
            console.warn('Applications fetch warning:', e);
            return { applications: [] };
          }),
          api.bookings.getMyBookings().catch((e) => {
            console.warn('Bookings fetch warning:', e);
            return { bookings: [] };
          }),
          api.notifications.getUnreadCount().catch(() => ({ count: 0 })),
          api.categories.getAll().catch(() => ({ categories: [] }))
        ]);

        if (jobsRes?.jobs) {
          setOpenJobs(jobsRes.jobs);
        }
        if (jobsRes?.configurationStatus) {
          setConfigurationStatus(jobsRes.configurationStatus);
        }
        const openCoverage = (jobsRes as any)?.vendorCoverage;
        if (openCoverage?.categories) {
          setApprovedCategoriesList(openCoverage.categories);
        }
        if (catRes?.categories && Array.isArray(catRes.categories)) {
          setAllCategories(catRes.categories);
        }
        if (assignedRes?.jobs) {
          setAssignedJobs(assignedRes.jobs);
        }
        if (appsRes?.applications) {
          setMyApplications(appsRes.applications);
        }
        if (bookRes?.bookings) {
          setMyBookings(bookRes.bookings);
        }
        if (notifRes?.count != null) {
          setUnreadCount(notifRes.count);
        }
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
          setApiError(msg || 'Unable to connect to jobs server. Please check your connection.');
        }
      } finally {
        isFetchingRef.current = false;
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
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
    setWorkDescription(
      `Comprehensive diagnostic inspection and professional repair for "${job.title}". Includes verified parts warranty.`
    );
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

      Alert.alert(
        'Quote Submitted! 📋',
        'Your proposal was sent directly to the customer. You will be notified when they accept.'
      );
      setQuoteModalVisible(false);
      await loadAllJobsData(true);
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
              Alert.alert(
                'Job Confirmed! 🎉',
                'You have accepted this assignment. It is now in your Accepted Jobs list.'
              );
              await loadAllJobsData(true);
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
              await loadAllJobsData(true);
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
              await api.bookings.respondDirectBooking(
                booking._id,
                'decline',
                'Vendor unavailable at requested schedule'
              );
              Alert.alert('Request Declined', 'The customer has been notified.');
              await loadAllJobsData(true);
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

  // ── UNIFIED FILTERING PIPELINE ACROSS ALL 6 TABS ──
  const itemsByTab = useMemo(() => {
    // 1. Direct inquiries: Pending customer bookings sent directly to this vendor
    const directInquiries = myBookings.filter((b) => b.status === 'pending_acceptance');

    // 2. Open marketplace opportunities without an assigned vendor
    const openMarketplaceJobs = openJobs.filter(
      (j) => ['open', 'dispatching'].includes(j.status) && !j.selectedVendor
    );

    // Prevent duplicate entries between direct inquiries and marketplace jobs
    const directJobIds = new Set(
      directInquiries
        .map((b: any) => (b.job?._id || b.job || b.jobId?._id || b.jobId || '').toString())
        .filter(Boolean)
    );

    // Unified "All Jobs": Combine direct inquiries + non-duplicated open jobs
    const rawAllItems: any[] = [
      ...directInquiries,
      ...openMarketplaceJobs.filter((j) => !directJobIds.has(j._id.toString()))
    ];

    // Filter "All Jobs" by selected category and debounced search
    const filteredAllItems = rawAllItems.filter((item) => {
      // Category / Domain Match
      if (selectedCategory && selectedCategory !== 'all') {
        const itemCatId = (
          item.category?._id ||
          item.category ||
          item.job?.category?._id ||
          item.job?.category ||
          ''
        ).toString();
        const itemCatSlug = (
          item.category?.slug ||
          item.job?.category?.slug ||
          ''
        ).toLowerCase();
        const itemCatName = (
          item.category?.name ||
          item.job?.category?.name ||
          item.serviceTitle ||
          ''
        ).toLowerCase();

        const matchId = itemCatId === selectedCategory;
        const matchSlug = itemCatSlug === selectedCategory.toLowerCase();
        const matchName =
          itemCatName.includes(selectedCategory.toLowerCase()) ||
          selectedCategory.toLowerCase().includes(itemCatName);

        if (!matchId && !matchSlug && !matchName) {
          return false;
        }
      }

      // Search Query Match
      if (debouncedSearch) {
        const queryLower = debouncedSearch.toLowerCase();
        const title = (item.title || item.serviceTitle || item.job?.title || '').toLowerCase();
        const desc = (item.description || item.problemDescription || '').toLowerCase();
        const locality = (
          item.location?.locality ||
          item.location?.city ||
          item.address?.locality ||
          item.address?.city ||
          ''
        ).toLowerCase();
        const catName = (
          item.category?.name ||
          item.job?.category?.name ||
          item.serviceTitle ||
          ''
        ).toLowerCase();

        const matches =
          title.includes(queryLower) ||
          desc.includes(queryLower) ||
          locality.includes(queryLower) ||
          catName.includes(queryLower);

        if (!matches) return false;
      }

      return true;
    });

    // 3. Quoted: Proposals submitted by vendor
    const quotedItems = myApplications;

    // 4. In Progress bookings
    const inProgressBookings = myBookings.filter((b) =>
      ['on_the_way', 'arrived', 'in_progress', 'completion_pending'].includes(b.status)
    );
    const getBookingJobId = (b: any) =>
      (b.job?._id || b.job || b.jobId?._id || b.jobId || '').toString();

    const inProgressBookingJobIds = new Set(
      inProgressBookings.map(getBookingJobId).filter(Boolean)
    );

    // 5. Completed bookings
    const completedBookings = myBookings.filter((b) => b.status === 'completed');
    const completedBookingJobIds = new Set(
      completedBookings.map(getBookingJobId).filter(Boolean)
    );

    // 6. Cancelled bookings
    const cancelledBookings = myBookings.filter((b) =>
      ['cancelled', 'declined', 'disputed'].includes(b.status)
    );
    const cancelledBookingJobIds = new Set(
      cancelledBookings.map(getBookingJobId).filter(Boolean)
    );

    // 7. Accepted bookings
    const acceptedBookings = myBookings.filter((b) =>
      ['confirmed', 'scheduled', 'assigned', 'awaiting_confirmation'].includes(b.status)
    );
    const acceptedBookingJobIds = new Set(
      acceptedBookings.map(getBookingJobId).filter(Boolean)
    );

    // Filter assigned jobs deduplicated against bookings
    const acceptedJobs = assignedJobs.filter((j) => {
      const jId = j._id.toString();
      if (
        inProgressBookingJobIds.has(jId) ||
        completedBookingJobIds.has(jId) ||
        cancelledBookingJobIds.has(jId) ||
        acceptedBookingJobIds.has(jId)
      ) {
        return false;
      }
      return j.status === 'assigned';
    });

    const acceptedItems = [...acceptedBookings, ...acceptedJobs];

    const inProgressJobs = assignedJobs.filter((j) => {
      const jId = j._id.toString();
      return (
        ['in_progress', 'completion_pending'].includes(j.status) &&
        !inProgressBookingJobIds.has(jId)
      );
    });
    const inProgressItems = [...inProgressBookings, ...inProgressJobs];

    const completedJobs = assignedJobs.filter((j) => {
      const jId = j._id.toString();
      return j.status === 'completed' && !completedBookingJobIds.has(jId);
    });
    const completedItems = [...completedBookings, ...completedJobs];

    const cancelledJobs = assignedJobs.filter((j) => {
      const jId = j._id.toString();
      return j.status === 'cancelled' && !cancelledBookingJobIds.has(jId);
    });
    const cancelledItems = [...cancelledBookings, ...cancelledJobs];

    return {
      all: filteredAllItems,
      rawAllCount: rawAllItems.length,
      rawAllItems,
      quoted: quotedItems,
      accepted: acceptedItems,
      in_progress: inProgressItems,
      completed: completedItems,
      cancelled: cancelledItems
    };
  }, [openJobs, assignedJobs, myApplications, myBookings, selectedCategory, debouncedSearch]);

  const currentItems = itemsByTab[activeTab] || [];

  // Domain Filter Options dynamically restricted to ONLY vendor's approved domains
  const domainFilterOptions = useMemo(() => {
    const list: any[] = [];
    const seen = new Set<string>();

    if (Array.isArray(approvedCategoriesList)) {
      approvedCategoriesList.forEach((c) => {
        if (!c) return;
        const id = (c._id || c.id || c).toString();
        if (id && !seen.has(id)) {
          seen.add(id);
          list.push({
            _id: id,
            name: c.name || 'Service',
            slug: c.slug || ''
          });
        }
      });
    }

    return list;
  }, [approvedCategoriesList]);

  // Count open opportunities per domain for badges on category pills
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const rawItems = itemsByTab.rawAllItems || [];
    rawItems.forEach((item) => {
      const catId = (
        item.category?._id ||
        item.category ||
        item.job?.category?._id ||
        item.job?.category ||
        ''
      ).toString();
      const catSlug = (
        item.category?.slug ||
        item.job?.category?.slug ||
        ''
      ).toLowerCase();
      if (catId) counts[catId] = (counts[catId] || 0) + 1;
      if (catSlug) counts[catSlug] = (counts[catSlug] || 0) + 1;
    });
    return counts;
  }, [itemsByTab.rawAllItems]);

  const selectedDomainName = useMemo(() => {
    if (!selectedCategory || selectedCategory === 'all') return 'All Domains';
    const found = domainFilterOptions.find(
      (c) =>
        c._id === selectedCategory ||
        c.slug === selectedCategory.toLowerCase() ||
        c.name.toLowerCase() === selectedCategory.toLowerCase()
    );
    return found?.name || 'Selected Domain';
  }, [selectedCategory, domainFilterOptions]);

  const tabs = useMemo(() => {
    return TAB_DEFINITIONS.map((def) => ({
      ...def,
      count:
        def.key === 'all'
          ? selectedCategory || debouncedSearch
            ? (itemsByTab.all || []).length
            : itemsByTab.rawAllCount || 0
          : (itemsByTab[def.key] || []).length
    }));
  }, [itemsByTab, selectedCategory, debouncedSearch]);

  const activeTabMeta = useMemo(() => {
    return TAB_DEFINITIONS.find((t) => t.key === activeTab) || TAB_DEFINITIONS[0];
  }, [activeTab]);

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
        return { text: 'UNDER REVIEW', bg: '#FEF3C7', color: '#B45309' };
      case 'accepted':
      case 'confirmed':
      case 'scheduled':
      case 'assigned':
        return { text: 'ACCEPTED', bg: '#ECFDF5', color: '#047857' };
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
      case 'declined':
        return { text: 'DECLINED', bg: '#FEE2E2', color: '#B91C1C' };
      case 'withdrawn':
        return { text: 'WITHDRAWN', bg: '#F3F4F6', color: '#6B7280' };
      case 'rejected':
        return { text: 'NOT SELECTED', bg: '#F3F4F6', color: '#6B7280' };
      default:
        return { text: (status || 'AVAILABLE').toUpperCase(), bg: '#F3F4F6', color: '#374151' };
    }
  };

  const renderJobCard = ({ item }: { item: any }) => {
    const isDirectInquiry = item.status === 'pending_acceptance';
    const isApplication = activeTab === 'quoted';
    const isBooking = Boolean(item.bookingReference);
    const isOpenJob = ['open', 'dispatching'].includes(item.status) && !item.selectedVendor;

    const title = isBooking || isDirectInquiry
      ? item.serviceTitle || item.job?.title || 'Service Booking'
      : isApplication
      ? item.job?.title || 'Quoted Job'
      : item.title;

    const catSlug = isBooking || isDirectInquiry
      ? item.category || item.job?.category?.slug || item.serviceTitle
      : isApplication
      ? item.job?.category?.slug || item.job?.title
      : item.category?.slug || item.category?.name || item.title;

    const categoryName = isBooking || isDirectInquiry
      ? item.category || item.job?.category?.name || 'Home Service'
      : isApplication
      ? item.job?.category?.name || 'Home Service'
      : item.category?.name || 'Home Service';

    const jobImage = getServiceImage(catSlug || title);

    const locality = isBooking || isDirectInquiry
      ? item.address?.locality
        ? `${item.address.locality}, ${item.address.city || 'Lucknow'}`
        : item.address?.city || 'Lucknow'
      : isApplication
      ? item.job?.address?.locality || item.job?.location?.locality
        ? `${item.job?.address?.locality || item.job?.location?.locality}, ${item.job?.location?.city || 'Lucknow'}`
        : item.job?.location?.city || 'Lucknow'
      : item.location?.locality
      ? `${item.location.locality}, ${item.location.city || 'Lucknow'}`
      : item.location?.city || item.address?.city || 'Lucknow';

    const customerName = isBooking || isDirectInquiry
      ? item.customer?.name || 'Customer'
      : isApplication
      ? item.job?.customer?.name || 'Customer'
      : item.customer?.name || 'Homeowner';

    const referenceId = isBooking || isDirectInquiry
      ? item.bookingReference || `#${String(item._id).slice(-6).toUpperCase()}`
      : `#${String(item._id).slice(-6).toUpperCase()}`;

    const statusBadge = getStatusBadge(item.status, item.urgency);

    const displayAmount = isBooking || isDirectInquiry
      ? item.pricing?.amount || item.totalAmount
      : isApplication
      ? item.proposedAmount
      : item.budget?.amount || item.pricing?.amount;

    const isEmergency = item.urgency === 'emergency';

    const scheduledDateVal =
      item.scheduledDate || item.preferredDate || item.createdAt || item.updatedAt;

    const attachedPhotos: string[] = Array.isArray(item.images) && item.images.length > 0
      ? item.images
      : Array.isArray(item.photos) && item.photos.length > 0
      ? item.photos
      : [];

    return (
      <View style={[styles.jobCard, isEmergency && styles.emergencyBorder]}>
        {/* Header Row: Thumbnail, Title, Reference, Status & Category */}
        <View style={styles.cardHeaderRow}>
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
              <Text style={styles.refCodeText}>{referenceId}</Text>
            </View>

            <Text style={styles.jobTitle} numberOfLines={2}>
              {title}
            </Text>

            <View style={styles.metaLine}>
              <Ionicons name="location-outline" size={13} color={COLORS.textMuted} />
              <Text style={styles.localityText} numberOfLines={1}>
                {locality}
              </Text>
            </View>
          </View>
        </View>

        {/* Customer, Schedule, Distance & Posted Details Row */}
        <View style={styles.infoStrip}>
          <View style={styles.infoChip}>
            <Ionicons name="person-circle-outline" size={14} color="#64748B" />
            <Text style={styles.infoChipText} numberOfLines={1}>
              {customerName}
            </Text>
          </View>
          <View style={styles.infoChip}>
            <Ionicons name="calendar-outline" size={14} color="#64748B" />
            <Text style={styles.infoChipText}>
              {formatDate(scheduledDateVal)}
            </Text>
          </View>
          {item.timeSlot || item.preferredTime ? (
            <View style={styles.infoChip}>
              <Ionicons name="time-outline" size={14} color="#64748B" />
              <Text style={styles.infoChipText}>{item.timeSlot || item.preferredTime}</Text>
            </View>
          ) : null}
          {item.distanceFormatted ? (
            <View style={[styles.infoChip, styles.distanceChip]}>
              <Ionicons name="navigate-outline" size={13} color="#047857" />
              <Text style={styles.distanceChipText}>{item.distanceFormatted}</Text>
            </View>
          ) : null}
          <View style={styles.infoChip}>
            <Ionicons name="hourglass-outline" size={13} color="#64748B" />
            <Text style={styles.infoChipText}>{formatTimeAgo(item.createdAt)}</Text>
          </View>
        </View>

        {/* Problem Description or Proposal Note */}
        {isDirectInquiry && item.problemDescription ? (
          <View style={styles.contextNoteBox}>
            <Text style={styles.contextNoteLabel}>Customer Request Note:</Text>
            <Text style={styles.contextNoteText} numberOfLines={2}>
              {item.problemDescription}
            </Text>
          </View>
        ) : isApplication && item.coverLetter ? (
          <View style={styles.contextNoteBox}>
            <Text style={styles.contextNoteLabel}>Your Submitted Note:</Text>
            <Text style={styles.contextNoteText} numberOfLines={2}>
              {item.coverLetter}
            </Text>
          </View>
        ) : item.description ? (
          <Text style={styles.jobDescriptionPreview} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        {/* Attached Photos Strip (Customer uploaded images) */}
        {attachedPhotos.length > 0 && (
          <View style={styles.photosStripContainer}>
            <View style={styles.photosBadge}>
              <Ionicons name="images-outline" size={12} color="#047857" />
              <Text style={styles.photosBadgeText}>
                {attachedPhotos.length} Photo{attachedPhotos.length > 1 ? 's' : ''} Attached
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photosThumbRow}
            >
              {attachedPhotos.map((imgUrl: string, idx: number) => (
                <Image
                  key={idx}
                  source={{ uri: imgUrl }}
                  style={styles.jobAttachedThumb}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Amount & Actions Row */}
        <View style={styles.footerRow}>
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>
              {isApplication
                ? 'Your Quoted Offer'
                : isBooking
                ? 'Booking Total'
                : item.budget?.type === 'fixed'
                ? 'Fixed Budget'
                : item.budget?.type === 'quote'
                ? 'Quote Required'
                : 'Budget / Offer'}
            </Text>
            <Text style={styles.priceValue}>
              {displayAmount && displayAmount > 0
                ? formatCurrency(displayAmount)
                : item.budget?.type === 'quote'
                ? 'Open for Quotes'
                : 'Standard Rate'}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            {isDirectInquiry ? (
              <View style={styles.btnGroup}>
                <TouchableOpacity
                  style={[
                    styles.primaryActionBtn,
                    respondingId === item._id && { opacity: 0.7 }
                  ]}
                  onPress={() => handleAcceptDirectRequest(item)}
                  disabled={respondingId === item._id}
                  activeOpacity={0.85}
                >
                  {respondingId === item._id ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={15} color="#FFFFFF" />
                      <Text style={styles.primaryActionBtnText}>Accept</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.declineActionBtn,
                    respondingId === item._id && { opacity: 0.7 }
                  ]}
                  onPress={() => handleDeclineDirectRequest(item)}
                  disabled={respondingId === item._id}
                  activeOpacity={0.85}
                >
                  <Ionicons name="close" size={15} color="#DC2626" />
                  <Text style={styles.declineActionBtnText}>Decline</Text>
                </TouchableOpacity>
              </View>
            ) : isOpenJob ? (
              <View style={styles.btnGroup}>
                <TouchableOpacity
                  style={styles.primaryActionBtn}
                  onPress={() => handleOpenQuoteModal(item)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="send" size={13} color="#FFFFFF" />
                  <Text style={styles.primaryActionBtnText}>Send Quote</Text>
                </TouchableOpacity>

                {(isEmergency || item.budget?.type === 'fixed') && (
                  <TouchableOpacity
                    style={[
                      styles.accentActionBtn,
                      respondingId === item._id && { opacity: 0.7 }
                    ]}
                    onPress={() => handleClaimJob(item)}
                    disabled={respondingId === item._id}
                    activeOpacity={0.85}
                  >
                    {respondingId === item._id ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="flash" size={13} color="#FFFFFF" />
                        <Text style={styles.accentActionBtnText}>
                          {isEmergency ? 'Claim ⚡' : 'Accept'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.outlineActionBtn}
                  onPress={() =>
                    navigation.navigate('VendorJobDetail', { jobId: item._id })
                  }
                  activeOpacity={0.85}
                >
                  <Text style={styles.outlineActionBtnText}>View Details</Text>
                </TouchableOpacity>
              </View>
            ) : isBooking ? (
              <TouchableOpacity
                style={
                  activeTab === 'in_progress'
                    ? styles.primaryActionBtn
                    : styles.outlineActionBtn
                }
                onPress={() =>
                  navigation.navigate('VendorJobDetail', {
                    bookingId: item._id,
                    jobId: item.job?._id || item.job || item.jobId?._id || item.jobId
                  })
                }
                activeOpacity={0.85}
              >
                <Ionicons
                  name={activeTab === 'in_progress' ? 'construct-outline' : 'eye-outline'}
                  size={14}
                  color={activeTab === 'in_progress' ? '#FFFFFF' : '#047857'}
                />
                <Text
                  style={
                    activeTab === 'in_progress'
                      ? styles.primaryActionBtnText
                      : styles.outlineActionBtnText
                  }
                >
                  {activeTab === 'in_progress'
                    ? 'Manage Operations ›'
                    : 'View Details ›'}
                </Text>
              </TouchableOpacity>
            ) : isApplication ? (
              <TouchableOpacity
                style={styles.outlineActionBtn}
                onPress={() =>
                  navigation.navigate('VendorJobDetail', {
                    jobId: item.job?._id || item.job
                  })
                }
                activeOpacity={0.85}
              >
                <Ionicons name="eye-outline" size={14} color="#047857" />
                <Text style={styles.outlineActionBtnText}>View Proposal Status ›</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.outlineActionBtn}
                onPress={() =>
                  navigation.navigate('VendorJobDetail', { jobId: item._id })
                }
                activeOpacity={0.85}
              >
                <Ionicons name="eye-outline" size={14} color="#047857" />
                <Text style={styles.outlineActionBtnText}>View Details ›</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderSkeletonCard = () => (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonHeader}>
        <View style={styles.skeletonThumb} />
        <View style={{ flex: 1, gap: 6 }}>
          <View style={[styles.skeletonLine, { width: '40%' }]} />
          <View style={[styles.skeletonLine, { width: '85%', height: 14 }]} />
          <View style={[styles.skeletonLine, { width: '60%' }]} />
        </View>
      </View>
      <View style={styles.skeletonDivider} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={[styles.skeletonLine, { width: '30%', height: 16 }]} />
        <View style={[styles.skeletonLine, { width: '25%', height: 28, borderRadius: 6 }]} />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Header
        unreadCount={unreadCount}
        userName={user?.name || 'Verified Professional'}
        userAvatar={typeof user?.avatar === 'string' ? user.avatar : undefined}
        onPressNotifications={() => navigation.navigate('Notifications')}
        onPressProfile={() => navigation.navigate('ProfileTab')}
      />

      {/* ── COMPACT HORIZONTALLY SCROLLABLE SEGMENTED TAB STRIP (6 TABS) ── */}
      <View style={styles.tabsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScroll}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabItem, isActive && styles.tabItemActive]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={tab.icon}
                  size={14}
                  color={isActive ? '#FFFFFF' : '#475569'}
                />
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab.label}
                </Text>
                {tab.count > 0 && (
                  <View
                    style={[
                      styles.tabCountBadge,
                      isActive && styles.tabCountBadgeActive
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabCountText,
                        isActive && styles.tabCountTextActive
                      ]}
                    >
                      {tab.count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── UNIFIED DOMAIN & SEARCH FILTER STRIP (Only visible on All Jobs tab) ── */}
      {activeTab === 'all' && (
        <View style={styles.domainFilterContainer}>
          {/* Search Box */}
          <View style={styles.searchBarRow}>
            <View style={styles.searchBarInputWrap}>
              <Ionicons name="search" size={15} color="#64748B" style={styles.searchIcon} />
              <TextInput
                style={styles.searchBarInput}
                placeholder="Search jobs by service title, trade, or locality..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                clearButtonMode="while-editing"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={16} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            {(selectedCategory || debouncedSearch) && (
              <TouchableOpacity
                style={styles.clearFilterBtn}
                onPress={() => {
                  setSelectedCategory(null);
                  setSearchQuery('');
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="filter-outline" size={13} color="#047857" />
                <Text style={styles.clearFilterBtnText}>Reset</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Horizontal Domain Scroll Strip */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.domainPillsScroll}
          >
            {/* "All Domains" Pill */}
            <TouchableOpacity
              style={[
                styles.domainPill,
                (!selectedCategory || selectedCategory === 'all') && styles.domainPillActive
              ]}
              onPress={() => setSelectedCategory(null)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.domainPillText,
                  (!selectedCategory || selectedCategory === 'all') && styles.domainPillTextActive
                ]}
              >
                All My Domains
              </Text>
              <View
                style={[
                  styles.domainCountBadge,
                  (!selectedCategory || selectedCategory === 'all') && styles.domainCountBadgeActive
                ]}
              >
                <Text
                  style={[
                    styles.domainCountText,
                    (!selectedCategory || selectedCategory === 'all') && styles.domainCountTextActive
                  ]}
                >
                  {itemsByTab.rawAllCount || 0}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Individual Domain Pills from Backend Catalogue */}
            {domainFilterOptions.map((cat) => {
              const isSelected =
                selectedCategory === cat._id ||
                selectedCategory === cat.slug ||
                selectedCategory === cat.name;
              const count = categoryCounts[cat._id] || categoryCounts[cat.slug] || 0;

              return (
                <TouchableOpacity
                  key={cat._id || cat.slug}
                  style={[styles.domainPill, isSelected && styles.domainPillActive]}
                  onPress={() => setSelectedCategory(isSelected ? null : cat._id)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[styles.domainPillText, isSelected && styles.domainPillTextActive]}
                    numberOfLines={1}
                  >
                    {cat.name}
                  </Text>
                  {count > 0 && (
                    <View
                      style={[
                        styles.domainCountBadge,
                        isSelected && styles.domainCountBadgeActive
                      ]}
                    >
                      <Text
                        style={[
                          styles.domainCountText,
                          isSelected && styles.domainCountTextActive
                        ]}
                      >
                        {count}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Active Domain Info Bar */}
          {selectedCategory && (
            <View style={styles.filterStatusBanner}>
              <Ionicons name="pricetag-outline" size={12} color="#047857" />
              <Text style={styles.filterStatusText}>
                Showing <Text style={{ fontWeight: '700' }}>{currentItems.length}</Text> jobs in{' '}
                <Text style={{ fontWeight: '700' }}>{selectedDomainName}</Text>
              </Text>
              <TouchableOpacity
                onPress={() => setSelectedCategory(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.clearFilterLink}>Clear Filter</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* ── ACTIONABLE CONFIGURATION BANNER (Missing Categories or Location) ── */}
      {activeTab === 'all' && configurationStatus === 'missing_categories' ? (
        <View style={styles.configBannerCard}>
          <View style={styles.configBannerIcon}>
            <Ionicons name="construct-outline" size={20} color="#B45309" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.configBannerTitle}>No Trade Categories Configured</Text>
            <Text style={styles.configBannerSub}>
              Please add your approved trade services (e.g., Electrical, Plumbing, AC Repair) to receive customer job dispatches in Lucknow.
            </Text>
            <TouchableOpacity
              style={styles.configActionBtn}
              onPress={() => navigation.navigate('VendorEditProfile')}
              activeOpacity={0.8}
            >
              <Text style={styles.configActionBtnText}>Configure Categories in Profile →</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : activeTab === 'all' && configurationStatus === 'missing_service_area' ? (
        <View style={styles.configBannerCard}>
          <View style={styles.configBannerIcon}>
            <Ionicons name="location-outline" size={20} color="#B45309" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.configBannerTitle}>Service Area Coverage Needed</Text>
            <Text style={styles.configBannerSub}>
              Set your active operating localities to view matching customer requests in Lucknow.
            </Text>
            <TouchableOpacity
              style={styles.configActionBtn}
              onPress={() => navigation.navigate('VendorServiceArea')}
              activeOpacity={0.8}
            >
              <Text style={styles.configActionBtnText}>Set Service Area Coverage →</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* ── MAIN CONTENT STATE (AUTH, ERROR, LOADING, EMPTY, LIST) ── */}
      {authRequired ? (
        <View style={styles.authBannerCard}>
          <Ionicons name="lock-closed" size={36} color="#D97706" />
          <Text style={styles.authCardTitle}>Sign In as Verified Contractor</Text>
          <Text style={styles.authCardSub}>
            Please sign in with your contractor credentials to view and manage your assigned jobs.
          </Text>
          <TouchableOpacity
            style={styles.authActionBtn}
            onPress={() => navigation.navigate('VendorLogin')}
            activeOpacity={0.85}
          >
            <Text style={styles.authActionBtnText}>Sign In to WorkLogy</Text>
          </TouchableOpacity>
        </View>
      ) : apiError ? (
        <View style={styles.errorStateCard}>
          <Ionicons name="cloud-offline-outline" size={38} color="#EF4444" />
          <Text style={styles.errorStateTitle}>Connection Failed</Text>
          <Text style={styles.errorStateSub}>{apiError}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => loadAllJobsData()}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={15} color="#FFFFFF" />
            <Text style={styles.retryBtnText}>Retry Connection</Text>
          </TouchableOpacity>
        </View>
      ) : loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          {renderSkeletonCard()}
          {renderSkeletonCard()}
          {renderSkeletonCard()}
        </View>
      ) : currentItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name={activeTabMeta.icon} size={28} color="#047857" />
            </View>
            <Text style={styles.emptyTitle}>
              {activeTab === 'all' && (selectedCategory || debouncedSearch)
                ? 'No matching jobs found'
                : activeTabMeta.emptyTitle}
            </Text>
            <Text style={styles.emptySubtext}>
              {activeTab === 'all' && (selectedCategory || debouncedSearch)
                ? 'Try another domain or refresh the feed.'
                : activeTabMeta.emptySubtext}
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              {activeTab === 'all' && (selectedCategory || debouncedSearch) && (
                <TouchableOpacity
                  style={[
                    styles.refreshFeedBtn,
                    { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1' }
                  ]}
                  onPress={() => {
                    setSelectedCategory(null);
                    setSearchQuery('');
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="close-circle-outline" size={14} color="#334155" />
                  <Text style={[styles.refreshFeedBtnText, { color: '#334155' }]}>Clear Filter</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.refreshFeedBtn}
                onPress={handleRefresh}
                activeOpacity={0.85}
              >
                <Ionicons name="refresh" size={14} color="#FFFFFF" />
                <Text style={styles.refreshFeedBtnText}>Refresh Feed</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        <FlatList
          data={currentItems}
          keyExtractor={(item) => (item._id ? String(item._id) : Math.random().toString())}
          renderItem={renderJobCard}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#047857"
              colors={['#047857']}
            />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ── QUOTATION MODAL ── */}
      <Modal visible={quoteModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Submit Professional Quote</Text>
                <Text style={styles.modalSubtitle} numberOfLines={1}>
                  {selectedJobForQuote?.title}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setQuoteModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputSectionTitle}>Pricing Breakdown (₹ INR)</Text>

              <View style={styles.inputRow}>
                <View style={styles.halfInput}>
                  <Text style={styles.inputLabel}>Diagnostic / Service Fee (₹)</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={serviceCharge}
                    onChangeText={setServiceCharge}
                    placeholder="e.g. 350"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
                <View style={styles.halfInput}>
                  <Text style={styles.inputLabel}>Labour Charges (₹)</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={labourCharge}
                    onChangeText={setLabourCharge}
                    placeholder="e.g. 150"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              <View style={styles.inputRow}>
                <View style={styles.halfInput}>
                  <Text style={styles.inputLabel}>Material / Parts Est. (₹)</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={materialCharge}
                    onChangeText={setMaterialCharge}
                    placeholder="e.g. 0 if parts not needed"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
                <View style={styles.halfInput}>
                  <Text style={styles.inputLabel}>Additional / Travel (₹)</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={additionalCharge}
                    onChangeText={setAdditionalCharge}
                    placeholder="e.g. 0"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              <View style={styles.totalBox}>
                <Text style={styles.totalLabel}>Total Quotation</Text>
                <Text style={styles.totalAmount}>{formatCurrency(totalQuoteAmount)}</Text>
              </View>

              <View style={styles.inputRow}>
                <View style={styles.halfInput}>
                  <Text style={styles.inputLabel}>Est. Completion Time</Text>
                  <TextInput
                    style={styles.textInput}
                    value={estimatedDuration}
                    onChangeText={setEstimatedDuration}
                    placeholder="e.g. 1 hour 30 mins"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
                <View style={styles.halfInput}>
                  <Text style={styles.inputLabel}>Proposed Schedule</Text>
                  <TextInput
                    style={styles.textInput}
                    value={proposedSchedule}
                    onChangeText={setProposedSchedule}
                    placeholder="e.g. Today 4:00 PM or Tomorrow 10:00 AM"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Description of Work & Warranty</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                multiline
                numberOfLines={3}
                value={workDescription}
                onChangeText={setWorkDescription}
                placeholder="Explain what your quotation covers, materials included, and workmanship warranty (e.g. 30-day guarantee)..."
                placeholderTextColor="#94A3B8"
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
                  <Text style={styles.submitModalBtnText}>
                    Submit Quote ({formatCurrency(totalQuoteAmount)})
                  </Text>
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
  // Horizontal Status Tab Strip
  tabsWrapper: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 8
  },
  tabsScroll: {
    paddingHorizontal: 12,
    gap: 8,
    alignItems: 'center'
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6
  },
  tabItemActive: {
    backgroundColor: '#047857',
    borderColor: '#047857'
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569'
  },
  tabTextActive: {
    color: '#FFFFFF'
  },
  tabCountBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10
  },
  tabCountBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)'
  },
  tabCountText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#334155'
  },
  tabCountTextActive: {
    color: '#FFFFFF'
  },

  // Unified Domain & Search Filter Styles
  domainFilterContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingTop: 8,
    paddingBottom: 8
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 8
  },
  searchBarInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 36,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  searchIcon: {
    marginRight: 6
  },
  searchBarInput: {
    flex: 1,
    fontSize: 12,
    color: '#0F172A',
    paddingVertical: 0
  },
  clearFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8
  },
  clearFilterBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857'
  },
  domainPillsScroll: {
    paddingHorizontal: 12,
    gap: 6,
    alignItems: 'center',
    paddingBottom: 2
  },
  domainPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 5
  },
  domainPillActive: {
    backgroundColor: '#047857',
    borderColor: '#047857'
  },
  domainPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569'
  },
  domainPillTextActive: {
    color: '#FFFFFF'
  },
  domainCountBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8
  },
  domainCountBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)'
  },
  domainCountText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#334155'
  },
  domainCountTextActive: {
    color: '#FFFFFF'
  },
  filterStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ECFDF5',
    marginHorizontal: 12,
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0'
  },
  filterStatusText: {
    fontSize: 11,
    color: '#065F46',
    flex: 1,
    marginLeft: 4
  },
  clearFilterLink: {
    fontSize: 11,
    fontWeight: '800',
    color: '#047857',
    textDecorationLine: 'underline'
  },

  // Distance Chip & Photos Strip
  distanceChip: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1
  },
  distanceChipText: {
    fontSize: 11,
    color: '#047857',
    fontWeight: '700'
  },
  photosStripContainer: {
    marginTop: 8,
    gap: 6
  },
  photosBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  photosBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#047857'
  },
  photosThumbRow: {
    flexDirection: 'row',
    gap: 6
  },
  jobAttachedThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#F1F5F9'
  },

  // Job Card Styles
  listContent: {
    paddingVertical: 10,
    paddingBottom: 110
  },
  jobCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 13,
    marginHorizontal: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2
  },
  emergencyBorder: {
    borderColor: '#FECACA',
    backgroundColor: '#FFFDFD'
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10
  },
  thumbImage: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#F1F5F9'
  },
  titleArea: {
    flex: 1
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
    flexWrap: 'wrap'
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3
  },
  categoryPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  categoryPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#334155'
  },
  refCodeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    marginLeft: 'auto'
  },
  jobTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 18
  },
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4
  },
  localityText: {
    fontSize: 11,
    color: '#64748B'
  },

  // Info Strip
  infoStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    flexWrap: 'wrap'
  },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6
  },
  infoChipText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500'
  },

  jobDescriptionPreview: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 8,
    lineHeight: 16
  },
  contextNoteBox: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 8,
    padding: 8,
    marginTop: 8
  },
  contextNoteLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#92400E',
    textTransform: 'uppercase',
    marginBottom: 2
  },
  contextNoteText: {
    fontSize: 11,
    color: '#78350F',
    lineHeight: 15
  },

  // Footer Row
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },
  priceContainer: {
    justifyContent: 'center'
  },
  priceLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#94A3B8'
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#047857'
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  btnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#047857',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 7
  },
  primaryActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  accentActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#059669',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 7
  },
  accentActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  outlineActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 7
  },
  outlineActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857'
  },
  declineActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 7
  },
  declineActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626'
  },

  // Skeleton Loading Cards
  loadingContainer: {
    padding: 12,
    gap: 10
  },
  skeletonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10
  },
  skeletonHeader: {
    flexDirection: 'row',
    gap: 12
  },
  skeletonThumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#F1F5F9'
  },
  skeletonLine: {
    height: 10,
    borderRadius: 4,
    backgroundColor: '#F1F5F9'
  },
  skeletonDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 4
  },

  // Compact Empty State
  emptyContainer: {
    padding: 16
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1
  },
  emptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4
  },
  emptySubtext: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 17,
    maxWidth: 280,
    marginBottom: 16
  },
  refreshFeedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#047857',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  refreshFeedBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF'
  },

  // Configuration Banners
  configBannerCard: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    margin: 12,
    marginBottom: 4,
    padding: 12,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start'
  },
  configBannerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center'
  },
  configBannerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E'
  },
  configBannerSub: {
    fontSize: 11,
    color: '#78350F',
    marginTop: 2,
    lineHeight: 15
  },
  configActionBtn: {
    marginTop: 6,
    alignSelf: 'flex-start'
  },
  configActionBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309'
  },

  // Auth & Error Cards
  authBannerCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28
  },
  authCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 10
  },
  authCardSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 17,
    marginBottom: 16
  },
  authActionBtn: {
    backgroundColor: '#047857',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 8
  },
  authActionBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF'
  },

  errorStateCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28
  },
  errorStateTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 10
  },
  errorStateSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 17,
    marginBottom: 16
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#047857',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  retryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF'
  },

  // Quotation Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    padding: 16
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A'
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    maxWidth: SCREEN_WIDTH * 0.75
  },
  modalScroll: {
    marginBottom: 12
  },
  inputSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8
  },
  halfInput: {
    flex: 1
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 3
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12,
    color: '#0F172A'
  },
  textArea: {
    height: 64,
    textAlignVertical: 'top'
  },
  totalBox: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#065F46'
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#064E3B'
  },
  modalDisclaimer: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 8,
    textAlign: 'center'
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10
  },
  cancelModalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#F1F5F9'
  },
  cancelModalBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155'
  },
  submitModalBtn: {
    flex: 1,
    backgroundColor: '#047857',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  submitModalBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF'
  }
});

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Platform,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, getStoredAuthToken } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { secureStorage } from '../storage/secureStorage';
import { STORAGE_KEYS } from '../constants';
import { COLORS } from '../theme/colors';
import { getServiceImage } from '../utils/serviceImages';
import type { ServiceListing } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type FilterTab = 'all' | 'published' | 'draft' | 'paused';

export default function VendorServicesScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0
  );

  const { user } = useAuth();
  const [services, setServices] = useState<ServiceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [isUnauthenticated, setIsUnauthenticated] = useState(false);

  useEffect(() => {
    loadServices();
  }, [user]);

  const loadServices = async () => {
    try {
      setLoading(true);

      const token = await getStoredAuthToken();
      if (!token) {
        setIsUnauthenticated(true);
        setServices([]);
        return;
      }

      setIsUnauthenticated(false);
      const res = await api.services.getMyServices();
      if (res?.services) {
        setServices(res.services);
      } else if (Array.isArray(res)) {
        setServices(res);
      }
    } catch (err: any) {
      const msg = err?.message || '';
      if (
        msg.includes('token missing') ||
        msg.includes('Not authorized') ||
        msg.includes('jwt') ||
        msg.includes('401')
      ) {
        setIsUnauthenticated(true);
        setServices([]);
      } else {
        console.warn('Failed to load vendor services:', err);
        Alert.alert('Load Error', msg || 'Unable to fetch your service offerings.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadServices();
  };

  const handleToggleStatus = async (service: ServiceListing) => {
    const isPublished = service.status === 'published';
    const newStatus = isPublished ? 'paused' : 'published';
    const actionLabel = isPublished ? 'Pause Service' : 'Publish Service';
    const confirmMsg = isPublished
      ? 'Pausing this service will temporarily hide it from customer searches and direct bookings. Existing bookings remain unaffected.'
      : 'Publishing will make this service instantly discoverable to customers in your service radius.';

    Alert.alert(actionLabel, confirmMsg, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: isPublished ? 'Pause' : 'Publish',
        style: isPublished ? 'destructive' : 'default',
        onPress: async () => {
          try {
            setActionInProgress(service._id);
            await api.services.updateStatus(service._id, newStatus);
            // Update local state
            setServices((prev) =>
              prev.map((s) => (s._id === service._id ? { ...s, status: newStatus } : s))
            );
            Alert.alert(
              'Status Updated',
              `Service is now ${newStatus === 'published' ? 'Live & Published' : 'Paused'}.`
            );
          } catch (err: any) {
            Alert.alert('Update Failed', err.message || 'Could not change service status.');
          } finally {
            setActionInProgress(null);
          }
        }
      }
    ]);
  };

  const handleDeleteService = (service: ServiceListing) => {
    Alert.alert(
      'Delete Service Offering?',
      `Are you sure you want to permanently delete "${service.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionInProgress(service._id);
              await api.services.delete(service._id);
              setServices((prev) => prev.filter((s) => s._id !== service._id));
              Alert.alert('Service Deleted', 'Your service offering has been permanently removed.');
            } catch (err: any) {
              Alert.alert('Delete Failed', err.message || 'Could not delete service.');
            } finally {
              setActionInProgress(null);
            }
          }
        }
      ]
    );
  };

  // Filter and search
  const filteredServices = services.filter((s) => {
    // Tab filter
    if (activeTab === 'published' && s.status !== 'published') return false;
    if (activeTab === 'draft' && s.status !== 'draft') return false;
    if (activeTab === 'paused' && s.status !== 'paused') return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = s.title?.toLowerCase().includes(q);
      const matchSub = s.subcategory?.toLowerCase().includes(q);
      const matchDomain = s.domain?.toLowerCase().includes(q);
      const matchDesc = s.description?.toLowerCase().includes(q);
      return matchTitle || matchSub || matchDomain || matchDesc;
    }
    return true;
  });

  const counts = {
    all: services.length,
    published: services.filter((s) => s.status === 'published').length,
    draft: services.filter((s) => s.status === 'draft').length,
    paused: services.filter((s) => s.status === 'paused').length
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return (
          <View style={[styles.statusBadge, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
            <View style={[styles.statusDot, { backgroundColor: '#059669' }]} />
            <Text style={[styles.statusText, { color: '#047857' }]}>Active / Live</Text>
          </View>
        );
      case 'paused':
        return (
          <View style={[styles.statusBadge, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
            <View style={[styles.statusDot, { backgroundColor: '#D97706' }]} />
            <Text style={[styles.statusText, { color: '#B45309' }]}>Paused</Text>
          </View>
        );
      case 'draft':
        return (
          <View style={[styles.statusBadge, { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' }]}>
            <View style={[styles.statusDot, { backgroundColor: '#6B7280' }]} />
            <Text style={[styles.statusText, { color: '#4B5563' }]}>Draft</Text>
          </View>
        );
      case 'pending_approval':
        return (
          <View style={[styles.statusBadge, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
            <View style={[styles.statusDot, { backgroundColor: '#2563EB' }]} />
            <Text style={[styles.statusText, { color: '#1D4ED8' }]}>Under Review</Text>
          </View>
        );
      default:
        return (
          <View style={[styles.statusBadge, { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' }]}>
            <Text style={[styles.statusText, { color: '#6B7280' }]}>{status}</Text>
          </View>
        );
    }
  };

  const renderServiceCard = ({ item }: { item: ServiceListing }) => {
    const isBusy = actionInProgress === item._id;
    const coverImage =
      item.images && item.images.length > 0
        ? { uri: item.images[0] }
        : getServiceImage(item.domain || item.subcategory || 'ac-hvac-services');

    const pricing = item.pricing || { type: 'fixed', amount: 499, unit: 'per visit' };
    const priceText =
      pricing.type === 'quote'
        ? 'Price on Inspection'
        : pricing.type === 'starting'
        ? `Starts ₹${pricing.minPrice || pricing.amount || 0}`
        : `₹${pricing.amount || 0}`;

    return (
      <View style={styles.card}>
        {/* Top Image + Badges */}
        <View style={styles.cardImageContainer}>
          <Image source={coverImage} style={styles.cardImage} resizeMode="cover" />
          <View style={styles.cardImageOverlay} />

          <View style={styles.cardTopRow}>
            <View style={styles.domainPill}>
              <Text style={styles.domainPillText}>{item.domain || 'Service'}</Text>
            </View>
            {renderStatusBadge(item.status)}
          </View>

          {item.subcategory ? (
            <View style={styles.cardBottomOverlayTag}>
              <Text style={styles.subcategoryTagText}>{item.subcategory}</Text>
            </View>
          ) : null}
        </View>

        {/* Content Body */}
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </Text>

          <Text style={styles.cardDescription} numberOfLines={2}>
            {item.shortSummary || item.description}
          </Text>

          {/* Pricing & Radius Row */}
          <View style={styles.metaRow}>
            <View style={styles.priceContainer}>
              <Text style={styles.priceValue}>{priceText}</Text>
              {pricing.unit && pricing.type !== 'quote' ? (
                <Text style={styles.priceUnit}> / {pricing.unit.replace('per ', '')}</Text>
              ) : null}
            </View>

            <View style={styles.locationPill}>
              <Ionicons name="location-sharp" size={13} color="#059669" />
              <Text style={styles.locationText}>
                {item.location?.city || 'Lucknow'} ({item.location?.radiusKm || 25} km)
              </Text>
            </View>
          </View>

          {/* Availability & Booking Counts */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="calendar-outline" size={14} color="#6B7280" />
              <Text style={styles.statText}>
                {item.availability?.days?.length || 6} days/wk
              </Text>
            </View>

            <View style={styles.statItem}>
              <Ionicons name="time-outline" size={14} color="#6B7280" />
              <Text style={styles.statText}>
                {item.availability?.hours?.start || '09:00'} - {item.availability?.hours?.end || '19:00'}
              </Text>
            </View>

            <View style={styles.statItem}>
              <Ionicons name="star" size={13} color="#F59E0B" />
              <Text style={styles.statTextBold}>
                {item.rating ? item.rating.toFixed(1) : '5.0'}
              </Text>
              <Text style={styles.statTextMuted}>({item.reviewCount || 0})</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsDivider} />
          <View style={styles.actionRow}>
            {/* Pause / Publish Toggle Button */}
            <TouchableOpacity
              style={[
                styles.actionBtn,
                item.status === 'published' ? styles.pauseBtn : styles.publishBtn
              ]}
              onPress={() => handleToggleStatus(item)}
              disabled={isBusy}
              activeOpacity={0.7}
            >
              {isBusy ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons
                    name={item.status === 'published' ? 'pause-circle-outline' : 'play-circle-outline'}
                    size={16}
                    color="#FFFFFF"
                  />
                  <Text style={styles.actionBtnText}>
                    {item.status === 'published' ? 'Pause' : 'Publish'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Edit Button */}
            <TouchableOpacity
              style={[styles.actionBtn, styles.editBtn]}
              onPress={() => navigation.navigate('VendorNewService', { service: item })}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={16} color="#1F2937" />
              <Text style={[styles.actionBtnText, { color: '#1F2937' }]}>Edit</Text>
            </TouchableOpacity>

            {/* Delete Button */}
            <TouchableOpacity
              style={[styles.actionBtn, styles.deleteBtn]}
              onPress={() => handleDeleteService(item)}
              disabled={isBusy}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={16} color="#DC2626" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={[styles.headerContainer, { paddingTop: topInset + 8 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>My Services</Text>
            <Text style={styles.headerSubtitle}>
              {services.length} {services.length === 1 ? 'service listing' : 'service listings'}
            </Text>
          </View>

          {/* Add New Service Top Action */}
          <TouchableOpacity
            style={styles.addServiceTopBtn}
            onPress={() => {
              if (isUnauthenticated) {
                navigation.navigate('VendorLogin');
              } else {
                navigation.navigate('VendorNewService');
              }
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.addServiceTopBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchWrap}>
          <View style={styles.searchIcon}>
            <Ionicons name="search" size={18} color="#9CA3AF" />
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by title, category, or skill..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Tabs */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabPill, activeTab === 'all' && styles.tabPillActive]}
            onPress={() => setActiveTab('all')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabPillText, activeTab === 'all' && styles.tabPillTextActive]}>
              All ({counts.all})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabPill, activeTab === 'published' && styles.tabPillActive]}
            onPress={() => setActiveTab('published')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabPillText, activeTab === 'published' && styles.tabPillTextActive]}>
              Live ({counts.published})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabPill, activeTab === 'paused' && styles.tabPillActive]}
            onPress={() => setActiveTab('paused')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabPillText, activeTab === 'paused' && styles.tabPillTextActive]}>
              Paused ({counts.paused})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabPill, activeTab === 'draft' && styles.tabPillActive]}
            onPress={() => setActiveTab('draft')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabPillText, activeTab === 'draft' && styles.tabPillTextActive]}>
              Drafts ({counts.draft})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content List */}
      {isUnauthenticated ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconCircle, { backgroundColor: '#EFF6FF' }]}>
            <Ionicons name="lock-closed-outline" size={44} color="#2563EB" />
          </View>
          <Text style={styles.emptyTitle}>Sign In Required</Text>
          <Text style={styles.emptySubtitle}>
            Please sign in to your WorkLogy Pro contractor account to list your trade skills, manage pricing, and receive direct customer bookings.
          </Text>

          <TouchableOpacity
            style={[styles.emptyAddBtn, { backgroundColor: '#059669', marginBottom: 14 }]}
            onPress={() => navigation.navigate('VendorLogin')}
            activeOpacity={0.85}
          >
            <Ionicons name="log-in-outline" size={20} color="#FFFFFF" />
            <Text style={styles.emptyAddBtnText}>Sign In to Pro Account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ paddingVertical: 8, paddingHorizontal: 16 }}
            onPress={() => navigation.navigate('VendorRegister')}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#059669' }}>
              Register as New Contractor ›
            </Text>
          </TouchableOpacity>
        </View>
      ) : loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>Loading your services...</Text>
        </View>
      ) : filteredServices.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="construct-outline" size={44} color="#059669" />
          </View>
          <Text style={styles.emptyTitle}>
            {searchQuery
              ? 'No matching services found'
              : activeTab === 'published'
              ? 'No live services right now'
              : 'No service offerings yet'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery
              ? 'Try searching with another keyword or trade term.'
              : 'List the trades and repair skills you excel at so nearby customers can discover and book you directly.'}
          </Text>

          <TouchableOpacity
            style={styles.emptyAddBtn}
            onPress={() => navigation.navigate('VendorNewService')}
            activeOpacity={0.85}
          >
            <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
            <Text style={styles.emptyAddBtnText}>Add Your First Service</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredServices}
          keyExtractor={(item) => item._id}
          renderItem={renderServiceCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#059669']}
              tintColor="#059669"
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  headerContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingBottom: 12
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerTitleWrap: {
    flex: 1,
    marginLeft: 12
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A'
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 1
  },
  addServiceTopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4
  },
  addServiceTopBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 12
  },
  searchIcon: {
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 0
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  tabPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9'
  },
  tabPillActive: {
    backgroundColor: '#059669'
  },
  tabPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B'
  },
  tabPillTextActive: {
    color: '#FFFFFF'
  },
  listContent: {
    padding: 16,
    paddingBottom: 40
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500'
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4
  },
  emptyAddBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2
  },
  cardImageContainer: {
    width: '100%',
    height: 140,
    position: 'relative'
  },
  cardImage: {
    width: '100%',
    height: '100%'
  },
  cardImageOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.25)'
  },
  cardTopRow: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  domainPill: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  domainPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4
  },
  cardBottomOverlayTag: {
    position: 'absolute',
    bottom: 8,
    left: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8
  },
  subcategoryTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A'
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700'
  },
  cardBody: {
    padding: 14
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 22,
    marginBottom: 4
  },
  cardDescription: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 12
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline'
  },
  priceValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#059669'
  },
  priceUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B'
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  locationText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569'
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 12
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  statText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500'
  },
  statTextBold: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '700'
  },
  statTextMuted: {
    fontSize: 12,
    color: '#94A3B8'
  },
  actionsDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 12
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6
  },
  publishBtn: {
    flex: 1,
    backgroundColor: '#059669'
  },
  pauseBtn: {
    flex: 1,
    backgroundColor: '#D97706'
  },
  editBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  deleteBtn: {
    width: 38,
    height: 38,
    paddingHorizontal: 0,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA'
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF'
  }
});

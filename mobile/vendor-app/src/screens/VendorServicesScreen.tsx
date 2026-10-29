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

export default function VendorServicesScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0
  );

  const { user } = useAuth();
  const [services, setServices] = useState<ServiceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('published');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [isUnauthenticated, setIsUnauthenticated] = useState(false);

  useEffect(() => {
    loadServices();
  }, [user, route?.params?.refresh, route?.params?.timestamp]);

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
        : `₹ ${pricing.amount || 0}`;

    return (
      <View style={styles.card}>
        {/* Top Info Row: Left Thumbnail + Right Info */}
        <View style={styles.cardTopContent}>
          <Image source={coverImage} style={styles.cardThumb} resizeMode="cover" />
          <View style={styles.cardInfoCol}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <TouchableOpacity
                onPress={() => handleDeleteService(item)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="ellipsis-vertical" size={16} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.cardPriceText}>{priceText}</Text>

            <View style={styles.cardStatsRow}>
              <View style={styles.cardStatItem}>
                <Ionicons name="briefcase-outline" size={12} color="#64748B" />
                <Text style={styles.cardStatText}>{(item as any).bookingCount ?? 0} bookings</Text>
              </View>
              <View style={styles.cardStatItem}>
                <Ionicons name="star" size={12} color="#F59E0B" />
                <Text style={styles.cardStatText}>
                  {item.reviewCount ? `${(item.rating || 5).toFixed(1)} (${item.reviewCount})` : item.rating ? item.rating.toFixed(1) : 'New'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Bottom Row: Left Status Pill + Right Action Buttons */}
        <View style={styles.cardBottomRow}>
          {item.status === 'published' ? (
            <View style={styles.activePill}>
              <Text style={styles.activePillText}>Active</Text>
            </View>
          ) : (
            <View style={styles.pausedPill}>
              <Text style={styles.pausedPillText}>Paused</Text>
            </View>
          )}

          <View style={styles.cardActionGroup}>
            <TouchableOpacity
              style={styles.cardEditBtn}
              onPress={() => navigation.navigate('VendorNewService', { service: item })}
              activeOpacity={0.75}
            >
              <Text style={styles.cardEditBtnText}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.cardToggleBtn,
                item.status === 'published' ? styles.cardPauseBtn : styles.cardActivateBtn
              ]}
              onPress={() => handleToggleStatus(item)}
              disabled={isBusy}
              activeOpacity={0.75}
            >
              {isBusy ? (
                <ActivityIndicator
                  size="small"
                  color={item.status === 'published' ? '#EF4444' : '#06684F'}
                />
              ) : (
                <Text
                  style={[
                    styles.cardToggleBtnText,
                    item.status === 'published' ? styles.cardPauseBtnText : styles.cardActivateBtnText
                  ]}
                >
                  {item.status === 'published' ? 'Pause' : 'Activate'}
                </Text>
              )}
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
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.addServiceTopBtnText}>Add Service</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Tabs matching Screen 3 */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabSegment, activeTab === 'published' && styles.tabSegmentActive]}
            onPress={() => setActiveTab('published')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabSegmentText, activeTab === 'published' && styles.tabSegmentTextActive]}>
              Active ({counts.published})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabSegment, activeTab === 'paused' && styles.tabSegmentActive]}
            onPress={() => setActiveTab('paused')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabSegmentText, activeTab === 'paused' && styles.tabSegmentTextActive]}>
              Paused ({counts.paused})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabSegment, activeTab === 'draft' && styles.tabSegmentActive]}
            onPress={() => setActiveTab('draft')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabSegmentText, activeTab === 'draft' && styles.tabSegmentTextActive]}>
              Draft ({counts.draft})
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
            Please sign in to your WorkLogy contractor account to list your trade skills, manage pricing, and receive direct customer bookings.
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
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 1
  },
  cardTopContent: {
    flexDirection: 'row',
    gap: 12
  },
  cardThumb: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: '#F1F5F9'
  },
  cardInfoCol: {
    flex: 1,
    justifyContent: 'space-between'
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    marginRight: 6
  },
  cardPriceText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#06684F',
    marginVertical: 2
  },
  cardStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  cardStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  cardStatText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600'
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },
  activePill: {
    backgroundColor: '#ECFDF5',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0'
  },
  activePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#06684F'
  },
  pausedPill: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A'
  },
  pausedPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706'
  },
  cardActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  cardEditBtn: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF'
  },
  cardEditBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155'
  },
  cardToggleBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    minWidth: 64,
    alignItems: 'center'
  },
  cardPauseBtn: {
    borderColor: '#FCA5A5'
  },
  cardActivateBtn: {
    borderColor: '#86EFAC'
  },
  cardToggleBtnText: {
    fontSize: 12,
    fontWeight: '700'
  },
  cardPauseBtnText: {
    color: '#EF4444'
  },
  cardActivateBtnText: {
    color: '#06684F'
  },
  tabSegment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent'
  },
  tabSegmentActive: {
    borderBottomColor: '#06684F'
  },
  tabSegmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B'
  },
  tabSegmentTextActive: {
    color: '#06684F',
    fontWeight: '800'
  }
});

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Dimensions
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { api } from '../api/client';
import { COLORS } from '../theme/colors';
import { renderCategoryIcon } from '../utils/categoryIcons';
import { getServiceImage } from '../utils/serviceImages';
import type { ServiceCategory } from '../types';

interface CategoriesScreenProps {
  navigation: any;
  route?: any;
}

export default function CategoriesScreen({ navigation, route }: CategoriesScreenProps) {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>(route?.params?.search || '');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');

  const fetchCategories = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const res = await api.categories.getAll();
      if (res?.categories && Array.isArray(res.categories)) {
        setCategories(res.categories);
      } else {
        setError('No service categories returned from the server.');
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to connect to service catalog. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCategories(true);
  }, [fetchCategories]);

  // Trade groups for quick horizontal filtering
  const groups = [
    { id: 'all', label: 'All Services' },
    { id: 'electrical', label: 'Electrical & AC' },
    { id: 'plumbing', label: 'Plumbing & Water' },
    { id: 'carpentry', label: 'Carpentry & Furniture' },
    { id: 'cleaning', label: 'Cleaning & Pest' },
    { id: 'repairs', label: 'Appliance Repairs' }
  ];

  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      // 1. Group filtering
      if (selectedGroup !== 'all') {
        const slug = (cat.slug || '').toLowerCase();
        const name = (cat.name || '').toLowerCase();
        if (selectedGroup === 'electrical' && !slug.includes('electric') && !slug.includes('ac-') && !slug.includes('hvac')) {
          return false;
        }
        if (selectedGroup === 'plumbing' && !slug.includes('plumb') && !slug.includes('water') && !slug.includes('ro-')) {
          return false;
        }
        if (selectedGroup === 'carpentry' && !slug.includes('carpent') && !slug.includes('furniture')) {
          return false;
        }
        if (selectedGroup === 'cleaning' && !slug.includes('clean') && !slug.includes('pest') && !slug.includes('sanitiz')) {
          return false;
        }
        if (selectedGroup === 'repairs' && !slug.includes('repair') && !slug.includes('appliance')) {
          return false;
        }
      }

      // 2. Search query filtering
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const nameMatches = cat.name.toLowerCase().includes(q);
      const descMatches = cat.description ? cat.description.toLowerCase().includes(q) : false;
      const subMatches = Array.isArray(cat.subcategories)
        ? cat.subcategories.some((s) => {
            const sName = typeof s === 'string' ? s : s?.name || '';
            return sName.toLowerCase().includes(q);
          })
        : false;

      return nameMatches || descMatches || subMatches;
    });
  }, [categories, selectedGroup, searchQuery]);

  const handleSelectCategory = (cat: ServiceCategory) => {
    navigation.navigate('CategoryDetail', {
      slug: cat.slug,
      name: cat.name,
      categoryId: cat._id
    });
  };

  return (
    <View style={styles.container}>
      {/* 1. Header Search Bar & Subtitle */}
      <View style={styles.headerArea}>
        <View style={styles.searchBarWrapper}>
          <Ionicons name="search-outline" size={18} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by trade (e.g. Electrician, AC, Plumber)..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery.trim().length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* 2. Horizontal Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.groupScroll}
        >
          {groups.map((grp) => {
            const isActive = selectedGroup === grp.id;
            return (
              <TouchableOpacity
                key={grp.id}
                style={[styles.groupPill, isActive && styles.groupPillActive]}
                onPress={() => setSelectedGroup(grp.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.groupPillText, isActive && styles.groupPillTextActive]}>
                  {grp.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 3. Main Content: Loading, Error, Empty, or Category Cards Grid */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading verified service categories...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color="#EF4444" />
          <Text style={styles.errorTitle}>Catalog Unavailable</Text>
          <Text style={styles.errorSub}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchCategories()} activeOpacity={0.8}>
            <Ionicons name="refresh" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filteredCategories.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="folder-open-outline" size={48} color="#94A3B8" />
          <Text style={styles.emptyTitle}>No Matching Categories</Text>
          <Text style={styles.emptySub}>
            {searchQuery
              ? `No services matched "${searchQuery}". Try a different keyword.`
              : 'No service categories found for this filter.'}
          </Text>
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => {
              setSearchQuery('');
              setSelectedGroup('all');
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.clearBtnText}>Reset Filters</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.listContainer}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        >
          <View style={styles.countBadgeRow}>
            <Text style={styles.countHeading}>Available Trade Categories</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{filteredCategories.length} Categories</Text>
            </View>
          </View>

          <View style={styles.grid}>
            {filteredCategories.map((item) => {
              const subcount = Array.isArray(item.subcategories) ? item.subcategories.length : 0;
              const subList = Array.isArray(item.subcategories)
                ? item.subcategories.slice(0, 3).map((s) => (typeof s === 'string' ? s : s?.name || ''))
                : [];

              return (
                <TouchableOpacity
                  key={item._id}
                  style={styles.card}
                  activeOpacity={0.88}
                  onPress={() => handleSelectCategory(item)}
                >
                  <View style={styles.cardImageContainer}>
                    <Image
                      source={getServiceImage(item.slug || item.name)}
                      style={styles.cardThumbnail}
                      resizeMode="cover"
                    />
                    <View style={styles.cardIconBadge}>
                      {renderCategoryIcon(item.slug || item.icon, 14, '#FFFFFF')}
                    </View>
                    {subcount > 0 && (
                      <View style={styles.tasksPill}>
                        <Text style={styles.tasksPillText}>{subcount} tasks</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Feather name="arrow-up-right" size={15} color="#059669" />
                    </View>

                    <Text style={styles.cardDesc} numberOfLines={2}>
                      {item.description || 'Verified licensed technicians with upfront standardized rates.'}
                    </Text>

                    {/* Subcategory Pills */}
                    {subList.length > 0 && (
                      <View style={styles.subtagsRow}>
                        {subList.map((tagStr, tIdx) => (
                          <View key={tIdx} style={styles.subtagPill}>
                            <Text style={styles.subtagPillText} numberOfLines={1}>
                              {tagStr}
                            </Text>
                          </View>
                        ))}
                        {subcount > 3 && (
                          <View style={[styles.subtagPill, styles.subtagMorePill]}>
                            <Text style={styles.subtagMoreText}>+{subcount - 3}</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  headerArea: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingTop: 10,
    paddingBottom: 8,
    paddingHorizontal: 16
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  searchIcon: {
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '500'
  },
  groupScroll: {
    paddingVertical: 8,
    gap: 8
  },
  groupPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  groupPillActive: {
    backgroundColor: '#ECFDF5',
    borderColor: COLORS.primary
  },
  groupPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B'
  },
  groupPillTextActive: {
    color: COLORS.primary,
    fontWeight: '700'
  },
  listContainer: {
    flex: 1
  },
  listContent: {
    padding: 16,
    paddingBottom: 32
  },
  countBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  countHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A'
  },
  countBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary
  },
  grid: {
    gap: 12
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
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
    height: 120,
    backgroundColor: '#F1F5F9',
    position: 'relative'
  },
  cardThumbnail: {
    width: '100%',
    height: '100%'
  },
  cardIconBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3
  },
  tasksPill: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10
  },
  tasksPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  cardContent: {
    padding: 12
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
    marginRight: 8
  },
  cardDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
    marginBottom: 8
  },
  subtagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  subtagPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  subtagPillText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600'
  },
  subtagMorePill: {
    backgroundColor: '#E2E8F0'
  },
  subtagMoreText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700'
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600'
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 12,
    marginBottom: 4
  },
  errorSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 12,
    marginBottom: 4
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16
  },
  clearBtn: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  clearBtnText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 13
  }
});

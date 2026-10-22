import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { api } from '../api/client';
import { COLORS } from '../theme/colors';
import type { ServiceCategory } from '../types';

export default function ExploreScreen({ navigation, route }: any) {
  const initialSearch = route?.params?.search || '';
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [activeGroup, setActiveGroup] = useState<'all' | 'maintenance' | 'repairs' | 'moving' | 'personal'>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const res = await api.categories.getAll();
      if (res?.categories) {
        setCategories(res.categories);
      }
    } catch (err) {
      console.warn('Failed to load categories:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadCategories();
  };

  const filteredCategories = categories.filter((cat) => {
    const matchesSearch =
      cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cat.subcategories?.some((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (activeGroup === 'all') return true;
    if (activeGroup === 'maintenance') {
      return ['cleaning', 'plumbing', 'pest-control', 'waterproofing'].some((k) => cat.slug?.includes(k));
    }
    if (activeGroup === 'repairs') {
      return ['electrician', 'appliance', 'ac-repair', 'carpentry'].some((k) => cat.slug?.includes(k));
    }
    if (activeGroup === 'moving') {
      return ['packers-movers', 'masonry', 'painting'].some((k) => cat.slug?.includes(k));
    }
    return true;
  });

  const renderCategoryItem = ({ item }: { item: ServiceCategory }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('CategoryDetail', { slug: item.slug, name: item.name })}
    >
      <View style={styles.cardIconBox}>
        <Text style={styles.cardIcon}>{item.icon || '🛠️'}</Text>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={styles.cardDesc} numberOfLines={2}>
          {item.description || `${item.subcategories?.length || 4} verified local services available`}
        </Text>
        <View style={styles.tagRow}>
          {item.subcategories?.slice(0, 3).map((sub, i) => (
            <View key={i} style={styles.tag}>
              <Text style={styles.tagText}>{sub.name}</Text>
            </View>
          ))}
        </View>
      </View>
      <Text style={styles.cardChevron}>›</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Explore 30 Trade Domains</Text>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by trade or task..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Group Filter Chips */}
        <View style={styles.filterRow}>
          {[
            { id: 'all', label: 'All Trades' },
            { id: 'repairs', label: 'Repairs & Fix' },
            { id: 'maintenance', label: 'Home Care' },
            { id: 'moving', label: 'Moving & Civil' }
          ].map((chip) => (
            <TouchableOpacity
              key={chip.id}
              style={[styles.chip, activeGroup === chip.id && styles.chipActive]}
              onPress={() => setActiveGroup(chip.id as any)}
            >
              <Text style={[styles.chipText, activeGroup === chip.id && styles.chipTextActive]}>
                {chip.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Categories Feed */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading canonical trades catalog...</Text>
        </View>
      ) : filteredCategories.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🔎</Text>
          <Text style={styles.emptyTitle}>No matching services found</Text>
          <Text style={styles.emptySubtitle}>Try searching for a different keyword or trade name.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredCategories}
          keyExtractor={(item) => item._id || item.slug}
          renderItem={renderCategoryItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
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
    color: COLORS.textDark,
    marginBottom: 10
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textDark
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9'
  },
  chipActive: {
    backgroundColor: COLORS.primary
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary
  },
  chipTextActive: {
    color: '#FFFFFF'
  },
  listContent: {
    padding: 16,
    gap: 12
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2
  },
  cardIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  cardIcon: {
    fontSize: 22
  },
  cardContent: {
    flex: 1
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textDark
  },
  cardDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 15
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6
  },
  tag: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  tagText: {
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.textMuted
  },
  cardChevron: {
    fontSize: 20,
    color: COLORS.textMuted,
    marginLeft: 8
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingText: {
    marginTop: 10,
    fontSize: 12,
    color: COLORS.textSecondary
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30
  },
  emptyEmoji: {
    fontSize: 36,
    marginBottom: 8
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark
  },
  emptySubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4
  }
});

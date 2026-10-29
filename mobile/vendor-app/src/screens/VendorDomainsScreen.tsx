import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, getStoredAuthToken } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { COLORS } from '../theme/colors';

const MAX_DOMAINS = 3;

export default function VendorDomainsScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0
  );

  const { user, refreshProfile } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [availableCategories, setAvailableCategories] = useState<any[]>([]);
  const [selectedDomainIds, setSelectedDomainIds] = useState<string[]>([]);
  const [activeBrowsingDomainId, setActiveBrowsingDomainId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const token = await getStoredAuthToken();
      if (!token) {
        navigation.navigate('VendorLogin');
        return;
      }

      const [profRes, catRes] = await Promise.all([
        api.vendors.getProfile().catch(() => ({ vendor: null })),
        api.categories.getAll().catch(() => ({ categories: [] }))
      ]);

      const vendor = profRes?.vendor;
      if (vendor) {
        setProfile(vendor);
        const registeredIds: string[] = Array.isArray(vendor.categories)
          ? vendor.categories.map((c: any) => (c._id || c).toString())
          : [];
        setSelectedDomainIds(registeredIds);
      }

      const allCats: any[] = Array.isArray(catRes) ? catRes : catRes?.categories || [];
      setAvailableCategories(allCats);
    } catch (err: any) {
      console.warn('Failed to load domains management data:', err);
      Alert.alert('Load Error', err?.message || 'Unable to load service domains.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigation]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Toggle selection
  const handleToggleDomain = (domainId: string) => {
    if (selectedDomainIds.includes(domainId)) {
      if (selectedDomainIds.length <= 1) {
        Alert.alert(
          'Domain Required',
          'A vendor must have at least 1 service domain selected so you can receive eligible job opportunities.'
        );
        return;
      }
      setSelectedDomainIds(selectedDomainIds.filter((id) => id !== domainId));
      if (activeBrowsingDomainId === domainId) {
        setActiveBrowsingDomainId(null);
      }
    } else {
      if (selectedDomainIds.length >= MAX_DOMAINS) {
        Alert.alert(
          'Domain Limit Reached (3 Max)',
          `You can select a maximum of ${MAX_DOMAINS} service domains. Please remove an existing domain above to add this one.`
        );
        return;
      }
      setSelectedDomainIds([...selectedDomainIds, domainId]);
    }
  };

  const handleRemoveDomain = (domainId: string, domainName: string) => {
    if (selectedDomainIds.length <= 1) {
      Alert.alert(
        'Minimum 1 Domain Required',
        'You must maintain at least 1 active service domain so your contractor profile remains eligible for customer jobs.'
      );
      return;
    }

    Alert.alert(
      'Remove Service Domain?',
      `Are you sure you want to remove "${domainName}" from your active service domains? You will no longer receive new leads for this trade.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setSelectedDomainIds(selectedDomainIds.filter((id) => id !== domainId));
            if (activeBrowsingDomainId === domainId) {
              setActiveBrowsingDomainId(null);
            }
          }
        }
      ]
    );
  };

  const handleSaveChanges = async () => {
    if (selectedDomainIds.length === 0) {
      Alert.alert('Domain Required', 'Please select at least 1 service domain.');
      return;
    }

    if (selectedDomainIds.length > MAX_DOMAINS) {
      Alert.alert('Limit Exceeded', `You can select a maximum of ${MAX_DOMAINS} domains.`);
      return;
    }

    try {
      setSaving(true);
      const res = await api.vendors.updateProfile({
        categories: selectedDomainIds,
        serviceDomainIds: selectedDomainIds
      } as any);

      if (res?.success) {
        if (res.vendor) setProfile(res.vendor);
        if (refreshProfile) await refreshProfile();

        Alert.alert(
          'Domains Updated Successfully 🎉',
          `Your service domains (${selectedDomainIds.length} of ${MAX_DOMAINS}) have been updated. Your jobs feed and notifications are now synchronized.`,
          [
            {
              text: 'Browse Jobs Feed',
              onPress: () => {
                navigation.navigate('JobsTab', {
                  category: activeBrowsingDomainId || 'all',
                  initialTab: 'all'
                });
              }
            },
            {
              text: 'Stay on Profile',
              style: 'cancel'
            }
          ]
        );
      }
    } catch (err: any) {
      Alert.alert('Update Failed', err?.message || 'Could not update service domains.');
    } finally {
      setSaving(false);
    }
  };

  const handleNavigateToFeed = (domainId: string | null) => {
    setActiveBrowsingDomainId(domainId);
    navigation.navigate('JobsTab', {
      category: domainId || 'all',
      initialTab: 'all'
    });
  };

  // Derive domain objects for selected IDs
  const selectedDomainObjects = selectedDomainIds.map((id) => {
    const found = availableCategories.find(
      (c) => (c._id || c.id || c).toString() === id.toString()
    );
    if (found) return found;
    // Check inside profile categories populated docs
    const profFound = profile?.categories?.find(
      (c: any) => (c._id || c).toString() === id.toString()
    );
    return profFound || { _id: id, name: 'Service Domain', slug: '' };
  });

  const unselectedCategories = availableCategories.filter(
    (c) => !selectedDomainIds.includes((c._id || c.id || c).toString())
  );

  const approvalStatus = profile?.approvalStatus || 'pending';
  const isApproved = approvalStatus === 'approved';

  if (loading && !refreshing) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: topInset }]}>
        <ActivityIndicator size="large" color="#065F46" />
        <Text style={styles.loadingText}>Loading your service domains...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ── HEADER ── */}
      <View style={[styles.headerBar, { paddingTop: topInset + 6 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitle}>My Domains</Text>
          <Text style={styles.headerSubtitle}>Manage & switch service categories</Text>
        </View>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={() => loadData(true)}
          disabled={refreshing}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="refresh" size={20} color="#065F46" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            colors={['#065F46']}
          />
        }
      >
        {/* ── 1. STATUS & DOMAIN LIMIT CARD ── */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeaderRow}>
            <View style={styles.domainLimitBadge}>
              <Ionicons name="layers" size={14} color="#065F46" />
              <Text style={styles.domainLimitText}>
                {selectedDomainIds.length} of {MAX_DOMAINS} Domains Selected
              </Text>
            </View>

            <View
              style={[
                styles.approvalBadge,
                isApproved ? styles.approvalBadgeApproved : styles.approvalBadgePending
              ]}
            >
              <Ionicons
                name={isApproved ? 'checkmark-circle' : 'time'}
                size={12}
                color={isApproved ? '#065F46' : '#B45309'}
              />
              <Text
                style={[
                  styles.approvalBadgeText,
                  isApproved ? styles.approvalTextApproved : styles.approvalTextPending
                ]}
              >
                {isApproved ? 'Approved' : 'Pending Review'}
              </Text>
            </View>
          </View>

          <Text style={styles.statusDescription}>
            Your Jobs Feed strictly reflects only these selected domains in Lucknow. Switch your active browsing domain below or add up to 3 domains.
          </Text>
        </View>

        {/* ── 2. ACTIVE BROWSING DOMAIN SWITCHER ── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="compass-outline" size={18} color="#065F46" />
              <Text style={styles.sectionTitle}>Active Browsing Domain</Text>
            </View>
            <Text style={styles.activePillHint}>Filter Jobs Feed</Text>
          </View>
          <Text style={styles.sectionSubtext}>
            Choose which domain you want to browse right now in the unified marketplace:
          </Text>

          <View style={styles.switcherPillsRow}>
            {/* All My Domains pill */}
            <TouchableOpacity
              style={[
                styles.switcherPill,
                activeBrowsingDomainId === null && styles.switcherPillActive
              ]}
              onPress={() => setActiveBrowsingDomainId(null)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={activeBrowsingDomainId === null ? 'checkmark-circle' : 'grid-outline'}
                size={14}
                color={activeBrowsingDomainId === null ? '#FFFFFF' : '#475569'}
                style={{ marginRight: 5 }}
              />
              <Text
                style={[
                  styles.switcherPillText,
                  activeBrowsingDomainId === null && styles.switcherPillTextActive
                ]}
              >
                All My Domains
              </Text>
            </TouchableOpacity>

            {/* Individual Domain pills */}
            {selectedDomainObjects.map((dom) => {
              const domIdStr = (dom._id || dom.id || dom).toString();
              const isPillActive = activeBrowsingDomainId === domIdStr;

              return (
                <TouchableOpacity
                  key={domIdStr}
                  style={[styles.switcherPill, isPillActive && styles.switcherPillActive]}
                  onPress={() => setActiveBrowsingDomainId(domIdStr)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={isPillActive ? 'checkmark-circle' : 'radio-button-off'}
                    size={14}
                    color={isPillActive ? '#FFFFFF' : '#475569'}
                    style={{ marginRight: 5 }}
                  />
                  <Text
                    style={[
                      styles.switcherPillText,
                      isPillActive && styles.switcherPillTextActive
                    ]}
                  >
                    {dom.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={styles.browseActionBtn}
            onPress={() => handleNavigateToFeed(activeBrowsingDomainId)}
            activeOpacity={0.85}
          >
            <Text style={styles.browseActionBtnText}>
              Browse Jobs in{' '}
              {activeBrowsingDomainId
                ? selectedDomainObjects.find(
                    (d) => (d._id || d.id || d).toString() === activeBrowsingDomainId
                  )?.name || 'Domain'
                : 'All My Domains'}{' '}
              ➔
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── 3. REGISTERED DOMAINS LIST ── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="checkbox-outline" size={18} color="#065F46" />
              <Text style={styles.sectionTitle}>
                Registered Domains ({selectedDomainIds.length}/{MAX_DOMAINS})
              </Text>
            </View>
          </View>

          <View style={styles.domainsList}>
            {selectedDomainObjects.map((dom, index) => {
              const domIdStr = (dom._id || dom.id || dom).toString();
              return (
                <View key={domIdStr} style={styles.domainItemCard}>
                  <View style={styles.domainLeftCol}>
                    <View style={styles.domainIconCircle}>
                      <Ionicons name="construct-outline" size={18} color="#065F46" />
                    </View>
                    <View style={styles.domainTextCol}>
                      <Text style={styles.domainItemName}>{dom.name}</Text>
                      <View style={styles.domainItemMetaRow}>
                        <View
                          style={[
                            styles.domainStatusDot,
                            { backgroundColor: isApproved ? '#10B981' : '#F59E0B' }
                          ]}
                        />
                        <Text style={styles.domainStatusText}>
                          {isApproved ? 'Approved Domain' : 'Pending Review'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.removeDomainBtn}
                    onPress={() => handleRemoveDomain(domIdStr, dom.name)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── 4. ADD ANOTHER SERVICE DOMAIN ── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="add-circle-outline" size={18} color="#065F46" />
              <Text style={styles.sectionTitle}>Add Service Domains</Text>
            </View>
          </View>

          {selectedDomainIds.length >= MAX_DOMAINS ? (
            <View style={styles.maxReachedBox}>
              <Ionicons name="information-circle" size={18} color="#065F46" />
              <Text style={styles.maxReachedText}>
                You have selected the maximum of 3 domains. To add another trade category, please remove one of your existing domains above.
              </Text>
            </View>
          ) : (
            <View>
              <Text style={styles.sectionSubtext}>
                Select up to {MAX_DOMAINS - selectedDomainIds.length} more certified service domain(s) from our canonical catalogue:
              </Text>

              <View style={styles.availableDomainsGrid}>
                {unselectedCategories.map((cat) => {
                  const catIdStr = (cat._id || cat.id || cat).toString();
                  return (
                    <TouchableOpacity
                      key={catIdStr}
                      style={styles.addDomainChip}
                      onPress={() => handleToggleDomain(catIdStr)}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="add" size={14} color="#065F46" style={{ marginRight: 4 }} />
                      <Text style={styles.addDomainChipText}>{cat.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        <View style={{ height: 90 }} />
      </ScrollView>

      {/* ── 5. STICKY BOTTOM SAVE BAR ── */}
      <View style={[styles.bottomSaveBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSaveChanges}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <View style={styles.savingRow}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.saveBtnText}>Saving & Synchronizing...</Text>
            </View>
          ) : (
            <Text style={styles.saveBtnText}>Save Domain Changes 💾</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600'
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0'
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9'
  },
  headerTitleCol: {
    flex: 1,
    marginLeft: 12
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A'
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5'
  },
  scrollContent: {
    padding: 16,
    gap: 14
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1
  },
  statusHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  domainLimitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0'
  },
  domainLimitText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#065F46'
  },
  approvalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1
  },
  approvalBadgeApproved: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0'
  },
  approvalBadgePending: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A'
  },
  approvalBadgeText: {
    fontSize: 10,
    fontWeight: '700'
  },
  approvalTextApproved: {
    color: '#065F46'
  },
  approvalTextPending: {
    color: '#B45309'
  },
  statusDescription: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A'
  },
  activePillHint: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  sectionSubtext: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 12,
    lineHeight: 16
  },
  switcherPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12
  },
  switcherPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1'
  },
  switcherPillActive: {
    backgroundColor: '#065F46',
    borderColor: '#064E3B'
  },
  switcherPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155'
  },
  switcherPillTextActive: {
    color: '#FFFFFF'
  },
  browseActionBtn: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4
  },
  browseActionBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#166534'
  },
  domainsList: {
    gap: 8
  },
  domainItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  domainLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1
  },
  domainIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center'
  },
  domainTextCol: {
    flex: 1
  },
  domainItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A'
  },
  domainItemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2
  },
  domainStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3
  },
  domainStatusText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600'
  },
  removeDomainBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center'
  },
  maxReachedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0'
  },
  maxReachedText: {
    fontSize: 11,
    color: '#065F46',
    fontWeight: '600',
    flex: 1,
    lineHeight: 16
  },
  availableDomainsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7
  },
  addDomainChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1'
  },
  addDomainChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155'
  },
  bottomSaveBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 8
  },
  saveBtn: {
    backgroundColor: '#065F46',
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  saveBtnDisabled: {
    opacity: 0.65
  },
  savingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800'
  }
});

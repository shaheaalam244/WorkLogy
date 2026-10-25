import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
  ScrollView
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../api/client';
import { COLORS } from '../theme/colors';
import { detectGpsLocation, saveLocation } from '../services/locationService';
import { CANONICAL_LOCALITIES, LocalityItem } from '../constants/zonesData';
import type { ServiceAddress } from '../types';

interface LocationModalProps {
  visible: boolean;
  currentLocation: string;
  onClose: () => void;
  onSelectLocation: (loc: string, addressDetails?: ServiceAddress & { mode?: 'nearby' | 'job'; zoneId?: string }) => void;
}

export default function LocationModal({
  visible,
  currentLocation,
  onClose,
  onSelectLocation
}: LocationModalProps) {
  const [search, setSearch] = useState('');
  const [searchMode, setSearchMode] = useState<'nearby' | 'job'>('nearby');
  const [savedAddresses, setSavedAddresses] = useState<ServiceAddress[]>([]);
  const [localitiesList, setLocalitiesList] = useState<LocalityItem[]>(CANONICAL_LOCALITIES);
  const [selectedZoneFilter, setSelectedZoneFilter] = useState<string>('ALL');
  const [detectingGps, setDetectingGps] = useState(false);

  useEffect(() => {
    if (visible) {
      loadSavedAddresses();
      fetchOnlineLocalities();
    }
  }, [visible]);

  const fetchOnlineLocalities = async () => {
    try {
      const res = await api.zones.getLocalities();
      if (res?.localities && res.localities.length > 0) {
        setLocalitiesList(res.localities);
      }
    } catch {
      // Fallback to embedded CANONICAL_LOCALITIES
    }
  };

  const loadSavedAddresses = async () => {
    try {
      const res = await api.customer.getAddresses();
      if (res?.addresses && Array.isArray(res.addresses)) {
        // Prioritize active default address at top ("jo active rhe wo aaye")
        const sorted = [...res.addresses].sort((a, b) => {
          if (a.isDefault && !b.isDefault) return -1;
          if (!a.isDefault && b.isDefault) return 1;
          return 0;
        });
        setSavedAddresses(sorted);
      }
    } catch {
      setSavedAddresses([]);
    }
  };

  const handleSelectSavedAddress = async (addr: ServiceAddress) => {
    const city = addr.city || 'Lucknow';
    const streetParts = [addr.houseNumber, addr.street, addr.locality || addr.landmark].filter(Boolean);
    const streetCombined = streetParts.join(', ');
    const displayLabel = streetCombined
      ? `${city}, ${streetCombined}`
      : addr.locality
      ? `${city}, ${addr.locality}`
      : city;

    // Persist as default on backend if address has an ID
    if (addr._id) {
      try {
        await api.customer.setDefaultAddress(addr._id);
      } catch (err) {
        console.warn('Failed to sync active address to backend:', err);
      }
    }

    // Match canonical coordinates & zone if coordinates are missing or zero
    let coords = addr.coordinates;
    let zoneId = (addr as any).zoneId;
    let zoneName = (addr as any).zoneName;

    if (!coords || (Number(coords.lat) === 0 && Number(coords.lng) === 0)) {
      const match = localitiesList.find(
        (l) =>
          (addr.locality && l.name.toLowerCase() === addr.locality.toLowerCase()) ||
          (addr.street && l.name.toLowerCase() === addr.street.toLowerCase())
      );
      if (match) {
        coords = match.coordinates;
        zoneId = match.zoneId;
        zoneName = match.zoneName;
      }
    }

    const addressDetails: ServiceAddress & { mode: 'nearby' | 'job'; zoneId?: string; zoneName?: string } = {
      ...addr,
      street: addr.street || streetCombined,
      locality: addr.locality || addr.landmark || addr.street || '',
      city,
      coordinates: coords,
      mode: searchMode,
      zoneId,
      zoneName,
      isDefault: true
    };

    await saveLocation(displayLabel, { ...addressDetails, isExplicit: true, addressId: addr._id });
    onSelectLocation(displayLabel, addressDetails);
    onClose();
  };

  const handleSelectEnteredSearch = async () => {
    const trimmed = search.trim();
    if (!trimmed) return;

    // Check if trimmed matches or mentions a canonical locality (e.g. "IIM Road", "IIM Lucknow", "Gomti Nagar")
    const lower = trimmed.toLowerCase();
    const matchedLocality = localitiesList.find(
      (l) =>
        lower.includes(l.name.toLowerCase()) ||
        l.name.toLowerCase().includes(lower) ||
        (lower.includes('iim') && l.name.toLowerCase().includes('iim'))
    );

    const displayLabel = trimmed.toLowerCase().includes('lucknow') ? trimmed : `Lucknow, ${trimmed}`;
    const addressDetails: ServiceAddress & { mode: 'nearby' | 'job'; zoneId?: string; zoneName?: string } = {
      street: trimmed,
      locality: matchedLocality ? matchedLocality.name : trimmed,
      city: 'Lucknow',
      state: 'Uttar Pradesh',
      pincode: '226010',
      coordinates: matchedLocality?.coordinates,
      zoneId: matchedLocality?.zoneId,
      zoneName: matchedLocality?.zoneName,
      mode: searchMode
    };

    await saveLocation(displayLabel, { ...addressDetails, isExplicit: true });
    onSelectLocation(displayLabel, addressDetails);
    onClose();
  };

  // Distinct Zones for Filter Chips
  const zoneChips = useMemo(() => {
    const zones = Array.from(new Set(localitiesList.map((l) => l.zoneId))).sort();
    return ['ALL', ...zones];
  }, [localitiesList]);

  // Filtered Localities
  const filteredLocalities = useMemo(() => {
    const q = search.trim().toLowerCase();
    return localitiesList.filter((item) => {
      const matchZone = selectedZoneFilter === 'ALL' || item.zoneId === selectedZoneFilter;
      const matchQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.zoneId.toLowerCase().includes(q) ||
        item.zoneName.toLowerCase().includes(q);
      return matchZone && matchQuery;
    });
  }, [localitiesList, search, selectedZoneFilter]);

  const handleSelectLocality = async (item: LocalityItem) => {
    const displayLabel = `${item.city || 'Lucknow'}, ${item.name}`;
    const addressDetails: ServiceAddress & { mode: 'nearby' | 'job'; zoneId: string; zoneName: string } = {
      street: item.name,
      locality: item.name,
      city: item.city || 'Lucknow',
      state: 'Uttar Pradesh',
      pincode: '226010',
      coordinates: item.coordinates,
      mode: searchMode,
      zoneId: item.zoneId,
      zoneName: item.zoneName
    };

    await saveLocation(displayLabel, { ...addressDetails, isExplicit: true });
    onSelectLocation(displayLabel, addressDetails);
    onClose();
  };

  const handleUseGpsLocation = async () => {
    try {
      setDetectingGps(true);
      const res = await detectGpsLocation();
      if (!res.success || !res.location) {
        Alert.alert(
          'GPS Location Unavailable',
          res.error || 'Could not obtain precise GPS coordinates. Please select your locality from the list below.'
        );
        return;
      }

      const detected = res.location;

      // Attempt to resolve canonical zone & locality from backend
      let resolvedZoneId = '';
      let resolvedZoneName = '';
      let resolvedLocality = detected.locality || '';

      if (detected.coordinates?.lat && detected.coordinates?.lng) {
        try {
          const zoneRes = await api.zones.resolveLocation({
            lat: detected.coordinates.lat,
            lng: detected.coordinates.lng
          });
          if (zoneRes?.resolved) {
            resolvedZoneId = zoneRes.resolved.zoneId;
            resolvedZoneName = zoneRes.resolved.zoneName;
            resolvedLocality = zoneRes.resolved.locality || resolvedLocality;
          }
        } catch {
          // ignore
        }
      }

      const cityLabel = detected.city || (resolvedZoneId?.startsWith('LKO') ? 'Lucknow' : '');
      const displayLabel = resolvedLocality
        ? `${cityLabel ? cityLabel + ', ' : ''}${resolvedLocality}`
        : detected.fullAddress;

      const addressDetails: ServiceAddress & { mode: 'nearby' | 'job'; zoneId?: string; zoneName?: string } = {
        street: detected.street || resolvedLocality,
        locality: resolvedLocality,
        city: cityLabel || 'Lucknow',
        pincode: detected.pincode,
        state: detected.state,
        coordinates: detected.coordinates,
        mode: 'nearby',
        zoneId: resolvedZoneId,
        zoneName: resolvedZoneName
      };

      await saveLocation(detected, { ...addressDetails, isExplicit: true });
      onSelectLocation(displayLabel, addressDetails);
      onClose();
    } catch {
      Alert.alert(
        'GPS Location Unavailable',
        'Could not obtain precise GPS coordinates. Please select your locality from the list below.'
      );
    } finally {
      setDetectingGps(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>Choose Service Location</Text>
              <Text style={styles.sheetSubtitle}>18 Zones • 90 Hyperlocal Areas in Lucknow</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={COLORS.textDark} />
            </TouchableOpacity>
          </View>

          {/* Mode Switcher Tabs */}
          <View style={styles.modeTabsRow}>
            <TouchableOpacity
              style={[styles.modeTab, searchMode === 'nearby' && styles.modeTabActive]}
              onPress={() => setSearchMode('nearby')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="navigate"
                size={14}
                color={searchMode === 'nearby' ? COLORS.primary : COLORS.textMuted}
              />
              <Text style={[styles.modeTabText, searchMode === 'nearby' && styles.modeTabTextActive]}>
                Find Nearby Vendors
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeTab, searchMode === 'job' && styles.modeTabActive]}
              onPress={() => setSearchMode('job')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="briefcase-outline"
                size={14}
                color={searchMode === 'job' ? COLORS.primary : COLORS.textMuted}
              />
              <Text style={[styles.modeTabText, searchMode === 'job' && styles.modeTabTextActive]}>
                Vendors for Job Address
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modeDescriptionBox}>
            <Text style={styles.modeDescriptionText}>
              {searchMode === 'nearby'
                ? '📍 Discover nearest verified professionals to your current live location.'
                : '💼 Select the address where service is needed — even if you are currently somewhere else.'}
            </Text>
          </View>

          {/* Search Field */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search locality (e.g. Indira Nagar, Gomti Nagar, Aliganj)..."
              placeholderTextColor={COLORS.textMuted}
              value={search}
              onChangeText={setSearch}
              autoFocus={false}
              returnKeyType="done"
              onSubmitEditing={handleSelectEnteredSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Quick Action: Use Entered Search Location */}
          {search.trim().length > 0 && (
            <TouchableOpacity
              style={styles.enteredLocationPrompt}
              onPress={handleSelectEnteredSearch}
              activeOpacity={0.8}
            >
              <View style={styles.enteredIconCircle}>
                <Ionicons name="location" size={14} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.enteredPromptTitle}>Use entered location</Text>
                <Text style={styles.enteredPromptQuery} numberOfLines={1}>
                  "{search.trim()}"
                </Text>
              </View>
              <Ionicons name="arrow-forward-circle" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          )}

          {/* GPS Auto-detect Button */}
          <TouchableOpacity
            style={styles.gpsButton}
            onPress={handleUseGpsLocation}
            disabled={detectingGps}
            activeOpacity={0.85}
          >
            <View style={styles.gpsIconCircle}>
              {detectingGps ? (
                <ActivityIndicator size="small" color="#059669" />
              ) : (
                <MaterialCommunityIcons name="crosshairs-gps" size={20} color="#059669" />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.gpsTitle}>Use Current GPS Location</Text>
              <Text style={styles.gpsSubtitle}>Auto-resolve nearest Lucknow zone & eligible vendors</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          {/* Saved Addresses Section (placed ABOVE zone filter chips; active address appears first) */}
          {savedAddresses.length > 0 && search.length === 0 && (
            <View style={styles.sectionBox}>
              <View style={styles.savedSectionHeader}>
                <Text style={styles.sectionLabel}>SAVED ADDRESSES</Text>
                <Text style={styles.savedSectionHint}>Active addresses from your profile</Text>
              </View>
              {savedAddresses.slice(0, 3).map((addr, idx) => (
                <TouchableOpacity
                  key={addr._id || idx}
                  style={styles.savedAddrRow}
                  onPress={() => handleSelectSavedAddress(addr)}
                >
                  <Ionicons name="bookmark" size={16} color={COLORS.primary} style={{ marginTop: 2 }} />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.savedAddrTitle}>{addr.label || addr.landmark || addr.street || 'Address'}</Text>
                      {addr.isDefault && (
                        <View style={styles.activeLocationBadge}>
                          <Text style={styles.activeLocationText}>Active</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.savedAddrText} numberOfLines={1}>
                      {addr.houseNumber ? `${addr.houseNumber}, ` : ''}{addr.street}, {addr.city}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Zone Filter Chips */}
          <View style={styles.zoneChipsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.zoneChipsScroll}>
              {zoneChips.slice(0, 10).map((zId) => (
                <TouchableOpacity
                  key={zId}
                  style={[styles.zoneChip, selectedZoneFilter === zId && styles.zoneChipActive]}
                  onPress={() => setSelectedZoneFilter(zId)}
                >
                  <Text style={[styles.zoneChipText, selectedZoneFilter === zId && styles.zoneChipTextActive]}>
                    {zId === 'ALL' ? 'All Zones' : zId}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Canonical Localities List */}
          <View style={styles.localitiesHeaderRow}>
            <Text style={styles.sectionLabel}>LUCKNOW LOCALITIES ({filteredLocalities.length})</Text>
          </View>

          <FlatList
            data={filteredLocalities}
            keyExtractor={(item) => item.localityId || item.name}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={20}
            maxToRenderPerBatch={25}
            renderItem={({ item }) => {
              const isSelected = currentLocation.toLowerCase().includes(item.name.toLowerCase());
              return (
                <TouchableOpacity
                  style={[styles.areaItem, isSelected && styles.areaItemSelected]}
                  onPress={() => handleSelectLocality(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.areaLeft}>
                    <Ionicons
                      name="location-sharp"
                      size={18}
                      color={isSelected ? COLORS.primary : '#94A3B8'}
                    />
                    <View style={{ marginLeft: 8 }}>
                      <Text style={[styles.areaLabel, isSelected && styles.areaLabelSelected]}>
                        {item.name}
                      </Text>
                      <View style={styles.zoneTagRow}>
                        <View style={styles.zoneTagBadge}>
                          <Text style={styles.zoneTagText}>{item.zoneId}</Text>
                        </View>
                        <Text style={styles.zoneNameText} numberOfLines={1}>
                          {item.zoneName}
                        </Text>
                      </View>
                    </View>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={32} color="#CBD5E1" />
                <Text style={styles.emptyText}>No localities found matching "{search}"</Text>
                <TouchableOpacity
                  style={styles.resetFilterBtn}
                  onPress={() => {
                    setSearch('');
                    setSelectedZoneFilter('ALL');
                  }}
                >
                  <Text style={styles.resetFilterText}>Clear Filters</Text>
                </TouchableOpacity>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '85%',
    paddingBottom: 24
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark
  },
  sheetSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9'
  },
  modeTabsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6
  },
  modeTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1
  },
  modeTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted
  },
  modeTabTextActive: {
    color: COLORS.primary,
    fontWeight: '700'
  },
  modeDescriptionBox: {
    marginHorizontal: 16,
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#F8FAFC',
    borderRadius: 6
  },
  modeDescriptionText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 15
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: COLORS.textDark,
    padding: 0
  },
  enteredLocationPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    marginHorizontal: 16,
    marginBottom: 6,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    gap: 8
  },
  enteredIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  enteredPromptTitle: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#065F46'
  },
  enteredPromptQuery: {
    fontSize: 12.5,
    fontWeight: '800',
    color: COLORS.textDark
  },
  savedSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  savedSectionHint: {
    fontSize: 10,
    color: '#059669',
    fontWeight: '600'
  },
  activeLocationBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4
  },
  activeLocationText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#065F46'
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0'
  },
  gpsIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  gpsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46'
  },
  gpsSubtitle: {
    fontSize: 11,
    color: '#047857',
    marginTop: 1
  },
  zoneChipsContainer: {
    marginBottom: 8
  },
  zoneChipsScroll: {
    paddingHorizontal: 16,
    gap: 6
  },
  zoneChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#F1F5F9'
  },
  zoneChipActive: {
    backgroundColor: COLORS.primary
  },
  zoneChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary
  },
  zoneChipTextActive: {
    color: '#FFFFFF'
  },
  sectionBox: {
    paddingHorizontal: 16,
    marginBottom: 8
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5
  },
  localitiesHeaderRow: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#FAFAFA',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9'
  },
  savedAddrRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  savedAddrTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDark
  },
  savedAddrText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1
  },
  areaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC'
  },
  areaItemSelected: {
    backgroundColor: '#F0FDF4'
  },
  areaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  areaLabel: {
    fontSize: 13,
    color: COLORS.textDark,
    fontWeight: '600'
  },
  areaLabelSelected: {
    color: COLORS.primary,
    fontWeight: '700'
  },
  zoneTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 6
  },
  zoneTagBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#DBEAFE'
  },
  zoneTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1D4ED8'
  },
  zoneNameText: {
    fontSize: 10,
    color: '#64748B'
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 8
  },
  emptyText: {
    fontSize: 12,
    color: COLORS.textMuted
  },
  resetFilterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#EFF6FF'
  },
  resetFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary
  }
});

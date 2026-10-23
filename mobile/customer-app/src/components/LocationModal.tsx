import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../api/client';
import { secureStorage } from '../storage/secureStorage';
import { STORAGE_KEYS } from '../constants';
import { COLORS } from '../theme/colors';
import { detectCurrentLocation, saveLocation } from '../services/locationService';
import type { ServiceAddress } from '../types';

interface LocationModalProps {
  visible: boolean;
  currentLocation: string;
  onClose: () => void;
  onSelectLocation: (loc: string, addressDetails?: ServiceAddress) => void;
}

const POPULAR_AREAS = [
  { city: 'Noida', locality: 'Sector 62', label: 'Noida, Sector 62' },
  { city: 'Noida', locality: 'Sector 18', label: 'Noida, Sector 18 (Atta Market)' },
  { city: 'Delhi', locality: 'South Extension', label: 'New Delhi, South Ext' },
  { city: 'Delhi', locality: 'Connaught Place', label: 'New Delhi, CP' },
  { city: 'Delhi', locality: 'Dwarka Sector 10', label: 'New Delhi, Dwarka' },
  { city: 'Gurgaon', locality: 'Cyber City', label: 'Gurgaon, DLF Cyber City' },
  { city: 'Gurgaon', locality: 'Sector 45', label: 'Gurgaon, Sector 45' },
  { city: 'Ghaziabad', locality: 'Indirapuram', label: 'Ghaziabad, Indirapuram' },
  { city: 'Bengaluru', locality: 'Koramangala', label: 'Bengaluru, Koramangala' },
  { city: 'Bengaluru', locality: 'Indiranagar', label: 'Bengaluru, Indiranagar' },
  { city: 'Mumbai', locality: 'Andheri West', label: 'Mumbai, Andheri West' },
  { city: 'Pune', locality: 'Kothrud', label: 'Pune, Kothrud' },
  { city: 'Hyderabad', locality: 'Hitec City', label: 'Hyderabad, Hitec City' }
];

export default function LocationModal({
  visible,
  currentLocation,
  onClose,
  onSelectLocation
}: LocationModalProps) {
  const [search, setSearch] = useState('');
  const [savedAddresses, setSavedAddresses] = useState<ServiceAddress[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);

  useEffect(() => {
    if (visible) {
      loadSavedAddresses();
    }
  }, [visible]);

  const loadSavedAddresses = async () => {
    try {
      setLoadingSaved(true);
      const res = await api.customer.getAddresses();
      if (res?.addresses) {
        setSavedAddresses(res.addresses);
      }
    } catch {
      // Unauthenticated or network issue
      setSavedAddresses([]);
    } finally {
      setLoadingSaved(false);
    }
  };

  const handleSelectArea = async (label: string, addressDetails?: ServiceAddress) => {
    await saveLocation(label, addressDetails);
    onSelectLocation(label, addressDetails);
    onClose();
  };

  const handleUseGpsLocation = async () => {
    try {
      setDetectingGps(true);
      const detected = await detectCurrentLocation(true);
      await saveLocation(detected);
      onSelectLocation(detected.fullAddress, {
        street: detected.street || detected.locality || '',
        locality: detected.locality,
        city: detected.city,
        pincode: detected.pincode,
        state: detected.state,
        coordinates: detected.coordinates
      });
      onClose();
    } catch (err: any) {
      Alert.alert('Location Error', 'Could not detect your exact GPS coordinates. Please select your locality from the list.');
    } finally {
      setDetectingGps(false);
    }
  };

  const filteredAreas = POPULAR_AREAS.filter((a) =>
    a.label.toLowerCase().includes(search.toLowerCase()) ||
    a.city.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>Choose Service Location</Text>
              <Text style={styles.sheetSubtitle}>Find verified tradespeople near you</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={COLORS.textDark} />
            </TouchableOpacity>
          </View>

          {/* Search Field */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search area, sector, or pincode..."
              placeholderTextColor={COLORS.textMuted}
              value={search}
              onChangeText={setSearch}
              autoFocus={false}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Current GPS Button */}
          <TouchableOpacity
            style={styles.gpsButton}
            onPress={handleUseGpsLocation}
            disabled={detectingGps}
          >
            <View style={styles.gpsIconCircle}>
              {detectingGps ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <MaterialCommunityIcons name="crosshairs-gps" size={20} color={COLORS.primary} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.gpsTitle}>Use Current Location</Text>
              <Text style={styles.gpsSubtitle}>Auto-detect using device GPS coordinates</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          {/* Saved Addresses Section */}
          {savedAddresses.length > 0 && (
            <View style={styles.sectionBox}>
              <Text style={styles.sectionLabel}>YOUR SAVED ADDRESSES</Text>
              {savedAddresses.map((addr, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.savedAddrRow}
                  onPress={() => handleSelectArea(`${addr.street}, ${addr.city}`, addr)}
                >
                  <Ionicons name="bookmark" size={18} color={COLORS.primary} style={{ marginTop: 2 }} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.savedAddrTitle}>{addr.landmark || addr.street}</Text>
                    <Text style={styles.savedAddrText} numberOfLines={1}>
                      {addr.houseNumber ? `${addr.houseNumber}, ` : ''}{addr.street}, {addr.city} {addr.pincode}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Popular Localities List */}
          <Text style={styles.sectionLabel}>POPULAR SERVICE HUBS</Text>
          <FlatList
            data={filteredAreas}
            keyExtractor={(item) => item.label}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const isSelected = currentLocation.includes(item.locality);
              return (
                <TouchableOpacity
                  style={[styles.areaItem, isSelected && styles.areaItemSelected]}
                  onPress={() => handleSelectArea(item.label, {
                    street: item.locality,
                    city: item.city,
                    pincode: '201301'
                  })}
                >
                  <View style={styles.areaLeft}>
                    <Ionicons
                      name="location-outline"
                      size={18}
                      color={isSelected ? COLORS.primary : COLORS.textMuted}
                    />
                    <Text style={[styles.areaLabel, isSelected && styles.areaLabelSelected]}>
                      {item.label}
                    </Text>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end'
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
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
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9'
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: COLORS.textDark,
    padding: 0
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 12,
    padding: 12,
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
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46'
  },
  gpsSubtitle: {
    fontSize: 11,
    color: '#047857',
    marginTop: 1
  },
  sectionBox: {
    paddingHorizontal: 16,
    marginBottom: 12
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMuted,
    paddingHorizontal: 16,
    marginBottom: 6,
    letterSpacing: 0.5
  },
  savedAddrRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
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
    marginTop: 2
  },
  areaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
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
    gap: 8
  },
  areaLabel: {
    fontSize: 13,
    color: COLORS.textDark,
    fontWeight: '500'
  },
  areaLabelSelected: {
    color: COLORS.primary,
    fontWeight: '700'
  }
});

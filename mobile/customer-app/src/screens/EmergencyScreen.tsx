import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { COLORS } from '../theme/colors';
import { dataSyncService } from '../services/dataSyncService';
import { secureStorage } from '../storage/secureStorage';
import { STORAGE_KEYS } from '../constants';
import { getStoredLocation, detectCurrentLocation } from '../services/locationService';
import type { ServiceAddress } from '../types';

export default function EmergencyScreen({ navigation }: any) {
  const [selectedTrade, setSelectedTrade] = useState('Electrical Breakdown');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Lucknow');
  const [pincode, setPincode] = useState('226010');
  const [savedAddresses, setSavedAddresses] = useState<ServiceAddress[]>([]);
  const [selectedSavedId, setSelectedSavedId] = useState<string | null>(null);
  const [savedCoordinates, setSavedCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);

  const emergencyTrades = [
    { title: 'Electrical Breakdown', slug: 'electrician', icon: 'flash', desc: 'Short circuit, sparking, total blackout' },
    { title: 'Plumbing & Water Leak', slug: 'plumber', icon: 'water', desc: 'Burst pipe, heavy flooding, no water' },
    { title: 'Lockout / Locksmith', slug: 'carpentry', icon: 'key', desc: 'Locked out, broken key, door jammed' },
    { title: 'AC Breakdown / Gas Leak', slug: 'ac-repair', icon: 'snow', desc: 'Burning smell, gas leak, complete shutdown' }
  ];

  useEffect(() => {
    loadSavedLocation();
  }, []);

  const loadSavedLocation = async () => {
    try {
      const res = await api.customer.getAddresses();
      if (res?.addresses && Array.isArray(res.addresses) && res.addresses.length > 0) {
        setSavedAddresses(res.addresses);
        const def = res.addresses.find((a) => a.isDefault) || res.addresses[0];
        applyEmergencyAddress(def);
        return;
      }
    } catch {
      // Backend error fallback
    }

    try {
      const loc = await getStoredLocation(true);
      if (loc) {
        if (loc.city) setCity(loc.city);
        if (loc.street || loc.locality) setAddress(loc.street || loc.locality || '');
        if (loc.pincode) setPincode(loc.pincode);
        if (loc.coordinates) setSavedCoordinates(loc.coordinates);
      }
    } catch {
      // Fallback
    }
  };

  const applyEmergencyAddress = (addr: ServiceAddress) => {
    setSelectedSavedId(addr._id || null);
    const combined = [addr.houseNumber, addr.street, addr.locality || addr.landmark].filter(Boolean).join(', ');
    setAddress(combined || addr.street || '');
    setCity(addr.city || 'Lucknow');
    setPincode(addr.zipCode || addr.pincode || '226010');
    if (addr.coordinates && (Number(addr.coordinates.lat) !== 0 || Number(addr.coordinates.lng) !== 0)) {
      setSavedCoordinates({
        lat: Number(addr.coordinates.lat),
        lng: Number(addr.coordinates.lng)
      });
    } else {
      setSavedCoordinates(null);
    }
  };

  const handleDetectLocation = async () => {
    try {
      setDetectingLocation(true);
      const loc = await detectCurrentLocation(true);
      if (loc) {
        if (loc.city) setCity(loc.city);
        if (loc.street || loc.locality) setAddress(loc.street || loc.locality || '');
        if (loc.pincode) setPincode(loc.pincode);
        Alert.alert('Location Detected', `Auto-detected location:\n\n${loc.fullAddress}`);
      }
    } catch (err: any) {
      Alert.alert('Location Error', 'Could not detect your GPS location automatically.');
    } finally {
      setDetectingLocation(false);
    }
  };

  // Safe back handler ensuring app never exits unexpectedly
  const handleBackNavigation = () => {
    if (navigation.canGoBack && navigation.canGoBack()) {
      navigation.goBack(true);
    } else if (navigation.resetTo) {
      navigation.resetTo('HomeTab');
    } else {
      navigation.navigate('HomeTab');
    }
  };

  // Intercept back actions when emergency details have been entered
  useEffect(() => {
    const isDirty = () => {
      return (
        description.trim().length > 0 ||
        address.trim().length > 0 ||
        selectedTrade !== 'Electrical Breakdown'
      );
    };

    const unregister = navigation?.registerBackHandler?.(() => {
      if (isDirty()) {
        Alert.alert(
          'Discard Emergency Request?',
          'You have entered details for an urgent service dispatch. Are you sure you want to discard them and go back?',
          [
            { text: 'Keep Editing', style: 'cancel' },
            {
              text: 'Discard',
              style: 'destructive',
              onPress: () => handleBackNavigation()
            }
          ]
        );
        return true;
      }
      return false;
    });

    return () => {
      unregister?.();
    };
  }, [description, address, selectedTrade, navigation]);

  const handleTriggerEmergency = async () => {
    if (!description.trim() || description.trim().length < 5) {
      Alert.alert('Describe the Emergency', 'Please briefly describe the urgent breakdown (at least 5 characters).');
      return;
    }

    if (!city.trim()) {
      Alert.alert('Required Information', 'Please provide a valid city for emergency dispatch.');
      return;
    }

    const tradeObj = emergencyTrades.find((t) => t.title === selectedTrade) || emergencyTrades[0];
    const selectedSaved = savedAddresses.find((a) => a._id === selectedSavedId);

    try {
      setSubmitting(true);
      await api.jobs.createJob({
        title: `EMERGENCY: ${selectedTrade}`,
        description: description.trim(),
        category: tradeObj.slug,
        urgency: 'urgent',
        budget: {
          type: 'fixed',
          amount: 499
        },
        location: {
          addressLabel: selectedSaved?.label || 'Emergency Site',
          address: address.trim() || 'Urgent Site Location',
          city: city.trim() || 'Lucknow',
          zipCode: pincode.trim() || '226010',
          state: 'Uttar Pradesh',
          locationSource: selectedSavedId ? 'saved_address' : (savedCoordinates ? 'gps' : 'manual'),
          coordinates: savedCoordinates
            ? {
                lat: Number(savedCoordinates.lat) || 0,
                lng: Number(savedCoordinates.lng) || 0
              }
            : {
                lat: 0,
                lng: 0
              }
        }
      });

      // Synchronize affected queries across all screens
      dataSyncService.notify('BOOKINGS_CHANGED');

      Alert.alert(
        'Emergency Radar Active 🚨',
        'Nearby certified emergency technicians have received your alert. The first available professional to accept will be dispatched immediately with 30-45 min ETA.',
        [
          {
            text: 'Track Dispatch',
            onPress: () => {
              if (navigation.replace) {
                navigation.replace('MyJobsTab');
              } else {
                navigation.navigate('MyJobsTab');
              }
            }
          }
        ]
      );
    } catch (err: any) {
      Alert.alert('Dispatch Failed', err.message || 'Could not connect to emergency dispatch server. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* 1. Life Safety Warning */}
        <View style={styles.safetyNotice}>
          <Ionicons name="warning" size={24} color="#DC2626" />
          <View style={{ flex: 1 }}>
            <Text style={styles.safetyTitle}>CRITICAL LIFE SAFETY WARNING</Text>
            <Text style={styles.safetyDesc}>
              For active fires, medical emergencies, gas explosions, or physical danger, please immediately call national emergency services (112, 101, 102). WorkLogy provides technical trade repairs only.
            </Text>
          </View>
        </View>

        {/* 2. Dispatch Priority Info Card (Harmonized with navigator header) */}
        <View style={styles.infoBanner}>
          <View style={styles.infoBannerTop}>
            <View style={styles.emergencyPill}>
              <Ionicons name="flash" size={13} color="#FFFFFF" />
              <Text style={styles.emergencyPillText}>24/7 PRIORITY RADAR</Text>
            </View>
            <View style={styles.etaBadge}>
              <Ionicons name="time" size={13} color="#059669" />
              <Text style={styles.etaBadgeText}>ETA: 30–45 mins</Text>
            </View>
          </View>
          <Text style={styles.infoDesc}>
            Standard emergency diagnostic fee: ₹499 upfront labor & diagnostics. Nearest verified contractors are alerted on high priority.
          </Text>
        </View>

        {/* 3. Trade Category Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Emergency Breakdown Category</Text>
          {emergencyTrades.map((t) => {
            const isSelected = selectedTrade === t.title;
            return (
              <TouchableOpacity
                key={t.title}
                style={[styles.tradeCard, isSelected && styles.tradeCardActive]}
                onPress={() => setSelectedTrade(t.title)}
                activeOpacity={0.8}
              >
                <View style={[styles.tradeIconBox, isSelected && styles.tradeIconBoxActive]}>
                  <Ionicons name={t.icon as any} size={22} color={isSelected ? '#DC2626' : '#64748B'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.tradeTitle, isSelected && styles.tradeTitleActive]}>{t.title}</Text>
                  <Text style={styles.tradeDesc}>{t.desc}</Text>
                </View>
                <Ionicons
                  name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={isSelected ? '#DC2626' : '#CBD5E1'}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 4. Symptom Description & Dispatch Address */}
        <View style={styles.section}>
          <Text style={styles.fieldLabel}>What happened? (Describe symptoms) *</Text>
          <TextInput
            style={styles.textArea}
            placeholder="e.g. Main switchboard sparked and complete flat has lost power..."
            placeholderTextColor={COLORS.textMuted}
            multiline
            numberOfLines={3}
            value={description}
            onChangeText={setDescription}
          />

          {savedAddresses.length > 0 && (
            <View style={{ marginBottom: 10 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', marginBottom: 5 }}>
                Select Saved Dispatch Address:
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
                {savedAddresses.map((sa) => {
                  const isSelected = selectedSavedId === sa._id;
                  return (
                    <TouchableOpacity
                      key={sa._id || sa.label}
                      onPress={() => applyEmergencyAddress(sa)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 5,
                        backgroundColor: isSelected ? '#DC2626' : '#FFFFFF',
                        borderWidth: 1.5,
                        borderColor: isSelected ? '#DC2626' : '#E2E8F0',
                        borderRadius: 8,
                        paddingHorizontal: 10,
                        paddingVertical: 6
                      }}
                    >
                      <Ionicons
                        name={sa.label?.toLowerCase() === 'work' ? 'business' : 'home'}
                        size={13}
                        color={isSelected ? '#FFFFFF' : '#64748B'}
                      />
                      <Text
                        style={{
                          fontSize: 11.5,
                          fontWeight: '700',
                          color: isSelected ? '#FFFFFF' : COLORS.textDark
                        }}
                      >
                        {sa.label || 'Home'}
                      </Text>
                      {sa.isDefault && (
                        <View
                          style={{
                            backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : '#D1FAE5',
                            paddingHorizontal: 4,
                            paddingVertical: 1,
                            borderRadius: 3
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 9,
                              fontWeight: '700',
                              color: isSelected ? '#FFFFFF' : '#065F46'
                            }}
                          >
                            Default
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 6 }}>
            <Text style={[styles.fieldLabel, { marginTop: 0, marginBottom: 0 }]}>Emergency Address / Locality</Text>
            <TouchableOpacity
              onPress={handleDetectLocation}
              disabled={detectingLocation}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
              activeOpacity={0.7}
            >
              {detectingLocation ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Ionicons name="navigate-circle" size={16} color={COLORS.primary} />
              )}
              <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.primary }}>
                {detectingLocation ? 'Detecting...' : 'Auto-Detect GPS'}
              </Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Flat / Society / Landmark"
            placeholderTextColor={COLORS.textMuted}
            value={address}
            onChangeText={(val) => {
              setSelectedSavedId(null);
              setAddress(val);
            }}
          />

          <View style={styles.locationRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginRight: 8 }]}
              placeholder="City *"
              placeholderTextColor={COLORS.textMuted}
              value={city}
              onChangeText={setCity}
            />
            <TextInput
              style={[styles.input, { width: 110 }]}
              placeholder="PIN Code"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={pincode}
              onChangeText={setPincode}
            />
          </View>

          <TouchableOpacity
            style={styles.dispatchBtn}
            onPress={handleTriggerEmergency}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <View style={styles.dispatchBtnContent}>
                <Ionicons name="flash" size={18} color="#FFFFFF" />
                <Text style={styles.dispatchBtnText}>Broadcast Emergency Callout</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    paddingBottom: Platform.OS === 'ios' ? 70 : 50
  },
  safetyNotice: {
    flexDirection: 'row',
    backgroundColor: '#FEF2F2',
    borderBottomWidth: 1,
    borderBottomColor: '#FECACA',
    padding: 14,
    gap: 12,
    alignItems: 'flex-start'
  },
  safetyTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#991B1B',
    letterSpacing: 0.5
  },
  safetyDesc: {
    fontSize: 11,
    color: '#7F1D1D',
    marginTop: 2,
    lineHeight: 16
  },
  infoBanner: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    padding: 16
  },
  infoBannerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  emergencyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DC2626',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  emergencyPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  etaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0'
  },
  etaBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46'
  },
  infoDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 12
  },
  tradeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 10,
    gap: 12
  },
  tradeCardActive: {
    borderColor: '#DC2626',
    backgroundColor: '#FFF5F5'
  },
  tradeIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center'
  },
  tradeIconBoxActive: {
    backgroundColor: '#FEE2E2'
  },
  tradeTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textDark
  },
  tradeTitleActive: {
    color: '#991B1B'
  },
  tradeDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 6,
    marginTop: 10
  },
  textArea: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: COLORS.textDark,
    height: 85,
    textAlignVertical: 'top'
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: COLORS.textDark
  },
  locationRow: {
    flexDirection: 'row',
    marginTop: 8
  },
  dispatchBtn: {
    backgroundColor: '#DC2626',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
    marginBottom: 20,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  dispatchBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  dispatchBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900'
  }
});

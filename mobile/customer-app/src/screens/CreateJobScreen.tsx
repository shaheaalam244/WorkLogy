import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { api } from '../api/client';
import { COLORS } from '../theme/colors';
import { secureStorage } from '../storage/secureStorage';
import { STORAGE_KEYS } from '../constants';
import { getStoredLocation, detectCurrentLocation } from '../services/locationService';

export default function CreateJobScreen({ route, navigation }: any) {
  const { categorySlug, categoryName, subservice, basePrice, title: initialTitle, urgency: initialUrgency } = route.params || {};

  const [title, setTitle] = useState(initialTitle || (subservice ? `${subservice} Service` : ''));
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState<'normal' | 'emergency'>(initialUrgency === 'high' || initialUrgency === 'emergency' ? 'emergency' : 'normal');
  const [budgetType, setBudgetType] = useState<'fixed' | 'quote'>('fixed');
  const [budgetAmount, setBudgetAmount] = useState(basePrice ? String(basePrice) : '499');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('Lucknow');
  const [pincode, setPincode] = useState('226010');
  const [submitting, setSubmitting] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);

  useEffect(() => {
    loadSavedLocation();
  }, []);

  // Intercept back actions when form has unsaved edits
  useEffect(() => {
    const isDirty = () => {
      const defaultTitle = initialTitle || (subservice ? `${subservice} Service` : '');
      const titleChanged = Boolean(title.trim() && title.trim() !== defaultTitle);
      const descChanged = Boolean(description.trim().length > 0);
      return titleChanged || descChanged;
    };

    const unregister = navigation?.registerBackHandler?.(() => {
      if (isDirty()) {
        Alert.alert(
          'Discard Service Request?',
          'You have unsaved details in your service request. Are you sure you want to discard them and go back?',
          [
            { text: 'Keep Editing', style: 'cancel' },
            {
              text: 'Discard',
              style: 'destructive',
              onPress: () => navigation.goBack(true)
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
  }, [title, description, initialTitle, subservice, navigation]);

  const loadSavedLocation = async () => {
    try {
      const loc = await getStoredLocation(true);
      if (loc) {
        if (loc.city) setCity(loc.city);
        if (loc.street || loc.locality) setStreetAddress(loc.street || loc.locality || '');
        if (loc.pincode) setPincode(loc.pincode);
      }
    } catch {
      // Fallback
    }
  };

  const handleDetectLocation = async () => {
    try {
      setDetectingLocation(true);
      const loc = await detectCurrentLocation(true);
      if (loc) {
        if (loc.city) setCity(loc.city);
        if (loc.street || loc.locality) setStreetAddress(loc.street || loc.locality || '');
        if (loc.pincode) setPincode(loc.pincode);
        Alert.alert('Location Detected', `Auto-detected location:\n\n${loc.fullAddress}`);
      }
    } catch {
      Alert.alert('Location Error', 'Could not detect your GPS location automatically.');
    } finally {
      setDetectingLocation(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || title.trim().length < 3) {
      Alert.alert('Required Information', 'Please provide a descriptive service title (at least 3 characters).');
      return;
    }

    if (!description.trim() || description.trim().length < 10) {
      Alert.alert('Required Information', 'Please describe the problem in detail (at least 10 characters).');
      return;
    }

    if (!city.trim()) {
      Alert.alert('Required Information', 'City is required for technician dispatch.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.jobs.createJob({
        title: title.trim(),
        description: description.trim(),
        category: categorySlug || 'electrician',
        subcategory: subservice || undefined,
        urgency: urgency === 'emergency' ? 'urgent' : 'medium',
        budget: {
          type: budgetType,
          amount: budgetType === 'fixed' ? Number(budgetAmount) || 499 : undefined
        },
        location: {
          address: streetAddress.trim() || 'Sector 62',
          city: city.trim(),
          zipCode: pincode.trim() || '201306'
        }
      });

      Alert.alert(
        'Service Request Created 🎉',
        'Your service order has been broadcast to verified local tradespeople. You will receive quotes and notifications shortly.',
        [
          {
            text: 'View My Jobs',
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
      Alert.alert('Submission Error', err.message || 'Failed to submit service request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.categoryBadge}>
          <Ionicons name="construct" size={13} color={COLORS.primary} />
          <Text style={styles.categoryBadgeText}>{categoryName || 'Home & Trade Services'}</Text>
        </View>
        <Text style={styles.headerTitle}>Post a Service Request</Text>
        <Text style={styles.headerSubtitle}>
          Fill out the details below. Verified contractors serving {city} will respond with quotes.
        </Text>
      </View>

      <View style={styles.form}>
        {/* Title */}
        <Text style={styles.label}>Service Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Ceiling Fan Installation / AC Not Cooling"
          placeholderTextColor={COLORS.textMuted}
          value={title}
          onChangeText={setTitle}
        />

        {/* Description */}
        <Text style={styles.label}>Problem Description & Requirements *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe symptoms, noise, model number, room accessibility..."
          placeholderTextColor={COLORS.textMuted}
          multiline
          numberOfLines={4}
          value={description}
          onChangeText={setDescription}
        />

        {/* Urgency */}
        <Text style={styles.label}>Urgency & Timeline</Text>
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.toggleBtn, urgency === 'normal' && styles.toggleBtnActive]}
            onPress={() => setUrgency('normal')}
          >
            <Ionicons
              name="calendar-outline"
              size={15}
              color={urgency === 'normal' ? COLORS.primary : COLORS.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.toggleText, urgency === 'normal' && styles.toggleTextActive]}>
              Standard Schedule
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, urgency === 'emergency' && styles.emergencyToggleActive]}
            onPress={() => setUrgency('emergency')}
          >
            <Ionicons
              name="flash"
              size={15}
              color={urgency === 'emergency' ? '#EF4444' : COLORS.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.toggleText, urgency === 'emergency' && styles.emergencyTextActive]}>
              Urgent (Today)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Pricing Mode */}
        <Text style={styles.label}>Pricing Preference</Text>
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.toggleBtn, budgetType === 'fixed' && styles.toggleBtnActive]}
            onPress={() => setBudgetType('fixed')}
          >
            <Text style={[styles.toggleText, budgetType === 'fixed' && styles.toggleTextActive]}>
              Fixed Budget (₹)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, budgetType === 'quote' && styles.toggleBtnActive]}
            onPress={() => setBudgetType('quote')}
          >
            <Text style={[styles.toggleText, budgetType === 'quote' && styles.toggleTextActive]}>
              Request Quotes
            </Text>
          </TouchableOpacity>
        </View>

        {budgetType === 'fixed' && (
          <View style={styles.budgetInputContainer}>
            <Text style={styles.currencyPrefix}>₹</Text>
            <TextInput
              style={styles.budgetInput}
              keyboardType="numeric"
              value={budgetAmount}
              onChangeText={setBudgetAmount}
              placeholder="499"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>
        )}

        {/* Address */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 6 }}>
          <Text style={[styles.label, { marginTop: 0, marginBottom: 0 }]}>Service Address & Locality</Text>
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
          placeholder="House/Flat No, Apartment, Street"
          placeholderTextColor={COLORS.textMuted}
          value={streetAddress}
          onChangeText={setStreetAddress}
        />
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1, marginRight: 8 }]}
            placeholder="City"
            placeholderTextColor={COLORS.textMuted}
            value={city}
            onChangeText={setCity}
          />
          <TextInput
            style={[styles.input, { width: 120 }]}
            placeholder="PIN Code"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="numeric"
            value={pincode}
            onChangeText={setPincode}
          />
        </View>

        {/* WorkLogy Guarantee Note */}
        <View style={styles.guaranteeBox}>
          <Ionicons name="shield-checkmark" size={16} color={COLORS.primary} />
          <Text style={styles.guaranteeText}>
            WorkLogy Escrow Protection holds funds securely until you physically inspect and approve completed work.
          </Text>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.submitBtnText}>Submit Service Request</Text>
              <Feather name="arrow-right" size={16} color="#FFFFFF" />
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0'
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.textDark
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 16
  },
  form: {
    padding: 16
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 6,
    marginTop: 14
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: COLORS.textDark
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top'
  },
  row: {
    flexDirection: 'row',
    gap: 10
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingVertical: 11,
    borderRadius: 12
  },
  toggleBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#ECFDF5'
  },
  emergencyToggleActive: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2'
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary
  },
  toggleTextActive: {
    color: COLORS.primary
  },
  emergencyTextActive: {
    color: '#EF4444'
  },
  budgetInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginTop: 8
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
    marginRight: 8
  },
  budgetInput: {
    flex: 1,
    height: 44,
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textDark
  },
  guaranteeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    padding: 12,
    marginTop: 20
  },
  guaranteeText: {
    flex: 1,
    fontSize: 11,
    color: '#065F46',
    lineHeight: 15
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800'
  }
});

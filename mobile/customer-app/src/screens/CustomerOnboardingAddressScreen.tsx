import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { detectGpsLocation } from '../services/locationService';

type AddressLabel = 'Home' | 'Work' | 'Other';

export default function CustomerOnboardingAddressScreen({ navigation }: any) {
  const { saveAddressStep, skipAddressStep, pendingAction, clearPendingAction } = useAuth();

  const [houseNumber, setHouseNumber] = useState('');
  const [street, setStreet] = useState('');
  const [locality, setLocality] = useState('');
  const [city, setCity] = useState('Lucknow');
  const [stateName, setStateName] = useState('Uttar Pradesh');
  const [pincode, setPincode] = useState('');
  const [label, setLabel] = useState<AddressLabel>('Home');
  const [isDefault, setIsDefault] = useState(true);

  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<{ street?: string; city?: string; pincode?: string }>({});

  // GPS Auto-Detection handler
  const handleDetectGps = async () => {
    setIsDetectingGps(true);
    try {
      const result = await detectGpsLocation();
      if (result.success && result.location) {
        const loc = result.location;
        if (loc.houseNumber) setHouseNumber(loc.houseNumber);
        if (loc.street) setStreet(loc.street);
        if (loc.locality) setLocality(loc.locality);
        if (loc.city) setCity(loc.city);
        if (loc.state) setStateName(loc.state);
        if (loc.pincode) setPincode(loc.pincode);
        if (loc.coordinates) {
          setCoordinates(loc.coordinates);
        }
        setErrors({});
      } else {
        Alert.alert('GPS Location', result.error || 'Could not auto-detect location. Please enter manually.');
      }
    } catch (err: any) {
      Alert.alert('Location Error', err.message || 'Unable to access GPS.');
    } finally {
      setIsDetectingGps(false);
    }
  };

  const validate = (): boolean => {
    const errs: { street?: string; city?: string; pincode?: string } = {};

    const resolvedStreet = (street || locality || houseNumber).trim();
    if (!resolvedStreet) {
      errs.street = 'Please provide your street, locality, or building name.';
    }

    if (!city.trim()) {
      errs.city = 'Please enter your city.';
    }

    if (pincode.trim() && !/^\d{6}$/.test(pincode.trim())) {
      errs.pincode = 'PIN Code must be 6 digits.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setIsSaving(true);
    try {
      const addressData = {
        label,
        houseNumber: houseNumber.trim(),
        street: street.trim() || locality.trim(),
        locality: locality.trim(),
        city: city.trim() || 'Lucknow',
        state: stateName.trim() || 'Uttar Pradesh',
        zipCode: pincode.trim() || '226010',
        pincode: pincode.trim() || '226010',
        isDefault,
        coordinates: coordinates || { lat: 26.8467, lng: 80.9462 }
      };

      await saveAddressStep(addressData);
      if (pendingAction?.screen) {
        const dest = pendingAction;
        clearPendingAction();
        if (navigation.resetTo) {
          navigation.resetTo(dest.screen, dest.params);
        } else {
          navigation.navigate(dest.screen, dest.params);
        }
      } else {
        navigation.resetTo('HomeTab');
      }
    } catch (err: any) {
      Alert.alert('Could Not Save Address', err.message || 'Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = async () => {
    setIsSaving(true);
    try {
      await skipAddressStep();
      if (pendingAction?.screen) {
        const dest = pendingAction;
        clearPendingAction();
        if (navigation.resetTo) {
          navigation.resetTo(dest.screen, dest.params);
        } else {
          navigation.navigate(dest.screen, dest.params);
        }
      } else {
        navigation.resetTo('HomeTab');
      }
    } catch {
      if (pendingAction?.screen) {
        const dest = pendingAction;
        clearPendingAction();
        if (navigation.resetTo) {
          navigation.resetTo(dest.screen, dest.params);
        } else {
          navigation.navigate(dest.screen, dest.params);
        }
      } else {
        navigation.resetTo('HomeTab');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Bar with Step Badge & Skip */}
      <View style={styles.topHeader}>
        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>Step 2 of 2</Text>
        </View>
        <TouchableOpacity
          onPress={handleSkip}
          disabled={isSaving}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.skipBtnText}>Skip for now</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentCard}>
          {/* Header Title */}
          <Text style={styles.title}>Where do you need services?</Text>
          <Text style={styles.subtitle}>
            Add your home or office address to book emergency and standard repairs with 1 tap.
          </Text>

          {/* GPS Auto-Detect Button */}
          <TouchableOpacity
            style={styles.gpsButton}
            onPress={handleDetectGps}
            disabled={isDetectingGps || isSaving}
            activeOpacity={0.8}
          >
            {isDetectingGps ? (
              <ActivityIndicator size="small" color="#059669" />
            ) : (
              <View style={styles.gpsBtnContent}>
                <Ionicons name="navigate-circle" size={22} color="#059669" />
                <Text style={styles.gpsBtnText}>Use Current Location (GPS Auto-Detect)</Text>
              </View>
            )}
          </TouchableOpacity>

          {coordinates && (
            <View style={styles.gpsReadyBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.gpsReadyText}>GPS coordinates attached to address</Text>
            </View>
          )}

          {/* Form Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR ENTER MANUALLY</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Address Label Pills (Home / Work / Other) */}
          <Text style={styles.fieldLabel}>Address Type</Text>
          <View style={styles.labelPillsRow}>
            {(['Home', 'Work', 'Other'] as AddressLabel[]).map((type) => {
              const isSelected = label === type;
              const iconName = type === 'Home' ? 'home' : type === 'Work' ? 'briefcase' : 'location';
              return (
                <TouchableOpacity
                  key={type}
                  style={[styles.labelPill, isSelected ? styles.labelPillActive : null]}
                  onPress={() => setLabel(type)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={iconName as any}
                    size={16}
                    color={isSelected ? '#FFFFFF' : '#475569'}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.labelPillText, isSelected ? styles.labelPillTextActive : null]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* House / Flat / Building No. */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>House / Flat / Building No.</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Flat 302, Tower B / House 12"
              placeholderTextColor="#94A3B8"
              value={houseNumber}
              onChangeText={setHouseNumber}
              editable={!isSaving}
            />
          </View>

          {/* Street / Road / Colony */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Street / Road / Colony</Text>
            <TextInput
              style={[styles.textInput, errors.street ? styles.inputError : null]}
              placeholder="e.g. Kamalabad Barhauli / Ring Road"
              placeholderTextColor="#94A3B8"
              value={street}
              onChangeText={(val) => {
                setStreet(val);
                if (errors.street) setErrors((prev) => ({ ...prev, street: undefined }));
              }}
              editable={!isSaving}
            />
            {errors.street ? <Text style={styles.errorText}>{errors.street}</Text> : null}
          </View>

          {/* Locality / Sector / Area */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Locality / Sector / Area</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. IIM Road, Gomti Nagar, Aliganj"
              placeholderTextColor="#94A3B8"
              value={locality}
              onChangeText={setLocality}
              editable={!isSaving}
            />
          </View>

          {/* City & PIN Code (2 Column) */}
          <View style={styles.twoColRow}>
            <View style={[styles.fieldGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.fieldLabel}>City</Text>
              <TextInput
                style={[styles.textInput, errors.city ? styles.inputError : null]}
                placeholder="Lucknow"
                placeholderTextColor="#94A3B8"
                value={city}
                onChangeText={(val) => {
                  setCity(val);
                  if (errors.city) setErrors((prev) => ({ ...prev, city: undefined }));
                }}
                editable={!isSaving}
              />
              {errors.city ? <Text style={styles.errorText}>{errors.city}</Text> : null}
            </View>

            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>PIN Code</Text>
              <TextInput
                style={[styles.textInput, errors.pincode ? styles.inputError : null]}
                placeholder="226021"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                maxLength={6}
                value={pincode}
                onChangeText={(val) => {
                  setPincode(val);
                  if (errors.pincode) setErrors((prev) => ({ ...prev, pincode: undefined }));
                }}
                editable={!isSaving}
              />
              {errors.pincode ? <Text style={styles.errorText}>{errors.pincode}</Text> : null}
            </View>
          </View>

          {/* Set as Default Address Toggle */}
          <TouchableOpacity
            style={styles.defaultCheckRow}
            onPress={() => setIsDefault(!isDefault)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isDefault ? 'checkbox' : 'square-outline'}
              size={22}
              color={isDefault ? '#059669' : '#94A3B8'}
            />
            <Text style={styles.defaultCheckText}>Set as primary service address</Text>
          </TouchableOpacity>

          {/* Action Buttons */}
          <TouchableOpacity
            style={[styles.saveBtn, isSaving ? styles.btnDisabled : null]}
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.8}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <View style={styles.btnRow}>
                <Text style={styles.saveBtnText}>Save Address & Get Started</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipBottomBtn}
            onPress={handleSkip}
            disabled={isSaving}
            activeOpacity={0.7}
          >
            <Text style={styles.skipBottomBtnText}>I'll enter my address when booking</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 16 : 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  stepBadge: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DCFCE7'
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669'
  },
  skipBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B'
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 24,
    alignItems: 'center'
  },
  contentCard: {
    width: '100%',
    maxWidth: 440
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    letterSpacing: -0.4
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 21,
    marginBottom: 20
  },
  gpsButton: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#059669',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  gpsBtnContent: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  gpsBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#059669',
    marginLeft: 8
  },
  gpsReadyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 8
  },
  gpsReadyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065F46',
    marginLeft: 6
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0'
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    marginHorizontal: 12,
    letterSpacing: 0.8
  },
  labelPillsRow: {
    flexDirection: 'row',
    marginBottom: 18,
    marginTop: 6
  },
  labelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginRight: 10
  },
  labelPillActive: {
    backgroundColor: '#059669',
    borderColor: '#059669'
  },
  labelPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569'
  },
  labelPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700'
  },
  fieldGroup: {
    marginBottom: 16
  },
  twoColRow: {
    flexDirection: 'row'
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
    fontSize: 15,
    color: '#0F172A'
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2'
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
    marginLeft: 2
  },
  defaultCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10
  },
  defaultCheckText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '600',
    marginLeft: 8
  },
  saveBtn: {
    backgroundColor: '#059669',
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3
  },
  btnDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
    elevation: 0
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  skipBottomBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6
  },
  skipBottomBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B'
  }
});

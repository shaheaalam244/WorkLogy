import React, { useState, useEffect } from 'react';
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
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/client';
import { COLORS } from '../theme/colors';
import { isTemporaryEmail } from '../utils/formatters';
import OnboardingProgress from '../components/common/OnboardingProgress';

export default function VendorOnboardingProfileScreen({ navigation }: any) {
  const { user, vendorProfile, updateLocalUser, updateLocalProfile } = useAuth();

  const [name, setName] = useState(
    user?.name && user.name !== 'New Contractor' ? user.name : ''
  );
  const [businessName, setBusinessName] = useState(
    vendorProfile?.businessName && vendorProfile.businessName !== 'My Service Business'
      ? vendorProfile.businessName
      : ''
  );
  const [email, setEmail] = useState(
    user?.email && !isTemporaryEmail(user.email) ? user.email : ''
  );
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user?.name && user.name !== 'New Contractor' && !name) {
      setName(user.name);
    }
    if (vendorProfile?.businessName && vendorProfile.businessName !== 'My Service Business' && !businessName) {
      setBusinessName(vendorProfile.businessName);
    }
  }, [user, vendorProfile]);

  const handleSaveAndContinue = async () => {
    const cleanName = name.trim();
    if (!cleanName) {
      setErrorMessage('Please enter your full name or lead technician name.');
      return;
    }

    if (cleanName.length < 2) {
      setErrorMessage('Name must be at least 2 characters long.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const cleanBusiness = businessName.trim() || `${cleanName} Services`;
      const payload: any = {
        name: cleanName,
        fullName: cleanName,
        businessName: cleanBusiness,
        onboardingStep: 'domains_pending'
      };

      if (email.trim() && !isTemporaryEmail(email.trim())) {
        payload.email = email.trim();
      }

      await api.vendor.updateProfile(payload);
      updateLocalUser({
        name: cleanName,
        ...(payload.email ? { email: payload.email } : {})
      });
      updateLocalProfile({ businessName: cleanBusiness });

      navigation.navigate('VendorOnboardingDomains');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save business details. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    // If name was entered, save it gracefully in background
    if (name.trim()) {
      const cleanName = name.trim();
      const cleanBusiness = businessName.trim() || `${cleanName} Services`;
      api.vendor.updateProfile({
        name: cleanName,
        businessName: cleanBusiness,
        onboardingStep: 'domains_pending'
      }).then(() => {
        updateLocalUser({ name: cleanName });
        updateLocalProfile({ businessName: cleanBusiness });
      }).catch(() => {});
    }

    navigation.navigate('VendorOnboardingDomains');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <OnboardingProgress currentStep={1} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.heading}>Tell us about your business</Text>
          <Text style={styles.subheading}>
            Add your details so customers can identify your service enterprise.
          </Text>

          {/* Full Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Full Name / Lead Technician <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name, e.g. Rahul Sharma"
              placeholderTextColor={COLORS.textLight}
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (errorMessage) setErrorMessage(null);
              }}
              autoCapitalize="words"
            />
          </View>

          {/* Business Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Business or Workshop Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your business name, e.g. Sharma Electrical Services"
              placeholderTextColor={COLORS.textLight}
              value={businessName}
              onChangeText={(text) => {
                setBusinessName(text);
                if (errorMessage) setErrorMessage(null);
              }}
              autoCapitalize="words"
            />
            <Text style={styles.helperText}>
              If you operate independently, you can leave this blank or use your trade name.
            </Text>
          </View>

          {/* Email Address */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Contact Email (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email, e.g. name@example.com"
              placeholderTextColor={COLORS.textLight}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Text style={styles.helperText}>
              Fill your email to receive invoices, customer booking receipts, and payment notifications.
            </Text>
          </View>

          {errorMessage && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color={COLORS.error} style={{ marginRight: 6 }} />
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
            </View>
          )}

          {/* Primary Action Button */}
          <TouchableOpacity
            style={[styles.primaryBtn, isSaving && styles.btnDisabled]}
            onPress={handleSaveAndContinue}
            disabled={isSaving}
            activeOpacity={0.85}
          >
            {isSaving ? (
              <View style={styles.btnLoadingRow}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.primaryBtnText}>Saving...</Text>
              </View>
            ) : (
              <Text style={styles.primaryBtnText}>Save & Continue</Text>
            )}
          </TouchableOpacity>

          {/* Skip For Now Button (Required on every post-OTP onboarding step) */}
          <TouchableOpacity
            style={styles.skipBtn}
            onPress={handleSkip}
            disabled={isSaving}
            activeOpacity={0.7}
          >
            <Text style={styles.skipBtnText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 24
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#17212B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3
  },
  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 6
  },
  subheading: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 24
  },
  fieldGroup: {
    marginBottom: 18
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  required: {
    color: COLORS.error
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 14,
    fontSize: 14,
    color: COLORS.textDark
  },
  helperText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 6,
    lineHeight: 15
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.errorBg,
    borderWidth: 1,
    borderColor: COLORS.errorBorder,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.error,
    fontWeight: '600',
    lineHeight: 16
  },
  primaryBtn: {
    backgroundColor: COLORS.primaryAction,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: COLORS.primaryAction,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3
  },
  btnDisabled: {
    opacity: 0.65
  },
  btnLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    marginLeft: 6
  },
  skipBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 10
  },
  skipBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary
  }
});

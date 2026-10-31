import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/client';

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80';

export default function CustomerOnboardingProfileScreen({ navigation }: any) {
  const { user, completeProfileStep } = useAuth();

  const [name, setName] = useState(
    user?.name && user.name !== 'New Customer' ? user.name : ''
  );
  const [email, setEmail] = useState(
    user?.email && !user.email.endsWith('@worklogy.local') ? user.email : ''
  );
  const [avatarUri, setAvatarUri] = useState<string | null>(
    user?.avatar && user.avatar !== DEFAULT_AVATAR ? user.avatar : null
  );
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

  const handlePickPhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Photo Permission Needed',
          'Please allow access to your photos to choose a profile picture.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setIsUploadingPhoto(true);
        try {
          // Attempt image upload to server/Cloudinary
          const uploadRes = await api.media.uploadImage(asset.uri, asset.mimeType || 'image/jpeg');
          if (uploadRes?.url) {
            setAvatarUri(uploadRes.url);
          } else {
            setAvatarUri(asset.uri);
          }
        } catch {
          // Fallback to local URI
          setAvatarUri(asset.uri);
        } finally {
          setIsUploadingPhoto(false);
        }
      }
    } catch (err: any) {
      Alert.alert('Image Error', err.message || 'Could not select photo.');
    }
  };

  const validate = (): boolean => {
    const errs: { name?: string; email?: string } = {};

    if (!name.trim()) {
      errs.name = 'Please enter your full name.';
    } else if (name.trim().length < 2) {
      errs.name = 'Full name must be at least 2 characters.';
    }

    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        errs.email = 'Please enter a valid email address.';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleContinue = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await completeProfileStep({
        name: name.trim(),
        email: email.trim() || undefined,
        avatar: avatarUri || undefined
      });

      navigation.replace('CustomerOnboardingAddress');
    } catch (err: any) {
      Alert.alert('Profile Setup Failed', err.message || 'Unable to update profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    // If name is entered, save it; otherwise use polite default or prompt for name
    if (!name.trim()) {
      setErrors({ name: 'Please enter your name so technicians know whom to address.' });
      return;
    }

    setIsSubmitting(true);
    try {
      await completeProfileStep({
        name: name.trim(),
        email: undefined,
        avatar: undefined
      });

      navigation.replace('CustomerOnboardingAddress');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Unable to proceed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header */}
      <View style={styles.topHeader}>
        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>Step 1 of 2</Text>
        </View>
        <TouchableOpacity
          onPress={handleSkip}
          disabled={isSubmitting}
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
          {/* Heading */}
          <Text style={styles.title}>Let's set up your profile</Text>
          <Text style={styles.subtitle}>
            Enter your details so service professionals can recognize you.
          </Text>

          {/* Photo Picker */}
          <View style={styles.avatarSection}>
            <TouchableOpacity
              style={styles.avatarWrapper}
              onPress={handlePickPhoto}
              disabled={isUploadingPhoto}
              activeOpacity={0.8}
            >
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={44} color="#94A3B8" />
                </View>
              )}

              {/* Camera Icon Overlay */}
              <View style={styles.cameraPill}>
                {isUploadingPhoto ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="camera" size={16} color="#FFFFFF" />
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handlePickPhoto}
              disabled={isUploadingPhoto}
              style={{ marginTop: 8 }}
            >
              <Text style={styles.avatarHint}>
                {avatarUri ? 'Change profile photo' : 'Add a profile photo (optional)'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Full Name Input */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.fieldLabel}>Full Name</Text>
              <Text style={styles.requiredStar}>*</Text>
            </View>
            <View style={[styles.inputBox, errors.name ? styles.inputBoxError : null]}>
              <Ionicons name="person-outline" size={20} color="#64748B" style={styles.fieldIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Shahe Aalam"
                placeholderTextColor="#94A3B8"
                value={name}
                onChangeText={(val) => {
                  setName(val);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                }}
                autoCapitalize="words"
                editable={!isSubmitting}
              />
            </View>
            {errors.name ? <Text style={styles.fieldErrorText}>{errors.name}</Text> : null}
          </View>

          {/* Email Input (Optional) */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.fieldLabel}>Email Address</Text>
              <Text style={styles.optionalTag}>(Optional)</Text>
            </View>
            <View style={[styles.inputBox, errors.email ? styles.inputBoxError : null]}>
              <Ionicons name="mail-outline" size={20} color="#64748B" style={styles.fieldIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="e.g. name@example.com"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={(val) => {
                  setEmail(val);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                editable={!isSubmitting}
              />
            </View>
            {errors.email ? (
              <Text style={styles.fieldErrorText}>{errors.email}</Text>
            ) : (
              <Text style={styles.fieldHint}>We'll send booking receipts and verified invoices here.</Text>
            )}
          </View>

          {/* Submit Action */}
          <TouchableOpacity
            style={[styles.continueBtn, isSubmitting ? styles.continueBtnDisabled : null]}
            onPress={handleContinue}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <View style={styles.btnRow}>
                <Text style={styles.continueBtnText}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
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
    marginBottom: 24
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 28
  },
  avatarWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    position: 'relative'
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed'
  },
  cameraPill: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#059669',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF'
  },
  avatarHint: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669'
  },
  fieldGroup: {
    marginBottom: 20
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155'
  },
  requiredStar: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
    marginLeft: 4
  },
  optionalTag: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94A3B8',
    marginLeft: 6
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    height: 52
  },
  inputBoxError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2'
  },
  fieldIcon: {
    marginRight: 10
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#0F172A',
    paddingVertical: 0
  },
  fieldErrorText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
    marginTop: 6,
    marginLeft: 4
  },
  fieldHint: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 6,
    marginLeft: 4
  },
  continueBtn: {
    backgroundColor: '#059669',
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3
  },
  continueBtnDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
    elevation: 0
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  continueBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2
  }
});


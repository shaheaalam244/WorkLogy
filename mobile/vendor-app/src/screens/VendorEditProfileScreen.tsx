import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
  StatusBar,
  KeyboardAvoidingView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/client';
import { COLORS } from '../theme/colors';
import type { VendorProfile } from '../types';

export default function VendorEditProfileScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0
  );

  const { user, updateLocalUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Explicit Photo Upload States (Section 6 Requirements)
  type PhotoUploadState = 'idle' | 'selecting' | 'uploading' | 'saving' | 'success' | 'failed';
  const [photoUploadState, setPhotoUploadState] = useState<PhotoUploadState>('idle');
  const [uploadErrorMessage, setUploadErrorMessage] = useState<string | null>(null);
  const [stagedAsset, setStagedAsset] = useState<{ uri: string; mimeType?: string; fileName?: string } | null>(null);

  const isPhotoBusy = photoUploadState === 'selecting' || photoUploadState === 'uploading' || photoUploadState === 'saving';

  // Form Fields
  const [fullName, setFullName] = useState(user?.name || '');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [bio, setBio] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(user?.avatar || null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [avatarUri, user?.avatar]);

  // Skills
  const [skills, setSkills] = useState<string[]>([
    'AC Repair',
    'AC Installation',
    'Gas Refilling',
    'Electrical Work'
  ]);
  const [addSkillModalOpen, setAddSkillModalOpen] = useState(false);
  const [newSkillText, setNewSkillText] = useState('');

  useEffect(() => {
    loadProfileDetails();
  }, []);

  const loadProfileDetails = async () => {
    try {
      setLoading(true);
      const res = await api.vendors.getProfile();
      if (res?.vendor) {
        const v = res.vendor;
        setBusinessName(v.businessName || '');
        setBio(v.bio || '');
        if (v.skills && Array.isArray(v.skills) && v.skills.length > 0) {
          setSkills(v.skills);
        }
        const resolvedAvatar =
          v.avatar ||
          (typeof v.user === 'object' && (v.user as any)?.avatar) ||
          user?.avatar;
        if (resolvedAvatar) {
          setAvatarUri(resolvedAvatar);
        }
        if (typeof v.user === 'object' && (v.user as any)?.name) {
          setFullName((v.user as any).name);
        }
        if (typeof v.user === 'object' && (v.user as any)?.phone) {
          setPhone((v.user as any).phone);
        }
        if (typeof v.user === 'object' && (v.user as any)?.email) {
          setEmail((v.user as any).email);
        }
      }
    } catch (err) {
      console.warn('Failed to load profile for edit:', err);
    } finally {
      setLoading(false);
    }
  };

  const executeUploadAndPersist = async (
    asset: { uri: string; mimeType?: string; fileName?: string },
    previousAvatar: string | null
  ) => {
    try {
      // 1. Uploading State
      setPhotoUploadState('uploading');
      setUploadErrorMessage(null);

      const uploadRes = await api.media.uploadImage(asset.uri, asset.mimeType || 'image/jpeg', asset.fileName);
      if (!uploadRes?.url) {
        throw new Error('Upload completed but no secure image URL was returned.');
      }

      const canonicalUrl = uploadRes.url;

      // 2. Saving Profile State (Wait for backend confirmation)
      setPhotoUploadState('saving');
      const vendorRes = await api.vendors.updateProfile({ avatar: canonicalUrl });
      await api.auth.updateProfile({ name: fullName || user?.name || 'Vendor', avatar: canonicalUrl }).catch(() => {});

      if (!vendorRes?.success) {
        throw new Error('Photo was uploaded to storage, but failed to persist to vendor profile in database.');
      }

      // 3. Success State (Confirmed from backend)
      const confirmedUrl = canonicalUrl;
      setAvatarUri(confirmedUrl);
      updateLocalUser({ avatar: confirmedUrl });
      setStagedAsset(null);
      setPhotoUploadState('success');

      Alert.alert('Profile Photo Updated 🎉', 'Your new profile picture has been saved successfully.');

      setTimeout(() => {
        setPhotoUploadState('idle');
      }, 2500);
    } catch (err: any) {
      // 4. Failed State (Stop spinner, retain previous photo, provide retry)
      setPhotoUploadState('failed');
      const msg = err?.message || 'Could not upload profile picture.';
      setUploadErrorMessage(msg);
      // Revert optimistic preview back to preserved previous photo
      setAvatarUri(previousAvatar);

      Alert.alert(
        'Upload Failed',
        `${msg}\n\nWould you like to try again?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: () => executeUploadAndPersist(asset, previousAvatar) }
        ]
      );
    }
  };

  const handlePickPhoto = async () => {
    if (isPhotoBusy) return;
    const previousAvatar = avatarUri;

    try {
      setPhotoUploadState('selecting');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setPhotoUploadState('idle');
        Alert.alert(
          'Permission Required',
          'Please allow access to your photo library to update your profile photo.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85
      });

      // User cancelled picker: retain previous saved photo cleanly
      if (result.canceled || !result.assets || result.assets.length === 0) {
        setPhotoUploadState('idle');
        return;
      }

      const asset = result.assets[0];

      // Optimistic preview immediately so user sees their cropped selection
      setAvatarUri(asset.uri);
      const chosenAsset = { uri: asset.uri, mimeType: asset.mimeType, fileName: asset.fileName };
      setStagedAsset(chosenAsset);

      // Execute upload pipeline
      await executeUploadAndPersist(chosenAsset, previousAvatar);
    } catch (err: any) {
      setPhotoUploadState('idle');
      setAvatarUri(previousAvatar);
      Alert.alert('Selection Error', err?.message || 'Could not pick image.');
    }
  };

  const handleAddSkill = () => {
    const trimmed = newSkillText.trim();
    if (!trimmed) return;
    if (!skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
    }
    setNewSkillText('');
    setAddSkillModalOpen(false);
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const handleSaveChanges = async () => {
    if (!fullName.trim()) {
      Alert.alert('Validation Error', 'Full Name is required.');
      return;
    }
    if (!businessName.trim()) {
      Alert.alert('Validation Error', 'Business Name is required.');
      return;
    }

    try {
      setSaving(true);
      const payload: Partial<VendorProfile> & { fullName?: string; name?: string; phone?: string; skills?: string[] } = {
        fullName: fullName.trim(),
        name: fullName.trim(),
        businessName: businessName.trim(),
        phone: phone.trim(),
        bio: bio.trim(),
        skills
      };

      if (avatarUri && (avatarUri.startsWith('http') || avatarUri.startsWith('file:') || avatarUri.startsWith('content:'))) {
        payload.avatar = avatarUri;
      }

      const res = await api.vendors.updateProfile(payload);
      if (res?.success) {
        updateLocalUser({
          name: fullName.trim(),
          phone: phone.trim(),
          ...(payload.avatar ? { avatar: payload.avatar } : {})
        });
        Alert.alert('Profile Saved 🎉', 'Your professional profile details have been updated successfully.', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (err: any) {
      Alert.alert('Update Failed', err?.message || 'Could not save profile changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screenWrapper}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* ── TOP HEADER ── */}
      <View style={[styles.headerBar, { paddingTop: topInset + 6 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#06684F" />
          <Text style={{ marginTop: 10, color: '#64748B', fontSize: 13 }}>Loading profile...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── AVATAR CIRCLE & CHANGE PHOTO ── */}
          <View style={styles.avatarSection}>
            <TouchableOpacity
              style={styles.avatarWrap}
              onPress={photoUploadState === 'failed' && stagedAsset ? () => executeUploadAndPersist(stagedAsset, avatarUri) : handlePickPhoto}
              disabled={isPhotoBusy}
              activeOpacity={0.85}
            >
              {avatarUri && !imageError ? (
                <Image
                  source={{ uri: avatarUri }}
                  key={avatarUri}
                  style={styles.avatarImg}
                  resizeMode="cover"
                  onError={() => setImageError(true)}
                  onLoad={() => setImageError(false)}
                />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarLetter}>
                    {(fullName || 'M').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}

              {/* Camera Icon Pin / State Icon */}
              <View style={[
                styles.cameraPin,
                photoUploadState === 'failed' ? { backgroundColor: '#DC2626' } : photoUploadState === 'success' ? { backgroundColor: '#059669' } : {}
              ]}>
                <Ionicons
                  name={photoUploadState === 'failed' ? 'refresh' : photoUploadState === 'success' ? 'checkmark' : 'camera'}
                  size={14}
                  color="#FFFFFF"
                />
              </View>

              {isPhotoBusy && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={photoUploadState === 'failed' && stagedAsset ? () => executeUploadAndPersist(stagedAsset, avatarUri) : handlePickPhoto}
              disabled={isPhotoBusy}
              activeOpacity={0.7}
              style={{ marginTop: 8 }}
            >
              <Text style={[
                styles.changePhotoText,
                photoUploadState === 'failed' ? { color: '#DC2626', fontWeight: '700' } : photoUploadState === 'success' ? { color: '#059669', fontWeight: '700' } : {}
              ]}>
                {photoUploadState === 'selecting'
                  ? 'Selecting Photo...'
                  : photoUploadState === 'uploading'
                  ? 'Uploading Photo...'
                  : photoUploadState === 'saving'
                  ? 'Saving Profile...'
                  : photoUploadState === 'success'
                  ? '✓ Photo Updated'
                  : photoUploadState === 'failed'
                  ? '⚠️ Tap to Retry Upload'
                  : 'Change Photo'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── BASIC INFORMATION SECTION ── */}
          <Text style={styles.sectionHeading}>Basic Information</Text>

          <View style={styles.formCard}>
            {/* Full Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Full Name</Text>
              <TextInput
                style={styles.textInput}
                value={fullName}
                onChangeText={setFullName}
                placeholder="e.g. Mohammad Aalam"
                placeholderTextColor="#94A3B8"
              />
            </View>

            {/* Business Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Business Name</Text>
              <TextInput
                style={styles.textInput}
                value={businessName}
                onChangeText={setBusinessName}
                placeholder="e.g. Aalam Technical Services"
                placeholderTextColor="#94A3B8"
              />
            </View>

            {/* Phone Number */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Phone Number</Text>
              <TextInput
                style={styles.textInput}
                value={phone}
                onChangeText={setPhone}
                placeholder="+91 98765 43210"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
              />
            </View>

            {/* Email */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={[styles.textInput, styles.disabledInput]}
                value={email}
                editable={false}
                placeholder="vendor@worklogy.com"
                placeholderTextColor="#94A3B8"
              />
            </View>

            {/* Bio / About Me */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelCountRow}>
                <Text style={styles.fieldLabel}>Bio / About Me</Text>
                <Text style={styles.charCountText}>{bio.length}/300</Text>
              </View>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={bio}
                onChangeText={(text) => text.length <= 300 && setBio(text)}
                placeholder="Professional AC Technician with 5+ years of experience. I provide reliable and quality service for AC installation, repair and maintenance."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* ── SKILLS SECTION ── */}
          <Text style={[styles.sectionHeading, { marginTop: 18 }]}>Skills</Text>

          <View style={styles.skillsCard}>
            <View style={styles.skillsRow}>
              {skills.map((skill, idx) => (
                <View key={idx} style={styles.skillChip}>
                  <Text style={styles.skillChipText}>{skill}</Text>
                  <TouchableOpacity
                    onPress={() => handleRemoveSkill(skill)}
                    style={styles.skillRemoveBtn}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons name="close" size={13} color="#475569" />
                  </TouchableOpacity>
                </View>
              ))}

              {/* + Add Skill Button */}
              <TouchableOpacity
                style={styles.addSkillBtn}
                onPress={() => setAddSkillModalOpen(true)}
                activeOpacity={0.75}
              >
                <Ionicons name="add" size={15} color="#06684F" />
                <Text style={styles.addSkillBtnText}>Add Skill</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── SAVE CHANGES BUTTON ── */}
          <TouchableOpacity
            style={styles.saveChangesBtn}
            onPress={handleSaveChanges}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveChangesBtnText}>Save Changes</Text>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ── ADD SKILL MODAL ── */}
      <Modal visible={addSkillModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Add Custom Skill</Text>
            <TextInput
              style={styles.modalInput}
              value={newSkillText}
              onChangeText={setNewSkillText}
              placeholder="e.g. Copper Pipe Brazing"
              placeholderTextColor="#94A3B8"
              autoFocus
            />
            <View style={styles.modalBtnsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setAddSkillModalOpen(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleAddSkill}
              >
                <Text style={styles.modalConfirmText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  headerBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A'
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  scroll: {
    flex: 1
  },
  scrollContent: {
    padding: 16
  },

  // ── Avatar Section ──
  avatarSection: {
    alignItems: 'center',
    marginVertical: 14
  },
  avatarWrap: {
    position: 'relative'
  },
  avatarImg: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: '#F1F5F9'
  },
  avatarFallback: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#06684F',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF'
  },
  avatarLetter: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF'
  },
  cameraPin: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#06684F',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF'
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center'
  },
  changePhotoText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#06684F'
  },

  // ── Basic Info ──
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1
  },
  fieldGroup: {
    marginBottom: 14
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6
  },
  labelCountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  charCountText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600'
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A'
  },
  disabledInput: {
    backgroundColor: '#F1F5F9',
    color: '#64748B'
  },
  textArea: {
    minHeight: 88,
    paddingTop: 10
  },

  // ── Skills ──
  skillsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  skillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20
  },
  skillChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginRight: 4
  },
  skillRemoveBtn: {
    padding: 2
  },
  addSkillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4
  },
  addSkillBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#06684F'
  },

  // ── Save Button ──
  saveChangesBtn: {
    marginTop: 20,
    backgroundColor: '#06684F',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#06684F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3
  },
  saveChangesBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF'
  },

  // ── Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  modalBox: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 16
  },
  modalBtnsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B'
  },
  modalConfirmBtn: {
    backgroundColor: '#06684F',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF'
  }
});

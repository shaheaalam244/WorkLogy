import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Image,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
  Linking,
  PermissionsAndroid
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../hooks/useAuth';
import { COLORS } from '../theme/colors';
import { api } from '../api/client';
import { getDisplayEmail, isTemporaryEmail, isGenuineName, getDisplayName } from '../utils/formatters';
import { secureStorage } from '../storage/secureStorage';
import { STORAGE_KEYS } from '../constants';
import { saveLocation, detectGpsLocation } from '../services/locationService';
import { dataSyncService } from '../services/dataSyncService';
import type { ServiceAddress, TransactionItem, SupportTicketItem, NotificationPreferences } from '../types';

const STATUSBAR_HEIGHT =
  Platform.OS === 'android' ? StatusBar.currentHeight || 24 : Platform.OS === 'ios' ? 44 : 0;

export default function ProfileScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0
  );
  const { user, logout, switchRole, updateProfile, refreshProfile } = useAuth();

  // Addresses State
  const [addresses, setAddresses] = useState<ServiceAddress[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [selectedAddressIndex, setSelectedAddressIndex] = useState<number>(0);

  // Stats State
  const [bookingCount, setBookingCount] = useState<number>(0);
  const [transactionCount, setTransactionCount] = useState<number>(0);

  // Push Sound State (persisted locally)
  const [pushSoundEnabled, setPushSoundEnabled] = useState(true);

  const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80';

  // Modals Visibility
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showSavedVendorsModal, setShowSavedVendorsModal] = useState(false);
  const [savedVendors, setSavedVendors] = useState<any[]>([]);

  // Edit Profile Form State
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [pickedImageUri, setPickedImageUri] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string; phone?: string }>({});
  const [savingProfile, setSavingProfile] = useState(false);

  // Security & Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<{ current?: string; new?: string; confirm?: string }>({});
  const [savingPassword, setSavingPassword] = useState(false);

  // Device Notification Permissions State
  const [deviceNotificationStatus, setDeviceNotificationStatus] = useState<string>('checking');

  // Add/Edit Address Form State
  const [addrLabel, setAddrLabel] = useState('Home');
  const [addrHouseNumber, setAddrHouseNumber] = useState('');
  const [addrStreet, setAddrStreet] = useState('');
  const [addrLocality, setAddrLocality] = useState('');
  const [addrCity, setAddrCity] = useState('');
  const [addrState, setAddrState] = useState('');
  const [addrZip, setAddrZip] = useState('');
  const [addrErrors, setAddrErrors] = useState<{ street?: string; city?: string; zip?: string }>({});
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [savingAddress, setSavingAddress] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);
  const [detectedCoords, setDetectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsLocationLabel, setGpsLocationLabel] = useState<string | null>(null);

  // Notification Preferences State
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>({
    emailBookings: true,
    emailStatusUpdates: true,
    emailQuotations: true,
    emailCancellations: true,
    emailMarketing: false
  });
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [savingNotifs, setSavingNotifs] = useState(false);

  // Transactions State
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  // Support & Tickets State
  const [supportTab, setSupportTab] = useState<'faq' | 'tickets' | 'new_ticket'>('faq');
  const [tickets, setTickets] = useState<SupportTicketItem[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(0);
  const [ticketCategory, setTicketCategory] = useState<'booking' | 'payment' | 'service' | 'dispute' | 'general'>('booking');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');
  const [ticketPriority, setTicketPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [creatingTicket, setCreatingTicket] = useState(false);

  // Refreshing overall profile state
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (user?._id) {
      loadInitialData();
    }
  }, [user?._id]);

  useEffect(() => {
    const unsubBookings = dataSyncService.subscribe('BOOKINGS_CHANGED', () => {
      if (user?._id) loadBookingStats();
    });
    const unsubProfile = dataSyncService.subscribe('PROFILE_CHANGED', () => {
      if (user?._id) loadInitialData();
    });
    return () => {
      unsubBookings();
      unsubProfile();
    };
  }, [user?._id]);

  const loadInitialData = async () => {
    if (!user?._id) return;
    await Promise.allSettled([
      loadAddresses(),
      loadTransactions(),
      loadPushSoundPreference(),
      loadNotificationPreferences(),
      loadBookingStats(),
      checkDeviceNotificationPermission()
    ]);
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshProfile();
      if (user?._id) await loadInitialData();
    } catch {
      // background refresh error handled
    } finally {
      setIsRefreshing(false);
    }
  };

  const loadPushSoundPreference = async () => {
    try {
      const stored = await secureStorage.getItem('worklogy_push_sound');
      if (stored !== null) {
        setPushSoundEnabled(stored === '1' || stored === 'true');
      }
    } catch {
      // ignore
    }
  };

  const handleTogglePushSound = async (val: boolean) => {
    setPushSoundEnabled(val);
    try {
      await secureStorage.setItem('worklogy_push_sound', val ? '1' : '0');
    } catch {
      // ignore
    }
  };

  const loadAddresses = async () => {
    if (!user?._id) return;
    try {
      setLoadingAddresses(true);
      const res = await api.customer.getProfile();
      let addrList: ServiceAddress[] = [];
      if (res?.profile?.addresses) {
        addrList = res.profile.addresses;
      } else {
        const addrRes = await api.customer.getAddresses();
        if (addrRes?.addresses) {
          addrList = addrRes.addresses;
        }
      }
      setAddresses(addrList);
      const defIdx = addrList.findIndex((a) => a.isDefault);
      if (defIdx >= 0) {
        setSelectedAddressIndex(defIdx);
      }
      if (res?.profile?.savedVendors) {
        setSavedVendors(res.profile.savedVendors);
      }
    } catch {
      // Ignore background error
    } finally {
      setLoadingAddresses(false);
    }
  };

  const loadBookingStats = async () => {
    if (!user?._id) return;
    try {
      const statsRes = await api.customer.getStats();
      if (statsRes?.success && typeof statsRes.activeJobsCount === 'number') {
        setBookingCount(statsRes.activeJobsCount);
        if (typeof statsRes.transactionCount === 'number' && statsRes.transactionCount > 0) {
          setTransactionCount(statsRes.transactionCount);
        }
        return;
      }
    } catch {
      // Fallback: query active bookings directly
      try {
        const res = await api.bookings.getMyBookings({ status: 'active' });
        if (res?.bookings && Array.isArray(res.bookings)) {
          setBookingCount(res.bookings.length);
        }
      } catch {
        // ignore
      }
    }
  };

  const loadTransactions = async () => {
    if (!user?._id) return;
    try {
      setLoadingTransactions(true);
      const res = await api.customer.getTransactions();
      if (res?.transactions) {
        setTransactions(res.transactions);
        setTransactionCount(res.transactions.length);
      }
    } catch {
      // Ignore background error
    } finally {
      setLoadingTransactions(false);
    }
  };

  const loadNotificationPreferences = async () => {
    if (!user?._id) return;
    try {
      setLoadingNotifs(true);
      const res = await api.notifications.getPreferences();
      if (res?.preferences) {
        setNotifPrefs(res.preferences);
      }
    } catch {
      // ignore
    } finally {
      setLoadingNotifs(false);
    }
  };

  const loadTickets = async () => {
    if (!user?._id) return;
    try {
      setLoadingTickets(true);
      const res = await api.support.getMyTickets();
      if (res?.tickets) {
        setTickets(res.tickets);
      }
    } catch {
      // ignore
    } finally {
      setLoadingTickets(false);
    }
  };

  // Profile Photo Picker & Handlers
  const handlePickAvatar = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Gallery Permission Required',
          'Access to your device photo gallery is needed to select a profile picture. Please enable permission in Settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
          Alert.alert('File Too Large', 'Please choose an image under 10 MB.');
          return;
        }
        setPickedImageUri(asset.uri);
      }
    } catch (err: any) {
      Alert.alert('Image Selection Error', err.message || 'Could not pick image.');
    }
  };

  const handleRemoveAvatar = () => {
    Alert.alert(
      'Remove Profile Photo',
      'Are you sure you want to remove your custom photo and restore the default avatar?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setPickedImageUri(null);
            setEditAvatar(DEFAULT_AVATAR);
          }
        }
      ]
    );
  };

  // Open Edit Profile Modal
  const openEditProfile = () => {
    // If name is a placeholder ('New Customer', etc.), display empty string so placeholder is visible
    const initialName = isGenuineName(user?.name) ? (user?.name || '').trim() : '';
    // If email is a temporary/placeholder email, display empty string
    const initialEmail = getDisplayEmail(user?.email);
    setEditName(initialName);
    setEditEmail(initialEmail);
    setEditPhone(user?.phone || '');
    setEditAvatar(user?.avatar || DEFAULT_AVATAR);
    setPickedImageUri(null);
    setFieldErrors({});
    setShowEditModal(true);
  };

  const validateProfileForm = (): boolean => {
    const errors: { name?: string; email?: string; phone?: string } = {};

    const trimmedName = editName.trim();
    if (!trimmedName) {
      errors.name = 'Full name is required.';
    } else if (trimmedName.length < 2) {
      errors.name = 'Full name must be at least 2 characters.';
    } else if (!isGenuineName(trimmedName)) {
      errors.name = 'Please enter your genuine full name.';
    }

    // Email is optional. But if filled, must be valid format and not a temporary placeholder
    const trimmedEmail = editEmail.trim();
    if (trimmedEmail) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        errors.email = 'Please enter a valid email address.';
      } else if (isTemporaryEmail(trimmedEmail)) {
        errors.email = 'Please enter a genuine personal or work email address.';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveProfile = async () => {
    if (!validateProfileForm()) return;

    try {
      setSavingProfile(true);
      let finalAvatarUrl = editAvatar.trim() || user?.avatar || DEFAULT_AVATAR;

      // Upload local image to Cloudinary if user selected a new photo
      if (pickedImageUri) {
        try {
          const uploadRes = await api.media.uploadImage(pickedImageUri);
          if (uploadRes?.url) {
            finalAvatarUrl = uploadRes.url;
          }
        } catch (uploadErr: any) {
          Alert.alert(
            'Photo Upload Failed',
            `Could not upload profile picture: ${uploadErr.message || 'Network error'}. Your other profile details were not saved.`
          );
          setSavingProfile(false);
          return;
        }
      }

      await updateProfile({
        name: editName.trim(),
        email: editEmail.trim(), // Can be empty string if customer leaves it blank
        phone: user?.phone || editPhone.trim(), // Phone is read-only and preserved
        avatar: finalAvatarUrl
      });

      setShowEditModal(false);
      setPickedImageUri(null);
      setFieldErrors({});
      await refreshProfile();
      Alert.alert('Profile Updated 🎉', 'Your customer profile details have been saved successfully.');
    } catch (err: any) {
      Alert.alert('Update Failed', err.message || 'Could not save profile changes.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Security & Password Handlers
  const openChangePassword = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPass(false);
    setShowNewPass(false);
    setShowConfirmPass(false);
    setPasswordErrors({});
    setShowPasswordModal(true);
  };

  const validatePasswordForm = (): boolean => {
    const errors: { current?: string; new?: string; confirm?: string } = {};

    if (!currentPassword) {
      errors.current = 'Current password is required.';
    }

    if (!newPassword) {
      errors.new = 'New password is required.';
    } else if (newPassword.length < 6) {
      errors.new = 'New password must be at least 6 characters.';
    } else if (newPassword === currentPassword) {
      errors.new = 'New password must be different from current password.';
    }

    if (!confirmPassword) {
      errors.confirm = 'Please confirm your new password.';
    } else if (confirmPassword !== newPassword) {
      errors.confirm = 'Passwords do not match.';
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSavePassword = async () => {
    if (!validatePasswordForm()) return;

    try {
      setSavingPassword(true);
      const res = await api.auth.updatePassword({
        currentPassword,
        newPassword
      });

      if (res?.success) {
        setShowPasswordModal(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordErrors({});
        Alert.alert('Password Updated 🎉', 'Your account password has been updated securely.');
      } else {
        Alert.alert('Update Failed', res?.message || 'Could not update password.');
      }
    } catch (err: any) {
      Alert.alert('Password Update Failed', err.message || 'Incorrect current password or server error.');
    } finally {
      setSavingPassword(false);
    }
  };

  // Device Notification Permissions
  const checkDeviceNotificationPermission = async () => {
    try {
      if (Platform.OS === 'android') {
        if (typeof Platform.Version === 'number' && Platform.Version >= 33) {
          const hasPerm = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          );
          setDeviceNotificationStatus(hasPerm ? 'granted' : 'denied');
        } else {
          setDeviceNotificationStatus('granted');
        }
      } else {
        setDeviceNotificationStatus('granted');
      }
    } catch {
      setDeviceNotificationStatus('undetermined');
    }
  };

  const handleRequestNotificationPermission = async () => {
    try {
      if (Platform.OS === 'android') {
        if (typeof Platform.Version === 'number' && Platform.Version >= 33) {
          const result = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
            {
              title: 'WorkLogy Service Alerts',
              message: 'Allow WorkLogy to notify you about technician arrivals, emergency dispatch, and quotations.',
              buttonPositive: 'Allow',
              buttonNegative: 'Not Now'
            }
          );
          if (result === PermissionsAndroid.RESULTS.GRANTED) {
            setDeviceNotificationStatus('granted');
            Alert.alert('Notifications Enabled 🎉', 'You will receive immediate alerts for technician arrivals and quotes.');
          } else {
            setDeviceNotificationStatus('denied');
            Alert.alert(
              'Notification Permission',
              'Push notifications are currently disabled. To receive immediate emergency arrival alerts, please enable them in settings.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Open Settings', onPress: () => Linking.openSettings() }
              ]
            );
          }
        } else {
          setDeviceNotificationStatus('granted');
          Alert.alert('Notifications Enabled 🎉', 'Your device is configured to receive service alerts.');
        }
      } else {
        setDeviceNotificationStatus('granted');
        Alert.alert('Notifications Enabled 🎉', 'Your device is configured to receive service alerts.');
      }
    } catch (err: any) {
      Alert.alert('Settings', 'Please configure notification permissions in device settings.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() }
      ]);
    }
  };

  // Address Actions
  const handleUseGpsForAddress = async () => {
    try {
      setDetectingGps(true);
      const res = await detectGpsLocation();
      if (!res.success || !res.location) {
        Alert.alert(
          'GPS Detection Failed',
          res.error || 'Could not auto-detect location. Please enter your address details manually.'
        );
        return;
      }

      const loc = res.location;
      if (loc.coordinates && (loc.coordinates.lat !== 0 || loc.coordinates.lng !== 0)) {
        setDetectedCoords({
          lat: Number(loc.coordinates.lat),
          lng: Number(loc.coordinates.lng)
        });
      }
      if (loc.accuracyMeters != null) {
        setGpsAccuracy(loc.accuracyMeters);
      }
      setGpsLocationLabel(loc.fullAddress || `${loc.city || ''}, ${loc.locality || ''}`);

      // Populate fields with freshly acquired GPS location — replaces old mismatched location data
      setAddrHouseNumber(loc.houseNumber || '');
      const streetVal = loc.street || loc.locality || '';
      setAddrStreet(streetVal);
      const localityVal =
        loc.locality && loc.locality.toLowerCase() !== streetVal.toLowerCase()
          ? loc.locality
          : (loc.district && loc.district.toLowerCase() !== (loc.city || '').toLowerCase()
              ? loc.district
              : loc.locality || '');
      setAddrLocality(localityVal);
      setAddrCity(loc.city || 'Lucknow');
      setAddrState(loc.state || 'Uttar Pradesh');
      setAddrZip(loc.pincode || '');

      // Clear field errors for newly auto-filled address
      setAddrErrors({});
    } catch (err: any) {
      Alert.alert('GPS Error', err?.message || 'Failed to detect current GPS location.');
    } finally {
      setDetectingGps(false);
    }
  };

  const handleOpenEditAddress = (addr: ServiceAddress) => {
    setEditingAddressId(addr._id || null);
    setAddrLabel(addr.label || 'Home');
    setAddrHouseNumber(addr.houseNumber || '');
    setAddrStreet(addr.street || '');
    setAddrLocality(addr.locality || addr.landmark || '');
    setAddrCity(addr.city || 'Lucknow');
    setAddrState(addr.state || 'Uttar Pradesh');
    setAddrZip(addr.zipCode || addr.pincode || '');
    setAddrErrors({});

    if (addr.coordinates && (Number(addr.coordinates.lat) !== 0 || Number(addr.coordinates.lng) !== 0)) {
      setDetectedCoords({
        lat: Number(addr.coordinates.lat),
        lng: Number(addr.coordinates.lng)
      });
      setGpsLocationLabel(`${Number(addr.coordinates.lat).toFixed(4)}, ${Number(addr.coordinates.lng).toFixed(4)}`);
    } else {
      setDetectedCoords(null);
      setGpsLocationLabel(null);
    }
    setGpsAccuracy(null);
    setShowAddAddressModal(true);
  };

  const handleSaveAddress = async () => {
    const errors: { street?: string; city?: string; zip?: string } = {};
    if (!addrStreet.trim()) errors.street = 'Street or road name is required.';
    if (!addrCity.trim()) errors.city = 'City is required.';
    if (!addrZip.trim()) {
      errors.zip = 'PIN code is required.';
    } else if (!/^\d{6}$/.test(addrZip.trim())) {
      errors.zip = 'Please enter a valid 6-digit PIN code.';
    }

    if (Object.keys(errors).length > 0) {
      setAddrErrors(errors);
      Alert.alert('Missing Details', 'Please fill in all required address fields.');
      return;
    }

    try {
      setSavingAddress(true);

      const coordinates = detectedCoords || { lat: 0, lng: 0 };

      if (editingAddressId) {
        const updatePayload: Partial<ServiceAddress> = {
          label: addrLabel,
          houseNumber: addrHouseNumber.trim(),
          street: addrStreet.trim(),
          locality: addrLocality.trim(),
          landmark: addrLocality.trim(),
          city: addrCity.trim(),
          state: addrState.trim() || 'Uttar Pradesh',
          zipCode: addrZip.trim(),
          coordinates
        };

        const res = await api.customer.updateAddress(editingAddressId, updatePayload);
        if (res?.addresses && res.addresses.length > 0) {
          setAddresses(res.addresses);
        } else {
          await loadAddresses();
        }

        // Check if the edited address is the current active address
        const wasActive =
          (selectedAddressIndex !== -1 && addresses[selectedAddressIndex]?._id === editingAddressId) ||
          addresses.find((a) => a._id === editingAddressId)?.isDefault;

        if (wasActive) {
          const fullAddr = [
            addrHouseNumber.trim(),
            addrStreet.trim(),
            addrLocality.trim(),
            addrCity.trim(),
            addrZip.trim()
          ].filter(Boolean).join(', ');

          await saveLocation({
            city: addrCity.trim(),
            locality: addrLocality.trim(),
            state: addrState.trim() || 'Uttar Pradesh',
            pincode: addrZip.trim(),
            street: addrStreet.trim(),
            houseNumber: addrHouseNumber.trim(),
            fullAddress: fullAddr,
            coordinates,
            method: 'saved',
            addressId: editingAddressId
          });
          dataSyncService.notify('LOCATION_CHANGED');
        }

        setShowAddAddressModal(false);
        setEditingAddressId(null);
        Alert.alert('Address Updated', 'Your service address changes have been saved.');
      } else {
        // Prevent duplicate addresses
        const isDuplicate = addresses.some(
          (a) =>
            (a.houseNumber || '').toLowerCase().trim() === addrHouseNumber.toLowerCase().trim() &&
            a.street.toLowerCase().trim() === addrStreet.toLowerCase().trim() &&
            (a.locality || a.landmark || '').toLowerCase().trim() === addrLocality.toLowerCase().trim() &&
            a.city.toLowerCase().trim() === addrCity.toLowerCase().trim() &&
            (a.zipCode || a.pincode || '').trim() === addrZip.trim()
        );

        if (isDuplicate) {
          Alert.alert('Duplicate Address', 'An address with these identical details is already saved in your profile.');
          return;
        }

        const newAddress = {
          label: addrLabel,
          houseNumber: addrHouseNumber.trim(),
          street: addrStreet.trim(),
          locality: addrLocality.trim(),
          landmark: addrLocality.trim(),
          city: addrCity.trim(),
          state: addrState.trim() || 'Uttar Pradesh',
          zipCode: addrZip.trim(),
          coordinates,
          isDefault: addresses.length === 0
        };
        const res = await api.customer.addAddress(newAddress);
        if (res?.addresses && res.addresses.length > 0) {
          setAddresses(res.addresses);
        } else {
          await loadAddresses();
        }

        if (addresses.length === 0) {
          const fullAddr = [
            addrHouseNumber.trim(),
            addrStreet.trim(),
            addrLocality.trim(),
            addrCity.trim(),
            addrZip.trim()
          ].filter(Boolean).join(', ');

          await saveLocation({
            city: addrCity.trim(),
            locality: addrLocality.trim(),
            state: addrState.trim() || 'Uttar Pradesh',
            pincode: addrZip.trim(),
            street: addrStreet.trim(),
            houseNumber: addrHouseNumber.trim(),
            fullAddress: fullAddr,
            coordinates,
            method: 'saved'
          });
          dataSyncService.notify('LOCATION_CHANGED');
        }

        setShowAddAddressModal(false);
        Alert.alert('Address Saved', 'Your service address has been added to your profile.');
      }

      setAddrHouseNumber('');
      setAddrStreet('');
      setAddrLocality('');
      setAddrCity('');
      setAddrState('');
      setAddrZip('');
      setDetectedCoords(null);
      setGpsAccuracy(null);
      setGpsLocationLabel(null);
      setAddrErrors({});
      setEditingAddressId(null);
    } catch (err: any) {
      Alert.alert('Failed to Save', err.message || 'Could not save address. Please verify your details.');
    } finally {
      setSavingAddress(false);
    }
  };

  const handleDeleteAddress = (addrId?: string, label?: string) => {
    if (!addrId) return;
    Alert.alert(
      'Delete Address',
      `Are you sure you want to delete "${label || 'this address'}"?\n\nNote: Existing past bookings will preserve their historical address snapshot.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await api.customer.deleteAddress(addrId);
              if (res?.addresses) {
                setAddresses(res.addresses);
                const defIdx = res.addresses.findIndex((a: any) => a.isDefault);
                if (defIdx >= 0) setSelectedAddressIndex(defIdx);
              } else {
                await loadAddresses();
              }
              Alert.alert('Address Removed', 'The address has been deleted.');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Could not delete address.');
            }
          }
        }
      ]
    );
  };

  const handleSelectActiveAddress = async (addr: ServiceAddress, index: number) => {
    setSelectedAddressIndex(index);
    const formatted = `${addr.houseNumber ? addr.houseNumber + ', ' : ''}${addr.street}${addr.locality ? ', ' + addr.locality : ''}, ${addr.city} ${addr.zipCode || addr.pincode || ''}`;
    try {
      if (addr._id) {
        const res = await api.customer.setDefaultAddress(addr._id);
        if (res?.addresses) {
          setAddresses(res.addresses);
        }
      } else {
        setAddresses((prev) =>
          prev.map((a, i) => ({ ...a, isDefault: i === index }))
        );
      }
      await saveLocation(formatted, { ...addr, isDefault: true, isExplicit: true, addressId: addr._id });
      Alert.alert('Active Location Set', `Your primary service location is set to:\n\n${formatted}`);
    } catch (err: any) {
      Alert.alert('Notice', err.message || 'Could not persist active address to server, but active for this session.');
    }
  };

  // Notification Preferences Save
  const handleSaveNotifications = async () => {
    try {
      setSavingNotifs(true);
      await api.notifications.updatePreferences(notifPrefs);
      setShowNotificationsModal(false);
      Alert.alert('Preferences Saved', 'Your communication settings have been updated.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not update notification preferences.');
    } finally {
      setSavingNotifs(false);
    }
  };

  // Create Support Ticket
  const handleCreateTicket = async () => {
    if (!ticketSubject.trim() || !ticketDescription.trim()) {
      Alert.alert('Required Fields', 'Please provide a subject and description of your issue.');
      return;
    }
    try {
      setCreatingTicket(true);
      const res = await api.support.createTicket({
        category: ticketCategory,
        subject: ticketSubject.trim(),
        description: ticketDescription.trim(),
        priority: ticketPriority
      });
      setTicketSubject('');
      setTicketDescription('');
      setSupportTab('tickets');
      await loadTickets();
      Alert.alert(
        'Ticket Created',
        `Your dispute/support ticket ${res?.ticket?.ticketNumber || ''} has been registered. Our operations team will respond promptly.`
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not submit support ticket.');
    } finally {
      setCreatingTicket(false);
    }
  };

  // Switch to Vendor Portal Flow
  const handleSwitchToVendor = () => {
    Alert.alert(
      'Switch to Contractor Portal',
      'The Contractor Portal is designed for certified technicians, tradespeople, and contractors to view nearby tenders, submit quotations, and receive service dispatch requests.\n\nAre you sure you want to switch to Contractor mode?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Switch to Contractor',
          onPress: async () => {
            try {
              await switchRole('vendor');
              Alert.alert(
                'Switched to Contractor Mode',
                'Your session is now active in Contractor Mode. To manage field tasks, open the Vendor application.'
              );
            } catch (err: any) {
              Alert.alert('Switch Failed', err.message || 'Could not change active portal.');
            }
          }
        }
      ]
    );
  };

  // Logout Flow
  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to end your session on this device?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          if (navigation.resetTo) {
            navigation.resetTo('Login');
          } else {
            navigation.navigate('Login');
          }
        }
      }
    ]);
  };

  // Date Formatter
  const formatMemberSince = (iso?: string) => {
    if (!iso) return null;
    try {
      const d = new Date(iso);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `Member since ${months[d.getMonth()]} ${d.getFullYear()}`;
    } catch {
      return null;
    }
  };

  // Verification status
  const isVerified = Boolean(user?.isEmailVerified || user?.isVerified || user?.status === 'active');

  const faqs = [
    {
      q: 'How does WorkLogy 100% Escrow Protection work?',
      a: 'When you book a service, your payment is placed safely in a segregated escrow account. The funds are held until the job is completed to your satisfaction and verified via your completion OTP.'
    },
    {
      q: 'How do I verify the technician upon arrival?',
      a: 'Every verified WorkLogy technician carries a digital WorkLogy ID badge and a dedicated Service Pin. Match their photo and badge in the "Booking Dossier" screen before work starts.'
    },
    {
      q: 'What if the technician does not complete the service?',
      a: 'If a job is incomplete or unsatisfactory, do not share the completion OTP. Tap "Raise a Support Ticket" or call 1800-WORKLOGY immediately. Our escrow desk will mediate or issue a 100% refund.'
    },
    {
      q: 'How do I cancel a booking?',
      a: 'You can cancel any booking from the "My Bookings" tab before the specialist departs for your location without any cancellation penalty.'
    }
  ];

  return (
    <View style={styles.container}>
      {/* 1. Safe-Area-Aware Header */}
      <View style={[styles.topHeader, { paddingTop: topInset + (Platform.OS === 'ios' ? 10 : 8) }]}>
        <View>
          <Text style={styles.headerTitle}>Customer Profile</Text>
          <Text style={styles.headerSubtitle}>Account settings, addresses & security</Text>
        </View>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={handleManualRefresh}
          disabled={isRefreshing}
          activeOpacity={0.7}
        >
          {isRefreshing ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Ionicons name="sync-outline" size={20} color={COLORS.primary} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. Customer Identity Card */}
        {!user ? (
          <View style={styles.guestCard}>
            <View style={styles.guestAvatar}>
              <Ionicons name="person-outline" size={32} color={COLORS.primary} />
            </View>
            <Text style={styles.guestTitle}>Guest Customer</Text>
            <Text style={styles.guestSubtitle}>
              Sign in to manage bookings, track emergency technicians, and view verified quotes.
            </Text>
            <TouchableOpacity
              style={styles.signInBtn}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.8}
            >
              <Ionicons name="log-in-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.signInBtnText}>Sign In / Register</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.profileCard}>
            <View style={styles.profileHeaderRow}>
              {/* Avatar with Initials Fallback */}
              <View style={styles.avatarWrapper}>
                {user?.avatar && user.avatar.startsWith('http') ? (
                  <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarInitials}>
                    <Text style={styles.avatarInitialsText}>
                      {(user?.name || 'Customer').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.avatarEditBadge}
                  onPress={openEditProfile}
                  activeOpacity={0.8}
                >
                  <Ionicons name="camera" size={13} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {/* Name, Email, Phone */}
              <View style={styles.profileInfoCol}>
                <Text style={styles.profileName} numberOfLines={1}>
                  {getDisplayName(user?.name, 'Welcome Customer')}
                </Text>
                <Text style={styles.profileEmail} numberOfLines={1}>
                  {getDisplayEmail(user?.email) || 'No email added (Optional)'}
                </Text>

                {user?.phone ? (
                  <View style={styles.phoneBadge}>
                    <Ionicons name="call" size={11} color={COLORS.primary} />
                    <Text style={styles.phoneBadgeText}>{user.phone}</Text>
                    <Ionicons name="checkmark-circle" size={12} color="#059669" style={{ marginLeft: 2 }} />
                  </View>
                ) : (
                  <TouchableOpacity onPress={openEditProfile} style={styles.addPhoneBtn}>
                    <Ionicons name="add-circle-outline" size={12} color={COLORS.textSecondary} />
                    <Text style={styles.addPhoneText}>Add phone number</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Badges Row: Verification Status & Member Since */}
            <View style={styles.badgeRow}>
              {isVerified ? (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="shield-checkmark" size={13} color="#065F46" />
                  <Text style={styles.verifiedBadgeText}>Verified Account</Text>
                </View>
              ) : (
                <View style={styles.pendingBadge}>
                  <Ionicons name="time-outline" size={13} color="#92400E" />
                  <Text style={styles.pendingBadgeText}>Verification Pending</Text>
                </View>
              )}

              {user?.createdAt && formatMemberSince(user.createdAt) ? (
                <View style={styles.memberBadge}>
                  <Ionicons name="calendar-outline" size={12} color={COLORS.textSecondary} />
                  <Text style={styles.memberBadgeText}>{formatMemberSince(user.createdAt)}</Text>
                </View>
              ) : null}
            </View>

            {/* Edit Profile Action */}
            <TouchableOpacity
              style={styles.editProfileBtn}
              onPress={openEditProfile}
              activeOpacity={0.8}
            >
              <Ionicons name="create-outline" size={15} color={COLORS.primary} />
              <Text style={styles.editProfileBtnText}>Edit Profile Information</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 3. Account Activity Summary Row */}
        {user && (
          <View style={styles.statsRow}>
            <TouchableOpacity
              style={styles.statTile}
              onPress={() => navigation.navigate('MyJobsTab')}
              activeOpacity={0.8}
            >
              <Text style={styles.statNumber}>{bookingCount}</Text>
              <Text style={styles.statLabel}>Active Bookings</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.statTile}
              onPress={() => setShowTransactionsModal(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.statNumber}>{transactionCount}</Text>
              <Text style={styles.statLabel}>Transactions</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.statTile}
              onPress={() => setShowSavedVendorsModal(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.statNumber}>{savedVendors.length}</Text>
              <Text style={styles.statLabel}>Saved Pros</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 4. Service & Booking Shortcuts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bookings & Orders</Text>

          <View style={styles.cardContainer}>
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => navigation.navigate('MyJobsTab')}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconCircle, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="briefcase-outline" size={18} color="#2563EB" />
              </View>
              <View style={styles.menuTextCol}>
                <Text style={styles.menuTitle}>My Service Bookings</Text>
                <Text style={styles.menuSubtitle}>View active dispatches, OTPs, and job status</Text>
              </View>
              <Feather name="chevron-right" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => setShowTransactionsModal(true)}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconCircle, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="receipt-outline" size={18} color="#059669" />
              </View>
              <View style={styles.menuTextCol}>
                <Text style={styles.menuTitle}>Escrow Payments & Transactions</Text>
                <Text style={styles.menuSubtitle}>Invoices, security deposits, and settlement receipts</Text>
              </View>
              <Feather name="chevron-right" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuRow, { borderBottomWidth: 0 }]}
              onPress={() => setShowSavedVendorsModal(true)}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconCircle, { backgroundColor: '#FDF2F8' }]}>
                <Ionicons name="bookmark-outline" size={18} color="#DB2777" />
              </View>
              <View style={styles.menuTextCol}>
                <Text style={styles.menuTitle}>Saved Verified Specialists</Text>
                <Text style={styles.menuSubtitle}>Quick re-booking of trusted service pros</Text>
              </View>
              <Feather name="chevron-right" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 5. Saved Service Addresses */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Saved Service Addresses</Text>
            {user && (
              <TouchableOpacity
                style={styles.addAddressHeaderBtn}
                onPress={() => {
                  setEditingAddressId(null);
                  setAddrLabel('Home');
                  setAddrHouseNumber('');
                  setAddrStreet('');
                  setAddrLocality('');
                  setAddrCity('Lucknow');
                  setAddrState('Uttar Pradesh');
                  setAddrZip('');
                  setDetectedCoords(null);
                  setGpsAccuracy(null);
                  setGpsLocationLabel(null);
                  setAddrErrors({});
                  setShowAddAddressModal(true);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={15} color={COLORS.primary} />
                <Text style={styles.addAddressHeaderText}>Add New</Text>
              </TouchableOpacity>
            )}
          </View>

          {loadingAddresses ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading saved addresses...</Text>
            </View>
          ) : addresses.length > 0 ? (
            addresses.map((addr, idx) => {
              const isSelected = !!addr.isDefault || selectedAddressIndex === idx;
              return (
                <View key={addr._id || idx} style={[styles.addressCard, isSelected && styles.addressCardSelected]}>
                  <View style={styles.addressLeftRow}>
                    <View style={[styles.addressIconCircle, isSelected && styles.addressIconCircleSelected]}>
                      <Ionicons
                        name={addr.label?.toLowerCase() === 'office' ? 'business' : 'home'}
                        size={18}
                        color={isSelected ? '#FFFFFF' : COLORS.primary}
                      />
                    </View>

                    <View style={styles.addressDetailsCol}>
                      <View style={styles.addressLabelRow}>
                        <Text style={styles.addressLabel}>{addr.label || 'Service Address'}</Text>
                        {isSelected && (
                          <View style={styles.activeLocationBadge}>
                            <Text style={styles.activeLocationText}>Active Location</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.addressFullText}>
                        {addr.houseNumber ? `${addr.houseNumber}, ` : ''}{addr.street}
                        {addr.locality ? `, ${addr.locality}` : ''}
                      </Text>
                      <Text style={styles.addressCityZip}>
                        {addr.city}{addr.state ? `, ${addr.state}` : ''} - {addr.zipCode || addr.pincode || ''}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.addressActionsRow}>
                    <View style={styles.addressActionsLeft}>
                      {!isSelected && (
                        <TouchableOpacity
                          style={styles.selectAddressBtn}
                          onPress={() => handleSelectActiveAddress(addr, idx)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="location-outline" size={13} color={COLORS.primary} />
                          <Text style={styles.selectAddressText}>Set as Active</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    <View style={styles.addressActionsRight}>
                      <TouchableOpacity
                        style={styles.editAddressBtn}
                        onPress={() => handleOpenEditAddress(addr)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        activeOpacity={0.7}
                        accessibilityLabel="Edit address"
                      >
                        <Ionicons name="pencil-outline" size={16} color={COLORS.primary} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.deleteAddressBtn}
                        onPress={() => handleDeleteAddress(addr._id, addr.label)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        activeOpacity={0.7}
                        accessibilityLabel="Delete address"
                      >
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyAddressBox}>
              <Ionicons name="location-outline" size={32} color={COLORS.textMuted} />
              <Text style={styles.emptyAddressTitle}>No saved service addresses</Text>
              <Text style={styles.emptyAddressSubtitle}>
                Add your home or office address to book emergency and standard repairs with 1 tap.
              </Text>
              {user && (
                <TouchableOpacity
                  style={styles.emptyAddAddressBtn}
                  onPress={() => setShowAddAddressModal(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add-circle-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.emptyAddAddressBtnText}>Add Service Address</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* 6. Preferences & Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences & Account</Text>

          <View style={styles.cardContainer}>
            {/* Notification Preferences */}
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => setShowNotificationsModal(true)}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconCircle, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="notifications-outline" size={18} color="#2563EB" />
              </View>
              <View style={styles.menuTextCol}>
                <Text style={styles.menuTitle}>Alerts & Notifications</Text>
                <Text style={styles.menuSubtitle}>Bookings, quotations, and cancellation alerts</Text>
              </View>
              <Feather name="chevron-right" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>

            {/* Device Push Notification Permissions */}
            <TouchableOpacity
              style={styles.menuRow}
              onPress={handleRequestNotificationPermission}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconCircle, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="phone-portrait-outline" size={18} color={COLORS.primary} />
              </View>
              <View style={styles.menuTextCol}>
                <Text style={styles.menuTitle}>Device Push Notifications</Text>
                <Text style={styles.menuSubtitle}>
                  {deviceNotificationStatus === 'granted'
                    ? 'Active — instant technician arrival & OTP alerts'
                    : deviceNotificationStatus === 'denied'
                    ? 'Disabled in device settings — tap to resolve'
                    : 'Tap to check and request permissions'}
                </Text>
              </View>
              <View style={[
                styles.permissionStatusBadge,
                deviceNotificationStatus === 'granted' ? styles.permissionStatusGranted : styles.permissionStatusPending
              ]}>
                <Text style={[
                  styles.permissionStatusText,
                  deviceNotificationStatus === 'granted' ? styles.permissionTextGranted : styles.permissionTextPending
                ]}>
                  {deviceNotificationStatus === 'granted' ? 'Enabled' : deviceNotificationStatus === 'denied' ? 'Denied' : 'Check'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Push Notification Sound Toggle */}
            <View style={styles.menuRow}>
              <View style={[styles.menuIconCircle, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="volume-high-outline" size={18} color="#059669" />
              </View>
              <View style={styles.menuTextCol}>
                <Text style={styles.menuTitle}>Push Notification Sound</Text>
                <Text style={styles.menuSubtitle}>Urgent emergency callouts & arrival chimes</Text>
              </View>
              <Switch
                value={pushSoundEnabled}
                onValueChange={handleTogglePushSound}
                trackColor={{ false: '#CBD5E1', true: '#A7F3D0' }}
                thumbColor={pushSoundEnabled ? COLORS.primary : '#94A3B8'}
              />
            </View>

            {/* Account Security & Password */}
            {user && (
              <TouchableOpacity
                style={[styles.menuRow, { borderBottomWidth: 0 }]}
                onPress={openChangePassword}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconCircle, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="key-outline" size={18} color="#D97706" />
                </View>
                <View style={styles.menuTextCol}>
                  <Text style={styles.menuTitle}>Account Security & Password</Text>
                  <Text style={styles.menuSubtitle}>Change password and review session safety</Text>
                </View>
                <Feather name="chevron-right" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 7. Support & Escrow Help */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Help & Support</Text>

          <View style={styles.cardContainer}>
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => {
                setSupportTab('faq');
                setShowSupportModal(true);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconCircle, { backgroundColor: '#F5F3FF' }]}>
                <Ionicons name="shield-checkmark-outline" size={18} color="#7C3AED" />
              </View>
              <View style={styles.menuTextCol}>
                <Text style={styles.menuTitle}>Customer Support & Escrow Help</Text>
                <Text style={styles.menuSubtitle}>24/7 service desk, dispute desk, and FAQs</Text>
              </View>
              <Feather name="chevron-right" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuRow, { borderBottomWidth: 0 }]}
              onPress={handleSwitchToVendor}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconCircle, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="construct-outline" size={18} color="#D97706" />
              </View>
              <View style={styles.menuTextCol}>
                <Text style={styles.menuTitle}>Switch to Contractor Portal</Text>
                <Text style={styles.menuSubtitle}>For technicians and field tradespeople</Text>
              </View>
              <Feather name="chevron-right" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 8. Sign Out */}
        {user && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.signOutBtn}
              onPress={handleLogout}
              activeOpacity={0.8}
            >
              <Ionicons name="log-out-outline" size={18} color="#DC2626" style={{ marginRight: 8 }} />
              <Text style={styles.signOutBtnText}>Sign Out from WorkLogy</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 90 }} />
      </ScrollView>

      {/* ========================================================================= */}
      {/* MODAL 1: EDIT PROFILE                                                     */}
      {/* ========================================================================= */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Edit Customer Profile</Text>
                <Text style={styles.modalHeaderSubtitle}>Update personal info, avatar and verified credentials</Text>
              </View>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Profile Photo Picker Section */}
              <View style={styles.avatarEditSection}>
                <View style={styles.avatarPreviewWrapper}>
                  {(pickedImageUri || editAvatar) &&
                  ((pickedImageUri || editAvatar).startsWith('http') ||
                   (pickedImageUri || editAvatar).startsWith('file:') ||
                   (pickedImageUri || editAvatar).startsWith('content:')) ? (
                    <Image
                      source={{ uri: pickedImageUri || editAvatar }}
                      style={styles.avatarPreviewImage}
                    />
                  ) : (
                    <View style={styles.avatarPreviewPlaceholder}>
                      <Text style={styles.avatarPreviewInitials}>
                        {(editName || user?.name || 'C').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  {pickedImageUri && (
                    <View style={styles.newPhotoBadge}>
                      <Ionicons name="sparkles" size={11} color="#FFFFFF" />
                      <Text style={styles.newPhotoBadgeText}>New</Text>
                    </View>
                  )}
                </View>

                <View style={styles.avatarActionRow}>
                  <TouchableOpacity
                    style={styles.avatarPickBtn}
                    onPress={handlePickAvatar}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="image-outline" size={16} color={COLORS.primary} />
                    <Text style={styles.avatarPickBtnText}>
                      {pickedImageUri || (editAvatar && editAvatar !== DEFAULT_AVATAR) ? 'Change Photo' : 'Select Photo'}
                    </Text>
                  </TouchableOpacity>

                  {(pickedImageUri || (editAvatar && editAvatar !== DEFAULT_AVATAR)) && (
                    <TouchableOpacity
                      style={styles.avatarRemoveBtn}
                      onPress={handleRemoveAvatar}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="trash-outline" size={15} color="#DC2626" />
                      <Text style={styles.avatarRemoveBtnText}>Remove</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={styles.avatarHelperText}>
                  JPG or PNG up to 10 MB. Stored securely on Cloudinary CDN.
                </Text>
              </View>

              {/* Full Name Field */}
              <Text style={styles.inputLabel}>Full Name *</Text>
              <TextInput
                style={[styles.textInput, fieldErrors.name ? styles.inputError : null]}
                value={editName}
                onChangeText={(val) => {
                  setEditName(val);
                  if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined }));
                }}
                placeholder="Enter your full name"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="words"
                returnKeyType="next"
              />
              {fieldErrors.name && <Text style={styles.fieldErrorText}>{fieldErrors.name}</Text>}

              {/* Email Address Field (Optional) */}
              <Text style={styles.inputLabel}>Email Address (Optional)</Text>
              <TextInput
                style={[styles.textInput, fieldErrors.email ? styles.inputError : null]}
                value={editEmail}
                onChangeText={(val) => {
                  setEditEmail(val);
                  if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                }}
                placeholder="Enter your email address"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
              />
              {fieldErrors.email ? (
                <Text style={styles.fieldErrorText}>{fieldErrors.email}</Text>
              ) : (
                <Text style={styles.inputHelp}>
                  Optional. Used for verified WorkLogy invoices, booking receipts, and account recovery.
                </Text>
              )}

              {/* Phone Number Field (Verified & Read-only) */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={[styles.inputLabel, { marginBottom: 0 }]}>Phone Number</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
                  <Ionicons name="checkmark-circle" size={13} color="#059669" />
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#059669', marginLeft: 4 }}>Verified</Text>
                </View>
              </View>
              <TextInput
                style={[styles.textInput, { backgroundColor: '#F8FAFC', color: '#475569', borderColor: '#E2E8F0' }]}
                value={user?.phone || editPhone || ''}
                editable={false}
                placeholder="No phone number"
                placeholderTextColor={COLORS.textMuted}
              />
              <Text style={styles.inputHelp}>
                Technicians call this number on arrival for entry coordination and OTP verification. Mobile number is verified via OTP and cannot be edited directly.
              </Text>

              <View style={styles.modalActionRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setShowEditModal(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSaveProfile}
                  disabled={savingProfile}
                >
                  {savingProfile ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: ADD SERVICE ADDRESS                                              */}
      {/* ========================================================================= */}
      <Modal visible={showAddAddressModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingAddressId ? 'Edit Service Address' : 'Add Service Address'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowAddAddressModal(false);
                  setEditingAddressId(null);
                }}
              >
                <Ionicons name="close" size={24} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* GPS Auto-Detection Header Action */}
              <TouchableOpacity
                style={styles.gpsDetectBtn}
                onPress={handleUseGpsForAddress}
                disabled={detectingGps}
                activeOpacity={0.85}
              >
                {detectingGps ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="navigate-circle" size={18} color="#FFFFFF" />
                )}
                <Text style={styles.gpsDetectBtnText}>
                  {detectingGps ? 'Detecting GPS Satellite Coordinates...' : 'Use Current Location (GPS)'}
                </Text>
              </TouchableOpacity>

              {/* GPS Coordinates Feedback Banner */}
              {detectedCoords && (
                <View style={styles.gpsConfirmedBox}>
                  <View style={styles.gpsConfirmedHeader}>
                    <Ionicons name="shield-checkmark" size={15} color="#065F46" />
                    <Text style={styles.gpsConfirmedTitle}>High-Precision GPS Captured</Text>
                    {gpsAccuracy != null && (
                      <View style={styles.gpsAccuracyBadge}>
                        <Text style={styles.gpsAccuracyText}>±{Math.round(gpsAccuracy)}m accuracy</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.gpsCoordsText}>
                    Latitude: {detectedCoords.lat.toFixed(5)}  •  Longitude: {detectedCoords.lng.toFixed(5)}
                  </Text>
                  {gpsLocationLabel ? (
                    <Text style={styles.gpsResolvedText} numberOfLines={2}>
                      📍 {gpsLocationLabel}
                    </Text>
                  ) : null}
                </View>
              )}

              <View style={styles.orDividerRow}>
                <View style={styles.orDividerLine} />
                <Text style={styles.orDividerText}>or enter address details manually</Text>
                <View style={styles.orDividerLine} />
              </View>

              <Text style={styles.inputLabel}>Address Label</Text>
              <View style={styles.labelPickerRow}>
                {['Home', 'Office', 'Site'].map((lbl) => (
                  <TouchableOpacity
                    key={lbl}
                    style={[styles.labelChoiceBtn, addrLabel === lbl && styles.labelChoiceBtnActive]}
                    onPress={() => setAddrLabel(lbl)}
                  >
                    <Text
                      style={[styles.labelChoiceText, addrLabel === lbl && styles.labelChoiceTextActive]}
                    >
                      {lbl}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>House / Flat / Building Name</Text>
              <TextInput
                style={styles.textInput}
                value={addrHouseNumber}
                onChangeText={setAddrHouseNumber}
                placeholder="e.g. Flat 402, Lotus Court"
                placeholderTextColor={COLORS.textMuted}
              />

              <Text style={styles.inputLabel}>Street / Road / Colony *</Text>
              <TextInput
                style={[styles.textInput, addrErrors.street ? styles.inputError : null]}
                value={addrStreet}
                onChangeText={(t) => {
                  setAddrStreet(t);
                  if (addrErrors.street) setAddrErrors((prev) => ({ ...prev, street: undefined }));
                }}
                placeholder="e.g. Main Ring Road, Sector B"
                placeholderTextColor={COLORS.textMuted}
              />
              {addrErrors.street && <Text style={styles.fieldErrorText}>{addrErrors.street}</Text>}

              <Text style={styles.inputLabel}>Locality / Sector / Area</Text>
              <TextInput
                style={styles.textInput}
                value={addrLocality}
                onChangeText={setAddrLocality}
                placeholder="e.g. Sector 62, Near Metro Station"
                placeholderTextColor={COLORS.textMuted}
              />

              <View style={styles.twoColRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>City *</Text>
                  <TextInput
                    style={[styles.textInput, addrErrors.city ? styles.inputError : null]}
                    value={addrCity}
                    onChangeText={(t) => {
                      setAddrCity(t);
                      if (addrErrors.city) setAddrErrors((prev) => ({ ...prev, city: undefined }));
                    }}
                    placeholder="e.g. Lucknow"
                    placeholderTextColor={COLORS.textMuted}
                  />
                  {addrErrors.city && <Text style={styles.fieldErrorText}>{addrErrors.city}</Text>}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>PIN Code *</Text>
                  <TextInput
                    style={[styles.textInput, addrErrors.zip ? styles.inputError : null]}
                    value={addrZip}
                    onChangeText={(t) => {
                      setAddrZip(t);
                      if (addrErrors.zip) setAddrErrors((prev) => ({ ...prev, zip: undefined }));
                    }}
                    placeholder="226010"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="numeric"
                  />
                  {addrErrors.zip && <Text style={styles.fieldErrorText}>{addrErrors.zip}</Text>}
                </View>
              </View>

              <Text style={styles.inputLabel}>State</Text>
              <TextInput
                style={styles.textInput}
                value={addrState}
                onChangeText={setAddrState}
                placeholder="e.g. Uttar Pradesh"
                placeholderTextColor={COLORS.textMuted}
              />

              <View style={styles.modalActionRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    setShowAddAddressModal(false);
                    setEditingAddressId(null);
                  }}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSaveAddress}
                  disabled={savingAddress}
                >
                  {savingAddress ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>
                      {editingAddressId ? 'Update Address' : 'Save Address'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: NOTIFICATION PREFERENCES                                         */}
      {/* ========================================================================= */}
      <Modal visible={showNotificationsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notification Settings</Text>
              <TouchableOpacity onPress={() => setShowNotificationsModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalDesc}>
                Customize how you receive dispatch updates, quotations, and account security alerts.
              </Text>

              <View style={styles.notifItemRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.notifItemTitle}>Booking Confirmations</Text>
                  <Text style={styles.notifItemSubtitle}>Alerts when your request is accepted by a technician</Text>
                </View>
                <Switch
                  value={notifPrefs.emailBookings ?? true}
                  onValueChange={(val) => setNotifPrefs((prev) => ({ ...prev, emailBookings: val }))}
                  trackColor={{ false: '#CBD5E1', true: '#A7F3D0' }}
                  thumbColor={notifPrefs.emailBookings ? COLORS.primary : '#94A3B8'}
                />
              </View>

              <View style={styles.notifItemRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.notifItemTitle}>Service Status Updates</Text>
                  <Text style={styles.notifItemSubtitle}>Live technician arrival alerts and OTP verification</Text>
                </View>
                <Switch
                  value={notifPrefs.emailStatusUpdates ?? true}
                  onValueChange={(val) => setNotifPrefs((prev) => ({ ...prev, emailStatusUpdates: val }))}
                  trackColor={{ false: '#CBD5E1', true: '#A7F3D0' }}
                  thumbColor={notifPrefs.emailStatusUpdates ? COLORS.primary : '#94A3B8'}
                />
              </View>

              <View style={styles.notifItemRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.notifItemTitle}>Quotations & Bids</Text>
                  <Text style={styles.notifItemSubtitle}>Competitive offers and price estimates from local pros</Text>
                </View>
                <Switch
                  value={notifPrefs.emailQuotations ?? true}
                  onValueChange={(val) => setNotifPrefs((prev) => ({ ...prev, emailQuotations: val }))}
                  trackColor={{ false: '#CBD5E1', true: '#A7F3D0' }}
                  thumbColor={notifPrefs.emailQuotations ? COLORS.primary : '#94A3B8'}
                />
              </View>

              <View style={styles.notifItemRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.notifItemTitle}>Payment & Refund Alerts</Text>
                  <Text style={styles.notifItemSubtitle}>Escrow releases, invoices, and dispute resolution status</Text>
                </View>
                <Switch
                  value={notifPrefs.emailCancellations ?? true}
                  onValueChange={(val) => setNotifPrefs((prev) => ({ ...prev, emailCancellations: val }))}
                  trackColor={{ false: '#CBD5E1', true: '#A7F3D0' }}
                  thumbColor={notifPrefs.emailCancellations ? COLORS.primary : '#94A3B8'}
                />
              </View>

              <View style={styles.notifItemRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.notifItemTitle}>Promotional & Seasonal Offers</Text>
                  <Text style={styles.notifItemSubtitle}>Discounts on home repairs, AMC contracts, and maintenance</Text>
                </View>
                <Switch
                  value={notifPrefs.emailMarketing ?? false}
                  onValueChange={(val) => setNotifPrefs((prev) => ({ ...prev, emailMarketing: val }))}
                  trackColor={{ false: '#CBD5E1', true: '#A7F3D0' }}
                  thumbColor={notifPrefs.emailMarketing ? COLORS.primary : '#94A3B8'}
                />
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, { marginTop: 20 }]}
                onPress={handleSaveNotifications}
                disabled={savingNotifs}
              >
                {savingNotifs ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Preferences</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 4: TRANSACTIONS & ESCROW HISTORY                                    */}
      {/* ========================================================================= */}
      <Modal visible={showTransactionsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Escrow & Payment Dossier</Text>
              <TouchableOpacity onPress={() => setShowTransactionsModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.escrowBanner}>
                <Ionicons name="shield-checkmark" size={24} color="#059669" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.escrowBannerTitle}>100% Escrow Protection Active</Text>
                  <Text style={styles.escrowBannerSubtitle}>
                    All service payments remain securely in escrow until you verify completion with your OTP.
                  </Text>
                </View>
              </View>

              {loadingTransactions ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text style={styles.loadingText}>Fetching transaction records...</Text>
                </View>
              ) : transactions.length > 0 ? (
                transactions.map((tx) => (
                  <View key={tx._id || tx.transactionId} style={styles.txCard}>
                    <View style={styles.txTopRow}>
                      <View>
                        <Text style={styles.txId}>{tx.transactionId || 'TX-SERVICE'}</Text>
                        <Text style={styles.txDate}>
                          {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          }) : 'Recent'}
                        </Text>
                      </View>
                      <Text style={styles.txAmount}>₹{tx.grossAmount || tx.netAmount || 0}</Text>
                    </View>

                    <View style={styles.txBottomRow}>
                      <View style={styles.txBadgeRow}>
                        <View style={[
                          styles.txStatusBadge,
                          tx.paymentStatus === 'completed' ? styles.txBadgeSuccess : styles.txBadgePending
                        ]}>
                          <Text style={[
                            styles.txStatusText,
                            tx.paymentStatus === 'completed' ? styles.txTextSuccess : styles.txTextPending
                          ]}>
                            {tx.paymentStatus?.toUpperCase() || 'PROCESSED'}
                          </Text>
                        </View>
                        <Text style={styles.txTypeLabel}>
                          {tx.type ? tx.type.replace('_', ' ').toUpperCase() : 'ESCROW HOLD'}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyBox}>
                  <Ionicons name="receipt-outline" size={40} color={COLORS.textMuted} />
                  <Text style={styles.emptyBoxTitle}>No Transactions Yet</Text>
                  <Text style={styles.emptyBoxSubtitle}>
                    When you book services or release payments, receipts will appear here.
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 5: CUSTOMER SUPPORT & ESCROW HELPDESK                               */}
      {/* ========================================================================= */}
      <Modal visible={showSupportModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Support & Dispute Desk</Text>
              <TouchableOpacity onPress={() => setShowSupportModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>

            {/* Sub-tabs */}
            <View style={styles.supportTabsRow}>
              <TouchableOpacity
                style={[styles.supportTabBtn, supportTab === 'faq' && styles.supportTabBtnActive]}
                onPress={() => setSupportTab('faq')}
              >
                <Text style={[styles.supportTabText, supportTab === 'faq' && styles.supportTabTextActive]}>
                  FAQs & Desk
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.supportTabBtn, supportTab === 'new_ticket' && styles.supportTabBtnActive]}
                onPress={() => setSupportTab('new_ticket')}
              >
                <Text style={[styles.supportTabText, supportTab === 'new_ticket' && styles.supportTabTextActive]}>
                  Raise Ticket
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.supportTabBtn, supportTab === 'tickets' && styles.supportTabBtnActive]}
                onPress={() => {
                  setSupportTab('tickets');
                  loadTickets();
                }}
              >
                <Text style={[styles.supportTabText, supportTab === 'tickets' && styles.supportTabTextActive]}>
                  My Tickets ({tickets.length})
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {supportTab === 'faq' && (
                <View>
                  {/* Direct Contact Cards */}
                  <View style={styles.contactCardRow}>
                    <TouchableOpacity
                      style={styles.contactCard}
                      onPress={() => Linking.openURL('tel:18009675564')}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="call" size={20} color={COLORS.primary} />
                      <Text style={styles.contactCardTitle}>1800-WORKLOGY</Text>
                      <Text style={styles.contactCardSubtitle}>Toll-free 24/7 Helpline</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.contactCard}
                      onPress={() => Linking.openURL('mailto:support@worklogy.in')}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="mail" size={20} color="#2563EB" />
                      <Text style={styles.contactCardTitle}>support@worklogy.in</Text>
                      <Text style={styles.contactCardSubtitle}>Official Support Desk</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Frequently Asked Questions</Text>
                  {faqs.map((f, i) => {
                    const isExpanded = expandedFaqIndex === i;
                    return (
                      <View key={i} style={styles.faqCard}>
                        <TouchableOpacity
                          style={styles.faqHeader}
                          onPress={() => setExpandedFaqIndex(isExpanded ? null : i)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.faqQuestion}>{f.q}</Text>
                          <Ionicons
                            name={isExpanded ? 'chevron-up' : 'chevron-down'}
                            size={18}
                            color={COLORS.textSecondary}
                          />
                        </TouchableOpacity>
                        {isExpanded && <Text style={styles.faqAnswer}>{f.a}</Text>}
                      </View>
                    );
                  })}
                </View>
              )}

              {supportTab === 'new_ticket' && (
                <View>
                  <Text style={styles.modalDesc}>
                    Submit a ticket for booking issues, refund claims, or technician disputes. Our escalation team will review your case.
                  </Text>

                  <Text style={styles.inputLabel}>Issue Category</Text>
                  <View style={styles.labelPickerRow}>
                    {(['booking', 'payment', 'service', 'dispute', 'general'] as const).map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.labelChoiceBtn, ticketCategory === cat && styles.labelChoiceBtnActive]}
                        onPress={() => setTicketCategory(cat)}
                      >
                        <Text style={[styles.labelChoiceText, ticketCategory === cat && styles.labelChoiceTextActive]}>
                          {cat.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.inputLabel}>Subject *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={ticketSubject}
                    onChangeText={setTicketSubject}
                    placeholder="Brief summary of your issue"
                    placeholderTextColor={COLORS.textMuted}
                  />

                  <Text style={styles.inputLabel}>Detailed Description *</Text>
                  <TextInput
                    style={[styles.textInput, { height: 90, textAlignVertical: 'top' }]}
                    value={ticketDescription}
                    onChangeText={setTicketDescription}
                    placeholder="Explain what happened, including technician name or booking reference..."
                    placeholderTextColor={COLORS.textMuted}
                    multiline
                  />

                  <Text style={styles.inputLabel}>Urgency Priority</Text>
                  <View style={styles.labelPickerRow}>
                    {(['low', 'medium', 'high', 'urgent'] as const).map((prio) => (
                      <TouchableOpacity
                        key={prio}
                        style={[styles.labelChoiceBtn, ticketPriority === prio && styles.labelChoiceBtnActive]}
                        onPress={() => setTicketPriority(prio)}
                      >
                        <Text style={[styles.labelChoiceText, ticketPriority === prio && styles.labelChoiceTextActive]}>
                          {prio.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={[styles.saveBtn, { marginTop: 16 }]}
                    onPress={handleCreateTicket}
                    disabled={creatingTicket}
                  >
                    {creatingTicket ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.saveBtnText}>Submit Support Ticket</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {supportTab === 'tickets' && (
                <View>
                  {loadingTickets ? (
                    <View style={styles.loadingBox}>
                      <ActivityIndicator size="small" color={COLORS.primary} />
                      <Text style={styles.loadingText}>Loading support tickets...</Text>
                    </View>
                  ) : tickets.length > 0 ? (
                    tickets.map((t) => (
                      <View key={t._id || t.ticketNumber} style={styles.ticketCard}>
                        <View style={styles.txTopRow}>
                          <Text style={styles.ticketNum}>{t.ticketNumber}</Text>
                          <View style={[
                            styles.txStatusBadge,
                            t.status === 'resolved' || t.status === 'closed'
                              ? styles.txBadgeSuccess
                              : styles.txBadgePending
                          ]}>
                            <Text style={[
                              styles.txStatusText,
                              t.status === 'resolved' || t.status === 'closed'
                                ? styles.txTextSuccess
                                : styles.txTextPending
                            ]}>
                              {t.status.toUpperCase()}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.ticketSubject}>{t.subject}</Text>
                        <Text style={styles.ticketDesc} numberOfLines={2}>{t.description}</Text>
                      </View>
                    ))
                  ) : (
                    <View style={styles.emptyBox}>
                      <Ionicons name="chatbubbles-outline" size={40} color={COLORS.textMuted} />
                      <Text style={styles.emptyBoxTitle}>No Open Tickets</Text>
                      <Text style={styles.emptyBoxSubtitle}>
                        You currently have no unresolved support or dispute tickets.
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 6: SAVED VENDORS LIST                                               */}
      {/* ========================================================================= */}
      <Modal visible={showSavedVendorsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Saved Verified Specialists</Text>
              <TouchableOpacity onPress={() => setShowSavedVendorsModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {savedVendors.length > 0 ? (
                savedVendors.map((v, i) => (
                  <View key={v._id || i} style={styles.vendorCard}>
                    <View style={styles.vendorAvatarCircle}>
                      <Text style={styles.vendorAvatarText}>
                        {(v.name || 'Pro').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.vendorName}>{v.name || 'Service Specialist'}</Text>
                      <Text style={styles.vendorCategory}>{v.category || 'Home Repair Pro'}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyBox}>
                  <Ionicons name="bookmark-outline" size={40} color={COLORS.textMuted} />
                  <Text style={styles.emptyBoxTitle}>No Saved Specialists</Text>
                  <Text style={styles.emptyBoxSubtitle}>
                    When you bookmark top rated specialists in Search or Explore, they will appear here.
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 7: CHANGE PASSWORD & ACCOUNT SECURITY                                */}
      {/* ========================================================================= */}
      <Modal visible={showPasswordModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Change Password</Text>
                <Text style={styles.modalHeaderSubtitle}>Update your password for WorkLogy account security</Text>
              </View>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Current Password *</Text>
              <View style={[styles.passwordInputContainer, passwordErrors.current ? styles.inputError : null]}>
                <TextInput
                  style={styles.passwordTextInput}
                  value={currentPassword}
                  onChangeText={(val) => {
                    setCurrentPassword(val);
                    if (passwordErrors.current) setPasswordErrors((prev) => ({ ...prev, current: undefined }));
                  }}
                  placeholder="Enter current password"
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry={!showCurrentPass}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowCurrentPass(!showCurrentPass)}
                >
                  <Ionicons name={showCurrentPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
              {passwordErrors.current && <Text style={styles.fieldErrorText}>{passwordErrors.current}</Text>}

              <Text style={styles.inputLabel}>New Password *</Text>
              <View style={[styles.passwordInputContainer, passwordErrors.new ? styles.inputError : null]}>
                <TextInput
                  style={styles.passwordTextInput}
                  value={newPassword}
                  onChangeText={(val) => {
                    setNewPassword(val);
                    if (passwordErrors.new) setPasswordErrors((prev) => ({ ...prev, new: undefined }));
                  }}
                  placeholder="At least 6 characters"
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry={!showNewPass}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowNewPass(!showNewPass)}
                >
                  <Ionicons name={showNewPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
              {passwordErrors.new && <Text style={styles.fieldErrorText}>{passwordErrors.new}</Text>}

              <Text style={styles.inputLabel}>Confirm New Password *</Text>
              <View style={[styles.passwordInputContainer, passwordErrors.confirm ? styles.inputError : null]}>
                <TextInput
                  style={styles.passwordTextInput}
                  value={confirmPassword}
                  onChangeText={(val) => {
                    setConfirmPassword(val);
                    if (passwordErrors.confirm) setPasswordErrors((prev) => ({ ...prev, confirm: undefined }));
                  }}
                  placeholder="Re-enter new password"
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry={!showConfirmPass}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowConfirmPass(!showConfirmPass)}
                >
                  <Ionicons name={showConfirmPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
              {passwordErrors.confirm && <Text style={styles.fieldErrorText}>{passwordErrors.confirm}</Text>}

              <View style={styles.modalActionRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setShowPasswordModal(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSavePassword}
                  disabled={savingPassword}
                >
                  {savingPassword ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>Update Password</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  topHeader: {
    paddingBottom: 14,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.textDark,
    letterSpacing: -0.3
  },
  headerSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0'
  },
  scrollArea: {
    flex: 1
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 16
  },
  avatarImage: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: COLORS.primary
  },
  avatarInitials: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#A7F3D0'
  },
  avatarInitialsText: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.primary
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: COLORS.primary,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF'
  },
  profileInfoCol: {
    flex: 1
  },
  profileName: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textDark,
    letterSpacing: -0.2
  },
  profileEmail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  phoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 6,
    gap: 4
  },
  phoneBadgeText: {
    fontSize: 11,
    color: COLORS.textDark,
    fontWeight: '700'
  },
  addPhoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4
  },
  addPhoneText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600'
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4
  },
  verifiedBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#065F46'
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E'
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4
  },
  memberBadgeText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600'
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 14,
    gap: 6
  },
  editProfileBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary
  },
  guestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2
  },
  guestAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
  },
  guestTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textDark
  },
  guestSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 17,
    paddingHorizontal: 12
  },
  signInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 20,
    marginTop: 16
  },
  signInBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12
  },
  statTile: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textDark
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: 2
  },
  section: {
    marginTop: 20
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.textDark,
    letterSpacing: -0.2,
    marginBottom: 10
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  addAddressHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 2
  },
  addAddressHeaderText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden'
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12
  },
  menuIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  menuTextCol: {
    flex: 1
  },
  menuTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textDark
  },
  menuSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1
  },
  addressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10
  },
  addressCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#F0FDF4'
  },
  addressLeftRow: {
    flexDirection: 'row',
    gap: 12
  },
  addressIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center'
  },
  addressIconCircleSelected: {
    backgroundColor: COLORS.primary
  },
  addressDetailsCol: {
    flex: 1
  },
  addressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  addressLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textDark
  },
  activeLocationBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  activeLocationText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803D'
  },
  addressFullText: {
    fontSize: 12,
    color: COLORS.textDark,
    marginTop: 3,
    fontWeight: '500'
  },
  addressCityZip: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  addressActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },
  addressActionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  addressActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 'auto'
  },
  selectAddressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8
  },
  selectAddressText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary
  },
  editAddressBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F0FDF4'
  },
  deleteAddressBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#FEF2F2'
  },
  gpsDetectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 6,
    marginBottom: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2
  },
  gpsDetectBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  gpsConfirmedBox: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12
  },
  gpsConfirmedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  gpsConfirmedTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46'
  },
  gpsAccuracyBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 'auto'
  },
  gpsAccuracyText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#047857'
  },
  gpsCoordsText: {
    fontSize: 11,
    color: '#065F46',
    fontWeight: '600',
    marginTop: 4
  },
  gpsResolvedText: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2
  },
  orDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    gap: 8
  },
  orDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0'
  },
  orDividerText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  emptyAddressBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed'
  },
  emptyAddressTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textDark,
    marginTop: 8
  },
  emptyAddressSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 3,
    lineHeight: 16,
    paddingHorizontal: 10
  },
  emptyAddAddressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 18,
    marginTop: 12
  },
  emptyAddAddressBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12
  },
  loadingBox: {
    paddingVertical: 18,
    alignItems: 'center',
    gap: 8
  },
  loadingText: {
    fontSize: 12,
    color: COLORS.textSecondary
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    paddingVertical: 14,
    borderRadius: 14
  },
  signOutBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#DC2626'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%'
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 14
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.textDark
  },
  modalDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 14,
    lineHeight: 17
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 6,
    marginTop: 10
  },
  inputHelp: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: COLORS.textDark
  },
  disabledInput: {
    backgroundColor: '#F1F5F9',
    color: COLORS.textSecondary
  },
  twoColRow: {
    flexDirection: 'row'
  },
  labelPickerRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4
  },
  labelChoiceBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  labelChoiceBtnActive: {
    backgroundColor: '#ECFDF5',
    borderColor: COLORS.primary
  },
  labelChoiceText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary
  },
  labelChoiceTextActive: {
    color: COLORS.primary,
    fontWeight: '800'
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 22,
    marginBottom: 14
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center'
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textSecondary
  },
  saveBtn: {
    flex: 2,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center'
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  notifItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  notifItemTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textDark
  },
  notifItemSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  escrowBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 14
  },
  escrowBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46'
  },
  escrowBannerSubtitle: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
    lineHeight: 15
  },
  txCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8
  },
  txTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  txId: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textDark
  },
  txDate: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.primary
  },
  txBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },
  txBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  txStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  txBadgeSuccess: {
    backgroundColor: '#DCFCE7'
  },
  txBadgePending: {
    backgroundColor: '#FEF3C7'
  },
  txStatusText: {
    fontSize: 9,
    fontWeight: '800'
  },
  txTextSuccess: {
    color: '#15803D'
  },
  txTextPending: {
    color: '#B45309'
  },
  txTypeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary
  },
  supportTabsRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
    marginBottom: 14
  },
  supportTabBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 8
  },
  supportTabBtnActive: {
    backgroundColor: '#FFFFFF',
    elevation: 1
  },
  supportTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary
  },
  supportTabTextActive: {
    color: COLORS.primary,
    fontWeight: '800'
  },
  contactCardRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10
  },
  contactCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center'
  },
  contactCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textDark,
    marginTop: 6
  },
  contactCardSubtitle: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 1
  },
  faqCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
    overflow: 'hidden'
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12
  },
  faqQuestion: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textDark,
    flex: 1,
    paddingRight: 8
  },
  faqAnswer: {
    fontSize: 11,
    color: COLORS.textSecondary,
    paddingHorizontal: 12,
    paddingBottom: 12,
    lineHeight: 16
  },
  ticketCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8
  },
  ticketNum: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary
  },
  ticketSubject: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textDark,
    marginTop: 4
  },
  ticketDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  vendorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8
  },
  vendorAvatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0'
  },
  vendorAvatarText: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.primary
  },
  vendorName: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textDark
  },
  vendorCategory: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1
  },
  emptyBox: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 6
  },
  emptyBoxTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textDark
  },
  emptyBoxSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 16
  },
  modalHeaderSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  fieldErrorText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#DC2626',
    marginTop: 4,
    marginLeft: 2
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2'
  },
  avatarEditSection: {
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 16
  },
  avatarPreviewWrapper: {
    position: 'relative',
    marginBottom: 10
  },
  avatarPreviewImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: COLORS.primary
  },
  avatarPreviewPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#A7F3D0'
  },
  avatarPreviewInitials: {
    fontSize: 36,
    fontWeight: '900',
    color: COLORS.primary
  },
  newPhotoBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 2,
    borderWidth: 1.5,
    borderColor: '#FFFFFF'
  },
  newPhotoBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  avatarActionRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center'
  },
  avatarPickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 10
  },
  avatarPickBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
    marginLeft: 6
  },
  avatarRemoveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10
  },
  avatarRemoveBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
    marginLeft: 4
  },
  avatarHelperText: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 8,
    textAlign: 'center'
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingRight: 10
  },
  passwordTextInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: COLORS.textDark
  },
  eyeBtn: {
    padding: 6
  },
  permissionStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8
  },
  permissionStatusGranted: {
    backgroundColor: '#DCFCE7'
  },
  permissionStatusPending: {
    backgroundColor: '#FEF3C7'
  },
  permissionStatusText: {
    fontSize: 10,
    fontWeight: '800'
  },
  permissionTextGranted: {
    color: '#15803D'
  },
  permissionTextPending: {
    color: '#B45309'
  }
});

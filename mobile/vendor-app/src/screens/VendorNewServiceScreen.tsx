import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
  Image,
  Dimensions,
  Platform,
  StatusBar,
  KeyboardAvoidingView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { useNavigation } from '../context/NavigationContext';
import { secureStorage } from '../storage/secureStorage';
import { STORAGE_KEYS } from '../constants';
import { COLORS } from '../theme/colors';
import { getServiceImage } from '../utils/serviceImages';
import type { ServiceListing } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const COMMON_LOCALITIES = [
  'Gomti Nagar',
  'Hazratganj',
  'Aliganj',
  'Indira Nagar',
  'Mahanagar',
  'Vibhuti Khand',
  'Chowk',
  'Ashiyana',
  'Rajajipuram',
  'Janki Puram'
];

export default function VendorNewServiceScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const appNav = useNavigation();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0
  );

  const existingService: ServiceListing | undefined = route?.params?.service;
  const isEditing = Boolean(existingService?._id);

  // Step state: 1 to 5
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Form Fields - Step 1: Info
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [subcategory, setSubcategory] = useState(existingService?.subcategory || '');
  const [title, setTitle] = useState(existingService?.title || '');
  const [shortSummary, setShortSummary] = useState(existingService?.shortSummary || '');
  const [description, setDescription] = useState(existingService?.description || '');
  const [experienceYears, setExperienceYears] = useState(
    existingService?.experienceYears?.toString() || '4'
  );
  const [imageUrl, setImageUrl] = useState(existingService?.images?.[0] || '');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Form Fields - Step 2: Pricing
  const [pricingType, setPricingType] = useState<'fixed' | 'starting' | 'quote'>(
    (existingService?.pricing?.type as any) || 'fixed'
  );
  const [amount, setAmount] = useState(existingService?.pricing?.amount?.toString() || '499');
  const [minPrice, setMinPrice] = useState(existingService?.pricing?.minPrice?.toString() || '350');
  const [unit, setUnit] = useState<'per visit' | 'per hour' | 'per item' | 'per project'>(
    existingService?.pricing?.unit || 'per visit'
  );
  const [visitFee, setVisitFee] = useState(existingService?.pricing?.visitFee?.toString() || '0');
  const [materialCostIncluded, setMaterialCostIncluded] = useState(
    existingService?.pricing?.materialCostIncluded || false
  );

  // Form Fields - Step 3: Coverage
  const [city, setCity] = useState(existingService?.location?.city || 'Lucknow');
  const [locality, setLocality] = useState(existingService?.location?.locality || 'Gomti Nagar');
  const [radiusKm, setRadiusKm] = useState(existingService?.location?.radiusKm?.toString() || '25');
  const [selectedLocalities, setSelectedLocalities] = useState<string[]>(
    existingService?.location?.supportedLocalities || ['Gomti Nagar', 'Hazratganj', 'Aliganj', 'Indira Nagar']
  );
  const [homeVisitAvailable, setHomeVisitAvailable] = useState(
    existingService?.location?.homeVisitAvailable ?? true
  );

  // Form Fields - Step 4: Availability
  const [selectedDays, setSelectedDays] = useState<string[]>(
    existingService?.availability?.days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  );
  const [startHour, setStartHour] = useState(existingService?.availability?.hours?.start || '09:00');
  const [endHour, setEndHour] = useState(existingService?.availability?.hours?.end || '19:00');
  const [emergencyAvailable, setEmergencyAvailable] = useState(
    existingService?.availability?.emergencyAvailable || false
  );
  const [maxDailyBookings, setMaxDailyBookings] = useState(
    existingService?.availability?.maxDailyBookings?.toString() || '5'
  );

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    const unregister = appNav.registerBackHandler(() => {
      if (step > 1) {
        setStep((prev) => prev - 1);
        return true;
      }
      if (title.trim()) {
        Alert.alert(
          'Discard Listing?',
          'Are you sure you want to discard this service listing? Any unsaved edits will be lost.',
          [
            { text: 'Keep Editing', style: 'cancel' },
            {
              text: 'Discard',
              style: 'destructive',
              onPress: () => navigation.goBack()
            }
          ]
        );
        return true;
      }
      return false;
    });
    return unregister;
  }, [step, title, appNav, navigation]);

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const res = await api.categories.getAll();
      const list = Array.isArray(res) ? res : res?.categories || [];
      setCategories(list);

      // Pre-select category if editing or matches domain
      if (existingService?.domain || existingService?.category) {
        const catId = typeof existingService.category === 'object' ? existingService.category?._id : existingService.category;
        const matched = list.find((c: any) => c._id === catId || c.slug === existingService.domain || c.name === existingService.domain);
        if (matched) setSelectedCategory(matched);
      } else if (list.length > 0 && !selectedCategory) {
        setSelectedCategory(list[0]);
        if (list[0].subcategories?.length > 0 && !subcategory) {
          const firstSub = typeof list[0].subcategories[0] === 'string' ? list[0].subcategories[0] : list[0].subcategories[0].name;
          setSubcategory(firstSub);
        }
      }
    } catch (err) {
      console.warn('Failed to load categories:', err);
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleSelectCategory = (cat: any) => {
    setSelectedCategory(cat);
    if (cat.subcategories && cat.subcategories.length > 0) {
      const firstSub = typeof cat.subcategories[0] === 'string' ? cat.subcategories[0] : cat.subcategories[0].name;
      setSubcategory(firstSub);
    }
  };

  const handlePickServicePhoto = async () => {
    if (uploadingPhoto) return;
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'WorkLogy needs gallery permissions to upload service photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.85
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const asset = result.assets[0];
      setUploadingPhoto(true);

      const uploadRes = await api.media.uploadImage(asset.uri, asset.mimeType || 'image/jpeg');
      if (uploadRes?.url) {
        setImageUrl(uploadRes.url);
      }
    } catch (err: any) {
      Alert.alert('Upload Failed', err?.message || 'Could not upload service photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length <= 1) {
        Alert.alert('Notice', 'At least one working day must be selected.');
        return;
      }
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const toggleLocality = (loc: string) => {
    if (selectedLocalities.includes(loc)) {
      if (selectedLocalities.length <= 1) {
        Alert.alert('Notice', 'At least one operational locality is required.');
        return;
      }
      setSelectedLocalities(selectedLocalities.filter((l) => l !== loc));
    } else {
      setSelectedLocalities([...selectedLocalities, loc]);
    }
  };

  // Step Validation
  const validateStep = (currentStep: number): boolean => {
    if (currentStep === 1) {
      if (!selectedCategory) {
        Alert.alert('Validation Error', 'Please select a trade category.');
        return false;
      }
      if (!title.trim() || title.trim().length < 5) {
        Alert.alert('Validation Error', 'Please provide a clear service title (at least 5 characters).');
        return false;
      }
      if (!subcategory.trim()) {
        Alert.alert('Validation Error', 'Please select or specify a subcategory/task.');
        return false;
      }
      if (!description.trim() || description.trim().length < 15) {
        Alert.alert('Validation Error', 'Please write a descriptive summary of your work (at least 15 characters).');
        return false;
      }
    }

    if (currentStep === 2) {
      if (pricingType !== 'quote') {
        const val = pricingType === 'starting' ? parseFloat(minPrice) : parseFloat(amount);
        if (isNaN(val) || val <= 0) {
          Alert.alert('Validation Error', 'Please enter a valid price amount greater than ₹0.');
          return false;
        }
      }
    }

    if (currentStep === 3) {
      if (!city.trim()) {
        Alert.alert('Validation Error', 'Please specify your primary operational city.');
        return false;
      }
      if (selectedLocalities.length === 0) {
        Alert.alert('Validation Error', 'Please select at least one covered locality.');
        return false;
      }
    }

    if (currentStep === 4) {
      if (selectedDays.length === 0) {
        Alert.alert('Validation Error', 'Please choose at least one working day.');
        return false;
      }
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((prev) => Math.min(prev + 1, 5));
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((prev) => prev - 1);
    } else {
      navigation.goBack();
    }
  };

  const handleSave = async (publishStatus: 'draft' | 'published') => {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3) || !validateStep(4)) {
      return;
    }

    const token = await secureStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (!token) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to your WorkLogy Pro contractor account before saving or publishing service listings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => navigation.navigate('VendorLogin') }
        ]
      );
      return;
    }

    try {
      setSubmitting(true);
      const parsedAmount = parseFloat(amount) || 0;
      const parsedMinPrice = parseFloat(minPrice) || 0;
      const parsedVisitFee = parseFloat(visitFee) || 0;
      const parsedRadius = parseFloat(radiusKm) || 25;
      const parsedExp = parseInt(experienceYears, 10) || 3;
      const parsedMaxDaily = parseInt(maxDailyBookings, 10) || 5;

      const payload = {
        title: title.trim(),
        domain: selectedCategory?.slug || selectedCategory?.name || 'ac-hvac-services',
        category: selectedCategory?._id,
        subcategory: subcategory.trim(),
        shortSummary: shortSummary.trim() || title.trim(),
        description: description.trim(),
        experienceYears: parsedExp,
        deliveryType: 'home_service',
        pricing: {
          type: pricingType,
          amount: pricingType === 'quote' ? 0 : parsedAmount,
          minPrice: pricingType === 'starting' ? parsedMinPrice : 0,
          currency: 'INR',
          unit,
          visitFee: parsedVisitFee,
          materialCostIncluded,
          cancellationTerms: 'Free cancellation up to 2 hours before scheduled slot'
        },
        images: imageUrl.trim() ? [imageUrl.trim()] : [],
        location: {
          country: 'India',
          state: 'Uttar Pradesh',
          city: city.trim(),
          locality: locality.trim(),
          radiusKm: parsedRadius,
          supportedLocalities: selectedLocalities,
          homeVisitAvailable,
          travelCharge: 0
        },
        availability: {
          days: selectedDays,
          hours: {
            start: startHour,
            end: endHour
          },
          emergencyAvailable,
          maxDailyBookings: parsedMaxDaily
        },
        status: publishStatus
      };

      if (isEditing && existingService?._id) {
        await api.services.update(existingService._id, payload);
        Alert.alert(
          'Service Updated 🎉',
          `Your service "${title}" has been updated and is ${publishStatus === 'published' ? 'Live on WorkLogy' : 'saved as Draft'}.`,
          [{ text: 'View Services', onPress: () => navigation.goBack() }]
        );
      } else {
        await api.services.create(payload);
        Alert.alert(
          'Service Created 🎉',
          `Your service "${title}" is now ${publishStatus === 'published' ? 'Live & ready for bookings' : 'saved as Draft'}.`,
          [{ text: 'Done', onPress: () => navigation.goBack() }]
        );
      }
    } catch (err: any) {
      console.warn('Failed to save service:', err);
      Alert.alert('Save Failed', err.message || 'Could not save service listing to database.');
    } finally {
      setSubmitting(false);
    }
  };

  // Preview Image
  const previewImage = imageUrl.trim()
    ? { uri: imageUrl.trim() }
    : getServiceImage(selectedCategory?.slug || 'ac-hvac-services');

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: topInset + 8 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color="#0F172A" />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>
              {isEditing ? 'Edit Service' : 'Add Service'}
            </Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        {/* 5-Step Stepper matching reference Screen 4 */}
        <View style={styles.stepperContainer}>
          {[
            { num: 1, label: 'Basic Info' },
            { num: 2, label: 'Pricing' },
            { num: 3, label: 'Service Area' },
            { num: 4, label: 'Availability' },
            { num: 5, label: 'Review' }
          ].map((s, idx) => (
            <React.Fragment key={s.num}>
              {idx > 0 && (
                <View
                  style={[
                    styles.stepperLine,
                    step >= s.num ? styles.stepperLineActive : styles.stepperLineInactive
                  ]}
                />
              )}
              <View style={styles.stepItem}>
                <View
                  style={[
                    styles.stepCircle,
                    step === s.num
                      ? styles.stepCircleActive
                      : step > s.num
                      ? styles.stepCircleCompleted
                      : styles.stepCircleInactive
                  ]}
                >
                  {step > s.num ? (
                    <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                  ) : (
                    <Text
                      style={[
                        styles.stepCircleText,
                        step === s.num && styles.stepCircleTextActive
                      ]}
                    >
                      {s.num}
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    step === s.num ? styles.stepLabelActive : styles.stepLabelInactive
                  ]}
                  numberOfLines={1}
                >
                  {s.label}
                </Text>
              </View>
            </React.Fragment>
          ))}
        </View>
      </View>

      {/* Screen Body */}
      <ScrollView
        style={styles.scrollBody}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── STEP 1: SERVICE INFORMATION ── */}
        {step === 1 && (
          <View>
            <Text style={styles.stepHeading}>Step 1: Trade & Service Info</Text>
            <Text style={styles.stepSub}>
              Select the skilled trade category and detail the specific work you deliver.
            </Text>

            {/* Category Selector */}
            <Text style={styles.label}>Select Trade Category *</Text>
            {loadingCategories ? (
              <ActivityIndicator size="small" color="#059669" style={{ marginVertical: 12 }} />
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryScroll}
              >
                {categories.map((cat) => {
                  const isSelected = selectedCategory?._id === cat._id;
                  return (
                    <TouchableOpacity
                      key={cat._id}
                      style={[styles.categoryCard, isSelected && styles.categoryCardSelected]}
                      onPress={() => handleSelectCategory(cat)}
                      activeOpacity={0.75}
                    >
                      <Image
                        source={getServiceImage(cat.slug)}
                        style={styles.categoryThumb}
                        resizeMode="cover"
                      />
                      <Text
                        style={[
                          styles.categoryName,
                          isSelected && styles.categoryNameSelected
                        ]}
                        numberOfLines={1}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* Subcategory / Task */}
            <Text style={styles.label}>Subcategory or Specific Task *</Text>
            {selectedCategory?.subcategories && selectedCategory.subcategories.length > 0 ? (
              <View style={styles.subcatWrap}>
                {selectedCategory.subcategories.map((item: any, idx: number) => {
                  const name = typeof item === 'string' ? item : item.name;
                  const isChosen = subcategory === name;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.subcatChip, isChosen && styles.subcatChipChosen]}
                      onPress={() => setSubcategory(name)}
                    >
                      <Text style={[styles.subcatChipText, isChosen && styles.subcatChipTextChosen]}>
                        {name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}

            <TextInput
              style={styles.input}
              placeholder="Or enter custom task (e.g. Split AC Jet Wash)"
              placeholderTextColor="#94A3B8"
              value={subcategory}
              onChangeText={setSubcategory}
            />

            {/* Service Title */}
            <Text style={styles.label}>Service Offering Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Split AC Deep Jet Cleaning & Gas Leakage Repair"
              placeholderTextColor="#94A3B8"
              value={title}
              onChangeText={setTitle}
            />

            {/* Short Summary */}
            <Text style={styles.label}>Short Summary (One-liner)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. High-pressure foam wash, cooling coil inspection & gas check"
              placeholderTextColor="#94A3B8"
              value={shortSummary}
              onChangeText={setShortSummary}
            />

            {/* Detailed Description */}
            <Text style={styles.label}>Detailed Description of Scope *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Explain the step-by-step repair process, tools used, guarantee terms and what the customer can expect."
              placeholderTextColor="#94A3B8"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            {/* Experience in Years */}
            <Text style={styles.label}>Years of Experience in this Trade</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 5"
              placeholderTextColor="#94A3B8"
              value={experienceYears}
              onChangeText={setExperienceYears}
              keyboardType="number-pad"
            />

            {/* Service Cover Photo */}
            <Text style={styles.label}>Service Cover Photo (Optional)</Text>
            {imageUrl ? (
              <View style={styles.servicePhotoCard}>
                <Image source={{ uri: imageUrl }} style={styles.servicePhotoImg} resizeMode="cover" />
                <TouchableOpacity
                  style={styles.removeServicePhotoBtn}
                  onPress={() => setImageUrl('')}
                >
                  <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ) : null}

            <TouchableOpacity
              style={styles.uploadServicePhotoBtn}
              onPress={handlePickServicePhoto}
              disabled={uploadingPhoto}
              activeOpacity={0.8}
            >
              {uploadingPhoto ? (
                <ActivityIndicator size="small" color="#059669" />
              ) : (
                <>
                  <Ionicons name="camera-outline" size={20} color="#059669" />
                  <Text style={styles.uploadServicePhotoText}>
                    {imageUrl ? 'Change Service Photo' : 'Upload Photo from Gallery'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ── STEP 2: PRICING AND DURATION ── */}
        {step === 2 && (
          <View>
            <Text style={styles.stepHeading}>Step 2: Pricing & Payment Model</Text>
            <Text style={styles.stepSub}>
              Set transparent customer rates based on WorkLogy standard pricing models.
            </Text>

            {/* Pricing Model Tabs */}
            <Text style={styles.label}>Pricing Model *</Text>
            <View style={styles.modelRow}>
              <TouchableOpacity
                style={[styles.modelOption, pricingType === 'fixed' && styles.modelOptionActive]}
                onPress={() => setPricingType('fixed')}
              >
                <Ionicons
                  name="pricetag-outline"
                  size={18}
                  color={pricingType === 'fixed' ? '#059669' : '#64748B'}
                />
                <Text style={[styles.modelText, pricingType === 'fixed' && styles.modelTextActive]}>
                  Fixed Price
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modelOption, pricingType === 'starting' && styles.modelOptionActive]}
                onPress={() => setPricingType('starting')}
              >
                <Ionicons
                  name="trending-up-outline"
                  size={18}
                  color={pricingType === 'starting' ? '#059669' : '#64748B'}
                />
                <Text style={[styles.modelText, pricingType === 'starting' && styles.modelTextActive]}>
                  Starting From
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modelOption, pricingType === 'quote' && styles.modelOptionActive]}
                onPress={() => setPricingType('quote')}
              >
                <Ionicons
                  name="document-text-outline"
                  size={18}
                  color={pricingType === 'quote' ? '#059669' : '#64748B'}
                />
                <Text style={[styles.modelText, pricingType === 'quote' && styles.modelTextActive]}>
                  Quote on Visit
                </Text>
              </TouchableOpacity>
            </View>

            {/* Price Inputs */}
            {pricingType === 'fixed' && (
              <>
                <Text style={styles.label}>Fixed Service Price (₹) *</Text>
                <View style={styles.currencyInputWrap}>
                  <Text style={styles.currencySymbol}>₹</Text>
                  <TextInput
                    style={styles.currencyInput}
                    placeholder="499"
                    placeholderTextColor="#94A3B8"
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="numeric"
                  />
                </View>
              </>
            )}

            {pricingType === 'starting' && (
              <>
                <Text style={styles.label}>Minimum Starting Price (₹) *</Text>
                <View style={styles.currencyInputWrap}>
                  <Text style={styles.currencySymbol}>₹</Text>
                  <TextInput
                    style={styles.currencyInput}
                    placeholder="350"
                    placeholderTextColor="#94A3B8"
                    value={minPrice}
                    onChangeText={setMinPrice}
                    keyboardType="numeric"
                  />
                </View>
              </>
            )}

            {/* Rate Unit */}
            <Text style={styles.label}>Rate Unit *</Text>
            <View style={styles.unitRow}>
              {(['per visit', 'per hour', 'per item', 'per project'] as const).map((u) => (
                <TouchableOpacity
                  key={u}
                  style={[styles.unitChip, unit === u && styles.unitChipActive]}
                  onPress={() => setUnit(u)}
                >
                  <Text style={[styles.unitChipText, unit === u && styles.unitChipTextActive]}>
                    {u}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Inspection / Visit Fee */}
            <Text style={styles.label}>Diagnostic / Visit Fee (₹)</Text>
            <View style={styles.currencyInputWrap}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.currencyInput}
                placeholder="0"
                placeholderTextColor="#94A3B8"
                value={visitFee}
                onChangeText={setVisitFee}
                keyboardType="numeric"
              />
            </View>
            <Text style={styles.helperText}>
              Fee charged for on-site inspection if the customer declines major repairs.
            </Text>

            {/* Material Cost Included Toggle */}
            <View style={styles.switchRow}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.switchTitle}>Material Cost Included</Text>
                <Text style={styles.switchSub}>
                  Turn on if standard spare parts or cleaning chemical charges are included in the price.
                </Text>
              </View>
              <Switch
                value={materialCostIncluded}
                onValueChange={setMaterialCostIncluded}
                trackColor={{ false: '#CBD5E1', true: '#A7F3D0' }}
                thumbColor={materialCostIncluded ? '#059669' : '#F1F5F9'}
              />
            </View>
          </View>
        )}

        {/* ── STEP 3: SERVICE COVERAGE ── */}
        {step === 3 && (
          <View>
            <Text style={styles.stepHeading}>Step 3: Service Area & Travel Radius</Text>
            <Text style={styles.stepSub}>
              Define where you can physically travel to serve customers in your city.
            </Text>

            <Text style={styles.label}>Operating City *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Lucknow"
              placeholderTextColor="#94A3B8"
              value={city}
              onChangeText={setCity}
            />

            <Text style={styles.label}>Base Locality / Workshop Hub *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Gomti Nagar"
              placeholderTextColor="#94A3B8"
              value={locality}
              onChangeText={setLocality}
            />

            <Text style={styles.label}>Max Travel Radius (km)</Text>
            <View style={styles.unitRow}>
              {['10', '20', '25', '35', '50'].map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.unitChip, radiusKm === r && styles.unitChipActive]}
                  onPress={() => setRadiusKm(r)}
                >
                  <Text style={[styles.unitChipText, radiusKm === r && styles.unitChipTextActive]}>
                    {r} km
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Supported Localities in City *</Text>
            <View style={styles.subcatWrap}>
              {COMMON_LOCALITIES.map((loc) => {
                const isSelected = selectedLocalities.includes(loc);
                return (
                  <TouchableOpacity
                    key={loc}
                    style={[styles.subcatChip, isSelected && styles.subcatChipChosen]}
                    onPress={() => toggleLocality(loc)}
                  >
                    <Ionicons
                      name={isSelected ? 'checkmark-circle' : 'add-circle-outline'}
                      size={15}
                      color={isSelected ? '#059669' : '#64748B'}
                    />
                    <Text style={[styles.subcatChipText, isSelected && styles.subcatChipTextChosen, { marginLeft: 4 }]}>
                      {loc}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Home Visit Available */}
            <View style={styles.switchRow}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.switchTitle}>At-Home Service Visit</Text>
                <Text style={styles.switchSub}>
                  You travel to the customer's home or office address to complete the job.
                </Text>
              </View>
              <Switch
                value={homeVisitAvailable}
                onValueChange={setHomeVisitAvailable}
                trackColor={{ false: '#CBD5E1', true: '#A7F3D0' }}
                thumbColor={homeVisitAvailable ? '#059669' : '#F1F5F9'}
              />
            </View>
          </View>
        )}

        {/* ── STEP 4: AVAILABILITY ── */}
        {step === 4 && (
          <View>
            <Text style={styles.stepHeading}>Step 4: Working Days & Booking Slots</Text>
            <Text style={styles.stepSub}>
              Set when you are available to receive customer bookings.
            </Text>

            <Text style={styles.label}>Working Days *</Text>
            <View style={styles.daysWrap}>
              {ALL_DAYS.map((day) => {
                const isChecked = selectedDays.includes(day);
                return (
                  <TouchableOpacity
                    key={day}
                    style={[styles.dayCard, isChecked && styles.dayCardChecked]}
                    onPress={() => toggleDay(day)}
                  >
                    <Ionicons
                      name={isChecked ? 'checkbox' : 'square-outline'}
                      size={18}
                      color={isChecked ? '#059669' : '#94A3B8'}
                    />
                    <Text style={[styles.dayText, isChecked && styles.dayTextChecked]}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Hours */}
            <View style={styles.rowTwoCol}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.label}>Start Hour</Text>
                <TextInput
                  style={styles.input}
                  placeholder="09:00"
                  placeholderTextColor="#94A3B8"
                  value={startHour}
                  onChangeText={setStartHour}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.label}>End Hour</Text>
                <TextInput
                  style={styles.input}
                  placeholder="19:00"
                  placeholderTextColor="#94A3B8"
                  value={endHour}
                  onChangeText={setEndHour}
                />
              </View>
            </View>

            {/* Max daily bookings */}
            <Text style={styles.label}>Max Daily Appointments Capacity</Text>
            <TextInput
              style={styles.input}
              placeholder="5"
              placeholderTextColor="#94A3B8"
              value={maxDailyBookings}
              onChangeText={setMaxDailyBookings}
              keyboardType="number-pad"
            />

            {/* Emergency Toggle */}
            <View style={styles.switchRow}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.switchTitle}>Emergency Service Available</Text>
                <Text style={styles.switchSub}>
                  Accept priority emergency repair requests within 60 minutes for higher fees.
                </Text>
              </View>
              <Switch
                value={emergencyAvailable}
                onValueChange={setEmergencyAvailable}
                trackColor={{ false: '#CBD5E1', true: '#A7F3D0' }}
                thumbColor={emergencyAvailable ? '#059669' : '#F1F5F9'}
              />
            </View>
          </View>
        )}

        {/* ── STEP 5: REVIEW AND PUBLISH ── */}
        {step === 5 && (
          <View>
            <Text style={styles.stepHeading}>Step 5: Review & Publish</Text>
            <Text style={styles.stepSub}>
              Verify your service offering preview before making it live to customers.
            </Text>

            {/* Card Preview */}
            <View style={styles.previewCard}>
              <Image source={previewImage} style={styles.previewImage} resizeMode="cover" />
              <View style={styles.previewBadgeOverlay}>
                <View style={styles.previewDomainBadge}>
                  <Text style={styles.previewDomainText}>
                    {selectedCategory?.name || 'Home Service'}
                  </Text>
                </View>
              </View>

              <View style={styles.previewBody}>
                <Text style={styles.previewTitle}>{title || 'Service Title'}</Text>
                <Text style={styles.previewSubcat}>
                  {subcategory} • {experienceYears} yrs experience
                </Text>
                <Text style={styles.previewDesc} numberOfLines={3}>
                  {description || 'No description provided.'}
                </Text>

                <View style={styles.previewPriceBox}>
                  <Text style={styles.previewPriceLabel}>Pricing</Text>
                  <Text style={styles.previewPriceVal}>
                    {pricingType === 'quote'
                      ? 'Quote on Inspection'
                      : pricingType === 'starting'
                      ? `Starts at ₹${minPrice} / ${unit.replace('per ', '')}`
                      : `₹${amount} / ${unit.replace('per ', '')}`}
                  </Text>
                </View>

                <View style={styles.previewMeta}>
                  <View style={styles.previewMetaItem}>
                    <Ionicons name="location" size={14} color="#059669" />
                    <Text style={styles.previewMetaText}>
                      {city} ({radiusKm} km radius)
                    </Text>
                  </View>
                  <View style={styles.previewMetaItem}>
                    <Ionicons name="calendar" size={14} color="#059669" />
                    <Text style={styles.previewMetaText}>{selectedDays.length} working days</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Checklist */}
            <View style={styles.checklistCard}>
              <Text style={styles.checklistTitle}>WorkLogy Quality Assurance</Text>
              <View style={styles.checkItem}>
                <Ionicons name="checkmark-circle" size={16} color="#059669" />
                <Text style={styles.checkText}>Accurate category and task description</Text>
              </View>
              <View style={styles.checkItem}>
                <Ionicons name="checkmark-circle" size={16} color="#059669" />
                <Text style={styles.checkText}>Transparent pricing with zero hidden fees</Text>
              </View>
              <View style={styles.checkItem}>
                <Ionicons name="checkmark-circle" size={16} color="#059669" />
                <Text style={styles.checkText}>Direct customer booking enabled on publish</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Action Footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {step < 5 ? (
          <TouchableOpacity
            style={styles.nextBtn}
            onPress={handleNext}
            activeOpacity={0.85}
          >
            <Text style={styles.nextBtnText}>
              {step === 1
                ? 'Next: Pricing →'
                : step === 2
                ? 'Next: Service Area →'
                : step === 3
                ? 'Next: Availability →'
                : 'Next: Review →'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.footerTwoBtn}>
            <TouchableOpacity
              style={styles.draftBtn}
              onPress={() => handleSave('draft')}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#475569" />
              ) : (
                <Text style={styles.draftBtnText}>Save Draft</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.publishMainBtn}
              onPress={() => handleSave('published')}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.publishMainBtnText}>Publish Live</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingBottom: 10
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  headerTitleWrap: {
    flex: 1
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A'
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
    marginTop: 1
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 4
  },
  stepItem: {
    alignItems: 'center',
    width: 62
  },
  stepperLine: {
    flex: 1,
    height: 1.5,
    marginBottom: 16,
    marginHorizontal: -6
  },
  stepperLineActive: {
    backgroundColor: '#06684F'
  },
  stepperLineInactive: {
    backgroundColor: '#E2E8F0'
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4
  },
  stepCircleActive: {
    backgroundColor: '#06684F'
  },
  stepCircleCompleted: {
    backgroundColor: '#059669'
  },
  stepCircleInactive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1'
  },
  stepCircleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B'
  },
  stepCircleTextActive: {
    color: '#FFFFFF'
  },
  stepLabel: {
    fontSize: 9.5,
    textAlign: 'center'
  },
  stepLabelActive: {
    fontWeight: '800',
    color: '#06684F'
  },
  stepLabelInactive: {
    fontWeight: '500',
    color: '#94A3B8'
  },
  scrollBody: {
    flex: 1
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40
  },
  stepHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4
  },
  stepSub: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 18
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
    marginTop: 12
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A'
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: 'top'
  },
  categoryScroll: {
    paddingVertical: 4,
    gap: 10
  },
  categoryCard: {
    width: 110,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 8,
    alignItems: 'center'
  },
  categoryCardSelected: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5'
  },
  categoryThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginBottom: 6
  },
  categoryName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center'
  },
  categoryNameSelected: {
    color: '#047857',
    fontWeight: '700'
  },
  subcatWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10
  },
  subcatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1'
  },
  subcatChipChosen: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669'
  },
  subcatChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569'
  },
  subcatChipTextChosen: {
    color: '#047857',
    fontWeight: '700'
  },
  modelRow: {
    flexDirection: 'row',
    gap: 8
  },
  modelOption: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 6
  },
  modelOptionActive: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5'
  },
  modelText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center'
  },
  modelTextActive: {
    color: '#047857',
    fontWeight: '700'
  },
  currencyInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '700',
    color: '#059669',
    marginRight: 6
  },
  currencyInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    paddingVertical: 10
  },
  unitRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  unitChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1'
  },
  unitChipActive: {
    backgroundColor: '#059669',
    borderColor: '#059669'
  },
  unitChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569'
  },
  unitChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700'
  },
  helperText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    marginTop: 16
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2
  },
  switchSub: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16
  },
  daysWrap: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 10
  },
  dayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 10
  },
  dayCardChecked: {
    backgroundColor: '#F0FDF4',
    borderRadius: 8
  },
  dayText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569'
  },
  dayTextChecked: {
    color: '#047857',
    fontWeight: '700'
  },
  rowTwoCol: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16
  },
  previewImage: {
    width: '100%',
    height: 140
  },
  previewBadgeOverlay: {
    position: 'absolute',
    top: 10,
    left: 10
  },
  previewDomainBadge: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  previewDomainText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700'
  },
  previewBody: {
    padding: 14
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4
  },
  previewSubcat: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 8
  },
  previewDesc: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 12
  },
  previewPriceBox: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12
  },
  previewPriceLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600'
  },
  previewPriceVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#059669',
    marginTop: 2
  },
  previewMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10
  },
  previewMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  previewMetaText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500'
  },
  checklistCard: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    padding: 14,
    gap: 8
  },
  checklistTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
    marginBottom: 4
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  checkText: {
    fontSize: 12,
    color: '#047857',
    fontWeight: '600'
  },
  footer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingTop: 12
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8
  },
  nextBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700'
  },
  footerTwoBtn: {
    flexDirection: 'row',
    gap: 12
  },
  draftBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1'
  },
  draftBtnText: {
    color: '#334155',
    fontSize: 15,
    fontWeight: '700'
  },
  publishMainBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6
  },
  publishMainBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700'
  },
  servicePhotoCard: {
    position: 'relative',
    height: 180,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  servicePhotoImg: {
    width: '100%',
    height: '100%'
  },
  removeServicePhotoBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3
  },
  uploadServicePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#059669',
    borderRadius: 14,
    paddingVertical: 14,
    backgroundColor: '#F0FDF4',
    marginBottom: 8
  },
  uploadServicePhotoText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669'
  }
});

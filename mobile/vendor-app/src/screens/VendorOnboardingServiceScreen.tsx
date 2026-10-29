import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StatusBar,
  Alert,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/client';
import { COLORS } from '../theme/colors';
import { getServiceImage } from '../utils/serviceImages';
import OnboardingProgress from '../components/common/OnboardingProgress';

export default function VendorOnboardingServiceScreen({ navigation, route }: any) {
  const { vendorProfile, updateLocalProfile } = useAuth();
  const routeDomainIds: string[] = route.params?.selectedDomainIds || [];

  const [categories, setCategories] = useState<any[]>([]);
  const [selectedDomainId, setSelectedDomainId] = useState<string>('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  const [isCustomTask, setIsCustomTask] = useState(false);
  const [customTaskName, setCustomTaskName] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [experienceYears, setExperienceYears] = useState('3');
  const [price, setPrice] = useState('299');

  const [hasManuallyEditedTitle, setHasManuallyEditedTitle] = useState(false);
  const [hasManuallyEditedDesc, setHasManuallyEditedDesc] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load canonical categories and filter to vendor's selected domains
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setIsLoading(true);
        const res = await api.categories.getAll();
        const allList: any[] = Array.isArray(res) ? res : res?.categories || [];

        // Determine vendor's eligible domain IDs from params or profile
        const eligibleIds = new Set<string>();
        if (routeDomainIds.length > 0) {
          routeDomainIds.forEach((id) => eligibleIds.add(id.toString()));
        }
        if (vendorProfile?.categories && Array.isArray(vendorProfile.categories)) {
          vendorProfile.categories.forEach((c: any) => {
            const cid = (c?._id || c?.id || c).toString();
            if (cid) eligibleIds.add(cid);
          });
        }

        // Filter allList to eligible domains if any selected
        const filtered = eligibleIds.size > 0
          ? allList.filter((c) => eligibleIds.has((c._id || c.id || c).toString()))
          : allList;

        if (isMounted) {
          setCategories(filtered.length > 0 ? filtered : allList);
          if (filtered.length > 0) {
            const firstId = (filtered[0]._id || filtered[0].id || filtered[0]).toString();
            setSelectedDomainId(firstId);
          }
        }
      } catch (err) {
        console.warn('Failed to load categories for service wizard:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [vendorProfile, routeDomainIds]);

  // Current active category doc
  const activeCategory = useMemo(() => {
    return categories.find((c) => (c._id || c.id || c).toString() === selectedDomainId);
  }, [categories, selectedDomainId]);

  // Subcategories of active category
  const subcategories: string[] = useMemo(() => {
    if (!activeCategory?.subcategories || !Array.isArray(activeCategory.subcategories)) {
      return [];
    }
    return activeCategory.subcategories;
  }, [activeCategory]);

  // Set default subcategory when domain changes
  useEffect(() => {
    if (subcategories.length > 0) {
      setSelectedSubcategory(subcategories[0]);
      setIsCustomTask(false);
    } else {
      setSelectedSubcategory('');
      setIsCustomTask(true);
    }
  }, [subcategories, selectedDomainId]);

  // Auto-generate suggestions if not manually edited
  useEffect(() => {
    if (!activeCategory) return;

    const taskLabel = isCustomTask
      ? (customTaskName.trim() || 'General Service')
      : (selectedSubcategory || activeCategory.name);

    if (!hasManuallyEditedTitle) {
      setTitle(`${taskLabel} & Inspection`);
    }

    if (!hasManuallyEditedDesc) {
      setDescription(
        `Professional ${taskLabel} by verified certified technician. Includes complete inspection, diagnostics, standard installation/repair, and post-service warranty.`
      );
    }
  }, [activeCategory, selectedSubcategory, isCustomTask, customTaskName, hasManuallyEditedTitle, hasManuallyEditedDesc]);

  // Handle Publish First Service
  const handlePublishService = async () => {
    if (!selectedDomainId) {
      setErrorMessage('Please select a service domain.');
      return;
    }

    if (isCustomTask && !customTaskName.trim()) {
      setErrorMessage('Please enter the custom service or task name.');
      return;
    }

    const cleanTitle = title.trim();
    if (!cleanTitle || cleanTitle.length < 5) {
      setErrorMessage('Please enter a descriptive service title (at least 5 characters).');
      return;
    }

    setIsPublishing(true);
    setErrorMessage(null);

    try {
      const taskVal = isCustomTask ? customTaskName.trim() : selectedSubcategory;
      const idempotencyKey = `onboarding_${vendorProfile?.user || 'vendor'}_${selectedDomainId}_${Date.now()}`;

      // Create Service Listing
      await api.vendor.createService({
        title: cleanTitle,
        domain: selectedDomainId,
        category: selectedDomainId,
        categoryName: activeCategory?.name || 'General',
        subcategory: taskVal,
        isCustom: isCustomTask,
        customSubcategory: isCustomTask ? taskVal : undefined,
        description: description.trim(),
        experienceYears: Number(experienceYears) || 3,
        pricing: {
          type: 'fixed',
          amount: Number(price) || 299,
          unit: 'per visit'
        },
        idempotencyKey
      } as any);

      // Mark onboarding completed
      await api.vendor.updateProfile({
        onboardingStep: 'completed'
      });
      updateLocalProfile({ onboardingStep: 'completed' });

      Alert.alert(
        'Congratulations! 🎉',
        'Your first service listing has been created and published. Welcome to WorkLogy!',
        [
          {
            text: 'Go to Dashboard',
            onPress: () => {
              navigation.resetTo ? navigation.resetTo('VendorHomeTab') : navigation.navigate('VendorHomeTab');
            }
          }
        ]
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to publish service. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSkip = async () => {
    try {
      // Mark onboarding as completed or keep draft
      await api.vendor.updateProfile({
        onboardingStep: 'completed'
      });
      updateLocalProfile({ onboardingStep: 'completed' });
    } catch {}

    navigation.resetTo ? navigation.resetTo('VendorHomeTab') : navigation.navigate('VendorHomeTab');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <OnboardingProgress currentStep={3} />

      {/* Top Bar with Back Button */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={COLORS.textDark} />
          <Text style={styles.backBtnText}>Back to Domains</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>List your first service</Text>
        <Text style={styles.subheading}>
          Create a service listing so customers can discover and book your work.
        </Text>

        {isLoading ? (
          <View style={styles.loaderBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loaderText}>Setting up service wizard...</Text>
          </View>
        ) : (
          <View>
            {/* Domain Selector */}
            <Text style={styles.fieldLabel}>Select Service Domain</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.domainPillsRow}
            >
              {categories.map((cat) => {
                const catId = (cat._id || cat.id || cat).toString();
                const isSelected = catId === selectedDomainId;

                return (
                  <TouchableOpacity
                    key={catId}
                    style={[styles.domainPill, isSelected && styles.domainPillSelected]}
                    onPress={() => {
                      setSelectedDomainId(catId);
                      setHasManuallyEditedTitle(false);
                      setHasManuallyEditedDesc(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={getServiceImage(cat.slug || cat.name)}
                      style={styles.domainPillThumb}
                    />
                    <Text style={[styles.domainPillText, isSelected && styles.domainPillTextSelected]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Subcategory Pills */}
            <Text style={styles.fieldLabel}>Service Subcategory / Task</Text>
            <View style={styles.subcatGrid}>
              {subcategories.map((sub) => {
                const isSelected = selectedSubcategory === sub && !isCustomTask;
                return (
                  <TouchableOpacity
                    key={sub}
                    style={[styles.subcatPill, isSelected && styles.subcatPillSelected]}
                    onPress={() => {
                      setSelectedSubcategory(sub);
                      setIsCustomTask(false);
                      setHasManuallyEditedTitle(false);
                      setHasManuallyEditedDesc(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.subcatPillText, isSelected && styles.subcatPillTextSelected]}>
                      {sub}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {/* Other Option */}
              <TouchableOpacity
                style={[styles.subcatPill, isCustomTask && styles.subcatPillSelected]}
                onPress={() => {
                  setIsCustomTask(true);
                  setHasManuallyEditedTitle(false);
                  setHasManuallyEditedDesc(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.subcatPillText, isCustomTask && styles.subcatPillTextSelected]}>
                  + Other (Custom)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Custom Task Input */}
            {isCustomTask && (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Custom Service Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Split AC Outdoor Unit Gas Refill"
                  placeholderTextColor={COLORS.textLight}
                  value={customTaskName}
                  onChangeText={(val) => {
                    setCustomTaskName(val);
                    if (errorMessage) setErrorMessage(null);
                  }}
                />
              </View>
            )}

            {/* Service Title */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.fieldLabel}>Service Title</Text>
                <TouchableOpacity
                  onPress={() => {
                    setHasManuallyEditedTitle(false);
                    const taskLabel = isCustomTask
                      ? (customTaskName.trim() || 'General Service')
                      : (selectedSubcategory || activeCategory?.name || 'Service');
                    setTitle(`${taskLabel} & Inspection`);
                  }}
                >
                  <Text style={styles.suggestBtn}>Auto-Suggest</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.input}
                placeholder="e.g. Split AC Servicing and Gas Inspection"
                placeholderTextColor={COLORS.textLight}
                value={title}
                onChangeText={(val) => {
                  setTitle(val);
                  setHasManuallyEditedTitle(true);
                  if (errorMessage) setErrorMessage(null);
                }}
              />
            </View>

            {/* Description */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Service Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe what is included in this service..."
                placeholderTextColor={COLORS.textLight}
                multiline
                numberOfLines={3}
                value={description}
                onChangeText={(val) => {
                  setDescription(val);
                  setHasManuallyEditedDesc(true);
                  if (errorMessage) setErrorMessage(null);
                }}
              />
            </View>

            {/* Row: Experience & Base Price */}
            <View style={styles.rowTwoCols}>
              <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.fieldLabel}>Experience (Years)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 5"
                  placeholderTextColor={COLORS.textLight}
                  keyboardType="number-pad"
                  maxLength={2}
                  value={experienceYears}
                  onChangeText={setExperienceYears}
                />
              </View>

              <View style={[styles.fieldGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.fieldLabel}>Base Visit Fee (₹)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 299"
                  placeholderTextColor={COLORS.textLight}
                  keyboardType="number-pad"
                  maxLength={5}
                  value={price}
                  onChangeText={setPrice}
                />
              </View>
            </View>

            {errorMessage && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color={COLORS.error} style={{ marginRight: 6 }} />
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </View>
            )}

            {/* Primary Action Button */}
            <TouchableOpacity
              style={[styles.primaryBtn, isPublishing && styles.btnDisabled]}
              onPress={handlePublishService}
              disabled={isPublishing}
              activeOpacity={0.85}
            >
              {isPublishing ? (
                <View style={styles.btnLoadingRow}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.primaryBtnText}>Publishing Service...</Text>
                </View>
              ) : (
                <Text style={styles.primaryBtnText}>Publish Service & Finish 🎉</Text>
              )}
            </TouchableOpacity>

            {/* Skip For Now Button */}
            <TouchableOpacity
              style={styles.skipBtn}
              onPress={handleSkip}
              disabled={isPublishing}
              activeOpacity={0.7}
            >
              <Text style={styles.skipBtnText}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  backBtnText: {
    fontSize: 13,
    color: COLORS.textDark,
    fontWeight: '600',
    marginLeft: 6
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40
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
    marginBottom: 20
  },
  loaderBox: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center'
  },
  loaderText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 12
  },
  fieldGroup: {
    marginBottom: 16
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  suggestBtn: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 8
  },
  domainPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18
  },
  domainPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: COLORS.border
  },
  domainPillThumb: {
    width: 22,
    height: 22,
    borderRadius: 6,
    marginRight: 8
  },
  domainPillSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary
  },
  domainPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark
  },
  domainPillTextSelected: {
    color: '#FFFFFF'
  },
  subcatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18
  },
  subcatPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: COLORS.border
  },
  subcatPillSelected: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary
  },
  subcatPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary
  },
  subcatPillTextSelected: {
    color: COLORS.primary,
    fontWeight: '700'
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 14,
    fontSize: 14,
    color: COLORS.textDark
  },
  textArea: {
    height: 76,
    paddingTop: 12,
    textAlignVertical: 'top'
  },
  rowTwoCols: {
    flexDirection: 'row',
    justifyContent: 'space-between'
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

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
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

const MAX_DOMAINS = 3;

export default function VendorOnboardingDomainsScreen({ navigation }: any) {
  const { vendorProfile, updateLocalProfile } = useAuth();

  const [categories, setCategories] = useState<any[]>([]);
  const [selectedDomainIds, setSelectedDomainIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setIsLoading(true);
        const res = await api.categories.getAll();
        const list = Array.isArray(res) ? res : res?.categories || [];
        if (isMounted) {
          setCategories(list);

          // Preload existing selected categories from profile
          if (vendorProfile?.categories && Array.isArray(vendorProfile.categories)) {
            const preselected = vendorProfile.categories
              .map((c: any) => (c?._id || c?.id || c).toString())
              .filter(Boolean);
            if (preselected.length > 0) {
              setSelectedDomainIds(preselected);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load categories:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [vendorProfile]);

  const handleToggleDomain = (domainId: string) => {
    const isSelected = selectedDomainIds.includes(domainId);
    if (isSelected) {
      setSelectedDomainIds(selectedDomainIds.filter((id) => id !== domainId));
    } else {
      if (selectedDomainIds.length >= MAX_DOMAINS) {
        Alert.alert(
          'Maximum 3 Domains',
          `You can select a maximum of ${MAX_DOMAINS} specialized service domains. Please deselect one first to add this domain.`
        );
        return;
      }
      setSelectedDomainIds([...selectedDomainIds, domainId]);
    }
    if (errorMessage) setErrorMessage(null);
  };

  const handleSaveAndContinue = async () => {
    if (selectedDomainIds.length === 0) {
      setErrorMessage('Please select at least 1 service domain to receive matching customer jobs.');
      return;
    }

    if (selectedDomainIds.length > MAX_DOMAINS) {
      setErrorMessage(`You can select a maximum of ${MAX_DOMAINS} service domains.`);
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      await api.vendor.updateProfile({
        categories: selectedDomainIds,
        onboardingStep: 'first_service_pending'
      });

      // Update local profile state
      const matchingCategoryDocs = categories.filter((c) =>
        selectedDomainIds.includes((c._id || c.id || c).toString())
      );
      updateLocalProfile({ categories: matchingCategoryDocs });

      navigation.navigate('VendorOnboardingService', {
        selectedDomainIds
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save service domains. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    // If domains were selected, save them gracefully in background
    if (selectedDomainIds.length > 0) {
      api.vendor.updateProfile({
        categories: selectedDomainIds,
        onboardingStep: 'first_service_pending'
      }).then(() => {
        const matchingCategoryDocs = categories.filter((c) =>
          selectedDomainIds.includes((c._id || c.id || c).toString())
        );
        updateLocalProfile({ categories: matchingCategoryDocs });
      }).catch(() => {});
    }

    navigation.navigate('VendorOnboardingService', {
      selectedDomainIds
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <OnboardingProgress currentStep={2} />

      {/* Header Bar with Back Button */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={COLORS.textDark} />
          <Text style={styles.backBtnText}>Back to Profile</Text>
        </TouchableOpacity>
        <View style={styles.badgeCount}>
          <Text style={styles.badgeCountText}>
            {selectedDomainIds.length} of {MAX_DOMAINS} selected
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>What services do you provide?</Text>
        <Text style={styles.subheading}>
          Select up to 3 domains you specialize in. Your available jobs feed will match your selected domains.
        </Text>

        {isLoading ? (
          <View style={styles.loaderBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loaderText}>Loading service domains...</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {categories.map((cat) => {
              const catId = (cat._id || cat.id || cat).toString();
              const isSelected = selectedDomainIds.includes(catId);
              const subcount = Array.isArray(cat.subcategories) ? cat.subcategories.length : 0;

              return (
                <TouchableOpacity
                  key={catId}
                  style={[
                    styles.domainCard,
                    isSelected && styles.domainCardSelected
                  ]}
                  onPress={() => handleToggleDomain(catId)}
                  activeOpacity={0.8}
                >
                  <View style={styles.cardImageContainer}>
                    <Image
                      source={getServiceImage(cat.slug || cat.name)}
                      style={styles.cardImage}
                      resizeMode="cover"
                    />
                    <View
                      style={[
                        styles.selectionBadge,
                        isSelected && styles.selectionBadgeSelected
                      ]}
                    >
                      <Ionicons
                        name={isSelected ? 'checkmark' : 'add'}
                        size={14}
                        color={isSelected ? '#FFFFFF' : '#475569'}
                      />
                    </View>
                  </View>
                  <View style={styles.cardContent}>
                    <Text
                      style={[
                        styles.domainName,
                        isSelected && styles.domainNameSelected
                      ]}
                      numberOfLines={2}
                    >
                      {cat.name}
                    </Text>
                    {subcount > 0 && (
                      <Text style={styles.subcatCount}>
                        {subcount} services
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

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
              <Text style={styles.primaryBtnText}>Saving Domains...</Text>
            </View>
          ) : (
            <Text style={styles.primaryBtnText}>Save & Continue</Text>
          )}
        </TouchableOpacity>

        {/* Skip For Now Button */}
        <TouchableOpacity
          style={styles.skipBtn}
          onPress={handleSkip}
          disabled={isSaving}
          activeOpacity={0.7}
        >
          <Text style={styles.skipBtnText}>Skip for now</Text>
        </TouchableOpacity>
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
    justifyContent: 'space-between',
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
  badgeCount: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8
  },
  badgeCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
    marginBottom: 20
  },
  domainCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    overflow: 'hidden',
    shadowColor: '#17212B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2
  },
  domainCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#F0FDF4',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.15,
    elevation: 3
  },
  cardImageContainer: {
    width: '100%',
    height: 92,
    backgroundColor: '#EDF1F3',
    position: 'relative'
  },
  cardImage: {
    width: '100%',
    height: '100%'
  },
  selectionBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2
  },
  selectionBadgeSelected: {
    backgroundColor: COLORS.primaryAction,
    borderColor: COLORS.primaryAction
  },
  cardContent: {
    padding: 10,
    backgroundColor: 'transparent'
  },
  domainName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark,
    lineHeight: 17,
    minHeight: 34
  },
  domainNameSelected: {
    color: COLORS.primary,
    fontWeight: '800'
  },
  subcatCount: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 3,
    fontWeight: '500'
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

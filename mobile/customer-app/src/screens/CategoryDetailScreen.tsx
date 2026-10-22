import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { api } from '../api/client';
import { COLORS } from '../theme/colors';
import { formatCurrency } from '../utils/formatters';
import type { ServiceCategory } from '../types';

export default function CategoryDetailScreen({ route, navigation }: any) {
  const { slug, name } = route.params || {};
  const [category, setCategory] = useState<ServiceCategory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategory();
  }, [slug]);

  const loadCategory = async () => {
    try {
      setLoading(true);
      const res = await api.categories.getBySlug(slug);
      if (res?.category) {
        setCategory(res.category);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Category Hero */}
      <View style={styles.hero}>
        <View style={styles.heroIconBox}>
          <Text style={styles.heroIcon}>{category?.icon || '🛠️'}</Text>
        </View>
        <Text style={styles.heroTitle}>{category?.name || name}</Text>
        <Text style={styles.heroDesc}>
          {category?.description ||
            'Certified and background-checked technicians delivering high quality services with WorkLogy Escrow Protection.'}
        </Text>
      </View>

      {/* Upfront Subservices Pricing Grid */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Standard Service Packages</Text>
        {loading ? (
          <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 20 }} />
        ) : (
          category?.subcategories?.map((sub, index) => (
            <View key={index} style={styles.subCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.subTitle}>{sub.name}</Text>
                <Text style={styles.subDesc}>
                  {sub.description || 'Complete diagnostics, standard spare parts fitting, and labor covered.'}
                </Text>
                <Text style={styles.subPrice}>
                  {sub.basePrice ? formatCurrency(sub.basePrice) : '₹499 base rate'}
                  <Text style={styles.subUnit}> / {sub.priceUnit || 'service'}</Text>
                </Text>
              </View>
              <TouchableOpacity
                style={styles.bookBtn}
                onPress={() =>
                  navigation.navigate('CreateJob', {
                    categorySlug: slug,
                    categoryName: category?.name,
                    subservice: sub.name,
                    basePrice: sub.basePrice
                  })
                }
              >
                <Text style={styles.bookBtnText}>Book Now</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      {/* Custom Booking CTA */}
      <View style={styles.customCta}>
        <Text style={styles.customCtaTitle}>Have a unique or custom requirement?</Text>
        <Text style={styles.customCtaDesc}>
          Post your task to receive quotes from multiple verified local contractors.
        </Text>
        <TouchableOpacity
          style={styles.customBtn}
          onPress={() =>
            navigation.navigate('CreateJob', {
              categorySlug: slug,
              categoryName: category?.name
            })
          }
        >
          <Text style={styles.customBtnText}>Post a Custom Job Request 📋</Text>
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
  hero: {
    backgroundColor: '#06684F',
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24
  },
  heroIconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
  },
  heroIcon: {
    fontSize: 32
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center'
  },
  heroDesc: {
    fontSize: 12,
    color: '#D1FAE5',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    maxWidth: '90%'
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 20
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 12
  },
  subCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2
  },
  subTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textDark
  },
  subDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginVertical: 4,
    lineHeight: 15
  },
  subPrice: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.primary,
    marginTop: 2
  },
  subUnit: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted
  },
  bookBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginLeft: 10
  },
  bookBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800'
  },
  customCta: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    borderRadius: 18,
    padding: 18,
    alignItems: 'center'
  },
  customCtaTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E40AF',
    textAlign: 'center'
  },
  customCtaDesc: {
    fontSize: 11,
    color: '#3B82F6',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 14
  },
  customBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12
  },
  customBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800'
  }
});

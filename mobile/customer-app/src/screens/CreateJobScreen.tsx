import React, { useState } from 'react';
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
import { api } from '../api/client';
import { COLORS } from '../theme/colors';

export default function CreateJobScreen({ route, navigation }: any) {
  const { categorySlug, categoryName, subservice, basePrice } = route.params || {};

  const [title, setTitle] = useState(subservice ? `${subservice} Service` : '');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState<'normal' | 'emergency'>('normal');
  const [budgetType, setBudgetType] = useState<'fixed' | 'quote'>('fixed');
  const [budgetAmount, setBudgetAmount] = useState(basePrice ? String(basePrice) : '499');
  const [streetAddress, setStreetAddress] = useState('Flat 402, Tower B, Supertech Eco Village 1');
  const [city, setCity] = useState('Noida');
  const [pincode, setPincode] = useState('201306');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Required Information', 'Please provide a title and detailed problem description.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.jobs.createJob({
        title: title.trim(),
        description: description.trim(),
        urgency,
        pricing: {
          type: budgetType,
          amount: budgetType === 'fixed' ? Number(budgetAmount) || 499 : undefined
        },
        address: {
          street: streetAddress.trim(),
          city: city.trim(),
          pincode: pincode.trim()
        }
      });

      Alert.alert(
        'Service Request Created 🎉',
        'Your service order has been broadcast to verified local tradespeople. You will receive quotes and notifications shortly.',
        [{ text: 'View My Jobs', onPress: () => navigation.navigate('MyJobsTab') }]
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit service request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerCategory}>{categoryName || 'Home & Trade Services'}</Text>
        <Text style={styles.headerTitle}>Post a Service Request</Text>
        <Text style={styles.headerSubtitle}>
          Fill out the details below. Eligible verified contractors will respond with quotes.
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
            <Text style={[styles.toggleText, urgency === 'normal' && styles.toggleTextActive]}>
              📅 Standard / Flexible
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, urgency === 'emergency' && styles.emergencyToggleActive]}
            onPress={() => setUrgency('emergency')}
          >
            <Text style={[styles.toggleText, urgency === 'emergency' && styles.emergencyTextActive]}>
              ⚡ Urgent (Today)
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
        <Text style={styles.label}>Service Address</Text>
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

        {/* Submit */}
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitBtnText}>Submit Service Request 🚀</Text>
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  headerCategory: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.textDark,
    marginTop: 2
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
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
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
    gap: 8
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center'
  },
  toggleBtnActive: {
    backgroundColor: '#ECFDF5',
    borderColor: COLORS.primary
  },
  toggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary
  },
  toggleTextActive: {
    color: COLORS.primary,
    fontWeight: '800'
  },
  emergencyToggleActive: {
    backgroundColor: '#FEF2F2',
    borderColor: '#DC2626'
  },
  emergencyTextActive: {
    color: '#DC2626',
    fontWeight: '800'
  },
  budgetInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginTop: 8
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
    marginRight: 6
  },
  budgetInput: {
    flex: 1,
    height: 44,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800'
  }
});

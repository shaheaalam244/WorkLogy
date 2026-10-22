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

export default function EmergencyScreen({ navigation }: any) {
  const [selectedTrade, setSelectedTrade] = useState('Electrical Breakdown');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('Sector 62, Noida, UP');
  const [submitting, setSubmitting] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const emergencyTrades = [
    { title: 'Electrical Breakdown', emoji: '⚡', desc: 'Short circuit, sparking, total blackout' },
    { title: 'Plumbing & Water Leak', emoji: '🚰', desc: 'Burst pipe, heavy flooding, no water' },
    { title: 'Lockout / Locksmith', emoji: '🔑', desc: 'Locked out, broken key, door jammed' },
    { title: 'AC Compressor Failure', emoji: '❄️', desc: 'Burning smell, gas leak, complete shutdown' }
  ];

  const handleTriggerEmergency = async () => {
    if (!description.trim()) {
      Alert.alert('Describe the Emergency', 'Please briefly describe the urgent breakdown or safety hazard.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.jobs.createJob({
        title: `EMERGENCY: ${selectedTrade}`,
        description: description.trim(),
        urgency: 'emergency',
        pricing: {
          type: 'fixed',
          amount: 499
        },
        address: {
          street: address.trim(),
          city: 'Noida',
          pincode: '201301'
        }
      });

      setIsBroadcasting(true);
      Alert.alert(
        'Emergency Radar Active 🚨',
        'Nearby certified emergency technicians have received your alert. The first available professional to accept will be dispatched immediately.',
        [{ text: 'View Emergency Tracking', onPress: () => navigation.navigate('MyJobsTab') }]
      );
    } catch (err: any) {
      Alert.alert('Dispatch Failed', err.message || 'Could not connect to emergency dispatch server.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* 1. Life Safety Warning */}
      <View style={styles.safetyNotice}>
        <Text style={styles.safetyEmoji}>⚠️</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.safetyTitle}>CRITICAL LIFE SAFETY WARNING</Text>
          <Text style={styles.safetyDesc}>
            For active fires, medical emergencies, gas explosions, or physical danger, please immediately call national emergency services (112, 101, 102). WorkLogy provides technical trade repairs only.
          </Text>
        </View>
      </View>

      {/* 2. Dispatch Header */}
      <View style={styles.header}>
        <Text style={styles.title}>24/7 Rapid Emergency Dispatch</Text>
        <Text style={styles.subtitle}>
          Average on-site technician arrival: 30–45 minutes. Standard emergency diagnostic visit fee: ₹499.
        </Text>
      </View>

      {/* 3. Trade Selector */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Emergency Breakdown Category</Text>
        {emergencyTrades.map((t) => (
          <TouchableOpacity
            key={t.title}
            style={[styles.tradeCard, selectedTrade === t.title && styles.tradeCardActive]}
            onPress={() => setSelectedTrade(t.title)}
          >
            <Text style={styles.tradeEmoji}>{t.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.tradeTitle}>{t.title}</Text>
              <Text style={styles.tradeDesc}>{t.desc}</Text>
            </View>
            <View style={[styles.radioCircle, selectedTrade === t.title && styles.radioActive]} />
          </TouchableOpacity>
        ))}
      </View>

      {/* 4. Description & Address */}
      <View style={styles.section}>
        <Text style={styles.fieldLabel}>What happened? (Describe symptoms)</Text>
        <TextInput
          style={styles.textArea}
          placeholder="e.g. Main switchboard sparked and complete flat has lost power..."
          placeholderTextColor={COLORS.textMuted}
          multiline
          numberOfLines={3}
          value={description}
          onChangeText={setDescription}
        />

        <Text style={styles.fieldLabel}>Current Location / Address</Text>
        <TextInput
          style={styles.input}
          placeholder="Flat / Society / Landmark"
          placeholderTextColor={COLORS.textMuted}
          value={address}
          onChangeText={setAddress}
        />

        <TouchableOpacity
          style={styles.dispatchBtn}
          onPress={handleTriggerEmergency}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.dispatchBtnText}>Broadcast Emergency Callout ⚡</Text>
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
  safetyNotice: {
    flexDirection: 'row',
    backgroundColor: '#FEF2F2',
    borderBottomWidth: 1,
    borderBottomColor: '#FECACA',
    padding: 14,
    gap: 10
  },
  safetyEmoji: {
    fontSize: 22
  },
  safetyTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#991B1B',
    letterSpacing: 0.5
  },
  safetyDesc: {
    fontSize: 11,
    color: '#7F1D1D',
    marginTop: 2,
    lineHeight: 15
  },
  header: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#DC2626'
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 16
  },
  section: {
    padding: 16
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 10
  },
  tradeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginBottom: 8,
    gap: 12
  },
  tradeCardActive: {
    borderColor: '#DC2626',
    backgroundColor: '#FFF5F5'
  },
  tradeEmoji: {
    fontSize: 24
  },
  tradeTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textDark
  },
  tradeDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border
  },
  radioActive: {
    borderColor: '#DC2626',
    backgroundColor: '#DC2626'
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 6,
    marginTop: 10
  },
  textArea: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: COLORS.textDark,
    height: 80,
    textAlignVertical: 'top'
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
  dispatchBtn: {
    backgroundColor: '#DC2626',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20
  },
  dispatchBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900'
  }
});

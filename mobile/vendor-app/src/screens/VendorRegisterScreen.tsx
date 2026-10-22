import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { COLORS } from '../theme/colors';

export default function VendorRegisterScreen({ navigation }: any) {
  const { register, isLoading } = useAuth();
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Electrical Services');

  const categories = [
    'Electrical Services',
    'Plumbing & Drainage',
    'AC & HVAC Services',
    'Carpentry & Woodwork',
    'Appliance Repair'
  ];

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Fields Required', 'Please complete your name, email, and password.');
      return;
    }

    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || '9876543210',
        password: password.trim()
      });
      Alert.alert('Contractor Account Created 🎉', 'Welcome to WorkLogy Pro! Complete your KYC verification to access full tenders.');
      navigation.navigate('VendorHomeTab');
    } catch (err: any) {
      Alert.alert('Registration Failed', err.message || 'Could not register contractor account.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <View style={styles.brandRow}>
            <Text style={styles.brandTitle}>WorkLogy Pro</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>NEW PARTNER</Text>
            </View>
          </View>

          <Text style={styles.welcomeTitle}>Join as a Certified Pro</Text>
          <Text style={styles.welcomeSubtitle}>
            Receive direct leads, guaranteed escrow payouts, and rapid 24/7 emergency service calls.
          </Text>

          <Text style={styles.label}>Full Name / Lead Technician</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Rahul Sharma"
            placeholderTextColor={COLORS.textMuted}
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>Business / Trade Enterprise Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Apex Electrical Solutions"
            placeholderTextColor={COLORS.textMuted}
            value={businessName}
            onChangeText={setBusinessName}
          />

          <Text style={styles.label}>Primary Trade Specialty</Text>
          <View style={styles.tradeRow}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.tradeChip, selectedCategory === cat && styles.tradeChipActive]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text style={[styles.tradeChipText, selectedCategory === cat && styles.tradeChipTextActive]}>
                  {cat.split(' ')[0]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="rahul.electric@example.com"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>Mobile Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="+91 98765 43210"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />

          <Text style={styles.label}>Password (minimum 6 characters)</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={COLORS.textMuted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            style={styles.registerBtn}
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.registerBtnText}>Register Contractor Profile 🛠️</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already registered? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('VendorLogin')}>
              <Text style={styles.loginLink}>Sign In Here</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#064E3B'
  },
  scroll: {
    padding: 20,
    justifyContent: 'center'
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#065F46'
  },
  roleBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#065F46'
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textDark,
    marginTop: 4
  },
  welcomeSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 16
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 6,
    textTransform: 'uppercase'
  },
  input: {
    height: 46,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 13,
    color: COLORS.textDark,
    marginBottom: 12,
    backgroundColor: '#F8FAFC'
  },
  tradeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14
  },
  tradeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#F1F5F9'
  },
  tradeChipActive: {
    backgroundColor: COLORS.primary
  },
  tradeChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary
  },
  tradeChipTextActive: {
    color: '#FFFFFF'
  },
  registerBtn: {
    backgroundColor: COLORS.primary,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8
  },
  registerBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800'
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 18
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textSecondary
  },
  loginLink: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary
  }
});

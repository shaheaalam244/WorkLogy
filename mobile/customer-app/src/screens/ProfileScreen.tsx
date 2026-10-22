import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { COLORS } from '../theme/colors';

export default function ProfileScreen({ navigation }: any) {
  const { user, logout, switchRole } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleSwitchToVendor = async () => {
    try {
      await switchRole('vendor');
      Alert.alert('Switched to Contractor Mode', 'You are now ready to receive tenders and field jobs.');
    } catch (err: any) {
      Alert.alert('Switch Failed', err.message || 'Could not switch portal.');
    }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out of WorkLogy?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
        }
      }
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      {/* 1. Header Profile */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(user?.name || 'C').charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.userName}>{user?.name || 'Customer'}</Text>
        <Text style={styles.userEmail}>{user?.email || 'Logged in via WorkLogy'}</Text>
        <Text style={styles.userPhone}>📞 {user?.phone || '+91 98765 43210'}</Text>

        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>VERIFIED CUSTOMER ✓</Text>
        </View>
      </View>

      {/* 2. Saved Service Addresses */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Saved Service Addresses</Text>
        <View style={styles.card}>
          <View style={styles.addressRow}>
            <Text style={styles.addressEmoji}>🏠</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.addressType}>Primary Residence (Home)</Text>
              <Text style={styles.addressText}>Flat 402, Tower B, Supertech Eco Village 1, Greater Noida West - 201306</Text>
            </View>
          </View>
        </View>
      </View>

      {/* 3. Settings & Portal Switcher */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Preferences & Switch Portals</Text>

        <View style={styles.menuItem}>
          <Text style={styles.menuEmoji}>🔔</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuTitle}>Push Notifications</Text>
            <Text style={styles.menuDesc}>Receive arrival OTPs and technician updates</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: '#CBD5E1', true: '#BBF7D0' }}
            thumbColor={notificationsEnabled ? COLORS.primary : '#94A3B8'}
          />
        </View>

        <TouchableOpacity style={styles.menuItem} onPress={handleSwitchToVendor}>
          <Text style={styles.menuEmoji}>🛠️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuTitle}>Switch to Contractor Portal</Text>
            <Text style={styles.menuDesc}>Access tender radar and field work orders</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() =>
            Alert.alert(
              'WorkLogy Customer Helpdesk',
              'Need assistance with a booking or emergency? Reach our 24/7 client operations desk at support@worklogy.in or call 1800-WORKLOGY.'
            )
          }
        >
          <Text style={styles.menuEmoji}>💬</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuTitle}>Customer Support & Escrow Help</Text>
            <Text style={styles.menuDesc}>Dispute resolution and 24/7 support</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={handleLogout}>
          <Text style={styles.menuEmoji}>🚪</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.menuTitle, { color: '#DC2626' }]}>Sign Out</Text>
            <Text style={styles.menuDesc}>Securely end your session</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
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
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900'
  },
  userName: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textDark
  },
  userEmail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  userPhone: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2
  },
  roleBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    marginTop: 8
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#065F46'
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 18
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10
  },
  addressEmoji: {
    fontSize: 20
  },
  addressType: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textDark
  },
  addressText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 15
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12
  },
  menuEmoji: {
    fontSize: 20
  },
  menuTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textDark
  },
  menuDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1
  },
  chevron: {
    fontSize: 18,
    color: COLORS.textMuted
  }
});

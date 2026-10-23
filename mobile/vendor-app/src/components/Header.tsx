import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../theme/colors';

interface HeaderProps {
  unreadCount?: number;
  userAvatar?: string;
  userName?: string;
  onPressNotifications?: () => void;
  onPressProfile?: () => void;
}

export default function Header({
  unreadCount = 0,
  userAvatar,
  userName,
  onPressNotifications,
  onPressProfile
}: HeaderProps) {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0
  );

  return (
    <View style={[styles.headerContainer, { paddingTop: topInset, height: 56 + topInset }]}>
      {/* Left: WorkLogy Brand Mark & Name */}
      <View style={styles.leftGroup}>
        <View style={styles.logoBadge}>
          <Ionicons name="home" size={16} color="#FFFFFF" />
          <View style={styles.logoPinDot}>
            <Ionicons name="location" size={10} color="#F59E0B" />
          </View>
        </View>
        <Text style={styles.brandTitle}>WorkLogy</Text>
        <View style={styles.proBadge}>
          <Text style={styles.proBadgeText}>PRO</Text>
        </View>
      </View>

      {/* Right: Notifications with Unread Badge & Profile Avatar */}
      <View style={styles.rightGroup}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onPressNotifications}
          activeOpacity={0.7}
          accessibilityLabel="Notifications"
        >
          <Ionicons name="notifications-outline" size={22} color={COLORS.textDark} />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.avatarButton}
          onPress={onPressProfile}
          activeOpacity={0.7}
          accessibilityLabel="Profile"
        >
          {userAvatar ? (
            <Image source={{ uri: userAvatar }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitial}>
                {(userName || 'P').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#1E40AF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  },
  logoPinDot: {
    position: 'absolute',
    bottom: -2,
    right: -2
  },
  brandTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#111827',
    marginLeft: 8,
    letterSpacing: -0.3
  },
  proBadge: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6
  },
  proBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#06684F',
    letterSpacing: 0.5
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    position: 'relative'
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  avatarButton: {
    borderRadius: 20
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: '800',
    color: '#3730A3'
  }
});

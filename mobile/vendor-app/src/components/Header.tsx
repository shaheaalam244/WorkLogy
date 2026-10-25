import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../theme/colors';

interface HeaderProps {
  unreadCount?: number;
  userAvatar?: string;
  userName?: string;
  isOnline?: boolean;
  onPressNotifications?: () => void;
  onPressProfile?: () => void;
}

export default function Header({
  unreadCount = 0,
  userAvatar,
  userName,
  isOnline = true,
  onPressNotifications,
    onPressProfile
  }: HeaderProps) {
    const insets = useSafeAreaInsets();
    const [imageError, setImageError] = useState(false);

    useEffect(() => {
      setImageError(false);
    }, [userAvatar]);

    const topInset = Math.max(
      insets.top,
      Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0
    );

    return (
      <View style={[styles.headerContainer, { paddingTop: topInset, height: 60 + topInset }]}>
        {/* Left: WorkLogy Brand and App Label */}
        <View style={styles.leftGroup}>
          <Text style={styles.brandTitle}>
            Work<Text style={styles.brandHighlight}>Logy</Text>
          </Text>
          <Text style={styles.brandSubtitle}>Vendor App</Text>
        </View>

        {/* Right: Notifications with Unread Badge & Profile Avatar */}
        <View style={styles.rightGroup}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={onPressNotifications}
            activeOpacity={0.7}
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={22} color="#111827" />
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
            {userAvatar && !imageError ? (
              <Image
                source={{ uri: userAvatar }}
                key={userAvatar}
                style={styles.avatarImage}
                resizeMode="cover"
                onError={() => setImageError(true)}
                onLoad={() => setImageError(false)}
              />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitial}>
                  {(userName || 'P').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={[styles.onlineDot, { backgroundColor: isOnline ? '#10B981' : '#9CA3AF' }]} />
          </TouchableOpacity>
        </View>
      </View>
    );
}

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16
  },
  leftGroup: {
    justifyContent: 'center'
  },
  brandTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5
  },
  brandHighlight: {
    color: '#06684F'
  },
  brandSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: -2
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
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
    position: 'relative',
    borderRadius: 20
  },
  avatarImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: '#E2E8F0'
  },
  avatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#C7D2FE'
  },
  avatarInitial: {
    fontSize: 15,
    fontWeight: '800',
    color: '#3730A3'
  },
  onlineDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    borderWidth: 2,
    borderColor: '#FFFFFF'
  }
});

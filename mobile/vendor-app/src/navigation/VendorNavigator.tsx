import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import VendorHomeScreen from '../screens/VendorHomeScreen';
import JobsScreen from '../screens/JobsScreen';
import VendorMessagesScreen from '../screens/VendorMessagesScreen';
import VendorProfileScreen from '../screens/VendorProfileScreen';
import EarningsScreen from '../screens/EarningsScreen';
import VendorJobDetailScreen from '../screens/VendorJobDetailScreen';
import VendorChatDetailScreen from '../screens/VendorChatDetailScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import VendorLoginScreen from '../screens/VendorLoginScreen';
import VendorRegisterScreen from '../screens/VendorRegisterScreen';
import VendorServicesScreen from '../screens/VendorServicesScreen';
import VendorNewServiceScreen from '../screens/VendorNewServiceScreen';
import { COLORS } from '../theme/colors';

export function VendorAppContainer() {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0
  );
  const bottomInset = insets.bottom;

  const [currentRoute, setCurrentRoute] = useState<string>('VendorHomeTab');
  const [routeParams, setRouteParams] = useState<any>({});
  const [history, setHistory] = useState<string[]>(['VendorHomeTab']);
  const [showActionModal, setShowActionModal] = useState<boolean>(false);

  const navigate = (screen: string, params: any = {}) => {
    setRouteParams(params);
    setHistory((prev: string[]) => [...prev, screen]);
    setCurrentRoute(screen);
  };

  const goBack = () => {
    if (history.length > 1) {
      const newHistory = [...history];
      newHistory.pop();
      const prevScreen = newHistory[newHistory.length - 1];
      setHistory(newHistory);
      setCurrentRoute(prevScreen);
    } else {
      setCurrentRoute('VendorHomeTab');
    }
  };

  const navigation = {
    navigate,
    goBack
  };

  const isTabScreen = ['VendorHomeTab', 'JobsTab', 'MessagesTab', 'ProfileTab'].includes(
    currentRoute
  );

  const renderScreen = () => {
    const route = { params: routeParams };
    switch (currentRoute) {
      case 'VendorHomeTab':
        return <VendorHomeScreen navigation={navigation} route={route} />;
      case 'JobsTab':
        return <JobsScreen navigation={navigation} route={route} />;
      case 'MessagesTab':
      case 'VendorMessages':
        return <VendorMessagesScreen navigation={navigation} route={route} />;
      case 'ProfileTab':
        return <VendorProfileScreen navigation={navigation} route={route} />;
      case 'EarningsTab':
      case 'Earnings':
        return <EarningsScreen navigation={navigation} route={route} />;
      case 'Notifications':
        return <NotificationsScreen navigation={navigation} route={route} />;
      case 'VendorJobDetail':
        return <VendorJobDetailScreen navigation={navigation} route={route} />;
      case 'ChatDetail':
        return <VendorChatDetailScreen navigation={navigation} route={route} />;
      case 'VendorServices':
        return <VendorServicesScreen navigation={navigation} route={route} />;
      case 'VendorNewService':
        return <VendorNewServiceScreen navigation={navigation} route={route} />;
      case 'VendorLogin':
        return <VendorLoginScreen navigation={navigation} route={route} />;
      case 'VendorRegister':
        return <VendorRegisterScreen navigation={navigation} route={route} />;
      default:
        return <VendorHomeScreen navigation={navigation} route={route} />;
    }
  };

  const getHeaderTitle = () => {
    switch (currentRoute) {
      case 'Notifications':
        return 'Alerts & Notifications';
      case 'VendorJobDetail':
        return 'Job Dossier';
      case 'ChatDetail':
        return 'Customer Communication';
      case 'VendorServices':
        return 'My Services';
      case 'VendorNewService':
        return 'Create Service';
      case 'EarningsTab':
      case 'Earnings':
        return 'Earnings & Payments';
      case 'VendorLogin':
        return 'Sign In to WorkLogy Pro';
      case 'VendorRegister':
        return 'Register as Professional';
      default:
        return 'WorkLogy Pro';
    }
  };

  const SCREENS_WITH_CUSTOM_HEADER = [
    'ChatDetail',
    'VendorServices',
    'VendorNewService',
    'MessagesTab',
    'VendorMessages'
  ];
  const showNavHeader = !isTabScreen && !SCREENS_WITH_CUSTOM_HEADER.includes(currentRoute);

  return (
    <View style={styles.container}>
      {/* Top Stack Navigation Header (only on non-tab screens without custom header) */}
      {showNavHeader && (
        <View style={[styles.navHeader, { paddingTop: topInset, minHeight: 52 + topInset }]}>
          <TouchableOpacity onPress={goBack} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color={COLORS.textDark} />
          </TouchableOpacity>
          <Text style={styles.navHeaderTitle}>{getHeaderTitle()}</Text>
          <View style={{ width: 36 }} />
        </View>
      )}

      {/* Main Screen Body */}
      <View style={styles.screenBody}>{renderScreen()}</View>

      {/* ── FIXED BOTTOM NAVIGATION BAR (5 ITEMS: Home, Jobs, [Center +], Messages, Profile) ── */}
      {isTabScreen && (
        <View
          style={[
            styles.bottomBarContainer,
            { paddingBottom: Math.max(bottomInset, Platform.OS === 'ios' ? 12 : 6) }
          ]}
        >
          <View style={styles.bottomBar}>
            {/* 1. Home */}
            <TouchableOpacity
              style={styles.tabBtn}
              onPress={() => navigate('VendorHomeTab')}
              activeOpacity={0.7}
            >
              <Ionicons
                name={currentRoute === 'VendorHomeTab' ? 'home' : 'home-outline'}
                size={22}
                color={currentRoute === 'VendorHomeTab' ? '#06684F' : '#9CA3AF'}
              />
              <Text
                style={[
                  styles.tabLabel,
                  currentRoute === 'VendorHomeTab' && styles.tabActiveLabel
                ]}
              >
                Home
              </Text>
            </TouchableOpacity>

            {/* 2. Jobs */}
            <TouchableOpacity
              style={styles.tabBtn}
              onPress={() => navigate('JobsTab')}
              activeOpacity={0.7}
            >
              <Ionicons
                name={currentRoute === 'JobsTab' ? 'briefcase' : 'briefcase-outline'}
                size={22}
                color={currentRoute === 'JobsTab' ? '#06684F' : '#9CA3AF'}
              />
              <Text
                style={[
                  styles.tabLabel,
                  currentRoute === 'JobsTab' && styles.tabActiveLabel
                ]}
              >
                Jobs
              </Text>
            </TouchableOpacity>

            {/* 3. CENTER PROMINENT CIRCULAR + BUTTON (Post Job / Add Service) */}
            <View style={styles.centerFabContainer}>
              <TouchableOpacity
                style={styles.centerFabBtn}
                onPress={() => setShowActionModal(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={28} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.centerFabLabel}>Post Job</Text>
            </View>

            {/* 4. Messages (Replacing Earnings) */}
            <TouchableOpacity
              style={styles.tabBtn}
              onPress={() => navigate('MessagesTab')}
              activeOpacity={0.7}
            >
              <Ionicons
                name={
                  currentRoute === 'MessagesTab' || currentRoute === 'VendorMessages'
                    ? 'chatbubbles'
                    : 'chatbubbles-outline'
                }
                size={22}
                color={
                  currentRoute === 'MessagesTab' || currentRoute === 'VendorMessages'
                    ? '#06684F'
                    : '#9CA3AF'
                }
              />
              <Text
                style={[
                  styles.tabLabel,
                  (currentRoute === 'MessagesTab' || currentRoute === 'VendorMessages') &&
                    styles.tabActiveLabel
                ]}
              >
                Messages
              </Text>
            </TouchableOpacity>

            {/* 5. Profile */}
            <TouchableOpacity
              style={styles.tabBtn}
              onPress={() => navigate('ProfileTab')}
              activeOpacity={0.7}
            >
              <Ionicons
                name={currentRoute === 'ProfileTab' ? 'person' : 'person-outline'}
                size={22}
                color={currentRoute === 'ProfileTab' ? '#06684F' : '#9CA3AF'}
              />
              <Text
                style={[
                  styles.tabLabel,
                  currentRoute === 'ProfileTab' && styles.tabActiveLabel
                ]}
              >
                Profile
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── CENTER + BUTTON ACTION MODAL ── */}
      <Modal
        visible={showActionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowActionModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowActionModal(false)}
        >
          <TouchableOpacity
            style={styles.actionSheet}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Sheet Handle */}
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Create & Publish</Text>
              <TouchableOpacity
                onPress={() => setShowActionModal(false)}
                style={styles.sheetCloseBtn}
              >
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <Text style={styles.sheetSub}>
              Publish a service offering for customer bookings, or browse available job tenders.
            </Text>

            {/* Action 1: Add a Service */}
            <TouchableOpacity
              style={styles.actionItem}
              activeOpacity={0.78}
              onPress={() => {
                setShowActionModal(false);
                navigate('VendorNewService');
              }}
            >
              <View style={[styles.actionIconBox, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="construct" size={24} color="#06684F" />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <View style={styles.actionTitleRow}>
                  <Text style={styles.actionItemTitle}>Add a Service Offering</Text>
                  <View style={styles.recommendedBadge}>
                    <Text style={styles.recommendedBadgeText}>Recommended</Text>
                  </View>
                </View>
                <Text style={styles.actionItemSub}>
                  Publish your trade (AC, Plumbing, Electrical, Carpentry) with custom pricing for customer bookings
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>

            {/* Action 2: Post Job / Subcontract Request */}
            <TouchableOpacity
              style={styles.actionItem}
              activeOpacity={0.78}
              onPress={() => {
                setShowActionModal(false);
                navigate('JobsTab');
              }}
            >
              <View style={[styles.actionIconBox, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="briefcase" size={24} color="#2563EB" />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.actionItemTitle}>Browse & Claim Available Jobs</Text>
                <Text style={styles.actionItemSub}>
                  Review customer job postings in your service areas and submit competitive quotes
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>

            {/* Action 3: Manage Existing Services */}
            <TouchableOpacity
              style={styles.actionItem}
              activeOpacity={0.78}
              onPress={() => {
                setShowActionModal(false);
                navigate('VendorServices');
              }}
            >
              <View style={[styles.actionIconBox, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="list" size={24} color="#D97706" />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.actionItemTitle}>Manage My Services</Text>
                <Text style={styles.actionItemSub}>
                  Edit pricing, pause services, or update coverage areas for active offerings
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  screenBody: {
    flex: 1
  },
  navHeader: {
    height: 52,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6'
  },
  navHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textDark
  },
  bottomBarContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 12
  },
  bottomBar: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: Platform.OS === 'ios' ? 4 : 2
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 3
  },
  tabActiveLabel: {
    color: '#06684F',
    fontWeight: '800'
  },
  centerFabContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -18
  },
  centerFabBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#06684F',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#06684F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#FFFFFF'
  },
  centerFabLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#06684F',
    marginTop: 2
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end'
  },
  actionSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 16
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 14
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827'
  },
  sheetCloseBtn: {
    padding: 6
  },
  sheetSub: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 17
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#F9FAFB',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  actionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  actionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  actionItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827'
  },
  recommendedBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0'
  },
  recommendedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#06684F'
  },
  actionItemSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    lineHeight: 15
  }
});

export default VendorAppContainer;

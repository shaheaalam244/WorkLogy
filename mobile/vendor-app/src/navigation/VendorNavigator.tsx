import React, { useState, useEffect, useRef, useCallback, useMemo, createContext, useContext } from 'react';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
  Modal,
  BackHandler,
  ToastAndroid
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
import VendorDomainsScreen from '../screens/VendorDomainsScreen';
import VendorNewServiceScreen from '../screens/VendorNewServiceScreen';
import VendorEditProfileScreen from '../screens/VendorEditProfileScreen';
import VendorKycScreen from '../screens/VendorKycScreen';
import VendorReviewsScreen from '../screens/VendorReviewsScreen';
import VendorScheduleScreen from '../screens/VendorScheduleScreen';
import VendorServiceAreaScreen from '../screens/VendorServiceAreaScreen';
import VendorHelpSupportScreen from '../screens/VendorHelpSupportScreen';
import VendorSettingsScreen from '../screens/VendorSettingsScreen';
import VendorOtpVerificationScreen from '../screens/VendorOtpVerificationScreen';
import VendorOnboardingProfileScreen from '../screens/VendorOnboardingProfileScreen';
import VendorOnboardingDomainsScreen from '../screens/VendorOnboardingDomainsScreen';
import VendorOnboardingServiceScreen from '../screens/VendorOnboardingServiceScreen';
import { WorklogySplashScreen } from '../components/WorklogySplashScreen';
import { COLORS } from '../theme/colors';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { socketService } from '../services/socketService';
import { SOCKET_EVENTS } from '../constants';
import type { RouteEntry, AppNavigation } from '../types';
import { NavigationContext, useNavigation } from '../context/NavigationContext';
import { pushNotificationService } from '../services/pushNotificationService';

export { NavigationContext, useNavigation };

const TAB_ROUTES = ['VendorHomeTab', 'JobsTab', 'MessagesTab', 'ProfileTab'];
const SCREENS_WITH_CUSTOM_HEADER = [
  'ChatDetail',
  'VendorServices',
  'VendorDomains',
  'VendorNewService',
  'MessagesTab',
  'VendorMessages',
  'VendorEditProfile',
  'VendorKyc',
  'VendorReviews',
  'VendorSchedule',
  'VendorServiceArea',
  'VendorHelpSupport',
  'VendorSettings',
  'Earnings',
  'EarningsTab',
  'VendorLogin',
  'VendorRegister',
  'VendorOtpVerification',
  'VendorOnboardingProfile',
  'VendorOnboardingDomains',
  'VendorOnboardingService'
];

const AUTH_AND_ONBOARDING_ROUTES = [
  'VendorLogin',
  'VendorRegister',
  'VendorOtpVerification',
  'VendorOnboardingProfile',
  'VendorOnboardingDomains',
  'VendorOnboardingService'
];

let hasVendorSplashCompletedOnce = false;

export function VendorAppContainer() {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0
  );
  const bottomInset = insets.bottom;

  const { user, isLoading } = useAuth();
  const [history, setHistory] = useState<RouteEntry[]>(() => {
    return [{ name: user ? 'VendorHomeTab' : 'VendorLogin', params: {} }];
  });
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0);
  const [showActionModal, setShowActionModal] = useState<boolean>(false);
  const [splashFinished, setSplashFinished] = useState<boolean>(hasVendorSplashCompletedOnce);

  const historyRef = useRef<RouteEntry[]>(history);
  historyRef.current = history;

  // Sync navigation stack when authentication state is determined
  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        setHistory((prev) => {
          const current = prev[prev.length - 1]?.name;
          const isAllowedUnauth = ['VendorLogin', 'VendorRegister', 'VendorOtpVerification'].includes(current);
          if (!isAllowedUnauth) {
            const next = [{ name: 'VendorLogin', params: {} }];
            historyRef.current = next;
            return next;
          }
          return prev;
        });
      } else {
        setHistory((prev) => {
          const current = prev[prev.length - 1]?.name;
          if (current === 'VendorLogin' || current === 'VendorRegister') {
            const next = [{ name: 'VendorHomeTab', params: {} }];
            historyRef.current = next;
            return next;
          }
          return prev;
        });
      }
    }
  }, [user, isLoading]);

  const backHandlersRef = useRef<Array<() => boolean>>([]);
  const lastBackPressRef = useRef<number>(0);

  const currentEntry = history[history.length - 1] || { name: user ? 'VendorHomeTab' : 'VendorLogin', params: {} };
  const currentRoute = currentEntry.name;
  const routeParams = currentEntry.params || {};

  const fetchUnread = useCallback(async () => {
    if (!user?._id) return;
    try {
      const res = await api.chat.getUnreadCount();
      const count =
        typeof res?.unreadCount === 'number'
          ? res.unreadCount
          : typeof (res as any)?.count === 'number'
          ? (res as any).count
          : 0;
      setUnreadMessagesCount(count);
    } catch {
      // background poll silently ignored
    }
  }, [user?._id]);

  useEffect(() => {
    if (!user?._id) {
      setUnreadMessagesCount(0);
      return;
    }

    fetchUnread();
    const interval = setInterval(fetchUnread, 20000);

    let socket: any = null;
    const connectSocket = async () => {
      try {
        if (user?._id) {
          socket = await socketService.connect(user._id);
          socket.on(SOCKET_EVENTS.RECEIVE_MESSAGE, fetchUnread);
          socket.on(SOCKET_EVENTS.MESSAGES_READ, fetchUnread);

          // Real-time Chat message notification: show Android phone banner & play sound
          socket.on(SOCKET_EVENTS.NEW_MESSAGE_NOTIFICATION, (data: any) => {
            fetchUnread();
            if (data?.senderName) {
              pushNotificationService.presentLocalNotification({
                title: 'New message',
                body: `${data.senderName}: ${data.message?.text || 'Sent you a message'}`,
                data: {
                  type: 'message',
                  conversationId: data.conversationId
                },
                channelId: 'messages'
              });
            }
          });

          // Real-time Emergency / Instant Lead broadcast: show Android phone banner & sound
          socket.on(SOCKET_EVENTS.EMERGENCY_BROADCAST, (lead: any) => {
            if (lead?.title) {
              pushNotificationService.presentLocalNotification({
                title: '🚨 Emergency Job Available',
                body: `${lead.title} in ${lead.location?.locality || 'your area'}`,
                data: {
                  type: 'job',
                  jobId: lead.jobId || lead._id
                },
                channelId: 'job-requests'
              });
            }
          });

          // Real-time In-App Notification: show Android phone banner & sound
          socket.on(SOCKET_EVENTS.NEW_NOTIFICATION, (payload: any) => {
            fetchUnread();
            const notif = payload?.notification;
            if (notif?.title && notif?.type !== 'message') {
              let channelId: 'messages' | 'job-requests' | 'bookings' | 'general' = 'general';
              if (notif.type === 'job_alert') channelId = 'job-requests';
              else if (['booking_confirmed', 'status_change', 'cancellation'].includes(notif.type)) channelId = 'bookings';

              pushNotificationService.presentLocalNotification({
                title: notif.title,
                body: notif.message || '',
                data: {
                  type: notif.type,
                  notificationId: notif._id,
                  ...(notif.relatedResource ? { resourceId: notif.relatedResource.resourceId } : {})
                },
                channelId
              });
            }
          });
        }
      } catch (e) {}
    };
    connectSocket();

    return () => {
      clearInterval(interval);
      if (socket) {
        socket.off(SOCKET_EVENTS.RECEIVE_MESSAGE, fetchUnread);
        socket.off(SOCKET_EVENTS.NEW_MESSAGE_NOTIFICATION);
        socket.off(SOCKET_EVENTS.MESSAGES_READ, fetchUnread);
        socket.off(SOCKET_EVENTS.EMERGENCY_BROADCAST);
        socket.off(SOCKET_EVENTS.NEW_NOTIFICATION);
      }
    };
  }, [user?._id, fetchUnread]);

  useEffect(() => {
    fetchUnread();
  }, [currentRoute, fetchUnread]);

  const registerBackHandler = useCallback((handler: () => boolean) => {
    backHandlersRef.current.push(handler);
    return () => {
      backHandlersRef.current = backHandlersRef.current.filter((h) => h !== handler);
    };
  }, []);

  const handleBack = useCallback((force: boolean = false): boolean => {
    // 0. If Action Modal is open, dismiss it
    if (showActionModal) {
      setShowActionModal(false);
      return true;
    }

    // 1. Check screen/modal registered handlers (topmost first)
    if (!force && backHandlersRef.current.length > 0) {
      for (let i = backHandlersRef.current.length - 1; i >= 0; i--) {
        const handler = backHandlersRef.current[i];
        if (handler && handler()) {
          return true; // Handled by custom handler (e.g. discard form dialog or dismiss modal)
        }
      }
    }

    // 2. If stack has more than 1 entry, pop to previous screen with its params
    if (historyRef.current.length > 1) {
      lastBackPressRef.current = 0;
      setHistory((prev) => {
        if (prev.length <= 1) return prev;
        const copy = [...prev];
        copy.pop();
        historyRef.current = copy;
        return copy;
      });
      return true;
    }

    // 3. Fallback for single-entry non-Home routes (e.g. secondary tab)
    const activeRouteName = historyRef.current[0]?.name;
    if (activeRouteName && activeRouteName !== 'VendorHomeTab') {
      lastBackPressRef.current = 0;
      const reset = [{ name: 'VendorHomeTab', params: {} }];
      historyRef.current = reset;
      setHistory(reset);
      return true;
    }

    // 4. On root Home screen: double-press within 2s to exit on Android
    const now = Date.now();
    if (now - lastBackPressRef.current < 2000) {
      BackHandler.exitApp();
      return true;
    }

    lastBackPressRef.current = now;
    if (Platform.OS === 'android') {
      ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
    }
    return true;
  }, [showActionModal]);

  // Hardware Back Button listener
  useEffect(() => {
    const onHardwareBack = () => {
      return handleBack();
    };

    const backHandlerSubscription = BackHandler.addEventListener(
      'hardwareBackPress',
      onHardwareBack
    );

    return () => {
      backHandlerSubscription?.remove();
    };
  }, [handleBack]);

  const navigate = useCallback((screen: string, params: any = {}) => {
    lastBackPressRef.current = 0;
    if (TAB_ROUTES.includes(screen)) {
      if (screen === 'VendorHomeTab') {
        const reset = [{ name: 'VendorHomeTab', params }];
        historyRef.current = reset;
        setHistory(reset);
      } else {
        const next = [
          { name: 'VendorHomeTab', params: {} },
          { name: screen, params }
        ];
        historyRef.current = next;
        setHistory(next);
      }
    } else {
      setHistory((prev) => {
        const next = [...prev, { name: screen, params }];
        historyRef.current = next;
        return next;
      });
    }
  }, []);

  const goBack = useCallback((force: boolean = false) => {
    handleBack(force);
  }, [handleBack]);

  const canGoBack = useCallback(() => {
    return historyRef.current.length > 1 || historyRef.current[0]?.name !== 'VendorHomeTab';
  }, []);

  const replace = useCallback((screen: string, params: any = {}) => {
    lastBackPressRef.current = 0;
    setHistory((prev) => {
      const copy = [...prev];
      if (copy.length > 0) {
        copy[copy.length - 1] = { name: screen, params };
        historyRef.current = copy;
        return copy;
      }
      const next = [{ name: screen, params }];
      historyRef.current = next;
      return next;
    });
  }, []);

  const resetTo = useCallback((screen: string, params: any = {}) => {
    lastBackPressRef.current = 0;
    const reset = [{ name: screen, params }];
    historyRef.current = reset;
    setHistory(reset);
  }, []);

  const navigation: AppNavigation = useMemo(
    () => ({
      navigate,
      goBack,
      canGoBack,
      replace,
      resetTo,
      registerBackHandler,
      currentRoute,
      routeParams
    }),
    [navigate, goBack, canGoBack, replace, resetTo, registerBackHandler, currentRoute, routeParams]
  );

  const navigationRef = useRef<AppNavigation>(navigation);
  navigationRef.current = navigation;

  useEffect(() => {
    // Provide a stable delegation wrapper so notification taps route correctly
    pushNotificationService.initialize({
      navigate: (screen: string, params?: any) => navigationRef.current.navigate(screen, params),
      goBack: (force?: boolean) => navigationRef.current.goBack(force),
      canGoBack: () => navigationRef.current.canGoBack(),
      replace: (screen: string, params?: any) => navigationRef.current.replace(screen, params),
      resetTo: (screen: string, params?: any) => navigationRef.current.resetTo(screen, params),
      registerBackHandler: (handler: () => boolean) => navigationRef.current.registerBackHandler(handler),
      get currentRoute() {
        return navigationRef.current.currentRoute;
      },
      get routeParams() {
        return navigationRef.current.routeParams;
      }
    } as AppNavigation);

    if (user?._id) {
      pushNotificationService.registerForPushNotifications().catch(() => {});
    }
  }, [user?._id]);

  const isTabScreen = TAB_ROUTES.includes(currentRoute);
  const showNavHeader = !isTabScreen && !SCREENS_WITH_CUSTOM_HEADER.includes(currentRoute);

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
      case 'VendorDomains':
        return <VendorDomainsScreen navigation={navigation} route={route} />;
      case 'VendorNewService':
        return <VendorNewServiceScreen navigation={navigation} route={route} />;
      case 'VendorEditProfile':
        return <VendorEditProfileScreen navigation={navigation} route={route} />;
      case 'VendorKyc':
        return <VendorKycScreen navigation={navigation} route={route} />;
      case 'VendorReviews':
        return <VendorReviewsScreen navigation={navigation} route={route} />;
      case 'VendorSchedule':
        return <VendorScheduleScreen navigation={navigation} route={route} />;
      case 'VendorServiceArea':
        return <VendorServiceAreaScreen navigation={navigation} route={route} />;
      case 'VendorHelpSupport':
        return <VendorHelpSupportScreen navigation={navigation} route={route} />;
      case 'VendorSettings':
        return <VendorSettingsScreen navigation={navigation} route={route} />;
      case 'VendorLogin':
        return <VendorLoginScreen navigation={navigation} route={route} />;
      case 'VendorRegister':
        return <VendorRegisterScreen navigation={navigation} route={route} />;
      case 'VendorOtpVerification':
        return <VendorOtpVerificationScreen navigation={navigation} route={route} />;
      case 'VendorOnboardingProfile':
        return <VendorOnboardingProfileScreen navigation={navigation} route={route} />;
      case 'VendorOnboardingDomains':
        return <VendorOnboardingDomainsScreen navigation={navigation} route={route} />;
      case 'VendorOnboardingService':
        return <VendorOnboardingServiceScreen navigation={navigation} route={route} />;
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
      case 'VendorDomains':
        return 'My Domains';
      case 'VendorNewService':
        return 'Create Service Offering';
      case 'EarningsTab':
      case 'Earnings':
        return 'Earnings & Payments';
      case 'VendorLogin':
        return 'Sign In to WorkLogy';
      case 'VendorRegister':
        return 'Register as Professional';
      default:
        return 'WorkLogy';
    }
  };

  return (
    <NavigationContext.Provider value={navigation}>
      <View style={styles.container}>
        {/* Top Stack Navigation Header (only on non-tab screens without custom header) */}
        {showNavHeader && splashFinished && (
          <View style={[styles.navHeader, { paddingTop: topInset, minHeight: 52 + topInset }]}>
            <TouchableOpacity onPress={() => handleBack()} style={styles.backBtn} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={20} color={COLORS.textDark} />
            </TouchableOpacity>
            <Text style={styles.navHeaderTitle}>{getHeaderTitle()}</Text>
            <View style={{ width: 36 }} />
          </View>
        )}

        {/* Main Screen Body */}
        <View style={styles.screenBody}>
          {!splashFinished && isLoading ? (
            <View style={styles.splashPlaceholder} />
          ) : (
            renderScreen()
          )}
        </View>

        {/* ── FIXED BOTTOM NAVIGATION BAR (5 ITEMS: Home, Jobs, [Post Service], Messages, Profile) ── */}
        {isTabScreen && !!user && splashFinished && (
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

              {/* 3. CENTER PROMINENT CIRCULAR + BUTTON (Post Service) */}
              <View style={styles.centerFabContainer}>
                <TouchableOpacity
                  style={styles.centerFabBtn}
                  onPress={() => setShowActionModal(true)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="add" size={28} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.centerFabLabel}>Post Service</Text>
              </View>

              {/* 4. Messages */}
              <TouchableOpacity
                style={styles.tabBtn}
                onPress={() => navigate('MessagesTab')}
                activeOpacity={0.7}
              >
                <View>
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
                  {unreadMessagesCount > 0 && (
                    <View style={styles.tabBadge}>
                      <Text style={styles.tabBadgeText}>
                        {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                      </Text>
                    </View>
                  )}
                </View>
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
                <Text style={styles.sheetTitle}>Publish Service & Offerings</Text>
                <TouchableOpacity
                  onPress={() => setShowActionModal(false)}
                  style={styles.sheetCloseBtn}
                >
                  <Ionicons name="close" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>
              <Text style={styles.sheetSub}>
                Publish a new service listing to advertise your skills to local customers, or manage your active offerings.
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
                  <Ionicons name="add-circle" size={24} color="#06684F" />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <View style={styles.actionTitleRow}>
                    <Text style={styles.actionItemTitle}>Create New Service Listing</Text>
                    <View style={styles.recommendedBadge}>
                      <Text style={styles.recommendedBadgeText}>Primary</Text>
                    </View>
                  </View>
                  <Text style={styles.actionItemSub}>
                    List your trade (AC, Plumbing, Electrical, Cleaning) with custom pricing & coverage
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </TouchableOpacity>

              {/* Action 2: Manage Existing Services */}
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
                  <Text style={styles.actionItemTitle}>Manage My Services & Pricing</Text>
                  <Text style={styles.actionItemSub}>
                    Edit existing listings, update prices, pause, or resume live service offerings
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </TouchableOpacity>

              {/* Action 3: Browse Available Jobs */}
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
                  <Text style={styles.actionItemTitle}>Browse Available Job Opportunities</Text>
                  <Text style={styles.actionItemSub}>
                    View customer job posts and submit competitive quotations in your city
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* ── AUTHORITATIVE VENDOR PROMOTIONAL SPLASH SCREEN ── */}
        {!splashFinished && (
          <WorklogySplashScreen
            isReady={!isLoading}
            onFinish={() => {
              hasVendorSplashCompletedOnce = true;
              setSplashFinished(true);
            }}
          />
        )}
      </View>
    </NavigationContext.Provider>
  );
}

const styles = StyleSheet.create({
  splashPlaceholder: {
    flex: 1,
    backgroundColor: '#01381F'
  },
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
  tabBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 9,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3
  },
  tabBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
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

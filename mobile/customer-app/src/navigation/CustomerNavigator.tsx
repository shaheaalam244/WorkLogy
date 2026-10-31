import React, { useEffect, useState, useRef, useCallback, createContext, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  BackHandler,
  ToastAndroid,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HomeScreen from '../screens/HomeScreen';
import ExploreScreen from '../screens/ExploreScreen';
import MyJobsScreen from '../screens/MyJobsScreen';
import MessagesScreen from '../screens/MessagesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import CategoryDetailScreen from '../screens/CategoryDetailScreen';
import CategoriesScreen from '../screens/CategoriesScreen';
import CreateJobScreen from '../screens/CreateJobScreen';
import EmergencyScreen from '../screens/EmergencyScreen';
import JobDetailScreen from '../screens/JobDetailScreen';
import ChatDetailScreen from '../screens/ChatDetailScreen';
import ReviewModalScreen from '../screens/ReviewModalScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import OtpVerificationScreen from '../screens/OtpVerificationScreen';
import CustomerOnboardingProfileScreen from '../screens/CustomerOnboardingProfileScreen';
import CustomerOnboardingAddressScreen from '../screens/CustomerOnboardingAddressScreen';
import ProfessionalProfileScreen from '../screens/ProfessionalProfileScreen';
import AuthGateModal from '../components/AuthGateModal';
import { WorklogySplashScreen } from '../components/WorklogySplashScreen';
import * as SplashScreen from 'expo-splash-screen';
import { COLORS } from '../theme/colors';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { socketService } from '../services/socketService';
import { dataSyncService } from '../services/dataSyncService';
import { pushNotificationService } from '../services/pushNotificationService';
import type { RouteEntry, AppNavigation } from '../types';

export const NavigationContext = createContext<AppNavigation | null>(null);

export const useNavigation = (): AppNavigation => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context as AppNavigation;
};

const TAB_ROUTES = ['HomeTab', 'SearchTab', 'ExploreTab', 'MessagesTab', 'ProfileTab'];
const SCREENS_WITH_CUSTOM_HEADER = [
  'ChatDetail',
  'JobDetail',
  'Login',
  'OtpVerification',
  'CustomerOnboardingProfile',
  'CustomerOnboardingAddress'
];

let hasCustomerSplashCompletedOnce = false;

export function CustomerAppContainer() {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0
  );
  const bottomInset = insets.bottom;

  const { user, isLoading, onboardingStep, promptAuthGate } = useAuth();
  const [history, setHistory] = useState<RouteEntry[]>([{ name: 'Login', params: {} }]);
  const [initialRouteResolved, setInitialRouteResolved] = useState<boolean>(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0);
  const [splashFinished, setSplashFinished] = useState<boolean>(hasCustomerSplashCompletedOnce);

  useEffect(() => {
    if (!isLoading && !initialRouteResolved) {
      let initialRoute = 'Login';
      if (user) {
        if (onboardingStep === 'profile_pending') {
          initialRoute = 'CustomerOnboardingProfile';
        } else if (onboardingStep === 'address_pending') {
          initialRoute = 'CustomerOnboardingAddress';
        } else {
          initialRoute = 'HomeTab';
        }
      }
      const initialHistory = [{ name: initialRoute, params: {} }];
      historyRef.current = initialHistory;
      setHistory(initialHistory);
      setInitialRouteResolved(true);
    }
  }, [isLoading, user, onboardingStep, initialRouteResolved]);

  // Handle post-login logout synchronization
  useEffect(() => {
    if (initialRouteResolved && !user) {
      const active = historyRef.current[historyRef.current.length - 1]?.name;
      if (active !== 'Login' && active !== 'OtpVerification') {
        const reset = [{ name: 'Login', params: {} }];
        historyRef.current = reset;
        setHistory(reset);
      }
    }
  }, [user, initialRouteResolved]);

  const historyRef = useRef<RouteEntry[]>(history);
  historyRef.current = history;

  const backHandlersRef = useRef<Array<() => boolean>>([]);
  const lastBackPressRef = useRef<number>(0);

  const currentEntry = history[history.length - 1] || { name: 'HomeTab', params: {} };
  const currentRoute = currentEntry.name;
  const routeParams = currentEntry.params || {};

  // Connect socket and listen for real-time notifications
  useEffect(() => {
    if (user?._id) {
      socketService.connect(user._id).catch(() => {});
    }
  }, [user?._id]);

  const fetchUnreadNotifications = async () => {
    if (!user?._id) return;
    try {
      const res = await api.notifications.getUnreadCount();
      const count = typeof res?.unreadCount === 'number' ? res.unreadCount : (typeof res?.count === 'number' ? res.count : 0);
      setUnreadNotificationsCount(count);
    } catch {
      // Ignore background error
    }
  };

  const fetchUnreadMessages = async () => {
    if (!user?._id) return;
    try {
      const res = await api.chat.getUnreadCount();
      const count = typeof res?.unreadCount === 'number' ? res.unreadCount : 0;
      setUnreadMessagesCount(count);
    } catch {
      // Ignore background error
    }
  };

  useEffect(() => {
    if (!user?._id) {
      setUnreadNotificationsCount(0);
      setUnreadMessagesCount(0);
      return;
    }

    fetchUnreadNotifications();
    fetchUnreadMessages();

    const notifInterval = setInterval(fetchUnreadNotifications, 30000);
    const msgInterval = setInterval(fetchUnreadMessages, 30000);

    const unsubNotif = dataSyncService.subscribe('NOTIFICATIONS_CHANGED', (data: any) => {
      fetchUnreadNotifications();
      if (data?.notification && data.notification.title && data.notification.message) {
        const notif = data.notification;
        const channel = notif.type === 'message'
          ? 'customer_messages'
          : (notif.type === 'payment' || notif.type === 'refund' || notif.type === 'escrow')
          ? 'customer_payments'
          : (notif.type === 'booking_confirmed' || notif.type === 'status_change' || notif.type === 'cancellation' || notif.type === 'quotation' || notif.type === 'quotation_received')
          ? 'customer_bookings'
          : 'customer_updates';

        pushNotificationService.presentLocalNotification({
          title: notif.title,
          body: notif.message,
          data: {
            type: notif.type,
            notificationId: notif._id,
            bookingId: notif.relatedResource?.resourceId,
            jobId: notif.relatedResource?.resourceId || notif.jobId,
            quotationId: notif.quotationId,
            conversationId: notif.relatedResource?.resourceId
          },
          channelId: channel as any
        }).catch(() => {});
      }
    });

    const unsubMsg = dataSyncService.subscribe('MESSAGES_CHANGED', (data: any) => {
      fetchUnreadMessages();
      const activeScreen = historyRef.current[historyRef.current.length - 1]?.name;
      if (data?.message && activeScreen !== 'ChatDetail') {
        const senderName = data.message.sender?.name || data.senderName || 'New Message';
        const text = data.message.text || data.message.content || 'You received a new message';
        pushNotificationService.presentLocalNotification({
          title: senderName,
          body: text,
          data: {
            type: 'message',
            conversationId: data.conversationId || data.message.conversationId || data.message.conversation
          },
          channelId: 'customer_messages'
        }).catch(() => {});
      }
    });

    const unsubRead = dataSyncService.subscribe('MESSAGES_READ', () => {
      fetchUnreadMessages();
    });

    return () => {
      clearInterval(notifInterval);
      clearInterval(msgInterval);
      unsubNotif();
      unsubMsg();
      unsubRead();
    };
  }, [user?._id]);

  const registerBackHandler = useCallback((handler: () => boolean) => {
    backHandlersRef.current.push(handler);
    return () => {
      backHandlersRef.current = backHandlersRef.current.filter((h) => h !== handler);
    };
  }, []);

  const handleBack = useCallback((force: boolean = false): boolean => {
    // 1. Check screen/modal registered handlers (topmost first)
    if (!force && backHandlersRef.current.length > 0) {
      for (let i = backHandlersRef.current.length - 1; i >= 0; i--) {
        const handler = backHandlersRef.current[i];
        if (handler && handler()) {
          return true; // handled by custom handler (e.g. modal dismiss or unsaved changes confirmation)
        }
      }
    }

    // 2. If stack has more than 1 entry, pop to previous screen with its params
    if (historyRef.current.length > 1) {
      lastBackPressRef.current = 0; // Reset root exit timer when leaving nested screen
      setHistory((prev) => {
        if (prev.length <= 1) return prev;
        const copy = [...prev];
        copy.pop();
        historyRef.current = copy;
        return copy;
      });
      return true;
    }

    // 3. Fallback for single-entry non-Home routes (e.g. secondary tab or deep link)
    const activeRouteName = historyRef.current[0]?.name;
    if (activeRouteName && activeRouteName !== 'HomeTab') {
      lastBackPressRef.current = 0; // Reset root exit timer
      const reset = [{ name: 'HomeTab', params: {} }];
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
  }, []);

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
    lastBackPressRef.current = 0; // Reset root exit timer on navigation
    if (TAB_ROUTES.includes(screen)) {
      if (screen === 'HomeTab') {
        const reset = [{ name: 'HomeTab', params }];
        historyRef.current = reset;
        setHistory(reset);
      } else {
        // Tab transition keeps HomeTab at root and activates tab
        const next = [
          { name: 'HomeTab', params: {} },
          { name: screen, params }
        ];
        historyRef.current = next;
        setHistory(next);
      }
    } else {
      setHistory((prev) => {
        const top = prev[prev.length - 1];
        if (top && top.name === screen) {
          try {
            if (JSON.stringify(top.params || {}) === JSON.stringify(params || {})) {
              return prev; // Ignore rapid duplicate navigation to identical screen with identical params
            }
          } catch {
            if (top.params === params) return prev;
          }
        }
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
    return historyRef.current.length > 1 || historyRef.current[0]?.name !== 'HomeTab';
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

  const navigation: AppNavigation = {
    navigate,
    goBack,
    canGoBack,
    replace,
    resetTo,
    registerBackHandler,
    currentRoute,
    routeParams
  };

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
      get currentRoute() { return navigationRef.current.currentRoute; },
      get routeParams() { return navigationRef.current.routeParams; }
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
      case 'HomeTab':
        return <HomeScreen navigation={navigation} route={route} />;
      case 'SearchTab':
      case 'ExploreTab':
        return <ExploreScreen navigation={navigation} route={route} />;
      case 'MyJobsTab':
      case 'MyJobs':
        return <MyJobsScreen navigation={navigation} route={route} />;
      case 'MessagesTab':
        return <MessagesScreen navigation={navigation} route={route} />;
      case 'ProfileTab':
        return <ProfileScreen navigation={navigation} route={route} />;
      case 'Notifications':
        return <NotificationsScreen navigation={navigation} route={route} />;
      case 'CategoryDetail':
        return <CategoryDetailScreen navigation={navigation} route={route} />;
      case 'Categories':
      case 'CategoriesTab':
        return <CategoriesScreen navigation={navigation} route={route} />;
      case 'ProfessionalProfile':
      case 'ProfessionalDetails':
      case 'ServiceDetails':
        return <ProfessionalProfileScreen navigation={navigation} route={route} />;
      case 'CreateJob':
        return <CreateJobScreen navigation={navigation} route={route} />;
      case 'Emergency':
        return <EmergencyScreen navigation={navigation} route={route} />;
      case 'JobDetail':
        return <JobDetailScreen navigation={navigation} route={route} />;
      case 'ChatDetail':
        return <ChatDetailScreen navigation={navigation} route={route} />;
      case 'ReviewModal':
        return <ReviewModalScreen navigation={navigation} route={route} />;
      case 'Login':
        return <LoginScreen navigation={navigation} route={route} />;
      case 'OtpVerification':
        return <OtpVerificationScreen navigation={navigation} route={route} />;
      case 'CustomerOnboardingProfile':
        return <CustomerOnboardingProfileScreen navigation={navigation} route={route} />;
      case 'CustomerOnboardingAddress':
        return <CustomerOnboardingAddressScreen navigation={navigation} route={route} />;
      case 'Register':
        return <RegisterScreen navigation={navigation} route={route} />;
      default:
        return <HomeScreen navigation={navigation} route={route} />;
    }
  };

  const getScreenTitle = () => {
    switch (currentRoute) {
      case 'Notifications':
        return 'Alerts & Updates';
      case 'CategoryDetail':
        return 'Category Packages';
      case 'Categories':
      case 'CategoriesTab':
        return 'Browse Categories';
      case 'ProfessionalProfile':
      case 'ProfessionalDetails':
        return 'Professional Details';
      case 'ServiceDetails':
        return 'Service Details';
      case 'CreateJob':
        return 'Request Service';
      case 'Emergency':
        return 'Emergency Dispatch';
      case 'JobDetail':
        return 'Booking Dossier';
      case 'MyJobs':
      case 'MyJobsTab':
        return 'My Service Bookings';
      case 'ChatDetail':
        return 'Technician Chat';
      case 'ReviewModal':
        return 'Rate Experience';
      case 'Login':
        return 'Welcome to WorkLogy';
      case 'OtpVerification':
        return 'Verify Mobile Number';
      case 'CustomerOnboardingProfile':
        return 'Profile Setup';
      case 'CustomerOnboardingAddress':
        return 'Service Address';
      case 'Register':
        return 'Create Account';
      default:
        return 'WorkLogy';
    }
  };

  return (
    <NavigationContext.Provider value={navigation}>
      <View style={styles.container}>
        {/* Top Back Header for Stack Screens with safe status bar positioning */}
        {showNavHeader && splashFinished && (
          <>
            <StatusBar barStyle="dark-content" />
            <View style={[styles.navHeader, { paddingTop: topInset, minHeight: 52 + topInset }]}>
              <TouchableOpacity
                onPress={() => handleBack()}
                style={styles.backBtn}
                activeOpacity={0.7}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="arrow-back" size={22} color={COLORS.primary} />
                <Text style={styles.backBtnText}>Back</Text>
              </TouchableOpacity>
              <Text style={styles.navHeaderTitle} numberOfLines={1}>{getScreenTitle()}</Text>
              <View style={{ width: 60 }} />
            </View>
          </>
        )}

        {/* Main Screen Body */}
        <View style={styles.screenBody}>
          {!splashFinished && isLoading ? (
            <View style={styles.splashPlaceholder} />
          ) : (
            renderScreen()
          )}
        </View>

        {/* Persistent Bottom Tab Bar with Reference Design & Raised Center Action */}
        {isTabScreen && splashFinished && (
          <View style={[styles.bottomBar, { paddingBottom: Math.max(bottomInset, Platform.OS === 'ios' ? 12 : 6), height: 60 + Math.max(bottomInset, Platform.OS === 'ios' ? 12 : 6) }]}>
            {/* 1. Home Tab */}
            <TouchableOpacity
              style={styles.tabBtn}
              activeOpacity={0.8}
              onPress={() => navigate('HomeTab')}
            >
              <Ionicons
                name={currentRoute === 'HomeTab' ? 'home' : 'home-outline'}
                size={22}
                color={currentRoute === 'HomeTab' ? COLORS.secondary : COLORS.textMuted}
              />
              <Text style={[styles.tabLabel, currentRoute === 'HomeTab' && styles.tabActiveLabel]}>
                Home
              </Text>
            </TouchableOpacity>

            {/* 2. Search Tab */}
            <TouchableOpacity
              style={styles.tabBtn}
              activeOpacity={0.8}
              onPress={() => navigate('SearchTab')}
            >
              <Ionicons
                name={['SearchTab', 'ExploreTab'].includes(currentRoute) ? 'search' : 'search-outline'}
                size={22}
                color={['SearchTab', 'ExploreTab'].includes(currentRoute) ? COLORS.secondary : COLORS.textMuted}
              />
              <Text style={[styles.tabLabel, ['SearchTab', 'ExploreTab'].includes(currentRoute) && styles.tabActiveLabel]}>
                Search
              </Text>
            </TouchableOpacity>

            {/* 3. Raised Center Action: Post Job */}
            <TouchableOpacity
              style={styles.postJobBtnContainer}
              activeOpacity={0.85}
              onPress={() => {
                if (!user) {
                  promptAuthGate({
                    screen: 'CreateJob',
                    message: 'Verify your mobile number to post a job or book a trusted professional.'
                  });
                } else {
                  navigate('CreateJob');
                }
              }}
            >
              <View style={styles.postJobCircle}>
                <Ionicons name="add" size={26} color="#FFFFFF" />
              </View>
              <Text style={styles.postJobLabel}>Post Job</Text>
            </TouchableOpacity>

            {/* 4. Messages Tab */}
            <TouchableOpacity
              style={styles.tabBtn}
              activeOpacity={0.8}
              onPress={() => navigate('MessagesTab')}
            >
              <View>
                <Ionicons
                  name={currentRoute === 'MessagesTab' ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'}
                  size={22}
                  color={currentRoute === 'MessagesTab' ? COLORS.secondary : COLORS.textMuted}
                />
                {unreadMessagesCount > 0 && (
                  <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>{unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.tabLabel, currentRoute === 'MessagesTab' && styles.tabActiveLabel]}>
                Messages
              </Text>
            </TouchableOpacity>

            {/* 5. Profile Tab */}
            <TouchableOpacity
              style={styles.tabBtn}
              activeOpacity={0.8}
              onPress={() => navigate('ProfileTab')}
            >
              <Ionicons
                name={currentRoute === 'ProfileTab' ? 'person' : 'person-outline'}
                size={22}
                color={currentRoute === 'ProfileTab' ? COLORS.secondary : COLORS.textMuted}
              />
              <Text style={[styles.tabLabel, currentRoute === 'ProfileTab' && styles.tabActiveLabel]}>
                Profile
              </Text>
            </TouchableOpacity>
          </View>
        )}
        {/* Global Authentication Gate Bottom Sheet Modal */}
        <AuthGateModal navigation={navigation} />

        {/* ── TWO-STAGE PRODUCTION SPLASH SCREEN ── */}
        {!splashFinished && (
          <WorklogySplashScreen
            isReady={!isLoading}
            onFinish={() => {
              hasCustomerSplashCompletedOnce = true;
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
    backgroundColor: '#E8D9CA'
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  screenBody: {
    flex: 1
  },
  navHeader: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 6,
    minHeight: 40,
    minWidth: 60
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary
  },
  navHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
    textAlign: 'center'
  },
  bottomBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6
  },
  tabBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    minWidth: 54
  },
  tabBadge: {
    position: 'absolute',
    top: -3,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 8,
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
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: 3
  },
  tabActiveLabel: {
    color: COLORS.secondary,
    fontWeight: '800'
  },
  postJobBtnContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -14,
    minWidth: 58
  },
  postJobCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 3 }
  },
  postJobLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2
  }
});

export default CustomerAppContainer;

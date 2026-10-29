import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';
import { api } from '../api/client';
import { secureStorage } from '../storage/secureStorage';
import { STORAGE_KEYS } from '../constants';
import type { AppNavigation } from '../types';

/**
 * Configure foreground notification presentation behavior:
 * Display alert banner, play sound, and badge app icon
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.HIGH
  })
});

class CustomerPushNotificationService {
  private isInitialized = false;
  private notificationListener: Notifications.Subscription | null = null;
  private responseListener: Notifications.Subscription | null = null;
  private navigation: AppNavigation | null = null;
  private activeToken: string | null = null;

  /**
   * Determine whether app is executing inside the Expo Go client app
   */
  private get isExpoGo(): boolean {
    try {
      if (typeof isRunningInExpoGo === 'function' && isRunningInExpoGo()) {
        return true;
      }
    } catch {
      // fallback
    }
    return (
      Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
      (Constants as any).appOwnership === 'expo'
    );
  }

  /**
   * Initialize notification channels and tap response listeners
   */
  async initialize(navigation: AppNavigation) {
    this.navigation = navigation;

    if (this.isInitialized) {
      return;
    }

    try {
      // 1. Setup Android Notification Channels
      await this.setupAndroidChannels();

      // 2. Set listener for incoming notifications while app is in foreground
      this.notificationListener = Notifications.addNotificationReceivedListener((notification) => {
        if (__DEV__) {
          console.log('[CustomerPush] Foreground notification received:', notification.request.content.title);
        }
      });

      // 3. Set listener for user interaction / tap on notification (foreground or background)
      this.responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
        this.handleNotificationTap(response);
      });

      // 4. Handle cold start: user launched app by tapping a notification while app was closed/terminated
      const initialResponse = await Notifications.getLastNotificationResponseAsync();
      if (initialResponse) {
        this.handleNotificationTap(initialResponse);
      }

      this.isInitialized = true;
    } catch (err: any) {
      console.warn('[CustomerPush] Initialization warning:', err.message);
    }
  }

  /**
   * Configure high-priority Android notification channels with brand styling, sound and vibration
   * Supported channels:
   * - customer_bookings
   * - customer_messages
   * - customer_payments
   * - customer_updates
   */
  private async setupAndroidChannels() {
    if (Platform.OS !== 'android') return;

    // Expo Go on Android (SDK 53+) does not register AndroidXNotificationsChannelsProvider.
    // Channel creation is active in standalone and development builds.
    if (this.isExpoGo) {
      return;
    }

    try {
      // Channel 1: Customer Bookings, Service Requests & Quotations
      await Notifications.setNotificationChannelAsync('customer_bookings', {
        name: 'Bookings & Quotes',
        description: 'Updates on your service requests, quotations, technician assignments, and status changes',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#06684F',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
        showBadge: true
      });

      // Channel 2: Customer Messages (Technician Chat)
      await Notifications.setNotificationChannelAsync('customer_messages', {
        name: 'Messages & Chat',
        description: 'Direct messages from assigned service professionals',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 200, 250],
        lightColor: '#0284C7',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
        showBadge: true
      });

      // Channel 3: Customer Payments & Escrow Protection
      await Notifications.setNotificationChannelAsync('customer_payments', {
        name: 'Payments & Escrow',
        description: 'Invoices, escrow funding confirmations, and payment receipts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 200, 200, 200],
        lightColor: '#10B981',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
        showBadge: true
      });

      // Channel 4: Customer Account & General Updates
      await Notifications.setNotificationChannelAsync('customer_updates', {
        name: 'Service Updates',
        description: 'Important announcements, offers, and account alerts',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 200, 200, 200],
        lightColor: '#6B7280',
        sound: 'default',
        showBadge: true
      });

      // Backward-compatible alias channels
      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Direct Messages',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default'
      }).catch(() => {});

      await Notifications.setNotificationChannelAsync('bookings', {
        name: 'Service Bookings',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default'
      }).catch(() => {});

      await Notifications.setNotificationChannelAsync('general', {
        name: 'General Alerts',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default'
      }).catch(() => {});
    } catch (channelErr: any) {
      if (!channelErr?.message?.includes('NotificationsChannelsProvider')) {
        console.warn('[CustomerPush] Error creating Android notification channels:', channelErr.message);
      }
    }
  }

  /**
   * Request permission, obtain push token, and register on authenticated backend
   */
  async registerForPushNotifications(): Promise<string | null> {
    try {
      // 1. Check physical device status (skip for emulators)
      if (!Device.isDevice) {
        return null;
      }

      // 2. In Expo Go on Android (SDK 53+), remote push notifications were removed by Expo.
      // Remote push tokens require an EAS Development Build (expo-dev-client) or standalone APK.
      if (Platform.OS === 'android' && this.isExpoGo) {
        return null;
      }

      // 3. Request permission (handles Android 13+ POST_NOTIFICATIONS and iOS)
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return null;
      }

      // 4. Obtain push token with resilient fallback
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        Constants?.easConfig?.projectId ??
        undefined;

      let pushToken: string | null = null;
      try {
        const tokenData = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined
        );
        pushToken = tokenData?.data || null;
      } catch {
        try {
          const deviceTokenData = await Notifications.getDevicePushTokenAsync();
          pushToken = deviceTokenData?.data || null;
        } catch {
          // Token unavailable
        }
      }

      if (!pushToken) {
        return null;
      }

      this.activeToken = pushToken;

      // 5. Collect device metadata for multi-device management
      const deviceModel = `${Device.manufacturer || ''} ${Device.modelName || ''}`.trim() || Platform.OS;
      const appVersion = Application.nativeApplicationVersion || '1.0.0';
      const deviceId = Device.osBuildId || `${Platform.OS}-${Device.osVersion}`;

      // 6. Send token securely to authenticated backend
      await api.notifications.registerPushToken({
        token: pushToken,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
        deviceId,
        deviceModel,
        appVersion
      });

      // 7. Cache token locally
      await secureStorage.setItem(STORAGE_KEYS.PUSH_TOKEN, pushToken);

      if (__DEV__) {
        console.log('[CustomerPush] Successfully registered push token:', pushToken);
      }

      return pushToken;
    } catch (err: any) {
      console.warn('[CustomerPush] Failed to register for push notifications:', err.message);
      return null;
    }
  }

  /**
   * Deregister push token from backend on logout
   */
  async deregister(): Promise<void> {
    try {
      const token = this.activeToken || (await secureStorage.getItem(STORAGE_KEYS.PUSH_TOKEN));
      if (token) {
        await api.notifications.deregisterPushToken(token).catch(() => {});
        await secureStorage.removeItem(STORAGE_KEYS.PUSH_TOKEN);
      }
      this.activeToken = null;
    } catch (err: any) {
      console.warn('[CustomerPush] Deregister token warning:', err.message);
    }
  }

  /**
   * Route customer to destination screen on notification tap
   */
  private handleNotificationTap(response: Notifications.NotificationResponse) {
    try {
      const data = response.notification.request.content.data || {};
      const title = response.notification.request.content.title || '';

      if (!this.navigation) {
        console.warn('[CustomerPush] Navigation not yet attached for notification tap.');
        return;
      }

      const notifType = data.type;
      const conversationId = data.conversationId || (notifType === 'message' && data.resourceId);
      const jobId = data.jobId || (notifType === 'job' && data.resourceId) || ((notifType === 'quotation' || notifType === 'quotation_received') && (data.jobId || data.resourceId));
      const bookingId = data.bookingId || (notifType === 'booking' && data.resourceId);

      // 0. Quotation notification -> Job / Request Details screen
      if (notifType === 'quotation' || notifType === 'quotation_received') {
        const targetJobId = data.jobId || data.resourceId;
        if (targetJobId) {
          this.navigation.navigate('JobDetail', {
            jobId: String(targetJobId),
            id: String(targetJobId),
            quotationId: data.quotationId ? String(data.quotationId) : undefined
          });
          return;
        }
      }

      // 1. Message notification -> Customer-Technician Chat
      if (conversationId) {
        this.navigation.navigate('ChatDetail', {
          conversationId: String(conversationId),
          title: title || 'Technician Chat'
        });
        return;
      }

      // 2. Booking notification -> Booking / Job Details
      if (bookingId) {
        this.navigation.navigate('JobDetail', {
          bookingId: String(bookingId),
          id: String(bookingId)
        });
        return;
      }

      // 3. Job notification -> Job / Request Details
      if (jobId) {
        this.navigation.navigate('JobDetail', {
          jobId: String(jobId),
          id: String(jobId)
        });
        return;
      }

      // 4. Default -> In-App Notifications Center
      this.navigation.navigate('Notifications');
    } catch (tapErr: any) {
      console.warn('[CustomerPush] Error handling notification tap:', tapErr.message);
    }
  }

  /**
   * Present an immediate local system notification banner with sound and vibration.
   * Fully supported on physical Android devices in both Expo Go and standalone builds!
   */
  async presentLocalNotification({
    title,
    body,
    data = {},
    channelId = 'customer_updates'
  }: {
    title: string;
    body: string;
    data?: Record<string, any>;
    channelId?: 'customer_bookings' | 'customer_messages' | 'customer_payments' | 'customer_updates' | 'messages' | 'bookings' | 'general';
  }) {
    try {
      const isAndroidExpoGo = Platform.OS === 'android' && this.isExpoGo;
      const trigger = isAndroidExpoGo ? null : (channelId ? { channelId } : null);

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default'
        },
        trigger
      });
    } catch (err: any) {
      console.warn('[CustomerPush] Local presentation warning:', err.message);
    }
  }

  /**
   * Clean up listeners when component unmounts
   */
  destroy() {
    if (this.notificationListener) {
      this.notificationListener.remove();
      this.notificationListener = null;
    }
    if (this.responseListener) {
      this.responseListener.remove();
      this.responseListener = null;
    }
    this.isInitialized = false;
  }
}

export const pushNotificationService = new CustomerPushNotificationService();
export default pushNotificationService;

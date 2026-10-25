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
 * Configure foreground notification behavior:
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

class PushNotificationService {
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
        // Foreground delivery handled by setNotificationHandler
        if (__DEV__) {
          console.log('[PushNotification] Foreground notification received:', notification.request.content.title);
        }
      });

      // 3. Set listener for user interaction / tap on notification (foreground or background)
      this.responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
        this.handleNotificationTap(response);
      });

      // 4. Handle cold start: user launched app by tapping a notification while app was terminated
      const initialResponse = await Notifications.getLastNotificationResponseAsync();
      if (initialResponse) {
        this.handleNotificationTap(initialResponse);
      }

      this.isInitialized = true;
    } catch (err: any) {
      console.warn('[PushNotification] Initialization warning:', err.message);
    }
  }

  /**
   * Configure high-priority Android notification channels with sound and vibration
   */
  private async setupAndroidChannels() {
    if (Platform.OS !== 'android') return;

    // Expo Go on Android (SDK 53+) does not register AndroidXNotificationsChannelsProvider
    // in its native ModuleRegistry. Channel creation is bypassed in Expo Go and active in standalone/dev builds.
    if (this.isExpoGo) {
      return;
    }

    try {
      // Channel A: Messages
      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Customer Messages',
        description: 'Instant notifications when customers send you messages',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#064E3B',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
        showBadge: true
      });

      // Channel B: Job Requests & Leads
      await Notifications.setNotificationChannelAsync('job-requests', {
        name: 'Job Requests & Leads',
        description: 'New service requests and instant leads matching your trade and territory',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 300, 200, 300],
        lightColor: '#0284C7',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
        showBadge: true
      });

      // Channel C: Bookings & Orders
      await Notifications.setNotificationChannelAsync('bookings', {
        name: 'Bookings & Orders',
        description: 'Booking confirmations, status changes, and arrival notifications',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#10B981',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
        showBadge: true
      });

      // Channel D: General Updates
      await Notifications.setNotificationChannelAsync('general', {
        name: 'General Updates',
        description: 'Account alerts, payouts, and service updates',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 200, 200, 200],
        lightColor: '#6B7280',
        sound: 'default',
        showBadge: true
      });
    } catch (channelErr: any) {
      // Gracefully silence known Expo Go channel provider NPE if it slips through
      if (!channelErr?.message?.includes('NotificationsChannelsProvider')) {
        console.warn('[PushNotification] Error creating Android notification channels:', channelErr.message);
      }
    }
  }

  /**
   * Request permission, obtain real push token, and register on authenticated backend
   */
  async registerForPushNotifications(): Promise<string | null> {
    try {
      // 1. Check physical device status (skip for emulators)
      if (!Device.isDevice) {
        return null;
      }

      // 2. In Expo Go on Android (SDK 53+), remote push notifications were removed by Expo.
      // Remote push tokens require an EAS Development Build (expo-dev-client) or standalone APK.
      // Real-time events are fully serviced via the active WebSocket connection.
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

      // 4. Collect device metadata for multi-device management
      const deviceModel = `${Device.manufacturer || ''} ${Device.modelName || ''}`.trim() || Platform.OS;
      const appVersion = Application.nativeApplicationVersion || '1.0.0';
      const deviceId = Device.osBuildId || `${Platform.OS}-${Device.osVersion}`;

      // 5. Send token securely to authenticated backend
      await api.notifications.registerPushToken({
        token: pushToken,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
        deviceId,
        deviceModel,
        appVersion
      });

      // 6. Cache token locally
      await secureStorage.setItem(STORAGE_KEYS.PUSH_TOKEN, pushToken);

      if (__DEV__) {
        console.log('[PushNotification] Successfully registered push token:', pushToken);
      }

      return pushToken;
    } catch (err: any) {
      console.warn('[PushNotification] Failed to register for push notifications:', err.message);
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
      console.warn('[PushNotification] Deregister token warning:', err.message);
    }
  }

  /**
   * Route user to destination screen on notification tap
   */
  private handleNotificationTap(response: Notifications.NotificationResponse) {
    try {
      const data = response.notification.request.content.data || {};
      const title = response.notification.request.content.title || '';

      if (!this.navigation) {
        console.warn('[PushNotification] Navigation not yet attached for notification tap.');
        return;
      }

      const notifType = data.type;
      const conversationId = data.conversationId || (notifType === 'message' && data.resourceId);
      const jobId = data.jobId || (notifType === 'job' && data.resourceId);
      const bookingId = data.bookingId || (notifType === 'booking' && data.resourceId);

      // 1. Message notification -> Customer Chat
      if (conversationId) {
        this.navigation.navigate('ChatDetail', {
          conversationId: String(conversationId),
          title: title || 'Customer Chat'
        });
        return;
      }

      // 2. Job notification -> Job details
      if (jobId) {
        this.navigation.navigate('VendorJobDetail', {
          jobId: String(jobId)
        });
        return;
      }

      // 3. Booking notification -> Booking details
      if (bookingId) {
        this.navigation.navigate('VendorJobDetail', {
          bookingId: String(bookingId)
        });
        return;
      }

      // 4. Default -> Notification center
      this.navigation.navigate('Notifications');
    } catch (tapErr: any) {
      console.warn('[PushNotification] Error handling notification tap:', tapErr.message);
    }
  }

  /**
   * Present an immediate local system notification banner with sound and vibration.
   * Completely supported and guaranteed to work on physical Android devices in Expo Go!
   */
  async presentLocalNotification({
    title,
    body,
    data = {},
    channelId = 'general'
  }: {
    title: string;
    body: string;
    data?: Record<string, any>;
    channelId?: 'messages' | 'job-requests' | 'bookings' | 'general';
  }) {
    try {
      // In Expo Go on Android, custom notification channels are not created, so pass trigger: null
      // to use the system default notification channel for immediate delivery.
      // In standalone / development builds, attach channelId to trigger for custom sound/vibration channel.
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
      console.warn('[PushNotification] Local presentation warning:', err.message);
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

export const pushNotificationService = new PushNotificationService();
export default pushNotificationService;

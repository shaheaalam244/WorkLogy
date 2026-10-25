import { LogBox } from 'react-native';

// Suppress known Expo Go SDK 53+ remote notification limitations in Expo Go development client
LogBox.ignoreLogs([
  '[expo-notifications]',
  'Push notifications (remote notifications) are unavailable in Expo Go on Android',
  '`expo-notifications` functionality is not fully supported in Expo Go',
  'ExpoNotificationChannelManager.setNotificationChannelAsync',
  'expo-notifications: Android Push notifications',
  'Could not obtain push token from device'
]);

// Intercept console.warn to keep terminal output clean from Expo Go SDK 53 notices
const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  const message = args.map((arg) => (typeof arg === 'string' ? arg : arg?.message || '')).join(' ');
  if (
    message.includes('[expo-notifications]') ||
    message.includes('Push notifications (remote notifications) are unavailable in Expo Go') ||
    message.includes('NotificationsChannelsProvider') ||
    message.includes('`expo-notifications` functionality is not fully supported in Expo Go') ||
    message.includes('Could not obtain push token from device')
  ) {
    return;
  }
  originalWarn(...args);
};

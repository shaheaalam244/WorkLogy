const fs = require('fs');
const path = require('path');

const targetFiles = [
  path.join(__dirname, '..', 'node_modules', 'expo-notifications', 'build', 'TopicSubscriptionModule.android.js'),
  path.join(__dirname, '..', 'node_modules', 'expo-notifications', 'src', 'TopicSubscriptionModule.android.ts')
];

const safeJsContent = `import { requireOptionalNativeModule } from 'expo-modules-core';
import fallbackModule from './TopicSubscriptionModule';

let nativeModule = null;
try {
  nativeModule = requireOptionalNativeModule('ExpoTopicSubscriptionModule');
} catch (e) {
  nativeModule = null;
}

export default nativeModule || fallbackModule;
`;

const safeTsContent = `import { requireOptionalNativeModule } from 'expo-modules-core';
import fallbackModule from './TopicSubscriptionModule';
import type { TopicSubscriptionModule } from './TopicSubscriptionModule.types';

let nativeModule: TopicSubscriptionModule | null = null;
try {
  nativeModule = requireOptionalNativeModule<TopicSubscriptionModule>('ExpoTopicSubscriptionModule');
} catch (e) {
  nativeModule = null;
}

export default nativeModule || fallbackModule;
`;

for (const file of targetFiles) {
  if (fs.existsSync(file)) {
    const isTs = file.endsWith('.ts');
    fs.writeFileSync(file, isTs ? safeTsContent : safeJsContent, 'utf8');
    console.log(`[Patch] Successfully patched ${path.basename(file)} for Expo Go compatibility`);
  }
}

// 2. Patch setNotificationChannelAsync to catch Expo Go SDK 53+ Android NullPointerException
const channelFiles = [
  path.join(__dirname, '..', 'node_modules', 'expo-notifications', 'build', 'setNotificationChannelAsync.android.js'),
  path.join(__dirname, '..', 'node_modules', 'expo-notifications', 'src', 'setNotificationChannelAsync.android.ts')
];

const safeChannelJs = `import { UnavailabilityError } from 'expo-modules-core';
import NotificationChannelManager from './NotificationChannelManager';
import { AndroidImportance } from './NotificationChannelManager.types';
export async function setNotificationChannelAsync(channelId, channel) {
    if (!NotificationChannelManager.setNotificationChannelAsync) {
        throw new UnavailabilityError('Notifications', 'setNotificationChannelAsync');
    }
    if (channel?.importance === AndroidImportance.UNSPECIFIED) {
        console.warn(\`Warning: You are setting the importance of the notification channel "\${channelId}" to "UNSPECIFIED". \` +
            \`This may lead to errors on some Android versions. \` +
            \`It's recommended to instead use AndroidImportance.DEFAULT.\`);
    }
    try {
        return await NotificationChannelManager.setNotificationChannelAsync(channelId, channel);
    } catch (e) {
        if (e && e.message && e.message.includes('NotificationsChannelsProvider')) {
            return null;
        }
        throw e;
    }
}
`;

const safeChannelTs = `import { UnavailabilityError } from 'expo-modules-core';
import NotificationChannelManager from './NotificationChannelManager';
import type {
  NotificationChannelInput,
  NotificationChannel,
} from './NotificationChannelManager.types';
import { AndroidImportance } from './NotificationChannelManager.types';

export async function setNotificationChannelAsync(
  channelId: string,
  channel: NotificationChannelInput
): Promise<NotificationChannel | null> {
  if (!NotificationChannelManager.setNotificationChannelAsync) {
    throw new UnavailabilityError('Notifications', 'setNotificationChannelAsync');
  }

  if (channel?.importance === AndroidImportance.UNSPECIFIED) {
    console.warn(
      \`Warning: You are setting the importance of the notification channel "\${channelId}" to "UNSPECIFIED". \` +
        \`This may lead to errors on some Android versions. \` +
        \`It's recommended to instead use AndroidImportance.DEFAULT.\`
    );
  }
  try {
    return await NotificationChannelManager.setNotificationChannelAsync(channelId, channel);
  } catch (e: any) {
    if (e && e.message && e.message.includes('NotificationsChannelsProvider')) {
      return null;
    }
    throw e;
  }
}
`;

for (const file of channelFiles) {
  if (fs.existsSync(file)) {
    const isTs = file.endsWith('.ts');
    fs.writeFileSync(file, isTs ? safeChannelTs : safeChannelJs, 'utf8');
    console.log(`[Patch] Successfully patched ${path.basename(file)} for Expo Go channel safety`);
  }
}

// 3. Silence generic Expo Go SDK 53 warning banner in index.js/ts
const indexFiles = [
  path.join(__dirname, '..', 'node_modules', 'expo-notifications', 'build', 'index.js'),
  path.join(__dirname, '..', 'node_modules', 'expo-notifications', 'src', 'index.ts')
];

for (const file of indexFiles) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes('console.warn(message);')) {
      content = content.replace('console.warn(message);', '// console.warn(message);');
      fs.writeFileSync(file, content, 'utf8');
      console.log(`[Patch] Silenced Expo Go warning banner in ${path.basename(file)}`);
    }
  }
}

// 4. Silence DevicePushTokenAutoRegistration.fx warning in Expo Go
const autoRegFiles = [
  path.join(__dirname, '..', 'node_modules', 'expo-notifications', 'build', 'DevicePushTokenAutoRegistration.fx.js'),
  path.join(__dirname, '..', 'node_modules', 'expo-notifications', 'src', 'DevicePushTokenAutoRegistration.fx.ts')
];

for (const file of autoRegFiles) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    const warningRegex = /console\.warn\(\s*['"]\[expo-notifications\] Push notifications \(remote notifications\) are unavailable in Expo Go[^;]*\);?/gs;
    if (warningRegex.test(content)) {
      content = content.replace(warningRegex, '// [Expo Go] Push notifications unavailable in Expo Go warning silenced');
      fs.writeFileSync(file, content, 'utf8');
      console.log(`[Patch] Silenced DevicePushTokenAutoRegistration warning in ${path.basename(file)}`);
    }
  }
}

const tsconfigFile = path.join(__dirname, '..', 'node_modules', 'expo-notifications', 'tsconfig.json');
if (fs.existsSync(tsconfigFile)) {
  fs.unlinkSync(tsconfigFile);
  console.log('[Patch] Successfully removed internal expo-notifications/tsconfig.json for clean IDE diagnostics');
}

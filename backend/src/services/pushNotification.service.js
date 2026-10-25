import User from '../models/User.js';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Validates whether a token string is a valid Expo push token format
 */
export function isExpoPushToken(token) {
  if (typeof token !== 'string') return false;
  return /^(ExponentPushToken|ExpoPushToken)\[.*\]$/.test(token.trim());
}

/**
 * Core Production-Ready Remote Push Notification Dispatcher
 * Delivers push notifications to real mobile devices via Expo Push Service.
 *
 * Handles:
 * - Recipient resolution & user preference filtering
 * - Token deduplication and validity checks
 * - Batching (up to 100 messages per HTTP call)
 * - Error isolation (never rolls back primary business transactions)
 * - Automatic deactivation of invalid/unregistered device tokens (DeviceNotRegistered)
 */
export async function sendPushNotification({
  recipientUserIds,
  title,
  body,
  data = {},
  channelId = 'general',
  priority = 'high',
  sound = 'default',
  badge = null
}) {
  if (!recipientUserIds || (Array.isArray(recipientUserIds) && recipientUserIds.length === 0)) {
    return { success: false, reason: 'no_recipients', sentCount: 0 };
  }

  const rawIds = Array.isArray(recipientUserIds) ? recipientUserIds : [recipientUserIds];
  const uniqueRecipientIds = [...new Set(rawIds.map((id) => (id?._id || id).toString()).filter(Boolean))];

  if (uniqueRecipientIds.length === 0) {
    return { success: false, reason: 'empty_recipient_list', sentCount: 0 };
  }

  try {
    // 1. Fetch recipient users and active push tokens
    const users = await User.find({
      _id: { $in: uniqueRecipientIds }
    }).select('_id name notificationPreferences pushTokens');

    if (!users || users.length === 0) {
      return { success: false, reason: 'users_not_found', sentCount: 0 };
    }

    const messages = [];
    const tokenToUserMap = new Map();

    const notifType = data?.type || 'general';

    for (const user of users) {
      const prefs = user.notificationPreferences || {};

      // Respect user notification preference toggles
      if (notifType === 'message' && prefs.pushMessages === false) continue;
      if (notifType === 'job' && prefs.pushJobLeads === false) continue;
      if (notifType === 'booking' && prefs.pushBookings === false) continue;
      if (notifType === 'status_change' && prefs.pushStatusUpdates === false) continue;
      if (notifType === 'cancellation' && prefs.pushCancellations === false) continue;

      const activeTokens = (user.pushTokens || []).filter(
        (t) => t.isActive !== false && t.token && typeof t.token === 'string'
      );

      for (const t of activeTokens) {
        const cleanToken = t.token.trim();
        // Support standard Expo Push Tokens and valid device tokens
        if (isExpoPushToken(cleanToken) || cleanToken.length >= 32) {
          messages.push({
            to: cleanToken,
            title: title || 'WorkLogy Notification',
            body: body || '',
            data: {
              ...data,
              channelId,
              timestamp: Date.now()
            },
            channelId,
            priority: priority === 'high' ? 'high' : 'default',
            sound: sound || 'default',
            badge: typeof badge === 'number' ? badge : undefined
          });

          tokenToUserMap.set(cleanToken, {
            userId: user._id.toString(),
            tokenId: t._id
          });
        }
      }
    }

    if (messages.length === 0) {
      return { success: true, sentCount: 0, reason: 'no_active_tokens' };
    }

    // 2. Batch messages in chunks of 100 for Expo API
    const chunks = [];
    const chunkSize = 100;
    for (let i = 0; i < messages.length; i += chunkSize) {
      chunks.push(messages.slice(i, i + chunkSize));
    }

    let totalSent = 0;
    const allTickets = [];
    const tokensToDeactivate = [];

    for (const chunk of chunks) {
      try {
        const response = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(chunk)
        });

        const result = await response.json();
        const tickets = result?.data || [];
        allTickets.push(...tickets);

        // Inspect tickets for invalid devices
        tickets.forEach((ticket, idx) => {
          if (ticket.status === 'ok') {
            totalSent++;
          } else if (ticket.status === 'error') {
            const failedMessage = chunk[idx];
            console.warn(`Expo push error for token ${failedMessage?.to}:`, ticket.message, ticket.details);

            if (ticket.details?.error === 'DeviceNotRegistered' && failedMessage?.to) {
              tokensToDeactivate.push(failedMessage.to);
            }
          }
        });
      } catch (chunkErr) {
        console.warn('Expo push chunk delivery warning:', chunkErr.message);
      }
    }

    // 3. Deactivate stale tokens asynchronously
    if (tokensToDeactivate.length > 0) {
      User.updateMany(
        { 'pushTokens.token': { $in: tokensToDeactivate } },
        { $set: { 'pushTokens.$[elem].isActive': false } },
        { arrayFilters: [{ 'elem.token': { $in: tokensToDeactivate } }] }
      ).catch((deactErr) => {
        console.warn('Non-fatal: Failed to deactivate stale push tokens:', deactErr.message);
      });
    }

    return {
      success: true,
      sentCount: totalSent,
      totalAttempted: messages.length,
      tickets: allTickets
    };
  } catch (error) {
    // Non-fatal: Push delivery failure must never break core business logic
    console.warn('Push notification delivery error:', error.message);
    return { success: false, error: error.message, sentCount: 0 };
  }
}

/**
 * Register or update a device push token for an authenticated user
 */
export async function registerPushTokenForUser({
  userId,
  token,
  platform = 'android',
  deviceId = '',
  deviceModel = '',
  appVersion = '1.0.0'
}) {
  if (!userId || !token) {
    throw new Error('User ID and Push Token are required');
  }

  const cleanToken = token.trim();
  const cleanPlatform = ['android', 'ios', 'web'].includes(platform) ? platform : 'android';

  // 1. Deactivate this token from any other user accounts on this device
  await User.updateMany(
    { _id: { $ne: userId }, 'pushTokens.token': cleanToken },
    { $set: { 'pushTokens.$[elem].isActive': false } },
    { arrayFilters: [{ 'elem.token': cleanToken }] }
  ).catch(() => {});

  // 2. Register or update token on the target user
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const existingTokenIdx = (user.pushTokens || []).findIndex(
    (t) => t.token === cleanToken || (deviceId && t.deviceId === deviceId && t.platform === cleanPlatform)
  );

  if (existingTokenIdx >= 0) {
    user.pushTokens[existingTokenIdx].token = cleanToken;
    user.pushTokens[existingTokenIdx].platform = cleanPlatform;
    user.pushTokens[existingTokenIdx].deviceId = deviceId || user.pushTokens[existingTokenIdx].deviceId;
    user.pushTokens[existingTokenIdx].deviceModel = deviceModel || user.pushTokens[existingTokenIdx].deviceModel;
    user.pushTokens[existingTokenIdx].appVersion = appVersion || user.pushTokens[existingTokenIdx].appVersion;
    user.pushTokens[existingTokenIdx].isActive = true;
    user.pushTokens[existingTokenIdx].lastUsedAt = new Date();
  } else {
    if (!user.pushTokens) user.pushTokens = [];
    user.pushTokens.push({
      token: cleanToken,
      platform: cleanPlatform,
      deviceId: deviceId || '',
      deviceModel: deviceModel || '',
      appVersion: appVersion || '1.0.0',
      isActive: true,
      createdAt: new Date(),
      lastUsedAt: new Date()
    });
  }

  await user.save();

  return {
    success: true,
    message: 'Push token registered successfully',
    token: cleanToken
  };
}

/**
 * Deactivate a push token on logout
 */
export async function deregisterPushTokenForUser({ userId, token, deviceId }) {
  if (!userId) {
    throw new Error('User ID is required');
  }

  const query = { _id: userId };
  const filter = {};

  if (token) {
    filter['elem.token'] = token.trim();
  } else if (deviceId) {
    filter['elem.deviceId'] = deviceId.trim();
  }

  await User.updateOne(
    query,
    { $set: { 'pushTokens.$[elem].isActive': false } },
    { arrayFilters: [filter] }
  );

  return {
    success: true,
    message: 'Push token deactivated successfully'
  };
}

export default {
  isExpoPushToken,
  sendPushNotification,
  registerPushTokenForUser,
  deregisterPushTokenForUser
};

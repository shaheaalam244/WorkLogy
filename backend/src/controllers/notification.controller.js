import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { getIO } from '../config/socket.js';
import { createNotification } from '../services/notification.service.js';
import {
  registerPushTokenForUser,
  deregisterPushTokenForUser,
  sendPushNotification
} from '../services/pushNotification.service.js';

export const getMyNotifications = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const query = { recipient: req.user.id };

    // Support unread filter
    if (req.query.filter === 'unread' || req.query.isRead === 'false' || req.query.unreadOnly === 'true') {
      query.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .populate('sender', 'name avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments(query),
      Notification.countDocuments({ recipient: req.user.id, isRead: false })
    ]);

    res.status(200).json({ 
      success: true, 
      unreadCount, 
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      notifications 
    });
  } catch (error) {
    next(error);
  }
};

export const getUnreadCount = async (req, res, next) => {
  try {
    const unreadCount = await Notification.countDocuments({
      recipient: req.user.id,
      isRead: false
    });

    res.status(200).json({ success: true, count: unreadCount, unreadCount });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user.id
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();
    }

    const unreadCount = await Notification.countDocuments({
      recipient: req.user.id,
      isRead: false
    });

    // Notify connected socket rooms for this user
    try {
      const io = getIO();
      if (io) {
        io.to(`user_${req.user.id}`).emit('notifications_read', {
          id: req.params.id,
          unreadCount
        });
      }
    } catch (sockErr) {
      console.warn('Socket emit error on markAsRead:', sockErr.message);
    }

    res.status(200).json({ success: true, notification, unreadCount });
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    // Notify connected socket rooms for this user
    try {
      const io = getIO();
      if (io) {
        io.to(`user_${req.user.id}`).emit('notifications_read', {
          all: true,
          unreadCount: 0
        });
      }
    } catch (sockErr) {
      console.warn('Socket emit error on markAllAsRead:', sockErr.message);
    }

    res.status(200).json({ 
      success: true, 
      message: 'All notifications marked as read', 
      unreadCount: 0 
    });
  } catch (error) {
    next(error);
  }
};

export const deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user.id
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    const unreadCount = await Notification.countDocuments({
      recipient: req.user.id,
      isRead: false
    });

    try {
      const io = getIO();
      if (io) {
        io.to(`user_${req.user.id}`).emit('notifications_read', {
          deletedId: req.params.id,
          unreadCount
        });
      }
    } catch (sockErr) {
      console.warn('Socket emit error on deleteNotification:', sockErr.message);
    }

    res.status(200).json({ success: true, message: 'Notification deleted', unreadCount });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve user notification preferences
 * GET /api/notifications/preferences
 */
export const getNotificationPreferences = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('notificationPreferences');
    const preferences = user?.notificationPreferences || {
      emailQuotations: true,
      emailBookings: true,
      emailStatusUpdates: true,
      emailCancellations: true,
      emailMarketing: false
    };

    res.status(200).json({ success: true, preferences });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user notification preferences
 * PATCH /api/notifications/preferences
 */
export const updateNotificationPreferences = async (req, res, next) => {
  try {
    const {
      emailQuotations,
      emailBookings,
      emailStatusUpdates,
      emailCancellations,
      emailMarketing,
      pushMessages,
      pushJobLeads,
      pushBookings,
      pushStatusUpdates,
      pushCancellations
    } = req.body;

    const updates = {};
    if (typeof emailQuotations === 'boolean') updates['notificationPreferences.emailQuotations'] = emailQuotations;
    if (typeof emailBookings === 'boolean') updates['notificationPreferences.emailBookings'] = emailBookings;
    if (typeof emailStatusUpdates === 'boolean') updates['notificationPreferences.emailStatusUpdates'] = emailStatusUpdates;
    if (typeof emailCancellations === 'boolean') updates['notificationPreferences.emailCancellations'] = emailCancellations;
    if (typeof emailMarketing === 'boolean') updates['notificationPreferences.emailMarketing'] = emailMarketing;

    if (typeof pushMessages === 'boolean') updates['notificationPreferences.pushMessages'] = pushMessages;
    if (typeof pushJobLeads === 'boolean') updates['notificationPreferences.pushJobLeads'] = pushJobLeads;
    if (typeof pushBookings === 'boolean') updates['notificationPreferences.pushBookings'] = pushBookings;
    if (typeof pushStatusUpdates === 'boolean') updates['notificationPreferences.pushStatusUpdates'] = pushStatusUpdates;
    if (typeof pushCancellations === 'boolean') updates['notificationPreferences.pushCancellations'] = pushCancellations;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('notificationPreferences');

    res.status(200).json({
      success: true,
      message: 'Notification preferences updated successfully',
      preferences: user?.notificationPreferences
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Register or update push token for authenticated device
 * POST /api/notifications/push-token
 */
export const registerPushToken = async (req, res, next) => {
  try {
    const { token, platform, deviceId, deviceModel, appVersion } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Push token is required' });
    }

    const result = await registerPushTokenForUser({
      userId: req.user.id,
      token,
      platform,
      deviceId,
      deviceModel,
      appVersion
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Deregister push token on logout
 * DELETE /api/notifications/push-token
 */
export const deregisterPushToken = async (req, res, next) => {
  try {
    const { token, deviceId } = req.body;
    const result = await deregisterPushTokenForUser({
      userId: req.user.id,
      token,
      deviceId
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Send test push notification to authenticated user
 * POST /api/notifications/test-push
 */
export const sendTestPush = async (req, res, next) => {
  try {
    const { title, body, targetEmail, targetUserId, type } = req.body || {};
    let recipientId = req.user.id;

    if (targetUserId) {
      recipientId = targetUserId;
    } else if (targetEmail) {
      const targetUser = await User.findOne({ email: targetEmail.toLowerCase() });
      if (targetUser) {
        recipientId = targetUser._id.toString();
      }
    }

    const notifTitle = title || 'WorkLogy Alert 🔔';
    const notifMessage = body || 'WorkLogy real-time notification integration is active and working perfectly!';
    const notifType = type || 'booking_confirmed';

    const notifResult = await createNotification({
      recipientId,
      type: notifType,
      title: notifTitle,
      message: notifMessage,
      link: '/customer/bookings',
      sendPush: true
    });

    const unreadCount = await Notification.countDocuments({
      recipient: recipientId,
      isRead: false
    });

    res.status(200).json({
      success: true,
      message: 'Test notification created and dispatched!',
      notification: notifResult?.notification,
      unreadCount
    });
  } catch (error) {
    next(error);
  }
};


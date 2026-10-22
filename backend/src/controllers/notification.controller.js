import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { getIO } from '../config/socket.js';

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

    res.status(200).json({ success: true, unreadCount });
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
    const { emailQuotations, emailBookings, emailStatusUpdates, emailCancellations, emailMarketing } = req.body;

    const updates = {};
    if (typeof emailQuotations === 'boolean') updates['notificationPreferences.emailQuotations'] = emailQuotations;
    if (typeof emailBookings === 'boolean') updates['notificationPreferences.emailBookings'] = emailBookings;
    if (typeof emailStatusUpdates === 'boolean') updates['notificationPreferences.emailStatusUpdates'] = emailStatusUpdates;
    if (typeof emailCancellations === 'boolean') updates['notificationPreferences.emailCancellations'] = emailCancellations;
    if (typeof emailMarketing === 'boolean') updates['notificationPreferences.emailMarketing'] = emailMarketing;

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

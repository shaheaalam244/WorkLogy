import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    type: {
      type: String,
      enum: [
        'job_alert',
        'application_received',
        'quotation_received',
        'booking_confirmed',
        'job_assigned',
        'proposal_accepted',
        'proposal_rejected',
        'status_change',
        'cancellation',
        'message',
        'review',
        'system',
        'admin_alert'
      ],
      default: 'system'
    },
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    link: {
      type: String,
      default: ''
    },
    isRead: {
      type: Boolean,
      default: false
    },
    readAt: {
      type: Date,
      default: null
    },
    relatedResource: {
      resourceType: {
        type: String,
        enum: ['job', 'booking', 'application', 'quotation', 'user', 'conversation', 'chat']
      },
      resourceId: {
        type: mongoose.Schema.Types.ObjectId
      }
    },
    idempotencyKey: {
      type: String
    },
    emailStatus: {
      type: String,
      enum: ['none', 'queued', 'sent', 'failed', 'blocked_preferences', 'pending_smtp_credentials'],
      default: 'none'
    },
    emailError: {
      type: String,
      default: ''
    },
    deliveryAttempts: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

NotificationSchema.index({ recipient: 1, isRead: 1 });
NotificationSchema.index({ recipient: 1, createdAt: -1 });
NotificationSchema.index({ idempotencyKey: 1 }, { sparse: true });

NotificationSchema.post('save', async function (doc) {
  try {
    const { getIO } = await import('../config/socket.js');
    const io = getIO();
    if (io && doc.recipient) {
      const unreadCount = await mongoose.model('Notification').countDocuments({
        recipient: doc.recipient,
        isRead: false
      });
      io.to(`user_${doc.recipient.toString()}`).emit('new_notification', {
        notification: doc,
        unreadCount
      });
    }
  } catch (err) {
    // Non-blocking warning
    console.warn('Notification post-save socket emission error:', err.message);
  }
});

export default mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);

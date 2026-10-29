import mongoose from 'mongoose';

const SessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    role: {
      type: String,
      enum: ['vendor', 'customer', 'admin'],
      default: 'vendor'
    },
    sessionToken: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    refreshTokenHash: {
      type: String,
      required: true,
      index: true
    },
    previousRefreshTokenHash: {
      type: String,
      default: null
    },
    rotatedAt: {
      type: Date,
      default: null
    },
    deviceInfo: {
      platform: { type: String, default: 'android' },
      deviceId: { type: String, default: '' },
      deviceModel: { type: String, default: '' },
      appVersion: { type: String, default: '1.0.0' },
      ipAddress: { type: String, default: '' },
      userAgent: { type: String, default: '' }
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true
    },
    revokedAt: {
      type: Date,
      default: null
    },
    revokedReason: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// TTL index to automatically purge expired sessions after 14 days post-expiry
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 14 * 24 * 60 * 60 });

const Session = mongoose.models.Session || mongoose.model('Session', SessionSchema);

export default Session;

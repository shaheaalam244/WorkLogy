import mongoose from 'mongoose';

const OtpChallengeSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      index: true,
      trim: true
    },
    codeHash: {
      type: String,
      default: ''
    },
    provider: {
      type: String,
      enum: ['msg91', 'msg91_widget', 'fast2sms', 'twilio', 'mock', 'local'],
      default: 'local'
    },
    reqId: {
      type: String,
      default: ''
    },
    purpose: {
      type: String,
      enum: ['vendor_login', 'vendor_register', 'customer_login', 'customer_register', 'phone_verification', 'password_reset'],
      default: 'vendor_login',
      index: true
    },
    attempts: {
      type: Number,
      default: 0
    },
    maxAttempts: {
      type: Number,
      default: 5
    },
    isConsumed: {
      type: Boolean,
      default: false,
      index: true
    },
    consumedAt: {
      type: Date,
      default: null
    },
    expiresAt: {
      type: Date,
      required: true
    },
    ipAddress: {
      type: String,
      default: ''
    },
    deliveryStatus: {
      type: String,
      enum: ['REQUEST_ACCEPTED', 'DELIVERY_PENDING', 'DELIVERED', 'DELIVERY_FAILED', 'REJECTED', 'PROVIDER_ERROR'],
      default: 'REQUEST_ACCEPTED',
      index: true
    },
    deliveryDetails: {
      status: { type: String, default: '' },
      pauseReason: { type: String, default: '' },
      failureReason: { type: String, default: '' },
      dltTeId: { type: String, default: '' },
      senderId: { type: String, default: '' },
      deliveredAt: { type: Date, default: null },
      updatedAt: { type: Date, default: null }
    }
  },
  {
    timestamps: true
  }
);

// TTL index to automatically purge expired OTP records after 1 hour
OtpChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });
// Compound index for querying active challenges
OtpChallengeSchema.index({ phone: 1, purpose: 1, isConsumed: 1, createdAt: -1 });

const OtpChallenge = mongoose.models.OtpChallenge || mongoose.model('OtpChallenge', OtpChallengeSchema);

export default OtpChallenge;

import mongoose from 'mongoose';

const AccountDeletionRequestSchema = new mongoose.Schema(
  {
    referenceId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    role: {
      type: String,
      enum: ['customer', 'vendor'],
      required: true
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: ''
    },
    reason: {
      type: String,
      trim: true,
      default: 'No reason provided'
    },
    status: {
      type: String,
      enum: ['request_received', 'under_review', 'processing', 'completed', 'rejected'],
      default: 'request_received',
      index: true
    },
    statusHistory: [
      {
        status: { type: String, required: true },
        notes: { type: String, default: '' },
        timestamp: { type: Date, default: Date.now }
      }
    ],
    scheduledDeletionDate: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30-day statutory grace period
    },
    completedAt: {
      type: Date
    },
    rejectionReason: {
      type: String,
      default: ''
    },
    ipAddress: {
      type: String,
      default: ''
    },
    userAgent: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

AccountDeletionRequestSchema.index({ phone: 1, role: 1, status: 1 });

export default mongoose.models.AccountDeletionRequest ||
  mongoose.model('AccountDeletionRequest', AccountDeletionRequestSchema);

import mongoose from 'mongoose';

const PlatformSettingsSchema = new mongoose.Schema(
  {
    platformName: {
      type: String,
      default: 'WorkLogy'
    },
    supportEmail: {
      type: String,
      default: 'support@worklogy.in'
    },
    supportPhone: {
      type: String,
      default: '+91 522 400 8900'
    },
    operatingCity: {
      type: String,
      default: 'Lucknow'
    },
    commissionRate: {
      type: Number,
      default: 5 // 5% platform fee
    },
    emergencyDispatch: {
      defaultRadiusKm: { type: Number, default: 15 },
      responseTimeoutMins: { type: Number, default: 30 },
      defaultCallOutFee: { type: Number, default: 499 },
      enabled: { type: Boolean, default: true }
    },
    approvalRules: {
      requireAdminApproval: { type: Boolean, default: true },
      requireDocuments: { type: Boolean, default: true },
      autoApproveVerified: { type: Boolean, default: false }
    },
    cancellationRules: {
      freeCancellationMins: { type: Number, default: 15 },
      cancellationPenaltyPercent: { type: Number, default: 10 }
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

export default mongoose.models.PlatformSettings || mongoose.model('PlatformSettings', PlatformSettingsSchema);

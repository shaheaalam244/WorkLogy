import mongoose from 'mongoose';

const ReportSchema = new mongoose.Schema(
  {
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    targetType: {
      type: String,
      enum: ['job', 'vendor', 'customer', 'service', 'review'],
      required: true,
      index: true
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true
    },
    targetSnapshot: {
      title: { type: String, default: '' },
      name: { type: String, default: '' },
      reference: { type: String, default: '' }
    },
    reason: {
      type: String,
      enum: [
        'spam_fake',
        'suspected_fraud',
        'misleading_info',
        'harassment_abuse',
        'suspicious_payment',
        'repeated_cancellations',
        'other'
      ],
      required: true,
      index: true
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: 2000
    },
    evidence: [{ type: String }],
    status: {
      type: String,
      enum: ['new', 'under_review', 'resolved', 'dismissed'],
      default: 'new',
      index: true
    },
    resolution: {
      outcome: { type: String, default: '' },
      notes: { type: String, default: '' },
      resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      resolvedAt: { type: Date }
    }
  },
  { timestamps: true }
);

ReportSchema.index({ targetType: 1, targetId: 1 });
ReportSchema.index({ reportedBy: 1, targetType: 1, targetId: 1, createdAt: -1 });

export default mongoose.models.Report || mongoose.model('Report', ReportSchema);

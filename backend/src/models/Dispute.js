import mongoose from 'mongoose';

const DisputeSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: false,
      index: true
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: false,
      index: true
    },
    raisedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    against: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    disputeCategory: {
      type: String,
      enum: [
        'service_not_delivered',
        'incomplete_unsatisfactory',
        'unexpected_cancellation',
        'pricing_disagreement',
        'suspected_fraud',
        'other'
      ],
      default: 'other',
      index: true
    },
    reason: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000
    },
    evidence: [{ type: String }],
    status: {
      type: String,
      enum: [
        'open',
        'under_review',
        'investigating',
        'awaiting_information',
        'resolved',
        'closed',
        'rejected'
      ],
      default: 'open',
      index: true
    },
    resolution: {
      outcome: { type: String, default: '' },
      notes: { type: String, default: '' },
      resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      resolvedAt: { type: Date },
      bookingAction: {
        type: String,
        enum: ['none', 'refund_processed', 'escrow_released', 'booking_cancelled'],
        default: 'none'
      }
    }
  },
  { timestamps: true }
);

DisputeSchema.index({ booking: 1, raisedBy: 1 });
DisputeSchema.index({ status: 1, createdAt: -1 });

export default mongoose.models.Dispute || mongoose.model('Dispute', DisputeSchema);

import mongoose from 'mongoose';

const ReviewSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: false,
      index: true
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: false
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer rating'
      }
    },
    comment: {
      type: String,
      default: '',
      trim: true,
      maxlength: 1500
    },
    moderationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'hidden'],
      default: 'approved',
      index: true
    },
    isPublic: {
      type: Boolean,
      default: true,
      index: true
    },
    isReported: {
      type: Boolean,
      default: false,
      index: true
    },
    reportReason: {
      type: String,
      default: ''
    },
    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    moderatedAt: {
      type: Date
    },
    moderationReason: {
      type: String,
      default: ''
    },
    response: {
      text: { type: String, default: '', trim: true, maxlength: 1000 },
      respondedAt: { type: Date }
    }
  },
  { timestamps: true }
);

// Enforce at most ONE review per completed booking at database level
// Sparse index ensures legacy reviews without a booking reference do not collide
ReviewSchema.index({ booking: 1 }, { unique: true, sparse: true });

// Compound index for fast aggregation of public approved reviews
ReviewSchema.index({ vendor: 1, moderationStatus: 1, isPublic: 1 });

export default mongoose.models.Review || mongoose.model('Review', ReviewSchema);

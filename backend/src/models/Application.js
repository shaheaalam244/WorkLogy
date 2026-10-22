import mongoose from 'mongoose';

const ApplicationSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    proposedAmount: {
      type: Number,
      required: true
    },
    pricingBasis: {
      type: String,
      enum: ['fixed', 'hourly', 'estimate'],
      default: 'fixed'
    },
    proposedSchedule: {
      type: String,
      default: 'Tomorrow 10:00 AM'
    },
    coverLetter: {
      type: String,
      required: true
    },
    estimatedDuration: {
      type: String,
      default: '1-2 days'
    },
    includedServices: {
      type: String,
      default: 'Diagnostic inspection, labor, standard testing & certification'
    },
    materialCharges: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['submitted', 'shortlisted', 'accepted', 'rejected', 'withdrawn'],
      default: 'submitted'
    }
  },
  { timestamps: true }
);

ApplicationSchema.index({ job: 1, vendor: 1 }, { unique: true });

export default mongoose.models.Application || mongoose.model('Application', ApplicationSchema);

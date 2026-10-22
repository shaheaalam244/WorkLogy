import mongoose from 'mongoose';

const JobRequestSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceCategory'
    },
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    proposedDate: {
      type: Date,
      default: Date.now
    },
    budget: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'cancelled'],
      default: 'pending'
    },
    notes: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

export default mongoose.models.JobRequest || mongoose.model('JobRequest', JobRequestSchema);

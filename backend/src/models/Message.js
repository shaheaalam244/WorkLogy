import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      required: true
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'system', 'job_update', 'quotation'],
      default: 'text'
    },
    quotationData: {
      quotationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application' },
      jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
      jobTitle: { type: String },
      proposedAmount: { type: Number },
      proposedSchedule: { type: String },
      estimatedDuration: { type: String },
      coverLetter: { type: String },
      status: { type: String, default: 'submitted' }
    },
    attachments: [
      {
        url: { type: String },
        fileType: { type: String },
        name: { type: String }
      }
    ],
    clientTempId: {
      type: String,
      index: true
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true
    },
    readAt: {
      type: Date
    }
  },
  { timestamps: true }
);

MessageSchema.index({ conversation: 1, createdAt: 1 });
MessageSchema.index({ conversation: 1, recipient: 1, isRead: 1 });
MessageSchema.index(
  { conversation: 1, sender: 1, clientTempId: 1 },
  { unique: true, partialFilterExpression: { clientTempId: { $type: 'string' } } }
);

export default mongoose.models.Message || mongoose.model('Message', MessageSchema);

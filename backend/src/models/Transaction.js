import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking'
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    jobTitle: {
      type: String,
      default: 'Service Contract'
    },
    grossAmount: {
      type: Number,
      required: true
    },
    platformFee: {
      type: Number,
      default: 0
    },
    netAmount: {
      type: Number,
      required: true
    },
    type: {
      type: String,
      enum: ['escrow_hold', 'escrow_release', 'direct_payment', 'refund', 'payout'],
      default: 'escrow_hold'
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'held_in_escrow', 'paid_to_bank', 'refunded'],
      default: 'held_in_escrow'
    },
    settlementStatus: {
      type: String,
      enum: ['pending', 'processing', 'settled', 'failed'],
      default: 'pending'
    },
    payoutBank: {
      bankName: { type: String, default: 'HDFC Bank' },
      accountNumberLast4: { type: String, default: '4812' },
      ifsc: { type: String, default: 'HDFC0001024' },
      settledDate: { type: Date }
    },
    date: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

export default mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);

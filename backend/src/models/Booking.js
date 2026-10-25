import mongoose from 'mongoose';

const BookingSchema = new mongoose.Schema(
  {
    bookingReference: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
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
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job'
    },
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceListing'
    },
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application'
    },
    serviceTitle: {
      type: String,
      required: true
    },
    category: {
      type: String,
      default: 'General'
    },
    scheduledDate: {
      type: Date,
      required: true,
      default: Date.now
    },
    timeSlot: {
      type: String,
      default: '10:00 AM - 12:00 PM'
    },
    address: {
      addressLabel: { type: String, default: 'Service Location' },
      houseNumber: { type: String, default: '' },
      street: { type: String, default: '' },
      locality: { type: String, default: '' },
      landmark: { type: String, default: '' },
      city: { type: String, default: 'Lucknow' },
      state: { type: String, default: 'Uttar Pradesh' },
      zipCode: { type: String, default: '226010' },
      country: { type: String, default: 'India' },
      coordinates: {
        lat: { type: Number, default: 0 },
        lng: { type: Number, default: 0 }
      }
    },
    bookingType: {
      type: String,
      enum: ['open_request', 'direct_professional'],
      default: 'open_request',
      index: true
    },
    serviceType: {
      type: String,
      enum: ['repair', 'installation', 'maintenance', 'inspection', 'general'],
      default: 'general'
    },
    problemDescription: {
      type: String,
      default: ''
    },
    urgency: {
      type: String,
      enum: ['low', 'medium', 'high', 'emergency'],
      default: 'medium'
    },
    attachments: [{ type: String }],
    declineReason: {
      type: String,
      default: ''
    },
    pricing: {
      amount: { type: Number, required: true },
      platformFee: { type: Number, default: 0 },
      vendorNet: { type: Number, required: true },
      isPaid: { type: Boolean, default: true },
      paymentMethod: { type: String, default: 'escrow' },
      paymentStatus: {
        type: String,
        enum: ['pending', 'escrow_locked', 'released', 'refunded'],
        default: 'escrow_locked'
      }
    },
    status: {
      type: String,
      enum: [
        'pending_acceptance',
        'declined',
        'awaiting_confirmation',
        'assigned',
        'confirmed',
        'scheduled',
        'on_the_way',
        'arrived',
        'in_progress',
        'completion_pending',
        'completed',
        'cancelled',
        'disputed'
      ],
      default: 'scheduled',
      index: true
    },
    startOtp: {
      otp: { type: String, select: false },
      codeHash: { type: String, select: false },
      customerEncryptedOtp: { type: String, select: false },
      expiresAt: { type: Date },
      attempts: { type: Number, default: 0 },
      maxAttempts: { type: Number, default: 5 },
      isConsumed: { type: Boolean, default: false },
      consumedAt: { type: Date }
    },
    arrivalEvidence: {
      verified: { type: Boolean, default: false },
      verifiedAt: { type: Date },
      vendorCoordinates: {
        lat: { type: Number, default: 0 },
        lng: { type: Number, default: 0 }
      },
      accuracyMeters: { type: Number, default: null },
      distanceMeters: { type: Number, default: null },
      expiresAt: { type: Date }
    },
    statusHistory: [
      {
        status: { type: String, required: true },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        timestamp: { type: Date, default: Date.now },
        note: { type: String, default: '' }
      }
    ],
    completionEvidence: {
      images: [{ type: String }],
      notes: { type: String, default: '' },
      completedAt: { type: Date }
    },
    notes: {
      type: String,
      default: ''
    },
    hasReview: {
      type: Boolean,
      default: false,
      index: true
    },
    review: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Review'
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

BookingSchema.virtual('totalAmount').get(function () {
  return this.pricing?.amount;
});

BookingSchema.virtual('isOtpVerified').get(function () {
  return Boolean(
    this.startOtp?.isConsumed ||
    this.arrivalEvidence?.verified ||
    ['in_progress', 'completion_pending', 'completed'].includes(this.status)
  );
});

export default mongoose.models.Booking || mongoose.model('Booking', BookingSchema);

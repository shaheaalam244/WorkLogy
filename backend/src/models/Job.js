import mongoose from 'mongoose';

const JobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide job title'],
      trim: true
    },
    description: {
      type: String,
      required: [true, 'Please provide job description']
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceCategory',
      required: true
    },
    subcategory: {
      type: String,
      default: ''
    },
    serviceType: {
      type: String,
      enum: ['repair', 'installation', 'maintenance', 'inspection', 'general'],
      default: 'repair'
    },
    accessInstructions: {
      type: String,
      default: ''
    },
    bookingType: {
      type: String,
      enum: ['open_request', 'direct_professional'],
      default: 'open_request'
    },
    serviceRequirements: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    contactPhone: {
      type: String,
      default: ''
    },
    budget: {
      type: {
        type: String,
        enum: ['fixed', 'hourly', 'quote', 'range'],
        default: 'fixed'
      },
      amount: {
        type: Number,
        default: 0
      },
      minAmount: {
        type: Number,
        default: 0
      },
      maxAmount: {
        type: Number,
        default: 0
      },
      currency: {
        type: String,
        default: 'INR'
      }
    },
    location: {
      addressLabel: { type: String, default: 'Home' },
      houseNumber: { type: String, default: '' },
      street: { type: String, default: '' },
      locality: { type: String, default: '' },
      landmark: { type: String, default: '' },
      address: { type: String, default: '' },
      city: { type: String, required: true },
      state: { type: String, default: 'Uttar Pradesh' },
      zipCode: { type: String, default: '' },
      country: { type: String, default: 'India' },
      locationSource: {
        type: String,
        enum: ['gps', 'saved_address', 'manual'],
        default: 'manual'
      },
      locationAccuracyMeters: { type: Number, default: null },
      confirmedAt: { type: Date, default: Date.now },
      coordinates: {
        lat: { type: Number, default: 0 },
        lng: { type: Number, default: 0 }
      }
    },
    urgency: {
      type: String,
      enum: ['low', 'medium', 'high', 'emergency'],
      default: 'medium'
    },
    status: {
      type: String,
      enum: ['open', 'dispatching', 'assigned', 'in_progress', 'completion_pending', 'completed', 'cancelled', 'expired'],
      default: 'open'
    },
    applicantsCount: {
      type: Number,
      default: 0
    },
    selectedVendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    assignedAt: {
      type: Date,
      default: null
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null
    },
    finalPrice: {
      amount: { type: Number, default: 0 },
      pricingType: { type: String, enum: ['fixed', 'hourly'], default: 'fixed' },
      hourlyRate: { type: Number, default: 0 },
      estimatedDuration: { type: String, default: '' },
      includedServices: { type: String, default: '' },
      materialCharges: { type: Number, default: 0 }
    },
    assignmentHistory: [
      {
        vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        assignedAt: { type: Date, default: Date.now },
        finalPrice: { type: Number },
        status: { type: String, default: 'assigned' }
      }
    ],
    images: [{ type: String }],
    deadline: { type: Date },
    scheduleType: {
      type: String,
      enum: ['flexible', 'specific'],
      default: 'flexible'
    },
    preferredDate: { type: String, default: '' },
    preferredTime: { type: String, default: 'Flexible' },
    preferredTimeSlot: { type: String, default: 'Flexible' },
    alternateDate: { type: String, default: '' },
    additionalInstructions: { type: String, default: '' },
    notifiedVendors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    declinedVendors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    dispatchExpiredAt: { type: Date, default: null },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    },
    deletedAt: {
      type: Date,
      default: null
    },
    cancellationReason: {
      type: String,
      default: ''
    },
    eventHistory: [
      {
        event: { type: String },
        timestamp: { type: Date, default: Date.now },
        note: { type: String, default: '' },
        actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
      }
    ]
  },
  { timestamps: true }
);

JobSchema.index({ status: 1, category: 1, isDeleted: 1, createdAt: -1 });
JobSchema.index({ selectedVendor: 1, status: 1, isDeleted: 1 });
JobSchema.index({ 'location.city': 1, status: 1 });

export default mongoose.models.Job || mongoose.model('Job', JobSchema);


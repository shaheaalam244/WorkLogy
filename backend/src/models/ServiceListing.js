import mongoose from 'mongoose';

const ServiceListingSchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    vendorProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VendorProfile'
    },
    title: {
      type: String,
      required: [true, 'Please provide service title'],
      trim: true
    },
    domain: {
      type: String,
      required: [true, 'Please select a primary service domain'],
      trim: true,
      index: true
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceCategory'
    },
    subcategory: {
      type: String,
      required: [true, 'Please select a valid subcategory'],
      trim: true
    },
    shortSummary: {
      type: String,
      trim: true,
      default: ''
    },
    description: {
      type: String,
      required: [true, 'Please provide detailed service description']
    },
    experienceYears: {
      type: Number,
      default: 3,
      min: 0
    },
    deliveryType: {
      type: String,
      enum: ['home_service', 'workshop', 'remote', 'onsite'],
      default: 'home_service'
    },
    languages: {
      type: [String],
      default: ['Hindi', 'English']
    },
    pricing: {
      type: {
        type: String,
        enum: ['fixed', 'starting', 'range', 'quote'],
        default: 'fixed'
      },
      amount: {
        type: Number,
        default: 0
      },
      minPrice: {
        type: Number,
        default: 0
      },
      maxPrice: {
        type: Number,
        default: 0
      },
      currency: {
        type: String,
        default: 'INR'
      },
      unit: {
        type: String,
        enum: ['per visit', 'per hour', 'per item', 'per project'],
        default: 'per visit'
      },
      visitFee: {
        type: Number,
        default: 0
      },
      materialCostIncluded: {
        type: Boolean,
        default: false
      },
      cancellationTerms: {
        type: String,
        default: 'Free cancellation up to 2 hours prior to scheduled appointment'
      }
    },
    images: {
      type: [String],
      default: []
    },
    location: {
      country: { type: String, default: 'India' },
      state: { type: String, default: 'Uttar Pradesh' },
      city: { type: String, default: 'Lucknow' },
      locality: { type: String, default: 'Gomti Nagar' },
      serviceAddress: { type: String, default: '' },
      radiusKm: { type: Number, default: 25 },
      supportedLocalities: {
        type: [String],
        default: ['Gomti Nagar', 'Hazratganj', 'Aliganj', 'Indira Nagar', 'Mahanagar']
      },
      homeVisitAvailable: { type: Boolean, default: true },
      travelCharge: { type: Number, default: 0 }
    },
    availability: {
      days: {
        type: [String],
        default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      },
      hours: {
        start: { type: String, default: '09:00' },
        end: { type: String, default: '19:00' }
      },
      emergencyAvailable: { type: Boolean, default: false },
      maxDailyBookings: { type: Number, default: 5 }
    },
    requirements: {
      toolsProvided: { type: Boolean, default: true },
      customerRequirements: { type: String, default: '' },
      safetyInstructions: { type: String, default: '' },
      warranty: { type: String, default: '30-day verified workmanship warranty' }
    },
    status: {
      type: String,
      enum: ['draft', 'pending_approval', 'published', 'rejected', 'paused', 'archived'],
      default: 'published',
      index: true
    },
    viewsCount: {
      type: Number,
      default: 0
    },
    inquiriesCount: {
      type: Number,
      default: 0
    },
    rating: {
      type: Number,
      default: 5.0,
      min: 0,
      max: 5
    },
    bookingCount: {
      type: Number,
      default: 0
    },
    isCustom: {
      type: Boolean,
      default: false
    },
    customSubcategory: {
      type: String,
      trim: true,
      default: ''
    },
    idempotencyKey: {
      type: String,
      sparse: true,
      index: true
    }
  },
  { timestamps: true }
);

ServiceListingSchema.index(
  { vendor: 1, domain: 1, subcategory: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['published', 'draft', 'pending_approval'] } }
  }
);
ServiceListingSchema.index({ vendor: 1, idempotencyKey: 1 });
ServiceListingSchema.index({ domain: 1, status: 1 });
ServiceListingSchema.index({ category: 1, status: 1 });

export default mongoose.models.ServiceListing || mongoose.model('ServiceListing', ServiceListingSchema);


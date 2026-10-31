import mongoose from 'mongoose';

const VendorProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    businessName: {
      type: String,
      required: true,
      trim: true
    },
    tagline: {
      type: String,
      default: ''
    },
    bio: {
      type: String,
      default: ''
    },
    avatar: {
      type: String,
      default: ''
    },
    onboardingStep: {
      type: String,
      enum: ['profile_pending', 'domains_pending', 'first_service_pending', 'completed'],
      default: 'profile_pending'
    },
    categories: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'ServiceCategory'
        }
      ],
      validate: [
        function (val) {
          if (!Array.isArray(val)) return true;
          const unique = new Set(val.map(id => (id ? (id._id || id).toString() : '')).filter(Boolean));
          return unique.size <= 3;
        },
        'A vendor can select a maximum of 3 distinct service domains.'
      ]
    },
    services: [
      {
        category: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'ServiceCategory'
        },
        categoryName: {
          type: String,
          default: 'General'
        },
        title: { type: String, required: true },
        description: { type: String, default: '' },
        pricingType: {
          type: String,
          enum: ['fixed', 'hourly', 'quote'],
          default: 'fixed'
        },
        price: { type: Number, default: 0 },
        duration: { type: String, default: '1 - 2 hours' },
        experienceYears: { type: Number, default: 3 },
        serviceArea: { type: String, default: 'All Localities' },
        isActive: { type: Boolean, default: true }
      }
    ],
    serviceAreas: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ServiceArea'
      }
    ],
    city: {
      type: String,
      default: 'Lucknow'
    },
    zoneId: {
      type: String,
      trim: true,
      uppercase: true,
      index: true
    },
    zoneName: {
      type: String,
      trim: true
    },
    locality: {
      type: String,
      trim: true
    },
    vendorServiceRadiusKm: {
      type: Number,
      default: 5
    },
    baseVisitCharge: {
      type: Number,
      default: 299
    },
    coordinates: {
      lat: { type: Number, default: 26.8467 },
      lng: { type: Number, default: 80.9462 }
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [80.9462, 26.8467]
      }
    },
    serviceAreaCoverage: {
      baseAddress: { type: String, default: 'Hazratganj, Lucknow' },
      pincode: { type: String, default: '226001' },
      coordinates: {
        lat: { type: Number, default: 26.8467 },
        lng: { type: Number, default: 80.9462 }
      },
      radiusKm: { type: Number, default: 15, enum: [5, 10, 15, 20, 25, 30] },
      selectedLocalityIds: [{ type: String }],
      selectedZoneIds: [{ type: String }],
      excludedLocalityIds: [{ type: String }],
      version: { type: Number, default: 1 },
      updatedAt: { type: Date, default: Date.now }
    },
    hourlyRate: {
      type: Number,
      default: 45
    },
    experienceYears: {
      type: Number,
      default: 3
    },
    rating: {
      type: Number,
      default: 5.0,
      min: 0,
      max: 5
    },
    reviewCount: {
      type: Number,
      default: 0
    },
    approvalStatus: {
      type: String,
      enum: ['pending', 'under_review', 'changes_required', 'approved', 'rejected', 'suspended'],
      default: 'pending'
    },
    rejectionReason: {
      type: String,
      default: ''
    },
    submittedForReviewAt: {
      type: Date,
      default: Date.now
    },
    approvalHistory: [
      {
        status: {
          type: String,
          enum: ['pending', 'under_review', 'changes_required', 'approved', 'rejected', 'suspended']
        },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reason: { type: String, default: '' },
        notes: { type: String, default: '' },
        timestamp: { type: Date, default: Date.now },
        reviewedAt: { type: Date, default: Date.now }
      }
    ],
    adminNotes: [
      {
        author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        note: { type: String, required: true },
        createdAt: { type: Date, default: Date.now }
      }
    ],
    skills: [{ type: String }],
    qualifications: [
      {
        title: { type: String, required: true },
        issuer: { type: String, default: '' },
        year: { type: Number }
      }
    ],
    verifiedBadge: {
      status: {
        type: String,
        enum: ['not_submitted', 'unsubmitted', 'pending', 'pending_review', 'under_review', 'verified', 'approved', 'rejected', 'changes_required', 'expired'],
        default: 'not_submitted'
      },
      verifiedAt: { type: Date },
      verificationRequestId: { type: String, default: '' },
      verificationType: {
        type: String,
        enum: ['aadhaar_masked', 'aadhaar_card', 'pan_card', 'voter_id', 'trade_license', 'government_id', 'business_registration', 'identity_and_trade'],
        default: 'aadhaar_masked'
      },
      maskedIdNumber: {
        type: String,
        default: ''
      },
      consentProvided: {
        type: Boolean,
        default: false
      },
      consentedAt: { type: Date },
      submittedAt: { type: Date },
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      reviewedAt: { type: Date },
      rejectionReason: {
        type: String,
        default: ''
      },
      resubmissionInstructions: {
        type: String,
        default: ''
      },
      documents: [
        {
          name: { type: String, required: true },
          docType: { type: String, default: 'identity' },
          url: { type: String, required: true },
          uploadedAt: { type: Date, default: Date.now },
          status: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'changes_required'],
            default: 'pending'
          },
          rejectionReason: { type: String, default: '' },
          reviewedAt: { type: Date },
          reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
          }
        }
      ]
    },
    completedJobsCount: {
      type: Number,
      default: 0
    },
    portfolio: [
      {
        title: { type: String, required: true },
        image: { type: String, required: true },
        description: { type: String, default: '' }
      }
    ],
    availability: {
      days: {
        type: [String],
        default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
      },
      hours: {
        start: { type: String, default: '08:00' },
        end: { type: String, default: '18:00' }
      },
      isAvailableNow: {
        type: Boolean,
        default: true
      }
    },
    emergencyAvailability: {
      isAvailable: {
        type: Boolean,
        default: false
      },
      categories: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'ServiceCategory'
        }
      ],
      categoryNames: [{ type: String }],
      serviceAreas: [{ type: String }],
      hours: {
        start: { type: String, default: '00:00' },
        end: { type: String, default: '23:59' },
        is24x7: { type: Boolean, default: true }
      },
      maxDistanceKm: {
        type: Number,
        default: 25
      },
      callOutFee: {
        type: Number,
        default: 250
      }
    },
    earningsTotal: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

VendorProfileSchema.virtual('serviceDomainIds')
  .get(function () {
    return this.categories;
  })
  .set(function (val) {
    this.categories = val;
  });

VendorProfileSchema.index({ location: '2dsphere' });
VendorProfileSchema.index({ zoneId: 1, approvalStatus: 1 });
VendorProfileSchema.index({ locality: 1, approvalStatus: 1 });
VendorProfileSchema.index({ categories: 1, approvalStatus: 1 });
VendorProfileSchema.index({ city: 1, approvalStatus: 1 });

export default mongoose.models.VendorProfile || mongoose.model('VendorProfile', VendorProfileSchema);

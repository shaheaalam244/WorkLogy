import mongoose from 'mongoose';

const CatalogServiceSchema = new mongoose.Schema(
  {
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceCategory',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    requiredSkills: [{ type: String }],
    allowedPricingTypes: {
      type: [String],
      enum: ['fixed', 'hourly', 'quote'],
      default: ['fixed', 'hourly', 'quote']
    },
    minPrice: {
      type: Number,
      default: 0
    },
    maxPrice: {
      type: Number,
      default: 0
    },
    supportsEmergency: {
      type: Boolean,
      default: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    verificationRequired: {
      type: Boolean,
      default: false
    },
    estimatedDuration: {
      type: String,
      default: '1 - 2 hours'
    },
    sortOrder: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

CatalogServiceSchema.index({ category: 1, name: 1 }, { unique: true });

export default mongoose.models.CatalogService || mongoose.model('CatalogService', CatalogServiceSchema);

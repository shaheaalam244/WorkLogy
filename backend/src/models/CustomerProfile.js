import mongoose from 'mongoose';

const CustomerProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    defaultAddress: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      zipCode: { type: String, default: '' },
      coordinates: {
        lat: { type: Number, default: 40.7128 },
        lng: { type: Number, default: -74.006 }
      }
    },
    addresses: [
      {
        label: { type: String, default: 'Home' },
        houseNumber: { type: String, default: '' },
        street: { type: String, required: true },
        locality: { type: String, default: '' },
        landmark: { type: String, default: '' },
        city: { type: String, required: true },
        state: { type: String, required: true },
        zipCode: { type: String, required: true },
        coordinates: {
          lat: { type: Number, default: 0 },
          lng: { type: Number, default: 0 }
        },
        isDefault: { type: Boolean, default: false }
      }
    ],
    savedVendors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VendorProfile'
      }
    ],
    totalJobsPosted: {
      type: Number,
      default: 0
    },
    onboardingStep: {
      type: String,
      enum: ['profile_pending', 'address_pending', 'completed'],
      default: 'profile_pending'
    }
  },
  { timestamps: true }
);

CustomerProfileSchema.index({ 'addresses.locality': 1 });
CustomerProfileSchema.index({ 'addresses.city': 1 });

export default mongoose.models.CustomerProfile || mongoose.model('CustomerProfile', CustomerProfileSchema);

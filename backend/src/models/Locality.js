import mongoose from 'mongoose';

const LocalitySchema = new mongoose.Schema(
  {
    localityId: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    normalizedName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true
    },
    zoneId: {
      type: String,
      required: true,
      ref: 'Zone',
      index: true
    },
    zoneName: {
      type: String,
      required: true,
      trim: true
    },
    city: {
      type: String,
      default: 'Lucknow',
      trim: true
    },
    district: {
      type: String,
      default: 'Lucknow',
      trim: true
    },
    pinCode: {
      type: String,
      trim: true,
      default: '226001'
    },
    boundary: {
      type: {
        type: String,
        enum: ['Polygon', 'MultiPolygon', 'Point']
      },
      coordinates: []
    },
    dataSource: {
      type: String,
      default: 'OpenStreetMap / LMC Administrative Data'
    },
    verifiedAt: {
      type: Date,
      default: Date.now
    },
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true }
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true
      }
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

LocalitySchema.index({ location: '2dsphere' });
LocalitySchema.index({ zoneId: 1, name: 1 });

export default mongoose.models.Locality || mongoose.model('Locality', LocalitySchema);

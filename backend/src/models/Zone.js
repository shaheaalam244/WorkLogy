import mongoose from 'mongoose';

const ZoneSchema = new mongoose.Schema(
  {
    zoneId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    zoneName: {
      type: String,
      required: true,
      trim: true
    },
    centerArea: {
      type: String,
      required: true,
      trim: true
    },
    radiusKm: {
      type: Number,
      required: true,
      default: 5
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

ZoneSchema.index({ location: '2dsphere' });

export default mongoose.models.Zone || mongoose.model('Zone', ZoneSchema);

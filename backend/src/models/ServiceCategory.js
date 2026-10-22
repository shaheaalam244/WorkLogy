import mongoose from 'mongoose';

const ServiceCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true
    },
    icon: {
      type: String,
      default: 'Wrench'
    },
    image: {
      type: String,
      default: ''
    },
    description: {
      type: String,
      default: ''
    },
    parentCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceCategory',
      default: null
    },
    subcategories: [{ type: String }],
    filterGroup: {
      type: String,
      default: 'home-maintenance'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    popular: {
      type: Boolean,
      default: false
    },
    sortOrder: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

export default mongoose.models.ServiceCategory || mongoose.model('ServiceCategory', ServiceCategorySchema);

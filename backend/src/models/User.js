import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide full name'],
      trim: true,
      maxlength: 100
    },
    email: {
      type: String,
      required: [true, 'Please provide email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/\S+@\S+\.\S+/, 'Please provide a valid email']
    },
    password: {
      type: String,
      required: [true, 'Please provide password'],
      minlength: 6,
      select: false
    },
    role: {
      type: String,
      enum: ['customer', 'vendor', 'admin'],
      default: 'customer'
    },
    phone: {
      type: String,
      default: ''
    },
    avatar: {
      type: String,
      default: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'
    },
    isEmailVerified: {
      type: Boolean,
      default: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'pending'],
      default: 'active'
    },
    suspensionReason: {
      type: String,
      default: ''
    },
    adminRole: {
      type: String,
      enum: ['super_admin', 'operations_admin', 'verification_admin', 'support_admin', 'finance_admin'],
      default: 'super_admin'
    },
    lastLogin: {
      type: Date,
      default: Date.now
    },
    notificationPreferences: {
      emailQuotations: { type: Boolean, default: true },
      emailBookings: { type: Boolean, default: true },
      emailStatusUpdates: { type: Boolean, default: true },
      emailCancellations: { type: Boolean, default: true },
      emailMarketing: { type: Boolean, default: false },
      pushMessages: { type: Boolean, default: true },
      pushJobLeads: { type: Boolean, default: true },
      pushBookings: { type: Boolean, default: true },
      pushStatusUpdates: { type: Boolean, default: true },
      pushCancellations: { type: Boolean, default: true }
    },
    pushTokens: [
      {
        token: { type: String, required: true },
        platform: { type: String, enum: ['android', 'ios', 'web'], default: 'android' },
        deviceId: { type: String, default: '' },
        deviceModel: { type: String, default: '' },
        appVersion: { type: String, default: '1.0.0' },
        isActive: { type: Boolean, default: true },
        createdAt: { type: Date, default: Date.now },
        lastUsedAt: { type: Date, default: Date.now }
      }
    ],
    resetPasswordToken: {
      type: String
    },
    resetPasswordExpire: {
      type: Date
    }
  },

  { timestamps: true }
);

UserSchema.index({ 'pushTokens.token': 1 });
UserSchema.index({ phone: 1, role: 1 });

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.models.User || mongoose.model('User', UserSchema);

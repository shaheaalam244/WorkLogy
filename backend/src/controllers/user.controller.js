import User from '../models/User.js';
import CustomerProfile from '../models/CustomerProfile.js';

export const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.status(200).json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

export const updateUserProfile = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.user.id, req.body, { new: true });
    res.status(200).json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

export const getCustomerProfile = async (req, res, next) => {
  try {
    let profile = await CustomerProfile.findOne({ user: req.user.id }).populate({
      path: 'savedVendors',
      populate: [
        { path: 'user', select: 'name avatar phone email' },
        { path: 'categories', select: 'name slug icon' }
      ]
    });
    if (!profile) {
      profile = await CustomerProfile.create({ user: req.user.id });
    }
    res.status(200).json({ success: true, profile });
  } catch (error) {
    next(error);
  }
};

export const updateCustomerProfile = async (req, res, next) => {
  try {
    const profile = await CustomerProfile.findOneAndUpdate(
      { user: req.user.id },
      req.body,
      { new: true, upsert: true }
    );
    res.status(200).json({ success: true, profile });
  } catch (error) {
    next(error);
  }
};

export const addAddress = async (req, res, next) => {
  try {
    const profile = await CustomerProfile.findOne({ user: req.user.id });
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });

    profile.addresses.push(req.body);
    await profile.save();
    res.status(200).json({ success: true, addresses: profile.addresses });
  } catch (error) {
    next(error);
  }
};

export const removeAddress = async (req, res, next) => {
  try {
    const profile = await CustomerProfile.findOne({ user: req.user.id });
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });

    profile.addresses = profile.addresses.filter(addr => addr._id.toString() !== req.params.addressId);
    await profile.save();
    res.status(200).json({ success: true, addresses: profile.addresses });
  } catch (error) {
    next(error);
  }
};

export const toggleSavedVendor = async (req, res, next) => {
  try {
    const { vendorId } = req.body;
    const profile = await CustomerProfile.findOne({ user: req.user.id });
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });

    const index = profile.savedVendors.indexOf(vendorId);
    if (index > -1) {
      profile.savedVendors.splice(index, 1);
    } else {
      profile.savedVendors.push(vendorId);
    }
    await profile.save();
    res.status(200).json({ success: true, savedVendors: profile.savedVendors });
  } catch (error) {
    next(error);
  }
};

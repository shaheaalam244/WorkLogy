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

    const addrData = { ...req.body };
    if (addrData.pincode && !addrData.zipCode) {
      addrData.zipCode = addrData.pincode;
    }
    if (addrData.coordinates) {
      const lat = Number(addrData.coordinates.lat);
      const lng = Number(addrData.coordinates.lng);
      addrData.coordinates = {
        lat: !isNaN(lat) ? lat : 0,
        lng: !isNaN(lng) ? lng : 0
      };
    }

    profile.addresses.push(addrData);
    await profile.save();
    res.status(200).json({ success: true, addresses: profile.addresses });
  } catch (error) {
    next(error);
  }
};

export const updateAddress = async (req, res, next) => {
  try {
    const profile = await CustomerProfile.findOne({ user: req.user.id });
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });

    const addr = profile.addresses.id(req.params.addressId) ||
      profile.addresses.find(a => a._id.toString() === req.params.addressId);

    if (!addr) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

    const {
      label,
      houseNumber,
      street,
      locality,
      landmark,
      city,
      state,
      zipCode,
      pincode,
      coordinates,
      isDefault
    } = req.body;

    if (label !== undefined) addr.label = label;
    if (houseNumber !== undefined) addr.houseNumber = houseNumber;
    if (street !== undefined) addr.street = street;
    if (locality !== undefined) addr.locality = locality;
    if (landmark !== undefined) addr.landmark = landmark;
    if (city !== undefined) addr.city = city;
    if (state !== undefined) addr.state = state;
    if (zipCode !== undefined || pincode !== undefined) addr.zipCode = zipCode || pincode;

    if (coordinates) {
      const lat = Number(coordinates.lat);
      const lng = Number(coordinates.lng);
      addr.coordinates = {
        lat: !isNaN(lat) ? lat : (addr.coordinates?.lat || 0),
        lng: !isNaN(lng) ? lng : (addr.coordinates?.lng || 0)
      };
    }

    if (isDefault !== undefined) {
      if (isDefault) {
        profile.addresses.forEach(a => {
          a.isDefault = a._id.toString() === addr._id.toString();
        });
      } else {
        addr.isDefault = false;
      }
    }

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

import User from '../models/User.js';
import CustomerProfile from '../models/CustomerProfile.js';

/**
 * Sanitizes user document for client responses:
 * - Hides internal system-generated placeholder emails (customer_<phone>_...@worklogy.local, temp_...)
 * - Clears placeholder names ('New Customer', 'New Contractor') so UI can show proper empty state & placeholder
 * - Never returns password hashes
 */
export function sanitizeUserResponse(userDoc) {
  if (!userDoc) return null;
  const user = userDoc.toObject ? userDoc.toObject() : { ...userDoc };
  delete user.password;

  const rawEmail = (user.email || '').trim().toLowerCase();
  const isPlaceholderEmail =
    !rawEmail ||
    rawEmail.endsWith('@worklogy.local') ||
    rawEmail.startsWith('customer_') ||
    rawEmail.startsWith('temp_');

  user.isPlaceholderEmail = isPlaceholderEmail;
  user.hasGenuineEmail = !isPlaceholderEmail;
  if (isPlaceholderEmail) {
    user.email = '';
  }

  const rawName = (user.name || '').trim();
  const isDummyName =
    !rawName ||
    rawName.toLowerCase() === 'new customer' ||
    rawName.toLowerCase() === 'new contractor';

  user.isDummyName = isDummyName;
  user.hasGenuineName = !isDummyName;
  if (isDummyName) {
    user.name = '';
  }

  return user;
}

export const getUserProfile = async (req, res, next) => {
  try {
    const targetId = req.params.id || req.user?.id || req.user?._id;
    const user = await User.findById(targetId).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.status(200).json({ success: true, user: sanitizeUserResponse(user) });
  } catch (error) {
    next(error);
  }
};

export const updateUserProfile = async (req, res, next) => {
  try {
    const updateData = { ...req.body };

    // Security & Integrity Guardrails: Protect read-only / immutable credentials
    delete updateData.phone;
    delete updateData.role;
    delete updateData.password;
    delete updateData.status;
    delete updateData.isActive;
    delete updateData.adminRole;

    // Sanitize email update: don't overwrite with empty string or placeholder
    if (updateData.email !== undefined) {
      const cleanEmail = (updateData.email || '').trim().toLowerCase();
      if (!cleanEmail || cleanEmail.endsWith('@worklogy.local') || cleanEmail.startsWith('customer_') || cleanEmail.startsWith('temp_')) {
        // If user submitted empty or placeholder, do not overwrite existing DB email with placeholder or wipe it
        delete updateData.email;
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(cleanEmail)) {
          return res.status(400).json({
            success: false,
            message: 'Please provide a valid email address.'
          });
        }
        const existing = await User.findOne({ email: cleanEmail, _id: { $ne: req.user.id } });
        if (existing) {
          return res.status(400).json({
            success: false,
            message: 'This email is already registered with another account.'
          });
        }
        updateData.email = cleanEmail;
      }
    }

    if (updateData.name !== undefined) {
      const cleanName = (updateData.name || '').trim();
      if (!cleanName || cleanName.toLowerCase() === 'new customer') {
        return res.status(400).json({
          success: false,
          message: 'Please enter a valid full name (at least 2 characters).'
        });
      }
      if (cleanName.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Full name must be at least 2 characters.'
        });
      }
      updateData.name = cleanName;
    }

    const user = await User.findByIdAndUpdate(req.user.id, updateData, {
      new: true,
      runValidators: true
    }).select('-password');

    // Also update CustomerProfile onboardingStep if step was profile_pending
    if (user.role === 'customer') {
      const profile = await CustomerProfile.findOne({ user: user._id });
      if (profile && profile.onboardingStep === 'profile_pending') {
        profile.onboardingStep = profile.addresses?.length > 0 ? 'completed' : 'address_pending';
        await profile.save();
      }
    }

    res.status(200).json({ success: true, user: sanitizeUserResponse(user) });
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

export const getAddresses = async (req, res, next) => {
  try {
    let profile = await CustomerProfile.findOne({ user: req.user.id });
    if (!profile) {
      profile = await CustomerProfile.create({ user: req.user.id, addresses: [] });
    }
    res.status(200).json({
      success: true,
      count: profile.addresses?.length || 0,
      addresses: profile.addresses || []
    });
  } catch (error) {
    next(error);
  }
};

export const addAddress = async (req, res, next) => {
  try {
    let profile = await CustomerProfile.findOne({ user: req.user.id });
    if (!profile) {
      profile = await CustomerProfile.create({ user: req.user.id, addresses: [] });
    }

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

    // Normalization & duplicate detection to prevent accidental duplicate addresses
    const norm = (str) => (str || '').trim().toLowerCase();
    const existingIndex = profile.addresses.findIndex((a) => {
      const sameStreet = norm(a.street) === norm(addrData.street);
      const sameLocality = norm(a.locality) === norm(addrData.locality);
      const sameCity = norm(a.city) === norm(addrData.city);
      const sameZip = norm(a.zipCode || a.pincode) === norm(addrData.zipCode || addrData.pincode);
      return sameStreet && sameLocality && sameCity && sameZip;
    });

    if (existingIndex !== -1) {
      // Update existing address instead of creating duplicate
      const existing = profile.addresses[existingIndex];
      if (addrData.label) existing.label = addrData.label;
      if (addrData.houseNumber) existing.houseNumber = addrData.houseNumber;
      if (addrData.landmark) existing.landmark = addrData.landmark;
      if (addrData.coordinates) existing.coordinates = addrData.coordinates;
      if (addrData.isDefault) {
        profile.addresses.forEach((a, idx) => {
          a.isDefault = idx === existingIndex;
        });
      }
    } else {
      if (addrData.isDefault || profile.addresses.length === 0) {
        profile.addresses.forEach((a) => {
          a.isDefault = false;
        });
        addrData.isDefault = true;
      }
      profile.addresses.push(addrData);
    }

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

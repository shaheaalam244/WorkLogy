import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Job from '../models/Job.js';
import VendorProfile from '../models/VendorProfile.js';
import User from '../models/User.js';
import ServiceCategory from '../models/ServiceCategory.js';
import { calculateDistanceMeters } from '../utils/geofence.js';

async function testTrace() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');

  const vendorUser = await User.findOne({ email: 'shahe@gmail.com' });
  const vendorProfile = await VendorProfile.findOne({ user: vendorUser._id });

  console.log('--- VENDOR INFO ---');
  console.log('User ID:', vendorUser._id);
  console.log('Vendor Profile ID:', vendorProfile._id);
  console.log('Vendor City:', vendorProfile.city);
  console.log('Vendor Categories:', vendorProfile.categories);
  console.log('Vendor ServiceAreaCoverage:', {
    baseAddress: vendorProfile.serviceAreaCoverage?.baseAddress,
    coordinates: vendorProfile.serviceAreaCoverage?.coordinates,
    radiusKm: vendorProfile.serviceAreaCoverage?.radiusKm,
    selectedLocalityIdsCount: vendorProfile.serviceAreaCoverage?.selectedLocalityIds?.length,
    selectedZoneIdsCount: vendorProfile.serviceAreaCoverage?.selectedZoneIds?.length
  });

  const jobs = await Job.find({
    _id: {
      $in: [
        new mongoose.Types.ObjectId('6ae0208270d51a1f67ac74d1'),
        new mongoose.Types.ObjectId('6ae0201370d51a1f67ac7471'),
        new mongoose.Types.ObjectId('6adf53a56002bf263057143e')
      ]
    }
  }).populate('category');

  console.log('\n--- EVALUATING 3 JOBS ---');
  for (const job of jobs) {
    console.log(`\nJob: "${job.title}" (${job._id})`);
    console.log('Status:', job.status);
    console.log('Category:', job.category?.name, `(${job.category?._id})`);
    console.log('City:', job.location?.city, '| Locality:', job.location?.locality);
    console.log('Coordinates:', job.location?.coordinates);
    console.log('SelectedVendor:', job.selectedVendor);

    // Check Distance from vendor
    if (vendorProfile.serviceAreaCoverage?.coordinates && job.location?.coordinates) {
      const vCoords = vendorProfile.serviceAreaCoverage.coordinates;
      const jCoords = job.location.coordinates;
      const meters = calculateDistanceMeters(vCoords.lat, vCoords.lng, jCoords.lat, jCoords.lng);
      const km = meters / 1000;
      console.log(`Distance: ${km.toFixed(2)} km (Vendor configured radius: ${vendorProfile.serviceAreaCoverage.radiusKm} km)`);
      console.log('Within Radius:', km <= (vendorProfile.serviceAreaCoverage.radiusKm || 30));
    }
  }

  await mongoose.disconnect();
}

testTrace().catch(console.error);

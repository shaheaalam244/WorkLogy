import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Job from '../models/Job.js';
import VendorProfile from '../models/VendorProfile.js';
import User from '../models/User.js';
import ServiceCategory from '../models/ServiceCategory.js';
import { calculateDistanceMeters } from '../utils/geofence.js';

async function testSimulate() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');

  const vendorUser = await User.findOne({ email: 'shahe@gmail.com' });
  const profile = await VendorProfile.findOne({ user: vendorUser._id });

  // Get AC & HVAC and Electrical Services categories
  const catDocs = await ServiceCategory.find({
    slug: { $in: ['ac-hvac-services', 'electrical-services'] }
  });
  const approvedCategoryIds = catDocs.map(c => c._id);
  console.log('Testing with approved categories:', catDocs.map(c => `${c.name} (${c._id})`));

  const vendorCity = (profile.city || 'Lucknow').trim();
  const coverageLocalities = [];
  const validAreaCoords = [];

  if (profile.serviceAreaCoverage?.coordinates?.lat && profile.serviceAreaCoverage?.coordinates?.lng) {
    validAreaCoords.push({
      lat: Number(profile.serviceAreaCoverage.coordinates.lat),
      lng: Number(profile.serviceAreaCoverage.coordinates.lng),
      radiusKm: profile.serviceAreaCoverage.radiusKm || 15
    });
  }

  const uniqueLocalities = [...new Set(coverageLocalities)];
  const hasCityWide = uniqueLocalities.length === 0 || uniqueLocalities.some(loc => {
    const l = loc.toLowerCase();
    return l.includes('all') || l.includes('entire') || l === vendorCity.toLowerCase();
  });

  console.log('hasCityWide:', hasCityWide);
  console.log('validAreaCoords:', validAreaCoords);

  // Tab = 'all'
  let query = { isDeleted: { $ne: true } };
  if (vendorCity) {
    query['location.city'] = { $regex: new RegExp('^' + vendorCity + '$', 'i') };
  }
  if (!hasCityWide && uniqueLocalities.length > 0) {
    const locRegexes = uniqueLocalities.map(loc => new RegExp(loc, 'i'));
    query['location.locality'] = { $in: locRegexes };
  }
  query.category = { $in: approvedCategoryIds };
  query.status = { $in: ['open', 'dispatching'] };
  query.selectedVendor = null;
  query.declinedVendors = { $ne: vendorUser._id };

  console.log('Mongo Query:', JSON.stringify(query, null, 2));

  const matchingJobs = await Job.find(query).populate('category');
  console.log(`\nFound ${matchingJobs.length} matching jobs via query:`);
  for (const j of matchingJobs) {
    console.log(` - ${j.title} (${j._id}) | Category: ${j.category?.name} | Locality: ${j.location?.locality}`);

    // Distance check
    const jobLat = j.location?.coordinates?.lat;
    const jobLng = j.location?.coordinates?.lng;
    let distanceKm = null;
    if (jobLat != null && jobLng != null && validAreaCoords.length > 0) {
      let minMeters = Infinity;
      for (const coord of validAreaCoords) {
        const meters = calculateDistanceMeters(coord.lat, coord.lng, jobLat, jobLng);
        if (meters < minMeters) minMeters = meters;
      }
      distanceKm = Math.round((minMeters / 1000) * 10) / 10;
    }
    console.log(`   Distance: ${distanceKm} km | Within vendor radius (${profile.serviceAreaCoverage.radiusKm} km): ${distanceKm <= profile.serviceAreaCoverage.radiusKm}`);
  }

  // Tab = 'new' (New Requests)
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const newQuery = { ...query, createdAt: { $gte: fortyEightHoursAgo } };
  const newJobs = await Job.find(newQuery).populate('category');
  console.log(`\nFound ${newJobs.length} matching jobs for 'new' tab:`);
  for (const j of newJobs) {
    console.log(` - ${j.title} (${j._id}) | Created: ${j.createdAt}`);
  }

  await mongoose.disconnect();
}

testSimulate().catch(console.error);

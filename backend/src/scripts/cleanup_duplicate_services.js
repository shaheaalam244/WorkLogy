import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import ServiceListing from '../models/ServiceListing.js';
import VendorProfile from '../models/VendorProfile.js';
import Booking from '../models/Booking.js';
import Review from '../models/Review.js';

async function cleanupDuplicates() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB for duplicate services cleanup.');

  const allListings = await ServiceListing.find({ status: { $ne: 'archived' } }).sort({ createdAt: 1 });
  console.log(`Found ${allListings.length} non-archived ServiceListings.`);

  const seen = new Map();
  const toArchive = [];

  for (const listing of allListings) {
    const key = `${listing.vendor.toString()}_${listing.domain}_${(listing.subcategory || '').toLowerCase().trim()}`;
    if (!seen.has(key)) {
      seen.set(key, listing);
    } else {
      // Check if duplicate has bookings or reviews
      const [bookingsCount, reviewsCount] = await Promise.all([
        Booking.countDocuments({ service: listing._id }),
        Review.countDocuments({ service: listing._id })
      ]);

      console.log(`Found duplicate listing: ${listing._id} (Title: "${listing.title}", Bookings: ${bookingsCount}, Reviews: ${reviewsCount})`);

      if (bookingsCount === 0 && reviewsCount === 0) {
        toArchive.push(listing);
      } else {
        console.warn(`Cannot archive duplicate ${listing._id} because it has bookings/reviews!`);
      }
    }
  }

  console.log(`Archiving ${toArchive.length} duplicate orphaned listings...`);
  for (const dup of toArchive) {
    dup.status = 'archived';
    await dup.save();
    console.log(`Archived duplicate ${dup._id}`);
  }

  // Also clean up duplicates in VendorProfile.services
  const profiles = await VendorProfile.find({ 'services.0': { $exists: true } });
  for (const prof of profiles) {
    const uniqueServices = [];
    const profSeen = new Set();
    for (const s of prof.services || []) {
      const sKey = `${(s.categoryName || s.title || '').toLowerCase().trim()}_${(s.title || '').toLowerCase().trim()}`;
      if (!profSeen.has(sKey)) {
        profSeen.add(sKey);
        uniqueServices.push(s);
      }
    }
    if (uniqueServices.length !== prof.services.length) {
      console.log(`Cleaned up duplicates in VendorProfile ${prof._id}: ${prof.services.length} -> ${uniqueServices.length}`);
      prof.services = uniqueServices;
      await prof.save();
    }
  }

  console.log('Duplicate cleanup complete.');
  await mongoose.disconnect();
}

cleanupDuplicates().catch(err => {
  console.error('Cleanup error:', err);
  process.exit(1);
});

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

import ServiceCategory from '../models/ServiceCategory.js';
import ServiceListing from '../models/ServiceListing.js';
import User from '../models/User.js';

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

const runVerification = async () => {
  console.log('====================================================');
  console.log(' WORKLOGY SERVICE LIFECYCLE & INTEGRITY VERIFICATION');
  console.log('====================================================\n');

  try {
    await mongoose.connect(MONGO_URI);
    console.log('✓ Connected to MongoDB Atlas:', mongoose.connection.name);

    // 1. Verify Canonical Categories
    const categoriesCount = await ServiceCategory.countDocuments();
    console.log(`✓ Canonical Service Categories in DB: ${categoriesCount}`);
    if (categoriesCount !== 30) {
      throw new Error(`Expected 30 categories, found ${categoriesCount}`);
    }

    // 2. Verify Initial Services Count is 0
    const initialServices = await ServiceListing.countDocuments();
    console.log(`✓ Initial Service Listings Count: ${initialServices}`);
    if (initialServices !== 0) {
      throw new Error(`Expected 0 initial listings, found ${initialServices}`);
    }

    // 3. Find an existing user or admin for testing lifecycle
    const testUser = await User.findOne({ role: { $in: ['admin', 'vendor'] } });
    if (!testUser) {
      throw new Error('No user found to associate test service');
    }
    const electricalCat = await ServiceCategory.findOne({ slug: 'electrical-services' });
    if (!electricalCat) {
      throw new Error('Electrical category not found');
    }

    console.log('\n--- TESTING NEW SERVICE CREATION WORKFLOW ---');
    // 4. Create a test service listing
    const testService = await ServiceListing.create({
      vendor: testUser._id,
      category: electricalCat._id,
      title: 'QA Verified 3-Phase Switchboard Inspection & MCB Testing',
      domain: 'Electrical Services',
      subcategory: 'Switchboard Repair',
      shortSummary: 'Certified diagnostic testing and MCB circuit replacement',
      description: 'Comprehensive electrical diagnostics for circuit tripping, load balancing, and terminal tightening.',
      pricing: {
        type: 'fixed',
        amount: 499,
        unit: 'per visit'
      },
      durationEstimate: '45-60 mins',
      location: {
        city: 'Lucknow',
        locality: 'Gomti Nagar',
        radiusKm: 25
      },
      status: 'published'
    });
    console.log(`✓ Created test service listing: "${testService.title}" (ID: ${testService._id})`);

    // 5. Query public listings to verify it appears
    const queryListings = await ServiceListing.find({ status: 'published' })
      .populate('category', 'name slug')
      .populate('vendor', 'name email');
    console.log(`✓ Queried published listings count: ${queryListings.length}`);
    if (queryListings.length !== 1 || queryListings[0].title !== testService.title) {
      throw new Error('Service was created but did not match expected query result');
    }
    console.log(`✓ Successfully verified service title, pricing (₹${queryListings[0].pricing.amount}), category (${queryListings[0].category.name})`);

    // 6. Clean up test service to restore pristine QA state
    console.log('\n--- RESTORING PRISTINE QA RESET STATE ---');
    await ServiceListing.findByIdAndDelete(testService._id);
    const finalCount = await ServiceListing.countDocuments();
    console.log(`✓ Test listing removed. Final Service Listings Count: ${finalCount}`);
    if (finalCount !== 0) {
      throw new Error(`Expected 0 final listings, found ${finalCount}`);
    }

    console.log('\n====================================================');
    console.log(' ALL VERIFICATIONS PASSED SUCCESSFULLY!');
    console.log('====================================================');
  } catch (err) {
    console.error('❌ Verification failed:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
};

runVerification();

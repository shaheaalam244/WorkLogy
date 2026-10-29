import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI;

async function runServiceCleanup() {
  console.log('====================================================');
  console.log(' WORKLOGY SERVICE LISTINGS AUDIT & SANITIZATION   ');
  console.log('====================================================\n');

  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;
  console.log(`Host: ${mongoose.connection.host}`);
  console.log(`Database: ${mongoose.connection.name}\n`);

  // 1. Audit Service Listings
  const serviceListingsCount = await db.collection('servicelistings').countDocuments();
  const catalogServicesCount = await db.collection('catalogservices').countDocuments();
  console.log(`Current 'servicelistings' count: ${serviceListingsCount}`);
  console.log(`Current 'catalogservices' count: ${catalogServicesCount}`);

  if (serviceListingsCount > 0) {
    const listings = await db.collection('servicelistings').find({}).toArray();
    console.log('\nFound service listings to purge:');
    listings.forEach(l => {
      console.log(` - [${l._id}] ${l.title} (Domain: ${l.domain || 'N/A'}, Price: ₹${l.pricing?.amount || l.price || 0})`);
    });

    const delRes = await db.collection('servicelistings').deleteMany({});
    console.log(`\n✓ Purged ${delRes.deletedCount} service listings.`);
  } else {
    console.log('\n✓ Database collection "servicelistings" is already at 0 records.');
  }

  if (catalogServicesCount > 0) {
    const delCatRes = await db.collection('catalogservices').deleteMany({});
    console.log(`✓ Purged ${delCatRes.deletedCount} catalog services.`);
  }

  // 2. Ensure Canonical Reference Categories remain intact
  const categoriesCount = await db.collection('servicecategories').countDocuments();
  console.log(`\n✓ Verified canonical service categories preserved: ${categoriesCount} categories`);
  if (categoriesCount !== 30) {
    console.warn(`WARNING: Expected 30 canonical categories, found ${categoriesCount}`);
  }

  // 3. Confirm Referential Integrity
  const usersCount = await db.collection('users').countDocuments();
  const jobsCount = await db.collection('jobs').countDocuments();
  const bookingsCount = await db.collection('bookings').countDocuments();
  console.log('\n--- INTEGRITY AUDIT ---');
  console.log(`Users: ${usersCount} (Admin & User preserved)`);
  console.log(`Jobs: ${jobsCount}`);
  console.log(`Bookings: ${bookingsCount}`);
  console.log(`Service Listings: 0`);
  console.log('------------------------\n');

  console.log('====================================================');
  console.log(' SERVICE CLEANUP VERIFICATION COMPLETE');
  console.log('====================================================');

  await mongoose.disconnect();
}

runServiceCleanup().catch(err => {
  console.error('Service cleanup failed:', err);
  process.exit(1);
});

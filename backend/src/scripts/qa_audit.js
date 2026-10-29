import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI;

async function runAudit() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;
  console.log(`Connected to host: ${mongoose.connection.host}`);
  console.log(`Database name: ${mongoose.connection.name}`);

  const collections = await db.listCollections().toArray();
  console.log('\n--- COLLECTION COUNTS ---');
  for (const col of collections) {
    const count = await db.collection(col.name).countDocuments();
    console.log(`  ${col.name.padEnd(25)}: ${count} documents`);
  }

  // Inspect Users
  console.log('\n--- USERS BREAKDOWN ---');
  const users = await db.collection('users').find({}).toArray();
  console.log(`Total users: ${users.length}`);
  const roles = {};
  users.forEach(u => {
    roles[u.role] = (roles[u.role] || 0) + 1;
  });
  console.log('Roles:', roles);
  console.log('\nAdmins:');
  users.filter(u => u.role === 'admin').forEach(u => {
    console.log(`  - ${u.name} (${u.email}) [ID: ${u._id}]`);
  });

  console.log('\nVendors sample (first 10):');
  users.filter(u => u.role === 'vendor').slice(0, 10).forEach(u => {
    console.log(`  - ${u.name} (${u.email}) [ID: ${u._id}]`);
  });
  if (users.filter(u => u.role === 'vendor').length > 10) {
    console.log(`  ... and ${users.filter(u => u.role === 'vendor').length - 10} more vendors`);
  }

  console.log('\nCustomers sample (first 10):');
  users.filter(u => u.role === 'customer').slice(0, 10).forEach(u => {
    console.log(`  - ${u.name} (${u.email}) [ID: ${u._id}]`);
  });
  if (users.filter(u => u.role === 'customer').length > 10) {
    console.log(`  ... and ${users.filter(u => u.role === 'customer').length - 10} more customers`);
  }

  // Inspect Jobs
  console.log('\n--- JOBS ---');
  const jobs = await db.collection('jobs').find({}).toArray();
  console.log(`Total jobs: ${jobs.length}`);
  jobs.forEach(j => {
    console.log(`  - "${j.title}" [Status: ${j.status}]`);
  });

  // Inspect Bookings
  console.log('\n--- BOOKINGS ---');
  const bookings = await db.collection('bookings').find({}).toArray();
  console.log(`Total bookings: ${bookings.length}`);
  bookings.forEach(b => {
    console.log(`  - Ref: ${b.bookingReference} | Service: ${b.serviceTitle} | Status: ${b.status}`);
  });

  // Inspect Reviews
  console.log('\n--- REVIEWS ---');
  const reviews = await db.collection('reviews').find({}).toArray();
  console.log(`Total reviews: ${reviews.length}`);

  // Inspect Categories (Reference data - must NOT delete!)
  console.log('\n--- SERVICE CATEGORIES ---');
  const categoriesCount = await db.collection('servicecategories').countDocuments().catch(() => 0);
  console.log(`Total categories: ${categoriesCount}`);

  // Inspect Zones & Localities (Reference data)
  const zonesCount = await db.collection('zones').countDocuments().catch(() => 0);
  const localitiesCount = await db.collection('localities').countDocuments().catch(() => 0);
  console.log(`Zones: ${zonesCount}, Localities: ${localitiesCount}`);

  await mongoose.disconnect();
}

runAudit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});

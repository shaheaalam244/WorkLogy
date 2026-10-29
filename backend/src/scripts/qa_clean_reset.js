import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI;

async function executeQAReset() {
  console.log('====================================================');
  console.log(' WORKLOGY QA CLEAN RESET & ENVIRONMENT SANITIZATION');
  console.log('====================================================\n');

  if (!MONGO_URI) {
    console.error('ERROR: MONGO_URI is missing in environment variables.');
    process.exit(1);
  }

  console.log('Connecting to database...');
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;
  console.log(`Connected to host: ${mongoose.connection.host}`);
  console.log(`Database name: ${mongoose.connection.name}\n`);

  // 1. Identify users to preserve
  const adminUser = await db.collection('users').findOne({ email: 'admin@worklogy.com' });
  const aalamUser = await db.collection('users').findOne({ email: 'aalam@gmail.com' });

  const preservedUserIds = [];
  const preservedEmails = [];

  if (adminUser) {
    preservedUserIds.push(adminUser._id);
    preservedEmails.push(adminUser.email);
    console.log(`✓ Preserving Admin: ${adminUser.name} (${adminUser.email}) [ID: ${adminUser._id}]`);
  } else {
    // If admin is missing, create it
    const hashedPassword = await bcrypt.hash('password123', 10);
    const newAdmin = await db.collection('users').insertOne({
      name: 'Sarah Connor (Admin)',
      email: 'admin@worklogy.com',
      password: hashedPassword,
      role: 'admin',
      isVerified: true,
      phone: '+919999999999',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    preservedUserIds.push(newAdmin.insertedId);
    preservedEmails.push('admin@worklogy.com');
    console.log(`✓ Created Fresh Admin: admin@worklogy.com [ID: ${newAdmin.insertedId}]`);
  }

  if (aalamUser) {
    preservedUserIds.push(aalamUser._id);
    preservedEmails.push(aalamUser.email);
    console.log(`✓ Preserving Personal User: ${aalamUser.name} (${aalamUser.email}) [ID: ${aalamUser._id}]`);
  }

  // Ensure Admin password is password123
  const adminHash = await bcrypt.hash('password123', 10);
  await db.collection('users').updateOne(
    { email: 'admin@worklogy.com' },
    { $set: { password: adminHash, isVerified: true, role: 'admin' } }
  );
  console.log('✓ Verified Admin credentials: admin@worklogy.com / password123\n');

  // 2. Perform Clean Deletion of Demo / Seeded Data
  console.log('--- PURGING DEMO & SEED DATA ---');

  // A. Vendors & Test Customers
  const deleteVendorsRes = await db.collection('users').deleteMany({ role: 'vendor' });
  console.log(`Deleted demo vendor users: ${deleteVendorsRes.deletedCount}`);

  const deleteCustRes = await db.collection('users').deleteMany({
    role: 'customer',
    email: { $nin: preservedEmails }
  });
  console.log(`Deleted demo/test customer users: ${deleteCustRes.deletedCount}`);

  // B. Vendor Profiles
  const deleteVendorProfRes = await db.collection('vendorprofiles').deleteMany({});
  console.log(`Deleted demo vendor profiles: ${deleteVendorProfRes.deletedCount}`);

  // C. Customer Profiles (keep only preserved users)
  const deleteCustProfRes = await db.collection('customerprofiles').deleteMany({
    user: { $nin: preservedUserIds }
  });
  console.log(`Deleted demo customer profiles: ${deleteCustProfRes.deletedCount}`);

  // D. Operational Collections (Jobs, Bookings, Transactions, etc.)
  const collectionsToClear = [
    'jobs',
    'bookings',
    'applications',
    'transactions',
    'reviews',
    'servicelistings',
    'messages',
    'conversations',
    'notifications',
    'supporttickets',
    'activitylogs',
    'disputes',
    'jobrequests',
    'reports'
  ];

  for (const colName of collectionsToClear) {
    try {
      const res = await db.collection(colName).deleteMany({});
      console.log(`Cleared ${colName.padEnd(20)}: ${res.deletedCount} removed`);
    } catch (err) {
      console.log(`Skipped ${colName.padEnd(20)}: (Collection may not exist)`);
    }
  }

  // 3. Verify Preserved Reference Data
  console.log('\n--- VERIFYING PRESERVED REFERENCE DATA ---');
  const catCount = await db.collection('servicecategories').countDocuments();
  console.log(`✓ Service Categories preserved: ${catCount} categories`);

  const zoneCount = await db.collection('zones').countDocuments();
  console.log(`✓ Lucknow Zones preserved: ${zoneCount} zones`);

  const locCount = await db.collection('localities').countDocuments();
  console.log(`✓ Localities preserved: ${locCount} localities`);

  const remainingUsers = await db.collection('users').find({}).toArray();
  console.log(`\nRemaining Users (${remainingUsers.length}):`);
  remainingUsers.forEach(u => {
    console.log(`  - [${u.role.toUpperCase()}] ${u.name} (${u.email}) [ID: ${u._id}]`);
  });

  console.log('\n====================================================');
  console.log(' QA RESET COMPLETED SUCCESSFULLY');
  console.log(' Database is now completely clean and ready for manual testing.');
  console.log('====================================================');

  await mongoose.disconnect();
}

executeQAReset().catch(err => {
  console.error('QA Reset failed:', err);
  process.exit(1);
});

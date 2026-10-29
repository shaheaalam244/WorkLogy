import mongoose from 'mongoose';
import dotenv from 'dotenv';
import VendorProfile from '../models/VendorProfile.js';
import ServiceCategory from '../models/ServiceCategory.js';

dotenv.config();

export async function migrateVendorDomains() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGO_URI is missing from environment.');
  }

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri);
  }

  console.log('🔄 Running Vendor Multi-Domain Schema & Data Migration...');

  // 1. Fetch active categories map
  const activeCategories = await ServiceCategory.find({ isActive: { $ne: false } }).lean();
  const activeIdSet = new Set(activeCategories.map(c => c._id.toString()));
  console.log(`📋 Found ${activeCategories.length} active service categories.`);

  // 2. Fetch all vendor profiles
  const vendorProfiles = await VendorProfile.find({});
  console.log(`👨‍🔧 Found ${vendorProfiles.length} vendor profiles to check.`);

  let updatedCount = 0;
  for (const vendor of vendorProfiles) {
    const rawCategories = Array.isArray(vendor.categories) ? vendor.categories : [];
    const validUniqueIds = [];

    for (const catId of rawCategories) {
      if (!catId) continue;
      const strId = (catId._id || catId).toString();
      if (activeIdSet.has(strId) && !validUniqueIds.includes(strId)) {
        validUniqueIds.push(strId);
      }
    }

    const originalLength = rawCategories.length;
    // Cap at max 3 domains
    const cappedIds = validUniqueIds.slice(0, 3).map(id => new mongoose.Types.ObjectId(id));

    if (cappedIds.length !== originalLength || validUniqueIds.length > 3) {
      console.log(`  ⚡ Migrating vendor "${vendor.businessName}" (${vendor._id}):`);
      console.log(`     Previous categories count: ${originalLength}`);
      console.log(`     Capped valid categories count: ${cappedIds.length}`);

      await VendorProfile.updateOne(
        { _id: vendor._id },
        { $set: { categories: cappedIds } },
        { runValidators: false }
      );
      updatedCount++;
    } else {
      console.log(`  ✓ Vendor "${vendor.businessName}" (${vendor._id}) is compliant (${cappedIds.length} domains).`);
    }
  }

  console.log(`✅ Vendor Multi-Domain Migration finished. Updated ${updatedCount} profiles.`);
  return { updatedCount, totalProfiles: vendorProfiles.length };
}

// Run standalone if executed directly
if (process.argv[1]?.endsWith('migrate_vendor_domains.js')) {
  migrateVendorDomains()
    .then(async () => {
      await mongoose.disconnect();
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

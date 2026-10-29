import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to DB:', mongoose.connection.name);

  const db = mongoose.connection.db;

  // 1. Get all recent jobs
  const jobs = await db.collection('jobs').find().sort({ createdAt: -1 }).limit(10).toArray();
  console.log(`\n=== LAST ${jobs.length} JOBS ===`);
  for (const j of jobs) {
    console.log(JSON.stringify({
      _id: j._id,
      title: j.title,
      status: j.status,
      category: j.category,
      customer: j.customer,
      selectedVendor: j.selectedVendor,
      assignedVendor: j.assignedVendor,
      locality: j.location?.locality,
      city: j.location?.city,
      coordinates: j.location?.coordinates,
      createdAt: j.createdAt,
      urgency: j.urgency,
      isDeleted: j.isDeleted
    }, null, 2));
  }

  // 2. Get all vendors
  const vendors = await db.collection('vendorprofiles').find().toArray();
  console.log(`\n=== ALL VENDOR PROFILES (${vendors.length}) ===`);
  for (const v of vendors) {
    console.log(JSON.stringify({
      _id: v._id,
      user: v.user,
      businessName: v.businessName,
      approvalStatus: v.approvalStatus,
      city: v.city,
      categories: v.categories,
      servicesCount: v.services?.length,
      serviceAreas: v.serviceAreas,
      serviceAreaCoverage: v.serviceAreaCoverage,
      coordinates: v.coordinates,
      vendorServiceRadiusKm: v.vendorServiceRadiusKm,
      isAvailable: v.isAvailable,
      availability: v.availability
    }, null, 2));
  }

  // 3. Get all service categories
  const categories = await db.collection('servicecategories').find().toArray();
  console.log(`\n=== SERVICE CATEGORIES (${categories.length}) ===`);
  for (const c of categories) {
    console.log(JSON.stringify({
      _id: c._id,
      name: c.name,
      slug: c.slug,
      isActive: c.isActive
    }));
  }

  // 4. Get recent users
  const users = await db.collection('users').find().sort({ createdAt: -1 }).limit(10).toArray();
  console.log(`\n=== LAST 10 USERS ===`);
  for (const u of users) {
    console.log(JSON.stringify({
      _id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status
    }));
  }

  await mongoose.disconnect();
}

run().catch(console.error);

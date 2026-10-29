import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import User from './src/models/User.js';
import VendorProfile from './src/models/VendorProfile.js';
import ServiceCategory from './src/models/ServiceCategory.js';
import Job from './src/models/Job.js';

dotenv.config();

const API_BASE = 'http://localhost:5001/api';

function getAuthHeader(userId, role = 'vendor') {
  const token = jwt.sign({ id: userId, role }, process.env.JWT_SECRET || 'your-default-jwt-secret', {
    expiresIn: '7d'
  });
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

async function runProfileDomainsTest() {
  console.log('🧪 Starting WorkLogy Vendor Profile Domain Management & Dynamic Feed Test Suite...\n');

  await mongoose.connect(process.env.MONGO_URI);

  // 1. Identify canonical categories
  const acCat = await ServiceCategory.findOne({
    $or: [{ slug: 'ac-hvac-services' }, { name: /ac/i }]
  });
  const plumbingCat = await ServiceCategory.findOne({
    $or: [{ slug: 'plumbing-services' }, { name: /plumbing/i }]
  });
  const electricalCat = await ServiceCategory.findOne({
    $or: [{ slug: 'electrical-services' }, { name: /electrical/i }]
  });
  const cleaningCat = await ServiceCategory.findOne({
    $or: [{ slug: 'home-cleaning' }, { name: /cleaning/i }]
  });

  if (!acCat || !plumbingCat || !electricalCat || !cleaningCat) {
    throw new Error('Required canonical categories not found in database.');
  }

  console.log('📋 Canonical Categories Identified:');
  console.log(`   AC Domain:         ${acCat.name} (${acCat._id})`);
  console.log(`   Plumbing Domain:   ${plumbingCat.name} (${plumbingCat._id})`);
  console.log(`   Electrical Domain: ${electricalCat.name} (${electricalCat._id})`);
  console.log(`   Cleaning Domain:   ${cleaningCat.name} (${cleaningCat._id})\n`);

  // 2. Ensure test jobs exist across domains in Lucknow
  let customerUser = await User.findOne({ email: 'test_prof_domain_cust@worklogy.com' });
  if (!customerUser) {
    customerUser = await User.create({
      name: 'Profile Domain Test Customer',
      email: 'test_prof_domain_cust@worklogy.com',
      password: 'password123',
      role: 'customer',
      phone: '9988776655'
    });
  }

  const jobAC = await Job.findOneAndUpdate(
    { title: 'TEST_PROF_AC_JOB' },
    {
      title: 'TEST_PROF_AC_JOB',
      description: 'Split AC Deep Cleaning & Gas Topup',
      customer: customerUser._id,
      category: acCat._id,
      status: 'open',
      location: {
        address: 'Hazratganj, Lucknow',
        city: 'Lucknow',
        locality: 'Hazratganj',
        pincode: '226001',
        coordinates: [80.9462, 26.8467]
      },
      budget: { amount: 800, type: 'fixed' },
      isDeleted: false
    },
    { upsert: true, new: true }
  );

  const jobPlumbing = await Job.findOneAndUpdate(
    { title: 'TEST_PROF_PLUMBING_JOB' },
    {
      title: 'TEST_PROF_PLUMBING_JOB',
      description: 'Bathroom Pipe Leakage and Tap Repair',
      customer: customerUser._id,
      category: plumbingCat._id,
      status: 'open',
      location: {
        address: 'Hazratganj, Lucknow',
        city: 'Lucknow',
        locality: 'Hazratganj',
        pincode: '226001',
        coordinates: [80.9462, 26.8467]
      },
      budget: { amount: 450, type: 'fixed' },
      isDeleted: false
    },
    { upsert: true, new: true }
  );

  const jobElectrical = await Job.findOneAndUpdate(
    { title: 'TEST_PROF_ELECTRICAL_JOB' },
    {
      title: 'TEST_PROF_ELECTRICAL_JOB',
      description: 'Exhaust Fan Installation and Socket Wiring',
      customer: customerUser._id,
      category: electricalCat._id,
      status: 'open',
      location: {
        address: 'Hazratganj, Lucknow',
        city: 'Lucknow',
        locality: 'Hazratganj',
        pincode: '226001',
        coordinates: [80.9462, 26.8467]
      },
      budget: { amount: 500, type: 'fixed' },
      isDeleted: false
    },
    { upsert: true, new: true }
  );

  const jobCleaning = await Job.findOneAndUpdate(
    { title: 'TEST_PROF_CLEANING_JOB' },
    {
      title: 'TEST_PROF_CLEANING_JOB',
      description: 'Full 3BHK Deep Cleaning & Sanitization',
      customer: customerUser._id,
      category: cleaningCat._id,
      status: 'open',
      location: {
        address: 'Hazratganj, Lucknow',
        city: 'Lucknow',
        locality: 'Hazratganj',
        pincode: '226001',
        coordinates: [80.9462, 26.8467]
      },
      budget: { amount: 2200, type: 'fixed' },
      isDeleted: false
    },
    { upsert: true, new: true }
  );

  console.log('🛠️ Multi-Domain Reference Jobs:');
  console.log(`   AC Job ID:         ${jobAC._id}`);
  console.log(`   Plumbing Job ID:   ${jobPlumbing._id}`);
  console.log(`   Electrical Job ID: ${jobElectrical._id}`);
  console.log(`   Cleaning Job ID:   ${jobCleaning._id}\n`);

  // Clean up any previous test vendor
  const testVendorEmail = 'vendor_prof_switcher@worklogy.com';
  const existingUser = await User.findOne({ email: testVendorEmail });
  if (existingUser) {
    await VendorProfile.deleteMany({ user: existingUser._id });
    await User.deleteOne({ _id: existingUser._id });
  }

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // --- STEP 1: Register Vendor with 1 Domain (AC) ---
  console.log('--- TEST 1: Vendor registers with 1 domain ---');
  const regRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Dynamic Switcher Pro',
      email: testVendorEmail,
      password: 'password123',
      role: 'vendor',
      businessName: 'Dynamic Pro Solutions',
      categories: [acCat._id.toString()]
    })
  });
  const regData = await regRes.json();
  assert(regRes.status === 201 && regData.success, 'Registration succeeds with 201 Created');
  const vendorId = regData.user.id;
  const vendorAuth = getAuthHeader(vendorId);

  // Verify profile via GET /api/vendors/profile/me
  console.log('\n--- TEST 2: Fetch profile via GET /api/vendors/profile/me ---');
  const profRes = await fetch(`${API_BASE}/vendors/profile/me`, { headers: vendorAuth });
  const profData = await profRes.json();
  assert(profRes.status === 200 && profData.success, 'Profile endpoint returns 200 OK');
  assert(profData.vendor.categories.length === 1, 'Profile returns exactly 1 registered domain');
  assert(
    (profData.vendor.categories[0]._id || profData.vendor.categories[0]).toString() === acCat._id.toString(),
    'Registered domain is AC & HVAC Services'
  );

  // --- STEP 3: Add 2nd and 3rd domains via PUT /api/vendors/profile/me ---
  console.log('\n--- TEST 3: Vendor adds 2nd and 3rd domains (AC + Plumbing + Electrical) ---');
  const updateRes = await fetch(`${API_BASE}/vendors/profile/me`, {
    method: 'PUT',
    headers: vendorAuth,
    body: JSON.stringify({
      categories: [
        acCat._id.toString(),
        plumbingCat._id.toString(),
        electricalCat._id.toString()
      ]
    })
  });
  const updateData = await updateRes.json();
  assert(updateRes.status === 200 && updateData.success, 'Domain update returns 200 OK');
  assert(updateData.vendor.categories.length === 3, 'Vendor now has 3 registered domains');
  const dbProf = await VendorProfile.findOne({ user: vendorId });
  assert(dbProf && dbProf.categories.length === 3, 'MongoDB successfully persisted all 3 domain ObjectIds');

  // --- STEP 4: Attempt to add 4th domain (BLOCKED) ---
  console.log('\n--- TEST 4: Attempting to select 4 domains is rejected ---');
  const quadRes = await fetch(`${API_BASE}/vendors/profile/me`, {
    method: 'PUT',
    headers: vendorAuth,
    body: JSON.stringify({
      categories: [
        acCat._id.toString(),
        plumbingCat._id.toString(),
        electricalCat._id.toString(),
        cleaningCat._id.toString()
      ]
    })
  });
  const quadData = await quadRes.json();
  assert(quadRes.status === 400 && quadData.success === false, 'Selecting 4 domains returns 400 Bad Request');
  assert(
    quadData.message?.includes('maximum of 3 service domains'),
    `Rejection message: "${quadData.message}"`
  );
  const dbProfAfterQuad = await VendorProfile.findOne({ user: vendorId });
  assert(dbProfAfterQuad.categories.length === 3, 'Database preserved valid 3 domains without corruption');

  // --- STEP 5: Switch Active Browsing Domain in Jobs Feed ---
  console.log('\n--- TEST 5: Active Domain Switcher in Jobs Feed ---');

  // 5a. "All My Domains" (browse across all 3 registered domains)
  console.log('  -> Browsing "All My Domains":');
  const allDomainsRes = await fetch(`${API_BASE}/jobs/open`, { headers: vendorAuth });
  const allDomainsData = await allDomainsRes.json();
  assert(allDomainsRes.status === 200, 'Feed returns 200 OK');
  const allJobs = allDomainsData.jobs || [];
  const hasAc = allJobs.some(j => (j.category?._id || j.category).toString() === acCat._id.toString());
  const hasPlumb = allJobs.some(j => (j.category?._id || j.category).toString() === plumbingCat._id.toString());
  const hasElec = allJobs.some(j => (j.category?._id || j.category).toString() === electricalCat._id.toString());
  const hasClean = allJobs.some(j => (j.category?._id || j.category).toString() === cleaningCat._id.toString());
  assert(hasAc, 'All My Domains includes eligible AC jobs');
  assert(hasPlumb, 'All My Domains includes eligible Plumbing jobs');
  assert(hasElec, 'All My Domains includes eligible Electrical jobs');
  assert(!hasClean, 'All My Domains strictly excludes unrelated Cleaning jobs');

  // 5b. Switch to AC Domain Only
  console.log('  -> Switching active browsing domain to AC Repair only:');
  const acFeedRes = await fetch(`${API_BASE}/jobs/open?category=${acCat._id.toString()}`, {
    headers: vendorAuth
  });
  const acFeedData = await acFeedRes.json();
  const acJobs = acFeedData.jobs || [];
  assert(acJobs.length > 0, 'AC feed returns jobs');
  assert(
    acJobs.every(j => (j.category?._id || j.category).toString() === acCat._id.toString()),
    'Every returned job belongs strictly to AC domain'
  );
  assert(
    !acJobs.some(j => (j.category?._id || j.category).toString() === plumbingCat._id.toString()),
    'Plumbing jobs are hidden when browsing AC'
  );

  // 5c. Switch to Plumbing Domain Only
  console.log('  -> Switching active browsing domain to Plumbing only:');
  const plumbFeedRes = await fetch(`${API_BASE}/jobs/open?category=${plumbingCat._id.toString()}`, {
    headers: vendorAuth
  });
  const plumbFeedData = await plumbFeedRes.json();
  const plumbJobs = plumbFeedData.jobs || [];
  assert(plumbJobs.length > 0, 'Plumbing feed returns jobs');
  assert(
    plumbJobs.every(j => (j.category?._id || j.category).toString() === plumbingCat._id.toString()),
    'Every returned job belongs strictly to Plumbing domain'
  );
  assert(
    !plumbJobs.some(j => (j.category?._id || j.category).toString() === acCat._id.toString()),
    'AC jobs are hidden when browsing Plumbing'
  );

  // 5d. Switch to Electrical Domain Only
  console.log('  -> Switching active browsing domain to Electrical only:');
  const elecFeedRes = await fetch(`${API_BASE}/jobs/open?category=${electricalCat._id.toString()}`, {
    headers: vendorAuth
  });
  const elecFeedData = await elecFeedRes.json();
  const elecJobs = elecFeedData.jobs || [];
  assert(elecJobs.length > 0, 'Electrical feed returns jobs');
  assert(
    elecJobs.every(j => (j.category?._id || j.category).toString() === electricalCat._id.toString()),
    'Every returned job belongs strictly to Electrical domain'
  );

  // --- STEP 6: Unapproved Domain Protection ---
  console.log('\n--- TEST 6: Unapproved domain does not grant access to its jobs ---');
  const cleanFeedRes = await fetch(`${API_BASE}/jobs/open?category=${cleaningCat._id.toString()}`, {
    headers: vendorAuth
  });
  const cleanFeedData = await cleanFeedRes.json();
  assert(cleanFeedData.jobs.length === 0, 'Query for unapproved Cleaning domain returns 0 jobs');
  assert(
    cleanFeedData.message?.includes('not registered'),
    `Response informs vendor: "${cleanFeedData.message}"`
  );

  // --- STEP 7: Remove a domain (Electrical) and verify immediate feed update ---
  console.log('\n--- TEST 7: Remove Electrical domain (keeping AC + Plumbing) ---');
  const removeRes = await fetch(`${API_BASE}/vendors/profile/me`, {
    method: 'PUT',
    headers: vendorAuth,
    body: JSON.stringify({
      categories: [acCat._id.toString(), plumbingCat._id.toString()]
    })
  });
  const removeData = await removeRes.json();
  assert(removeRes.status === 200, 'Removal update returns 200 OK');
  assert(removeData.vendor.categories.length === 2, 'Vendor profile now has 2 domains');

  // Verify feed now excludes Electrical jobs under All My Domains
  const feedAfterRemove = await fetch(`${API_BASE}/jobs/open`, { headers: vendorAuth });
  const feedAfterRemoveData = await feedAfterRemove.json();
  const jobsAfterRemove = feedAfterRemoveData.jobs || [];
  const hasElecAfterRemove = jobsAfterRemove.some(
    j => (j.category?._id || j.category).toString() === electricalCat._id.toString()
  );
  assert(!hasElecAfterRemove, 'Electrical jobs immediately disappear from feed after removing domain');

  // --- STEP 8: Attempt to remove all domains (0 domains blocked) ---
  console.log('\n--- TEST 8: Removing all domains (0 domains) is rejected ---');
  const zeroRes = await fetch(`${API_BASE}/vendors/profile/me`, {
    method: 'PUT',
    headers: vendorAuth,
    body: JSON.stringify({ categories: [] })
  });
  const zeroData = await zeroRes.json();
  assert(zeroRes.status === 400 && zeroData.success === false, 'Setting 0 domains returns 400 Bad Request');
  assert(
    zeroData.message?.includes('at least 1 service domain'),
    `Rejection message: "${zeroData.message}"`
  );

  console.log('\n=========================================');
  console.log(`📊 Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log('=========================================\n');

  // Cleanup
  await User.deleteMany({ email: { $in: [testVendorEmail, 'test_prof_domain_cust@worklogy.com'] } });
  await VendorProfile.deleteMany({ user: vendorId });
  await Job.deleteMany({
    title: { $in: ['TEST_PROF_AC_JOB', 'TEST_PROF_PLUMBING_JOB', 'TEST_PROF_ELECTRICAL_JOB', 'TEST_PROF_CLEANING_JOB'] }
  });

  await mongoose.disconnect();

  if (failed > 0) {
    process.exit(1);
  }
}

runProfileDomainsTest().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});

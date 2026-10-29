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

async function runTests() {
  console.log('🧪 Starting WorkLogy Vendor Multi-Domain & Strict Job Feed Filtering Test Suite...\n');

  await mongoose.connect(process.env.MONGO_URI);

  // 1. Fetch canonical categories
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

  // 2. Fetch or create Customer for posting test jobs
  let customerUser = await User.findOne({ email: 'test_domain_cust@worklogy.com' });
  if (!customerUser) {
    customerUser = await User.create({
      name: 'Domain Test Customer',
      email: 'test_domain_cust@worklogy.com',
      password: 'password123',
      role: 'customer',
      phone: '9988776655'
    });
  }

  // 3. Create active open jobs across domains in Lucknow
  const testJobAC = await Job.findOneAndUpdate(
    { title: 'TEST_AC_FILTER_JOB' },
    {
      title: 'TEST_AC_FILTER_JOB',
      description: 'AC Gas Refill and Coil Cleaning in Hazratganj',
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
      budget: { amount: 850, type: 'fixed' },
      isDeleted: false
    },
    { upsert: true, new: true }
  );

  const testJobPlumbing = await Job.findOneAndUpdate(
    { title: 'TEST_PLUMBING_FILTER_JOB' },
    {
      title: 'TEST_PLUMBING_FILTER_JOB',
      description: 'Kitchen Sink Drain Blockage Clearing in Hazratganj',
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
      budget: { amount: 600, type: 'fixed' },
      isDeleted: false
    },
    { upsert: true, new: true }
  );

  const testJobElectrical = await Job.findOneAndUpdate(
    { title: 'TEST_ELECTRICAL_FILTER_JOB' },
    {
      title: 'TEST_ELECTRICAL_FILTER_JOB',
      description: 'MCB Trip and Living Room Short Circuit in Hazratganj',
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
      budget: { amount: 550, type: 'fixed' },
      isDeleted: false
    },
    { upsert: true, new: true }
  );

  console.log('🛠️ Created / Verified Multi-Domain Opportunities:');
  console.log(`   AC Job ID:         ${testJobAC._id}`);
  console.log(`   Plumbing Job ID:   ${testJobPlumbing._id}`);
  console.log(`   Electrical Job ID: ${testJobElectrical._id}\n`);

  // Helper to cleanup temporary test users
  const cleanupEmails = [
    'vendor_1dom@test.com',
    'vendor_2dom@test.com',
    'vendor_3dom@test.com',
    'vendor_4dom@test.com',
    'vendor_dupdom@test.com',
    'vendor_plumb@test.com',
    'vendor_nodom@test.com'
  ];
  await User.deleteMany({ email: { $in: cleanupEmails } });
  const cleanedUsers = await User.find({ email: { $in: cleanupEmails } });
  if (cleanedUsers.length > 0) {
    await VendorProfile.deleteMany({ user: { $in: cleanedUsers.map(u => u._id) } });
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

  // --- TEST 1: Register Vendor with 1 domain ---
  console.log('--- TEST 1: Vendor selects 1 domain during registration ---');
  const reg1Res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Vendor OneDomain',
      email: 'vendor_1dom@test.com',
      password: 'password123',
      role: 'vendor',
      businessName: 'AC Cool Pro',
      categories: [acCat._id.toString()]
    })
  });
  const reg1Data = await reg1Res.json();
  assert(reg1Res.status === 201 && reg1Data.success, 'Registration with 1 domain returns 201 Created');
  const prof1 = await VendorProfile.findOne({ user: reg1Data.user.id });
  assert(prof1 && prof1.categories.length === 1, 'Vendor profile stored exactly 1 canonical domain');
  assert(prof1.categories[0].toString() === acCat._id.toString(), 'Stored domain matches AC domain ID');

  // --- TEST 2: Register Vendor with 2 domains ---
  console.log('\n--- TEST 2: Vendor selects 2 domains during registration ---');
  const reg2Res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Vendor TwoDomains',
      email: 'vendor_2dom@test.com',
      password: 'password123',
      role: 'vendor',
      businessName: 'AC and Plumbing Solutions',
      categories: [acCat._id.toString(), plumbingCat._id.toString()]
    })
  });
  const reg2Data = await reg2Res.json();
  assert(reg2Res.status === 201 && reg2Data.success, 'Registration with 2 domains returns 201 Created');
  const prof2 = await VendorProfile.findOne({ user: reg2Data.user.id });
  assert(prof2 && prof2.categories.length === 2, 'Vendor profile stored exactly 2 canonical domains');

  // --- TEST 3: Register Vendor with 3 domains ---
  console.log('\n--- TEST 3: Vendor selects 3 domains during registration ---');
  const reg3Res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Vendor ThreeDomains',
      email: 'vendor_3dom@test.com',
      password: 'password123',
      role: 'vendor',
      businessName: 'Tri-Trade Masters',
      categories: [acCat._id.toString(), plumbingCat._id.toString(), electricalCat._id.toString()]
    })
  });
  const reg3Data = await reg3Res.json();
  assert(reg3Res.status === 201 && reg3Data.success, 'Registration with 3 domains returns 201 Created');
  const prof3 = await VendorProfile.findOne({ user: reg3Data.user.id });
  assert(prof3 && prof3.categories.length === 3, 'Vendor profile stored exactly 3 canonical domains');

  // --- TEST 4: Register Vendor with 4 domains (BLOCKED) ---
  console.log('\n--- TEST 4: Selecting a fourth domain is blocked by backend ---');
  const reg4Res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Vendor FourDomains',
      email: 'vendor_4dom@test.com',
      password: 'password123',
      role: 'vendor',
      businessName: 'Quad Services',
      categories: [
        acCat._id.toString(),
        plumbingCat._id.toString(),
        electricalCat._id.toString(),
        cleaningCat._id.toString()
      ]
    })
  });
  const reg4Data = await reg4Res.json();
  assert(reg4Res.status === 400 && reg4Data.success === false, 'Registration with 4 domains returns 400 Bad Request');
  assert(
    reg4Data.message?.includes('maximum of 3 service domains'),
    `Error message explains limit: "${reg4Data.message}"`
  );
  const user4 = await User.findOne({ email: 'vendor_4dom@test.com' });
  assert(!user4, 'No orphaned user record created when 4 domains rejected');

  // --- TEST 5: Duplicate domain IDs are normalized ---
  console.log('\n--- TEST 5: Duplicate domain IDs are normalized/deduplicated ---');
  const regDupRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Vendor DupDomains',
      email: 'vendor_dupdom@test.com',
      password: 'password123',
      role: 'vendor',
      businessName: 'Dup Normalizer Pro',
      categories: [acCat._id.toString(), acCat._id.toString(), plumbingCat._id.toString()]
    })
  });
  const regDupData = await regDupRes.json();
  assert(regDupRes.status === 201, 'Registration with duplicates accepted after normalization');
  const profDup = await VendorProfile.findOne({ user: regDupData.user.id });
  assert(profDup && profDup.categories.length === 2, 'Duplicate IDs normalized down to 2 distinct domains');

  // --- TEST 6: Strict Job Feed for AC-only Vendor ---
  console.log('\n--- TEST 6: AC-only Vendor sees AC jobs but NO Plumbing or Electrical jobs ---');
  const feed1Res = await fetch(`${API_BASE}/jobs/open`, {
    headers: getAuthHeader(reg1Data.user.id)
  });
  const feed1Data = await feed1Res.json();
  assert(feed1Res.status === 200 && feed1Data.success, 'AC vendor successfully queries /jobs/open');
  const acVendorJobs = feed1Data.jobs || [];
  const hasAcJob = acVendorJobs.some(j => (j.category?._id || j.category).toString() === acCat._id.toString());
  const hasPlumbingJob = acVendorJobs.some(j => (j.category?._id || j.category).toString() === plumbingCat._id.toString());
  const hasElectricalJob = acVendorJobs.some(j => (j.category?._id || j.category).toString() === electricalCat._id.toString());
  assert(hasAcJob, 'AC-only vendor sees eligible AC jobs');
  assert(!hasPlumbingJob, 'AC-only vendor CANNOT see Plumbing jobs (strictly excluded)');
  assert(!hasElectricalJob, 'AC-only vendor CANNOT see Electrical jobs (strictly excluded)');

  // --- TEST 7: Strict Job Feed for Plumbing-only Vendor ---
  console.log('\n--- TEST 7: Plumbing-only Vendor sees Plumbing jobs but NO AC or Electrical jobs ---');
  const regPlumbRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Vendor PlumbingOnly',
      email: 'vendor_plumb@test.com',
      password: 'password123',
      role: 'vendor',
      businessName: 'Pure Plumbing Services',
      categories: [plumbingCat._id.toString()]
    })
  });
  const regPlumbData = await regPlumbRes.json();
  const feedPlumbRes = await fetch(`${API_BASE}/jobs/open`, {
    headers: getAuthHeader(regPlumbData.user.id)
  });
  const feedPlumbData = await feedPlumbRes.json();
  const plumbVendorJobs = feedPlumbData.jobs || [];
  const plumbHasPlumb = plumbVendorJobs.some(j => (j.category?._id || j.category).toString() === plumbingCat._id.toString());
  const plumbHasAc = plumbVendorJobs.some(j => (j.category?._id || j.category).toString() === acCat._id.toString());
  const plumbHasElec = plumbVendorJobs.some(j => (j.category?._id || j.category).toString() === electricalCat._id.toString());
  assert(plumbHasPlumb, 'Plumbing-only vendor sees Plumbing jobs');
  assert(!plumbHasAc, 'Plumbing-only vendor CANNOT see AC jobs (strictly excluded)');
  assert(!plumbHasElec, 'Plumbing-only vendor CANNOT see Electrical jobs (strictly excluded)');

  // --- TEST 8: Strict Job Feed for AC + Plumbing Vendor (Vendor 2) ---
  console.log('\n--- TEST 8: Vendor with AC + Plumbing sees both domains, but NOT Electrical ---');
  const feed2Res = await fetch(`${API_BASE}/jobs/open`, {
    headers: getAuthHeader(reg2Data.user.id)
  });
  const feed2Data = await feed2Res.json();
  const v2Jobs = feed2Data.jobs || [];
  const v2HasAc = v2Jobs.some(j => (j.category?._id || j.category).toString() === acCat._id.toString());
  const v2HasPlumb = v2Jobs.some(j => (j.category?._id || j.category).toString() === plumbingCat._id.toString());
  const v2HasElec = v2Jobs.some(j => (j.category?._id || j.category).toString() === electricalCat._id.toString());
  assert(v2HasAc, 'Dual-domain vendor sees AC jobs');
  assert(v2HasPlumb, 'Dual-domain vendor sees Plumbing jobs');
  assert(!v2HasElec, 'Dual-domain vendor CANNOT see Electrical jobs (strictly excluded)');

  // --- TEST 9: Domain filter options in response show only vendor approved domains ---
  console.log('\n--- TEST 9: Domain filter options reflect ONLY the vendor approved domains ---');
  const v1CoverageCategories = feed1Data.vendorCoverage?.categories || [];
  const v2CoverageCategories = feed2Data.vendorCoverage?.categories || [];
  assert(v1CoverageCategories.length === 1, 'Vendor 1 coverage has exactly 1 domain in filter options');
  assert(
    v1CoverageCategories[0]?.id === acCat._id.toString(),
    'Vendor 1 filter option is AC only'
  );
  assert(v2CoverageCategories.length === 2, 'Vendor 2 coverage has exactly 2 domains in filter options');
  assert(
    v2CoverageCategories.every(c => [acCat._id.toString(), plumbingCat._id.toString()].includes(c.id)),
    'Vendor 2 filter options are AC and Plumbing only'
  );

  // --- TEST 10: API requests cannot bypass domain restrictions via query parameters ---
  console.log('\n--- TEST 10: Direct API request cannot bypass domain restrictions with query param ---');
  // Vendor 1 (AC only) tries ?category=electricalCat._id
  const bypassRes = await fetch(`${API_BASE}/jobs/open?category=${electricalCat._id.toString()}`, {
    headers: getAuthHeader(reg1Data.user.id)
  });
  const bypassData = await bypassRes.json();
  assert(bypassRes.status === 200, 'Endpoint returns 200 safely');
  assert(bypassData.jobs.length === 0, 'Tampered query parameter returns 0 jobs (Bypass Blocked!)');

  // Vendor 1 calls general /jobs?category=electricalCat._id
  const generalBypassRes = await fetch(`${API_BASE}/jobs?category=${electricalCat._id.toString()}`, {
    headers: getAuthHeader(reg1Data.user.id)
  });
  const generalBypassData = await generalBypassRes.json();
  assert(generalBypassData.jobs.length === 0, 'General /jobs endpoint also blocks unauthorized category query (Bypass Blocked!)');

  // --- TEST 11: Job Creation & Category Integrity ---
  console.log('\n--- TEST 11: Job Creation rejects invalid category IDs instead of arbitrary fallback ---');
  const customerAuth = getAuthHeader(customerUser._id, 'customer');
  const badJobRes = await fetch(`${API_BASE}/jobs`, {
    method: 'POST',
    headers: customerAuth,
    body: JSON.stringify({
      title: 'Should Fail Job with Invalid Category',
      description: 'Testing invalid category rejection by customer job creation pipeline',
      category: 'completely_invalid_category_xyz',
      location: {
        address: 'Hazratganj, Lucknow',
        city: 'Lucknow',
        locality: 'Hazratganj',
        pincode: '226001'
      },
      budget: { amount: 500, type: 'fixed' }
    })
  });
  const badJobData = await badJobRes.json();
  assert(badJobRes.status === 400 && badJobData.success === false, 'Customer job with invalid category returns 400 Bad Request');
  assert(
    badJobData.message?.includes('invalid or currently inactive'),
    `Message specifies invalid category: "${badJobData.message}"`
  );

  // --- TEST 12: Vendor with 0 domains shows clear setup state ---
  console.log('\n--- TEST 12: Vendor with no valid selected domains shows clear setup/approval state ---');
  const userNoDom = await User.create({
    name: 'Vendor NoDomain',
    email: 'vendor_nodom@test.com',
    password: 'password123',
    role: 'vendor'
  });
  await VendorProfile.create({
    user: userNoDom._id,
    businessName: 'Pending Setup Services',
    categories: []
  });
  const feedNoDomRes = await fetch(`${API_BASE}/jobs/open`, {
    headers: getAuthHeader(userNoDom._id)
  });
  const feedNoDomData = await feedNoDomRes.json();
  assert(feedNoDomData.jobs.length === 0, 'Vendor with 0 domains receives 0 unrestricted jobs');
  assert(
    feedNoDomData.configurationStatus === 'missing_categories',
    'Returns configurationStatus: "missing_categories" to trigger clear setup UI'
  );

  console.log('\n=========================================');
  console.log(`📊 Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log('=========================================\n');

  // Clean up test records
  await User.deleteMany({ email: { $in: [...cleanupEmails, 'test_domain_cust@worklogy.com'] } });
  await VendorProfile.deleteMany({
    user: {
      $in: [
        reg1Data.user?.id,
        reg2Data.user?.id,
        reg3Data.user?.id,
        regDupData.user?.id,
        regPlumbData.user?.id,
        userNoDom._id
      ].filter(Boolean)
    }
  });
  await Job.deleteMany({
    title: { $in: ['TEST_AC_FILTER_JOB', 'TEST_PLUMBING_FILTER_JOB', 'TEST_ELECTRICAL_FILTER_JOB'] }
  });

  await mongoose.disconnect();

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});

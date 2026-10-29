import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import User from './src/models/User.js';
import VendorProfile from './src/models/VendorProfile.js';
import ServiceCategory from './src/models/ServiceCategory.js';
import ServiceListing from './src/models/ServiceListing.js';
import Booking from './src/models/Booking.js';
import jwt from 'jsonwebtoken';

const BASE_URL = 'http://localhost:5001/api';

function generateTestToken(userId, role = 'vendor') {
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET || 'worklogy-dev-secret-key-super-secure', {
    expiresIn: '7d'
  });
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

async function runTests() {
  console.log('\n============================================================');
  console.log('WorkLogy Service Creation Wizard & Domain Restriction Tests');
  console.log('============================================================\n');

  await mongoose.connect(process.env.MONGO_URI);

  // Load canonical categories
  const [elecCat, acCat, plumbCat, cctvCat, applianceCat] = await Promise.all([
    ServiceCategory.findOne({ slug: 'electrical-services' }),
    ServiceCategory.findOne({ slug: 'ac-hvac-services' }),
    ServiceCategory.findOne({ slug: 'plumbing-services' }),
    ServiceCategory.findOne({ slug: 'cctv-security' }),
    ServiceCategory.findOne({ slug: 'appliance-repair' })
  ]);

  // Find or create test vendor 1: Registered for Electrical and Appliance Repair only
  let testUser1 = await User.findOne({ email: 'test_wizard_vendor1@worklogy.com' });
  if (!testUser1) {
    testUser1 = await User.create({
      name: 'Wizard Vendor 1',
      email: 'test_wizard_vendor1@worklogy.com',
      password: 'password123',
      role: 'vendor',
      phone: '9998887771'
    });
  }

  let testProfile1 = await VendorProfile.findOne({ user: testUser1._id });
  if (!testProfile1) {
    testProfile1 = await VendorProfile.create({
      user: testUser1._id,
      businessName: 'Wizard Electricals',
      categories: [elecCat._id, applianceCat._id],
      approvalStatus: 'approved',
      city: 'Lucknow'
    });
  } else {
    testProfile1.categories = [elecCat._id, applianceCat._id];
    testProfile1.approvalStatus = 'approved';
    await testProfile1.save();
  }

  const token1 = generateTestToken(testUser1._id, 'vendor');

  // Clean up any existing test service listings for testUser1
  await ServiceListing.deleteMany({ vendor: testUser1._id });

  console.log('Test Suite 1: Domain Authorization & Category Restrictions');

  // 1. Try to create a service in an unapproved domain (e.g. AC & HVAC for an Electrical-only vendor)
  const unapprovedRes = await fetch(`${BASE_URL}/vendors/services`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token1}`
    },
    body: JSON.stringify({
      title: 'AC Gas Charging & Jet Cleaning',
      category: acCat._id,
      domain: acCat.slug,
      subcategory: 'AC Servicing',
      description: 'Professional high-pressure AC jet cleaning service.',
      pricing: { type: 'fixed', amount: 599 },
      experienceYears: 4
    })
  });
  const unapprovedData = await unapprovedRes.json();
  assert(
    unapprovedRes.status === 403,
    `Unapproved domain creation rejected with 403 Forbidden (status: ${unapprovedRes.status})`
  );
  assert(
    unapprovedData.message.includes('not authorized'),
    `Rejection message states authorization restriction: "${unapprovedData.message}"`
  );

  // 2. Try to create a service in an approved domain (Electrical Services)
  const approvedRes = await fetch(`${BASE_URL}/vendors/services`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token1}`
    },
    body: JSON.stringify({
      title: 'Ceiling Fan and Light Installation',
      category: elecCat._id,
      domain: elecCat.slug,
      subcategory: 'Fan and Light Installation',
      description: 'Expert installation of ceiling fans, chandeliers and decorative lighting fixtures.',
      pricing: { type: 'fixed', amount: 350 },
      experienceYears: 5
    })
  });
  const approvedData = await approvedRes.json();
  assert(
    approvedRes.status === 201 && approvedData.success,
    `Approved domain service created successfully (status: ${approvedRes.status})`
  );
  assert(
    approvedData.service?.domain === 'electrical-services',
    `Service created with canonical domain "electrical-services"`
  );

  console.log('\nTest Suite 2: Subcategory Validation & "Other" Custom Services');

  // 3. Mismatched subcategory: Electrical domain but AC subcategory
  const mismatchRes = await fetch(`${BASE_URL}/vendors/services`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token1}`
    },
    body: JSON.stringify({
      title: 'Compressor Repair Service',
      category: elecCat._id,
      domain: elecCat.slug,
      subcategory: 'Compressor Repair', // belongs to AC, not Electrical
      description: 'Compressor fault diagnostics.',
      pricing: { type: 'fixed', amount: 800 },
      experienceYears: 3
    })
  });
  const mismatchData = await mismatchRes.json();
  assert(
    mismatchRes.status === 400,
    `Mismatched subcategory rejected with 400 Bad Request (status: ${mismatchRes.status})`
  );
  assert(
    mismatchData.message.includes('does not belong to'),
    `Message identifies subcategory mismatch: "${mismatchData.message}"`
  );

  // 4. Custom Subcategory ("Other"): valid custom task name
  const customValidRes = await fetch(`${BASE_URL}/vendors/services`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token1}`
    },
    body: JSON.stringify({
      title: 'Inverter Battery Descaling & Maintenance',
      category: elecCat._id,
      domain: elecCat.slug,
      subcategory: 'Other',
      isCustom: true,
      customSubcategory: 'Inverter Battery Descaling',
      description: 'Specialized chemical descaling of tubular inverter battery terminals.',
      pricing: { type: 'fixed', amount: 499 },
      experienceYears: 4
    })
  });
  const customValidData = await customValidRes.json();
  assert(
    customValidRes.status === 201 && customValidData.success,
    `Valid custom "Other" service created successfully (status: ${customValidRes.status})`
  );
  assert(
    customValidData.service?.subcategory === 'Inverter Battery Descaling' && customValidData.service?.isCustom === true,
    `Custom service persisted with resolved subcategory and isCustom flag`
  );

  // 5. Custom Subcategory ("Other"): invalid empty or short name (< 3 chars)
  const customInvalidRes = await fetch(`${BASE_URL}/vendors/services`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token1}`
    },
    body: JSON.stringify({
      title: 'Custom Electrical Work',
      category: elecCat._id,
      domain: elecCat.slug,
      subcategory: 'Other',
      isCustom: true,
      customSubcategory: 'x', // too short!
      description: 'Short name test.',
      pricing: { type: 'fixed', amount: 300 },
      experienceYears: 2
    })
  });
  assert(
    customInvalidRes.status === 400,
    `Short custom task name (< 3 chars) rejected with 400 Bad Request`
  );

  console.log('\nTest Suite 3: Experience Years & Input Sanitization');

  // 6. Invalid negative experience years
  const negExpRes = await fetch(`${BASE_URL}/vendors/services`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token1}`
    },
    body: JSON.stringify({
      title: 'Switchboard Repair Service',
      category: elecCat._id,
      domain: elecCat.slug,
      subcategory: 'Switchboard Repair',
      description: 'Safe switchboard diagnostics and fixing.',
      pricing: { type: 'fixed', amount: 250 },
      experienceYears: -2 // invalid!
    })
  });
  assert(
    negExpRes.status === 400,
    `Negative experience years rejected with 400 Bad Request (status: ${negExpRes.status})`
  );

  // 7. Excessive experience (> 50 years)
  const overExpRes = await fetch(`${BASE_URL}/vendors/services`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token1}`
    },
    body: JSON.stringify({
      title: 'Switchboard Repair Service',
      category: elecCat._id,
      domain: elecCat.slug,
      subcategory: 'Switchboard Repair',
      description: 'Safe switchboard diagnostics and fixing.',
      pricing: { type: 'fixed', amount: 250 },
      experienceYears: 99 // invalid!
    })
  });
  assert(
    overExpRes.status === 400,
    `Excessive experience years (> 50) rejected with 400 Bad Request (status: ${overExpRes.status})`
  );

  console.log('\nTest Suite 4: Idempotency & Duplicate Prevention');

  const testIdempotencyKey = `idem_${Date.now()}_test_key_12345`;

  // 8. Create service with idempotency key
  const idemRes1 = await fetch(`${BASE_URL}/vendors/services`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-idempotency-key': testIdempotencyKey,
      Authorization: `Bearer ${token1}`
    },
    body: JSON.stringify({
      title: 'Switchboard Repair & Modular Socket Fixing',
      category: elecCat._id,
      domain: elecCat.slug,
      subcategory: 'Switchboard Repair',
      description: 'Professional modular switchboard replacement with surge protection.',
      pricing: { type: 'fixed', amount: 299 },
      experienceYears: 6
    })
  });
  const idemData1 = await idemRes1.json();
  assert(
    idemRes1.status === 201 && idemData1.success,
    `Initial request with idempotency key created service ID ${idemData1.service?._id}`
  );

  // 9. Repeat request with identical idempotency key (simulating retry or double tap)
  const idemRes2 = await fetch(`${BASE_URL}/vendors/services`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-idempotency-key': testIdempotencyKey,
      Authorization: `Bearer ${token1}`
    },
    body: JSON.stringify({
      title: 'Switchboard Repair & Modular Socket Fixing',
      category: elecCat._id,
      domain: elecCat.slug,
      subcategory: 'Switchboard Repair',
      description: 'Professional modular switchboard replacement with surge protection.',
      pricing: { type: 'fixed', amount: 299 },
      experienceYears: 6
    })
  });
  const idemData2 = await idemRes2.json();
  assert(
    idemRes2.status === 200 && idemData2.success,
    `Repeated request with same idempotency key returned 200 OK (status: ${idemRes2.status})`
  );
  assert(
    idemData2.service?._id === idemData1.service?._id,
    `Idempotent response returned the exact same service ID without duplicate creation`
  );

  // 10. Attempt to create a duplicate active listing for same vendor + category + subcategory without matching idempotency key
  const dupRes = await fetch(`${BASE_URL}/vendors/services`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token1}`
    },
    body: JSON.stringify({
      title: 'Another Switchboard Service',
      category: elecCat._id,
      domain: elecCat.slug,
      subcategory: 'Switchboard Repair', // already exists for this vendor!
      description: 'Attempting to create duplicate listing.',
      pricing: { type: 'fixed', amount: 320 },
      experienceYears: 5
    })
  });
  const dupData = await dupRes.json();
  assert(
    dupRes.status === 409,
    `Duplicate active listing rejected with 409 Conflict (status: ${dupRes.status})`
  );
  assert(
    dupData.message.includes('already have an active listing'),
    `409 response offers clear message: "${dupData.message}"`
  );

  // Verify total count in DB for this vendor is exactly 3 (Fan & Light, Inverter Descaling, Switchboard)
  const vendorListingsCount = await ServiceListing.countDocuments({
    vendor: testUser1._id,
    status: { $ne: 'archived' }
  });
  assert(
    vendorListingsCount === 3,
    `Database confirms exactly 3 active listings exist for vendor (no duplicates inserted)`
  );

  console.log('\nTest Suite 5: My Services Listing & Dynamic Data Enrichment');

  // 11. Call getMyServices and verify real booking counts & populated categories
  const myServicesRes = await fetch(`${BASE_URL}/vendors/services/my`, {
    headers: {
      Authorization: `Bearer ${token1}`
    }
  });
  const myServicesData = await myServicesRes.json();
  assert(
    myServicesRes.status === 200 && myServicesData.success,
    `getMyServices returns 200 OK with count: ${myServicesData.count}`
  );
  assert(
    myServicesData.services.length === 3,
    `Returned services array contains exactly 3 active services`
  );
  const firstItem = myServicesData.services[0];
  assert(
    firstItem.category && typeof firstItem.category === 'object' && firstItem.category.name,
    `Service category is populated with canonical object: "${firstItem.category?.name}"`
  );
  assert(
    typeof firstItem.bookingCount === 'number',
    `Dynamic bookingCount is computed and returned as number: ${firstItem.bookingCount}`
  );

  console.log('\nTest Suite 6: VendorProfile Security & Unapproved Category Prevention');

  // 12. Verify that creating services did NOT inject unapproved categories into VendorProfile.categories
  const updatedProfile1 = await VendorProfile.findOne({ user: testUser1._id });
  const profileCatIds = updatedProfile1.categories.map(c => c.toString());
  assert(
    profileCatIds.length === 2 && !profileCatIds.includes(acCat._id.toString()) && !profileCatIds.includes(plumbCat._id.toString()),
    `VendorProfile categories untouched; unapproved categories cannot be smuggled via service creation`
  );

  // Cleanup test data
  await ServiceListing.deleteMany({ vendor: testUser1._id });
  await VendorProfile.deleteOne({ _id: testProfile1._id });
  await User.deleteOne({ _id: testUser1._id });

  await mongoose.disconnect();

  console.log('\n============================================================');
  console.log(`Test Execution Finished: ${passed} Passed, ${failed} Failed`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test runner encountered unexpected error:', err);
  process.exit(1);
});

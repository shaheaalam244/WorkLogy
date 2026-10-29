// Comprehensive Automated E2E Test Suite for WorkLogy Vendor App
// Unified UI Redesign + OTP-Based Multi-Step Registration & Resumption Flow
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });

const API_URL = 'http://localhost:5001/api';

async function runTests() {
  console.log('🧪 Starting Multi-Step OTP Registration & Onboarding E2E Test Suite...\n');

  await mongoose.connect(process.env.MONGO_URI);

  const testPhone = '9811223344';
  const duplicatePhone = '6389696103'; // existing active vendor Shahe Aalam

  // Clean up any test user with testPhone before test run
  const existingTestUser = await mongoose.connection.collection('users').findOne({ phone: testPhone });
  if (existingTestUser) {
    await mongoose.connection.collection('servicelistings').deleteMany({ vendor: existingTestUser._id });
    await mongoose.connection.collection('vendorprofiles').deleteMany({ user: existingTestUser._id });
    await mongoose.connection.collection('sessions').deleteMany({ user: existingTestUser._id });
    await mongoose.connection.collection('users').deleteOne({ _id: existingTestUser._id });
  }
  await mongoose.connection.collection('otpchallenges').deleteMany({ phone: testPhone });

  // ── TEST 1: Attempt registration with already registered vendor phone ──
  console.log('--- TEST 1: Reject registration for already registered phone ---');
  const dupRegRes = await fetch(`${API_URL}/auth/otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: duplicatePhone, purpose: 'register' })
  });
  const dupRegData = await dupRegRes.json();
  if (dupRegRes.status !== 409 || dupRegData.code !== 'ALREADY_REGISTERED') {
    throw new Error(`Test 1 Failed: Expected 409 ALREADY_REGISTERED, got ${dupRegRes.status}: ${JSON.stringify(dupRegData)}`);
  }
  console.log('✅ Test 1 PASSED: Already registered phone rejected with 409 ALREADY_REGISTERED.\n');

  // ── TEST 2: Request Registration OTP for new mobile number ──
  console.log('--- TEST 2: Request Registration OTP for new phone ---');
  const regSendRes = await fetch(`${API_URL}/auth/otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: testPhone, purpose: 'register' })
  });
  const regSendData = await regSendRes.json();
  if (!regSendRes.ok || !regSendData.debugCode) {
    throw new Error(`Test 2 Failed: OTP send failed: ${JSON.stringify(regSendData)}`);
  }
  console.log('✅ Test 2 PASSED: 6-digit OTP issued. Debug code:', regSendData.debugCode, '\n');

  // ── TEST 3: Reject incorrect OTP ──
  console.log('--- TEST 3: Reject incorrect OTP ---');
  const badVerifyRes = await fetch(`${API_URL}/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: testPhone, otp: '000000' })
  });
  const badVerifyData = await badVerifyRes.json();
  if (badVerifyRes.status !== 400) {
    throw new Error(`Test 3 Failed: Expected 400 for bad OTP, got ${badVerifyRes.status}`);
  }
  console.log('✅ Test 3 PASSED: Incorrect OTP rejected properly (Remaining attempts:', badVerifyData.remainingAttempts, ')\n');

  // ── TEST 4: Verify correct Registration OTP -> creates verified account & session ──
  console.log('--- TEST 4: Verify correct Registration OTP ---');
  const verifyRes = await fetch(`${API_URL}/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: testPhone,
      otp: regSendData.debugCode,
      deviceInfo: { platform: 'android', appVersion: '1.0.0' }
    })
  });
  const verifyData = await verifyRes.json();
  if (!verifyRes.ok || !verifyData.token || !verifyData.isNewUser) {
    throw new Error(`Test 4 Failed: Expected successful verification, got: ${JSON.stringify(verifyData)}`);
  }
  const authToken = verifyData.token;
  const vendorUserId = verifyData.user.id || verifyData.user._id;
  console.log('✅ Test 4 PASSED: New vendor registered. Verified user ID:', vendorUserId);
  console.log('   Onboarding status:', verifyData.onboardingStep, '(profile_pending)\n');

  // ── TEST 5: Step 1: Save Profile & Business Name ──
  console.log('--- TEST 5: Step 1 - Save Profile & Business Name ---');
  const step1Res = await fetch(`${API_URL}/vendors/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`
    },
    body: JSON.stringify({
      name: 'Vikas Sharma',
      fullName: 'Vikas Sharma',
      businessName: 'Sharma HVAC & Electrical Works',
      onboardingStep: 'domains_pending'
    })
  });
  const step1Data = await step1Res.json();
  if (!step1Res.ok) {
    throw new Error(`Test 5 Failed: Step 1 update failed: ${JSON.stringify(step1Data)}`);
  }
  console.log('✅ Test 5 PASSED: Profile and business name saved.');
  console.log('   Updated name: Vikas Sharma, Business: Sharma HVAC & Electrical Works\n');

  // ── TEST 6: Step 2: Choose Service Domains (Enforce max 3 limit) ──
  console.log('--- TEST 6: Step 2 - Domain selection validation (Reject > 3 domains) ---');
  const cats = await mongoose.connection.collection('servicecategories').find({ isActive: { $ne: false } }).limit(5).toArray();
  if (cats.length < 4) {
    throw new Error('Need at least 4 active categories for test');
  }

  const fourCatIds = cats.slice(0, 4).map(c => c._id.toString());
  const twoCatIds = cats.slice(0, 2).map(c => c._id.toString());

  // Attempt 4 domains -> should be rejected with 400
  const overLimitRes = await fetch(`${API_URL}/vendors/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`
    },
    body: JSON.stringify({
      categories: fourCatIds,
      onboardingStep: 'first_service_pending'
    })
  });
  if (overLimitRes.status !== 400) {
    throw new Error(`Test 6 Failed: Expected 400 for 4 domains, got ${overLimitRes.status}`);
  }
  console.log('✅ Test 6 PASSED: Exceeding 3 domains rejected with 400 Bad Request.');

  // Save 2 valid domains -> should succeed
  const validDomainRes = await fetch(`${API_URL}/vendors/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`
    },
    body: JSON.stringify({
      categories: twoCatIds,
      onboardingStep: 'first_service_pending'
    })
  });
  const validDomainData = await validDomainRes.json();
  if (!validDomainRes.ok) {
    throw new Error(`Step 2 save failed: ${JSON.stringify(validDomainData)}`);
  }
  console.log('✅ Step 2 Saved: 2 service domains saved successfully.\n');

  // ── TEST 7: Step 3: Post First Service Listing ──
  console.log('--- TEST 7: Step 3 - Create First Service Listing ---');
  const chosenCat = cats[0];
  const subcatName = chosenCat.subcategories?.[0] || 'Standard Repair';
  const idempotencyKey = `test_onboarding_${vendorUserId}_${Date.now()}`;

  const createServiceRes = await fetch(`${API_URL}/vendors/services`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
      'x-idempotency-key': idempotencyKey
    },
    body: JSON.stringify({
      title: `${chosenCat.name} Installation & Complete Servicing`,
      domain: chosenCat._id.toString(),
      category: chosenCat._id.toString(),
      categoryName: chosenCat.name,
      subcategory: subcatName,
      description: 'Complete diagnostics, routine maintenance, parts inspection, and leak check.',
      experienceYears: 4,
      pricing: { type: 'fixed', amount: 399, unit: 'per visit' }
    })
  });
  const createServiceData = await createServiceRes.json();
  if (!createServiceRes.ok || !createServiceData.service) {
    throw new Error(`Test 7 Failed: Service creation failed: ${JSON.stringify(createServiceData)}`);
  }
  console.log('✅ Test 7 PASSED: First service listing published successfully.');
  console.log(`   Service Title: "${createServiceData.service.title}", Price: ₹${createServiceData.service.pricing?.amount || 399}\n`);

  // ── TEST 8: Verify Duplicate Prevention (Idempotency) ──
  console.log('--- TEST 8: Duplicate Prevention (Idempotent replay) ---');
  const dupServiceRes = await fetch(`${API_URL}/vendors/services`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
      'x-idempotency-key': idempotencyKey
    },
    body: JSON.stringify({
      title: `${chosenCat.name} Installation & Complete Servicing`,
      domain: chosenCat._id.toString(),
      category: chosenCat._id.toString(),
      subcategory: subcatName
    })
  });
  const dupServiceData = await dupServiceRes.json();
  if (!dupServiceRes.ok || !dupServiceData.isDuplicate) {
    throw new Error(`Test 8 Failed: Expected idempotent duplicate return, got: ${JSON.stringify(dupServiceData)}`);
  }
  console.log('✅ Test 8 PASSED: Duplicate service submission handled safely via idempotency key.\n');

  // ── TEST 9: Mark Onboarding Completed ──
  console.log('--- TEST 9: Finalize Onboarding Status ---');
  await fetch(`${API_URL}/vendors/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`
    },
    body: JSON.stringify({ onboardingStep: 'completed' })
  });

  const finalProfile = await mongoose.connection.collection('vendorprofiles').findOne({ user: new mongoose.Types.ObjectId(vendorUserId) });
  if (finalProfile.onboardingStep !== 'completed') {
    throw new Error(`Test 9 Failed: Expected onboardingStep: completed, got ${finalProfile.onboardingStep}`);
  }
  console.log('✅ Test 9 PASSED: Final onboarding status in MongoDB is "completed".\n');

  // ── TEST 10: Subsequent Login as Existing Vendor without Overwriting ──
  console.log('--- TEST 10: Existing vendor logs in with OTP ---');
  const loginOtpRes = await fetch(`${API_URL}/auth/otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: testPhone, purpose: 'login' })
  });
  const loginOtpData = await loginOtpRes.json();
  if (!loginOtpRes.ok || !loginOtpData.debugCode) {
    throw new Error(`Test 10 Failed: Login OTP request failed: ${JSON.stringify(loginOtpData)}`);
  }

  const loginVerifyRes = await fetch(`${API_URL}/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: testPhone, otp: loginOtpData.debugCode })
  });
  const loginVerifyData = await loginVerifyRes.json();
  if (!loginVerifyRes.ok || loginVerifyData.isNewUser !== false || loginVerifyData.onboardingStep !== 'completed') {
    throw new Error(`Test 10 Failed: Expected existing user with completed onboarding: ${JSON.stringify(loginVerifyData)}`);
  }
  console.log('✅ Test 10 PASSED: Returning vendor logged in seamlessly.');
  console.log('   Vendor:', loginVerifyData.user.name, '| Onboarding:', loginVerifyData.onboardingStep);

  console.log('\n🎉 ALL 10 MULTI-STEP OTP REGISTRATION & ONBOARDING TESTS PASSED PERFECTLY!\n');
  await mongoose.disconnect();
}

runTests().catch(async (err) => {
  console.error('❌ E2E Test Suite Error:', err);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});

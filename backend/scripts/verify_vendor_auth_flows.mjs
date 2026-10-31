import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import '../src/models/User.js';
import '../src/models/VendorProfile.js';
import '../src/models/CustomerProfile.js';
import '../src/models/OtpChallenge.js';
import '../src/models/Session.js';
import { hashOtp } from '../src/utils/otp.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const API_BASE = 'http://localhost:5001/api';

async function runVendorAuthTests() {
  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected successfully.');

  const User = mongoose.model('User');
  const VendorProfile = mongoose.model('VendorProfile');
  const OtpChallenge = mongoose.model('OtpChallenge');
  const Session = mongoose.model('Session');

  const testPhone = '9999900088';
  // Clean up any previous test artifacts
  await User.deleteMany({ phone: testPhone });
  await OtpChallenge.deleteMany({ phone: testPhone });

  const results = [];
  function record(title, passed, details) {
    results.push({ title, passed, details });
    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${title}: ${details}`);
  }

  try {
    // -------------------------------------------------------------
    // Test 1: New Mobile Number Detection (Pre-flight check)
    // -------------------------------------------------------------
    console.log('\n--- 1. Pre-flight Check on New Number ---');
    const checkRes = await fetch(`${API_BASE}/auth/vendor/check-phone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: testPhone })
    });
    const checkData = await checkRes.json();
    const t1 = checkData.success === true && checkData.isRegistered === false && checkData.status === 'new';
    record('1. New Number Detection', t1, `exists=${checkData.exists}, status=${checkData.status}`);

    // -------------------------------------------------------------
    // Test 2: Login OTP on Unregistered Number -> Returns NOT_REGISTERED
    // -------------------------------------------------------------
    console.log('\n--- 2. Login OTP on Unregistered Number ---');
    const loginOtpRes = await fetch(`${API_BASE}/auth/otp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: testPhone, purpose: 'login', role: 'vendor' })
    });
    const loginOtpData = await loginOtpRes.json();
    const t2 = loginOtpRes.status === 404 && loginOtpData.code === 'NOT_REGISTERED' && loginOtpData.isRegistered === false;
    record('2. Login OTP on New Number Rejection', t2, `status=${loginOtpRes.status}, code=${loginOtpData.code}`);

    // -------------------------------------------------------------
    // Test 3: Registration OTP on New Number -> Dispatched
    // -------------------------------------------------------------
    console.log('\n--- 3. Registration OTP Dispatch ---');
    await OtpChallenge.deleteMany({ phone: testPhone });

    const regOtpRes = await fetch(`${API_BASE}/auth/otp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: testPhone, purpose: 'register', role: 'vendor' })
    });
    const regOtpData = await regOtpRes.json();

    // Set known OTP hash for verification testing
    const knownRegOtp = '582914';
    await OtpChallenge.updateMany(
      { phone: testPhone, purpose: 'vendor_register' },
      { $set: { codeHash: hashOtp(knownRegOtp) } }
    );
    const challenge1 = await OtpChallenge.findOne({ phone: testPhone, purpose: 'vendor_register' }).sort({ createdAt: -1 });

    const t3 = regOtpRes.status === 200 && regOtpData.success === true && challenge1 !== null;
    record('3. Registration OTP Accepted', t3, `status=${regOtpRes.status}, purpose=${challenge1?.purpose}`);

    // -------------------------------------------------------------
    // Test 4: Invalid OTP Verification Rejection
    // -------------------------------------------------------------
    console.log('\n--- 4. Invalid OTP Rejection ---');
    const invalidVerifyRes = await fetch(`${API_BASE}/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: testPhone, otp: '000000' })
    });
    const invalidVerifyData = await invalidVerifyRes.json();
    const t4 = invalidVerifyRes.status === 400 && invalidVerifyData.code === 'INVALID_OTP';
    record('4. Invalid OTP Rejected', t4, `status=${invalidVerifyRes.status}, code=${invalidVerifyData.code}`);

    // -------------------------------------------------------------
    // Test 5: Verify Correct Registration OTP -> Creates Vendor
    // -------------------------------------------------------------
    console.log('\n--- 5. Verify Correct Registration OTP ---');
    const validVerifyRes = await fetch(`${API_BASE}/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: testPhone, otp: knownRegOtp })
    });
    const validVerifyData = await validVerifyRes.json();
    const dbVendor = await User.findOne({ phone: testPhone, role: 'vendor' });
    const dbProfile = await VendorProfile.findOne({ user: dbVendor?._id });

    const t5 =
      validVerifyRes.status === 200 &&
      validVerifyData.success === true &&
      validVerifyData.isNewUser === true &&
      dbVendor !== null &&
      dbProfile !== null &&
      dbProfile.onboardingStep === 'profile_pending';
    record('5. Vendor Account Created', t5, `userId=${dbVendor?._id}, onboardingStep=${dbProfile?.onboardingStep}`);

    const vendorToken = validVerifyData.token;
    const vendorRefreshToken = validVerifyData.refreshToken;

    // -------------------------------------------------------------
    // Test 6: Vendor Onboarding Profile Setup
    // -------------------------------------------------------------
    console.log('\n--- 6. Vendor Onboarding Profile Setup ---');
    const updateProfileRes = await fetch(`${API_BASE}/users/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${vendorToken}`
      },
      body: JSON.stringify({
        name: 'Master Rajesh Electricals',
        email: 'rajesh.electricals2026@gmail.com'
      })
    });
    const updateProfileData = await updateProfileRes.json();
    const dbVendorAfterUpdate = await User.findById(dbVendor._id);
    const t6 =
      updateProfileData.success === true &&
      dbVendorAfterUpdate.name === 'Master Rajesh Electricals' &&
      dbVendorAfterUpdate.email === 'rajesh.electricals2026@gmail.com';
    record('6. Profile Setup Saved in DB', t6, `name="${dbVendorAfterUpdate.name}", email="${dbVendorAfterUpdate.email}"`);

    // -------------------------------------------------------------
    // Test 7: Duplicate Registration Attempt Blocked
    // -------------------------------------------------------------
    console.log('\n--- 7. Duplicate Registration Blocked ---');
    await OtpChallenge.deleteMany({ phone: testPhone });
    const dupRegRes = await fetch(`${API_BASE}/auth/otp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: testPhone, purpose: 'register', role: 'vendor' })
    });
    const dupRegData = await dupRegRes.json();
    const t7 = dupRegRes.status === 409 && dupRegData.code === 'ALREADY_REGISTERED';
    record('7. Duplicate Registration Blocked', t7, `status=${dupRegRes.status}, code=${dupRegData.code}`);

    // -------------------------------------------------------------
    // Test 8: Pre-flight Check on Existing Number
    // -------------------------------------------------------------
    console.log('\n--- 8. Pre-flight Check on Existing Number ---');
    const checkExistingRes = await fetch(`${API_BASE}/auth/vendor/check-phone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: testPhone })
    });
    const checkExistingData = await checkExistingRes.json();
    const t8 =
      checkExistingData.success === true &&
      checkExistingData.isRegistered === true &&
      checkExistingData.status === 'active' &&
      checkExistingData.name === 'Master Rajesh Electricals';
    record('8. Existing Vendor Detected', t8, `isRegistered=${checkExistingData.isRegistered}, name=${checkExistingData.name}`);

    // -------------------------------------------------------------
    // Test 9: Existing Vendor Login OTP Dispatch
    // -------------------------------------------------------------
    console.log('\n--- 9. Existing Vendor Login OTP ---');
    await OtpChallenge.deleteMany({ phone: testPhone });
    const loginSendRes = await fetch(`${API_BASE}/auth/otp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: testPhone, purpose: 'login', role: 'vendor' })
    });
    const loginSendData = await loginSendRes.json();

    const knownLoginOtp = '739104';
    await OtpChallenge.updateMany(
      { phone: testPhone, purpose: 'vendor_login' },
      { $set: { codeHash: hashOtp(knownLoginOtp) } }
    );
    const challenge2 = await OtpChallenge.findOne({ phone: testPhone, purpose: 'vendor_login' }).sort({ createdAt: -1 });

    const t9 = loginSendRes.status === 200 && loginSendData.success === true && challenge2 !== null;
    record('9. Existing Vendor OTP Sent', t9, `status=${loginSendRes.status}, purpose=${challenge2?.purpose}`);

    // -------------------------------------------------------------
    // Test 10: Existing Vendor OTP Verify -> Authenticates without overwriting data
    // -------------------------------------------------------------
    console.log('\n--- 10. Existing Vendor OTP Verify ---');
    const loginVerifyRes = await fetch(`${API_BASE}/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: testPhone, otp: knownLoginOtp })
    });
    const loginVerifyData = await loginVerifyRes.json();
    const t10 =
      loginVerifyRes.status === 200 &&
      loginVerifyData.isNewUser === false &&
      loginVerifyData.user.name === 'Master Rajesh Electricals' &&
      loginVerifyData.user.email === 'rajesh.electricals2026@gmail.com' &&
      loginVerifyData.user.phone === testPhone;
    record('10. Existing Vendor Login & Data Preserved', t10, `isNewUser=${loginVerifyData.isNewUser}, name="${loginVerifyData.user.name}"`);

    // -------------------------------------------------------------
    // Test 11: Refresh Token Session Renewal
    // -------------------------------------------------------------
    console.log('\n--- 11. Refresh Token Session Renewal ---');
    const refreshRes = await fetch(`${API_BASE}/auth/token/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: loginVerifyData.refreshToken })
    });
    const refreshData = await refreshRes.json();
    const t11 = refreshRes.status === 200 && refreshData.success === true && typeof refreshData.token === 'string';
    record('11. Refresh Token Session Renewed', t11, `status=${refreshRes.status}, newTokenLength=${refreshData.token?.length}`);

    // -------------------------------------------------------------
    // Test 12: Blocked / Suspended Vendor Enforcement
    // -------------------------------------------------------------
    console.log('\n--- 12. Suspended Vendor Handling ---');
    await User.findByIdAndUpdate(dbVendor._id, {
      status: 'suspended',
      suspensionReason: 'Document review required'
    });

    const suspendedCheckRes = await fetch(`${API_BASE}/auth/vendor/check-phone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: testPhone })
    });
    const suspendedCheckData = await suspendedCheckRes.json();

    await OtpChallenge.deleteMany({ phone: testPhone });
    const suspendedOtpRes = await fetch(`${API_BASE}/auth/otp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: testPhone, purpose: 'login', role: 'vendor' })
    });
    const suspendedOtpData = await suspendedOtpRes.json();

    const t12 =
      suspendedCheckData.status === 'suspended' &&
      suspendedOtpRes.status === 403 &&
      suspendedOtpData.message.includes('Document review required');
    record('12. Suspended Vendor Blocked with Reason', t12, `checkStatus=${suspendedCheckData.status}, otpStatus=${suspendedOtpRes.status}`);

    // -------------------------------------------------------------
    // Test 13: Phone Tampering Protection
    // -------------------------------------------------------------
    console.log('\n--- 13. Phone Tampering Protection ---');
    await User.findByIdAndUpdate(dbVendor._id, { status: 'active' });
    const tamperRes = await fetch(`${API_BASE}/users/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${vendorToken}`
      },
      body: JSON.stringify({ phone: '9876543210' })
    });
    const dbAfterTamper = await User.findById(dbVendor._id);
    const t13 = dbAfterTamper.phone === testPhone;
    record('13. Verified Phone Protected from Tampering', t13, `DB phone preserved="${dbAfterTamper.phone}"`);

  } finally {
    console.log('\nCleaning up test vendor artifacts...');
    const userToClean = await User.findOne({ phone: testPhone, role: 'vendor' });
    if (userToClean) {
      await VendorProfile.deleteMany({ user: userToClean._id });
      await Session.deleteMany({ user: userToClean._id });
      await User.deleteMany({ _id: userToClean._id });
    }
    await OtpChallenge.deleteMany({ phone: testPhone });
    await mongoose.disconnect();
    console.log('MongoDB disconnected.');
  }

  console.log('\n=======================================');
  console.log('VENDOR AUTH TEST SUMMARY:');
  const allPassed = results.every(r => r.passed);
  console.log(`Total tests: ${results.length}, All Passed: ${allPassed ? 'YES' : 'NO'}`);
  console.log('=======================================');
  if (!allPassed) {
    process.exit(1);
  }
}

runVendorAuthTests().catch(err => {
  console.error('Vendor test execution error:', err);
  process.exit(1);
});

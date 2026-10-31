import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import '../src/models/User.js';
import '../src/models/CustomerProfile.js';
import '../src/models/Session.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const API_BASE = 'http://localhost:5001/api';

async function runTests() {
  console.log('Connecting to MongoDB for verification...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected successfully.');

  const User = mongoose.model('User');
  const CustomerProfile = mongoose.model('CustomerProfile');
  const Session = mongoose.model('Session');

  const testPhone = '9999900001';
  // Clean up any previous test user
  await User.deleteMany({ phone: testPhone });

  const results = [];

  function record(title, passed, details) {
    results.push({ title, passed, details });
    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${title}: ${details}`);
  }

  try {
    // -------------------------------------------------------------
    // Test Case 1: New customer with only verified mobile number
    // -------------------------------------------------------------
    console.log('\n--- Case 1: New customer with only verified mobile number ---');
    const dummyEmail = `customer_${testPhone}_${Date.now()}@worklogy.local`;
    const user1 = await User.create({
      name: 'New Customer',
      email: dummyEmail,
      phone: testPhone,
      role: 'customer',
      password: 'testpassword123',
      isVerified: true
    });
    await CustomerProfile.create({
      user: user1._id,
      onboardingStep: 'profile_pending'
    });

    const token1 = jwt.sign(
      { id: user1._id.toString(), role: 'customer' },
      process.env.JWT_SECRET || 'worklogy_super_secret_jwt_key_2026_secure',
      { expiresIn: '15m' }
    );

    // Fetch profile via GET /api/users/profile
    const res1 = await fetch(`${API_BASE}/users/profile`, {
      headers: { Authorization: `Bearer ${token1}` }
    });
    const data1 = await res1.json();

    const case1Pass =
      data1.success === true &&
      data1.user.email === '' &&
      data1.user.isPlaceholderEmail === true &&
      data1.user.hasGenuineEmail === false &&
      data1.user.name === '' &&
      data1.user.isDummyName === true &&
      data1.user.hasGenuineName === false &&
      data1.user.phone === testPhone;

    record(
      'Case 1: New customer with only verified phone',
      case1Pass,
      `API returned name="${data1.user.name}", email="${data1.user.email}", phone="${data1.user.phone}", isPlaceholderEmail=${data1.user.isPlaceholderEmail}`
    );

    // -------------------------------------------------------------
    // Test Case 2: Customer with genuine saved name and email
    // -------------------------------------------------------------
    console.log('\n--- Case 2: Customer with genuine saved name and email ---');
    await User.findByIdAndUpdate(user1._id, {
      name: 'Aarav Sharma',
      email: 'aarav.sharma@example.com'
    });

    const res2 = await fetch(`${API_BASE}/users/profile`, {
      headers: { Authorization: `Bearer ${token1}` }
    });
    const data2 = await res2.json();
    const case2Pass =
      data2.success === true &&
      data2.user.name === 'Aarav Sharma' &&
      data2.user.email === 'aarav.sharma@example.com' &&
      data2.user.hasGenuineEmail === true &&
      data2.user.hasGenuineName === true;

    record(
      'Case 2: Customer with genuine saved name and email',
      case2Pass,
      `API returned name="${data2.user.name}", email="${data2.user.email}", hasGenuineEmail=${data2.user.hasGenuineEmail}`
    );

    // -------------------------------------------------------------
    // Test Case 3: Customer with a name but no email
    // -------------------------------------------------------------
    console.log('\n--- Case 3: Customer with a name but no email ---');
    const legacyPlaceholder = `customer_${testPhone}_999999@worklogy.local`;
    await User.findByIdAndUpdate(user1._id, {
      name: 'Priya Verma',
      email: legacyPlaceholder
    });

    const res3 = await fetch(`${API_BASE}/users/profile`, {
      headers: { Authorization: `Bearer ${token1}` }
    });
    const data3 = await res3.json();
    const case3Pass =
      data3.success === true &&
      data3.user.name === 'Priya Verma' &&
      data3.user.email === '' &&
      data3.user.hasGenuineName === true &&
      data3.user.hasGenuineEmail === false;

    record(
      'Case 3: Customer with name but no email',
      case3Pass,
      `API returned name="${data3.user.name}", email="${data3.user.email}", isPlaceholderEmail=${data3.user.isPlaceholderEmail}`
    );

    // -------------------------------------------------------------
    // Test Case 4: Customer with generated .worklogy.local placeholder
    // -------------------------------------------------------------
    console.log('\n--- Case 4: Customer with generated .worklogy.local placeholder ---');
    // Ensure DB still has the unique placeholder for Mongo index integrity, but sanitized on client
    const rawDbUser = await User.findById(user1._id);
    const case4Pass =
      rawDbUser.email.endsWith('@worklogy.local') &&
      data3.user.email === '' &&
      data3.user.isPlaceholderEmail === true;

    record(
      'Case 4: DB holds unique index placeholder, API sanitizes to empty string',
      case4Pass,
      `DB has email="${rawDbUser.email}", sanitized API sent email="${data3.user.email}"`
    );

    // -------------------------------------------------------------
    // Test Case 5: Customer editing their name via PUT /api/users/profile
    // -------------------------------------------------------------
    console.log('\n--- Case 5: Customer editing their name ---');
    const res5 = await fetch(`${API_BASE}/users/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token1}`
      },
      body: JSON.stringify({
        name: 'Priya Sharma Updated',
        email: '' // customer left email blank
      })
    });
    const data5 = await res5.json();
    const case5Pass =
      data5.success === true &&
      data5.user.name === 'Priya Sharma Updated' &&
      data5.user.email === '';

    record(
      'Case 5: Customer editing name with blank email',
      case5Pass,
      `Updated name="${data5.user.name}", email remains sanitized="${data5.user.email}"`
    );

    // -------------------------------------------------------------
    // Test Case 6: Customer adding a genuine email
    // -------------------------------------------------------------
    console.log('\n--- Case 6: Customer adding a genuine email ---');
    const genuineEmail = 'priya.sharma2026@gmail.com';
    const res6 = await fetch(`${API_BASE}/users/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token1}`
      },
      body: JSON.stringify({
        name: 'Priya Sharma Updated',
        email: genuineEmail
      })
    });
    const data6 = await res6.json();
    const dbAfter6 = await User.findById(user1._id);
    const case6Pass =
      data6.success === true &&
      data6.user.email === genuineEmail &&
      data6.user.hasGenuineEmail === true &&
      dbAfter6.email === genuineEmail;

    record(
      'Case 6: Customer adding a genuine email',
      case6Pass,
      `API returned email="${data6.user.email}", DB persisted email="${dbAfter6.email}"`
    );

    // -------------------------------------------------------------
    // Test Case 7: Customer saving changes and restarting app (re-fetching /auth/me)
    // -------------------------------------------------------------
    console.log('\n--- Case 7: App restart (GET /api/auth/me) ---');
    const res7 = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token1}` }
    });
    const data7 = await res7.json();
    const case7Pass =
      data7.success === true &&
      data7.user.name === 'Priya Sharma Updated' &&
      data7.user.email === genuineEmail &&
      data7.user.phone === testPhone;

    record(
      'Case 7: Persistence on app restart /auth/me',
      case7Pass,
      `Saved details restored: name="${data7.user.name}", email="${data7.user.email}", phone="${data7.user.phone}"`
    );

    // -------------------------------------------------------------
    // Test Case 8: Logout and Re-login
    // -------------------------------------------------------------
    console.log('\n--- Case 8: Logout and re-login ---');
    // Verify phone tampering is rejected: user cannot change phone via profile update
    const resTamper = await fetch(`${API_BASE}/users/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token1}`
      },
      body: JSON.stringify({
        phone: '1234567890'
      })
    });
    const dbTamperCheck = await User.findById(user1._id);
    const phoneImmutable = dbTamperCheck.phone === testPhone;
    record(
      'Case 8: Security Guardrail - phone number immutable on profile update',
      phoneImmutable,
      `Attempted to change phone to 1234567890, but DB preserved="${dbTamperCheck.phone}"`
    );

  } finally {
    // Clean up test user
    console.log('\nCleaning up test user...');
    await User.deleteMany({ phone: testPhone });
    await CustomerProfile.deleteMany({ user: { $in: await User.find({ phone: testPhone }).distinct('_id') } });
    await mongoose.disconnect();
    console.log('MongoDB disconnected.');
  }

  console.log('\n=======================================');
  console.log('TEST SUMMARY:');
  const allPassed = results.every(r => r.passed);
  console.log(`Total tests: ${results.length}, All Passed: ${allPassed ? 'YES' : 'NO'}`);
  console.log('=======================================');
  if (!allPassed) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});

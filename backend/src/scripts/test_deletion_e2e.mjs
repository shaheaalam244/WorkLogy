import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import app from '../app.js';
import http from 'http';
import OtpChallenge from '../models/OtpChallenge.js';
import AccountDeletionRequest from '../models/AccountDeletionRequest.js';

async function runTest() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected.');

  // Clean previous test deletion requests for test phone 9876543210
  await AccountDeletionRequest.deleteMany({ phone: '9876543210' });
  await OtpChallenge.deleteMany({ phone: '9876543210', purpose: 'vendor_deletion' });

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(5099, resolve));
  console.log('Test server listening on port 5099');

  const baseUrl = 'http://localhost:5099/api/account-deletion';

  try {
    // 1. Test Request OTP for non-existent phone
    console.log('\n--- 1. Testing non-existent phone ---');
    const res1 = await fetch(`${baseUrl}/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '9000000099', role: 'vendor' })
    });
    const data1 = await res1.json();
    console.log('Status:', res1.status, 'Response:', data1);
    if (res1.status !== 404) throw new Error('Expected 404 for non-existent phone');

    // 2. Test Request OTP for existing vendor (9876543210)
    console.log('\n--- 2. Testing Request OTP for 9876543210 ---');
    const res2 = await fetch(`${baseUrl}/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '9876543210', role: 'vendor' })
    });
    const data2 = await res2.json();
    console.log('Status:', res2.status, 'Response:', data2);
    if (res2.status !== 200 || !data2.success) throw new Error('Expected 200 for OTP request');

    // 3. Test Invalid OTP submit
    console.log('\n--- 3. Testing Submit with wrong OTP ---');
    const res3 = await fetch(`${baseUrl}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: '9876543210',
        role: 'vendor',
        otp: '000000',
        reason: 'Testing',
        confirmationAcknowledged: true
      })
    });
    const data3 = await res3.json();
    console.log('Status:', res3.status, 'Response:', data3);
    if (res3.status !== 400) throw new Error('Expected 400 for wrong OTP');

    // 4. Test Valid Submit with OTP 123456
    console.log('\n--- 4. Testing Submit with correct OTP (123456) ---');
    const res4 = await fetch(`${baseUrl}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: '9876543210',
        role: 'vendor',
        otp: '123456',
        email: 'rajesh.kumar@worklogy.in',
        reason: 'Closing contracting business',
        confirmationAcknowledged: true
      })
    });
    const data4 = await res4.json();
    console.log('Status:', res4.status, 'Response:', data4);
    if (res4.status !== 201 || !data4.referenceId) throw new Error('Expected 201 with referenceId');
    const createdRefId = data4.referenceId;

    // 5. Test Duplicate Prevention
    console.log('\n--- 5. Testing Duplicate Request Prevention ---');
    const res5 = await fetch(`${baseUrl}/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '9876543210', role: 'vendor' })
    });
    const data5 = await res5.json();
    console.log('Status:', res5.status, 'Response:', data5);
    if (res5.status !== 409 || data5.code !== 'DUPLICATE_ACTIVE_REQUEST') {
      throw new Error('Expected 409 DUPLICATE_ACTIVE_REQUEST');
    }

    // 6. Test Status Tracking
    console.log('\n--- 6. Testing Status Tracking ---');
    const res6 = await fetch(`${baseUrl}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ referenceId: createdRefId, phone: '9876543210' })
    });
    const data6 = await res6.json();
    console.log('Status:', res6.status, 'Response:', data6);
    if (res6.status !== 200 || data6.data.referenceId !== createdRefId) {
      throw new Error('Expected 200 with correct tracking details');
    }

    console.log('\n✅ ALL 6 END-TO-END DELETION TESTS PASSED CLEANLY!\n');
  } finally {
    // Cleanup test record
    await AccountDeletionRequest.deleteMany({ phone: '9876543210' });
    await OtpChallenge.deleteMany({ phone: '9876543210', purpose: 'vendor_deletion' });
    server.close();
    await mongoose.disconnect();
  }
}

runTest().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});

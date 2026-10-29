// Test OTP Registration & Login Flow
const API_URL = 'http://localhost:5001/api';

async function run() {
  console.log('🧪 Testing OTP Registration & Login API endpoints...\n');

  // Clean up any test user with phone 9123456780 first if needed
  const testPhone = '9123456780';
  import('mongoose').then(async ({ default: mongoose }) => {
    // optional db cleanup
  });

  // 1. Request Register OTP for new number
  console.log('Test 1: Request Registration OTP for new number...');
  const regSendRes = await fetch(`${API_URL}/auth/otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: testPhone, purpose: 'register' })
  });
  const regSendData = await regSendRes.json();
  if (!regSendRes.ok || !regSendData.debugCode) {
    throw new Error(`Register OTP send failed: ${JSON.stringify(regSendData)}`);
  }
  console.log('✅ Test 1 PASSED: Register OTP sent. Debug code:', regSendData.debugCode);

  // 2. Verify Registration OTP
  console.log('\nTest 2: Verify Registration OTP and create user...');
  const regVerifyRes = await fetch(`${API_URL}/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: testPhone,
      otp: regSendData.debugCode,
      deviceInfo: { platform: 'android', appVersion: '1.0.0' }
    })
  });
  const regVerifyData = await regVerifyRes.json();
  if (!regVerifyRes.ok || !regVerifyData.token || !regVerifyData.isNewUser) {
    throw new Error(`Register OTP verify failed: ${JSON.stringify(regVerifyData)}`);
  }
  console.log('✅ Test 2 PASSED: New vendor registered via OTP.');
  console.log(`   User: ${regVerifyData.user.name}, onboardingStep: ${regVerifyData.onboardingStep}`);

  // 3. Attempting to Register again with the same number must return 409 ALREADY_REGISTERED
  console.log('\nTest 3: Attempting to register already existing number...');
  const dupRes = await fetch(`${API_URL}/auth/otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: testPhone, purpose: 'register' })
  });
  const dupData = await dupRes.json();
  if (dupRes.status !== 409 || dupData.code !== 'ALREADY_REGISTERED') {
    throw new Error(`Expected 409 ALREADY_REGISTERED, got: ${dupRes.status} ${JSON.stringify(dupData)}`);
  }
  console.log('✅ Test 3 PASSED: Duplicate registration correctly rejected with 409 ALREADY_REGISTERED.');

  // 4. Updating Profile Details for the new vendor (Step 1)
  console.log('\nTest 4: Update Profile Details (Step 1)...');
  const updateRes = await fetch(`${API_URL}/vendors/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${regVerifyData.token}`
    },
    body: JSON.stringify({
      name: 'Ramesh Verma',
      businessName: 'Verma Electric Works',
      onboardingStep: 'domains_pending'
    })
  });
  const updateData = await updateRes.json();
  if (!updateRes.ok) {
    throw new Error(`Profile update failed: ${JSON.stringify(updateData)}`);
  }
  console.log('✅ Test 4 PASSED: Profile and business name updated. onboardingStep: domains_pending');

  console.log('\n🎉 ALL OTP REGISTRATION & ONBOARDING BACKEND CHECKS PASSED!\n');
}

run().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});

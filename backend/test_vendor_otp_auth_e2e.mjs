const BASE_URL = 'http://localhost:5001/api';

async function testOtpAndSessionFlow() {
  console.log('🧪 Starting Mobile OTP & Persistent Session E2E Tests...\n');

  // Test 1: Try invalid phone format
  console.log('Test 1: Rejection of invalid phone format...');
  const res1 = await fetch(`${BASE_URL}/auth/otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '123' })
  });
  const data1 = await res1.json();
  if (res1.status === 400 && data1.success === false) {
    console.log('✅ Test 1 PASSED: Invalid phone format rejected properly.');
  } else {
    throw new Error(`Test 1 FAILED: Expected 400, got ${res1.status} - ${JSON.stringify(data1)}`);
  }

  // Test 2: Try unregistered phone
  console.log('\nTest 2: Rejection of unregistered vendor mobile number...');
  const res2 = await fetch(`${BASE_URL}/auth/otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '9999999999' })
  });
  const data2 = await res2.json();
  if (res2.status === 404 && data2.success === false) {
    console.log('✅ Test 2 PASSED: Unregistered mobile returns 404 with guidance message.');
  } else {
    throw new Error(`Test 2 FAILED: Expected 404, got ${res2.status} - ${JSON.stringify(data2)}`);
  }

  // Test 3: Request OTP for registered vendor Shahe Aalam (6389696103)
  console.log('\nTest 3: Request OTP for registered vendor (6389696103)...');
  const res3 = await fetch(`${BASE_URL}/auth/otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '+91 63896 96103' })
  });
  const data3 = await res3.json();
  if (res3.status === 200 && data3.success === true && data3.debugCode) {
    console.log(`✅ Test 3 PASSED: OTP requested successfully. Debug code: ${data3.debugCode}`);
  } else {
    throw new Error(`Test 3 FAILED: Expected 200 with OTP, got ${res3.status} - ${JSON.stringify(data3)}`);
  }

  const generatedOtp = data3.debugCode;

  // Test 4: Rate limit / cooldown within 60 seconds
  console.log('\nTest 4: Immediate duplicate OTP request within 60s cooldown...');
  const res4 = await fetch(`${BASE_URL}/auth/otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '6389696103' })
  });
  const data4 = await res4.json();
  if (res4.status === 429 && data4.cooldownSeconds > 0) {
    console.log(`✅ Test 4 PASSED: Cooldown enforced (${data4.cooldownSeconds}s remaining).`);
  } else {
    throw new Error(`Test 4 FAILED: Expected 429, got ${res4.status} - ${JSON.stringify(data4)}`);
  }

  // Test 5: Verify with incorrect OTP
  console.log('\nTest 5: Verify with incorrect OTP code...');
  const res5 = await fetch(`${BASE_URL}/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '6389696103', otp: '000000' })
  });
  const data5 = await res5.json();
  if (res5.status === 400 && data5.success === false && data5.remainingAttempts !== undefined) {
    console.log(`✅ Test 5 PASSED: Incorrect code rejected with remaining attempts: ${data5.remainingAttempts}`);
  } else {
    throw new Error(`Test 5 FAILED: Expected 400, got ${res5.status} - ${JSON.stringify(data5)}`);
  }

  // Test 6: Verify with correct OTP
  console.log('\nTest 6: Verify with correct OTP code...');
  const res6 = await fetch(`${BASE_URL}/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: '6389696103',
      otp: generatedOtp,
      deviceInfo: { platform: 'android', deviceModel: 'Pixel 8 Pro' }
    })
  });
  const data6 = await res6.json();
  if (
    res6.status === 200 &&
    data6.success === true &&
    data6.token &&
    data6.refreshToken &&
    data6.user?.role === 'vendor' &&
    data6.session?.id
  ) {
    console.log('✅ Test 6 PASSED: OTP verified, session created with access token & refresh token.');
    console.log(`   User: ${data6.user.name} (${data6.user.email})`);
    console.log(`   Session ID: ${data6.session.id}`);
  } else {
    throw new Error(`Test 6 FAILED: Expected 200 with session, got ${res6.status} - ${JSON.stringify(data6)}`);
  }

  const accessToken1 = data6.token;
  const refreshToken1 = data6.refreshToken;
  const sessionId = data6.session.id;

  // Test 7: Verify OTP reuse prevention
  console.log('\nTest 7: Attempting to reuse already consumed OTP...');
  const res7 = await fetch(`${BASE_URL}/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '6389696103', otp: generatedOtp })
  });
  const data7 = await res7.json();
  if (res7.status === 400 && data7.success === false) {
    console.log('✅ Test 7 PASSED: Consumed OTP cannot be reused.');
  } else {
    throw new Error(`Test 7 FAILED: Expected 400 for consumed OTP, got ${res7.status} - ${JSON.stringify(data7)}`);
  }

  // Test 8: Authenticated request using access token
  console.log('\nTest 8: Authenticated request GET /auth/me with new access token...');
  const res8 = await fetch(`${BASE_URL}/auth/me`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken1}` }
  });
  const data8 = await res8.json();
  if (res8.status === 200 && data8.success === true && data8.user?.role === 'vendor') {
    console.log(`✅ Test 8 PASSED: Access token works. Vendor profile: ${data8.profile?.businessName || 'Pro'}`);
  } else {
    throw new Error(`Test 8 FAILED: Expected 200, got ${res8.status} - ${JSON.stringify(data8)}`);
  }

  // Test 9: Refresh session (Rotating Refresh Token)
  console.log('\nTest 9: Refreshing session with refresh token...');
  const res9 = await fetch(`${BASE_URL}/auth/token/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: refreshToken1 })
  });
  const data9 = await res9.json();
  if (res9.status === 200 && data9.success === true && data9.token && data9.refreshToken) {
    console.log('✅ Test 9 PASSED: Session refreshed. New rotated refresh token issued.');
  } else {
    throw new Error(`Test 9 FAILED: Expected 200, got ${res9.status} - ${JSON.stringify(data9)}`);
  }

  const accessToken2 = data9.token;
  const refreshToken2 = data9.refreshToken;

  // Test 10: Access token 2 works
  console.log('\nTest 10: Verify new access token from refresh works on GET /auth/me...');
  const res10 = await fetch(`${BASE_URL}/auth/me`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken2}` }
  });
  const data10 = await res10.json();
  if (res10.status === 200 && data10.user?.role === 'vendor') {
    console.log('✅ Test 10 PASSED: New access token authenticated successfully.');
  } else {
    throw new Error(`Test 10 FAILED: Expected 200, got ${res10.status}`);
  }

  // Test 11: Explicit Logout
  console.log('\nTest 11: Explicit logout to revoke session on server...');
  const res11 = await fetch(`${BASE_URL}/auth/session/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken2}`
    },
    body: JSON.stringify({ refreshToken: refreshToken2 })
  });
  const data11 = await res11.json();
  if (res11.status === 200 && data11.success === true) {
    console.log('✅ Test 11 PASSED: Session revoked successfully on server.');
  } else {
    throw new Error(`Test 11 FAILED: Expected 200, got ${res11.status}`);
  }

  // Test 12: Revoked refresh token cannot be used again
  console.log('\nTest 12: Attempting to refresh with revoked refresh token...');
  const res12 = await fetch(`${BASE_URL}/auth/token/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: refreshToken2 })
  });
  const data12 = await res12.json();
  if (res12.status === 401 && (data12.code === 'SESSION_REVOKED' || data12.code === 'INVALID_REFRESH_TOKEN')) {
    console.log(`✅ Test 12 PASSED: Revoked session refresh blocked with code: ${data12.code}`);
  } else {
    throw new Error(`Test 12 FAILED: Expected 401 SESSION_REVOKED, got ${res12.status} - ${JSON.stringify(data12)}`);
  }

  console.log('\n🎉 ALL 12 BACKEND OTP & PERSISTENT SESSION TESTS PASSED!\n');
}

testOtpAndSessionFlow().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err.message);
  process.exit(1);
});

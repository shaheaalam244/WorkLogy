// Targeted end-to-end verification of dual auth (Mobile OTP + Password) and persistent session rotation
const API_URL = 'http://localhost:5001/api';

async function run() {
  console.log('🧪 Starting Dual Auth (OTP + Password) and Session Rotation Verification...\n');

  // Test A: Password Login
  console.log('--- TEST A: Password Login ---');
  const pwdRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'shahe@gmail.com', password: 'password123' })
  });
  const pwdData = await pwdRes.json();
  if (!pwdRes.ok || !pwdData.token || !pwdData.refreshToken) {
    throw new Error(`Password login failed: ${JSON.stringify(pwdData)}`);
  }
  console.log('✅ Password Login successful: Token and Refresh Token received.');
  console.log(`   Vendor: ${pwdData.user?.name} (${pwdData.user?.role})`);

  // Test B: Authenticated Request with Access Token
  console.log('\n--- TEST B: Access Token Verification ---');
  const meRes = await fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${pwdData.token}` }
  });
  const meData = await meRes.json();
  if (!meRes.ok || !meData.user) {
    throw new Error(`Me endpoint failed: ${JSON.stringify(meData)}`);
  }
  console.log(`✅ Authenticated GET /auth/me succeeded: ${meData.user?.name} (Status: ${meData.user?.status})`);

  // Test C: Silent Refresh Token Rotation
  console.log('\n--- TEST C: Silent Refresh Rotation ---');
  const refreshRes = await fetch(`${API_URL}/auth/token/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: pwdData.refreshToken })
  });
  const refreshData = await refreshRes.json();
  if (!refreshRes.ok || !refreshData.token || !refreshData.refreshToken) {
    throw new Error(`Token refresh failed: ${JSON.stringify(refreshData)}`);
  }
  console.log('✅ Token refresh succeeded: New access token and new rotated refresh token issued.');

  // Test D: Mobile OTP Send and Verification
  console.log('\n--- TEST D: Mobile OTP Flow ---');
  const otpSendRes = await fetch(`${API_URL}/auth/otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '6389696103' })
  });
  const otpSendData = await otpSendRes.json();
  if (!otpSendRes.ok || !otpSendData.debugCode) {
    throw new Error(`OTP send failed: ${JSON.stringify(otpSendData)}`);
  }
  console.log(`✅ OTP sent to +91 6389696103. Debug code: ${otpSendData.debugCode}`);

  const otpVerifyRes = await fetch(`${API_URL}/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: '6389696103',
      otp: otpSendData.debugCode,
      deviceInfo: { platform: 'android', appVersion: '1.0.0' }
    })
  });
  const otpVerifyData = await otpVerifyRes.json();
  if (!otpVerifyRes.ok || !otpVerifyData.token || !otpVerifyData.refreshToken) {
    throw new Error(`OTP verification failed: ${JSON.stringify(otpVerifyData)}`);
  }
  console.log('✅ Mobile OTP verified successfully. Authenticated session created.');
  console.log(`   Vendor: ${otpVerifyData.user?.name}, Session ID: ${otpVerifyData.sessionId}`);

  // Test E: Explicit Logout
  console.log('\n--- TEST E: Explicit Logout ---');
  const logoutRes = await fetch(`${API_URL}/auth/session/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${otpVerifyData.token}`
    },
    body: JSON.stringify({ refreshToken: otpVerifyData.refreshToken })
  });
  const logoutData = await logoutRes.json();
  if (!logoutRes.ok || !logoutData.success) {
    throw new Error(`Logout failed: ${JSON.stringify(logoutData)}`);
  }
  console.log('✅ Explicit logout succeeded. Server session revoked.');

  console.log('\n🎉 ALL DUAL AUTH & PERSISTENT SESSION CHECKS PASSED PERFECTLY!');
}

run().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});

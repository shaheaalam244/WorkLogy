import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const BASE_URL = 'http://localhost:5001/api';

async function runTest() {
  console.log('--- 1. Testing Admin Login ---');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@worklogy.com', password: 'password123' })
  });

  const loginData = await loginRes.json();
  if (!loginData.token) {
    throw new Error('Admin login failed: ' + JSON.stringify(loginData));
  }
  const token = loginData.token;
  console.log('Admin login success. Token obtained.');

  console.log('\n--- 2. Testing GET /api/admin/vendors ---');
  const vendorsRes = await fetch(`${BASE_URL}/admin/vendors`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const vendorsData = await vendorsRes.json();
  console.log(`Vendors fetched: ${vendorsData.count} of ${vendorsData.total}`);
  if (!vendorsData.vendors || vendorsData.vendors.length === 0) {
    throw new Error('No vendors returned from /api/admin/vendors');
  }

  const targetVendor = vendorsData.vendors[0];
  console.log(`Target Vendor: ${targetVendor.businessName} (ID: ${targetVendor._id})`);

  console.log('\n--- 3. Testing GET /api/admin/vendors/:id ---');
  const detailRes = await fetch(`${BASE_URL}/admin/vendors/${targetVendor._id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const detailData = await detailRes.json();
  if (!detailData.success || !detailData.vendor) {
    throw new Error('Failed to load vendor dossier: ' + JSON.stringify(detailData));
  }
  console.log('Vendor dossier loaded successfully:');
  console.log('- Approval Status:', detailData.vendor.approvalStatus);
  console.log('- KYC Status:', detailData.vendor.verifiedBadge?.status);
  console.log('- Masked ID:', detailData.vendor.verifiedBadge?.maskedIdNumber);
  console.log('- Documents on file:', detailData.vendor.verifiedBadge?.documents?.length || 0);
  console.log('- Recent Bookings count:', detailData.recentBookings?.length || 0);
  console.log('- Customer Reviews count:', detailData.reviews?.length || 0);

  if (detailData.vendor.verifiedBadge?.documents?.length > 0) {
    console.log('\n--- 4. Testing Document Review (PATCH /api/admin/vendors/:id/documents/0) ---');
    const docReviewRes = await fetch(`${BASE_URL}/admin/vendors/${targetVendor._id}/documents/0`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ action: 'approved', reason: 'Document clear and legally valid' })
    });
    const docReviewData = await docReviewRes.json();
    console.log('Document review result:', docReviewData.message);
    if (!docReviewData.success) {
      throw new Error('Document review failed: ' + JSON.stringify(docReviewData));
    }

    console.log('\n--- 5. Testing Document View (GET /api/admin/vendors/:id/documents/0/view) ---');
    const docViewRes = await fetch(`${BASE_URL}/admin/vendors/${targetVendor._id}/documents/0/view`, {
      headers: { Authorization: `Bearer ${token}` },
      redirect: 'manual'
    });
    console.log('Document view response status:', docViewRes.status);
    console.log('Document view location/header:', docViewRes.headers.get('location') || docViewRes.headers.get('content-type'));
    if (docViewRes.status !== 200 && docViewRes.status !== 302) {
      throw new Error('Unexpected document view status: ' + docViewRes.status);
    }
  }

  console.log('\n--- 6. Testing Verification Review (PATCH /api/admin/verifications/:id) ---');
  const verifyRes = await fetch(`${BASE_URL}/admin/verifications/${targetVendor._id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      action: 'approve',
      adminNotes: 'All KYC verification documents approved during comprehensive testing.'
    })
  });
  const verifyData = await verifyRes.json();
  console.log('Verification review response:', verifyData.message);
  if (!verifyData.success) {
    throw new Error('Verification review failed: ' + JSON.stringify(verifyData));
  }

  console.log('\n=== ALL ADMIN KYC E2E TESTS PASSED CLEANLY ===');
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});

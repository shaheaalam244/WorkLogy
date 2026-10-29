import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'worklogy_super_secret_jwt_key_2026_secure';
const CUSTOMER_ID = '6adf4b220c47485b153e943d';
const VENDOR_ID = '6ae0213770d51a1f67ac7505';

const customerToken = jwt.sign({ id: CUSTOMER_ID, role: 'customer' }, JWT_SECRET, { expiresIn: '1d' });
const vendorToken = jwt.sign({ id: VENDOR_ID, role: 'vendor' }, JWT_SECRET, { expiresIn: '1d' });

const API_BASE = 'http://localhost:5001/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await res.json();
  if (!res.ok && !data.success) {
    throw new Error(data.message || `HTTP ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function main() {
  console.log('=================================================================');
  console.log('   WORKLOGY UNIFIED JOBS FEED & DOMAIN FILTERS E2E VERIFICATION  ');
  console.log('=================================================================');

  // 1. Fetch categories from /api/categories
  console.log('\n[TEST 1] Fetching Reference Category Catalogue from /api/categories...');
  const catRes = await request('/categories');
  const categories = catRes.categories || [];
  console.log(`✓ Retrieved ${categories.length} canonical service domains.`);

  const electricalCat = categories.find(c => c.slug === 'electrical-services');
  const acCat = categories.find(c => c.slug === 'ac-hvac-services');
  const plumbingCat = categories.find(c => c.slug === 'plumbing-services');

  if (!electricalCat || !acCat || !plumbingCat) {
    throw new Error('Required categories not found in catalogue');
  }

  console.log(`  - Domain 1: ${electricalCat.name} (ID: ${electricalCat._id})`);
  console.log(`  - Domain 2: ${acCat.name} (ID: ${acCat._id})`);
  console.log(`  - Domain 3: ${plumbingCat.name} (ID: ${plumbingCat._id})`);

  // 2. Customer posts real jobs in 3 different service domains
  console.log('\n[TEST 2] Customer creating real jobs across 3 distinct service domains...');
  const timestamp = Date.now().toString().slice(-4);

  // Job 1: Electrical Services
  const job1Res = await request('/jobs', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({
      title: `Main Distribution Board Tripping & Wiring ${timestamp}`,
      description: 'Trip switch constantly turns off under AC load. Need urgent wiring and fuse inspection.',
      category: electricalCat._id,
      serviceType: 'repair',
      budget: { type: 'fixed', amount: 550 },
      location: {
        city: 'Lucknow',
        locality: 'Gomti Nagar',
        address: 'Sector 4, Gomti Nagar, Lucknow',
        coordinates: { lat: 26.8500, lng: 80.9900 }
      },
      urgency: 'high',
      preferredDate: '2026-10-30',
      preferredTime: '10:00 AM'
    })
  });
  const job1 = job1Res.job;
  console.log(`✓ Created Job 1 [${electricalCat.name}]: "${job1.title}" (ID: ${job1._id})`);

  // Job 2: AC & HVAC Services
  const job2Res = await request('/jobs', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({
      title: `Split AC Refrigerant Gas Refill & Servicing ${timestamp}`,
      description: 'Split AC indoor unit running but no cooling. Suspected refrigerant leak.',
      category: acCat._id,
      serviceType: 'repair',
      budget: { type: 'quote', amount: 0 },
      location: {
        city: 'Lucknow',
        locality: 'Aliganj',
        address: 'Sector B, Aliganj, Lucknow',
        coordinates: { lat: 26.8800, lng: 80.9400 }
      },
      urgency: 'medium',
      preferredDate: '2026-10-31',
      preferredTime: '02:00 PM'
    })
  });
  const job2 = job2Res.job;
  console.log(`✓ Created Job 2 [${acCat.name}]: "${job2.title}" (ID: ${job2._id})`);

  // Job 3: Plumbing Services
  const job3Res = await request('/jobs', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({
      title: `Kitchen Sink Underground Pipe Clog Removal ${timestamp}`,
      description: 'Complete water drainage blockage in kitchen sink with water overflow.',
      category: plumbingCat._id,
      serviceType: 'repair',
      budget: { type: 'fixed', amount: 400 },
      location: {
        city: 'Lucknow',
        locality: 'Hazratganj',
        address: 'Civil Lines, Hazratganj, Lucknow',
        coordinates: { lat: 26.8467, lng: 80.9460 }
      },
      urgency: 'medium',
      preferredDate: '2026-10-29',
      preferredTime: '11:30 AM'
    })
  });
  const job3 = job3Res.job;
  console.log(`✓ Created Job 3 [${plumbingCat.name}]: "${job3.title}" (ID: ${job3._id})`);

  // 3. Vendor queries Unified All Jobs Feed (tab=all)
  console.log('\n[TEST 3] Vendor querying Unified All Jobs Feed (GET /api/jobs/nearby?tab=all)...');
  const feedRes = await request('/jobs/nearby?tab=all', {
    headers: { Authorization: `Bearer ${vendorToken}` }
  });

  const returnedJobs = feedRes.jobs || [];
  console.log(`✓ Feed returned ${returnedJobs.length} eligible jobs.`);
  console.log(`✓ Counts reported by API: allAvailable=${feedRes.counts?.allAvailable}, new=${feedRes.counts?.new}`);

  const hasJob1 = returnedJobs.some(j => j._id === job1._id);
  const hasJob2 = returnedJobs.some(j => j._id === job2._id);
  const hasJob3 = returnedJobs.some(j => j._id === job3._id);

  console.log(`  - Electrical Job present: ${hasJob1 ? 'YES' : 'NO'}`);
  console.log(`  - AC & HVAC Job present:  ${hasJob2 ? 'YES' : 'NO'}`);
  console.log(`  - Plumbing Job present:   ${hasJob3 ? 'YES' : 'NO'}`);

  if (!hasJob1 || !hasJob2 || !hasJob3) {
    throw new Error('FAILED: All 3 jobs across distinct service domains must appear in the unified All Jobs feed!');
  }
  console.log('✓ PASS: All 3 multi-domain jobs appear concurrently in the unified All Jobs feed.');

  // 4. Test Domain Filtering: Electrical Services
  console.log('\n[TEST 4] Testing Domain Filter: Electrical Services...');
  const elecFeed = await request(`/jobs/nearby?tab=all&category=${electricalCat._id}`, {
    headers: { Authorization: `Bearer ${vendorToken}` }
  });
  const elecJobs = elecFeed.jobs || [];
  console.log(`  - Total Electrical jobs returned: ${elecJobs.length}`);
  const elecHasJob1 = elecJobs.some(j => j._id === job1._id);
  const elecHasNonElec = elecJobs.some(j => j._id === job2._id || j._id === job3._id);

  if (!elecHasJob1 || elecHasNonElec) {
    throw new Error('FAILED: Electrical filter returned invalid or cross-domain jobs!');
  }
  console.log('✓ PASS: Filtering by Electrical Services returns ONLY Electrical jobs.');

  // 5. Test Domain Filtering: AC & HVAC Services
  console.log('\n[TEST 5] Testing Domain Filter: AC & HVAC Services...');
  const acFeed = await request(`/jobs/nearby?tab=all&category=${acCat._id}`, {
    headers: { Authorization: `Bearer ${vendorToken}` }
  });
  const acJobs = acFeed.jobs || [];
  console.log(`  - Total AC & HVAC jobs returned: ${acJobs.length}`);
  const acHasJob2 = acJobs.some(j => j._id === job2._id);
  const acHasNonAc = acJobs.some(j => j._id === job1._id || j._id === job3._id);

  if (!acHasJob2 || acHasNonAc) {
    throw new Error('FAILED: AC & HVAC filter returned invalid or cross-domain jobs!');
  }
  console.log('✓ PASS: Filtering by AC & HVAC Services returns ONLY AC jobs.');

  // 6. Test Domain Filtering: Plumbing Services
  console.log('\n[TEST 6] Testing Domain Filter: Plumbing Services...');
  const plumbFeed = await request(`/jobs/nearby?tab=all&category=${plumbingCat._id}`, {
    headers: { Authorization: `Bearer ${vendorToken}` }
  });
  const plumbJobs = plumbFeed.jobs || [];
  console.log(`  - Total Plumbing jobs returned: ${plumbJobs.length}`);
  const plumbHasJob3 = plumbJobs.some(j => j._id === job3._id);
  const plumbHasNonPlumb = plumbJobs.some(j => j._id === job1._id || j._id === job2._id);

  if (!plumbHasJob3 || plumbHasNonPlumb) {
    throw new Error('FAILED: Plumbing filter returned invalid or cross-domain jobs!');
  }
  console.log('✓ PASS: Filtering by Plumbing Services returns ONLY Plumbing jobs.');

  // 7. Test Reset / Clear Filter (returns all 3)
  console.log('\n[TEST 7] Testing Clear Filter (All Domains)...');
  const allAgainFeed = await request('/jobs/nearby?tab=all', {
    headers: { Authorization: `Bearer ${vendorToken}` }
  });
  const allAgainJobs = allAgainFeed.jobs || [];
  const restoredAll3 = [job1._id, job2._id, job3._id].every(id => allAgainJobs.some(j => j._id === id));
  if (!restoredAll3) {
    throw new Error('FAILED: Clearing filter did not restore all eligible jobs!');
  }
  console.log('✓ PASS: Clearing filter restores all eligible jobs across every domain.');

  // 8. Test Keyword Search Filter
  console.log('\n[TEST 8] Testing Keyword Search (search=Wiring)...');
  const searchFeed = await request('/jobs/nearby?tab=all&search=Wiring', {
    headers: { Authorization: `Bearer ${vendorToken}` }
  });
  const searchJobs = searchFeed.jobs || [];
  console.log(`  - Keyword search "Wiring" returned: ${searchJobs.length} matches`);
  const foundWiring = searchJobs.some(j => j._id === job1._id) && !searchJobs.some(j => j._id === job2._id);
  if (!foundWiring) {
    throw new Error('FAILED: Search filter failed to isolate matching job!');
  }
  console.log('✓ PASS: Keyword search operates properly.');

  // 9. Vendor submits quotation on Job 2
  console.log('\n[TEST 9] Vendor submitting quotation on Job 2 (AC Gas Refill)...');
  const quoteRes = await request('/applications', {
    method: 'POST',
    headers: { Authorization: `Bearer ${vendorToken}` },
    body: JSON.stringify({
      jobId: job2._id,
      proposedAmount: 650,
      coverLetter: 'Complete nitrogen pressure test and R32 refrigerant top-up with 90 days cooling warranty.',
      estimatedDuration: '1-2 hours',
      materialCharges: 250,
      pricingBasis: 'fixed'
    })
  });
  console.log(`✓ Quote successfully submitted. (Application ID: ${quoteRes.application?._id || quoteRes._id})`);

  // 10. Verify My Quotes tab data (/api/applications/vendor)
  console.log('\n[TEST 10] Verifying My Quotes tab (/api/applications/vendor)...');
  const appsRes = await request('/applications/vendor', {
    headers: { Authorization: `Bearer ${vendorToken}` }
  });
  const myApps = appsRes.applications || [];
  console.log(`✓ Vendor has ${myApps.length} active quotations tracked.`);
  const hasQuotedJob2 = myApps.some(a => (a.job?._id || a.job) === job2._id);
  if (!hasQuotedJob2) {
    throw new Error('FAILED: Submitted quotation not found in My Quotes!');
  }
  console.log('✓ PASS: Quotation appears in My Quotes tab.');

  // 11. Verify Tab Segregation (Accepted/In-Progress)
  console.log('\n[TEST 11] Verifying Tab Segregation (Accepted / In-Progress)...');
  const assignedFeed = await request('/jobs/nearby?tab=assigned', {
    headers: { Authorization: `Bearer ${vendorToken}` }
  });
  const assignedJobs = assignedFeed.jobs || [];
  console.log(`✓ Assigned jobs count: ${assignedJobs.length}`);
  const openLeakedIntoAssigned = assignedJobs.some(j => [job1._id, job2._id, job3._id].includes(j._id));
  if (openLeakedIntoAssigned) {
    throw new Error('FAILED: Open jobs leaked into assigned tab!');
  }
  console.log('✓ PASS: Open marketplace jobs do not leak into Assigned / In-Progress tab.');

  console.log('\n=================================================================');
  console.log(' ALL 11 E2E TESTS PASSED WITH 100% SUCCESS ON LIVE BACKEND & DB! ');
  console.log('=================================================================');
}

main().catch(err => {
  console.error('\n❌ E2E TEST FAILED:', err);
  process.exit(1);
});

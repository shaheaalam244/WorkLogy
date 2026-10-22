import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Customer Job Management Business & Validation Rules Test Suite
 */

// 1. Status Lifecycle Permission Matrix
const canEditJob = (status) => !['completed', 'cancelled', 'expired'].includes(status);
const canCancelJob = (status) => !['completed', 'cancelled'].includes(status);
const canDeleteJob = (status) => ['open', 'cancelled', 'expired'].includes(status);
const isCoreScopeLocked = (status) => ['assigned', 'in_progress', 'completion_pending'].includes(status);

test('Customer Job Management - Status Permissions', async (t) => {
  await t.test('Open job allows editing, cancellation, and deletion', () => {
    assert.equal(canEditJob('open'), true);
    assert.equal(canCancelJob('open'), true);
    assert.equal(canDeleteJob('open'), true);
    assert.equal(isCoreScopeLocked('open'), false);
  });

  await t.test('Dispatching emergency job allows editing and cancellation, but locks deletion if active', () => {
    assert.equal(canEditJob('dispatching'), true);
    assert.equal(canCancelJob('dispatching'), true);
    assert.equal(canDeleteJob('dispatching'), false);
    assert.equal(isCoreScopeLocked('dispatching'), false);
  });

  await t.test('Assigned job allows only note/schedule edits and cancellation, but forbids deletion or core scope changes', () => {
    assert.equal(canEditJob('assigned'), true);
    assert.equal(canCancelJob('assigned'), true);
    assert.equal(canDeleteJob('assigned'), false);
    assert.equal(isCoreScopeLocked('assigned'), true);
  });

  await t.test('In-progress job allows only safe notes and cancellation, but forbids deletion or core scope changes', () => {
    assert.equal(canEditJob('in_progress'), true);
    assert.equal(canCancelJob('in_progress'), true);
    assert.equal(canDeleteJob('in_progress'), false);
    assert.equal(isCoreScopeLocked('in_progress'), true);
  });

  await t.test('Completed job forbids all edits and cancellations', () => {
    assert.equal(canEditJob('completed'), false);
    assert.equal(canCancelJob('completed'), false);
    assert.equal(canDeleteJob('completed'), false);
  });

  await t.test('Cancelled job forbids edits and cancellations, but allows deletion/cleanup', () => {
    assert.equal(canEditJob('cancelled'), false);
    assert.equal(canCancelJob('cancelled'), false);
    assert.equal(canDeleteJob('cancelled'), true);
  });
});

// 2. Field Validation Rules
const validateJobUpdate = ({ title, description, city, budgetAmount }) => {
  const errors = {};
  if (!title || title.trim().length < 3) errors.title = 'Title must be at least 3 characters.';
  if (!description || description.trim().length < 10) errors.description = 'Description must be at least 10 characters.';
  if (!city || !city.trim()) errors.city = 'Service city is required.';
  if (budgetAmount != null && Number(budgetAmount) < 0) errors.budgetAmount = 'Budget cannot be negative.';
  return { isValid: Object.keys(errors).length === 0, errors };
};

test('Customer Job Management - Validation Rules', async (t) => {
  await t.test('Valid payload passes validation', () => {
    const res = validateJobUpdate({
      title: 'AC Gas Refill',
      description: 'Need certified technician to check split AC cooling in master bedroom.',
      city: 'Lucknow',
      budgetAmount: 1200
    });
    assert.equal(res.isValid, true);
    assert.deepEqual(res.errors, {});
  });

  await t.test('Short title is rejected', () => {
    const res = validateJobUpdate({
      title: 'AC',
      description: 'Need certified technician to check split AC cooling.',
      city: 'Lucknow',
      budgetAmount: 500
    });
    assert.equal(res.isValid, false);
    assert.ok(res.errors.title);
  });

  await t.test('Short description is rejected', () => {
    const res = validateJobUpdate({
      title: 'AC Gas Refill',
      description: 'Fix it',
      city: 'Lucknow',
      budgetAmount: 500
    });
    assert.equal(res.isValid, false);
    assert.ok(res.errors.description);
  });

  await t.test('Empty city is rejected', () => {
    const res = validateJobUpdate({
      title: 'AC Gas Refill',
      description: 'Need certified technician to check split AC cooling in master bedroom.',
      city: '   ',
      budgetAmount: 500
    });
    assert.equal(res.isValid, false);
    assert.ok(res.errors.city);
  });

  await t.test('Negative budget is rejected', () => {
    const res = validateJobUpdate({
      title: 'AC Gas Refill',
      description: 'Need certified technician to check split AC cooling in master bedroom.',
      city: 'Lucknow',
      budgetAmount: -100
    });
    assert.equal(res.isValid, false);
    assert.ok(res.errors.budgetAmount);
  });
});

// 3. Global Active-Job Filtering Rules
const filterActiveJobsForMarketplace = (jobs, isAdmin = false, requestedStatus = 'all') => {
  return jobs.filter((job) => {
    if (job.isDeleted) return false;
    if (isAdmin) {
      return requestedStatus === 'all' || job.status === requestedStatus;
    }
    // Marketplace & Vendor Feed: Cancelled and expired jobs MUST NEVER appear
    if (['cancelled', 'expired'].includes(job.status)) return false;
    return requestedStatus === 'all' || job.status === requestedStatus;
  });
};

const filterCustomerTabJobs = (jobs, activeTab) => {
  return jobs.filter((job) => {
    if (job.isDeleted) return false;
    if (activeTab === 'all') {
      // Cancelled jobs are moved to the dedicated Cancelled tab
      return job.status !== 'cancelled';
    }
    return job.status === activeTab;
  });
};

test('Global Active-Job Filtering Rules', async (t) => {
  const sampleJobs = [
    { id: 1, title: 'AC Repair', status: 'open', isDeleted: false },
    { id: 2, title: 'Plumbing Leak', status: 'open', isDeleted: false },
    { id: 3, title: 'Switchboard Fix', status: 'cancelled', isDeleted: false },
    { id: 4, title: 'Old Carpentry', status: 'expired', isDeleted: false },
    { id: 5, title: 'Deleted Request', status: 'open', isDeleted: true },
    { id: 6, title: 'Assigned Painting', status: 'assigned', isDeleted: false }
  ];

  await t.test('Marketplace browse feed excludes cancelled, expired, and deleted jobs', () => {
    const available = filterActiveJobsForMarketplace(sampleJobs, false, 'all');
    assert.equal(available.length, 3);
    assert.deepEqual(available.map(j => j.id), [1, 2, 6]);
    assert.ok(!available.some(j => j.status === 'cancelled'));
    assert.ok(!available.some(j => j.status === 'expired'));
    assert.ok(!available.some(j => j.isDeleted));
  });

  await t.test('Marketplace open-only filter excludes cancelled jobs even if requested', () => {
    const openOnly = filterActiveJobsForMarketplace(sampleJobs, false, 'open');
    assert.equal(openOnly.length, 2);
    assert.deepEqual(openOnly.map(j => j.id), [1, 2]);
  });

  await t.test('Customer "All Jobs" tab excludes cancelled jobs', () => {
    const allTabJobs = filterCustomerTabJobs(sampleJobs, 'all');
    assert.ok(!allTabJobs.some(j => j.status === 'cancelled'));
    assert.equal(allTabJobs.length, 4); // 1, 2, 4, 6 (not 3 which is cancelled, not 5 which is deleted)
  });

  await t.test('Customer "Waiting for Response" (open) tab excludes cancelled jobs', () => {
    const openTabJobs = filterCustomerTabJobs(sampleJobs, 'open');
    assert.deepEqual(openTabJobs.map(j => j.id), [1, 2]);
  });

  await t.test('Customer "Cancelled" tab preserves cancelled jobs for history & audit', () => {
    const cancelledTabJobs = filterCustomerTabJobs(sampleJobs, 'cancelled');
    assert.equal(cancelledTabJobs.length, 1);
    assert.equal(cancelledTabJobs[0].id, 3);
    assert.equal(cancelledTabJobs[0].status, 'cancelled');
  });

  await t.test('Admin can audit cancelled jobs when filtering for cancelled', () => {
    const adminCancelled = filterActiveJobsForMarketplace(sampleJobs, true, 'cancelled');
    assert.equal(adminCancelled.length, 1);
    assert.equal(adminCancelled[0].id, 3);
  });
});

// 4. Atomic Concurrency Acceptance Guard
const evaluateJobAcceptance = (job) => {
  if (!job || job.isDeleted || job.status === 'cancelled') {
    return {
      allowed: false,
      statusCode: 409,
      message: 'This request has already been cancelled or is no longer available.'
    };
  }
  if (!['open', 'dispatching'].includes(job.status) || job.selectedVendor) {
    return {
      allowed: false,
      statusCode: 409,
      message: 'This job has already been accepted by another professional.'
    };
  }
  return { allowed: true, statusCode: 200, message: 'Job accepted successfully' };
};

test('Atomic Acceptance Guard Against Cancelled Jobs', async (t) => {
  await t.test('Attempting to accept a cancelled job returns 409 Conflict with cancellation message', () => {
    const cancelledJob = { _id: 'job123', status: 'cancelled', isDeleted: false };
    const res = evaluateJobAcceptance(cancelledJob);
    assert.equal(res.allowed, false);
    assert.equal(res.statusCode, 409);
    assert.equal(res.message, 'This request has already been cancelled or is no longer available.');
  });

  await t.test('Attempting to accept a deleted job returns 409 Conflict', () => {
    const deletedJob = { _id: 'job124', status: 'open', isDeleted: true };
    const res = evaluateJobAcceptance(deletedJob);
    assert.equal(res.allowed, false);
    assert.equal(res.statusCode, 409);
    assert.equal(res.message, 'This request has already been cancelled or is no longer available.');
  });

  await t.test('Attempting to accept an already assigned job returns 409 already accepted message', () => {
    const assignedJob = { _id: 'job125', status: 'assigned', selectedVendor: 'vendor99', isDeleted: false };
    const res = evaluateJobAcceptance(assignedJob);
    assert.equal(res.allowed, false);
    assert.equal(res.statusCode, 409);
    assert.equal(res.message, 'This job has already been accepted by another professional.');
  });

  await t.test('Accepting an eligible open job succeeds', () => {
    const openJob = { _id: 'job126', status: 'open', selectedVendor: null, isDeleted: false };
    const res = evaluateJobAcceptance(openJob);
    assert.equal(res.allowed, true);
    assert.equal(res.statusCode, 200);
  });
});

// 5. Cancellation Ownership Guard
const canAuthorizeCancellation = (job, userId, userRole) => {
  if (!job) return { authorized: false, statusCode: 404, message: 'Job not found' };
  const isOwner = job.customer?.toString() === userId.toString();
  const isAdmin = userRole === 'admin';
  if (!isOwner && !isAdmin) {
    return { authorized: false, statusCode: 403, message: 'Not authorized to cancel this request' };
  }
  if (['completed', 'cancelled'].includes(job.status)) {
    return { authorized: false, statusCode: 400, message: `Cannot cancel job in ${job.status} state` };
  }
  return { authorized: true, statusCode: 200, message: 'Authorized' };
};

test('Cancellation Ownership & Authorization Guard', async (t) => {
  const customerJob = { _id: 'j1', customer: 'user_cust_1', status: 'open' };

  await t.test('Owner customer can cancel their own open job', () => {
    const res = canAuthorizeCancellation(customerJob, 'user_cust_1', 'customer');
    assert.equal(res.authorized, true);
    assert.equal(res.statusCode, 200);
  });

  await t.test('Admin can cancel any open job', () => {
    const res = canAuthorizeCancellation(customerJob, 'admin_user', 'admin');
    assert.equal(res.authorized, true);
    assert.equal(res.statusCode, 200);
  });

  await t.test('Unrelated customer cannot cancel another customer job', () => {
    const res = canAuthorizeCancellation(customerJob, 'user_cust_2', 'customer');
    assert.equal(res.authorized, false);
    assert.equal(res.statusCode, 403);
  });

  await t.test('Vendor cannot cancel a customer job', () => {
    const res = canAuthorizeCancellation(customerJob, 'vendor_pro_1', 'vendor');
    assert.equal(res.authorized, false);
    assert.equal(res.statusCode, 403);
  });
});


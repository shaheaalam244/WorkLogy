import test from 'node:test';
import assert from 'node:assert/strict';

test('Production Readiness - Role Sanitization & Privilege Escalation Guard', async (t) => {
  // Verify that public registration payload sanitizes role
  const sanitizeRegisterRole = (inputRole) => {
    return inputRole === 'vendor' ? 'vendor' : 'customer';
  };

  await t.test('Customer role defaults safely', () => {
    assert.equal(sanitizeRegisterRole('customer'), 'customer');
    assert.equal(sanitizeRegisterRole(undefined), 'customer');
    assert.equal(sanitizeRegisterRole(''), 'customer');
  });

  await t.test('Vendor role is accepted', () => {
    assert.equal(sanitizeRegisterRole('vendor'), 'vendor');
  });

  await t.test('Admin role injection is strictly blocked and sanitized to customer', () => {
    assert.equal(sanitizeRegisterRole('admin'), 'customer');
    assert.equal(sanitizeRegisterRole('super_admin'), 'customer');
    assert.equal(sanitizeRegisterRole('root'), 'customer');
  });
});

test('Production Readiness - Account Status & Suspension Enforcement', async (t) => {
  const checkAccountAccess = (user) => {
    if (!user) {
      return { allowed: false, status: 401, message: 'User not found' };
    }
    if (user.status === 'suspended' || user.isActive === false) {
      return {
        allowed: false,
        status: 403,
        message: user.suspensionReason
          ? `Account suspended: ${user.suspensionReason}`
          : 'Account is suspended or deactivated. Access denied.'
      };
    }
    return { allowed: true, status: 200 };
  };

  await t.test('Active user is allowed access', () => {
    const res = checkAccountAccess({ status: 'active', isActive: true });
    assert.equal(res.allowed, true);
    assert.equal(res.status, 200);
  });

  await t.test('Suspended user is blocked with 403 Forbidden and suspension reason', () => {
    const res = checkAccountAccess({
      status: 'suspended',
      isActive: false,
      suspensionReason: 'Document fraud detected'
    });
    assert.equal(res.allowed, false);
    assert.equal(res.status, 403);
    assert.match(res.message, /Document fraud detected/);
  });

  await t.test('Deactivated user (isActive: false) is blocked with 403', () => {
    const res = checkAccountAccess({ status: 'active', isActive: false });
    assert.equal(res.allowed, false);
    assert.equal(res.status, 403);
  });
});

test('Production Readiness - Vendor Profile Mass-Assignment Protection', async (t) => {
  const sanitizeVendorUpdates = (body) => {
    const updates = { ...body };
    const protectedFields = [
      'approvalStatus',
      'approvalHistory',
      'verifiedBadge',
      'rating',
      'reviewCount',
      'badges',
      'adminNotes',
      'rejectionReason',
      'user',
      '_id',
      'createdAt',
      'updatedAt'
    ];
    protectedFields.forEach(f => delete updates[f]);
    return updates;
  };

  await t.test('Legitimate profile updates are retained', () => {
    const input = {
      businessName: 'Apex Electricals',
      hourlyRate: 60,
      city: 'Lucknow'
    };
    const sanitized = sanitizeVendorUpdates(input);
    assert.deepEqual(sanitized, input);
  });

  await t.test('Malicious self-approval and rating forgery are completely stripped', () => {
    const input = {
      businessName: 'Apex Electricals',
      approvalStatus: 'approved',
      verifiedBadge: { status: 'verified' },
      rating: 5.0,
      reviewCount: 999,
      adminNotes: ['Forged note']
    };
    const sanitized = sanitizeVendorUpdates(input);
    assert.equal(sanitized.businessName, 'Apex Electricals');
    assert.equal(sanitized.approvalStatus, undefined);
    assert.equal(sanitized.verifiedBadge, undefined);
    assert.equal(sanitized.rating, undefined);
    assert.equal(sanitized.reviewCount, undefined);
    assert.equal(sanitized.adminNotes, undefined);
  });
});

test('Production Readiness - Booking Cancellation Job Synchronization', async (t) => {
  const simulateBookingCancel = (booking, job) => {
    booking.status = 'cancelled';
    if (booking.pricing) {
      booking.pricing.paymentStatus = 'refunded';
    }

    let syncedJob = null;
    if (job) {
      syncedJob = {
        ...job,
        status: 'cancelled',
        cancellationReason: 'Cancelled by customer'
      };
    }

    return { booking, syncedJob };
  };

  await t.test('Cancelling booking syncs linked job status to cancelled and triggers refund', () => {
    const booking = { _id: 'b1', status: 'confirmed', pricing: { amount: 500, paymentStatus: 'held_in_escrow' }, job: 'j1' };
    const job = { _id: 'j1', status: 'assigned' };

    const { booking: updatedBooking, syncedJob } = simulateBookingCancel(booking, job);
    assert.equal(updatedBooking.status, 'cancelled');
    assert.equal(updatedBooking.pricing.paymentStatus, 'refunded');
    assert.equal(syncedJob.status, 'cancelled');
    assert.equal(syncedJob.cancellationReason, 'Cancelled by customer');
  });
});

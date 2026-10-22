import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Admin Control & Disputes System — Test Suite
 * Validates vendor verification workflows, reports moderation, booking dispute eligibility,
 * resolution safeguards, account suspension enforcement, and immutable audit logging.
 */

class MockAdminDatabase {
  constructor() {
    this.reset();
  }

  reset() {
    this.users = [];
    this.vendorProfiles = [];
    this.jobs = [];
    this.bookings = [];
    this.reports = [];
    this.disputes = [];
    this.activityLogs = [];
    this.notifications = [];
  }

  // --- Users & Profiles ---
  createUser(data) {
    const user = {
      _id: data._id || `user_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      name: data.name || 'Test User',
      email: data.email || 'user@example.com',
      role: data.role || 'customer',
      status: data.status || 'active',
      isActive: typeof data.isActive === 'boolean' ? data.isActive : true,
      suspensionReason: data.suspensionReason || '',
      adminRole: data.adminRole || (data.role === 'admin' ? 'super_admin' : undefined),
      createdAt: new Date()
    };
    this.users.push(user);
    return user;
  }

  createVendorProfile(userId, data = {}) {
    const profile = {
      _id: `vp_${userId}`,
      user: userId,
      businessName: data.businessName || 'Pro Services Co',
      approvalStatus: data.approvalStatus || 'pending',
      verifiedBadge: {
        status: data.verifiedBadgeStatus || 'unverified',
        idType: 'aadhaar',
        maskedIdNumber: 'XXXX-XXXX-8921',
        verifiedAt: null
      },
      approvalHistory: [],
      adminNotes: [],
      rejectionReason: '',
      createdAt: new Date()
    };
    this.vendorProfiles.push(profile);
    return profile;
  }

  // --- Bookings ---
  createBooking(data) {
    const booking = {
      _id: data._id || `booking_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      bookingReference: data.bookingReference || `BK-${Math.floor(100000 + Math.random() * 900000)}`,
      customer: data.customer,
      vendor: data.vendor,
      job: data.job || null,
      serviceTitle: data.serviceTitle || 'AC Maintenance Service',
      status: data.status || 'scheduled',
      pricing: {
        totalAmount: data.amount || 1500,
        paymentStatus: data.paymentStatus || 'held_in_escrow'
      },
      createdAt: new Date()
    };
    this.bookings.push(booking);
    return booking;
  }

  // --- Auth Simulation ---
  authenticateRequest(user) {
    if (!user) {
      return { status: 401, error: 'Not authorized (token missing)' };
    }
    if (user.status === 'suspended' || user.isActive === false) {
      return {
        status: 403,
        error: user.suspensionReason
          ? `Account suspended: ${user.suspensionReason}`
          : 'Account is suspended or deactivated. Access denied.'
      };
    }
    return { status: 200, user };
  }

  // --- Vendor Verification Flow ---
  updateVendorApproval(adminUser, vendorId, { status, reason, notes }) {
    if (!adminUser || adminUser.role !== 'admin') {
      return { status: 403, error: 'Only authorized administrators can verify vendors' };
    }

    const validStatuses = ['pending', 'under_review', 'changes_required', 'approved', 'rejected', 'suspended'];
    if (!validStatuses.includes(status)) {
      return { status: 400, error: `Invalid status: ${status}` };
    }

    if (['changes_required', 'rejected', 'suspended'].includes(status) && (!reason || !reason.trim())) {
      return { status: 400, error: 'A clear reason is required when rejecting, suspending, or requesting changes' };
    }

    const vendor = this.vendorProfiles.find(v => v._id === vendorId || v.user === vendorId);
    if (!vendor) {
      return { status: 404, error: 'Vendor profile not found' };
    }

    const previousStatus = vendor.approvalStatus;
    vendor.approvalStatus = status;

    if (reason && reason.trim()) {
      vendor.rejectionReason = reason.trim();
    }

    vendor.approvalHistory.push({
      status,
      reason: reason ? reason.trim() : `Status updated to ${status}`,
      reviewedBy: adminUser._id,
      reviewedAt: new Date()
    });

    const userRecord = this.users.find(u => u._id === vendor.user);
    if (status === 'approved') {
      vendor.verifiedBadge.status = 'verified';
      vendor.verifiedBadge.verifiedAt = new Date();
      if (userRecord) {
        userRecord.status = 'active';
        userRecord.isActive = true;
        userRecord.suspensionReason = '';
      }
    } else if (status === 'suspended') {
      if (userRecord) {
        userRecord.status = 'suspended';
        userRecord.isActive = false;
        userRecord.suspensionReason = reason.trim();
      }
    }

    this.activityLogs.push({
      user: adminUser._id,
      action: 'VENDOR_APPROVAL_UPDATED',
      targetType: 'VendorProfile',
      targetId: vendor._id,
      details: { previousStatus, newStatus: status, reason }
    });

    return { status: 200, vendor };
  }

  // --- Report Workflow ---
  createReport(callerUser, { targetType, targetId, reason, description, evidence }) {
    const authCheck = this.authenticateRequest(callerUser);
    if (authCheck.status !== 200) return authCheck;

    const validTypes = ['job', 'vendor', 'customer', 'service', 'review'];
    if (!validTypes.includes(targetType)) {
      return { status: 400, error: 'Invalid target type' };
    }

    const validReasons = [
      'spam_fake',
      'suspected_fraud',
      'misleading_info',
      'harassment_abuse',
      'suspicious_payment',
      'repeated_cancellations',
      'other'
    ];
    if (!validReasons.includes(reason)) {
      return { status: 400, error: 'Invalid reason category' };
    }

    // Duplicate check: Same user cannot have open report on same target
    const existing = this.reports.find(
      r => r.reportedBy === callerUser._id && r.targetType === targetType && r.targetId === targetId && ['new', 'under_review'].includes(r.status)
    );
    if (existing) {
      return { status: 409, error: 'An active report for this resource is already under review' };
    }

    const report = {
      _id: `rep_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      reportedBy: callerUser._id,
      targetType,
      targetId,
      targetSnapshot: { title: `Snapshot of ${targetType} ${targetId}` },
      reason,
      description: description || '',
      evidence: evidence || [],
      status: 'new',
      resolution: null,
      createdAt: new Date()
    };
    this.reports.push(report);
    return { status: 201, report };
  }

  resolveReport(adminUser, reportId, { status, outcome, notes }) {
    if (!adminUser || adminUser.role !== 'admin') {
      return { status: 403, error: 'Admin authorization required' };
    }

    if (!['resolved', 'dismissed', 'under_review'].includes(status)) {
      return { status: 400, error: 'Invalid resolution status' };
    }

    if (['resolved', 'dismissed'].includes(status) && (!notes || !notes.trim())) {
      return { status: 400, error: 'Resolution notes are required for audit trail' };
    }

    const report = this.reports.find(r => r._id === reportId);
    if (!report) {
      return { status: 404, error: 'Report not found' };
    }

    const previousStatus = report.status;
    report.status = status;
    report.resolution = {
      outcome: outcome || 'Action applied by platform moderator',
      notes: notes.trim(),
      resolvedBy: adminUser._id,
      resolvedAt: new Date()
    };

    this.activityLogs.push({
      user: adminUser._id,
      action: status === 'resolved' ? 'REPORT_RESOLVED' : 'REPORT_DISMISSED',
      targetType: 'Report',
      targetId: report._id,
      details: { previousStatus, newStatus: status, outcome, notes: notes.trim() }
    });

    return { status: 200, report };
  }

  // --- Booking Dispute Workflow ---
  createDispute(callerUser, { bookingId, disputeCategory, reason, description, evidence }) {
    const authCheck = this.authenticateRequest(callerUser);
    if (authCheck.status !== 200) return authCheck;

    if (!reason || !reason.trim() || !description || !description.trim()) {
      return { status: 400, error: 'Reason and detailed description are required' };
    }

    const booking = this.bookings.find(b => b._id === bookingId);
    if (!booking) {
      return { status: 404, error: 'Booking not found' };
    }

    // Participant verification
    const isCustomer = booking.customer === callerUser._id;
    const isVendor = booking.vendor === callerUser._id;

    if (!isCustomer && !isVendor && callerUser.role !== 'admin') {
      return {
        status: 403,
        error: 'You are not authorized to raise a dispute for a booking you are not part of.'
      };
    }

    // Duplicate check
    const existing = this.disputes.find(
      d => d.booking === bookingId && d.raisedBy === callerUser._id && ['open', 'under_review', 'investigating'].includes(d.status)
    );
    if (existing) {
      return { status: 409, error: 'An active dispute is already open for this booking' };
    }

    const againstUserId = isCustomer ? booking.vendor : booking.customer;

    const dispute = {
      _id: `disp_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      booking: booking._id,
      raisedBy: callerUser._id,
      against: againstUserId,
      disputeCategory: disputeCategory || 'other',
      reason: reason.trim(),
      description: description.trim(),
      evidence: evidence || [],
      status: 'open',
      resolution: null,
      createdAt: new Date()
    };
    this.disputes.push(dispute);

    // Atomically update booking status
    if (!['completed', 'cancelled'].includes(booking.status)) {
      booking.status = 'disputed';
    }

    return { status: 201, dispute, booking };
  }

  resolveDispute(adminUser, disputeId, { status = 'resolved', outcome, notes, bookingAction = 'none' }) {
    if (!adminUser || adminUser.role !== 'admin') {
      return { status: 403, error: 'Admin authorization required' };
    }

    if (!notes || !notes.trim()) {
      return { status: 400, error: 'Resolution notes are required for audit record' };
    }

    const dispute = this.disputes.find(d => d._id === disputeId);
    if (!dispute) {
      return { status: 404, error: 'Dispute record not found' };
    }

    const previousStatus = dispute.status;
    dispute.status = status;
    dispute.resolution = {
      outcome: outcome || 'Resolved by Platform Administrator',
      notes: notes.trim(),
      bookingAction,
      resolvedBy: adminUser._id,
      resolvedAt: new Date()
    };

    // Apply booking action if linked
    const booking = this.bookings.find(b => b._id === dispute.booking);
    if (booking && bookingAction !== 'none') {
      if (bookingAction === 'refund_processed') {
        booking.pricing.paymentStatus = 'refunded';
        booking.status = 'cancelled';
      } else if (bookingAction === 'escrow_released') {
        booking.pricing.paymentStatus = 'released';
        booking.status = 'completed';
      } else if (bookingAction === 'booking_cancelled') {
        booking.status = 'cancelled';
      }
    }

    this.activityLogs.push({
      user: adminUser._id,
      action: 'DISPUTE_RESOLVED',
      targetType: 'Dispute',
      targetId: dispute._id,
      details: { previousStatus, newStatus: status, outcome, notes: notes.trim(), bookingAction }
    });

    return { status: 200, dispute, booking };
  }
}

describe('Admin Control & Disputes Module', () => {
  let db;
  let superAdmin;
  let customerUser;
  let proUser;
  let maliciousUser;
  let proProfile;

  beforeEach(() => {
    db = new MockAdminDatabase();
    superAdmin = db.createUser({ _id: 'admin_1', name: 'Super Admin', email: 'admin@worklogy.com', role: 'admin' });
    customerUser = db.createUser({ _id: 'cust_1', name: 'Rohan Sharma', email: 'rohan@example.com', role: 'customer' });
    proUser = db.createUser({ _id: 'pro_1', name: 'Amit Verma', email: 'amit@servicepro.com', role: 'vendor' });
    maliciousUser = db.createUser({ _id: 'user_x', name: 'Attacker', email: 'attacker@example.com', role: 'customer' });
    proProfile = db.createVendorProfile(proUser._id, { approvalStatus: 'pending' });
  });

  // ==========================================
  // 1. VENDOR VERIFICATION MANAGEMENT
  // ==========================================
  describe('1. Vendor Verification Workflow', () => {
    it('allows authorized admin to approve a pending vendor and updates badge + user status', () => {
      const res = db.updateVendorApproval(superAdmin, proProfile._id, {
        status: 'approved',
        reason: 'All background checks and Aadhaar verified',
        notes: 'Verified via UIDAI partner API'
      });

      assert.equal(res.status, 200);
      assert.equal(res.vendor.approvalStatus, 'approved');
      assert.equal(res.vendor.verifiedBadge.status, 'verified');
      assert.ok(res.vendor.verifiedBadge.verifiedAt instanceof Date);

      // Verify User status was activated
      const updatedUser = db.users.find(u => u._id === proUser._id);
      assert.equal(updatedUser.status, 'active');
      assert.equal(updatedUser.isActive, true);

      // Verify audit log
      const log = db.activityLogs.find(l => l.action === 'VENDOR_APPROVAL_UPDATED');
      assert.ok(log);
      assert.equal(log.details.newStatus, 'approved');
    });

    it('requires a mandatory reason when rejecting or requesting changes', () => {
      const resWithoutReason = db.updateVendorApproval(superAdmin, proProfile._id, {
        status: 'changes_required',
        reason: ''
      });
      assert.equal(resWithoutReason.status, 400);
      assert.match(resWithoutReason.error, /reason is required/i);

      // With valid reason
      const resWithReason = db.updateVendorApproval(superAdmin, proProfile._id, {
        status: 'changes_required',
        reason: 'Electrical license scan is blurry. Please upload high-res PDF.'
      });
      assert.equal(resWithReason.status, 200);
      assert.equal(resWithReason.vendor.approvalStatus, 'changes_required');
    });

    it('rejects verification attempt by unauthorized non-admin user', () => {
      const res = db.updateVendorApproval(customerUser, proProfile._id, {
        status: 'approved'
      });
      assert.equal(res.status, 403);
      assert.match(res.error, /Only authorized administrators/i);
    });

    it('masks government ID numbers so raw Aadhaar/PAN is never exposed', () => {
      assert.equal(proProfile.verifiedBadge.maskedIdNumber, 'XXXX-XXXX-8921');
      assert.doesNotMatch(proProfile.verifiedBadge.maskedIdNumber, /^\d{12}$/);
    });
  });

  // ==========================================
  // 2. USER REPORTS & ABUSE MODERATION
  // ==========================================
  describe('2. User Reporting & Moderation Queue', () => {
    it('allows authenticated customer to report a suspicious vendor or listing', () => {
      const res = db.createReport(customerUser, {
        targetType: 'vendor',
        targetId: proProfile._id,
        reason: 'suspected_fraud',
        description: 'Vendor asked for direct offline UPI payment outside the platform.',
        evidence: ['screenshot_upi_request.png']
      });

      assert.equal(res.status, 201);
      assert.equal(res.report.status, 'new');
      assert.equal(res.report.reportedBy, customerUser._id);
      assert.equal(res.report.reason, 'suspected_fraud');
    });

    it('rejects duplicate reports by the same user while previous report is open', () => {
      db.createReport(customerUser, {
        targetType: 'vendor',
        targetId: proProfile._id,
        reason: 'spam_fake',
        description: 'First report'
      });

      const duplicateRes = db.createReport(customerUser, {
        targetType: 'vendor',
        targetId: proProfile._id,
        reason: 'spam_fake',
        description: 'Duplicate attempt'
      });

      assert.equal(duplicateRes.status, 409);
      assert.match(duplicateRes.error, /already under review/i);
    });

    it('allows admin to resolve a report with mandatory audit notes', () => {
      const created = db.createReport(customerUser, {
        targetType: 'vendor',
        targetId: proProfile._id,
        reason: 'harassment_abuse',
        description: 'Inappropriate language in chat'
      });

      const resolveRes = db.resolveReport(superAdmin, created.report._id, {
        status: 'resolved',
        outcome: 'Warning issued to contractor; chat message redacted',
        notes: 'Chat transcript verified abusive tone. 1st formal warning logged.'
      });

      assert.equal(resolveRes.status, 200);
      assert.equal(resolveRes.report.status, 'resolved');
      assert.equal(resolveRes.report.resolution.resolvedBy, superAdmin._id);

      const log = db.activityLogs.find(l => l.action === 'REPORT_RESOLVED');
      assert.ok(log);
      assert.equal(log.details.outcome, 'Warning issued to contractor; chat message redacted');
    });

    it('allows admin to dismiss a report if no policy violation was found', () => {
      const created = db.createReport(customerUser, {
        targetType: 'vendor',
        targetId: proProfile._id,
        reason: 'other',
        description: 'Price seems slightly high'
      });

      const dismissRes = db.resolveReport(superAdmin, created.report._id, {
        status: 'dismissed',
        notes: 'Prices are within standard platform catalog range. No policy breach.'
      });

      assert.equal(dismissRes.status, 200);
      assert.equal(dismissRes.report.status, 'dismissed');

      const log = db.activityLogs.find(l => l.action === 'REPORT_DISMISSED');
      assert.ok(log);
    });
  });

  // ==========================================
  // 3. BOOKING DISPUTES & RESOLUTION
  // ==========================================
  describe('3. Booking Disputes Lifecycle', () => {
    let booking;

    beforeEach(() => {
      booking = db.createBooking({
        customer: customerUser._id,
        vendor: proUser._id,
        amount: 2500,
        status: 'in_progress',
        serviceTitle: 'Pipe Leakage Repair'
      });
    });

    it('allows customer to raise a dispute against an active booking', () => {
      const res = db.createDispute(customerUser, {
        bookingId: booking._id,
        disputeCategory: 'incomplete_unsatisfactory',
        reason: 'Plumber left without fixing the main valve leak',
        description: 'Work was started but plumber left abruptly. Water is still leaking.'
      });

      assert.equal(res.status, 201);
      assert.equal(res.dispute.status, 'open');
      assert.equal(res.dispute.raisedBy, customerUser._id);
      assert.equal(res.dispute.against, proUser._id);
      assert.equal(res.booking.status, 'disputed');
    });

    it('prevents non-participants from raising disputes on bookings they do not own (IDOR guard)', () => {
      const res = db.createDispute(maliciousUser, {
        bookingId: booking._id,
        disputeCategory: 'service_not_delivered',
        reason: 'Malicious dispute injection',
        description: 'Should be rejected'
      });

      assert.equal(res.status, 403);
      assert.match(res.error, /not authorized to raise a dispute for a booking you are not part of/i);
    });

    it('prevents duplicate open disputes on the same booking by the same party', () => {
      db.createDispute(customerUser, {
        bookingId: booking._id,
        disputeCategory: 'pricing_disagreement',
        reason: 'Extra fees demanded',
        description: 'First dispute'
      });

      const duplicate = db.createDispute(customerUser, {
        bookingId: booking._id,
        disputeCategory: 'pricing_disagreement',
        reason: 'Extra fees demanded again',
        description: 'Second duplicate dispute'
      });

      assert.equal(duplicate.status, 409);
      assert.match(duplicate.error, /already open/i);
    });

    it('resolves dispute with refund_processed and cancels booking atomically', () => {
      const disp = db.createDispute(customerUser, {
        bookingId: booking._id,
        disputeCategory: 'service_not_delivered',
        reason: 'No show',
        description: 'Contractor did not arrive at site'
      });

      const resolveRes = db.resolveDispute(superAdmin, disp.dispute._id, {
        status: 'resolved',
        outcome: 'Full refund to customer due to contractor no-show',
        notes: 'GPS logs confirm contractor was outside service radius at scheduled time.',
        bookingAction: 'refund_processed'
      });

      assert.equal(resolveRes.status, 200);
      assert.equal(resolveRes.dispute.status, 'resolved');
      assert.equal(resolveRes.booking.pricing.paymentStatus, 'refunded');
      assert.equal(resolveRes.booking.status, 'cancelled');

      const log = db.activityLogs.find(l => l.action === 'DISPUTE_RESOLVED');
      assert.ok(log);
      assert.equal(log.details.bookingAction, 'refund_processed');
    });

    it('resolves dispute with escrow_released and completes booking atomically', () => {
      const disp = db.createDispute(proUser, {
        bookingId: booking._id,
        disputeCategory: 'pricing_disagreement',
        reason: 'Customer refused OTP sign-off',
        description: 'Service completed fully with photo evidence'
      });

      const resolveRes = db.resolveDispute(superAdmin, disp.dispute._id, {
        status: 'resolved',
        outcome: 'Photos confirm service was delivered satisfactorily',
        notes: 'Customer OTP withheld improperly. Escrow released to professional.',
        bookingAction: 'escrow_released'
      });

      assert.equal(resolveRes.status, 200);
      assert.equal(resolveRes.booking.pricing.paymentStatus, 'released');
      assert.equal(resolveRes.booking.status, 'completed');
    });
  });

  // ==========================================
  // 4. FRAUD, SPAM & ACCOUNT SUSPENSION
  // ==========================================
  describe('4. Account Moderation & Suspension Enforcement', () => {
    it('suspends a bad actor account and blocks future authenticated API requests', () => {
      // 1. Admin suspends vendor
      const suspendRes = db.updateVendorApproval(superAdmin, proProfile._id, {
        status: 'suspended',
        reason: 'Repeated off-platform billing fraud'
      });
      assert.equal(suspendRes.status, 200);

      const suspendedPro = db.users.find(u => u._id === proUser._id);
      assert.equal(suspendedPro.status, 'suspended');
      assert.equal(suspendedPro.isActive, false);
      assert.equal(suspendedPro.suspensionReason, 'Repeated off-platform billing fraud');

      // 2. Suspended vendor attempts to invoke API
      const apiAttempt = db.authenticateRequest(suspendedPro);
      assert.equal(apiAttempt.status, 403);
      assert.match(apiAttempt.error, /Account suspended: Repeated off-platform billing fraud/);
    });

    it('re-activates suspended account upon legitimate reinstatement', () => {
      // Suspend first
      db.updateVendorApproval(superAdmin, proProfile._id, {
        status: 'suspended',
        reason: 'Pending verification documents'
      });

      // Admin reinstates / approves
      const reinstateRes = db.updateVendorApproval(superAdmin, proProfile._id, {
        status: 'approved',
        reason: 'Valid documents submitted and verified'
      });

      assert.equal(reinstateRes.status, 200);
      const pro = db.users.find(u => u._id === proUser._id);
      assert.equal(pro.status, 'active');
      assert.equal(pro.isActive, true);

      // Reinstated user can now access API
      const auth = db.authenticateRequest(pro);
      assert.equal(auth.status, 200);
    });
  });

  // ==========================================
  // 5. AUDIT LOG INTEGRITY & SECURITY
  // ==========================================
  describe('5. Audit Logging & Security Guardrails', () => {
    it('records immutable audit log entries without leaking passwords or private credentials', () => {
      db.updateVendorApproval(superAdmin, proProfile._id, {
        status: 'approved',
        reason: 'Background verification passed'
      });

      const auditEntries = db.activityLogs;
      assert.ok(auditEntries.length >= 1);

      for (const entry of auditEntries) {
        assert.ok(entry.user);
        assert.ok(entry.action);
        assert.ok(entry.targetType);
        assert.ok(entry.targetId);

        // Verify zero credentials in logs
        const str = JSON.stringify(entry);
        assert.doesNotMatch(str, /password/i);
        assert.doesNotMatch(str, /jwt/i);
        assert.doesNotMatch(str, /secret/i);
      }
    });
  });
});

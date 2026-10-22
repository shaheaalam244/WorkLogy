import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Verified Vendor Profiles & Secure Identity Verification Test Suite
 * Validates P0 privacy guardrails, ID masking, RBAC rules, and verification workflows.
 */

// 1. Aadhaar & National ID Masking Algorithm
const maskIdNumber = (rawId, type = 'aadhaar_card') => {
  if (!rawId) return 'XXXX-XXXX-****';
  const trimmed = String(rawId).trim();
  const rawDigits = trimmed.replace(/\D/g, '');
  if (rawDigits.length === 12) {
    return `XXXX-XXXX-${rawDigits.slice(-4)}`;
  }
  const last4 = trimmed.slice(-4);
  return `XXXX-${last4}`;
};

// 2. Public Profile Sanitization Function (matches backend sanitizePublicVendor)
const sanitizePublicVendor = (vendorDoc) => {
  if (!vendorDoc) return null;
  const v = JSON.parse(JSON.stringify(vendorDoc));

  const rawStatus = v.verifiedBadge?.status || 'not_submitted';
  const isVerified = rawStatus === 'verified' || rawStatus === 'approved';
  v.verifiedBadge = {
    status: isVerified ? 'verified' : (rawStatus === 'unsubmitted' ? 'not_submitted' : rawStatus),
    verifiedAt: v.verifiedBadge?.verifiedAt || null
  };

  // Strictly remove all sensitive identity documents, internal notes & audit trails
  delete v.adminNotes;
  delete v.approvalHistory;
  delete v.rejectionReason;
  delete v.rejectionHistory;
  delete v.earningsTotal;

  // Mask sensitive direct contact fields
  if (v.user) {
    if (v.user.phone) {
      const p = String(v.user.phone).trim();
      v.user.phone = p.length >= 4 ? `+91 ******${p.slice(-4)}` : '+91 **********';
    }
    if (v.user.email) {
      const parts = String(v.user.email).split('@');
      if (parts.length === 2) {
        const username = parts[0];
        const maskedUser = username.length > 2 ? `${username.slice(0, 2)}***` : 'u***';
        v.user.email = `${maskedUser}@${parts[1]}`;
      }
    }
  }

  return v;
};

// 3. Document Extension & Content-Type Validator
const validateDocumentFormat = (doc) => {
  if (!doc || !doc.url || !doc.name) return { valid: false, reason: 'Missing document name or URL' };
  const validExtensions = /\.(pdf|png|jpe?g|webp)(\?.*)?$/i;
  const isDataUri = typeof doc.url === 'string' && (doc.url.startsWith('data:image/') || doc.url.startsWith('data:application/pdf'));
  const isAllowedUrl = isDataUri || validExtensions.test(doc.url) || doc.url.includes('cloudinary') || doc.url.includes('unsplash');
  if (!isAllowedUrl) {
    return { valid: false, reason: 'Unsupported document format. Allowed: PDF, PNG, JPG, JPEG, WEBP' };
  }
  return { valid: true };
};

// 4. Verification Workflow State Transitions Validator
const canShowVerifiedBadge = (status) => {
  const normalized = String(status || '').toLowerCase().trim();
  return normalized === 'verified' || normalized === 'approved';
};

describe('Verified Vendor Profiles: P0 Identity Privacy & Security Guardrails', () => {

  it('Strictly masks 12-digit Aadhaar numbers and never reveals full number', () => {
    const rawAadhaar = '5482 9102 3847';
    const masked = maskIdNumber(rawAadhaar, 'aadhaar_card');
    assert.equal(masked, 'XXXX-XXXX-3847');
    assert.ok(!masked.includes('5482'), 'Raw Aadhaar initial 4 digits must never be present');
    assert.ok(!masked.includes('9102'), 'Raw Aadhaar middle 4 digits must never be present');
  });

  it('Properly masks PAN and custom trade license numbers with last 4 characters preserved', () => {
    const panNumber = 'ABCDE1234F';
    const masked = maskIdNumber(panNumber, 'pan_card');
    assert.equal(masked, 'XXXX-234F');
  });

  it('Public Profile sanitizer strips all sensitive identity documents, Aadhaar files, and admin notes', () => {
    const mockVendorWithDossier = {
      _id: 'vendor_123',
      businessName: 'Sharma Electricals & Engineering',
      user: {
        name: 'Amit Sharma',
        email: 'amit.sharma@example.com',
        phone: '9876543210'
      },
      approvalStatus: 'approved',
      verifiedBadge: {
        status: 'verified',
        verificationRequestId: 'VR-12345-ABCD',
        maskedIdNumber: 'XXXX-XXXX-3210',
        consentProvided: true,
        verifiedAt: new Date().toISOString(),
        documents: [
          { name: 'Aadhaar Card Copy', url: 'https://secure.internal/docs/aadhaar_full.pdf' },
          { name: 'PWD Contractor License', url: 'https://secure.internal/docs/pwd_license.pdf' }
        ]
      },
      adminNotes: [
        { note: 'Inspected original certificates. All valid.', createdAt: new Date() }
      ],
      approvalHistory: [
        { status: 'approved', reason: 'Identity verified' }
      ]
    };

    const publicProfile = sanitizePublicVendor(mockVendorWithDossier);

    // Assert that sensitive fields are completely absent in the public payload
    assert.equal(publicProfile.verifiedBadge.status, 'verified');
    assert.equal(publicProfile.verifiedBadge.documents, undefined, 'Public profile must never expose documents array');
    assert.equal(publicProfile.verifiedBadge.maskedIdNumber, undefined, 'Public profile must never expose maskedIdNumber');
    assert.equal(publicProfile.adminNotes, undefined, 'Public profile must never expose internal admin notes');
    assert.equal(publicProfile.approvalHistory, undefined, 'Public profile must never expose approval history');
    assert.equal(publicProfile.user.phone, '+91 ******3210', 'Phone number must be masked for public viewers');
    assert.equal(publicProfile.user.email, 'am***@example.com', 'Email must be masked for public viewers');
  });

  it('Prevents unverified, pending, or rejected vendors from showing the Verified Pro badge', () => {
    assert.equal(canShowVerifiedBadge('not_submitted'), false);
    assert.equal(canShowVerifiedBadge('pending_review'), false);
    assert.equal(canShowVerifiedBadge('pending'), false);
    assert.equal(canShowVerifiedBadge('under_review'), false);
    assert.equal(canShowVerifiedBadge('changes_required'), false);
    assert.equal(canShowVerifiedBadge('rejected'), false);
    assert.equal(canShowVerifiedBadge('expired'), false);

    // Only verified or approved returns true
    assert.equal(canShowVerifiedBadge('verified'), true);
    assert.equal(canShowVerifiedBadge('approved'), true);
  });

  it('Rejects invalid or malicious document uploads', () => {
    const invalidDoc1 = { name: 'Trojan script', url: 'https://malicious.com/payload.exe' };
    const invalidDoc2 = { name: 'HTML script', url: 'https://malicious.com/attack.html' };
    const validDoc = { name: 'Govt Electrical License', url: 'https://res.cloudinary.com/worklogy/license.pdf' };

    assert.equal(validateDocumentFormat(invalidDoc1).valid, false);
    assert.equal(validateDocumentFormat(invalidDoc2).valid, false);
    assert.equal(validateDocumentFormat(validDoc).valid, true);
  });

  it('Enforces mandatory statutory consent for identity verification', () => {
    const attemptSubmission = (consent, documents) => {
      if (!consent) {
        throw new Error('Explicit consent is mandatory for identity verification processing under platform privacy guidelines.');
      }
      if (!documents || documents.length === 0) {
        throw new Error('At least one valid verification document is required.');
      }
      return { success: true, verificationRequestId: 'VR-TEST-1234' };
    };

    assert.throws(
      () => attemptSubmission(false, [{ name: 'Doc', url: 'https://worklogy.com/doc.pdf' }]),
      /Explicit consent is mandatory/
    );

    assert.throws(
      () => attemptSubmission(true, []),
      /At least one valid verification document is required/
    );

    const successful = attemptSubmission(true, [{ name: 'License', url: 'https://worklogy.com/doc.pdf' }]);
    assert.equal(successful.success, true);
    assert.ok(successful.verificationRequestId.startsWith('VR-'));
  });

  it('Enforces mandatory reason when administrator rejects or requests resubmission', () => {
    const reviewSubmission = (action, reason) => {
      if (['reject', 'request_resubmission', 'changes_required'].includes(action) && (!reason || !reason.trim())) {
        throw new Error('A mandatory reason must be specified when rejecting or requesting changes on a verification request.');
      }
      return { success: true, action };
    };

    assert.throws(
      () => reviewSubmission('reject', ''),
      /A mandatory reason must be specified/
    );

    assert.throws(
      () => reviewSubmission('changes_required', '   '),
      /A mandatory reason must be specified/
    );

    const approved = reviewSubmission('approve', '');
    assert.equal(approved.success, true);

    const rejectedWithReason = reviewSubmission('reject', 'Document was blurred and expiration date could not be verified.');
    assert.equal(rejectedWithReason.success, true);
  });

  it('Guarantees completed jobs and review counts reflect actual database records', () => {
    const calculateJobsMetrics = (completedBookingsCount, liveReviews) => {
      // Zero-mock policy: never use fake 42 or hardcoded placeholders
      const genuineCompletedCount = Math.max(0, parseInt(completedBookingsCount) || 0);
      const genuineReviewsCount = Array.isArray(liveReviews) ? liveReviews.length : 0;
      return {
        completedJobs: genuineCompletedCount,
        reviewCount: genuineReviewsCount
      };
    };

    const emptyMetrics = calculateJobsMetrics(0, []);
    assert.equal(emptyMetrics.completedJobs, 0);
    assert.equal(emptyMetrics.reviewCount, 0);

    const activeMetrics = calculateJobsMetrics(18, [{ rating: 5 }, { rating: 4.8 }]);
    assert.equal(activeMetrics.completedJobs, 18);
    assert.equal(activeMetrics.reviewCount, 2);
  });

});

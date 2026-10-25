/**
 * Strips private identity documents, internal notes, and administrative fields for public APIs.
 */
export const sanitizePublicVendor = (vendorDoc) => {
  if (!vendorDoc) return null;
  const v = vendorDoc.toObject ? vendorDoc.toObject() : { ...vendorDoc };

  // Only expose public-safe verification status and timestamp
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

  // Sensitive contact fields masking
  if (v.user && typeof v.user === 'object') {
    delete v.user.password;
    delete v.user.suspensionReason;
  }

  return v;
};

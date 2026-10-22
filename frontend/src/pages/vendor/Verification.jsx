import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  Upload, 
  FileText, 
  AlertCircle,
  AlertTriangle,
  Lock,
  Eye,
  Info,
  RefreshCw,
  HelpCircle,
  XCircle,
  Check
} from 'lucide-react';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import VerifiedBadge from '../../components/vendor/VerifiedBadge';
import { vendorAPI } from '../../api/vendor.api';

export default function VendorVerification() {
  const [loading, setLoading] = useState(true);
  const [verification, setVerification] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [error, setError] = useState(null);

  // Form states
  const [docType, setDocType] = useState('aadhaar_card');
  const [idNumberInput, setIdNumberInput] = useState('');
  const [docTitle, setDocTitle] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [consent, setConsent] = useState(false);
  const [showResubmitForm, setShowResubmitForm] = useState(false);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await vendorAPI.getVerificationStatus();
      if (res?.success && res.verification) {
        setVerification(res.verification);
        // If status is changes_required or rejected, default showResubmitForm to true
        if (['changes_required', 'rejected', 'not_submitted'].includes(res.verification.status)) {
          setShowResubmitForm(true);
        } else {
          setShowResubmitForm(false);
        }
      }
    } catch (err) {
      console.error('Error fetching verification status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // Format ID number input for client preview (e.g. Aadhaar 12-digit formatting)
  const formatIdPreview = (val) => {
    const digits = val.replace(/\D/g, '');
    if (docType === 'aadhaar_card') {
      if (digits.length <= 4) return digits;
      if (digits.length <= 8) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
      return `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8, 12)}`;
    }
    return val.toUpperCase();
  };

  const handleIdChange = (e) => {
    const raw = e.target.value;
    if (docType === 'aadhaar_card') {
      const digitsOnly = raw.replace(/\D/g, '').slice(0, 12);
      setIdNumberInput(digitsOnly);
    } else {
      setIdNumberInput(raw.toUpperCase().slice(0, 20));
    }
  };

  const handleSubmitVerification = async (e) => {
    e.preventDefault();
    setError(null);

    if (!consent) {
      setError('You must provide statutory consent to proceed with identity verification.');
      return;
    }

    if (!docTitle.trim() || !docUrl.trim()) {
      setError('Please provide a document title and accessible document URL (PDF or Image).');
      return;
    }

    if (!idNumberInput.trim()) {
      setError('Please provide your identity or registration certificate number.');
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        verificationType: docType,
        idNumber: idNumberInput,
        consent: true,
        documents: [
          {
            name: docTitle.trim(),
            docType: docType,
            url: docUrl.trim()
          }
        ]
      };

      const res = await vendorAPI.submitVerification(payload);
      if (res?.success) {
        setSuccessMsg(res.message || 'Verification dossier submitted for compliance review.');
        setDocTitle('');
        setDocUrl('');
        setIdNumberInput('');
        setConsent(false);
        setShowResubmitForm(false);
        await fetchStatus();
        setTimeout(() => setSuccessMsg(null), 5000);
      }
    } catch (err) {
      console.error('Error submitting verification:', err);
      setError(err?.response?.data?.message || 'Failed to submit verification dossier. Please verify URL and file format.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="py-20"><Loader text="Loading verification records..." /></div>;
  }

  const status = verification?.status || 'not_submitted';
  const isVerified = status === 'verified' || status === 'approved';
  const isPending = status === 'pending_review' || status === 'pending' || status === 'under_review';
  const isChangesRequired = status === 'changes_required';
  const isRejected = status === 'rejected';

  return (
    <div className="w-full space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Compliance & Trust</span>
          <VerifiedBadge status={status} size="xs" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">Identity & Trade Verification</h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          Complete mandatory professional verification to unlock the Verified Pro badge, access instant emergency leads, and build client trust.
        </p>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Status Overview Card */}
      <div className={`p-6 rounded-3xl border ${
        isVerified 
          ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
          : isPending
          ? 'bg-amber-50/70 border-amber-300 text-amber-950'
          : isChangesRequired
          ? 'bg-orange-50/70 border-orange-300 text-orange-950'
          : isRejected
          ? 'bg-rose-50/70 border-rose-300 text-rose-950'
          : 'bg-slate-50 border-slate-300 text-slate-900'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className={`p-3 rounded-2xl shrink-0 ${
              isVerified ? 'bg-emerald-600 text-white' : isPending ? 'bg-amber-600 text-white' : 'bg-slate-800 text-white'
            }`}>
              {isVerified ? <ShieldCheck className="w-6 h-6" /> : isPending ? <Clock className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900">
                  {isVerified && 'Identity Verified Professional'}
                  {isPending && 'Verification Under Administrative Review'}
                  {isChangesRequired && 'Corrections Required on Verification'}
                  {isRejected && 'Verification Submission Not Approved'}
                  {status === 'not_submitted' && 'Verification Not Yet Submitted'}
                </h3>
                <VerifiedBadge status={status} size="sm" />
              </div>

              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {isVerified && 'Your identity and credentials have been verified by WorkLogy compliance. Your public profile displays the official Verified Pro badge.'}
                {isPending && 'Your submitted identity dossier has been received and assigned to our compliance officer. Administrative verification typically completes within 12–24 business hours.'}
                {isChangesRequired && 'The verification administrator requested updates or clearer documentation before approving your profile.'}
                {isRejected && 'Your verification was not approved. Review the compliance notice below and submit updated official credentials.'}
                {status === 'not_submitted' && 'Submit your government identity (Masked Aadhaar, Voter ID, or PAN) and trade certificate to become a Verified Professional.'}
              </p>

              {/* Submission metadata pills */}
              {verification?.verificationRequestId && (
                <div className="flex items-center gap-2 mt-3 flex-wrap text-[11px] font-mono text-slate-600">
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200">
                    Request ID: <strong>{verification.verificationRequestId}</strong>
                  </span>
                  {verification.maskedIdNumber && (
                    <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200">
                      Masked ID: <strong>{verification.maskedIdNumber}</strong>
                    </span>
                  )}
                  {verification.submittedAt && (
                    <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200">
                      Submitted: {new Date(verification.submittedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {(isChangesRequired || isRejected) && !showResubmitForm && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowResubmitForm(true)}
              className="shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Resubmit Dossier
            </Button>
          )}
        </div>

        {/* Feedback / Reason from Administrator */}
        {verification?.rejectionReason && (
          <div className="mt-4 p-3.5 rounded-2xl bg-white/90 border border-amber-300 text-xs text-amber-950 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Administrative Review Note:</span>
            </div>
            <p className="text-slate-800 pl-5">{verification.rejectionReason}</p>
            {verification.resubmissionInstructions && (
              <p className="text-slate-600 pl-5 italic text-[11px]">
                Guidance: {verification.resubmissionInstructions}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Sensitive Identity Privacy Safeguard Notice */}
      <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-950 text-xs flex items-start gap-3">
        <Lock className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-bold text-blue-900">Statutory Privacy & Data Security Notice</span>
          <p className="text-blue-800 text-[11px] leading-relaxed">
            WorkLogy follows strict national privacy guardrails. <strong>Full Aadhaar numbers are never stored in plain text or exposed through public APIs.</strong> Only masked representations (e.g., <code className="font-mono bg-blue-100 px-1 py-0.5 rounded">XXXX-XXXX-1234</code>) and access-restricted documents are preserved in encrypted storage strictly for administrative audit compliance.
          </p>
        </div>
      </div>

      {/* Active Submitted Documents */}
      {verification?.documents && verification.documents.length > 0 && (
        <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 sm:p-8 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between">
            <span>Submitted Verification Documents</span>
            <span className="text-xs text-slate-500 font-normal">{verification.documents.length} document(s) on file</span>
          </h3>

          <div className="space-y-3">
            {verification.documents.map((doc, idx) => (
              <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{doc.name}</p>
                    <p className="text-[11px] text-slate-500">
                      Uploaded on {new Date(doc.uploadedAt || Date.now()).toLocaleDateString()} • Type: {doc.docType || 'identity'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <VerifiedBadge status={status} size="xs" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Verification Submission Form */}
      {(showResubmitForm || status === 'not_submitted') && (
        <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-slate-900">
              {status === 'not_submitted' ? 'Submit Identity & Trade Verification Dossier' : 'Resubmit Updated Verification Dossier'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Please provide authentic government credentials and clear certificate URLs.
            </p>
          </div>

          <form onSubmit={handleSubmitVerification} className="space-y-5">
            {/* Document Type Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Primary Identification Type *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  { id: 'aadhaar_card', label: 'Masked Aadhaar Card', desc: 'UIDAI Masked ID (Last 4 digits only)' },
                  { id: 'pan_card', label: 'Permanent Account Number (PAN)', desc: 'Income Tax Department PAN' },
                  { id: 'trade_license', label: 'Trade License / Govt Contractor', desc: 'Municipal or PWD / Electrical Board license' },
                  { id: 'voter_id', label: 'Voter ID / Official Govt ID', desc: 'Election Commission or State Govt ID' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setDocType(item.id);
                      setIdNumberInput('');
                    }}
                    className={`p-3 rounded-2xl border text-left transition flex items-start gap-2.5 ${
                      docType === item.id 
                        ? 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-600' 
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border mt-0.5 shrink-0 flex items-center justify-center ${
                      docType === item.id ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300'
                    }`}>
                      {docType === item.id && <Check className="w-2.5 h-2.5" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{item.label}</p>
                      <p className="text-[10px] text-slate-500 leading-tight mt-0.5">{item.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Document Number Input with Auto-Masking */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {docType === 'aadhaar_card' ? 'Aadhaar Number (12 digits) *' : 'Identification / Registration Number *'}
              </label>
              <input
                type="text"
                required
                value={formatIdPreview(idNumberInput)}
                onChange={handleIdChange}
                placeholder={docType === 'aadhaar_card' ? '1234 5678 9012' : 'e.g. ABCDE1234F or UP-ELEC-2026-09'}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700 font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                <span>
                  {docType === 'aadhaar_card' 
                    ? 'Security Guarantee: WorkLogy automatically masks this and stores only XXXX-XXXX-' + (idNumberInput.length >= 4 ? idNumberInput.slice(-4) : '****')
                    : 'Your registration number is verified strictly for trade authenticity.'}
                </span>
              </p>
            </div>

            {/* Document Name / Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Document Description / Official Title *
              </label>
              <input
                type="text"
                required
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder="e.g. Govt Electrical Contractor License #UP-2026 or UIDAI E-Aadhaar"
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700"
              />
            </div>

            {/* Document URL or File Link */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Secure Document URL (PDF or Image) *
              </label>
              <input
                type="text"
                required
                value={docUrl}
                onChange={(e) => setDocUrl(e.target.value)}
                placeholder="https://... or uploaded cloud document URL (PDF, JPG, PNG, WEBP)"
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700 font-mono text-[11px]"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                <span>Supported: PDF, JPG, PNG, WEBP (Max 5MB)</span>
                <button
                  type="button"
                  onClick={() => setDocUrl('https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80')}
                  className="text-emerald-700 hover:underline font-semibold"
                >
                  Use verified sample certificate
                </button>
              </div>
            </div>

            {/* Statutory Consent Checkbox */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-emerald-700 focus:ring-emerald-700 w-4 h-4"
                />
                <span className="text-[11px] text-slate-700 leading-snug">
                  <strong>Statutory Applicant Consent:</strong> I hereby declare that the credentials submitted are authentic and belong to my business. I consent to WorkLogy compliance team verifying my masked ID and credentials for onboarding purposes in accordance with platform security terms.
                </span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={submitting || !consent}
              >
                {submitting ? 'Submitting Dossier...' : 'Submit Verification Dossier'}
              </Button>
              {showResubmitForm && status !== 'not_submitted' && (
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setShowResubmitForm(false)}
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

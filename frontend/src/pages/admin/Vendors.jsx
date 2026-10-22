import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Check, 
  X, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  Filter, 
  Eye, 
  Clock, 
  Ban, 
  Send, 
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Briefcase,
  Layers,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import { adminAPI } from '../../api/admin.api';
import Loader from '../../components/common/Loader';
import VerifiedBadge from '../../components/vendor/VerifiedBadge';
import { formatCurrency, formatDate } from '../../utils/formatters';

const STATUS_PILLS = [
  { key: 'all', label: 'All Pros' },
  { key: 'pending_verification', label: 'Pending Verification 🛡️' },
  { key: 'verified_only', label: 'Verified Pros' },
  { key: 'pending', label: 'Pending Approval' },
  { key: 'under_review', label: 'Under Review' },
  { key: 'changes_required', label: 'Changes Required' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'suspended', label: 'Suspended' }
];

export default function AdminVendors() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [dossierLoading, setDossierLoading] = useState(false);

  // Action Dialog State
  const [actionModal, setActionModal] = useState({
    open: false,
    action: '', // 'approved' | 'changes_required' | 'rejected' | 'suspended'
    vendorId: null,
    vendorName: '',
    reason: '',
    notes: '',
    submitting: false,
    error: ''
  });

  // Admin Note State
  const [newAdminNote, setNewAdminNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter === 'pending_verification') {
        params.verificationStatus = 'pending_review';
      } else if (statusFilter === 'verified_only') {
        params.verificationStatus = 'verified';
      } else if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      if (searchTerm.trim()) params.search = searchTerm.trim();
      
      const res = await adminAPI.getVendors(params);
      if (res?.vendors) {
        setVendors(res.vendors);
      }
    } catch (err) {
      console.error('Failed to load professionals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchVendors();
  };

  const openDossier = async (vendorId) => {
    try {
      setDossierLoading(true);
      const res = await adminAPI.getVendorById(vendorId);
      if (res?.vendor) {
        setSelectedVendor(res.vendor);
      }
    } catch (err) {
      console.error('Failed to load dossier:', err);
    } finally {
      setDossierLoading(false);
    }
  };

  const openActionModal = (vendor, action) => {
    setActionModal({
      open: true,
      action,
      vendorId: vendor._id,
      vendorName: vendor.user?.name || vendor.businessName || 'Professional',
      reason: '',
      notes: '',
      submitting: false,
      error: ''
    });
  };

  const handleConfirmAction = async () => {
    const { action, vendorId, reason, notes } = actionModal;
    const isVerificationAction = action.startsWith('verify_');
    const effectiveAction = isVerificationAction ? action.replace('verify_', '') : action;

    if (['changes_required', 'rejected', 'suspended', 'request_resubmission'].includes(effectiveAction) && !reason.trim()) {
      setActionModal(prev => ({ ...prev, error: 'A clear reason is required for this decision.' }));
      return;
    }

    try {
      setActionModal(prev => ({ ...prev, submitting: true, error: '' }));

      if (isVerificationAction) {
        await adminAPI.reviewVerification(vendorId, {
          action: effectiveAction,
          reason: reason.trim(),
          resubmissionInstructions: reason.trim(),
          adminNotes: notes.trim()
        });
      } else {
        await adminAPI.updateVendorApproval(vendorId, {
          status: effectiveAction,
          reason: reason.trim(),
          notes: notes.trim()
        });
      }

      setActionModal({ open: false, action: '', vendorId: null, vendorName: '', reason: '', notes: '', submitting: false, error: '' });
      fetchVendors();
      if (selectedVendor && selectedVendor._id === vendorId) {
        openDossier(vendorId);
      }
    } catch (err) {
      setActionModal(prev => ({
        ...prev,
        submitting: false,
        error: err.response?.data?.message || 'Failed to execute administrative decision'
      }));
    }
  };

  const handleAddNote = async () => {
    if (!newAdminNote.trim() || !selectedVendor) return;
    try {
      setSavingNote(true);
      const res = await adminAPI.addVendorNote(selectedVendor._id, { note: newAdminNote.trim() });
      if (res?.adminNotes) {
        setSelectedVendor(prev => ({ ...prev, adminNotes: res.adminNotes }));
        setNewAdminNote('');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save admin note');
    } finally {
      setSavingNote(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200"><CheckCircle2 className="w-3 h-3" /> Approved</span>;
      case 'under_review':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200"><Clock className="w-3 h-3" /> Under Review</span>;
      case 'changes_required':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200"><AlertTriangle className="w-3 h-3" /> Changes Required</span>;
      case 'rejected':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200"><X className="w-3 h-3" /> Rejected</span>;
      case 'suspended':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-800 border border-slate-300"><Ban className="w-3 h-3" /> Suspended</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200"><Clock className="w-3 h-3" /> Pending Approval</span>;
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="bg-white border border-slate-200/90 shadow-2xs rounded-3xl p-6 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-purple-800 uppercase tracking-wider bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200/60">
              Professional Governance
            </span>
            <span className="text-xs text-slate-500 font-medium">· Live Review Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
            Professional Approvals & Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl mt-1">
            Review contractor registrations, inspect verification licenses, and manage public visibility. Unapproved professionals cannot bid or accept jobs.
          </p>
        </div>

        <button
          onClick={fetchVendors}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search and Status Filters */}
      <div className="bg-white border border-slate-200/90 shadow-2xs rounded-2xl p-4 sm:p-5 space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by professional name, business name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-600 bg-slate-50/50"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-purple-800 hover:bg-purple-900 text-white rounded-xl text-xs font-bold transition"
          >
            Search
          </button>
        </form>

        {/* Status Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {STATUS_PILLS.map((pill) => (
            <button
              key={pill.key}
              onClick={() => setStatusFilter(pill.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                statusFilter === pill.key
                  ? 'bg-purple-800 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Vendor List */}
      {loading ? (
        <div className="py-20">
          <Loader text="Loading professionals queue..." />
        </div>
      ) : vendors.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center">
          <CheckSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No professionals found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            There are currently no professional profiles matching the selected filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {vendors.map((v) => {
            const userName = v.user?.name || 'Unnamed Professional';
            const userEmail = v.user?.email || 'No email';
            const userPhone = v.user?.phone || 'No phone';
            const business = v.businessName || 'Independent Trade';
            const categories = v.categories?.map(c => c.name).join(', ') || 'General Trade';

            return (
              <div
                key={v._id}
                className="bg-white border border-slate-200/90 hover:border-slate-300 shadow-2xs p-5 sm:p-6 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-5 transition"
              >
                {/* Left Info */}
                <div className="flex items-start gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-800 font-black text-lg flex items-center justify-center shrink-0 border border-purple-200">
                    {userName[0]?.toUpperCase()}
                  </div>

                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-slate-900 truncate">
                        {userName}
                      </h3>
                      {getStatusBadge(v.approvalStatus)}
                      <VerifiedBadge status={v.verifiedBadge?.status || 'not_submitted'} size="xs" />
                    </div>

                    <p className="text-xs font-semibold text-slate-700">
                      {business} · <span className="text-purple-800">{categories}</span>
                    </p>

                    <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                      <span className="inline-flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        {userEmail}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {userPhone}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {v.serviceArea?.city || 'Lucknow Metro'}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Joined {formatDate(v.createdAt)}
                      </span>
                    </div>

                    {v.rejectionReason && (
                      <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg mt-1">
                        <span className="font-bold">Admin Notice:</span> {v.rejectionReason}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end lg:self-center flex-wrap">
                  <button
                    onClick={() => openDossier(v._id)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Full Dossier</span>
                  </button>

                  {v.approvalStatus !== 'approved' && (
                    <button
                      onClick={() => openActionModal(v, 'approved')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-2xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                  )}

                  {v.approvalStatus !== 'changes_required' && v.approvalStatus !== 'suspended' && (
                    <button
                      onClick={() => openActionModal(v, 'changes_required')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-2xs"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Request Changes</span>
                    </button>
                  )}

                  {v.approvalStatus !== 'rejected' && v.approvalStatus !== 'suspended' && (
                    <button
                      onClick={() => openActionModal(v, 'rejected')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-2xs"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  )}

                  {v.approvalStatus === 'approved' && (
                    <button
                      onClick={() => openActionModal(v, 'suspended')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition shadow-2xs"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Suspend Pro</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FULL DOSSIER MODAL */}
      {selectedVendor && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-800 font-black text-xl flex items-center justify-center border border-purple-200">
                  {(selectedVendor.user?.name || selectedVendor.businessName || 'P')[0]?.toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-slate-900">
                      {selectedVendor.user?.name || selectedVendor.businessName}
                    </h2>
                    {getStatusBadge(selectedVendor.approvalStatus)}
                  </div>
                  <p className="text-xs text-slate-500">
                    ID: {selectedVendor._id} · Joined {formatDate(selectedVendor.createdAt)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedVendor(null)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Business & Verification Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Business Details</p>
                <p className="text-xs font-bold text-slate-900">{selectedVendor.businessName || 'Individual'}</p>
                <p className="text-xs text-slate-600">Experience: {selectedVendor.yearsOfExperience || 1} Years</p>
                <p className="text-xs text-slate-600">Hourly Rate: {formatCurrency(selectedVendor.hourlyRate || 0)}/hr</p>
                <p className="text-xs text-slate-600">Emergency Callout: {formatCurrency(selectedVendor.emergencyCallOutFee || 0)}</p>
                <p className="text-xs text-slate-600">
                  Emergency Ready: {selectedVendor.isEmergencyAvailable ? '✅ Active' : '❌ Disabled'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Contact & Area</p>
                <p className="text-xs text-slate-700">Email: {selectedVendor.user?.email || 'N/A'}</p>
                <p className="text-xs text-slate-700">Phone: {selectedVendor.user?.phone || 'N/A'}</p>
                <p className="text-xs text-slate-700">City: {selectedVendor.serviceArea?.city || 'Lucknow'}</p>
                <p className="text-xs text-slate-700">
                  Localities: {selectedVendor.serviceArea?.localities?.join(', ') || 'All Metro Sectors'}
                </p>
              </div>
            </div>

            {/* Services Offered */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-purple-700" />
                <span>Configured Services ({selectedVendor.servicesOffered?.length || 0})</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selectedVendor.servicesOffered?.length > 0 ? (
                  selectedVendor.servicesOffered.map((s, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex justify-between items-center">
                      <div>
                        <p className="font-bold text-slate-800">{s.serviceName}</p>
                        <p className="text-[11px] text-slate-500">{s.categoryName} · {s.pricingType} ({formatCurrency(s.price || 0)})</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        s.isApproved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {s.isApproved ? 'Approved' : 'Pending'}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 italic col-span-2">No services configured yet</p>
                )}
              </div>
            </div>

            {/* Identity & Trade Verification Dossier */}
            <div className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/90">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>Identity & Trade Verification Dossier</span>
                </h3>
                <VerifiedBadge status={selectedVendor.verifiedBadge?.status || 'not_submitted'} size="sm" />
              </div>

              {/* Dossier Meta */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold block">Verification Request ID</span>
                  <span className="font-mono font-bold text-slate-800">
                    {selectedVendor.verifiedBadge?.verificationRequestId || 'N/A'}
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold block">Masked ID Number</span>
                  <span className="font-mono font-bold text-slate-800">
                    {selectedVendor.verifiedBadge?.maskedIdNumber || 'Not submitted'}
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold block">Applicant Consent</span>
                  <span className="text-slate-800 font-semibold">
                    {selectedVendor.verifiedBadge?.consentProvided ? '✅ Explicit Consent Recorded' : 'Not recorded'}
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold block">Submitted At</span>
                  <span className="text-slate-800">
                    {selectedVendor.verifiedBadge?.submittedAt ? formatDate(selectedVendor.verifiedBadge.submittedAt) : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Document Files */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold text-slate-600 block">Submitted Document Files:</span>
                {selectedVendor.verifiedBadge?.documents?.length > 0 ? (
                  selectedVendor.verifiedBadge.documents.map((doc, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                        <div>
                          <span className="font-semibold text-slate-800 block">{doc.name || `Document #${idx + 1}`}</span>
                          <span className="text-[10px] text-slate-400">Type: {doc.docType || 'identity'}</span>
                        </div>
                      </div>
                      {doc.url && doc.url !== '#' ? (
                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-800 font-bold hover:underline">
                          Inspect Document ↗
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-400">Stored Securely</span>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 italic">No verification documents uploaded</p>
                )}
              </div>

              {/* Direct Verification Actions Bar */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-200 flex-wrap">
                {selectedVendor.verifiedBadge?.status !== 'verified' && (
                  <button
                    type="button"
                    onClick={() => openActionModal(selectedVendor, 'verify_approve')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-2xs"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Approve Verification (Grant Badge)</span>
                  </button>
                )}

                {selectedVendor.verifiedBadge?.status !== 'changes_required' && (
                  <button
                    type="button"
                    onClick={() => openActionModal(selectedVendor, 'verify_changes_required')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-2xs"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Request Resubmission</span>
                  </button>
                )}

                {selectedVendor.verifiedBadge?.status !== 'rejected' && (
                  <button
                    type="button"
                    onClick={() => openActionModal(selectedVendor, 'verify_reject')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-2xs"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reject Verification</span>
                  </button>
                )}
              </div>
            </div>

            {/* Approval History Audit Trail */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-purple-700" />
                <span>Review History</span>
              </h3>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {selectedVendor.approvalHistory?.length > 0 ? (
                  selectedVendor.approvalHistory.map((h, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">{h.status?.replace('_', ' ').toUpperCase()}</span>
                        <span className="text-[10px] text-slate-400">{formatDate(h.reviewedAt)}</span>
                      </div>
                      <p className="text-slate-600">{h.reason}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 italic">No prior review decisions recorded</p>
                )}
              </div>
            </div>

            {/* Internal Admin Notes */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Internal Administrative Notes
              </h3>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {selectedVendor.adminNotes?.map((n, idx) => (
                  <div key={idx} className="p-2 rounded-xl bg-purple-50/60 border border-purple-100 text-xs">
                    <p className="text-slate-800">{n.note}</p>
                    <span className="text-[10px] text-purple-700 font-semibold">{formatDate(n.createdAt)}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Add internal note regarding this professional..."
                  value={newAdminNote}
                  onChange={(e) => setNewAdminNote(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-purple-600"
                />
                <button
                  onClick={handleAddNote}
                  disabled={savingNote || !newAdminNote.trim()}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                >
                  Save Note
                </button>
              </div>
            </div>

            {/* Decision Bar */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                onClick={() => setSelectedVendor(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
              >
                Close
              </button>
              <button
                onClick={() => openActionModal(selectedVendor, 'approved')}
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold"
              >
                Approve Pro
              </button>
              <button
                onClick={() => openActionModal(selectedVendor, 'changes_required')}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
              >
                Request Changes
              </button>
              <button
                onClick={() => openActionModal(selectedVendor, 'rejected')}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Reject
              </button>
              <button
                onClick={() => openActionModal(selectedVendor, 'suspended')}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold"
              >
                Suspend
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION & REASON MODAL */}
      {actionModal.open && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div>
              <h3 className="text-lg font-black text-slate-900">
                Confirm Decision: {actionModal.action.replace('_', ' ').toUpperCase()}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Target Professional: <span className="font-bold text-slate-800">{actionModal.vendorName}</span>
              </p>
            </div>

            {actionModal.error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                {actionModal.error}
              </div>
            )}

            {['changes_required', 'rejected', 'suspended', 'verify_changes_required', 'verify_reject'].includes(actionModal.action) && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Reason for Decision <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder={`Explain clearly to the professional why this action is being taken or what documents need to be resubmitted...`}
                  value={actionModal.reason}
                  onChange={(e) => setActionModal(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-600"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Internal Admin Notes (Optional)</label>
              <input
                type="text"
                placeholder="Additional audit note for admin records..."
                value={actionModal.notes}
                onChange={(e) => setActionModal(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-600"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setActionModal(prev => ({ ...prev, open: false }))}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={actionModal.submitting}
                className="px-4 py-2 rounded-xl bg-purple-800 hover:bg-purple-900 text-white text-xs font-bold transition disabled:opacity-50"
              >
                {actionModal.submitting ? 'Applying Decision...' : 'Confirm Decision'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

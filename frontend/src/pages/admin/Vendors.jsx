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
  UserCheck,
  CheckSquare,
  Users,
  Compass,
  Star
} from 'lucide-react';
import { adminAPI } from '../../api/admin.api';
import Loader from '../../components/common/Loader';
import VerifiedBadge from '../../components/vendor/VerifiedBadge';
import { formatCurrency, formatDate } from '../../utils/formatters';
import VendorDetailsModal from '../../components/admin/VendorDetailsModal';

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
  
  // Active Dossier Modal State
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [vendorBookings, setVendorBookings] = useState([]);
  const [vendorReviews, setVendorReviews] = useState([]);
  const [vendorJobs, setVendorJobs] = useState([]);
  const [vendorTransactions, setVendorTransactions] = useState([]);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [savingNote, setSavingNote] = useState(false);

  // Action Confirmation Dialog State
  const [actionModal, setActionModal] = useState({
    open: false,
    action: '', // 'approved' | 'changes_required' | 'rejected' | 'suspended' | 'verify_approve' | 'verify_changes_required' | 'verify_reject'
    vendorId: null,
    vendorName: '',
    reason: '',
    notes: '',
    submitting: false,
    error: ''
  });

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

  const openDossier = async (vendorOrId) => {
    const vendorId = typeof vendorOrId === 'string' ? vendorOrId : vendorOrId?._id;
    const initialVendor = typeof vendorOrId === 'object' ? vendorOrId : vendors.find(v => v._id === vendorId);

    // 1. Immediately set initial vendor data so the modal opens with zero delay
    if (initialVendor) {
      setSelectedVendor(initialVendor);
    }

    try {
      setDossierLoading(true);
      const res = await adminAPI.getVendorById(vendorId);
      if (res?.vendor) {
        setSelectedVendor(res.vendor);
        setVendorBookings(res.recentBookings || []);
        setVendorReviews(res.reviews || []);
        setVendorJobs(res.recentJobs || []);
        setVendorTransactions(res.transactions || []);
      }
    } catch (err) {
      console.error('Failed to load full dossier from API:', err);
      // Fallback: If selectedVendor is not set, ensure it has initial vendor record
      if (initialVendor) {
        setSelectedVendor(initialVendor);
      }
    } finally {
      setDossierLoading(false);
    }
  };

  const handleCloseDossier = () => {
    setSelectedVendor(null);
    setVendorBookings([]);
    setVendorReviews([]);
    setVendorJobs([]);
    setVendorTransactions([]);
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
      setActionModal(prev => ({ ...prev, error: 'A clear reason is required for this administrative decision.' }));
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
      await fetchVendors();
      if (selectedVendor && (selectedVendor._id === vendorId || selectedVendor.user?._id === vendorId)) {
        await openDossier(vendorId);
      }
    } catch (err) {
      setActionModal(prev => ({
        ...prev,
        submitting: false,
        error: err.response?.data?.message || 'Failed to execute administrative decision'
      }));
    }
  };

  // Review an individual KYC document (Aadhaar, PAN, etc.)
  const handleReviewDocument = async (vendorId, docIndex, action, reason = '') => {
    try {
      await adminAPI.reviewVendorDocument(vendorId, docIndex, { action, reason });
      await openDossier(vendorId);
      await fetchVendors();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update document status');
    }
  };

  const handleAddNote = async (noteText) => {
    if (!selectedVendor || !noteText) return;
    try {
      setSavingNote(true);
      const res = await adminAPI.addVendorNote(selectedVendor._id, { note: noteText });
      if (res?.adminNotes) {
        setSelectedVendor(prev => ({ ...prev, adminNotes: res.adminNotes }));
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

  // Metrics summary
  const totalCount = vendors.length;
  const approvedCount = vendors.filter(v => v.approvalStatus === 'approved').length;
  const pendingVerificationCount = vendors.filter(v => v.verifiedBadge?.status === 'pending_review' || v.verifiedBadge?.status === 'under_review').length;
  const changesCount = vendors.filter(v => v.approvalStatus === 'changes_required' || v.verifiedBadge?.status === 'changes_required').length;
  const suspendedCount = vendors.filter(v => v.approvalStatus === 'suspended').length;

  return (
    <div className="space-y-6 w-full">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200/90 shadow-2xs rounded-3xl p-6 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-purple-800 uppercase tracking-wider bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200/60">
              Professional Governance
            </span>
            <span className="text-xs text-slate-500 font-medium">· Live Compliance & Verification Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
            Professional Approvals & Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl mt-1">
            Review contractor registrations, inspect uploaded KYC documents (Aadhaar, PAN, Voter ID, Trade License), and manage public marketplace visibility.
          </p>
        </div>

        <button
          onClick={fetchVendors}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* KPI Counters Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Total Pros</span>
          <span className="text-xl font-black text-slate-900 mt-1 block">{totalCount}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Active & Approved</span>
          <span className="text-xl font-black text-emerald-700 mt-1 block">{approvedCount}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-purple-200 bg-purple-50/30 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800 block">Pending KYC 🛡️</span>
          <span className="text-xl font-black text-purple-900 mt-1 block">{pendingVerificationCount}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/30 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">Changes Required</span>
          <span className="text-xl font-black text-amber-900 mt-1 block">{changesCount}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Suspended</span>
          <span className="text-xl font-black text-slate-700 mt-1 block">{suspendedCount}</span>
        </div>
      </div>

      {/* Search and Status Filters */}
      <div className="bg-white border border-slate-200/90 shadow-2xs rounded-2xl p-4 sm:p-5 space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by professional name, business name, email, phone, or ID..."
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
        <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center shadow-2xs">
          <CheckSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No professionals found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            There are currently no professional profiles matching the selected filter criteria.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {vendors.map((v) => {
            const userName = v.user?.name || 'Unnamed Professional';
            const userEmail = v.user?.email || 'No email';
            const userPhone = v.user?.phone || 'No phone';
            const business = v.businessName || 'Independent Trade';
            const categories = v.categories?.map(c => c.name).join(', ') || 'General Trade';
            const avatar = v.user?.avatar || v.avatar;
            const docCount = v.verifiedBadge?.documents?.length || 0;

            return (
              <div
                key={v._id}
                onClick={() => openDossier(v)}
                className="bg-white border border-slate-200/90 hover:border-purple-300 shadow-2xs hover:shadow-xs p-5 sm:p-6 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-5 transition cursor-pointer group"
              >
                {/* Left Info */}
                <div className="flex items-start gap-4 min-w-0">
                  {avatar ? (
                    <img
                      src={avatar}
                      alt={userName}
                      className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-800 font-black text-lg flex items-center justify-center shrink-0 border border-purple-200 group-hover:scale-105 transition">
                      {userName[0]?.toUpperCase()}
                    </div>
                  )}

                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-slate-900 truncate group-hover:text-purple-800 transition">
                        {userName}
                      </h3>
                      {getStatusBadge(v.approvalStatus)}
                      <VerifiedBadge status={v.verifiedBadge?.status || 'not_submitted'} size="xs" />
                      {docCount > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                          📄 {docCount} Doc(s)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap text-xs">
                      <span className="font-semibold text-slate-700">{business}</span>
                      <span className="text-slate-400">·</span>
                      {v.categories?.length > 0 ? (
                        v.categories.map((c, i) => (
                          <span key={i} className="px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-800 text-[11px] font-bold border border-purple-200">
                            {c.name || c}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] font-bold text-amber-700">No domains</span>
                      )}
                      <span className="text-[10px] text-slate-400 font-semibold">({v.categories?.length || 0}/3)</span>
                    </div>

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
                        {v.locality || v.serviceArea?.city || v.city || 'Lucknow Metro'}
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
                <div 
                  className="flex items-center gap-2 shrink-0 self-end lg:self-center flex-wrap"
                  onClick={(e) => e.stopPropagation()} // Prevent double trigger when clicking action buttons
                >
                  <button
                    type="button"
                    onClick={() => openDossier(v)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 text-xs font-bold transition border border-purple-200"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Dossier</span>
                  </button>

                  {v.approvalStatus !== 'approved' && (
                    <button
                      type="button"
                      onClick={() => openActionModal(v, 'approved')}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-2xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                  )}

                  {v.approvalStatus !== 'changes_required' && v.approvalStatus !== 'suspended' && (
                    <button
                      type="button"
                      onClick={() => openActionModal(v, 'changes_required')}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-2xs"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Request Changes</span>
                    </button>
                  )}

                  {v.approvalStatus !== 'rejected' && v.approvalStatus !== 'suspended' && (
                    <button
                      type="button"
                      onClick={() => openActionModal(v, 'rejected')}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-2xs"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  )}

                  {v.approvalStatus === 'approved' && (
                    <button
                      type="button"
                      onClick={() => openActionModal(v, 'suspended')}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition shadow-2xs"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Suspend</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Loading Dossier Overlay */}
      {dossierLoading && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-60 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-200 flex items-center gap-3">
            <Loader text="Loading vendor dossier..." />
          </div>
        </div>
      )}

      {/* FULL 8-TAB VENDOR DETAILS & KYC DOSSIER MODAL */}
      {selectedVendor && (
        <VendorDetailsModal
          isOpen={Boolean(selectedVendor)}
          onClose={handleCloseDossier}
          vendor={selectedVendor}
          recentBookings={vendorBookings}
          reviews={vendorReviews}
          recentJobs={vendorJobs}
          transactions={vendorTransactions}
          onOpenActionModal={openActionModal}
          onReviewDocument={handleReviewDocument}
          onAddNote={handleAddNote}
          savingNote={savingNote}
        />
      )}

      {/* CONFIRMATION & DECISION MODAL */}
      {actionModal.open && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-70 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150 border border-slate-200">
            <div>
              <h3 className="text-lg font-black text-slate-900">
                Confirm Decision: {actionModal.action.replace('verify_', 'KYC ').replace('_', ' ').toUpperCase()}
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
                  placeholder={`Explain clearly to the professional why this action is being taken or what specific documents need to be resubmitted...`}
                  value={actionModal.reason}
                  onChange={(e) => setActionModal(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-600"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Internal Admin Audit Notes (Optional)</label>
              <input
                type="text"
                placeholder="Additional audit note for internal admin logs..."
                value={actionModal.notes}
                onChange={(e) => setActionModal(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-600"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActionModal(prev => ({ ...prev, open: false }))}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
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

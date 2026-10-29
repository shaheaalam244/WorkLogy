import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Check,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Ban,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Briefcase,
  Layers,
  Star,
  ExternalLink,
  Download,
  Eye,
  Compass,
  CreditCard,
  MessageSquare,
  History,
  UserCheck,
  FileCheck,
  DollarSign,
  AlertCircle,
  Plus
} from 'lucide-react';
import VerifiedBadge from '../vendor/VerifiedBadge';
import { formatCurrency, formatDate, resolveDocumentUrl } from '../../utils/formatters';
import KycDocumentViewerModal from './KycDocumentViewerModal';

export default function VendorDetailsModal({
  isOpen,
  onClose,
  vendor,
  recentBookings = [],
  reviews = [],
  recentJobs = [],
  transactions = [],
  onOpenActionModal,
  onReviewDocument,
  onAddNote,
  savingNote = false
}) {
  if (!isOpen || !vendor) return null;

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'profile_services' | 'kyc_documents' | 'service_area' | 'jobs_bookings' | 'financials' | 'reviews' | 'activity_notes'
  const [activePreviewDoc, setActivePreviewDoc] = useState(null);
  const [newNoteText, setNewNoteText] = useState('');

  const userName = vendor.user?.name || vendor.businessName || 'Professional';
  const userEmail = vendor.user?.email || 'N/A';
  const userPhone = vendor.user?.phone || 'N/A';
  const business = vendor.businessName || 'Independent Pro';
  const categoriesStr = vendor.categories?.map((c) => c.name).join(', ') || 'General Trade';
  const avatar = vendor.user?.avatar || vendor.avatar;
  const verifiedBadge = vendor.verifiedBadge || {};
  const documents = verifiedBadge.documents || [];
  const serviceCoverage = vendor.serviceAreaCoverage || {};

  const handleAddNoteSubmit = (e) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    onAddNote(newNoteText.trim());
    setNewNoteText('');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Approved
          </span>
        );
      case 'under_review':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <Clock className="w-3 h-3" /> Under Review
          </span>
        );
      case 'changes_required':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3 h-3" /> Changes Required
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <X className="w-3 h-3" /> Rejected
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-800 border border-slate-300">
            <Ban className="w-3 h-3" /> Suspended
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" /> Pending Approval
          </span>
        );
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Briefcase },
    { id: 'profile_services', label: 'Profile & Services', icon: Layers },
    { id: 'kyc_documents', label: `KYC & Documents (${documents.length})`, icon: ShieldCheck, highlight: verifiedBadge.status === 'pending_review' },
    { id: 'service_area', label: 'Service Area', icon: Compass },
    { id: 'jobs_bookings', label: `Bookings (${recentBookings.length})`, icon: Calendar },
    { id: 'financials', label: 'Financials', icon: DollarSign },
    { id: 'reviews', label: `Reviews (${reviews.length})`, icon: Star },
    { id: 'activity_notes', label: 'Activity & Audit', icon: History }
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-5xl w-full flex flex-col max-h-[92vh] shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
        
        {/* TOP PROFILE HERO HEADER */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800">
          <div className="flex items-start gap-4 min-w-0">
            {avatar ? (
              <img
                src={avatar}
                alt={userName}
                className="w-14 h-14 rounded-2xl object-cover border-2 border-purple-500/40 shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-700 to-indigo-800 text-white font-black text-2xl flex items-center justify-center shrink-0 border border-purple-400/40 shadow-inner">
                {userName[0]?.toUpperCase()}
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-white truncate">{userName}</h2>
                {getStatusBadge(vendor.approvalStatus)}
                <VerifiedBadge status={verifiedBadge.status || 'not_submitted'} size="sm" />
              </div>

              <div className="flex items-center gap-1.5 flex-wrap mt-1">
                <span className="text-xs sm:text-sm font-semibold text-purple-200">{business}</span>
                <span className="text-xs text-slate-400">·</span>
                {vendor.categories?.length > 0 ? (
                  vendor.categories.map((cat, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-200 text-xs font-semibold border border-purple-400/30">
                      {cat.name || cat}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-amber-300 font-bold">No domains registered</span>
                )}
                <span className="text-[11px] text-purple-300 font-medium">({vendor.categories?.length || 0}/3 Domains)</span>
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-400 mt-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  {userEmail}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  {userPhone}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  {vendor.city || 'Lucknow'}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  ID: <span className="font-mono text-slate-300">{vendor._id}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {vendor.approvalStatus !== 'approved' && (
              <button
                type="button"
                onClick={() => onOpenActionModal(vendor, 'approved')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Approve Pro</span>
              </button>
            )}

            {vendor.approvalStatus === 'approved' && (
              <button
                type="button"
                onClick={() => onOpenActionModal(vendor, 'suspended')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 text-xs font-bold transition border border-rose-500/30"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Suspend</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* TAB NAVIGATION BAR */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-6 flex items-center gap-1 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`py-3.5 px-3 sm:px-4 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap border-b-2 transition ${
                  isActive
                    ? 'border-purple-800 text-purple-900 bg-white/80 shadow-2xs'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-purple-800' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.highlight && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse ml-0.5" />
                )}
              </button>
            );
          })}
        </div>

        {/* TAB PANELS CONTAINER */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 bg-slate-50/50">

          {/* ──────────────── TAB 1: OVERVIEW ──────────────── */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Metric Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Rating Score</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="text-lg font-black text-slate-900">{vendor.rating || 5.0}</span>
                    <span className="text-xs text-slate-400 font-semibold">({vendor.reviewCount || reviews.length} reviews)</span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Completed Bookings</span>
                  <p className="text-lg font-black text-slate-900 mt-1">{vendor.completedJobsCount || recentBookings.filter(b => b.status === 'completed').length}</p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Base Rate / Hour</span>
                  <p className="text-lg font-black text-slate-900 mt-1">{formatCurrency(vendor.hourlyRate || 45)}/hr</p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Emergency Dispatch</span>
                  <p className="text-sm font-black text-slate-900 mt-1.5">
                    {vendor.emergencyAvailability?.isAvailable ? (
                      <span className="text-emerald-700 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Ready (Callout: {formatCurrency(vendor.emergencyAvailability?.callOutFee || 499)})
                      </span>
                    ) : (
                      <span className="text-slate-400 inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Offline
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* KYC Snapshot Quick Callout */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5 text-purple-800" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Identity & Trade Compliance Snapshot</h4>
                    <p className="text-xs text-slate-500">
                      Current KYC Status: <strong className="text-slate-800 uppercase">{verifiedBadge.status || 'not_submitted'}</strong> · {documents.length} document(s) on file
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('kyc_documents')}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-50 text-purple-800 hover:bg-purple-100 text-xs font-bold border border-purple-200 transition"
                >
                  Review Documents ➔
                </button>
              </div>

              {/* Registered Service Domains (1 to 3) */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Registered Service Domains ({vendor.categories?.length || 0} of 3 Selected)
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    Canonical ID Linked
                  </span>
                </div>
                {vendor.categories?.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {vendor.categories.map((cat, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-purple-50/60 border border-purple-200 flex flex-col justify-between">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-xs font-bold text-purple-950">{cat.name || cat}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            Active
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono truncate">
                          ID: {cat._id || cat}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200 font-semibold">
                    ⚠️ No service domains configured. This vendor cannot receive job tenders until at least 1 domain is selected.
                  </p>
                )}
              </div>

              {/* Essential Contact & Base Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Professional Identity</h4>
                  <div className="space-y-1.5 text-xs">
                    <p className="text-slate-600"><strong className="text-slate-900">Account Name:</strong> {userName}</p>
                    <p className="text-slate-600"><strong className="text-slate-900">Business / Trade:</strong> {business}</p>
                    <p className="text-slate-600"><strong className="text-slate-900">Tagline:</strong> {vendor.tagline || 'None configured'}</p>
                    <p className="text-slate-600"><strong className="text-slate-900">Experience:</strong> {vendor.experienceYears || 3} Years in field</p>
                    <p className="text-slate-600"><strong className="text-slate-900">Member Since:</strong> {formatDate(vendor.createdAt)}</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Service Coverage Coordinates</h4>
                  <div className="space-y-1.5 text-xs">
                    <p className="text-slate-600"><strong className="text-slate-900">Primary Locality:</strong> {vendor.locality || serviceCoverage.baseAddress || 'Hazratganj'}</p>
                    <p className="text-slate-600"><strong className="text-slate-900">City & PIN:</strong> {vendor.city || 'Lucknow'} · {serviceCoverage.pincode || '226001'}</p>
                    <p className="text-slate-600"><strong className="text-slate-900">Operating Radius:</strong> {serviceCoverage.radiusKm || vendor.vendorServiceRadiusKm || 15} km</p>
                    <p className="text-slate-600"><strong className="text-slate-900">Covered Localities:</strong> {serviceCoverage.selectedLocalityIds?.length || 0} designated sectors</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ──────────────── TAB 2: PROFILE & SERVICES ──────────────── */}
          {activeTab === 'profile_services' && (
            <div className="space-y-6">
              {/* Bio & Skills */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Professional Bio & Description</h4>
                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {vendor.bio || 'No professional bio provided by this vendor.'}
                </p>

                {vendor.skills?.length > 0 && (
                  <div>
                    <span className="text-xs font-bold text-slate-700 block mb-1.5">Trade Skills:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {vendor.skills.map((s, idx) => (
                        <span key={idx} className="px-2.5 py-0.5 rounded-lg bg-purple-50 text-purple-800 text-[11px] font-semibold border border-purple-100">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Configured Services List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Configured Service Packages ({vendor.services?.length || 0})
                  </h4>
                </div>

                {vendor.services?.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {vendor.services.map((svc, idx) => (
                      <div key={idx} className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between gap-2">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <h5 className="text-xs font-bold text-slate-900">{svc.title}</h5>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                              {formatCurrency(svc.price)} ({svc.pricingType})
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1">{svc.categoryName || 'General Trade'}</p>
                          {svc.description && <p className="text-xs text-slate-600 mt-1.5">{svc.description}</p>}
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                          <span>Est. Duration: {svc.duration || '1-2 hrs'}</span>
                          <span className={svc.isActive ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                            {svc.isActive ? 'Active' : 'Paused'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
                    No individual service packages published by this vendor.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ──────────────── TAB 3: KYC & DOCUMENTS (CRITICAL) ──────────────── */}
          {activeTab === 'kyc_documents' && (
            <div className="space-y-6">
              {/* KYC Status & Request Dossier Banner */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-5 h-5 text-purple-800" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Government ID & Compliance Dossier</h4>
                      <p className="text-xs text-slate-500">
                        Verification Request ID: <span className="font-mono font-bold text-slate-800">{verifiedBadge.verificationRequestId || 'N/A'}</span>
                      </p>
                    </div>
                  </div>

                  <VerifiedBadge status={verifiedBadge.status || 'not_submitted'} size="md" />
                </div>

                {/* Dossier Metadata Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] text-slate-500 font-bold block">Document Type</span>
                    <span className="font-semibold text-slate-800 uppercase">
                      {verifiedBadge.verificationType?.replace('_', ' ') || 'Aadhaar / National ID'}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] text-slate-500 font-bold block">Masked ID Number</span>
                    <span className="font-mono font-bold text-slate-800">
                      {verifiedBadge.maskedIdNumber || 'XXXX-XXXX-****'}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] text-slate-500 font-bold block">Consent Recorded</span>
                    <span className="font-semibold text-emerald-800">
                      {verifiedBadge.consentProvided ? '✅ Explicit Consent' : 'Pending'}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] text-slate-500 font-bold block">Submitted At</span>
                    <span className="text-slate-800">
                      {verifiedBadge.submittedAt ? formatDate(verifiedBadge.submittedAt) : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Compliance Review Decision & Instructions */}
                {(verifiedBadge.rejectionReason || verifiedBadge.resubmissionInstructions) && (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-amber-800">
                      <AlertTriangle className="w-4 h-4 text-amber-700" />
                      <span>Reviewer Notice on Record:</span>
                    </div>
                    <p>{verifiedBadge.rejectionReason || verifiedBadge.resubmissionInstructions}</p>
                  </div>
                )}

                {/* Primary Overall Verification Decision Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100 flex-wrap">
                  {verifiedBadge.status !== 'verified' && (
                    <button
                      type="button"
                      onClick={() => onOpenActionModal(vendor, 'verify_approve')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-2xs"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Approve KYC (Grant Verified Badge)</span>
                    </button>
                  )}

                  {verifiedBadge.status !== 'changes_required' && (
                    <button
                      type="button"
                      onClick={() => onOpenActionModal(vendor, 'verify_changes_required')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-2xs"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Request Resubmission</span>
                    </button>
                  )}

                  {verifiedBadge.status !== 'rejected' && (
                    <button
                      type="button"
                      onClick={() => onOpenActionModal(vendor, 'verify_reject')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-2xs"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reject KYC</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Sub-section: Uploaded Documents Cards */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Uploaded Document Files ({documents.length})
                  </h4>
                  <span className="text-[11px] text-slate-500">Inspect images or PDFs</span>
                </div>

                {documents.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {documents.map((doc, idx) => {
                      const docStatus = doc.status || 'pending';
                      const resolvedUrl = resolveDocumentUrl(doc.url);
                      const isPdf = doc.url?.toLowerCase()?.includes('.pdf');

                      return (
                        <div
                          key={idx}
                          className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between gap-3 hover:border-slate-300 transition"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-800 flex items-center justify-center shrink-0 border border-purple-100">
                                  {isPdf ? <FileText className="w-5 h-5 text-purple-700" /> : <FileCheck className="w-5 h-5 text-purple-700" />}
                                </div>
                                <div className="min-w-0">
                                  <h5 className="text-xs font-bold text-slate-900 truncate max-w-[180px]">{doc.name || `Document #${idx + 1}`}</h5>
                                  <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                                    Type: {doc.docType || 'identity'}
                                  </span>
                                </div>
                              </div>

                              {/* Status Badge */}
                              <div>
                                {docStatus === 'approved' && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    <CheckCircle2 className="w-3 h-3" /> Approved
                                  </span>
                                )}
                                {docStatus === 'rejected' && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                                    <X className="w-3 h-3" /> Rejected
                                  </span>
                                )}
                                {docStatus === 'changes_required' && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                    <AlertTriangle className="w-3 h-3" /> Changes Req
                                  </span>
                                )}
                                {docStatus === 'pending' && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                                    <Clock className="w-3 h-3" /> Pending Review
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Masked details and date */}
                            <div className="mt-2 text-[11px] text-slate-500 space-y-0.5">
                              {verifiedBadge.maskedIdNumber && (
                                <p>Masked ID: <span className="font-mono font-bold text-slate-700">{verifiedBadge.maskedIdNumber}</span></p>
                              )}
                              <p>Uploaded: {doc.uploadedAt ? formatDate(doc.uploadedAt) : 'Recently'}</p>
                            </div>

                            {doc.rejectionReason && (
                              <p className="mt-2 text-[11px] text-rose-700 bg-rose-50 border border-rose-100 p-2 rounded-lg">
                                <strong>Reason:</strong> {doc.rejectionReason}
                              </p>
                            )}
                          </div>

                          {/* Document Actions Bar */}
                          <div className="flex items-center justify-between gap-1.5 pt-2.5 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => setActivePreviewDoc({ ...doc, docIndex: idx })}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 text-[11px] font-bold transition"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Inspect Preview</span>
                            </button>

                            <div className="flex items-center gap-1">
                              {docStatus !== 'approved' && onReviewDocument && (
                                <button
                                  type="button"
                                  onClick={() => onReviewDocument(vendor._id, idx, 'approved')}
                                  title="Approve this specific document"
                                  className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {docStatus !== 'rejected' && onReviewDocument && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const reason = window.prompt(`Enter reason for rejecting "${doc.name}":`);
                                    if (reason && reason.trim()) {
                                      onReviewDocument(vendor._id, idx, 'rejected', reason.trim());
                                    }
                                  }}
                                  title="Reject this specific document"
                                  className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {resolvedUrl && (
                                <a
                                  href={resolvedUrl}
                                  download={doc.name || 'document'}
                                  title="Download File"
                                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
                    <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-700">No KYC documents uploaded yet</p>
                    <p className="text-[11px] text-slate-400 mt-1">This vendor has not submitted documents for verification review.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ──────────────── TAB 4: SERVICE AREA ──────────────── */}
          {activeTab === 'service_area' && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Territory & Service Area Geometry
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-bold block">Base Locality</span>
                    <span className="font-bold text-slate-900">{vendor.locality || serviceCoverage.baseAddress || 'Hazratganj'}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-bold block">Service Radius</span>
                    <span className="font-bold text-slate-900">{serviceCoverage.radiusKm || vendor.vendorServiceRadiusKm || 15} KM</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-bold block">Zone ID</span>
                    <span className="font-bold text-slate-900">{vendor.zoneId || 'LKO-Z01'}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-bold block">Postal PIN</span>
                    <span className="font-bold text-slate-900">{serviceCoverage.pincode || '226001'}</span>
                  </div>
                </div>

                {/* Covered Localities Chips */}
                <div>
                  <span className="text-xs font-bold text-slate-700 block mb-2">
                    Active Operating Localities ({serviceCoverage.selectedLocalityIds?.length || 0}):
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                    {serviceCoverage.selectedLocalityIds?.length > 0 ? (
                      serviceCoverage.selectedLocalityIds.map((loc, idx) => (
                        <span key={idx} className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-800 text-[11px] font-semibold">
                          📍 {loc}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500 italic">Operating citywide across Lucknow Metro</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ──────────────── TAB 5: JOBS & BOOKINGS ──────────────── */}
          {activeTab === 'jobs_bookings' && (
            <div className="space-y-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Customer Bookings on Record ({recentBookings.length})
              </h4>

              {recentBookings.length > 0 ? (
                <div className="space-y-2.5">
                  {recentBookings.map((b) => (
                    <div key={b._id} className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{b.serviceTitle || b.bookingReference || 'Service Booking'}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                            {b.status?.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                        <p className="text-slate-500 mt-0.5">
                          Customer: <span className="font-semibold text-slate-700">{b.customer?.name || 'Customer'}</span> ({b.customer?.email || 'N/A'})
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="font-bold text-slate-900 text-sm block">{formatCurrency(b.finalPrice || b.estimatedPrice || 0)}</span>
                        <span className="text-[10px] text-slate-400">{formatDate(b.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
                  No active or past customer bookings on record for this professional.
                </div>
              )}
            </div>
          )}

          {/* ──────────────── TAB 6: FINANCIALS & TRANSACTIONS ──────────────── */}
          {activeTab === 'financials' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Total Bookings Completed</span>
                  <p className="text-xl font-black text-slate-900 mt-1">{vendor.completedJobsCount || recentBookings.filter(b => b.status === 'completed').length}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Standard Hourly Rate</span>
                  <p className="text-xl font-black text-slate-900 mt-1">{formatCurrency(vendor.hourlyRate || 45)}/hr</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Emergency Callout Rate</span>
                  <p className="text-xl font-black text-slate-900 mt-1">{formatCurrency(vendor.emergencyAvailability?.callOutFee || 499)}</p>
                </div>
              </div>

              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Payment Transactions Ledger ({transactions.length})
              </h4>

              {transactions.length > 0 ? (
                <div className="space-y-2">
                  {transactions.map((t) => (
                    <div key={t._id} className="p-3 rounded-xl bg-white border border-slate-200 text-xs flex justify-between items-center">
                      <div>
                        <span className="font-bold text-slate-800">TXN #{t._id.slice(-6).toUpperCase()}</span>
                        <p className="text-slate-500">{t.type?.toUpperCase()} · {t.paymentMethod || 'Online Escrow'}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-emerald-700">{formatCurrency(t.amount)}</span>
                        <span className="text-[10px] text-slate-400 block">{formatDate(t.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
                  No payment ledger records recorded yet.
                </div>
              )}
            </div>
          )}

          {/* ──────────────── TAB 7: RATINGS & REVIEWS ──────────────── */}
          {activeTab === 'reviews' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-200">
                <Star className="w-8 h-8 text-amber-500 fill-amber-500" />
                <div>
                  <h4 className="text-lg font-black text-slate-900">{vendor.rating || 5.0} out of 5.0</h4>
                  <p className="text-xs text-slate-500">Based on {reviews.length} authenticated customer reviews</p>
                </div>
              </div>

              {reviews.length > 0 ? (
                <div className="space-y-3">
                  {reviews.map((r) => (
                    <div key={r._id} className="p-4 rounded-2xl bg-white border border-slate-200 text-xs space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900">{r.customer?.name || 'Customer'}</span>
                          <span className="text-amber-500 font-bold">★ {r.rating}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">{formatDate(r.createdAt)}</span>
                      </div>
                      <p className="text-slate-700 leading-relaxed">{r.comment || 'No written comment left.'}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
                  No customer reviews have been submitted for this vendor yet.
                </div>
              )}
            </div>
          )}

          {/* ──────────────── TAB 8: ACTIVITY & AUDIT ──────────────── */}
          {activeTab === 'activity_notes' && (
            <div className="space-y-6">
              {/* Review Timeline */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Approval Audit Timeline</h4>
                {vendor.approvalHistory?.length > 0 ? (
                  <div className="space-y-2">
                    {vendor.approvalHistory.map((h, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-white border border-slate-200 text-xs space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{h.status?.replace('_', ' ').toUpperCase()}</span>
                          <span className="text-[10px] text-slate-400">{formatDate(h.timestamp || h.reviewedAt)}</span>
                        </div>
                        <p className="text-slate-600">{h.reason || 'Status update executed by compliance administrator'}</p>
                        {(h.reviewedBy?.name || h.changedBy?.name) && (
                          <p className="text-[10px] text-purple-700 font-semibold">Reviewed by: {h.reviewedBy?.name || h.changedBy?.name}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No historical status modifications recorded.</p>
                )}
              </div>

              {/* Internal Notes */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Internal Administrator Notes</h4>
                
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {vendor.adminNotes?.length > 0 ? (
                    vendor.adminNotes.map((n, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-purple-50/70 border border-purple-100 text-xs space-y-0.5">
                        <p className="text-slate-800">{n.note}</p>
                        <div className="flex items-center justify-between text-[10px] text-purple-700 font-semibold">
                          <span>{n.author?.name || 'Administrator'}</span>
                          <span>{formatDate(n.createdAt)}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic">No internal administrative notes recorded yet.</p>
                  )}
                </div>

                {/* Add Note Form */}
                <form onSubmit={handleAddNoteSubmit} className="flex gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Write an internal compliance audit note..."
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-600 bg-white"
                  />
                  <button
                    type="submit"
                    disabled={savingNote || !newNoteText.trim()}
                    className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl disabled:opacity-40 transition"
                  >
                    {savingNote ? 'Saving...' : 'Add Note'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM MODAL FOOTER */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Quick Governance Actions:</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => onOpenActionModal(vendor, 'approved')}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-2xs transition"
            >
              Approve Pro
            </button>
            <button
              type="button"
              onClick={() => onOpenActionModal(vendor, 'changes_required')}
              className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-2xs transition"
            >
              Request Changes
            </button>
            <button
              type="button"
              onClick={() => onOpenActionModal(vendor, 'rejected')}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-2xs transition"
            >
              Reject
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition ml-2"
            >
              Close Dossier
            </button>
          </div>
        </div>
      </div>

      {/* Embedded KYC Document Viewer Modal */}
      {activePreviewDoc && (
        <KycDocumentViewerModal
          isOpen={Boolean(activePreviewDoc)}
          onClose={() => setActivePreviewDoc(null)}
          document={activePreviewDoc}
          vendorId={vendor._id}
          onApprove={(doc) => {
            if (onReviewDocument) {
              onReviewDocument(vendor._id, doc.docIndex ?? 0, 'approved');
              setActivePreviewDoc(null);
            }
          }}
          onReject={(doc) => {
            const reason = window.prompt(`Enter reason for rejecting "${doc.name}":`);
            if (reason && reason.trim() && onReviewDocument) {
              onReviewDocument(vendor._id, doc.docIndex ?? 0, 'rejected', reason.trim());
              setActivePreviewDoc(null);
            }
          }}
          onRequestChanges={(doc) => {
            const reason = window.prompt(`Enter required changes for "${doc.name}":`);
            if (reason && reason.trim() && onReviewDocument) {
              onReviewDocument(vendor._id, doc.docIndex ?? 0, 'changes_required', reason.trim());
              setActivePreviewDoc(null);
            }
          }}
        />
      )}
    </div>
  );
}

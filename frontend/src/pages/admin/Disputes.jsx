import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  MessageSquare, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  FileText, 
  RefreshCw, 
  User, 
  Briefcase, 
  Clock, 
  Check, 
  X,
  Star,
  Flag,
  Scale,
  ShieldCheck,
  Search,
  Filter,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { adminAPI } from '../../api/admin.api';
import Loader from '../../components/common/Loader';
import { formatDate } from '../../utils/formatters';

export default function AdminDisputes() {
  const [activeTab, setActiveTab] = useState('disputes'); // 'disputes' | 'reports' | 'reviews'
  const [disputes, setDisputes] = useState([]);
  const [reports, setReports] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters for Disputes
  const [disputeStatusFilter, setDisputeStatusFilter] = useState('all');
  const [disputeCategoryFilter, setDisputeCategoryFilter] = useState('all');

  // Filters for Reports
  const [reportStatusFilter, setReportStatusFilter] = useState('all');
  const [reportTargetFilter, setReportTargetFilter] = useState('all');
  const [reportSearch, setReportSearch] = useState('');

  // Filters for Reviews
  const [reviewStatusFilter, setReviewStatusFilter] = useState('all'); // 'all' | 'pending' | 'approved' | 'rejected' | 'hidden'
  const [ratingFilter, setRatingFilter] = useState('all');
  const [reportedOnly, setReportedOnly] = useState(false);

  // Dispute Resolve Modal
  const [resolveModal, setResolveModal] = useState({
    open: false,
    disputeId: null,
    serviceTitle: '',
    raisedByName: '',
    status: 'resolved',
    outcome: 'Investigation concluded. Resolution terms applied.',
    notes: '',
    bookingAction: 'none',
    submitting: false,
    error: ''
  });

  // Report Resolve Modal
  const [resolveReportModal, setResolveReportModal] = useState({
    open: false,
    reportId: null,
    targetTitle: '',
    targetType: '',
    status: 'resolved',
    outcome: 'Violation confirmed and corrective policy enforcement applied.',
    notes: '',
    submitting: false,
    error: ''
  });

  // Review Moderate Modal
  const [moderateReviewModal, setModerateReviewModal] = useState({
    open: false,
    reviewId: null,
    reviewSnippet: '',
    action: 'hide',
    isPublic: false,
    moderationReason: '',
    submitting: false,
    error: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'disputes') {
        const params = {};
        if (disputeStatusFilter !== 'all') params.status = disputeStatusFilter;
        if (disputeCategoryFilter !== 'all') params.disputeCategory = disputeCategoryFilter;
        const res = await adminAPI.getDisputes(params);
        if (res?.disputes) setDisputes(res.disputes);
      } else if (activeTab === 'reports') {
        const params = {};
        if (reportStatusFilter !== 'all') params.status = reportStatusFilter;
        if (reportTargetFilter !== 'all') params.targetType = reportTargetFilter;
        if (reportSearch.trim()) params.search = reportSearch.trim();
        const res = await adminAPI.getReports(params);
        if (res?.reports) setReports(res.reports);
      } else {
        const params = {};
        if (reviewStatusFilter !== 'all') params.moderationStatus = reviewStatusFilter;
        if (ratingFilter !== 'all') params.rating = ratingFilter;
        if (reportedOnly) params.reported = true;
        const res = await adminAPI.getReviews(params);
        if (res?.reviews) setReviews(res.reviews);
      }
    } catch (err) {
      console.error('Failed to load moderation data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [
    activeTab, 
    disputeStatusFilter, 
    disputeCategoryFilter, 
    reportStatusFilter, 
    reportTargetFilter, 
    reviewStatusFilter, 
    ratingFilter, 
    reportedOnly
  ]);

  // Handle Dispute Resolve
  const openResolveModal = (dispute) => {
    setResolveModal({
      open: true,
      disputeId: dispute._id,
      serviceTitle: dispute.booking?.serviceTitle || dispute.job?.title || 'Platform Service',
      raisedByName: dispute.raisedBy?.name || 'User',
      status: 'resolved',
      outcome: 'Full refund to customer and contractor warning issued',
      notes: '',
      bookingAction: 'none',
      submitting: false,
      error: ''
    });
  };

  const handleConfirmResolveDispute = async (e) => {
    e.preventDefault();
    const { disputeId, status, outcome, notes, bookingAction } = resolveModal;
    if (!notes.trim()) {
      setResolveModal(prev => ({ ...prev, error: 'Resolution notes are required for audit record' }));
      return;
    }

    try {
      setResolveModal(prev => ({ ...prev, submitting: true, error: '' }));
      await adminAPI.resolveDispute(disputeId, {
        status,
        outcome: outcome.trim(),
        notes: notes.trim(),
        bookingAction
      });

      setResolveModal({
        open: false,
        disputeId: null,
        serviceTitle: '',
        raisedByName: '',
        status: 'resolved',
        outcome: '',
        notes: '',
        bookingAction: 'none',
        submitting: false,
        error: ''
      });
      fetchData();
    } catch (err) {
      setResolveModal(prev => ({
        ...prev,
        submitting: false,
        error: err.response?.data?.message || 'Failed to resolve dispute'
      }));
    }
  };

  // Handle Report Resolve
  const openResolveReportModal = (report, targetStatus = 'resolved') => {
    setResolveReportModal({
      open: true,
      reportId: report._id,
      targetTitle: report.targetSnapshot?.title || report.targetSnapshot?.name || 'Listing',
      targetType: report.targetType,
      status: targetStatus,
      outcome: targetStatus === 'resolved' 
        ? 'Violation verified: Policy enforcement and account warning recorded.'
        : 'Report reviewed: Insufficient evidence of policy violation, dismissed.',
      notes: '',
      submitting: false,
      error: ''
    });
  };

  const handleConfirmResolveReport = async (e) => {
    e.preventDefault();
    const { reportId, status, outcome, notes } = resolveReportModal;
    if (!notes.trim()) {
      setResolveReportModal(prev => ({ ...prev, error: 'Resolution notes are required for administrative audit trail.' }));
      return;
    }

    try {
      setResolveReportModal(prev => ({ ...prev, submitting: true, error: '' }));
      await adminAPI.resolveReport(reportId, {
        status,
        outcome: outcome.trim(),
        notes: notes.trim()
      });

      setResolveReportModal({
        open: false,
        reportId: null,
        targetTitle: '',
        targetType: '',
        status: 'resolved',
        outcome: '',
        notes: '',
        submitting: false,
        error: ''
      });
      fetchData();
    } catch (err) {
      setResolveReportModal(prev => ({
        ...prev,
        submitting: false,
        error: err.response?.data?.message || 'Failed to update report status'
      }));
    }
  };

  // Handle Review Moderation
  const openModerateModal = (review, action) => {
    let defaultReason = 'Platform policy compliance';
    let isPub = true;
    if (action === 'hide') {
      defaultReason = 'Content hidden from public profile pending review';
      isPub = false;
    } else if (action === 'reject') {
      defaultReason = 'Review content violates platform community guidelines';
      isPub = false;
    } else if (action === 'approve' || action === 'restore') {
      defaultReason = 'Verified genuine completed booking review approved for public display';
      isPub = true;
    }

    setModerateReviewModal({
      open: true,
      reviewId: review._id,
      reviewSnippet: review.comment ? `"${review.comment.slice(0, 80)}..."` : `${review.rating}★ Review`,
      action,
      isPublic: isPub,
      moderationReason: defaultReason,
      submitting: false,
      error: ''
    });
  };

  const handleConfirmModerateReview = async (e) => {
    e.preventDefault();
    const { reviewId, action, isPublic, moderationReason } = moderateReviewModal;
    if (!moderationReason.trim()) {
      setModerateReviewModal(prev => ({ ...prev, error: 'A moderation reason is required for administrative audit logs.' }));
      return;
    }

    try {
      setModerateReviewModal(prev => ({ ...prev, submitting: true, error: '' }));
      await adminAPI.moderateReview(reviewId, {
        action,
        isPublic,
        moderationReason: moderationReason.trim()
      });
      setModerateReviewModal({
        open: false,
        reviewId: null,
        reviewSnippet: '',
        action: 'hide',
        isPublic: false,
        moderationReason: '',
        submitting: false,
        error: ''
      });
      fetchData();
    } catch (err) {
      setModerateReviewModal(prev => ({
        ...prev,
        submitting: false,
        error: err.response?.data?.message || 'Failed to moderate review'
      }));
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="bg-white border border-slate-200/90 shadow-2xs rounded-3xl p-6 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-purple-800 uppercase tracking-wider bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200/60">
              Trust & Safety
            </span>
            <span className="text-xs text-slate-500 font-medium">· Platform Governance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
            Disputes, Reports & Moderation
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl mt-1">
            Investigate customer and contractor complaints, review dispute evidence, record official administrative decisions, and moderate reported listings and reviews.
          </p>
        </div>

        <button
          onClick={fetchData}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('disputes')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition whitespace-nowrap ${
            activeTab === 'disputes'
              ? 'border-b-2 border-purple-800 text-purple-800 bg-white shadow-2xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Scale className="w-4 h-4 text-amber-500" />
          <span>Booking Disputes</span>
          {disputes.filter(d => ['open', 'under_review', 'investigating'].includes(d.status)).length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
              {disputes.filter(d => ['open', 'under_review', 'investigating'].includes(d.status)).length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition whitespace-nowrap ${
            activeTab === 'reports'
              ? 'border-b-2 border-purple-800 text-purple-800 bg-white shadow-2xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Flag className="w-4 h-4 text-rose-500" />
          <span>Reports & Abuse Moderation</span>
          {reports.filter(r => ['new', 'under_review'].includes(r.status)).length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
              {reports.filter(r => ['new', 'under_review'].includes(r.status)).length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('reviews')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition whitespace-nowrap ${
            activeTab === 'reviews'
              ? 'border-b-2 border-purple-800 text-purple-800 bg-white shadow-2xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-blue-500" />
          <span>Review Moderation</span>
        </button>
      </div>

      {/* TAB 1: DISPUTES */}
      {activeTab === 'disputes' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200/90 shadow-2xs rounded-2xl p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 mr-1">Status:</span>
              {['all', 'open', 'under_review', 'investigating', 'resolved', 'closed'].map((st) => (
                <button
                  key={st}
                  onClick={() => setDisputeStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition ${
                    disputeStatusFilter === st
                      ? 'bg-purple-800 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Category:</span>
              <select
                value={disputeCategoryFilter}
                onChange={(e) => setDisputeCategoryFilter(e.target.value)}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-purple-600"
              >
                <option value="all">All Categories</option>
                <option value="service_not_delivered">Service Not Delivered</option>
                <option value="incomplete_unsatisfactory">Incomplete/Unsatisfactory</option>
                <option value="unexpected_cancellation">Unexpected Cancellation</option>
                <option value="pricing_disagreement">Pricing Disagreement</option>
                <option value="suspected_fraud">Suspected Fraud</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="py-20">
              <Loader text="Loading booking disputes..." />
            </div>
          ) : disputes.length === 0 ? (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center">
              <ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No disputes found</h3>
              <p className="text-xs text-slate-500 mt-1">Platform service execution and booking fulfillment are healthy.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {disputes.map((d) => (
                <div key={d._id} className="bg-white border border-slate-200/90 shadow-2xs p-5 sm:p-6 rounded-2xl flex flex-col md:flex-row md:items-start justify-between gap-5 hover:border-slate-300 transition">
                  <div className="space-y-3 flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-xs font-mono font-bold text-slate-400">
                        #{d._id.slice(-6)}
                      </span>
                      <h3 className="font-bold text-slate-900 text-base">
                        {d.booking?.serviceTitle || d.job?.title || 'Service Dispute'}
                      </h3>
                      {d.booking?.bookingReference && (
                        <span className="text-[11px] font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-200/60 font-semibold">
                          Ref: {d.booking.bookingReference}
                        </span>
                      )}
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        d.status === 'resolved' || d.status === 'closed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {d.status.replace('_', ' ')}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/60 capitalize">
                        {d.disputeCategory?.replace(/_/g, ' ') || 'Dispute'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                      <div>
                        <span className="font-semibold text-slate-800">Raised By:</span>{' '}
                        {d.raisedBy?.name} <span className="text-slate-400">({d.raisedBy?.role} · {d.raisedBy?.email})</span>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-800">Counter-Party:</span>{' '}
                        {d.against?.name} <span className="text-slate-400">({d.against?.role} · {d.against?.email})</span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <p className="font-bold text-slate-800 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Claim: {d.reason}</span>
                      </p>
                      <p className="text-slate-600 mt-1 leading-relaxed">{d.description}</p>
                      {d.evidence && d.evidence.length > 0 && (
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">Evidence ({d.evidence.length}):</span>
                          {d.evidence.map((ev, idx) => (
                            <span key={idx} className="text-[11px] font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200/50">
                              Item #{idx + 1}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {d.resolution?.outcome && (
                      <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200/80 text-xs space-y-1">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-purple-700" />
                          <p className="font-bold text-purple-900">Official Finding: {d.resolution.outcome}</p>
                        </div>
                        <p className="text-purple-800 leading-relaxed pl-6">Notes: {d.resolution.notes}</p>
                        {d.resolution.bookingAction && d.resolution.bookingAction !== 'none' && (
                          <div className="pl-6 pt-1">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-purple-200 text-purple-900">
                              Booking Action: {d.resolution.bookingAction.replace(/_/g, ' ')}
                            </span>
                          </div>
                        )}
                        <p className="text-[10px] text-purple-600 pl-6 pt-0.5">
                          Recorded on {formatDate(d.resolution.resolvedAt)} by {d.resolution.resolvedBy?.name || 'Administrator'}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 flex items-center gap-2 self-end md:self-start pt-1">
                    {d.status !== 'resolved' && d.status !== 'closed' && (
                      <button
                        onClick={() => openResolveModal(d)}
                        className="px-4 py-2.5 rounded-xl bg-purple-800 hover:bg-purple-900 text-white text-xs font-bold transition shadow-2xs flex items-center gap-1.5"
                      >
                        <Scale className="w-3.5 h-3.5" />
                        <span>Resolve Dispute</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: REPORTS & ABUSE MODERATION */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200/90 shadow-2xs rounded-2xl p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 mr-1">Status:</span>
              {['all', 'new', 'under_review', 'resolved', 'dismissed'].map((st) => (
                <button
                  key={st}
                  onClick={() => setReportStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition ${
                    reportStatusFilter === st
                      ? 'bg-purple-800 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Entity:</span>
              <select
                value={reportTargetFilter}
                onChange={(e) => setReportTargetFilter(e.target.value)}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-purple-600"
              >
                <option value="all">All Targets</option>
                <option value="job">Jobs</option>
                <option value="vendor">Vendors</option>
                <option value="customer">Customers</option>
                <option value="service">Services</option>
                <option value="review">Reviews</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="py-20">
              <Loader text="Loading reports queue..." />
            </div>
          ) : reports.length === 0 ? (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center">
              <ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No reports found</h3>
              <p className="text-xs text-slate-500 mt-1">There are no pending abuse or policy violation reports in this queue.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((r) => (
                <div key={r._id} className="bg-white border border-slate-200/90 shadow-2xs p-5 sm:p-6 rounded-2xl flex flex-col md:flex-row md:items-start justify-between gap-5 hover:border-slate-300 transition">
                  <div className="space-y-3 flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-xs font-mono font-bold text-slate-400">
                        #{r._id.slice(-6)}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-200">
                        {r.targetType}
                      </span>
                      <h3 className="font-bold text-slate-900 text-base">
                        {r.targetSnapshot?.title || r.targetSnapshot?.name || 'Reported Resource'}
                      </h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        r.status === 'resolved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : r.status === 'dismissed'
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {r.status.replace('_', ' ')}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/60 capitalize">
                        {r.reason?.replace(/_/g, ' ')}
                      </span>
                      {r.relatedReportsCount > 1 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                          {r.relatedReportsCount} Total Complaints
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                      <div>
                        <span className="font-semibold text-slate-800">Reported By:</span>{' '}
                        {r.reportedBy?.name || 'Anonymous User'} <span className="text-slate-400">({r.reportedBy?.role || 'user'})</span>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-800">Target Reference:</span>{' '}
                        <span className="font-mono text-slate-500">{r.targetId}</span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <p className="font-bold text-slate-800">Violation Details:</p>
                      <p className="text-slate-600 mt-1 leading-relaxed">
                        {r.description || 'No additional commentary was provided.'}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-2">
                        Submitted on {formatDate(r.createdAt)}
                      </p>
                    </div>

                    {r.resolution?.outcome && (
                      <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200/80 text-xs space-y-1">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-purple-700" />
                          <p className="font-bold text-purple-900">Moderator Action: {r.resolution.outcome}</p>
                        </div>
                        <p className="text-purple-800 leading-relaxed pl-6">Audit Rationale: {r.resolution.notes}</p>
                        <p className="text-[10px] text-purple-600 pl-6 pt-0.5">
                          Actioned on {formatDate(r.resolution.resolvedAt)} by {r.resolution.resolvedBy?.name || 'Admin Reviewer'}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 flex items-center gap-2 self-end md:self-start pt-1">
                    {r.status !== 'resolved' && r.status !== 'dismissed' && (
                      <>
                        <button
                          onClick={() => openResolveReportModal(r, 'resolved')}
                          className="px-3.5 py-2 rounded-xl bg-purple-800 hover:bg-purple-900 text-white text-xs font-bold transition shadow-2xs flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Resolve</span>
                        </button>
                        <button
                          onClick={() => openResolveReportModal(r, 'dismissed')}
                          className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                        >
                          <span>Dismiss</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: REVIEWS MODERATION */}
      {activeTab === 'reviews' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200/90 shadow-2xs rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 mr-1">Status:</span>
              {[
                { id: 'all', label: 'All Reviews' },
                { id: 'approved', label: 'Approved' },
                { id: 'pending', label: 'Pending' },
                { id: 'hidden', label: 'Hidden' },
                { id: 'rejected', label: 'Rejected' }
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => setReviewStatusFilter(st.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    reviewStatusFilter === st.id
                      ? 'bg-purple-800 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-slate-500 mr-1">Rating:</span>
                <select
                  value={ratingFilter}
                  onChange={(e) => setRatingFilter(e.target.value)}
                  className="text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-purple-600"
                >
                  <option value="all">All Stars</option>
                  <option value="5">5 Stars</option>
                  <option value="4">4 Stars</option>
                  <option value="3">3 Stars</option>
                  <option value="2">2 Stars</option>
                  <option value="1">1 Star</option>
                </select>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                <input
                  type="checkbox"
                  checked={reportedOnly}
                  onChange={(e) => setReportedOnly(e.target.checked)}
                  className="w-3.5 h-3.5 text-purple-600 rounded focus:ring-purple-500"
                />
                <span>Reported Only</span>
              </label>
            </div>
          </div>

          {loading ? (
            <div className="py-20">
              <Loader text="Loading customer reviews..." />
            </div>
          ) : reviews.length === 0 ? (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center">
              <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No reviews found</h3>
              <p className="text-xs text-slate-500 mt-1">No reviews match the selected moderation filters</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((r) => {
                const modStatus = r.moderationStatus || 'approved';
                return (
                  <div
                    key={r._id}
                    className="bg-white border border-slate-200/90 shadow-2xs p-5 sm:p-6 rounded-2xl flex flex-col md:flex-row md:items-start justify-between gap-5 hover:border-slate-300 transition"
                  >
                    <div className="space-y-3 flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-1 bg-amber-50 border border-amber-200/70 px-2 py-0.5 rounded-lg">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                          <span className="text-xs font-bold text-amber-900">{r.rating}.0</span>
                        </div>

                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          modStatus === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : modStatus === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : modStatus === 'hidden'
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {modStatus}
                        </span>

                        {r.reported && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                            Flagged Abuse
                          </span>
                        )}

                        <span className="text-xs text-slate-400">
                          {formatDate(r.createdAt)}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                        <div>
                          <span className="font-semibold text-slate-800">Customer:</span>{' '}
                          {r.customer?.name || 'Customer'} <span className="text-slate-400">({r.customer?.email})</span>
                        </div>
                        <div>
                          <span className="font-semibold text-slate-800">Professional:</span>{' '}
                          {r.vendor?.user?.name || r.vendor?.businessName || 'Contractor'}
                        </div>
                      </div>

                      <div className="space-y-1">
                        {r.title && (
                          <h4 className="text-sm font-bold text-slate-900">{r.title}</h4>
                        )}
                        <p className="text-xs text-slate-700 leading-relaxed italic bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                          "{r.comment}"
                        </p>
                      </div>

                      {r.moderationReason && (
                        <div className="text-[11px] text-slate-500 bg-purple-50/50 border border-purple-100 p-2 rounded-lg">
                          <span className="font-bold text-purple-900">Moderation Log:</span> {r.moderationReason}
                        </div>
                      )}
                    </div>

                    <div className="shrink-0 flex items-center gap-2 self-end md:self-start pt-1">
                      {modStatus !== 'approved' && (
                        <button
                          onClick={() => openModerateModal(r, 'approve')}
                          className="px-3.5 py-1.5 rounded-xl bg-purple-800 hover:bg-purple-900 text-white text-xs font-bold transition shadow-2xs"
                        >
                          Approve
                        </button>
                      )}

                      {modStatus === 'approved' && (
                        <button
                          onClick={() => openModerateModal(r, 'hide')}
                          className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition border border-rose-200"
                        >
                          Hide Review
                        </button>
                      )}

                      {(modStatus === 'hidden' || modStatus === 'rejected') && (
                        <button
                          onClick={() => openModerateModal(r, 'restore')}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-2xs"
                        >
                          Restore Public
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* RESOLVE DISPUTE MODAL */}
      {resolveModal.open && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form onSubmit={handleConfirmResolveDispute} className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150 border border-slate-200">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-800 px-2 py-0.5 rounded-md border border-purple-200/60">
                Administrative Dispute Decision
              </span>
              <h3 className="text-lg font-black text-slate-900 mt-1">Resolve Booking Dispute</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Service: <span className="font-bold text-slate-800">{resolveModal.serviceTitle}</span>
              </p>
            </div>

            {resolveModal.error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                {resolveModal.error}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Official Decision / Outcome *</label>
              <input
                type="text"
                required
                placeholder="e.g. Booking resolved in customer favor with full refund"
                value={resolveModal.outcome}
                onChange={(e) => setResolveModal(prev => ({ ...prev, outcome: e.target.value }))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-600"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Booking Execution Action</label>
              <select
                value={resolveModal.bookingAction}
                onChange={(e) => setResolveModal(prev => ({ ...prev, bookingAction: e.target.value }))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-600 bg-white"
              >
                <option value="none">No Booking Status Mutation (Administrative Record Only)</option>
                <option value="refund_processed">Process Full Refund & Cancel Booking</option>
                <option value="escrow_released">Release Escrow Payout & Complete Booking</option>
                <option value="booking_cancelled">Cancel Booking Without Escrow Payout</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Audit Notes & Findings *</label>
              <textarea
                rows={3}
                required
                placeholder="Detail the investigation findings and rationale for closing this dispute..."
                value={resolveModal.notes}
                onChange={(e) => setResolveModal(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-600"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setResolveModal(prev => ({ ...prev, open: false }))}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={resolveModal.submitting}
                className="px-4 py-2 rounded-xl bg-purple-800 hover:bg-purple-900 text-white text-xs font-bold transition disabled:opacity-50"
              >
                {resolveModal.submitting ? 'Recording...' : 'Confirm Resolution'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* RESOLVE REPORT MODAL */}
      {resolveReportModal.open && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form onSubmit={handleConfirmResolveReport} className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150 border border-slate-200">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-800 px-2 py-0.5 rounded-md border border-rose-200/60">
                Abuse & Moderation Decision
              </span>
              <h3 className="text-lg font-black text-slate-900 mt-1 capitalize">
                {resolveReportModal.status === 'resolved' ? 'Resolve Report' : 'Dismiss Report'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Target: <span className="font-bold text-slate-800">{resolveReportModal.targetTitle}</span> ({resolveReportModal.targetType})
              </p>
            </div>

            {resolveReportModal.error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                {resolveReportModal.error}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Official Outcome / Action Taken *</label>
              <input
                type="text"
                required
                value={resolveReportModal.outcome}
                onChange={(e) => setResolveReportModal(prev => ({ ...prev, outcome: e.target.value }))}
                placeholder="e.g. Listing removed and seller warned"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-600"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Moderation Audit Notes *</label>
              <textarea
                rows={3}
                required
                value={resolveReportModal.notes}
                onChange={(e) => setResolveReportModal(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Explain the administrative findings and justification for this action..."
                className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-600"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setResolveReportModal(prev => ({ ...prev, open: false }))}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={resolveReportModal.submitting}
                className="px-4 py-2 rounded-xl bg-purple-800 hover:bg-purple-900 text-white text-xs font-bold transition disabled:opacity-50"
              >
                {resolveReportModal.submitting ? 'Applying...' : 'Confirm Action'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODERATE REVIEW MODAL */}
      {moderateReviewModal.open && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form onSubmit={handleConfirmModerateReview} className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150 border border-slate-200">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-800 px-2 py-0.5 rounded-md border border-purple-200/60">
                Administrative Moderation
              </span>
              <h3 className="text-lg font-black text-slate-900 mt-1 capitalize">
                {moderateReviewModal.action} Review Decision
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 italic">
                {moderateReviewModal.reviewSnippet}
              </p>
            </div>

            {moderateReviewModal.error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                {moderateReviewModal.error}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Official Moderation Rationale *</label>
              <textarea
                rows={3}
                required
                value={moderateReviewModal.moderationReason}
                onChange={(e) => setModerateReviewModal(prev => ({ ...prev, moderationReason: e.target.value }))}
                placeholder="Explain the administrative justification for approving, hiding, or rejecting this review..."
                className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-600 leading-relaxed"
              />
              <p className="text-[10px] text-slate-400">
                This reason is recorded in the platform immutable ActivityLog and recalculates the vendor's public rating aggregate.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModerateReviewModal(prev => ({ ...prev, open: false }))}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={moderateReviewModal.submitting}
                className="px-4 py-2 rounded-xl bg-purple-800 hover:bg-purple-900 text-white text-xs font-bold transition disabled:opacity-50"
              >
                {moderateReviewModal.submitting ? 'Applying...' : 'Confirm Moderation'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

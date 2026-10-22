import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Search, 
  Filter, 
  Zap, 
  MapPin, 
  User, 
  RefreshCw, 
  ShieldCheck, 
  Phone, 
  Mail, 
  Eye, 
  ArrowRight,
  UserCheck,
  RotateCw,
  KeyRound,
  X
} from 'lucide-react';
import { adminAPI } from '../../api/admin.api';
import Loader from '../../components/common/Loader';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { resolveJobImage, getJobImage, handleImageFallback, FALLBACK_SERVICE_IMAGE } from '../../constants/serviceImages';
import { useSocketContext } from '../../context/SocketContext';

export default function AdminJobs() {
  const { socket } = useSocketContext();
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'emergency'
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);

  // Reassignment Modal State
  const [approvedPros, setApprovedPros] = useState([]);
  const [reassignModal, setReassignModal] = useState({
    open: false,
    jobId: null,
    jobTitle: '',
    newVendorId: '',
    reason: '',
    submitting: false,
    error: ''
  });

  // Retrying dispatch state
  const [retryingId, setRetryingId] = useState(null);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const params = {};
      if (activeTab === 'emergency') {
        params.urgency = 'emergency';
        if (statusFilter === 'all') {
          params.status = 'active'; // Filter only active dispatching/open emergency requests
        } else {
          params.status = statusFilter;
        }
      } else {
        if (statusFilter !== 'all') params.status = statusFilter;
      }
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const res = await adminAPI.getJobs(params);
      if (res?.jobs) {
        setJobs(res.jobs);
      }
    } catch (err) {
      console.error('Failed to load jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [activeTab, statusFilter]);

  // Real-time synchronization: Invalidate on job cancellation or assignment
  useEffect(() => {
    if (!socket) return;
    const handleRemoteChange = () => {
      fetchJobs();
    };

    socket.on('job_cancelled', handleRemoteChange);
    socket.on('job_taken', handleRemoteChange);
    socket.on('job_status_updated', handleRemoteChange);
    socket.on('job_created', handleRemoteChange);

    return () => {
      socket.off('job_cancelled', handleRemoteChange);
      socket.off('job_taken', handleRemoteChange);
      socket.off('job_status_updated', handleRemoteChange);
      socket.off('job_created', handleRemoteChange);
    };
  }, [socket]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchJobs();
  };

  const handleRetryDispatch = async (jobId) => {
    try {
      setRetryingId(jobId);
      const res = await adminAPI.retryEmergencyDispatch(jobId);
      alert(`Emergency dispatch sent to ${res.eligibleCount} verified professionals.`);
      fetchJobs();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to dispatch emergency request');
    } finally {
      setRetryingId(null);
    }
  };

  const openReassignModal = async (job) => {
    setReassignModal({
      open: true,
      jobId: job._id,
      jobTitle: job.title,
      newVendorId: '',
      reason: '',
      submitting: false,
      error: ''
    });

    try {
      // Fetch list of approved pros for selection
      const res = await adminAPI.getVendors({ status: 'approved', limit: 50 });
      if (res?.vendors) {
        setApprovedPros(res.vendors);
      }
    } catch (err) {
      console.warn('Failed to load approved professionals:', err.message);
    }
  };

  const handleConfirmReassign = async (e) => {
    e.preventDefault();
    const { jobId, newVendorId, reason } = reassignModal;

    if (!newVendorId) {
      setReassignModal(prev => ({ ...prev, error: 'Please select a replacement professional' }));
      return;
    }

    if (!reason.trim()) {
      setReassignModal(prev => ({ ...prev, error: 'A clear reason is required for reassignment' }));
      return;
    }

    try {
      setReassignModal(prev => ({ ...prev, submitting: true, error: '' }));
      await adminAPI.reassignJob(jobId, { newVendorId, reason: reason.trim() });
      setReassignModal({ open: false, jobId: null, jobTitle: '', newVendorId: '', reason: '', submitting: false, error: '' });
      fetchJobs();
      if (selectedJob && selectedJob._id === jobId) {
        setSelectedJob(null);
      }
    } catch (err) {
      setReassignModal(prev => ({
        ...prev,
        submitting: false,
        error: err.response?.data?.message || 'Failed to reassign job'
      }));
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Completed</span>;
      case 'in_progress':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">In Progress</span>;
      case 'assigned':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">Assigned</span>;
      case 'dispatching':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">Dispatching (Live)</span>;
      case 'open':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">Open / Awaiting</span>;
      case 'expired':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-300">Expired</span>;
      case 'cancelled':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">Cancelled</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="bg-white border border-slate-200/90 shadow-2xs rounded-3xl p-6 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-purple-800 uppercase tracking-wider bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200/60">
              Operations Control
            </span>
            <span className="text-xs text-slate-500 font-medium">· Real-time Execution</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
            Jobs, Bookings & Emergency Dispatch
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl mt-1">
            Track service fulfillment, inspect verified arrival OTPs, audit contractor assignments, and control emergency dispatch matching.
          </p>
        </div>

        <button
          onClick={fetchJobs}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-t-xl transition ${
            activeTab === 'all'
              ? 'border-b-2 border-purple-800 text-purple-800 bg-white shadow-2xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>All Requests & Bookings</span>
        </button>

        <button
          onClick={() => setActiveTab('emergency')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-t-xl transition ${
            activeTab === 'emergency'
              ? 'border-b-2 border-purple-800 text-purple-800 bg-white shadow-2xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Zap className="w-4 h-4 text-amber-500" />
          <span>Emergency Dispatch Queue</span>
        </button>
      </div>

      {/* Search and Status Filters */}
      <div className="bg-white border border-slate-200/90 shadow-2xs rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by job title, service request, or reference..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-600 bg-slate-50/50"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {['all', 'open', 'dispatching', 'assigned', 'in_progress', 'completed', 'cancelled', 'expired'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition ${
                statusFilter === st
                  ? 'bg-purple-800 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Jobs Table */}
      {loading ? (
        <div className="py-20">
          <Loader text="Loading operational jobs..." />
        </div>
      ) : jobs.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center">
          <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No jobs found</h3>
          <p className="text-xs text-slate-500 mt-1">There are no jobs matching the selected criteria</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/90 shadow-2xs rounded-2xl overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-100">
              <tr>
                <th className="p-4">Job & Service</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Assigned Pro</th>
                <th className="p-4">Urgency / Area</th>
                <th className="p-4">Budget / Price</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Oversight</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {jobs.map((j) => {
                const isEmergency = j.urgency === 'emergency';
                return (
                  <tr key={j._id} className="hover:bg-slate-50/80 transition">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={getJobImage(j)}
                          alt=""
                          className="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-200"
                          onError={(e) => handleImageFallback(e, FALLBACK_SERVICE_IMAGE)}
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 line-clamp-1">{j.title}</p>
                          <p className="text-[11px] text-purple-700 font-semibold">{j.category?.name || 'General'}</p>
                          <span className="text-[10px] text-slate-400 font-mono">ID: {j._id.slice(-6)}</span>
                        </div>
                      </div>
                    </td>

                    <td className="p-4">
                      <p className="font-bold text-slate-800">{j.customer?.name || 'Customer'}</p>
                      <p className="text-[11px] text-slate-500">{j.customer?.phone || j.customer?.email || 'N/A'}</p>
                    </td>

                    <td className="p-4">
                      {j.selectedVendor ? (
                        <div>
                          <p className="font-bold text-emerald-800">{j.selectedVendor.name}</p>
                          <p className="text-[11px] text-slate-500">{j.selectedVendor.phone || 'Verified'}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          Pending Assignment
                        </span>
                      )}
                    </td>

                    <td className="p-4">
                      <div className="space-y-1">
                        {isEmergency ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 animate-pulse">
                            <Zap className="w-3 h-3 fill-rose-600" /> Emergency
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                            {j.urgency || 'Standard'}
                          </span>
                        )}
                        <p className="text-[11px] text-slate-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {j.location?.locality || j.location?.city || 'Lucknow'}
                        </p>
                      </div>
                    </td>

                    <td className="p-4">
                      <p className="font-bold text-slate-900">
                        {formatCurrency(j.finalPrice?.amount || j.budget?.amount || 0)}
                      </p>
                      <span className="text-[10px] text-slate-400 capitalize">{j.budget?.type || 'fixed'}</span>
                    </td>

                    <td className="p-4">
                      {getStatusBadge(j.status)}
                    </td>

                    <td className="p-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedJob(j)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </button>

                        {isEmergency && j.status === 'open' && (
                          <button
                            onClick={() => handleRetryDispatch(j._id)}
                            disabled={retryingId === j._id}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1 shadow-2xs"
                          >
                            <RotateCw className={`w-3.5 h-3.5 ${retryingId === j._id ? 'animate-spin' : ''}`} />
                            <span>Retry Dispatch</span>
                          </button>
                        )}

                        {j.status !== 'completed' && j.status !== 'cancelled' && (
                          <button
                            onClick={() => openReassignModal(j)}
                            className="px-2.5 py-1.5 rounded-lg bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200 text-xs font-semibold flex items-center gap-1"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Reassign</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* JOB INSPECTION MODAL */}
      {selectedJob && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-slate-900">{selectedJob.title}</h2>
                  {getStatusBadge(selectedJob.status)}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Reference: #{selectedJob._id} · Created {formatDate(selectedJob.createdAt)}
                </p>
              </div>
              <button
                onClick={() => setSelectedJob(null)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Service Banner Preview */}
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
              <img
                src={getJobImage(selectedJob)}
                alt={selectedJob.title || 'Service Image'}
                className="w-full h-full object-cover"
                onError={(e) => handleImageFallback(e, FALLBACK_SERVICE_IMAGE)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-3 left-3">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-white/95 text-slate-800 shadow-2xs">
                  {selectedJob.category?.name || 'Service Domain'}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Service Description</p>
              <p className="text-xs text-slate-700 leading-relaxed">{selectedJob.description}</p>
            </div>

            {/* Budget & Schedule Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Budget Expectation</p>
                <p className="text-sm font-bold text-slate-900">
                  {selectedJob.budget?.type === 'quote'
                    ? 'Competitive Quotes'
                    : selectedJob.budget?.type === 'range'
                    ? `₹${Number(selectedJob.budget?.minAmount || 0).toLocaleString()} - ₹${Number(selectedJob.budget?.maxAmount || 0).toLocaleString()}`
                    : selectedJob.budget?.type === 'hourly'
                    ? `₹${Number(selectedJob.budget?.amount || 0).toLocaleString()} / hr`
                    : `₹${Number(selectedJob.budget?.amount || 0).toLocaleString()} (${selectedJob.budget?.type || 'Fixed'})`}
                </p>
                <span className="text-[10px] text-slate-500">Currency: {selectedJob.budget?.currency || 'INR'}</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Preferred Schedule</p>
                <p className="text-sm font-bold text-slate-900">
                  {selectedJob.preferredDate || 'Flexible Schedule'}
                </p>
                <span className="text-[10px] text-slate-500 block">
                  Time Slot: {selectedJob.preferredTime || selectedJob.preferredTimeSlot || 'Flexible'}
                  {selectedJob.alternateDate ? ` · Alternate: ${selectedJob.alternateDate}` : ''}
                </span>
              </div>
            </div>

            {/* Customer Uploaded Evidence / Photos */}
            {selectedJob.images?.length > 0 && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Customer Uploaded Photos ({selectedJob.images.length})
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
                  {selectedJob.images.map((img, idx) => (
                    <a
                      key={idx}
                      href={img}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-white hover:border-emerald-600 transition-all shadow-2xs"
                    >
                      <img src={img} alt={`Job Photo ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition-opacity">
                        View
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Customer & Authorized Address */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Customer Dossier</p>
                <p className="text-xs font-bold text-slate-900">{selectedJob.customer?.name}</p>
                <p className="text-xs text-slate-600">Email: {selectedJob.customer?.email}</p>
                <p className="text-xs text-slate-600">Phone: {selectedJob.customer?.phone || 'N/A'}</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Full Service Address (Authorized View)</p>
                <p className="text-xs text-slate-800">
                  {selectedJob.location?.houseNumber} {selectedJob.location?.street}
                </p>
                <p className="text-xs text-slate-600">
                  {selectedJob.location?.locality}, {selectedJob.location?.city} {selectedJob.location?.zipCode}
                </p>
                {selectedJob.location?.landmark && (
                  <p className="text-xs text-purple-800 font-semibold">Landmark: {selectedJob.location.landmark}</p>
                )}
                {(selectedJob.accessInstructions || selectedJob.additionalInstructions) && (
                  <p className="text-xs text-slate-700 bg-white p-2 rounded-lg border border-slate-200 mt-1">
                    <strong>Arrival Instructions:</strong> {selectedJob.accessInstructions || selectedJob.additionalInstructions}
                  </p>
                )}
              </div>
            </div>

            {/* Assigned Contractor & OTP Evidence */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Assigned Professional</p>
                {selectedJob.selectedVendor ? (
                  <>
                    <p className="text-xs font-bold text-emerald-800">{selectedJob.selectedVendor.name}</p>
                    <p className="text-xs text-slate-600">Email: {selectedJob.selectedVendor.email}</p>
                    <p className="text-xs text-slate-600">Phone: {selectedJob.selectedVendor.phone}</p>
                  </>
                ) : (
                  <p className="text-xs text-amber-700 italic">No professional assigned yet</p>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Arrival & OTP Security</p>
                {selectedJob.booking ? (
                  <>
                    <p className="text-xs text-slate-700 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-purple-700" />
                      <span>OTP Status: {selectedJob.booking.startOtp?.isConsumed ? '✅ Verified on Arrival' : '⏳ Awaiting Start OTP'}</span>
                    </p>
                    <p className="text-xs text-slate-600">
                      Payment Escrow: {selectedJob.booking.pricing?.paymentStatus || 'Held in Escrow'}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-slate-500 italic">Open request / Pre-booking stage</p>
                )}
              </div>
            </div>

            {/* Assignment History */}
            {selectedJob.assignmentHistory?.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Assignment History</p>
                <div className="space-y-1">
                  {selectedJob.assignmentHistory.map((h, idx) => (
                    <div key={idx} className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs flex justify-between">
                      <span className="font-semibold text-slate-700">Contractor: {h.vendor || 'Previous'}</span>
                      <span className="text-slate-400">{formatDate(h.assignedAt)} · {h.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Real-time Dispatch & Lifecycle Audit Events */}
            {selectedJob.eventHistory?.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Dispatch & Lifecycle Audit Trail</p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {selectedJob.eventHistory.map((ev, idx) => (
                    <div key={idx} className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 uppercase text-[10px] bg-slate-200 px-1.5 py-0.5 rounded">
                          {ev.event?.replace('_', ' ')}
                        </span>
                        <span className="text-slate-600 truncate">{ev.note}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">{formatDate(ev.timestamp)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                onClick={() => setSelectedJob(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
              >
                Close
              </button>
              {selectedJob.status !== 'completed' && selectedJob.status !== 'cancelled' && (
                <button
                  onClick={() => openReassignModal(selectedJob)}
                  className="px-4 py-2 rounded-xl bg-purple-800 hover:bg-purple-900 text-white text-xs font-bold"
                >
                  Reassign Job
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* REASSIGN JOB MODAL */}
      {reassignModal.open && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form onSubmit={handleConfirmReassign} className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div>
              <h3 className="text-lg font-black text-slate-900">Reassign Job</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Target Request: <span className="font-bold text-slate-800">{reassignModal.jobTitle}</span>
              </p>
            </div>

            {reassignModal.error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                {reassignModal.error}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Select Approved Replacement Professional *</label>
              <select
                required
                value={reassignModal.newVendorId}
                onChange={(e) => setReassignModal(prev => ({ ...prev, newVendorId: e.target.value }))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-600 bg-white"
              >
                <option value="">-- Choose Approved Contractor --</option>
                {approvedPros.map((p) => (
                  <option key={p.user?._id || p._id} value={p.user?._id}>
                    {p.user?.name || p.businessName} · {p.serviceArea?.city || 'Lucknow'}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">
                Reason for Reassignment <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                placeholder="State why this job is being reassigned (e.g. original contractor unavailable, conflict resolution)..."
                value={reassignModal.reason}
                onChange={(e) => setReassignModal(prev => ({ ...prev, reason: e.target.value }))}
                className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-600"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReassignModal(prev => ({ ...prev, open: false }))}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={reassignModal.submitting}
                className="px-4 py-2 rounded-xl bg-purple-800 hover:bg-purple-900 text-white text-xs font-bold transition disabled:opacity-50"
              >
                {reassignModal.submitting ? 'Reassigning...' : 'Confirm Reassignment'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

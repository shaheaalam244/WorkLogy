import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  ShieldCheck, 
  Briefcase, 
  DollarSign, 
  AlertTriangle, 
  CheckSquare, 
  Activity,
  ArrowRight,
  Layers,
  Map,
  BarChart3,
  Sparkles,
  Zap,
  Clock,
  UserCheck,
  CreditCard,
  Ban,
  Terminal,
  RefreshCw,
  Flag
} from 'lucide-react';
import { adminAPI } from '../../api/admin.api';
import Loader from '../../components/common/Loader';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useSocketContext } from '../../context/SocketContext';

export default function AdminDashboard() {
  const { socket } = useSocketContext();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getStats();
      if (res) {
        setData(res);
      }
    } catch (err) {
      console.error('Failed to load admin metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleRemoteChange = () => {
      fetchDashboard();
    };

    socket.on('job_cancelled', handleRemoteChange);
    socket.on('job_created', handleRemoteChange);
    socket.on('job_status_updated', handleRemoteChange);
    socket.on('job_taken', handleRemoteChange);

    return () => {
      socket.off('job_cancelled', handleRemoteChange);
      socket.off('job_created', handleRemoteChange);
      socket.off('job_status_updated', handleRemoteChange);
      socket.off('job_taken', handleRemoteChange);
    };
  }, [socket]);

  if (loading) {
    return (
      <div className="py-20">
        <Loader text="Loading live admin analytics & operations..." />
      </div>
    );
  }

  const stats = data?.stats || {};
  const recent = data?.recent || {};

  return (
    <div className="space-y-7 w-full">
      {/* 1. Page Header */}
      <div className="bg-white border border-slate-200/90 shadow-2xs rounded-3xl p-6 sm:p-7 lg:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-purple-800 uppercase tracking-wider bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200/60">
              Platform Command Dashboard
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
              Live Database Connected
            </span>
            <span className="text-xs text-slate-500 font-medium">· Lucknow Metro</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            WorkLogy Platform Command
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-3xl">
            Live overview of contractor applications, customer job requests, escrow settlements, and emergency dispatch status.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-stretch sm:self-auto">
          <button
            onClick={fetchDashboard}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
          <Link to="/admin/vendors" className="w-full sm:w-auto">
            <button className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-800 hover:bg-purple-900 text-white text-xs font-bold shadow-xs transition active:scale-95">
              <CheckSquare className="w-4 h-4" />
              <span>Review Pros ({stats.pendingApplications || 0})</span>
            </button>
          </Link>
        </div>
      </div>

      {/* 2. Database-Backed Metric Cards Grid (All 10 required items) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Platform Core Indicators</h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* 1. Total Customers */}
          <Link to="/admin/users" className="group">
            <div className="bg-white border border-slate-200/90 shadow-2xs p-4 rounded-2xl hover:border-purple-300 transition h-full flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Customers</span>
                <Users className="w-4 h-4 text-purple-700" />
              </div>
              <p className="text-2xl font-black text-slate-900 mt-2">{stats.totalCustomers || 0}</p>
              <span className="text-[10px] text-slate-400 group-hover:text-purple-700 font-semibold flex items-center gap-1 mt-1">
                Manage Users <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </Link>

          {/* 2. Total Professionals */}
          <Link to="/admin/vendors" className="group">
            <div className="bg-white border border-slate-200/90 shadow-2xs p-4 rounded-2xl hover:border-purple-300 transition h-full flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Pros</span>
                <Briefcase className="w-4 h-4 text-purple-700" />
              </div>
              <p className="text-2xl font-black text-slate-900 mt-2">{stats.totalProfessionals || 0}</p>
              <span className="text-[10px] text-slate-400 group-hover:text-purple-700 font-semibold flex items-center gap-1 mt-1">
                View All Pros <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </Link>

          {/* 3. Pending Applications */}
          <Link to="/admin/vendors?status=pending" className="group">
            <div className="bg-white border border-amber-200/90 bg-amber-50/20 shadow-2xs p-4 rounded-2xl hover:border-amber-400 transition h-full flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider">Pending Review</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-2xl font-black text-amber-700 mt-2">{stats.pendingApplications || 0}</p>
              <span className="text-[10px] text-amber-700 font-semibold flex items-center gap-1 mt-1">
                Inspect Queue <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </Link>

          {/* 4. Approved Professionals */}
          <Link to="/admin/vendors?status=approved" className="group">
            <div className="bg-white border border-slate-200/90 shadow-2xs p-4 rounded-2xl hover:border-emerald-300 transition h-full flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Approved Pros</span>
                <CheckSquare className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-emerald-700 mt-2">{stats.approvedProfessionals || 0}</p>
              <span className="text-[10px] text-slate-400 group-hover:text-emerald-700 font-semibold flex items-center gap-1 mt-1">
                Active Listings <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </Link>

          {/* 5. Suspended Professionals */}
          <Link to="/admin/vendors?status=suspended" className="group">
            <div className="bg-white border border-slate-200/90 shadow-2xs p-4 rounded-2xl hover:border-rose-300 transition h-full flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Suspended Pros</span>
                <Ban className="w-4 h-4 text-rose-600" />
              </div>
              <p className="text-2xl font-black text-rose-700 mt-2">{stats.suspendedProfessionals || 0}</p>
              <span className="text-[10px] text-slate-400 group-hover:text-rose-700 font-semibold flex items-center gap-1 mt-1">
                Restricted List <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </Link>

          {/* 6. Open Jobs */}
          <Link to="/admin/jobs?status=open" className="group">
            <div className="bg-white border border-slate-200/90 shadow-2xs p-4 rounded-2xl hover:border-blue-300 transition h-full flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Open Jobs</span>
                <Zap className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl font-black text-slate-900 mt-2">{stats.openJobs || 0}</p>
              <span className="text-[10px] text-slate-400 group-hover:text-blue-700 font-semibold flex items-center gap-1 mt-1">
                Dispatch Queue <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </Link>

          {/* 7. Active Bookings */}
          <Link to="/admin/jobs?status=in_progress" className="group">
            <div className="bg-white border border-slate-200/90 shadow-2xs p-4 rounded-2xl hover:border-purple-300 transition h-full flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Active Bookings</span>
                <Activity className="w-4 h-4 text-purple-700" />
              </div>
              <p className="text-2xl font-black text-purple-700 mt-2">{stats.activeBookings || 0}</p>
              <span className="text-[10px] text-slate-400 group-hover:text-purple-700 font-semibold flex items-center gap-1 mt-1">
                In-Progress Work <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </Link>

          {/* 8. Completed Jobs */}
          <Link to="/admin/jobs?status=completed" className="group">
            <div className="bg-white border border-slate-200/90 shadow-2xs p-4 rounded-2xl hover:border-emerald-300 transition h-full flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Completed Jobs</span>
                <CheckSquare className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-slate-900 mt-2">{stats.completedJobs || 0}</p>
              <span className="text-[10px] text-slate-400 group-hover:text-emerald-700 font-semibold flex items-center gap-1 mt-1">
                Settled Contracts <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </Link>

          {/* 9. Pending Payments / Escrow */}
          <Link to="/admin/payments" className="group">
            <div className="bg-white border border-slate-200/90 shadow-2xs p-4 rounded-2xl hover:border-emerald-300 transition h-full flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Pending Payments</span>
                <CreditCard className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-emerald-700 mt-2">{stats.pendingPayments || 0}</p>
              <span className="text-[10px] text-slate-400 group-hover:text-emerald-700 font-semibold flex items-center gap-1 mt-1">
                Escrow Ledger <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </Link>

          {/* 10. Disputes Requiring Attention */}
          <Link to="/admin/disputes" className="group">
            <div className="bg-white border border-rose-200/90 bg-rose-50/20 shadow-2xs p-4 rounded-2xl hover:border-rose-400 transition h-full flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-rose-800 font-bold uppercase tracking-wider">Disputes Open</span>
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              </div>
              <p className="text-2xl font-black text-rose-700 mt-2">{stats.openDisputes || 0}</p>
              <span className="text-[10px] text-rose-700 font-semibold flex items-center gap-1 mt-1">
                Investigate Now <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </Link>

          {/* 11. Abuse Reports */}
          <Link to="/admin/disputes" className="group">
            <div className="bg-white border border-rose-200/90 bg-rose-50/20 shadow-2xs p-4 rounded-2xl hover:border-rose-400 transition h-full flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-rose-800 font-bold uppercase tracking-wider">Abuse Reports</span>
                <Flag className="w-4 h-4 text-rose-600" />
              </div>
              <p className="text-2xl font-black text-rose-700 mt-2">{stats.pendingReports || 0}</p>
              <span className="text-[10px] text-rose-700 font-semibold flex items-center gap-1 mt-1">
                Review Queue <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </Link>
        </div>
      </div>

      {/* 3. Real Financial Treasury Strip */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Database Treasury</span>
            <h3 className="text-lg font-black mt-0.5">Financial Ledger Overview</h3>
          </div>
          <Link to="/admin/payments" className="text-xs text-purple-300 hover:text-white font-bold flex items-center gap-1">
            View Complete Transaction Ledger <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 pt-5">
          <div>
            <span className="text-xs text-slate-400">Total Customer Volume</span>
            <p className="text-2xl sm:text-3xl font-black text-white mt-1">
              {formatCurrency(stats.totalGross || 0)}
            </p>
          </div>

          <div>
            <span className="text-xs text-blue-300">Currently Held in Escrow</span>
            <p className="text-2xl sm:text-3xl font-black text-blue-400 mt-1">
              {formatCurrency(stats.escrowHeld || 0)}
            </p>
          </div>

          <div>
            <span className="text-xs text-emerald-300">Earned Platform Revenue</span>
            <p className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1">
              {formatCurrency(stats.platformRevenue || 0)}
            </p>
          </div>

          <div>
            <span className="text-xs text-slate-400">Contractor Payouts Settled</span>
            <p className="text-2xl sm:text-3xl font-black text-slate-200 mt-1">
              {formatCurrency(stats.totalPayouts || 0)}
            </p>
          </div>
        </div>
      </div>

      {/* 4. Live Action Panels: Applications Awaiting Review & Emergency Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Applications Awaiting Review */}
        <div className="bg-white border border-slate-200/90 shadow-2xs rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-purple-800" />
              <h3 className="text-sm font-bold text-slate-900">Applications Awaiting Review</h3>
            </div>
            <Link to="/admin/vendors" className="text-xs text-purple-800 font-bold hover:underline">
              View All
            </Link>
          </div>

          <div className="space-y-2.5">
            {recent.applications?.length > 0 ? (
              recent.applications.map((app) => (
                <div key={app._id} className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 font-bold text-xs flex items-center justify-center shrink-0">
                      {(app.user?.name || app.businessName || 'P')[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{app.user?.name || app.businessName}</p>
                      <p className="text-[11px] text-slate-500 truncate">{app.user?.email} · {app.categories?.[0]?.name || 'Trade'}</p>
                    </div>
                  </div>

                  <Link to="/admin/vendors">
                    <button className="px-3 py-1.5 rounded-xl bg-purple-800 hover:bg-purple-900 text-white text-[11px] font-bold shrink-0">
                      Review
                    </button>
                  </Link>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 italic py-4 text-center">No pending applications right now</p>
            )}
          </div>
        </div>

        {/* Emergency Dispatch Queue */}
        <div className="bg-white border border-slate-200/90 shadow-2xs rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
              <h3 className="text-sm font-bold text-slate-900">Emergency Requests Needing Assignment</h3>
            </div>
            <Link to="/admin/jobs?urgency=emergency" className="text-xs text-purple-800 font-bold hover:underline">
              View Queue
            </Link>
          </div>

          <div className="space-y-2.5">
            {recent.emergencyRequests?.length > 0 ? (
              recent.emergencyRequests.map((em) => (
                <div key={em._id} className="p-3 rounded-2xl bg-amber-50/40 border border-amber-200/70 flex items-center justify-between gap-3">
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-xs font-bold text-slate-900 truncate">{em.title}</p>
                    <p className="text-[11px] text-slate-600">
                      {em.location?.locality || em.location?.city} · {em.selectedVendor ? `Assigned to ${em.selectedVendor.name}` : 'Awaiting Acceptance'}
                    </p>
                  </div>

                  <Link to="/admin/jobs">
                    <button className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold shrink-0">
                      Oversight
                    </button>
                  </Link>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 italic py-4 text-center">No unassigned emergency requests</p>
            )}
          </div>
        </div>
      </div>

      {/* 5. Recent Platform Activity Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Customer Requests */}
        <div className="bg-white border border-slate-200/90 shadow-2xs rounded-3xl p-6 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5 text-purple-700" />
            <span>Recent Customer Requests</span>
          </h3>
          <div className="space-y-2">
            {recent.customerRequests?.map((j) => (
              <div key={j._id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <p className="font-bold text-slate-900 truncate">{j.title}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  By {j.customer?.name} · {formatDate(j.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Bookings & Payments */}
        <div className="bg-white border border-slate-200/90 shadow-2xs rounded-3xl p-6 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
            <span>Recent Payment Activity</span>
          </h3>
          <div className="space-y-2">
            {recent.payments?.map((tx) => (
              <div key={tx._id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex justify-between items-center">
                <div>
                  <p className="font-bold text-slate-900">{tx.transactionId}</p>
                  <p className="text-[11px] text-slate-500">{tx.customer?.name} → {tx.vendor?.name}</p>
                </div>
                <span className="font-bold text-emerald-800">{formatCurrency(tx.grossAmount || 0)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Audit Log Actions */}
        <div className="bg-white border border-slate-200/90 shadow-2xs rounded-3xl p-6 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-purple-700" />
            <span>Administrative Actions</span>
          </h3>
          <div className="space-y-2">
            {recent.auditActions?.map((act) => (
              <div key={act._id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono">
                <p className="font-bold text-purple-800 text-[11px]">{act.action}</p>
                <p className="text-[10px] text-slate-500 font-sans mt-0.5">
                  By {act.user?.name || 'Admin'} · {formatDate(act.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

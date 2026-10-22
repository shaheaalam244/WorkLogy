import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  PlusCircle, 
  Briefcase, 
  Clock, 
  CheckCircle, 
  MessageSquare, 
  Star, 
  ArrowRight, 
  AlertCircle,
  Activity,
  Calendar,
  DollarSign,
  ShieldCheck,
  FileText,
  Users,
  Compass,
  CreditCard,
  MapPin,
  Bookmark,
  ChevronRight,
  Sparkles,
  ExternalLink,
  Receipt,
  Key,
  RefreshCw,
  Lock,
  X,
  Check,
  Phone,
  HelpCircle,
  Bell
} from 'lucide-react';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import { useAuth } from '../../hooks/useAuth';
import { useSocketContext } from '../../context/SocketContext';
import { customerAPI } from '../../api/customer.api';
import { applicationAPI } from '../../api/application.api';
import { formatCurrency, formatRelativeTime, getStatusBadgeColor } from '../../utils/formatters';
import { getServiceImage } from '../../constants/serviceImages';

export default function CustomerDashboard() {
  const { user } = useAuth();
  const { socket } = useSocketContext();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orderFilter, setOrderFilter] = useState('all');

  // Quotation Review Modal State
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [acceptingQuoteId, setAcceptingQuoteId] = useState(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState(null);
  const [actionErrorMsg, setActionErrorMsg] = useState(null);

  const quotationSectionRef = useRef(null);

  const fetchDashboardData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const res = await customerAPI.getDashboardSummary();
      if (res?.success) {
        setData(res);
      }
    } catch (err) {
      console.error('Failed to load customer dashboard:', err);
      if (!silent) {
        setError('Unable to load dashboard details. Please verify your connection.');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Real-time synchronization via Socket.IO
  useEffect(() => {
    if (!socket) return;

    const handleSync = () => {
      fetchDashboardData(true);
    };

    socket.on('job_status_update', handleSync);
    socket.on('job_status_updated', handleSync);
    socket.on('job_cancelled', handleSync);
    socket.on('job_deleted', handleSync);
    socket.on('booking_updated', handleSync);
    socket.on('new_quotation', handleSync);
    socket.on('payment_updated', handleSync);

    return () => {
      socket.off('job_status_update', handleSync);
      socket.off('job_status_updated', handleSync);
      socket.off('job_cancelled', handleSync);
      socket.off('job_deleted', handleSync);
      socket.off('booking_updated', handleSync);
      socket.off('new_quotation', handleSync);
      socket.off('payment_updated', handleSync);
    };
  }, [socket]);

  // Handle Quotation Acceptance
  const handleAcceptQuotation = async (quoteId) => {
    try {
      setAcceptingQuoteId(quoteId);
      setActionErrorMsg(null);
      const res = await applicationAPI.updateStatus(quoteId, 'accepted');
      if (res?.success) {
        setActionSuccessMsg('Offer accepted! Your booking is confirmed and your Service Start OTP is ready.');
        setSelectedQuote(null);
        await fetchDashboardData(true);
      } else {
        setActionErrorMsg(res?.message || 'Failed to accept offer. Please try again.');
      }
    } catch (err) {
      console.error('Error accepting quotation:', err);
      setActionErrorMsg(err?.response?.data?.message || 'An error occurred while accepting quotation.');
    } finally {
      setAcceptingQuoteId(null);
    }
  };

  // Handle Quotation Rejection
  const handleRejectQuotation = async (quoteId) => {
    try {
      setAcceptingQuoteId(quoteId);
      setActionErrorMsg(null);
      const res = await applicationAPI.updateStatus(quoteId, 'rejected');
      if (res?.success) {
        setActionSuccessMsg('Quotation declined.');
        setSelectedQuote(null);
        await fetchDashboardData(true);
      }
    } catch (err) {
      console.error('Error rejecting quotation:', err);
      setActionErrorMsg(err?.response?.data?.message || 'Failed to decline proposal.');
    } finally {
      setAcceptingQuoteId(null);
    }
  };

  if (loading) {
    return (
      <div className="py-24">
        <Loader text="Loading your customer console and active service orders..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white border border-slate-200/90 rounded-2xl p-8 text-center max-w-md mx-auto shadow-sm my-12">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-1">Failed to Load Dashboard</h3>
        <p className="text-xs text-slate-500 mb-5 leading-relaxed">{error || 'Something went wrong.'}</p>
        <Button variant="primary" size="sm" onClick={() => fetchDashboardData()}>
          Retry Connection
        </Button>
      </div>
    );
  }

  const {
    metrics = {
      activeOrdersCount: 0,
      pendingQuotationsCount: 0,
      upcomingBookingsCount: 0,
      completedOrdersCount: 0,
      totalSpent: 0,
      escrowProtected: 0,
      pendingPayments: 0,
      refunds: 0
    },
    ongoingWork = [],
    recentOrders = [],
    pendingQuotations = [],
    savedVendorsCount = 0,
    savedAddressesCount = 0
  } = data;

  // Filter recent orders
  const filteredOrders = recentOrders.filter((order) => {
    if (orderFilter === 'all') return true;
    if (orderFilter === 'active') {
      return ['assigned', 'confirmed', 'scheduled', 'in_progress', 'completion_pending'].includes(order.status);
    }
    if (orderFilter === 'upcoming') {
      return ['awaiting_confirmation', 'assigned', 'confirmed', 'scheduled'].includes(order.status);
    }
    if (orderFilter === 'completed') {
      return order.status === 'completed';
    }
    if (orderFilter === 'cancelled') {
      return order.status === 'cancelled';
    }
    return true;
  });

  return (
    <div className="space-y-6 sm:space-y-7 pb-12">
      {/* ── Action Success/Error Alerts ── */}
      {actionSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-xl flex items-center justify-between text-xs font-semibold animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button onClick={() => setActionSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {actionErrorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-900 px-4 py-3 rounded-xl flex items-center justify-between text-xs font-semibold animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
            <span>{actionErrorMsg}</span>
          </div>
          <button onClick={() => setActionErrorMsg(null)} className="text-rose-700 hover:text-rose-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── 1. Compact Dashboard Header ── */}
      <div className="bg-white border border-slate-200/90 shadow-2xs rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-800 text-white font-black text-lg flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <span>{user?.name?.charAt(0).toUpperCase() || 'C'}</span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                WorkLogy Customer
              </span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Welcome back, {user?.name || 'Homeowner'}!
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              Manage your service requests, track technicians, and review verified contractor bids.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto shrink-0">
          <Link to="/customer/explore" className="w-full sm:w-auto">
            <Button variant="secondary" size="sm" icon={Compass} className="w-full sm:w-auto text-xs font-semibold">
              Find a Professional
            </Button>
          </Link>
          <Link to="/customer/create-job" className="w-full sm:w-auto">
            <Button variant="primary" size="sm" icon={PlusCircle} className="w-full sm:w-auto text-xs font-semibold">
              Request a Service
            </Button>
          </Link>
        </div>
      </div>

      {/* ── 2. Four Clickable Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Active Jobs */}
        <Link 
          to="/customer/bookings?status=in_progress"
          className="bg-white border border-slate-200/90 shadow-2xs p-4 sm:p-5 rounded-2xl hover:border-emerald-500/80 hover:shadow-xs transition flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-semibold text-slate-600 group-hover:text-emerald-800 transition">Active Jobs</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {metrics.activeOrdersCount}
            </p>
            <span className="text-[11px] font-medium text-emerald-700 mt-1 block">
              {metrics.activeOrdersCount > 0 ? 'Work in progress' : 'No active jobs'}
            </span>
          </div>
        </Link>

        {/* Waiting for Response */}
        <button
          onClick={() => {
            if (quotationSectionRef.current) {
              quotationSectionRef.current.scrollIntoView({ behavior: 'smooth' });
            }
          }}
          className="bg-white border border-slate-200/90 shadow-2xs p-4 sm:p-5 rounded-2xl hover:border-blue-500/80 hover:shadow-xs transition flex flex-col justify-between text-left group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-semibold text-slate-600 group-hover:text-blue-700 transition">Waiting for Response</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-blue-700 tracking-tight">
              {metrics.pendingQuotationsCount}
            </p>
            <span className="text-[11px] font-medium text-slate-500 mt-1 block">
              {metrics.pendingQuotationsCount > 0 ? 'Offers to review' : 'All offers evaluated'}
            </span>
          </div>
        </button>

        {/* Confirmed Jobs */}
        <Link 
          to="/customer/bookings?status=scheduled"
          className="bg-white border border-slate-200/90 shadow-2xs p-4 sm:p-5 rounded-2xl hover:border-amber-500/80 hover:shadow-xs transition flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-semibold text-slate-600 group-hover:text-amber-700 transition">Confirmed Jobs</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-amber-700 tracking-tight">
              {metrics.upcomingBookingsCount}
            </p>
            <span className="text-[11px] font-medium text-slate-500 mt-1 block">
              {metrics.upcomingBookingsCount > 0 ? 'Confirmed appointments' : 'No upcoming visits'}
            </span>
          </div>
        </Link>

        {/* Completed Work */}
        <Link 
          to="/customer/bookings?status=completed"
          className="bg-white border border-slate-200/90 shadow-2xs p-4 sm:p-5 rounded-2xl hover:border-emerald-500/80 hover:shadow-xs transition flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-semibold text-slate-600 group-hover:text-emerald-800 transition">Completed Work</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-emerald-900 tracking-tight">
              {metrics.completedOrdersCount}
            </p>
            <span className="text-[11px] font-medium text-emerald-700 mt-1 block">
              Delivered & finished work
            </span>
          </div>
        </Link>
      </div>

      {/* ── 3. Compact Financial & Escrow Protection Summary ── */}
      <div className="bg-white border border-slate-200/90 shadow-2xs rounded-2xl p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100 mb-3.5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              WorkLogy Escrow & Financial Protection
            </h2>
          </div>
          <Link to="/customer/payments" className="text-xs font-semibold text-emerald-800 hover:underline flex items-center gap-1">
            <span>Invoices & Receipts</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
              Held in Escrow
            </span>
            <p className="text-xl font-black text-emerald-900 tracking-tight mt-0.5">
              {metrics.escrowProtected > 0 ? formatCurrency(metrics.escrowProtected) : '₹0 (Protected)'}
            </p>
            <span className="text-[10px] text-emerald-700 block mt-0.5">
              Locked until you approve work
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Released Spending
            </span>
            <p className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
              {metrics.totalSpent > 0 ? formatCurrency(metrics.totalSpent) : '₹0 (Settled)'}
            </p>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Paid for completed jobs
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Pending Invoices
            </span>
            <p className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
              {metrics.pendingPayments > 0 ? formatCurrency(metrics.pendingPayments) : '₹0'}
            </p>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Unsettled payment requests
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Refunds
            </span>
            <p className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
              {metrics.refunds > 0 ? formatCurrency(metrics.refunds) : '₹0'}
            </p>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Returned from cancellations
            </span>
          </div>
        </div>

        <p className="text-[11px] text-slate-500 mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
          <span>
            Escrow guarantee: Funds remain protected in escrow until your assigned technician verifies arrival and you confirm complete satisfaction.
          </span>
        </p>
      </div>

      {/* ── 4. Ongoing Service Orders (Compact Order Cards) ── */}
      <div className="bg-white border border-slate-200/90 shadow-2xs rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              <h2 className="text-base font-bold text-slate-900">Ongoing Service Orders</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Active jobs in fulfillment with assigned contractors and secure OTP verification.
            </p>
          </div>
          <Link to="/customer/bookings" className="text-xs font-bold text-emerald-800 hover:underline flex items-center gap-1 shrink-0">
            <span>View All Orders</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {ongoingWork.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-200 p-6 space-y-2.5">
            <Briefcase className="w-7 h-7 text-slate-400 mx-auto" />
            <h3 className="text-xs font-bold text-slate-800">No Ongoing Service Orders</h3>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              When a verified technician accepts your service request or booking, live tracking and OTP will appear here.
            </p>
            <Link to="/customer/create-job" className="inline-block pt-1">
              <Button variant="primary" size="sm" icon={PlusCircle} className="text-xs">
                Request a Service
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {ongoingWork.map((order) => {
              const stageLabels = [
                '1. Request Posted',
                '2. Vendor Assigned',
                '3. Work in Progress',
                '4. Completed'
              ];
              const currentStage = order.stage || 2;

              return (
                <div 
                  key={order._id}
                  className="p-4 sm:p-5 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition space-y-3.5"
                >
                  {/* Top Bar: Reference, Title, Category & Price */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <img
                        src={getServiceImage(order.category, order.serviceTitle)}
                        alt={order.serviceTitle || 'Service Image'}
                        className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover shrink-0 border border-slate-200/90 shadow-2xs"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = '/vite.svg';
                        }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-[10px] font-mono font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                            #{order.bookingReference}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusBadgeColor(order.status)}`}>
                            {order.status?.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {order.category}
                          </span>
                        </div>
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                          {order.serviceTitle}
                        </h3>
                      </div>
                    </div>

                    <div className="sm:text-right shrink-0">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                        Contract Amount
                      </span>
                      <span className="text-lg font-black text-emerald-800">
                        {order.pricing?.isPriced ? formatCurrency(order.pricing.amount) : 'Awaiting Quote'}
                      </span>
                      <span className="text-[10px] font-medium text-emerald-700 block">
                        • Payment Protected
                      </span>
                    </div>
                  </div>

                  {/* Compact 4-Stage Progress Stepper */}
                  <div className="bg-white p-3 rounded-lg border border-slate-200/80">
                    <div className="grid grid-cols-4 gap-2 text-center">
                      {stageLabels.map((label, idx) => {
                        const stepNum = idx + 1;
                        const isDone = stepNum < currentStage;
                        const isCurrent = stepNum === currentStage;

                        return (
                          <div key={label} className="flex flex-col items-center">
                            <div className="w-full flex items-center mb-1.5">
                              <div className={`h-1 flex-1 rounded-full ${
                                stepNum <= currentStage ? 'bg-emerald-600' : 'bg-slate-200'
                              }`} />
                            </div>
                            <span className={`text-[10px] sm:text-[11px] font-bold truncate max-w-full ${
                              isCurrent
                                ? 'text-emerald-800'
                                : isDone
                                ? 'text-slate-700'
                                : 'text-slate-400'
                            }`}>
                              {label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bottom Row: Vendor Profile, OTP & Quick Actions */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-slate-200/80">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-900 font-bold flex items-center justify-center shrink-0 overflow-hidden text-xs">
                        {order.vendor?.avatar ? (
                          <img src={order.vendor.avatar} alt={order.vendor.name} className="w-full h-full object-cover" />
                        ) : (
                          <span>{order.vendor?.name?.charAt(0) || 'V'}</span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900">
                            {order.vendor?.name || 'Assigned Technician'}
                          </span>
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          <span className="text-[10px] font-semibold text-slate-500">
                            ★ {order.vendor?.rating || 4.9}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{order.timeSlot || 'Standard Slot'}</span>
                        </span>
                      </div>
                    </div>

                    {/* Secure Service-Start OTP Badge */}
                    {order.startOtp && (
                      <div className="bg-emerald-100/80 border border-emerald-300 text-emerald-950 px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs shrink-0">
                        <Key className="w-3.5 h-3.5 text-emerald-800 shrink-0" />
                        <span>Service Start OTP:</span>
                        <span className="font-mono font-black tracking-widest text-sm text-emerald-900 bg-white px-2 py-0.5 rounded border border-emerald-300">
                          {order.startOtp}
                        </span>
                        <span className="text-[10px] text-emerald-800 hidden lg:inline">
                          (Share on arrival)
                        </span>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      {order.vendor?._id && (
                        <Link to={`/customer/messages?recipientId=${order.vendor._id}&jobId=${order.jobId || ''}`}>
                          <Button variant="secondary" size="sm" icon={MessageSquare} className="text-xs">
                            Message
                          </Button>
                        </Link>
                      )}
                      <Link to={`/customer/tracking?bookingId=${order._id || order.id}`}>
                        <Button variant="primary" size="sm" icon={Activity} className="text-xs">
                          Track Job
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 5. Balanced Two-Column Section: Pending Quotations & Shortcuts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left/Main Column: Pending Contractor Quotations */}
        <div ref={quotationSectionRef} className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-slate-200/90 shadow-2xs rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-800" />
                  <h2 className="text-base font-bold text-slate-900">Offers from Professionals</h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Review prices sent by verified professionals.
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                {pendingQuotations.length} Offers
              </span>
            </div>

            {pendingQuotations.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-1.5">
                <FileText className="w-6 h-6 text-slate-400 mx-auto" />
                <p className="text-xs font-semibold text-slate-700">All offers have been evaluated.</p>
                <p className="text-[11px] text-slate-500">
                  New offers from verified professionals in your area will appear here in real time.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingQuotations.map((quote) => (
                  <div 
                    key={quote._id} 
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-900 font-bold flex items-center justify-center shrink-0 text-xs overflow-hidden">
                          {quote.vendor?.avatar ? (
                            <img src={quote.vendor.avatar} alt={quote.vendor.name} className="w-full h-full object-cover" />
                          ) : (
                            <span>{quote.vendor?.name?.charAt(0) || 'V'}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 truncate flex items-center gap-1">
                            <span>{quote.vendor?.name || 'Verified Technician'}</span>
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          </h4>
                          <p className="text-[11px] text-slate-500 truncate">
                            For: <strong>{quote.job?.title || 'Your Request'}</strong>
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-base font-black text-emerald-800 block">
                          {formatCurrency(quote.proposedAmount)}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {quote.pricingBasis === 'hourly' ? 'Hourly Estimate' : 'Fixed Quote'}
                        </span>
                      </div>
                    </div>

                    {quote.coverLetter && (
                      <p className="text-[11px] text-slate-600 italic bg-white p-2 rounded-lg border border-slate-200/80 line-clamp-2">
                        "{quote.coverLetter}"
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px] text-slate-500">
                      <span>Est. Duration: <strong className="text-slate-700">{quote.estimatedDuration || '1-2 Days'}</strong></span>
                      <button
                        onClick={() => setSelectedQuote(quote)}
                        className="text-xs font-bold text-emerald-800 hover:text-emerald-950 underline flex items-center gap-1"
                      >
                        <span>Review Proposal</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Customer Shortcuts Grid */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200/90 shadow-2xs rounded-2xl p-5 sm:p-6 space-y-3.5">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Customer Quick Shortcuts
            </h3>

            <div className="grid grid-cols-2 gap-2.5">
              <Link 
                to="/customer/create-job"
                className="p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40 transition flex flex-col justify-between"
              >
                <PlusCircle className="w-4 h-4 text-emerald-700 mb-2" />
                <span className="text-xs font-bold text-slate-900">Post a Request</span>
                <span className="text-[10px] text-slate-500">Instant Vendor Match</span>
              </Link>

              <Link 
                to="/customer/bookings"
                className="p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40 transition flex flex-col justify-between"
              >
                <Briefcase className="w-4 h-4 text-emerald-700 mb-2" />
                <span className="text-xs font-bold text-slate-900">My Orders</span>
                <span className="text-[10px] text-slate-500">Bookings & Schedule</span>
              </Link>

              <Link 
                to="/customer/messages"
                className="p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40 transition flex flex-col justify-between"
              >
                <MessageSquare className="w-4 h-4 text-emerald-700 mb-2" />
                <span className="text-xs font-bold text-slate-900">Messages</span>
                <span className="text-[10px] text-slate-500">Direct Chat with Pros</span>
              </Link>

              <Link 
                to="/customer/saved"
                className="p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40 transition flex flex-col justify-between"
              >
                <Bookmark className="w-4 h-4 text-emerald-700 mb-2" />
                <span className="text-xs font-bold text-slate-900">Saved Pros</span>
                <span className="text-[10px] text-slate-500">{savedVendorsCount} Technicians</span>
              </Link>

              <Link 
                to="/customer/addresses"
                className="p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40 transition flex flex-col justify-between"
              >
                <MapPin className="w-4 h-4 text-emerald-700 mb-2" />
                <span className="text-xs font-bold text-slate-900">Saved Addresses</span>
                <span className="text-[10px] text-slate-500">{savedAddressesCount} Configured</span>
              </Link>

              <Link 
                to="/customer/payments"
                className="p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40 transition flex flex-col justify-between"
              >
                <CreditCard className="w-4 h-4 text-emerald-700 mb-2" />
                <span className="text-xs font-bold text-slate-900">Payments</span>
                <span className="text-[10px] text-slate-500">Escrow & Receipts</span>
              </Link>

              <Link 
                to="/customer/notifications"
                className="p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40 transition flex flex-col justify-between"
              >
                <Bell className="w-4 h-4 text-emerald-700 mb-2" />
                <span className="text-xs font-bold text-slate-900">Notifications</span>
                <span className="text-[10px] text-slate-500">Status Alerts</span>
              </Link>

              <Link 
                to="/customer/support"
                className="p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40 transition flex flex-col justify-between"
              >
                <HelpCircle className="w-4 h-4 text-emerald-700 mb-2" />
                <span className="text-xs font-bold text-slate-900">Help & Support</span>
                <span className="text-[10px] text-slate-500">Escrow Dispute Desk</span>
              </Link>
            </div>
          </div>
        </div>

      </div>

      {/* ── 6. Recent Service Orders with Filter Tabs ── */}
      <div className="bg-white border border-slate-200/90 shadow-2xs rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-emerald-800" />
              <h2 className="text-base font-bold text-slate-900">Recent Service Orders</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Complete history of posted requests, bookings, and completed work.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'All' },
              { id: 'active', label: 'Active' },
              { id: 'upcoming', label: 'Upcoming' },
              { id: 'completed', label: 'Completed' },
              { id: 'cancelled', label: 'Cancelled' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setOrderFilter(tab.id)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  orderFilter === tab.id
                    ? 'bg-emerald-800 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-200 p-6 space-y-2">
            <Briefcase className="w-7 h-7 text-slate-400 mx-auto" />
            <p className="text-xs font-semibold text-slate-700">No orders found for the selected filter.</p>
            <p className="text-[11px] text-slate-500">
              Orders matching this filter status will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredOrders.map((order) => (
              <div
                key={order._id}
                className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200/90 hover:border-slate-300 shadow-2xs transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <img
                    src={getServiceImage(order.category, order.title)}
                    alt={order.title || 'Service Image'}
                    className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl object-cover shrink-0 border border-slate-200/90 shadow-2xs"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = '/vite.svg';
                    }}
                  />
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        #{order.reference}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusBadgeColor(order.status)}`}>
                        {order.status === 'open' ? 'Open for Bids' : order.status?.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {formatRelativeTime(order.createdAt)}
                      </span>
                    </div>

                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                      {order.title}
                    </h4>

                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>{order.category}</span>
                      {order.vendorName && (
                        <>
                          <span>•</span>
                          <span>Vendor: <strong className="text-slate-700">{order.vendorName}</strong></span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                  <span className="text-sm sm:text-base font-black text-emerald-800">
                    {order.pricingLabel}
                  </span>
                  <Link to={order.detailLink || `/jobs/${order.jobId || order._id}`}>
                    <Button variant="secondary" size="sm" className="text-xs font-semibold py-1">
                      View Details
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 7. Interactive Quotation Review Modal ── */}
      {selectedQuote && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-700" />
                <h3 className="text-base font-bold text-slate-900">Review Contractor Quotation</h3>
              </div>
              <button
                onClick={() => setSelectedQuote(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Vendor Profile Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-900 font-bold flex items-center justify-center text-sm overflow-hidden">
                  {selectedQuote.vendor?.avatar ? (
                    <img src={selectedQuote.vendor.avatar} alt={selectedQuote.vendor.name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{selectedQuote.vendor?.name?.charAt(0) || 'V'}</span>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1">
                    <span>{selectedQuote.vendor?.name || 'Verified Technician'}</span>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                  </h4>
                  <p className="text-xs text-slate-500">
                    ★ {selectedQuote.vendor?.rating || 4.9} Rating • Verified Background
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Quotation</span>
                <span className="text-xl font-black text-emerald-800">
                  {formatCurrency(selectedQuote.proposedAmount)}
                </span>
              </div>
            </div>

            {/* Scope & Terms */}
            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="font-semibold text-slate-500 block mb-1">Scope / Proposal Note:</span>
                <p className="text-slate-800 leading-relaxed italic">
                  "{selectedQuote.coverLetter || 'Standard full-service diagnostics, repair, and inspection.'}"
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 block text-[10px]">Estimated Duration</span>
                  <span className="font-bold text-slate-800">{selectedQuote.estimatedDuration || '1-2 Days'}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 block text-[10px]">Pricing Model</span>
                  <span className="font-bold text-slate-800 uppercase">{selectedQuote.pricingBasis || 'Fixed Price'}</span>
                </div>
              </div>
            </div>

            {/* Escrow Guarantee Notice */}
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200/80 text-[11px] text-emerald-900 space-y-1">
              <span className="font-bold flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                WorkLogy Escrow Protection Applies
              </span>
              <p className="text-emerald-800 leading-relaxed">
                Accepting this proposal locks the price in escrow. Your payment is held securely and only released when the job is completed to your satisfaction.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                disabled={Boolean(acceptingQuoteId)}
                onClick={() => handleRejectQuotation(selectedQuote._id)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition"
              >
                Decline Proposal
              </button>
              <Button
                variant="primary"
                size="sm"
                loading={acceptingQuoteId === selectedQuote._id}
                onClick={() => handleAcceptQuotation(selectedQuote._id)}
                className="text-xs font-bold"
              >
                Accept Quotation & Lock Escrow
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Clock, 
  MapPin, 
  User, 
  CheckCircle2, 
  ArrowRight, 
  Calendar, 
  AlertCircle,
  Play,
  RotateCcw,
  DollarSign,
  Sparkles,
  Layers,
  XCircle,
  MessageSquare,
  ShieldCheck,
  Check,
  X,
  Navigation,
  Send
} from 'lucide-react';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import { bookingAPI } from '../../api/booking.api';
import { useSocketContext } from '../../context/SocketContext';
import { formatCurrency, formatFullAddress, getDisplayName } from '../../utils/formatters';

export default function VendorBookings() {
  const { socket } = useSocketContext();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [actionMsg, setActionMsg] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = activeTab !== 'all' ? { status: activeTab } : {};
      const res = await bookingAPI.getVendorBookings(params);
      if (res?.bookings) {
        setBookings(res.bookings);
      }
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError(err?.response?.data?.message || 'Failed to load bookings. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [activeTab]);

  // Real-time synchronization
  useEffect(() => {
    if (!socket) return;

    const handleSync = () => {
      fetchBookings();
    };

    socket.on('job_cancelled', handleSync);
    socket.on('booking_cancelled', handleSync);
    socket.on('job_status_updated', handleSync);
    socket.on('booking_status_updated', handleSync);
    socket.on('direct_booking_accepted', handleSync);

    return () => {
      socket.off('job_cancelled', handleSync);
      socket.off('booking_cancelled', handleSync);
      socket.off('job_status_updated', handleSync);
      socket.off('booking_status_updated', handleSync);
      socket.off('direct_booking_accepted', handleSync);
    };
  }, [socket, activeTab]);

  const handleAcceptDirectBooking = async (id) => {
    try {
      setProcessingId(id);
      setActionMsg(null);
      setActionError(null);
      const res = await bookingAPI.respondDirectBooking(id, { action: 'accept' });
      if (res?.success) {
        setActionMsg('Direct booking accepted! Customer notified and arrival verification enabled.');
        fetchBookings();
        setTimeout(() => setActionMsg(null), 4000);
      }
    } catch (err) {
      console.error('Accept direct booking error:', err);
      setActionError(err.response?.data?.message || 'Failed to accept booking request.');
      setTimeout(() => setActionError(null), 4000);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeclineDirectBooking = async (id) => {
    const reason = window.prompt('Please provide a reason for declining this booking (optional):');
    try {
      setProcessingId(id);
      setActionMsg(null);
      setActionError(null);
      const res = await bookingAPI.respondDirectBooking(id, {
        action: 'decline',
        reason: reason || 'Contractor unavailable for requested time window.'
      });
      if (res?.success) {
        setActionMsg('Booking request declined.');
        fetchBookings();
        setTimeout(() => setActionMsg(null), 3000);
      }
    } catch (err) {
      console.error('Decline direct booking error:', err);
      setActionError(err.response?.data?.message || 'Failed to decline booking request.');
      setTimeout(() => setActionError(null), 4000);
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkOnTheWay = async (id) => {
    try {
      setProcessingId(id);
      setActionMsg(null);
      setActionError(null);
      const res = await bookingAPI.updateStatus(id, {
        status: 'on_the_way',
        note: 'Specialist has departed and is on the way to the service location.'
      });
      if (res?.success) {
        setActionMsg('Status updated: Customer notified that you are on the way!');
        fetchBookings();
        setTimeout(() => setActionMsg(null), 4000);
      }
    } catch (err) {
      console.error('Error marking on the way:', err);
      setActionError(err.response?.data?.message || 'Failed to update departure status.');
      setTimeout(() => setActionError(null), 4000);
    } finally {
      setProcessingId(null);
    }
  };

  const tabs = [
    { id: 'all', label: 'All Jobs' },
    { id: 'pending_acceptance', label: 'Waiting for Response' },
    { id: 'scheduled', label: 'Confirmed Jobs' },
    { id: 'in_progress', label: 'Current Work' },
    { id: 'completed', label: 'Completed Work' },
    { id: 'cancelled', label: 'Cancelled' }
  ];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending_acceptance':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 uppercase animate-pulse flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-700" /> Direct Booking Request
          </span>
        );
      case 'on_the_way':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 uppercase flex items-center gap-1">
            <Navigation className="w-3 h-3 text-indigo-700" /> On The Way
          </span>
        );
      case 'arrived':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200 uppercase flex items-center gap-1">
            <MapPin className="w-3 h-3 text-teal-700" /> Arrived On Site
          </span>
        );
      case 'in_progress':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 uppercase animate-pulse flex items-center gap-1">
            <Clock className="w-3 h-3 text-blue-700" /> In Progress
          </span>
        );
      case 'completion_pending':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 uppercase flex items-center gap-1">
            <Clock className="w-3 h-3 text-purple-700" /> Pending Sign-Off
          </span>
        );
      case 'scheduled':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 uppercase">Scheduled</span>;
      case 'confirmed':
      case 'assigned':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 uppercase">Confirmed</span>;
      case 'completed':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Completed</span>;
      case 'declined':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">Declined</span>;
      case 'cancelled':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 uppercase flex items-center gap-1"><XCircle className="w-3 h-3" /> Cancelled</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* ── 1. Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Customer Contracts & Dispatches</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5 tracking-tight">Confirmed Jobs</h1>
          <p className="text-xs text-slate-600 mt-1">
            Manage customer appointments, update travel & work milestones, and verify service completion.
          </p>
        </div>

        <Link to="/vendor/calendar">
          <Button variant="secondary" size="md" icon={Calendar}>
            Open Work Calendar
          </Button>
        </Link>
      </div>

      {/* ── 2. Feedback Banners ── */}
      {actionMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700" />
          <span className="font-medium">{actionMsg}</span>
        </div>
      )}

      {actionError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 shadow-2xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span className="font-medium">{actionError}</span>
        </div>
      )}

      {/* ── 3. Tabs ── */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto scrollbar-thin">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition ${
              activeTab === tab.id
                ? 'bg-emerald-800 text-white font-bold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── 4. Bookings List ── */}
      {loading ? (
        <div className="py-20">
          <Loader text="Loading your customer bookings & orders..." />
        </div>
      ) : error ? (
        <div className="bg-white border border-rose-200 rounded-3xl p-12 text-center max-w-md mx-auto shadow-2xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Failed to Load Bookings</h3>
          <p className="text-xs text-rose-600 leading-relaxed">{error}</p>
          <div className="pt-2 flex justify-center">
            <Button variant="primary" size="sm" onClick={fetchBookings}>
              Try Again
            </Button>
          </div>
        </div>
      ) : bookings.length > 0 ? (
        <div className="space-y-4">
          {bookings.map((item) => {
            const isDirect = item.bookingType === 'direct_professional';
            const isPendingAcceptance = item.status === 'pending_acceptance';
            const isConfirmedOrScheduled = ['scheduled', 'confirmed', 'assigned'].includes(item.status);
            const isEnRoute = item.status === 'on_the_way';
            const isArrived = item.status === 'arrived';
            const isInProgress = item.status === 'in_progress';
            const isCompletionPending = item.status === 'completion_pending';
            const isCompleted = item.status === 'completed';

            return (
              <div 
                key={item._id}
                className="bg-white border border-slate-200 shadow-2xs p-6 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:border-slate-300 transition"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getStatusBadge(item.status)}
                    <span className="font-mono text-[11px] text-slate-500 font-bold">{item.bookingReference}</span>
                    {item.category && <span className="text-[11px] text-slate-500">· {getDisplayName(item.category)}</span>}
                    {isDirect && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Direct Customer Hire
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 leading-snug">{item.serviceTitle}</h3>

                  {item.problemDescription && (
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {item.problemDescription}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
                    <span className="flex items-center gap-1 font-semibold text-slate-800">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      Client: {item.customer?.name || 'Customer'}
                    </span>
                    <span className="flex items-start gap-1 text-slate-700 max-w-md">
                      <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                      <span>{formatFullAddress(item.address)}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      Scheduled: {new Date(item.scheduledDate).toLocaleDateString()} · {item.timeSlot}
                    </span>
                  </div>
                </div>

                {/* Earnings & Action */}
                <div className="flex items-center sm:items-end justify-between sm:justify-start gap-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] text-slate-500 block uppercase font-medium">Earnings After Fees</span>
                    <span className="text-xl font-black text-emerald-800">
                      {formatCurrency(item.pricing?.vendorNet || item.pricing?.amount || 0)}
                    </span>
                    <span className="text-[10px] text-emerald-700 font-semibold block">
                      {item.pricing?.paymentStatus === 'released' ? 'Settled to Bank' : 'Payment Protected'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {/* Direct Booking Accept / Decline */}
                    {isPendingAcceptance ? (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          icon={Check}
                          disabled={processingId === item._id}
                          onClick={() => handleAcceptDirectBooking(item._id)}
                          className="!bg-emerald-800 hover:!bg-emerald-900 text-xs"
                        >
                          Accept
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          icon={X}
                          disabled={processingId === item._id}
                          onClick={() => handleDeclineDirectBooking(item._id)}
                          className="text-rose-600 border-rose-200 hover:bg-rose-50 text-xs"
                        >
                          Decline
                        </Button>
                      </div>
                    ) : (
                      <>
                        {/* If confirmed/scheduled: Allow quick "On The Way" notification */}
                        {isConfirmedOrScheduled && (
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={Navigation}
                            disabled={processingId === item._id}
                            onClick={() => handleMarkOnTheWay(item._id)}
                            className="text-xs"
                          >
                            Mark On The Way
                          </Button>
                        )}

                        {/* Quick Start / OTP link */}
                        {(isConfirmedOrScheduled || isEnRoute || isArrived) && (
                          <Link to={`/vendor/manage-job/${item._id}`}>
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={Play}
                              className="text-xs text-emerald-800 font-bold"
                            >
                              Enter Start OTP
                            </Button>
                          </Link>
                        )}

                        {/* Primary Milestone / Management Action */}
                        <Link to={`/vendor/manage-job/${item._id}`}>
                          <Button 
                            variant="primary" 
                            size="sm"
                            icon={ArrowRight}
                            className="text-xs !bg-emerald-800 hover:!bg-emerald-900"
                          >
                            {isInProgress ? 'Update Work' : isCompleted ? 'View Details' : 'Manage Job'}
                          </Button>
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3 max-w-md mx-auto shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Bookings in this Category</h3>
          <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
            {activeTab === 'pending_acceptance'
              ? 'You have no pending direct booking requests from property owners at this time.'
              : activeTab === 'in_progress'
              ? 'No active jobs in progress. Check Confirmed Jobs to begin scheduled work.'
              : 'When property owners hire your proposal or book your published packages, confirmed orders will appear here.'}
          </p>
          <div className="pt-2">
            <Link to="/vendor/browse-jobs">
              <Button variant="primary" size="sm">
                Find Available Jobs
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Activity, 
  Clock, 
  MapPin, 
  User, 
  ArrowRight, 
  Calendar, 
  AlertCircle,
  Play,
  Navigation,
  MessageSquare,
  Phone,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import { bookingAPI } from '../../api/booking.api';
import { useSocketContext } from '../../context/SocketContext';
import { formatCurrency, formatFullAddress, getDisplayName, formatDate } from '../../utils/formatters';
import { getServiceImage } from '../../constants/serviceImages';

export default function VendorActiveJobs() {
  const { socket } = useSocketContext();
  const [activeJobs, setActiveJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchActiveJobs = async () => {
    try {
      setLoading(true);
      setError(null);
      // Query in_progress group (matches in_progress, on_the_way, arrived, completion_pending)
      const res = await bookingAPI.getVendorBookings({ status: 'in_progress' });
      if (res?.bookings) {
        // Filter strictly to current work
        const ongoing = res.bookings.filter(b => 
          ['on_the_way', 'arrived', 'in_progress', 'completion_pending'].includes(b.status)
        );
        setActiveJobs(ongoing);
      }
    } catch (err) {
      console.error('Error fetching active jobs:', err);
      setError(err?.response?.data?.message || 'Failed to load ongoing work. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveJobs();
  }, []);

  // Real-time synchronization
  useEffect(() => {
    if (!socket) return;

    const handleSync = () => {
      fetchActiveJobs();
    };

    socket.on('service_started', handleSync);
    socket.on('job_status_updated', handleSync);
    socket.on('booking_status_updated', handleSync);
    socket.on('job_cancelled', handleSync);

    return () => {
      socket.off('service_started', handleSync);
      socket.off('job_status_updated', handleSync);
      socket.off('booking_status_updated', handleSync);
      socket.off('job_cancelled', handleSync);
    };
  }, [socket]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'on_the_way':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 uppercase flex items-center gap-1">
            <Navigation className="w-3 h-3 text-indigo-700" /> Specialist On The Way
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
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 uppercase flex items-center gap-1 animate-pulse">
            <Clock className="w-3 h-3 text-blue-700" /> Work In Progress
          </span>
        );
      case 'completion_pending':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 uppercase flex items-center gap-1">
            <Clock className="w-3 h-3 text-purple-700" /> Completion Awaiting Sign-Off
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* ── 1. Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Live Job Execution</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5 tracking-tight">Current Work</h1>
          <p className="text-xs text-slate-600 mt-1">
            Real-time control center for jobs currently underway, on-site arrival verification, and work progress updates.
          </p>
        </div>

        <Link to="/vendor/bookings">
          <Button variant="secondary" size="md">
            View All Confirmed Jobs
          </Button>
        </Link>
      </div>

      {/* ── 2. Content ── */}
      {loading ? (
        <div className="py-20">
          <Loader text="Loading your current active jobs..." />
        </div>
      ) : error ? (
        <div className="bg-white border border-rose-200 rounded-3xl p-12 text-center max-w-md mx-auto shadow-2xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Failed to Load Current Work</h3>
          <p className="text-xs text-rose-600 leading-relaxed">{error}</p>
          <div className="pt-2 flex justify-center">
            <Button variant="primary" size="sm" onClick={fetchActiveJobs}>
              Try Again
            </Button>
          </div>
        </div>
      ) : activeJobs.length > 0 ? (
        <div className="space-y-4">
          {activeJobs.map((item) => {
            const serviceLat = item.address?.coordinates?.lat || item.job?.location?.coordinates?.lat;
            const serviceLng = item.address?.coordinates?.lng || item.job?.location?.coordinates?.lng;
            const hasExactCoordinates = Boolean(
              serviceLat && serviceLng && 
              !isNaN(serviceLat) && !isNaN(serviceLng) && 
              (Number(serviceLat) !== 0 || Number(serviceLng) !== 0)
            );
            const fullAddress = formatFullAddress(item.address || item.job?.location, { forceFull: true });
            const directionsUrl = hasExactCoordinates
              ? `https://www.google.com/maps/dir/?api=1&destination=${serviceLat},${serviceLng}`
              : fullAddress
              ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress)}`
              : null;

            return (
              <div
                key={item._id}
                className="bg-white border border-slate-200 shadow-2xs rounded-3xl p-6 hover:border-slate-300 transition space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <img
                      src={getServiceImage(item.category, item.serviceTitle)}
                      alt={item.serviceTitle}
                      className="w-16 h-16 rounded-2xl object-cover shrink-0 border border-slate-200 shadow-2xs"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/vite.svg';
                      }}
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getStatusBadge(item.status)}
                        <span className="font-mono text-[11px] font-bold text-slate-500">#{item.bookingReference}</span>
                        <span className="text-[11px] text-slate-500">· {getDisplayName(item.category)}</span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 leading-snug">{item.serviceTitle}</h3>
                      <p className="text-xs text-slate-600 line-clamp-1">{item.problemDescription}</p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <span className="text-[10px] text-slate-500 uppercase block font-medium">Earnings After Fees</span>
                    <span className="text-xl font-black text-emerald-800">
                      {formatCurrency(item.pricing?.vendorNet || item.pricing?.amount || 0)}
                    </span>
                    <span className="text-[10px] text-emerald-700 font-semibold block">Payment Protected</span>
                  </div>
                </div>

                {/* Details Strip */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-600 pt-3 border-t border-slate-100">
                  <span className="flex items-center gap-1 font-semibold text-slate-900">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    {item.customer?.name || 'Customer'}
                  </span>
                  <span className="flex items-center gap-1 text-slate-700">
                    <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span>{fullAddress}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    {formatDate(item.scheduledDate)} · {item.timeSlot}
                  </span>
                </div>

                {/* Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    {directionsUrl && (
                      <a
                        href={directionsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold border border-slate-200 transition"
                      >
                        <Navigation className="w-3.5 h-3.5 text-emerald-700 fill-emerald-700" />
                        <span>Directions</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </a>
                    )}

                    <Link to={`/vendor/messages?recipientId=${item.customer?._id || item.customer?.id || ''}&jobId=${item.job?._id || ''}`}>
                      <Button variant="secondary" size="sm" icon={MessageSquare} className="text-xs">
                        Chat
                      </Button>
                    </Link>

                    {item.customer?.phone && (
                      <a href={`tel:${item.customer.phone}`}>
                        <Button variant="outline" size="sm" icon={Phone} className="text-xs">
                          Call
                        </Button>
                      </a>
                    )}
                  </div>

                  <Link to={`/vendor/manage-job/${item._id}`}>
                    <Button 
                      variant="primary" 
                      size="sm" 
                      icon={ArrowRight} 
                      className="text-xs !bg-emerald-800 hover:!bg-emerald-900"
                    >
                      {item.status === 'in_progress' ? 'Update Work Progress & Photos' : 'Open Job Console'}
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3 max-w-md mx-auto shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center mx-auto">
            <Activity className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Active Jobs Underway</h3>
          <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
            When you depart for customer appointments or verify arrival and OTP, your ongoing jobs will appear here for progress tracking and completion sign-off.
          </p>
          <div className="pt-2">
            <Link to="/vendor/bookings">
              <Button variant="primary" size="sm">
                View Confirmed Jobs
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

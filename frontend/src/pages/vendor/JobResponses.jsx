import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ArrowRight,
  DollarSign
} from 'lucide-react';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import { applicationAPI } from '../../api/application.api';
import { formatCurrency } from '../../utils/formatters';

export default function VendorJobResponses() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState(null);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const res = await applicationAPI.getVendorApplications();
      if (res?.applications) {
        setApplications(res.applications);
      }
    } catch (err) {
      console.error('Error fetching vendor applications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleWithdraw = async (id) => {
    try {
      const res = await applicationAPI.withdraw(id);
      if (res?.success) {
        setActionMsg('Proposal withdrawn successfully.');
        fetchApplications();
        setTimeout(() => setActionMsg(null), 3000);
      }
    } catch (err) {
      console.error('Error withdrawing application:', err);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'accepted':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Hired / Accepted</span>;
      case 'shortlisted':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 uppercase">Shortlisted</span>;
      case 'submitted':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 uppercase flex items-center gap-1"><Clock className="w-3 h-3" /> Under Review</span>;
      case 'rejected':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 uppercase">Declined</span>;
      case 'withdrawn':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">Withdrawn</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">My Offers</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5">My Offers</h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Track the price offers you sent to customers and see which jobs are confirmed.
          </p>
        </div>

        <Link to="/vendor/browse-jobs">
          <Button variant="primary" size="md">
            Find Available Jobs
          </Button>
        </Link>
      </div>

      {actionMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700" />
          <span>{actionMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="py-20">
          <Loader text="Fetching your submitted offers..." />
        </div>
      ) : applications.length > 0 ? (
        <div className="space-y-4">
          {applications.map((app) => (
            <div 
              key={app._id}
              className="bg-white border border-slate-200 shadow-sm p-6 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 hover:border-slate-300 transition"
            >
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {getStatusBadge(app.status)}
                  <span className="text-[11px] font-semibold text-slate-500">
                    Category: {app.job?.category?.name || 'General Service'}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-base leading-snug">
                  {app.job?.title || 'Job Service Request'}
                </h3>

                <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200/60 line-clamp-2 italic">
                  "{app.coverLetter}"
                </p>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                  <span>Estimated Time: <strong className="text-slate-700">{app.estimatedDuration}</strong></span>
                  <span>Date and Time: <strong className="text-slate-700">{app.proposedSchedule}</strong></span>
                  <span>Date: <strong className="text-slate-700">{new Date(app.createdAt).toLocaleDateString()}</strong></span>
                </div>
              </div>

              {/* Offer pricing & action */}
              <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                <div className="text-left sm:text-right">
                  <span className="text-[10px] text-slate-500 uppercase block font-medium">Your Price</span>
                  <p className="text-2xl font-black text-emerald-800">
                    {formatCurrency(app.proposedAmount)}
                  </p>
                  <span className="text-[10px] text-slate-500 capitalize">{app.pricingBasis} basis</span>
                </div>

                <div className="flex items-center gap-2">
                  {app.job?._id && (
                    <Link to={`/vendor/jobs/${app.job._id}`}>
                      <Button variant="ghost" size="sm">
                        View Job
                      </Button>
                    </Link>
                  )}

                  {app.status === 'submitted' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleWithdraw(app._id)}
                      className="!text-rose-600 hover:!bg-rose-50"
                    >
                      Withdraw Offer
                    </Button>
                  )}

                  {app.status === 'accepted' && (
                    <Link to="/vendor/bookings">
                      <Button variant="primary" size="sm">
                        View Confirmed Job
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Offers Submitted Yet</h3>
          <p className="text-xs text-slate-600 max-w-sm mx-auto">
            Explore available jobs posted by customers and send your price to get hired.
          </p>
          <Link to="/vendor/browse-jobs" className="inline-block">
            <Button variant="primary" size="sm">
              Find Available Jobs
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

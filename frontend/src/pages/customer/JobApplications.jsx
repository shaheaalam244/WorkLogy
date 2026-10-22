import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ProposalCard from '../../components/job/ProposalCard';
import Loader from '../../components/common/Loader';
import Button from '../../components/common/Button';
import { CheckCircle2, AlertCircle, Briefcase, Plus, RefreshCw, FileText } from 'lucide-react';
import { customerAPI } from '../../api/customer.api';
import { applicationAPI } from '../../api/application.api';

export default function CustomerJobApplications() {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hired, setHired] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  const fetchProposals = async () => {
    try {
      setLoading(true);
      setActionError(null);
      const res = await customerAPI.getQuotations();
      if (res?.applications) {
        setProposals(res.applications.filter(a => ['submitted', 'shortlisted'].includes(a.status)));
      }
    } catch (err) {
      console.error('Failed to load proposals:', err);
      setActionError('Could not load proposals from service professionals.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, []);

  const handleAccept = async (propId) => {
    try {
      setProcessingId(propId);
      setActionError(null);
      const res = await applicationAPI.updateStatus(propId, 'accepted');
      if (res?.success) {
        setHired(propId);
        setProposals(prev => prev.filter(p => p._id !== propId));
        setTimeout(() => setHired(null), 5000);
      }
    } catch (err) {
      console.error('Error accepting proposal:', err);
      setActionError(err.response?.data?.message || 'Failed to accept offer. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (propId) => {
    try {
      setProcessingId(propId);
      setActionError(null);
      const res = await applicationAPI.updateStatus(propId, 'rejected');
      if (res?.success) {
        setProposals(prev => prev.filter(p => p._id !== propId));
      }
    } catch (err) {
      console.error('Error declining proposal:', err);
      setActionError(err.response?.data?.message || 'Failed to decline offer.');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="py-20">
        <Loader text="Loading proposals from certified professionals..." />
      </div>
    );
  }

  // Group proposals by job title
  const proposalsByJob = proposals.reduce((acc, prop) => {
    const jobKey = prop.job?._id || 'other';
    const jobTitle = prop.job?.title || 'Open Service Request';
    if (!acc[jobKey]) {
      acc[jobKey] = {
        title: jobTitle,
        category: prop.job?.category?.name,
        proposals: []
      };
    }
    acc[jobKey].proposals.push(prop);
    return acc;
  }, {});

  const jobKeys = Object.keys(proposalsByJob);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Offers & Quotations</h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Compare bids, scope, and estimated duration submitted by verified specialists for your requests
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={RefreshCw} onClick={fetchProposals}>
            Refresh
          </Button>
          <Link to="/customer/create-job">
            <Button variant="primary" size="sm" icon={Plus}>
              Post New Request
            </Button>
          </Link>
        </div>
      </div>

      {hired && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-700" />
            <span>
              <strong>Offer Accepted!</strong> A confirmed service booking has been created and your payment is held securely in Payment Protection. The professional has been notified.
            </span>
          </div>
          <Link to="/customer/bookings" className="shrink-0 underline font-semibold hover:text-emerald-950">
            View Bookings &rarr;
          </Link>
        </div>
      )}

      {actionError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          <span>{actionError}</span>
        </div>
      )}

      {jobKeys.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-10 text-center space-y-4 max-w-lg mx-auto my-6 shadow-2xs">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <FileText className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">No pending proposals</h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
              When certified electricians, plumbers, and technicians review your requests and submit competitive bids, they will appear here.
            </p>
          </div>
          <Link to="/customer/my-jobs">
            <Button variant="secondary" size="sm">
              View My Requests
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {jobKeys.map((key) => {
            const group = proposalsByJob[key];
            return (
              <div key={key} className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                  <Briefcase className="w-4 h-4 text-emerald-700" />
                  <h3 className="font-bold text-slate-900 text-sm">{group.title}</h3>
                  {group.category && (
                    <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                      {group.category}
                    </span>
                  )}
                  <span className="text-xs text-slate-400 ml-auto">
                    {group.proposals.length} offer{group.proposals.length > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="space-y-4">
                  {group.proposals.map((proposal) => (
                    <div key={proposal._id} className={processingId === proposal._id ? 'opacity-50 pointer-events-none' : ''}>
                      <ProposalCard
                        proposal={proposal}
                        onAccept={handleAccept}
                        onDecline={handleDecline}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

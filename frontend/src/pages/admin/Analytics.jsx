import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Award, 
  ShieldCheck, 
  RefreshCw, 
  Briefcase, 
  ArrowUpRight,
  Clock,
  CheckCircle2
} from 'lucide-react';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import { adminAPI } from '../../api/admin.api';
import { formatCurrency } from '../../utils/formatters';

export default function AdminAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getStats();
      if (res) {
        setData(res);
      }
    } catch (err) {
      console.error('Failed to load admin analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="py-20">
        <Loader text="Loading marketplace financial aggregates & volume metrics..." />
      </div>
    );
  }

  const stats = data?.stats || {};
  const financials = data?.financials || {};

  const gmv = financials.totalGross || 0;
  const platformFees = financials.totalPlatformFees || 0;
  const completedJobsCount = stats.completedJobs || 0;
  const avgTicket = completedJobsCount > 0 ? Math.round(gmv / completedJobsCount) : (gmv || 0);

  return (
    <div className="space-y-8 w-full">
      {/* Header */}
      <div className="bg-white border border-slate-200/90 shadow-2xs rounded-3xl p-6 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-purple-800 uppercase tracking-wider bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200/60">
              Financial Intelligence
            </span>
            <span className="text-xs text-slate-500 font-medium">· Real-Time Ledger</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
            Financial & Marketplace Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl mt-1">
            Live transaction volume, platform commission take, escrow protection holdings, and contractor payouts in Lucknow.
          </p>
        </div>

        <Button variant="ghost" size="sm" icon={RefreshCw} onClick={fetchAnalytics}>
          Refresh Ledger
        </Button>
      </div>

      {/* Primary Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
        <div className="bg-white border border-slate-200 shadow-sm p-6 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Gross Transaction Volume</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center text-purple-700">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900">{formatCurrency(gmv)}</p>
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Cumulative client order value</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 shadow-sm p-6 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Platform Take (5% Commission)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-emerald-800">{formatCurrency(platformFees)}</p>
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Net earned marketplace margin</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 shadow-sm p-6 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Average Ticket Size</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-blue-700">{formatCurrency(avgTicket)}</p>
          <span className="text-xs text-slate-500 block">
            Across {completedJobsCount} completed customer jobs
          </span>
        </div>
      </div>

      {/* Escrow & Operational Settlement Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 shadow-sm p-5 rounded-2xl space-y-1">
          <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Funds in Payment Protection</span>
          <p className="text-2xl font-black text-amber-800">{formatCurrency(financials.escrowHeld || 0)}</p>
          <span className="text-[11px] text-slate-400">Held pending customer completion sign-off</span>
        </div>

        <div className="bg-white border border-slate-200 shadow-sm p-5 rounded-2xl space-y-1">
          <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Disbursed to Specialists</span>
          <p className="text-2xl font-black text-emerald-800">{formatCurrency(financials.totalPayouts || 0)}</p>
          <span className="text-[11px] text-slate-400">Paid directly to contractor bank accounts</span>
        </div>

        <div className="bg-white border border-slate-200 shadow-sm p-5 rounded-2xl space-y-1">
          <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Refunds Processed</span>
          <p className="text-2xl font-black text-slate-700">{formatCurrency(financials.totalRefunds || 0)}</p>
          <span className="text-[11px] text-slate-400">Returned on cancelled pre-service requests</span>
        </div>

        <div className="bg-white border border-slate-200 shadow-sm p-5 rounded-2xl space-y-1">
          <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Active Contractor Network</span>
          <p className="text-2xl font-black text-purple-900">{stats.approvedProfessionals || 0}</p>
          <span className="text-[11px] text-slate-400">Vetted & accredited specialists in Lucknow</span>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  DollarSign, 
  TrendingUp, 
  Download, 
  CreditCard, 
  ArrowUpRight, 
  CheckCircle2, 
  ShieldCheck, 
  Clock 
} from 'lucide-react';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import { vendorAPI } from '../../api/vendor.api';
import { formatCurrency } from '../../utils/formatters';

export default function VendorEarnings() {
  const [loading, setLoading] = useState(true);
  const [earnings, setEarnings] = useState(null);

  useEffect(() => {
    const fetchEarnings = async () => {
      try {
        setLoading(true);
        const res = await vendorAPI.getEarnings();
        if (res?.earnings) {
          setEarnings(res.earnings);
        }
      } catch (err) {
        console.error('Error fetching earnings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEarnings();
  }, []);

  if (loading) return <div className="py-20"><Loader text="Loading live escrow and earnings ledger..." /></div>;

  const e = earnings || {};

  return (
    <div className="space-y-8 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Earnings & Payments</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5">Earnings & Payments</h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Automated bank deposits, protected customer payments, and fee details.
          </p>
        </div>

        <Link to="/vendor/transactions">
          <Button variant="secondary" size="md">
            View All Transactions
          </Button>
        </Link>
      </div>

      {/* Financial overview metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 shadow-sm p-6 rounded-3xl space-y-1.5">
          <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Available for Payout</span>
          <p className="text-3xl font-black text-emerald-800">{formatCurrency(e.availableForPayout || 0)}</p>
          <span className="text-[11px] text-slate-500 block pt-1">
            {e.bankDetails?.payoutSchedule || 'Auto-deposits to Bank on Mondays'}
          </span>
        </div>

        <div className="bg-white border border-slate-200 shadow-sm p-6 rounded-3xl space-y-1.5">
          <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Payment Protected</span>
          <p className="text-3xl font-black text-amber-700">{formatCurrency(e.pendingEscrow || 0)}</p>
          <span className="text-[11px] text-slate-500 block pt-1">Released when customer verifies completed work</span>
        </div>

        <div className="bg-white border border-slate-200 shadow-sm p-6 rounded-3xl space-y-1.5">
          <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Total Earned</span>
          <p className="text-3xl font-black text-slate-900">{formatCurrency(e.lifetimeGross || 0)}</p>
          <span className="text-[11px] text-emerald-700 font-semibold block pt-1">
            Across {e.completedJobsCount || 0} Completed Jobs
          </span>
        </div>
      </div>

      {/* Fee Transparency Breakdown */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">Payment Details & Fee Breakdown</h3>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
            WorkLogy Standard: 5% Platform Fee
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Total Earned</span>
            <p className="text-xl font-bold text-slate-900">{formatCurrency(e.lifetimeGross || 0)}</p>
            <span className="text-[10px] text-slate-500">From customer payments</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Platform Fee (5%)</span>
            <p className="text-xl font-bold text-rose-600">-{formatCurrency(e.platformFees || 0)}</p>
            <span className="text-[10px] text-slate-500">Covers payment protection & platform support</span>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-1">
            <span className="text-[10px] text-emerald-800 uppercase font-semibold">Earnings After Fees</span>
            <p className="text-xl font-bold text-emerald-800">{formatCurrency(e.netTotal || 0)}</p>
            <span className="text-[10px] text-emerald-700 font-medium">Deposited to bank</span>
          </div>
        </div>
      </div>

      {/* Payout method card */}
      <div className="bg-white border border-slate-200 shadow-sm p-6 sm:p-8 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-sm">Direct Bank Account (NEFT / IMPS Express)</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              {e.bankDetails?.bankName || 'HDFC Bank'} · {e.bankDetails?.branch || 'Hazratganj, Lucknow'} · Account {e.bankDetails?.accountNumberMasked || '****4812'}
            </p>
            <span className="text-[10px] font-semibold text-emerald-700 mt-1 inline-block">
              ✓ Verified & Linked for Auto-Settlement
            </span>
          </div>
        </div>

        <Link to="/vendor/settings">
          <Button variant="ghost" size="sm">
            Bank Settings
          </Button>
        </Link>
      </div>
    </div>
  );
}

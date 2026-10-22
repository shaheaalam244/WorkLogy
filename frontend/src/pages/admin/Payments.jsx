import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  DollarSign, 
  ShieldCheck, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  RefreshCw, 
  Lock, 
  Filter
} from 'lucide-react';
import { adminAPI } from '../../api/admin.api';
import Loader from '../../components/common/Loader';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function AdminPayments() {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ totalGross: 0, totalFees: 0, totalNet: 0, totalEscrow: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (typeFilter !== 'all') params.type = typeFilter;

      const res = await adminAPI.getTransactions(params);
      if (res?.transactions) {
        setTransactions(res.transactions);
      }
      if (res?.summary) {
        setSummary(res.summary);
      }
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [statusFilter, typeFilter]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid_to_bank':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Paid to Bank</span>;
      case 'held_in_escrow':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">Held in Escrow</span>;
      case 'refunded':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">Refunded</span>;
      case 'pending':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">Pending</span>;
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
              Financial Treasury
            </span>
            <span className="text-xs text-slate-500 font-medium">· Escrow & Ledger</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
            Payments, Escrow & Platform Revenue
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl mt-1">
            Real database audit ledger of customer payments, locked escrow balances, earned platform commissions, and professional payouts.
          </p>
        </div>

        <button
          onClick={fetchTransactions}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/90 shadow-2xs p-5 rounded-2xl">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Gross Processed</span>
          <p className="text-2xl font-black text-slate-900 mt-2">{formatCurrency(summary.totalGross || 0)}</p>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Total customer volume</span>
        </div>

        <div className="bg-white border border-slate-200/90 shadow-2xs p-5 rounded-2xl">
          <span className="text-[10px] text-blue-700 font-bold uppercase tracking-wider">Held in Escrow</span>
          <p className="text-2xl font-black text-blue-700 mt-2">{formatCurrency(summary.totalEscrow || 0)}</p>
          <span className="text-[11px] text-blue-600/80 mt-0.5 block">Secured pending release</span>
        </div>

        <div className="bg-white border border-slate-200/90 shadow-2xs p-5 rounded-2xl">
          <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider">Platform Revenue</span>
          <p className="text-2xl font-black text-emerald-800 mt-2">{formatCurrency(summary.totalFees || 0)}</p>
          <span className="text-[11px] text-emerald-700 mt-0.5 block">Earned service commission</span>
        </div>

        <div className="bg-white border border-slate-200/90 shadow-2xs p-5 rounded-2xl">
          <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">Pro Payouts</span>
          <p className="text-2xl font-black text-slate-800 mt-2">{formatCurrency(summary.totalNet || 0)}</p>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Net contractor volume</span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200/90 shadow-2xs rounded-2xl p-4 flex flex-wrap gap-2 items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-bold text-slate-500 mr-1">Status:</span>
          {['all', 'held_in_escrow', 'paid_to_bank', 'pending', 'refunded'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                statusFilter === st
                  ? 'bg-purple-800 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions Table */}
      {loading ? (
        <div className="py-20">
          <Loader text="Loading live ledger..." />
        </div>
      ) : transactions.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center">
          <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No transactions recorded</h3>
          <p className="text-xs text-slate-500 mt-1">Transactions appear once customer bookings are created</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/90 shadow-2xs rounded-2xl overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-100">
              <tr>
                <th className="p-4">Reference / Job</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Contractor</th>
                <th className="p-4">Customer Paid</th>
                <th className="p-4">Platform Fee</th>
                <th className="p-4">Net Payout</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {transactions.map((tx) => (
                <tr key={tx._id} className="hover:bg-slate-50/80 transition">
                  <td className="p-4">
                    <p className="font-mono font-bold text-slate-900">{tx.transactionId}</p>
                    <p className="text-[11px] text-slate-500">{tx.jobTitle || 'Service Contract'}</p>
                  </td>

                  <td className="p-4">
                    <p className="font-bold text-slate-800">{tx.customer?.name || 'Customer'}</p>
                    <p className="text-[10px] text-slate-400">{tx.customer?.email}</p>
                  </td>

                  <td className="p-4">
                    <p className="font-bold text-emerald-800">{tx.vendor?.name || 'Professional'}</p>
                    <p className="text-[10px] text-slate-400">{tx.vendor?.email}</p>
                  </td>

                  <td className="p-4 font-bold text-slate-900">
                    {formatCurrency(tx.grossAmount || 0)}
                  </td>

                  <td className="p-4 font-bold text-emerald-800">
                    {formatCurrency(tx.platformFee || 0)}
                  </td>

                  <td className="p-4 font-bold text-slate-800">
                    {formatCurrency(tx.netAmount || 0)}
                  </td>

                  <td className="p-4">
                    {getStatusBadge(tx.paymentStatus)}
                  </td>

                  <td className="p-4 text-right text-slate-500 whitespace-nowrap">
                    {formatDate(tx.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

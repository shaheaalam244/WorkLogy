import React, { useState, useEffect } from 'react';
import { Download, ArrowUpRight, CheckCircle2, Clock } from 'lucide-react';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import { vendorAPI } from '../../api/vendor.api';
import { formatCurrency } from '../../utils/formatters';

export default function VendorTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        const params = filter !== 'all' ? { status: filter } : {};
        const res = await vendorAPI.getTransactions(params);
        if (res?.transactions) {
          setTransactions(res.transactions);
        }
      } catch (err) {
        console.error('Error fetching transactions:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTransactions();
  }, [filter]);

  const handleDownloadCSV = () => {
    const headers = ['Transaction ID,Project,Gross,Platform Fee,Net Payout,Status,Date'];
    const rows = transactions.map(t => 
      `"${t.transactionId}","${t.jobTitle}",${t.grossAmount},${t.platformFee},${t.netAmount},"${t.paymentStatus}","${new Date(t.date).toLocaleDateString()}"`
    );
    const blob = new Blob([[...headers, ...rows].join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `WorkLogy_Vendor_Transactions_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid_to_bank':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 w-fit"><CheckCircle2 className="w-3 h-3" /> Paid to Bank</span>;
      case 'held_in_escrow':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1 w-fit"><Clock className="w-3 h-3" /> Held in Escrow</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 capitalize">{status?.replace('_', ' ')}</span>;
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Financial Audit Trail</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5">Transaction Ledger & Payouts</h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Itemized record of client deposits, 5% platform service fees, and bank transfers.
          </p>
        </div>

        <Button variant="secondary" size="sm" icon={Download} onClick={handleDownloadCSV}>
          Download Statement (CSV)
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
            filter === 'all' ? 'bg-emerald-800 text-white font-bold' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All Ledger Records
        </button>
        <button
          onClick={() => setFilter('held_in_escrow')}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
            filter === 'held_in_escrow' ? 'bg-emerald-800 text-white font-bold' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Pending in Escrow
        </button>
        <button
          onClick={() => setFilter('paid_to_bank')}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
            filter === 'paid_to_bank' ? 'bg-emerald-800 text-white font-bold' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Settled to Bank
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-20"><Loader text="Fetching transaction records..." /></div>
      ) : transactions.length > 0 ? (
        <div className="bg-white border border-slate-200 shadow-sm rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-100">
                <tr>
                  <th className="p-4">Transaction ID</th>
                  <th className="p-4">Service Contract</th>
                  <th className="p-4">Gross Total</th>
                  <th className="p-4">WorkLogy Fee (5%)</th>
                  <th className="p-4">Net Payout</th>
                  <th className="p-4">Settlement Status</th>
                  <th className="p-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {transactions.map((tx) => (
                  <tr key={tx._id || tx.transactionId} className="hover:bg-slate-50/80 transition">
                    <td className="p-4 font-mono font-bold text-slate-600">{tx.transactionId}</td>
                    <td className="p-4 font-bold text-slate-900">{tx.jobTitle}</td>
                    <td className="p-4">{formatCurrency(tx.grossAmount)}</td>
                    <td className="p-4 text-slate-500">-{formatCurrency(tx.platformFee)}</td>
                    <td className="p-4 font-black text-emerald-800">{formatCurrency(tx.netAmount)}</td>
                    <td className="p-4">{getStatusBadge(tx.paymentStatus)}</td>
                    <td className="p-4 text-slate-500">{new Date(tx.date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="py-12 bg-white rounded-3xl border border-slate-200 text-center text-xs text-slate-500">
          No transaction records matching this filter.
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  DollarSign, 
  ShieldCheck, 
  Download, 
  CheckCircle2, 
  Clock, 
  FileText, 
  AlertCircle,
  Receipt
} from 'lucide-react';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import { customerAPI } from '../../api/customer.api';
import { formatCurrency, formatRelativeTime } from '../../utils/formatters';

export default function CustomerPayments() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setLoading(true);
        const res = await customerAPI.getTransactions();
        if (res?.transactions) {
          setTransactions(res.transactions);
        }
      } catch (err) {
        console.error('Failed to load customer transactions:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, []);

  const totalSettled = transactions
    .filter(t => t.paymentStatus === 'paid_to_bank' || t.settlementStatus === 'settled')
    .reduce((sum, t) => sum + (t.grossAmount || 0), 0);

  const totalInEscrow = transactions
    .filter(t => t.paymentStatus === 'held_in_escrow' || t.type === 'escrow_hold')
    .reduce((sum, t) => sum + (t.grossAmount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Payments & Transaction History
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          Review transparent payment records, protected payments, and download tax-compliant receipts.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 block">Payment Protected (In Escrow)</span>
          <p className="text-2xl sm:text-3xl font-black text-purple-700 mt-1">
            {formatCurrency(totalInEscrow)}
          </p>
          <span className="text-[11px] text-purple-700 font-semibold mt-1 block">
            Secured until work is completed
          </span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 block">Total Settled Spend</span>
          <p className="text-2xl sm:text-3xl font-black text-emerald-800 mt-1">
            {formatCurrency(totalSettled)}
          </p>
          <span className="text-[11px] text-emerald-700 font-semibold mt-1 block">
            Completed work
          </span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 block">Transactions Count</span>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
            {transactions.length}
          </p>
          <span className="text-[11px] text-slate-500 font-medium mt-1 block">
            All completed payments
          </span>
        </div>
      </div>

      {/* Trust Notice */}
      <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
        <p className="leading-relaxed">
          <strong>100% Payment Protection:</strong> Your payment is held securely and only released to the professional after the Service Start OTP is verified and you approve the completed work.
        </p>
      </div>

      {/* Transaction Records */}
      {loading ? (
        <div className="py-16">
          <Loader text="Loading payment history..." />
        </div>
      ) : transactions.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-12 text-center max-w-md mx-auto shadow-2xs">
          <Receipt className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900">No Payment Records</h3>
          <p className="text-xs text-slate-500 mt-1">
            You have not made any payments yet.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/90 rounded-3xl shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900">Transaction History</h3>
            <span className="text-xs text-slate-500">{transactions.length} Records</span>
          </div>

          <div className="divide-y divide-slate-100">
            {transactions.map((tx) => (
              <div key={tx._id} className="p-5 hover:bg-slate-50/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {tx.transactionId}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      tx.paymentStatus === 'held_in_escrow'
                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                        : tx.paymentStatus === 'paid_to_bank'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}>
                      {tx.paymentStatus?.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900">{tx.jobTitle}</h4>
                  <p className="text-xs text-slate-500">
                    Method: Payment Protected • {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : 'Active'}
                  </p>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                  <span className="text-lg font-black text-slate-900">
                    {formatCurrency(tx.grossAmount)}
                  </span>
                  <button
                    onClick={() => setSelectedReceipt(tx)}
                    className="text-xs font-semibold text-emerald-800 hover:underline flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Receipt</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-800" />
                <h3 className="font-extrabold text-base text-slate-900">WorkLogy Official Receipt</h3>
              </div>
              <button 
                onClick={() => setSelectedReceipt(null)}
                className="text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Receipt Ref:</span>
                <strong className="font-mono text-slate-900">{selectedReceipt.transactionId}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Service:</span>
                <strong className="text-slate-900">{selectedReceipt.jobTitle}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status:</span>
                <strong className="capitalize text-emerald-800">{selectedReceipt.paymentStatus?.replace(/_/g, ' ')}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Channel:</span>
                <span className="text-slate-800 font-semibold">UPI / Net Banking Escrow</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-slate-200 text-sm">
                <span className="font-bold text-slate-900">Total Billed:</span>
                <span className="font-black text-emerald-800">{formatCurrency(selectedReceipt.grossAmount)}</span>
              </div>
            </div>

            <Button 
              variant="primary" 
              size="md" 
              className="w-full"
              onClick={() => {
                window.print();
                setSelectedReceipt(null);
              }}
            >
              Print / Save as PDF
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

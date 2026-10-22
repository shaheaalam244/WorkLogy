import React, { useState, useEffect } from 'react';
import { 
  HelpCircle, 
  MessageSquare, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Send,
  FileQuestion,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import { supportAPI } from '../../api/support.api';

export default function VendorSupport() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [error, setError] = useState(null);

  // New ticket state
  const [formData, setFormData] = useState({
    category: 'payment',
    priority: 'medium',
    subject: '',
    description: ''
  });

  const [expandedFaq, setExpandedFaq] = useState(null);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await supportAPI.getMyTickets();
      if (res?.tickets) {
        setTickets(res.tickets);
      }
    } catch (err) {
      console.error('Error fetching support tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!formData.subject.trim() || !formData.description.trim()) return;

    try {
      setSubmitting(true);
      setError(null);
      const res = await supportAPI.createTicket(formData);
      if (res?.success) {
        setSuccessMsg(res.message || 'Support ticket opened successfully.');
        setFormData({
          category: 'payment',
          priority: 'medium',
          subject: '',
          description: ''
        });
        fetchTickets();
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch (err) {
      console.error('Error creating ticket:', err);
      setError('Failed to submit ticket. Please check required fields.');
    } finally {
      setSubmitting(false);
    }
  };

  const faqs = [
    {
      q: 'How does escrow payment protection work for contractors?',
      a: 'When a property owner accepts your quotation, the agreed contract amount is held securely in WorkLogy Escrow. Once you complete the work and trigger the final inspection sign-off, the homeowner has 24 hours to review, after which the escrow funds are automatically released to your bank ledger.'
    },
    {
      q: 'When are bank payouts transferred to my bank account?',
      a: 'Released escrow funds are batched and deposited via automated NEFT / IMPS every Monday directly to your registered bank account with zero settlement withdrawal fees.'
    },
    {
      q: 'Can I quote on jobs outside my primary trade category?',
      a: 'Vendors can quote on any job domain in which they have uploaded verified trade licenses and credentials. You can update your trades at any time under Verification & Documents.'
    },
    {
      q: 'What is WorkLogy’s platform fee structure?',
      a: 'WorkLogy charges a flat, transparent 5% platform fee on successfully completed job contracts. There are no monthly subscription fees, lead buying charges, or hidden deductions.'
    }
  ];

  if (loading) return <div className="py-20"><Loader text="Loading support centre..." /></div>;

  return (
    <div className="w-full space-y-8">
      <div>
        <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Assistance Hub</span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5">Contractor Help & Support Center</h1>
        <p className="text-xs text-slate-600 mt-0.5">
          Dedicated 24x7 vendor operations desk for payment inquiries, dispute mediation, and technical help.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Open New Ticket Form */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 sm:p-8 space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <MessageSquare className="w-5 h-5 text-emerald-800" />
          <h3 className="text-base font-bold text-slate-900">Open an Official Operations Ticket</h3>
        </div>

        <form onSubmit={handleCreateTicket} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Issue Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700"
              >
                <option value="payment">Escrow Payout / Bank Settlement Issue</option>
                <option value="booking">Active Booking / Customer Dispute</option>
                <option value="service">Service Listing Approval / Visibility</option>
                <option value="account">Account Compliance & Verification</option>
                <option value="general">General Operations Inquiry</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Priority Level</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700"
              >
                <option value="low">Low (Standard response within 24h)</option>
                <option value="medium">Medium (Response within 6h)</option>
                <option value="high">High (Response within 2h)</option>
                <option value="urgent">Urgent (On-site job blocker / immediate)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Subject *</label>
            <input
              type="text"
              required
              placeholder="e.g. Escrow deposit inquiry for Booking #BK-8291"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Detailed Explanation *</label>
            <textarea
              rows="3"
              required
              placeholder="Provide exact booking references, customer name, date, and description of the assistance needed..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700"
            />
          </div>

          <div className="flex justify-end pt-1">
            <Button
              type="submit"
              variant="primary"
              size="md"
              icon={Send}
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Support Ticket'}
            </Button>
          </div>
        </form>
      </div>

      {/* Existing Tickets */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 sm:p-8 space-y-4">
        <h3 className="text-base font-bold text-slate-900">My Active Operations Tickets</h3>

        {tickets.length > 0 ? (
          <div className="space-y-3 pt-1">
            {tickets.map((t) => (
              <div key={t._id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold text-slate-500">{t.ticketNumber}</span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-emerald-100 text-emerald-800">
                      {t.status}
                    </span>
                    <span className="text-[10px] text-slate-500 capitalize">· {t.category}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-900">{t.subject}</h4>
                <p className="text-xs text-slate-600">{t.description}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 py-3">No active tickets opened.</p>
        )}
      </div>

      {/* Frequently Asked Questions */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <FileQuestion className="w-5 h-5 text-emerald-800" />
          <h3 className="text-base font-bold text-slate-900">Frequently Asked Contractor Questions</h3>
        </div>

        <div className="space-y-2 pt-1">
          {faqs.map((faq, idx) => (
            <div key={idx} className="border border-slate-200 rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                className="w-full p-4 text-left font-bold text-xs text-slate-800 bg-slate-50/50 hover:bg-slate-50 transition flex items-center justify-between gap-4"
              >
                <span>{faq.q}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedFaq === idx ? 'rotate-180' : ''}`} />
              </button>
              {expandedFaq === idx && (
                <div className="p-4 text-xs text-slate-600 bg-white border-t border-slate-100 leading-relaxed">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

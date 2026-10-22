import React, { useState, useEffect } from 'react';
import { 
  HelpCircle, 
  ShieldCheck, 
  AlertTriangle, 
  Phone, 
  Mail, 
  MessageSquare, 
  CheckCircle2, 
  ChevronDown,
  Clock,
  Send,
  AlertCircle
} from 'lucide-react';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import { supportAPI } from '../../api/support.api';
import { formatDate } from '../../utils/formatters';

export default function CustomerSupport() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState(null);
  const [ticketError, setTicketError] = useState(null);

  const [formData, setFormData] = useState({
    subject: '',
    category: 'payment',
    priority: 'medium',
    description: ''
  });

  const [activeFaq, setActiveFaq] = useState(null);

  const faqs = [
    {
      q: 'How does WorkLogy Payment Protection work?',
      a: 'When you accept an offer, your payment is held securely in Payment Protection. The funds are only released to the professional after they complete the work and you approve it.'
    },
    {
      q: 'Can I cancel a booking and receive a full refund?',
      a: 'Yes. Before a professional starts on-site work, you can cancel the booking directly from your Bookings page. Your payment will be refunded immediately.'
    },
    {
      q: 'What should I do if a professional does not arrive?',
      a: 'If a professional does not arrive during the scheduled window, you can message them directly or reach out to support. We will help right away.'
    },
    {
      q: 'How do I raise a concern about work quality?',
      a: 'Do not approve the completed work yet. Contact our support team below with details of the issue. Your payment remains protected until the issue is resolved.'
    }
  ];

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await supportAPI.getMyTickets();
      if (res?.tickets) {
        setTickets(res.tickets);
      }
    } catch (err) {
      console.error('Failed to load tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.subject.trim() || !formData.description.trim()) {
      setTicketError('Subject and description are required.');
      return;
    }

    try {
      setSubmitting(true);
      setTicketError(null);
      setTicketSuccess(null);

      const res = await supportAPI.createTicket(formData);
      if (res?.success) {
        setTicketSuccess(`Support ticket #${res.ticket?.ticketNumber || ''} created successfully! Our compliance team will respond shortly.`);
        setFormData({
          subject: '',
          category: 'payment',
          priority: 'medium',
          description: ''
        });
        fetchTickets();
        setTimeout(() => setTicketSuccess(null), 6000);
      }
    } catch (err) {
      console.error('Support ticket error:', err);
      setTicketError(err.response?.data?.message || 'Failed to submit support request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Help & Support
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          24/7 customer assistance, payment protection help, and live ticket resolution for Lucknow homeowners.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Support Ticket Form & Ticket History */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-slate-200/90 shadow-2xs rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-900">Open a Support Ticket</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Our support team typically responds within 1-2 hours.
              </p>
            </div>

            {ticketSuccess && (
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-800 text-xs flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
                <span>{ticketSuccess}</span>
              </div>
            )}

            {ticketError && (
              <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 text-rose-800 text-xs flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>{ticketError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700"
                  >
                    <option value="payment">Payment & Refunds</option>
                    <option value="job_issue">Job or Service Issue</option>
                    <option value="technical">App or Technical Help</option>
                    <option value="general">General Inquiry</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700"
                  >
                    <option value="low">Low - General query</option>
                    <option value="medium">Medium - Active service</option>
                    <option value="high">High - Urgent assistance</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Question regarding booking refund"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Details & Description</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Please describe the issue or inquiry in detail..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700"
                />
              </div>

              <Button type="submit" variant="primary" size="md" disabled={submitting} icon={Send}>
                {submitting ? 'Submitting Ticket...' : 'Submit Support Ticket'}
              </Button>
            </form>
          </div>

          {/* Ticket History */}
          <div className="bg-white border border-slate-200/90 shadow-2xs rounded-3xl p-6 sm:p-8 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Your Support Tickets</h3>
            {loading ? (
              <Loader text="Loading your ticket history..." />
            ) : tickets.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No tickets opened yet.</p>
            ) : (
              <div className="space-y-3">
                {tickets.map(t => (
                  <div key={t._id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-emerald-800">{t.ticketNumber}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        t.status === 'resolved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {t.status}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-xs">{t.subject}</h4>
                    <p className="text-[11px] text-slate-600 line-clamp-2">{t.description}</p>
                    <span className="text-[10px] text-slate-400 block pt-1">
                      Opened {formatDate(t.createdAt)} · Priority: {t.priority}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Support Channels & FAQs */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200/90 shadow-2xs rounded-3xl p-6 sm:p-7 space-y-4">
            <h2 className="text-base font-bold text-slate-900">Direct Contact Channels</h2>
            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                <Phone className="w-5 h-5 text-emerald-700 shrink-0" />
                <div>
                  <span className="font-bold text-slate-900 block">Phone Support</span>
                  <span className="text-slate-600">+91 522 400 8900 (9 AM - 9 PM)</span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <Mail className="w-5 h-5 text-slate-600 shrink-0" />
                <div>
                  <span className="font-bold text-slate-900 block">Email Support</span>
                  <span className="text-slate-600">support@worklogy.in</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 shadow-2xs rounded-3xl p-6 sm:p-7 space-y-3">
            <h2 className="text-base font-bold text-slate-900">Frequently Asked Questions</h2>
            <div className="space-y-2">
              {faqs.map((faq, idx) => (
                <div key={idx} className="border border-slate-200 rounded-2xl overflow-hidden">
                  <button
                    onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                    className="w-full text-left p-3.5 text-xs font-bold text-slate-900 flex items-center justify-between gap-2 hover:bg-slate-50 transition"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${activeFaq === idx ? 'rotate-180' : ''}`} />
                  </button>
                  {activeFaq === idx && (
                    <div className="p-3.5 pt-0 text-xs text-slate-600 border-t border-slate-100 bg-slate-50/50">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

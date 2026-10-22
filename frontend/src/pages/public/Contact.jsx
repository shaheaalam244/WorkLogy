import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle2 } from 'lucide-react';
import Button from '../../components/common/Button';

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="max-w-3xl mx-auto text-center mb-12">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Contact Worklogy Support & Concierge
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          Have questions about contractor verification, enterprise accounts, or active dispute mediation? We are here 24/7.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {/* Contact info cards */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 shadow-sm p-5 rounded-2xl flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-100 flex items-center justify-center shrink-0">
              <Phone className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Toll-Free Phone</p>
              <p className="text-sm font-bold text-slate-900">+91 522 932-WORK</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 shadow-sm p-5 rounded-2xl flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-100 flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Support Email</p>
              <p className="text-sm font-bold text-slate-900">support@worklogy.com</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 shadow-sm p-5 rounded-2xl flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-100 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Headquarters</p>
              <p className="text-sm font-bold text-slate-900">Hazratganj, Lucknow, Uttar Pradesh 226001, India</p>
            </div>
          </div>
        </div>

        {/* Contact form */}
        <div className="lg:col-span-2 bg-white border border-slate-200 shadow-sm p-8 rounded-3xl">
          {submitted ? (
            <div className="text-center py-12 space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Message Received!</h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                A member of our support concierge team has logged your ticket and will respond within 2 hours.
              </p>
              <Button variant="secondary" size="sm" onClick={() => setSubmitted(false)}>
                Send Another Message
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Your Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-700 shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-700 shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
                <input
                  type="text"
                  required
                  placeholder="Contractor verification inquiry / General question..."
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-700 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Your Message</label>
                <textarea
                  rows="4"
                  required
                  placeholder="Provide any details regarding your inquiry..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-700 shadow-2xs"
                />
              </div>

              <Button type="submit" variant="primary" size="md" icon={Send} className="w-full">
                Submit Support Inquiry
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

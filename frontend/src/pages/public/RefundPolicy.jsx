import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, RefreshCw, CheckCircle2, ArrowRight } from 'lucide-react';

export default function RefundPolicy() {
  return (
    <div className="bg-[#F7F9FC] min-h-screen text-[#111827] py-10 lg:py-16">
      <div className="page-container max-w-4xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-semibold text-[#06684F] mb-3">
          <Link to="/" className="hover:underline">Home</Link>
          <span>/</span>
          <span className="text-slate-500">Legal</span>
          <span>/</span>
          <span>Cancellation & Refund Policy</span>
        </div>

        {/* Title Header */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-xs mb-8">
          <div className="flex items-center gap-2.5 text-xs font-bold text-[#06684F] uppercase tracking-wider mb-2">
            <RefreshCw className="w-4 h-4" />
            <span>Fair Cancellation & Escrow Protection</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-[#111827] tracking-tight">
            Cancellation & Refund Policy
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-2">
            Clear guidelines on free cancellations, rescheduling, and automated escrow refund turnaround times.
          </p>
        </div>

        {/* Content Body */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-xs space-y-8 text-sm leading-relaxed text-slate-700">
          
          <section>
            <h2 className="text-base sm:text-lg font-bold text-[#111827] mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-50 text-[#06684F] text-xs font-black flex items-center justify-center">1</span>
              Free Cancellation Window
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mb-2">
              Customers can cancel any requested or scheduled service appointment without penalty prior to professional dispatch:
            </p>
            <ul className="space-y-1.5 text-xs sm:text-sm text-slate-600 list-disc list-inside">
              <li><strong className="text-slate-900">Before Professional Acceptance:</strong> 100% full refund with zero fees if cancelled while awaiting specialist confirmation.</li>
              <li><strong className="text-slate-900">Up to 2 Hours Before Scheduled Time:</strong> 100% full refund to the original payment source.</li>
              <li><strong className="text-slate-900">After Specialist is On The Way:</strong> A nominal dispatch compensation fee of up to ₹150 may apply to compensate the specialist for fuel and travel time.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-bold text-[#111827] mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-50 text-[#06684F] text-xs font-black flex items-center justify-center">2</span>
              Escrow Protection Mechanism
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Payments are never held directly by the independent trade contractor prior to job sign-off. When a booking is cancelled through your customer dashboard, the database immediately records the cancellation status and initiates escrow unlocking.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-bold text-[#111827] mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-50 text-[#06684F] text-xs font-black flex items-center justify-center">3</span>
              Refund Processing Timelines
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-bold text-[#06684F] uppercase tracking-wider block">UPI / Net Banking</span>
                <p className="text-base font-extrabold text-[#111827] mt-1">Instant to 24 Hours</p>
                <p className="text-xs text-slate-500 mt-1">Refunded directly to original bank account via NPCI UPI rail.</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-bold text-[#06684F] uppercase tracking-wider block">Debit / Credit Cards</span>
                <p className="text-base font-extrabold text-[#111827] mt-1">3 to 5 Business Days</p>
                <p className="text-xs text-slate-500 mt-1">Subject to your card issuing bank’s standard clearing cycle.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-bold text-[#111827] mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-50 text-[#06684F] text-xs font-black flex items-center justify-center">4</span>
              Specialist Cancellation or No-Show
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              If an assigned specialist cancels or fails to arrive at your scheduled address within 30 minutes of the slot window, you are entitled to a full 100% refund plus immediate re-assignment assistance through our customer priority support desk.
            </p>
          </section>

          {/* Quick Nav Footer */}
          <div className="pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
            <Link
              to="/terms"
              className="text-xs font-bold text-[#06684F] hover:underline inline-flex items-center gap-1"
            >
              <span>View Terms and Conditions</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              to="/contact"
              className="px-4 py-2 rounded-xl bg-[#06684F] text-white text-xs font-bold hover:bg-[#055742] transition"
            >
              Contact Support
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}

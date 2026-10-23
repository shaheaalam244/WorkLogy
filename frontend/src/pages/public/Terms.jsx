import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, FileText, CheckCircle2, ArrowRight } from 'lucide-react';

export default function Terms() {
  return (
    <div className="bg-[#F7F9FC] min-h-screen text-[#111827] py-10 lg:py-16">
      <div className="page-container max-w-4xl">
        {/* Breadcrumb / Top Tag */}
        <div className="flex items-center gap-2 text-xs font-semibold text-[#06684F] mb-3">
          <Link to="/" className="hover:underline">Home</Link>
          <span>/</span>
          <span className="text-slate-500">Legal</span>
          <span>/</span>
          <span>Terms and Conditions</span>
        </div>

        {/* Title Header */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-xs mb-8">
          <div className="flex items-center gap-2.5 text-xs font-bold text-[#06684F] uppercase tracking-wider mb-2">
            <ShieldCheck className="w-4 h-4" />
            <span>WorkLogy Customer Agreement</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-[#111827] tracking-tight">
            Terms & Conditions of Service
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-2">
            Last Updated: October 2026 · Applicable to all customers, homeowners, and trade clients in India
          </p>
        </div>

        {/* Content Body */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-xs space-y-8 text-sm leading-relaxed text-slate-700">
          
          <section>
            <h2 className="text-base sm:text-lg font-bold text-[#111827] mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-50 text-[#06684F] text-xs font-black flex items-center justify-center">1</span>
              Platform Overview & Relationship
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              WorkLogy provides a hyperlocal digital marketplace connecting consumer clients with independent, verified trade professionals (including electricians, plumbers, HVAC technicians, carpenters, painters, and cleaners). WorkLogy facilitates booking, quoting, transparent pricing, status tracking, in-app messaging, and escrow payment release.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-bold text-[#111827] mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-50 text-[#06684F] text-xs font-black flex items-center justify-center">2</span>
              Customer Responsibilities
            </h2>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-600 list-disc list-inside">
              <li>Provide accurate service address, contact information, and description of the required work.</li>
              <li>Ensure safe and reasonable physical access to the premises for the scheduled professional.</li>
              <li>Verify the identity of the assigned specialist upon arrival using the in-app photo and verification badge.</li>
              <li>Share the secure Service Start OTP with the specialist only when they have arrived at your designated location.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-bold text-[#111827] mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-50 text-[#06684F] text-xs font-black flex items-center justify-center">3</span>
              Quotations & Escrow Payment Protection
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              All bookings are backed by platform escrow protection. When you confirm a booking, payment is locked securely in escrow. Funds are never released to the service provider until you have verified satisfactory completion of the work or approved completion in your customer dashboard.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-bold text-[#111827] mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-50 text-[#06684F] text-xs font-black flex items-center justify-center">4</span>
              Cancellation & Rescheduling
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Customers may cancel or request rescheduling through the dashboard prior to professional dispatch. For complete details regarding refund processing timelines and zero-penalty cancellation windows, please review our <Link to="/refund-policy" className="text-[#06684F] font-bold hover:underline">Cancellation and Refund Policy</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-bold text-[#111827] mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-50 text-[#06684F] text-xs font-black flex items-center justify-center">5</span>
              Dispute Resolution & Customer Support
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              In the rare event of subpar workmanship, property dispute, or non-completion, customers can raise a formal dispute via the customer console or contact support at <span className="font-semibold text-slate-900">support@worklogy.com</span>. Escrow payout remains locked until our mediation team reviews the evidence and resolves the case.
            </p>
          </section>

          {/* Quick Nav Footer */}
          <div className="pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
            <Link
              to="/privacy"
              className="text-xs font-bold text-[#06684F] hover:underline inline-flex items-center gap-1"
            >
              <span>View Privacy Policy</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              to="/categories"
              className="px-4 py-2 rounded-xl bg-[#06684F] text-white text-xs font-bold hover:bg-[#055742] transition"
            >
              Explore Services
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}

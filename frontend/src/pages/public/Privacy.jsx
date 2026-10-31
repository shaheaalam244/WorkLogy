import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Lock, CheckCircle2, ArrowRight } from 'lucide-react';

export default function Privacy() {
  return (
    <div className="bg-[#F7F9FC] min-h-screen text-[#111827] py-10 lg:py-16">
      <div className="page-container max-w-4xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-semibold text-[#06684F] mb-3">
          <Link to="/" className="hover:underline">Home</Link>
          <span>/</span>
          <span className="text-slate-500">Legal</span>
          <span>/</span>
          <span>Privacy Policy</span>
        </div>

        {/* Title Header */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-xs mb-8">
          <div className="flex items-center gap-2.5 text-xs font-bold text-[#06684F] uppercase tracking-wider mb-2">
            <Lock className="w-4 h-4" />
            <span>Zero Data Leakage Guarantee</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-[#111827] tracking-tight">
            Customer Privacy & Data Protection
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-2">
            Last Updated: October 2026 · Compliant with Indian Digital Personal Data Protection Act (DPDP)
          </p>
        </div>

        {/* Content Body */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-xs space-y-8 text-sm leading-relaxed text-slate-700">
          
          <section>
            <h2 className="text-base sm:text-lg font-bold text-[#111827] mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-50 text-[#06684F] text-xs font-black flex items-center justify-center">1</span>
              Information We Collect
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mb-3">
              We collect only the minimum required information necessary to safely connect you with verified local service specialists and complete your home service bookings:
            </p>
            <ul className="space-y-1.5 text-xs sm:text-sm text-slate-600 list-disc list-inside">
              <li><strong className="text-slate-900">Contact Details:</strong> Your name, verified mobile phone number, and email address.</li>
              <li><strong className="text-slate-900">Service Location:</strong> House number, street, locality, landmark, city, and GPS coordinates for navigation.</li>
              <li><strong className="text-slate-900">Job Specifics:</strong> Service category, problem notes, and optional photo attachments showing work requirements.</li>
              <li><strong className="text-slate-900">Payment Information:</strong> Transaction identifiers and payment status. We never store payment card numbers or bank CVVs on platform servers.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-bold text-[#111827] mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-50 text-[#06684F] text-xs font-black flex items-center justify-center">2</span>
              How We Protect Your Information
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              WorkLogy applies strict role-based access control (RBAC). A professional technician only receives your full service address and direct contact number after you confirm an appointment. Independent contractors cannot browse the private contact data or addresses of users who have not hired them.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-bold text-[#111827] mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-50 text-[#06684F] text-xs font-black flex items-center justify-center">3</span>
              OTP-Protected On-Site Verification
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              To prevent unauthorized check-ins and false arrival claims, service jobs require client-side OTP verification. The specialist cannot start billing or commence work until you confirm their physical presence on site.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-bold text-[#111827] mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-50 text-[#06684F] text-xs font-black flex items-center justify-center">4</span>
              Zero Sale of Personal Data
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              WorkLogy never sells, rents, or distributes customer personal information to third-party marketing companies, telemarketers, or unauthorized data brokers.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-bold text-[#111827] mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-50 text-[#06684F] text-xs font-black flex items-center justify-center">5</span>
              Data Deletion & Inquiries
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              You retain the right to edit your saved addresses, update contact details, or request account closure at any time through your profile or by emailing our data privacy officer at <span className="font-semibold text-slate-900">privacy@worklogy.com</span>.
            </p>
          </section>

          {/* Quick Nav Footer */}
          <div className="pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
            <Link
              to="/terms"
              className="text-xs font-bold text-[#06684F] hover:underline inline-flex items-center gap-1"
            >
              <span>View Terms of Service</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              to="/vendor-privacy"
              className="text-xs font-bold text-emerald-700 hover:text-emerald-900 hover:underline inline-flex items-center gap-1"
            >
              <span>Vendor Privacy Policy</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              to="/refund-policy"
              className="text-xs font-bold text-slate-600 hover:text-slate-900 hover:underline"
            >
              Cancellation & Refund Policy
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}

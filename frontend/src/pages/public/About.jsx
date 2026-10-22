import React from 'react';
import { ShieldCheck, Award, Users, HardHat } from 'lucide-react';

export default function About() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
      <div className="max-w-3xl mx-auto text-center">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
          Building Trust in the Trades Industry
        </h1>
        <p className="mt-4 text-base text-slate-600 leading-relaxed">
          Worklogy was founded to solve the lack of accountability in home services and commercial maintenance. We bridge property owners and master craftspeople with rigorous standards.
        </p>
      </div>

      {/* Stats counter row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="bg-white border border-slate-200 shadow-sm p-6 rounded-2xl text-center">
          <span className="text-3xl sm:text-4xl font-black text-emerald-800">100%</span>
          <p className="text-xs text-slate-500 mt-1 uppercase font-semibold">Verified Licenses</p>
        </div>
        <div className="bg-white border border-slate-200 shadow-sm p-6 rounded-2xl text-center">
          <span className="text-3xl sm:text-4xl font-black text-slate-900">45,000+</span>
          <p className="text-xs text-slate-500 mt-1 uppercase font-semibold">Jobs Completed</p>
        </div>
        <div className="bg-white border border-slate-200 shadow-sm p-6 rounded-2xl text-center">
          <span className="text-3xl sm:text-4xl font-black text-emerald-800">$18M+</span>
          <p className="text-xs text-slate-500 mt-1 uppercase font-semibold">Paid to Contractors</p>
        </div>
        <div className="bg-white border border-slate-200 shadow-sm p-6 rounded-2xl text-center">
          <span className="text-3xl sm:text-4xl font-black text-slate-900">4.92 / 5</span>
          <p className="text-xs text-slate-500 mt-1 uppercase font-semibold">Customer Satisfaction</p>
        </div>
      </div>

      {/* Our 3 Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white border border-slate-200 shadow-sm p-8 rounded-3xl">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-100 flex items-center justify-center mb-5">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Triple-Layer Vetting</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Every vendor profile undergoes manual verification of state contractor licenses, general liability coverage certificates, and national criminal record checks.
          </p>
        </div>

        <div className="bg-white border border-slate-200 shadow-sm p-8 rounded-3xl">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-100 flex items-center justify-center mb-5">
            <Award className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Escrow Protection</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Contractors know funds are secured before picking up tools, and clients rest assured that money is never disbursed until the milestone passes inspection.
          </p>
        </div>

        <div className="bg-white border border-slate-200 shadow-sm p-8 rounded-3xl">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-100 flex items-center justify-center mb-5">
            <HardHat className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Pro-First Economics</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            We reject abusive lead-generation bidding wars that drain trade professionals. We empower tradesmen with direct clients and digital tools.
          </p>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { 
  FileText, 
  Search, 
  MessageSquare, 
  ShieldCheck, 
  CreditCard, 
  CheckCircle2, 
  ArrowRight 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../../components/common/Button';

export default function HowItWorks() {
  const customerSteps = [
    {
      num: '01',
      title: 'Describe Your Job Or Issue',
      desc: 'Post what needs repair, renovation, or inspection. Add photos and select your urgency level.',
      icon: FileText
    },
    {
      num: '02',
      title: 'Receive Certified Pro Proposals',
      desc: 'Licensed local specialists review your scope and provide clear, itemized quotes without spam calls.',
      icon: Search
    },
    {
      num: '03',
      title: 'Escrow Payment & Job Execution',
      desc: 'Your payment is safely held in escrow until the contractor finishes work to your satisfaction.',
      icon: CreditCard
    },
    {
      num: '04',
      title: 'Release Funds & Rate Craftsmanship',
      desc: 'Inspect completed work, sign off, and leave a verified public review that helps the trade community.',
      icon: CheckCircle2
    }
  ];

  const vendorSteps = [
    {
      num: '01',
      title: 'Pass License & Insurance Verification',
      desc: 'Submit your trade license, liability policy, and business EIN for our background verification team.',
      icon: ShieldCheck
    },
    {
      num: '02',
      title: 'Set Your Trade & Coverage Zones',
      desc: 'Choose the exact zip codes and job categories you service. No paying for irrelevant clicks.',
      icon: Search
    },
    {
      num: '03',
      title: 'Receive Real-Time Lead Alerts',
      desc: 'Get immediate socket notifications the moment a client in your service area posts a relevant tender.',
      icon: MessageSquare
    },
    {
      num: '04',
      title: 'Guaranteed Payouts Directly to Bank',
      desc: 'Never chase clients for checks. Client deposits are locked in escrow before you ever arrive on site.',
      icon: CreditCard
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-20">
      <div className="text-center max-w-3xl mx-auto">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
          How Worklogy Redefines Trades & Contracting
        </h1>
        <p className="mt-4 text-slate-600 text-base leading-relaxed">
          Transparent pricing, certified background checks, and automated escrow security protect both property owners and skilled craftsmen.
        </p>
      </div>

      {/* For Customers */}
      <div>
        <div className="text-center mb-12">
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">For Property Owners</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">Hiring a Specialist in 4 Simple Steps</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {customerSteps.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.num} className="bg-white border border-slate-200 shadow-sm p-6 rounded-2xl relative">
                <span className="text-3xl font-black text-slate-200 absolute top-4 right-4">{step.num}</span>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-100 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-base mb-2">{step.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{step.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* For Contractors */}
      <div className="pt-10 border-t border-slate-200">
        <div className="text-center mb-12">
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">For Contractors & Trades</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">Build Your Commercial Reputation</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {vendorSteps.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.num} className="bg-white border border-slate-200 shadow-sm p-6 rounded-2xl relative">
                <span className="text-3xl font-black text-slate-200 absolute top-4 right-4">{step.num}</span>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-100 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-base mb-2">{step.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{step.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="text-center pt-8">
        <Link to="/register">
          <Button variant="primary" size="lg">Get Started with Worklogy</Button>
        </Link>
      </div>
    </div>
  );
}

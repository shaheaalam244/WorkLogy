import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Mail, Phone, ArrowUpRight } from 'lucide-react';
import logoSvg from '../../assets/logo.svg';

export default function Footer() {
  return (
    <footer className="bg-[#111827] text-slate-300 text-sm border-t border-slate-800">
      <div className="page-container py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
          
          {/* Column 1: Brand Info & Trust */}
          <div className="space-y-4">
            <Link to="/" className="inline-flex items-center gap-2.5 focus:outline-none">
              <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center p-1.5">
                <img src={logoSvg} alt="WorkLogy Logo" className="w-full h-full object-contain" />
              </div>
              <span className="text-xl font-black text-white tracking-tight">
                Work<span className="text-[#06684F]">Logy</span>
              </span>
            </Link>

            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              The premier marketplace connecting homeowners, landlords, and businesses with verified independent trade professionals and licensed specialists.
            </p>

            <div className="pt-1 space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-emerald-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>100% Verified Trade Specialists</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Identity verified, credentials reviewed, and protected with secure escrow release.
              </p>
            </div>
          </div>

          {/* Column 2: Popular Services */}
          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-4">
              Popular Services
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <Link to="/categories" className="hover:text-emerald-400 transition-colors">
                  Electrical & Lighting
                </Link>
              </li>
              <li>
                <Link to="/categories" className="hover:text-emerald-400 transition-colors">
                  Plumbing & Water Heaters
                </Link>
              </li>
              <li>
                <Link to="/categories" className="hover:text-emerald-400 transition-colors">
                  HVAC & Climate Systems
                </Link>
              </li>
              <li>
                <Link to="/categories" className="hover:text-emerald-400 transition-colors">
                  Carpentry & Woodwork
                </Link>
              </li>
              <li>
                <Link to="/categories" className="hover:text-emerald-400 transition-colors">
                  Painting & Wall Finishes
                </Link>
              </li>
              <li>
                <Link to="/categories" className="hover:text-emerald-400 transition-colors">
                  Appliance Installation & Repairs
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Platform */}
          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-4">
              Platform
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <Link to="/categories" className="hover:text-emerald-400 transition-colors">
                  All Services
                </Link>
              </li>
              <li>
                <Link to="/professionals" className="hover:text-emerald-400 transition-colors">
                  Find a Professional
                </Link>
              </li>
              <li>
                <Link to="/how-it-works" className="hover:text-emerald-400 transition-colors">
                  How WorkLogy Works
                </Link>
              </li>
              <li>
                <Link to="/customer/bookings" className="hover:text-emerald-400 transition-colors">
                  My Bookings
                </Link>
              </li>
              <li>
                <Link to="/register?role=vendor" className="hover:text-emerald-400 transition-colors font-medium text-emerald-300">
                  Become a Vendor
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Support & Legal */}
          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-4">
              Help & Legal
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <Link to="/about" className="hover:text-emerald-400 transition-colors">
                  About WorkLogy
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-emerald-400 transition-colors">
                  Help & Support
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-emerald-400 transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-emerald-400 transition-colors">
                  Terms and Conditions
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-emerald-400 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/vendor-privacy" className="hover:text-emerald-400 transition-colors">
                  Vendor Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/refund-policy" className="hover:text-emerald-400 transition-colors">
                  Cancellation & Refund Policy
                </Link>
              </li>
              <li className="pt-2 text-[11px] text-slate-500 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span>support@worklogy.com</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Copyright and Bottom Links */}
        <div className="mt-12 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} WorkLogy Marketplace. Built for Indian Homeowners & Verified Pros.</p>
          <div className="flex flex-wrap items-center gap-5">
            <Link to="/privacy" className="hover:text-slate-300 transition-colors">Privacy Policy</Link>
            <Link to="/vendor-privacy" className="hover:text-slate-300 transition-colors">Vendor Privacy</Link>
            <Link to="/terms" className="hover:text-slate-300 transition-colors">Terms of Service</Link>
            <Link to="/refund-policy" className="hover:text-slate-300 transition-colors">Cancellation & Refund Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

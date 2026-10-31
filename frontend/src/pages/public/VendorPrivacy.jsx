import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  FileText,
  UserCheck,
  MapPin,
  CreditCard,
  Bell,
  Smartphone,
  Trash2,
  Mail,
  Phone,
  ArrowRight,
  Printer,
  Copy,
  Check,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  AlertTriangle,
  Building2,
  Calendar,
  Briefcase,
  Sliders,
  Scale
} from 'lucide-react';

export default function VendorPrivacy() {
  const [activeSection, setActiveSection] = useState('introduction');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [copiedSection, setCopiedSection] = useState(null);
  const [showBackToTop, setShowBackToTop] = useState(false);

  const sections = [
    { id: 'introduction', title: '1. Introduction & Scope', icon: FileText },
    { id: 'information-we-collect', title: '2. Information We Collect', icon: Sliders },
    { id: 'registration-account', title: '3. Registration & Account Data', icon: UserCheck },
    { id: 'identity-kyc', title: '4. Identity Verification & KYC', icon: ShieldCheck },
    { id: 'business-profile-services', title: '5. Business Profile & Services', icon: Briefcase },
    { id: 'location-service-area', title: '6. Location & Service Area Data', icon: MapPin },
    { id: 'job-matching-leads', title: '7. Job Matching & Dispatch', icon: Sliders },
    { id: 'bookings-otp-comm', title: '8. Bookings & On-Site OTP', icon: Lock },
    { id: 'payments-settlements', title: '9. Payments & Bank Settlements', icon: CreditCard },
    { id: 'device-notifications', title: '10. Device & Notifications', icon: Smartphone },
    { id: 'how-we-use-data', title: '11. How We Use Information', icon: Check },
    { id: 'data-sharing-disclosure', title: '12. How We Share Information', icon: ExternalLink },
    { id: 'data-security', title: '13. Data Security & Storage', icon: Lock },
    { id: 'data-retention', title: '14. Data Retention Period', icon: Calendar },
    { id: 'privacy-rights', title: '15. Your Rights Under DPDP Act', icon: Scale },
    { id: 'account-deletion', title: '16. Deactivation & Account Deletion', icon: Trash2 },
    { id: 'cookies-tech', title: '17. Cookies & Web Tracking', icon: Sliders },
    { id: 'minors-eligibility', title: '18. Minors & Contractor Age', icon: AlertTriangle },
    { id: 'policy-updates', title: '19. Updates to This Policy', icon: Calendar },
    { id: 'grievance-contact', title: '20. Grievance & Contact Details', icon: Mail }
  ];

  // Scroll listener for sticky navigation & back-to-top
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }

      // Determine active section based on scroll position
      const scrollPosition = window.scrollY + 200;
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i].id);
        if (el && el.offsetTop <= scrollPosition) {
          setActiveSection(sections[i].id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [sections]);

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      const yOffset = -90;
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
      setActiveSection(id);
      setMobileMenuOpen(false);
    }
  };

  const copySectionLink = (id) => {
    const url = `${window.location.origin}/vendor-privacy#${id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedSection(id);
      setTimeout(() => setCopiedSection(null), 2000);
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="bg-[#F8FAFC] min-h-screen text-[#0F172A] py-8 lg:py-14">
      <div className="page-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-semibold text-[#06684F] mb-4">
          <Link to="/" className="hover:underline">Home</Link>
          <span className="text-slate-400">/</span>
          <span className="text-slate-500">Legal & Governance</span>
          <span className="text-slate-400">/</span>
          <span className="text-slate-900 font-bold">Vendor Privacy Policy</span>
        </nav>

        {/* Hero Section */}
        <header className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-10 shadow-xs mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-50/50 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

          <div className="relative z-10 max-w-4xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-[#06684F] border border-emerald-100 text-xs font-bold uppercase tracking-wider mb-4">
              <ShieldCheck className="w-4 h-4 text-[#06684F]" />
              <span>Vendor Data & Privacy Protection Protocol</span>
            </div>

            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-[#0F172A] tracking-tight leading-tight">
              Vendor Privacy Policy
            </h1>

            <p className="text-sm sm:text-base text-slate-600 mt-3 leading-relaxed max-w-3xl">
              Your business records, verification credentials, location telemetry, and earnings data deserve complete transparency, institutional security, and strict regulatory compliance under Indian law.
            </p>

            {/* Meta info & Action Bar */}
            <div className="mt-6 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <strong>Last Updated:</strong> October 31, 2026
                </span>
                <span className="hidden sm:inline text-slate-300">•</span>
                <span className="inline-flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <strong>Version:</strong> 2.4 (Production)
                </span>
                <span className="hidden sm:inline text-slate-300">•</span>
                <span className="text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200/60">
                  DPDP Act 2023 & IT Act 2000 Compliant
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
                  title="Print this policy document"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-600" />
                  <span className="hidden sm:inline">Print Policy</span>
                </button>

                <a
                  href="#grievance-contact"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection('grievance-contact');
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#06684F] hover:bg-[#055742] rounded-xl transition-colors shadow-xs cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Contact Privacy Team</span>
                </a>
              </div>
            </div>
          </div>
        </header>

        {/* 4 Privacy Overview Cards */}
        <section aria-label="Privacy Highlights" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:border-emerald-300 transition-all group">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#06684F] mb-3 group-hover:scale-105 transition-transform">
              <Sliders className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold text-slate-900 mb-1">Your Data</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              We collect identity, trade skills, service areas, and payout records solely to dispatch leads and verify platform integrity.
            </p>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:border-emerald-300 transition-all group">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#06684F] mb-3 group-hover:scale-105 transition-transform">
              <Lock className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold text-slate-900 mb-1">Your Security</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Documents are stored with restricted admin-only RBAC. Identity numbers are masked. Payout details are encrypted with TLS 1.3.
            </p>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:border-emerald-300 transition-all group">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#06684F] mb-3 group-hover:scale-105 transition-transform">
              <UserCheck className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold text-slate-900 mb-1">Your Control</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Customize your active working hours, radius (5-30 km), availability toggle, service prices, or request account closure anytime.
            </p>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:border-emerald-300 transition-all group">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#06684F] mb-3 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold text-slate-900 mb-1">Zero Data Sale</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              We never sell or lease vendor phone numbers, earnings records, or addresses to third-party telemarketers or advertisers.
            </p>
          </div>
        </section>

        {/* Cross-Policy Notice Banner */}
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 sm:p-5 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-start sm:items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5 sm:mt-0" />
            <span>
              <strong>Are you a homeowner or service customer?</strong> This document applies exclusively to registered Service Professionals, Tradespeople, and Vendors.
            </span>
          </div>
          <Link
            to="/privacy"
            className="inline-flex items-center gap-1.5 font-bold text-emerald-800 hover:text-emerald-900 hover:underline shrink-0"
          >
            <span>Read Customer Privacy Policy</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Main Content Area: Sticky Sidebar + Policy Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Desktop Sticky Table of Contents (4 cols) */}
          <aside className="hidden lg:block lg:col-span-4 sticky top-24 space-y-4">
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-[#06684F]" />
                  <span>Table of Contents</span>
                </span>
                <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  20 Sections
                </span>
              </div>

              <nav aria-label="Table of contents" className="max-h-[calc(100vh-220px)] overflow-y-auto pr-1 space-y-1 text-xs">
                {sections.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => scrollToSection(item.id)}
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
                        isActive
                          ? 'bg-emerald-50 text-[#06684F] font-bold border border-emerald-200/80 shadow-2xs'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#06684F]' : 'text-slate-400'}`} />
                      <span className="truncate">{item.title}</span>
                      {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto text-[#06684F] shrink-0" />}
                    </button>
                  );
                })}
              </nav>

              <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                <a
                  href="mailto:privacy@worklogy.com"
                  className="w-full text-center block px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 transition-colors"
                >
                  Email Data Protection Officer
                </a>
                <p className="text-[10px] text-slate-400 text-center leading-tight">
                  Typical response window: within 48 business hours.
                </p>
              </div>
            </div>
          </aside>

          {/* Mobile Collapsible Table of Contents */}
          <div className="lg:hidden col-span-1 mb-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="w-full bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex items-center justify-between text-xs font-bold text-slate-900 cursor-pointer"
            >
              <div className="flex items-center gap-2 text-[#06684F]">
                <FileText className="w-4 h-4" />
                <span>Jump to Policy Section ({sections.find(s => s.id === activeSection)?.title || 'Contents'})</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${mobileMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {mobileMenuOpen && (
              <div className="mt-2 bg-white border border-slate-200 rounded-2xl p-3 shadow-lg max-h-80 overflow-y-auto space-y-1 text-xs">
                {sections.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition-colors ${
                      activeSection === item.id
                        ? 'bg-emerald-50 text-[#06684F] font-bold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>{item.title}</span>
                    {activeSection === item.id && <Check className="w-3.5 h-3.5 text-[#06684F]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Policy Document Body (8 cols on desktop) */}
          <main className="lg:col-span-8 bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-10 shadow-xs space-y-12 text-sm leading-relaxed text-slate-700">

            {/* Section 1: Introduction & Scope */}
            <section id="introduction" className="scroll-mt-28">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-4">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-50 text-[#06684F] text-xs font-black flex items-center justify-center border border-emerald-100">
                    1
                  </span>
                  Introduction & Scope
                </h2>
                <button
                  onClick={() => copySectionLink('introduction')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  title="Copy link to this section"
                >
                  {copiedSection === 'introduction' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              
              <div className="space-y-3 text-xs sm:text-sm text-slate-600">
                <p>
                  Welcome to <strong>WorkLogy</strong> (“Platform”, “we”, “our”, or “us”), operated as an Indian hyperlocal marketplace connecting homeowners, property managers, and businesses with verified independent trade professionals, contractors, technicians, and specialized service vendors (“Vendors”, “Pros”, “Service Partners”, or “you”).
                </p>
                <p>
                  This <strong>Vendor Privacy Policy</strong> sets forth our contractual and statutory practices regarding the collection, handling, processing, verification, and sharing of personal and commercial data provided by individuals and business entities that register to offer skilled home and commercial services on WorkLogy.
                </p>
                <p>
                  This policy is formulated in compliance with the <strong>Digital Personal Data Protection Act, 2023 (DPDP Act)</strong>, the <strong>Information Technology Act, 2000</strong>, the <strong>Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011</strong>, and relevant Indian consumer and data protection regulations.
                </p>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                  <strong>Notice of Independent Professional Status:</strong> Registering as a WorkLogy Vendor establishes an independent contractor relationship. Vendors are not employees, joint-venture partners, or franchisees of WorkLogy.
                </div>
              </div>
            </section>

            {/* Section 2: Information We Collect */}
            <section id="information-we-collect" className="scroll-mt-28">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-4">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-50 text-[#06684F] text-xs font-black flex items-center justify-center border border-emerald-100">
                    2
                  </span>
                  Information We Collect
                </h2>
                <button
                  onClick={() => copySectionLink('information-we-collect')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  title="Copy link to this section"
                >
                  {copiedSection === 'information-we-collect' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="space-y-4 text-xs sm:text-sm text-slate-600">
                <p>
                  To fulfill customer service requests safely, compute realistic lead distances, verify trade credentials, and deposit completed booking payouts, WorkLogy collects the following distinct categories of vendor data:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
                    <h3 className="font-bold text-slate-900 text-xs mb-1.5 flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-[#06684F]" />
                      Mandatory Core Data
                    </h3>
                    <ul className="space-y-1 text-slate-600 list-disc list-inside text-xs">
                      <li>Full Legal Name</li>
                      <li>Registered Mobile Number (OTP Verified)</li>
                      <li>Primary Trade Domain (up to 3 categories)</li>
                      <li>Base Operating City & Locality</li>
                      <li>Base Visit Inspection Charge (INR)</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
                    <h3 className="font-bold text-slate-900 text-xs mb-1.5 flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-[#06684F]" />
                      Commercial & KYC Data
                    </h3>
                    <ul className="space-y-1 text-slate-600 list-disc list-inside text-xs">
                      <li>Business / Trade Name & Bio</li>
                      <li>Government Identity Document (Masked ID)</li>
                      <li>Trade Qualifications & Year of Experience</li>
                      <li>Bank Payout Details (Account Last-4 & IFSC)</li>
                      <li>Work Portfolio Images & Certifications</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 3: Vendor Registration & Account Information */}
            <section id="registration-account" className="scroll-mt-28">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-4">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-50 text-[#06684F] text-xs font-black flex items-center justify-center border border-emerald-100">
                    3
                  </span>
                  Vendor Registration & Account Information
                </h2>
                <button
                  onClick={() => copySectionLink('registration-account')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  title="Copy link to this section"
                >
                  {copiedSection === 'registration-account' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="space-y-3 text-xs sm:text-sm text-slate-600">
                <p>
                  When you initiate contractor onboarding via the WorkLogy Website or Vendor Portal, we establish a secure user record in our database:
                </p>
                <ul className="space-y-2 list-disc list-inside pl-1 text-slate-600">
                  <li>
                    <strong className="text-slate-900">Mobile Authentication:</strong> We verify your identity using one-time password (OTP) verification powered by certified enterprise SMS gateways (MSG91). Passwords are cryptographically hashed using <strong>bcryptjs</strong> with salt rounds before storage. Plaintext passwords are never recorded.
                  </li>
                  <li>
                    <strong className="text-slate-900">Email Address (Optional/Recommended):</strong> Used for automated monthly transaction summaries, formal booking invoices, dispute documentation, and critical policy amendments.
                  </li>
                  <li>
                    <strong className="text-slate-900">Onboarding Lifecycle State:</strong> The platform tracks your onboarding progression through structured states (<code>profile_pending</code>, <code>domains_pending</code>, <code>first_service_pending</code>, <code>completed</code>) to ensure all minimum technical standards are satisfied before your profile is published to customers.
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 4: Identity Verification & KYC */}
            <section id="identity-kyc" className="scroll-mt-28">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-4">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-50 text-[#06684F] text-xs font-black flex items-center justify-center border border-emerald-100">
                    4
                  </span>
                  Identity Verification & KYC Protection
                </h2>
                <button
                  onClick={() => copySectionLink('identity-kyc')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  title="Copy link to this section"
                >
                  {copiedSection === 'identity-kyc' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="space-y-3 text-xs sm:text-sm text-slate-600">
                <p>
                  Because WorkLogy specialists enter private homes and enterprise properties, identity verification is indispensable for platform trust, homeowner safety, and dispute resolution.
                </p>

                <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4 space-y-2">
                  <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2 text-emerald-900">
                    <ShieldCheck className="w-4 h-4 text-[#06684F]" />
                    Strict Aadhaar & Government ID Masking Standard
                  </h3>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Under Indian UIDAI guidelines and DPDP standards, WorkLogy strictly enforces <strong>Masked Aadhaar</strong> (where only the last 4 digits are visible, e.g., <code>XXXX-XXXX-1234</code>). We never store unmasked 12-digit Aadhaar numbers, biometric templates, or iris scans on our database.
                  </p>
                </div>

                <ul className="space-y-1.5 list-disc list-inside pl-1 text-slate-600 pt-1">
                  <li><strong>Supported Document Types:</strong> Masked Aadhaar Card, PAN Card, Voter ID, Trade Contractor License, or Registered Business Incorporation Certificate.</li>
                  <li><strong>Verification Access:</strong> Uploaded identification files are placed in an access-restricted cloud bucket accessible only to authenticated operations and verification officers via temporary signed URLs.</li>
                  <li><strong>Public Disclosure:</strong> Customers only see a green <em>“Verified Trade Specialist”</em> badge and your aggregate rating. Your original KYC images and identification numbers are strictly private and never visible to the public.</li>
                </ul>
              </div>
            </section>

            {/* Section 5: Business Profile & Service Information */}
            <section id="business-profile-services" className="scroll-mt-28">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-4">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-50 text-[#06684F] text-xs font-black flex items-center justify-center border border-emerald-100">
                    5
                  </span>
                  Business Profile & Service Information
                </h2>
                <button
                  onClick={() => copySectionLink('business-profile-services')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  title="Copy link to this section"
                >
                  {copiedSection === 'business-profile-services' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="space-y-3 text-xs sm:text-sm text-slate-600">
                <p>
                  To display your offerings in marketplace search feeds, customer directories, and emergency service listings, we publish the professional details you choose to share:
                </p>
                <ul className="space-y-1.5 list-disc list-inside pl-1 text-slate-600">
                  <li><strong>Public Showcase:</strong> Business name, professional avatar/logo, tagline, biography, years in trade, and portfolio photographs of completed jobs.</li>
                  <li><strong>Domain Quota:</strong> Each vendor may select a maximum of three (3) primary trade domains (e.g., Electrical, Plumbing, HVAC) to ensure high craftsmanship depth.</li>
                  <li><strong>Catalog Pricing:</strong> Service package titles, fixed or hourly rates, base inspection fees, estimated job durations, and emergency surcharge parameters.</li>
                  <li><strong>Ratings & Client Feedback:</strong> Verified customer reviews and star ratings are permanently associated with your business profile to maintain marketplace quality.</li>
                </ul>
              </div>
            </section>

            {/* Section 6: Location & Service Area Data */}
            <section id="location-service-area" className="scroll-mt-28">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-4">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-50 text-[#06684F] text-xs font-black flex items-center justify-center border border-emerald-100">
                    6
                  </span>
                  Location & Service Area Data
                </h2>
                <button
                  onClick={() => copySectionLink('location-service-area')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  title="Copy link to this section"
                >
                  {copiedSection === 'location-service-area' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="space-y-3 text-xs sm:text-sm text-slate-600">
                <p>
                  WorkLogy operates hyperlocally. Location information is used strictly to match you with nearby homeowner job posts and calculate travel feasibility:
                </p>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <h3 className="font-bold text-slate-900 text-xs">How WorkLogy Uses Location Telemetry:</h3>
                  <ul className="space-y-1.5 text-xs text-slate-600 list-disc list-inside">
                    <li><strong className="text-slate-800">Declared Service Radius:</strong> You specify your central dispatch address (e.g., Hazratganj, Lucknow) and choose a radius of <strong>5, 10, 15, 20, 25, or 30 km</strong>. Jobs outside your radius are filtered out.</li>
                    <li><strong className="text-slate-800">Locality & Zone Exclusions:</strong> You can explicitly include or exclude specific city zones or neighborhoods in your Vendor Profile settings.</li>
                    <li><strong className="text-slate-800">No Continuous Background Spyware:</strong> WorkLogy only captures location when actively interacting with job dispatches or requesting on-demand distance calculations. We do not track vendor personal movements outside active platform operations.</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Section 7: Job Requests & Customer Interactions */}
            <section id="job-matching-leads" className="scroll-mt-28">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-4">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-50 text-[#06684F] text-xs font-black flex items-center justify-center border border-emerald-100">
                    7
                  </span>
                  Job Requests, Inquiries & Lead Matching
                </h2>
                <button
                  onClick={() => copySectionLink('job-matching-leads')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  title="Copy link to this section"
                >
                  {copiedSection === 'job-matching-leads' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="space-y-3 text-xs sm:text-sm text-slate-600">
                <p>
                  When a customer creates a public service request, vendors in that trade domain receive an anonymized job alert containing:
                </p>
                <ul className="space-y-1 text-slate-600 list-disc list-inside">
                  <li>Service Category (e.g., Water Heater Installation)</li>
                  <li>General Locality and Approximate Distance (e.g., Gomti Nagar, 3.2 km away)</li>
                  <li>Customer Problem Statement and Work Photos</li>
                  <li>Preferred Date and Time Window</li>
                </ul>
                <p>
                  <strong>Customer Privacy Safeguard:</strong> The customer’s private telephone number, house number, and full address are <em>strictly hidden</em> until the customer approves your quotation and confirms the appointment.
                </p>
              </div>
            </section>

            {/* Section 8: Bookings & Communication */}
            <section id="bookings-otp-comm" className="scroll-mt-28">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-4">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-50 text-[#06684F] text-xs font-black flex items-center justify-center border border-emerald-100">
                    8
                  </span>
                  Bookings, On-Site OTP & Client Communication
                </h2>
                <button
                  onClick={() => copySectionLink('bookings-otp-comm')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  title="Copy link to this section"
                >
                  {copiedSection === 'bookings-otp-comm' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="space-y-3 text-xs sm:text-sm text-slate-600">
                <p>
                  Once an appointment is confirmed:
                </p>
                <ul className="space-y-2 list-disc list-inside text-slate-600">
                  <li>
                    <strong className="text-slate-900">Contact Exchange:</strong> You and the client receive access to direct communication channels for navigation and coordination.
                  </li>
                  <li>
                    <strong className="text-slate-900">On-Site OTP Check-In Requirement:</strong> To protect both vendors and customers from fraudulent arrival claims, every physical job requires a <strong>6-digit arrival verification code</strong> issued to the homeowner. The vendor must verify this OTP on-site to start the official billing and service timer.
                  </li>
                  <li>
                    <strong className="text-slate-900">In-App Chat Monitoring:</strong> Text and photo messages exchanged over the WorkLogy Messaging Hub are logged and retained to resolve scope disputes, price adjustments, or cancellation arbitrations.
                  </li>
                  <li>
                    <strong className="text-slate-900">Anti-Harassment & Data Misuse Prohibition:</strong> Using customer contact details for non-service marketing, unsolicited calls, intimidation, or off-platform harassment constitutes an immediate breach of contract and results in permanent suspension and reporting to law enforcement authorities.
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 9: Payments, Earnings & Transaction Records */}
            <section id="payments-settlements" className="scroll-mt-28">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-4">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-50 text-[#06684F] text-xs font-black flex items-center justify-center border border-emerald-100">
                    9
                  </span>
                  Payments, Earnings & Bank Settlement Records
                </h2>
                <button
                  onClick={() => copySectionLink('payments-settlements')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  title="Copy link to this section"
                >
                  {copiedSection === 'payments-settlements' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="space-y-3 text-xs sm:text-sm text-slate-600">
                <p>
                  WorkLogy manages escrow releases and transparent fee accounting for all marketplace transactions:
                </p>
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
                  <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-[#06684F]" />
                    Banking & Settlement Records Handled:
                  </h3>
                  <ul className="space-y-1.5 text-xs text-slate-600 list-disc list-inside">
                    <li><strong className="text-slate-800">Bank Account Details:</strong> Bank Name, Account Holder Name, IFSC Code, and Masked Account Number (only the last 4 digits are recorded in our application database; e.g. <code>HDFC Bank - ****4812</code>).</li>
                    <li><strong className="text-slate-800">No Payment Card Retention:</strong> WorkLogy servers never store debit/credit card CVVs, full card numbers, or online netbanking credentials. All client-to-escrow payments are processed by RBI-licensed payment aggregators.</li>
                    <li><strong className="text-slate-800">Financial Ledger:</strong> Gross invoice amount, platform service fee, net vendor payout, dispute adjustments, transaction reference IDs, and timestamped settlement logs are recorded for tax compliance and audit trails.</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Section 10: Device Information & Notifications */}
            <section id="device-notifications" className="scroll-mt-28">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-4">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-50 text-[#06684F] text-xs font-black flex items-center justify-center border border-emerald-100">
                    10
                  </span>
                  Device Information & Notifications
                </h2>
                <button
                  onClick={() => copySectionLink('device-notifications')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  title="Copy link to this section"
                >
                  {copiedSection === 'device-notifications' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="space-y-3 text-xs sm:text-sm text-slate-600">
                <p>
                  To ensure real-time job dispatch and protect account security, our systems automatically log technical device parameters:
                </p>
                <ul className="space-y-1.5 list-disc list-inside text-slate-600">
                  <li><strong>Device Telemetry:</strong> Device model, operating system version, browser user-agent, IP address, and login session timestamps.</li>
                  <li><strong>Push Notifications:</strong> Real-time alerts for instant customer inquiries, booking confirmations, emergency dispatch alerts, and escrow releases.</li>
                  <li><strong>Communication Preferences:</strong> You can configure notification preferences in your Vendor Settings for booking alerts, quote requests, and operational notifications.</li>
                </ul>
              </div>
            </section>

            {/* Section 11: How We Use Your Information */}
            <section id="how-we-use-data" className="scroll-mt-28">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-4">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-50 text-[#06684F] text-xs font-black flex items-center justify-center border border-emerald-100">
                    11
                  </span>
                  How We Use Your Information
                </h2>
                <button
                  onClick={() => copySectionLink('how-we-use-data')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  title="Copy link to this section"
                >
                  {copiedSection === 'how-we-use-data' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="space-y-3 text-xs sm:text-sm text-slate-600">
                <p>We process vendor data exclusively for lawful platform operations:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <strong className="text-slate-900 block mb-1">Contractual Service Delivery</strong>
                    Publishing your profile, dispatching nearby customer jobs, coordinating on-site visits, and releasing escrow payouts.
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <strong className="text-slate-900 block mb-1">Trust & Quality Assurance</strong>
                    Admin credential review, verified badge validation, dispute mediation, customer feedback scoring, and preventing fraud.
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <strong className="text-slate-900 block mb-1">Safety & Emergency Response</strong>
                    Facilitating urgent breakdown dispatch (HVAC, Electrical, Plumbing) within your specified 24x7 coverage zones.
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <strong className="text-slate-900 block mb-1">Taxation & Regulatory Duty</strong>
                    Maintaining mandatory GST invoice records, TDS filings where applicable, and responding to judicial or law enforcement directives.
                  </div>
                </div>
              </div>
            </section>

            {/* Section 12: How We Share Your Information */}
            <section id="data-sharing-disclosure" className="scroll-mt-28">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-4">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-50 text-[#06684F] text-xs font-black flex items-center justify-center border border-emerald-100">
                    12
                  </span>
                  How We Share Your Information
                </h2>
                <button
                  onClick={() => copySectionLink('data-sharing-disclosure')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  title="Copy link to this section"
                >
                  {copiedSection === 'data-sharing-disclosure' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="space-y-3 text-xs sm:text-sm text-slate-600">
                <p>
                  WorkLogy does not sell, rent, or monetize vendor information. Data disclosure occurs solely in the following defined scenarios:
                </p>
                <ul className="space-y-2 list-disc list-inside text-slate-600">
                  <li>
                    <strong className="text-slate-900">With Customers:</strong> Public profile information (business name, rating, reviews, service descriptions) is visible to all marketplace users. Direct phone contact is unlocked only to clients who confirm a booking with you.
                  </li>
                  <li>
                    <strong className="text-slate-900">Financial & Payment Aggregators:</strong> Transaction IDs, account numbers, and settlement amounts are transmitted securely to RBI-regulated banking partners for payout processing.
                  </li>
                  <li>
                    <strong className="text-slate-900">Communication Vendors:</strong> Encrypted telephone numbers are shared with certified SMS and OTP gateways (MSG91) solely to deliver dispatch notifications and verification codes.
                  </li>
                  <li>
                    <strong className="text-slate-900">Infrastructure & Hosting:</strong> Secure cloud providers hosting our encrypted databases and file storage under strict non-disclosure obligations.
                  </li>
                  <li>
                    <strong className="text-slate-900">Legal Authorities:</strong> Where mandated by a valid court order, subpoena, law enforcement inquiry, or statutory requirement under Indian law.
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 13: Data Security */}
            <section id="data-security" className="scroll-mt-28">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-4">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-50 text-[#06684F] text-xs font-black flex items-center justify-center border border-emerald-100">
                    13
                  </span>
                  Data Security & Storage
                </h2>
                <button
                  onClick={() => copySectionLink('data-security')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  title="Copy link to this section"
                >
                  {copiedSection === 'data-security' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="space-y-3 text-xs sm:text-sm text-slate-600">
                <p>
                  We implement industry-standard administrative, physical, and technical safeguards:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <strong className="text-slate-900 block mb-1">TLS 1.3 Encryption</strong>
                    All website, API, and socket communication is encrypted in transit using industry-standard TLS 1.3 protocol.
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <strong className="text-slate-900 block mb-1">Server-Side RBAC</strong>
                    Role-Based Access Control ensures internal personnel can only access vendor data required for their specific role.
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <strong className="text-slate-900 block mb-1">Hashed Credentials</strong>
                    Authentication tokens utilize JSON Web Tokens (JWT) with secure HTTP-only cookie or Bearer headers.
                  </div>
                </div>
              </div>
            </section>

            {/* Section 14: Data Retention */}
            <section id="data-retention" className="scroll-mt-28">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-4">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-50 text-[#06684F] text-xs font-black flex items-center justify-center border border-emerald-100">
                    14
                  </span>
                  Data Retention Period
                </h2>
                <button
                  onClick={() => copySectionLink('data-retention')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  title="Copy link to this section"
                >
                  {copiedSection === 'data-retention' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="space-y-3 text-xs sm:text-sm text-slate-600">
                <p>
                  WorkLogy retains vendor records only for as long as necessary to fulfill the purposes outlined in this policy and satisfy legal requirements:
                </p>
                <ul className="space-y-1.5 list-disc list-inside text-slate-600">
                  <li><strong>Active Vendor Profiles:</strong> Retained for the duration of your platform partnership.</li>
                  <li><strong>Financial & Invoice Records:</strong> Retained for <strong>8 (eight) financial years</strong> as legally mandated by Indian Income Tax and GST regulations.</li>
                  <li><strong>Dispute Records & Chats:</strong> Retained for <strong>3 (three) years</strong> following job completion to resolve consumer warranty or civil disputes.</li>
                  <li><strong>Unfinished Onboarding Profiles:</strong> Draft profiles inactive for more than 180 days are periodically purged.</li>
                </ul>
              </div>
            </section>

            {/* Section 15: Your Privacy Rights */}
            <section id="privacy-rights" className="scroll-mt-28">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-4">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-50 text-[#06684F] text-xs font-black flex items-center justify-center border border-emerald-100">
                    15
                  </span>
                  Your Rights Under the DPDP Act 2023
                </h2>
                <button
                  onClick={() => copySectionLink('privacy-rights')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  title="Copy link to this section"
                >
                  {copiedSection === 'privacy-rights' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="space-y-3 text-xs sm:text-sm text-slate-600">
                <p>
                  As a registered data principal under Indian law, you possess the following actionable rights:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <h3 className="font-bold text-slate-900 text-xs">Right to Access & Summary</h3>
                    <p className="text-xs text-slate-600">Request a complete summary of all personal information, earnings history, and active listings held about you.</p>
                  </div>
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <h3 className="font-bold text-slate-900 text-xs">Right to Correction & Update</h3>
                    <p className="text-xs text-slate-600">Update inaccurate phone numbers, banking IFSC codes, bio descriptions, or pricing directly from your Vendor Profile.</p>
                  </div>
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <h3 className="font-bold text-slate-900 text-xs">Right to Grievance Redressal</h3>
                    <p className="text-xs text-slate-600">Direct any privacy concern to our designated Data Protection Officer with guaranteed review within 48 hours.</p>
                  </div>
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <h3 className="font-bold text-slate-900 text-xs">Right to Nominate</h3>
                    <p className="text-xs text-slate-600">Nominate an individual to exercise your rights on your behalf in the event of death or incapacity.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 16: Account Deletion & Data Removal */}
            <section id="account-deletion" className="scroll-mt-28">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-4">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-50 text-[#06684F] text-xs font-black flex items-center justify-center border border-emerald-100">
                    16
                  </span>
                  Account Deactivation & Deletion
                </h2>
                <button
                  onClick={() => copySectionLink('account-deletion')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  title="Copy link to this section"
                >
                  {copiedSection === 'account-deletion' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="space-y-3 text-xs sm:text-sm text-slate-600">
                <p>
                  Vendors may pause active operations or request complete account closure at any time:
                </p>
                <div className="space-y-2">
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <strong className="text-slate-900 text-xs block mb-1">Temporary Availability Pause (Immediate)</strong>
                    <p className="text-xs text-slate-600">
                      Toggle the <em>“Available for Work”</em> switch in your Vendor Dashboard to immediately conceal your profile from search results without losing your verified reviews or profile history.
                    </p>
                  </div>
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <strong className="text-slate-900 text-xs block mb-1">Permanent Account Deletion Workflow</strong>
                    <p className="text-xs text-slate-600">
                      Submit an account deletion request via Vendor Settings or email <strong>privacy@worklogy.com</strong> with your registered mobile number.
                    </p>
                    <ul className="mt-2 space-y-1 list-disc list-inside text-xs text-slate-500">
                      <li>Pending jobs must be completed or cancelled before closure.</li>
                      <li>Outstanding escrow settlements will be deposited into your verified bank account.</li>
                      <li>Your public profile, service listings, and portfolio will be removed from marketplace search.</li>
                      <li>Statutory tax and financial transaction records will be securely archived as required by Indian law.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 17: Cookies & Web Technologies */}
            <section id="cookies-tech" className="scroll-mt-28">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-4">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-50 text-[#06684F] text-xs font-black flex items-center justify-center border border-emerald-100">
                    17
                  </span>
                  Cookies & Web Storage Technologies
                </h2>
                <button
                  onClick={() => copySectionLink('cookies-tech')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  title="Copy link to this section"
                >
                  {copiedSection === 'cookies-tech' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="space-y-3 text-xs sm:text-sm text-slate-600">
                <p>
                  The WorkLogy website uses essential cookies and local storage tokens solely to maintain authenticated sessions and remember user preferences:
                </p>
                <ul className="space-y-1.5 list-disc list-inside text-slate-600">
                  <li><strong>Essential Authentication Cookies:</strong> Maintain your active login session across page refreshes.</li>
                  <li><strong>Functional Storage:</strong> Remembers your chosen language, theme state, and location filters.</li>
                  <li><strong>Zero Third-Party Advertising Trackers:</strong> We do not deploy third-party advertising cookies or cross-site tracking scripts that harvest vendor web history for targeted ads.</li>
                </ul>
              </div>
            </section>

            {/* Section 18: Children's Privacy */}
            <section id="minors-eligibility" className="scroll-mt-28">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-4">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-50 text-[#06684F] text-xs font-black flex items-center justify-center border border-emerald-100">
                    18
                  </span>
                  Minors & Ineligibility of Persons Under 18
                </h2>
                <button
                  onClick={() => copySectionLink('minors-eligibility')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  title="Copy link to this section"
                >
                  {copiedSection === 'minors-eligibility' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="space-y-3 text-xs sm:text-sm text-slate-600">
                <p>
                  WorkLogy does not permit individuals under the age of eighteen (18) to register as independent trade vendors or perform on-site services. All service providers must possess the legal capacity to enter into binding commercial contracts under the <strong>Indian Contract Act, 1872</strong>.
                </p>
                <p>
                  If we discover that an account has been established by an underage individual, the profile and KYC submissions will be deleted immediately and any active dispatches cancelled.
                </p>
              </div>
            </section>

            {/* Section 19: Policy Updates */}
            <section id="policy-updates" className="scroll-mt-28">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-4">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-50 text-[#06684F] text-xs font-black flex items-center justify-center border border-emerald-100">
                    19
                  </span>
                  Updates to This Privacy Policy
                </h2>
                <button
                  onClick={() => copySectionLink('policy-updates')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  title="Copy link to this section"
                >
                  {copiedSection === 'policy-updates' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="space-y-3 text-xs sm:text-sm text-slate-600">
                <p>
                  We may periodically revise this Vendor Privacy Policy to reflect emerging legal guidelines, product capabilities, or security standards.
                </p>
                <p>
                  When material amendments occur, we will notify registered vendors through in-app alerts, dashboard banners, or email communications prior to the effective date. The <em>“Last Updated”</em> timestamp at the top of this document indicates the latest revision date. Continued participation as a registered vendor constitutes acceptance of the modified policy.
                </p>
              </div>
            </section>

            {/* Section 20: Contact Details & Grievance Redressal */}
            <section id="grievance-contact" className="scroll-mt-28">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-4">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-50 text-[#06684F] text-xs font-black flex items-center justify-center border border-emerald-100">
                    20
                  </span>
                  Grievance Redressal & Contact Details
                </h2>
                <button
                  onClick={() => copySectionLink('grievance-contact')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  title="Copy link to this section"
                >
                  {copiedSection === 'grievance-contact' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="space-y-4 text-xs sm:text-sm text-slate-600">
                <p>
                  In accordance with the <strong>Information Technology Act, 2000</strong> and the <strong>Digital Personal Data Protection Act, 2023</strong>, WorkLogy has appointed a dedicated Grievance Officer and Data Protection Officer to address vendor privacy inquiries, data subject access requests, and identity grievances:
                </p>

                {/* Grievance Officer Card */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-3 text-xs">
                  <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200">
                    <Building2 className="w-4 h-4 text-[#06684F]" />
                    <span className="font-bold text-slate-900 text-sm">WorkLogy Marketplace Grievance Office</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700">
                    <div>
                      <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Designated Officer</p>
                      <p className="font-bold text-slate-900">Grievance & Data Protection Officer</p>
                    </div>

                    <div>
                      <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Dedicated Privacy Email</p>
                      <a href="mailto:privacy@worklogy.com" className="font-bold text-emerald-700 hover:underline">
                        privacy@worklogy.com
                      </a>
                    </div>

                    <div>
                      <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Support Concierge</p>
                      <a href="mailto:support@worklogy.com" className="font-bold text-slate-900 hover:underline">
                        support@worklogy.com
                      </a>
                    </div>

                    <div>
                      <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Toll-Free Helpline</p>
                      <p className="font-bold text-slate-900">+91 522 932-WORK (9675)</p>
                    </div>

                    <div className="sm:col-span-2 pt-1 border-t border-slate-200/60">
                      <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Physical Corporate Headquarters</p>
                      <p className="font-medium text-slate-800">
                        WorkLogy Marketplace, Hazratganj Commercial Complex, Lucknow, Uttar Pradesh 226001, India
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 text-[11px] text-slate-500 border-t border-slate-200">
                    <strong>Statutory Response Timeline:</strong> Formal grievances received via <code>privacy@worklogy.com</code> will be acknowledged within <strong>48 hours</strong> and resolved within <strong>30 calendar days</strong>.
                  </div>
                </div>
              </div>
            </section>

            {/* Quick Navigation Footer */}
            <div className="pt-8 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
              <Link
                to="/terms"
                className="text-xs font-bold text-[#06684F] hover:underline inline-flex items-center gap-1.5"
              >
                <span>Read Terms of Service</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              
              <Link
                to="/privacy"
                className="text-xs font-bold text-slate-600 hover:text-slate-900 hover:underline inline-flex items-center gap-1.5"
              >
                <span>Customer Privacy Policy</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>

              <Link
                to="/refund-policy"
                className="text-xs font-bold text-slate-600 hover:text-slate-900 hover:underline"
              >
                Cancellation & Refund Policy
              </Link>
            </div>

          </main>

        </div>

      </div>

      {/* Floating Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-40 p-3 bg-[#06684F] hover:bg-[#055742] text-white rounded-full shadow-lg transition-all hover:scale-110 cursor-pointer"
          aria-label="Back to top"
          title="Back to top"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      )}

    </div>
  );
}

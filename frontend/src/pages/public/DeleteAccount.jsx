import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  UserMinus,
  User,
  Briefcase,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Search,
  Lock,
  Phone,
  Mail,
  HelpCircle,
  FileText,
  RotateCcw
} from 'lucide-react';
import { accountDeletionAPI } from '../../api/accountDeletion.api';

export default function DeleteAccount() {
  const [activeTab, setActiveTab] = useState('request'); // 'request' | 'track'

  // Form State
  const [role, setRole] = useState('customer'); // 'customer' | 'vendor'
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [confirmationAcknowledged, setConfirmationAcknowledged] = useState(false);

  // OTP & Verification State
  const [step, setStep] = useState(1); // 1 = Details, 2 = OTP Entry, 3 = Completed
  const [otp, setOtp] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successResponse, setSuccessResponse] = useState(null);

  // Tracking State
  const [trackRefId, setTrackRefId] = useState('');
  const [trackPhone, setTrackPhone] = useState('');
  const [isTracking, setIsTracking] = useState(false);
  const [trackResult, setTrackResult] = useState(null);
  const [trackError, setTrackError] = useState(null);

  // Cooldown countdown timer
  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  const reasonsList = [
    'I found an alternative service provider',
    'No longer need home services in my area',
    'Privacy or data management preference',
    'Closing my contracting or trade business',
    'Moving to a city not covered by WorkLogy',
    'Technical or app performance difficulties',
    'Other reason'
  ];

  // Handle Step 1 -> Request OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanPhone = phone.replace(/\D/g, '').slice(0, 10);
    if (!cleanPhone || cleanPhone.length !== 10) {
      setErrorMessage('Please enter a valid 10-digit Indian registered mobile number.');
      return;
    }

    if (!confirmationAcknowledged) {
      setErrorMessage('Please acknowledge the account deletion confirmation checkbox before proceeding.');
      return;
    }

    setIsSendingOtp(true);
    try {
      const res = await accountDeletionAPI.requestOtp({
        phone: cleanPhone,
        role
      });
      setStep(2);
      setCooldown(res?.cooldownSeconds || 60);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to dispatch verification code.';
      setErrorMessage(msg);
      if (err?.response?.data?.referenceId) {
        setTrackRefId(err.response.data.referenceId);
        setTrackPhone(cleanPhone);
      }
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Handle Resend OTP
  const handleResendOtp = async () => {
    if (cooldown > 0) return;
    setErrorMessage(null);
    setIsSendingOtp(true);
    try {
      const cleanPhone = phone.replace(/\D/g, '').slice(0, 10);
      const res = await accountDeletionAPI.requestOtp({ phone: cleanPhone, role });
      setCooldown(res?.cooldownSeconds || 60);
    } catch (err) {
      setErrorMessage(err?.response?.data?.message || 'Failed to resend verification code.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Handle Step 2 -> Submit Request
  const handleSubmitDeletion = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      setErrorMessage('Please enter the 6-digit numeric verification code.');
      return;
    }

    setIsSubmitting(true);
    try {
      const cleanPhone = phone.replace(/\D/g, '').slice(0, 10);
      const chosenReason = reason === 'Other reason' && otherReason ? otherReason : reason;
      const res = await accountDeletionAPI.submitRequest({
        phone: cleanPhone,
        role,
        otp: cleanOtp,
        email: email.trim(),
        reason: chosenReason,
        confirmationAcknowledged
      });

      setSuccessResponse(res);
      setStep(3);
    } catch (err) {
      setErrorMessage(err?.response?.data?.message || 'Failed to complete deletion request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Track Status
  const handleTrackSubmit = async (e) => {
    e.preventDefault();
    setTrackError(null);
    setTrackResult(null);

    const cleanRef = trackRefId.trim().toUpperCase();
    const cleanPhone = trackPhone.replace(/\D/g, '').slice(0, 10);

    if (!cleanRef) {
      setTrackError('Please provide your Deletion Reference ID (e.g., DEL-738291).');
      return;
    }

    if (!cleanPhone || cleanPhone.length !== 10) {
      setTrackError('Please provide your 10-digit registered mobile number for verification.');
      return;
    }

    setIsTracking(true);
    try {
      const res = await accountDeletionAPI.checkStatus({
        referenceId: cleanRef,
        phone: cleanPhone
      });
      setTrackResult(res.data);
    } catch (err) {
      setTrackError(err?.response?.data?.message || 'No deletion request found for these details.');
    } finally {
      setIsTracking(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setOtp('');
    setErrorMessage(null);
    setSuccessResponse(null);
    setConfirmationAcknowledged(false);
  };

  return (
    <div className="bg-[#F8FAFC] min-h-screen text-[#0F172A] py-8 lg:py-14">
      <div className="page-container max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-semibold text-[#06684F] mb-4">
          <Link to="/" className="hover:underline">Home</Link>
          <span className="text-slate-400">/</span>
          <span className="text-slate-500">Legal & Governance</span>
          <span className="text-slate-400">/</span>
          <span className="text-slate-900 font-bold">Account Deletion</span>
        </nav>

        {/* Hero Header */}
        <header className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-10 shadow-xs mb-8 relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200/60 text-xs font-bold uppercase tracking-wider mb-4">
              <UserMinus className="w-4 h-4 text-rose-600" />
              <span>Account & Data Deletion Portal</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Delete Your WorkLogy Account
            </h1>

            <p className="text-sm sm:text-base text-slate-600 mt-3 leading-relaxed">
              We’re sorry to see you go. As part of our commitment to user transparency and Indian data protection standards (DPDP Act 2023), you can request permanent deletion of your account and eligible personal information.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-4 h-4 text-[#06684F]" />
                Identity-Verified via OTP
              </span>
              <span className="text-slate-300">•</span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-400" />
                30-Day Statutory Grace Period
              </span>
            </div>
          </div>
        </header>

        {/* Mode Switch Tabs: Request Deletion vs Track Status */}
        <div className="flex border-b border-slate-200 mb-8 gap-4">
          <button
            onClick={() => setActiveTab('request')}
            className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'request'
                ? 'border-[#06684F] text-[#06684F]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Submit Deletion Request
          </button>
          <button
            onClick={() => setActiveTab('track')}
            className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'track'
                ? 'border-[#06684F] text-[#06684F]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Track Existing Request
          </button>
        </div>

        {/* TAB 1: SUBMIT DELETION REQUEST */}
        {activeTab === 'request' && (
          <div className="space-y-8">
            
            {step === 3 && successResponse ? (
              /* Success View */
              <div className="bg-white border border-emerald-200 rounded-3xl p-6 sm:p-10 shadow-xs text-center space-y-6">
                <div className="w-16 h-16 rounded-full bg-emerald-50 text-[#06684F] border border-emerald-200 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div className="space-y-2 max-w-lg mx-auto">
                  <h2 className="text-2xl font-black text-slate-900">Deletion Request Received</h2>
                  <p className="text-sm text-slate-600">
                    Your request has been verified and registered with our Data Governance Team.
                  </p>
                </div>

                {/* Reference ID Card */}
                <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl max-w-md mx-auto text-left space-y-3">
                  <div>
                    <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">Reference Tracking ID</span>
                    <p className="text-xl font-mono font-black text-[#06684F] tracking-wider">{successResponse.referenceId}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-200 text-xs text-slate-600 space-y-1">
                    <p><strong>Account Type:</strong> {role === 'vendor' ? 'Service Professional / Vendor' : 'Customer Account'}</p>
                    <p><strong>Registered Phone:</strong> +91 ******{phone.slice(-4)}</p>
                    <p><strong>Scheduled Deletion Date:</strong> {new Date(successResponse.scheduledDeletionDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                </div>

                {/* What Happens Next */}
                <div className="max-w-lg mx-auto text-left space-y-3 text-xs text-slate-600 bg-emerald-50/50 border border-emerald-100 p-4 rounded-xl">
                  <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-[#06684F]" />
                    What Happens Next?
                  </h3>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Your public listings, bookings profile, and contact details are immediately hidden from marketplace search feeds.</li>
                    <li>During the 30-day statutory grace period, you may cancel this request by contacting <code>privacy@worklogy.com</code>.</li>
                    <li>Any pending completed booking payouts will be settled into your verified bank account before permanent closure.</li>
                    <li>Statutory tax and financial transaction records will be retained as mandated by Indian GST & IT laws.</li>
                  </ul>
                </div>

                <div className="pt-4 flex flex-wrap justify-center gap-3">
                  <button
                    onClick={() => {
                      setTrackRefId(successResponse.referenceId);
                      setTrackPhone(phone);
                      setActiveTab('track');
                    }}
                    className="px-5 py-2.5 rounded-xl bg-[#06684F] hover:bg-[#055742] text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Track Request Status
                  </button>
                  <button
                    onClick={resetForm}
                    className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Submit Another Request
                  </button>
                </div>
              </div>
            ) : (
              /* Request Form */
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-10 shadow-xs space-y-8">
                
                {errorMessage && (
                  <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-start gap-3 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                    <div>
                      <p className="font-bold">Unable to proceed</p>
                      <p className="mt-0.5">{errorMessage}</p>
                    </div>
                  </div>
                )}

                {step === 1 ? (
                  /* Step 1: Form Details */
                  <form onSubmit={handleRequestOtp} className="space-y-6">
                    {/* Account Type Selection */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                        1. Select Account Type to Delete *
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Customer Option */}
                        <div
                          onClick={() => setRole('customer')}
                          className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                            role === 'customer'
                              ? 'border-[#06684F] bg-emerald-50/40 shadow-xs'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                              role === 'customer' ? 'bg-[#06684F] text-white' : 'bg-slate-100 text-slate-600'
                            }`}>
                              <User className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 text-sm">Customer Account</p>
                              <span className="text-[11px] text-slate-500">Homeowner / Client</span>
                            </div>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            Deletes your customer profile, saved service addresses, booking records, and stored preferences.
                          </p>
                        </div>

                        {/* Vendor Option */}
                        <div
                          onClick={() => setRole('vendor')}
                          className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                            role === 'vendor'
                              ? 'border-[#06684F] bg-emerald-50/40 shadow-xs'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                              role === 'vendor' ? 'bg-[#06684F] text-white' : 'bg-slate-100 text-slate-600'
                            }`}>
                              <Briefcase className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 text-sm">Vendor / Pro Account</p>
                              <span className="text-[11px] text-slate-500">Tradesperson / Specialist</span>
                            </div>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            Deletes your professional trade profile, service catalog, verified credentials, and portfolio images.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Registered Mobile Number */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        2. Registered Mobile Number *
                      </label>
                      <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50/60 focus-within:border-[#06684F] focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-100 transition-all overflow-hidden">
                        <div className="px-3.5 py-2.5 bg-slate-100 border-r border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1.5 shrink-0">
                          <span>🇮🇳 +91</span>
                        </div>
                        <input
                          type="tel"
                          maxLength={10}
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          placeholder="e.g. 9876543210"
                          className="w-full px-3.5 py-2.5 text-sm font-medium text-slate-900 bg-transparent focus:outline-none"
                          required
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Must match the registered phone number of your {role === 'vendor' ? 'Vendor' : 'Customer'} account. A 6-digit verification code will be dispatched to this number.
                      </p>
                    </div>

                    {/* Optional Email Address */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        3. Registered Email Address <span className="text-slate-400 font-normal lowercase">(optional)</span>
                      </label>
                      <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50/60 focus-within:border-[#06684F] focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-100 transition-all overflow-hidden">
                        <div className="px-3.5 py-2.5 text-slate-400 shrink-0">
                          <Mail className="w-4 h-4" />
                        </div>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="e.g. name@example.com"
                          className="w-full pr-3.5 py-2.5 text-sm font-medium text-slate-900 bg-transparent focus:outline-none"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        We will send a formal deletion confirmation receipt to this email address if provided.
                      </p>
                    </div>

                    {/* Reason for Leaving */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        4. Reason for Leaving <span className="text-slate-400 font-normal lowercase">(optional)</span>
                      </label>
                      <select
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 focus:border-[#06684F] focus:bg-white focus:ring-2 focus:ring-emerald-100 text-xs font-medium text-slate-900 transition-all"
                      >
                        <option value="">Select a reason...</option>
                        {reasonsList.map((r, i) => (
                          <option key={i} value={r}>{r}</option>
                        ))}
                      </select>

                      {reason === 'Other reason' && (
                        <textarea
                          value={otherReason}
                          onChange={(e) => setOtherReason(e.target.value)}
                          placeholder="Please let us know how we can improve..."
                          rows={2}
                          className="mt-2 w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#06684F]"
                        />
                      )}
                    </div>

                    {/* Confirmation Checkbox */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={confirmationAcknowledged}
                          onChange={(e) => setConfirmationAcknowledged(e.target.checked)}
                          className="mt-1 w-4 h-4 rounded text-[#06684F] border-slate-300 focus:ring-emerald-500 cursor-pointer"
                        />
                        <span className="text-xs text-slate-700 leading-relaxed font-medium">
                          I understand that account deletion will permanently remove my profile, active listings, and associated data. I acknowledge that financial and tax transaction records will be retained where required by Indian statutory law.
                        </span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={isSendingOtp}
                      className="w-full py-3.5 px-6 rounded-2xl bg-[#06684F] hover:bg-[#055742] text-white text-sm font-bold shadow-xs transition-all disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isSendingOtp ? (
                        <span>Dispatching Verification Code...</span>
                      ) : (
                        <>
                          <span>Verify Mobile & Continue</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  /* Step 2: OTP Entry */
                  <form onSubmit={handleSubmitDeletion} className="space-y-6 max-w-md mx-auto text-center">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#06684F] border border-emerald-100 flex items-center justify-center mx-auto">
                      <Lock className="w-6 h-6" />
                    </div>

                    <div className="space-y-1">
                      <h2 className="text-xl font-bold text-slate-900">Enter Verification Code</h2>
                      <p className="text-xs text-slate-600">
                        Please enter the 6-digit security code sent to <strong>+91 ******{phone.slice(-4)}</strong> to verify ownership of this {role} account.
                      </p>
                    </div>

                    <div>
                      <input
                        type="text"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="••••••"
                        className="w-48 mx-auto text-center tracking-[0.5em] text-2xl font-mono font-bold py-2.5 px-4 rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-[#06684F] focus:ring-2 focus:ring-emerald-100"
                        required
                        autoFocus
                      />
                    </div>

                    <div className="flex items-center justify-center gap-2 text-xs">
                      {cooldown > 0 ? (
                        <span className="text-slate-400">Resend code in {cooldown}s</span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleResendOtp}
                          disabled={isSendingOtp}
                          className="font-bold text-[#06684F] hover:underline cursor-pointer"
                        >
                          Resend Code
                        </button>
                      )}
                      <span className="text-slate-300">•</span>
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="text-slate-500 hover:text-slate-800 hover:underline cursor-pointer"
                      >
                        Change Number
                      </button>
                    </div>

                    <div className="pt-2 flex flex-col gap-2.5">
                      <button
                        type="submit"
                        disabled={isSubmitting || otp.length !== 6}
                        className="w-full py-3.5 px-6 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {isSubmitting ? 'Confirming Deletion...' : 'Confirm & Submit Deletion Request'}
                      </button>
                      
                      <button
                        type="button"
                        onClick={resetForm}
                        className="w-full py-2.5 text-xs text-slate-500 hover:text-slate-800"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

              </div>
            )}

            {/* Data Deletion Policy Guide */}
            <section className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#06684F]" />
                WorkLogy Data Deletion & Retention Standard
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600">
                <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl space-y-1.5">
                  <strong className="text-emerald-950 font-bold block">What Data Gets Permanently Deleted</strong>
                  <ul className="space-y-1 list-disc list-inside text-slate-700">
                    <li>Personal profile credentials & photographs</li>
                    <li>Saved delivery & service addresses</li>
                    <li>Public trade portfolio & catalog listings (Vendors)</li>
                    <li>In-app communication chats and direct messaging logs</li>
                    <li>Mobile device push notification tokens</li>
                  </ul>
                </div>

                <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-2xl space-y-1.5">
                  <strong className="text-amber-950 font-bold block">What Data Must Be Retained by Law</strong>
                  <ul className="space-y-1 list-disc list-inside text-slate-700">
                    <li>Financial tax ledgers & GST invoices (8 years mandatory under Indian IT Act)</li>
                    <li>Completed escrow transaction IDs & payment references</li>
                    <li>Resolved arbitration records for statutory dispute limitation</li>
                    <li>Audit security logs for fraud prevention</li>
                  </ul>
                </div>
              </div>
            </section>

          </div>
        )}

        {/* TAB 2: TRACK STATUS */}
        {activeTab === 'track' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-10 shadow-xs space-y-6">
              <div className="max-w-md">
                <h2 className="text-lg font-bold text-slate-900">Check Deletion Request Status</h2>
                <p className="text-xs text-slate-600 mt-1">
                  Enter your Deletion Reference ID and registered mobile number to securely view the current status of your request.
                </p>
              </div>

              {trackError && (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-start gap-3 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <p>{trackError}</p>
                </div>
              )}

              <form onSubmit={handleTrackSubmit} className="space-y-4 max-w-lg">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Deletion Reference ID *
                  </label>
                  <input
                    type="text"
                    value={trackRefId}
                    onChange={(e) => setTrackRefId(e.target.value.toUpperCase())}
                    placeholder="e.g. DEL-738291"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-[#06684F]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Registered Mobile Number *
                  </label>
                  <div className="flex items-center rounded-xl border border-slate-200 overflow-hidden">
                    <span className="px-3 py-2.5 bg-slate-100 text-xs font-bold text-slate-600 border-r border-slate-200">🇮🇳 +91</span>
                    <input
                      type="tel"
                      maxLength={10}
                      value={trackPhone}
                      onChange={(e) => setTrackPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="e.g. 9876543210"
                      className="w-full px-3 py-2.5 text-xs font-medium text-slate-900 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isTracking}
                  className="px-6 py-3 rounded-xl bg-[#06684F] hover:bg-[#055742] text-white text-xs font-bold shadow-xs transition-all disabled:opacity-60 flex items-center gap-2 cursor-pointer"
                >
                  {isTracking ? (
                    <span>Looking up status...</span>
                  ) : (
                    <>
                      <Search className="w-3.5 h-3.5" />
                      <span>Check Status</span>
                    </>
                  )}
                </button>
              </form>

              {/* Tracking Result View */}
              {trackResult && (
                <div className="mt-6 pt-6 border-t border-slate-100 space-y-4">
                  <h3 className="text-sm font-bold text-slate-900">Request Details</h3>
                  
                  <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-[11px] text-slate-500 font-semibold uppercase">Reference ID</span>
                      <p className="font-mono font-bold text-slate-900 text-sm">{trackResult.referenceId}</p>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-500 font-semibold uppercase">Current Status</span>
                      <div className="mt-0.5">
                        {trackResult.status === 'request_received' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[11px]">
                            Request Received
                          </span>
                        )}
                        {trackResult.status === 'under_review' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-bold text-[11px]">
                            Under Review
                          </span>
                        )}
                        {trackResult.status === 'processing' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-bold text-[11px]">
                            Processing
                          </span>
                        )}
                        {trackResult.status === 'completed' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px]">
                            Completed
                          </span>
                        )}
                        {trackResult.status === 'rejected' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[11px]">
                            Rejected
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-500 font-semibold uppercase">Account Role</span>
                      <p className="font-bold text-slate-900 capitalize">{trackResult.role}</p>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-500 font-semibold uppercase">Submitted On</span>
                      <p className="font-medium text-slate-700">{new Date(trackResult.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>

                    <div className="sm:col-span-2 pt-2 border-t border-slate-200/60">
                      <span className="text-[11px] text-slate-500 font-semibold uppercase">Scheduled Permanent Deletion</span>
                      <p className="font-medium text-slate-800">
                        {new Date(trackResult.scheduledDeletionDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} (30-day statutory grace period)
                      </p>
                    </div>

                    {trackResult.rejectionReason && (
                      <div className="sm:col-span-2 pt-2 border-t border-slate-200/60 text-rose-700">
                        <span className="text-[11px] font-semibold uppercase">Rejection Reason</span>
                        <p className="font-medium">{trackResult.rejectionReason}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer Support Info */}
        <div className="mt-8 text-center text-xs text-slate-500 space-y-1">
          <p>
            Have questions about your data rights? Contact our Data Protection Officer at{' '}
            <a href="mailto:privacy@worklogy.com" className="font-bold text-[#06684F] hover:underline">
              privacy@worklogy.com
            </a>
          </p>
          <div className="flex justify-center gap-4 pt-2">
            <Link to="/privacy" className="hover:text-slate-700 hover:underline">Customer Privacy Policy</Link>
            <span>•</span>
            <Link to="/vendor-privacy" className="hover:text-slate-700 hover:underline">Vendor Privacy Policy</Link>
            <span>•</span>
            <Link to="/terms" className="hover:text-slate-700 hover:underline">Terms of Service</Link>
          </div>
        </div>

      </div>
    </div>
  );
}

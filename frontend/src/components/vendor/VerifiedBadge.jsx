import React from 'react';
import { ShieldCheck, Clock, AlertCircle, AlertTriangle, XCircle } from 'lucide-react';

export default function VerifiedBadge({ status = 'verified', size = 'sm', className = '' }) {
  const normalized = String(status || '').toLowerCase().trim();

  const iconSizes = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4'
  };

  const textSizes = {
    xs: 'text-[9px] px-1.5 py-0.5 tracking-wider font-semibold',
    sm: 'text-[10px] px-2 py-0.5 font-bold tracking-wide',
    md: 'text-xs px-2.5 py-1 font-bold',
    lg: 'text-xs px-3 py-1 font-bold'
  };

  const iconCls = iconSizes[size] || iconSizes.sm;
  const textCls = textSizes[size] || textSizes.sm;

  if (normalized === 'verified' || normalized === 'approved') {
    return (
      <span
        title="Admin-Verified Identity & Trade Professional"
        className={`inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold shadow-2xs ${textCls} ${className}`}
      >
        <ShieldCheck className={`${iconCls} text-emerald-700 shrink-0`} />
        <span>VERIFIED PRO</span>
      </span>
    );
  }

  if (normalized === 'pending' || normalized === 'pending_review') {
    return (
      <span
        title="Identity documents submitted and awaiting administrative review"
        className={`inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-800 border border-amber-300 font-semibold ${textCls} ${className}`}
      >
        <Clock className={`${iconCls} text-amber-600 shrink-0`} />
        <span>PENDING REVIEW</span>
      </span>
    );
  }

  if (normalized === 'under_review') {
    return (
      <span
        title="Verification is actively being inspected by compliance team"
        className={`inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-800 border border-blue-300 font-semibold ${textCls} ${className}`}
      >
        <Clock className={`${iconCls} text-blue-600 shrink-0`} />
        <span>UNDER REVIEW</span>
      </span>
    );
  }

  if (normalized === 'changes_required') {
    return (
      <span
        title="Review completed: Additional documents or corrections requested"
        className={`inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-900 border border-amber-300 font-semibold ${textCls} ${className}`}
      >
        <AlertTriangle className={`${iconCls} text-amber-700 shrink-0`} />
        <span>CHANGES REQUIRED</span>
      </span>
    );
  }

  if (normalized === 'rejected') {
    return (
      <span
        title="Identity verification was not approved"
        className={`inline-flex items-center gap-1 rounded-full bg-rose-50 text-rose-800 border border-rose-300 font-semibold ${textCls} ${className}`}
      >
        <XCircle className={`${iconCls} text-rose-600 shrink-0`} />
        <span>NOT APPROVED</span>
      </span>
    );
  }

  if (normalized === 'expired') {
    return (
      <span
        title="Verification validity has expired and requires renewal"
        className={`inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-700 border border-slate-300 font-medium ${textCls} ${className}`}
      >
        <Clock className={`${iconCls} text-slate-500 shrink-0`} />
        <span>EXPIRED</span>
      </span>
    );
  }

  return (
    <span
      title="Identity verification has not been completed"
      className={`inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-medium ${textCls} ${className}`}
    >
      <AlertCircle className={`${iconCls} text-slate-400 shrink-0`} />
      <span>NOT VERIFIED</span>
    </span>
  );
}

import React from 'react';
import { Star, Clock, Check, X } from 'lucide-react';
import Button from '../common/Button';
import VerifiedBadge from '../vendor/VerifiedBadge';
import { formatCurrency } from '../../utils/formatters';

export default function ProposalCard({ proposal, onAccept, onDecline }) {
  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 hover:border-emerald-700/40 transition">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <img
            src={proposal.vendor?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'}
            alt={proposal.vendor?.name}
            className="w-12 h-12 rounded-xl object-cover ring-2 ring-slate-100"
          />
          <div>
            <h4 className="font-bold text-slate-900 text-base leading-tight">{proposal.vendor?.name}</h4>
            <div className="flex items-center gap-2 mt-1">
              <VerifiedBadge status="verified" />
              <div className="flex items-center gap-1 text-xs text-amber-600 font-semibold">
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>4.9</span>
              </div>
            </div>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-medium">Professional's Price</span>
          <span className="text-lg font-black text-emerald-800">{formatCurrency(proposal.proposedAmount)}</span>
        </div>
      </div>

      <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 mb-4">
        <p className="text-xs text-slate-700 leading-relaxed italic">
          "{proposal.coverLetter}"
        </p>
        <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-500">
          <Clock className="w-3.5 h-3.5 text-blue-600" />
          <span>Estimated timeline: {proposal.estimatedDuration || '1-2 days'}</span>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => onDecline(proposal._id)} icon={X}>
          Decline
        </Button>
        <Button variant="primary" size="sm" onClick={() => onAccept(proposal._id)} icon={Check}>
          Accept Offer
        </Button>
      </div>
    </div>
  );
}

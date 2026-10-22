import React from 'react';
import { Check, Clock, AlertCircle } from 'lucide-react';

/**
 * JobStatusTracker
 * Renders the 4 clear steps of customer job progress:
 * 1. Request Sent
 * 2. Professional Assigned
 * 3. Work in Progress
 * 4. Work Completed
 *
 * Uses the WorkLogy green-and-white theme with responsive mobile layout.
 */
export default function JobStatusTracker({ status = 'open' }) {
  const steps = [
    { key: 'request_sent', label: 'Request Sent' },
    { key: 'pro_assigned', label: 'Professional Assigned' },
    { key: 'in_progress', label: 'Work in Progress' },
    { key: 'completed', label: 'Work Completed' }
  ];

  // Map backend status to 0..3 index
  const getStepIndex = (st) => {
    switch (st) {
      case 'open':
      case 'pending_acceptance':
      case 'declined':
        return 0; // Request Sent

      case 'assigned':
      case 'confirmed':
      case 'scheduled':
      case 'awaiting_confirmation':
      case 'on_the_way':
      case 'arrived':
        return 1; // Professional Assigned

      case 'in_progress':
        return 2; // Work in Progress

      case 'completion_pending':
        // Professional marked finished, awaiting customer review
        return 2;

      case 'completed':
        return 3; // Work Completed

      case 'cancelled':
        return -1;

      default:
        return 0;
    }
  };

  const currentIndex = getStepIndex(status);
  const isCancelled = status === 'cancelled';
  const isCompletionPending = status === 'completion_pending';

  return (
    <div className="w-full bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs">
      <div className="flex items-center justify-between mb-5">
        <h4 className="text-xs uppercase font-bold tracking-wider text-slate-500">
          Job Progress
        </h4>

        {isCancelled ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5" />
            Cancelled
          </span>
        ) : isCompletionPending ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <Clock className="w-3.5 h-3.5 text-emerald-700" />
            Ready for Your Review
          </span>
        ) : status === 'completed' ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <Check className="w-3.5 h-3.5 text-emerald-700" />
            Completed & Verified
          </span>
        ) : (
          <span className="text-xs font-semibold text-emerald-800">
            Step {Math.max(1, currentIndex + 1)} of 4
          </span>
        )}
      </div>

      {isCancelled ? (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs sm:text-sm">
          <p className="font-bold">This job request was cancelled.</p>
          <p className="text-rose-700 mt-0.5">
            If payment was previously authorized, funds have been released back to your original payment method.
          </p>
        </div>
      ) : (
        <div className="relative pt-2 pb-1">
          {/* Connecting Track Line */}
          <div className="absolute top-[22px] sm:top-[26px] left-[10%] right-[10%] h-1 bg-slate-100 rounded-full z-0">
            <div
              className="h-full bg-emerald-700 rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, Math.max(0, (currentIndex / (steps.length - 1)) * 100))}%`
              }}
            />
          </div>

          {/* Stepper Dots & Labels */}
          <div className="grid grid-cols-4 relative z-10">
            {steps.map((step, idx) => {
              const isDone = idx < currentIndex || (idx === 3 && status === 'completed');
              const isCurrent = idx === currentIndex && status !== 'completed';
              const isPendingSignOff = idx === 2 && isCompletionPending;

              return (
                <div key={step.key} className="flex flex-col items-center text-center px-1">
                  {/* Step Bubble */}
                  <div
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-all shadow-2xs ${
                      isDone
                        ? 'bg-emerald-700 text-white ring-4 ring-emerald-50'
                        : isCurrent
                        ? 'bg-white border-2 border-emerald-700 text-emerald-800 ring-4 ring-emerald-100'
                        : 'bg-white border border-slate-300 text-slate-400'
                    }`}
                  >
                    {isDone ? (
                      <Check className="w-4 h-4 sm:w-5 sm:h-5 text-white stroke-[2.5]" />
                    ) : (
                      <span>{idx + 1}</span>
                    )}
                  </div>

                  {/* Step Label */}
                  <div className="mt-2.5">
                    <p
                      className={`text-[11px] sm:text-xs leading-tight transition-colors ${
                        isCurrent
                          ? 'font-bold text-emerald-900'
                          : isDone
                          ? 'font-semibold text-slate-800'
                          : 'font-medium text-slate-400'
                      }`}
                    >
                      {step.label}
                    </p>

                    {isCurrent && !isPendingSignOff && (
                      <span className="inline-block mt-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">
                        In Progress
                      </span>
                    )}

                    {isPendingSignOff && (
                      <span className="inline-block mt-1 text-[9px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                        Sign-Off Ready
                      </span>
                    )}

                    {isDone && (
                      <span className="inline-block mt-1 text-[9px] font-medium text-slate-500">
                        Completed
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

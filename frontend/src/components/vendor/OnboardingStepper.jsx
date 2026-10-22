import React from 'react';
import { Check } from 'lucide-react';

export default function OnboardingStepper({ currentStep = 1, steps = ['Business Profile', 'Trade Services', 'Coverage Area', 'License Upload'] }) {
  return (
    <div className="w-full py-4 mb-8">
      <div className="flex items-center justify-between relative">
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 -translate-y-1/2 z-0" />
        <div 
          className="absolute top-1/2 left-0 h-0.5 bg-emerald-700 -translate-y-1/2 z-0 transition-all duration-300" 
          style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
        />

        {steps.map((step, idx) => {
          const stepNum = idx + 1;
          const isDone = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;

          return (
            <div key={step} className="relative z-10 flex flex-col items-center">
              <div 
                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                  isDone 
                    ? 'bg-emerald-800 text-white ring-4 ring-white shadow-sm' 
                    : isCurrent 
                    ? 'bg-white border-2 border-emerald-800 text-emerald-800 ring-4 ring-emerald-100 shadow-sm' 
                    : 'bg-white border border-slate-300 text-slate-400'
                }`}
              >
                {isDone ? <Check className="w-4 h-4" /> : stepNum}
              </div>
              <span className={`text-[11px] mt-2 font-medium hidden sm:block whitespace-nowrap ${
                isCurrent ? 'text-emerald-800 font-bold' : isDone ? 'text-slate-700 font-medium' : 'text-slate-400'
              }`}>
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

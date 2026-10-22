import React from 'react';

export default function TypingIndicator({ name = 'Contractor' }) {
  return (
    <div className="flex items-center gap-2 p-2 px-3 text-xs text-slate-400 bg-slate-900/70 rounded-full w-fit border border-slate-800">
      <div className="flex space-x-1">
        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce"></div>
      </div>
      <span>{name} is typing...</span>
    </div>
  );
}

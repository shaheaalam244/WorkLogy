import React from 'react';
import { formatRelativeTime } from '../../utils/formatters';

export default function MessageBubble({ message, isOwn }) {
  return (
    <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} mb-3`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed ${
          isOwn
            ? 'bg-emerald-800 text-white rounded-br-none shadow-sm'
            : 'bg-white text-slate-800 rounded-bl-none border border-slate-200 shadow-sm'
        }`}
      >
        <p>{message.text}</p>
      </div>
      <span className="text-[10px] text-slate-500 mt-1 px-1">
        {formatRelativeTime(message.createdAt)}
      </span>
    </div>
  );
}

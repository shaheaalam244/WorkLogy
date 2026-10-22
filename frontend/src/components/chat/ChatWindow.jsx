import React, { useState } from 'react';
import { Send, Paperclip, Phone, Video } from 'lucide-react';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';

export default function ChatWindow({ conversation, messages = [], onSendMessage, currentUserId }) {
  const [text, setText] = useState('');

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSendMessage(text);
    setText('');
  };

  const otherUser = conversation?.participants?.find(p => p._id !== currentUserId) || {
    name: 'Verified Specialist',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl flex flex-col h-[600px] overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <div className="flex items-center gap-3">
          <img
            src={otherUser.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'}
            alt={otherUser.name}
            className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-600/30"
          />
          <div>
            <h3 className="font-bold text-slate-900 text-sm leading-tight">{otherUser.name}</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              <span className="text-[11px] text-emerald-800 font-semibold">Online & Verified</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition shadow-sm">
            <Phone className="w-4 h-4" />
          </button>
          <button className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition shadow-sm">
            <Video className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50/50">
        {messages.map((msg, idx) => (
          <MessageBubble
            key={msg._id || idx}
            message={msg}
            isOwn={msg.sender?._id === currentUserId || msg.sender === currentUserId}
          />
        ))}
      </div>

      {/* Input bar */}
      <form onSubmit={handleSend} className="p-3 border-t border-slate-200 bg-white flex items-center gap-2">
        <button
          type="button"
          className="p-2.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
        >
          <Paperclip className="w-4 h-4" />
        </button>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type your message or project note..."
          className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700"
        />
        <button
          type="submit"
          className="p-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold transition shadow-sm"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

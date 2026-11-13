import React, { useState, useEffect, useRef } from 'react';
import { X, Send } from 'lucide-react';
import { ChatMessage, UserProfile } from '../types';

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  currentUser: UserProfile;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  isOpen,
  onClose,
  messages,
  onSendMessage,
  currentUser,
}) => {
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSendMessage(input.trim());
    setInput('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 sm:top-0 sm:left-auto sm:right-0 sm:bottom-20 w-full sm:w-80 md:w-96 bg-white sm:border-l border-slate-200 shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-white">
        <h3 className="text-base font-semibold text-slate-800">In-call messages</h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-full text-slate-500 hover:bg-slate-100 transition active:scale-95"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-3 bg-slate-50 border-b border-slate-100 text-xs text-slate-500">
        Messages are seen in real time by everyone in the call.
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        {messages.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-400">
            No messages yet. Send a message to start the conversation!
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.sender_id === currentUser.id;
            const timeStr = new Date(m.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}>
                <div className="flex items-baseline gap-2">
                  <span className="text-[11px] font-semibold text-slate-700">
                    {isMe ? 'You' : m.sender_name}
                  </span>
                  <span className="text-[10px] text-slate-400">{timeStr}</span>
                </div>
                <div
                  className={`text-sm px-3.5 py-2 rounded-2xl max-w-[85%] break-words shadow-sm ${
                    isMe
                      ? 'bg-erise-600 text-white rounded-br-xs'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {/* Send Input with mobile keyboard friendly padding */}
      <form onSubmit={handleSend} className="p-3 sm:p-4 border-t border-slate-200 bg-white pb-6 sm:pb-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Send a message to everyone"
            className="flex-1 px-4 py-2.5 text-sm bg-slate-100 rounded-full text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-erise-500"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="p-2.5 rounded-full bg-erise-500 text-white hover:bg-erise-600 disabled:opacity-40 transition active:scale-95 shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send } from 'lucide-react';
import { ChatMessage, UserProfile } from '../types';

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
  currentUser: UserProfile;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  isOpen,
  onClose,
  roomCode,
  currentUser,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      room_code: roomCode,
      sender_id: 'system',
      sender_name: 'E-RISE System',
      content: 'Welcome to E-RISE Meeting! Channel encryption: DTLS-SRTP enabled.',
      created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');

  if (!isOpen) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      room_code: roomCode,
      sender_id: currentUser.id,
      sender_name: currentUser.full_name,
      sender_avatar: currentUser.avatar_url,
      content: input.trim(),
      created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newMsg]);
    setInput('');
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 320, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 320, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed top-0 right-0 bottom-0 w-80 md:w-96 bg-erise-dark-850 border-l border-erise-700/50 shadow-2xl z-50 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-erise-700/40 bg-erise-dark-900">
          <div>
            <h3 className="text-base font-semibold text-white">In-Meeting Messages</h3>
            <p className="text-xs text-slate-400">Encrypted room broadcast</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-erise-dark-750 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => {
            const isMe = msg.sender_id === currentUser.id;
            const isSystem = msg.sender_id === 'system';

            if (isSystem) {
              return (
                <div key={msg.id} className="text-center my-2">
                  <span className="text-[11px] px-2.5 py-1 rounded-full bg-erise-500/10 text-erise-400 border border-erise-500/20">
                    {msg.content}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <img
                  src={msg.sender_avatar || 'https://api.dicebear.com/7.x/identicon/svg?seed=user'}
                  alt={msg.sender_name}
                  className="w-7 h-7 rounded-lg object-cover mt-0.5 bg-erise-dark-950"
                />
                <div
                  className={`max-w-[75%] rounded-2xl p-3 text-xs leading-relaxed ${
                    isMe
                      ? 'bg-erise-500 text-white rounded-tr-none shadow-md shadow-erise-500/20'
                      : 'bg-erise-dark-750 text-slate-100 rounded-tl-none border border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <span className={`font-semibold ${isMe ? 'text-erise-100' : 'text-slate-300'}`}>
                      {msg.sender_name}
                    </span>
                    <span className="text-[10px] text-slate-400 opacity-75">{msg.created_at}</span>
                  </div>
                  <p className="break-words">{msg.content}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Input Dock */}
        <form onSubmit={handleSend} className="p-3 border-t border-erise-700/40 bg-erise-dark-900">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Send message to everyone..."
              className="flex-1 px-3.5 py-2 text-xs bg-erise-dark-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-erise-500 transition"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="p-2 rounded-xl bg-erise-500 hover:bg-erise-600 text-white disabled:opacity-40 transition shadow"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </motion.div>
    </AnimatePresence>
  );
};

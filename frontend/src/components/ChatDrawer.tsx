import React, { useState, useEffect, useRef } from 'react';
import { X, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
  currentUser: UserProfile;
}

interface DBMessage {
  id: string;
  sender_id: string;
  sender_name?: string;
  content: string;
  created_at: string;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  isOpen,
  onClose,
  roomCode,
  currentUser,
}) => {
  const [messages, setMessages] = useState<DBMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Load chat messages dynamically from Supabase
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    async function fetchMessages() {
      try {
        // Find or check meeting_id
        const { data: meeting } = await supabase
          .from('meetings')
          .select('id')
          .eq('room_code', roomCode)
          .single();

        if (meeting?.id) {
          const { data: msgs } = await supabase
            .from('chat_messages')
            .select(`
              id,
              sender_id,
              content,
              created_at,
              profiles:sender_id (full_name)
            `)
            .eq('meeting_id', meeting.id)
            .order('created_at', { ascending: true });

          if (msgs && isMounted) {
            setMessages(
              msgs.map((m: any) => ({
                id: m.id,
                sender_id: m.sender_id,
                sender_name: m.profiles?.full_name || 'Participant',
                content: m.content,
                created_at: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              }))
            );
          }
        }
      } catch (err) {
        console.warn('Could not load chat history from DB:', err);
      }
    }

    fetchMessages();

    // Listen for live realtime chat inserts
    const channel = supabase
      .channel(`room-chat-${roomCode}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const newMsg = payload.new as any;
          setMessages((prev) => [
            ...prev,
            {
              id: newMsg.id,
              sender_id: newMsg.sender_id,
              sender_name: newMsg.sender_id === currentUser.id ? currentUser.full_name : 'Participant',
              content: newMsg.content,
              created_at: new Date(newMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [isOpen, roomCode, currentUser.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const content = input.trim();
    setInput('');
    setSending(true);

    try {
      // Find meeting id
      const { data: meeting } = await supabase
        .from('meetings')
        .select('id')
        .eq('room_code', roomCode)
        .single();

      if (meeting?.id) {
        // Register in Supabase database alongside meeting
        await supabase.from('chat_messages').insert({
          meeting_id: meeting.id,
          sender_id: currentUser.id,
          content,
        });
      } else {
        // Fallback local append if meeting not yet persisted
        setMessages((prev) => [
          ...prev,
          {
            id: 'msg-' + Date.now(),
            sender_id: currentUser.id,
            sender_name: currentUser.full_name,
            content,
            created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: 'msg-' + Date.now(),
          sender_id: currentUser.id,
          sender_name: currentUser.full_name,
          content,
          created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed top-0 right-0 bottom-20 w-80 md:w-96 bg-white border-l border-slate-200 shadow-2xl z-40 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100">
        <h3 className="text-base font-medium text-slate-800">In-call messages</h3>
        <button
          onClick={onClose}
          className="p-1 rounded-full text-slate-500 hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-3 bg-slate-50 border-b border-slate-100 text-xs text-slate-600">
        Messages can be seen only by people in the call and are saved alongside this meeting.
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            No messages yet. Send a message to start the conversation!
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.sender_id === currentUser.id;
            return (
              <div key={m.id} className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-semibold text-slate-800">
                    {isMe ? 'You' : m.sender_name}
                  </span>
                  <span className="text-[10px] text-slate-400">{m.created_at}</span>
                </div>
                <div className="text-sm text-slate-700 bg-slate-100 rounded-xl px-3 py-2 max-w-[90%] inline-block">
                  {m.content}
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {/* Send Input */}
      <form onSubmit={handleSend} className="p-3 border-t border-slate-200 bg-white">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Send a message to everyone"
            className="flex-1 px-3.5 py-2 text-sm bg-slate-100 rounded-full text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-erise-500"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="p-2 rounded-full text-erise-600 hover:bg-erise-50 disabled:text-slate-300 transition"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};

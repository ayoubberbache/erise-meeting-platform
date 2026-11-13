import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Video, Key, Sparkles } from 'lucide-react';

interface CreateMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (title: string, roomCode: string, maxParticipants: number) => void;
  onJoin: (roomCode: string) => void;
}

export const CreateMeetingModal: React.FC<CreateMeetingModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  onJoin,
}) => {
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [title, setTitle] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [maxParticipants, setMaxParticipants] = useState<number>(10);

  if (!isOpen) return null;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = title.trim() || 'E-RISE Broadcast Meeting';
    const finalCode = roomCode.trim() || `erise-${Math.random().toString(36).substring(2, 7)}`;
    onCreate(finalTitle, finalCode, maxParticipants);
    onClose();
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCode.trim()) {
      onJoin(joinCode.trim().toLowerCase());
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-md bg-erise-dark-800 border border-erise-700/50 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-erise-700/40 bg-erise-dark-850">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-erise-500/20 border border-erise-500/40 flex items-center justify-center">
                <Video className="w-5 h-5 text-erise-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">E-RISE Meeting Hub</h3>
                <p className="text-xs text-slate-400">Launch or connect to a live room</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-erise-dark-700 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mode Switcher */}
          <div className="flex p-1 m-6 mb-2 bg-erise-dark-900 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setTab('create')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
                tab === 'create'
                  ? 'bg-erise-500 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Start New Meeting
            </button>
            <button
              type="button"
              onClick={() => setTab('join')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
                tab === 'join'
                  ? 'bg-erise-500 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Join with Code
            </button>
          </div>

          {tab === 'create' ? (
            <form onSubmit={handleCreateSubmit} className="p-6 pt-2 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Meeting Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., E-RISE Tech Talk & Demo"
                  className="w-full px-3.5 py-2.5 text-sm bg-erise-dark-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-erise-500 transition"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Max Participants Capacity
                  </label>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-erise-500/20 text-erise-400 border border-erise-500/30">
                    {maxParticipants} persons
                  </span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="30"
                  step="1"
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(parseInt(e.target.value))}
                  className="w-full accent-erise-500 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                  <span>2 (1-on-1)</span>
                  <span className="text-erise-400 font-semibold">10 (Optimal Mesh)</span>
                  <span>30</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Only up to <strong>{maxParticipants} persons</strong> will be allowed into this meeting room.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Custom Room Code (Optional)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value)}
                    placeholder="e.g., erise-sync"
                    className="w-full px-3.5 py-2.5 text-sm bg-erise-dark-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-erise-500 transition font-mono"
                  />
                  <div className="absolute right-3 top-2.5 text-slate-500 pointer-events-none">
                    <Key className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl bg-erise-500 hover:bg-erise-600 text-white font-semibold text-sm shadow-lg shadow-erise-500/25 transition flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Launch Meeting Room
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleJoinSubmit} className="p-6 pt-2 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Meeting Code
                </label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="Enter code (e.g., erise-sync-abc)"
                  required
                  className="w-full px-3.5 py-2.5 text-sm bg-erise-dark-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-erise-500 transition font-mono"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl bg-erise-500 hover:bg-erise-600 text-white font-semibold text-sm shadow-lg shadow-erise-500/25 transition flex items-center justify-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  Join Room
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, MicOff, Video, VideoOff, Monitor, Hand, Crown } from 'lucide-react';
import { Participant } from '../types';

interface ParticipantsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  participants: Participant[];
  maxParticipants: number;
  isHostUser: boolean;
  onMuteParticipant: (userId: string, mute: boolean) => void;
  onStopCamera: (userId: string) => void;
  onStopScreen: (userId: string) => void;
  onLowerHand: (userId: string) => void;
}

export const ParticipantsDrawer: React.FC<ParticipantsDrawerProps> = ({
  isOpen,
  onClose,
  participants,
  maxParticipants,
  isHostUser,
  onMuteParticipant,
  onStopCamera,
  onStopScreen,
  onLowerHand,
}) => {
  if (!isOpen) return null;

  const raisedHands = participants.filter((p) => p.raised_hand);

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
            <h3 className="text-base font-semibold text-white">Participants</h3>
            <p className="text-xs text-erise-400">
              {participants.length} of {maxParticipants} in room
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-erise-dark-750 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Raised Hands Priority Queue */}
          {raisedHands.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
                <Hand className="w-4 h-4 animate-bounce" />
                <span>Hands Raised ({raisedHands.length})</span>
              </div>
              <div className="space-y-1.5">
                {raisedHands.map((p) => (
                  <div
                    key={p.user_id}
                    className="flex items-center justify-between p-2 rounded-lg bg-erise-dark-900/80 border border-amber-500/20"
                  >
                    <div className="flex items-center gap-2">
                      <img
                        src={p.avatar_url || 'https://api.dicebear.com/7.x/identicon/svg?seed=user'}
                        alt={p.full_name}
                        className="w-7 h-7 rounded-full object-cover"
                      />
                      <span className="text-xs font-medium text-slate-200 truncate max-w-[120px]">
                        {p.full_name}
                      </span>
                    </div>
                    {isHostUser && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onMuteParticipant(p.user_id, false)}
                          className="px-2 py-1 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded transition"
                        >
                          Allow Mic
                        </button>
                        <button
                          onClick={() => onLowerHand(p.user_id)}
                          className="px-2 py-1 text-[11px] font-semibold bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition"
                        >
                          Lower
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Participants List */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              In Meeting ({participants.length})
            </div>
            <div className="space-y-2">
              {participants.map((p) => (
                <div
                  key={p.user_id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-erise-dark-900/60 border border-slate-800 hover:border-erise-600/40 transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        src={p.avatar_url || 'https://api.dicebear.com/7.x/identicon/svg?seed=user'}
                        alt={p.full_name}
                        className="w-9 h-9 rounded-xl object-cover bg-erise-dark-950"
                      />
                      {p.role === 'host' && (
                        <div className="absolute -top-1 -right-1 p-0.5 rounded-full bg-amber-500 text-white">
                          <Crown className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-slate-200 truncate max-w-[130px]">
                          {p.full_name}
                        </span>
                        {p.is_local && (
                          <span className="text-[10px] text-erise-400 font-bold bg-erise-500/10 px-1 rounded">
                            YOU
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 capitalize">
                        {p.role} {p.raised_hand && '• Hand raised'}
                      </span>
                    </div>
                  </div>

                  {/* Status & Host Actions */}
                  <div className="flex items-center gap-1">
                    {/* Mic indicator */}
                    <div
                      className={`p-1.5 rounded-lg ${
                        p.is_muted ? 'text-rose-400 bg-rose-500/10' : 'text-emerald-400 bg-emerald-500/10'
                      }`}
                    >
                      {p.is_muted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    </div>

                    {/* Camera indicator */}
                    <div
                      className={`p-1.5 rounded-lg ${
                        p.is_camera_off ? 'text-slate-500 bg-slate-800' : 'text-erise-400 bg-erise-500/10'
                      }`}
                    >
                      {p.is_camera_off ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
                    </div>

                    {/* Host Moderation Controls for this user */}
                    {isHostUser && !p.is_local && (
                      <div className="flex items-center gap-1 pl-1 border-l border-slate-700/60 ml-1">
                        <button
                          onClick={() => onMuteParticipant(p.user_id, !p.is_muted)}
                          title={p.is_muted ? 'Unmute' : 'Mute'}
                          className={`p-1.5 rounded-lg text-xs transition ${
                            p.is_muted ? 'hover:bg-emerald-500/20 text-emerald-400' : 'hover:bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {p.is_muted ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => onStopCamera(p.user_id)}
                          title="Turn off camera"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition"
                        >
                          <VideoOff className="w-3.5 h-3.5" />
                        </button>
                        {p.is_screen_sharing && (
                          <button
                            onClick={() => onStopScreen(p.user_id)}
                            title="Stop screen share"
                            className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-500/20 transition"
                          >
                            <Monitor className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

import React from 'react';
import { X, Mic, MicOff, VideoOff, Monitor, Hand, Crown } from 'lucide-react';
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
    <div className="fixed inset-0 sm:top-0 sm:left-auto sm:right-0 sm:bottom-20 w-full sm:w-80 md:w-96 bg-white sm:border-l border-slate-200 shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100">
        <div>
          <h3 className="text-base font-medium text-slate-800">People</h3>
          <p className="text-xs text-slate-500">
            {participants.length} in call &bull; {maxParticipants} max capacity
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-full text-slate-500 hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Raised Hands Priority Section */}
        {raisedHands.length > 0 && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
              <Hand className="w-4 h-4 text-amber-600" />
              <span>Raised hands ({raisedHands.length})</span>
            </div>
            <div className="space-y-1.5">
              {raisedHands.map((p) => (
                <div
                  key={p.user_id}
                  className="flex items-center justify-between p-2 rounded-lg bg-white border border-amber-200 text-xs"
                >
                  <span className="font-medium text-slate-800 truncate max-w-[130px]">
                    {p.full_name}
                  </span>
                  {isHostUser && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onMuteParticipant(p.user_id, false)}
                        className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium"
                      >
                        Ask to speak
                      </button>
                      <button
                        onClick={() => onLowerHand(p.user_id)}
                        className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200"
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
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            In Call ({participants.length})
          </div>
          <div className="space-y-2">
            {participants.map((p) => (
              <div
                key={p.user_id}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={p.avatar_url || 'https://api.dicebear.com/7.x/identicon/svg?seed=user'}
                      alt={p.full_name}
                      className="w-9 h-9 rounded-full object-cover border border-slate-200"
                    />
                    {p.role === 'host' && (
                      <div className="absolute -top-1 -right-1 p-0.5 rounded-full bg-amber-500 text-white">
                        <Crown className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-slate-800 truncate max-w-[130px]">
                        {p.full_name}
                      </span>
                      {p.is_local && (
                        <span className="text-[10px] text-slate-500 font-normal">
                          (You)
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 capitalize">
                      {p.role} {p.raised_hand && '• Hand raised'}
                    </span>
                  </div>
                </div>

                {/* Status indicators and Host controls */}
                <div className="flex items-center gap-1.5">
                  <div
                    className={`p-1.5 rounded-full ${
                      p.is_muted ? 'text-rose-500 bg-rose-50' : 'text-slate-600 bg-slate-100'
                    }`}
                  >
                    {p.is_muted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  </div>

                  {isHostUser && !p.is_local && (
                    <div className="flex items-center gap-1 pl-1">
                      <button
                        onClick={() => onMuteParticipant(p.user_id, !p.is_muted)}
                        title={p.is_muted ? 'Unmute' : 'Mute'}
                        className="p-1.5 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
                      >
                        {p.is_muted ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => onStopCamera(p.user_id)}
                        title="Turn off camera"
                        className="p-1.5 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
                      >
                        <VideoOff className="w-3.5 h-3.5" />
                      </button>
                      {p.is_screen_sharing && (
                        <button
                          onClick={() => onStopScreen(p.user_id)}
                          title="Stop screen share"
                          className="p-1.5 rounded-full text-amber-600 hover:bg-amber-50 transition"
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
    </div>
  );
};

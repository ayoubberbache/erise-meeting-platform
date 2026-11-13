import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Hand, Crown, Monitor, User } from 'lucide-react';
import { Participant } from '../types';

interface VideoTileProps {
  participant: Participant;
  isHostUser: boolean;
  onMuteParticipant?: (userId: string, mute: boolean) => void;
  onStopCamera?: (userId: string) => void;
  onStopScreen?: (userId: string) => void;
  onLowerHand?: (userId: string) => void;
}

export const VideoTile: React.FC<VideoTileProps> = ({
  participant,
  isHostUser,
  onMuteParticipant,
  onStopCamera,
  onStopScreen,
  onLowerHand,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
    }
  }, [participant.stream]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.25 }}
      className={`relative rounded-2xl overflow-hidden bg-erise-dark-850 border transition-all duration-300 aspect-video flex items-center justify-center group ${
        participant.raised_hand
          ? 'hand-raised-glow border-amber-500'
          : 'border-slate-800/80 hover:border-erise-500/40 shadow-xl'
      }`}
    >
      {/* Video stream or Avatar placeholder */}
      {!participant.is_camera_off && participant.stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={participant.is_local} // Mute self to prevent acoustic echo
          className={`w-full h-full object-cover ${
            participant.is_local && !participant.is_screen_sharing ? '-scale-x-100' : ''
          }`}
        />
      ) : (
        <div className="flex flex-col items-center justify-center p-4">
          <div className="relative">
            <img
              src={participant.avatar_url || 'https://api.dicebear.com/7.x/identicon/svg?seed=user'}
              alt={participant.full_name}
              className="w-20 h-20 md:w-24 md:h-24 rounded-full border-2 border-erise-500/50 object-cover shadow-2xl bg-erise-dark-900"
            />
            {participant.role === 'host' && (
              <div className="absolute -bottom-1 -right-1 p-1.5 bg-amber-500 rounded-full text-white shadow">
                <Crown className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
          <span className="mt-3 text-sm font-medium text-slate-300 max-w-[150px] truncate">
            {participant.full_name}
          </span>
        </div>
      )}

      {/* Screen Sharing Badge Overlay */}
      {participant.is_screen_sharing && (
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-erise-500/90 backdrop-blur-md text-white text-xs font-semibold shadow">
          <Monitor className="w-3.5 h-3.5" />
          <span>Screen Sharing</span>
        </div>
      )}

      {/* Raised Hand Alert Badge */}
      {participant.raised_hand && (
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500 text-slate-950 text-xs font-bold shadow-lg"
        >
          <Hand className="w-4 h-4 animate-bounce" />
          <span>Raised Hand</span>
          {isHostUser && onLowerHand && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLowerHand(participant.user_id);
              }}
              title="Lower hand"
              className="ml-1 px-1.5 py-0.5 rounded bg-black/20 hover:bg-black/40 text-[10px] text-white"
            >
              Lower
            </button>
          )}
        </motion.div>
      )}

      {/* Bottom info bar */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white text-xs font-medium">
          {participant.role === 'host' && <Crown className="w-3.5 h-3.5 text-amber-400" />}
          <span className="truncate max-w-[120px] md:max-w-[200px]">
            {participant.full_name} {participant.is_local && '(You)'}
          </span>
        </div>

        {/* Mic Status */}
        <div
          className={`p-1.5 rounded-lg backdrop-blur-md ${
            participant.is_muted ? 'bg-rose-500/80 text-white' : 'bg-black/60 text-emerald-400'
          }`}
        >
          {participant.is_muted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
        </div>
      </div>

      {/* Host Quick Hover Moderation Bar */}
      {isHostUser && !participant.is_local && (
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 bg-black/80 backdrop-blur-md p-1.5 rounded-xl border border-white/10 z-20">
          <button
            onClick={() => onMuteParticipant?.(participant.user_id, !participant.is_muted)}
            title={participant.is_muted ? 'Ask to Unmute' : 'Mute Participant'}
            className={`p-1.5 rounded-lg transition ${
              participant.is_muted
                ? 'bg-emerald-500/30 text-emerald-300 hover:bg-emerald-500/50'
                : 'bg-rose-500/30 text-rose-300 hover:bg-rose-500/50'
            }`}
          >
            {participant.is_muted ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => onStopCamera?.(participant.user_id)}
            title="Turn Off Camera"
            className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition"
          >
            <User className="w-3.5 h-3.5" />
          </button>

          {participant.is_screen_sharing && (
            <button
              onClick={() => onStopScreen?.(participant.user_id)}
              title="Stop Screen Share"
              className="p-1.5 rounded-lg bg-amber-500/30 text-amber-300 hover:bg-amber-500/50 transition"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
};

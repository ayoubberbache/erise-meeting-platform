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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Dynamic ref callback to immediately attach stream upon DOM node creation
  const setVideoRef = (el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el && participant.stream) {
      if (el.srcObject !== participant.stream) {
        el.srcObject = participant.stream;
      }
      el.play().catch(() => {});
    }
  };

  const setAudioRef = (el: HTMLAudioElement | null) => {
    audioRef.current = el;
    if (el && participant.stream && !participant.is_local) {
      if (el.srcObject !== participant.stream) {
        el.srcObject = participant.stream;
      }
      el.play().catch(() => {});
    }
  };

  // Re-synchronize when stream or camera state updates
  useEffect(() => {
    if (videoRef.current && participant.stream) {
      if (videoRef.current.srcObject !== participant.stream) {
        videoRef.current.srcObject = participant.stream;
      }
      videoRef.current.play().catch(() => {});
    }

    if (audioRef.current && participant.stream && !participant.is_local) {
      if (audioRef.current.srcObject !== participant.stream) {
        audioRef.current.srcObject = participant.stream;
      }
      audioRef.current.play().catch(() => {});
    }
  }, [participant.stream, participant.is_camera_off, participant.is_local]);

  const hasVideoStream = !participant.is_camera_off && Boolean(participant.stream);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`relative rounded-xl sm:rounded-2xl overflow-hidden bg-[#2d2e30] border transition-all duration-200 aspect-video flex items-center justify-center group ${
        participant.raised_hand
          ? 'ring-2 ring-amber-400 border-amber-400'
          : 'border-white/10 hover:border-white/20 shadow-lg'
      }`}
    >
      {/* Dedicated audio element for remote participants - guarantees audio plays even if camera is off! */}
      {!participant.is_local && participant.stream && (
        <audio
          ref={setAudioRef}
          autoPlay
          playsInline
        />
      )}

      {/* Video stream or Avatar placeholder */}
      {hasVideoStream ? (
        <video
          ref={setVideoRef}
          autoPlay
          playsInline
          muted={participant.is_local} // Mute self to prevent acoustic echo
          className={`w-full h-full object-cover bg-black ${
            participant.is_local && !participant.is_screen_sharing ? '-scale-x-100' : ''
          }`}
        />
      ) : (
        <div className="flex flex-col items-center justify-center p-2 sm:p-4">
          <div className="relative">
            <img
              src={participant.avatar_url || 'https://api.dicebear.com/7.x/identicon/svg?seed=user'}
              alt={participant.full_name}
              className="w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full border-2 border-white/20 object-cover shadow-xl bg-slate-800"
            />
            {participant.role === 'host' && (
              <div className="absolute -bottom-1 -right-1 p-1 sm:p-1.5 bg-amber-500 rounded-full text-white shadow">
                <Crown className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </div>
            )}
          </div>
          <span className="mt-2 sm:mt-3 text-xs sm:text-sm font-medium text-slate-200 max-w-[120px] sm:max-w-[150px] truncate text-center">
            {participant.full_name}
          </span>
        </div>
      )}

      {/* Screen Sharing Badge Overlay */}
      {participant.is_screen_sharing && (
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-erise-600/90 backdrop-blur-md text-white text-[10px] sm:text-xs font-semibold shadow">
          <Monitor className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          <span>Screen Sharing</span>
        </div>
      )}

      {/* Raised Hand Alert Badge */}
      {participant.raised_hand && (
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="absolute top-2 right-2 sm:top-3 sm:right-3 flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 rounded-full bg-amber-400 text-slate-950 text-[10px] sm:text-xs font-bold shadow-lg"
        >
          <Hand className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-bounce" />
          <span>Raised</span>
          {isHostUser && onLowerHand && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLowerHand(participant.user_id);
              }}
              title="Lower hand"
              className="ml-1 px-1.5 py-0.5 rounded bg-black/20 hover:bg-black/40 text-[9px] sm:text-[10px] text-white"
            >
              Lower
            </button>
          )}
        </motion.div>
      )}

      {/* Bottom info bar */}
      <div className="absolute bottom-2 left-2 right-2 sm:bottom-3 sm:left-3 sm:right-3 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-1.5 sm:gap-2 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-black/60 backdrop-blur-md text-white text-[11px] sm:text-xs font-medium">
          {participant.role === 'host' && <Crown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 shrink-0" />}
          <span className="truncate max-w-[90px] sm:max-w-[150px] md:max-w-[200px]">
            {participant.full_name} {participant.is_local && '(You)'}
          </span>
        </div>

        {/* Mic Status */}
        <div
          className={`p-1 sm:p-1.5 rounded-lg backdrop-blur-md shrink-0 ${
            participant.is_muted ? 'bg-rose-500/90 text-white' : 'bg-black/60 text-emerald-400'
          }`}
        >
          {participant.is_muted ? <MicOff className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <Mic className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
        </div>
      </div>

      {/* Host Quick Hover Moderation Bar (Desktop only) */}
      {isHostUser && !participant.is_local && (
        <div className="hidden sm:flex absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity items-center gap-1.5 bg-black/80 backdrop-blur-md p-1.5 rounded-xl border border-white/10 z-20">
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

import React from 'react';
import { motion } from 'framer-motion';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  Hand,
  Users,
  MessageSquare,
  PhoneOff,
  ShieldAlert,
  Lock,
} from 'lucide-react';

interface ControlsDockProps {
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
  participantsCount: number;
  maxParticipants: number;
  raisedHandsCount: number;
  isChatOpen: boolean;
  isParticipantsOpen: boolean;
  isHost: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onToggleHandRaise: () => void;
  onToggleChat: () => void;
  onToggleParticipants: () => void;
  onLeaveMeeting: () => void;
  onMuteAll?: () => void;
  onToggleLock?: () => void;
  isLocked?: boolean;
}

export const ControlsDock: React.FC<ControlsDockProps> = ({
  isMuted,
  isCameraOff,
  isScreenSharing,
  isHandRaised,
  participantsCount,
  maxParticipants,
  raisedHandsCount,
  isChatOpen,
  isParticipantsOpen,
  isHost,
  onToggleMute,
  onToggleCamera,
  onToggleScreenShare,
  onToggleHandRaise,
  onToggleChat,
  onToggleParticipants,
  onLeaveMeeting,
  onMuteAll,
  onToggleLock,
  isLocked,
}) => {
  return (
    <motion.div
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 md:gap-3 px-4 py-2.5 rounded-2xl glass-panel-glow shadow-2xl border border-erise-600/30"
    >
      {/* Mic Control */}
      <button
        onClick={onToggleMute}
        title={isMuted ? 'Unmute (Ctrl+D)' : 'Mute (Ctrl+D)'}
        className={`p-3 rounded-xl transition duration-200 flex items-center justify-center ${
          isMuted
            ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20'
            : 'bg-erise-dark-700 hover:bg-erise-dark-600 text-slate-100 hover:text-white'
        }`}
      >
        {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
      </button>

      {/* Camera Control */}
      <button
        onClick={onToggleCamera}
        title={isCameraOff ? 'Turn on camera (Ctrl+E)' : 'Turn off camera (Ctrl+E)'}
        className={`p-3 rounded-xl transition duration-200 flex items-center justify-center ${
          isCameraOff
            ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20'
            : 'bg-erise-dark-700 hover:bg-erise-dark-600 text-slate-100 hover:text-white'
        }`}
      >
        {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
      </button>

      {/* Screen Share Control */}
      <button
        onClick={onToggleScreenShare}
        title={isScreenSharing ? 'Stop sharing screen' : 'Share entire screen or window'}
        className={`p-3 rounded-xl transition duration-200 flex items-center justify-center ${
          isScreenSharing
            ? 'bg-erise-500 hover:bg-erise-600 text-white shadow-lg shadow-erise-500/25 ring-2 ring-erise-400'
            : 'bg-erise-dark-700 hover:bg-erise-dark-600 text-slate-100 hover:text-white'
        }`}
      >
        {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
      </button>

      {/* Raise Hand Button */}
      <button
        onClick={onToggleHandRaise}
        title={isHandRaised ? 'Lower hand' : 'Raise hand (Ask to speak)'}
        className={`relative p-3 rounded-xl transition duration-200 flex items-center justify-center ${
          isHandRaised
            ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-lg shadow-amber-500/30 ring-2 ring-amber-300'
            : 'bg-erise-dark-700 hover:bg-erise-dark-600 text-slate-100 hover:text-white'
        }`}
      >
        <Hand className={`w-5 h-5 ${isHandRaised ? 'animate-bounce' : ''}`} />
      </button>

      <div className="h-6 w-px bg-slate-700/60 mx-1" />

      {/* Participants Drawer Button */}
      <button
        onClick={onToggleParticipants}
        title="View participants"
        className={`relative p-3 rounded-xl transition duration-200 flex items-center justify-center ${
          isParticipantsOpen
            ? 'bg-erise-500 text-white'
            : 'bg-erise-dark-700 hover:bg-erise-dark-600 text-slate-100'
        }`}
      >
        <Users className="w-5 h-5" />
        {/* Capacity badge */}
        <span className="absolute -top-1 -right-1 text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-900 border border-erise-500/50 text-erise-300">
          {participantsCount}/{maxParticipants}
        </span>
        {/* Hand alert pip */}
        {raisedHandsCount > 0 && (
          <span className="absolute -top-1 -left-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
          </span>
        )}
      </button>

      {/* Chat Drawer Button */}
      <button
        onClick={onToggleChat}
        title="In-meeting chat"
        className={`relative p-3 rounded-xl transition duration-200 flex items-center justify-center ${
          isChatOpen
            ? 'bg-erise-500 text-white'
            : 'bg-erise-dark-700 hover:bg-erise-dark-600 text-slate-100'
        }`}
      >
        <MessageSquare className="w-5 h-5" />
      </button>

      {/* Host Controls Toggle (If Host) */}
      {isHost && (
        <>
          <div className="h-6 w-px bg-slate-700/60 mx-1" />
          {onMuteAll && (
            <button
              onClick={onMuteAll}
              title="Mute all participants"
              className="p-3 rounded-xl bg-erise-dark-700 hover:bg-rose-500/20 hover:text-rose-400 text-slate-200 transition"
            >
              <ShieldAlert className="w-5 h-5" />
            </button>
          )}
          {onToggleLock && (
            <button
              onClick={onToggleLock}
              title={isLocked ? 'Unlock meeting' : 'Lock meeting (Block new entrants)'}
              className={`p-3 rounded-xl transition ${
                isLocked ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-erise-dark-700 text-slate-200'
              }`}
            >
              <Lock className="w-5 h-5" />
            </button>
          )}
        </>
      )}

      <div className="h-6 w-px bg-slate-700/60 mx-1" />

      {/* Leave / End Meeting Button */}
      <button
        onClick={onLeaveMeeting}
        title="Leave meeting"
        className="px-4 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm shadow-lg shadow-rose-600/30 flex items-center gap-2 transition"
      >
        <PhoneOff className="w-5 h-5" />
        <span className="hidden sm:inline">Leave</span>
      </button>
    </motion.div>
  );
};

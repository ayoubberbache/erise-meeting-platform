import React from 'react';
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
  Shield,
  Lock,
} from 'lucide-react';

interface ControlsDockProps {
  roomCode: string;
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
  participantsCount: number;
  maxParticipants: number;
  raisedHandsCount: number;
  unreadChatCount?: number;
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
  roomCode,
  isMuted,
  isCameraOff,
  isScreenSharing,
  isHandRaised,
  participantsCount,
  maxParticipants,
  raisedHandsCount,
  unreadChatCount = 0,
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
    <footer className="fixed bottom-0 left-0 right-0 h-16 sm:h-20 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-2 sm:px-6 flex items-center justify-between z-30 select-none">
      {/* Left: Meeting Details & Room Code (Desktop only) */}
      <div className="hidden md:flex items-center gap-3 text-slate-300">
        <span className="font-medium text-sm text-white tracking-wide">
          {roomCode}
        </span>
        <span className="text-xs text-slate-400 font-mono">
          &bull; {participantsCount} of {maxParticipants} in call
        </span>
      </div>

      {/* Main Controls Row (Responsive across Phone and Desktop) */}
      <div className="flex items-center justify-around sm:justify-center w-full md:w-auto gap-1.5 sm:gap-3">
        {/* Mic Button */}
        <button
          onClick={onToggleMute}
          title={isMuted ? 'Turn on microphone' : 'Turn off microphone'}
          className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition active:scale-95 ${
            isMuted
              ? 'bg-rose-600 text-white hover:bg-rose-700'
              : 'bg-slate-800 text-white hover:bg-slate-700'
          }`}
        >
          {isMuted ? <MicOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Mic className="w-4 h-4 sm:w-5 sm:h-5" />}
        </button>

        {/* Video Button */}
        <button
          onClick={onToggleCamera}
          title={isCameraOff ? 'Turn on camera' : 'Turn off camera'}
          className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition active:scale-95 ${
            isCameraOff
              ? 'bg-rose-600 text-white hover:bg-rose-700'
              : 'bg-slate-800 text-white hover:bg-slate-700'
          }`}
        >
          {isCameraOff ? <VideoOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Video className="w-4 h-4 sm:w-5 sm:h-5" />}
        </button>

        {/* Raise Hand Button */}
        <button
          onClick={onToggleHandRaise}
          title={isHandRaised ? 'Lower hand' : 'Raise hand'}
          className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition active:scale-95 ${
            isHandRaised
              ? 'bg-amber-500 text-slate-950 font-bold hover:bg-amber-600'
              : 'bg-slate-800 text-white hover:bg-slate-700'
          }`}
        >
          <Hand className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Screen Share (Present now) Button */}
        <button
          onClick={onToggleScreenShare}
          title={isScreenSharing ? 'Stop presenting' : 'Present screen'}
          className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition active:scale-95 ${
            isScreenSharing
              ? 'bg-erise-500 text-white hover:bg-erise-600'
              : 'bg-slate-800 text-white hover:bg-slate-700'
          }`}
        >
          {isScreenSharing ? <MonitorOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Monitor className="w-4 h-4 sm:w-5 sm:h-5" />}
        </button>

        {/* Chat Button (Mobile inline, desktop right) */}
        <button
          onClick={onToggleChat}
          title="In-call chat"
          className={`md:hidden relative w-10 h-10 rounded-full flex items-center justify-center transition active:scale-95 ${
            isChatOpen ? 'bg-erise-500/20 text-erise-400' : 'bg-slate-800 text-white hover:bg-slate-700'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          {unreadChatCount > 0 && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
              {unreadChatCount > 9 ? '9+' : unreadChatCount}
            </span>
          )}
        </button>

        {/* Participants Button (Mobile inline, desktop right) */}
        <button
          onClick={onToggleParticipants}
          title="People in call"
          className={`md:hidden relative w-10 h-10 rounded-full flex items-center justify-center transition active:scale-95 ${
            isParticipantsOpen ? 'bg-erise-500/20 text-erise-400' : 'bg-slate-800 text-white hover:bg-slate-700'
          }`}
        >
          <Users className="w-4 h-4" />
          {raisedHandsCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500" />
          )}
        </button>

        {/* Host Mute All Button (Desktop) */}
        {isHost && onMuteAll && (
          <button
            onClick={onMuteAll}
            title="Mute all participants"
            className="hidden sm:flex w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 items-center justify-center transition active:scale-95"
          >
            <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        )}

        {/* Leave / End Call Button */}
        <button
          onClick={onLeaveMeeting}
          title={isHost ? 'End or leave meeting' : 'Leave call'}
          className="px-4 sm:px-6 h-10 sm:h-11 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center gap-1.5 transition shadow-sm active:scale-95 shrink-0"
        >
          <PhoneOff className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="hidden sm:inline text-xs font-semibold">{isHost ? 'End' : 'Leave'}</span>
        </button>
      </div>

      {/* Right: Info, People, Chat Drawer Toggles (Desktop only) */}
      <div className="hidden md:flex items-center gap-2">
        {/* Lock toggle for host */}
        {isHost && onToggleLock && (
          <button
            onClick={onToggleLock}
            title={isLocked ? 'Room is locked' : 'Lock room'}
            className={`p-2.5 rounded-full transition ${
              isLocked ? 'text-amber-400 bg-amber-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Lock className="w-5 h-5" />
          </button>
        )}

        {/* Participants / People */}
        <button
          onClick={onToggleParticipants}
          title="People in call"
          className={`relative p-2.5 rounded-full transition ${
            isParticipantsOpen
              ? 'text-erise-400 bg-erise-500/20'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Users className="w-5 h-5" />
          {raisedHandsCount > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-amber-500" />
          )}
        </button>

        {/* Chat */}
        <button
          onClick={onToggleChat}
          title="In-call messages"
          className={`relative p-2.5 rounded-full transition ${
            isChatOpen
              ? 'text-erise-400 bg-erise-500/20'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          {unreadChatCount > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
          )}
        </button>
      </div>
    </footer>
  );
};

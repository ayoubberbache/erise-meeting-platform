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
    <footer className="fixed bottom-0 left-0 right-0 h-20 bg-slate-900 border-t border-slate-800 px-6 flex items-center justify-between z-30 select-none">
      {/* Left: Meeting Details & Room Code */}
      <div className="flex items-center gap-3 text-slate-300">
        <span className="font-medium text-sm text-white tracking-wide">
          {roomCode}
        </span>
        <span className="text-xs text-slate-400 font-mono hidden sm:inline">
          &bull; {participantsCount} of {maxParticipants} in call
        </span>
      </div>

      {/* Center: Google Meet Standard Circular Controls */}
      <div className="flex items-center gap-3">
        {/* Mic Button */}
        <button
          onClick={onToggleMute}
          title={isMuted ? 'Turn on microphone (Ctrl+D)' : 'Turn off microphone (Ctrl+D)'}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition ${
            isMuted
              ? 'bg-rose-600 text-white hover:bg-rose-700'
              : 'bg-slate-750 text-white hover:bg-slate-700 bg-slate-800'
          }`}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Video Button */}
        <button
          onClick={onToggleCamera}
          title={isCameraOff ? 'Turn on camera (Ctrl+E)' : 'Turn off camera (Ctrl+E)'}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition ${
            isCameraOff
              ? 'bg-rose-600 text-white hover:bg-rose-700'
              : 'bg-slate-800 text-white hover:bg-slate-700'
          }`}
        >
          {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
        </button>

        {/* Raise Hand Button */}
        <button
          onClick={onToggleHandRaise}
          title={isHandRaised ? 'Lower hand' : 'Raise hand'}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition ${
            isHandRaised
              ? 'bg-amber-500 text-slate-950 font-bold hover:bg-amber-600'
              : 'bg-slate-800 text-white hover:bg-slate-700'
          }`}
        >
          <Hand className="w-5 h-5" />
        </button>

        {/* Screen Share (Present now) Button */}
        <button
          onClick={onToggleScreenShare}
          title={isScreenSharing ? 'Stop presenting' : 'Present now'}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition ${
            isScreenSharing
              ? 'bg-erise-500 text-white hover:bg-erise-600'
              : 'bg-slate-800 text-white hover:bg-slate-700'
          }`}
        >
          {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
        </button>

        {/* Host Options / Mute all */}
        {isHost && onMuteAll && (
          <button
            onClick={onMuteAll}
            title="Mute all participants"
            className="w-11 h-11 rounded-full bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 flex items-center justify-center transition"
          >
            <Shield className="w-5 h-5" />
          </button>
        )}

        {/* Leave Call (Red Oval Button) */}
        <button
          onClick={onLeaveMeeting}
          title="Leave call"
          className="px-6 h-11 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center gap-2 transition ml-2 shadow-sm"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>

      {/* Right: Info, People, Chat Drawer Toggles */}
      <div className="flex items-center gap-2">
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
          className={`p-2.5 rounded-full transition ${
            isChatOpen
              ? 'text-erise-400 bg-erise-500/20'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <MessageSquare className="w-5 h-5" />
        </button>
      </div>
    </footer>
  );
};

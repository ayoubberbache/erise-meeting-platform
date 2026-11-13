import React, { useState } from 'react';
import { Copy, Check, Users, Shield, Hand } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWebRTC } from '../hooks/useWebRTC';
import { VideoTile } from './VideoTile';
import { ControlsDock } from './ControlsDock';
import { ParticipantsDrawer } from './ParticipantsDrawer';
import { ChatDrawer } from './ChatDrawer';

interface MeetingStageProps {
  roomCode: string;
  meetingTitle: string;
  maxParticipants: number;
  isHost: boolean;
  onLeave: () => void;
}

export const MeetingStage: React.FC<MeetingStageProps> = ({
  roomCode,
  meetingTitle,
  maxParticipants,
  isHost,
  onLeave,
}) => {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  const {
    isMuted,
    isCameraOff,
    isScreenSharing,
    isHandRaised,
    participants,
    roomError,
    toggleMute,
    toggleCamera,
    toggleHandRaise,
    startScreenShare,
    stopScreenShare,
    hostMuteParticipant,
    hostStopCamera,
    hostStopScreen,
    hostLowerHand,
  } = useWebRTC({
    roomCode,
    user: user!,
    isHost,
  });

  const copyMeetingLink = () => {
    const fullLink = `${window.location.origin}/meet/${roomCode}`;
    navigator.clipboard.writeText(fullLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleScreenShare = () => {
    if (isScreenSharing) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  };

  const handleMuteAll = () => {
    participants.forEach((p) => {
      if (!p.is_local) {
        hostMuteParticipant(p.user_id, true);
      }
    });
  };

  const raisedHandsCount = participants.filter((p) => p.raised_hand).length;
  const screenSharer = participants.find((p) => p.is_screen_sharing);

  return (
    <div className="fixed inset-0 bg-[#202124] text-white flex flex-col z-50 overflow-hidden select-none">
      {/* Top Bar / Meeting Header */}
      <div className="h-14 px-6 flex items-center justify-between border-b border-white/10 bg-[#202124]">
        <div className="flex items-center gap-3">
          <span className="font-medium text-sm text-slate-200 truncate max-w-xs md:max-w-md">
            {meetingTitle}
          </span>
          <button
            onClick={copyMeetingLink}
            title="Copy meeting link"
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-xs text-slate-300 font-mono transition"
          >
            <span>{roomCode}</span>
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 text-xs text-slate-300">
            <Users className="w-3.5 h-3.5" />
            <span>{participants.length} / {maxParticipants} Max</span>
          </div>
          <div className="hidden sm:flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs">
            <Shield className="w-3.5 h-3.5" />
            <span>Encrypted</span>
          </div>
        </div>
      </div>

      {/* Floating Notification for Raised Hands */}
      {raisedHandsCount > 0 && (
        <div
          onClick={() => setIsParticipantsOpen(true)}
          className="absolute top-16 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-full bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg cursor-pointer"
        >
          <Hand className="w-4 h-4 animate-bounce" />
          <span>{raisedHandsCount} participant(s) raised hand</span>
        </div>
      )}

      {/* Error alert banner */}
      {roomError && (
        <div className="p-2.5 bg-rose-600 text-white text-xs text-center font-medium">
          {roomError}
        </div>
      )}

      {/* Video Grid Stage */}
      <div className="flex-1 p-4 pb-24 overflow-y-auto flex items-center justify-center">
        {screenSharer ? (
          /* Spotlight presentation view */
          <div className="w-full h-full flex flex-col md:flex-row gap-4">
            <div className="flex-1 bg-black rounded-2xl overflow-hidden relative flex items-center justify-center border border-white/10">
              <div className="absolute top-3 left-3 z-10 px-3 py-1 rounded-lg bg-black/70 text-white text-xs font-semibold">
                Screen: {screenSharer.full_name}
              </div>
              {screenSharer.stream ? (
                <video
                  autoPlay
                  playsInline
                  ref={(el) => {
                    if (el && screenSharer.stream) el.srcObject = screenSharer.stream;
                  }}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-slate-400 text-sm">Presenting screen...</div>
              )}
            </div>

            {/* Side participant thumbnails */}
            <div className="w-full md:w-64 flex md:flex-col gap-3 overflow-x-auto md:overflow-y-auto">
              {participants.map((p) => (
                <div key={p.user_id} className="min-w-[160px] md:min-w-0">
                  <VideoTile
                    participant={p}
                    isHostUser={isHost}
                    onMuteParticipant={hostMuteParticipant}
                    onStopCamera={hostStopCamera}
                    onStopScreen={hostStopScreen}
                    onLowerHand={hostLowerHand}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Responsive Google Meet Video Grid */
          <div
            className={`w-full max-w-6xl grid gap-3 place-content-center ${
              participants.length === 1
                ? 'grid-cols-1 max-w-2xl'
                : participants.length === 2
                ? 'grid-cols-1 sm:grid-cols-2'
                : participants.length <= 4
                ? 'grid-cols-1 sm:grid-cols-2'
                : participants.length <= 6
                ? 'grid-cols-2 md:grid-cols-3'
                : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
            }`}
          >
            {participants.map((p) => (
              <VideoTile
                key={p.user_id}
                participant={p}
                isHostUser={isHost}
                onMuteParticipant={hostMuteParticipant}
                onStopCamera={hostStopCamera}
                onStopScreen={hostStopScreen}
                onLowerHand={hostLowerHand}
              />
            ))}
          </div>
        )}
      </div>

      {/* Google Meet Bottom Controls Bar */}
      <ControlsDock
        roomCode={roomCode}
        isMuted={isMuted}
        isCameraOff={isCameraOff}
        isScreenSharing={isScreenSharing}
        isHandRaised={isHandRaised}
        participantsCount={participants.length}
        maxParticipants={maxParticipants}
        raisedHandsCount={raisedHandsCount}
        isChatOpen={isChatOpen}
        isParticipantsOpen={isParticipantsOpen}
        isHost={isHost}
        onToggleMute={() => toggleMute()}
        onToggleCamera={() => toggleCamera()}
        onToggleScreenShare={handleToggleScreenShare}
        onToggleHandRaise={toggleHandRaise}
        onToggleChat={() => {
          setIsChatOpen(!isChatOpen);
          if (isParticipantsOpen) setIsParticipantsOpen(false);
        }}
        onToggleParticipants={() => {
          setIsParticipantsOpen(!isParticipantsOpen);
          if (isChatOpen) setIsChatOpen(false);
        }}
        onLeaveMeeting={onLeave}
        onMuteAll={isHost ? handleMuteAll : undefined}
        onToggleLock={isHost ? () => setIsLocked(!isLocked) : undefined}
        isLocked={isLocked}
      />

      {/* In-Call Drawers */}
      <ParticipantsDrawer
        isOpen={isParticipantsOpen}
        onClose={() => setIsParticipantsOpen(false)}
        participants={participants}
        maxParticipants={maxParticipants}
        isHostUser={isHost}
        onMuteParticipant={hostMuteParticipant}
        onStopCamera={hostStopCamera}
        onStopScreen={hostStopScreen}
        onLowerHand={hostLowerHand}
      />

      <ChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        roomCode={roomCode}
        currentUser={user!}
      />
    </div>
  );
};

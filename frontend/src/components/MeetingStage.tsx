import React, { useState } from 'react';
import { Copy, Check, Users, Shield, Hand, PhoneOff } from 'lucide-react';
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
  const [showEndModal, setShowEndModal] = useState(false);
  const [lastReadChatCount, setLastReadChatCount] = useState(0);

  const {
    isMuted,
    isCameraOff,
    isScreenSharing,
    isHandRaised,
    participants,
    chatMessages,
    sendChatMessage,
    terminateMeeting,
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
    maxParticipants,
    onSessionTerminated: (reason) => {
      alert(reason);
      onLeave();
    },
  });

  const unreadChatCount = isChatOpen ? 0 : Math.max(0, chatMessages.length - lastReadChatCount);

  const handleOpenChat = () => {
    setIsChatOpen(true);
    setIsParticipantsOpen(false);
    setLastReadChatCount(chatMessages.length);
  };

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

  const handleLeaveClick = () => {
    if (isHost) {
      setShowEndModal(true);
    } else {
      onLeave();
    }
  };

  const handleEndForEveryone = async () => {
    setShowEndModal(false);
    await terminateMeeting('The host has ended the meeting for all participants.');
    onLeave();
  };

  const raisedHandsCount = participants.filter((p) => p.raised_hand).length;
  const screenSharer = participants.find((p) => p.is_screen_sharing);

  return (
    <div className="fixed inset-0 bg-[#202124] text-white flex flex-col z-50 overflow-hidden select-none">
      {/* Top Bar / Meeting Header (Mobile responsive) */}
      <div className="h-12 sm:h-14 px-3 sm:px-6 flex items-center justify-between border-b border-white/10 bg-[#202124]">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <span className="font-medium text-xs sm:text-sm text-slate-200 truncate max-w-[120px] sm:max-w-xs md:max-w-md">
            {meetingTitle}
          </span>
          <button
            onClick={copyMeetingLink}
            title="Copy meeting link"
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-[11px] sm:text-xs text-slate-300 font-mono transition shrink-0"
          >
            <span className="truncate max-w-[80px] sm:max-w-none">{roomCode}</span>
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 text-[11px] sm:text-xs text-slate-300">
            <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>{participants.length}</span>
            <span className="hidden sm:inline">/ {maxParticipants}</span>
          </div>
          <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs">
            <Shield className="w-3.5 h-3.5" />
            <span>Encrypted</span>
          </div>
        </div>
      </div>

      {/* Floating Notification for Raised Hands */}
      {raisedHandsCount > 0 && (
        <div
          onClick={() => setIsParticipantsOpen(true)}
          className="absolute top-14 sm:top-16 left-1/2 -translate-x-1/2 z-40 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg cursor-pointer"
        >
          <Hand className="w-3.5 h-3.5 animate-bounce" />
          <span>{raisedHandsCount} raised hand(s)</span>
        </div>
      )}

      {/* Error alert banner */}
      {roomError && (
        <div className="p-2 bg-rose-600 text-white text-xs text-center font-medium">
          {roomError}
        </div>
      )}

      {/* Video Grid Stage */}
      <div className="flex-1 p-2 sm:p-4 pb-20 sm:pb-24 overflow-y-auto flex items-center justify-center">
        {screenSharer ? (
          /* Spotlight presentation view */
          <div className="w-full h-full flex flex-col md:flex-row gap-2 sm:gap-4">
            <div className="flex-1 bg-black rounded-xl sm:rounded-2xl overflow-hidden relative flex items-center justify-center border border-white/10 min-h-[40vh]">
              <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-10 px-2.5 py-1 rounded-lg bg-black/70 text-white text-xs font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Screen: {screenSharer.full_name} {screenSharer.is_local && '(You)'}</span>
              </div>
              {screenSharer.stream ? (
                <video
                  autoPlay
                  playsInline
                  muted={screenSharer.is_local}
                  ref={(el) => {
                    if (el && screenSharer.stream) {
                      if (el.srcObject !== screenSharer.stream) {
                        el.srcObject = screenSharer.stream;
                      }
                      el.play().catch(() => {});
                    }
                  }}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 text-slate-400 text-sm">
                  <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <span>Loading presentation stream...</span>
                </div>
              )}
            </div>

            {/* Side participant thumbnails */}
            <div className="w-full md:w-64 flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto">
              {participants.map((p) => (
                <div key={p.user_id} className="min-w-[140px] sm:min-w-[160px] md:min-w-0">
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
          /* Responsive Google Meet Video Grid (Stacked nicely on phone) */
          <div
            className={`w-full max-w-6xl grid gap-2 sm:gap-3 place-content-center ${
              participants.length === 1
                ? 'grid-cols-1 max-w-xl'
                : participants.length === 2
                ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl'
                : participants.length <= 4
                ? 'grid-cols-2 max-w-3xl sm:max-w-4xl'
                : participants.length <= 6
                ? 'grid-cols-2 md:grid-cols-3 max-w-5xl'
                : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 max-w-6xl'
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
        unreadChatCount={unreadChatCount}
        isChatOpen={isChatOpen}
        isParticipantsOpen={isParticipantsOpen}
        isHost={isHost}
        onToggleMute={() => toggleMute()}
        onToggleCamera={() => toggleCamera()}
        onToggleScreenShare={handleToggleScreenShare}
        onToggleHandRaise={toggleHandRaise}
        onToggleChat={() => {
          if (isChatOpen) {
            setIsChatOpen(false);
          } else {
            handleOpenChat();
          }
        }}
        onToggleParticipants={() => {
          setIsParticipantsOpen(!isParticipantsOpen);
          if (isChatOpen) setIsChatOpen(false);
        }}
        onLeaveMeeting={handleLeaveClick}
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
        messages={chatMessages}
        onSendMessage={sendChatMessage}
        currentUser={user!}
      />

      {/* Host End Meeting Modal */}
      {showEndModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white text-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <PhoneOff className="w-6 h-6" />
              <h3 className="text-lg font-bold text-slate-900">End meeting?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              As the host, you can end this call for all participants or simply leave by yourself.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={handleEndForEveryone}
                className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition active:scale-95"
              >
                End meeting for everyone
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowEndModal(false);
                  onLeave();
                }}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition active:scale-95"
              >
                Just leave meeting
              </button>
              <button
                type="button"
                onClick={() => setShowEndModal(false)}
                className="w-full py-2 text-xs text-slate-500 hover:underline"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

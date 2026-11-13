import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, Users, Lock, Shield, Hand } from 'lucide-react';
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
    maxParticipants,
  });

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
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
    <div className="flex-1 flex flex-col h-screen bg-erise-dark-950 text-slate-100 relative overflow-hidden select-none">
      {/* Top Header Bar */}
      <div className="h-16 px-6 border-b border-erise-700/40 bg-erise-dark-900/90 backdrop-blur-md flex items-center justify-between z-30">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="font-bold text-sm md:text-base text-white tracking-wide truncate max-w-[200px] md:max-w-md">
              {meetingTitle}
            </h2>
          </div>

          {/* Room Code Badge with Copy */}
          <button
            onClick={copyRoomCode}
            title="Click to copy room code"
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-erise-dark-800 hover:bg-erise-dark-700 border border-slate-700 text-xs font-mono text-slate-300 transition"
          >
            <span>{roomCode}</span>
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
          </button>
        </div>

        {/* Capacity & Security Badges */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-erise-500/10 border border-erise-500/30 text-erise-300 text-xs font-semibold">
            <Users className="w-3.5 h-3.5" />
            <span>
              {participants.length} / {maxParticipants} Max
            </span>
          </div>

          {isLocked && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-medium">
              <Lock className="w-3 h-3" />
              <span>Locked</span>
            </div>
          )}

          <div className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
            <Shield className="w-3 h-3" />
            <span>DTLS-SRTP Encrypted</span>
          </div>
        </div>
      </div>

      {/* Floating Notification for Raised Hands */}
      <AnimatePresence>
        {raisedHandsCount > 0 && (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="absolute top-20 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-2xl bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-2xl cursor-pointer"
            onClick={() => setIsParticipantsOpen(true)}
          >
            <Hand className="w-4 h-4 animate-bounce" />
            <span>{raisedHandsCount} participant(s) raised hand to speak!</span>
            <span className="underline ml-1">Open Queue</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error alert banner */}
      {roomError && (
        <div className="p-3 bg-rose-500/20 border-b border-rose-500/40 text-rose-300 text-xs text-center font-medium">
          {roomError}
        </div>
      )}

      {/* Main Video Grid Stage */}
      <div className="flex-1 p-4 md:p-6 pb-28 overflow-y-auto flex items-center justify-center">
        {screenSharer ? (
          /* Screen Sharing Spotlight Layout */
          <div className="w-full h-full flex flex-col md:flex-row gap-4">
            <div className="flex-1 bg-erise-dark-850 rounded-2xl border border-erise-600/40 overflow-hidden relative shadow-2xl flex items-center justify-center">
              <div className="absolute top-3 left-3 z-10 px-3 py-1 rounded-lg bg-erise-500/90 text-white text-xs font-bold shadow">
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
                <div className="text-center p-6 text-slate-400">
                  Screen share feed active from {screenSharer.full_name}
                </div>
              )}
            </div>

            {/* Sidebar Tiles */}
            <div className="w-full md:w-72 flex md:flex-col gap-3 overflow-x-auto md:overflow-y-auto max-h-48 md:max-h-full">
              {participants.map((p) => (
                <div key={p.user_id} className="min-w-[180px] md:min-w-0">
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
          /* Responsive Multi-Peer Video Grid (Supports up to 10 participants smoothly) */
          <div
            className={`w-full max-w-6xl grid gap-4 place-content-center ${
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

      {/* Floating Controls Dock */}
      <ControlsDock
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

      {/* Drawers */}
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

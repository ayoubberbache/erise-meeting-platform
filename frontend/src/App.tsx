import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Video, Users, LogIn, Mail, Lock } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { MeetingStage } from './components/MeetingStage';
import { ProfileModal } from './components/ProfileModal';
import { CreateMeetingModal } from './components/CreateMeetingModal';

export const AppContent: React.FC = () => {
  const { user, signIn, signUp } = useAuth();
  const [activeRoom, setActiveRoom] = useState<{
    roomCode: string;
    title: string;
    maxParticipants: number;
    isHost: boolean;
  } | null>(null);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isCreateMeetingOpen, setIsCreateMeetingOpen] = useState(false);
  const [authEmail, setAuthEmail] = useState('erise.club@hns-re2sd.dz');
  const [authPassword, setAuthPassword] = useState('EriseSecure2026!');
  const [authFullName, setAuthFullName] = useState('E-RISE Club Admin');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authError, setAuthError] = useState<string | null>(null);

  const handleStartMeeting = (title: string, roomCode: string, maxParticipants: number) => {
    setActiveRoom({
      roomCode,
      title,
      maxParticipants,
      isHost: true,
    });
  };

  const handleJoinMeeting = (roomCode: string) => {
    setActiveRoom({
      roomCode,
      title: 'E-RISE Live Meeting',
      maxParticipants: 10,
      isHost: false,
    });
  };

  const handleJoinChannelMeeting = (channelName: string, maxParticipants: number) => {
    const channelCode = `erise-${channelName.toLowerCase().replace(/\s+/g, '-')}`;
    setActiveRoom({
      roomCode: channelCode,
      title: `E-RISE • ${channelName}`,
      maxParticipants,
      isHost: true,
    });
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (authMode === 'signin') {
      const res = await signIn(authEmail, authPassword);
      if (!res.success) setAuthError(res.error || 'Failed to sign in');
    } else {
      const res = await signUp(authEmail, authPassword, authFullName);
      if (!res.success) setAuthError(res.error || 'Failed to sign up');
    }
  };

  // If user is not authenticated, show modern E-RISE Sign-in portal
  if (!user) {
    return (
      <div className="min-h-screen bg-erise-dark-950 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Glow circles */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-erise-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-erise-accent/10 rounded-full blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="relative w-full max-w-md bg-erise-dark-850 border border-erise-700/50 rounded-3xl p-8 shadow-2xl glass-panel-glow"
        >
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <div className="inline-block p-3 rounded-2xl bg-erise-500/10 border border-erise-500/30 mb-4 shadow-lg">
              <img src="/erise-logo.png" alt="E-RISE" className="w-12 h-12 object-contain" />
            </div>
            <h1 className="text-2xl font-black tracking-wider text-white">E-RISE PLATFORM</h1>
            <p className="text-xs text-slate-400 mt-1">Hybrid Discord & Google Meet Broadcasting System</p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {authMode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={authFullName}
                  onChange={(e) => setAuthFullName(e.target.value)}
                  required
                  placeholder="e.g. John Doe"
                  className="w-full px-3.5 py-2.5 text-sm bg-erise-dark-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-erise-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-300 mb-1.5">
                Supabase Authed Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-erise-dark-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-erise-500"
                />
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-erise-dark-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-erise-500"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              </div>
            </div>

            {authError && (
              <div className="p-3 rounded-lg bg-rose-500/20 text-rose-300 text-xs">
                {authError}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-erise-500 hover:bg-erise-600 text-white font-semibold text-sm shadow-lg shadow-erise-500/25 transition flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>{authMode === 'signin' ? 'Sign In' : 'Create E-RISE Account'}</span>
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
              className="text-xs text-erise-400 hover:underline"
            >
              {authMode === 'signin'
                ? "Don't have an account? Sign up with full name"
                : 'Already have an account? Sign in'}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-erise-dark-950 font-sans">
      {/* Discord Style Navigation Sidebar */}
      <Sidebar
        onOpenCreateMeeting={() => setIsCreateMeetingOpen(true)}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onJoinChannelMeeting={handleJoinChannelMeeting}
      />

      {/* Main Workspace Stage */}
      {activeRoom ? (
        <MeetingStage
          roomCode={activeRoom.roomCode}
          meetingTitle={activeRoom.title}
          maxParticipants={activeRoom.maxParticipants}
          isHost={activeRoom.isHost}
          onLeave={() => setActiveRoom(null)}
        />
      ) : (
        /* Welcome Dashboard when no meeting is active */
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-erise-dark-900 text-center relative overflow-hidden">
          <div className="max-w-xl space-y-6">
            <div className="inline-block p-4 rounded-3xl bg-erise-500/10 border border-erise-500/30 shadow-2xl">
              <img
                src="/erise-logo.png"
                alt="E-RISE"
                className="w-20 h-20 object-contain mx-auto filter drop-shadow-[0_4px_16px_rgba(0,131,143,0.6)]"
              />
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-extrabold text-white tracking-tight">
                Welcome to E-RISE Broadcasting
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Connect seamlessly with your team using professional Google Meet audio/video stage
                controls coupled with Discord channels and live presence.
              </p>
            </div>

            {/* Quick Action Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 text-left">
              <div
                onClick={() => setIsCreateMeetingOpen(true)}
                className="p-5 rounded-2xl bg-erise-dark-800 border border-slate-700/80 hover:border-erise-500/50 hover:bg-erise-dark-750 transition cursor-pointer group shadow-lg"
              >
                <div className="w-10 h-10 rounded-xl bg-erise-500/20 text-erise-400 flex items-center justify-center mb-3 group-hover:scale-105 transition">
                  <Video className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-white group-hover:text-erise-300 transition">
                  Create Meeting
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Define custom capacity limit (e.g., 10 persons max) and launch your secure room.
                </p>
              </div>

              <div
                onClick={() => setIsProfileModalOpen(true)}
                className="p-5 rounded-2xl bg-erise-dark-800 border border-slate-700/80 hover:border-erise-500/50 hover:bg-erise-dark-750 transition cursor-pointer group shadow-lg"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3 group-hover:scale-105 transition">
                  <Users className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition">
                  Customize Account
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Update photo, name, or switch your status to <strong>Asleep / Unavailable</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Customization Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      {/* Create / Join Meeting Modal */}
      <CreateMeetingModal
        isOpen={isCreateMeetingOpen}
        onClose={() => setIsCreateMeetingOpen(false)}
        onCreate={handleStartMeeting}
        onJoin={handleJoinMeeting}
      />
    </div>
  );
};

export default function App() {
  return <AppContent />;
}

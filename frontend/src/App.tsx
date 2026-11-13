import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { MeetNavbar } from './components/MeetNavbar';
import { MeetHome } from './components/MeetHome';
import { MeetingStage } from './components/MeetingStage';
import { AuthModal } from './components/AuthModal';
import { supabase } from './lib/supabase';

export const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [activeMeeting, setActiveMeeting] = useState<{
    roomCode: string;
    title: string;
    maxParticipants: number;
    isHost: boolean;
  } | null>(null);

  // Check for room code in URL params on initial load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    const pathMatch = window.location.pathname.match(/\/meet\/([a-zA-Z0-9_-]+)/);
    const initialCode = roomParam || (pathMatch ? pathMatch[1] : null);

    if (initialCode && user) {
      supabase
        .from('meetings')
        .select('is_ended, title, max_participants')
        .eq('room_code', initialCode)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.is_ended) {
            alert('This meeting has already ended.');
            window.history.replaceState({}, '', '/');
            return;
          }
          setActiveMeeting({
            roomCode: initialCode,
            title: data?.title || 'E-RISE Meeting',
            maxParticipants: data?.max_participants || 10,
            isHost: false,
          });
        });
    }
  }, [user]);

  const handleStartMeeting = (title: string, roomCode: string, maxParticipants: number) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    setActiveMeeting({
      roomCode,
      title,
      maxParticipants,
      isHost: true,
    });
  };

  const handleJoinMeeting = async (roomCode: string) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    try {
      const { data: meeting } = await supabase
        .from('meetings')
        .select('is_ended, title, max_participants')
        .eq('room_code', roomCode)
        .maybeSingle();

      if (meeting?.is_ended) {
        alert('This meeting has already ended and is no longer active.');
        return;
      }

      setActiveMeeting({
        roomCode,
        title: meeting?.title || 'E-RISE Meeting',
        maxParticipants: meeting?.max_participants || 10,
        isHost: false,
      });
    } catch {
      setActiveMeeting({
        roomCode,
        title: 'E-RISE Meeting',
        maxParticipants: 10,
        isHost: false,
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <img src="/erise-logo.png" alt="E-RISE" className="w-12 h-12 object-contain animate-pulse" />
          <p className="text-sm text-slate-500 font-medium">Loading E-RISE Meet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Google Meet Navigation Bar */}
      <MeetNavbar onSignInClick={() => setIsAuthModalOpen(true)} />

      {/* Main Experience */}
      {activeMeeting ? (
        <MeetingStage
          roomCode={activeMeeting.roomCode}
          meetingTitle={activeMeeting.title}
          maxParticipants={activeMeeting.maxParticipants}
          isHost={activeMeeting.isHost}
          onLeave={() => setActiveMeeting(null)}
        />
      ) : (
        <MeetHome
          onStartMeeting={handleStartMeeting}
          onJoinMeeting={handleJoinMeeting}
          onOpenSignIn={() => setIsAuthModalOpen(true)}
        />
      )}

      {/* Google / Gmail Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return <AppContent />;
}

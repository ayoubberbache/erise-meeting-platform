import React, { useState } from 'react';
import { Video, Keyboard, Plus, Shield, Users, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface MeetHomeProps {
  onStartMeeting: (title: string, roomCode: string, maxParticipants: number) => void;
  onJoinMeeting: (roomCode: string) => void;
  onOpenSignIn: () => void;
}

export const MeetHome: React.FC<MeetHomeProps> = ({
  onStartMeeting,
  onJoinMeeting,
  onOpenSignIn,
}) => {
  const { user } = useAuth();
  const [meetingCode, setMeetingCode] = useState('');
  const [showNewMeetingMenu, setShowNewMeetingMenu] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [customTitle, setCustomTitle] = useState('E-RISE Live Meeting');
  const [maxParticipants, setMaxParticipants] = useState<number>(10);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenSignIn();
      return;
    }
    const cleanCode = meetingCode.trim().toLowerCase().replace(/^https?:\/\/.*\/meet\//, '');
    if (cleanCode) {
      onJoinMeeting(cleanCode);
    }
  };

  const handleInstantMeeting = () => {
    if (!user) {
      onOpenSignIn();
      return;
    }
    const code = `erise-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 6)}`;
    onStartMeeting('E-RISE Instant Meeting', code, 10);
  };

  const handleCustomMeetingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = `erise-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 6)}`;
    onStartMeeting(customTitle.trim() || 'E-RISE Meeting', code, maxParticipants);
    setShowConfigModal(false);
  };

  return (
    <main className="flex-1 max-w-7xl mx-auto px-6 py-12 lg:py-20 flex flex-col lg:flex-row items-center justify-between gap-12">
      {/* Left Column: Meeting Actions & Text */}
      <div className="w-full lg:max-w-xl space-y-8 text-center lg:text-left">
        <div className="space-y-4">
          <h1 className="text-4xl sm:text-5xl font-normal text-slate-900 tracking-tight leading-tight">
            Premium video meetings. Now free for everyone.
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed max-w-lg mx-auto lg:mx-0">
            We built E-RISE Meet for secure, low-latency group conferences and broadcasts. Simple, host-controlled, and available for all.
          </p>
        </div>

        {/* Authentication Wall / Meeting Controls */}
        {!user ? (
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4 text-center lg:text-left">
            <div className="flex items-center gap-3 justify-center lg:justify-start">
              <div className="w-10 h-10 rounded-full bg-erise-50 flex items-center justify-center text-erise-600">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-800">Sign in to get started</h3>
                <p className="text-xs text-slate-500">Sign in with your Gmail or E-RISE account to create or join meetings</p>
              </div>
            </div>

            <button
              onClick={onOpenSignIn}
              className="w-full sm:w-auto px-6 py-3 rounded-full bg-erise-500 hover:bg-erise-600 text-white font-medium text-sm transition shadow-sm flex items-center justify-center gap-2 mx-auto lg:mx-0"
            >
              <span>Sign in with Google / Email</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              {/* New Meeting Dropdown Button */}
              <div className="relative w-full sm:w-auto">
                <button
                  onClick={() => setShowNewMeetingMenu(!showNewMeetingMenu)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-erise-500 hover:bg-erise-600 text-white font-medium text-sm transition shadow-sm"
                >
                  <Video className="w-4 h-4" />
                  <span>New meeting</span>
                </button>

                {showNewMeetingMenu && (
                  <div className="absolute left-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-40">
                    <button
                      onClick={() => {
                        setShowNewMeetingMenu(false);
                        handleInstantMeeting();
                      }}
                      className="w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition"
                    >
                      <Plus className="w-4 h-4 text-erise-600" />
                      <div>
                        <div className="font-medium text-slate-800">Start an instant meeting</div>
                        <div className="text-xs text-slate-500">Standard 10-person room</div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setShowNewMeetingMenu(false);
                        setShowConfigModal(true);
                      }}
                      className="w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition"
                    >
                      <Sparkles className="w-4 h-4 text-erise-600" />
                      <div>
                        <div className="font-medium text-slate-800">Custom capacity meeting</div>
                        <div className="text-xs text-slate-500">Configure participant limit & title</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Enter a Code Form */}
              <form onSubmit={handleJoin} className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <input
                    type="text"
                    value={meetingCode}
                    onChange={(e) => setMeetingCode(e.target.value)}
                    placeholder="Enter a code or link"
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:border-erise-500 focus:ring-1 focus:ring-erise-500 text-sm text-slate-800 placeholder-slate-400 focus:outline-none transition"
                  />
                  <Keyboard className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" />
                </div>
                <button
                  type="submit"
                  disabled={!meetingCode.trim()}
                  className="px-5 py-3 rounded-lg text-sm font-medium text-erise-600 hover:bg-erise-50 disabled:text-slate-400 disabled:hover:bg-transparent transition"
                >
                  Join
                </button>
              </form>
            </div>

            <p className="text-xs text-slate-500">
              Signed in as <strong>{user.full_name}</strong> ({user.email})
            </p>
          </div>
        )}

        <hr className="border-slate-200" />

        <div className="flex items-center gap-2 text-xs text-slate-500 justify-center lg:justify-start">
          <Shield className="w-4 h-4 text-emerald-600" />
          <span>Encrypted with DTLS-SRTP &bull; <a href="#learn-more" className="text-erise-600 hover:underline">Learn more about E-RISE Meet security</a></span>
        </div>
      </div>

      {/* Right Column: Google Meet Classic Illustration Graphic */}
      <div className="w-full lg:max-w-md flex flex-col items-center">
        <div className="w-full bg-white rounded-3xl border border-slate-200 p-8 shadow-sm flex flex-col items-center text-center space-y-6">
          <div className="w-48 h-48 rounded-full bg-slate-100 flex items-center justify-center p-6">
            <img
              src="/erise-logo.png"
              alt="E-RISE"
              className="w-24 h-24 object-contain"
            />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-slate-800">
              Get a link you can share
            </h3>
            <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
              Click <strong>New meeting</strong> to get a link you can send to people you want to meet with.
            </p>
          </div>

          {/* Dots Indicator */}
          <div className="flex items-center gap-1.5 pt-2">
            <span className="w-2 h-2 rounded-full bg-erise-500" />
            <span className="w-2 h-2 rounded-full bg-slate-300" />
            <span className="w-2 h-2 rounded-full bg-slate-300" />
          </div>
        </div>
      </div>

      {/* Custom Meeting Modal (Allows configuring participant limit) */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-5">
            <h3 className="text-lg font-semibold text-slate-800">Configure Meeting</h3>

            <form onSubmit={handleCustomMeetingSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Meeting Title
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  required
                  placeholder="e.g. E-RISE Sync"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-erise-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 uppercase">
                    Participant Limit
                  </label>
                  <span className="text-xs font-bold text-erise-600 bg-erise-50 px-2 py-0.5 rounded">
                    {maxParticipants} persons max
                  </span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="30"
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(parseInt(e.target.value))}
                  className="w-full accent-erise-500 cursor-pointer"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Only up to <strong>{maxParticipants} participants</strong> will be admitted into this meeting.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-erise-500 hover:bg-erise-600 rounded-lg shadow-sm"
                >
                  Create &amp; Enter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};

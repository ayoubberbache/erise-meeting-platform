import React, { useState, useRef } from 'react';
import { Video, Keyboard, Plus, Settings } from 'lucide-react';
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
  const [customTitle, setCustomTitle] = useState('E-RISE Meeting');
  const [maxParticipants, setMaxParticipants] = useState<number>(10);
  const [inputError, setInputError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenSignIn();
      return;
    }
    const cleanCode = meetingCode.trim().toLowerCase().replace(/^https?:\/\/.*\/meet\//, '');
    if (!cleanCode) {
      setInputError('Please enter a meeting code or link');
      inputRef.current?.focus();
      return;
    }
    setInputError(null);
    onJoinMeeting(cleanCode);
  };

  const handleNewMeetingClick = () => {
    if (!user) {
      onOpenSignIn();
      return;
    }
    setShowNewMeetingMenu(!showNewMeetingMenu);
  };

  const handleInstantMeeting = () => {
    if (!user) {
      onOpenSignIn();
      return;
    }
    const code = `erise-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 6)}`;
    onStartMeeting('E-RISE Meeting', code, 10);
  };

  const handleCustomMeetingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = `erise-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 6)}`;
    onStartMeeting(customTitle.trim() || 'E-RISE Meeting', code, maxParticipants);
    setShowConfigModal(false);
  };

  return (
    <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-24 flex flex-col items-center justify-center select-none">
      {/* Central Clean Actions Card */}
      <div className="w-full max-w-xl space-y-6 text-center">
        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
          {/* New Meeting Button */}
          <div className="relative w-full sm:w-auto">
            <button
              type="button"
              onClick={handleNewMeetingClick}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-erise-500 hover:bg-erise-600 text-white font-medium text-sm transition shadow-sm active:scale-95"
            >
              <Video className="w-5 h-5 shrink-0" />
              <span>New meeting</span>
            </button>

            {/* Dropdown Menu */}
            {showNewMeetingMenu && (
              <div className="absolute left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-40 text-left">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewMeetingMenu(false);
                    handleInstantMeeting();
                  }}
                  className="w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition"
                >
                  <Plus className="w-4 h-4 text-erise-600 shrink-0" />
                  <div>
                    <div className="font-medium text-slate-800">Start an instant meeting</div>
                    <div className="text-xs text-slate-500">10-person capacity</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowNewMeetingMenu(false);
                    setShowConfigModal(true);
                  }}
                  className="w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition"
                >
                  <Settings className="w-4 h-4 text-erise-600 shrink-0" />
                  <div>
                    <div className="font-medium text-slate-800">Set participant quota</div>
                    <div className="text-xs text-slate-500">Choose capacity (2 to 30) &amp; title</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Enter a Code Form */}
          <form onSubmit={handleJoin} className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <input
                ref={inputRef}
                type="text"
                value={meetingCode}
                onChange={(e) => {
                  setMeetingCode(e.target.value);
                  if (inputError) setInputError(null);
                }}
                placeholder="Enter a code or link"
                className={`w-full pl-10 pr-4 py-3.5 rounded-lg border text-sm text-slate-800 placeholder-slate-400 focus:outline-none transition ${
                  inputError
                    ? 'border-rose-400 ring-1 ring-rose-400'
                    : 'border-slate-300 focus:border-erise-500 focus:ring-1 focus:ring-erise-500'
                }`}
              />
              <Keyboard className="w-5 h-5 text-slate-400 absolute left-3 top-4 pointer-events-none" />
            </div>
            <button
              type="submit"
              className="px-5 py-3.5 rounded-lg text-sm font-semibold text-erise-600 hover:bg-erise-50 transition active:scale-95"
            >
              Join
            </button>
          </form>
        </div>

        {inputError && (
          <p className="text-xs text-rose-600 font-medium text-center">
            {inputError}
          </p>
        )}

        {/* Dynamic User Status Line */}
        <div className="pt-2">
          {user ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-xs text-slate-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span>Signed in as <strong>{user.full_name}</strong> ({user.email})</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-xs text-slate-600">
              <button
                type="button"
                onClick={onOpenSignIn}
                className="text-erise-600 font-semibold hover:underline"
              >
                Sign in with Gmail &rarr;
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Custom Meeting Modal (Allows configuring participant limit) */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-5">
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
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
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

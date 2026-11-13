import React, { useState } from 'react';
import {
  Hash,
  Volume2,
  Plus,
  Settings,
  Moon,
  Video,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserStatus } from '../types';

interface SidebarProps {
  onOpenCreateMeeting: () => void;
  onOpenProfile: () => void;
  onJoinChannelMeeting: (channelName: string, maxParticipants: number) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onOpenCreateMeeting,
  onOpenProfile,
  onJoinChannelMeeting,
}) => {
  const { user, updateStatus, signOut } = useAuth();
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const getStatusColor = (status: UserStatus) => {
    switch (status) {
      case 'online':
        return 'bg-emerald-500';
      case 'asleep':
        return 'bg-amber-500';
      case 'dnd':
        return 'bg-rose-500';
      case 'offline':
        return 'bg-slate-500';
    }
  };

  const getStatusLabel = (status: UserStatus) => {
    switch (status) {
      case 'online':
        return 'Online';
      case 'asleep':
        return 'Asleep / Not Available';
      case 'dnd':
        return 'Do Not Disturb';
      case 'offline':
        return 'Offline';
    }
  };

  return (
    <div className="w-64 md:w-72 bg-erise-dark-850 border-r border-erise-700/40 flex flex-col h-screen select-none">
      {/* Brand Header */}
      <div className="h-16 px-4 border-b border-erise-700/40 flex items-center justify-between bg-erise-dark-900">
        <div className="flex items-center gap-3">
          <img
            src="/erise-logo.png"
            alt="E-RISE Logo"
            className="w-8 h-8 object-contain filter drop-shadow-[0_2px_8px_rgba(0,131,143,0.5)]"
          />
          <div>
            <span className="font-extrabold text-base tracking-wider text-white flex items-center gap-1.5">
              E-RISE
              <span className="text-[10px] uppercase font-bold tracking-widest text-erise-400 bg-erise-500/10 px-1.5 py-0.5 rounded border border-erise-500/30">
                PRO
              </span>
            </span>
            <p className="text-[10px] text-slate-400 font-mono">Stream & Meet</p>
          </div>
        </div>
      </div>

      {/* Navigation Channels */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Quick Launch Meeting Banner */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-erise-500/20 to-erise-dark-800 border border-erise-500/30 shadow-lg">
          <div className="flex items-center gap-2 mb-1.5">
            <Video className="w-4 h-4 text-erise-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Instant Broadcast
            </span>
          </div>
          <p className="text-[11px] text-slate-300 mb-3 leading-relaxed">
            Create or enter high-definition encrypted rooms with host controls.
          </p>
          <button
            onClick={onOpenCreateMeeting}
            className="w-full py-2 px-3 rounded-xl bg-erise-500 hover:bg-erise-600 text-white text-xs font-semibold shadow-md shadow-erise-500/20 flex items-center justify-center gap-1.5 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Meeting (Set Cap)</span>
          </button>
        </div>

        {/* Text Channels */}
        <div>
          <div className="flex items-center justify-between px-2 mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Text Channels</span>
          </div>
          <div className="space-y-0.5">
            {[
              { id: 'announcements', name: 'announcements' },
              { id: 'general', name: 'general-discussions' },
              { id: 'tech', name: 'tech-architecture' },
              { id: 'broadcasts', name: 'scheduled-broadcasts' },
            ].map((c) => (
              <button
                key={c.id}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-100 hover:bg-erise-dark-750 transition text-left"
              >
                <Hash className="w-4 h-4 text-slate-500" />
                <span>{c.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Voice & Meeting Rooms (Discord style click-to-join) */}
        <div>
          <div className="flex items-center justify-between px-2 mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Voice &amp; Video Rooms</span>
            <span className="text-[10px] text-erise-400 font-normal">Encrypted</span>
          </div>
          <div className="space-y-1">
            <button
              onClick={() => onJoinChannelMeeting('Main Stage', 10)}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-erise-dark-750 transition group"
            >
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-erise-400" />
                <span>🎙️ Main Stage</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-erise-dark-900 border border-slate-700 text-slate-400 group-hover:text-erise-300">
                Max 10
              </span>
            </button>

            <button
              onClick={() => onJoinChannelMeeting('Team Huddle', 5)}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-erise-dark-750 transition group"
            >
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-erise-400" />
                <span>🎙️ Team Huddle</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-erise-dark-900 border border-slate-700 text-slate-400 group-hover:text-erise-300">
                Max 5
              </span>
            </button>

            <button
              onClick={() => onJoinChannelMeeting('Open Discussion', 15)}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-erise-dark-750 transition group"
            >
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-erise-400" />
                <span>🎙️ Open Discussion</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-erise-dark-900 border border-slate-700 text-slate-400 group-hover:text-erise-300">
                Max 15
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* User Presence & Profile Bar (Discord Style) */}
      <div className="p-2.5 border-t border-erise-700/40 bg-erise-dark-900 relative">
        {/* Quick status popover */}
        {showStatusMenu && (
          <div className="absolute bottom-16 left-3 right-3 p-2 bg-erise-dark-800 border border-slate-700 rounded-xl shadow-2xl space-y-1 z-30">
            <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Set Availability Status
            </div>

            <button
              onClick={() => {
                updateStatus('online', 'Available');
                setShowStatusMenu(false);
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs hover:bg-erise-dark-700 text-slate-200 transition"
            >
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span>Online</span>
            </button>

            <button
              onClick={() => {
                updateStatus('asleep', "Asleep / I'll not be available");
                setShowStatusMenu(false);
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs hover:bg-erise-dark-700 text-amber-300 font-medium transition"
            >
              <Moon className="w-3.5 h-3.5 text-amber-400" />
              <span>Asleep / Not Available</span>
            </button>

            <button
              onClick={() => {
                updateStatus('dnd', 'Do Not Disturb');
                setShowStatusMenu(false);
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs hover:bg-erise-dark-700 text-slate-200 transition"
            >
              <span className="w-3 h-3 rounded-full bg-rose-500" />
              <span>Do Not Disturb</span>
            </button>

            <button
              onClick={() => {
                updateStatus('offline', 'Offline');
                setShowStatusMenu(false);
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs hover:bg-erise-dark-700 text-slate-200 transition"
            >
              <span className="w-3 h-3 rounded-full bg-slate-500" />
              <span>Invisible / Offline</span>
            </button>
          </div>
        )}

        <div className="flex items-center justify-between p-1.5 rounded-xl hover:bg-erise-dark-800/80 transition">
          <div
            onClick={() => setShowStatusMenu(!showStatusMenu)}
            className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0"
          >
            <div className="relative">
              <img
                src={user?.avatar_url || 'https://api.dicebear.com/7.x/identicon/svg?seed=user'}
                alt={user?.full_name}
                className="w-9 h-9 rounded-xl object-cover bg-erise-dark-950 border border-slate-700"
              />
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-erise-dark-900 ${getStatusColor(
                  user?.status || 'online'
                )}`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-white truncate">{user?.full_name}</div>
              <div className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                {user?.status === 'asleep' ? (
                  <span className="text-amber-400 font-medium">Asleep</span>
                ) : (
                  getStatusLabel(user?.status || 'online')
                )}
                {user?.status_message && ` • ${user.status_message}`}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onOpenProfile}
              title="Customize Profile"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-erise-dark-700 transition"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={signOut}
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

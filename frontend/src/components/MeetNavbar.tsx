import React, { useState, useEffect } from 'react';
import { HelpCircle, Settings, LogOut, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface MeetNavbarProps {
  onSignInClick: () => void;
}

export const MeetNavbar: React.FC<MeetNavbarProps> = ({ onSignInClick }) => {
  const { user, signOut } = useAuth();
  const [timeString, setTimeString] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const time = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      const date = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
      setTimeString(`${time} • ${date}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 px-6 bg-white border-b border-slate-200 flex items-center justify-between select-none sticky top-0 z-30">
      {/* Left: E-RISE Brand */}
      <div className="flex items-center gap-3">
        <img
          src="/erise-logo.png"
          alt="E-RISE Logo"
          className="w-8 h-8 object-contain"
        />
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl font-medium tracking-tight text-slate-800">
            E-RISE
          </span>
          <span className="text-xl font-normal text-slate-500">
            Meet
          </span>
        </div>
      </div>

      {/* Right: Time, Controls, Profile */}
      <div className="flex items-center gap-4">
        {/* Live Date/Time Clock (Google Meet Style) */}
        <div className="hidden sm:block text-sm text-slate-600 font-medium">
          {timeString}
        </div>

        <button
          title="Support & Info"
          className="p-2 rounded-full text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
        >
          <HelpCircle className="w-5 h-5" />
        </button>

        <button
          title="Settings"
          className="p-2 rounded-full text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
        >
          <Settings className="w-5 h-5" />
        </button>

        {user ? (
          /* Logged In Google Profile Dropdown */
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-slate-200 transition focus:outline-none"
            >
              <img
                src={user.avatar_url || 'https://api.dicebear.com/7.x/identicon/svg?seed=user'}
                alt={user.full_name}
                className="w-8 h-8 rounded-full object-cover border border-slate-300"
              />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 py-3 px-4 z-50">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <img
                    src={user.avatar_url}
                    alt={user.full_name}
                    className="w-10 h-10 rounded-full object-cover border border-slate-200"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{user.full_name}</p>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      signOut();
                      setShowProfileMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 rounded-xl transition"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign out of E-RISE</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Sign In Button */
          <button
            onClick={onSignInClick}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-erise-500 hover:bg-erise-600 text-white text-sm font-medium transition shadow-sm"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign in</span>
          </button>
        )}
      </div>
    </header>
  );
};

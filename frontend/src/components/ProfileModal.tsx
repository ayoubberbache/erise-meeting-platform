import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Shield, Moon, CheckCircle2, AlertCircle, Camera } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserStatus } from '../types';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const statusOptions: { status: UserStatus; label: string; desc: string; color: string; icon: any }[] = [
  {
    status: 'online',
    label: 'Online',
    desc: 'Available for meetings & voice chats',
    color: 'bg-emerald-500',
    icon: CheckCircle2,
  },
  {
    status: 'asleep',
    label: 'Asleep / Not Available',
    desc: "Away, stepped out, or 'I will not be available'",
    color: 'bg-amber-500',
    icon: Moon,
  },
  {
    status: 'dnd',
    label: 'Do Not Disturb',
    desc: 'Mute incoming meeting notifications',
    color: 'bg-rose-500',
    icon: AlertCircle,
  },
  {
    status: 'offline',
    label: 'Invisible / Offline',
    desc: 'Appear offline to other members',
    color: 'bg-slate-500',
    icon: Shield,
  },
];

const avatarPresets = [
  'https://api.dicebear.com/7.x/identicon/svg?seed=erise-club',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Alpha',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Bravo',
  'https://api.dicebear.com/7.x/identicon/svg?seed=Charlie',
  'https://api.dicebear.com/7.x/identicon/svg?seed=Delta',
];

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, updateProfile } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [selectedStatus, setSelectedStatus] = useState<UserStatus>(user?.status || 'online');
  const [statusMessage, setStatusMessage] = useState(user?.status_message || '');
  const [saving, setSaving] = useState(false);

  if (!isOpen || !user) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await updateProfile({
      full_name: fullName,
      avatar_url: avatarUrl,
      status: selectedStatus,
      status_message: statusMessage,
    });
    setSaving(false);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg bg-erise-dark-800 border border-erise-700/50 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-erise-700/40 bg-erise-dark-850">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-erise-500/20 border border-erise-500/40 flex items-center justify-center">
                <User className="w-5 h-5 text-erise-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Customize Profile</h3>
                <p className="text-xs text-slate-400">{user.email}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-erise-dark-700 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSave} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
            {/* Avatar Section */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Profile Photo
              </label>
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <img
                    src={avatarUrl || 'https://api.dicebear.com/7.x/identicon/svg?seed=user'}
                    alt="Avatar Preview"
                    className="w-16 h-16 rounded-2xl border-2 border-erise-500 object-cover bg-erise-dark-900"
                  />
                  <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                </div>

                <div className="flex-1 space-y-2">
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="Enter custom image URL..."
                    className="w-full px-3 py-2 text-sm bg-erise-dark-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-erise-500 transition"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Presets:</span>
                    {avatarPresets.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setAvatarUrl(preset)}
                        className={`w-7 h-7 rounded-lg overflow-hidden border transition ${
                          avatarUrl === preset ? 'border-erise-400 ring-2 ring-erise-400/40' : 'border-slate-700 hover:border-slate-500'
                        }`}
                      >
                        <img src={preset} alt={`Preset ${idx}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. John Doe"
                required
                className="w-full px-3.5 py-2.5 text-sm bg-erise-dark-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-erise-500 transition"
              />
            </div>

            {/* Presence Status */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Presence Status
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {statusOptions.map((opt) => {
                  const isSelected = selectedStatus === opt.status;
                  return (
                    <button
                      key={opt.status}
                      type="button"
                      onClick={() => setSelectedStatus(opt.status)}
                      className={`flex items-start gap-3 p-3 rounded-xl border text-left transition ${
                        isSelected
                          ? 'border-erise-500 bg-erise-500/10 ring-1 ring-erise-500/30'
                          : 'border-slate-800 bg-erise-dark-900/60 hover:border-slate-700'
                      }`}
                    >
                      <div className="mt-0.5">
                        <span className={`inline-block w-3.5 h-3.5 rounded-full ${opt.color}`} />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-slate-200">{opt.label}</div>
                        <div className="text-xs text-slate-400 line-clamp-1">{opt.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Status Message */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Custom Status Message
              </label>
              <input
                type="text"
                value={statusMessage}
                onChange={(e) => setStatusMessage(e.target.value)}
                placeholder="e.g., Working on E-RISE architecture / Back at 3 PM"
                className="w-full px-3.5 py-2.5 text-sm bg-erise-dark-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-erise-500 transition"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-erise-700/40">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 text-sm font-semibold text-white bg-erise-500 hover:bg-erise-600 rounded-lg shadow-lg shadow-erise-500/25 transition disabled:opacity-50"
              >
                {saving ? 'Saving Changes...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

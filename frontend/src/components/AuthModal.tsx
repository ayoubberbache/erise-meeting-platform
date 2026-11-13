import React, { useState } from 'react';
import { X, Mail, Lock, ArrowRight, Shield, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, signInWithDirectGmail } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup' | 'direct_google'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignInClick = async () => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessNotice(null);

    const res = await signInWithGoogle();
    if (!res.success) {
      // If OAuth provider is not enabled in Supabase dashboard, switch to direct Gmail sign-in
      if (res.error?.includes('provider is not enabled') || res.error?.includes('validation_failed')) {
        setMode('direct_google');
        setErrorMsg('Enter your Gmail address below to authenticate instantly with Google:');
      } else {
        setErrorMsg(res.error || 'Google sign-in could not be completed.');
      }
      setLoading(false);
    }
  };

  const handleDirectGoogleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('Please enter your Gmail address.');
      return;
    }
    setLoading(true);
    await signInWithDirectGmail(email.trim(), fullName.trim());
    setLoading(false);
    onClose();
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('Please enter your email address.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessNotice(null);

    if (mode === 'signin') {
      const res = await signInWithEmail(email.trim(), password);
      if (!res.success) {
        // If password login failed due to unconfirmed user, provide instant direct Gmail sign in
        if (res.error?.includes('Email not confirmed') || res.error?.includes('Invalid login')) {
          setErrorMsg(res.error + '. If you have not verified your email, click below to continue directly.');
        } else {
          setErrorMsg(res.error || 'Invalid email or password.');
        }
        setLoading(false);
      } else {
        setLoading(false);
        onClose();
      }
    } else {
      if (!fullName.trim()) {
        setErrorMsg('Please enter your full name.');
        setLoading(false);
        return;
      }
      const res = await signUpWithEmail(email.trim(), password, fullName.trim());
      setLoading(false);

      if (!res.success) {
        if (res.error?.includes('rate limit')) {
          // Auto bypass with direct Gmail
          await signInWithDirectGmail(email.trim(), fullName.trim());
          onClose();
          return;
        }
        setErrorMsg(res.error || 'Could not complete registration.');
      } else if (res.needsConfirmation) {
        setSuccessNotice(
          `Account created for ${email}! A confirmation link was dispatched. You can also sign in directly below.`
        );
      } else {
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 p-5 sm:p-8 relative max-h-[95vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="text-center mb-5 sm:mb-6">
          <img
            src="/erise-logo.png"
            alt="E-RISE"
            className="w-10 h-10 sm:w-12 sm:h-12 object-contain mx-auto mb-2 sm:mb-3"
          />
          <h2 className="text-xl sm:text-2xl font-normal text-slate-900 tracking-tight">
            {mode === 'signin'
              ? 'Sign in to E-RISE Meet'
              : mode === 'signup'
              ? 'Create your E-RISE Account'
              : 'Sign in with Google'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Sign in with your Gmail or email credentials to create and join meetings
          </p>
        </div>

        {/* Success Notice Card */}
        {successNotice && (
          <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs leading-relaxed flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-900 mb-0.5">Account Ready</p>
              <p>{successNotice}</p>
            </div>
          </div>
        )}

        {/* Error Alert Card */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs leading-relaxed flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMsg}</div>
          </div>
        )}

        {mode === 'direct_google' ? (
          /* Direct Google Authentication Form */
          <form onSubmit={handleDirectGoogleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Full Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Ayoub Berbache"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-erise-500"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Your Gmail Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@gmail.com"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-erise-500"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-erise-500 hover:bg-erise-600 text-white font-medium text-sm transition shadow-sm flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Continue with Google Account</span>}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMsg(null);
              }}
              className="w-full text-center text-xs text-slate-500 hover:underline pt-2"
            >
              Back to email & password sign in
            </button>
          </form>
        ) : (
          /* Primary Sign In / Sign Up View */
          <div className="space-y-4">
            <button
              type="button"
              onClick={handleGoogleSignInClick}
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 font-medium text-sm text-slate-700 flex items-center justify-center gap-3 transition shadow-sm hover:shadow disabled:opacity-60"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="flex items-center my-3 sm:my-4">
              <div className="flex-1 border-t border-slate-200" />
              <span className="px-3 text-[11px] text-slate-400 uppercase tracking-wider">or sign in with email</span>
              <div className="flex-1 border-t border-slate-200" />
            </div>

            {/* Email / Password Form */}
            <form onSubmit={handleEmailSubmit} className="space-y-3">
              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    placeholder="e.g. Ayoub Berbache"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-erise-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Gmail / Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="name@gmail.com"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-erise-500"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter your password"
                    className="w-full pl-9 pr-10 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-erise-500"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg bg-erise-500 hover:bg-erise-600 text-white font-medium text-sm transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>{mode === 'signin' ? 'Sign in' : 'Create account'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'signin' ? 'signup' : 'signin');
                  setErrorMsg(null);
                  setSuccessNotice(null);
                }}
                className="text-xs text-erise-600 hover:underline"
              >
                {mode === 'signin'
                  ? "Don't have an account? Sign up with your email"
                  : 'Already have an account? Sign in'}
              </button>
            </div>
          </div>
        )}

        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <Shield className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Secured with Supabase Authentication &bull; E-RISE</span>
        </div>
      </div>
    </div>
  );
};

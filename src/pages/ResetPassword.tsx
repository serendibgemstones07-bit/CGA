import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gem, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [ready, setReady] = useState(false);
  const [invalidLink, setInvalidLink] = useState(false);

  useEffect(() => {
    // Supabase parses the recovery hash from the URL on load and fires
    // PASSWORD_RECOVERY with a temporary session that lets us call updateUser.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        setReady(true);
      }
    });

    // If the user already has an active session (e.g. navigated back after link),
    // allow the update as well.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    // If nothing arms us within a short window, the link is stale/invalid.
    const timeout = setTimeout(() => {
      setReady(prev => {
        if (!prev) setInvalidLink(true);
        return prev;
      });
    }, 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }

    setSubmitting(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSuccess(true);
    setTimeout(() => navigate('/login'), 2000);
  }

  if (invalidLink && !ready) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'radial-gradient(ellipse at 30% 20%, #141b2d 0%, #060810 60%)' }}>
        <div className="w-full max-w-sm text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: 'linear-gradient(135deg, #c9a84c 0%, #b87714 100%)' }}>
            <Gem className="w-8 h-8 text-gem-900" />
          </div>
          <h1 className="font-display text-xl font-bold text-gray-200 mb-2">Link Expired or Invalid</h1>
          <p className="text-gray-500 text-sm">This password reset link is no longer valid. Please request a new one.</p>
          <button onClick={() => navigate('/forgot-password')} className="btn-primary mt-6">Request New Link</button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'radial-gradient(ellipse at 30% 20%, #141b2d 0%, #060810 60%)' }}>
        <div className="w-full max-w-sm text-center">
          <CheckCircle className="w-16 h-16 mx-auto mb-4 text-emerald-400" />
          <h1 className="font-display text-xl font-bold text-gray-200 mb-2">Password Updated</h1>
          <p className="text-gray-500 text-sm">Redirecting you to sign in…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 30% 20%, #141b2d 0%, #060810 60%)' }}>

      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #c9a84c 0%, transparent 70%)' }} />

      <div className="w-full max-w-sm animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: 'linear-gradient(135deg, #c9a84c 0%, #b87714 100%)', boxShadow: '0 0 30px rgba(201,168,76,0.3)' }}>
            <Gem className="w-8 h-8 text-gem-900" />
          </div>
          <h1 className="font-display text-2xl font-bold text-gradient-gold">Ceylon Gem Archive</h1>
          <p className="text-sm text-gray-500 mt-1">Set a new password</p>
        </div>

        <div className="gem-card p-8">
          <h2 className="text-lg font-semibold text-gray-200 mb-6">Choose your new password</h2>

          {!ready ? (
            <div className="py-8 flex justify-center"><LoadingSpinner size="lg" /></div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="label-text">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="input-field pr-10"
                    placeholder="Min 6 characters"
                    autoComplete="new-password"
                    autoFocus
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="label-text">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="input-field"
                  placeholder="Repeat password"
                  autoComplete="new-password"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg text-sm text-red-400"
                  style={{ backgroundColor: 'rgba(127,29,29,0.3)', border: '1px solid rgba(185,28,28,0.4)' }}>
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {error}
                </div>
              )}

              <button type="submit" disabled={submitting} className="btn-primary w-full py-3 text-base">
                {submitting ? <LoadingSpinner size="sm" /> : null}
                {submitting ? 'Updating…' : 'Update Password'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          Ceylon Gem Archive · Secure Access Portal
        </p>
      </div>
    </div>
  );
}

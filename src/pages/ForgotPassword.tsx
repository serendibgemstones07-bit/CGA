import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gem, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address.');
      return;
    }
    setError('');
    setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSent(true);
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
          <p className="text-sm text-gray-500 mt-1">Recover your account</p>
        </div>

        <div className="gem-card p-8">
          {sent ? (
            <div className="text-center">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-emerald-400" />
              <h2 className="text-lg font-semibold text-gray-200 mb-2">Check your email</h2>
              <p className="text-sm text-gray-500">
                If an account exists for <span className="text-gray-300">{email}</span>, we've sent a link to reset your password.
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-gray-200 mb-2">Forgot your password?</h2>
              <p className="text-sm text-gray-500 mb-6">
                Enter your email and we'll send you a link to set a new one.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="label-text">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="input-field"
                    placeholder="you@example.com"
                    autoComplete="email"
                    autoFocus
                  />
                </div>

                {error && (
                  <div className="flex items-start gap-2 p-3 rounded-lg text-sm text-red-400"
                    style={{ backgroundColor: 'rgba(127,29,29,0.3)', border: '1px solid rgba(185,28,28,0.4)' }}>
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-3 text-base"
                >
                  {loading ? <LoadingSpinner size="sm" /> : null}
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </button>
              </form>
            </>
          )}

          <button
            onClick={() => navigate('/login')}
            className="mt-6 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to sign in
          </button>
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          Ceylon Gem Archive · Secure Access Portal
        </p>
      </div>
    </div>
  );
}

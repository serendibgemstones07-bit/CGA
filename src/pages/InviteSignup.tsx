import { useState, useEffect, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Gem, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export function InviteSignup() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [inviteValid, setInviteValid] = useState(false);
  const [invitedBy, setInvitedBy] = useState('');

  useEffect(() => {
    if (!token) return;
    supabase
      .from('admin_invites')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .single()
      .then(({ data, error: err }) => {
        if (err || !data) {
          setInviteValid(false);
        } else {
          setInviteValid(true);
          setEmail(data.email);
          setInvitedBy('the super admin');
        }
        setLoading(false);
      });
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }

    setSubmitting(true);

    const { data: authData, error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpErr) {
      setError(signUpErr.message);
      setSubmitting(false);
      return;
    }

    if (authData.user) {
      await supabase.from('profiles').update({
        invited_by: (await supabase.from('admin_invites').select('created_by').eq('token', token!).single()).data?.created_by,
      }).eq('id', authData.user.id);

      await supabase.from('admin_invites').update({ used: true }).eq('token', token!);
    }

    setSuccess(true);
    setSubmitting(false);
    setTimeout(() => navigate('/profile'), 2000);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'radial-gradient(ellipse at 30% 20%, #141b2d 0%, #060810 60%)' }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!inviteValid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'radial-gradient(ellipse at 30% 20%, #141b2d 0%, #060810 60%)' }}>
        <div className="w-full max-w-sm text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: 'linear-gradient(135deg, #c9a84c 0%, #b87714 100%)' }}>
            <Gem className="w-8 h-8 text-gem-900" />
          </div>
          <h1 className="font-display text-xl font-bold text-gray-200 mb-2">Invalid Invite</h1>
          <p className="text-gray-500 text-sm">This invite link is invalid or has already been used.</p>
          <button onClick={() => navigate('/login')} className="btn-secondary mt-6">Go to Login</button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'radial-gradient(ellipse at 30% 20%, #141b2d 0%, #060810 60%)' }}>
        <div className="w-full max-w-sm text-center">
          <CheckCircle className="w-16 h-16 mx-auto mb-4 text-emerald-400" />
          <h1 className="font-display text-xl font-bold text-gray-200 mb-2">Account Created!</h1>
          <p className="text-gray-500 text-sm">Redirecting you to set up your profile…</p>
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
          <p className="text-sm text-gray-500 mt-1">You've been invited by <span className="text-gray-300">{invitedBy}</span></p>
        </div>

        <div className="gem-card p-8">
          <h2 className="text-lg font-semibold text-gray-200 mb-6">Create your account</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label-text">Email Address</label>
              <input type="email" value={email} disabled className="input-field opacity-60 cursor-not-allowed" />
            </div>

            <div>
              <label className="label-text">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input-field pr-10" placeholder="Min 6 characters" autoFocus />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="label-text">Confirm Password</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                className="input-field" placeholder="Repeat password" />
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
              {submitting ? 'Creating Account…' : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          Already have an account? <button onClick={() => navigate('/login')} className="text-yellow-500 hover:underline">Sign in</button>
        </p>
      </div>
    </div>
  );
}

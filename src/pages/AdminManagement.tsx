import { useState, useEffect } from 'react';
import { ChevronLeft, UserPlus, Shield, ShieldOff, Trash2, Copy, Check, Ban, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Profile, AdminInvite } from '../types';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export function AdminManagement() {
  const { user, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  const [admins, setAdmins] = useState<(Profile & { email?: string })[]>([]);
  const [invites, setInvites] = useState<AdminInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');

  useEffect(() => {
    if (!isSuperAdmin) { navigate('/'); return; }
    loadData();
  }, [isSuperAdmin]);

  async function loadData() {
    setLoading(true);
    const [{ data: profiles }, { data: inviteData }] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at'),
      supabase.from('admin_invites').select('*').order('created_at', { ascending: false }),
    ]);
    setAdmins((profiles as Profile[]) ?? []);
    setInvites((inviteData as AdminInvite[]) ?? []);
    setLoading(false);
  }

  async function handleInvite() {
    if (!inviteEmail || !user) return;
    setSending(true);
    setError('');
    setSuccess('');

    const token = crypto.randomUUID();
    const { error: err } = await supabase.from('admin_invites').insert({
      email: inviteEmail,
      token,
      created_by: user.id,
      used: false,
    });

    if (err) {
      setError('Failed to create invite: ' + err.message);
    } else {
      const link = `${window.location.origin}/invite/${token}`;
      setGeneratedLink(link);
      try { await navigator.clipboard.writeText(link); } catch {}
      setSuccess(`Invite created for ${inviteEmail}. Share the link below.`);
      setInviteEmail('');
      loadData();
    }
    setSending(false);
  }

  async function setBlockStatus(profile: Profile, blocked: boolean) {
    await supabase.from('profiles').update({ status: blocked ? 'blocked' : 'active' }).eq('id', profile.id);
    loadData();
  }

  async function promoteToSuperAdmin(profile: Profile) {
    await supabase.from('profiles').update({ role: 'super_admin' }).eq('id', profile.id);
    loadData();
  }

  async function demoteToAdmin(profile: Profile) {
    await supabase.from('profiles').update({ role: 'admin' }).eq('id', profile.id);
    loadData();
  }

  async function removeAdmin(admin: Profile) {
    if (!window.confirm(`Remove "${admin.full_name ?? 'this admin'}"? Their profile will be permanently deleted.`)) return;
    await supabase.from('profiles').delete().eq('id', admin.id);
    loadData();
  }

  async function deleteInvite(id: string) {
    await supabase.from('admin_invites').delete().eq('id', id);
    loadData();
  }

  function copyInviteLink(token: string) {
    const link = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  }

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="btn-ghost p-2">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-100">Admin Management</h1>
          <p className="text-gray-500 text-sm mt-0.5">Invite, manage, and control admin access.</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>
      )}
      {success && (
        <div className="mb-6 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">{success}</div>
      )}

      {/* Invite Section */}
      <div className="gem-card p-6 mb-6">
        <h2 className="font-display text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-yellow-400" /> Invite New Admin
        </h2>
        <div className="flex gap-3">
          <input
            type="email"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            placeholder="admin@example.com"
            className="input-field flex-1"
          />
          <button onClick={handleInvite} disabled={sending || !inviteEmail} className="btn-primary">
            {sending ? 'Sending…' : 'Create Invite Link'}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">A signup link will be generated. Copy and share it with the new admin.</p>

        {generatedLink && (
          <div className="mt-4 p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5">
            <p className="text-xs text-gray-400 mb-2">Share this link with the new admin:</p>
            <div className="flex gap-2">
              <input type="text" value={generatedLink} readOnly className="input-field flex-1 text-sm font-mono text-yellow-300"
                onClick={e => (e.target as HTMLInputElement).select()} />
              <button onClick={() => { navigator.clipboard.writeText(generatedLink); setCopiedToken('generated'); setTimeout(() => setCopiedToken(null), 2000); }}
                className="btn-secondary px-3 flex items-center gap-1 text-sm">
                {copiedToken === 'generated' ? <><Check className="w-4 h-4 text-emerald-400" /> Copied</> : <><Copy className="w-4 h-4" /> Copy</>}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Pending Invites */}
      {invites.filter(i => !i.used).length > 0 && (
        <div className="gem-card p-6 mb-6">
          <h2 className="font-display text-lg font-semibold text-gray-200 mb-4">Pending Invites</h2>
          <div className="space-y-3">
            {invites.filter(i => !i.used).map(invite => (
              <div key={invite.id} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: '#0f1520' }}>
                <div>
                  <p className="text-sm text-gray-200">{invite.email}</p>
                  <p className="text-xs text-gray-500">Invited {new Date(invite.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => copyInviteLink(invite.token)} className="btn-ghost p-2 text-xs" title="Copy link">
                    {copiedToken === invite.token ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button onClick={() => deleteInvite(invite.id)} className="btn-ghost p-2 text-red-400 hover:text-red-300" title="Delete invite">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Admin List */}
      <div className="gem-card p-6">
        <h2 className="font-display text-lg font-semibold text-gray-200 mb-4">All Admins</h2>
        <div className="space-y-3">
          {admins.map(admin => (
            <div key={admin.id} className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: '#0f1520' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold overflow-hidden flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #1a2234 0%, #243050 100%)', border: '1px solid #c9a84c40' }}>
                  {admin.avatar_url ? (
                    <img src={admin.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    admin.full_name?.charAt(0)?.toUpperCase() ?? '?'
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-200">{admin.full_name ?? 'Unnamed'}</p>
                    {admin.role === 'super_admin' && admin.id === user?.id && (
                      <span className="flex items-center gap-1 text-xs text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full">
                        <Shield className="w-3 h-3" /> Super Admin
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{admin.phone ?? 'No phone'} · Joined {new Date(admin.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              {admin.id !== user?.id && (
                <div className="flex items-center gap-2">
                  <div className="flex flex-col items-end gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${admin.role === 'super_admin' ? 'bg-yellow-400/15 text-yellow-400' : 'bg-gray-500/15 text-gray-400'}`}>
                        {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                      </span>
                      {admin.role !== 'super_admin' ? (
                        <button
                          onClick={() => promoteToSuperAdmin(admin)}
                          className="px-3 py-1.5 text-xs flex items-center gap-1.5 rounded-md transition-colors text-yellow-400 border border-yellow-500/40 bg-yellow-500/10 hover:bg-yellow-500/20"
                          title="Promote to Super Admin"
                        >
                          <Shield className="w-3.5 h-3.5" /> Promote
                        </button>
                      ) : (
                        <button
                          onClick={() => demoteToAdmin(admin)}
                          className="px-3 py-1.5 text-xs flex items-center gap-1.5 rounded-md transition-colors text-gray-300 border border-gem-border hover:text-yellow-400 hover:border-yellow-500/40 hover:bg-yellow-500/10"
                          title="Demote to Admin"
                        >
                          <ShieldOff className="w-3.5 h-3.5" /> Demote
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${admin.status === 'blocked' ? 'bg-red-400/15 text-red-400' : 'bg-emerald-400/15 text-emerald-400'}`}>
                        {admin.status === 'blocked' ? 'Blocked' : 'Active'}
                      </span>
                      {admin.status === 'blocked' ? (
                        <button
                          onClick={() => setBlockStatus(admin, false)}
                          className="px-3 py-1.5 text-xs flex items-center gap-1.5 rounded-md transition-colors text-emerald-400 border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20"
                          title="Unblock this admin"
                        >
                          <UserCheck className="w-3.5 h-3.5" /> Unblock
                        </button>
                      ) : (
                        <button
                          onClick={() => setBlockStatus(admin, true)}
                          className="px-3 py-1.5 text-xs flex items-center gap-1.5 rounded-md transition-colors text-red-400 border border-red-500/40 bg-red-500/10 hover:bg-red-500/20"
                          title="Block this admin from logging in"
                        >
                          <Ban className="w-3.5 h-3.5" /> Block
                        </button>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => removeAdmin(admin)}
                    className="btn-ghost p-2 text-xs text-red-500 hover:text-red-300"
                    title="Remove Admin"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

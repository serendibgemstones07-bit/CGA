import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Camera, Save, User, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { ExtraContact } from '../types';

export function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [extraContacts, setExtraContacts] = useState<ExtraContact[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '');
      setPhone(profile.phone ?? '');
      setWhatsappNumber(profile.whatsapp_number ?? '');
      setExtraContacts(profile.extra_contacts ?? []);
      setAvatarUrl(profile.avatar_url ?? null);
    }
    if (user) {
      setEmail(user.email ?? '');
    }
  }, [profile, user]);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    setError('');

    const ext = file.name.split('.').pop();
    const path = `avatars/${user.id}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from('gemstone-media')
      .upload(path, file, { upsert: true });

    if (uploadErr) {
      setError('Failed to upload image: ' + uploadErr.message);
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('gemstone-media')
      .getPublicUrl(path);

    const url = publicUrl + '?t=' + Date.now();
    setAvatarUrl(url);

    await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id);
    setUploading(false);
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    setError('');
    setSuccess('');

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ full_name: fullName, phone: phone || null, whatsapp_number: whatsappNumber || null, extra_contacts: extraContacts.length ? extraContacts : null, avatar_url: avatarUrl })
      .eq('id', user.id);

    if (updateErr) {
      setError('Failed to save: ' + updateErr.message);
    } else {
      await refreshProfile();
      setSuccess('Profile updated successfully.');
      setTimeout(() => setSuccess(''), 3000);
    }
    setSaving(false);
  }

  return (
    <div className="p-4 sm:p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="btn-ghost p-2">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-100">My Profile</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage your account details.</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>
      )}
      {success && (
        <div className="mb-6 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">{success}</div>
      )}

      <div className="gem-card p-6 space-y-8">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative group">
            <div className="w-28 h-28 rounded-full overflow-hidden flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #1a2234 0%, #243050 100%)', border: '3px solid #c9a84c40' }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="w-12 h-12 text-gray-500" />
              )}
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 w-9 h-9 rounded-full flex items-center justify-center text-gem-900 transition-transform hover:scale-110"
              style={{ background: 'linear-gradient(135deg, #c9a84c 0%, #b87714 100%)' }}
            >
              <Camera className="w-4 h-4" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>
          {uploading && <p className="text-xs text-gray-400">Uploading...</p>}
          <div className="text-center">
            <p className="text-xs text-gray-500 capitalize flex items-center justify-center gap-1">
              {profile?.role?.replace('_', ' ')}
            </p>
          </div>
        </div>

        {/* Fields */}
        <div className="space-y-5">
          <div>
            <label className="label-text">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Your name"
              className="input-field"
            />
          </div>

          <div>
            <label className="label-text">Email</label>
            <input
              type="email"
              value={email}
              disabled
              className="input-field opacity-60 cursor-not-allowed"
            />
            <p className="text-xs text-gray-600 mt-1">Email is managed through authentication and cannot be changed here.</p>
          </div>

          <div>
            <label className="label-text">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="e.g. +94 77 123 4567"
              className="input-field"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="label-text mb-0">WhatsApp Number</label>
              {phone && phone !== whatsappNumber && (
                <button type="button" onClick={() => setWhatsappNumber(phone)}
                  className="text-xs text-yellow-400 hover:text-yellow-300 transition-colors">
                  Same as phone
                </button>
              )}
            </div>
            <input
              type="tel"
              value={whatsappNumber}
              onChange={e => setWhatsappNumber(e.target.value)}
              placeholder="e.g. +94 77 123 4567"
              className="input-field mt-1"
            />
            <p className="text-xs text-gray-600 mt-1">Shown on buyer share pages with a WhatsApp button.</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label-text mb-0">Additional Contact Details</label>
              <button type="button" onClick={() => setExtraContacts(prev => [...prev, { type: 'phone', label: '', value: '' }])}
                className="text-xs text-yellow-400 hover:text-yellow-300 flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
            {extraContacts.length === 0 && (
              <p className="text-xs text-gray-600">Add Viber, Telegram, WeChat, or other contact methods for buyers.</p>
            )}
            <div className="space-y-2">
              {extraContacts.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select value={c.type} onChange={e => setExtraContacts(prev => prev.map((x, j) => j === i ? { ...x, type: e.target.value as ExtraContact['type'] } : x))}
                    className="input-field w-28 flex-shrink-0 text-xs">
                    <option value="phone">Phone</option>
                    <option value="viber">Viber</option>
                    <option value="telegram">Telegram</option>
                    <option value="wechat">WeChat</option>
                    <option value="signal">Signal</option>
                    <option value="email">Email</option>
                    <option value="website">Website</option>
                    <option value="other">Other</option>
                  </select>
                  <input type="text" value={c.label} onChange={e => setExtraContacts(prev => prev.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
                    placeholder="Label (optional)" className="input-field w-28 flex-shrink-0 text-xs" />
                  <input type="text" value={c.value} onChange={e => setExtraContacts(prev => prev.map((x, j) => j === i ? { ...x, value: e.target.value } : x))}
                    placeholder="Number or link" className="input-field flex-1 text-xs" />
                  <button type="button" onClick={() => setExtraContacts(prev => prev.filter((_, j) => j !== i))}
                    className="p-1.5 text-gray-500 hover:text-red-400 flex-shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Save */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

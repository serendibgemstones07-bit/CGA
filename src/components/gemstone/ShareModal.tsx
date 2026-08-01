import { useState, useEffect } from 'react';
import { Share2, Copy, CheckCircle, Clock, ExternalLink, Trash2, Eye } from 'lucide-react';
import { nanoid } from 'nanoid';
import { supabase } from '../../lib/supabase';
import type { Gemstone, BuyerShare } from '../../types';
import { Modal } from '../ui/Modal';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
  gemstone: Gemstone;
  onClose: () => void;
}

export function ShareModal({ gemstone, onClose }: Props) {
  const { user } = useAuth();
  const [shares, setShares] = useState<BuyerShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [expiryHours, setExpiryHours] = useState('720');
  const [caption, setCaption] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const baseUrl = window.location.origin;

  useEffect(() => {
    loadShares();
  }, [gemstone.id]);

  async function loadShares() {
    const { data } = await supabase
      .from('buyer_shares')
      .select('*')
      .eq('gemstone_id', gemstone.id)
      .order('created_at', { ascending: false });
    setShares((data as BuyerShare[]) ?? []);
    setLoading(false);
  }

  async function createShare() {
    setCreating(true);
    const token = nanoid(20);
    const expiresAt = expiryHours !== 'never'
      ? new Date(Date.now() + parseInt(expiryHours) * 3600000).toISOString()
      : null;

    const { data } = await supabase.from('buyer_shares').insert({
      gemstone_id: gemstone.id,
      share_token: token,
      caption: caption.trim() || null,
      expires_at: expiresAt,
      created_by: user?.id,
    }).select().single();

    if (data) setShares(prev => [data as BuyerShare, ...prev]);
    setCaption('');
    setCreating(false);
  }

  async function deleteShare(shareId: string) {
    await supabase.from('buyer_shares').delete().eq('id', shareId);
    setShares(prev => prev.filter(s => s.id !== shareId));
  }

  function copyLink(token: string, shareId: string) {
    navigator.clipboard.writeText(`${baseUrl}/share/${token}`);
    setCopiedId(shareId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function isExpired(expiresAt: string | null) {
    return expiresAt && new Date(expiresAt) < new Date();
  }

  return (
    <Modal open title={`Share — ${gemstone.name}`} onClose={onClose} maxWidth="max-w-lg">
      {/* Create new */}
      <div className="mb-6 p-4 rounded-xl" style={{ backgroundColor: '#0a0e18', border: '1px solid #1f2d45' }}>
        <p className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
          <Share2 className="w-4 h-4 text-yellow-400" />
          Create New Share Link
        </p>
        <div className="mb-3">
          <label className="label-text">Personal Caption (optional)</label>
          <textarea value={caption} onChange={e => setCaption(e.target.value)}
            placeholder="e.g. Hand-picked for you — a stunning natural sapphire..."
            rows={2}
            className="input-field resize-none" />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="label-text">Expires in</label>
            <select value={expiryHours} onChange={e => setExpiryHours(e.target.value)} className="input-field">
              <option value="1">1 hour</option>
              <option value="3">3 hours</option>
              <option value="6">6 hours</option>
              <option value="12">12 hours</option>
              <option value="24">1 day</option>
              <option value="168">7 days</option>
              <option value="336">14 days</option>
              <option value="720">30 days</option>
              <option value="2160">90 days</option>
              <option value="never">Never</option>
            </select>
          </div>
          <button onClick={createShare} disabled={creating} className="btn-primary mt-5 whitespace-nowrap">
            {creating ? <LoadingSpinner size="sm" /> : <Share2 className="w-4 h-4" />}
            Generate
          </button>
        </div>
        <p className="text-xs text-gray-600 mt-2">
          Buyer pages show only approved fields. Purchase price, selling price, and internal notes are always hidden.
        </p>
      </div>

      {/* Existing shares */}
      <div>
        <p className="label-text mb-3">Active Share Links</p>
        {loading ? (
          <div className="flex justify-center py-4"><LoadingSpinner /></div>
        ) : shares.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No share links created yet.</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {shares.map(share => {
              const expired = isExpired(share.expires_at);
              return (
                <div key={share.id} className={`flex items-center gap-3 p-3 rounded-lg ${expired ? 'opacity-50' : ''}`}
                  style={{ backgroundColor: '#0f1520', border: '1px solid #1f2d45' }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-gray-300 truncate">
                      /share/{share.share_token}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`text-xs flex items-center gap-1 ${expired ? 'text-red-400' : 'text-gray-500'}`}>
                        <Clock className="w-3 h-3" />
                        {expired ? 'Expired' : share.expires_at
                          ? `Expires ${new Date(share.expires_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                          : 'Never expires'}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Eye className="w-3 h-3" />{share.view_count} views
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => copyLink(share.share_token, share.id)}
                      className="p-1.5 rounded text-gray-400 hover:text-gray-200 transition-colors"
                      title="Copy link" style={{ backgroundColor: 'transparent' }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#1e2940')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                      {copiedId === share.id
                        ? <CheckCircle className="w-4 h-4 text-emerald-400" />
                        : <Copy className="w-4 h-4" />}
                    </button>
                    <a href={`/share/${share.share_token}`} target="_blank" rel="noreferrer"
                      className="p-1.5 rounded text-gray-400 hover:text-gray-200 transition-colors"
                      style={{ backgroundColor: 'transparent' }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#1e2940')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button onClick={() => deleteShare(share.id)}
                      className="p-1.5 rounded text-gray-400 hover:text-red-400 transition-colors"
                      style={{ backgroundColor: 'transparent' }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(127,29,29,0.3)')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}

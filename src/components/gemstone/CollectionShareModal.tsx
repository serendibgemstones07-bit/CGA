import { useState, useEffect } from 'react';
import { X, Copy, Check, Link2, Trash2, Eye, Clock, Package, ListFilter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { SharedCollection } from '../../types';

interface Props {
  selectedGemIds: string[];
  onClose: () => void;
}

export function CollectionShareModal({ selectedGemIds, onClose }: Props) {
  const [tab, setTab] = useState<'create' | 'manage'>('create');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [collectionType, setCollectionType] = useState<'curated' | 'all'>(selectedGemIds.length > 0 ? 'curated' : 'all');
  const [expiryMinutes, setExpiryMinutes] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string[]>(['available']);
  const [creating, setCreating] = useState(false);
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [collections, setCollections] = useState<SharedCollection[]>([]);
  const [loadingCollections, setLoadingCollections] = useState(false);

  useEffect(() => {
    if (tab === 'manage') loadCollections();
  }, [tab]);

  async function loadCollections() {
    setLoadingCollections(true);
    const { data } = await supabase
      .from('shared_collections')
      .select('*')
      .order('created_at', { ascending: false });
    setCollections((data as SharedCollection[]) ?? []);
    setLoadingCollections(false);
  }

  async function handleCreate() {
    if (!name.trim()) return;
    setCreating(true);

    const expires_at = expiryMinutes ? new Date(Date.now() + expiryMinutes * 60000).toISOString() : null;

    const { data: col } = await supabase
      .from('shared_collections')
      .insert({
        name: name.trim(),
        collection_type: collectionType,
        status_filter: collectionType === 'all' ? statusFilter : ['available'],
        message: message.trim() || null,
        expires_at,
      })
      .select()
      .single();

    if (col && collectionType === 'curated' && selectedGemIds.length > 0) {
      const items = selectedGemIds.map((gemstone_id, i) => ({
        collection_id: col.id,
        gemstone_id,
        sort_order: i,
      }));
      await supabase.from('shared_collection_items').insert(items);
    }

    if (col) {
      const link = `${window.location.origin}/catalog/${col.share_token}`;
      setCreatedLink(link);
    }
    setCreating(false);
  }

  async function handleDelete(id: string) {
    await supabase.from('shared_collections').delete().eq('id', id);
    setCollections(prev => prev.filter(c => c.id !== id));
  }

  function copyLink(link: string) {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function isExpired(expiresAt: string | null) {
    return expiresAt && new Date(expiresAt) < new Date();
  }

  function toggleStatus(s: string) {
    setStatusFilter(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="rounded-2xl overflow-hidden w-full max-w-lg max-h-[85vh] flex flex-col"
        style={{ background: '#111827', border: '1px solid #1f2d45' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#1f2d45' }}>
          <div>
            <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
              <Package className="w-5 h-5" style={{ color: '#c9a84c' }} />
              Share Collection
            </h2>
            {selectedGemIds.length > 0 && (
              <p className="text-xs text-gray-500 mt-0.5">{selectedGemIds.length} gem{selectedGemIds.length !== 1 ? 's' : ''} selected</p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b" style={{ borderColor: '#1f2d45' }}>
          <button onClick={() => setTab('create')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${tab === 'create' ? 'text-white border-b-2' : 'text-gray-500 hover:text-gray-300'}`}
            style={tab === 'create' ? { borderColor: '#c9a84c' } : {}}>
            Create New
          </button>
          <button onClick={() => setTab('manage')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${tab === 'manage' ? 'text-white border-b-2' : 'text-gray-500 hover:text-gray-300'}`}
            style={tab === 'manage' ? { borderColor: '#c9a84c' } : {}}>
            Manage Links
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'create' ? (
            createdLink ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: '#065f46' }}>
                  <Check className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Collection Created!</h3>
                <p className="text-sm text-gray-400 mb-4">Share this link with your buyer:</p>
                <div className="flex items-center gap-2 rounded-lg p-3" style={{ background: '#0d1117' }}>
                  <input type="text" readOnly value={createdLink} className="flex-1 bg-transparent text-sm text-gray-300 outline-none font-mono" />
                  <button onClick={() => copyLink(createdLink)}
                    className="p-2 rounded-lg transition-colors" style={{ background: '#1f2d45' }}>
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
                  </button>
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => { setCreatedLink(null); setName(''); setMessage(''); }}
                    className="flex-1 py-2 rounded-lg text-sm text-gray-400 hover:text-white transition-colors" style={{ background: '#1f2d45' }}>
                    Create Another
                  </button>
                  <button onClick={onClose}
                    className="flex-1 py-2 rounded-lg text-sm font-semibold transition-colors"
                    style={{ background: 'linear-gradient(135deg, #c9a84c 0%, #b87714 100%)', color: '#0a0e18' }}>
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Collection Type */}
                <div>
                  <label className="text-xs uppercase tracking-wider text-gray-500 font-medium">Type</label>
                  <div className="grid grid-cols-2 gap-2 mt-1.5">
                    <button onClick={() => setCollectionType('curated')}
                      className={`p-3 rounded-lg text-left transition-colors ${collectionType === 'curated' ? 'ring-1' : ''}`}
                      style={{ background: '#0d1117', borderColor: '#1f2d45', ...(collectionType === 'curated' ? { ringColor: '#c9a84c' } : {}) }}>
                      <ListFilter className="w-4 h-4 mb-1" style={{ color: collectionType === 'curated' ? '#c9a84c' : '#6b7280' }} />
                      <p className="text-sm font-medium text-gray-200">Selected Gems</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        {selectedGemIds.length > 0 ? `${selectedGemIds.length} selected` : 'Pick from list'}
                      </p>
                    </button>
                    <button onClick={() => setCollectionType('all')}
                      className={`p-3 rounded-lg text-left transition-colors ${collectionType === 'all' ? 'ring-1' : ''}`}
                      style={{ background: '#0d1117', borderColor: '#1f2d45', ...(collectionType === 'all' ? { ringColor: '#c9a84c' } : {}) }}>
                      <Package className="w-4 h-4 mb-1" style={{ color: collectionType === 'all' ? '#c9a84c' : '#6b7280' }} />
                      <p className="text-sm font-medium text-gray-200">Full Inventory</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">Auto-updates with stock</p>
                    </button>
                  </div>
                </div>

                {/* Status filter for "all" type */}
                {collectionType === 'all' && (
                  <div>
                    <label className="text-xs uppercase tracking-wider text-gray-500 font-medium">Show Status</label>
                    <div className="flex gap-2 mt-1.5 flex-wrap">
                      <button onClick={() => setStatusFilter(['available', 'reserved', 'sold', 'pending'])}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter.length === 4 ? 'text-white' : 'text-gray-500'}`}
                        style={{ background: statusFilter.length === 4 ? '#1f2d45' : '#0d1117' }}>
                        All
                      </button>
                      {['available', 'reserved', 'sold', 'pending'].map(s => (
                        <button key={s} onClick={() => toggleStatus(s)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${statusFilter.includes(s) && statusFilter.length < 4 ? 'text-white' : 'text-gray-500'}`}
                          style={{ background: statusFilter.includes(s) && statusFilter.length < 4 ? '#1f2d45' : '#0d1117' }}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Name */}
                <div>
                  <label className="text-xs uppercase tracking-wider text-gray-500 font-medium">Collection Name *</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)}
                    placeholder="e.g. Sri Lankan Sapphires for Ahmed"
                    className="w-full mt-1.5 px-3 py-2.5 rounded-lg text-sm text-gray-200 outline-none placeholder-gray-600"
                    style={{ background: '#0d1117', border: '1px solid #1f2d45' }} />
                </div>

                {/* Message */}
                <div>
                  <label className="text-xs uppercase tracking-wider text-gray-500 font-medium">Message (optional)</label>
                  <textarea value={message} onChange={e => setMessage(e.target.value)}
                    placeholder="Add a personal note for the buyer..."
                    rows={2}
                    className="w-full mt-1.5 px-3 py-2.5 rounded-lg text-sm text-gray-200 outline-none placeholder-gray-600 resize-none"
                    style={{ background: '#0d1117', border: '1px solid #1f2d45' }} />
                </div>

                {/* Expiry */}
                <div>
                  <label className="text-xs uppercase tracking-wider text-gray-500 font-medium">Expires</label>
                  <select
                    value={expiryMinutes ?? ''}
                    onChange={e => setExpiryMinutes(e.target.value ? Number(e.target.value) : null)}
                    className="w-full mt-1.5 px-3 py-2.5 rounded-lg text-sm text-gray-200 outline-none appearance-none cursor-pointer"
                    style={{ background: '#0d1117', border: '1px solid #1f2d45' }}>
                    <option value="">Never</option>
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="300">5 hours</option>
                    <option value="720">12 hours</option>
                    <option value="1440">24 hours</option>
                    <option value="2880">2 days</option>
                    <option value="4320">3 days</option>
                    <option value="20160">14 days</option>
                    <option value="43200">30 days</option>
                    <option value="129600">90 days</option>
                  </select>
                </div>

                <button onClick={handleCreate} disabled={creating || !name.trim() || (collectionType === 'curated' && selectedGemIds.length === 0)}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #c9a84c 0%, #b87714 100%)', color: '#0a0e18' }}>
                  {creating ? 'Creating...' : 'Create Share Link'}
                </button>

                {collectionType === 'curated' && selectedGemIds.length === 0 && (
                  <p className="text-xs text-center text-amber-400/70">Select gems from the archive first, then open this modal.</p>
                )}
              </div>
            )
          ) : (
            /* Manage Tab */
            loadingCollections ? (
              <div className="flex justify-center py-10"><LoadingSpinner size="md" /></div>
            ) : collections.length === 0 ? (
              <div className="text-center py-10">
                <Link2 className="w-8 h-8 mx-auto mb-3 text-gray-600" />
                <p className="text-sm text-gray-400">No collection links created yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {collections.map(col => {
                  const expired = isExpired(col.expires_at);
                  const link = `${window.location.origin}/catalog/${col.share_token}`;
                  return (
                    <div key={col.id} className="rounded-lg p-4" style={{ background: '#0d1117', border: '1px solid #1f2d45', opacity: expired ? 0.5 : 1 }}>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-200">{col.name}</p>
                          <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-500">
                            <span className="capitalize">{col.collection_type}</span>
                            <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{col.view_count} views</span>
                            {col.expires_at && (
                              <span className={`flex items-center gap-1 ${expired ? 'text-red-400' : ''}`}>
                                <Clock className="w-3 h-3" />
                                {expired ? 'Expired' : `Expires ${new Date(col.expires_at).toLocaleDateString()}`}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => copyLink(link)} className="p-1.5 rounded text-gray-500 hover:text-gray-300" title="Copy link">
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(col.id)} className="p-1.5 rounded text-gray-500 hover:text-red-400" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function LoadingSpinner({ size }: { size: string }) {
  return <div className={`animate-spin rounded-full border-2 border-gray-600 border-t-gray-300 ${size === 'md' ? 'w-6 h-6' : 'w-8 h-8'}`} />;
}

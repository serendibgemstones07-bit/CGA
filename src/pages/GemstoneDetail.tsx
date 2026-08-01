import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronLeft, Edit, Share2, Gem, MapPin, Weight, Ruler,
  Award, FileText, DollarSign, StickyNote, Calendar,
  Eye, EyeOff, Trash2, ChevronLeft as Prev, ChevronRight as Next,
  Clock, Plus, X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Gemstone, GemstoneHistory, GemstoneEdit } from '../types';
import { StatusBadge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ShareModal } from '../components/gemstone/ShareModal';
import { Lightbox, rotateAndUpload } from '../components/ui/Lightbox';
import { useAuth } from '../contexts/AuthContext';

export function GemstoneDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();

  const [gem, setGem] = useState<Gemstone | null>(null);
  const [creatorName, setCreatorName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInternalPrices, setShowInternalPrices] = useState(false);
  const [activeImg, setActiveImg] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);
  const [history, setHistory] = useState<GemstoneHistory[]>([]);
  const [showHistoryForm, setShowHistoryForm] = useState(false);
  const [historyForm, setHistoryForm] = useState({ event_type: '', event_date: '', location: '', performed_by: '', notes: '' });
  const [savingHistory, setSavingHistory] = useState(false);
  const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ event_type: '', event_date: '', location: '', performed_by: '', notes: '' });
  const [edits, setEdits] = useState<GemstoneEdit[]>([]);

  useEffect(() => {
    if (!id) return;
    supabase.from('gemstones').select('*, gemstone_media(*)').eq('id', id).single()
      .then(async ({ data }) => {
        if (data) {
          const g = data as Gemstone;
          const sorted = [...(g.gemstone_media ?? [])].filter(m => m.media_type !== 'receipt').sort((a, b) => {
            if (a.is_primary !== b.is_primary) return b.is_primary ? 1 : -1;
            return (a.sort_order ?? 0) - (b.sort_order ?? 0);
          });
          setGem({ ...g, gemstone_media: sorted });
          if (g.created_by) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', g.created_by)
              .maybeSingle();
            if (profile?.full_name) setCreatorName(profile.full_name);
          }
        }
        setLoading(false);
      });
    loadHistory();
    if (isSuperAdmin) loadEdits();
  }, [id]);

  async function loadEdits() {
    if (!id) return;
    const { data } = await supabase
      .from('gemstone_edits')
      .select('*')
      .eq('gemstone_id', id)
      .order('created_at', { ascending: false });
    if (data) {
      const editorIds = [...new Set(data.map(e => e.edited_by))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', editorIds);
      const nameMap: Record<string, string> = {};
      for (const p of profiles ?? []) nameMap[p.id] = p.full_name ?? 'Unknown';
      setEdits(data.map(e => ({ ...e, editor_name: nameMap[e.edited_by] ?? 'Unknown' })));
    }
  }

  async function loadHistory() {
    if (!id) return;
    const { data } = await supabase
      .from('gemstone_history')
      .select('*')
      .eq('gemstone_id', id)
      .order('event_date', { ascending: true, nullsFirst: false });
    setHistory((data as GemstoneHistory[]) ?? []);
  }

  async function addHistoryEntry() {
    if (!id || !historyForm.event_type) return;
    setSavingHistory(true);
    await supabase.from('gemstone_history').insert({
      gemstone_id: id,
      event_type: historyForm.event_type,
      event_date: historyForm.event_date || null,
      location: historyForm.location || null,
      performed_by: historyForm.performed_by || null,
      notes: historyForm.notes || null,
    });
    setHistoryForm({ event_type: '', event_date: '', location: '', performed_by: '', notes: '' });
    setShowHistoryForm(false);
    setSavingHistory(false);
    loadHistory();
  }

  async function deleteHistoryEntry(entryId: string) {
    if (!window.confirm('Delete this history entry?')) return;
    await supabase.from('gemstone_history').delete().eq('id', entryId);
    loadHistory();
  }

  function startEditHistory(entry: GemstoneHistory) {
    setEditingHistoryId(entry.id);
    setEditForm({
      event_type: entry.event_type,
      event_date: entry.event_date ?? '',
      location: entry.location ?? '',
      performed_by: entry.performed_by ?? '',
      notes: entry.notes ?? '',
    });
  }

  async function saveEditHistory() {
    if (!editingHistoryId || !editForm.event_type) return;
    setSavingHistory(true);
    await supabase.from('gemstone_history').update({
      event_type: editForm.event_type,
      event_date: editForm.event_date || null,
      location: editForm.location || null,
      performed_by: editForm.performed_by || null,
      notes: editForm.notes || null,
    }).eq('id', editingHistoryId);
    setEditingHistoryId(null);
    setSavingHistory(false);
    loadHistory();
  }

  async function handleDelete() {
    if (!gem || !window.confirm(`Delete "${gem.name}" permanently? This cannot be undone.`)) return;
    setDeleting(true);
    for (const m of gem.gemstone_media ?? []) {
      await supabase.storage.from('gemstone-media').remove([m.storage_path]);
    }
    await supabase.from('gemstones').delete().eq('id', gem.id);
    navigate('/gemstones');
  }

  async function handleReorder(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex || !gem) return;
    const reordered = [...(gem.gemstone_media ?? [])];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    setGem({ ...gem, gemstone_media: reordered });
    if (activeImg === fromIndex) setActiveImg(toIndex);
    else if (fromIndex < activeImg && toIndex >= activeImg) setActiveImg(activeImg - 1);
    else if (fromIndex > activeImg && toIndex <= activeImg) setActiveImg(activeImg + 1);

    await Promise.all(
      reordered.map((m, i) =>
        supabase.from('gemstone_media').update({ sort_order: i, is_primary: i === 0 }).eq('id', m.id)
      )
    );
  }

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;
  if (!gem) return (
    <div className="p-8 text-center text-gray-500">
      <Gem className="w-12 h-12 mx-auto mb-3 text-gray-700" />
      <p>Gemstone not found.</p>
      <Link to="/gemstones" className="btn-primary mt-4 inline-flex">Back to Archive</Link>
    </div>
  );

  const allMedia = gem.gemstone_media ?? [];
  const media = allMedia.filter(m => m.media_type !== 'certificate');
  const certMedia = allMedia.filter(m => m.media_type === 'certificate');
  const activeMedia = media[activeImg];

  const infoRow = (icon: React.ReactNode, label: string, value: string | null | undefined) =>
    value ? (
      <div className="flex items-start gap-3 py-3 border-b border-gem-border last:border-0">
        <span className="text-yellow-400 mt-0.5 flex-shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">{label}</p>
          <p className="text-gray-200 text-sm">{value}</p>
        </div>
      </div>
    ) : null;

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/gemstones')} className="btn-ghost p-2">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-sm text-yellow-400">{gem.archive_number}</span>
            <StatusBadge status={gem.status} />
          </div>
          <h1 className="font-display text-2xl font-bold text-gray-100 truncate">{gem.name}</h1>
          {isSuperAdmin && creatorName && (
            <p className="text-xs text-gray-500 mt-0.5">Added by {creatorName} · {gem.created_at ? new Date(gem.created_at).toLocaleDateString() : ''}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => setShareOpen(true)} className="btn-secondary">
            <Share2 className="w-4 h-4" /> Share
          </button>
          <Link to={`/gemstones/${gem.id}/edit`} className="btn-primary">
            <Edit className="w-4 h-4" /> Edit
          </Link>
          {isSuperAdmin && (
            <button onClick={handleDelete} disabled={deleting} className="btn-danger">
              {deleting ? <LoadingSpinner size="sm" /> : <Trash2 className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Media */}
        <div>
          <div className="gem-card overflow-hidden aspect-square relative">
            {activeMedia ? (
              activeMedia.media_type === 'video' ? (
                <video src={activeMedia.url} controls className="w-full h-full object-contain" />
              ) : (
                <img src={activeMedia.url} alt={gem.name} className="w-full h-full object-contain cursor-zoom-in" onClick={() => setLightboxOpen(true)} />
              )
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gem-700">
                <Gem className="w-20 h-20 text-gray-700" />
              </div>
            )}
            {media.length > 1 && (
              <>
                <button onClick={() => setActiveImg(i => (i - 1 + media.length) % media.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors">
                  <Prev className="w-4 h-4" />
                </button>
                <button onClick={() => setActiveImg(i => (i + 1) % media.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors">
                  <Next className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          {media.length > 1 && (
            <>
              <p className="text-xs text-gray-600 mt-3 mb-1">Drag to reorder</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {media.map((m, i) => (
                  <button
                    key={m.id}
                    draggable
                    onClick={() => setActiveImg(i)}
                    onDragStart={() => setDragIdx(i)}
                    onDragOver={e => { e.preventDefault(); setDropIdx(i); }}
                    onDragLeave={() => setDropIdx(null)}
                    onDrop={e => { e.preventDefault(); if (dragIdx !== null) handleReorder(dragIdx, i); setDragIdx(null); setDropIdx(null); }}
                    onDragEnd={() => { setDragIdx(null); setDropIdx(null); }}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden transition-all relative cursor-grab active:cursor-grabbing ${dragIdx === i ? 'opacity-40 scale-90' : ''} ${dropIdx === i && dragIdx !== i ? 'ring-2 ring-yellow-400 scale-110' : ''}`}
                    style={{ border: i === activeImg ? '2px solid #c9a84c' : '1px solid #1f2d45' }}>
                    {m.media_type === 'video' ? (
                      <div className="w-full h-full flex items-center justify-center" style={{ background: '#0f1520' }}>
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                          <div className="w-0 h-0 ml-0.5 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[8px] border-l-white" />
                        </div>
                      </div>
                    ) : (
                      <img src={m.url} alt="" className="w-full h-full object-cover pointer-events-none" />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Right: Details */}
        <div className="space-y-5">
          {/* Identity */}
          <div className="gem-card p-5">
            <h3 className="font-display text-base font-semibold text-gray-300 mb-1">Properties</h3>
            {infoRow(<MapPin className="w-4 h-4" />, 'Origin', gem.origin)}
            {infoRow(<Gem className="w-4 h-4" />, 'Species', gem.species)}
            {infoRow(<Gem className="w-4 h-4" />, 'Variety', gem.variety)}
            {infoRow(<Weight className="w-4 h-4" />, 'Weight', gem.weight ? `${gem.weight} carats` : null)}
            {infoRow(<Ruler className="w-4 h-4" />, 'Dimensions', gem.dimensions)}
            {infoRow(<Eye className="w-4 h-4" />, 'Color', gem.color)}
            {infoRow(<Eye className="w-4 h-4" />, 'Clarity', gem.clarity)}
            {infoRow(<Gem className="w-4 h-4" />, 'Cut', gem.cut)}
            {infoRow(<FileText className="w-4 h-4" />, 'Treatment', gem.treatment)}
          </div>

          {/* Certification */}
          {(gem.certificate_number || gem.certificate_lab || certMedia.length > 0) && (
            <div className="gem-card p-5">
              <h3 className="font-display text-base font-semibold text-gray-300 mb-1">Certification</h3>
              {gem.certificate_lab === 'On Request' ? (
                <p className="text-sm text-yellow-400 italic mt-2">Certification available on request</p>
              ) : (
                <>
                  {infoRow(<Award className="w-4 h-4" />, 'Certificate', gem.certificate_number)}
                  {infoRow(<Award className="w-4 h-4" />, 'Laboratory', gem.certificate_lab)}
                </>
              )}
              {certMedia.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {certMedia.map(c => (
                    <div key={c.id} className="aspect-square rounded-lg overflow-hidden cursor-pointer" style={{ border: '1px solid #1f2d45' }}
                      onClick={() => window.open(c.url, '_blank')}>
                      <img src={c.url} alt="Certificate" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Pricing */}
          <div className="gem-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-base font-semibold text-gray-300">Pricing</h3>
              {isSuperAdmin && (
                <button onClick={() => setShowInternalPrices(v => !v)}
                  className="btn-ghost px-2 py-1 text-xs gap-1.5">
                  {showInternalPrices ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {showInternalPrices ? 'Hide internal' : 'Show internal'}
                </button>
              )}
            </div>
            <div className="space-y-3">
              {(() => {
                const tc = gem.purchase_price ?? 0;
                const marginBadge = (price: number | null) => {
                  if (!price || !tc) return null;
                  const profit = price - tc;
                  const pct = Math.round((profit / tc) * 100);
                  return (
                    <span className={`text-xs font-medium ml-2 ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {profit >= 0 ? '+' : ''}${profit.toLocaleString()} ({pct}%)
                    </span>
                  );
                };

                return (
                  <>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-400">Buyer Price</span>
                      <span className="font-semibold text-gray-100">
                        {gem.buyer_price ? `$${gem.buyer_price.toLocaleString()}` : '—'}
                        {showInternalPrices && marginBadge(gem.buyer_price)}
                      </span>
                    </div>
                    {gem.sold_price != null && (
                      <div className="flex items-center justify-between py-2 border-t border-gem-border">
                        <span className="text-sm text-gray-400 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />Price Sold
                        </span>
                        <span className="font-semibold text-blue-300">
                          ${gem.sold_price.toLocaleString()}
                          {showInternalPrices && marginBadge(gem.sold_price)}
                        </span>
                      </div>
                    )}
                    {showInternalPrices && (
                      <>
                        {gem.stone_state && (
                          <div className="py-2 border-t border-gem-border">
                            <span className="text-xs text-gray-500 uppercase tracking-wider">
                              Purchased as: {gem.stone_state === 'rough' ? 'Rough' : 'Cut & Polished'}
                              {gem.stone_state === 'rough' && gem.rough_stone_weight ? ` · Rough weight: ${gem.rough_stone_weight} ct` : ''}
                            </span>
                          </div>
                        )}
                        {gem.stone_state === 'rough' && (
                          <>
                            {gem.rough_stone_price != null && (
                              <div className="flex items-center justify-between py-1.5">
                                <span className="text-sm text-gray-500">Rough Stone Price</span>
                                <span className="text-sm text-gray-300">${gem.rough_stone_price.toLocaleString()}</span>
                              </div>
                            )}
                            {gem.preforming_cost != null && (
                              <div className="flex items-center justify-between py-1.5">
                                <span className="text-sm text-gray-500">Preforming Cost</span>
                                <span className="text-sm text-gray-300">${gem.preforming_cost.toLocaleString()}</span>
                              </div>
                            )}
                            {gem.cutting_polishing_cost != null && (
                              <div className="flex items-center justify-between py-1.5">
                                <span className="text-sm text-gray-500">Cut & Polish Cost</span>
                                <span className="text-sm text-gray-300">${gem.cutting_polishing_cost.toLocaleString()}</span>
                              </div>
                            )}
                          </>
                        )}
                        {gem.stone_state === 'cut_polished' && gem.buying_price != null && (
                          <div className="flex items-center justify-between py-1.5">
                            <span className="text-sm text-gray-500">Stone Buying Price</span>
                            <span className="text-sm text-gray-300">${gem.buying_price.toLocaleString()}</span>
                          </div>
                        )}
                        {gem.treatment_cost != null && (
                          <div className="flex items-center justify-between py-1.5">
                            <span className="text-sm text-gray-500">Treatment Cost</span>
                            <span className="text-sm text-gray-300">${gem.treatment_cost.toLocaleString()}</span>
                          </div>
                        )}
                        {gem.certification_cost != null && (
                          <div className="flex items-center justify-between py-1.5">
                            <span className="text-sm text-gray-500">Certification Cost</span>
                            <span className="text-sm text-gray-300">${gem.certification_cost.toLocaleString()}</span>
                          </div>
                        )}
                        {gem.other_costs != null && (
                          <div className="flex items-center justify-between py-1.5">
                            <span className="text-sm text-gray-500">Other Costs</span>
                            <span className="text-sm text-gray-300">${gem.other_costs.toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between py-2 border-t border-gem-border">
                          <span className="text-sm text-gray-400 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />Total Purchase Cost
                          </span>
                          <span className="font-semibold text-yellow-400">
                            {gem.purchase_price ? `$${gem.purchase_price.toLocaleString()}` : '—'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-t border-gem-border">
                          <span className="text-sm text-gray-400 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />Min. Selling Price
                          </span>
                          <span className="font-semibold text-yellow-400">
                            {gem.selling_price ? `$${gem.selling_price.toLocaleString()}` : '—'}
                            {marginBadge(gem.selling_price)}
                          </span>
                        </div>
                      </>
                    )}
                  </>
                );
              })()}
            </div>
          </div>

          {/* Notes */}
          {(gem.buyer_notes || (isSuperAdmin && gem.internal_notes)) && (
            <div className="gem-card p-5">
              <h3 className="font-display text-base font-semibold text-gray-300 mb-3">Notes</h3>
              {gem.buyer_notes && (
                <div className="mb-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <StickyNote className="w-3 h-3 text-emerald-400" />Buyer Notes
                  </p>
                  <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">{gem.buyer_notes}</p>
                </div>
              )}
              {isSuperAdmin && gem.internal_notes && (
                <div className="pt-3 border-t border-gem-border">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <StickyNote className="w-3 h-3 text-red-400" />Internal Notes
                  </p>
                  <p className="text-sm text-gray-300 leading-relaxed">{gem.internal_notes}</p>
                </div>
              )}
            </div>
          )}

          {/* History Timeline */}
          <div className="gem-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-base font-semibold text-gray-300 flex items-center gap-2">
                <Clock className="w-4 h-4 text-yellow-400" /> Provenance & History
              </h3>
              <button
                onClick={() => setShowHistoryForm(!showHistoryForm)}
                className="text-xs flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-yellow-400 hover:bg-yellow-400/10 transition-colors"
              >
                {showHistoryForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                {showHistoryForm ? 'Cancel' : 'Add Event'}
              </button>
            </div>

            {showHistoryForm && (
              <div className="mb-4 p-4 rounded-lg space-y-3" style={{ backgroundColor: '#0f1520', border: '1px solid #1f2d45' }}>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Event Type *</label>
                    <input
                      type="text"
                      value={historyForm.event_type}
                      onChange={e => setHistoryForm(f => ({ ...f, event_type: e.target.value }))}
                      placeholder="e.g. Rough purchased"
                      className="input-field text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Date</label>
                    <input
                      type="date"
                      value={historyForm.event_date}
                      onChange={e => setHistoryForm(f => ({ ...f, event_date: e.target.value }))}
                      className="input-field text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Location</label>
                    <input
                      type="text"
                      value={historyForm.location}
                      onChange={e => setHistoryForm(f => ({ ...f, location: e.target.value }))}
                      placeholder="e.g. Ratnapura, Sri Lanka"
                      className="input-field text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Performed By</label>
                    <input
                      type="text"
                      value={historyForm.performed_by}
                      onChange={e => setHistoryForm(f => ({ ...f, performed_by: e.target.value }))}
                      placeholder="e.g. A. Silva"
                      className="input-field text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Notes</label>
                  <input
                    type="text"
                    value={historyForm.notes}
                    onChange={e => setHistoryForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Additional details..."
                    className="input-field text-sm"
                  />
                </div>
                <button
                  onClick={addHistoryEntry}
                  disabled={!historyForm.event_type || savingHistory}
                  className="btn-primary text-sm w-full disabled:opacity-40"
                >
                  {savingHistory ? 'Saving…' : 'Add to Timeline'}
                </button>
              </div>
            )}

            {history.length === 0 && !showHistoryForm ? (
              <p className="text-sm text-gray-600 text-center py-4">No history recorded yet. Click "Add Event" to start tracking this gemstone's journey.</p>
            ) : (
              <div className="relative ml-3">
                {history.length > 0 && <div className="absolute left-0 top-2 bottom-2 w-px bg-yellow-400/20" />}
                <div className="space-y-0">
                  {history.map(entry => (
                    <div key={entry.id} className="relative pl-6 pb-4 group">
                      <div className="absolute left-[-4px] top-1.5 w-2 h-2 rounded-full bg-yellow-400 ring-2 ring-gem-900" />
                      {editingHistoryId === entry.id ? (
                        <div className="p-3 rounded-lg space-y-3" style={{ backgroundColor: '#0f1520', border: '1px solid #1f2d45' }}>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Event Type *</label>
                              <input type="text" value={editForm.event_type} onChange={e => setEditForm(f => ({ ...f, event_type: e.target.value }))} className="input-field text-sm" />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Date</label>
                              <input type="date" value={editForm.event_date} onChange={e => setEditForm(f => ({ ...f, event_date: e.target.value }))} className="input-field text-sm" />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Location</label>
                              <input type="text" value={editForm.location} onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))} className="input-field text-sm" />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Performed By</label>
                              <input type="text" value={editForm.performed_by} onChange={e => setEditForm(f => ({ ...f, performed_by: e.target.value }))} className="input-field text-sm" />
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Notes</label>
                            <input type="text" value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} className="input-field text-sm" />
                          </div>
                          <div className="flex gap-2">
                            <button onClick={saveEditHistory} disabled={!editForm.event_type || savingHistory} className="btn-primary text-sm flex-1 disabled:opacity-40">
                              {savingHistory ? 'Saving…' : 'Save'}
                            </button>
                            <button onClick={() => setEditingHistoryId(null)} className="text-sm px-3 py-1.5 rounded-lg text-gray-400 hover:text-gray-200 transition-colors" style={{ border: '1px solid #1f2d45' }}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-200">{entry.event_type}</p>
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                              {entry.event_date && (
                                <span className="text-xs text-gray-500">
                                  {new Date(entry.event_date + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                </span>
                              )}
                              {entry.location && <span className="text-xs text-gray-500">📍 {entry.location}</span>}
                              {entry.performed_by && <span className="text-xs text-gray-500">👤 {entry.performed_by}</span>}
                            </div>
                            {entry.notes && <p className="text-xs text-gray-500 mt-1">{entry.notes}</p>}
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-all">
                            <button onClick={() => startEditHistory(entry)} className="p-1 text-gray-600 hover:text-yellow-400" title="Edit entry">
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => deleteHistoryEntry(entry.id)} className="p-1 text-gray-600 hover:text-red-400" title="Delete entry">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Meta */}
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Calendar className="w-3.5 h-3.5" />
            Added {new Date(gem.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Edit History - Super Admin Only */}
      {isSuperAdmin && edits.length > 0 && (
        <div className="gem-card p-5 mt-6">
          <h3 className="font-display text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-yellow-400" /> Edit History
          </h3>
          <div className="space-y-2">
            {edits.map(edit => (
              <div key={edit.id} className="flex items-start gap-3 text-xs p-2 rounded-lg" style={{ backgroundColor: '#0f1520' }}>
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold"
                  style={{ background: 'linear-gradient(135deg, #1a2234, #243050)', border: '1px solid #c9a84c40' }}>
                  {edit.editor_name?.charAt(0)?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-300">
                    <span className="font-medium text-gray-200">{edit.editor_name}</span> &middot; {edit.summary}
                  </p>
                  <p className="text-gray-600 mt-0.5">
                    {new Date(edit.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {shareOpen && <ShareModal gemstone={gem} onClose={() => setShareOpen(false)} />}

      {lightboxOpen && activeMedia && (
        <Lightbox
          url={activeMedia.url}
          alt={gem.name}
          mediaType={activeMedia.media_type}
          onClose={() => setLightboxOpen(false)}
          hasPrev={media.length > 1}
          hasNext={media.length > 1}
          onPrev={() => setActiveImg(i => (i - 1 + media.length) % media.length)}
          onNext={() => setActiveImg(i => (i + 1) % media.length)}
          onRotateSave={async (degrees) => {
            const newUrl = await rotateAndUpload(activeMedia.url, activeMedia.storage_path, degrees, supabase);
            await supabase.from('gemstone_media').update({ url: newUrl.split('?')[0] }).eq('id', activeMedia.id);
            const updated = [...media];
            updated[activeImg] = { ...activeMedia, url: newUrl };
            setGem({ ...gem, gemstone_media: updated });
          }}
        />
      )}
    </div>
  );
}

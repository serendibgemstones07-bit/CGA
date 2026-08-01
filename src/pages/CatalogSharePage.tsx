import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Gem, Eye, Clock, MapPin, Scale, Palette, Phone, MessageCircle, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Gemstone, SharedCollection, GemstoneMedia } from '../types';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

type GemWithMedia = Gemstone & { gemstone_media: GemstoneMedia[] };

export function CatalogSharePage() {
  const { token } = useParams<{ token: string }>();
  const [collection, setCollection] = useState<SharedCollection | null>(null);
  const [gems, setGems] = useState<GemWithMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [selectedGem, setSelectedGem] = useState<GemWithMedia | null>(null);
  const [sender, setSender] = useState<{ name: string | null; phone: string | null; whatsapp_number: string | null; extra_contacts: import('../types').ExtraContact[] | null; avatar_url: string | null } | null>(null);

  useEffect(() => { if (token) load(token); }, [token]);

  async function load(t: string) {
    const { data: col } = await supabase
      .from('shared_collections')
      .select('*')
      .eq('share_token', t)
      .single();

    if (!col) { setNotFound(true); setLoading(false); return; }

    const collection = col as SharedCollection;
    if (collection.expires_at && new Date(collection.expires_at) < new Date()) {
      setExpired(true); setCollection(collection); setLoading(false); return;
    }

    setCollection(collection);

    await supabase.from('shared_collections').update({ view_count: (collection.view_count || 0) + 1 }).eq('id', collection.id);

    let gemData: GemWithMedia[] = [];

    if (collection.collection_type === 'all') {
      const statusFilter = collection.status_filter?.length ? collection.status_filter : ['available'];
      const { data } = await supabase
        .from('gemstones')
        .select('*, gemstone_media(*)')
        .in('status', statusFilter)
        .order('created_at', { ascending: false });
      gemData = (data as GemWithMedia[]) ?? [];
    } else {
      const { data: items } = await supabase
        .from('shared_collection_items')
        .select('gemstone_id, sort_order')
        .eq('collection_id', collection.id)
        .order('sort_order');

      if (items?.length) {
        const ids = items.map(i => i.gemstone_id);
        const { data } = await supabase
          .from('gemstones')
          .select('*, gemstone_media(*)')
          .in('id', ids);
        const gemMap = new Map((data as GemWithMedia[] ?? []).map(g => [g.id, g]));
        gemData = ids.map(id => gemMap.get(id)).filter(Boolean) as GemWithMedia[];
      }
    }

    setGems(gemData);

    if (collection.created_by) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone, whatsapp_number, extra_contacts, avatar_url')
        .eq('id', collection.created_by)
        .maybeSingle();
      if (profile) setSender({ name: profile.full_name, phone: profile.phone, whatsapp_number: profile.whatsapp_number, extra_contacts: profile.extra_contacts, avatar_url: profile.avatar_url });
    }

    setLoading(false);
  }

  function getPrimaryImage(gem: GemWithMedia): string | null {
    const media = gem.gemstone_media ?? [];
    const primary = media.find(m => m.is_primary && m.media_type === 'image');
    if (primary) return primary.url;
    const firstImage = media.filter(m => m.media_type === 'image').sort((a, b) => a.sort_order - b.sort_order)[0];
    return firstImage?.url ?? null;
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0e18' }}>
      <LoadingSpinner size="lg" />
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0e18' }}>
      <div className="text-center">
        <Gem className="w-12 h-12 mx-auto mb-4 text-gray-600" />
        <h1 className="text-xl font-display font-bold text-gray-300">Collection Not Found</h1>
        <p className="text-sm text-gray-500 mt-2">This link may be invalid or has been removed.</p>
      </div>
    </div>
  );

  if (expired) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0e18' }}>
      <div className="text-center">
        <Clock className="w-12 h-12 mx-auto mb-4 text-gray-600" />
        <h1 className="text-xl font-display font-bold text-gray-300">Link Expired</h1>
        <p className="text-sm text-gray-500 mt-2">This collection link has expired. Contact the sender for a new one.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: '#0a0e18' }}>
      {/* Header */}
      <div className="border-b" style={{ borderColor: '#1f2d45' }}>
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #c9a84c 0%, #b87714 100%)' }}>
              <Gem className="w-5 h-5" style={{ color: '#0a0e18' }} />
            </div>
            <div>
              <h1 className="font-display text-sm font-bold" style={{ color: '#c9a84c' }}>Ceylon Gem Archive</h1>
              <p className="text-xs text-gray-500">Curated Collection</p>
            </div>
          </div>
          <h2 className="text-2xl font-display font-bold text-white mt-4">{collection?.name}</h2>
          {collection?.message && (
            <p className="text-sm text-gray-400 mt-2">{collection.message}</p>
          )}
          <p className="text-xs text-gray-500 mt-3">
            {gems.length} gemstone{gems.length !== 1 ? 's' : ''} in this collection
          </p>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {gems.length === 0 ? (
          <div className="text-center py-20">
            <Gem className="w-10 h-10 mx-auto mb-3 text-gray-600" />
            <p className="text-gray-400">No gemstones in this collection.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {gems.map(gem => {
              const img = getPrimaryImage(gem);
              return (
                <div key={gem.id}
                  className="rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:scale-[1.02]"
                  style={{ background: '#111827', border: '1px solid #1f2d45' }}
                  onClick={() => setSelectedGem(gem)}>
                  <div className="aspect-[4/3] relative" style={{ background: '#0d1117' }}>
                    {img ? (
                      <img src={img} alt={gem.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Gem className="w-10 h-10 text-gray-700" />
                      </div>
                    )}
                    <div className="absolute top-3 left-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                        style={{ background: gem.status === 'available' ? '#065f46' : gem.status === 'reserved' ? '#92400e' : '#1f2937', color: gem.status === 'available' ? '#6ee7b7' : gem.status === 'reserved' ? '#fcd34d' : '#9ca3af' }}>
                        {gem.status}
                      </span>
                    </div>
                    <div className="absolute top-3 right-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono" style={{ background: 'rgba(0,0,0,0.6)', color: '#c9a84c' }}>
                        {gem.archive_number}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-semibold text-white">{gem.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {[gem.species, gem.variety].filter(Boolean).join(' · ')}
                    </p>
                    <div className="flex items-center gap-4 mt-3 text-[11px] text-gray-400">
                      {gem.origin && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{gem.origin}</span>}
                      {gem.weight && <span className="flex items-center gap-1"><Scale className="w-3 h-3" />{gem.weight} ct</span>}
                      {gem.color && <span className="flex items-center gap-1"><Palette className="w-3 h-3" />{gem.color}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer with sender details */}
      <div className="border-t py-8" style={{ borderColor: '#1f2d45' }}>
        {collection?.message && (
          <div className="mb-6 px-4 py-3 rounded-lg text-sm text-gray-300 italic text-center max-w-xl mx-auto" style={{ background: '#0f1520', border: '1px solid #1f2d45' }}>
            "{collection.message}"
          </div>
        )}

        {sender && (
          <div className="flex flex-col items-center text-center mb-6">
            {sender.avatar_url ? (
              <img src={sender.avatar_url} alt={sender.name ?? ''} className="w-14 h-14 rounded-full object-cover mb-3" />
            ) : (
              <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
                style={{ background: 'linear-gradient(135deg, #c9a84c 0%, #b87714 100%)' }}>
                <User className="w-7 h-7 text-gem-900" />
              </div>
            )}
            <p className="font-display text-base font-semibold text-gray-100">{sender.name ?? 'Ceylon Gem Archive'}</p>
            {sender.phone && (
              <p className="text-sm text-gray-400 mt-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" />
                {sender.phone}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2 flex-wrap justify-center">
              {(sender.whatsapp_number || sender.phone) && (
                <a href={`https://wa.me/${(sender.whatsapp_number || sender.phone)!.replace(/[^0-9]/g, '')}`}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                  style={{ background: '#25D366' }}>
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </a>
              )}
              {sender.extra_contacts?.map((ec, i) => (
                <a key={i} href={ec.type === 'email' ? `mailto:${ec.value}` : ec.type === 'website' ? ec.value : `tel:${ec.value}`}
                  target={ec.type === 'website' ? '_blank' : undefined}
                  rel={ec.type === 'website' ? 'noopener noreferrer' : undefined}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-300 transition-colors"
                  style={{ background: '#1e2940', border: '1px solid #1f2d45' }}>
                  {ec.label || ec.type.charAt(0).toUpperCase() + ec.type.slice(1)}: {ec.value}
                </a>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-gray-600 text-center">Ceylon Gem Archive · Serendib Gemstones</p>
      </div>

      {/* Detail Modal */}
      {selectedGem && (
        <GemDetailModal gem={selectedGem} onClose={() => setSelectedGem(null)} getPrimaryImage={getPrimaryImage} />
      )}
    </div>
  );
}

function GemDetailModal({ gem, onClose, getPrimaryImage }: { gem: GemWithMedia; onClose: () => void; getPrimaryImage: (g: GemWithMedia) => string | null }) {
  const media = (gem.gemstone_media ?? [])
    .filter(m => m.media_type === 'image' || m.media_type === 'video')
    .sort((a, b) => a.sort_order - b.sort_order);
  const [currentIdx, setCurrentIdx] = useState(0);
  const currentMedia = media[currentIdx];

  const properties = [
    { label: 'Species', value: gem.species },
    { label: 'Variety', value: gem.variety },
    { label: 'Origin', value: gem.origin },
    { label: 'Weight', value: gem.weight ? `${gem.weight} ct` : null },
    { label: 'Dimensions', value: gem.dimensions },
    { label: 'Color', value: gem.color },
    { label: 'Clarity', value: gem.clarity },
    { label: 'Cut', value: gem.cut },
    { label: 'Treatment', value: gem.treatment },
    { label: 'Certificate', value: [gem.certificate_lab, gem.certificate_number].filter(Boolean).join(' — ') || null },
  ].filter(p => p.value);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="rounded-2xl overflow-hidden w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        style={{ background: '#111827', border: '1px solid #1f2d45' }}
        onClick={e => e.stopPropagation()}>
        {/* Media */}
        <div className="aspect-video relative" style={{ background: '#0d1117' }}>
          {media.length > 0 ? (
            <>
              {currentMedia.media_type === 'video' ? (
                <video src={currentMedia.url} controls className="w-full h-full object-contain" />
              ) : (
                <img src={currentMedia.url} alt={gem.name} className="w-full h-full object-contain" />
              )}
              {media.length > 1 && (
                <>
                  <button onClick={() => setCurrentIdx(i => (i - 1 + media.length) % media.length)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors"
                    style={{ background: 'rgba(0,0,0,0.5)' }}>
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button onClick={() => setCurrentIdx(i => (i + 1) % media.length)}
                    className="absolute right-12 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors"
                    style={{ background: 'rgba(0,0,0,0.5)' }}>
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {media.map((m, i) => (
                      <button key={i} onClick={() => setCurrentIdx(i)}
                        className={`w-2 h-2 rounded-full transition-colors ${i === currentIdx ? 'bg-white' : 'bg-white/30'}`}
                        title={m.media_type === 'video' ? 'Video' : 'Image'} />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Gem className="w-16 h-16 text-gray-700" />
            </div>
          )}
          <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white"
            style={{ background: 'rgba(0,0,0,0.5)' }}>
            &times;
          </button>
        </div>

        {/* Info */}
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-display font-bold text-white">{gem.name}</h2>
              <p className="text-xs font-mono mt-1" style={{ color: '#c9a84c' }}>{gem.archive_number}</p>
            </div>
            <span className="px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider"
              style={{ background: gem.status === 'available' ? '#065f46' : '#92400e', color: gem.status === 'available' ? '#6ee7b7' : '#fcd34d' }}>
              {gem.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-6">
            {properties.map(({ label, value }) => (
              <div key={label} className="rounded-lg p-3" style={{ background: '#0d1117' }}>
                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">{label}</p>
                <p className="text-sm text-gray-200">{value}</p>
              </div>
            ))}
          </div>

          {gem.buyer_notes && (
            <div className="mt-4 rounded-lg p-3" style={{ background: '#0d1117' }}>
              <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Notes</p>
              <p className="text-sm text-gray-300">{gem.buyer_notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

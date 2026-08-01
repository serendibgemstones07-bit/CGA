import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Gem, MapPin, Weight, Ruler, Award, Clock,
  ChevronLeft as Prev, ChevronRight as Next,
  AlertCircle, Phone, MessageCircle, User,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Gemstone, BuyerShare } from '../types';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { StatusBadge } from '../components/ui/Badge';
import { Lightbox } from '../components/ui/Lightbox';

type PageState = 'loading' | 'valid' | 'expired' | 'not_found';

export function BuyerSharePage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<PageState>('loading');
  const [gem, setGem] = useState<Gemstone | null>(null);
  const [share, setShare] = useState<BuyerShare | null>(null);
  const [activeImg, setActiveImg] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [contact, setContact] = useState<{ name: string | null; phone: string | null; whatsapp_number: string | null; extra_contacts: import('../types').ExtraContact[] | null; avatar_url: string | null } | null>(null);

  useEffect(() => {
    if (!token) { setState('not_found'); return; }
    load();
  }, [token]);

  async function load() {
    const { data: shareData, error } = await supabase
      .from('buyer_shares')
      .select('*')
      .eq('share_token', token)
      .single();

    if (error || !shareData) { setState('not_found'); return; }

    const s = shareData as BuyerShare;

    if (s.expires_at && new Date(s.expires_at) < new Date()) {
      setState('expired');
      return;
    }

    // Increment view count
    await supabase.from('buyer_shares').update({ view_count: s.view_count + 1 }).eq('id', s.id);
    setShare({ ...s, view_count: s.view_count + 1 });

    // Fetch gemstone — select only buyer-safe columns (never purchase_price, selling_price, internal_notes)
    const { data: gemData } = await supabase
      .from('gemstones')
      .select(`
        id, archive_number, name, species, variety, origin,
        weight, dimensions, color, clarity, cut, treatment,
        certificate_number, certificate_lab,
        buyer_price, status, buyer_notes, created_at,
        gemstone_media(id, url, media_type, is_primary)
      `)
      .eq('id', s.gemstone_id)
      .single();

    if (!gemData) { setState('not_found'); return; }

    const g = gemData as Gemstone;
    const sorted = [...(g.gemstone_media ?? [])].filter(m => m.media_type !== 'receipt').sort((a, b) => {
      if (a.is_primary !== b.is_primary) return b.is_primary ? 1 : -1;
      return (a.sort_order ?? 0) - (b.sort_order ?? 0);
    });
    setGem({ ...g, gemstone_media: sorted });

    if (s.created_by) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone, whatsapp_number, extra_contacts, avatar_url')
        .eq('id', s.created_by)
        .maybeSingle();
      if (profile) setContact({ name: profile.full_name, phone: profile.phone, whatsapp_number: profile.whatsapp_number, extra_contacts: profile.extra_contacts, avatar_url: profile.avatar_url });
    }

    setState('valid');
  }

  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'radial-gradient(ellipse at top, #0f1520 0%, #060810 100%)' }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (state === 'not_found' || state === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'radial-gradient(ellipse at top, #0f1520 0%, #060810 100%)' }}>
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'rgba(127,29,29,0.3)', border: '1px solid rgba(185,28,28,0.4)' }}>
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="font-display text-xl font-bold text-gray-200 mb-2">
            {state === 'expired' ? 'Link Expired' : 'Invalid Link'}
          </h1>
          <p className="text-gray-500 text-sm">
            {state === 'expired'
              ? 'This share link has expired. Please contact us for a new link.'
              : 'This share link is invalid or has been removed.'}
          </p>
        </div>
      </div>
    );
  }

  if (!gem) return null;

  const media = gem.gemstone_media ?? [];
  const activeMedia = media[activeImg];

  return (
    <div className="min-h-screen" style={{ background: 'radial-gradient(ellipse at top, #0f1520 0%, #060810 100%)' }}>
      {/* Header */}
      <header style={{ borderBottom: '1px solid #1f2d45', backgroundColor: 'rgba(10,14,24,0.9)', backdropFilter: 'blur(12px)' }}
        className="sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #c9a84c 0%, #b87714 100%)' }}>
              <Gem className="w-4 h-4 text-gem-900" />
            </div>
            <div>
              <p className="font-display text-sm font-bold text-gradient-gold leading-none">Ceylon Gem Archive</p>
              <p className="text-xs text-gray-600">Gemstone Presentation</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Clock className="w-3.5 h-3.5" />
            {share?.expires_at
              ? `Valid until ${new Date(share.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
              : 'Permanent link'}
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Media */}
          <div>
            <div className="rounded-2xl overflow-hidden aspect-square relative"
              style={{ background: '#141b2d', border: '1px solid #1f2d45', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
              {activeMedia ? (
                activeMedia.media_type === 'video' ? (
                  <video src={activeMedia.url} controls className="w-full h-full object-contain" />
                ) : (
                  <img src={activeMedia.url} alt={gem.name} className="w-full h-full object-contain cursor-zoom-in" onClick={() => setLightboxOpen(true)} />
                )
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Gem className="w-24 h-24 text-gray-700" />
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
              <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                {media.map((m, i) => (
                  <button key={m.id} onClick={() => setActiveImg(i)}
                    className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden transition-all relative"
                    style={{ border: i === activeImg ? '2px solid #c9a84c' : '1px solid #1f2d45' }}>
                    {m.media_type === 'video' ? (
                      <div className="w-full h-full flex items-center justify-center" style={{ background: '#0f1520' }}>
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                          <div className="w-0 h-0 ml-0.5 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[8px] border-l-white" />
                        </div>
                      </div>
                    ) : (
                      <img src={m.url} alt="" className="w-full h-full object-cover" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="space-y-6">
            {/* Title */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-sm text-yellow-400">{gem.archive_number}</span>
                <StatusBadge status={gem.status} />
              </div>
              <h1 className="font-display text-3xl font-bold text-gray-100 leading-tight">{gem.name}</h1>
              <p className="text-gray-400 mt-1">
                {[gem.species, gem.variety, gem.origin].filter(Boolean).join(' · ')}
              </p>
            </div>

            {/* Price */}
            {gem.buyer_price && (
              <div className="p-5 rounded-xl" style={{ background: 'linear-gradient(135deg, #141b2d, #1a2234)', border: '1px solid #c9a84c30' }}>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Asking Price</p>
                <p className="font-display text-4xl font-bold text-gradient-gold">
                  ${gem.buyer_price.toLocaleString()}
                  <span className="text-base font-normal text-gray-400 ml-2">USD</span>
                </p>
              </div>
            )}

            {/* Properties */}
            <div className="rounded-xl p-5" style={{ background: '#141b2d', border: '1px solid #1f2d45' }}>
              <h3 className="font-display text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Gemstone Properties</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: <MapPin className="w-3.5 h-3.5" />, label: 'Origin', value: gem.origin },
                  { icon: <Weight className="w-3.5 h-3.5" />, label: 'Weight', value: gem.weight ? `${gem.weight} ct` : null },
                  { icon: <Ruler className="w-3.5 h-3.5" />, label: 'Dimensions', value: gem.dimensions },
                  { icon: <Gem className="w-3.5 h-3.5" />, label: 'Color', value: gem.color },
                  { icon: <Gem className="w-3.5 h-3.5" />, label: 'Clarity', value: gem.clarity },
                  { icon: <Gem className="w-3.5 h-3.5" />, label: 'Cut', value: gem.cut },
                  { icon: <Gem className="w-3.5 h-3.5" />, label: 'Treatment', value: gem.treatment },
                ].filter(r => r.value).map(({ icon, label, value }) => (
                  <div key={label} className="flex items-start gap-2">
                    <span className="text-yellow-400 mt-0.5 flex-shrink-0">{icon}</span>
                    <div>
                      <p className="text-xs text-gray-600">{label}</p>
                      <p className="text-sm text-gray-200">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Certificate */}
            {(gem.certificate_number || gem.certificate_lab) && (
              <div className="rounded-xl p-4 flex items-center gap-3"
                style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)' }}>
                <Award className="w-8 h-8 text-yellow-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-200">
                    {gem.certificate_lab !== 'None' ? gem.certificate_lab : ''} Certified
                  </p>
                  {gem.certificate_number && (
                    <p className="text-xs text-gray-500 font-mono mt-0.5">{gem.certificate_number}</p>
                  )}
                </div>
              </div>
            )}

            {/* Buyer Notes */}
            {gem.buyer_notes && (
              <div className="rounded-xl p-4" style={{ background: '#141b2d', border: '1px solid #1f2d45' }}>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Description</p>
                <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">{gem.buyer_notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Contact */}
        {contact && (contact.name || contact.phone) && (
          <div className="mt-10 rounded-xl p-6"
            style={{ background: 'linear-gradient(135deg, #141b2d, #1a2234)', border: '1px solid #c9a84c30' }}>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-4">Your Representative</p>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                {contact.avatar_url ? (
                  <img src={contact.avatar_url} alt={contact.name ?? ''} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #c9a84c 0%, #b87714 100%)' }}>
                    <User className="w-6 h-6 text-gem-900" />
                  </div>
                )}
                <div>
                  <p className="font-display text-lg font-semibold text-gray-100">{contact.name ?? 'Ceylon Gem Archive'}</p>
                  {contact.phone && <p className="text-sm text-gray-400 mt-0.5">{contact.phone}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {contact.phone && (
                  <a href={`tel:${contact.phone}`}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-200 transition-colors"
                    style={{ background: '#1e2940', border: '1px solid #c9a84c40' }}>
                    <Phone className="w-4 h-4 text-yellow-400" />
                    Call
                  </a>
                )}
                {(contact.whatsapp_number || contact.phone) && (
                  <a href={`https://wa.me/${(contact.whatsapp_number || contact.phone)!.replace(/[^0-9]/g, '')}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-colors"
                    style={{ background: '#25D366' }}>
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer with sender details */}
        <div className="mt-10 pt-8" style={{ borderTop: '1px solid #1f2d45' }}>
          {share?.caption && (
            <div className="mb-6 px-4 py-3 rounded-lg text-sm text-gray-300 italic" style={{ background: '#0f1520', border: '1px solid #1f2d45' }}>
              "{share.caption}"
            </div>
          )}

          {contact && (
            <div className="flex flex-col items-center text-center mb-6">
              {contact.avatar_url ? (
                <img src={contact.avatar_url} alt={contact.name ?? ''} className="w-16 h-16 rounded-full object-cover mb-3" />
              ) : (
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
                  style={{ background: 'linear-gradient(135deg, #c9a84c 0%, #b87714 100%)' }}>
                  <User className="w-8 h-8 text-gem-900" />
                </div>
              )}
              <p className="font-display text-lg font-semibold text-gray-100">{contact.name ?? 'Ceylon Gem Archive'}</p>
              {contact.phone && (
                <p className="text-sm text-gray-400 mt-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" />
                  {contact.phone}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2 flex-wrap justify-center">
                {(contact.whatsapp_number || contact.phone) && (
                  <a href={`https://wa.me/${(contact.whatsapp_number || contact.phone)!.replace(/[^0-9]/g, '')}`}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                    style={{ background: '#25D366' }}>
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp
                  </a>
                )}
                {contact.extra_contacts?.map((ec, i) => (
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

          <div className="text-center">
            <div className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #c9a84c 0%, #b87714 100%)' }}>
              <Gem className="w-5 h-5 text-gem-900" />
            </div>
            <p className="font-display text-sm font-bold text-gradient-gold">Ceylon Gem Archive</p>
            <p className="text-xs text-gray-700 mt-4">
              This presentation is confidential and intended solely for the recipient. Archive: {gem.archive_number}
            </p>
          </div>
        </div>
      </div>

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
        />
      )}
    </div>
  );
}

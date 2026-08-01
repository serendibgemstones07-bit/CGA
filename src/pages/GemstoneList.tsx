import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Gem, Search, PlusCircle, Filter, ChevronLeft, ChevronRight,
  Eye, Edit, Share2, LayoutGrid, List,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Gemstone, GemstoneStatus } from '../types';
import { StatusBadge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ShareModal } from '../components/gemstone/ShareModal';
import { CollectionShareModal } from '../components/gemstone/CollectionShareModal';
import { Package, CheckSquare, Square, XCircle } from 'lucide-react';

const PAGE_SIZE = 12;
const STATUS_OPTIONS: { value: GemstoneStatus | ''; label: string }[] = [
  { value: '', label: 'All Status' },
  { value: 'available', label: 'Available' },
  { value: 'sold', label: 'Sold' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'pending', label: 'Pending' },
];

export function GemstoneList() {
  const navigate = useNavigate();
  const [gems, setGems] = useState<Gemstone[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<GemstoneStatus | ''>('');
  const [view, setView] = useState<'grid' | 'list'>('list');
  const [shareGem, setShareGem] = useState<Gemstone | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);

  const [creatorNames, setCreatorNames] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('gemstones')
      .select('*, gemstone_media(*)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (search) {
      query = query.or(`name.ilike.%${search}%,archive_number.ilike.%${search}%,origin.ilike.%${search}%,species.ilike.%${search}%`);
    }
    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    const { data, count } = await query;
    const gemList = (data as Gemstone[]) ?? [];
    setGems(gemList);
    setTotal(count ?? 0);

    const creatorIds = [...new Set(gemList.map(g => g.created_by).filter(Boolean))] as string[];
    if (creatorIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', creatorIds);
      const map: Record<string, string> = {};
      (profiles ?? []).forEach(p => { if (p.full_name) map[p.id] = p.full_name; });
      setCreatorNames(map);
    } else {
      setCreatorNames({});
    }

    setLoading(false);
  }, [page, search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  function handleSearch(val: string) {
    setSearch(val);
    setPage(0);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-100">Gem Archive</h1>
          <p className="text-gray-500 text-sm mt-0.5">{total} gemstone{total !== 1 ? 's' : ''} catalogued</p>
        </div>
        <div className="flex items-center gap-2">
          {selectMode ? (
            <>
              <span className="text-xs text-gray-400">{selectedIds.size} selected</span>
              <button onClick={() => setShowCollectionModal(true)}
                disabled={selectedIds.size === 0}
                className="btn-primary disabled:opacity-40">
                <Package className="w-4 h-4" />
                Share Collection
              </button>
              <button onClick={() => { setSelectMode(false); setSelectedIds(new Set()); }}
                className="btn-secondary p-2" title="Cancel selection">
                <XCircle className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setShowCollectionModal(true)}
                className="btn-secondary flex items-center gap-2 text-sm">
                <Package className="w-4 h-4" />
                Share Collection
              </button>
              <button onClick={() => setSelectMode(true)}
                className="btn-secondary flex items-center gap-2 text-sm" title="Select gems to share">
                <CheckSquare className="w-4 h-4" />
                Select
              </button>
              <Link to="/gemstones/add" className="btn-primary">
                <PlusCircle className="w-4 h-4" />
                Add Gemstone
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="gem-card p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search by name, archive number, origin, species…"
              className="input-field pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value as GemstoneStatus | ''); setPage(0); }}
              className="input-field w-40"
            >
              {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="flex rounded-lg overflow-hidden border border-gem-border">
            <button onClick={() => setView('list')}
              className={`px-3 py-2 transition-colors ${view === 'list' ? 'text-yellow-400' : 'text-gray-500 hover:text-gray-300'}`}
              style={{ backgroundColor: view === 'list' ? '#1e2940' : '#0f1520' }}>
              <List className="w-4 h-4" />
            </button>
            <button onClick={() => setView('grid')}
              className={`px-3 py-2 transition-colors ${view === 'grid' ? 'text-yellow-400' : 'text-gray-500 hover:text-gray-300'}`}
              style={{ backgroundColor: view === 'grid' ? '#1e2940' : '#0f1520' }}>
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      ) : gems.length === 0 ? (
        <div className="gem-card p-16 text-center">
          <Gem className="w-12 h-12 mx-auto mb-4 text-gray-700" />
          <p className="text-gray-400 font-medium">No gemstones found</p>
          <p className="text-gray-600 text-sm mt-1">
            {search || statusFilter ? 'Try adjusting your search or filters.' : 'Start by adding your first gemstone.'}
          </p>
          {!search && !statusFilter && (
            <Link to="/gemstones/add" className="btn-primary mt-4 inline-flex">Add Gemstone</Link>
          )}
        </div>
      ) : view === 'list' ? (
        <>
          {/* Mobile card view */}
          <div className="sm:hidden space-y-3">
            {gems.map(gem => {
              const thumb = gem.gemstone_media?.find(m => m.is_primary && m.media_type === 'image') ?? gem.gemstone_media?.find(m => m.media_type === 'image') ?? gem.gemstone_media?.find(m => m.media_type !== 'receipt');
              return (
                <div key={gem.id} className="gem-card p-3 cursor-pointer"
                  onClick={selectMode ? () => setSelectedIds(prev => {
                    const next = new Set(prev);
                    next.has(gem.id) ? next.delete(gem.id) : next.add(gem.id);
                    return next;
                  }) : () => navigate(`/gemstones/${gem.id}`)}>
                  <div className="flex gap-3">
                    {selectMode && (
                      <div className="flex items-center">
                        {selectedIds.has(gem.id) ? <CheckSquare className="w-5 h-5 text-yellow-400" /> : <Square className="w-5 h-5 text-gray-600" />}
                      </div>
                    )}
                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0" style={{ background: '#1a2234' }}>
                      {thumb && thumb.media_type !== 'video' ? (
                        <img src={thumb.url} alt={gem.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Gem className="w-6 h-6 text-gray-600" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-gray-200 text-sm truncate">{gem.name}</p>
                          <p className="font-mono text-xs text-yellow-400 mt-0.5">{gem.archive_number}</p>
                        </div>
                        <StatusBadge status={gem.status} />
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                        {gem.weight && <span>{gem.weight} ct</span>}
                        {gem.origin && <span>{gem.origin}</span>}
                        {gem.species && <span>{gem.species}</span>}
                      </div>
                    </div>
                  </div>
                  {!selectMode && (
                    <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gem-border">
                      <Link to={`/gemstones/${gem.id}`} className="btn-ghost p-1.5 flex-1 justify-center text-xs">
                        <Eye className="w-3.5 h-3.5" /> View
                      </Link>
                      <Link to={`/gemstones/${gem.id}/edit`} className="btn-ghost p-1.5 flex-1 justify-center text-xs">
                        <Edit className="w-3.5 h-3.5" /> Edit
                      </Link>
                      <button onClick={() => setShareGem(gem)} className="btn-ghost p-1.5 flex-1 justify-center text-xs">
                        <Share2 className="w-3.5 h-3.5" /> Share
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {/* Desktop table view */}
          <div className="gem-card overflow-hidden hidden sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #1f2d45', backgroundColor: '#0f1520' }}>
                  {selectMode && (
                    <th className="w-10 px-3 py-3" style={{ backgroundColor: '#0f1520' }}>
                      <button onClick={() => {
                        if (selectedIds.size === gems.length) setSelectedIds(new Set());
                        else setSelectedIds(new Set(gems.map(g => g.id)));
                      }} className="text-gray-500 hover:text-gray-300">
                        {selectedIds.size === gems.length ? <CheckSquare className="w-4 h-4 text-yellow-400" /> : <Square className="w-4 h-4" />}
                      </button>
                    </th>
                  )}
                  {['Archive #', 'Gemstone', 'Origin', 'Weight', 'Status', 'Price', 'Added By', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gem-border">
                {gems.map(gem => {
                  const thumb = gem.gemstone_media?.find(m => m.is_primary && m.media_type === 'image') ?? gem.gemstone_media?.find(m => m.media_type === 'image') ?? gem.gemstone_media?.find(m => m.media_type !== 'receipt');
                  return (
                    <tr key={gem.id} className="hover:bg-gem-500/20 transition-colors cursor-pointer"
                      onClick={selectMode ? () => setSelectedIds(prev => {
                        const next = new Set(prev);
                        next.has(gem.id) ? next.delete(gem.id) : next.add(gem.id);
                        return next;
                      }) : () => navigate(`/gemstones/${gem.id}`)}>
                      {selectMode && (
                        <td className="px-3 py-3">
                          {selectedIds.has(gem.id) ? <CheckSquare className="w-4 h-4 text-yellow-400" /> : <Square className="w-4 h-4 text-gray-600" />}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-yellow-400">{gem.archive_number}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0"
                            style={{ background: '#1a2234' }}>
                            {thumb && thumb.media_type !== 'video' ? (
                              <img src={thumb.url} alt={gem.name} className="w-full h-full object-cover" />
                            ) : thumb?.media_type === 'video' ? (
                              <div className="w-full h-full flex items-center justify-center" style={{ background: '#0f1520' }}>
                                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                                  <div className="w-0 h-0 ml-0.5 border-t-[3px] border-t-transparent border-b-[3px] border-b-transparent border-l-[5px] border-l-white" />
                                </div>
                              </div>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Gem className="w-4 h-4 text-gray-600" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-200">{gem.name}</p>
                            <p className="text-xs text-gray-500">{[gem.species, gem.variety].filter(Boolean).join(' · ')}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-400">{gem.origin ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-400">{gem.weight ? `${gem.weight} ct` : '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={gem.status} /></td>
                      <td className="px-4 py-3 text-gray-300 font-medium">
                        {gem.buyer_price ? `$${gem.buyer_price.toLocaleString()}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {gem.created_by ? creatorNames[gem.created_by] ?? '—' : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Link to={`/gemstones/${gem.id}`} className="btn-ghost p-2" title="View">
                            <Eye className="w-4 h-4" />
                          </Link>
                          <Link to={`/gemstones/${gem.id}/edit`} className="btn-ghost p-2" title="Edit">
                            <Edit className="w-4 h-4" />
                          </Link>
                          <button onClick={() => setShareGem(gem)} className="btn-ghost p-2" title="Share">
                            <Share2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {gems.map(gem => {
            const thumb = gem.gemstone_media?.find(m => m.is_primary && m.media_type === 'image') ?? gem.gemstone_media?.find(m => m.media_type === 'image') ?? gem.gemstone_media?.find(m => m.media_type !== 'receipt');
            return (
              <div key={gem.id} className="gem-card overflow-hidden group hover:border-yellow-700/50 transition-all duration-200">
                <div className="aspect-square overflow-hidden relative" style={{ background: '#0f1520' }}>
                  {thumb && thumb.media_type !== 'video' ? (
                    <img src={thumb.url} alt={gem.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : thumb?.media_type === 'video' ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                        <div className="w-0 h-0 ml-1 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-l-[16px] border-l-white/60" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Gem className="w-12 h-12 text-gray-700" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2"><StatusBadge status={gem.status} /></div>
                </div>
                <div className="p-3">
                  <p className="font-mono text-xs text-yellow-400 mb-1">{gem.archive_number}</p>
                  <p className="font-medium text-gray-200 text-sm truncate">{gem.name}</p>
                  <p className="text-xs text-gray-500 truncate">{[gem.species, gem.origin].filter(Boolean).join(' · ')}</p>
                  {gem.weight && <p className="text-xs text-gray-400 mt-1">{gem.weight} ct</p>}
                  {gem.created_by && creatorNames[gem.created_by] && (
                    <p className="text-xs text-gray-500 mt-1">by {creatorNames[gem.created_by]}</p>
                  )}
                  <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gem-border">
                    <Link to={`/gemstones/${gem.id}`} className="btn-ghost p-1.5 flex-1 justify-center text-xs">
                      <Eye className="w-3.5 h-3.5" /> View
                    </Link>
                    <button onClick={() => setShareGem(gem)} className="btn-ghost p-1.5 flex-1 justify-center text-xs">
                      <Share2 className="w-3.5 h-3.5" /> Share
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-gray-500">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => p - 1)} disabled={page === 0} className="btn-secondary px-3 py-2 disabled:opacity-40">
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button key={i} onClick={() => setPage(i)}
                className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${i === page ? 'text-gem-900' : 'text-gray-400 hover:text-gray-200'}`}
                style={i === page ? { background: 'linear-gradient(135deg, #c9a84c, #b87714)' } : { backgroundColor: '#1e2940' }}>
                {i + 1}
              </button>
            ))}
            <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1} className="btn-secondary px-3 py-2 disabled:opacity-40">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {shareGem && (
        <ShareModal gemstone={shareGem} onClose={() => setShareGem(null)} />
      )}

      {showCollectionModal && (
        <CollectionShareModal
          selectedGemIds={[...selectedIds]}
          onClose={() => { setShowCollectionModal(false); setSelectMode(false); setSelectedIds(new Set()); }}
        />
      )}
    </div>
  );
}

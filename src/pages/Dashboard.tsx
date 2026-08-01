import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Gem, TrendingUp, ShoppingBag, Clock, PlusCircle, ArrowRight, Package } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Gemstone, DashboardStats } from '../types';
import { StatusBadge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';

export function Dashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({ total: 0, available: 0, sold: 0, reserved: 0, pending: 0 });
  const [recent, setRecent] = useState<Gemstone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [statsRes, recentRes] = await Promise.all([
        supabase.from('gemstones').select('status'),
        supabase.from('gemstones')
          .select('*, gemstone_media(*)')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      if (statsRes.data) {
        const counts: DashboardStats = { total: statsRes.data.length, available: 0, sold: 0, reserved: 0, pending: 0 };
        for (const g of statsRes.data) {
          if (g.status in counts) counts[g.status as keyof DashboardStats]++;
        }
        setStats(counts);
      }

      if (recentRes.data) setRecent(recentRes.data as Gemstone[]);
      setLoading(false);
    }
    load();
  }, []);

  const statCards = [
    { label: 'Total Gems', value: stats.total, icon: Package, color: 'from-blue-900/40 to-blue-800/20', iconColor: 'text-blue-400', border: 'border-blue-800/30' },
    { label: 'Available', value: stats.available, icon: Gem, color: 'from-emerald-900/40 to-emerald-800/20', iconColor: 'text-emerald-400', border: 'border-emerald-800/30' },
    { label: 'Sold', value: stats.sold, icon: ShoppingBag, color: 'from-sky-900/40 to-sky-800/20', iconColor: 'text-sky-400', border: 'border-sky-800/30' },
    { label: 'Reserved', value: stats.reserved, icon: Clock, color: 'from-amber-900/40 to-amber-800/20', iconColor: 'text-amber-400', border: 'border-amber-800/30' },
  ];

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <p className="text-gray-500 text-sm">Good day,</p>
        <h1 className="font-display text-3xl font-bold text-gray-100 mt-1">
          {profile?.full_name ?? 'Welcome back'}
        </h1>
        <p className="text-gray-400 text-sm mt-1">Here's your Ceylon Gem Archive overview.</p>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {statCards.map(({ label, value, icon: Icon, color, iconColor, border }) => (
              <div key={label} className={`gem-card p-5 bg-gradient-to-br ${color} border ${border}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">{label}</p>
                    <p className="text-3xl font-bold text-gray-100">{value}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${iconColor}`} style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Link to="/gemstones/add"
              className="gem-card p-5 flex items-center gap-4 hover:border-yellow-700 transition-all duration-200 group">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #c9a84c20, #b8771420)' }}>
                <PlusCircle className="w-5 h-5 text-yellow-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-200">Add Gemstone</p>
                <p className="text-xs text-gray-500">Catalogue a new gem</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-yellow-400 transition-colors" />
            </Link>

            <Link to="/gemstones"
              className="gem-card p-5 flex items-center gap-4 hover:border-yellow-700 transition-all duration-200 group">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #3b82f620, #1d4ed820)' }}>
                <Gem className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-200">View Archive</p>
                <p className="text-xs text-gray-500">Browse all gemstones</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-yellow-400 transition-colors" />
            </Link>

            <div className="gem-card p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #10b98120, #05966920)' }}>
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-200">Availability Rate</p>
                <p className="text-xs text-gray-500">
                  {stats.total > 0 ? Math.round((stats.available / stats.total) * 100) : 0}% in stock
                </p>
              </div>
            </div>
          </div>

          {/* Recent Additions */}
          <div className="gem-card overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gem-border">
              <h2 className="font-display text-lg font-semibold text-gray-200">Recent Additions</h2>
              <Link to="/gemstones" className="text-sm text-yellow-400 hover:text-yellow-300 flex items-center gap-1">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recent.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <Gem className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No gemstones catalogued yet.</p>
                <Link to="/gemstones/add" className="btn-primary mt-4 inline-flex">Add your first gem</Link>
              </div>
            ) : (
              <div className="divide-y divide-gem-border">
                {recent.map(gem => {
                  const thumb = gem.gemstone_media?.find(m => m.is_primary && m.media_type === 'image') ?? gem.gemstone_media?.find(m => m.media_type === 'image') ?? gem.gemstone_media?.find(m => m.media_type !== 'receipt');
                  return (
                    <Link key={gem.id} to={`/gemstones/${gem.id}`}
                      className="flex items-center gap-4 p-4 hover:bg-gem-500/30 transition-colors">
                      <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #1a2234, #243050)' }}>
                        {thumb && thumb.media_type !== 'video' ? (
                          <img src={thumb.url} alt={gem.name} className="w-full h-full object-cover" />
                        ) : thumb?.media_type === 'video' ? (
                          <div className="w-full h-full flex items-center justify-center" style={{ background: '#0f1520' }}>
                            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                              <div className="w-0 h-0 ml-0.5 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[6px] border-l-white" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Gem className="w-5 h-5 text-gray-600" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-200 truncate">{gem.name}</p>
                          <span className="text-xs text-gray-600 font-mono flex-shrink-0">{gem.archive_number}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {[gem.species, gem.variety, gem.origin].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <StatusBadge status={gem.status} />
                        {gem.weight && <span className="text-xs text-gray-400">{gem.weight} ct</span>}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

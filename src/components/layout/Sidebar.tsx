import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Gem,
  PlusCircle,
  LogOut,
  ChevronRight,
  Shield,
  Users,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/gemstones', icon: Gem, label: 'Gem Archive' },
  { to: '/gemstones/add', icon: PlusCircle, label: 'Add Gemstone' },
];

export function Sidebar() {
  const { profile, signOut, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="p-6 border-b border-gem-border flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #c9a84c 0%, #b87714 100%)' }}>
            <Gem className="w-5 h-5 text-gem-900" />
          </div>
          <div>
            <h1 className="font-display text-sm font-bold leading-tight text-gradient-gold">
              Ceylon Gem
            </h1>
            <p className="text-xs text-gray-500 tracking-widest uppercase">Archive</p>
          </div>
        </Link>
        <button onClick={() => setOpen(false)} className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-gray-200">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? 'text-gem-900 font-semibold'
                  : 'text-gray-400 hover:text-gray-200'
              }`
            }
            style={({ isActive }) => isActive ? {
              background: 'linear-gradient(135deg, #c9a84c 0%, #b87714 100%)',
            } : {}}
          >
            {({ isActive }) => (
              <>
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-gem-900' : 'text-gray-500 group-hover:text-gray-300'}`} />
                <span className="flex-1">{label}</span>
                {isActive && <ChevronRight className="w-3 h-3 text-gem-900/60" />}
              </>
            )}
          </NavLink>
        ))}
        {isSuperAdmin && (
          <>
            <div className="my-3 mx-3 border-t border-gem-border" />
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                  isActive ? 'text-gem-900 font-semibold' : 'text-gray-400 hover:text-gray-200'
                }`
              }
              style={({ isActive }) => isActive ? {
                background: 'linear-gradient(135deg, #c9a84c 0%, #b87714 100%)',
              } : {}}
            >
              {({ isActive }) => (
                <>
                  <Users className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-gem-900' : 'text-gray-500 group-hover:text-gray-300'}`} />
                  <span className="flex-1">Manage Admins</span>
                  {isActive && <ChevronRight className="w-3 h-3 text-gem-900/60" />}
                </>
              )}
            </NavLink>
          </>
        )}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-gem-border space-y-3">
        <NavLink to="/profile" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #1a2234 0%, #243050 100%)', border: '1px solid #c9a84c40' }}>
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              profile?.full_name?.charAt(0)?.toUpperCase() ?? '?'
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-200 truncate">{profile?.full_name ?? 'User'}</p>
            <div className="flex items-center gap-1">
              {profile?.role === 'super_admin' && (
                <Shield className="w-3 h-3 text-yellow-400" />
              )}
              <p className="text-xs text-gray-500 capitalize">{profile?.role?.replace('_', ' ')}</p>
            </div>
          </div>
        </NavLink>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-red-900/20 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center gap-3 px-4 py-3"
        style={{ background: 'rgba(10,14,24,0.95)', borderBottom: '1px solid #1f2d45', backdropFilter: 'blur(12px)' }}>
        <button onClick={() => setOpen(true)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200">
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #c9a84c 0%, #b87714 100%)' }}>
            <Gem className="w-3.5 h-3.5 text-gem-900" />
          </div>
          <span className="font-display text-sm font-bold text-gradient-gold">Ceylon Gem Archive</span>
        </div>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar - desktop: static, mobile: slide-in drawer */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 flex-shrink-0 flex flex-col transition-transform duration-300 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ background: 'linear-gradient(180deg, #0a0e18 0%, #0f1520 100%)', borderRight: '1px solid #1f2d45' }}>
        {sidebarContent}
      </aside>
    </>
  );
}

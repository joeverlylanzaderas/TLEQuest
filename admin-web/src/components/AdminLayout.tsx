// admin-web/src/components/AdminLayout.tsx
// One shared shell for every admin page: sidebar on the left (slide-in menu on phones)
// and the page itself on the right. Pages no longer need their own back/sign-out buttons.
import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, Users, ChartColumn, Settings, LogOut, Menu, X, Sliders,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import sidebarLogo from '../assets/tlequest-logo3.png';

type NavItem = {
  to: string;
  label: string;
  icon: React.ReactNode;
  // Extra paths that should keep this item highlighted (e.g. Change Password lives under Profile)
  also?: string[];
};

const MENU: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { to: '/classes', label: 'Classes', icon: <BookOpen size={18} /> },
  { to: '/users', label: 'Users', icon: <Users size={18} /> },
  { to: '/reports', label: 'Insights', icon: <ChartColumn size={18} /> },
];

const SETTINGS: NavItem[] = [
  { to: '/system-settings', label: 'System Settings', icon: <Sliders size={18} /> },
  { to: '/profile', label: 'Profile', icon: <Settings size={18} />, also: ['/change-password'] },
];

export default function AdminLayout() {
  const { signOut } = useAuth();
  const { pathname } = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const isActive = (item: NavItem) =>
    pathname === item.to || pathname.startsWith(item.to + '/') || (item.also ?? []).includes(pathname);

  const renderItem = (item: NavItem) => (
    <Link
      key={item.to}
      to={item.to}
      className={`nav-item${isActive(item) ? ' active' : ''}`}
      aria-current={isActive(item) ? 'page' : undefined}
      onClick={() => setIsSidebarOpen(false)}
    >
      {item.icon}<span>{item.label}</span>
    </Link>
  );

  return (
    <div className="admin-layout">
      <style>{`
        .admin-layout { display: flex; height: 100vh; width: 100%; overflow: hidden; position: relative; }
        .admin-main { flex: 1; min-width: 0; overflow-y: auto; overflow-x: hidden; }

        .mobile-header { display: none; height: 60px; background: #FFFFFF; border-bottom: 1px solid var(--t-d6bb83); padding: 0 16px; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 90; width: 100%; }
        .menu-toggle-btn { background: none; border: none; color: var(--t-804022); cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 6px; }

        .sidebar { width: 260px; background: #FFFFFF; border-right: 1px solid var(--t-d6bb83); display: flex; flex-direction: column; padding: 24px 16px; flex-shrink: 0; z-index: 100; transition: transform 0.3s ease; overflow-y: auto; }
        .sidebar a { text-decoration: none; color: inherit; }
        .logo { font-size: 22px; font-weight: 800; color: var(--t-c37800); margin-bottom: 20px; padding: 0 12px; display: flex; align-items: center; justify-content: center; position: relative; }
        .logo .menu-toggle-btn { position: absolute; top: 0; right: 0; }
        .brand-logo { height: 120px; width: auto; max-width: 100%; object-fit: contain; display: block; margin: 0 auto; }
        .brand-logo-mobile { height: 44px; margin: 0; }
        .menu-label { font-size: 11px; text-transform: uppercase; color: var(--t-d6bb83); font-weight: 700; margin: 0 12px 12px; letter-spacing: 0.6px; }
        .nav-item { padding: 10px 14px; border-radius: 10px; margin-bottom: 4px; font-size: 14px; font-weight: 500; color: var(--t-804022); display: flex; align-items: center; gap: 12px; transition: all 0.2s ease; cursor: pointer; }
        .nav-item.active { background: var(--t-fcecd6); color: var(--t-c37800); font-weight: 700; }
        .nav-item:hover:not(.active) { background: var(--t-f3efd4); }
        .sidebar-backdrop { display: none; position: fixed; inset: 0; background: rgba(40,20,10,0.4); backdrop-filter: blur(2px); z-index: 95; }

        @media (max-width: 768px) {
          .admin-layout { flex-direction: column; height: auto; min-height: 100vh; overflow: visible; }
          .admin-main { overflow-y: visible; }
          .mobile-header { display: flex; }
          .sidebar { position: fixed; top: 0; left: 0; bottom: 0; height: 100vh; transform: translateX(-100%); box-shadow: 4px 0 24px rgba(0,0,0,0.15); }
          .sidebar.open { transform: translateX(0); }
          .sidebar-backdrop { display: block; }
        }
      `}</style>

      {/* --- MOBILE TOP HEADER --- */}
      <header className="mobile-header">
        <img src={sidebarLogo} alt="TLEQuest" className="brand-logo brand-logo-mobile" />
        <button className="menu-toggle-btn" onClick={() => setIsSidebarOpen((o) => !o)} aria-label="Toggle Navigation Menu">
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {isSidebarOpen && <div className="sidebar-backdrop" onClick={() => setIsSidebarOpen(false)} />}

      {/* --- SIDEBAR --- */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="logo">
          <img src={sidebarLogo} alt="TLEQuest" className="brand-logo" />
          <button className="menu-toggle-btn" style={{ display: isSidebarOpen ? 'block' : 'none' }} onClick={() => setIsSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="menu-label">Menu</div>
        {MENU.map(renderItem)}

        <div className="menu-label" style={{ marginTop: 24 }}>Settings</div>
        {SETTINGS.map(renderItem)}

        <div
          className="nav-item"
          onClick={() => { setIsSidebarOpen(false); signOut(); }}
          style={{ color: '#DF1B39', marginTop: 'auto' }}
        >
          <LogOut size={18} /><span>Sign Out</span>
        </div>
      </aside>

      {/* --- PAGE --- */}
      <div className="admin-main">
        <Outlet />
      </div>
    </div>
  );
}
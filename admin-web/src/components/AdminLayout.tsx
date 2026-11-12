import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, Users, ChartColumn, Settings, LogOut, Menu, X, Sliders,
  ClipboardList, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import fullLogo from '../assets/tlequest-logo3.png';
import smallLogo from '../assets/tlequest-favicon.png';

const COLLAPSE_KEY = 'sidebar_collapsed';

const MAIN_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/classes', label: 'Classes', icon: BookOpen },
  { to: '/users', label: 'Users', icon: Users },
  { to: '/reports', label: 'Insights', icon: ChartColumn },
];
const SETTINGS_ITEMS = [
  { to: '/system-settings', label: 'System Settings', icon: Sliders },
  { to: '/audit-log', label: 'Audit Log', icon: ClipboardList },
  { to: '/profile', label: 'Profile', icon: Settings },
];

function readCollapsed(): boolean {
  try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; }
}

// The shell every signed-in page lives in: the sidebar stays put and only the page content changes.
// Desktop: the sidebar can be collapsed to an icon strip (remembered). Phone: it slides in from the left.
export default function AdminLayout() {
  const { user, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);

  function toggleCollapsed() {
    setCollapsed((c) => {
      try { localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1'); } catch { /* storage blocked */ }
      return !c;
    });
  }

  const renderItem = ({ to, label, icon: Icon }: (typeof MAIN_ITEMS)[number]) => (
    <NavLink
      key={to}
      to={to}
      title={collapsed ? label : undefined}
      className={({ isActive }) => `as-item${isActive ? ' active' : ''}`}
      onClick={() => setMobileOpen(false)}
    >
      <Icon size={18} />
      <span className="as-text">{label}</span>
    </NavLink>
  );

  return (
    <div className={`as-shell${collapsed ? ' collapsed' : ''}`}>
      <style>{`
        .as-shell { display: flex; min-height: 100vh; width: 100%; }
        .as-shell a { text-decoration: none; }
        .as-sidebar {
          position: sticky; top: 0; align-self: flex-start; height: 100vh; width: 260px; flex-shrink: 0;
          background: #FFFFFF; border-right: 1px solid var(--t-d6bb83); padding: 20px 14px;
          display: flex; flex-direction: column; overflow-y: auto; overflow-x: hidden; z-index: 100;
          transition: width 0.25s ease, transform 0.3s ease; font-family: 'Inter', sans-serif;
        }
        .as-shell.collapsed .as-sidebar { width: 76px; padding: 20px 10px; }
        .as-brand { display: flex; align-items: center; justify-content: center; min-height: 96px; margin-bottom: 12px; }
        .as-logo-full { height: 96px; width: auto; max-width: 100%; object-fit: contain; }
        .as-logo-small { display: none; height: 40px; width: 40px; object-fit: contain; }
        .as-shell.collapsed .as-logo-full { display: none; }
        .as-shell.collapsed .as-logo-small { display: block; }
        .as-shell.collapsed .as-brand { min-height: 48px; }

        .as-label { font-size: 11px; text-transform: uppercase; color: var(--t-c37800); font-weight: 700; margin: 14px 12px 8px; letter-spacing: 0.6px; white-space: nowrap; }
        .as-shell.collapsed .as-label { height: 1px; margin: 12px 8px; background: var(--t-d6bb83); font-size: 0; overflow: hidden; }

        .as-item {
          display: flex; align-items: center; gap: 12px; padding: 10px 14px; margin-bottom: 4px; border-radius: 10px;
          font-size: 14px; font-weight: 500; color: var(--t-804022); cursor: pointer; border: none; background: none;
          width: 100%; font-family: inherit; text-align: left; transition: background 0.2s ease, color 0.2s ease;
        }
        .as-item svg { flex-shrink: 0; }
        .as-item:hover { background: var(--t-f3efd4); }
        .as-item.active { background: var(--t-fcecd6); color: var(--t-c37800); font-weight: 700; }
        .as-text { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .as-shell.collapsed .as-item { justify-content: center; padding: 11px 0; }
        .as-shell.collapsed .as-text { display: none; }

        .as-footer { margin-top: auto; padding-top: 12px; border-top: 1px solid var(--t-f3efd4); }
        .as-user { font-size: 12px; color: var(--t-804022); padding: 4px 14px 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .as-shell.collapsed .as-user { display: none; }
        .as-signout { color: #DF1B39; }
        .as-signout:hover { background: rgba(223, 27, 57, 0.08); }
        .as-collapse { color: var(--t-804022); }

        .as-main { flex: 1; min-width: 0; }
        .as-topbar { display: none; }
        .as-backdrop { display: none; }

        @media (max-width: 768px) {
          .as-shell, .as-shell.collapsed { flex-direction: column; }
          .as-topbar {
            display: flex; align-items: center; justify-content: space-between; height: 60px; padding: 0 16px;
            background: #FFFFFF; border-bottom: 1px solid var(--t-d6bb83); position: sticky; top: 0; z-index: 90;
          }
          .as-topbar img { height: 40px; width: auto; }
          .as-menu-btn { background: none; border: none; color: var(--t-804022); cursor: pointer; padding: 6px; display: flex; }
          .as-sidebar, .as-shell.collapsed .as-sidebar {
            position: fixed; top: 0; left: 0; bottom: 0; width: 260px; padding: 20px 14px;
            transform: translateX(-100%); box-shadow: 4px 0 24px rgba(0,0,0,0.15);
          }
          .as-sidebar.open { transform: translateX(0); }
          .as-shell.collapsed .as-logo-full { display: block; }
          .as-shell.collapsed .as-logo-small { display: none; }
          .as-shell.collapsed .as-text, .as-shell.collapsed .as-user { display: block; }
          .as-shell.collapsed .as-item { justify-content: flex-start; padding: 10px 14px; }
          .as-shell.collapsed .as-label { height: auto; margin: 14px 12px 8px; background: none; font-size: 11px; }
          .as-collapse { display: none; }
          .as-backdrop.open { display: block; position: fixed; inset: 0; background: rgba(40,20,10,0.4); backdrop-filter: blur(2px); z-index: 95; }
        }
        @media (prefers-reduced-motion: reduce) { .as-sidebar { transition: none; } }
      `}</style>

      <header className="as-topbar">
        <img src={fullLogo} alt="TLEQuest" />
        <button className="as-menu-btn" onClick={() => setMobileOpen((o) => !o)} aria-label="Toggle navigation menu" aria-expanded={mobileOpen}>
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>
      <div className={`as-backdrop${mobileOpen ? ' open' : ''}`} onClick={() => setMobileOpen(false)} />

      <aside className={`as-sidebar${mobileOpen ? ' open' : ''}`} aria-label="Main navigation">
        <div className="as-brand">
          <img src={fullLogo} alt="TLEQuest" className="as-logo-full" />
          <img src={smallLogo} alt="TLEQuest" className="as-logo-small" />
        </div>

        <div className="as-label">Menu</div>
        {MAIN_ITEMS.map(renderItem)}

        <div className="as-label">Settings</div>
        {SETTINGS_ITEMS.map(renderItem)}

        <div className="as-footer">
          {user && <div className="as-user">Signed in as <strong>@{user.username}</strong></div>}
          <button
            type="button"
            className="as-item as-collapse"
            onClick={toggleCollapsed}
            title={collapsed ? 'Expand sidebar' : undefined}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            <span className="as-text">Collapse</span>
          </button>
          <button
            type="button"
            className="as-item as-signout"
            onClick={() => { setMobileOpen(false); signOut(); }}
            title={collapsed ? 'Sign Out' : undefined}
          >
            <LogOut size={18} />
            <span className="as-text">Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="as-main">
        <Outlet />
      </main>
    </div>
  );
}

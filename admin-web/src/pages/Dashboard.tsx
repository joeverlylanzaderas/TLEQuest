// admin-web/src/pages/Dashboard.tsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, Users, ChartColumn, Settings, LogOut, Shield,
  Castle, CalendarDays, Clock3, Search, MoreHorizontal, FileDown, Plus,
  Flag, Trophy, Upload, ChevronDown, Menu, X,
  Sliders,  
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getDashboardSummary } from '../api/dashboard';
import { getAdminReports } from '../api/reports';
import type { DashboardSummary, RecentActivityEvent } from '../types/dashboard';
import type { AdminReports } from '../types/reports';
import bannerImage from '../assets/admin-header.png';

const BANNER_IMAGE_URL = bannerImage;

// Clean Lucide-React Activity Icon Mapping
const ACTIVITY_ICONS: Record<RecentActivityEvent['type'], React.ReactNode> = {
  quest_started: <Flag size={18} color="#C37800" />,
  quest_finished: <Trophy size={18} color="#FDC200" />,
  submission_made: <Upload size={18} color="#24A956" />,
};

export default function Dashboard() {
  const { signOut } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [reports, setReports] = useState<AdminReports | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Mobile Navigation Drawer State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Live Time & Date State
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    loadDashboard();

    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  async function loadDashboard() {
    setIsLoading(true);
    setError('');
    try {
      const [summaryData, reportsData] = await Promise.all([
        getDashboardSummary(),
        getAdminReports({ activityDays: 7, leaderboardLimit: 1 }),
      ]);
      setSummary(summaryData);
      setReports(reportsData);
    } catch (e) {
      setError('Could not load dashboard data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  // Format Digital Clock (HH:MM:SS AM/PM)
  const getDigitalClock = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  // Calendar Helper Logic
  const getCalendarDays = () => {
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);

    return days;
  };

  return (
    <div className="layout">
      <style>{`
        /* Reset & Global Overflow Containment */
        *, *::before, *::after { 
          box-sizing: border-box; 
        }
        body { 
          margin: 0; 
          background-color: #F8EFE6; 
          color: #804022; 
          font-family: 'Inter', sans-serif;
          overflow-x: hidden;
        }
        h1, h2, h3, .card-title, .logo, .stat-value {
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
        a { text-decoration: none; color: inherit; }

        .layout {
          display: flex;
          height: 100vh;
          width: 100vw;
          overflow: hidden;
          position: relative;
        }

        /* --- Mobile Top Header Bar --- */
        .mobile-header {
          display: none;
          height: 60px;
          background: #FFFFFF;
          border-bottom: 1px solid #D6BB83;
          padding: 0 16px;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 90;
          width: 100%;
        }
        .menu-toggle-btn {
          background: none;
          border: none;
          color: #804022;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px;
        }

        /* --- Sidebar --- */
        .sidebar {
          width: 260px;
          background: #FFFFFF;
          border-right: 1px solid #D6BB83;
          display: flex;
          flex-direction: column;
          padding: 24px 16px;
          flex-shrink: 0;
          z-index: 100;
          transition: transform 0.3s ease;
        }
        .logo {
          font-size: 22px;
          font-weight: 800;
          color: #C37800;
          margin-bottom: 36px;
          padding: 0 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .logo-brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .logo-icon {
          background: #FDC200;
          color: #804022;
          border-radius: 8px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .menu-label {
          font-size: 11px;
          text-transform: uppercase;
          color: #D6BB83;
          font-weight: 700;
          margin: 0 12px 12px;
          letter-spacing: 0.6px;
        }
        .nav-item {
          padding: 10px 14px;
          border-radius: 10px;
          margin-bottom: 4px;
          font-size: 14px;
          font-weight: 500;
          color: #804022;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: all 0.2s ease;
        }
        .nav-item.active {
          background: #FCECD6;
          color: #C37800;
          font-weight: 700;
        }
        .nav-item:hover:not(.active) {
          background: #F3EFD4;
        }
        .promo-card {
          margin-top: auto;
          background: #FCECD6;
          border-radius: 16px;
          padding: 20px;
          text-align: center;
          border: 1px solid #FCC896;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .promo-btn {
          background: #FDC200;
          color: #804022;
          border: none;
          padding: 10px 16px;
          border-radius: 8px;
          font-weight: 700;
          width: 100%;
          margin-top: 14px;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .promo-btn:hover { opacity: 0.9; }

        .sidebar-backdrop {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(40, 20, 10, 0.4);
          backdrop-filter: blur(2px);
          z-index: 95;
        }

        /* --- Main Content Area --- */
        .main-content {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 24px 32px;
          min-width: 0;
        }

        /* --- Hero Banner --- */
        .hero-banner {
          background-image: url('${BANNER_IMAGE_URL}');
          background-size: cover;
          background-position: center;
          border-radius: 20px;
          min-height: 200px;
          position: relative;
          margin-bottom: 24px;
          border: 1px solid #D6BB83;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 24px;
          overflow: hidden;
          box-shadow: 0 8px 24px rgba(128, 64, 34, 0.12);
        }
        .hero-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            rgba(30, 15, 8, 0.2) 0%,
            rgba(30, 15, 8, 0.6) 100%
          );
          z-index: 1;
        }
        .hero-top-info {
          position: relative;
          z-index: 2;
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #FFFFFF;
          gap: 12px;
          flex-wrap: wrap;
        }
        .date-badge {
          background: rgba(89, 60, 60, 0.4);
          backdrop-filter: blur(8px);
          padding: 8px 16px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 600;
          border: 1px solid rgba(255, 255, 255, 0.25);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .timer-badge {
          background: #FDC200;
          color: #804022;
          padding: 8px 16px;
          border-radius: 12px;
          font-weight: 800;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          font-variant-numeric: tabular-nums; /* Keeps digital clock digits fixed width */
        }
        .hero-controls {
          position: relative;
          z-index: 2;
          display: flex;
          gap: 12px;
          width: 100%;
          align-items: center;
          margin-top: 16px;
          flex-wrap: wrap;
        }

        /* --- Search Bar Wrapper --- */
        .search-wrapper {
          position: relative;
          flex: 1;
          min-width: 200px;
          display: flex;
          align-items: center;
        }
        .search-wrapper .search-icon {
          position: absolute;
          left: 14px;
          color: #C37800;
          pointer-events: none;
        }
        .search-bar {
          width: 100%;
          background: #FFFFFF;
          border: 1px solid #D6BB83;
          padding: 12px 16px 12px 42px;
          border-radius: 12px;
          font-size: 14px;
          color: #804022;
          outline: none;
          box-shadow: 0 4px 12px rgba(128, 64, 34, 0.05);
        }
        .search-bar::placeholder { color: #D6BB83; }

        /* --- Action Buttons --- */
        .action-btn {
          background: #FFFFFF;
          border: 1px solid #D6BB83;
          padding: 12px 18px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 14px;
          color: #804022;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 12px rgba(128, 64, 34, 0.05);
          transition: background 0.2s;
          white-space: nowrap;
        }
        .action-btn:hover { background: #F8EFE6; }
        .action-btn.icon-only { padding: 12px; }
        .primary-btn {
          background: #FDC200;
          border: 1px solid #C37800;
          color: #804022;
        }
        .primary-btn:hover { background: #ebd800; }

        /* --- General Card Component --- */
        .card {
          background: #FFFFFF;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 4px 20px rgba(128, 64, 34, 0.04);
          border: 1px solid #F3EFD4;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-width: 0;
          overflow: hidden;
          width: 100%;
        }
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          gap: 12px;
          flex-wrap: wrap;
        }
        .card-title {
          font-size: 16px;
          font-weight: 700;
          color: #804022;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* --- Stats Grid --- */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }
        .stat-label {
          font-size: 13px;
          color: #C37800;
          font-weight: 600;
          margin-bottom: 6px;
        }
        .stat-value {
          font-size: 26px;
          font-weight: 800;
          color: #804022;
          margin-bottom: 10px;
          line-height: 1.2;
        }
        .stat-badge {
          display: inline-block;
          background: rgba(36, 169, 86, 0.1);
          color: #24A956;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 700;
        }
        .stat-subtext {
          font-size: 12px;
          color: #D6BB83;
          margin-left: 6px;
        }

        /* --- Insights & Calendar Section --- */
        .insights-section {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          gap: 16px;
          margin-bottom: 24px;
        }
        .chart-placeholder {
          height: 160px;
          display: flex;
          align-items: flex-end;
          gap: 8px;
          padding-top: 16px;
          border-top: 1px dashed #F3EFD4;
          margin-top: 12px;
          overflow-x: auto;
        }
        .bar-group { display: flex; gap: 3px; flex: 1; justify-content: center; align-items: flex-end; min-width: 14px; }
        .bar { width: 100%; max-width: 10px; border-radius: 4px 4px 0 0; }
        .bar.yellow { background: #FDC200; height: 100%; }
        .bar.orange { background: #EC7D76; height: 60%; }
        .bar.green { background: #24A956; height: 40%; }

        .mini-insight {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid #F3EFD4;
        }
        .mini-insight:last-child { border-bottom: none; }
        .progress-track {
          height: 8px;
          background: #FCECD6;
          border-radius: 4px;
          margin-top: 6px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          background: #FDC200;
          border-radius: 4px;
        }

        /* --- Calendar Grid --- */
        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 4px;
          text-align: center;
        }
        .cal-head {
          font-size: 11px;
          font-weight: 700;
          color: #C37800;
          padding-bottom: 6px;
        }
        .cal-day {
          padding: 6px 0;
          font-size: 12px;
          font-weight: 600;
          border-radius: 8px;
          color: #804022;
          background: #F8EFE6;
        }
        .cal-day.empty { background: transparent; }
        .cal-day.today {
          background: #FDC200;
          color: #804022;
          font-weight: 800;
          box-shadow: 0 2px 6px rgba(253, 194, 0, 0.4);
        }

        /* --- Bottom Grid --- */
        .bottom-grid {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 16px;
        }
        .table-responsive {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        table { width: 100%; border-collapse: collapse; min-width: 480px; }
        th { 
          text-align: left; 
          padding: 10px 12px; 
          font-size: 12px; 
          color: #C37800; 
          border-bottom: 1px solid #D6BB83; 
        }
        td { 
          padding: 12px; 
          border-bottom: 1px solid #F3EFD4; 
          font-size: 13px;
          font-weight: 500;
        }
        .status-badge {
          padding: 4px 8px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          background: #FCECD6;
          color: #C37800;
          white-space: nowrap;
        }

        .list-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          border: 1px solid #F3EFD4;
          border-radius: 12px;
          margin-bottom: 10px;
          gap: 12px;
        }
        .list-item:last-child { margin-bottom: 0; }
        .item-icon-box {
          width: 38px;
          height: 38px;
          background: #FCECD6;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 12px;
          flex-shrink: 0;
        }

        .truncate-text {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* =========================================================
           RESPONSIVE BREAKPOINTS
        ========================================================= */

        @media (max-width: 1200px) {
          .stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .insights-section {
            grid-template-columns: 1fr 1fr;
          }
          .insights-section .card-quest-flow {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 992px) {
          .bottom-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .layout {
            flex-direction: column;
            height: auto;
            min-height: 100vh;
            overflow-y: auto;
          }
          .mobile-header {
            display: flex;
          }
          .sidebar {
            position: fixed;
            top: 0;
            left: 0;
            bottom: 0;
            height: 100vh;
            transform: translateX(-100%);
            box-shadow: 4px 0 24px rgba(0, 0, 0, 0.15);
          }
          .sidebar.open {
            transform: translateX(0);
          }
          .sidebar-backdrop {
            display: block;
          }
          .main-content {
            padding: 16px;
            overflow-y: visible;
          }
          .hero-banner {
            min-height: auto;
            padding: 16px;
            margin-bottom: 16px;
          }
          .hero-top-info {
            flex-direction: column;
            align-items: flex-start;
          }
          .hero-controls {
            flex-direction: column;
            align-items: stretch;
          }
          .action-btn.icon-only {
            display: none;
          }
          .insights-section {
            grid-template-columns: 1fr;
          }
          .insights-section .card-quest-flow {
            grid-column: span 1;
          }
        }

        @media (max-width: 480px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }
          .card {
            padding: 14px;
          }
          .card-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .card-header .search-wrapper {
            width: 100%;
            max-width: none !important;
          }
        }
      `}</style>

      {/* --- MOBILE TOP HEADER --- */}
      <header className="mobile-header">
        <div className="logo-brand">
          <div className="logo-icon">
            <Shield size={18} />
          </div>
          <span style={{ fontWeight: 800, color: '#C37800', fontSize: 18 }}>TLEQuest</span>
        </div>
        <button
          className="menu-toggle-btn"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          aria-label="Toggle Navigation Menu"
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* --- BACKDROP OVERLAY FOR MOBILE SIDEBAR --- */}
      {isSidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* --- SIDEBAR DRAWER --- */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="logo">
          <div className="logo-brand">
            <div className="logo-icon">
              <Shield size={18} />
            </div>
            TLEQuest
          </div>
          <button
            className="menu-toggle-btn"
            style={{ display: isSidebarOpen ? 'block' : 'none' }}
            onClick={() => setIsSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <div className="menu-label">Menu</div>
        <div className="nav-item active" onClick={() => setIsSidebarOpen(false)}>
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </div>
        <Link to="/classes" className="nav-item" onClick={() => setIsSidebarOpen(false)}>
          <BookOpen size={18} />
          <span>Classes</span>
        </Link>
        <Link to="/users" className="nav-item" onClick={() => setIsSidebarOpen(false)}>
          <Users size={18} />
          <span>Adventurers</span>
        </Link>
        <Link to="/reports" className="nav-item" onClick={() => setIsSidebarOpen(false)}>
          <ChartColumn size={18} />
          <span>Insights</span>
        </Link>

        <div className="menu-label" style={{ marginTop: 24 }}>
          Settings
        </div>
        <Link to="/system-settings" className="nav-item" onClick={() => setIsSidebarOpen(false)}> 
          <Sliders size={18} />
          <span>System Settings</span>
        </Link>
        <Link to="/profile" className="nav-item" onClick={() => setIsSidebarOpen(false)}>
          <Settings size={18} />
          <span>Profile</span>
        </Link>
        <div
          className="nav-item"
          onClick={() => {
            setIsSidebarOpen(false);
            signOut();
          }}
          style={{ cursor: 'pointer', color: '#DF1B39' }}
        >
          <LogOut size={18} />
          <span>Sign Out</span>
        </div>

        <div className="promo-card">
          <Castle size={32} color="#804022" style={{ marginBottom: 10 }} />
          <div style={{ fontSize: 13, fontWeight: 600, color: '#804022' }}>
            Unlock full realm insights across all your guilds.
          </div>
          <button className="promo-btn">Upgrade Plan</button>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="main-content">
        {/* HERO BANNER */}
        <div className="hero-banner">
          <div className="hero-overlay"></div>

          <div className="hero-top-info">
            <div className="date-badge">
              <CalendarDays size={16} />
              <span>
                {now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            
            {/* --- DIGITAL CLOCK BADGE --- */}
            <div className="timer-badge">
              <Clock3 size={16} />
              <span>{getDigitalClock(now)}</span>
            </div>
          </div>

          <div className="hero-controls">
            <div className="search-wrapper">
              <Search className="search-icon" size={18} />
              <input
                type="text"
                className="search-bar"
                placeholder="Search quests, students, or classes..."
              />
            </div>
            <button className="action-btn icon-only">
              <MoreHorizontal size={18} />
            </button>
            <button className="action-btn">
              <FileDown size={18} />
              Export Report
            </button>
            <button className="action-btn primary-btn">
              <Plus size={18} />
              Add Quest
            </button>
          </div>
        </div>

        {isLoading && <p style={{ color: '#C37800', fontWeight: 600 }}>Loading realm data...</p>}
        {error && (
          <div
            style={{
              background: '#EC7D76',
              color: '#fff',
              padding: 16,
              borderRadius: 8,
              marginBottom: 24,
            }}
          >
            {error} <button onClick={loadDashboard} style={{ marginLeft: 12 }}>Retry</button>
          </div>
        )}

        {summary && (
          <>
            {/* STATS GRID */}
            <div className="stats-grid">
              <div
                className="card"
                style={{ background: '#804022', color: '#fff', borderColor: '#804022' }}
              >
                <div className="stat-label" style={{ color: '#FCECD6' }}>
                  Total Students
                </div>
                <div className="stat-value" style={{ color: '#FDC200' }}>
                  {summary.student_count}
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span className="stat-badge" style={{ background: 'rgba(36, 169, 86, 0.2)' }}>
                    +12%
                  </span>
                  <span className="stat-subtext truncate-text" style={{ color: '#FCECD6' }}>
                    driven by new signups
                  </span>
                </div>
              </div>

              <div className="card">
                <div className="stat-label">Active Classes</div>
                <div className="stat-value">{summary.class_count} Units</div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span className="stat-badge" style={{ background: '#FCECD6', color: '#C37800' }}>
                    +2
                  </span>
                  <span className="stat-subtext truncate-text">New classes added</span>
                </div>
              </div>

              <div className="card">
                <div className="stat-label">Quests Forged</div>
                <div className="stat-value">{summary.quest_count}</div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span className="stat-badge" style={{ background: '#FCECD6', color: '#C37800' }}>
                    5
                  </span>
                  <span className="stat-subtext truncate-text">Currently active</span>
                </div>
              </div>

              <div className="card">
                <div className="stat-label">Groups Formed</div>
                <div className="stat-value">{summary.group_count}</div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span className="stat-badge">+8%</span>
                  <span className="stat-subtext truncate-text">vs last month</span>
                </div>
              </div>
            </div>

            {/* INSIGHTS & CALENDAR SECTION */}
            {reports && (
              <div className="insights-section">
                {/* Quest Flow Chart */}
                <div className="card card-quest-flow">
                  <div className="card-header">
                    <h2 className="card-title">Quest Flow</h2>
                    <div style={{ display: 'flex', gap: 8, fontSize: 11, fontWeight: 600, flexWrap: 'wrap' }}>
                      <span style={{ color: '#FDC200' }}>● Started</span>
                      <span style={{ color: '#EC7D76' }}>● Dropped</span>
                      <span style={{ color: '#24A956' }}>● Completed</span>
                    </div>
                  </div>
                  <div className="chart-placeholder">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
                      <div className="bar-group" key={i}>
                        <div className="bar green" style={{ height: `${Math.random() * 30 + 10}%` }}></div>
                        <div className="bar orange" style={{ height: `${Math.random() * 20 + 10}%` }}></div>
                        <div className="bar yellow" style={{ height: `${Math.random() * 50 + 40}%` }}></div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Performers */}
                <div className="card">
                  <div className="card-header">
                    <h2 className="card-title">Top Performers</h2>
                    <span className="stat-badge">+8%</span>
                  </div>

                  <div className="mini-insight">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600 }}>
                        <span>Top Quest</span>
                        <span style={{ color: '#C37800', marginLeft: 8 }}>{reports.completion_rates[0]?.completion_rate || 0}%</span>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${reports.completion_rates[0]?.completion_rate || 0}%`, background: '#FDC200' }}></div>
                      </div>
                      <div className="truncate-text" style={{ fontSize: 11, color: '#D6BB83', marginTop: 4 }}>
                        {reports.completion_rates[0]?.quest_title || 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div className="mini-insight">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600 }}>
                        <span>Champion</span>
                        <span style={{ color: '#C37800', marginLeft: 8 }}>{reports.leaderboard[0]?.total_points || 0} pts</span>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: '80%', background: '#EC7D76' }}></div>
                      </div>
                      <div className="truncate-text" style={{ fontSize: 11, color: '#D6BB83', marginTop: 4 }}>
                        {reports.leaderboard[0]?.full_name || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Calendar Card */}
                <div className="card">
                  <div className="card-header">
                    <h2 className="card-title">Calendar</h2>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#C37800' }}>
                      {now.toLocaleString('default', { month: 'short' })} {now.getFullYear()}
                    </span>
                  </div>
                  <div className="calendar-grid">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                      <div key={idx} className="cal-head">
                        {day}
                      </div>
                    ))}
                    {getCalendarDays().map((day, idx) => {
                      const isToday = day === now.getDate();
                      return (
                        <div key={idx} className={`cal-day ${isToday ? 'today' : ''} ${!day ? 'empty' : ''}`}>
                          {day}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* BOTTOM GRID */}
            <div className="bottom-grid">
              <div className="card">
                <div className="card-header">
                  <h2 className="card-title">Classes by location</h2>
                  <div className="search-wrapper" style={{ maxWidth: 180 }}>
                    <Search className="search-icon" size={14} />
                    <input
                      type="text"
                      className="search-bar"
                      style={{ padding: '6px 10px 6px 32px', fontSize: 12 }}
                      placeholder="Search"
                    />
                  </div>
                </div>

                {summary.classes.length === 0 ? (
                  <p style={{ color: '#D6BB83', margin: 0 }}>No classes found.</p>
                ) : (
                  <div className="table-responsive">
                    <table>
                      <thead>
                        <tr>
                          <th>Class Name</th>
                          <th>Status</th>
                          <th>Active Quests</th>
                          <th>Students</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.classes.map((c) => (
                          <tr key={c.id}>
                            <td>
                              <div style={{ fontWeight: 700 }} className="truncate-text">{c.class_name}</div>
                              {c.section && <div style={{ fontSize: 11, color: '#D6BB83' }}>Sec: {c.section}</div>}
                            </td>
                            <td>
                              <span className="status-badge">Active</span>
                            </td>
                            <td>{c.active_quests}</td>
                            <td>{c.total_students}</td>
                            <td>
                              <button
                                style={{
                                  background: '#804022',
                                  color: '#fff',
                                  border: 'none',
                                  padding: '6px 10px',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: 11,
                                  fontWeight: 600,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                See Details
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="card">
                <div className="card-header">
                  <h2 className="card-title">Recent Activity</h2>
                  <span style={{ fontSize: 12, color: '#C37800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    Filter <ChevronDown size={14} />
                  </span>
                </div>

                {summary.recent_activity.length === 0 ? (
                  <p style={{ color: '#D6BB83', margin: 0 }}>No recent activity.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {summary.recent_activity.map((event, i) => (
                      <div className="list-item" key={i}>
                        <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                          <div className="item-icon-box">{ACTIVITY_ICONS[event.type]}</div>
                          <div style={{ minWidth: 0 }}>
                            <div className="truncate-text" style={{ fontWeight: 700, fontSize: 13 }}>{event.student_full_name}</div>
                            <div className="truncate-text" style={{ fontSize: 11, color: '#C37800', marginTop: 2 }}>{event.description}</div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <span
                            className="status-badge"
                            style={{ background: 'rgba(36, 169, 86, 0.1)', color: '#24A956' }}
                          >
                            Logged
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
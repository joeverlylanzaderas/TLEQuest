// admin-web/src/pages/Dashboard.tsx
//import sidebarLogo from '../assets/sidebar-logo2.png';
import sidebarLogo from '../assets/tlequest-logo3.png';
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, Users, ChartColumn, Settings, LogOut,
  CalendarDays, Clock3, Search, FileDown, Flag, Trophy, Upload, Menu, X, Sliders,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getDashboardSummary, getMonthActivity, getDayActivity } from '../api/dashboard';
import { getAdminReports } from '../api/reports';
import type { DashboardSummary, RecentActivityEvent, DayActivity, DayCounts } from '../types/dashboard';
import ActivityCalendar, { toKey } from '../components/ActivityCalendar';
import DayInsights from '../components/DayInsights';
import type { AdminReports } from '../types/reports';
import bannerImage from '../assets/admin-header.png';

const BANNER_IMAGE_URL = bannerImage;

const ACTIVITY_ICONS: Record<RecentActivityEvent['type'], React.ReactNode> = {
  quest_started: <Flag size={18} color="#C37800" />,
  quest_finished: <Trophy size={18} color="#FDC200" />,
  submission_made: <Upload size={18} color="#24A956" />,
};

type ActivityFilter = 'all' | RecentActivityEvent['type'];

// Fields read defensively, in case the TypeScript types don't list them yet
interface QuestRate {
  quest_title: string;
  class_name?: string;
  total_assigned?: number;
  total_completed?: number;
  completion_rate: number;
}

const groupsOf = (c: unknown): number => (c as { total_groups?: number }).total_groups ?? 0;
const timestampOf = (e: unknown): string | undefined => (e as { timestamp?: string }).timestamp;

function timeAgo(iso?: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function csvCell(value: unknown): string {
  const s = String(value ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [reports, setReports] = useState<AdminReports | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [now, setNow] = useState(new Date());
  const [search, setSearch] = useState('');
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all');

  // ---- calendar + day insights ----
  const [calClass, setCalClass] = useState<number | null>(null);
  const [calMonth, setCalMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<string | null>(() => toKey(new Date()));
  const [monthDays, setMonthDays] = useState<Record<string, DayCounts>>({});
  const [monthLoading, setMonthLoading] = useState(false);
  const [dayData, setDayData] = useState<DayActivity | null>(null);
  const [dayLoading, setDayLoading] = useState(false);
  const [dayError, setDayError] = useState('');

  useEffect(() => {
    loadDashboard();
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const monthKey = toKey(calMonth).slice(0, 7);
  useEffect(() => {
    let cancelled = false;
    setMonthLoading(true);
    getMonthActivity(monthKey, calClass)
      .then((r) => { if (!cancelled) setMonthDays(r.days); })
      .catch(() => { if (!cancelled) setMonthDays({}); })
      .finally(() => { if (!cancelled) setMonthLoading(false); });
    return () => { cancelled = true; };
  }, [monthKey, calClass]);

  const [dayReload, setDayReload] = useState(0);
  useEffect(() => {
    if (!selectedDay) { setDayData(null); return; }
    let cancelled = false;
    setDayLoading(true);
    setDayError('');
    getDayActivity(selectedDay, calClass)
      .then((r) => { if (!cancelled) setDayData(r); })
      .catch(() => { if (!cancelled) setDayError('Could not load this day. Please try again.'); })
      .finally(() => { if (!cancelled) setDayLoading(false); });
    return () => { cancelled = true; };
  }, [selectedDay, dayReload, calClass]);

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
    } catch {
      setError('Could not load dashboard data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  const rates = useMemo(
    () => ((reports?.completion_rates ?? []) as unknown as QuestRate[]),
    [reports]
  );

  const filteredClasses = useMemo(() => {
    const q = search.trim().toLowerCase();
    const all = summary?.classes ?? [];
    if (!q) return all;
    return all.filter((c) => `${c.class_name} ${c.section ?? ''}`.toLowerCase().includes(q));
  }, [summary, search]);

  const filteredActivity = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (summary?.recent_activity ?? []).filter((e) => {
      if (activityFilter !== 'all' && e.type !== activityFilter) return false;
      if (!q) return true;
      return `${e.student_full_name} ${e.description}`.toLowerCase().includes(q);
    });
  }, [summary, search, activityFilter]);

  // Quest chart: top 8 quests by number of students assigned
  const chartQuests = useMemo(
    () => [...rates].sort((a, b) => (b.total_assigned ?? 0) - (a.total_assigned ?? 0)).slice(0, 8),
    [rates]
  );
  const chartMax = Math.max(1, ...chartQuests.map((r) => r.total_assigned ?? 0));
  const BAR_AREA = 140;
  const barHeight = (v: number) => Math.max(3, Math.round((v / chartMax) * BAR_AREA));

  const classesWithQuests = (summary?.classes ?? []).filter((c) => c.active_quests > 0).length;
  const topQuest = rates[0];
  const champion = reports?.leaderboard?.[0];

  function exportReport() {
    if (!summary) return;
    const lines: string[] = [];
    lines.push('TLEQuest Dashboard Report');
    lines.push(`Generated,${csvCell(new Date().toLocaleString())}`);
    lines.push('');
    lines.push('Overview');
    lines.push(`Total students,${summary.student_count}`);
    lines.push(`Classes,${summary.class_count}`);
    lines.push(`Quests,${summary.quest_count}`);
    lines.push(`Groups,${summary.group_count}`);
    lines.push('');
    lines.push('Classes');
    lines.push('Class,Section,Active quests,Groups,Students');
    summary.classes.forEach((c) =>
      lines.push([c.class_name, c.section ?? '', c.active_quests, groupsOf(c), c.total_students].map(csvCell).join(','))
    );
    lines.push('');
    lines.push('Quest completion');
    lines.push('Quest,Classes,Assigned,Completed,Completion rate (%)');
    rates.forEach((r) =>
      lines.push(
        [r.quest_title, r.class_name ?? '', r.total_assigned ?? 0, r.total_completed ?? 0, r.completion_rate]
          .map(csvCell).join(',')
      )
    );
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tlequest-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const getDigitalClock = (date: Date) =>
    date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

  return (
    <div className="layout">
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; background-color: #F8EFE6; color: #804022; font-family: 'Inter', sans-serif; overflow-x: hidden; }
        h1, h2, h3, .card-title, .logo, .stat-value { font-family: 'Plus Jakarta Sans', sans-serif; }
        a { text-decoration: none; color: inherit; }
        .layout { display: flex; height: 100vh; width: 100vw; overflow: hidden; position: relative; }

        .mobile-header { display: none; height: 60px; background: #FFFFFF; border-bottom: 1px solid #D6BB83; padding: 0 16px; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 90; width: 100%; }
        .menu-toggle-btn { background: none; border: none; color: #804022; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 6px; }

        .sidebar { width: 260px; background: #FFFFFF; border-right: 1px solid #D6BB83; display: flex; flex-direction: column; padding: 24px 16px; flex-shrink: 0; z-index: 100; transition: transform 0.3s ease; }
        .logo { font-size: 22px; font-weight: 800; color: #C37800; margin-bottom: 20px; padding: 0 12px; display: flex; align-items: center; justify-content: center; position: relative; }
        .logo .menu-toggle-btn { position: absolute; top: 0; right: 0; }
        .brand-logo { height: 120px; width: auto; max-width: 100%; object-fit: contain; display: block; margin: 0 auto; }
        .brand-logo-mobile { height: 44px; margin: 0; }
        .logo-brand { display: flex; align-items: center; gap: 10px; }
        .logo-icon { background: #FDC200; color: #804022; border-radius: 8px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; }
        .menu-label { font-size: 11px; text-transform: uppercase; color: #D6BB83; font-weight: 700; margin: 0 12px 12px; letter-spacing: 0.6px; }
        .nav-item { padding: 10px 14px; border-radius: 10px; margin-bottom: 4px; font-size: 14px; font-weight: 500; color: #804022; display: flex; align-items: center; gap: 12px; transition: all 0.2s ease; }
        .nav-item.active { background: #FCECD6; color: #C37800; font-weight: 700; }
        .nav-item:hover:not(.active) { background: #F3EFD4; }
        .sidebar-backdrop { display: none; position: fixed; inset: 0; background: rgba(40,20,10,0.4); backdrop-filter: blur(2px); z-index: 95; }

        .main-content { flex: 1; overflow-y: auto; overflow-x: hidden; padding: 24px 32px; min-width: 0; }

        .hero-banner { background-image: url('${BANNER_IMAGE_URL}'); background-size: cover; background-position: center; border-radius: 20px; min-height: 200px; position: relative; margin-bottom: 24px; border: 1px solid #D6BB83; display: flex; flex-direction: column; justify-content: space-between; padding: 24px; overflow: hidden; box-shadow: 0 8px 24px rgba(128,64,34,0.12); }
        .hero-overlay { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(30,15,8,0.2) 0%, rgba(30,15,8,0.6) 100%); z-index: 1; }
        .hero-top-info { position: relative; z-index: 2; display: flex; justify-content: space-between; align-items: center; color: #FFFFFF; gap: 12px; flex-wrap: wrap; }
        .date-badge { background: rgba(89,60,60,0.4); backdrop-filter: blur(8px); padding: 8px 16px; border-radius: 12px; font-size: 13px; font-weight: 600; border: 1px solid rgba(255,255,255,0.25); display: flex; align-items: center; gap: 8px; }
        .timer-badge { background: #FDC200; color: #804022; padding: 8px 16px; border-radius: 12px; font-weight: 800; font-size: 13px; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); font-variant-numeric: tabular-nums; }
        .hero-controls { position: relative; z-index: 2; display: flex; gap: 12px; width: 100%; align-items: center; margin-top: 16px; flex-wrap: wrap; }

        .search-wrapper { position: relative; flex: 1; min-width: 200px; display: flex; align-items: center; }
        .search-wrapper .search-icon { position: absolute; left: 14px; color: #C37800; pointer-events: none; }
        .search-bar { width: 100%; background: #FFFFFF; border: 1px solid #D6BB83; padding: 12px 16px 12px 42px; border-radius: 12px; font-size: 14px; color: #804022; outline: none; box-shadow: 0 4px 12px rgba(128,64,34,0.05); }
        .search-bar::placeholder { color: #D6BB83; }

        .action-btn { background: #FFFFFF; border: 1px solid #D6BB83; padding: 12px 18px; border-radius: 12px; font-weight: 600; font-size: 14px; color: #804022; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 12px rgba(128,64,34,0.05); transition: background 0.2s; white-space: nowrap; }
        .action-btn:hover { background: #F8EFE6; }
        .primary-btn { background: #FDC200; border: 1px solid #C37800; color: #804022; }
        .primary-btn:hover { background: #ebd800; }

        .card { background: #FFFFFF; border-radius: 16px; padding: 20px; box-shadow: 0 4px 20px rgba(128,64,34,0.04); border: 1px solid #F3EFD4; display: flex; flex-direction: column; min-width: 0; overflow: hidden; width: 100%; }
        .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; gap: 12px; flex-wrap: wrap; }
        .card-title { font-size: 16px; font-weight: 700; color: #804022; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        .stats-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; margin-bottom: 24px; }
        .stat-label { font-size: 13px; color: #C37800; font-weight: 600; margin-bottom: 6px; }
        .stat-value { font-size: 26px; font-weight: 800; color: #804022; margin-bottom: 10px; line-height: 1.2; }
        .stat-badge { display: inline-block; background: rgba(36,169,86,0.1); color: #24A956; padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: 700; }
        .stat-subtext { font-size: 12px; color: #D6BB83; margin-left: 6px; }

        .insights-section { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; margin-bottom: 24px; }
        .legend { display: flex; gap: 10px; font-size: 11px; font-weight: 600; flex-wrap: wrap; }
        .qf-chart { height: 200px; display: flex; align-items: flex-end; gap: 14px; padding-top: 12px; border-top: 1px dashed #F3EFD4; margin-top: 4px; overflow-x: auto; }
        .qf-col { flex: 1; min-width: 56px; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; }
        .qf-bars { display: flex; gap: 4px; align-items: flex-end; height: 140px; }
        .qf-bar { width: 16px; border-radius: 4px 4px 0 0; }
        .qf-label { font-size: 10px; color: #804022; margin-top: 6px; max-width: 72px; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .qf-empty { height: 160px; display: flex; align-items: center; justify-content: center; color: #D6BB83; font-style: italic; font-size: 13px; text-align: center; border-top: 1px dashed #F3EFD4; margin-top: 4px; }

        .mini-insight { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #F3EFD4; }
        .mini-insight:last-child { border-bottom: none; }
        .progress-track { height: 8px; background: #FCECD6; border-radius: 4px; margin-top: 6px; overflow: hidden; }
        .progress-fill { height: 100%; border-radius: 4px; }

        .day-section { display: grid; grid-template-columns: minmax(300px, 1fr) 2fr; gap: 16px; margin-bottom: 24px; align-items: start; }
        .ac-nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .ac-title { font-weight: 800; font-size: 14px; color: #804022; font-family: 'Plus Jakarta Sans', sans-serif; }
        .ac-loading { color: #D6BB83; font-weight: 600; font-size: 11px; }
        .ac-nav-btn { background: #F8EFE6; border: 1px solid #D6BB83; color: #804022; border-radius: 8px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .ac-nav-btn:hover { background: #FCECD6; }
        .ac-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 5px; text-align: center; }
        .ac-head { font-size: 11px; font-weight: 700; color: #C37800; padding-bottom: 4px; }
        .ac-cell { aspect-ratio: 1 / 1; min-height: 34px; border: 2px solid transparent; border-radius: 10px; font-size: 13px; font-weight: 700; color: #804022; background: #F8EFE6; cursor: pointer; font-family: inherit; padding: 0; transition: transform .1s, box-shadow .1s; }
        .ac-cell:hover:not(.ac-empty) { transform: translateY(-1px); box-shadow: 0 3px 8px rgba(128,64,34,0.15); }
        .ac-empty { background: transparent; cursor: default; }
        .ac-l0 { background: #F8EFE6; }
        .ac-l1 { background: #FDF0C4; }
        .ac-l2 { background: #FBE08A; }
        .ac-l3 { background: #F8CC4A; }
        .ac-l4 { background: #E9A91A; color: #fff; }
        .ac-today { border-color: #804022; }
        .ac-selected { background: #804022 !important; color: #FDC200; border-color: #804022; box-shadow: 0 4px 10px rgba(128,64,34,0.3); }
        .ac-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 14px; gap: 8px; flex-wrap: wrap; }
        .ac-scale { display: flex; align-items: center; gap: 4px; font-size: 10px; color: #C37800; font-weight: 600; }
        .ac-swatch { width: 14px; height: 14px; border-radius: 4px; display: inline-block; }
        .ac-today-btn { background: none; border: none; color: #C37800; font-weight: 700; font-size: 12px; cursor: pointer; text-decoration: underline; padding: 0; }

        .di-card { min-height: 200px; }
        .di-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: #D6BB83; font-style: italic; font-size: 13px; padding: 36px 12px; }
        .di-stats { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
        .di-stat { display: flex; align-items: center; gap: 6px; background: #F8EFE6; border-radius: 10px; padding: 8px 12px; font-size: 13px; color: #804022; }
        .di-stat b { font-size: 18px; font-family: 'Plus Jakarta Sans', sans-serif; }
        .di-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
        .di-section-title { font-size: 12px; font-weight: 800; color: #C37800; text-transform: uppercase; letter-spacing: 0.5px; margin: 16px 0 8px; }
        .di-quest { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid #F3EFD4; }
        .di-quest:last-child { border-bottom: none; }
        .di-events { max-height: 280px; overflow-y: auto; padding-right: 2px; }

        .bottom-grid { display: grid; grid-template-columns: 1.5fr 1fr; gap: 16px; }
        .table-responsive { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
        table { width: 100%; border-collapse: collapse; min-width: 480px; }
        th { text-align: left; padding: 10px 12px; font-size: 12px; color: #C37800; border-bottom: 1px solid #D6BB83; }
        td { padding: 12px; border-bottom: 1px solid #F3EFD4; font-size: 13px; font-weight: 500; }
        .status-badge { padding: 4px 8px; border-radius: 20px; font-size: 11px; font-weight: 600; background: #FCECD6; color: #C37800; white-space: nowrap; }
        .details-btn { background: #804022; color: #fff; border: none; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: 600; white-space: nowrap; }
        .details-btn:hover { background: #5C2C16; }
        .filter-select { background: #FFFFFF; border: 1px solid #D6BB83; color: #C37800; border-radius: 9999px; padding: 5px 12px; font-size: 12px; font-weight: 700; outline: none; cursor: pointer; }

        .list-item { display: flex; justify-content: space-between; align-items: center; padding: 12px; border: 1px solid #F3EFD4; border-radius: 12px; margin-bottom: 10px; gap: 12px; }
        .list-item:last-child { margin-bottom: 0; }
        .item-icon-box { width: 38px; height: 38px; background: #FCECD6; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-right: 12px; flex-shrink: 0; }
        .truncate-text { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .empty-note { color: #D6BB83; margin: 0; font-style: italic; }

        @media (max-width: 1200px) {
          .stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .insights-section { grid-template-columns: 1fr; }
        }
        @media (max-width: 992px) { .bottom-grid { grid-template-columns: 1fr; } .day-section { grid-template-columns: 1fr; } }
        @media (max-width: 768px) {
          .layout { flex-direction: column; height: auto; min-height: 100vh; overflow-y: auto; }
          .mobile-header { display: flex; }
          .sidebar { position: fixed; top: 0; left: 0; bottom: 0; height: 100vh; transform: translateX(-100%); box-shadow: 4px 0 24px rgba(0,0,0,0.15); }
          .sidebar.open { transform: translateX(0); }
          .sidebar-backdrop { display: block; }
          .main-content { padding: 16px; overflow-y: visible; }
          .hero-banner { min-height: auto; padding: 16px; margin-bottom: 16px; }
          .hero-top-info { flex-direction: column; align-items: flex-start; }
          .hero-controls { flex-direction: column; align-items: stretch; }
          .insights-section { grid-template-columns: 1fr; }
          .insights-section .card-quest-flow { grid-column: span 1; }
        }
        @media (max-width: 480px) {
          .stats-grid { grid-template-columns: 1fr; }
          .card { padding: 14px; }
          .card-header { flex-direction: column; align-items: flex-start; }
        }
      `}</style>

      {/* --- MOBILE TOP HEADER --- */}
      <header className="mobile-header">
        <img src={sidebarLogo} alt="TLEQuest" className="brand-logo brand-logo-mobile" />
        <button className="menu-toggle-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)} aria-label="Toggle Navigation Menu">
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
        <div className="nav-item active" onClick={() => setIsSidebarOpen(false)}>
          <LayoutDashboard size={18} /><span>Dashboard</span>
        </div>
        <Link to="/classes" className="nav-item" onClick={() => setIsSidebarOpen(false)}>
          <BookOpen size={18} /><span>Classes</span>
        </Link>
        <Link to="/users" className="nav-item" onClick={() => setIsSidebarOpen(false)}>
          <Users size={18} /><span>Users</span>
        </Link>
        <Link to="/reports" className="nav-item" onClick={() => setIsSidebarOpen(false)}>
          <ChartColumn size={18} /><span>Insights</span>
        </Link>

        <div className="menu-label" style={{ marginTop: 24 }}>Settings</div>
        <Link to="/system-settings" className="nav-item" onClick={() => setIsSidebarOpen(false)}>
          <Sliders size={18} /><span>System Settings</span>
        </Link>
        <Link to="/profile" className="nav-item" onClick={() => setIsSidebarOpen(false)}>
          <Settings size={18} /><span>Profile</span>
        </Link>
        <div
          className="nav-item"
          onClick={() => { setIsSidebarOpen(false); signOut(); }}
          style={{ cursor: 'pointer', color: '#DF1B39', marginTop: 'auto' }}
        >
          <LogOut size={18} /><span>Sign Out</span>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="main-content">
        <div className="hero-banner">
          <div className="hero-overlay"></div>

          <div className="hero-top-info">
            <div className="date-badge">
              <CalendarDays size={16} />
              <span>{now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
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
                placeholder="Search classes or recent activity..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button className="action-btn" onClick={exportReport} disabled={!summary}>
              <FileDown size={18} /> Export Report
            </button>
            <button className="action-btn primary-btn" onClick={() => navigate('/users')}>
              <Users size={18} /> Manage Users
            </button>
          </div>
        </div>

        {isLoading && <p style={{ color: '#C37800', fontWeight: 600 }}>Loading realm data...</p>}
        {error && (
          <div style={{ background: '#EC7D76', color: '#fff', padding: 16, borderRadius: 8, marginBottom: 24 }}>
            {error} <button onClick={loadDashboard} style={{ marginLeft: 12 }}>Retry</button>
          </div>
        )}

        {summary && (
          <>
            {/* STATS */}
            <div className="stats-grid">
              <div className="card" style={{ background: '#804022', color: '#fff', borderColor: '#804022' }}>
                <div className="stat-label" style={{ color: '#FCECD6' }}>Total Students</div>
                <div className="stat-value" style={{ color: '#FDC200' }}>{summary.student_count}</div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span className="stat-badge" style={{ background: 'rgba(36,169,86,0.2)' }}>{summary.class_count}</span>
                  <span className="stat-subtext truncate-text" style={{ color: '#FCECD6' }}>
                    enrolled across {summary.class_count === 1 ? 'class' : 'classes'}
                  </span>
                </div>
              </div>

              <div className="card">
                <div className="stat-label">Active Classes</div>
                <div className="stat-value">{summary.class_count} {summary.class_count === 1 ? 'Unit' : 'Units'}</div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span className="stat-badge" style={{ background: '#FCECD6', color: '#C37800' }}>{classesWithQuests}</span>
                  <span className="stat-subtext truncate-text">with published quests</span>
                </div>
              </div>

              <div className="card">
                <div className="stat-label">Quests Forged</div>
                <div className="stat-value">{summary.quest_count}</div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span className="stat-badge" style={{ background: '#FCECD6', color: '#C37800' }}>{rates.length}</span>
                  <span className="stat-subtext truncate-text">published</span>
                </div>
              </div>

              <div className="card">
                <div className="stat-label">Groups Formed</div>
                <div className="stat-value">{summary.group_count}</div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span className="stat-badge">{summary.class_count}</span>
                  <span className="stat-subtext truncate-text">
                    across {summary.class_count === 1 ? 'class' : 'classes'}
                  </span>
                </div>
              </div>
            </div>

            {/* INSIGHTS */}
            {reports && (
              <div className="insights-section">
                <div className="card card-quest-flow">
                  <div className="card-header">
                    <h2 className="card-title">Quest Flow</h2>
                    <div className="legend">
                      <span style={{ color: '#FDC200' }}>● Assigned</span>
                      <span style={{ color: '#EC7D76' }}>● In progress</span>
                      <span style={{ color: '#24A956' }}>● Completed</span>
                    </div>
                  </div>

                  {chartQuests.length === 0 ? (
                    <div className="qf-empty">No published quests have been assigned yet.</div>
                  ) : (
                    <div className="qf-chart">
                      {chartQuests.map((r, i) => {
                        const assigned = r.total_assigned ?? 0;
                        const completed = r.total_completed ?? 0;
                        const inProgress = Math.max(0, assigned - completed);
                        return (
                          <div className="qf-col" key={i} title={`${r.quest_title}: ${assigned} assigned, ${inProgress} in progress, ${completed} completed`}>
                            <div className="qf-bars">
                              <div className="qf-bar" style={{ height: barHeight(assigned), background: '#FDC200' }} />
                              <div className="qf-bar" style={{ height: barHeight(inProgress), background: '#EC7D76' }} />
                              <div className="qf-bar" style={{ height: barHeight(completed), background: '#24A956' }} />
                            </div>
                            <div className="qf-label">{r.quest_title}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="card">
                  <div className="card-header">
                    <h2 className="card-title">Top Performers</h2>
                  </div>

                  <div className="mini-insight">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600 }}>
                        <span>Top Quest</span>
                        <span style={{ color: '#C37800', marginLeft: 8 }}>{topQuest?.completion_rate ?? 0}%</span>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${topQuest?.completion_rate ?? 0}%`, background: '#FDC200' }} />
                      </div>
                      <div className="truncate-text" style={{ fontSize: 11, color: '#D6BB83', marginTop: 4 }}>
                        {topQuest?.quest_title || 'No quests yet'}
                      </div>
                    </div>
                  </div>

                  <div className="mini-insight">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600 }}>
                        <span>Champion</span>
                        <span style={{ color: '#C37800', marginLeft: 8 }}>{champion?.total_points ?? 0} pts</span>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: champion && champion.total_points > 0 ? '100%' : '0%', background: '#EC7D76' }} />
                      </div>
                      <div className="truncate-text" style={{ fontSize: 11, color: '#D6BB83', marginTop: 4 }}>
                        {champion?.full_name || 'No points earned yet'}
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* CALENDAR + DAY INSIGHTS */}
            <div className="day-section">
              <div className="card">
                <div className="card-header">
                  <h2 className="card-title">Calendar</h2>
                  <select
                    className="filter-select"
                    value={calClass ?? ''}
                    onChange={(e) => setCalClass(e.target.value ? Number(e.target.value) : null)}
                    aria-label="Filter calendar by class"
                  >
                    <option value="">All classes</option>
                    {summary.classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.class_name}{c.section ? ` – ${c.section}` : ''}</option>
                    ))}
                  </select>
                </div>
                <ActivityCalendar
                  month={calMonth}
                  onMonthChange={setCalMonth}
                  selected={selectedDay}
                  onSelect={setSelectedDay}
                  days={monthDays}
                  loading={monthLoading}
                />
              </div>

              {selectedDay ? (
                <DayInsights
                  dateKey={selectedDay}
                  data={dayData}
                  loading={dayLoading}
                  error={dayError}
                  onRetry={() => setDayReload((n) => n + 1)}
                />
              ) : (
                <div className="card di-card">
                  <div className="di-empty">
                    <CalendarDays size={28} color="#D6BB83" />
                    <p style={{ margin: '8px 0 0' }}>Select a date on the calendar to see its activity.</p>
                  </div>
                </div>
              )}
            </div>

            {/* BOTTOM */}
            <div className="bottom-grid">
              <div className="card">
                <div className="card-header">
                  <h2 className="card-title">Classes</h2>
                  <span style={{ fontSize: 12, color: '#C37800', fontWeight: 700 }}>
                    {filteredClasses.length} of {summary.classes.length}
                  </span>
                </div>

                {filteredClasses.length === 0 ? (
                  <p className="empty-note">No classes found.</p>
                ) : (
                  <div className="table-responsive">
                    <table>
                      <thead>
                        <tr>
                          <th>Class Name</th>
                          <th>Groups</th>
                          <th>Active Quests</th>
                          <th>Students</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredClasses.map((c) => (
                          <tr key={c.id}>
                            <td>
                              <div style={{ fontWeight: 700 }} className="truncate-text">{c.class_name}</div>
                              {c.section && <div style={{ fontSize: 11, color: '#D6BB83' }}>Sec: {c.section}</div>}
                            </td>
                            <td>{groupsOf(c)}</td>
                            <td>{c.active_quests}</td>
                            <td>{c.total_students}</td>
                            <td>
                              <button className="details-btn" onClick={() => navigate('/classes')}>See Details</button>
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
                  <select
                    className="filter-select"
                    value={activityFilter}
                    onChange={(e) => setActivityFilter(e.target.value as ActivityFilter)}
                  >
                    <option value="all">All</option>
                    <option value="quest_started">Started</option>
                    <option value="quest_finished">Finished</option>
                    <option value="submission_made">Submitted</option>
                  </select>
                </div>

                {filteredActivity.length === 0 ? (
                  <p className="empty-note">No recent activity.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {filteredActivity.map((event, i) => (
                      <div className="list-item" key={i}>
                        <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                          <div className="item-icon-box">{ACTIVITY_ICONS[event.type]}</div>
                          <div style={{ minWidth: 0 }}>
                            <div className="truncate-text" style={{ fontWeight: 700, fontSize: 13 }}>{event.student_full_name}</div>
                            <div className="truncate-text" style={{ fontSize: 11, color: '#C37800', marginTop: 2 }}>{event.description}</div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <span className="status-badge" style={{ background: 'rgba(36,169,86,0.1)', color: '#24A956' }}>
                            {timeAgo(timestampOf(event)) || 'Logged'}
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
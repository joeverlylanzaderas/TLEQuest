import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { getAdminReports } from '../api/reports';
import type { AdminReports } from '../types/reports';

type TabKey = 'completion' | 'leaderboard' | 'classes' | 'activity' | 'teachers';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'completion', label: 'Quest Completion' },
  { key: 'leaderboard', label: 'Leaderboard' },
  { key: 'classes', label: 'Class Performance' },
  { key: 'activity', label: 'Activity Over Time' },
  { key: 'teachers', label: 'Teacher Engagement' },
];

// Established Warm Project Theme Colors
const COLOR_PRIMARY = '#5C2C16';   // Deep Warm Brown
const COLOR_SECONDARY = '#C37800'; // Amber Gold
const COLOR_TERTIARY = '#804022';  // Terracotta
const COLOR_ACCENT = '#FDC200';    // Bright Gold
const COLOR_BORDER = '#D6BB83';    // Muted Gold
const COLOR_BG = '#F8EFE6';        // Soft Cream Background
const COLOR_DANGER = '#DF1B39';    // Crimson Red

// Custom Recharts Tooltip Styling
const tooltipStyle: React.CSSProperties = {
  backgroundColor: '#FFFFFF',
  border: `1px solid ${COLOR_BORDER}`,
  borderRadius: '8px',
  boxShadow: '0 4px 12px rgba(92, 44, 22, 0.08)',
  color: COLOR_PRIMARY,
  fontWeight: 600,
  fontSize: '13px',
  padding: '8px 12px',
};

export default function Reports() {
  const { user, signOut } = useAuth();
  const [reports, setReports] = useState<AdminReports | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('completion');

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    setIsLoading(true);
    setError('');
    try {
      const data = await getAdminReports({ activityDays: 14, leaderboardLimit: 20 });
      setReports(data);
    } catch (e) {
      setError('Could not load reports. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  // Derived Metrics
  const avgCompletion = reports?.completion_rates.length
    ? Math.round(
        reports.completion_rates.reduce((acc, curr) => acc + curr.completion_rate, 0) /
          reports.completion_rates.length
      )
    : 0;

  const totalSubmissions = reports?.activity_over_time.reduce(
    (acc, curr) => acc + curr.submissions_made,
    0
  ) || 0;

  return (
    <div style={{ padding: '32px', maxWidth: '1280px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', color: COLOR_PRIMARY, fontWeight: 800 }}>
            Reports & Analytics
          </h1>
          {user && (
            <span style={{ fontSize: '13px', color: COLOR_TERTIARY }}>
              Logged in as <strong>@{user.username}</strong> ({user.role})
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link
            to="/"
            style={{
              textDecoration: 'none',
              color: COLOR_PRIMARY,
              fontSize: '14px',
              fontWeight: 600,
              padding: '8px 16px',
              border: `1px solid ${COLOR_BORDER}`,
              borderRadius: '8px',
              backgroundColor: '#FFFFFF',
            }}
          >
            ← Back to Dashboard
          </Link>
          <button
            onClick={signOut}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: 600,
              color: COLOR_DANGER,
              backgroundColor: '#FDF2F2',
              border: '1px solid #F8B4B4',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            Sign Out
          </button>
        </div>
      </div>

      {isLoading && <p style={{ color: COLOR_TERTIARY, fontWeight: 600 }}>Loading reports & analytics…</p>}

      {error && (
        <div style={{ color: COLOR_DANGER, backgroundColor: '#FDF2F2', border: '1px solid #F8B4B4', padding: '12px 16px', borderRadius: '8px', marginBottom: 16 }}>
          {error}{' '}
          <button onClick={loadReports} style={{ marginLeft: 8, padding: '4px 10px', background: COLOR_DANGER, color: '#FFF', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Retry
          </button>
        </div>
      )}

      {reports && !isLoading && (
        <>
          {/* KPI Summary Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: 24 }}>
            <KpiCard label="Avg. Quest Completion" value={`${avgCompletion}%`} />
            <KpiCard label="Top Leaderboard Score" value={`${reports.leaderboard[0]?.total_points ?? 0} pts`} />
            <KpiCard label="Submissions (14d)" value={totalSubmissions.toLocaleString()} />
            <KpiCard label="Active Classes" value={reports.class_performance.length} />
          </div>

          {/* Navigation Tab Bar */}
          <div style={{ display: 'flex', gap: 8, borderBottom: `1px solid ${COLOR_BORDER}`, marginBottom: 24 }}>
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    padding: '10px 18px',
                    border: 'none',
                    borderBottom: isActive ? `3px solid ${COLOR_PRIMARY}` : '3px solid transparent',
                    background: 'none',
                    fontWeight: isActive ? 800 : 500,
                    color: isActive ? COLOR_PRIMARY : COLOR_TERTIARY,
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content Views */}
          {activeTab === 'completion' && <CompletionSection data={reports.completion_rates} />}
          {activeTab === 'leaderboard' && <LeaderboardSection data={reports.leaderboard} />}
          {activeTab === 'classes' && <ClassPerformanceSection data={reports.class_performance} />}
          {activeTab === 'activity' && <ActivitySection data={reports.activity_over_time} />}
          {activeTab === 'teachers' && <TeacherEngagementSection data={reports.teacher_engagement} />}
        </>
      )}
    </div>
  );
}

// ============================================================================
// SECTION 1 — Quest Completion
// ============================================================================
function CompletionSection({ data }: { data: AdminReports['completion_rates'] }) {
  if (data.length === 0) return <p style={{ color: COLOR_TERTIARY, fontStyle: 'italic' }}>No published quests yet.</p>;

  const chartHeight = Math.max(220, data.length * 40);

  return (
    <>
      <ChartCard height={chartHeight}>
        <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#EADEC9" />
          <XAxis type="number" domain={[0, 100]} unit="%" stroke={COLOR_TERTIARY} />
          <YAxis type="category" dataKey="quest_title" width={160} tick={{ fontSize: 12, fill: COLOR_PRIMARY }} />
          <Tooltip contentStyle={tooltipStyle} formatter={(value: any) => [`${value}%`, 'Completion Rate']} />
          <Bar dataKey="completion_rate" fill={COLOR_PRIMARY} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ChartCard>

      <table style={tableStyle}>
        <thead>
          <tr>
            <Th>Quest</Th>
            <Th>Class</Th>
            <Th>Assigned</Th>
            <Th>Completed</Th>
            <Th>Completion Rate</Th>
          </tr>
        </thead>
        <tbody>
          {data.map((r) => (
            <tr key={r.quest_id}>
              <Td style={{ fontWeight: 600 }}>{r.quest_title}</Td>
              <Td>{r.class_name} {r.section ? `(${r.section})` : ''}</Td>
              <Td>{r.total_assigned}</Td>
              <Td>{r.total_completed}</Td>
              <Td style={{ fontWeight: 700, color: COLOR_PRIMARY }}>{r.completion_rate}%</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

// ============================================================================
// SECTION 2 — Leaderboard
// ============================================================================
function LeaderboardSection({ data }: { data: AdminReports['leaderboard'] }) {
  if (data.length === 0) return <p style={{ color: COLOR_TERTIARY, fontStyle: 'italic' }}>No points or badges earned yet.</p>;

  const top10 = data.slice(0, 10);

  return (
    <>
      <ChartCard height={320}>
        <BarChart data={top10} margin={{ bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EADEC9" />
          <XAxis dataKey="username" tick={{ fontSize: 11, fill: COLOR_PRIMARY }} angle={-30} textAnchor="end" interval={0} height={50} />
          <YAxis stroke={COLOR_TERTIARY} />
          <Tooltip contentStyle={tooltipStyle} labelFormatter={(_, payload: readonly any[]) => payload?.[0]?.payload?.full_name ?? ''} />
          <Bar dataKey="total_points" name="Points" fill={COLOR_SECONDARY} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartCard>

      <table style={tableStyle}>
        <thead>
          <tr>
            <Th style={{ width: 60, textAlign: 'center' }}>Rank</Th>
            <Th>Student</Th>
            <Th>Points</Th>
            <Th>Unique Badges</Th>
          </tr>
        </thead>
        <tbody>
          {data.map((r, i) => (
            <tr key={r.student_id}>
              <Td style={{ textAlign: 'center', fontWeight: 800 }}>{i + 1}</Td>
              <Td>
                <strong>{r.full_name}</strong>{' '}
                <span style={{ color: COLOR_SECONDARY, fontSize: '13px' }}>@{r.username}</span>
              </Td>
              <Td style={{ fontWeight: 700, color: COLOR_PRIMARY }}>{r.total_points} pts</Td>
              <Td>{r.unique_badges}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

// ============================================================================
// SECTION 3 — Class Performance
// ============================================================================
function ClassPerformanceSection({ data }: { data: AdminReports['class_performance'] }) {
  if (data.length === 0) return <p style={{ color: COLOR_TERTIARY, fontStyle: 'italic' }}>No active classes yet.</p>;

  const chartHeight = Math.max(200, data.length * 40);
  const chartData = data.map((c) => ({
    ...c,
    label: `${c.class_name}${c.section ? ` (${c.section})` : ''}`,
  }));

  return (
    <>
      <ChartCard height={chartHeight}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#EADEC9" />
          <XAxis type="number" domain={[0, 100]} unit="%" stroke={COLOR_TERTIARY} />
          <YAxis type="category" dataKey="label" width={160} tick={{ fontSize: 12, fill: COLOR_PRIMARY }} />
          <Tooltip contentStyle={tooltipStyle} formatter={(value: any) => [`${value}%`, 'Completion Rate']} />
          <Bar dataKey="completion_rate" fill={COLOR_TERTIARY} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ChartCard>

      <table style={tableStyle}>
        <thead>
          <tr>
            <Th>Class</Th>
            <Th>Students</Th>
            <Th>Completion Rate</Th>
            <Th>Avg. Rating</Th>
            <Th>Total Points</Th>
          </tr>
        </thead>
        <tbody>
          {data.map((r) => (
            <tr key={r.class_id}>
              <Td style={{ fontWeight: 600 }}>{r.class_name} {r.section ? `(${r.section})` : ''}</Td>
              <Td>{r.total_students}</Td>
              <Td style={{ fontWeight: 700 }}>{r.completion_rate}%</Td>
              <Td>{r.avg_submission_rating !== null ? `${r.avg_submission_rating} / 5` : '—'}</Td>
              <Td style={{ fontWeight: 700, color: COLOR_PRIMARY }}>{r.total_points_earned}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

// ============================================================================
// SECTION 4 — Activity Over Time
// ============================================================================
function ActivitySection({ data }: { data: AdminReports['activity_over_time'] }) {
  if (data.length === 0) return <p style={{ color: COLOR_TERTIARY, fontStyle: 'italic' }}>No recorded activity in this range.</p>;

  return (
    <>
      <ChartCard height={320}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#EADEC9" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: COLOR_PRIMARY }} stroke={COLOR_TERTIARY} />
          <YAxis allowDecimals={false} stroke={COLOR_TERTIARY} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend />
          <Line type="monotone" dataKey="quests_started" name="Quests Started" stroke={COLOR_PRIMARY} strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="submissions_made" name="Submissions Made" stroke={COLOR_SECONDARY} strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ChartCard>

      <table style={tableStyle}>
        <thead>
          <tr>
            <Th>Date</Th>
            <Th>Quests Started</Th>
            <Th>Submissions Made</Th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.date}>
              <Td style={{ fontWeight: 600 }}>{d.date}</Td>
              <Td>{d.quests_started}</Td>
              <Td>{d.submissions_made}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

// ============================================================================
// SECTION 5 — Teacher Engagement
// ============================================================================
function TeacherEngagementSection({ data }: { data: AdminReports['teacher_engagement'] }) {
  if (data.length === 0) return <p style={{ color: COLOR_TERTIARY, fontStyle: 'italic' }}>No active teachers yet.</p>;

  return (
    <>
      <ChartCard height={320}>
        <BarChart data={data} margin={{ bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EADEC9" />
          <XAxis dataKey="username" tick={{ fontSize: 11, fill: COLOR_PRIMARY }} angle={-30} textAnchor="end" interval={0} height={50} />
          <YAxis allowDecimals={false} stroke={COLOR_TERTIARY} />
          <Tooltip contentStyle={tooltipStyle} labelFormatter={(_, payload: readonly any[]) => payload?.[0]?.payload?.full_name ?? ''} />
          <Legend />
          <Bar dataKey="quests_created" name="Quests Created" fill={COLOR_PRIMARY} radius={[4, 4, 0, 0]} />
          <Bar dataKey="submissions_reviewed" name="Submissions Reviewed" fill={COLOR_SECONDARY} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartCard>

      <table style={tableStyle}>
        <thead>
          <tr>
            <Th>Teacher</Th>
            <Th>Quests Created</Th>
            <Th>Submissions Reviewed</Th>
            <Th>Students Taught</Th>
          </tr>
        </thead>
        <tbody>
          {data.map((r) => (
            <tr key={r.teacher_id}>
              <Td>
                <strong>{r.full_name}</strong>{' '}
                <span style={{ color: COLOR_SECONDARY, fontSize: '13px' }}>@{r.username}</span>
              </Td>
              <Td>{r.quests_created}</Td>
              <Td>{r.submissions_reviewed}</Td>
              <Td>{r.students_taught}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

// ============================================================================
// HELPER COMPONENTS & STYLES
// ============================================================================

function ChartCard({ height, children }: { height: number; children: React.ReactElement }) {
  return (
    <div
      style={{
        marginBottom: 24,
        padding: 16,
        border: `1px solid ${COLOR_BORDER}`,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
      }}
    >
      <ResponsiveContainer width="100%" height={height}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: `1px solid ${COLOR_BORDER}`,
        borderRadius: 12,
        padding: '16px 20px',
        boxShadow: '0 2px 8px rgba(92, 44, 22, 0.04)',
      }}
    >
      <div style={{ fontSize: '13px', color: COLOR_TERTIARY, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: '22px', color: COLOR_PRIMARY, fontWeight: 800, marginTop: 4 }}>
        {value}
      </div>
    </div>
  );
}

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  backgroundColor: '#FFFFFF',
  border: `1px solid ${COLOR_BORDER}`,
  borderRadius: '8px',
  overflow: 'hidden',
};

function Th({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <th
      style={{
        textAlign: 'left',
        padding: '12px 14px',
        borderBottom: `2px solid ${COLOR_BORDER}`,
        fontSize: 13,
        color: COLOR_BG,
        backgroundColor: COLOR_PRIMARY,
        fontWeight: 700,
        ...style,
      }}
    >
      {children}
    </th>
  );
}

function Td({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <td
      style={{
        padding: '12px 14px',
        borderBottom: '1px solid #EADEC9',
        fontSize: 14,
        color: COLOR_PRIMARY,
        ...style,
      }}
    >
      {children}
    </td>
  );
}
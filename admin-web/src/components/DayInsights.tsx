// admin-web/src/components/DayInsights.tsx
// Everything that happened on the day picked in the calendar: totals, an hour-by-hour
// chart and the list of events.
import { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Flag, Trophy, Upload, CalendarX2, MessageSquareText, Star } from 'lucide-react';
import type { DayActivity, DayEventType } from '../types/dashboard';

const C_STARTED = '#FDC200';
const C_FINISHED = '#24A956';
const C_SUBMITTED = '#EC7D76';
const C_REVIEWED = '#6C8EBF';
const C_REWARDED = '#9B6BC4';

const ICONS: Record<DayEventType, React.ReactNode> = {
  quest_started: <Flag size={16} color="#C37800" />,
  quest_finished: <Trophy size={16} color="#FDC200" />,
  submission_made: <Upload size={16} color="#24A956" />,
  feedback_given: <MessageSquareText size={16} color="#6C8EBF" />,
  reward_earned: <Star size={16} color="#9B6BC4" />,
};

const hourLabel = (h: number) => {
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}${h < 12 ? 'a' : 'p'}`;
};

interface Props {
  dateKey: string;
  data: DayActivity | null;
  loading: boolean;
  error: string;
  onRetry: () => void;
}

export default function DayInsights({ dateKey, data, loading, error, onRetry }: Props) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const pretty = new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  // Trim the chart to the hours that matter, with a little padding, instead of 24 mostly-empty bars.
  const hours = useMemo(() => {
    const all = data?.hourly ?? [];
    const active = all.filter((h) => h.started + h.finished + h.submitted + h.reviewed + h.rewarded > 0).map((h) => h.hour);
    if (active.length === 0) return [];
    const from = Math.max(0, Math.min(...active) - 1);
    const to = Math.min(23, Math.max(...active) + 1);
    return all.filter((h) => h.hour >= from && h.hour <= to).map((h) => ({ ...h, label: hourLabel(h.hour) }));
  }, [data]);

  return (
    <div className="card di-card">
      <div className="card-header">
        <h2 className="card-title">{pretty}</h2>
      </div>

      {error ? (
        <div className="di-empty">
          <p style={{ margin: 0 }}>{error}</p>
          <button className="details-btn" style={{ marginTop: 10 }} onClick={onRetry}>Try again</button>
        </div>
      ) : loading && !data ? (
        <div className="di-empty">Loading this day…</div>
      ) : !data || data.counts.total === 0 ? (
        <div className="di-empty">
          <CalendarX2 size={28} color="#D6BB83" />
          <p style={{ margin: '8px 0 0' }}>Nothing happened on this day.</p>
        </div>
      ) : (
        <div style={{ opacity: loading ? 0.6 : 1, transition: 'opacity .15s' }}>
          <div className="di-stats">
            <div className="di-stat"><span className="di-dot" style={{ background: C_STARTED }} /><b>{data.counts.started}</b> started</div>
            <div className="di-stat"><span className="di-dot" style={{ background: C_FINISHED }} /><b>{data.counts.finished}</b> finished</div>
            <div className="di-stat"><span className="di-dot" style={{ background: C_SUBMITTED }} /><b>{data.counts.submitted}</b> submitted</div>
            <div className="di-stat"><span className="di-dot" style={{ background: C_REVIEWED }} /><b>{data.counts.reviewed}</b> reviewed</div>
            <div className="di-stat"><span className="di-dot" style={{ background: C_REWARDED }} /><b>{data.counts.points}</b> pts given</div>
          </div>

          <div className="di-section-title">Activity by hour</div>
          <div style={{ width: '100%', height: 180 }}>
            <ResponsiveContainer>
              <BarChart data={hours} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3EFD4" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#804022' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#804022' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'rgba(253,194,0,0.12)' }} contentStyle={{ borderRadius: 10, border: '1px solid #D6BB83', fontSize: 12 }} />
                <Bar dataKey="started" name="Started" stackId="a" fill={C_STARTED} />
                <Bar dataKey="finished" name="Finished" stackId="a" fill={C_FINISHED} />
                <Bar dataKey="submitted" name="Submitted" stackId="a" fill={C_SUBMITTED} />
                <Bar dataKey="reviewed" name="Reviewed" stackId="a" fill={C_REVIEWED} />
                <Bar dataKey="rewarded" name="Rewards" stackId="a" fill={C_REWARDED} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {data.per_quest.length > 0 && (
            <>
              <div className="di-section-title">By quest</div>
              {data.per_quest.slice(0, 5).map((q) => {
                const total = q.events;
                return (
                  <div className="di-quest" key={q.quest_title}>
                    <div className="truncate-text" style={{ fontWeight: 700, fontSize: 13 }}>{q.quest_title}</div>
                    <div style={{ fontSize: 12, color: '#C37800', flexShrink: 0 }}>
                      {total} event{total === 1 ? '' : 's'}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          <div className="di-section-title">Events ({data.events.length})</div>
          <div className="di-events">
            {data.events.map((e, i) => (
              <div className="list-item" key={i}>
                <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                  <div className="item-icon-box" style={{ width: 32, height: 32, marginRight: 10 }}>{ICONS[e.type]}</div>
                  <div style={{ minWidth: 0 }}>
                    <div className="truncate-text" style={{ fontWeight: 700, fontSize: 13 }}>{e.student_full_name}</div>
                    <div className="truncate-text" style={{ fontSize: 11, color: '#C37800', marginTop: 2 }}>{e.description}</div>
                  </div>
                </div>
                <span className="status-badge" style={{ flexShrink: 0 }}>
                  {new Date(e.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

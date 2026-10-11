// admin-web/src/components/ActivityCalendar.tsx
// A month calendar that doubles as a day picker: each day is shaded by how much happened
// on it, and clicking a day selects it (click it again to clear the selection).
import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { DayCounts } from '../types/dashboard';

export const toKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

interface Props {
  /** first day of the month being shown */
  month: Date;
  onMonthChange: (m: Date) => void;
  /** YYYY-MM-DD, or null for "no day selected" */
  selected: string | null;
  onSelect: (key: string | null) => void;
  days: Record<string, DayCounts>;
  loading?: boolean;
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function ActivityCalendar({ month, onMonthChange, selected, onSelect, days, loading }: Props) {
  const todayKey = toKey(new Date());
  const year = month.getFullYear();
  const mon = month.getMonth();

  const cells = useMemo(() => {
    const lead = new Date(year, mon, 1).getDay();
    const total = new Date(year, mon + 1, 0).getDate();
    const out: (number | null)[] = [];
    for (let i = 0; i < lead; i++) out.push(null);
    for (let d = 1; d <= total; d++) out.push(d);
    return out;
  }, [year, mon]);

  const maxTotal = Math.max(1, ...Object.values(days).map((d) => d.total));
  // 4 shades, so a quiet day and a busy day are told apart at a glance
  const level = (n: number) => (n === 0 ? 0 : Math.min(4, Math.ceil((n / maxTotal) * 4)));

  const step = (delta: number) => onMonthChange(new Date(year, mon + delta, 1));
  const atCurrentMonth = toKey(new Date(year, mon, 1)) === toKey(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  return (
    <div className="ac-wrap">
      <div className="ac-nav">
        <button className="ac-nav-btn" onClick={() => step(-1)} aria-label="Previous month"><ChevronLeft size={16} /></button>
        <div className="ac-title">
          {month.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
          {loading && <span className="ac-loading"> · loading…</span>}
        </div>
        <button className="ac-nav-btn" onClick={() => step(1)} aria-label="Next month"><ChevronRight size={16} /></button>
      </div>

      <div className="ac-grid">
        {WEEKDAYS.map((w, i) => <div key={i} className="ac-head">{w}</div>)}
        {cells.map((day, i) => {
          if (day === null) return <div key={i} className="ac-cell ac-empty" />;
          const key = toKey(new Date(year, mon, day));
          const total = days[key]?.total ?? 0;
          const cls = [
            'ac-cell', `ac-l${level(total)}`,
            key === todayKey ? 'ac-today' : '',
            key === selected ? 'ac-selected' : '',
          ].join(' ');
          return (
            <button
              key={i}
              className={cls}
              onClick={() => onSelect(key === selected ? null : key)}
              title={total ? `${total} event${total === 1 ? '' : 's'}` : 'No activity'}
              aria-pressed={key === selected}
            >
              {day}
            </button>
          );
        })}
      </div>

      <div className="ac-foot">
        <div className="ac-scale">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((l) => <i key={l} className={`ac-swatch ac-l${l}`} />)}
          <span>More</span>
        </div>
        {!atCurrentMonth && (
          <button className="ac-today-btn" onClick={() => { const n = new Date(); onMonthChange(new Date(n.getFullYear(), n.getMonth(), 1)); onSelect(toKey(n)); }}>
            Jump to today
          </button>
        )}
      </div>
    </div>
  );
}

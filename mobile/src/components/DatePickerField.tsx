// mobile/src/components/DatePickerField.tsx
// A tappable field that opens a small calendar. Written in plain React Native, so it
// looks the same on Android and iOS and needs no extra package.
//
//   <DatePickerField label="Due date" value={due} onChange={setDue} minDate={start ?? undefined} />
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatPickedDate, isSameDay, startOfDay } from '../utils/dates';

const BROWN = '#3A2B1A';
const ORANGE = '#EA580C';
const GOLD = '#F5B921';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface Props {
  value: Date | null;
  onChange: (date: Date | null) => void;
  label?: string;
  placeholder?: string;
  minDate?: Date | null;     // days before this are greyed out
  clearable?: boolean;       // show a "Clear" button (default true)
  disabled?: boolean;
}

export default function DatePickerField({
  value, onChange, label, placeholder = 'Select a date', minDate, clearable = true, disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(0);
  const [viewMonth, setViewMonth] = useState(0);

  // Open on the selected month (or this month)
  useEffect(() => {
    if (open) {
      const base = value ?? minDate ?? new Date();
      setViewYear(base.getFullYear());
      setViewMonth(base.getMonth());
    }
  }, [open]);

  const today = new Date();
  const min = minDate ? startOfDay(minDate) : null;

  function shiftMonth(delta: number) {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  // 6 rows x 7 columns, leading blanks for the first weekday
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  function pick(day: number) {
    onChange(new Date(viewYear, viewMonth, day));
    setOpen(false);
  }

  return (
    <View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TouchableOpacity
        style={[styles.field, disabled && { opacity: 0.5 }]}
        onPress={() => setOpen(true)}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <Ionicons name="calendar-outline" size={18} color="#8A6A2A" />
        <Text style={[styles.fieldText, !value && styles.placeholder]} numberOfLines={1}>
          {value ? formatPickedDate(value) : placeholder}
        </Text>
        {value && clearable && !disabled ? (
          <Ionicons name="close-circle" size={18} color="#B8A671" onPress={() => onChange(null)} />
        ) : (
          <Ionicons name="chevron-down" size={16} color="#8A6A2A" />
        )}
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.card} onPress={() => {}}>
            <View style={styles.monthRow}>
              <TouchableOpacity onPress={() => shiftMonth(-1)} style={styles.navBtn}>
                <Ionicons name="chevron-back" size={20} color={BROWN} />
              </TouchableOpacity>
              <Text style={styles.monthText}>{MONTHS[viewMonth]} {viewYear}</Text>
              <TouchableOpacity onPress={() => shiftMonth(1)} style={styles.navBtn}>
                <Ionicons name="chevron-forward" size={20} color={BROWN} />
              </TouchableOpacity>
            </View>

            <View style={styles.weekRow}>
              {WEEKDAYS.map((w, i) => (
                <Text key={i} style={styles.weekday}>{w}</Text>
              ))}
            </View>

            <View style={styles.grid}>
              {cells.map((day, i) => {
                if (day === null) return <View key={i} style={styles.cell} />;
                const date = new Date(viewYear, viewMonth, day);
                const disabledDay = min !== null && date < min;
                const selected = value !== null && isSameDay(date, value);
                const isToday = isSameDay(date, today);
                return (
                  <TouchableOpacity
                    key={i}
                    style={styles.cell}
                    disabled={disabledDay}
                    onPress={() => pick(day)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.dayCircle, selected && styles.daySelected, !selected && isToday && styles.dayToday]}>
                      <Text style={[styles.dayText, selected && styles.dayTextSelected, disabledDay && styles.dayTextDisabled]}>
                        {day}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.footer}>
              <TouchableOpacity onPress={() => { onChange(startOfDay(today) < (min ?? new Date(0)) ? min! : today); setOpen(false); }}>
                <Text style={styles.footerLink}>Today</Text>
              </TouchableOpacity>
              {clearable && (
                <TouchableOpacity onPress={() => { onChange(null); setOpen(false); }}>
                  <Text style={[styles.footerLink, { color: '#8A6A2A' }]}>Clear</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Text style={[styles.footerLink, { color: '#8A6A2A' }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const CELL = `${100 / 7}%` as const;

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '700', color: BROWN, marginBottom: 6 },
  field: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#EADEC9', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 11,
  },
  fieldText: { flex: 1, fontSize: 14, color: BROWN, fontWeight: '600' },
  placeholder: { color: '#B8A671', fontWeight: '400' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 340, backgroundColor: '#fff', borderRadius: 20, padding: 16 },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  navBtn: { padding: 6 },
  monthText: { fontSize: 15, fontWeight: '800', color: BROWN },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekday: { width: CELL, textAlign: 'center', fontSize: 11, fontWeight: '700', color: '#8A6A2A' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: CELL, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  daySelected: { backgroundColor: ORANGE },
  dayToday: { borderWidth: 1.5, borderColor: GOLD },
  dayText: { fontSize: 13, color: BROWN, fontWeight: '600' },
  dayTextSelected: { color: '#fff', fontWeight: '800' },
  dayTextDisabled: { color: '#D6CDBA' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingHorizontal: 4 },
  footerLink: { fontSize: 13, fontWeight: '800', color: ORANGE },
});

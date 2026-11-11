// mobile/src/components/NotificationsScreen.tsx
// Notifications list (used by both student and teacher).
// New look: white cards with a round icon, grouped into TODAY and EARLIER,
// a red dot for unread, and short times like "10 min ago".
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import type { ComponentProps } from 'react';
import { T } from '../theme/theme';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  getAllNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../api/notifications';
import { Notification } from '../types/notifications';

const PAGE = T('#F5EDD8');
const INK = T('#3A2B1A');
const BROWN = T('#5C2C16');
const MUTED = T('#7A6455');
const LINE = T('#EADEC9');
const RED = '#D4442E';

type IconName = ComponentProps<typeof Ionicons>['name'];

// Round icon for each kind of notification
function iconFor(n: Notification): { name: IconName; bg: string; color: string } {
  if (n.notification_type === 'quest_assigned') {
    return { name: 'clipboard-outline', bg: '#FFF1C7', color: '#6B4A00' };
  }
  if (n.notification_type === 'new_submission') {
    return { name: 'document-text-outline', bg: '#CFE0F5', color: '#1F4D7A' };
  }
  if (/reward|badge|point/i.test(n.title)) {
    return { name: 'ribbon-outline', bg: '#FDE9D2', color: '#A34A0A' };
  }
  return { name: 'checkmark-circle-outline', bg: '#E3F3E9', color: '#166B3A' };
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function timeLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const todayStart = startOfDay(now);
  if (d.getTime() >= todayStart) return `${Math.floor(diffMin / 60)} hr ago`;
  if (d.getTime() >= todayStart - 24 * 60 * 60 * 1000) return 'Yesterday';
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await getAllNotifications();
      // Newest first — don't rely on backend ordering being guaranteed
      const sorted = [...data].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setNotifications(sorted);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to load notifications.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleTapNotification(item: Notification) {
    if (item.is_read) return;
    // Optimistic update — flip it locally first so tapping feels instant
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
    );
    try {
      await markNotificationRead(item.id);
    } catch (e) {
      // Revert on failure so the UI doesn't lie about server state
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, is_read: false } : n))
      );
    }
  }

  async function handleMarkAllRead() {
    const previous = notifications;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try {
      await markAllNotificationsRead();
    } catch (e) {
      setNotifications(previous);
    }
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Group into TODAY and EARLIER
  const sections = useMemo(() => {
    const todayStart = startOfDay(new Date());
    const today = notifications.filter((n) => new Date(n.created_at).getTime() >= todayStart);
    const earlier = notifications.filter((n) => new Date(n.created_at).getTime() < todayStart);
    const out: { title: string; data: Notification[] }[] = [];
    if (today.length) out.push({ title: 'TODAY', data: today });
    if (earlier.length) out.push({ title: 'EARLIER', data: earlier });
    return out;
  }, [notifications]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={22} color={BROWN} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}
        contentContainerStyle={sections.length === 0 ? styles.emptyWrap : { paddingBottom: 40 }}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="notifications-outline" size={40} color={MUTED} />
            <Text style={styles.emptyText}>No notifications yet.</Text>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionLabel}>{section.title}</Text>
        )}
        renderItem={({ item }) => {
          const icon = iconFor(item);
          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.8}
              onPress={() => handleTapNotification(item)}
            >
              <View style={[styles.iconCircle, { backgroundColor: icon.bg }]}>
                <Ionicons name={icon.name} size={20} color={icon.color} />
              </View>
              <View style={styles.cardText}>
                <Text style={[styles.title, !item.is_read && styles.titleUnread]}>{item.title}</Text>
                {item.message ? <Text style={styles.message}>{item.message}</Text> : null}
                <Text style={styles.time}>{timeLabel(item.created_at)}</Text>
              </View>
              {!item.is_read && <View style={styles.dot} />}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 56, paddingHorizontal: 16, backgroundColor: PAGE },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: PAGE },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  backButton: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: LINE, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { flex: 1, fontSize: 26, fontWeight: '800', color: INK },
  markAllText: { color: BROWN, fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' },
  error: { color: '#dc2626', marginBottom: 12 },

  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1, color: MUTED, marginTop: 8, marginBottom: 10 },
  // when there is nothing to show, fill the space and center the message
  emptyWrap: { flexGrow: 1, justifyContent: 'center', paddingBottom: 80 },
  empty: { alignItems: 'center', gap: 8 },
  emptyText: { color: MUTED, fontSize: 14 },

  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#FFFFFF', borderRadius: 18, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: LINE,
  },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  cardText: { flex: 1, gap: 2 },
  title: { fontSize: 14, fontWeight: '600', color: INK },
  titleUnread: { fontWeight: '800' },
  message: { fontSize: 13, lineHeight: 19, color: MUTED },
  time: { fontSize: 12, color: MUTED, marginTop: 2 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: RED, marginTop: 6 },
});
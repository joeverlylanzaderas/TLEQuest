import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  getAllNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../api/notifications';
import { Notification } from '../types/notifications';

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
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 90 }} />
        )}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={notifications}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={load} />}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListEmptyComponent={<Text style={styles.emptyText}>No notifications yet.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.notifCard, !item.is_read && styles.notifCardUnread]}
            onPress={() => handleTapNotification(item)}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.notifTitle, !item.is_read && styles.notifTitleUnread]}>
                {item.title}
              </Text>
              <Text style={styles.notifMessage}>{item.message}</Text>
              <Text style={styles.notifTime}>
                {new Date(item.created_at).toLocaleString()}
              </Text>
            </View>
            {!item.is_read && <View style={styles.unreadDot} />}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60, paddingHorizontal: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16,
  },
  backButton: { padding: 4, width: 30 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  markAllText: { color: '#ea580c', fontSize: 13, fontWeight: '600', width: 90, textAlign: 'right' },
  error: { color: '#dc2626', marginBottom: 12 },
  emptyText: { color: '#999', fontStyle: 'italic', textAlign: 'center', marginTop: 40 },

  notifCard: {
    flexDirection: 'row', backgroundColor: '#fef3e2', borderRadius: 12,
    padding: 14, marginBottom: 10, alignItems: 'flex-start',
  },
  notifCardUnread: { backgroundColor: '#fde68a' },
  notifTitle: { fontSize: 14, fontWeight: '600', color: '#7c2d12', marginBottom: 2 },
  notifTitleUnread: { fontWeight: 'bold' },
  notifMessage: { fontSize: 13, color: '#555', marginBottom: 4 },
  notifTime: { fontSize: 11, color: '#999' },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#ea580c', marginTop: 4, marginLeft: 8,
  },
});
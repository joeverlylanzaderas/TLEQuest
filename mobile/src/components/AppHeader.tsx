// mobile/src/components/AppHeader.tsx
// The gold "Welcome back" header shared by every main student and teacher tab.
// It loads what it needs itself (profile, unread count, class name), so a screen
// only has to render <AppHeader role="student" /> or <AppHeader role="teacher" />.
import React, { useCallback, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getMyProfile } from '../api/accounts';
import { getMyClasses } from '../api/classrooms';
import { getUnreadNotifications } from '../api/notifications';
import { FullUser } from '../types/accounts';

const GOLD = '#F5B921';
const DARK = '#3A2B1A';
const RED = '#DC2626';

// Profile + class name rarely change: reuse them for a minute across tabs so
// switching tabs doesn't refetch. The unread count is always refreshed.
let cache: { at: number; role: string; profile: FullUser | null; className: string } | null = null;
const TTL_MS = 60_000;

interface Props {
  role: 'student' | 'teacher';
  /** Overrides the default subtitle (class name for students, "Teacher's Portal" for teachers). */
  subtitle?: string;
  /** Extra content shown inside the gold header, under the welcome row. */
  children?: React.ReactNode;
}

export default function AppHeader({ role, subtitle, children }: Props) {
  const router = useRouter();
  const [profile, setProfile] = useState<FullUser | null>(cache?.role === role ? cache.profile : null);
  const [className, setClassName] = useState(cache?.role === role ? cache.className : '');
  const [unread, setUnread] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          const fresh = cache && cache.role === role && Date.now() - cache.at < TTL_MS;
          const [p, c, u] = await Promise.all([
            fresh ? Promise.resolve(cache!.profile) : getMyProfile(),
            fresh || role !== 'student' ? Promise.resolve(null) : getMyClasses(),
            getUnreadNotifications(),
          ]);
          if (!active) return;
          const name = role === 'student'
            ? (c && c.length > 0 ? c[0].class_name : fresh ? cache!.className : 'No class joined')
            : '';
          if (!fresh) cache = { at: Date.now(), role, profile: p, className: name };
          setProfile(p);
          setClassName(name);
          setUnread(u.length);
        } catch {
          // The header is decorative — never block a screen because it failed.
        }
      })();
      return () => { active = false; };
    }, [role])
  );

  const displayName = profile?.profile.first_name || profile?.username || '';
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });
  const sub = subtitle ?? (role === 'teacher' ? "Teacher's Portal" : className || '');

  return (
    <View style={styles.header}>
      <View style={[styles.row, children ? { marginBottom: 14 } : null]}>
        {profile?.profile.profile_picture ? (
          <Image source={{ uri: profile.profile.profile_picture }} style={styles.avatarImg} />
        ) : (
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={22} color={DARK} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.welcomeSmall}>Welcome back,</Text>
          <Text style={styles.welcomeName} numberOfLines={1}>{displayName ? `${displayName}!` : ' '}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.dateText}>{today}</Text>
          <Text style={styles.subText} numberOfLines={1}>{sub}</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push((role === 'teacher' ? '/(teacher)/notifications' : '/(student)/notifications') as any)}
          style={{ marginLeft: 10 }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="notifications" size={22} color={DARK} />
          {unread > 0 && <View style={styles.bellDot} />}
        </TouchableOpacity>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: GOLD, paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
    borderWidth: 1.5, borderTopWidth: 0, borderColor: DARK,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFE08A', borderWidth: 1.5, borderColor: DARK, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarImg: { width: 44, height: 44, borderRadius: 22, marginRight: 12, borderWidth: 1.5, borderColor: DARK },
  welcomeSmall: { fontSize: 12, color: DARK },
  welcomeName: { fontSize: 18, fontWeight: '900', color: DARK },
  dateText: { fontSize: 11, color: DARK, fontWeight: '600' },
  subText: { fontSize: 11, color: DARK, fontWeight: '800', marginTop: 2, maxWidth: 140 },
  bellDot: { position: 'absolute', top: -2, right: -2, width: 10, height: 10, borderRadius: 5, backgroundColor: RED, borderWidth: 1, borderColor: DARK },
});

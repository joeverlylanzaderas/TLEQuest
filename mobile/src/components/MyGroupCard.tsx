// mobile/src/components/MyGroupCard.tsx
// Shows the student whether they are in a group yet, and whether they are its leader.
// Pass the groups of the class being viewed (Home already loads them).
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { Group } from '../types/classrooms';

const GOLD = '#F5B921';
const BROWN = '#5C2C16';
const GREEN = '#22C55E';
const MUTED = '#8A6A2A';

interface Props {
  groups: Group[];
}

export default function MyGroupCard({ groups }: Props) {
  const { user } = useAuth();
  if (!user) return null;

  const group = groups.find((g) => g.members.some((m) => m.student.id === user.id));

  // ---- Not in a group yet ----
  if (!group) {
    return (
      <View style={[styles.card, styles.cardEmpty]}>
        <Ionicons name="people-outline" size={22} color={MUTED} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.title}>No group yet</Text>
          <Text style={styles.subtitle}>Your teacher will put you in a group. It will show up here.</Text>
        </View>
      </View>
    );
  }

  const isLeader = group.leader?.id === user.id;
  const me = group.members.find((m) => m.student.id === user.id);
  const groupLabel = group.group_name ? `Group ${group.group_number} · ${group.group_name}` : `Group ${group.group_number}`;

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.iconWrap}>
          <Ionicons name="people" size={20} color={BROWN} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.title}>{groupLabel}</Text>
          <Text style={styles.subtitle}>
            {isLeader
              ? 'You are the group leader. You submit the final output.'
              : group.leader
              ? `Your leader: ${group.leader.first_name || group.leader.username}`
              : 'No leader has been picked yet.'}
          </Text>
          {me?.member_role ? <Text style={styles.role}>Your role: {me.member_role}</Text> : null}
        </View>
        {isLeader && (
          <View style={styles.leaderBadge}>
            <Ionicons name="star" size={12} color="#fff" />
            <Text style={styles.leaderBadgeText}>LEADER</Text>
          </View>
        )}
      </View>

      <View style={styles.membersRow}>
        {group.members.map((m) => {
          const name = m.student.first_name || m.student.username;
          const leader = group.leader?.id === m.student.id;
          const isMe = m.student.id === user.id;
          return (
            <View key={m.id} style={styles.member}>
              {m.student.profile_picture ? (
                <Image source={{ uri: m.student.profile_picture }} style={[styles.avatar, leader && styles.avatarLeader]} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder, leader && styles.avatarLeader]}>
                  <Text style={styles.avatarInitial}>{name.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <Text style={styles.memberName} numberOfLines={1}>{isMe ? 'You' : name}</Text>
              {leader && <Text style={styles.memberLeader}>Leader</Text>}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 16 },
  cardEmpty: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#F3D98B', borderStyle: 'dashed' },
  topRow: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF1C2', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '800', color: BROWN },
  subtitle: { fontSize: 12, color: MUTED, marginTop: 2, lineHeight: 17 },
  role: { fontSize: 12, color: BROWN, fontWeight: '700', marginTop: 4 },
  leaderBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: GREEN, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  leaderBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  membersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 14 },
  member: { alignItems: 'center', width: 56 },
  avatar: { width: 40, height: 40, borderRadius: 20, marginBottom: 4 },
  avatarPlaceholder: { backgroundColor: '#f87171', alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  avatarLeader: { borderWidth: 2, borderColor: GOLD },
  memberName: { fontSize: 10, color: BROWN, fontWeight: '600', textAlign: 'center' },
  memberLeader: { fontSize: 9, color: GREEN, fontWeight: '800' },
});
//mobile/src/components/DashboardHeader.tsx
import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  firstName?: string;
  username: string;
  profilePicture: string | null | undefined;
  subtitle: string; // "TLE1 - B" for student, "Teacher's Portal" for teacher
  unreadCount: number;
  onBellPress: () => void;
}

export default function DashboardHeader({
  firstName,
  username,
  profilePicture,
  subtitle,
  unreadCount,
  onBellPress,
}: Props) {
  const displayName = firstName || username;
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <View style={styles.headerRow}>
      {profilePicture ? (
        <Image source={{ uri: profilePicture }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarInitial}>{displayName.charAt(0).toUpperCase()}</Text>
        </View>
      )}

      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.welcomeLabel}>Welcome back,</Text>
        <Text style={styles.welcomeName}>{displayName}!</Text>
      </View>

      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.dateText}>{today}</Text>
        <Text style={styles.subtitleText}>{subtitle}</Text>
      </View>

      <TouchableOpacity style={styles.bellButton} onPress={onBellPress}>
        <Ionicons name="notifications-outline" size={22} color="#333" />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarPlaceholder: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#fbbf24',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarInitial: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  welcomeLabel: { fontSize: 12, color: '#666' },
  welcomeName: { fontSize: 17, fontWeight: 'bold' },
  dateText: { fontSize: 11, color: '#666' },
  subtitleText: { fontSize: 11, color: '#666', fontWeight: '600' },
  bellButton: { marginLeft: 12, padding: 4 },
  badge: {
    position: 'absolute', top: -2, right: -2, backgroundColor: '#dc2626',
    borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center',
    alignItems: 'center', paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
});
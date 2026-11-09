// mobile/src/components/ConfirmModal.tsx
// A themed confirmation popup (replaces the plain Android Alert).
import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HEADER_BG, HEADER_TEXT, activeTheme } from '../theme/theme';

interface Props {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onConfirm: () => void;
  onCancel: () => void;
}

const SCHOOL = activeTheme === 'school';
const PAGE = SCHOOL ? '#FAF6E8' : '#F5EDD8';
const BODY_TEXT = SCHOOL ? '#18303D' : '#5C2C16';
const ACCENT = SCHOOL ? '#F2B84B' : '#EA580C';
const CONFIRM_BG = SCHOOL ? '#1E4D8F' : '#EA580C';

export default function ConfirmModal({
  visible,
  title,
  message,
  confirmText = 'Sign Out',
  cancelText = 'Cancel',
  icon = 'log-out-outline',
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.top}>
            <View style={styles.iconRing}>
              <Ionicons name={icon} size={30} color={SCHOOL ? '#1E4D8F' : '#5C2C16'} />
            </View>
          </View>
          <View style={styles.body}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>
            <View style={styles.row}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.85}>
                <Text style={styles.cancelText}>{cancelText}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm} activeOpacity={0.85}>
                <Text style={styles.confirmText}>{confirmText}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 360, backgroundColor: PAGE, borderRadius: 24, overflow: 'hidden', borderWidth: 2, borderColor: ACCENT },
  top: { backgroundColor: HEADER_BG, alignItems: 'center', justifyContent: 'center', paddingTop: 26, paddingBottom: 34 },
  iconRing: { width: 64, height: 64, borderRadius: 32, backgroundColor: SCHOOL ? '#FFFFFF' : '#FFE08A', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: HEADER_TEXT },
  body: { padding: 20, alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '900', color: BODY_TEXT, marginBottom: 6 },
  message: { fontSize: 14, color: BODY_TEXT, opacity: 0.75, textAlign: 'center', marginBottom: 20 },
  row: { flexDirection: 'row', gap: 12, width: '100%' },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 999, borderWidth: 2, borderColor: BODY_TEXT, alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '800', color: BODY_TEXT },
  confirmBtn: { flex: 1, paddingVertical: 13, borderRadius: 999, backgroundColor: CONFIRM_BG, alignItems: 'center' },
  confirmText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
});
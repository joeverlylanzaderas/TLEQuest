// mobile/app/(student)/join-class.tsx
// "Join a class": the student types the invite code their teacher shared.
import React, { useEffect, useState } from 'react';
import {
  Animated, View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { T } from '../../src/theme/theme';
import { useAuth } from '../../src/context/AuthContext';
import { useToast } from '../../src/components/Toast';
import KeyboardSafe from '../../src/components/KeyboardSafe';
import { FadeIn, PressableScale, useShake } from '../../src/components/Motion';
import { joinClass } from '../../src/api/classrooms';
import { refreshClasses, selectClass } from '../../src/utils/selectedClass';
import { TOP_GAP } from '../../src/theme/layout';

const PAGE = T('#F5EDD8');
const BROWN = T('#5C2C16');
const GOLD = T('#F5B921');
const MUTED = T('#8A6A2A');
const LINK = T('#EA580C');
const SOFT = T('#FFF1C7');

export default function JoinClassScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  const [code, setCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');
  const { shakeStyle, shake } = useShake();
  useEffect(() => { if (error) shake(); }, [error]);

  async function handleJoin() {
    const value = code.trim().toUpperCase();
    if (!value) {
      setError('Please enter the invite code.');
      return;
    }
    setError('');
    setIsJoining(true);
    try {
      const enrollment = await joinClass(value);
      if (user) {
        await refreshClasses(user.id);
        if (enrollment?.class_obj) await selectClass(enrollment.class_obj);
      }
      toast.success('You joined the class.');
      router.replace('/(student)/class-group' as any);
    } catch (e: any) {
      setError(
        e?.response?.data?.detail ||
        e?.response?.data?.non_field_errors?.[0] ||
        e?.response?.data?.invite_code?.[0] ||
        'Could not join the class. Check the code and try again.'
      );
    } finally {
      setIsJoining(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <KeyboardSafe style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} accessibilityLabel="Back">
            <Ionicons name="arrow-back" size={22} color={BROWN} />
          </TouchableOpacity>

          <FadeIn style={{ gap: 8 }}>
            <Text style={styles.title}>Join a class</Text>
            <Text style={styles.sub}>Ask your teacher for the invite code, then type it below.</Text>
          </FadeIn>

          <FadeIn delay={120}>
          <Animated.View style={[styles.card, shakeStyle]}>
            <View style={styles.iconWrap}>
              <Ionicons name="people" size={30} color={T('#6B4A00')} />
            </View>
            <Text style={styles.label}>Invite code</Text>
            <TextInput
              style={[styles.input, error ? styles.inputError : null]}
              value={code}
              onChangeText={(t) => { setCode(t.toUpperCase()); if (error) setError(''); }}
              placeholder="ABC123"
              placeholderTextColor="#C9B994"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={10}
              editable={!isJoining}
              onSubmitEditing={handleJoin}
              returnKeyType="go"
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <PressableScale containerStyle={{ alignSelf: 'stretch' }} style={[styles.joinBtn, isJoining && { opacity: 0.7 }]} onPress={handleJoin} disabled={isJoining}>
              {isJoining ? <ActivityIndicator color="#fff" /> : <Text style={styles.joinBtnText}>Join class</Text>}
            </PressableScale>
          </Animated.View>
          </FadeIn>

          <TouchableOpacity onPress={() => router.back()} disabled={isJoining} style={{ alignSelf: 'center', padding: 8 }}>
            <Text style={styles.cancel}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardSafe>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PAGE },
  content: { padding: 20, paddingTop: TOP_GAP, gap: 24, paddingBottom: 60 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 30, fontWeight: '800', color: BROWN },
  sub: { fontSize: 15, lineHeight: 22, color: MUTED },
  card: { backgroundColor: '#fff', borderRadius: 24, paddingVertical: 24, paddingHorizontal: 20, alignItems: 'center', gap: 14 },
  iconWrap: { width: 64, height: 64, borderRadius: 20, backgroundColor: SOFT, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 13, fontWeight: '700', color: BROWN },
  input: {
    width: '100%', height: 60, borderRadius: 14, borderWidth: 2, borderColor: GOLD, backgroundColor: PAGE,
    textAlign: 'center', fontSize: 26, fontWeight: '800', letterSpacing: 6, color: T('#3A2B1A'),
  },
  inputError: { borderColor: '#B3261E' },
  error: { color: '#B3261E', fontSize: 13, textAlign: 'center' },
  joinBtn: { width: '100%', height: 52, borderRadius: 14, backgroundColor: BROWN, alignItems: 'center', justifyContent: 'center' },
  joinBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  cancel: { fontSize: 14, fontWeight: '800', color: LINK },
});
// mobile/src/components/AuthUI.tsx
// Building blocks for the signed-out screens (forgot password and friends), in the same
// look as the login and change-password screens: cream background, gold accents,
// pill-shaped inputs and a brown button.
import React from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator,
  StyleProp, ViewStyle, TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import KeyboardSafe from './KeyboardSafe';

export const AUTH = {
  CREAM: '#F2E4C4',
  FIELD_BG: '#F7EBD0',
  GOLD: '#F9C544',
  BROWN: '#3A2B1A',
  BUTTON: '#5C3A2E',
  MUTED: '#8A6A2A',
  GREEN: '#2FA85B',
  BORDER: '#EADEC9',
  RED: '#B3261E',
};

type IconName = React.ComponentProps<typeof Ionicons>['name'];

// ---------------------------------------------------------------- screen frame
export function AuthScreen({
  children, onBack, icon, iconColor, title, subtitle, fixedHero,
}: {
  children: React.ReactNode;
  onBack?: () => void;
  icon?: IconName;
  iconColor?: string;
  title: string;
  subtitle?: string;
  /** keep the back button + hero pinned at the top; only the content below scrolls */
  fixedHero?: boolean;
}) {
  const header = (
    <>
      {onBack ? (
        <TouchableOpacity style={styles.backButton} onPress={onBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={22} color={AUTH.BROWN} />
        </TouchableOpacity>
      ) : (
        <View style={{ height: 38 }} />
      )}
      <View style={[styles.hero, fixedHero && styles.heroCompact]}>
        {icon ? (
          <View style={[styles.heroCircle, fixedHero && styles.heroCircleCompact, iconColor ? { backgroundColor: iconColor } : null]}>
            <Ionicons name={icon} size={fixedHero ? 26 : 34} color={iconColor ? '#fff' : AUTH.BROWN} />
          </View>
        ) : null}
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </>
  );

  if (fixedHero) {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <KeyboardSafe>
          <View style={styles.fixedHeader}>
            <View style={styles.column}>{header}</View>
          </View>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[styles.scrollContent, { paddingTop: 4 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.column}>{children}</View>
          </ScrollView>
        </KeyboardSafe>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <KeyboardSafe>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.column}>
            {header}

            {children}
          </View>
        </ScrollView>
      </KeyboardSafe>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------- step indicator
export function StepIndicator({ steps, current }: { steps: string[]; current: number }) {
  return (
    <View style={styles.stepsRow}>
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <React.Fragment key={label}>
            <View style={styles.stepItem}>
              <View style={[styles.stepDot, done && styles.stepDotDone, active && styles.stepDotActive]}>
                {done ? (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                ) : (
                  <Text style={[styles.stepDotText, active && { color: AUTH.BROWN }]}>{i + 1}</Text>
                )}
              </View>
              <Text style={[styles.stepLabel, (active || done) && styles.stepLabelOn]} numberOfLines={1}>{label}</Text>
            </View>
            {i < steps.length - 1 && <View style={[styles.stepLine, done && styles.stepLineDone]} />}
          </React.Fragment>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------- card
export function AuthCard({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

// ---------------------------------------------------------------- input
interface AuthInputProps extends Omit<TextInputProps, 'style'> {
  label: string;
  icon: IconName;
  invalid?: boolean;
  /** show an eye button that toggles secureTextEntry */
  passwordToggle?: boolean;
  inputRef?: React.Ref<TextInput>;
}

export function AuthInput({ label, icon, invalid, passwordToggle, inputRef, secureTextEntry, ...rest }: AuthInputProps) {
  const [hidden, setHidden] = React.useState(true);
  const [focused, setFocused] = React.useState(false);
  const secure = passwordToggle ? hidden : secureTextEntry;
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, focused && styles.inputRowFocused, invalid && styles.inputRowInvalid]}>
        <Ionicons name={icon} size={18} color={AUTH.BROWN} style={{ marginRight: 10 }} />
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholderTextColor="#9C8A6E"
          secureTextEntry={secure}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...rest}
        />
        {passwordToggle && (
          <TouchableOpacity onPress={() => setHidden((h) => !h)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name={hidden ? 'eye' : 'eye-off'} size={20} color={AUTH.BROWN} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------- buttons
export function PrimaryButton({
  label, onPress, loading, disabled, icon,
}: { label: string; onPress: () => void; loading?: boolean; disabled?: boolean; icon?: IconName }) {
  const off = disabled || loading;
  return (
    <TouchableOpacity
      style={[styles.button, off && styles.buttonOff]}
      onPress={onPress}
      disabled={off}
      activeOpacity={0.9}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <View style={styles.buttonInner}>
          <Text style={styles.buttonText}>{label}</Text>
          {icon ? <Ionicons name={icon} size={18} color="#fff" /> : null}
        </View>
      )}
    </TouchableOpacity>
  );
}

export function TextLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.linkWrap} activeOpacity={0.7}>
      <Text style={styles.linkText}>{label}</Text>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------- banner
export function Banner({ kind, text }: { kind: 'error' | 'info' | 'success'; text: string }) {
  const palette = {
    error: { bg: '#FDE4E1', fg: AUTH.RED, icon: 'alert-circle' as IconName },
    info: { bg: '#FCF3D9', fg: AUTH.BROWN, icon: 'information-circle' as IconName },
    success: { bg: '#E3F5EA', fg: '#1F7A3F', icon: 'checkmark-circle' as IconName },
  }[kind];
  return (
    <View style={[styles.banner, { backgroundColor: palette.bg }]}>
      <Ionicons name={palette.icon} size={18} color={palette.fg} />
      <Text style={[styles.bannerText, { color: palette.fg }]}>{text}</Text>
    </View>
  );
}

// ---------------------------------------------------------------- requirement row
export function Requirement({ met, text }: { met: boolean; text: string }) {
  return (
    <View style={styles.reqRow}>
      <Ionicons name={met ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={met ? AUTH.GREEN : '#B8A671'} />
      <Text style={[styles.reqText, met && { color: '#1F7A3F' }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AUTH.CREAM },
  scrollContent: { flexGrow: 1, padding: 20, paddingBottom: 32 },
  column: { width: '100%', maxWidth: 520, alignSelf: 'center' },

  backButton: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: AUTH.GOLD,
    alignItems: 'center', justifyContent: 'center',
  },

  fixedHeader: { paddingHorizontal: 20, paddingTop: 24 },
  hero: { alignItems: 'center', marginTop: 8, marginBottom: 20 },
  heroCompact: { marginTop: 0, marginBottom: 14 },
  heroCircleCompact: { width: 56, height: 56, borderRadius: 28, marginBottom: 8 },
  heroCircle: {
    width: 76, height: 76, borderRadius: 38, backgroundColor: AUTH.GOLD,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    borderWidth: 3, borderColor: AUTH.BROWN,
  },
  title: { fontSize: 24, fontWeight: '800', color: AUTH.BROWN, textAlign: 'center' },
  subtitle: { fontSize: 13, color: AUTH.MUTED, textAlign: 'center', marginTop: 6, lineHeight: 19, paddingHorizontal: 8 },

  stepsRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 18, paddingHorizontal: 4 },
  stepItem: { alignItems: 'center', width: 70 },
  stepDot: {
    width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: '#D8C9A3',
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: AUTH.GOLD, borderColor: AUTH.BROWN },
  stepDotDone: { backgroundColor: AUTH.GREEN, borderColor: AUTH.GREEN },
  stepDotText: { fontSize: 12, fontWeight: '800', color: '#B8A671' },
  stepLabel: { fontSize: 10, fontWeight: '600', color: '#B8A671', marginTop: 5, textAlign: 'center' },
  stepLabelOn: { color: AUTH.BROWN },
  stepLine: { flex: 1, height: 2, backgroundColor: '#D8C9A3', marginTop: 13 },
  stepLineDone: { backgroundColor: AUTH.GREEN },

  card: {
    backgroundColor: '#fff', borderRadius: 22, borderWidth: 1, borderColor: AUTH.BORDER,
    padding: 18, marginBottom: 14,
  },

  label: { fontSize: 11, fontWeight: '700', color: AUTH.BROWN, letterSpacing: 0.5, marginBottom: 6, marginTop: 4 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: AUTH.FIELD_BG, borderRadius: 30,
    paddingHorizontal: 16, height: 50, borderWidth: 2, borderColor: 'transparent', marginBottom: 10,
  },
  inputRowFocused: { borderColor: AUTH.BUTTON },
  inputRowInvalid: { borderColor: AUTH.RED },
  input: { flex: 1, fontSize: 15, color: AUTH.BROWN, fontWeight: '600' },

  button: {
    backgroundColor: AUTH.BUTTON, borderRadius: 30, height: 54, alignItems: 'center',
    justifyContent: 'center', marginTop: 6,
  },
  buttonOff: { opacity: 0.55 },
  buttonInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  linkWrap: { alignSelf: 'center', paddingVertical: 12 },
  linkText: { color: AUTH.MUTED, fontSize: 14, fontWeight: '700' },

  banner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 12, padding: 12, marginBottom: 12 },
  bannerText: { flex: 1, fontSize: 13, lineHeight: 18 },

  reqRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  reqText: { fontSize: 12, color: AUTH.MUTED, fontWeight: '600' },
});

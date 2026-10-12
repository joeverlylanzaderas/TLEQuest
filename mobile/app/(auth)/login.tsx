// mobile/app/(auth)/login.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';

// ============================================================================
// ASSETS
// ============================================================================
const LOGO = require('../../assets/images/tlequest-logo3.png');
const TABLE_ART = require('../../assets/images/login-table-art.png');

const logoSrc = Image.resolveAssetSource(LOGO);
const artSrc = Image.resolveAssetSource(TABLE_ART);
const LOGO_RATIO = logoSrc?.width && logoSrc?.height ? logoSrc.width / logoSrc.height : 1.26;
const ART_RATIO = artSrc?.width && artSrc?.height ? artSrc.width / artSrc.height : 1.6;

// ============================================================================
// COLORS
// ============================================================================
const BG = '#faf6e8';           // off-white screen background
const INK = '#14161A';          // labels and body text
const FIELD_BG = '#C8BFBD';     // grey-mauve pill
const FIELD_PLACEHOLDER = '#7A706E';
const FOCUS_NAVY = '#1A1160';   // focused field border
const BUTTON_BG = '#18303d';    // dark slate button
const BUTTON_TEXT = '#F2B84B';  // yellow from the logo
const LINK_ORANGE = '#F59A4B';
const ERROR_RED = '#B3261E';

const MAX_CONTENT_WIDTH = 480;
const MAX_FONT_SCALE = 1.3;

export default function LoginScreen() {
  const { signIn } = useAuth();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const passwordRef = useRef<TextInput>(null);
  const isMounted = useRef(true);

  // ---- Responsive sizes ----
  const contentWidth = Math.min(width, MAX_CONTENT_WIDTH);

  // Enlarged logo sizing logic
  const logoWidth = Math.round(
    Math.max(180, Math.min(contentWidth * 0.82, height * 0.28 * LOGO_RATIO, 360))
  );
  const logoHeight = Math.round(logoWidth / LOGO_RATIO);

  // --- ZOOMED ART ADJUSTMENTS ---
  // Increased height from 0.32 to 0.45 to zoom/enlarge the graphic
  const artHeight = Math.round(Math.min(width / ART_RATIO, height * 0.45));
  const showArt = height >= 560;
  const artVisible = showArt && !keyboardVisible;

  // ---- Animations ----
  const logoAnim = useRef(new Animated.Value(0)).current;
  const fieldsAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;
  const artAnim = useRef(new Animated.Value(0)).current;
  const userFocusAnim = useRef(new Animated.Value(0)).current;
  const passFocusAnim = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const errorShake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    isMounted.current = true;
    const intro = Animated.parallel([
      Animated.stagger(140, [
        Animated.timing(logoAnim, { toValue: 1, duration: 550, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(fieldsAnim, { toValue: 1, duration: 550, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(buttonAnim, { toValue: 1, duration: 550, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.timing(artAnim, { toValue: 1, duration: 900, delay: 200, useNativeDriver: true }),
    ]);
    intro.start();
    return () => {
      isMounted.current = false;
      intro.stop();
    };
  }, [logoAnim, fieldsAnim, buttonAnim, artAnim]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => {
      setKeyboardVisible(true);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const animateFocus = (anim: Animated.Value, toValue: number) => {
    Animated.timing(anim, {
      toValue,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  };

  const handlePressIn = () =>
    Animated.spring(buttonScale, { toValue: 0.96, useNativeDriver: true }).start();

  const handlePressOut = () =>
    Animated.spring(buttonScale, { toValue: 1, friction: 3, tension: 80, useNativeDriver: true }).start();

  const triggerErrorShake = () => {
    errorShake.setValue(0);
    Animated.sequence([
      Animated.timing(errorShake, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(errorShake, { toValue: -1, duration: 60, useNativeDriver: true }),
      Animated.timing(errorShake, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(errorShake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleLogin = useCallback(async () => {
    if (isSubmitting) return;

    const cleanUsername = username.trim();
    if (!cleanUsername || !password) {
      setError('Please enter both username and password.');
      triggerErrorShake();
      return;
    }

    Keyboard.dismiss();
    setError('');
    setIsSubmitting(true);
    try {
      await signIn({ username: cleanUsername, password });
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      let message = 'Login failed. Check your credentials.';
      if (typeof detail === 'string' && detail) {
        message = detail;
      } else if (!e?.response) {
        message = 'Cannot reach the server. Check your internet connection and try again.';
      }
      if (isMounted.current) {
        setError(message);
        triggerErrorShake();
      }
    } finally {
      if (isMounted.current) setIsSubmitting(false);
    }
  }, [username, password, isSubmitting, signIn]);

  const logoStyle = {
    opacity: logoAnim,
    transform: [
      { translateY: logoAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
      { scale: logoAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
    ],
  };
  const fieldsStyle = {
    opacity: fieldsAnim,
    transform: [{ translateY: fieldsAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
  };
  const buttonAreaStyle = {
    opacity: buttonAnim,
    transform: [{ translateY: buttonAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
  };

  const userBorderColor = userFocusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(26,17,96,0)', 'rgba(26,17,96,1)'],
  });
  const passBorderColor = passFocusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(26,17,96,0)', 'rgba(26,17,96,1)'],
  });

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />

      {/* --- ZOOMED ART ADJUSTMENTS --- */}
      {artVisible ? (
        <Animated.View pointerEvents="none" style={[styles.artWrap, { opacity: artAnim }]}>
          <Image
            source={TABLE_ART}
            style={{ width, height: artHeight }}
            // Changed to cover to maintain aspect ratio while zooming/filling width
            resizeMode="cover"
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </Animated.View>
      ) : null}

      <KeyboardAvoidingView
        style={styles.flexFill}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            styles.scrollContent,
            {
              // Adjusted padding bottom to account for zoomed art
              paddingBottom: Math.max(insets.bottom, 16) + (artVisible ? artHeight * 0.4 : 16),
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
        >
          <View style={[styles.column, { maxWidth: MAX_CONTENT_WIDTH }]}>
            {/* --- LOGO ADJUSTMENTS --- */}
            {/* Logo is lower due to increased marginTop below and higher paddingTop in scrollContent */}
            <Animated.View style={[styles.logoWrap, logoStyle]}>
              <Image
                source={LOGO}
                style={{ width: logoWidth, height: logoHeight }}
                resizeMode="contain"
                accessible
                accessibilityLabel="TLEQuest logo"
              />
            </Animated.View>

            {/* FIELDS */}
            <Animated.View style={[styles.fieldsArea, fieldsStyle]}>
              <Text style={styles.label} maxFontSizeMultiplier={MAX_FONT_SCALE}>Username</Text>
              <Animated.View style={[styles.inputRow, { borderColor: userBorderColor }]}>
                <Ionicons name="person" size={20} color={INK} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your username"
                  placeholderTextColor={FIELD_PLACEHOLDER}
                  selectionColor={FOCUS_NAVY}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="username"
                  textContentType="username"
                  importantForAutofill="yes"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  editable={!isSubmitting}
                  value={username}
                  onChangeText={setUsername}
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  onFocus={() => animateFocus(userFocusAnim, 1)}
                  onBlur={() => animateFocus(userFocusAnim, 0)}
                  maxFontSizeMultiplier={MAX_FONT_SCALE}
                  accessibilityLabel="Username"
                />
              </Animated.View>

              <Text style={[styles.label, styles.labelSpaced]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                Password
              </Text>
              <Animated.View style={[styles.inputRow, { borderColor: passBorderColor }]}>
                <Ionicons name="key" size={20} color={INK} style={styles.inputIcon} />
                <TextInput
                  ref={passwordRef}
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor={FIELD_PLACEHOLDER}
                  selectionColor={FOCUS_NAVY}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="password"
                  textContentType="password"
                  importantForAutofill="yes"
                  returnKeyType="done"
                  editable={!isSubmitting}
                  value={password}
                  onChangeText={setPassword}
                  onSubmitEditing={handleLogin}
                  onFocus={() => animateFocus(passFocusAnim, 1)}
                  onBlur={() => animateFocus(passFocusAnim, 0)}
                  maxFontSizeMultiplier={MAX_FONT_SCALE}
                  accessibilityLabel="Password"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((s) => !s)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color={INK} />
                </TouchableOpacity>
              </Animated.View>

              {error ? (
                <Animated.Text
                  accessibilityLiveRegion="polite"
                  maxFontSizeMultiplier={MAX_FONT_SCALE}
                  style={[
                    styles.error,
                    {
                      transform: [
                        {
                          translateX: errorShake.interpolate({
                            inputRange: [-1, 1],
                            outputRange: [-8, 8],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  {error}
                </Animated.Text>
              ) : null}

              <TouchableOpacity
                onPress={() => router.push('/(auth)/forgot-password')}
                style={styles.forgotWrapper}
                activeOpacity={0.7}
                disabled={isSubmitting}
                accessibilityRole="link"
                accessibilityLabel="Forgot password? Tap here"
              >
                <Text style={styles.forgotText} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                  Forgot Password? <Text style={styles.forgotLink}>Click Here</Text>
                </Text>
              </TouchableOpacity>
            </Animated.View>

            <View style={styles.spacer} />

            {/* BUTTON */}
            <Animated.View style={[styles.actions, buttonAreaStyle]}>
              <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                <TouchableOpacity
                  style={[styles.button, isSubmitting && styles.buttonDisabled]}
                  onPress={handleLogin}
                  onPressIn={handlePressIn}
                  onPressOut={handlePressOut}
                  disabled={isSubmitting}
                  activeOpacity={0.9}
                  accessibilityRole="button"
                  accessibilityLabel="Login"
                  accessibilityState={{ disabled: isSubmitting, busy: isSubmitting }}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={BUTTON_TEXT} />
                  ) : (
                    <Text style={styles.buttonText} maxFontSizeMultiplier={MAX_FONT_SCALE}>Login</Text>
                  )}
                </TouchableOpacity>
              </Animated.View>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BG,
  },
  flexFill: {
    flex: 1,
  },
  artWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    // --- LOGO ADJUSTMENTS ---
    // Increased top padding to help push content down
    paddingTop: 40,
  },
  column: {
    width: '100%',
    flexGrow: 1,
    paddingHorizontal: 28,
  },
  logoWrap: {
    alignItems: 'center',
    // --- LOGO ADJUSTMENTS ---
    marginTop: 16,
    marginBottom: 30,
  },
  fieldsArea: {
    width: '100%',
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: INK,
    marginBottom: 8,
  },
  labelSpaced: {
    marginTop: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: FIELD_BG,
    borderRadius: 40,
    borderWidth: 2,
    paddingHorizontal: 20,
    minHeight: 52,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: INK,
    fontWeight: '600',
    paddingVertical: Platform.OS === 'android' ? 8 : 12,
    textAlignVertical: 'center',
  },
  forgotWrapper: {
    alignSelf: 'stretch',
    marginTop: 16,
    minHeight: 44,
    justifyContent: 'center',
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '600',
    color: INK,
    textAlign: 'center',
  },
  forgotLink: {
    fontWeight: '700',
    color: LINK_ORANGE,
  },
  error: {
    color: ERROR_RED,
    marginTop: 10,
    textAlign: 'center',
    fontSize: 13,
  },
  spacer: {
    flexGrow: 1,
    minHeight: 20,
  },
  actions: {
    width: '100%',
  },
  button: {
    backgroundColor: BUTTON_BG,
    borderRadius: 40,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: BUTTON_TEXT,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
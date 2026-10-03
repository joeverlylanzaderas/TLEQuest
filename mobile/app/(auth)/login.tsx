// mobile/app/(auth)/login.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { router } from 'expo-router/build/exports';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ---- Entrance animations (staggered) ----
  const logoAnim = useRef(new Animated.Value(0)).current;
  const fieldsAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;

  // ---- Input focus animations ----
  const userFocusAnim = useRef(new Animated.Value(0)).current;
  const passFocusAnim = useRef(new Animated.Value(0)).current;

  // ---- Button press ----
  const buttonScale = useRef(new Animated.Value(1)).current;

  // ---- Error shake ----
  const errorShake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(140, [
      Animated.timing(logoAnim, {
        toValue: 1,
        duration: 550,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fieldsAnim, {
        toValue: 1,
        duration: 550,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(cardAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  function animateFocus(anim: Animated.Value, toValue: number) {
    Animated.timing(anim, {
      toValue,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }

  function handlePressIn() {
    Animated.spring(buttonScale, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  }

  function handlePressOut() {
    Animated.spring(buttonScale, {
      toValue: 1,
      friction: 3,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }

  function triggerErrorShake() {
    errorShake.setValue(0);
    Animated.sequence([
      Animated.timing(errorShake, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(errorShake, { toValue: -1, duration: 60, useNativeDriver: true }),
      Animated.timing(errorShake, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(errorShake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }

  async function handleLogin() {
    if (!username || !password) {
      setError('Please enter both username and password.');
      triggerErrorShake();
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      await signIn({ username, password });
    } catch (e: any) {
      const message =
        e?.response?.data?.detail || 'Login failed. Check your credentials.';
      setError(message);
      triggerErrorShake();
    } finally {
      setIsSubmitting(false);
    }
  }

  const logoStyle = {
    opacity: logoAnim,
    transform: [
      {
        translateY: logoAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [24, 0],
        }),
      },
      {
        scale: logoAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.9, 1],
        }),
      },
    ],
  };

  const fieldsStyle = {
    opacity: fieldsAnim,
    transform: [
      {
        translateY: fieldsAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [20, 0],
        }),
      },
    ],
  };

  const cardStyle = {
    opacity: cardAnim,
    transform: [
      {
        translateY: cardAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [40, 0],
        }),
      },
    ],
  };

  const userBorderColor = userFocusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', '#5C3A2E'],
  });
  const passBorderColor = passFocusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', '#5C3A2E'],
  });

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* NOTE: topArea is gone. The logo now lives directly inside the
          scrollable content, right above the fields, and is spaced with
          plain marginTop/marginBottom instead of a flex:1 centering box.
          This means the logo sits close to the top (just past the safe
          area), not vertically centered in leftover space anymore. */}
      <KeyboardAvoidingView
        style={styles.flexFill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {/* Logo — just an image with its own margins now */}
          <Animated.View style={logoStyle}>
            <Image
              source={require('../../assets/tlequest-logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </Animated.View>

          <Animated.View style={[styles.fieldsArea, fieldsStyle]}>
            <Text style={styles.label}>USERNAME</Text>
            <Animated.View
              style={[
                styles.inputRow,
                { borderColor: userBorderColor, borderWidth: 2 },
              ]}
            >
              <Ionicons name="person" size={18} color="#3A2B1A" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Username"
                placeholderTextColor="#8A6A2A"
                autoCapitalize="none"
                value={username}
                onChangeText={setUsername}
                onFocus={() => animateFocus(userFocusAnim, 1)}
                onBlur={() => animateFocus(userFocusAnim, 0)}
              />
            </Animated.View>

            <Text style={styles.label}>PASSWORD</Text>
            <Animated.View
              style={[
                styles.inputRow,
                { borderColor: passBorderColor, borderWidth: 2 },
              ]}
            >
              <Ionicons name="lock-closed" size={18} color="#3A2B1A" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#8A6A2A"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                onFocus={() => animateFocus(passFocusAnim, 1)}
                onBlur={() => animateFocus(passFocusAnim, 0)}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((s) => !s)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color="#3A2B1A"
                />
              </TouchableOpacity>
            </Animated.View>

            {error ? (
              <Animated.Text
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
          </Animated.View>

          {/* Card — sized to its content, not stretched to fill the screen */}
          <Animated.View style={[styles.card, cardStyle]}>
            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <TouchableOpacity
                style={styles.button}
                onPress={handleLogin}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={isSubmitting}
                activeOpacity={0.9}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Login</Text>
                )}
              </TouchableOpacity>
            </Animated.View>

            <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')} style={styles.forgotWrapper}>
              <Text style={styles.forgotText}>
                Forgot Password? <Text style={styles.forgotLink}>Click Here</Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ============================================================================
// COLOR PALETTE
// Keep all your colors here so you only ever have to change them in one place.
// ============================================================================
const CREAM = '#F2E4C4';       // Main background color (behind everything)
const FIELD_BG = '#D6BB83';    // Yellow/orange pill background for username & password inputs
const CARD_BG = '#F9C544';     // Slightly lighter yellow for the bottom rounded card
const BROWN = '#3A2B1A';       // Dark brown used for text, icons, and input borders on focus

const styles = StyleSheet.create({
  // --------------------------------------------------------------------
  // SCREEN — the outermost wrapper, covers the full phone screen
  // --------------------------------------------------------------------
  screen: {
    flex: 1,                    // fill the entire screen height
    backgroundColor: CREAM,     // cream background color
  },

  // Simple helper style, just means "take up all remaining space".
  // Used to make KeyboardAvoidingView stretch to fill the screen.
  flexFill: {
    flex: 1,
  },

  // --------------------------------------------------------------------
  // SCROLL CONTENT WRAPPER
  // Controls how the logo + fields + card are positioned inside the
  // scroll area.
  //   - justifyContent: 'flex-end' pushes everything toward the BOTTOM
  //     of the available space. If the logo+fields+card together are
  //     shorter than the screen, you'll get an empty gap ABOVE the logo
  //     instead of the logo sitting right under the status bar.
  //   - If you'd rather everything hug the TOP (logo right after the
  //     safe area, no big gap above it), change this to 'flex-start'.
  // --------------------------------------------------------------------
  scrollContent: {
    flexGrow: 1,                 // let content grow to fill available space
    justifyContent: 'flex-end',  // ⬅ try 'flex-start' if you want content to hug the top instead
  },

  // --------------------------------------------------------------------
  // LOGO
  // No wrapping box anymore — just the image with its own margins.
  //   - alignSelf: 'center' centers it horizontally (since there's no
  //     parent box doing that for us now).
  //   - marginTop controls the gap between the safe area (status bar)
  //     and the top of the logo.
  //   - marginBottom controls the gap between the logo and the
  //     USERNAME field below it.
  //   - width/height control the logo's size — keep them at roughly
  //     the same ratio (~1.6:1) so it doesn't stretch oddly.
  // --------------------------------------------------------------------
  logoImage: {
    width: 300,                  // ⬅ increase to make logo wider
    height: 190,                 // ⬅ increase to make logo taller (keep ratio ~1.6:1)
    alignSelf: 'center',         // ⬅ centers logo horizontally
    marginTop: 20,               // ⬅ space between status bar and logo — increase for more top padding
    marginBottom: 12,            // ⬅ space between logo and the fields below
  },

  // --------------------------------------------------------------------
  // USERNAME / PASSWORD FIELDS SECTION
  // --------------------------------------------------------------------
  fieldsArea: {
    paddingHorizontal: 24,       // left/right margin for the whole fields block
  },

  // "USERNAME" / "PASSWORD" small caption text above each input
  label: {
    fontSize: 12,                // ⬅ increase for bigger label text
    fontWeight: '700',
    color: BROWN,
    letterSpacing: 0.5,          // spacing between letters (gives it that "caption" look)
    marginBottom: 8,             // space between label and the pill input below it
    marginTop: 16,               // space above label (between fields)
  },

  // The pill-shaped row containing icon + text input (+ eye icon for password)
  inputRow: {
    flexDirection: 'row',        // icon, text input, and eye icon sit side by side
    alignItems: 'center',        // vertically center everything in the row
    backgroundColor: FIELD_BG,   // pill background color
    borderRadius: 30,            // ⬅ increase for more rounded pill, decrease for squarer
    paddingHorizontal: 18,       // left/right inner padding
    height: 52,                  // ⬅ increase to make the input taller/thicker
    // NOTE: borderColor and borderWidth for this are applied inline above
    // (they animate on focus, so they're not in this static style block)
  },

  // Space between the person/lock icon and the text input
  inputIcon: {
    marginRight: 10,
  },

  // The actual typed text inside the input
  input: {
    flex: 1,                     // take up all remaining space in the row
    fontSize: 16,                // ⬅ increase for bigger typed text
    color: BROWN,
    fontWeight: '600',
  },

  // --------------------------------------------------------------------
  // BOTTOM CARD (rounded panel containing the Login button)
  //   - This card is sized to fit its CONTENT (button + link), not
  //     stretched to fill the screen. If you want it taller/shorter,
  //     adjust paddingTop / paddingBottom, NOT flex.
  // --------------------------------------------------------------------
  card: {
    marginTop: 32,                    // gap between password field and top of card
    backgroundColor: CARD_BG,
    borderColor: BROWN,                // slightly darker yellow for the card border
    borderWidth: 3,
    borderTopLeftRadius: 40,          // ⬅ increase for a more rounded card corner
    borderTopRightRadius: 40,
    paddingHorizontal: 24,            // left/right inner padding
    paddingTop: 32,                   // space between top of card and the button
    paddingBottom: 64,                // space below the "Forgot Password?" link (bottom of card)
    height: 260,                      // adjust this to change the overall height of the card
  },

  // The brown "Login" button itself
  button: {
    backgroundColor: '#5C3A2E',       // ⬅ change this to recolor the button
    borderRadius: 30,                 // ⬅ increase for more pill-shaped, decrease for squarer
    height: 56,                       // ⬅ increase to make button taller
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Text inside the Login button
  buttonText: {
    color: '#fff',
    fontSize: 18,                     // ⬅ increase for bigger button text
    fontWeight: '700',
  },

  // Wrapper around "Forgot Password? Click Here" — controls its position
  forgotWrapper: {
    alignItems: 'center',             // center the text horizontally
    marginTop: 16,                    // space between button and this text
  },

  // "Forgot Password? " part of the text
  forgotText: {
    fontSize: 13,                     // ⬅ increase for bigger text
    color: '#5C3A2E',
  },

  // "Click Here" part — bold to stand out as the tappable link
  forgotLink: {
    fontWeight: '700',
  },

  // Error message shown above the card when login fails / fields are empty
  error: {
    color: '#B3261E',                
    marginTop: 12,
    textAlign: 'center',
    fontSize: 13,
  },
});
// mobile/app/_layout.tsx
import React, { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { View, Alert } from 'react-native';
import OfflineBanner from '../src/components/OfflineBanner';
import AnimatedSplash from '../src/components/AnimatedSplash';
import AlertHost from '../src/components/AlertHost';
import * as SplashScreen from 'expo-splash-screen';

// keep the (plain cream) native splash up until our animated one is on screen
SplashScreen.preventAutoHideAsync().catch(() => {});

function RootLayoutNav() {
  const { user, isLoading, signOut } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return; // wait until we know if a session exists

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Not logged in, trying to access a protected screen -> kick to login
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      // Logged in but sitting on the login screen -> send to the right dashboard
      if (user.role === 'admin') {
        // Admins aren't meant to use the mobile app — block cleanly instead
        // of silently landing them on the student dashboard.
        Alert.alert(
          'Admin accounts use the web dashboard',
          'Please log in at the TLEQuest admin portal instead.'
        );
        signOut();
      } else if (user.role === 'teacher') {
        router.replace('/(teacher)/(tabs)/dashboard');
      } else {
        router.replace('/(student)/(tabs)/home');
      }
    }
  }, [user, isLoading, segments]);

  return (
    <View style={{ flex: 1, backgroundColor: isLoading ? '#faf6e8' : undefined }}>
      {!isLoading && (
        <View style={{ flex: 1 }}>
          <Slot />
          <OfflineBanner />
          <AlertHost />
        </View>
      )}
      {/* animated splash, drawn over everything until it has handed over to the login screen */}
      <AnimatedSplash appReady={!isLoading} toLogo={!user} />
    </View>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
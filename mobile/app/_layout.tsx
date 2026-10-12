// mobile/app/_layout.tsx

import React, { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { ToastProvider } from '../src/components/Toast';

// Keep the native splash screen visible while the app initializes.
SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({
  duration: 400,
  fade: true,
});

function RootLayoutNav() {
  const { user, isLoading, signOut } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Hide the native splash only after authentication finishes loading.
  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hide();
    }
  }, [isLoading]);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Redirect logged-out users to login.
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      // Redirect authenticated users according to their role.
      if (user.role === 'admin') {
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
  }, [user, isLoading, segments, router, signOut]);

  // Render nothing while loading; the native splash remains visible.
  if (isLoading) {
    return null;
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ToastProvider>
          <RootLayoutNav />
        </ToastProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

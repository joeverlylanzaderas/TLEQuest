// mobile/app/_layout.tsx
import React, { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { View, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastProvider } from '../src/components/Toast';

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

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
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
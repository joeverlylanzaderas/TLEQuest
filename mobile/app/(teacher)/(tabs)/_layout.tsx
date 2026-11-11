// mobile/app/(teacher)/(tabs)/_layout.tsx
import { View } from 'react-native';
import { T, HEADER_BG, HEADER_TEXT, activeTheme } from '../../../src/theme/theme';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTabScreenOptions, TAB_BG } from '../../../src/components/useTabScreenOptions';
import { FloatingTabBar } from '../../../src/components/FloatingTabBar';

export default function TeacherTabsLayout() {
  const screenOptions = useTabScreenOptions();
  return (
    <View style={{ flex: 1, backgroundColor: TAB_BG }}>
    <Tabs
      backBehavior="history"
      screenOptions={screenOptions}
      tabBar={(props) => <FloatingTabBar {...props} />}
    >
      <Tabs.Screen
        name="quests"
        options={{
          title: 'Quests',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="restaurant-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="submissions"
        options={{
          title: 'Submissions',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="ribbon-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
    </View>
  );
}
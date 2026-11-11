// mobile/app/(student)/(tabs)/_layout.tsx
import { View } from 'react-native';
import { T, HEADER_BG, HEADER_TEXT, activeTheme } from '../../../src/theme/theme';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTabScreenOptions, TAB_BG } from '../../../src/components/useTabScreenOptions';
import { FloatingTabBar } from '../../../src/components/FloatingTabBar';
import { BounceOnFocus } from '../../../src/components/Motion';

export default function StudentTabsLayout() {
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
          tabBarIcon: ({ color, size, focused }) => (
            <BounceOnFocus focused={focused}>
            <Ionicons name="restaurant-outline" size={size} color={color} />
            </BounceOnFocus>
          ),
        }}
      />
      <Tabs.Screen
        name="submissions"
        options={{
          title: 'Submissions',
          tabBarIcon: ({ color, size, focused }) => (
            <BounceOnFocus focused={focused}>
            <Ionicons name="ribbon-outline" size={size} color={color} />
            </BounceOnFocus>
          ),
        }}
      />
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <BounceOnFocus focused={focused}>
            <Ionicons name="home-outline" size={size} color={color} />
            </BounceOnFocus>
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color, size, focused }) => (
            <BounceOnFocus focused={focused}>
            <Ionicons name="bar-chart-outline" size={size} color={color} />
            </BounceOnFocus>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <BounceOnFocus focused={focused}>
            <Ionicons name="person-outline" size={size} color={color} />
            </BounceOnFocus>
          ),
        }}
      />
    </Tabs>
    </View>
  );
}
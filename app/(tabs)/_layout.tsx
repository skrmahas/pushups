import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';

import Colors from '@/constants/Colors';

function TabBarIcon({ 
  name, 
  color, 
  type = 'fontawesome' 
}: { 
  name: string; 
  color: string; 
  type?: 'fontawesome' | 'ionicons';
}) {
  if (type === 'ionicons') {
    return <Ionicons name={name as any} size={24} color={color} />;
  }
  return <FontAwesome5 name={name} size={22} color={color} />;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.dark.accent,
        tabBarInactiveTintColor: Colors.dark.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.dark.surface,
          borderTopColor: Colors.dark.border,
          borderTopWidth: 1,
          height: 70,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.5,
        },
        headerStyle: {
          backgroundColor: Colors.dark.background,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        },
        headerTintColor: Colors.dark.text,
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 20,
          letterSpacing: 1,
        },
      }}
    >
      <Tabs.Screen
        name="workout"
        options={{
          title: 'Workout',
          headerTitle: 'WORKOUT',
          tabBarIcon: ({ color }) => <TabBarIcon name="dumbbell" color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          headerTitle: 'HISTORY',
          tabBarIcon: ({ color }) => <TabBarIcon name="time-outline" color={color} type="ionicons" />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          headerTitle: 'PROGRESS',
          tabBarIcon: ({ color }) => <TabBarIcon name="stats-chart" color={color} type="ionicons" />,
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Friends',
          headerTitle: 'FRIENDS',
          tabBarIcon: ({ color }) => <TabBarIcon name="people" color={color} type="ionicons" />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerTitle: 'PROFILE',
          tabBarIcon: ({ color }) => <TabBarIcon name="person" color={color} type="ionicons" />,
        }}
      />
    </Tabs>
  );
}

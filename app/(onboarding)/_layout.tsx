import { Stack } from 'expo-router';
import Colors from '@/constants/Colors';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: Colors.dark.background,
        },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="goal-selection" />
      <Stack.Screen name="intensity" />
      <Stack.Screen name="timeline" />
      <Stack.Screen name="assessment" />
      <Stack.Screen name="plan-generation" />
      <Stack.Screen name="complete" />
    </Stack>
  );
}


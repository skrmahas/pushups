import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Platform } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';

import { supabase } from '@/lib/supabase';
import { useStore } from '@/lib/store';
import { hasCompletedOnboarding } from '@/lib/workout-plan';
import Colors from '@/constants/Colors';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Hide Android navigation bar
  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('hidden');
      NavigationBar.setBehaviorAsync('overlay-swipe');
      NavigationBar.setBackgroundColorAsync('transparent');
    }
  }, []);

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const router = useRouter();
  const segments = useSegments();
  const session = useStore((state) => state.session);
  const setSession = useStore((state) => state.setSession);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // Check current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Check onboarding status when session changes
  useEffect(() => {
    const checkOnboarding = async () => {
      if (session?.user?.id) {
        const completed = await hasCompletedOnboarding(session.user.id);
        setNeedsOnboarding(!completed);
        setOnboardingChecked(true);
      } else {
        setOnboardingChecked(true);
        setNeedsOnboarding(false);
      }
    };
    checkOnboarding();
  }, [session?.user?.id]);

  useEffect(() => {
    if (!onboardingChecked) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === '(onboarding)';

    if (!session && !inAuthGroup) {
      // Redirect to login if not authenticated
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      // Check if user needs onboarding
      if (needsOnboarding) {
        router.replace('/(onboarding)/welcome');
      } else {
        router.replace('/(tabs)/workout');
      }
    } else if (session && needsOnboarding && !inOnboardingGroup && !inAuthGroup) {
      // User is authenticated but hasn't completed onboarding
      router.replace('/(onboarding)/welcome');
    }
  }, [session, segments, onboardingChecked, needsOnboarding]);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.dark.background }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: Colors.dark.background,
          },
          headerTintColor: Colors.dark.text,
          headerTitleStyle: {
            fontWeight: '600',
          },
          contentStyle: {
            backgroundColor: Colors.dark.background,
          },
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Workout Details' }} />
        <Stack.Screen name="workout-detail/[id]" options={{ presentation: 'card', title: 'Workout' }} />
      </Stack>
    </View>
  );
}

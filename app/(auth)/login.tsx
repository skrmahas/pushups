import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Dimensions,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { makeRedirectUri } from 'expo-auth-session';

import { supabase } from '@/lib/supabase';
import Colors from '@/constants/Colors';

const { width, height } = Dimensions.get('window');

WebBrowser.maybeCompleteAuthSession();

const redirectUri = makeRedirectUri({
  scheme: 'pushups',
});

interface CarouselSlide {
  icon: string;
  title: string;
  description: string;
  color: string;
}

const CAROUSEL_SLIDES: CarouselSlide[] = [
  {
    icon: '💪',
    title: 'Track Your Progress',
    description: 'Log every rep and watch your strength grow over time',
    color: '#FF6B35',
  },
  {
    icon: '🎯',
    title: 'Personalized Plans',
    description: 'Get a workout plan tailored to your goals and fitness level',
    color: '#4ADE80',
  },
  {
    icon: '⚡',
    title: 'Earn XP & Level Up',
    description: 'Stay motivated with rewards, achievements, and streaks',
    color: '#FBBF24',
  },
  {
    icon: '👥',
    title: 'Connect with Friends',
    description: 'Share your journey and motivate each other',
    color: '#8B5CF6',
  },
];

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const logoScaleAnim = useRef(new Animated.Value(0.5)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const carouselFade = useRef(new Animated.Value(1)).current;

  // Circle animations
  const circle1Anim = useRef(new Animated.Value(0)).current;
  const circle2Anim = useRef(new Animated.Value(0)).current;
  const circle3Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Initial animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(logoScaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Background circle animations
    Animated.loop(
      Animated.sequence([
        Animated.timing(circle1Anim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(circle1Anim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(circle2Anim, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(circle2Anim, {
          toValue: 0,
          duration: 4000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Pulse animation for logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Auto-rotate carousel
    const carouselInterval = setInterval(() => {
      Animated.sequence([
        Animated.timing(carouselFade, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(carouselFade, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      setCurrentSlide((prev) => (prev + 1) % CAROUSEL_SLIDES.length);
    }, 4000);

    return () => clearInterval(carouselInterval);
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true,
        },
      });

      if (signInError) throw signInError;

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);

        if (result.type === 'success' && result.url) {
          const url = new URL(result.url);
          const params = new URLSearchParams(url.hash.substring(1));
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if (accessToken && refreshToken) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) throw sessionError;
          }
        }
      }
    } catch (err: any) {
      console.error('Error signing in:', err);
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const currentSlideData = CAROUSEL_SLIDES[currentSlide];

  return (
    <View style={styles.container}>
      {/* Animated background */}
      <LinearGradient
        colors={['#1A1A1A', '#0D0D0D', '#0D0D0D']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Animated circles */}
      <Animated.View
        style={[
          styles.bgCircle,
          styles.bgCircle1,
          {
            opacity: circle1Anim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.03, 0.08],
            }),
            transform: [
              {
                scale: circle1Anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.2],
                }),
              },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.bgCircle,
          styles.bgCircle2,
          {
            opacity: circle2Anim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.02, 0.06],
            }),
            transform: [
              {
                scale: circle2Anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.3],
                }),
              },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.bgCircle,
          styles.bgCircle3,
          {
            opacity: 0.04,
          },
        ]}
      />

      {/* Content */}
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Logo */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              transform: [{ scale: Animated.multiply(logoScaleAnim, pulseAnim) }],
            },
          ]}
        >
          <LinearGradient
            colors={[Colors.dark.accent, '#FF8C5A']}
            style={styles.logoGradient}
          >
            <FontAwesome5 name="fist-raised" size={48} color="#fff" />
          </LinearGradient>
        </Animated.View>

        {/* Title */}
        <Text style={styles.title}>Pushups Tracker</Text>
        <Text style={styles.subtitle}>
          Your journey to{' '}
          <Text style={styles.subtitleHighlight}>100 pushups</Text>
          {'\n'}starts here
        </Text>

        {/* Carousel */}
        <Animated.View style={[styles.carouselContainer, { opacity: carouselFade }]}>
          <View style={[styles.carouselCard, { borderColor: currentSlideData.color + '40' }]}>
            <Text style={styles.carouselIcon}>{currentSlideData.icon}</Text>
            <Text style={styles.carouselTitle}>{currentSlideData.title}</Text>
            <Text style={styles.carouselDescription}>{currentSlideData.description}</Text>
          </View>
          
          {/* Dots indicator */}
          <View style={styles.dotsContainer}>
            {CAROUSEL_SLIDES.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  currentSlide === index && [styles.dotActive, { backgroundColor: currentSlideData.color }],
                ]}
              />
            ))}
          </View>
        </Animated.View>

        {/* Sign in button */}
        <TouchableOpacity
          style={styles.signInButton}
          onPress={handleGoogleSignIn}
          disabled={loading}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#FFFFFF', '#F5F5F5']}
            style={styles.signInButtonGradient}
          >
            {loading ? (
              <ActivityIndicator color="#333" />
            ) : (
              <>
                <View style={styles.googleIconContainer}>
                  <Text style={styles.googleIcon}>G</Text>
                </View>
                <Text style={styles.signInButtonText}>Continue with Google</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={18} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Stats preview */}
        <View style={styles.statsPreview}>
          <View style={styles.statPreviewItem}>
            <Text style={styles.statPreviewValue}>50K+</Text>
            <Text style={styles.statPreviewLabel}>Active Users</Text>
          </View>
          <View style={styles.statPreviewDivider} />
          <View style={styles.statPreviewItem}>
            <Text style={styles.statPreviewValue}>10M+</Text>
            <Text style={styles.statPreviewLabel}>Pushups Logged</Text>
          </View>
          <View style={styles.statPreviewDivider} />
          <View style={styles.statPreviewItem}>
            <Text style={styles.statPreviewValue}>4.9★</Text>
            <Text style={styles.statPreviewLabel}>Rating</Text>
          </View>
        </View>

        {/* Terms */}
        <Text style={styles.termsText}>
          By continuing, you agree to our{' '}
          <Text style={styles.termsLink}>Terms of Service</Text>
          {' '}and{' '}
          <Text style={styles.termsLink}>Privacy Policy</Text>
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  bgCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: Colors.dark.accent,
  },
  bgCircle1: {
    width: width * 0.8,
    height: width * 0.8,
    top: -width * 0.2,
    right: -width * 0.3,
  },
  bgCircle2: {
    width: width * 0.6,
    height: width * 0.6,
    bottom: height * 0.15,
    left: -width * 0.2,
  },
  bgCircle3: {
    width: width * 0.4,
    height: width * 0.4,
    bottom: -width * 0.1,
    right: width * 0.1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.dark.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.dark.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 32,
  },
  subtitleHighlight: {
    color: Colors.dark.accent,
    fontWeight: '700',
  },
  carouselContainer: {
    width: '100%',
    marginBottom: 32,
  },
  carouselCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    marginBottom: 16,
  },
  carouselIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  carouselTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.dark.text,
    marginBottom: 8,
  },
  carouselDescription: {
    fontSize: 15,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.dark.surfaceLight,
  },
  dotActive: {
    width: 24,
  },
  signInButton: {
    width: '100%',
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  signInButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 12,
  },
  googleIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleIcon: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  signInButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#333',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    flex: 1,
  },
  statsPreview: {
    flexDirection: 'row',
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    width: '100%',
  },
  statPreviewItem: {
    flex: 1,
    alignItems: 'center',
  },
  statPreviewValue: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.dark.accent,
  },
  statPreviewLabel: {
    fontSize: 11,
    color: Colors.dark.textMuted,
    marginTop: 4,
  },
  statPreviewDivider: {
    width: 1,
    backgroundColor: Colors.dark.border,
  },
  termsText: {
    fontSize: 12,
    color: Colors.dark.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: Colors.dark.accent,
  },
});

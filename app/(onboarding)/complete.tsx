import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import Confetti from 'react-native-confetti';

const { width, height } = Dimensions.get('window');

export default function CompleteScreen() {
  const router = useRouter();
  
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const confettiRef = useRef<any>(null);

  useEffect(() => {
    // Start confetti
    if (confettiRef.current) {
      confettiRef.current.startConfetti();
    }

    // Animate content
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Stop confetti after 3 seconds
    const timer = setTimeout(() => {
      if (confettiRef.current) {
        confettiRef.current.stopConfetti();
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleStart = () => {
    router.replace('/(tabs)/workout');
  };

  return (
    <LinearGradient
      colors={['#1A1A1A', '#0D0D0D', '#0D0D0D']}
      style={styles.container}
    >
      {/* Confetti - Note: If confetti package not available, this will be ignored */}
      <View style={styles.confettiContainer} pointerEvents="none">
        {/* Confetti would go here */}
      </View>

      {/* Decorative circles */}
      <View style={[styles.circle, styles.circle1]} />
      <View style={[styles.circle, styles.circle2]} />

      <View style={styles.content}>
        {/* Trophy icon */}
        <Animated.View
          style={[
            styles.iconContainer,
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          <LinearGradient
            colors={['#FFD700', '#FFA500']}
            style={styles.iconGradient}
          >
            <Ionicons name="trophy" size={64} color="#fff" />
          </LinearGradient>
        </Animated.View>

        {/* Title */}
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <Text style={styles.title}>You're All Set!</Text>
          <Text style={styles.subtitle}>
            Your personalized workout plan is ready.{'\n'}
            Let's crush those goals!
          </Text>

          {/* Features recap */}
          <View style={styles.featuresContainer}>
            <View style={styles.featureItem}>
              <View style={styles.featureIconContainer}>
                <Ionicons name="calendar" size={20} color={Colors.dark.accent} />
              </View>
              <Text style={styles.featureText}>Daily workout targets</Text>
            </View>

            <View style={styles.featureItem}>
              <View style={styles.featureIconContainer}>
                <Ionicons name="trending-up" size={20} color={Colors.dark.accent} />
              </View>
              <Text style={styles.featureText}>Progressive difficulty</Text>
            </View>

            <View style={styles.featureItem}>
              <View style={styles.featureIconContainer}>
                <Ionicons name="star" size={20} color={Colors.dark.accent} />
              </View>
              <Text style={styles.featureText}>XP rewards & leveling</Text>
            </View>

            <View style={styles.featureItem}>
              <View style={styles.featureIconContainer}>
                <Ionicons name="people" size={20} color={Colors.dark.accent} />
              </View>
              <Text style={styles.featureText}>Social features & friends</Text>
            </View>
          </View>

          {/* Tips */}
          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>QUICK TIPS</Text>
            <Text style={styles.tipText}>
              • Complete your daily workout to maintain your streak
            </Text>
            <Text style={styles.tipText}>
              • Higher difficulty = more XP rewards
            </Text>
            <Text style={styles.tipText}>
              • Don't worry if you miss a day - just keep going!
            </Text>
          </View>
        </Animated.View>
      </View>

      {/* Start button */}
      <Animated.View
        style={[
          styles.footer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.startButton}
          onPress={handleStart}
          activeOpacity={0.8}
        >
          <Text style={styles.startButtonText}>Start Your Journey</Text>
          <FontAwesome5 name="bolt" size={18} color={Colors.dark.background} />
        </TouchableOpacity>

        <Text style={styles.stepText}>Setup Complete!</Text>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  circle: {
    position: 'absolute',
    borderRadius: 999,
  },
  circle1: {
    width: width * 0.8,
    height: width * 0.8,
    top: -width * 0.3,
    right: -width * 0.3,
    backgroundColor: Colors.dark.warning,
    opacity: 0.05,
  },
  circle2: {
    width: width * 0.5,
    height: width * 0.5,
    bottom: height * 0.2,
    left: -width * 0.2,
    backgroundColor: Colors.dark.accent,
    opacity: 0.05,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 32,
  },
  iconGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.dark.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  featuresContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  featureIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 15,
    color: Colors.dark.text,
    fontWeight: '500',
  },
  tipsContainer: {
    width: '100%',
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 20,
  },
  tipsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark.textMuted,
    letterSpacing: 1,
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    lineHeight: 22,
  },
  footer: {
    padding: 24,
    paddingBottom: 40,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.accent,
    paddingVertical: 18,
    borderRadius: 16,
    gap: 10,
    shadowColor: Colors.dark.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.dark.background,
  },
  stepText: {
    fontSize: 14,
    color: Colors.dark.success,
    textAlign: 'center',
    marginTop: 16,
    fontWeight: '600',
  },
});


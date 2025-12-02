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

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
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
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <LinearGradient
      colors={['#1A1A1A', '#0D0D0D', '#0D0D0D']}
      style={styles.container}
    >
      {/* Decorative circles */}
      <View style={[styles.circle, styles.circle1]} />
      <View style={[styles.circle, styles.circle2]} />
      <View style={[styles.circle, styles.circle3]} />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Icon */}
        <Animated.View
          style={[
            styles.iconContainer,
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          <LinearGradient
            colors={[Colors.dark.accent, '#FF8C5A']}
            style={styles.iconGradient}
          >
            <FontAwesome5 name="fist-raised" size={48} color="#fff" />
          </LinearGradient>
        </Animated.View>

        {/* Title */}
        <Text style={styles.title}>Welcome!</Text>
        <Text style={styles.subtitle}>
          Let's set up your personalized{'\n'}workout plan
        </Text>

        {/* Features */}
        <View style={styles.features}>
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="fitness" size={24} color={Colors.dark.accent} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Personalized Plan</Text>
              <Text style={styles.featureDesc}>
                Tailored to your fitness level and goals
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="trending-up" size={24} color={Colors.dark.accent} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Progressive Training</Text>
              <Text style={styles.featureDesc}>
                Gradually increase difficulty over time
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="trophy" size={24} color={Colors.dark.accent} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Reach Your Goal</Text>
              <Text style={styles.featureDesc}>
                100 pushups or 50 pullups in one go!
              </Text>
            </View>
          </View>
        </View>

        {/* Continue button */}
        <TouchableOpacity
          style={styles.continueButton}
          onPress={() => router.push('/(onboarding)/goal-selection')}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>Let's Get Started</Text>
          <Ionicons name="arrow-forward" size={20} color={Colors.dark.background} />
        </TouchableOpacity>

        {/* Step indicator */}
        <Text style={styles.stepText}>Step 1 of 6</Text>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  circle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: Colors.dark.accent,
  },
  circle1: {
    width: width * 0.6,
    height: width * 0.6,
    top: -width * 0.2,
    right: -width * 0.2,
    opacity: 0.05,
  },
  circle2: {
    width: width * 0.4,
    height: width * 0.4,
    bottom: height * 0.3,
    left: -width * 0.15,
    opacity: 0.03,
  },
  circle3: {
    width: width * 0.3,
    height: width * 0.3,
    bottom: -width * 0.1,
    right: width * 0.1,
    opacity: 0.04,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
  },
  iconContainer: {
    alignSelf: 'center',
    marginBottom: 32,
  },
  iconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.dark.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
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
    fontSize: 18,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 48,
  },
  features: {
    flex: 1,
    gap: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  featureIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.dark.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark.text,
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.accent,
    paddingVertical: 18,
    borderRadius: 16,
    gap: 8,
    marginBottom: 16,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.dark.background,
  },
  stepText: {
    fontSize: 14,
    color: Colors.dark.textMuted,
    textAlign: 'center',
  },
});


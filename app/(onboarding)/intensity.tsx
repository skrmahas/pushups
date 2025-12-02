import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { Intensity } from '@/lib/plan-generator';
import { useStore } from '@/lib/store';
import { saveOnboardingData, getOnboardingData } from '@/lib/workout-plan';

interface IntensityOption {
  id: Intensity;
  name: string;
  description: string;
  workoutsPerWeek: number;
  icon: string;
  color: string;
}

const INTENSITY_OPTIONS: IntensityOption[] = [
  {
    id: 'beginner',
    name: 'Beginner',
    description: 'Perfect for starting out. More rest days to recover.',
    workoutsPerWeek: 4,
    icon: '🌱',
    color: '#4ADE80',
  },
  {
    id: 'intermediate',
    name: 'Intermediate',
    description: 'Balanced approach with steady progression.',
    workoutsPerWeek: 5,
    icon: '🔥',
    color: '#F59E0B',
  },
  {
    id: 'advanced',
    name: 'Advanced',
    description: 'Intense training for faster results.',
    workoutsPerWeek: 6,
    icon: '⚡',
    color: '#EF4444',
  },
];

interface OptionCardProps {
  option: IntensityOption;
  isSelected: boolean;
  onSelect: () => void;
  index: number;
}

function OptionCard({ option, isSelected, onSelect, index }: OptionCardProps) {
  const slideAnim = useRef(new Animated.Value(50)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: index * 100,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateX: slideAnim }],
      }}
    >
      <TouchableOpacity
        style={[
          styles.optionCard,
          isSelected && { borderColor: option.color, backgroundColor: option.color + '10' },
        ]}
        onPress={onSelect}
        activeOpacity={0.8}
      >
        <View style={styles.optionHeader}>
          <View style={[styles.iconContainer, { backgroundColor: option.color + '20' }]}>
            <Text style={styles.iconText}>{option.icon}</Text>
          </View>
          {isSelected && (
            <View style={[styles.checkmark, { backgroundColor: option.color }]}>
              <Ionicons name="checkmark" size={16} color="#fff" />
            </View>
          )}
        </View>

        <Text style={styles.optionName}>{option.name}</Text>
        <Text style={styles.optionDesc}>{option.description}</Text>
        
        <View style={styles.statsRow}>
          <Ionicons name="calendar" size={16} color={option.color} />
          <Text style={[styles.statsText, { color: option.color }]}>
            {option.workoutsPerWeek} workouts per week
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function IntensityScreen() {
  const router = useRouter();
  const session = useStore((state) => state.session);
  const [selectedIntensity, setSelectedIntensity] = useState<Intensity | null>(null);
  const [saving, setSaving] = useState(false);

  const handleContinue = async () => {
    if (!selectedIntensity || !session?.user?.id) return;

    setSaving(true);
    const existingData = await getOnboardingData(session.user.id);
    await saveOnboardingData(session.user.id, {
      exerciseType: existingData?.exerciseType || 'pushups',
      intensity: selectedIntensity,
      timelineMonths: existingData?.timelineMonths || 3,
    });
    setSaving(false);

    router.push('/(onboarding)/timeline');
  };

  return (
    <LinearGradient
      colors={['#1A1A1A', '#0D0D0D', '#0D0D0D']}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.stepIndicator}>Step 3 of 6</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Training Intensity</Text>
        <Text style={styles.subtitle}>
          How often do you want to workout?
        </Text>

        <View style={styles.optionsContainer}>
          {INTENSITY_OPTIONS.map((option, index) => (
            <OptionCard
              key={option.id}
              option={option}
              isSelected={selectedIntensity === option.id}
              onSelect={() => setSelectedIntensity(option.id)}
              index={index}
            />
          ))}
        </View>

        {selectedIntensity && (
          <View style={styles.recommendation}>
            <Text style={styles.recommendationText}>
              {selectedIntensity === 'beginner' && '👍 Great choice for building a sustainable habit!'}
              {selectedIntensity === 'intermediate' && '🎯 Most popular choice - balanced and effective!'}
              {selectedIntensity === 'advanced' && '💪 For those ready to push their limits!'}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            !selectedIntensity && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!selectedIntensity || saving}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>
            {saving ? 'Saving...' : 'Continue'}
          </Text>
          <Ionicons name="arrow-forward" size={20} color={Colors.dark.background} />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.dark.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepIndicator: {
    fontSize: 14,
    color: Colors.dark.textMuted,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.dark.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.dark.textSecondary,
    marginBottom: 32,
  },
  optionsContainer: {
    gap: 12,
  },
  optionCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 24,
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.dark.text,
    marginBottom: 4,
  },
  optionDesc: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statsText: {
    fontSize: 14,
    fontWeight: '600',
  },
  recommendation: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
  },
  recommendationText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
  },
  footer: {
    padding: 24,
    paddingBottom: 40,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.accent,
    paddingVertical: 18,
    borderRadius: 16,
    gap: 8,
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.dark.background,
  },
});


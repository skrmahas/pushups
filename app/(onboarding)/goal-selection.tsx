import React, { useState, useRef, useEffect } from 'react';
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
import { ExerciseType, EXERCISES } from '@/lib/exercises';
import { useStore } from '@/lib/store';
import { saveOnboardingData } from '@/lib/workout-plan';

const { width } = Dimensions.get('window');

interface GoalCardProps {
  exercise: typeof EXERCISES.pushups;
  isSelected: boolean;
  onSelect: () => void;
  index: number;
}

function GoalCard({ exercise, isSelected, onSelect, index }: GoalCardProps) {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        delay: index * 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
    onSelect();
  };

  return (
    <Animated.View
      style={[
        styles.cardContainer,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.goalCard,
          isSelected && styles.goalCardSelected,
          { borderColor: isSelected ? exercise.accentColor : 'transparent' },
        ]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        {isSelected && (
          <View style={[styles.selectedBadge, { backgroundColor: exercise.accentColor }]}>
            <Ionicons name="checkmark" size={16} color="#fff" />
          </View>
        )}

        <View style={[styles.iconContainer, { backgroundColor: exercise.accentColor + '20' }]}>
          <Text style={styles.iconText}>{exercise.icon}</Text>
        </View>

        <Text style={styles.exerciseName}>{exercise.namePlural}</Text>
        
        <View style={styles.goalBadge}>
          <Text style={[styles.goalNumber, { color: exercise.accentColor }]}>{exercise.goal}</Text>
          <Text style={styles.goalLabel}>in one go</Text>
        </View>

        <Text style={styles.exerciseDesc}>{exercise.description}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function GoalSelectionScreen() {
  const router = useRouter();
  const session = useStore((state) => state.session);
  const [selectedGoal, setSelectedGoal] = useState<ExerciseType | null>(null);
  const [saving, setSaving] = useState(false);

  const handleContinue = async () => {
    if (!selectedGoal || !session?.user?.id) return;

    setSaving(true);
    await saveOnboardingData(session.user.id, {
      exerciseType: selectedGoal,
      intensity: 'intermediate',
      timelineMonths: 3,
    });
    setSaving(false);

    router.push('/(onboarding)/intensity');
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
        <Text style={styles.stepIndicator}>Step 2 of 6</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Choose Your Goal</Text>
        <Text style={styles.subtitle}>
          What do you want to master?
        </Text>

        <View style={styles.cardsContainer}>
          <GoalCard
            exercise={EXERCISES.pushups}
            isSelected={selectedGoal === 'pushups'}
            onSelect={() => setSelectedGoal('pushups')}
            index={0}
          />
          <GoalCard
            exercise={EXERCISES.pullups}
            isSelected={selectedGoal === 'pullups'}
            onSelect={() => setSelectedGoal('pullups')}
            index={1}
          />
        </View>

        {selectedGoal && (
          <View style={styles.selectedInfo}>
            <Ionicons name="information-circle" size={20} color={Colors.dark.accent} />
            <Text style={styles.selectedInfoText}>
              You'll work toward {EXERCISES[selectedGoal].goal}{' '}
              {EXERCISES[selectedGoal].namePlural.toLowerCase()} in a single set!
            </Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            !selectedGoal && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!selectedGoal || saving}
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
  cardsContainer: {
    gap: 16,
  },
  cardContainer: {
    width: '100%',
  },
  goalCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 3,
    borderColor: 'transparent',
    position: 'relative',
  },
  goalCardSelected: {
    backgroundColor: Colors.dark.surfaceLight,
  },
  selectedBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconText: {
    fontSize: 32,
  },
  exerciseName: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.dark.text,
    marginBottom: 12,
  },
  goalBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 12,
  },
  goalNumber: {
    fontSize: 48,
    fontWeight: '800',
  },
  goalLabel: {
    fontSize: 16,
    color: Colors.dark.textSecondary,
    fontWeight: '600',
  },
  exerciseDesc: {
    fontSize: 14,
    color: Colors.dark.textMuted,
    lineHeight: 20,
  },
  selectedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginTop: 24,
  },
  selectedInfoText: {
    flex: 1,
    fontSize: 14,
    color: Colors.dark.textSecondary,
    lineHeight: 20,
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


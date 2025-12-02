import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { FitnessLevel } from '@/lib/plan-generator';
import { useStore } from '@/lib/store';
import { saveOnboardingData, getOnboardingData } from '@/lib/workout-plan';
import { EXERCISES } from '@/lib/exercises';

interface FitnessLevelOption {
  id: FitnessLevel;
  label: string;
  description: string;
  icon: string;
}

const FITNESS_LEVELS: FitnessLevelOption[] = [
  {
    id: 'beginner',
    label: 'Just Starting',
    description: 'New to this exercise',
    icon: '🌱',
  },
  {
    id: 'some_experience',
    label: 'Some Experience',
    description: 'Can do a few reps',
    icon: '📈',
  },
  {
    id: 'intermediate',
    label: 'Intermediate',
    description: 'Regular practice',
    icon: '💪',
  },
  {
    id: 'advanced',
    label: 'Advanced',
    description: 'Very comfortable',
    icon: '🏆',
  },
];

export default function AssessmentScreen() {
  const router = useRouter();
  const session = useStore((state) => state.session);
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel | null>(null);
  const [maxReps, setMaxReps] = useState('');
  const [saving, setSaving] = useState(false);
  const [exerciseType, setExerciseType] = useState<'pushups' | 'pullups'>('pushups');

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Load existing onboarding data to get exercise type
    const loadData = async () => {
      if (session?.user?.id) {
        const data = await getOnboardingData(session.user.id);
        if (data?.exerciseType) {
          setExerciseType(data.exerciseType);
        }
      }
    };
    loadData();
  }, [session?.user?.id]);

  const handleContinue = async () => {
    if (!session?.user?.id) return;

    setSaving(true);
    const existingData = await getOnboardingData(session.user.id);
    await saveOnboardingData(session.user.id, {
      exerciseType: existingData?.exerciseType || 'pushups',
      intensity: existingData?.intensity || 'intermediate',
      timelineMonths: existingData?.timelineMonths || 3,
      maxReps: maxReps ? parseInt(maxReps, 10) : undefined,
      fitnessLevel: fitnessLevel || undefined,
    });
    setSaving(false);

    router.push('/(onboarding)/plan-generation');
  };

  const exercise = EXERCISES[exerciseType];

  return (
    <LinearGradient
      colors={['#1A1A1A', '#0D0D0D', '#0D0D0D']}
      style={styles.container}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
          </TouchableOpacity>
          <Text style={styles.stepIndicator}>Step 5 of 6</Text>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <Animated.View style={{ opacity: fadeAnim }}>
            <Text style={styles.title}>Quick Assessment</Text>
            <Text style={styles.subtitle}>
              Help us personalize your plan (optional)
            </Text>

            {/* Fitness Level */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Your current {exercise.name.toLowerCase()} level
              </Text>
              <View style={styles.levelsGrid}>
                {FITNESS_LEVELS.map((level) => (
                  <TouchableOpacity
                    key={level.id}
                    style={[
                      styles.levelCard,
                      fitnessLevel === level.id && styles.levelCardSelected,
                    ]}
                    onPress={() => setFitnessLevel(level.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.levelIcon}>{level.icon}</Text>
                    <Text style={styles.levelLabel}>{level.label}</Text>
                    <Text style={styles.levelDesc}>{level.description}</Text>
                    {fitnessLevel === level.id && (
                      <View style={styles.levelCheck}>
                        <Ionicons name="checkmark" size={14} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Max Reps */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Maximum {exercise.namePlural.toLowerCase()} in one set
              </Text>
              <Text style={styles.sectionSubtitle}>
                What's the most you can do right now without stopping?
              </Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 15"
                  placeholderTextColor={Colors.dark.textMuted}
                  keyboardType="number-pad"
                  value={maxReps}
                  onChangeText={setMaxReps}
                  maxLength={3}
                />
                <Text style={styles.inputSuffix}>reps</Text>
              </View>
              {maxReps && parseInt(maxReps, 10) > 0 && (
                <Text style={styles.inputHint}>
                  {parseInt(maxReps, 10) < 10 && 'No worries! Everyone starts somewhere.'}
                  {parseInt(maxReps, 10) >= 10 && parseInt(maxReps, 10) < 25 && 'Good foundation to build on!'}
                  {parseInt(maxReps, 10) >= 25 && parseInt(maxReps, 10) < 50 && 'Nice! You\'re on your way.'}
                  {parseInt(maxReps, 10) >= 50 && 'Impressive! Let\'s take it to the next level.'}
                </Text>
              )}
            </View>

            {/* Skip note */}
            <View style={styles.skipNote}>
              <Ionicons name="information-circle-outline" size={18} color={Colors.dark.textMuted} />
              <Text style={styles.skipNoteText}>
                You can skip these questions - we'll create a plan based on your intensity and timeline.
              </Text>
            </View>
          </Animated.View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
            disabled={saving}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>
              {saving ? 'Saving...' : 'Generate My Plan'}
            </Text>
            <Ionicons name="arrow-forward" size={20} color={Colors.dark.background} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
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
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark.text,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    marginBottom: 16,
  },
  levelsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  levelCard: {
    width: '47%',
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  levelCardSelected: {
    borderColor: Colors.dark.accent,
    backgroundColor: Colors.dark.surfaceLight,
  },
  levelIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  levelLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.dark.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  levelDesc: {
    fontSize: 12,
    color: Colors.dark.textMuted,
    textAlign: 'center',
  },
  levelCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.dark.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    paddingHorizontal: 20,
  },
  input: {
    flex: 1,
    paddingVertical: 18,
    fontSize: 24,
    fontWeight: '700',
    color: Colors.dark.text,
  },
  inputSuffix: {
    fontSize: 16,
    color: Colors.dark.textMuted,
    marginLeft: 8,
  },
  inputHint: {
    fontSize: 14,
    color: Colors.dark.accent,
    marginTop: 12,
    textAlign: 'center',
  },
  skipNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  skipNoteText: {
    flex: 1,
    fontSize: 13,
    color: Colors.dark.textMuted,
    lineHeight: 18,
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
  continueButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.dark.background,
  },
});


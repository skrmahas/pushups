import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Animated,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useStore } from '@/lib/store';
import { getOnboardingData, createWorkoutPlan } from '@/lib/workout-plan';
import { generateWeekPreview, getPlanSummary, generateWorkoutPlan, Timeline, Intensity } from '@/lib/plan-generator';
import { EXERCISES, ExerciseType } from '@/lib/exercises';

export default function PlanGenerationScreen() {
  const router = useRouter();
  const session = useStore((state) => state.session);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [planSummary, setPlanSummary] = useState<{
    totalWorkoutDays: number;
    totalRestDays: number;
    averageRepsPerDay: number;
    startingDailyReps: number;
    endingDailyReps: number;
  } | null>(null);
  const [weekPreview, setWeekPreview] = useState<any[]>([]);
  const [exerciseType, setExerciseType] = useState<ExerciseType>('pushups');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    generatePlan();
  }, []);

  const generatePlan = async () => {
    if (!session?.user?.id) {
      setError('User not authenticated');
      setLoading(false);
      return;
    }

    try {
      // Animate progress bar
      Animated.timing(progressAnim, {
        toValue: 50,
        duration: 1000,
        useNativeDriver: false,
      }).start();

      // Get onboarding data
      const data = await getOnboardingData(session.user.id);
      if (!data?.exerciseType) {
        setError('Please complete the previous steps first');
        setLoading(false);
        return;
      }

      setExerciseType(data.exerciseType);

      // Generate preview locally
      const localPlan = generateWorkoutPlan({
        exerciseType: data.exerciseType,
        intensity: data.intensity || 'intermediate',
        timelineMonths: (data.timelineMonths || 3) as Timeline,
        maxReps: data.maxReps,
        fitnessLevel: data.fitnessLevel as any,
      });

      const summary = getPlanSummary(localPlan);
      setPlanSummary(summary);
      setWeekPreview(localPlan.days.slice(0, 7));

      // Animate progress
      Animated.timing(progressAnim, {
        toValue: 80,
        duration: 500,
        useNativeDriver: false,
      }).start();

      // Create plan in database
      const planId = await createWorkoutPlan(
        session.user.id,
        data.exerciseType,
        data.intensity || 'intermediate',
        (data.timelineMonths || 3) as Timeline,
        data.maxReps
      );

      if (!planId) {
        setError('Failed to create workout plan. Please try again.');
        setLoading(false);
        return;
      }

      // Complete progress animation
      Animated.timing(progressAnim, {
        toValue: 100,
        duration: 300,
        useNativeDriver: false,
      }).start();

      // Show content
      setLoading(false);
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
      ]).start();

      // Navigate after a short delay
      setTimeout(() => {
        router.push('/(onboarding)/complete');
      }, 2500);

    } catch (err: any) {
      console.error('Error generating plan:', err);
      setError(err.message || 'Failed to generate plan');
      setLoading(false);
    }
  };

  const exercise = EXERCISES[exerciseType];

  return (
    <LinearGradient
      colors={['#1A1A1A', '#0D0D0D', '#0D0D0D']}
      style={styles.container}
    >
      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingIconContainer}>
              <Text style={styles.loadingIcon}>{exercise.icon}</Text>
            </View>
            <Text style={styles.loadingTitle}>Creating Your Plan</Text>
            <Text style={styles.loadingSubtitle}>
              Building a personalized workout journey just for you...
            </Text>
            
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    {
                      width: progressAnim.interpolate({
                        inputRange: [0, 100],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                />
              </View>
            </View>
            
            <ActivityIndicator size="large" color={Colors.dark.accent} style={styles.spinner} />
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={64} color="#EF4444" />
            <Text style={styles.errorTitle}>Oops!</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.resultContainer}>
            <Animated.View
              style={{
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }}
            >
              <View style={styles.successIcon}>
                <Ionicons name="checkmark-circle" size={80} color={Colors.dark.success} />
              </View>

              <Text style={styles.successTitle}>Plan Created!</Text>
              <Text style={styles.successSubtitle}>
                Your {exercise.namePlural.toLowerCase()} journey is ready
              </Text>

              {planSummary && (
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryTitle}>PLAN OVERVIEW</Text>
                  
                  <View style={styles.summaryGrid}>
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryValue}>{planSummary.totalWorkoutDays}</Text>
                      <Text style={styles.summaryLabel}>Workout Days</Text>
                    </View>
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryValue}>{planSummary.totalRestDays}</Text>
                      <Text style={styles.summaryLabel}>Rest Days</Text>
                    </View>
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryValue}>{planSummary.startingDailyReps}</Text>
                      <Text style={styles.summaryLabel}>Starting Reps</Text>
                    </View>
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryValue}>{planSummary.endingDailyReps}</Text>
                      <Text style={styles.summaryLabel}>Final Goal</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Week Preview */}
              <View style={styles.weekPreviewCard}>
                <Text style={styles.weekPreviewTitle}>FIRST WEEK PREVIEW</Text>
                <View style={styles.weekDays}>
                  {weekPreview.map((day, index) => (
                    <View
                      key={day.dayNumber}
                      style={[
                        styles.dayBadge,
                        day.isRestDay ? styles.restDayBadge : styles.workoutDayBadge,
                      ]}
                    >
                      <Text style={styles.dayNumber}>D{day.dayNumber}</Text>
                      <Text style={styles.dayReps}>
                        {day.isRestDay ? 'Rest' : day.targetTotalReps}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.redirectNote}>
                <ActivityIndicator size="small" color={Colors.dark.accent} />
                <Text style={styles.redirectText}>Taking you to your dashboard...</Text>
              </View>
            </Animated.View>
          </ScrollView>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.dark.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  loadingIcon: {
    fontSize: 48,
  },
  loadingTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.dark.text,
    marginBottom: 8,
  },
  loadingSubtitle: {
    fontSize: 16,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 32,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.dark.surface,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.dark.accent,
    borderRadius: 4,
  },
  spinner: {
    marginTop: 16,
  },
  errorContainer: {
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.dark.text,
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
  },
  resultContainer: {
    paddingVertical: 60,
  },
  successIcon: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.dark.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  summaryCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark.textMuted,
    letterSpacing: 1,
    marginBottom: 20,
    textAlign: 'center',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  summaryItem: {
    flex: 1,
    minWidth: '40%',
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.dark.accent,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.dark.textMuted,
    marginTop: 4,
  },
  weekPreviewCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  weekPreviewTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark.textMuted,
    letterSpacing: 1,
    marginBottom: 16,
    textAlign: 'center',
  },
  weekDays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayBadge: {
    width: 42,
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
  },
  workoutDayBadge: {
    backgroundColor: Colors.dark.accent + '20',
  },
  restDayBadge: {
    backgroundColor: Colors.dark.surfaceLight,
  },
  dayNumber: {
    fontSize: 10,
    color: Colors.dark.textMuted,
    marginBottom: 4,
  },
  dayReps: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.dark.text,
  },
  redirectNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  redirectText: {
    fontSize: 14,
    color: Colors.dark.textMuted,
  },
});


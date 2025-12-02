import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';

import DifficultySelector from '@/components/DifficultySelector';
import XPBar from '@/components/XPBar';
import XPGain from '@/components/XPGain';
import Colors from '@/constants/Colors';
import { saveWorkout } from '@/lib/database';
import { getProfile } from '@/lib/friends';
import { calculateXP, Difficulty, XPCalculation } from '@/lib/gamification';
import { useStore } from '@/lib/store';
import { ExerciseType, EXERCISES, getDifficultyConfig, getDefaultVariation } from '@/lib/exercises';
import { 
  getTodaysPlan, 
  advancePlanDay, 
  checkDailyGoalCompletion, 
  calculateDailyGoalBonus,
  DBPlanDay,
  DBWorkoutPlan,
} from '@/lib/workout-plan';

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export default function WorkoutScreen() {
  const {
    session,
    isWorkoutActive,
    isInSet,
    isResting,
    currentSetNumber,
    currentPushups,
    sets,
    setStartTime,
    restStartTime,
    workoutStartTime,
    startWorkout,
    startSet,
    endSet,
    finishWorkout,
    resetWorkout,
    incrementPushups,
    decrementPushups,
  } = useStore();

  const [activeTime, setActiveTime] = useState(0);
  const [restTime, setRestTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [saving, setSaving] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [variation, setVariation] = useState('standard');
  const [userLevel, setUserLevel] = useState(1);
  const [userXP, setUserXP] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [showDifficultyModal, setShowDifficultyModal] = useState(false);
  const [showXPGain, setShowXPGain] = useState(false);
  const [xpCalc, setXpCalc] = useState<XPCalculation | null>(null);
  
  // Workout plan state
  const [exerciseType, setExerciseType] = useState<ExerciseType>('pushups');
  const [todaysPlan, setTodaysPlan] = useState<DBPlanDay | null>(null);
  const [workoutPlan, setWorkoutPlan] = useState<DBWorkoutPlan | null>(null);
  const [currentPlanDay, setCurrentPlanDay] = useState(1);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;

  // Load user profile and workout plan
  useEffect(() => {
    const loadData = async () => {
      if (session?.user?.id) {
        const profile = await getProfile(session.user.id);
        if (profile) {
          setUserLevel(profile.level);
          setUserXP(profile.xp);
          setCurrentStreak(profile.current_streak);
          if (profile.exercise_type) {
            setExerciseType(profile.exercise_type as ExerciseType);
            // Set default variation for the exercise type
            const defaultVar = getDefaultVariation(profile.exercise_type as ExerciseType);
            setVariation(defaultVar.id);
          }
        }

        // Load today's plan
        const { planDay, plan, dayNumber } = await getTodaysPlan(session.user.id);
        setTodaysPlan(planDay);
        setWorkoutPlan(plan);
        setCurrentPlanDay(dayNumber);
      }
    };
    loadData();
  }, [session?.user?.id]);

  // Timer effects
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isInSet && setStartTime) {
      interval = setInterval(() => {
        setActiveTime(Math.floor((Date.now() - setStartTime) / 1000));
      }, 100);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isInSet, setStartTime]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isResting && restStartTime) {
      interval = setInterval(() => {
        setRestTime(Math.floor((Date.now() - restStartTime) / 1000));
      }, 100);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isResting, restStartTime]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isWorkoutActive && workoutStartTime) {
      interval = setInterval(() => {
        setTotalTime(Math.floor((Date.now() - workoutStartTime) / 1000));
      }, 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isWorkoutActive, workoutStartTime]);

  // Pulse animation for active state
  useEffect(() => {
    if (isInSet) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isInSet]);

  const animateButton = () => {
    Animated.sequence([
      Animated.timing(buttonScaleAnim, {
        toValue: 0.95,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScaleAnim, {
        toValue: 1,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleStartWorkout = () => {
    startWorkout();
    setActiveTime(0);
    setRestTime(0);
    setTotalTime(0);
  };

  const handleStartSet = () => {
    startSet();
    setActiveTime(0);
    Vibration.vibrate(50);
  };

  const handleEndSet = () => {
    if (currentPushups === 0) {
      Alert.alert('No Reps', `Please add at least 1 ${exercise.name.toLowerCase()} before ending the set.`);
      return;
    }
    endSet(currentPushups);
    setRestTime(0);
    Vibration.vibrate([0, 50, 50, 50]);
  };

  const handleFinishWorkout = async () => {
    if (sets.length === 0 && !isInSet) {
      Alert.alert('No Sets', 'Complete at least one set before finishing.');
      return;
    }

    // End current set if active
    if (isInSet && currentPushups > 0) {
      endSet(currentPushups);
    }

    Alert.alert(
      'Finish Workout',
      'Are you sure you want to finish this workout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Finish',
          onPress: async () => {
            setSaving(true);
            try {
              const { sets: finalSets, workoutStartTime: startTime } = finishWorkout();
              
              // Calculate XP for display (with variation multiplier)
              const totalReps = finalSets.reduce((sum, s) => sum + s.pushups, 0);
              const activeTimeSeconds = finalSets.reduce((sum, s) => sum + s.durationSeconds, 0);
              const pushupsPerMinute = activeTimeSeconds > 0 
                ? (totalReps / activeTimeSeconds) * 60 
                : 0;
              
              // Check if daily goal was completed
              const dailyGoalCompleted = checkDailyGoalCompletion(totalReps, todaysPlan);
              const dailyGoalBonus = dailyGoalCompleted 
                ? calculateDailyGoalBonus(difficulty, currentStreak, todaysPlan)
                : 0;
              
              const xpResult = calculateXP(totalReps, pushupsPerMinute, difficulty, currentStreak, variation);
              // Add daily goal bonus to the calculation
              const finalXpCalc = {
                ...xpResult,
                dailyGoalBonus,
                totalXP: xpResult.totalXP + dailyGoalBonus,
              };
              setXpCalc(finalXpCalc);
              
              let savedWorkout = null;
              if (session?.user?.id && startTime) {
                savedWorkout = await saveWorkout(
                  session.user.id, 
                  finalSets, 
                  startTime, 
                  difficulty, 
                  variation,
                  exerciseType,
                  dailyGoalCompleted,
                  dailyGoalBonus,
                  currentPlanDay
                );
                
                // Advance to next day if goal was completed
                if (dailyGoalCompleted && session?.user?.id) {
                  const nextDay = await advancePlanDay(session.user.id);
                  setCurrentPlanDay(nextDay);
                }
              }
              
              if (!savedWorkout) {
                Alert.alert(
                  'Save Failed', 
                  'Workout could not be saved. Please check your database setup and try again.',
                  [{ text: 'OK' }]
                );
              } else {
                // Show XP gain animation only if save succeeded
                setShowXPGain(true);
                
                // Refresh user profile to update level and unlocked variations
                if (session?.user?.id) {
                  const updatedProfile = await getProfile(session.user.id);
                  if (updatedProfile) {
                    setUserLevel(updatedProfile.level);
                    setUserXP(updatedProfile.xp);
                    setCurrentStreak(updatedProfile.current_streak);
                  }
                  
                  // Reload today's plan
                  const { planDay, plan, dayNumber } = await getTodaysPlan(session.user.id);
                  setTodaysPlan(planDay);
                  setWorkoutPlan(plan);
                  setCurrentPlanDay(dayNumber);
                }
              }
              
              resetWorkout();
              setActiveTime(0);
              setRestTime(0);
              setTotalTime(0);
              
            } catch (error: any) {
              console.error('Error saving workout:', error);
              Alert.alert('Error', `Failed to save workout: ${error?.message || 'Unknown error'}`);
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const handleIncrementPushups = () => {
    animateButton();
    incrementPushups();
    Vibration.vibrate(10);
  };

  const handleDecrementPushups = () => {
    animateButton();
    decrementPushups();
    Vibration.vibrate(10);
  };

  const exercise = EXERCISES[exerciseType];
  const totalReps = sets.reduce((sum, s) => sum + s.pushups, 0) + (isInSet ? currentPushups : 0);
  const dailyGoal = todaysPlan?.targetTotalReps || exercise.goal;
  const progress = Math.min((totalReps / dailyGoal) * 100, 100);
  const difficultyConfig = getDifficultyConfig(exerciseType, difficulty);

  // Preview XP calculation (with variation multiplier)
  const activeTimeSeconds = sets.reduce((sum, s) => sum + s.durationSeconds, 0) + activeTime;
  const previewPPM = activeTimeSeconds > 0 ? (totalReps / activeTimeSeconds) * 60 : 0;
  const previewXP = calculateXP(totalReps, previewPPM, difficulty, currentStreak, variation);
  const previewDailyBonus = checkDailyGoalCompletion(totalReps, todaysPlan) 
    ? calculateDailyGoalBonus(difficulty, currentStreak, todaysPlan) 
    : 0;

  // Rest day check
  if (todaysPlan?.is_rest_day) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.restDayContainer}>
          <View style={styles.restDayIcon}>
            <Ionicons name="bed" size={64} color={Colors.dark.accent} />
          </View>
          <Text style={styles.restDayTitle}>Rest Day</Text>
          <Text style={styles.restDaySubtitle}>
            Today is a scheduled rest day.{'\n'}
            Take it easy and let your muscles recover!
          </Text>
          
          <View style={styles.restDayInfo}>
            <Ionicons name="calendar" size={20} color={Colors.dark.textMuted} />
            <Text style={styles.restDayInfoText}>Day {currentPlanDay} of your plan</Text>
          </View>

          <View style={styles.restDayTips}>
            <Text style={styles.tipsTitle}>RECOVERY TIPS</Text>
            <Text style={styles.tipItem}>• Stay hydrated</Text>
            <Text style={styles.tipItem}>• Get enough sleep</Text>
            <Text style={styles.tipItem}>• Light stretching is okay</Text>
            <Text style={styles.tipItem}>• Come back stronger tomorrow!</Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (!isWorkoutActive) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.startContainer}>
          {/* XP Bar */}
          <View style={styles.xpBarContainer}>
            <XPBar xp={userXP} size="small" />
          </View>

          {/* Today's Goal */}
          <View style={styles.goalCard}>
            <View style={styles.goalHeader}>
              <Text style={styles.goalLabel}>TODAY'S GOAL</Text>
              {todaysPlan && (
                <View style={styles.dayBadge}>
                  <Text style={styles.dayBadgeText}>Day {currentPlanDay}</Text>
                </View>
              )}
            </View>
            <View style={styles.goalContent}>
              <Text style={styles.exerciseIcon}>{exercise.icon}</Text>
              <Text style={styles.goalNumber}>{dailyGoal}</Text>
              <Text style={styles.goalSubtext}>{exercise.namePlural.toLowerCase()}</Text>
            </View>
            
            {/* Recommended Sets */}
            {todaysPlan?.recommended_sets && todaysPlan.recommended_sets.length > 0 && (
              <View style={styles.recommendedSets}>
                <Text style={styles.recommendedLabel}>RECOMMENDED SETS</Text>
                <View style={styles.setsPreview}>
                  {todaysPlan.recommended_sets.map((reps, index) => (
                    <View key={index} style={styles.setPreviewBadge}>
                      <Text style={styles.setPreviewText}>{reps}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* Difficulty selector */}
          <TouchableOpacity
            style={[styles.difficultyBadge, { backgroundColor: difficultyConfig.color + '20', borderColor: difficultyConfig.color }]}
            onPress={() => setShowDifficultyModal(true)}
          >
            <Text style={[styles.difficultyBadgeText, { color: difficultyConfig.color }]}>
              {difficultyConfig.name} • {difficultyConfig.multiplier}x XP
            </Text>
            <Ionicons name="chevron-down" size={18} color={difficultyConfig.color} />
          </TouchableOpacity>

          {/* Start button */}
          <TouchableOpacity
            style={styles.startButton}
            onPress={handleStartWorkout}
            activeOpacity={0.8}
          >
            <View style={[styles.startButtonInner, { backgroundColor: exercise.accentColor }]}>
              <FontAwesome5 name="play" size={32} color={Colors.dark.background} />
            </View>
            <Text style={styles.startButtonText}>START WORKOUT</Text>
          </TouchableOpacity>

          {/* Tips */}
          <View style={styles.tipsContainer}>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={20} color={exercise.accentColor} />
              <Text style={styles.tipText}>Tap counter during {exercise.namePlural.toLowerCase()}</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={20} color={exercise.accentColor} />
              <Text style={styles.tipText}>Rest tracked automatically</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={20} color={exercise.accentColor} />
              <Text style={styles.tipText}>Complete daily goal for bonus XP!</Text>
            </View>
          </View>
        </ScrollView>

        {/* Difficulty Modal */}
        <Modal visible={showDifficultyModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>SELECT DIFFICULTY</Text>
                <TouchableOpacity onPress={() => setShowDifficultyModal(false)}>
                  <Ionicons name="close" size={28} color={Colors.dark.text} />
                </TouchableOpacity>
              </View>
              <DifficultySelector
                selectedDifficulty={difficulty}
                selectedVariation={variation}
                userLevel={userLevel}
                exerciseType={exerciseType}
                onSelectDifficulty={setDifficulty}
                onSelectVariation={setVariation}
              />
              <TouchableOpacity
                style={styles.modalDoneButton}
                onPress={() => setShowDifficultyModal(false)}
              >
                <Text style={styles.modalDoneText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* XP Gain Animation */}
        <XPGain
          visible={showXPGain}
          xpCalc={xpCalc}
          onClose={() => {
            setShowXPGain(false);
            setXpCalc(null);
          }}
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* XP Preview */}
      <View style={styles.xpPreview}>
        <Ionicons name="star" size={16} color={Colors.dark.warning} />
        <Text style={styles.xpPreviewText}>
          +{previewXP.totalXP + previewDailyBonus} XP
          {previewDailyBonus > 0 && ' (includes daily bonus!)'}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: exercise.accentColor }]} />
        </View>
        <View style={styles.progressTextContainer}>
          <Text style={styles.progressText}>{totalReps} / {dailyGoal}</Text>
          {totalReps >= dailyGoal && (
            <View style={styles.goalCompletedBadge}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.dark.success} />
              <Text style={styles.goalCompletedText}>Daily Goal Complete!</Text>
            </View>
          )}
        </View>
      </View>

      {/* Main counter */}
      <Animated.View 
        style={[
          styles.counterContainer,
          { transform: [{ scale: pulseAnim }] },
          isInSet && { borderColor: exercise.accentColor },
          isResting && styles.counterResting,
        ]}
      >
        <Text style={styles.counterLabel}>
          {isInSet ? 'CURRENT SET' : isResting ? 'RESTING' : 'READY'}
        </Text>
        
        {isInSet ? (
          <>
            <View style={styles.pushupCounter}>
              <TouchableOpacity
                style={styles.counterButton}
                onPress={handleDecrementPushups}
              >
                <FontAwesome5 name="minus" size={24} color={Colors.dark.textMuted} />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.counterNumberContainer}
                onPress={handleIncrementPushups}
                activeOpacity={0.7}
              >
                <Animated.Text 
                  style={[
                    styles.counterNumber,
                    { transform: [{ scale: buttonScaleAnim }] }
                  ]}
                >
                  {currentPushups}
                </Animated.Text>
                <Text style={styles.tapHint}>TAP TO ADD</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.counterButton}
                onPress={handleIncrementPushups}
              >
                <FontAwesome5 name="plus" size={24} color={exercise.accentColor} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.timerText, { color: exercise.accentColor }]}>{formatTime(activeTime)}</Text>
          </>
        ) : isResting ? (
          <>
            <Text style={styles.restTime}>{formatTime(restTime)}</Text>
            <Text style={styles.restLabel}>REST TIME</Text>
          </>
        ) : (
          <Text style={styles.readyText}>Tap Start Set</Text>
        )}
      </Animated.View>

      {/* Action buttons */}
      <View style={styles.actionButtons}>
        {!isInSet ? (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: exercise.accentColor }]}
            onPress={handleStartSet}
            activeOpacity={0.8}
          >
            <FontAwesome5 name="play" size={20} color={Colors.dark.background} />
            <Text style={styles.actionButtonText}>START SET</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, styles.endSetButton]}
            onPress={handleEndSet}
            activeOpacity={0.8}
          >
            <FontAwesome5 name="stop" size={20} color={Colors.dark.text} />
            <Text style={[styles.actionButtonText, styles.endSetButtonText]}>END SET</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Stats */}
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{sets.length + (isInSet ? 1 : 0)}</Text>
          <Text style={styles.statLabel}>SETS</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalReps}</Text>
          <Text style={styles.statLabel}>TOTAL</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatTime(totalTime)}</Text>
          <Text style={styles.statLabel}>TIME</Text>
        </View>
      </View>

      {/* Set history */}
      {sets.length > 0 && (
        <View style={styles.setHistory}>
          <Text style={styles.setHistoryTitle}>COMPLETED SETS</Text>
          {sets.map((set, index) => (
            <View key={index} style={styles.setItem}>
              <Text style={styles.setNumber}>Set {set.setNumber}</Text>
              <Text style={styles.setDetails}>
                {set.pushups} reps • {formatTime(set.durationSeconds)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Finish button */}
      <TouchableOpacity
        style={styles.finishButton}
        onPress={handleFinishWorkout}
        disabled={saving}
        activeOpacity={0.8}
      >
        <Ionicons name="checkmark-circle" size={24} color={Colors.dark.success} />
        <Text style={styles.finishButtonText}>
          {saving ? 'SAVING...' : 'FINISH WORKOUT'}
        </Text>
      </TouchableOpacity>

      {/* XP Gain Animation */}
      <XPGain
        visible={showXPGain}
        xpCalc={xpCalc}
        onClose={() => {
          setShowXPGain(false);
          setXpCalc(null);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  startContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  restDayContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  restDayIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.dark.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  restDayTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.dark.text,
    marginBottom: 12,
  },
  restDaySubtitle: {
    fontSize: 16,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  restDayInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 32,
  },
  restDayInfoText: {
    fontSize: 14,
    color: Colors.dark.textMuted,
  },
  restDayTips: {
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
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  xpBarContainer: {
    width: '100%',
    marginBottom: 24,
  },
  goalCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
    maxWidth: 320,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  goalLabel: {
    fontSize: 12,
    color: Colors.dark.textMuted,
    letterSpacing: 2,
  },
  dayBadge: {
    backgroundColor: Colors.dark.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dayBadgeText: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    fontWeight: '600',
  },
  goalContent: {
    alignItems: 'center',
  },
  exerciseIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  goalNumber: {
    fontSize: 72,
    fontWeight: '800',
    color: Colors.dark.accent,
  },
  goalSubtext: {
    fontSize: 18,
    color: Colors.dark.textSecondary,
    letterSpacing: 1,
  },
  recommendedSets: {
    width: '100%',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  recommendedLabel: {
    fontSize: 11,
    color: Colors.dark.textMuted,
    letterSpacing: 1,
    marginBottom: 12,
    textAlign: 'center',
  },
  setsPreview: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  setPreviewBadge: {
    backgroundColor: Colors.dark.surfaceLight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  setPreviewText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark.text,
  },
  difficultyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 32,
    gap: 8,
  },
  difficultyBadgeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  startButton: {
    alignItems: 'center',
    marginBottom: 48,
  },
  startButtonInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: Colors.dark.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark.text,
    letterSpacing: 2,
  },
  tipsContainer: {
    gap: 12,
  },
  tipText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.dark.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark.text,
    letterSpacing: 1,
  },
  modalDoneButton: {
    backgroundColor: Colors.dark.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalDoneText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark.background,
  },
  xpPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'center',
  },
  xpPreviewText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.dark.warning,
  },
  progressContainer: {
    marginBottom: 24,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.dark.surface,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressTextContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  goalCompletedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  goalCompletedText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark.success,
  },
  counterContainer: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  counterResting: {
    borderColor: Colors.dark.warning,
  },
  counterLabel: {
    fontSize: 12,
    color: Colors.dark.textMuted,
    letterSpacing: 2,
    marginBottom: 16,
  },
  pushupCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  counterButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.dark.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterNumberContainer: {
    alignItems: 'center',
  },
  counterNumber: {
    fontSize: 72,
    fontWeight: '800',
    color: Colors.dark.text,
  },
  tapHint: {
    fontSize: 10,
    color: Colors.dark.textMuted,
    letterSpacing: 1,
    marginTop: 4,
  },
  timerText: {
    fontSize: 24,
    fontWeight: '600',
    marginTop: 16,
  },
  restTime: {
    fontSize: 64,
    fontWeight: '700',
    color: Colors.dark.warning,
  },
  restLabel: {
    fontSize: 14,
    color: Colors.dark.textMuted,
    letterSpacing: 1,
    marginTop: 8,
  },
  readyText: {
    fontSize: 24,
    color: Colors.dark.textMuted,
  },
  actionButtons: {
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 12,
  },
  endSetButton: {
    backgroundColor: Colors.dark.surfaceLight,
    borderWidth: 2,
    borderColor: Colors.dark.border,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark.background,
    letterSpacing: 1,
  },
  endSetButtonText: {
    color: Colors.dark.text,
  },
  statsGrid: {
    flexDirection: 'row',
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.dark.text,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.dark.textMuted,
    letterSpacing: 1,
    marginTop: 4,
  },
  setHistory: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  setHistoryTitle: {
    fontSize: 12,
    color: Colors.dark.textMuted,
    letterSpacing: 1,
    marginBottom: 12,
  },
  setItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  setNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  setDetails: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  finishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    backgroundColor: Colors.dark.surface,
    borderWidth: 2,
    borderColor: Colors.dark.success,
    gap: 12,
  },
  finishButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark.success,
    letterSpacing: 1,
  },
});

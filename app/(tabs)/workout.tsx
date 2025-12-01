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
import { calculateXP, DIFFICULTIES, Difficulty, XPCalculation } from '@/lib/gamification';
import { useStore } from '@/lib/store';

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

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;

  // Load user profile
  useEffect(() => {
    const loadProfile = async () => {
      if (session?.user?.id) {
        const profile = await getProfile(session.user.id);
        if (profile) {
          setUserLevel(profile.level);
          setUserXP(profile.xp);
          setCurrentStreak(profile.current_streak);
        }
      }
    };
    loadProfile();
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
      Alert.alert('No Pushups', 'Please add at least 1 pushup before ending the set.');
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
              const totalPushups = finalSets.reduce((sum, s) => sum + s.pushups, 0);
              const activeTimeSeconds = finalSets.reduce((sum, s) => sum + s.durationSeconds, 0);
              const pushupsPerMinute = activeTimeSeconds > 0 
                ? (totalPushups / activeTimeSeconds) * 60 
                : 0;
              
              const xpResult = calculateXP(totalPushups, pushupsPerMinute, difficulty, currentStreak, variation);
              setXpCalc(xpResult);
              
              let savedWorkout = null;
              if (session?.user?.id && startTime) {
                savedWorkout = await saveWorkout(session.user.id, finalSets, startTime, difficulty, variation);
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

  const totalPushups = sets.reduce((sum, s) => sum + s.pushups, 0) + (isInSet ? currentPushups : 0);
  const progress = Math.min((totalPushups / 100) * 100, 100);
  const difficultyConfig = DIFFICULTIES[difficulty];

  // Preview XP calculation (with variation multiplier)
  const activeTimeSeconds = sets.reduce((sum, s) => sum + s.durationSeconds, 0) + activeTime;
  const previewPPM = activeTimeSeconds > 0 ? (totalPushups / activeTimeSeconds) * 60 : 0;
  const previewXP = calculateXP(totalPushups, previewPPM, difficulty, currentStreak, variation);

  if (!isWorkoutActive) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.startContainer}>
          {/* XP Bar */}
          <View style={styles.xpBarContainer}>
            <XPBar xp={userXP} size="small" />
          </View>

          {/* Goal indicator */}
          <View style={styles.goalCard}>
            <Text style={styles.goalLabel}>TODAY'S GOAL</Text>
            <Text style={styles.goalNumber}>100</Text>
            <Text style={styles.goalSubtext}>pushups</Text>
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
            <View style={styles.startButtonInner}>
              <FontAwesome5 name="play" size={32} color={Colors.dark.background} />
            </View>
            <Text style={styles.startButtonText}>START WORKOUT</Text>
          </TouchableOpacity>

          {/* Tips */}
          <View style={styles.tipsContainer}>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.dark.accent} />
              <Text style={styles.tipText}>Tap counter during pushups</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.dark.accent} />
              <Text style={styles.tipText}>Rest tracked automatically</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.dark.accent} />
              <Text style={styles.tipText}>Earn XP & level up!</Text>
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
        <Text style={styles.xpPreviewText}>+{previewXP.totalXP} XP</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>{totalPushups} / 100</Text>
      </View>

      {/* Main counter */}
      <Animated.View 
        style={[
          styles.counterContainer,
          { transform: [{ scale: pulseAnim }] },
          isInSet && styles.counterActive,
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
                <FontAwesome5 name="plus" size={24} color={Colors.dark.accent} />
              </TouchableOpacity>
            </View>
            <Text style={styles.timerText}>{formatTime(activeTime)}</Text>
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
            style={[styles.actionButton, styles.startSetButton]}
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
          <Text style={styles.statValue}>{totalPushups}</Text>
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
  xpBarContainer: {
    width: '100%',
    marginBottom: 24,
  },
  goalCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
    maxWidth: 280,
  },
  goalLabel: {
    fontSize: 12,
    color: Colors.dark.textMuted,
    letterSpacing: 2,
    marginBottom: 8,
  },
  goalNumber: {
    fontSize: 80,
    fontWeight: '800',
    color: Colors.dark.accent,
  },
  goalSubtext: {
    fontSize: 18,
    color: Colors.dark.textSecondary,
    letterSpacing: 1,
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
    backgroundColor: Colors.dark.accent,
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
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
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
    backgroundColor: Colors.dark.accent,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    textAlign: 'right',
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
  counterActive: {
    borderColor: Colors.dark.accent,
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
    color: Colors.dark.accent,
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
  startSetButton: {
    backgroundColor: Colors.dark.accent,
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

import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useStore } from '@/lib/store';
import { getWorkouts, getWorkoutSets } from '@/lib/database';
import { Workout, WorkoutSet } from '@/lib/supabase';
import { EXERCISES, ExerciseType } from '@/lib/exercises';
import Colors from '@/constants/Colors';

interface WorkoutWithSets extends Workout {
  sets?: WorkoutSet[];
  expanded?: boolean;
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
};

const formatFullTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

export default function HistoryScreen() {
  const router = useRouter();
  const session = useStore((state) => state.session);
  const [workouts, setWorkouts] = useState<WorkoutWithSets[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWorkouts = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const data = await getWorkouts(session.user.id);
      setWorkouts(data.map((w) => ({ ...w, expanded: false })));
    } catch (error) {
      console.error('Error fetching workouts:', error);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    fetchWorkouts();
  }, [fetchWorkouts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchWorkouts();
    setRefreshing(false);
  }, [fetchWorkouts]);

  const toggleExpand = async (workoutId: string) => {
    const workoutIndex = workouts.findIndex((w) => w.id === workoutId);
    if (workoutIndex === -1) return;

    const workout = workouts[workoutIndex];

    // Load sets if not already loaded
    if (!workout.sets) {
      const sets = await getWorkoutSets(workoutId);
      workout.sets = sets;
    }

    const newWorkouts = [...workouts];
    newWorkouts[workoutIndex] = { ...workout, expanded: !workout.expanded };
    setWorkouts(newWorkouts);
  };

  const renderWorkoutItem = ({ item }: { item: WorkoutWithSets }) => {
    const exerciseType = (item.exercise_type || 'pushups') as ExerciseType;
    const exercise = EXERCISES[exerciseType];
    const reachedDailyGoal = item.is_daily_goal_completed;

    return (
      <TouchableOpacity
        style={styles.workoutCard}
        onPress={() => toggleExpand(item.id)}
        activeOpacity={0.8}
      >
        {/* Header */}
        <View style={styles.workoutHeader}>
          <View style={styles.dateContainer}>
            <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
            <Text style={styles.timeText}>{formatFullTime(item.created_at)}</Text>
          </View>
          <View style={styles.headerRight}>
            {reachedDailyGoal && (
              <View style={styles.goalBadge}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.dark.success} />
              </View>
            )}
            <Ionicons
              name={item.expanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={Colors.dark.textMuted}
            />
          </View>
        </View>

        {/* Main stats */}
        <View style={styles.mainStats}>
          <View style={[styles.iconContainer, { backgroundColor: exercise.accentColor + '20' }]}>
            <Text style={styles.exerciseIcon}>{exercise.icon}</Text>
          </View>
          
          <View style={styles.statColumn}>
            <Text style={[styles.repsNumber, { color: exercise.accentColor }]}>
              {item.total_pushups}
            </Text>
            <Text style={styles.repsLabel}>{exercise.namePlural}</Text>
          </View>
          
          <View style={styles.secondaryStats}>
            <View style={styles.statRow}>
              <Ionicons name="time-outline" size={14} color={Colors.dark.textMuted} />
              <Text style={styles.statText}>{formatTime(item.total_time_seconds)}</Text>
            </View>
            <View style={styles.statRow}>
              <Ionicons name="speedometer-outline" size={14} color={Colors.dark.textMuted} />
              <Text style={styles.statText}>{item.pushups_per_minute.toFixed(1)}/min</Text>
            </View>
          </View>
        </View>

        {/* XP and badges row */}
        <View style={styles.badgesRow}>
          <View style={styles.xpBadge}>
            <Ionicons name="star" size={14} color={Colors.dark.warning} />
            <Text style={styles.xpText}>+{item.xp_earned} XP</Text>
          </View>
          
          {item.difficulty !== 'normal' && (
            <View style={styles.difficultyBadge}>
              <Text style={styles.difficultyText}>{item.difficulty}</Text>
            </View>
          )}

          {item.daily_goal_bonus_xp && item.daily_goal_bonus_xp > 0 && (
            <View style={styles.bonusBadge}>
              <Text style={styles.bonusText}>+{item.daily_goal_bonus_xp} bonus</Text>
            </View>
          )}
        </View>

        {/* Expanded sets */}
        {item.expanded && item.sets && (
          <View style={styles.setsContainer}>
            <View style={styles.setsDivider} />
            <Text style={styles.setsTitle}>SETS BREAKDOWN</Text>
            {item.sets.map((set, index) => (
              <View key={set.id} style={styles.setItem}>
                <View style={styles.setLeft}>
                  <View style={styles.setNumber}>
                    <Text style={styles.setNumberText}>{set.set_number}</Text>
                  </View>
                  <View>
                    <Text style={styles.setReps}>{set.pushups} reps</Text>
                    <Text style={styles.setDuration}>{formatTime(set.duration_seconds)}</Text>
                  </View>
                </View>
                {set.rest_after_seconds > 0 && (
                  <Text style={styles.restTime}>Rest: {formatTime(set.rest_after_seconds)}</Text>
                )}
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.dark.accent} />
      </View>
    );
  }

  if (workouts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIcon}>
          <Ionicons name="calendar-outline" size={64} color={Colors.dark.textMuted} />
        </View>
        <Text style={styles.emptyTitle}>No Workouts Yet</Text>
        <Text style={styles.emptyText}>
          Complete your first workout to see it here
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={workouts}
        renderItem={renderWorkoutItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.dark.accent}
            colors={[Colors.dark.accent]}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.dark.background,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.dark.background,
    padding: 32,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.dark.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.dark.text,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  workoutCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  timeText: {
    fontSize: 13,
    color: Colors.dark.textMuted,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  goalBadge: {
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    padding: 4,
    borderRadius: 8,
  },
  mainStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  exerciseIcon: {
    fontSize: 24,
  },
  statColumn: {
    flex: 1,
  },
  repsNumber: {
    fontSize: 32,
    fontWeight: '800',
  },
  repsLabel: {
    fontSize: 12,
    color: Colors.dark.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  secondaryStats: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  xpText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark.warning,
  },
  difficultyBadge: {
    backgroundColor: Colors.dark.surfaceLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark.textSecondary,
    textTransform: 'capitalize',
  },
  bonusBadge: {
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bonusText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark.success,
  },
  setsContainer: {
    marginTop: 16,
  },
  setsDivider: {
    height: 1,
    backgroundColor: Colors.dark.border,
    marginBottom: 16,
  },
  setsTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.dark.textMuted,
    letterSpacing: 1,
    marginBottom: 12,
  },
  setItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  setLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  setNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.dark.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  setNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.dark.textSecondary,
  },
  setReps: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  setDuration: {
    fontSize: 12,
    color: Colors.dark.textMuted,
  },
  restTime: {
    fontSize: 12,
    color: Colors.dark.textMuted,
  },
});

import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';

import { useStore } from '@/lib/store';
import { getWorkouts, getWorkoutSets } from '@/lib/database';
import { Workout, WorkoutSet } from '@/lib/supabase';
import Colors from '@/constants/Colors';

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }
};

const formatFullDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

interface WorkoutItemProps {
  workout: Workout;
  isExpanded: boolean;
  onToggle: () => void;
  sets: WorkoutSet[];
  loadingSets: boolean;
}

function WorkoutItem({ workout, isExpanded, onToggle, sets, loadingSets }: WorkoutItemProps) {
  const rotateAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(rotateAnim, {
      toValue: isExpanded ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isExpanded]);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const reachedGoal = workout.total_pushups >= 100;

  return (
    <View style={styles.workoutCard}>
      <TouchableOpacity
        style={styles.workoutHeader}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={styles.workoutHeaderLeft}>
          <View style={[styles.workoutIcon, reachedGoal && styles.workoutIconSuccess]}>
            {reachedGoal ? (
              <Ionicons name="trophy" size={20} color={Colors.dark.warning} />
            ) : (
              <FontAwesome5 name="dumbbell" size={16} color={Colors.dark.accent} />
            )}
          </View>
          <View>
            <Text style={styles.workoutDate}>{formatDate(workout.created_at)}</Text>
            <Text style={styles.workoutTime}>{formatFullDate(workout.created_at)}</Text>
          </View>
        </View>
        
        <View style={styles.workoutHeaderRight}>
          <View style={styles.workoutPushups}>
            <Text style={[styles.workoutPushupsNumber, reachedGoal && styles.goalReached]}>
              {workout.total_pushups}
            </Text>
            <Text style={styles.workoutPushupsLabel}>pushups</Text>
          </View>
          <Animated.View style={{ transform: [{ rotate: rotation }] }}>
            <Ionicons name="chevron-down" size={24} color={Colors.dark.textMuted} />
          </Animated.View>
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.workoutDetails}>
          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statBoxValue}>{formatTime(workout.total_time_seconds)}</Text>
              <Text style={styles.statBoxLabel}>Total Time</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statBoxValue}>{formatTime(workout.active_time_seconds)}</Text>
              <Text style={styles.statBoxLabel}>Active Time</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statBoxValue}>{workout.pushups_per_minute.toFixed(1)}</Text>
              <Text style={styles.statBoxLabel}>Pushups/min</Text>
            </View>
          </View>

          {/* Rest stats */}
          <View style={styles.restStats}>
            <View style={styles.restStatItem}>
              <Ionicons name="pause-circle-outline" size={18} color={Colors.dark.textMuted} />
              <Text style={styles.restStatText}>
                Rest Time: {formatTime(workout.rest_time_seconds)}
              </Text>
            </View>
          </View>

          {/* Sets breakdown */}
          <View style={styles.setsContainer}>
            <Text style={styles.setsTitle}>SETS BREAKDOWN</Text>
            {loadingSets ? (
              <ActivityIndicator color={Colors.dark.accent} style={{ marginVertical: 16 }} />
            ) : sets.length > 0 ? (
              sets.map((set, index) => (
                <View key={set.id} style={styles.setRow}>
                  <View style={styles.setRowLeft}>
                    <View style={styles.setNumberBadge}>
                      <Text style={styles.setNumberText}>{set.set_number}</Text>
                    </View>
                    <Text style={styles.setReps}>{set.pushups} reps</Text>
                  </View>
                  <View style={styles.setRowRight}>
                    <Text style={styles.setDuration}>{formatTime(set.duration_seconds)}</Text>
                    {set.rest_after_seconds > 0 && (
                      <Text style={styles.setRest}>+{set.rest_after_seconds}s rest</Text>
                    )}
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.noSetsText}>No set details available</Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

export default function HistoryScreen() {
  const session = useStore((state) => state.session);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [workoutSets, setWorkoutSets] = useState<Record<string, WorkoutSet[]>>({});
  const [loadingSets, setLoadingSets] = useState<string | null>(null);

  const fetchWorkouts = useCallback(async () => {
    if (!session?.user?.id) return;
    
    try {
      const data = await getWorkouts(session.user.id);
      setWorkouts(data);
    } catch (error) {
      console.error('Error fetching workouts:', error);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchWorkouts();
      setLoading(false);
    };
    loadData();
  }, [fetchWorkouts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchWorkouts();
    setRefreshing(false);
  }, [fetchWorkouts]);

  const handleToggleExpand = async (workoutId: string) => {
    if (expandedId === workoutId) {
      setExpandedId(null);
    } else {
      setExpandedId(workoutId);
      
      if (!workoutSets[workoutId]) {
        setLoadingSets(workoutId);
        try {
          const sets = await getWorkoutSets(workoutId);
          setWorkoutSets((prev) => ({ ...prev, [workoutId]: sets }));
        } catch (error) {
          console.error('Error fetching sets:', error);
        }
        setLoadingSets(null);
      }
    }
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
          <Ionicons name="fitness-outline" size={64} color={Colors.dark.textMuted} />
        </View>
        <Text style={styles.emptyTitle}>No Workouts Yet</Text>
        <Text style={styles.emptyText}>
          Complete your first workout to see{'\n'}your history here
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={workouts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <WorkoutItem
            workout={item}
            isExpanded={expandedId === item.id}
            onToggle={() => handleToggleExpand(item.id)}
            sets={workoutSets[item.id] || []}
            loadingSets={loadingSets === item.id}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.dark.accent}
            colors={[Colors.dark.accent]}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
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
  listContent: {
    padding: 16,
  },
  workoutCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  workoutHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  workoutIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.dark.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  workoutIconSuccess: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
  },
  workoutDate: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  workoutTime: {
    fontSize: 13,
    color: Colors.dark.textMuted,
    marginTop: 2,
  },
  workoutHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  workoutPushups: {
    alignItems: 'flex-end',
  },
  workoutPushupsNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.dark.accent,
  },
  goalReached: {
    color: Colors.dark.warning,
  },
  workoutPushupsLabel: {
    fontSize: 11,
    color: Colors.dark.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  workoutDetails: {
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.dark.surfaceLight,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statBoxValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark.text,
  },
  statBoxLabel: {
    fontSize: 10,
    color: Colors.dark.textMuted,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  restStats: {
    marginBottom: 16,
  },
  restStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  restStatText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  setsContainer: {
    backgroundColor: Colors.dark.surfaceLight,
    borderRadius: 12,
    padding: 12,
  },
  setsTitle: {
    fontSize: 11,
    color: Colors.dark.textMuted,
    letterSpacing: 1,
    marginBottom: 12,
  },
  setRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  setRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  setNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.dark.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  setNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.dark.accent,
  },
  setReps: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  setRowRight: {
    alignItems: 'flex-end',
  },
  setDuration: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  setRest: {
    fontSize: 12,
    color: Colors.dark.textMuted,
    marginTop: 2,
  },
  noSetsText: {
    fontSize: 14,
    color: Colors.dark.textMuted,
    textAlign: 'center',
    paddingVertical: 16,
  },
});


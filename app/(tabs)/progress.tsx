import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';

import { useStore } from '@/lib/store';
import { getWorkouts, getWorkoutStats, getWorkoutSets } from '@/lib/database';
import { Workout } from '@/lib/supabase';
import { getPlanProgress, getTodaysPlan } from '@/lib/workout-plan';
import { EXERCISES, ExerciseType } from '@/lib/exercises';
import Colors from '@/constants/Colors';

const screenWidth = Dimensions.get('window').width;

interface Stats {
  totalWorkouts: number;
  bestSession: number;
  averagePushups: number;
  averageRestTime: number;
  currentStreak: number;
  maxPushupsInOneSet: number;
}

interface PlanProgressData {
  currentDay: number;
  totalDays: number;
  percentComplete: number;
  workoutsCompleted: number;
  daysRemaining: number;
  isOnTrack: boolean;
}

const chartConfig = {
  backgroundColor: Colors.dark.surface,
  backgroundGradientFrom: Colors.dark.surface,
  backgroundGradientTo: Colors.dark.surface,
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(255, 107, 53, ${opacity})`,
  labelColor: () => Colors.dark.textMuted,
  style: {
    borderRadius: 16,
  },
  propsForDots: {
    r: '4',
    strokeWidth: '2',
    stroke: Colors.dark.accent,
  },
  propsForBackgroundLines: {
    strokeDasharray: '',
    stroke: Colors.dark.border,
    strokeWidth: 1,
  },
};

function StatCard({
  icon,
  iconType = 'ionicons',
  label,
  value,
  subtext,
  highlight = false,
}: {
  icon: string;
  iconType?: 'ionicons' | 'fontawesome';
  label: string;
  value: string | number;
  subtext?: string;
  highlight?: boolean;
}) {
  return (
    <View style={[styles.statCard, highlight && styles.statCardHighlight]}>
      <View style={[styles.statIconContainer, highlight && styles.statIconHighlight]}>
        {iconType === 'fontawesome' ? (
          <FontAwesome5
            name={icon}
            size={20}
            color={highlight ? Colors.dark.warning : Colors.dark.accent}
          />
        ) : (
          <Ionicons
            name={icon as any}
            size={24}
            color={highlight ? Colors.dark.warning : Colors.dark.accent}
          />
        )}
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, highlight && styles.statValueHighlight]}>{value}</Text>
      {subtext && <Text style={styles.statSubtext}>{subtext}</Text>}
    </View>
  );
}

function PlanProgressCard({ progress, exerciseType }: { progress: PlanProgressData; exerciseType: ExerciseType }) {
  const exercise = EXERCISES[exerciseType];

  return (
    <View style={styles.planProgressContainer}>
      <View style={styles.planProgressHeader}>
        <View style={styles.planTitleContainer}>
          <Text style={styles.exerciseIcon}>{exercise.icon}</Text>
          <View>
            <Text style={styles.planTitle}>YOUR JOURNEY</Text>
            <Text style={styles.planSubtitle}>
              Day {progress.currentDay} of {progress.totalDays}
            </Text>
          </View>
        </View>
        {progress.isOnTrack ? (
          <View style={styles.onTrackBadge}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.dark.success} />
            <Text style={styles.onTrackText}>On Track</Text>
          </View>
        ) : (
          <View style={styles.behindBadge}>
            <Ionicons name="alert-circle" size={16} color={Colors.dark.warning} />
            <Text style={styles.behindText}>Catch Up!</Text>
          </View>
        )}
      </View>

      <View style={styles.progressBarContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${progress.percentComplete}%`, backgroundColor: exercise.accentColor },
            ]}
          />
        </View>
        <Text style={styles.progressPercent}>{progress.percentComplete}%</Text>
      </View>

      <View style={styles.planStatsRow}>
        <View style={styles.planStatItem}>
          <Text style={styles.planStatValue}>{progress.workoutsCompleted}</Text>
          <Text style={styles.planStatLabel}>Workouts</Text>
        </View>
        <View style={styles.planStatDivider} />
        <View style={styles.planStatItem}>
          <Text style={styles.planStatValue}>{progress.daysRemaining}</Text>
          <Text style={styles.planStatLabel}>Days Left</Text>
        </View>
      </View>
    </View>
  );
}

function DailyGoalProgress({ 
  todaysGoal, 
  completedToday, 
  exerciseType 
}: { 
  todaysGoal: number; 
  completedToday: number;
  exerciseType: ExerciseType;
}) {
  const exercise = EXERCISES[exerciseType];
  const progress = Math.min((completedToday / todaysGoal) * 100, 100);
  const isComplete = completedToday >= todaysGoal;

  return (
    <View style={styles.dailyGoalContainer}>
      <View style={styles.dailyGoalHeader}>
        <View style={styles.dailyGoalTitleContainer}>
          {isComplete ? (
            <Ionicons name="checkmark-circle" size={24} color={Colors.dark.success} />
          ) : (
            <Ionicons name="flag" size={24} color={exercise.accentColor} />
          )}
          <Text style={styles.dailyGoalTitle}>
            {isComplete ? "TODAY'S GOAL COMPLETE!" : "TODAY'S GOAL"}
          </Text>
        </View>
        <Text style={styles.dailyGoalProgress}>{completedToday} / {todaysGoal}</Text>
      </View>

      <View style={styles.dailyGoalBarContainer}>
        <View style={styles.dailyGoalBar}>
          <View
            style={[
              styles.dailyGoalBarFill,
              { width: `${progress}%` },
              isComplete && styles.dailyGoalBarComplete,
            ]}
          />
        </View>
      </View>

      <Text style={styles.dailyGoalDescription}>
        {isComplete
          ? `Great job! You've completed your daily ${exercise.namePlural.toLowerCase()} goal! +Bonus XP earned!`
          : `${todaysGoal - completedToday} more ${exercise.namePlural.toLowerCase()} to reach today's goal`}
      </Text>
    </View>
  );
}

export default function ProgressScreen() {
  const session = useStore((state) => state.session);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [planProgress, setPlanProgress] = useState<PlanProgressData | null>(null);
  const [exerciseType, setExerciseType] = useState<ExerciseType>('pushups');
  const [todaysGoal, setTodaysGoal] = useState(100);
  const [completedToday, setCompletedToday] = useState(0);

  const fetchData = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const [workoutsData, statsData, progressData, todayData] = await Promise.all([
        getWorkouts(session.user.id),
        getWorkoutStats(session.user.id),
        getPlanProgress(session.user.id),
        getTodaysPlan(session.user.id),
      ]);
      
      setWorkouts(workoutsData);
      setStats(statsData);
      setPlanProgress(progressData);

      if (todayData.planDay) {
        setTodaysGoal(todayData.planDay.target_total_reps || 100);
      }
      if (todayData.plan) {
        setExerciseType(todayData.plan.exercise_type as ExerciseType);
      }

      // Calculate reps completed today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todaysWorkouts = workoutsData.filter(w => {
        const workoutDate = new Date(w.created_at);
        workoutDate.setHours(0, 0, 0, 0);
        return workoutDate.getTime() === today.getTime();
      });
      const totalToday = todaysWorkouts.reduce((sum, w) => sum + w.total_pushups, 0);
      setCompletedToday(totalToday);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchData();
      setLoading(false);
    };
    loadData();
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.dark.accent} />
      </View>
    );
  }

  if (!stats || workouts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIcon}>
          <Ionicons name="analytics-outline" size={64} color={Colors.dark.textMuted} />
        </View>
        <Text style={styles.emptyTitle}>No Data Yet</Text>
        <Text style={styles.emptyText}>
          Complete some workouts to see{'\n'}your progress charts
        </Text>
      </View>
    );
  }

  const exercise = EXERCISES[exerciseType];

  // Prepare chart data
  const recentWorkouts = [...workouts].reverse().slice(-7);
  const pushupsData = recentWorkouts.map((w) => w.total_pushups);
  const ppmData = recentWorkouts.map((w) => w.pushups_per_minute);
  const labels = recentWorkouts.map((w) => {
    const date = new Date(w.created_at);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  });

  const formatRestTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={Colors.dark.accent}
          colors={[Colors.dark.accent]}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Plan Progress */}
      {planProgress && (
        <PlanProgressCard progress={planProgress} exerciseType={exerciseType} />
      )}

      {/* Daily Goal Progress */}
      <DailyGoalProgress 
        todaysGoal={todaysGoal} 
        completedToday={completedToday}
        exerciseType={exerciseType}
      />

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <StatCard
          icon="trophy"
          label="Best Session"
          value={stats.bestSession}
          subtext={exercise.namePlural.toLowerCase()}
          highlight={stats.bestSession >= exercise.goal}
        />
        <StatCard
          icon="flame"
          label="Current Streak"
          value={stats.currentStreak}
          subtext="days"
        />
        <StatCard
          icon="fitness"
          label="Total Workouts"
          value={stats.totalWorkouts}
        />
        <StatCard
          icon="timer-outline"
          label="Avg Rest"
          value={formatRestTime(stats.averageRestTime)}
        />
      </View>

      {/* Reps Chart */}
      {recentWorkouts.length >= 2 && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>{exercise.namePlural.toUpperCase()} PER SESSION</Text>
          <LineChart
            data={{
              labels: labels,
              datasets: [{ data: pushupsData.length > 0 ? pushupsData : [0] }],
            }}
            width={screenWidth - 48}
            height={200}
            chartConfig={{
              ...chartConfig,
              color: (opacity = 1) => `rgba(${exercise.id === 'pullups' ? '139, 92, 246' : '255, 107, 53'}, ${opacity})`,
            }}
            bezier
            style={styles.chart}
            withInnerLines={true}
            withOuterLines={false}
            withVerticalLabels={true}
            withHorizontalLabels={true}
            fromZero={true}
          />
        </View>
      )}

      {/* Reps per Minute Chart */}
      {recentWorkouts.length >= 2 && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>{exercise.namePlural.toUpperCase()} PER MINUTE</Text>
          <LineChart
            data={{
              labels: labels,
              datasets: [{ data: ppmData.length > 0 ? ppmData : [0] }],
            }}
            width={screenWidth - 48}
            height={200}
            chartConfig={{
              ...chartConfig,
              color: (opacity = 1) => `rgba(74, 222, 128, ${opacity})`,
              propsForDots: {
                r: '4',
                strokeWidth: '2',
                stroke: Colors.dark.success,
              },
            }}
            bezier
            style={styles.chart}
            withInnerLines={true}
            withOuterLines={false}
            withVerticalLabels={true}
            withHorizontalLabels={true}
            fromZero={true}
          />
        </View>
      )}

      {/* Average stats */}
      <View style={styles.averageContainer}>
        <Text style={styles.averageTitle}>AVERAGES</Text>
        <View style={styles.averageRow}>
          <View style={styles.averageItem}>
            <Text style={[styles.averageValue, { color: exercise.accentColor }]}>{stats.averagePushups}</Text>
            <Text style={styles.averageLabel}>{exercise.namePlural.toLowerCase()}/session</Text>
          </View>
          <View style={styles.averageDivider} />
          <View style={styles.averageItem}>
            <Text style={[styles.averageValue, { color: exercise.accentColor }]}>
              {(workouts.reduce((sum, w) => sum + w.pushups_per_minute, 0) / workouts.length).toFixed(1)}
            </Text>
            <Text style={styles.averageLabel}>{exercise.namePlural.toLowerCase()}/min</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  scrollContent: {
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
  planProgressContainer: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  planProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  planTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  exerciseIcon: {
    fontSize: 28,
  },
  planTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark.textMuted,
    letterSpacing: 1,
  },
  planSubtitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark.text,
    marginTop: 2,
  },
  onTrackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  onTrackText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark.success,
  },
  behindBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  behindText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark.warning,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  progressBar: {
    flex: 1,
    height: 10,
    backgroundColor: Colors.dark.surfaceLight,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.dark.text,
    width: 45,
    textAlign: 'right',
  },
  planStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  planStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.dark.border,
  },
  planStatValue: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.dark.accent,
  },
  planStatLabel: {
    fontSize: 12,
    color: Colors.dark.textMuted,
    marginTop: 2,
  },
  dailyGoalContainer: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  dailyGoalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dailyGoalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dailyGoalTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.dark.text,
    letterSpacing: 1,
  },
  dailyGoalProgress: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.dark.accent,
  },
  dailyGoalBarContainer: {
    marginBottom: 12,
  },
  dailyGoalBar: {
    height: 12,
    backgroundColor: Colors.dark.surfaceLight,
    borderRadius: 6,
    overflow: 'hidden',
  },
  dailyGoalBarFill: {
    height: '100%',
    backgroundColor: Colors.dark.accent,
    borderRadius: 6,
  },
  dailyGoalBarComplete: {
    backgroundColor: Colors.dark.success,
  },
  dailyGoalDescription: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    lineHeight: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statCardHighlight: {
    borderWidth: 1,
    borderColor: Colors.dark.warning,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.dark.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIconHighlight: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
  },
  statLabel: {
    fontSize: 11,
    color: Colors.dark.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.dark.text,
  },
  statValueHighlight: {
    color: Colors.dark.warning,
  },
  statSubtext: {
    fontSize: 12,
    color: Colors.dark.textMuted,
    marginTop: 2,
  },
  chartContainer: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark.textMuted,
    letterSpacing: 1,
    marginBottom: 16,
  },
  chart: {
    borderRadius: 12,
    marginLeft: -16,
  },
  averageContainer: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 20,
  },
  averageTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark.textMuted,
    letterSpacing: 1,
    marginBottom: 16,
    textAlign: 'center',
  },
  averageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  averageItem: {
    flex: 1,
    alignItems: 'center',
  },
  averageValue: {
    fontSize: 32,
    fontWeight: '800',
  },
  averageLabel: {
    fontSize: 12,
    color: Colors.dark.textMuted,
    marginTop: 4,
  },
  averageDivider: {
    width: 1,
    height: 48,
    backgroundColor: Colors.dark.border,
  },
});

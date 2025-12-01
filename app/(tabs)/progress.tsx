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

function GoalProgress({ maxInOneSet }: { maxInOneSet: number }) {
  const progress = Math.min((maxInOneSet / 100) * 100, 100);
  const isComplete = maxInOneSet >= 100;

  return (
    <View style={styles.goalContainer}>
      <View style={styles.goalHeader}>
        <View style={styles.goalTitleContainer}>
          {isComplete ? (
            <Ionicons name="trophy" size={24} color={Colors.dark.warning} />
          ) : (
            <Ionicons name="flag" size={24} color={Colors.dark.accent} />
          )}
          <Text style={styles.goalTitle}>
            {isComplete ? 'GOAL ACHIEVED!' : 'ULTIMATE GOAL'}
          </Text>
        </View>
        <Text style={styles.goalProgress}>{maxInOneSet} / 100</Text>
      </View>

      <View style={styles.goalBarContainer}>
        <View style={styles.goalBar}>
          <View
            style={[
              styles.goalBarFill,
              { width: `${progress}%` },
              isComplete && styles.goalBarComplete,
            ]}
          />
        </View>
      </View>

      <Text style={styles.goalDescription}>
        {isComplete
          ? 'Congratulations! You can do 100 pushups in one go!'
          : `${100 - maxInOneSet} more pushups in a single set to reach your goal`}
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

  const fetchData = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const [workoutsData, statsData] = await Promise.all([
        getWorkouts(session.user.id),
        getWorkoutStats(session.user.id),
      ]);
      setWorkouts(workoutsData);
      setStats(statsData);
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
      {/* Goal Progress */}
      <GoalProgress maxInOneSet={stats.maxPushupsInOneSet} />

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <StatCard
          icon="trophy"
          label="Best Session"
          value={stats.bestSession}
          subtext="pushups"
          highlight={stats.bestSession >= 100}
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

      {/* Pushups Chart */}
      {recentWorkouts.length >= 2 && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>PUSHUPS PER SESSION</Text>
          <LineChart
            data={{
              labels: labels,
              datasets: [{ data: pushupsData.length > 0 ? pushupsData : [0] }],
            }}
            width={screenWidth - 48}
            height={200}
            chartConfig={chartConfig}
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

      {/* Pushups per Minute Chart */}
      {recentWorkouts.length >= 2 && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>PUSHUPS PER MINUTE</Text>
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
            <Text style={styles.averageValue}>{stats.averagePushups}</Text>
            <Text style={styles.averageLabel}>pushups/session</Text>
          </View>
          <View style={styles.averageDivider} />
          <View style={styles.averageItem}>
            <Text style={styles.averageValue}>
              {(workouts.reduce((sum, w) => sum + w.pushups_per_minute, 0) / workouts.length).toFixed(1)}
            </Text>
            <Text style={styles.averageLabel}>pushups/min</Text>
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
  goalContainer: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  goalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  goalTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.dark.text,
    letterSpacing: 1,
  },
  goalProgress: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.dark.accent,
  },
  goalBarContainer: {
    marginBottom: 12,
  },
  goalBar: {
    height: 12,
    backgroundColor: Colors.dark.surfaceLight,
    borderRadius: 6,
    overflow: 'hidden',
  },
  goalBarFill: {
    height: '100%',
    backgroundColor: Colors.dark.accent,
    borderRadius: 6,
  },
  goalBarComplete: {
    backgroundColor: Colors.dark.warning,
  },
  goalDescription: {
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
    color: Colors.dark.accent,
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


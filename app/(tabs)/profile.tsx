import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  FlatList,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useStore } from '@/lib/store';
import { getProfile, updateProfile } from '@/lib/friends';
import { getUserRewards } from '@/lib/database';
import { Profile, Reward, UserReward } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { getPlanProgress } from '@/lib/workout-plan';
import { getUserWorkoutFeed, WorkoutWithSocial } from '@/lib/social';
import { EXERCISES, ExerciseType } from '@/lib/exercises';
import XPBar from '@/components/XPBar';
import WorkoutCard from '@/components/WorkoutCard';
import Colors from '@/constants/Colors';

interface RewardWithData extends UserReward {
  reward: Reward;
}

export default function ProfileScreen() {
  const router = useRouter();
  const session = useStore((state) => state.session);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [rewards, setRewards] = useState<RewardWithData[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutWithSocial[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [planProgress, setPlanProgress] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'stats' | 'workouts' | 'rewards'>('stats');

  const fetchData = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const [profileData, rewardsData, progressData, workoutsData] = await Promise.all([
        getProfile(session.user.id),
        getUserRewards(session.user.id),
        getPlanProgress(session.user.id),
        getUserWorkoutFeed(session.user.id, 10),
      ]);

      if (profileData) {
        setProfile(profileData);
        setNewUsername(profileData.username || profileData.display_name || '');
      }
      setRewards(rewardsData as RewardWithData[]);
      setPlanProgress(progressData);
      setWorkouts(workoutsData);
    } catch (error) {
      console.error('Error fetching profile data:', error);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const handleUpdateUsername = async () => {
    if (!session?.user?.id || !newUsername.trim()) return;

    const success = await updateProfile(session.user.id, {
      username: newUsername.trim(),
      display_name: newUsername.trim(),
    });

    if (success && profile) {
      setProfile({
        ...profile,
        username: newUsername.trim(),
        display_name: newUsername.trim(),
      });
      setEditingUsername(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.dark.accent} />
      </View>
    );
  }

  const exerciseType = (profile?.exercise_type || 'pushups') as ExerciseType;
  const exercise = EXERCISES[exerciseType];
  const medals = rewards.filter(r => r.reward?.type === 'medal');
  const decorations = rewards.filter(r => r.reward?.type === 'decoration');

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
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={[styles.avatar, { backgroundColor: exercise.accentColor + '30' }]}>
          <Text style={[styles.avatarText, { color: exercise.accentColor }]}>
            {profile?.display_name?.charAt(0)?.toUpperCase() || '?'}
          </Text>
        </View>

        {editingUsername ? (
          <View style={styles.editContainer}>
            <TextInput
              style={styles.usernameInput}
              value={newUsername}
              onChangeText={setNewUsername}
              placeholder="Enter username"
              placeholderTextColor={Colors.dark.textMuted}
              autoFocus
            />
            <View style={styles.editButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setEditingUsername(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleUpdateUsername}>
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.usernameContainer}
            onPress={() => setEditingUsername(true)}
          >
            <Text style={styles.username}>
              {profile?.display_name || profile?.username || 'Set Username'}
            </Text>
            <Ionicons name="pencil" size={16} color={Colors.dark.textMuted} />
          </TouchableOpacity>
        )}

        <Text style={styles.email}>{session?.user?.email}</Text>

        {/* Exercise Type Badge */}
        <View style={[styles.exerciseBadge, { backgroundColor: exercise.accentColor + '20' }]}>
          <Text style={styles.exerciseIcon}>{exercise.icon}</Text>
          <Text style={[styles.exerciseText, { color: exercise.accentColor }]}>
            {exercise.namePlural} Master
          </Text>
        </View>
      </View>

      {/* XP Bar */}
      <View style={styles.xpContainer}>
        <XPBar xp={profile?.xp || 0} animated />
      </View>

      {/* Plan Progress */}
      {planProgress && (
        <View style={styles.planCard}>
          <View style={styles.planHeader}>
            <Ionicons name="calendar" size={20} color={Colors.dark.accent} />
            <Text style={styles.planTitle}>Workout Plan</Text>
          </View>
          <View style={styles.planProgressBar}>
            <View
              style={[
                styles.planProgressFill,
                { width: `${planProgress.percentComplete}%`, backgroundColor: exercise.accentColor },
              ]}
            />
          </View>
          <View style={styles.planStats}>
            <Text style={styles.planStatText}>
              Day {planProgress.currentDay} of {planProgress.totalDays}
            </Text>
            <Text style={styles.planStatText}>{planProgress.percentComplete}% Complete</Text>
          </View>
        </View>
      )}

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{profile?.total_workouts || 0}</Text>
          <Text style={styles.statLabel}>Workouts</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{profile?.total_pushups || 0}</Text>
          <Text style={styles.statLabel}>{exercise.namePlural}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: Colors.dark.warning }]}>
            {profile?.current_streak || 0}
          </Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{profile?.longest_streak || 0}</Text>
          <Text style={styles.statLabel}>Best Streak</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'stats' && styles.tabActive]}
          onPress={() => setActiveTab('stats')}
        >
          <Text style={[styles.tabText, activeTab === 'stats' && styles.tabTextActive]}>
            Stats
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'workouts' && styles.tabActive]}
          onPress={() => setActiveTab('workouts')}
        >
          <Text style={[styles.tabText, activeTab === 'workouts' && styles.tabTextActive]}>
            Workouts
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'rewards' && styles.tabActive]}
          onPress={() => setActiveTab('rewards')}
        >
          <Text style={[styles.tabText, activeTab === 'rewards' && styles.tabTextActive]}>
            Rewards
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'stats' && (
        <View style={styles.statsSection}>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="trophy" size={20} color={Colors.dark.warning} />
              <Text style={styles.infoLabel}>Level</Text>
              <Text style={styles.infoValue}>{profile?.level || 1}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="star" size={20} color={Colors.dark.warning} />
              <Text style={styles.infoLabel}>Total XP</Text>
              <Text style={styles.infoValue}>{profile?.xp || 0}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="medal" size={20} color={Colors.dark.accent} />
              <Text style={styles.infoLabel}>Rewards Unlocked</Text>
              <Text style={styles.infoValue}>{rewards.length}</Text>
            </View>
          </View>
        </View>
      )}

      {activeTab === 'workouts' && (
        <View style={styles.workoutsSection}>
          {workouts.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="barbell-outline" size={48} color={Colors.dark.textMuted} />
              <Text style={styles.emptyStateText}>No workouts yet</Text>
              <Text style={styles.emptyStateSubtext}>Start your first workout!</Text>
            </View>
          ) : (
            workouts.map((workout) => (
              <WorkoutCard
                key={workout.id}
                workout={workout}
                onPress={() => router.push(`/workout-detail/${workout.id}`)}
              />
            ))
          )}
        </View>
      )}

      {activeTab === 'rewards' && (
        <View style={styles.rewardsSection}>
          {medals.length > 0 && (
            <>
              <Text style={styles.rewardsSectionTitle}>MEDALS</Text>
              <View style={styles.rewardsGrid}>
                {medals.map((reward) => (
                  <View key={reward.id} style={styles.rewardItem}>
                    <Text style={styles.rewardIcon}>{reward.reward?.icon || '🏅'}</Text>
                    <Text style={styles.rewardName}>{reward.reward?.name}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {decorations.length > 0 && (
            <>
              <Text style={styles.rewardsSectionTitle}>DECORATIONS</Text>
              <View style={styles.rewardsGrid}>
                {decorations.map((reward) => (
                  <View key={reward.id} style={styles.rewardItem}>
                    <Text style={styles.rewardIcon}>{reward.reward?.icon || '⭐'}</Text>
                    <Text style={styles.rewardName}>{reward.reward?.name}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {rewards.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="gift-outline" size={48} color={Colors.dark.textMuted} />
              <Text style={styles.emptyStateText}>No rewards yet</Text>
              <Text style={styles.emptyStateSubtext}>Keep leveling up to unlock rewards!</Text>
            </View>
          )}
        </View>
      )}

      {/* Sign Out */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={20} color="#EF4444" />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      {/* Version */}
      <Text style={styles.version}>Version 1.0.0</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.dark.background,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '800',
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  username: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.dark.text,
  },
  email: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    marginBottom: 12,
  },
  exerciseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  exerciseIcon: {
    fontSize: 18,
  },
  exerciseText: {
    fontSize: 14,
    fontWeight: '600',
  },
  editContainer: {
    width: '100%',
    marginBottom: 8,
  },
  usernameInput: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 18,
    color: Colors.dark.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: Colors.dark.surface,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.textSecondary,
  },
  saveButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: Colors.dark.accent,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.background,
  },
  xpContainer: {
    marginBottom: 20,
  },
  planCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  planTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  planProgressBar: {
    height: 8,
    backgroundColor: Colors.dark.surfaceLight,
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  planProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  planStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  planStatText: {
    fontSize: 12,
    color: Colors.dark.textMuted,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.dark.accent,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.dark.textMuted,
    marginTop: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: Colors.dark.surfaceLight,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.textMuted,
  },
  tabTextActive: {
    color: Colors.dark.text,
  },
  statsSection: {},
  infoCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
    gap: 12,
  },
  infoLabel: {
    flex: 1,
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark.text,
  },
  workoutsSection: {},
  rewardsSection: {},
  rewardsSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark.textMuted,
    letterSpacing: 1,
    marginBottom: 12,
  },
  rewardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  rewardItem: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    minWidth: 90,
  },
  rewardIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  rewardName: {
    fontSize: 12,
    color: Colors.dark.text,
    textAlign: 'center',
  },
  emptyState: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    gap: 8,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.textSecondary,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: Colors.dark.textMuted,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 24,
    marginBottom: 16,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  version: {
    fontSize: 12,
    color: Colors.dark.textMuted,
    textAlign: 'center',
  },
});

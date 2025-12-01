import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import XPBar from '@/components/XPBar';
import Colors from '@/constants/Colors';
import { getUserRewards, getWorkoutStats } from '@/lib/database';
import { getProfile, updateProfile } from '@/lib/friends';
import { getLevelInfo } from '@/lib/gamification';
import { useStore } from '@/lib/store';
import { Profile, supabase, UserReward } from '@/lib/supabase';

export default function ProfileScreen() {
  const router = useRouter();
  const session = useStore((state) => state.session);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [rewards, setRewards] = useState<UserReward[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');

  const fetchData = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const [profileData, rewardsData, statsData] = await Promise.all([
        getProfile(session.user.id),
        getUserRewards(session.user.id),
        getWorkoutStats(session.user.id),
      ]);

      setProfile(profileData);
      setRewards(rewardsData);
      setStats(statsData);
      setNewUsername(profileData?.username || '');
    } catch (error) {
      console.error('Error fetching profile data:', error);
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

  const handleUpdateUsername = async () => {
    if (!session?.user?.id || !newUsername.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }

    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(newUsername.trim())) {
      Alert.alert('Invalid Username', 'Username must be 3-20 characters and contain only letters, numbers, and underscores');
      return;
    }

    const updated = await updateProfile(session.user.id, {
      username: newUsername.trim().toLowerCase(),
      display_name: newUsername.trim(),
    });

    if (updated) {
      setProfile(updated);
      setEditingUsername(false);
      Alert.alert('Success', 'Username updated!');
    } else {
      Alert.alert('Error', 'Username is already taken. Please try another one.');
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

  const levelInfo = profile ? getLevelInfo(profile.xp) : null;
  const medals = rewards.filter((r) => r.reward?.type === 'medal');
  const decorations = rewards.filter((r) => r.reward?.type === 'decoration');

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={Colors.dark.accent}
        />
      }
    >
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile?.display_name?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
          <View style={styles.levelBadge}>
            <Text style={styles.levelBadgeText}>{profile?.level || 1}</Text>
          </View>
        </View>

        {editingUsername ? (
          <View style={styles.usernameEdit}>
            <TextInput
              style={styles.usernameInput}
              value={newUsername}
              onChangeText={setNewUsername}
              placeholder="Enter username"
              placeholderTextColor={Colors.dark.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity style={styles.saveButton} onPress={handleUpdateUsername}>
              <Ionicons name="checkmark" size={24} color={Colors.dark.success} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setEditingUsername(false)}
            >
              <Ionicons name="close" size={24} color={Colors.dark.textMuted} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.usernameContainer}
            onPress={() => setEditingUsername(true)}
          >
            <Text style={styles.displayName}>
              {profile?.display_name || 'Set Username'}
            </Text>
            <Ionicons name="pencil" size={16} color={Colors.dark.textMuted} />
          </TouchableOpacity>
        )}

        <Text style={styles.levelTitle}>{levelInfo?.title || 'Rookie'}</Text>
      </View>

      {/* XP Bar */}
      <View style={styles.xpSection}>
        <XPBar xp={profile?.xp || 0} size="large" />
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <FontAwesome5 name="dumbbell" size={20} color={Colors.dark.accent} />
          <Text style={styles.statValue}>{profile?.total_workouts || 0}</Text>
          <Text style={styles.statLabel}>Workouts</Text>
        </View>
        <View style={styles.statCard}>
          <FontAwesome5 name="fist-raised" size={20} color={Colors.dark.accent} />
          <Text style={styles.statValue}>{profile?.total_pushups || 0}</Text>
          <Text style={styles.statLabel}>Pushups</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="flame" size={24} color={Colors.dark.warning} />
          <Text style={styles.statValue}>{profile?.current_streak || 0}</Text>
          <Text style={styles.statLabel}>Streak</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="trophy" size={24} color={Colors.dark.warning} />
          <Text style={styles.statValue}>{profile?.longest_streak || 0}</Text>
          <Text style={styles.statLabel}>Best Streak</Text>
        </View>
      </View>

      {/* Medals Section */}
      {medals.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MEDALS</Text>
          <View style={styles.medalsContainer}>
            {medals.map((m) => (
              <View key={m.id} style={styles.medalItem}>
                <Text style={styles.medalIcon}>{m.reward?.icon}</Text>
                <Text style={styles.medalName}>{m.reward?.name}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Decorations Section */}
      {decorations.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DECORATIONS</Text>
          <View style={styles.decorationsContainer}>
            {decorations.map((d) => (
              <TouchableOpacity key={d.id} style={styles.decorationItem}>
                <Text style={styles.decorationIcon}>{d.reward?.icon}</Text>
                <Text style={styles.decorationName}>{d.reward?.name}</Text>
                {d.equipped && (
                  <View style={styles.equippedBadge}>
                    <Text style={styles.equippedText}>Equipped</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={24} color="#EF4444" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

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
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.dark.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.dark.accent,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '700',
    color: Colors.dark.accent,
  },
  levelBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.dark.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.dark.background,
  },
  levelBadgeText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.dark.background,
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  displayName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.dark.text,
  },
  usernameEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  usernameInput: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 18,
    color: Colors.dark.text,
    minWidth: 200,
  },
  saveButton: {
    padding: 8,
  },
  cancelButton: {
    padding: 8,
  },
  levelTitle: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    marginTop: 4,
    letterSpacing: 1,
  },
  xpSection: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
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
    color: Colors.dark.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.dark.textMuted,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark.textMuted,
    letterSpacing: 1,
    marginBottom: 12,
  },
  medalsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  medalItem: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    minWidth: 80,
  },
  medalIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  medalName: {
    fontSize: 11,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
  },
  decorationsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  decorationItem: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    minWidth: 100,
    position: 'relative',
  },
  decorationIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  decorationName: {
    fontSize: 11,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
  },
  equippedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: Colors.dark.accent,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  equippedText: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.dark.background,
  },
  actions: {
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.dark.textMuted,
    marginTop: 24,
  },
});


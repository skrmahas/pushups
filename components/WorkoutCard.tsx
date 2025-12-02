import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { WorkoutWithSocial, WorkoutPrivacy } from '@/lib/social';
import { EXERCISES, ExerciseType } from '@/lib/exercises';

interface WorkoutCardProps {
  workout: WorkoutWithSocial;
  onPress?: () => void;
  onLike?: () => void;
  onComment?: () => void;
  showProfile?: boolean;
}

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
      month: 'short',
      day: 'numeric',
    });
  }
};

const formatFullTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const getPrivacyIcon = (privacy: WorkoutPrivacy) => {
  switch (privacy) {
    case 'public': return 'globe-outline';
    case 'friends': return 'people-outline';
    case 'private': return 'lock-closed-outline';
    default: return 'people-outline';
  }
};

export default function WorkoutCard({
  workout,
  onPress,
  onLike,
  onComment,
  showProfile = false,
}: WorkoutCardProps) {
  const exerciseType = (workout.exercise_type || 'pushups') as ExerciseType;
  const exercise = EXERCISES[exerciseType];
  const reachedDailyGoal = workout.is_daily_goal_completed;

  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {showProfile && workout.profile && (
            <View style={styles.profileAvatar}>
              <Text style={styles.avatarText}>
                {workout.profile.display_name?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
          )}
          <View>
            {showProfile && workout.profile && (
              <Text style={styles.profileName}>{workout.profile.display_name}</Text>
            )}
            <View style={styles.dateRow}>
              <Text style={styles.dateText}>{formatDate(workout.created_at)}</Text>
              <Text style={styles.timeText}> • {formatFullTime(workout.created_at)}</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.headerRight}>
          <Ionicons 
            name={getPrivacyIcon(workout.privacy as WorkoutPrivacy)} 
            size={16} 
            color={Colors.dark.textMuted} 
          />
          {reachedDailyGoal && (
            <View style={styles.goalBadge}>
              <Ionicons name="checkmark-circle" size={14} color={Colors.dark.success} />
            </View>
          )}
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <View style={styles.mainStats}>
          <View style={[styles.exerciseIconContainer, { backgroundColor: exercise.accentColor + '20' }]}>
            <Text style={styles.exerciseIcon}>{exercise.icon}</Text>
          </View>
          
          <View style={styles.statsColumn}>
            <Text style={[styles.repsNumber, { color: exercise.accentColor }]}>
              {workout.total_pushups}
            </Text>
            <Text style={styles.repsLabel}>{exercise.namePlural}</Text>
          </View>

          <View style={styles.secondaryStats}>
            <View style={styles.statItem}>
              <Ionicons name="time-outline" size={14} color={Colors.dark.textMuted} />
              <Text style={styles.statText}>{formatTime(workout.total_time_seconds)}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="speedometer-outline" size={14} color={Colors.dark.textMuted} />
              <Text style={styles.statText}>{workout.pushups_per_minute.toFixed(1)}/min</Text>
            </View>
          </View>
        </View>

        {/* XP Badge */}
        <View style={styles.xpRow}>
          <View style={styles.xpBadge}>
            <Ionicons name="star" size={14} color={Colors.dark.warning} />
            <Text style={styles.xpText}>+{workout.xp_earned} XP</Text>
          </View>
          
          {workout.daily_goal_bonus_xp && workout.daily_goal_bonus_xp > 0 && (
            <View style={styles.bonusBadge}>
              <Text style={styles.bonusText}>+{workout.daily_goal_bonus_xp} bonus</Text>
            </View>
          )}
        </View>
      </View>

      {/* Social Actions */}
      <View style={styles.socialRow}>
        <TouchableOpacity style={styles.socialButton} onPress={onLike}>
          <Ionicons 
            name={workout.is_liked ? "heart" : "heart-outline"} 
            size={20} 
            color={workout.is_liked ? '#EF4444' : Colors.dark.textMuted} 
          />
          <Text style={[styles.socialCount, workout.is_liked && styles.likedText]}>
            {workout.likes_count || 0}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.socialButton} onPress={onComment}>
          <Ionicons name="chatbubble-outline" size={18} color={Colors.dark.textMuted} />
          <Text style={styles.socialCount}>{workout.comments_count || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.socialButton}>
          <Ionicons name="share-outline" size={20} color={Colors.dark.textMuted} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark.accent,
  },
  profileName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 2,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
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
  content: {
    marginBottom: 16,
  },
  mainStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  exerciseIconContainer: {
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
  statsColumn: {
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
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
  },
  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  socialRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
    paddingTop: 12,
    gap: 24,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  socialCount: {
    fontSize: 14,
    color: Colors.dark.textMuted,
  },
  likedText: {
    color: '#EF4444',
  },
});


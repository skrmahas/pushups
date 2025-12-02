import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useStore } from '@/lib/store';
import {
  getWorkoutWithSocial,
  getWorkoutComments,
  addComment,
  deleteComment,
  toggleWorkoutLike,
  WorkoutWithSocial,
  WorkoutComment,
} from '@/lib/social';
import { EXERCISES, ExerciseType } from '@/lib/exercises';

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const session = useStore((state) => state.session);

  const [workout, setWorkout] = useState<WorkoutWithSocial | null>(null);
  const [comments, setComments] = useState<WorkoutComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id || !session?.user?.id) return;

    try {
      const [workoutData, commentsData] = await Promise.all([
        getWorkoutWithSocial(id, session.user.id),
        getWorkoutComments(id),
      ]);
      setWorkout(workoutData);
      setComments(commentsData);
    } catch (error) {
      console.error('Error fetching workout details:', error);
    } finally {
      setLoading(false);
    }
  }, [id, session?.user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLike = async () => {
    if (!workout || !session?.user?.id) return;
    
    const success = await toggleWorkoutLike(session.user.id, workout.id);
    if (success) {
      setWorkout({
        ...workout,
        is_liked: !workout.is_liked,
        likes_count: (workout.likes_count || 0) + (workout.is_liked ? -1 : 1),
      });
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !session?.user?.id || !workout) return;

    setSubmitting(true);
    const comment = await addComment(session.user.id, workout.id, newComment.trim());
    if (comment) {
      setComments([...comments, comment]);
      setNewComment('');
      setWorkout({
        ...workout,
        comments_count: (workout.comments_count || 0) + 1,
      });
    }
    setSubmitting(false);
  };

  const handleDeleteComment = (commentId: string) => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!session?.user?.id) return;
            const success = await deleteComment(commentId, session.user.id);
            if (success) {
              setComments(comments.filter(c => c.id !== commentId));
              if (workout) {
                setWorkout({
                  ...workout,
                  comments_count: Math.max(0, (workout.comments_count || 0) - 1),
                });
              }
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.dark.accent} />
      </View>
    );
  }

  if (!workout) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color={Colors.dark.textMuted} />
        <Text style={styles.errorText}>Workout not found</Text>
      </View>
    );
  }

  const exerciseType = (workout.exercise_type || 'pushups') as ExerciseType;
  const exercise = EXERCISES[exerciseType];

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Workout Details',
          headerStyle: { backgroundColor: Colors.dark.background },
          headerTintColor: Colors.dark.text,
        }}
      />
      
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Date */}
          <Text style={styles.dateText}>{formatDate(workout.created_at)}</Text>

          {/* Main Stats Card */}
          <View style={styles.mainCard}>
            <View style={[styles.iconContainer, { backgroundColor: exercise.accentColor + '20' }]}>
              <Text style={styles.exerciseIcon}>{exercise.icon}</Text>
            </View>

            <Text style={[styles.repsNumber, { color: exercise.accentColor }]}>
              {workout.total_pushups}
            </Text>
            <Text style={styles.repsLabel}>{exercise.namePlural}</Text>

            {workout.is_daily_goal_completed && (
              <View style={styles.goalCompleteBadge}>
                <Ionicons name="checkmark-circle" size={18} color={Colors.dark.success} />
                <Text style={styles.goalCompleteText}>Daily Goal Complete</Text>
              </View>
            )}
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Ionicons name="time-outline" size={20} color={Colors.dark.accent} />
              <Text style={styles.statValue}>{formatTime(workout.total_time_seconds)}</Text>
              <Text style={styles.statLabel}>Total Time</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="speedometer-outline" size={20} color={Colors.dark.accent} />
              <Text style={styles.statValue}>{workout.pushups_per_minute.toFixed(1)}</Text>
              <Text style={styles.statLabel}>Per Minute</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="star" size={20} color={Colors.dark.warning} />
              <Text style={[styles.statValue, { color: Colors.dark.warning }]}>
                +{workout.xp_earned}
              </Text>
              <Text style={styles.statLabel}>XP Earned</Text>
            </View>
          </View>

          {/* Difficulty & Variation */}
          <View style={styles.difficultyCard}>
            <View style={styles.difficultyItem}>
              <Text style={styles.difficultyLabel}>Difficulty</Text>
              <Text style={styles.difficultyValue}>{workout.difficulty}</Text>
            </View>
            <View style={styles.difficultyItem}>
              <Text style={styles.difficultyLabel}>Variation</Text>
              <Text style={styles.difficultyValue}>{workout.variation}</Text>
            </View>
          </View>

          {/* Social Actions */}
          <View style={styles.socialActions}>
            <TouchableOpacity style={styles.socialAction} onPress={handleLike}>
              <Ionicons
                name={workout.is_liked ? 'heart' : 'heart-outline'}
                size={24}
                color={workout.is_liked ? '#EF4444' : Colors.dark.text}
              />
              <Text style={[styles.socialActionText, workout.is_liked && styles.likedText]}>
                {workout.likes_count || 0} Likes
              </Text>
            </TouchableOpacity>

            <View style={styles.socialAction}>
              <Ionicons name="chatbubble-outline" size={22} color={Colors.dark.text} />
              <Text style={styles.socialActionText}>{comments.length} Comments</Text>
            </View>
          </View>

          {/* Comments Section */}
          <View style={styles.commentsSection}>
            <Text style={styles.commentsTitle}>Comments</Text>

            {comments.length === 0 ? (
              <View style={styles.noComments}>
                <Ionicons name="chatbubbles-outline" size={40} color={Colors.dark.textMuted} />
                <Text style={styles.noCommentsText}>No comments yet</Text>
                <Text style={styles.noCommentsSubtext}>Be the first to comment!</Text>
              </View>
            ) : (
              comments.map((comment) => (
                <View key={comment.id} style={styles.commentItem}>
                  <View style={styles.commentAvatar}>
                    <Text style={styles.commentAvatarText}>
                      {comment.profile?.display_name?.charAt(0)?.toUpperCase() || '?'}
                    </Text>
                  </View>
                  <View style={styles.commentContent}>
                    <View style={styles.commentHeader}>
                      <Text style={styles.commentAuthor}>
                        {comment.profile?.display_name || 'User'}
                      </Text>
                      <Text style={styles.commentTime}>{formatTimeAgo(comment.created_at)}</Text>
                    </View>
                    <Text style={styles.commentText}>{comment.text}</Text>
                  </View>
                  {comment.user_id === session?.user?.id && (
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteComment(comment.id)}
                    >
                      <Ionicons name="trash-outline" size={16} color={Colors.dark.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </View>
        </ScrollView>

        {/* Comment Input */}
        <View style={styles.commentInputContainer}>
          <TextInput
            style={styles.commentInput}
            placeholder="Write a comment..."
            placeholderTextColor={Colors.dark.textMuted}
            value={newComment}
            onChangeText={setNewComment}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!newComment.trim() || submitting) && styles.sendButtonDisabled,
            ]}
            onPress={handleSubmitComment}
            disabled={!newComment.trim() || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={Colors.dark.background} />
            ) : (
              <Ionicons name="send" size={20} color={Colors.dark.background} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.dark.background,
    gap: 16,
  },
  errorText: {
    fontSize: 18,
    color: Colors.dark.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  dateText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  mainCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  exerciseIcon: {
    fontSize: 40,
  },
  repsNumber: {
    fontSize: 64,
    fontWeight: '800',
  },
  repsLabel: {
    fontSize: 18,
    color: Colors.dark.textSecondary,
    letterSpacing: 1,
    marginBottom: 16,
  },
  goalCompleteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  goalCompleteText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.success,
  },
  statsGrid: {
    flexDirection: 'row',
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.dark.text,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.dark.textMuted,
  },
  difficultyCard: {
    flexDirection: 'row',
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  difficultyItem: {
    flex: 1,
    alignItems: 'center',
  },
  difficultyLabel: {
    fontSize: 11,
    color: Colors.dark.textMuted,
    marginBottom: 4,
  },
  difficultyValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
    textTransform: 'capitalize',
  },
  socialActions: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 24,
  },
  socialAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  socialActionText: {
    fontSize: 15,
    color: Colors.dark.text,
  },
  likedText: {
    color: '#EF4444',
  },
  commentsSection: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 16,
  },
  commentsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark.text,
    marginBottom: 16,
  },
  noComments: {
    alignItems: 'center',
    padding: 24,
    gap: 8,
  },
  noCommentsText: {
    fontSize: 16,
    color: Colors.dark.textSecondary,
  },
  noCommentsSubtext: {
    fontSize: 14,
    color: Colors.dark.textMuted,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.dark.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  commentAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.dark.accent,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  commentTime: {
    fontSize: 12,
    color: Colors.dark.textMuted,
  },
  commentText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    lineHeight: 20,
  },
  deleteButton: {
    padding: 8,
  },
  commentInputContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: Colors.dark.background,
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
    gap: 12,
  },
  commentInput: {
    flex: 1,
    backgroundColor: Colors.dark.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.dark.text,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.dark.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});


import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import Colors from '@/constants/Colors';
import { ExerciseVariation, ExerciseType, getDifficultyConfig } from '@/lib/exercises';
import { supabase } from '@/lib/supabase';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface ExerciseInfoData {
  description: string;
  muscles_targeted: string[];
  form_tips: string[];
  common_mistakes: string[];
  video_url: string | null;
}

interface ExerciseInfoModalProps {
  visible: boolean;
  variation: ExerciseVariation | null;
  exerciseType: ExerciseType;
  onClose: () => void;
}

export default function ExerciseInfoModal({
  visible,
  variation,
  exerciseType,
  onClose,
}: ExerciseInfoModalProps) {
  const [exerciseInfo, setExerciseInfo] = useState<ExerciseInfoData | null>(null);
  const [loading, setLoading] = useState(false);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    if (visible && variation) {
      fetchExerciseInfo();
    }
  }, [visible, variation]);

  const fetchExerciseInfo = async () => {
    if (!variation) return;
    
    setLoading(true);
    setVideoError(false);
    
    try {
      const { data, error } = await supabase
        .from('exercise_variations_info')
        .select('*')
        .eq('id', variation.id)
        .single();

      if (error) {
        console.log('Exercise info not found in DB, using defaults');
        // Use default info if not in database
        setExerciseInfo({
          description: variation.description,
          muscles_targeted: ['Primary muscles', 'Secondary muscles'],
          form_tips: ['Maintain proper form', 'Control the movement', 'Breathe steadily'],
          common_mistakes: ['Going too fast', 'Poor form', 'Not full range of motion'],
          video_url: null,
        });
      } else {
        setExerciseInfo(data);
      }
    } catch (err) {
      console.error('Error fetching exercise info:', err);
      setExerciseInfo({
        description: variation.description,
        muscles_targeted: [],
        form_tips: [],
        common_mistakes: [],
        video_url: null,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenVideo = (url: string) => {
    Linking.openURL(url);
  };

  if (!variation) return null;

  const difficultyConfig = getDifficultyConfig(exerciseType, variation.difficulty);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.variationIcon}>{variation.icon}</Text>
              <View>
                <Text style={styles.variationName}>{variation.name}</Text>
                <View style={[styles.difficultyBadge, { backgroundColor: difficultyConfig.color + '20' }]}>
                  <Text style={[styles.difficultyText, { color: difficultyConfig.color }]}>
                    {difficultyConfig.name}
                  </Text>
                </View>
              </View>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.dark.text} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.dark.accent} />
            </View>
          ) : (
            <ScrollView 
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Video Section */}
              {exerciseInfo?.video_url && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>VIDEO TUTORIAL</Text>
                  <TouchableOpacity 
                    style={styles.videoPlaceholder}
                    onPress={() => handleOpenVideo(exerciseInfo.video_url!)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.playButton}>
                      <Ionicons name="play" size={32} color="#fff" />
                    </View>
                    <Text style={styles.videoText}>Watch on YouTube</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Description */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>DESCRIPTION</Text>
                <Text style={styles.description}>
                  {exerciseInfo?.description || variation.description}
                </Text>
              </View>

              {/* XP Info */}
              <View style={styles.xpCard}>
                <Ionicons name="star" size={20} color={Colors.dark.warning} />
                <Text style={styles.xpText}>
                  {variation.xpMultiplier}x XP multiplier (combined with difficulty)
                </Text>
              </View>

              {/* Muscles Targeted */}
              {exerciseInfo?.muscles_targeted && exerciseInfo.muscles_targeted.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>MUSCLES TARGETED</Text>
                  <View style={styles.tagContainer}>
                    {exerciseInfo.muscles_targeted.map((muscle, index) => (
                      <View key={index} style={styles.muscleTag}>
                        <Text style={styles.muscleTagText}>{muscle}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Form Tips */}
              {exerciseInfo?.form_tips && exerciseInfo.form_tips.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>FORM TIPS</Text>
                  {exerciseInfo.form_tips.map((tip, index) => (
                    <View key={index} style={styles.tipItem}>
                      <Ionicons name="checkmark-circle" size={18} color={Colors.dark.success} />
                      <Text style={styles.tipText}>{tip}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Common Mistakes */}
              {exerciseInfo?.common_mistakes && exerciseInfo.common_mistakes.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>COMMON MISTAKES</Text>
                  {exerciseInfo.common_mistakes.map((mistake, index) => (
                    <View key={index} style={styles.mistakeItem}>
                      <Ionicons name="close-circle" size={18} color="#EF4444" />
                      <Text style={styles.mistakeText}>{mistake}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Unlock Level */}
              <View style={styles.unlockSection}>
                <Ionicons name="lock-open" size={18} color={Colors.dark.textMuted} />
                <Text style={styles.unlockText}>
                  Unlocks at Level {variation.unlockLevel}
                </Text>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.dark.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: screenHeight * 0.85,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  variationIcon: {
    fontSize: 40,
  },
  variationName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.dark.text,
    marginBottom: 4,
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
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
  description: {
    fontSize: 15,
    color: Colors.dark.textSecondary,
    lineHeight: 24,
  },
  videoPlaceholder: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.dark.border,
    borderStyle: 'dashed',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.dark.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  videoText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  xpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginBottom: 24,
  },
  xpText: {
    fontSize: 14,
    color: Colors.dark.warning,
    fontWeight: '600',
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  muscleTag: {
    backgroundColor: Colors.dark.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  muscleTagText: {
    fontSize: 14,
    color: Colors.dark.text,
    fontWeight: '500',
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: Colors.dark.textSecondary,
    lineHeight: 20,
  },
  mistakeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  mistakeText: {
    flex: 1,
    fontSize: 14,
    color: Colors.dark.textSecondary,
    lineHeight: 20,
  },
  unlockSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  unlockText: {
    fontSize: 14,
    color: Colors.dark.textMuted,
  },
});


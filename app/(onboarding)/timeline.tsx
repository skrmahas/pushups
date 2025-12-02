import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { Timeline } from '@/lib/plan-generator';
import { useStore } from '@/lib/store';
import { saveOnboardingData, getOnboardingData } from '@/lib/workout-plan';

interface TimelineOption {
  months: Timeline;
  label: string;
  description: string;
  pace: string;
}

const TIMELINE_OPTIONS: TimelineOption[] = [
  {
    months: 1,
    label: '1 Month',
    description: 'Intensive fast-track program',
    pace: 'Very Fast',
  },
  {
    months: 3,
    label: '3 Months',
    description: 'Balanced progression with good results',
    pace: 'Moderate',
  },
  {
    months: 6,
    label: '6 Months',
    description: 'Steady journey with lasting habits',
    pace: 'Steady',
  },
  {
    months: 12,
    label: '12 Months',
    description: 'Long-term sustainable approach',
    pace: 'Relaxed',
  },
];

export default function TimelineScreen() {
  const router = useRouter();
  const session = useStore((state) => state.session);
  const [selectedTimeline, setSelectedTimeline] = useState<Timeline | null>(null);
  const [saving, setSaving] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleContinue = async () => {
    if (!selectedTimeline || !session?.user?.id) return;

    setSaving(true);
    const existingData = await getOnboardingData(session.user.id);
    await saveOnboardingData(session.user.id, {
      exerciseType: existingData?.exerciseType || 'pushups',
      intensity: existingData?.intensity || 'intermediate',
      timelineMonths: selectedTimeline,
    });
    setSaving(false);

    router.push('/(onboarding)/assessment');
  };

  const getPaceColor = (pace: string) => {
    switch (pace) {
      case 'Very Fast': return '#EF4444';
      case 'Moderate': return '#F59E0B';
      case 'Steady': return '#3B82F6';
      case 'Relaxed': return '#4ADE80';
      default: return Colors.dark.textMuted;
    }
  };

  return (
    <LinearGradient
      colors={['#1A1A1A', '#0D0D0D', '#0D0D0D']}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.stepIndicator}>Step 4 of 6</Text>
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <Text style={styles.title}>Set Your Timeline</Text>
        <Text style={styles.subtitle}>
          When do you want to reach your goal?
        </Text>

        <View style={styles.optionsContainer}>
          {TIMELINE_OPTIONS.map((option, index) => (
            <TouchableOpacity
              key={option.months}
              style={[
                styles.optionCard,
                selectedTimeline === option.months && styles.optionCardSelected,
              ]}
              onPress={() => setSelectedTimeline(option.months)}
              activeOpacity={0.8}
            >
              <View style={styles.optionLeft}>
                <Text style={styles.optionLabel}>{option.label}</Text>
                <Text style={styles.optionDesc}>{option.description}</Text>
              </View>
              <View style={styles.optionRight}>
                <View style={[styles.paceBadge, { backgroundColor: getPaceColor(option.pace) + '20' }]}>
                  <Text style={[styles.paceText, { color: getPaceColor(option.pace) }]}>
                    {option.pace}
                  </Text>
                </View>
                {selectedTimeline === option.months && (
                  <Ionicons name="checkmark-circle" size={24} color={Colors.dark.accent} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {selectedTimeline && (
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color={Colors.dark.accent} />
            <Text style={styles.infoText}>
              {selectedTimeline === 1 && 'Ambitious! This requires daily dedication and rapid progression.'}
              {selectedTimeline === 3 && 'Perfect balance of challenge and sustainability. Most recommended!'}
              {selectedTimeline === 6 && 'Great for building long-lasting habits with gradual improvement.'}
              {selectedTimeline === 12 && 'The marathon approach - slow and steady wins the race!'}
            </Text>
          </View>
        )}

        <View style={styles.visualTimeline}>
          <View style={styles.timelineBar}>
            <View 
              style={[
                styles.timelineProgress, 
                { 
                  width: selectedTimeline ? `${Math.min(selectedTimeline * 8, 100)}%` : '0%',
                  backgroundColor: selectedTimeline ? getPaceColor(
                    TIMELINE_OPTIONS.find(o => o.months === selectedTimeline)?.pace || ''
                  ) : Colors.dark.accent,
                }
              ]} 
            />
          </View>
          <View style={styles.timelineLabels}>
            <Text style={styles.timelineLabel}>Start</Text>
            <Text style={styles.timelineLabel}>Goal!</Text>
          </View>
        </View>
      </Animated.View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            !selectedTimeline && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!selectedTimeline || saving}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>
            {saving ? 'Saving...' : 'Continue'}
          </Text>
          <Ionicons name="arrow-forward" size={20} color={Colors.dark.background} />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.dark.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepIndicator: {
    fontSize: 14,
    color: Colors.dark.textMuted,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.dark.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.dark.textSecondary,
    marginBottom: 32,
  },
  optionsContainer: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardSelected: {
    borderColor: Colors.dark.accent,
    backgroundColor: Colors.dark.surfaceLight,
  },
  optionLeft: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.dark.text,
    marginBottom: 4,
  },
  optionDesc: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
  },
  optionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  paceText: {
    fontSize: 12,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginTop: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: Colors.dark.textSecondary,
    lineHeight: 20,
  },
  visualTimeline: {
    marginTop: 32,
  },
  timelineBar: {
    height: 8,
    backgroundColor: Colors.dark.surface,
    borderRadius: 4,
    overflow: 'hidden',
  },
  timelineProgress: {
    height: '100%',
    borderRadius: 4,
  },
  timelineLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timelineLabel: {
    fontSize: 12,
    color: Colors.dark.textMuted,
  },
  footer: {
    padding: 24,
    paddingBottom: 40,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.accent,
    paddingVertical: 18,
    borderRadius: 16,
    gap: 8,
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.dark.background,
  },
});


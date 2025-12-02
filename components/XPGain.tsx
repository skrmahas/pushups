import Colors from '@/constants/Colors';
import { XPCalculation } from '@/lib/gamification';
import React, { useEffect, useRef } from 'react';
import { Animated, Modal, StyleSheet, Text, View } from 'react-native';

interface XPGainProps {
  visible: boolean;
  xpCalc: XPCalculation | null;
  onClose: () => void;
}

export default function XPGain({ visible, xpCalc, onClose }: XPGainProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && xpCalc) {
      // Animate in
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto close after delay
      const timeout = setTimeout(() => {
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => onClose());
      }, 3000);

      return () => clearTimeout(timeout);
    }
  }, [visible, xpCalc]);

  if (!visible || !xpCalc) return null;

  return (
    <Modal transparent visible={visible} animationType="none">
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          <Text style={styles.title}>WORKOUT COMPLETE!</Text>
          
          <View style={styles.totalXP}>
            <Text style={styles.xpPlus}>+</Text>
            <Text style={styles.xpNumber}>{xpCalc.totalXP}</Text>
            <Text style={styles.xpLabel}>XP</Text>
          </View>

          <View style={styles.breakdown}>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Base XP</Text>
              <Text style={styles.breakdownValue}>+{xpCalc.baseXP}</Text>
            </View>
            
            {xpCalc.speedBonus > 0 && (
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownLabel}>Speed Bonus</Text>
                <Text style={[styles.breakdownValue, styles.bonus]}>+{xpCalc.speedBonus}</Text>
              </View>
            )}
            
            {xpCalc.difficultyMultiplier !== 1 && (
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownLabel}>Difficulty</Text>
                <Text style={[styles.breakdownValue, styles.bonus]}>×{xpCalc.difficultyMultiplier.toFixed(2)}</Text>
              </View>
            )}

            {xpCalc.variationMultiplier && xpCalc.variationMultiplier !== 1 && (
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownLabel}>Variation</Text>
                <Text style={[styles.breakdownValue, styles.bonus]}>×{xpCalc.variationMultiplier.toFixed(2)}</Text>
              </View>
            )}

            {xpCalc.combinedMultiplier && xpCalc.combinedMultiplier !== 1 && (
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownLabel}>Total Multiplier</Text>
                <Text style={[styles.breakdownValue, styles.highlight]}>×{xpCalc.combinedMultiplier.toFixed(2)}</Text>
              </View>
            )}
            
            {xpCalc.streakBonus > 0 && (
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownLabel}>Streak Bonus</Text>
                <Text style={[styles.breakdownValue, styles.bonus]}>+{xpCalc.streakBonus}</Text>
              </View>
            )}

            {xpCalc.dailyGoalBonus && xpCalc.dailyGoalBonus > 0 && (
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownLabel}>Daily Goal Bonus 🎯</Text>
                <Text style={[styles.breakdownValue, styles.highlight]}>+{xpCalc.dailyGoalBonus}</Text>
              </View>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    minWidth: 280,
    borderWidth: 2,
    borderColor: Colors.dark.accent,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.dark.textSecondary,
    letterSpacing: 2,
    marginBottom: 16,
  },
  totalXP: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 24,
  },
  xpPlus: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.dark.accent,
  },
  xpNumber: {
    fontSize: 56,
    fontWeight: '800',
    color: Colors.dark.accent,
  },
  xpLabel: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.dark.accent,
    marginLeft: 4,
  },
  breakdown: {
    width: '100%',
    gap: 8,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  breakdownLabel: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  bonus: {
    color: Colors.dark.success,
  },
  highlight: {
    color: Colors.dark.warning,
    fontWeight: '700',
  },
});


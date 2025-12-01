import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Animated } from 'react-native';
import { getLevelInfo, formatXP } from '@/lib/gamification';
import Colors from '@/constants/Colors';

interface XPBarProps {
  xp: number;
  showDetails?: boolean;
  size?: 'small' | 'medium' | 'large';
  animated?: boolean;
}

export default function XPBar({ 
  xp, 
  showDetails = true, 
  size = 'medium',
  animated = true,
}: XPBarProps) {
  const levelInfo = getLevelInfo(xp);
  const animatedWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      Animated.timing(animatedWidth, {
        toValue: levelInfo.progress,
        duration: 800,
        useNativeDriver: false,
      }).start();
    } else {
      animatedWidth.setValue(levelInfo.progress);
    }
  }, [levelInfo.progress, animated]);

  const barHeight = size === 'small' ? 6 : size === 'large' ? 14 : 10;
  const fontSize = size === 'small' ? 10 : size === 'large' ? 16 : 12;

  return (
    <View style={styles.container}>
      {showDetails && (
        <View style={styles.header}>
          <View style={styles.levelBadge}>
            <Text style={[styles.levelText, { fontSize: fontSize + 4 }]}>
              {levelInfo.level}
            </Text>
          </View>
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { fontSize }]}>{levelInfo.title}</Text>
            <Text style={[styles.xpText, { fontSize: fontSize - 2 }]}>
              {formatXP(levelInfo.currentXP)} / {formatXP(levelInfo.xpForNextLevel)} XP
            </Text>
          </View>
        </View>
      )}

      <View style={[styles.barContainer, { height: barHeight }]}>
        <Animated.View
          style={[
            styles.barFill,
            {
              width: animatedWidth.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
              height: barHeight,
            },
          ]}
        />
      </View>

      {showDetails && (
        <Text style={styles.progressText}>
          {Math.round(levelInfo.progress)}% to Level {levelInfo.level + 1}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  levelBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.dark.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelText: {
    fontWeight: '800',
    color: Colors.dark.background,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontWeight: '700',
    color: Colors.dark.text,
    marginBottom: 2,
  },
  xpText: {
    color: Colors.dark.textSecondary,
  },
  barContainer: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 10,
    overflow: 'hidden',
  },
  barFill: {
    backgroundColor: Colors.dark.accent,
    borderRadius: 10,
  },
  progressText: {
    fontSize: 11,
    color: Colors.dark.textMuted,
    textAlign: 'right',
    marginTop: 4,
  },
});



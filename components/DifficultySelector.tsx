import Colors from '@/constants/Colors';
import { DIFFICULTIES, Difficulty } from '@/lib/gamification';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface DifficultySelectorProps {
  selectedDifficulty: Difficulty;
  selectedVariation: string;
  userLevel: number;
  onSelectDifficulty: (difficulty: Difficulty) => void;
  onSelectVariation: (variation: string) => void;
}

export default function DifficultySelector({
  selectedDifficulty,
  selectedVariation,
  userLevel,
  onSelectDifficulty,
  onSelectVariation,
}: DifficultySelectorProps) {
  const currentDifficultyConfig = DIFFICULTIES[selectedDifficulty];
  const availableVariations = currentDifficultyConfig.variations.filter(
    v => v.unlockLevel <= userLevel
  );
  const lockedVariations = currentDifficultyConfig.variations.filter(
    v => v.unlockLevel > userLevel
  );

  return (
    <View style={styles.container}>
      {/* Difficulty Tabs */}
      <View style={styles.difficultyTabs}>
        {(Object.keys(DIFFICULTIES) as Difficulty[]).map((diff) => {
          const config = DIFFICULTIES[diff];
          const isSelected = selectedDifficulty === diff;
          
          return (
            <TouchableOpacity
              key={diff}
              style={[
                styles.difficultyTab,
                isSelected && { borderColor: config.color },
              ]}
              onPress={() => onSelectDifficulty(diff)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.difficultyTabText,
                  isSelected && { color: config.color },
                ]}
              >
                {config.name}
              </Text>
              <Text style={styles.multiplierText}>{config.multiplier}x XP</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Description */}
      <Text style={styles.description}>{currentDifficultyConfig.description}</Text>

      {/* Variations */}
      <Text style={styles.sectionTitle}>SELECT VARIATION</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.variationsContainer}
      >
        {availableVariations.map((variation) => {
          const isSelected = selectedVariation === variation.id;
          const totalMultiplier = currentDifficultyConfig.multiplier * variation.xpMultiplier;
          
          return (
            <TouchableOpacity
              key={variation.id}
              style={[
                styles.variationCard,
                isSelected && { borderColor: currentDifficultyConfig.color },
              ]}
              onPress={() => onSelectVariation(variation.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.variationIcon}>{variation.icon}</Text>
              <Text style={styles.variationName}>{variation.name}</Text>
              <Text style={[styles.variationMultiplier, { color: currentDifficultyConfig.color }]}>
                {totalMultiplier.toFixed(2)}x XP
              </Text>
              {isSelected && (
                <View style={[styles.selectedIndicator, { backgroundColor: currentDifficultyConfig.color }]} />
              )}
            </TouchableOpacity>
          );
        })}
        
        {/* Locked variations */}
        {lockedVariations.map((variation) => (
          <View key={variation.id} style={[styles.variationCard, styles.lockedCard]}>
            <Text style={styles.variationIcon}>🔒</Text>
            <Text style={[styles.variationName, styles.lockedText]}>{variation.name}</Text>
            <Text style={styles.unlockText}>Lvl {variation.unlockLevel}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  difficultyTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  difficultyTab: {
    flex: 1,
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  difficultyTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.dark.textSecondary,
    marginBottom: 2,
  },
  multiplierText: {
    fontSize: 10,
    color: Colors.dark.textMuted,
  },
  description: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.dark.textMuted,
    letterSpacing: 1,
    marginBottom: 12,
  },
  variationsContainer: {
    gap: 12,
    paddingRight: 20,
  },
  variationCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    minWidth: 100,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  lockedCard: {
    opacity: 0.5,
  },
  variationIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  variationName: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark.text,
    textAlign: 'center',
  },
  variationMultiplier: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
  lockedText: {
    color: Colors.dark.textMuted,
  },
  unlockText: {
    fontSize: 10,
    color: Colors.dark.textMuted,
    marginTop: 4,
  },
  selectedIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    right: '20%',
    height: 3,
    borderRadius: 2,
  },
});


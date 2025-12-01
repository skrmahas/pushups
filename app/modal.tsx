import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { supabase } from '@/lib/supabase';
import { useStore } from '@/lib/store';
import Colors from '@/constants/Colors';

export default function ModalScreen() {
  const router = useRouter();
  const session = useStore((state) => state.session);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  };

  return (
    <View style={styles.container}>
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
      
      {/* User info */}
      <View style={styles.userSection}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person-circle" size={80} color={Colors.dark.textMuted} />
        </View>
        <Text style={styles.userName}>
          {session?.user?.email || 'User'}
        </Text>
        <Text style={styles.userEmail}>
          Signed in with Google
        </Text>
      </View>

      {/* Info section */}
      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>ABOUT</Text>
        <Text style={styles.infoText}>
          Track your pushups journey from 100 pushups daily (multiple sets) 
          to 100 pushups in a single set.
        </Text>
        
        <View style={styles.featureList}>
          <View style={styles.featureItem}>
            <Ionicons name="timer-outline" size={20} color={Colors.dark.accent} />
            <Text style={styles.featureText}>Real-time workout tracking</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="analytics-outline" size={20} color={Colors.dark.accent} />
            <Text style={styles.featureText}>Progress visualization</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="cloud-outline" size={20} color={Colors.dark.accent} />
            <Text style={styles.featureText}>Cloud sync across devices</Text>
          </View>
        </View>
      </View>

      {/* Sign out button */}
      <TouchableOpacity
        style={styles.signOutButton}
        onPress={handleSignOut}
        activeOpacity={0.8}
      >
        <Ionicons name="log-out-outline" size={20} color="#EF4444" />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      {/* Version */}
      <Text style={styles.version}>Version 1.0.0</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    padding: 24,
  },
  userSection: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 20,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.dark.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  infoSection: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark.textMuted,
    letterSpacing: 1,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    lineHeight: 22,
    marginBottom: 20,
  },
  featureList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 14,
    color: Colors.dark.text,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 24,
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
  },
});

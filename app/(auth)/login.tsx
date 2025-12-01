import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { FontAwesome } from '@expo/vector-icons';

import { supabase } from '@/lib/supabase';
import Colors from '@/constants/Colors';

WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);

      const redirectUrl = AuthSession.makeRedirectUri({
        scheme: 'pushups',
      });
      
      console.log('=== REDIRECT URI ===');
      console.log(redirectUrl);
      console.log('====================');

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl
        );

        if (result.type === 'success') {
          const url = result.url;
          const params = new URL(url).hash.substring(1);
          const urlParams = new URLSearchParams(params);
          
          const accessToken = urlParams.get('access_token');
          const refreshToken = urlParams.get('refresh_token');

          if (accessToken && refreshToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
          }
        }
      }
    } catch (err: any) {
      console.error('Error signing in:', err);
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1A1A1A', '#0D0D0D', '#0D0D0D']}
        style={styles.gradient}
      >
        {/* Decorative circles */}
        <View style={[styles.circle, styles.circle1]} />
        <View style={[styles.circle, styles.circle2]} />
        
        <View style={styles.content}>
          {/* Logo/Icon */}
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <FontAwesome name="hand-rock-o" size={48} color={Colors.dark.accent} />
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>PUSHUPS</Text>
          <Text style={styles.subtitle}>Track your journey to 100</Text>

          {/* Stats preview */}
          <View style={styles.previewContainer}>
            <View style={styles.previewItem}>
              <Text style={styles.previewNumber}>100</Text>
              <Text style={styles.previewLabel}>Daily Goal</Text>
            </View>
            <View style={styles.previewDivider} />
            <View style={styles.previewItem}>
              <Text style={styles.previewNumber}>1</Text>
              <Text style={styles.previewLabel}>Set Target</Text>
            </View>
          </View>

          {/* Description */}
          <Text style={styles.description}>
            Build strength daily until you can complete{'\n'}
            100 pushups in a single set
          </Text>

          {/* Error message */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Sign in button */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleSignIn}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={Colors.dark.background} />
            ) : (
              <>
                <FontAwesome name="google" size={20} color={Colors.dark.background} />
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Terms */}
          <Text style={styles.terms}>
            By continuing, you agree to our Terms of Service{'\n'}
            and Privacy Policy
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  circle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: Colors.dark.accent,
    opacity: 0.05,
  },
  circle1: {
    width: width * 0.8,
    height: width * 0.8,
    top: -width * 0.3,
    right: -width * 0.3,
  },
  circle2: {
    width: width * 0.6,
    height: width * 0.6,
    bottom: -width * 0.2,
    left: -width * 0.2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.dark.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.dark.accent,
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    color: Colors.dark.text,
    letterSpacing: 8,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.dark.textSecondary,
    marginBottom: 40,
    letterSpacing: 2,
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 40,
    marginBottom: 32,
  },
  previewItem: {
    alignItems: 'center',
  },
  previewNumber: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.dark.accent,
  },
  previewLabel: {
    fontSize: 12,
    color: Colors.dark.textMuted,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  previewDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.dark.border,
    marginHorizontal: 32,
  },
  description: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 48,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
  },
  errorText: {
    color: '#EF4444',
    textAlign: 'center',
    fontSize: 14,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.text,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    gap: 12,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.background,
  },
  terms: {
    fontSize: 12,
    color: Colors.dark.textMuted,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 18,
  },
});


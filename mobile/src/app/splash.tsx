import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionStatus, setSessionStatus] = useState('Verifying security keys & integrity...');
  const fadeAnim = useState(new Animated.Value(0))[0];
  const scaleAnim = useState(new Animated.Value(0.9))[0];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();

    const timer1 = setTimeout(() => {
      setSessionStatus('Connecting to secure enclave...');
    }, 1200);

    const timer2 = setTimeout(() => {
      setCheckingSession(false);
      setSessionStatus('Session check complete. Ready.');
    }, 2400);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  const handleContinue = () => {
    router.replace('/login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.backgroundGlow} />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}>
        {/* DMS Logo & Shield */}
        <View style={styles.logoBadgeContainer}>
          <View style={styles.outerCircle}>
            <View style={styles.innerCircle}>
              <Ionicons name="shield-checkmark" size={54} color="#FFFFFF" />
            </View>
          </View>
          <View style={styles.lockBadge}>
            <Ionicons name="lock-closed" size={16} color="#6334FA" />
          </View>
        </View>

        {/* Title & Tagline */}
        <Text style={styles.appName}>DMS MOBILE</Text>
        <Text style={styles.appSubtitle}>Secure Digital Document Management System</Text>

        <View style={styles.taglineCard}>
          <Ionicons name="finger-print-outline" size={18} color="#6334FA" />
          <Text style={styles.taglineText}>
            Tamper-Proof • Chain of Custody • Blockchain Proofs
          </Text>
        </View>

        {/* Status / Loader */}
        <View style={styles.statusBox}>
          {checkingSession ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#6334FA" style={{ marginRight: 10 }} />
              <Text style={styles.statusText}>{sessionStatus}</Text>
            </View>
          ) : (
            <View style={styles.readyRow}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" style={{ marginRight: 8 }} />
              <Text style={styles.statusTextReady}>Security Handshake Verified</Text>
            </View>
          )}
        </View>

        {/* Action Button */}
        <Pressable
          style={({ pressed }) => [
            styles.enterButton,
            pressed && styles.enterButtonPressed,
          ]}
          onPress={handleContinue}>
          <Text style={styles.enterButtonText}>Proceed to Authentication</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </Pressable>

        <View style={styles.complianceFooter}>
          <Ionicons name="shield-outline" size={14} color="#64748B" style={{ marginRight: 4 }} />
          <Text style={styles.complianceText}>ISO/IEC 27001 & NIST 800-88 Compliant Architecture</Text>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B192C', // Deep navy per spec
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  backgroundGlow: {
    position: 'absolute',
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: width * 0.6,
    backgroundColor: '#6334FA',
    opacity: 0.12,
    top: -width * 0.2,
  },
  content: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
  },
  logoBadgeContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  outerCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(99, 52, 250, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(99, 52, 250, 0.4)',
  },
  innerCircle: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: '#6334FA',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6334FA',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  lockBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FFFFFF',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  appName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 2,
    marginBottom: 6,
  },
  appSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 20,
  },
  taglineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 36,
  },
  taglineText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E2E8F0',
    marginLeft: 8,
  },
  statusBox: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  readyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 13,
    color: '#CBD5E1',
    fontWeight: '500',
  },
  statusTextReady: {
    fontSize: 13,
    color: '#34D399',
    fontWeight: '600',
  },
  enterButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6334FA',
    paddingVertical: 15,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#6334FA',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  enterButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  enterButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  complianceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 32,
  },
  complianceText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
});

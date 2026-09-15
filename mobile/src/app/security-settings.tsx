import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StatusBadge } from '@/components/dms';

export default function SecuritySettingsScreen() {
  const router = useRouter();

  const [biometricEnabled, setBiometricEnabled] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [securityAlerts, setSecurityAlerts] = useState(true);

  const handleChangePassword = () => {
    Alert.alert(
      'Change Password',
      'An encrypted password change authorization link will be sent to investigator@dms.internal.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send Link', onPress: () => Alert.alert('Request Sent', 'Check your official email.') },
      ]
    );
  };

  const handleLogoutAllDevices = () => {
    Alert.alert(
      'Logout from All Active Sessions',
      'This will invalidate cryptographic access tokens across all mobile, desktop, and tablet devices immediately.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke All Sessions',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Sessions Terminated', 'All other devices logged out.');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0B192C" />
        </Pressable>
        <Text style={styles.headerTitle}>Security Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Authentication Security */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Authentication & Credentials</Text>

          <Pressable style={styles.menuRow} onPress={handleChangePassword}>
            <View style={styles.menuIconBox}>
              <Ionicons name="key-outline" size={20} color="#6334FA" />
            </View>
            <View style={styles.menuTextCol}>
              <Text style={styles.menuTitle}>Change Master Password</Text>
              <Text style={styles.menuSub}>Last updated 42 days ago</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </Pressable>

          <View style={styles.switchRow}>
            <View style={styles.menuIconBox}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#10B981" />
            </View>
            <View style={styles.menuTextCol}>
              <Text style={styles.menuTitle}>Hardware 2FA / OTP Enforcement</Text>
              <Text style={styles.menuSub}>Required for sensitive case actions</Text>
            </View>
            <Switch
              value={twoFactorEnabled}
              onValueChange={setTwoFactorEnabled}
              trackColor={{ false: '#CBD5E1', true: '#6334FA' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.switchRow, { borderBottomWidth: 0 }]}>
            <View style={styles.menuIconBox}>
              <Ionicons name="finger-print" size={20} color="#6334FA" />
            </View>
            <View style={styles.menuTextCol}>
              <Text style={styles.menuTitle}>Biometric Unlock</Text>
              <Text style={styles.menuSub}>Face ID / Fingerprint sensor authentication</Text>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={setBiometricEnabled}
              trackColor={{ false: '#CBD5E1', true: '#6334FA' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Active Authorized Sessions & Devices */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Active Sessions & Authorized Devices</Text>

          {/* Device 1: Current */}
          <View style={styles.deviceRow}>
            <View style={styles.deviceIconBox}>
              <Ionicons name="phone-portrait" size={20} color="#6334FA" />
            </View>
            <View style={styles.deviceInfo}>
              <View style={styles.deviceTitleRow}>
                <Text style={styles.deviceName}>iPhone 16 Pro (DMS Enclave)</Text>
                <StatusBadge status="ACTIVE" label="Current" size="small" />
              </View>
              <Text style={styles.deviceSub}>New Delhi, India • IP 10.245.18.42</Text>
            </View>
          </View>

          {/* Device 2: Terminal */}
          <View style={[styles.deviceRow, { borderBottomWidth: 0 }]}>
            <View style={styles.deviceIconBox}>
              <Ionicons name="desktop-outline" size={20} color="#64748B" />
            </View>
            <View style={styles.deviceInfo}>
              <Text style={styles.deviceName}>Judicial Workstation Terminal 04</Text>
              <Text style={styles.deviceSub}>HQ Cyber Unit • Active 2h ago</Text>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [styles.logoutAllBtn, pressed && styles.btnPressed]}
            onPress={handleLogoutAllDevices}>
            <Ionicons name="log-out-outline" size={16} color="#DC2626" />
            <Text style={styles.logoutAllText}>Logout All Other Devices</Text>
          </Pressable>
        </View>

        {/* Security Alerts & Audit Logging */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Alerts & Notifications</Text>
          <View style={[styles.switchRow, { borderBottomWidth: 0 }]}>
            <View style={styles.menuIconBox}>
              <Ionicons name="notifications-outline" size={20} color="#6334FA" />
            </View>
            <View style={styles.menuTextCol}>
              <Text style={styles.menuTitle}>Immediate Security Alerts</Text>
              <Text style={styles.menuSub}>Notify on share revocations & tamper checks</Text>
            </View>
            <Switch
              value={securityAlerts}
              onValueChange={setSecurityAlerts}
              trackColor={{ false: '#CBD5E1', true: '#6334FA' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFD',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0B192C',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0B192C',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    gap: 12,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    gap: 12,
  },
  menuIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FAF5FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuTextCol: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0B192C',
    marginBottom: 2,
  },
  menuSub: {
    fontSize: 11,
    color: '#64748B',
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    gap: 12,
  },
  deviceIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  deviceName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0B192C',
  },
  deviceSub: {
    fontSize: 11,
    color: '#64748B',
  },
  logoutAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 14,
    gap: 8,
  },
  logoutAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  btnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
});

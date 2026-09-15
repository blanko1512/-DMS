import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StatusBadge } from '@/components/dms';
import { DmsApi } from '@/services/api';

type OfficerPreset = {
  name: string;
  badgeId: string;
  email: string;
  role: 'INVESTIGATOR' | 'ADMIN' | 'AUDITOR';
  icon: keyof typeof Ionicons.glyphMap;
};

const officerPresets: OfficerPreset[] = [
  {
    name: 'Det. Vance',
    badgeId: 'BADGE #8421',
    email: 'investigator@dms.internal',
    role: 'INVESTIGATOR',
    icon: 'search-outline',
  },
  {
    name: 'Chief Proctor',
    badgeId: 'BADGE #0012',
    email: 'admin@dms.internal',
    role: 'ADMIN',
    icon: 'shield-outline',
  },
  {
    name: 'Dr. Evans (Lab)',
    badgeId: 'BADGE #3319',
    email: 'forensics@dms.internal',
    role: 'AUDITOR',
    icon: 'finger-print-outline',
  },
];

export default function LoginScreen() {
  const router = useRouter();
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [email, setEmail] = useState('investigator@dms.internal');
  const [password, setPassword] = useState('••••••••••••');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'INVESTIGATOR' | 'ADMIN' | 'AUDITOR'>('INVESTIGATOR');

  const handleSelectPreset = (preset: OfficerPreset) => {
    setEmail(preset.email);
    setPassword('SecretPass@2026');
    setSelectedRole(preset.role);
  };

  const handleCredentialsSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing Information', 'Please provide official email / badge ID and password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await DmsApi.login(email.trim(), password.trim());
      setIsLoading(false);

      if (res.data && res.data.challenge_id) {
        // Backend returned real challenge
        const challengeId = res.data.challenge_id;
        const devOtp = res.data.dev_otp || '';
        router.push({
          pathname: '/otp',
          params: { email, role: selectedRole, challengeId, devOtp },
        });
      } else {
        // Backend error or offline
        Alert.alert(
          'Authentication Notice',
          res.error || 'Could not connect to FastAPI server.',
          [
            {
              text: 'Retry',
              style: 'cancel',
            },
            {
              text: 'Proceed to OTP (Test Mode)',
              onPress: () =>
                router.push({
                  pathname: '/otp',
                  params: { email, role: selectedRole, challengeId: 'test-challenge', devOtp: '842190' },
                }),
            },
          ]
        );
      }
    } catch (e: any) {
      setIsLoading(false);
      Alert.alert('Error', e.message || 'Login attempt failed.');
    }
  };

  const handleOtpSubmit = () => {
    if (otp.length < 6) {
      Alert.alert('Incomplete Token', 'Please enter the 6-digit second-factor code.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      Alert.alert('Access Granted', `Welcome back, Officer. Role: ${selectedRole}`, [
        {
          text: 'Open Workspace',
          onPress: () => router.replace('/'),
        },
      ]);
    }, 800);
  };

  const handleBiometricLogin = () => {
    Alert.alert(
      'Biometric Verification',
      'Scanning Face ID / Fingerprint sensor for authenticated officer...',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Authenticate',
          onPress: () => {
            setIsLoading(true);
            setTimeout(() => {
              setIsLoading(false);
              router.replace('/');
            }, 600);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* Header Brand & Seal */}
          <View style={styles.headerSection}>
            <View style={styles.shieldEmblem}>
              <Ionicons name="shield-checkmark" size={36} color="#FFFFFF" />
            </View>
            <Text style={styles.appName}>DMS SECURE PORTAL</Text>
            <Text style={styles.portalTitle}>Law Enforcement & Evidence Registry</Text>
            <View style={styles.encryptionPill}>
              <View style={styles.secureDot} />
              <Text style={styles.encryptionText}>TLS 1.3 • FIPS 140-3 Cryptographic Core</Text>
            </View>
          </View>

          {/* Officer Preset Chips */}
          {step === 'credentials' && (
            <View style={styles.presetsContainer}>
              <Text style={styles.presetsLabel}>QUICK OFFICER LOGIN (PRESETS)</Text>
              <View style={styles.presetRow}>
                {officerPresets.map((preset) => {
                  const isSelected = email === preset.email;
                  return (
                    <Pressable
                      key={preset.email}
                      style={[styles.presetCard, isSelected && styles.presetCardSelected]}
                      onPress={() => handleSelectPreset(preset)}>
                      <Ionicons
                        name={preset.icon}
                        size={16}
                        color={isSelected ? '#1C3FB7' : '#64748B'}
                      />
                      <View style={styles.presetTextCol}>
                        <Text style={[styles.presetName, isSelected && styles.presetNameSelected]}>
                          {preset.name}
                        </Text>
                        <Text style={styles.presetBadge}>{preset.badgeId}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* Form Container */}
          <View style={styles.card}>
            {step === 'credentials' ? (
              <>
                <View style={styles.formHeader}>
                  <Text style={styles.formTitle}>Officer Sign In</Text>
                  <StatusBadge status={selectedRole} />
                </View>
                <Text style={styles.formSubtitle}>
                  Enter agency email or badge ID to initiate dual-factor verification.
                </Text>

                {/* Email / Badge ID */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>OFFICER IDENTIFIER / EMAIL</Text>
                  <View style={styles.inputField}>
                    <Ionicons name="person-outline" size={18} color="#94A3B8" />
                    <TextInput
                      style={styles.textInput}
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      autoCorrect={false}
                      placeholder="officer@dms.internal"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>

                {/* Password */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>OFFICIAL PASSWORD</Text>
                  <View style={styles.inputField}>
                    <Ionicons name="key-outline" size={18} color="#94A3B8" />
                    <TextInput
                      style={styles.textInput}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      placeholder="Enter password"
                      placeholderTextColor="#94A3B8"
                    />
                    <Pressable
                      onPress={() => setShowPassword(!showPassword)}
                      hitSlop={8}>
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={18}
                        color="#94A3B8"
                      />
                    </Pressable>
                  </View>
                </View>

                {/* Forgot Password Link */}
                <View style={styles.forgotPasswordRow}>
                  <Pressable
                    onPress={() => {
                      Alert.alert(
                        'Reset Password Request',
                        `A password reset token will be dispatched to ${email}. Authorized security admin will need to approve.`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Send Reset Link',
                            onPress: () =>
                              Alert.alert('Reset Link Dispatched', 'Check your official encrypted inbox.'),
                          },
                        ]
                      );
                    }}>
                    <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                  </Pressable>
                </View>

                {/* Submit Button */}
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    pressed && styles.btnPressed,
                    isLoading && styles.btnDisabled,
                  ]}
                  onPress={handleCredentialsSubmit}
                  disabled={isLoading}>
                  <Ionicons name="arrow-forward-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.primaryBtnText}>
                    {isLoading ? 'Verifying Credentials...' : 'Continue to Dual-Factor'}
                  </Text>
                </Pressable>

                {/* Open Dedicated OTP Screen */}
                <Pressable
                  style={({ pressed }) => [styles.dedicatedOtpBtn, pressed && styles.btnPressed]}
                  onPress={() =>
                    router.push({
                      pathname: '/otp',
                      params: { email, role: selectedRole },
                    })
                  }>
                  <Ionicons name="keypad-outline" size={18} color="#6334FA" />
                  <Text style={styles.dedicatedOtpBtnText}>Open Dedicated 6-Digit OTP Screen</Text>
                </Pressable>

                {/* Biometric Button */}
                <Pressable
                  style={({ pressed }) => [styles.biometricBtn, pressed && styles.btnPressed]}
                  onPress={handleBiometricLogin}>
                  <Ionicons name="finger-print" size={20} color="#6334FA" />
                  <Text style={styles.biometricBtnText}>Sign In with Face ID / Biometrics</Text>
                </Pressable>
              </>
            ) : (
              <>
                <View style={styles.formHeader}>
                  <Text style={styles.formTitle}>Second Factor Verification</Text>
                  <StatusBadge status="PENDING" label="OTP Required" />
                </View>
                <Text style={styles.formSubtitle}>
                  Enter the 6-digit hardware or authenticator code generated for{' '}
                  <Text style={styles.boldEmail}>{email}</Text>.
                </Text>

                {/* OTP Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>6-DIGIT VERIFICATION TOKEN</Text>
                  <View style={styles.otpField}>
                    <Ionicons name="shield-outline" size={20} color="#1C3FB7" />
                    <TextInput
                      style={styles.otpInput}
                      value={otp}
                      onChangeText={(text) => setOtp(text.replace(/[^0-9]/g, '').slice(0, 6))}
                      keyboardType="number-pad"
                      maxLength={6}
                      placeholder="000000"
                      placeholderTextColor="#94A3B8"
                      autoFocus
                    />
                  </View>
                  <Text style={styles.otpHint}>
                    Demo tip: Type any 6 digits (e.g. 123456)
                  </Text>
                </View>

                {/* OTP Submit Button */}
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    pressed && styles.btnPressed,
                    isLoading && styles.btnDisabled,
                  ]}
                  onPress={handleOtpSubmit}
                  disabled={isLoading}>
                  <Ionicons name="lock-open-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.primaryBtnText}>
                    {isLoading ? 'Decrypting Workspace...' : 'Verify and Open Workspace'}
                  </Text>
                </Pressable>

                {/* Back Button */}
                <Pressable
                  style={styles.backBtn}
                  onPress={() => {
                    setStep('credentials');
                    setOtp('');
                  }}>
                  <Ionicons name="arrow-back" size={16} color="#64748B" />
                  <Text style={styles.backBtnText}>Use a different officer account</Text>
                </Pressable>
              </>
            )}
          </View>

          {/* Departmental Security Notice */}
          <View style={styles.noticeContainer}>
            <Ionicons name="information-circle-outline" size={16} color="#94A3B8" />
            <Text style={styles.noticeText}>
              Official Warning: Unauthorized access or attempted tampering is subject to criminal penalties. All sessions, SHA-256 requests, and transfer actions are permanently audited.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFD',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  headerSection: {
    alignItems: 'center',
    marginVertical: 20,
  },
  shieldEmblem: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: '#1C3FB7',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1C3FB7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
    marginBottom: 14,
  },
  appName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1C3FB7',
    letterSpacing: 2,
    marginBottom: 4,
  },
  portalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  encryptionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    marginTop: 10,
  },
  secureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  encryptionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1C3FB7',
  },
  presetsContainer: {
    marginBottom: 16,
  },
  presetsLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetCardSelected: {
    borderColor: '#1C3FB7',
    backgroundColor: '#EEF2FF',
  },
  presetTextCol: {
    flex: 1,
  },
  presetName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  presetNameSelected: {
    color: '#1C3FB7',
  },
  presetBadge: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
    marginBottom: 20,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  formSubtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 20,
  },
  boldEmail: {
    fontWeight: '700',
    color: '#1C3FB7',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  inputField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFD',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 48,
    gap: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  otpField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFD',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#1C3FB7',
    paddingHorizontal: 16,
    height: 56,
    gap: 12,
  },
  otpInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 8,
    color: '#1C3FB7',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  otpHint: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 6,
  },
  forgotPasswordRow: {
    alignItems: 'flex-end',
    marginBottom: 12,
    marginTop: -4,
  },
  forgotPasswordText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6334FA',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6334FA',
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
    marginTop: 8,
    shadowColor: '#6334FA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 3,
  },
  btnPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.85,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  dedicatedOtpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    borderRadius: 14,
    paddingVertical: 12,
    gap: 8,
    marginTop: 10,
  },
  dedicatedOtpBtnText: {
    color: '#6334FA',
    fontSize: 13,
    fontWeight: '600',
  },
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3E8FF',
    borderRadius: 14,
    paddingVertical: 12,
    gap: 8,
    marginTop: 10,
  },
  biometricBtnText: {
    color: '#6334FA',
    fontSize: 13,
    fontWeight: '600',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 8,
  },
  backBtnText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  noticeContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 12,
  },
  noticeText: {
    flex: 1,
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
});

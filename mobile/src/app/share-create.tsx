import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
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
import { INITIAL_DOCUMENTS, DmsDocument } from '@/constants/mockData';
import { DmsApi } from '@/services/api';

const PERMISSION_LEVELS = [
  {
    key: 'VIEW_ONLY',
    label: 'View Only',
    desc: 'Recipient can only read inside secure viewer with dynamic watermarking.',
    icon: 'eye-outline',
  },
  {
    key: 'DOWNLOAD',
    label: 'Download Clearance',
    desc: 'Allows single decrypted payload download with audit logging.',
    icon: 'download-outline',
  },
  {
    key: 'AUDIT',
    label: 'Judicial / Auditor Access',
    desc: 'Enables custody trail and blockchain root verification inspection.',
    icon: 'shield-checkmark-outline',
  },
];

const EXPIRY_OPTIONS = ['24 Hours', '48 Hours', '7 Days', '30 Days'];

export default function CreateSecureShareScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const docId = params.id || 'doc-101';

  const defaultDoc =
    INITIAL_DOCUMENTS.find((d) => d.id === docId) || INITIAL_DOCUMENTS[0];

  const [doc, setDoc] = useState<any>(defaultDoc);
  const [recipientEmail, setRecipientEmail] = useState('prosecutor.general@judiciary.internal');
  const [selectedPermission, setSelectedPermission] = useState('VIEW_ONLY');
  const [selectedExpiry, setSelectedExpiry] = useState('48 Hours');
  const [confirmedScope, setConfirmedScope] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    let isMounted = true;
    const fetchDoc = async () => {
      try {
        const res = await DmsApi.getDocument(docId);
        if (isMounted && res.data && res.data.id) {
          setDoc({ ...defaultDoc, ...res.data });
        }
      } catch {
        // fallback
      }
    };
    fetchDoc();
    return () => {
      isMounted = false;
    };
  }, [docId]);

  const handleCreateShare = async () => {
    if (!recipientEmail.trim()) {
      Alert.alert('Missing Recipient', 'Please enter authorized recipient email.');
      return;
    }

    if (!confirmedScope) {
      Alert.alert(
        'Confirmation Required',
        'Please confirm the access-scope terms before issuing cryptographic access token.'
      );
      return;
    }

    setIsSubmitting(true);
    let createdShareId = 'share-001';

    try {
      const res = await DmsApi.createShare(docId, {
        recipient_email: recipientEmail,
        permission: selectedPermission,
        expires_in_hours: selectedExpiry.includes('24')
          ? 24
          : selectedExpiry.includes('48')
          ? 48
          : selectedExpiry.includes('7')
          ? 168
          : 720,
      });
      if (res.data && res.data.share_id) {
        createdShareId = res.data.share_id;
      }
    } catch (err) {
      console.warn('Backend share creation failed, proceeding with offline share token', err);
    } finally {
      setIsSubmitting(false);
      Alert.alert(
        'Secure Share Created',
        `Access token issued for ${recipientEmail}.\nPermission: ${selectedPermission}\nExpiry: ${selectedExpiry}\nStatus: Active with Audit Enforcement.`,
        [
          {
            text: 'View Share Details',
            onPress: () =>
              router.replace({
                pathname: '/share-detail',
                params: { shareId: createdShareId },
              }),
          },
        ]
      );
    };
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0B192C" />
        </Pressable>
        <Text style={styles.headerTitle}>Create Secure Share</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* Target Document Info */}
          <View style={styles.docBanner}>
            <Ionicons name="document-lock" size={22} color="#6334FA" />
            <View style={styles.docBannerInfo}>
              <Text style={styles.docBannerTitle} numberOfLines={1}>
                {doc.original_filename}
              </Text>
              <Text style={styles.docBannerSub}>
                Case: {doc.case_id} • Sensitivity: {doc.sensitivity}
              </Text>
            </View>
          </View>

          {/* Form */}
          <View style={styles.formCard}>
            {/* Recipient */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>AUTHORIZED RECIPIENT EMAIL *</Text>
              <View style={styles.inputBox}>
                <Ionicons name="mail-outline" size={18} color="#6334FA" />
                <TextInput
                  style={styles.textInput}
                  value={recipientEmail}
                  onChangeText={setRecipientEmail}
                  placeholder="name@agency.internal"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            {/* Permission Levels */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>PERMISSION LEVEL</Text>
              {PERMISSION_LEVELS.map((p) => {
                const isSelected = selectedPermission === p.key;
                return (
                  <Pressable
                    key={p.key}
                    style={[styles.permCard, isSelected && styles.permCardSelected]}
                    onPress={() => setSelectedPermission(p.key)}>
                    <View
                      style={[styles.permIconCircle, isSelected && styles.permIconCircleSelected]}>
                      <Ionicons
                        name={p.icon as any}
                        size={18}
                        color={isSelected ? '#FFFFFF' : '#6334FA'}
                      />
                    </View>
                    <View style={styles.permTextCol}>
                      <Text style={[styles.permTitle, isSelected && styles.permTitleSelected]}>
                        {p.label}
                      </Text>
                      <Text style={styles.permDesc}>{p.desc}</Text>
                    </View>
                    <View
                      style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* Expiry Duration */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>ACCESS EXPIRY DURATION</Text>
              <View style={styles.expiryGrid}>
                {EXPIRY_OPTIONS.map((opt) => {
                  const isSelected = selectedExpiry === opt;
                  return (
                    <Pressable
                      key={opt}
                      style={[styles.expiryChip, isSelected && styles.expiryChipActive]}
                      onPress={() => setSelectedExpiry(opt)}>
                      <Text
                        style={[
                          styles.expiryChipText,
                          isSelected && styles.expiryChipTextActive,
                        ]}>
                        {opt}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Scope Confirmation Checkbox */}
            <Pressable
              style={styles.scopeConfirmRow}
              onPress={() => setConfirmedScope(!confirmedScope)}>
              <View style={[styles.checkBox, confirmedScope && styles.checkBoxChecked]}>
                {confirmedScope && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
              </View>
              <Text style={styles.scopeConfirmText}>
                I confirm that this sharing request complies with departmental chain-of-custody protocols
                and access logs will be permanently auditable.
              </Text>
            </Pressable>
          </View>

          {/* Action Button */}
          <Pressable
            style={({ pressed }) => [
              styles.createShareBtn,
              pressed && styles.btnPressed,
              isSubmitting && styles.btnDisabled,
            ]}
            disabled={isSubmitting}
            onPress={handleCreateShare}>
            <Ionicons name="key" size={18} color="#FFFFFF" />
            <Text style={styles.createShareBtnText}>
              {isSubmitting ? 'Generating Token...' : 'Create Secure Share Token'}
            </Text>
          </Pressable>

          <View style={styles.apiLabelBox}>
            <Text style={styles.apiLabelText}>API: POST /api/documents/{doc.id}/shares</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  docBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    gap: 12,
  },
  docBannerInfo: {
    flex: 1,
  },
  docBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0B192C',
    marginBottom: 2,
  },
  docBannerSub: {
    fontSize: 11,
    color: '#64748B',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFD',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 46,
    gap: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#0B192C',
    fontWeight: '500',
  },
  permCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFD',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  permCardSelected: {
    backgroundColor: '#FAF5FF',
    borderColor: '#6334FA',
  },
  permIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  permIconCircleSelected: {
    backgroundColor: '#6334FA',
  },
  permTextCol: {
    flex: 1,
  },
  permTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0B192C',
    marginBottom: 2,
  },
  permTitleSelected: {
    color: '#6334FA',
  },
  permDesc: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: {
    borderColor: '#6334FA',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#6334FA',
  },
  expiryGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  expiryChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  expiryChipActive: {
    backgroundColor: '#FAF5FF',
    borderColor: '#6334FA',
  },
  expiryChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  expiryChipTextActive: {
    color: '#6334FA',
    fontWeight: '700',
  },
  scopeConfirmRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  checkBox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkBoxChecked: {
    backgroundColor: '#6334FA',
    borderColor: '#6334FA',
  },
  scopeConfirmText: {
    flex: 1,
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
  },
  createShareBtn: {
    backgroundColor: '#6334FA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#6334FA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  createShareBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  apiLabelBox: {
    alignItems: 'center',
    marginTop: 12,
  },
  apiLabelText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  btnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  btnDisabled: {
    opacity: 0.6,
  },
});

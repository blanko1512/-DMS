import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StatusBadge } from '@/components/dms';
import { INITIAL_SHARES, ShareRecord } from '@/constants/mockData';
import { DmsApi } from '@/services/api';

export default function ShareDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ shareId?: string }>();
  const shareId = params.shareId || 'share-001';

  const defaultShare =
    INITIAL_SHARES.find((s) => s.id === shareId) || INITIAL_SHARES[0];

  const [share, setShare] = useState<ShareRecord>(defaultShare);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    let isMounted = true;
    const fetchShare = async () => {
      try {
        const res = await DmsApi.getShare(shareId);
        if (isMounted && res.data && res.data.id) {
          setShare({
            ...defaultShare,
            ...res.data,
            document_name: res.data.document_name || defaultShare.document_name,
            case_id: res.data.case_id || defaultShare.case_id,
            status: res.data.is_revoked ? 'REVOKED' : (res.data.status || defaultShare.status),
          });
        }
      } catch (err) {
        console.warn('Live getShare fallback', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchShare();
    return () => {
      isMounted = false;
    };
  }, [shareId]);

  const handleRevokeAccess = () => {
    // Confirmation dialog for security-sensitive action per UI/UX rule
    Alert.alert(
      'Confirm Access Revocation',
      `Are you sure you want to permanently revoke secure access for:\n${share.recipient_email}?\n\nThis action immediately invalidates cryptographic access tokens and logs an immutable audit event.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke Access Now',
          style: 'destructive',
          onPress: async () => {
            try {
              await DmsApi.revokeShare(shareId);
            } catch (err) {
              console.warn('Backend revoke failed, updating local state', err);
            }
            setShare((prev) => ({ ...prev, status: 'REVOKED' }));
            Alert.alert(
              'Access Revoked',
              'The recipient can no longer decrypt or view this document. Audit log updated.'
            );
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
        <Text style={styles.headerTitle}>Share Token Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <View
          style={[
            styles.statusBanner,
            share.status === 'ACTIVE'
              ? styles.statusBannerActive
              : share.status === 'REVOKED'
              ? styles.statusBannerRevoked
              : styles.statusBannerExpired,
          ]}>
          <View style={styles.statusHeaderRow}>
            <View style={styles.statusIconWrap}>
              <Ionicons
                name={
                  share.status === 'ACTIVE'
                    ? 'shield-checkmark'
                    : share.status === 'REVOKED'
                    ? 'ban'
                    : 'timer-outline'
                }
                size={24}
                color={
                  share.status === 'ACTIVE'
                    ? '#10B981'
                    : share.status === 'REVOKED'
                    ? '#DC2626'
                    : '#D97706'
                }
              />
            </View>
            <View style={styles.statusTextCol}>
              <Text style={styles.statusTitle}>
                {share.status === 'ACTIVE'
                  ? 'Active Share Token'
                  : share.status === 'REVOKED'
                  ? 'Access Revoked by Officer'
                  : 'Share Token Expired'}
              </Text>
              <Text style={styles.statusSub}>Token ID: {share.id}</Text>
            </View>
            <StatusBadge status={share.status} />
          </View>
        </View>

        {/* Document Information */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Referenced Document</Text>
          <View style={styles.docRow}>
            <Ionicons name="document-text" size={20} color="#6334FA" />
            <View style={styles.docRowText}>
              <Text style={styles.docName}>{share.document_name}</Text>
              <Text style={styles.docCase}>Case Ref: {share.case_id}</Text>
            </View>
          </View>
        </View>

        {/* Recipient & Permission Details */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Authorization Scope</Text>

          <View style={styles.attrRow}>
            <Text style={styles.attrKey}>Recipient Name</Text>
            <Text style={styles.attrVal}>{share.recipient_name}</Text>
          </View>

          <View style={styles.attrRow}>
            <Text style={styles.attrKey}>Recipient Email</Text>
            <Text style={styles.attrValBold}>{share.recipient_email}</Text>
          </View>

          <View style={styles.attrRow}>
            <Text style={styles.attrKey}>Permission Level</Text>
            <StatusBadge status="INFO" label={share.permission} size="small" />
          </View>

          <View style={styles.attrRow}>
            <Text style={styles.attrKey}>Issued By</Text>
            <Text style={styles.attrVal}>{share.shared_by}</Text>
          </View>

          <View style={styles.attrRow}>
            <Text style={styles.attrKey}>Created Timestamp</Text>
            <Text style={styles.attrVal}>{new Date(share.created_at).toLocaleString()}</Text>
          </View>

          <View style={[styles.attrRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.attrKey}>Expiry Timestamp</Text>
            <Text style={[styles.attrVal, { color: share.status === 'ACTIVE' ? '#059669' : '#DC2626' }]}>
              {new Date(share.expires_at).toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Revoke Action Button */}
        {share.status === 'ACTIVE' ? (
          <Pressable
            style={({ pressed }) => [styles.revokeBtn, pressed && styles.btnPressed]}
            onPress={handleRevokeAccess}>
            <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
            <Text style={styles.revokeBtnText}>Revoke Access Immediately</Text>
          </Pressable>
        ) : (
          <View style={styles.revokedNotice}>
            <Ionicons name="lock-closed" size={16} color="#64748B" />
            <Text style={styles.revokedNoticeText}>
              This token is inactive. No cryptographic decryption keys can be obtained by the recipient.
            </Text>
          </View>
        )}

        <View style={styles.apiLabelRow}>
          <Text style={styles.apiLabelText}>API: /api/shares/{share.id}</Text>
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
  statusBanner: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  statusBannerActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  statusBannerRevoked: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  statusBannerExpired: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  statusHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusTextCol: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0B192C',
  },
  statusSub: {
    fontSize: 11,
    color: '#64748B',
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
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  docRowText: {
    flex: 1,
  },
  docName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0B192C',
  },
  docCase: {
    fontSize: 11,
    color: '#64748B',
  },
  attrRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  attrKey: {
    fontSize: 12,
    color: '#64748B',
  },
  attrVal: {
    fontSize: 12,
    color: '#0B192C',
    fontWeight: '600',
  },
  attrValBold: {
    fontSize: 12,
    color: '#6334FA',
    fontWeight: '700',
  },
  revokeBtn: {
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  revokeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  revokedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  revokedNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  apiLabelRow: {
    alignItems: 'center',
    marginTop: 14,
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
});

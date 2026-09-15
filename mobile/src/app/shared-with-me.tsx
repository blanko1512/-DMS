import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StatusBadge } from '@/components/dms';
import { INITIAL_SHARES, ShareRecord } from '@/constants/mockData';
import { DmsApi } from '@/services/api';

export default function SharedWithMeScreen() {
  const router = useRouter();
  const [shares, setShares] = useState<ShareRecord[]>(INITIAL_SHARES);
  const [refreshing, setRefreshing] = useState(false);

  const fetchShares = async () => {
    try {
      const res = await DmsApi.listDocuments(10, 0);
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        const dynamicShares: ShareRecord[] = res.data.slice(0, 3).map((d: any, idx: number) => ({
          id: `share-${d.id}`,
          document_id: d.id,
          document_name: d.original_filename || 'Evidence_File.pdf',
          case_id: d.case_id || 'CASE-2026-089',
          recipient_email: 'investigator@dms.internal',
          recipient_name: 'Det. Vance',
          permission: (idx === 0 ? 'VIEW_ONLY' : idx === 1 ? 'DOWNLOAD' : 'AUDIT') as 'VIEW_ONLY' | 'DOWNLOAD' | 'AUDIT',
          status: 'ACTIVE' as const,
          created_at: d.created_at || new Date().toISOString(),
          expires_at: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(),
          shared_by: d.uploader || 'Senior Officer',
        }));
        setShares(dynamicShares);
      }
    } catch {
      // fallback to initial
    }
  };

  React.useEffect(() => {
    fetchShares();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchShares();
    setRefreshing(false);
  };

  const handleOpenDocument = (share: ShareRecord) => {
    if (share.status !== 'ACTIVE') {
      Alert.alert(
        'Access Denied',
        `This shared document link is currently ${share.status}. You cannot decrypt or view the payload.`
      );
      return;
    }

    router.push({
      pathname: '/document-detail',
      params: { id: share.document_id },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0B192C" />
        </Pressable>
        <Text style={styles.headerTitle}>Shared With Me</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={shares}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.headerTitleText}>Authorized Inbound Shares</Text>
            <Text style={styles.headerSubText}>
              Evidence & investigation documents shared with your officer credentials by other units.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isAuthorized = item.status === 'ACTIVE';

          return (
            <Pressable
              style={({ pressed }) => [
                styles.shareCard,
                pressed && styles.cardPressed,
                !isAuthorized && styles.cardMuted,
              ]}
              onPress={() => handleOpenDocument(item)}>
              <View style={styles.cardTopRow}>
                <View style={styles.iconCircle}>
                  <Ionicons
                    name="document-text"
                    size={20}
                    color={isAuthorized ? '#6334FA' : '#94A3B8'}
                  />
                </View>
                <View style={styles.docTitleCol}>
                  <Text style={[styles.docName, !isAuthorized && styles.textMuted]}>
                    {item.document_name}
                  </Text>
                  <Text style={styles.caseId}>Case Ref: {item.case_id}</Text>
                </View>
                <StatusBadge status={item.status} size="small" />
              </View>

              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Shared By</Text>
                  <Text style={styles.metaValue}>{item.shared_by}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Permission</Text>
                  <Text style={styles.metaValue}>{item.permission}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Expires</Text>
                  <Text
                    style={[
                      styles.metaValue,
                      item.status === 'ACTIVE' ? styles.textActive : styles.textDanger,
                    ]}>
                    {new Date(item.expires_at).toLocaleDateString()}
                  </Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                {isAuthorized ? (
                  <View style={styles.openRow}>
                    <Text style={styles.openText}>Tap to Open Authorized Document</Text>
                    <Ionicons name="arrow-forward" size={14} color="#6334FA" />
                  </View>
                ) : (
                  <View style={styles.deniedRow}>
                    <Ionicons name="lock-closed" size={12} color="#94A3B8" />
                    <Text style={styles.deniedText}>Access Token Inactive ({item.status})</Text>
                  </View>
                )}
              </View>
            </Pressable>
          );
        }}
      />
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
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  listHeader: {
    marginBottom: 16,
  },
  headerTitleText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0B192C',
    marginBottom: 4,
  },
  headerSubText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  shareCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0B192C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardMuted: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  cardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FAF5FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  docTitleCol: {
    flex: 1,
  },
  docName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0B192C',
    marginBottom: 2,
  },
  textMuted: {
    color: '#64748B',
  },
  caseId: {
    fontSize: 11,
    color: '#64748B',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFD',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0B192C',
  },
  textActive: {
    color: '#059669',
  },
  textDanger: {
    color: '#DC2626',
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  openRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  openText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6334FA',
  },
  deniedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deniedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
});

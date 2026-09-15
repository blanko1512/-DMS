import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StatusBadge } from '@/components/dms';
import { INITIAL_AUDIT_LOGS, AuditLogRecord } from '@/constants/mockData';
import { DmsApi } from '@/services/api';

const CATEGORIES = ['ALL', 'VERIFY', 'UPLOAD', 'SHARE', 'BLOCKCHAIN', 'ADMIN'];

export default function AuditTrailScreen() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [logs, setLogs] = useState<AuditLogRecord[]>(INITIAL_AUDIT_LOGS);
  const [refreshing, setRefreshing] = useState(false);
  const [isLive, setIsLive] = useState(false);

  const fetchLogs = async () => {
    try {
      const res = await DmsApi.listAuditLogs(100, 0);
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        const mapped: AuditLogRecord[] = res.data.map((l: any, idx: number) => ({
          id: l.id || `audit-${idx}`,
          action: l.action || 'AUDIT_RECORD',
          action_category: (l.action_category || 'ADMIN').toUpperCase(),
          actor: l.user_email || l.actor || 'System Engine',
          actor_role: l.actor_role || 'INVESTIGATOR',
          details: l.details || l.description || 'System event recorded in append-only log.',
          reference: l.document_id || l.reference || 'SYSTEM',
          timestamp: l.timestamp || new Date().toISOString(),
          status: (l.status || 'SUCCESS').toUpperCase(),
          ip_address: l.ip_address || '127.0.0.1',
        }));
        setLogs(mapped);
        setIsLive(true);
      }
    } catch {
      setIsLive(false);
    }
  };

  React.useEffect(() => {
    fetchLogs();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLogs();
    setRefreshing(false);
  };

  const filteredLogs = logs.filter((log) => {
    return selectedCategory === 'ALL' || log.action_category === selectedCategory;
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0B192C" />
        </Pressable>
        <Text style={styles.headerTitle}>System Audit Trail</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Category Filter Chips */}
      <View style={styles.filterWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <Pressable
                key={cat}
                style={[styles.filterChip, isSelected && styles.filterChipActive]}
                onPress={() => setSelectedCategory(cat)}>
                <Text style={[styles.filterText, isSelected && styles.filterTextActive]}>
                  {cat}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Audit Log Entries List */}
      <FlatList
        data={filteredLogs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6334FA" />
        }
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <View style={styles.auditInfoBanner}>
              <Ionicons name="shield-checkmark" size={16} color="#6334FA" />
              <Text style={styles.auditInfoText}>
                Immutable append-only activity log • Tamper detection enabled
              </Text>
            </View>
            <View style={styles.statsRow}>
              <Text style={styles.statsCount}>{filteredLogs.length} Events Logged</Text>
              <Text style={styles.apiBadge}>API: GET /api/audit-logs</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.logCard}>
            <View style={styles.logTopRow}>
              <View style={styles.actionBadgeWrap}>
                <Text style={styles.actionName}>{item.action}</Text>
                <StatusBadge status={item.status} size="small" />
              </View>
              <Text style={styles.timestampText}>
                {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>

            <Text style={styles.detailsText}>{item.details}</Text>

            <View style={styles.metaBox}>
              <View style={styles.metaCol}>
                <Text style={styles.metaLabel}>ACTOR</Text>
                <Text style={styles.metaVal}>{item.actor}</Text>
              </View>
              <View style={styles.metaCol}>
                <Text style={styles.metaLabel}>REF / DOC</Text>
                <Text style={styles.metaVal} numberOfLines={1}>{item.reference}</Text>
              </View>
              <View style={styles.metaCol}>
                <Text style={styles.metaLabel}>NODE IP</Text>
                <Text style={styles.metaValMono}>{item.ip_address}</Text>
              </View>
            </View>
          </View>
        )}
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
  filterWrapper: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  filterScroll: {
    paddingHorizontal: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#FAF5FF',
    borderColor: '#6334FA',
  },
  filterText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  filterTextActive: {
    color: '#6334FA',
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  listHeader: {
    marginBottom: 16,
  },
  auditInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF5FF',
    borderRadius: 12,
    padding: 10,
    gap: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  auditInfoText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6334FA',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  apiBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6334FA',
  },
  logCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  logTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0B192C',
  },
  timestampText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  detailsText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 16,
    marginBottom: 10,
  },
  metaBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFD',
    borderRadius: 8,
    padding: 8,
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 2,
  },
  metaVal: {
    fontSize: 10,
    fontWeight: '600',
    color: '#0B192C',
  },
  metaValMono: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#6334FA',
  },
});

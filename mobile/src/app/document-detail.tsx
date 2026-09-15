import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StatusBadge } from '@/components/dms';
import { INITIAL_DOCUMENTS, DmsDocument } from '@/constants/mockData';
import { DmsApi } from '@/services/api';
import { DocumentStore } from '@/services/documentStore';

export default function DocumentDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const docId = params.id || 'doc-103';

  const defaultDoc =
    DocumentStore.getDocumentById(docId) ||
    INITIAL_DOCUMENTS.find((d) => d.id === docId) ||
    INITIAL_DOCUMENTS[2];

  const [doc, setDoc] = useState<any>(defaultDoc);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadDoc = async () => {
      try {
        const res = await DmsApi.getDocument(docId);
        if (isMounted && res.data && res.data.id) {
          setDoc({
            ...defaultDoc,
            ...res.data,
            uploader: res.data.uploader_name || defaultDoc.uploader,
            uploader_role: res.data.uploader_role || defaultDoc.uploader_role,
          });
          setIsLive(true);
        }
      } catch (err) {
        console.warn('Live getDocument failed, using fallback', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadDoc();
    return () => {
      isMounted = false;
    };
  }, [docId]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0B192C" />
        </Pressable>
        <Text style={styles.headerTitle}>{isLive ? 'Document (Live DB)' : 'Document Overview'}</Text>
        <Pressable
          style={styles.headerShareBtn}
          onPress={() =>
            router.push({
              pathname: '/share-create',
              params: { id: doc.id },
            })
          }>
          <Ionicons name="share-outline" size={20} color="#6334FA" />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Document Preview Thumbnail & Identity */}
        <View style={styles.previewCard}>
          <View style={styles.previewHeader}>
            <View style={styles.typeBadge}>
              <Ionicons name="document-text" size={16} color="#6334FA" />
              <Text style={styles.typeBadgeText}>{doc.document_type}</Text>
            </View>
            <StatusBadge status={doc.status} />
          </View>

          <Text style={styles.docTitle}>{doc.original_filename}</Text>
          <Text style={styles.caseBadgeText}>Case Ref: {doc.case_id}</Text>

          {/* Quick Action Buttons Row (View / Share / Verify / Versions / Custody) */}
          <View style={styles.actionGrid}>
            <Pressable
              style={styles.actionBtnPrimary}
              onPress={() =>
                router.push({
                  pathname: '/document-viewer',
                  params: { id: doc.id },
                })
              }>
              <Ionicons name="eye" size={18} color="#FFFFFF" />
              <Text style={styles.actionBtnPrimaryText}>View Document</Text>
            </Pressable>

            <Pressable
              style={styles.actionBtn}
              onPress={() =>
                router.push({
                  pathname: '/integrity',
                  params: { id: doc.id },
                })
              }>
              <Ionicons name="finger-print" size={18} color="#6334FA" />
              <Text style={styles.actionBtnText}>Verify Hash</Text>
            </Pressable>
          </View>

          <View style={styles.secondaryActionRow}>
            <Pressable
              style={styles.secondaryActionBtn}
              onPress={() =>
                router.push({
                  pathname: '/blockchain',
                  params: { id: doc.id },
                })
              }>
              <Ionicons name="cube-outline" size={16} color="#0B192C" />
              <Text style={styles.secondaryActionText}>Blockchain Proof</Text>
            </Pressable>

            <Pressable
              style={styles.secondaryActionBtn}
              onPress={() =>
                router.push({
                  pathname: '/custody',
                  params: { id: doc.id },
                })
              }>
              <Ionicons name="swap-horizontal-outline" size={16} color="#0B192C" />
              <Text style={styles.secondaryActionText}>Custody Chain</Text>
            </Pressable>

            <Pressable
              style={styles.secondaryActionBtn}
              onPress={() =>
                router.push({
                  pathname: '/versions',
                  params: { id: doc.id },
                })
              }>
              <Ionicons name="git-branch-outline" size={16} color="#0B192C" />
              <Text style={styles.secondaryActionText}>Versions</Text>
            </Pressable>

            <Pressable
              style={styles.secondaryActionBtn}
              onPress={() =>
                router.push({
                  pathname: '/duplicates',
                  params: { id: doc.id },
                })
              }>
              <Ionicons name="copy-outline" size={16} color="#0B192C" />
              <Text style={styles.secondaryActionText}>Duplicates</Text>
            </Pressable>
          </View>
        </View>

        {/* Security Summary Card */}
        <View style={styles.securitySummaryCard}>
          <View style={styles.secHeaderRow}>
            <View style={styles.secShield}>
              <Ionicons name="shield-checkmark" size={18} color="#10B981" />
            </View>
            <Text style={styles.secTitle}>Cryptographic Security Summary</Text>
          </View>

          <View style={styles.hashBox}>
            <Text style={styles.hashLabel}>SHA-256 IMMUTABLE DIGEST</Text>
            <Text style={styles.hashValue} numberOfLines={2}>
              {doc.sha256_hash}
            </Text>
          </View>

          <View style={styles.secMetricsGrid}>
            <View style={styles.secMetric}>
              <Text style={styles.secMetricLabel}>EVM BLOCK</Text>
              <Text style={styles.secMetricVal}>#{doc.block_number || '4921842'}</Text>
            </View>
            <View style={styles.secMetric}>
              <Text style={styles.secMetricLabel}>ENCRYPTION</Text>
              <Text style={styles.secMetricVal}>AES-256-GCM</Text>
            </View>
            <View style={styles.secMetric}>
              <Text style={styles.secMetricLabel}>RBAC AUDIT</Text>
              <Text style={styles.secMetricVal}>Enforced</Text>
            </View>
          </View>
        </View>

        {/* Metadata Details Table */}
        <View style={styles.metaCard}>
          <Text style={styles.metaCardTitle}>File & Ownership Attributes</Text>

          <View style={styles.metaRow}>
            <Text style={styles.metaKey}>Assigned Department</Text>
            <Text style={styles.metaVal}>{doc.department}</Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaKey}>Ingestion Officer</Text>
            <Text style={styles.metaVal}>
              {doc.uploader} ({doc.uploader_role})
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaKey}>Sensitivity Level</Text>
            <StatusBadge status={doc.sensitivity} size="small" />
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaKey}>File Size / MIME</Text>
            <Text style={styles.metaVal}>
              {(doc.file_size / (1024 * 1024)).toFixed(2)} MB • {doc.mime_type}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaKey}>Ingestion Timestamp</Text>
            <Text style={styles.metaVal}>{new Date(doc.created_at).toLocaleString()}</Text>
          </View>

          <View style={[styles.metaRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.metaKey}>Repository Version</Text>
            <Text style={styles.metaVal}>{doc.version}</Text>
          </View>
        </View>

        {/* Secure Share CTA */}
        <Pressable
          style={({ pressed }) => [styles.shareCtaBtn, pressed && styles.btnPressed]}
          onPress={() =>
            router.push({
              pathname: '/share-create',
              params: { id: doc.id },
            })
          }>
          <Ionicons name="share-social-outline" size={18} color="#6334FA" />
          <Text style={styles.shareCtaText}>Create Secure Share Token</Text>
        </Pressable>
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
  headerShareBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FAF5FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF5FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 6,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6334FA',
  },
  docTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0B192C',
    marginBottom: 4,
  },
  caseBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 16,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  actionBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6334FA',
    paddingVertical: 13,
    borderRadius: 12,
    gap: 6,
    shadowColor: '#6334FA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  actionBtnPrimaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    paddingVertical: 13,
    borderRadius: 12,
    gap: 6,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6334FA',
  },
  secondaryActionRow: {
    flexDirection: 'row',
    gap: 6,
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFD',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 4,
  },
  secondaryActionText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0B192C',
    textAlign: 'center',
  },
  securitySummaryCard: {
    backgroundColor: '#0B192C',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  secHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  secShield: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  hashBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  hashLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  hashValue: {
    fontSize: 11,
    color: '#CBD5E1',
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  secMetricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 10,
    padding: 10,
  },
  secMetric: {
    alignItems: 'center',
  },
  secMetricLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 2,
  },
  secMetricVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  metaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  metaCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0B192C',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  metaKey: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  metaVal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0B192C',
  },
  shareCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#6334FA',
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
  },
  shareCtaText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6334FA',
  },
  btnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
});

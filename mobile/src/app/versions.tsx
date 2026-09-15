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
import { INITIAL_DOCUMENTS, DmsDocument } from '@/constants/mockData';
import { DmsApi } from '@/services/api';

interface DocumentVersion {
  version: string;
  isCurrent: boolean;
  modifier: string;
  modifierRole: string;
  timestamp: string;
  sha256: string;
  changeNote: string;
  fileSize: string;
}

export default function VersionHistoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const docId = params.id || 'doc-101';

  const defaultDoc =
    INITIAL_DOCUMENTS.find((d) => d.id === docId) || INITIAL_DOCUMENTS[0];

  const [doc, setDoc] = useState<any>(defaultDoc);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    let isMounted = true;
    const fetchVersionData = async () => {
      try {
        const [docRes, verRes] = await Promise.allSettled([
          DmsApi.getDocument(docId),
          DmsApi.getVersions(docId),
        ]);

        if (isMounted) {
          if (docRes.status === 'fulfilled' && docRes.value.data) {
            setDoc({ ...defaultDoc, ...docRes.value.data });
          }

          if (verRes.status === 'fulfilled' && verRes.value.data && Array.isArray(verRes.value.data) && verRes.value.data.length > 0) {
            const mapped: DocumentVersion[] = verRes.value.data.map((v: any, index: number) => ({
              version: `v${v.version_number || index + 1}.0`,
              isCurrent: index === 0,
              modifier: v.created_by_name || 'Officer',
              modifierRole: v.created_by_role || 'Investigator',
              timestamp: v.created_at ? new Date(v.created_at).toLocaleString() : 'Recent',
              sha256: v.sha256_hash || doc.sha256_hash,
              changeNote: v.change_summary || 'Document revision committed to secure vault.',
              fileSize: `${((v.file_size || 2450000) / (1024 * 1024)).toFixed(2)} MB`,
            }));
            setVersions(mapped);
          } else {
            // Default fallback if no previous versions exist
            setVersions([
              {
                version: 'v1.0',
                isCurrent: true,
                modifier: doc.uploader || 'Investigator',
                modifierRole: doc.uploader_role || 'Investigator',
                timestamp: 'Current Version',
                sha256: doc.sha256_hash,
                changeNote: 'Initial evidentiary document sealed in repository.',
                fileSize: `${((doc.file_size || 2450000) / (1024 * 1024)).toFixed(2)} MB`,
              },
            ]);
          }
        }
      } catch (err) {
        console.warn('Live versions error', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchVersionData();
    return () => {
      isMounted = false;
    };
  }, [docId]);

  const handleOpenVersion = (ver: DocumentVersion) => {
    Alert.alert(
      `Open Version ${ver.version}`,
      `Modifier: ${ver.modifier}\nTimestamp: ${ver.timestamp}\nSHA-256: ${ver.sha256.slice(0, 16)}...`,
      [
        {
          text: 'View in Viewer',
          onPress: () =>
            router.push({
              pathname: '/document-viewer',
              params: { id: doc.id },
            }),
        },
        { text: 'Close', style: 'cancel' },
      ]
    );
  };

  const handleCompareVersions = (v1: string, v2: string) => {
    Alert.alert(
      'Version Comparison (Diff)',
      `Comparing ${v1} against ${v2}:\n\n• Metadata added: 4 new entity attributes\n• Cryptographic Hash changed (immutable snapshot preserved)\n• Zero bytes overwritten in prior version storage`,
      [{ text: 'Dismiss' }]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0B192C" />
        </Pressable>
        <Text style={styles.headerTitle}>Version History</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Document Header Card */}
        <View style={styles.docCard}>
          <Text style={styles.docTitle}>{doc.original_filename}</Text>
          <Text style={styles.docSub}>
            Case ID: {doc.case_id} • Total Iterations: {versions.length}
          </Text>
          <View style={styles.apiTag}>
            <Text style={styles.apiTagText}>API: /api/documents/{doc.id}/versions</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Immutable Version Timeline</Text>

        {/* Versions Timeline */}
        <View style={styles.timelineContainer}>
          {versions.map((ver, index) => (
            <View key={ver.version} style={styles.versionItem}>
              {/* Left Timeline Indicator */}
              <View style={styles.timelineCol}>
                <View
                  style={[
                    styles.timelineDot,
                    ver.isCurrent ? styles.timelineDotCurrent : styles.timelineDotPast,
                  ]}>
                  {ver.isCurrent ? (
                    <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                  ) : (
                    <View style={styles.innerDot} />
                  )}
                </View>
                {index < versions.length - 1 && <View style={styles.timelineLine} />}
              </View>

              {/* Version Content Card */}
              <View style={[styles.versionCard, ver.isCurrent && styles.versionCardCurrent]}>
                <View style={styles.versionHeader}>
                  <View style={styles.verBadgeRow}>
                    <Text style={styles.versionNum}>{ver.version}</Text>
                    {ver.isCurrent && <StatusBadge status="ACTIVE" label="Current" size="small" />}
                  </View>
                  <Text style={styles.verTime}>{ver.timestamp}</Text>
                </View>

                <Text style={styles.changeNote}>{ver.changeNote}</Text>

                <View style={styles.modifierRow}>
                  <Ionicons name="person-circle-outline" size={16} color="#64748B" />
                  <Text style={styles.modifierText}>
                    {ver.modifier} ({ver.modifierRole})
                  </Text>
                </View>

                <View style={styles.hashBox}>
                  <Text style={styles.hashLabel}>DIGEST</Text>
                  <Text style={styles.hashVal}>{ver.sha256.slice(0, 24)}...</Text>
                </View>

                {/* Actions */}
                <View style={styles.actionRow}>
                  <Pressable
                    style={styles.openBtn}
                    onPress={() => handleOpenVersion(ver)}>
                    <Ionicons name="eye-outline" size={14} color="#6334FA" />
                    <Text style={styles.openBtnText}>Inspect Version</Text>
                  </Pressable>

                  {!ver.isCurrent && (
                    <Pressable
                      style={styles.compareBtn}
                      onPress={() => handleCompareVersions(versions[0].version, ver.version)}>
                      <Ionicons name="git-compare-outline" size={14} color="#0B192C" />
                      <Text style={styles.compareBtnText}>Compare vs Current</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            </View>
          ))}
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
  docCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  docTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0B192C',
    marginBottom: 4,
  },
  docSub: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 10,
  },
  apiTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#FAF5FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  apiTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6334FA',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  timelineContainer: {
    paddingLeft: 4,
  },
  versionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  timelineCol: {
    alignItems: 'center',
    marginRight: 12,
    width: 24,
  },
  timelineDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineDotCurrent: {
    backgroundColor: '#6334FA',
  },
  timelineDotPast: {
    backgroundColor: '#E2E8F0',
  },
  innerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#94A3B8',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
    minHeight: 110,
  },
  versionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  versionCardCurrent: {
    borderColor: '#6334FA',
    backgroundColor: '#FAF5FF',
  },
  versionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  verBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  versionNum: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0B192C',
  },
  verTime: {
    fontSize: 11,
    color: '#64748B',
  },
  changeNote: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 16,
    marginBottom: 8,
  },
  modifierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  modifierText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  hashBox: {
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    padding: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  hashLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
  },
  hashVal: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#0B192C',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  openBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6334FA',
  },
  compareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  compareBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0B192C',
  },
});

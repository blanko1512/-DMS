import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
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
import { DocumentStore } from '@/services/documentStore';

const { width } = Dimensions.get('window');

export default function DocumentViewerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const docId = params.id || 'doc-103';

  const doc: DmsDocument =
    DocumentStore.getDocumentById(docId) ||
    INITIAL_DOCUMENTS.find((d) => d.id === docId) ||
    INITIAL_DOCUMENTS[2];

  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 4;
  const [zoomLevel, setZoomLevel] = useState(100);

  // RBAC permission check simulation
  const hasDownloadPermission = doc.sensitivity !== 'TOP_SECRET';
  const hasSharePermission = true;

  const handleDownload = () => {
    if (!hasDownloadPermission) {
      Alert.alert(
        'Access Denied (RBAC)',
        'Your security clearance level does not permit downloading TOP_SECRET artifacts to local storage.'
      );
      return;
    }

    Alert.alert(
      'Document Decryption & Export',
      `Decrypting ${doc.original_filename} with officer hardware key...`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save to Vault',
          onPress: () => Alert.alert('Export Complete', 'File saved in tamper-evident secure enclave.'),
        },
      ]
    );
  };

  const handleZoomIn = () => {
    if (zoomLevel < 175) setZoomLevel((z) => z + 25);
  };

  const handleZoomOut = () => {
    if (zoomLevel > 75) setZoomLevel((z) => z - 25);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Top Controls Bar */}
      <View style={styles.topBar}>
        <Pressable style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={22} color="#0B192C" />
        </Pressable>

        <View style={styles.docInfoCol}>
          <Text style={styles.docTitle} numberOfLines={1}>
            {doc.original_filename}
          </Text>
          <Text style={styles.docSub}>
            Page {currentPage} of {totalPages} • Zoom {zoomLevel}%
          </Text>
        </View>

        <View style={styles.topRightActions}>
          <Pressable
            style={styles.iconBtn}
            onPress={() =>
              router.push({
                pathname: '/document-detail',
                params: { id: doc.id },
              })
            }>
            <Ionicons name="information-circle-outline" size={22} color="#6334FA" />
          </Pressable>

          {hasDownloadPermission && (
            <Pressable style={styles.iconBtn} onPress={handleDownload}>
              <Ionicons name="download-outline" size={20} color="#0B192C" />
            </Pressable>
          )}

          {hasSharePermission && (
            <Pressable
              style={styles.iconBtn}
              onPress={() =>
                router.push({
                  pathname: '/share-create',
                  params: { id: doc.id },
                })
              }>
              <Ionicons name="share-outline" size={20} color="#0B192C" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Security Watermark Header */}
      <View style={styles.watermarkBanner}>
        <Ionicons name="shield-checkmark" size={14} color="#6334FA" />
        <Text style={styles.watermarkText}>
          OFFICIAL POLICE EVIDENCE RECORD • SHA-256: {doc.sha256_hash.slice(0, 16)}...
        </Text>
      </View>

      {/* Main Document Viewer Canvas */}
      <ScrollView
        style={styles.viewerCanvas}
        contentContainerStyle={styles.canvasContent}
        maximumZoomScale={2.5}
        minimumZoomScale={0.8}
        showsVerticalScrollIndicator={false}>
        <View
          style={[
            styles.simulatedPage,
            {
              transform: [{ scale: zoomLevel / 100 }],
            },
          ]}>
          {/* Document Header Representation */}
          <View style={styles.pageHeader}>
            <Text style={styles.govHeader}>GOVERNMENT OF NATIONAL CAPITAL TERRITORY</Text>
            <Text style={styles.subGovHeader}>DEPARTMENT OF POLICE • DIGITAL FORENSIC WING</Text>
            <View style={styles.headerRule} />
            <Text style={styles.firTitle}>{doc.document_type.toUpperCase()}</Text>
            <Text style={styles.caseRef}>CASE REFERENCE NO: {doc.case_id}</Text>
          </View>

          {/* Document Body Simulation */}
          <View style={styles.pageBody}>
            <Text style={styles.sectionHeader}>1. RECORD OF INGESTION</Text>
            <Text style={styles.bodyParagraph}>
              This document serves as primary authenticated evidence filed under statutory criminal
              investigation provisions. Transcribed, digitized and hashed directly from original evidence
              terminal on {new Date(doc.created_at).toUTCString()}.
            </Text>

            <Text style={styles.sectionHeader}>2. INVOLVED PARTIES & SUMMARY</Text>
            <Text style={styles.bodyParagraph}>
              {doc.summary ||
                'Seized evidence documents and digital ledger extraction logs preserved in immutable object storage.'}
            </Text>

            <Text style={styles.sectionHeader}>3. CRYPTOGRAPHIC PROOFS</Text>
            <View style={styles.codeSnippetBox}>
              <Text style={styles.codeSnippet}>
                SHA-256: {doc.sha256_hash}
                {'\n'}EVM TX: {doc.blockchain_tx || '0x7e8a9d...4921842'}
                {'\n'}STATUS: VERIFIED & SEALED
              </Text>
            </View>

            {/* Officer Stamp */}
            <View style={styles.stampBox}>
              <Ionicons name="shield-checkmark-outline" size={32} color="#6334FA" />
              <View>
                <Text style={styles.stampText}>AUTHORIZED DIGITAL SEAL</Text>
                <Text style={styles.stampSub}>Officer: {doc.uploader} ({doc.uploader_role})</Text>
              </View>
            </View>
          </View>

          <View style={styles.pageFooter}>
            <Text style={styles.pageFooterText}>
              CONFIDENTIAL • PAGE {currentPage} OF {totalPages}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Floating Bottom Navigation Bar: Page & Zoom controls */}
      <View style={styles.bottomControlsBar}>
        {/* Page Nav */}
        <View style={styles.pageNavControls}>
          <Pressable
            style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
            disabled={currentPage === 1}
            onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}>
            <Ionicons name="chevron-back" size={18} color={currentPage === 1 ? '#CBD5E1' : '#0B192C'} />
          </Pressable>

          <Text style={styles.pageIndicator}>
            {currentPage} / {totalPages}
          </Text>

          <Pressable
            style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
            disabled={currentPage === totalPages}
            onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={currentPage === totalPages ? '#CBD5E1' : '#0B192C'}
            />
          </Pressable>
        </View>

        {/* Zoom Controls */}
        <View style={styles.zoomControls}>
          <Pressable style={styles.zoomBtn} onPress={handleZoomOut}>
            <Ionicons name="remove" size={18} color="#0B192C" />
          </Pressable>
          <Text style={styles.zoomText}>{zoomLevel}%</Text>
          <Pressable style={styles.zoomBtn} onPress={handleZoomIn}>
            <Ionicons name="add" size={18} color="#0B192C" />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B192C', // Deep navy viewer environment
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  docInfoCol: {
    flex: 1,
    marginHorizontal: 10,
  },
  docTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0B192C',
  },
  docSub: {
    fontSize: 11,
    color: '#64748B',
  },
  topRightActions: {
    flexDirection: 'row',
    gap: 8,
  },
  watermarkBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(99, 52, 250, 0.15)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(99, 52, 250, 0.3)',
  },
  watermarkText: {
    fontSize: 10,
    color: '#E9D5FF',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  viewerCanvas: {
    flex: 1,
    backgroundColor: '#1E293B',
  },
  canvasContent: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  simulatedPage: {
    width: Math.min(width - 32, 500),
    minHeight: 650,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  pageHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  govHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0B192C',
    letterSpacing: 0.5,
  },
  subGovHeader: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  headerRule: {
    width: '100%',
    height: 2,
    backgroundColor: '#0B192C',
    marginVertical: 10,
  },
  firTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#6334FA',
    letterSpacing: 1,
  },
  caseRef: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0B192C',
    marginTop: 2,
  },
  pageBody: {
    flex: 1,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0B192C',
    marginTop: 14,
    marginBottom: 4,
  },
  bodyParagraph: {
    fontSize: 11,
    color: '#334155',
    lineHeight: 16,
    textAlign: 'justify',
  },
  codeSnippetBox: {
    backgroundColor: '#F8FAFD',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 8,
    marginTop: 6,
  },
  codeSnippet: {
    fontSize: 9,
    fontFamily: 'monospace',
    color: '#0F172A',
    lineHeight: 14,
  },
  stampBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#6334FA',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 10,
    marginTop: 24,
    backgroundColor: '#FAF5FF',
  },
  stampText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6334FA',
  },
  stampSub: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
  pageFooter: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 12,
    marginTop: 24,
    alignItems: 'center',
  },
  pageFooterText: {
    fontSize: 9,
    color: '#94A3B8',
    fontWeight: '700',
    letterSpacing: 1,
  },
  bottomControlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  pageNavControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pageBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageBtnDisabled: {
    backgroundColor: '#F8FAFC',
  },
  pageIndicator: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0B192C',
  },
  zoomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 8,
  },
  zoomBtn: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0B192C',
  },
});

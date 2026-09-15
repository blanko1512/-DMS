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
import { DocumentStore } from '@/services/documentStore';

interface FieldCheck {
  name: string;
  status: 'PASSED' | 'FAILED' | 'WARNING';
  value: string;
  explanation: string;
}

export default function ValidationResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    docName?: string;
    caseId?: string;
    docType?: string;
    caseNumber?: string;
    incidentDate?: string;
    complainant?: string;
    statutorySection?: string;
    department?: string;
    sensitivity?: string;
    filesize?: string;
    filetype?: string;
    sha256?: string;
    description?: string;
  }>();

  const docName = params.docName || 'First_Information_Report_FIR_2026_04.pdf';
  const caseId = params.caseId || 'CASE-2026-062';
  const fileHash =
    params.sha256 || '3a88c2114d77ee09923315af1287c2b4e8832a67e5bb9910d55e88fa2901cce1';

  // API 1: validate-required-fields mock data
  const requiredFieldChecks: FieldCheck[] = [
    {
      name: 'Case Identifier (case_id)',
      status: 'PASSED',
      value: caseId,
      explanation: 'Matches judicial nomenclature standard format.',
    },
    {
      name: 'Document Type (doc_type)',
      status: 'PASSED',
      value: params.docType || 'First Information Report (FIR)',
      explanation: 'Recognized by court submission taxonomy.',
    },
    {
      name: 'Cryptographic Digest (sha256)',
      status: 'PASSED',
      value: `${fileHash.slice(0, 20)}...${fileHash.slice(-8)}`,
      explanation: 'Pre-calculated and verified against uploaded payload.',
    },
    {
      name: 'Investigating Officer Signature',
      status: 'PASSED',
      value: 'Digital Token Verified (Det. Vance)',
      explanation: 'Officer session key attached to immutable header block.',
    },
  ];

  // API 2: validate-consistency mock data
  const consistencyChecks: FieldCheck[] = [
    {
      name: 'Timestamp & Incident Chronology',
      status: 'PASSED',
      value: params.incidentDate || '2026-09-12 23:45 IST',
      explanation: 'Incident timeline precedes FIR registration time as expected.',
    },
    {
      name: 'Jurisdiction & Police Station',
      status: 'PASSED',
      value: params.department || 'Metropolitan Police Station 4',
      explanation: 'Unit code verified in Metropolitan Geo-Register.',
    },
    {
      name: 'OCR & Metadata Cross-Check',
      status: 'PASSED',
      value: '99.4% Text Match',
      explanation: 'Extracted plain-text matches judicial entity requirements.',
    },
  ];

  const handleContinueToDetails = () => {
    // Add to DocumentStore
    const newDoc = DocumentStore.addDocument({
      case_id: caseId,
      original_filename: docName,
      document_type: params.docType || 'First Information Report (FIR)',
      department: params.department || 'Metropolitan Police Station 4',
      sensitivity: (params.sensitivity as any) || 'HIGH',
      mime_type: params.filetype || 'application/pdf',
      sha256_hash: fileHash,
      description:
        params.description ||
        `Verified digital evidence for case ${caseId}. Complainant: ${params.complainant || 'Cyber Cell'}.`,
      uploader: 'Det. Vance',
      uploader_role: 'Senior Investigator',
    });

    Alert.alert(
      'Ingestion & Blockchain Seal Complete',
      `"${newDoc.original_filename}" has been cryptographically sealed, anchored to EVM Block #${newDoc.block_number}, and recorded in your evidence repository.`,
      [
        {
          text: 'View Document Details',
          onPress: () => {
            router.replace({
              pathname: '/document-detail',
              params: { id: newDoc.id },
            });
          },
        },
      ]
    );
  };

  const handleFixMetadata = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0B192C" />
        </Pressable>
        <View style={styles.headerTitles}>
          <Text style={styles.headerTitle}>Dual Validation Result</Text>
          <Text style={styles.headerSub}>Required Fields & Consistency Validation</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Overall Status Banner */}
        <View style={styles.overallBanner}>
          <View style={styles.overallIconBubble}>
            <Ionicons name="shield-checkmark" size={28} color="#10B981" />
          </View>
          <View style={styles.overallTextCol}>
            <Text style={styles.overallTitle}>Validation Passed: Ready for Ingestion</Text>
            <Text style={styles.overallSub}>
              All statutory required fields present • 100% metadata consistency score
            </Text>
          </View>
        </View>

        {/* Section 1: Required Fields (validate-required-fields) */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>1. Required Fields Validation</Text>
              <Text style={styles.apiLabel}>API: /api/ai/validate-required-fields</Text>
            </View>
            <StatusBadge status="VERIFIED" label="4/4 Passed" size="small" />
          </View>

          {requiredFieldChecks.map((item, index) => (
            <View
              key={index}
              style={[
                styles.checkRow,
                index === requiredFieldChecks.length - 1 && { borderBottomWidth: 0 },
              ]}>
              <View style={styles.checkHeader}>
                <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                <Text style={styles.fieldName}>{item.name}</Text>
              </View>
              <Text style={styles.fieldValueText}>{item.value}</Text>
              <Text style={styles.explanationText}>{item.explanation}</Text>
            </View>
          ))}
        </View>

        {/* Section 2: Metadata Consistency (validate-consistency) */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>2. Metadata Consistency Audit</Text>
              <Text style={styles.apiLabel}>API: /api/ai/validate-consistency</Text>
            </View>
            <StatusBadge status="VERIFIED" label="100% Score" size="small" />
          </View>

          {consistencyChecks.map((item, index) => (
            <View
              key={index}
              style={[
                styles.checkRow,
                index === consistencyChecks.length - 1 && { borderBottomWidth: 0 },
              ]}>
              <View style={styles.checkHeader}>
                <Ionicons name="shield-checkmark" size={18} color="#6334FA" />
                <Text style={styles.fieldName}>{item.name}</Text>
              </View>
              <Text style={styles.fieldValueText}>{item.value}</Text>
              <Text style={styles.explanationText}>{item.explanation}</Text>
            </View>
          ))}
        </View>

        {/* Action Buttons: Fix Metadata / Continue */}
        <View style={styles.actionsContainer}>
          <Pressable
            style={({ pressed }) => [styles.continueBtn, pressed && styles.btnPressed]}
            onPress={handleContinueToDetails}>
            <Text style={styles.continueBtnText}>Continue to Document Details</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.fixBtn, pressed && styles.btnPressed]}
            onPress={handleFixMetadata}>
            <Ionicons name="create-outline" size={18} color="#64748B" />
            <Text style={styles.fixBtnText}>Fix / Adjust Metadata</Text>
          </Pressable>
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
  headerTitles: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0B192C',
  },
  headerSub: {
    fontSize: 11,
    color: '#64748B',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  overallBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    marginBottom: 16,
    gap: 12,
  },
  overallIconBubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overallTextCol: {
    flex: 1,
  },
  overallTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#065F46',
    marginBottom: 2,
  },
  overallSub: {
    fontSize: 12,
    color: '#047857',
    lineHeight: 16,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0B192C',
  },
  apiLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6334FA',
    marginTop: 2,
  },
  checkRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  checkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  fieldName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0B192C',
  },
  fieldValueText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginLeft: 26,
    marginBottom: 2,
  },
  explanationText: {
    fontSize: 11,
    color: '#64748B',
    marginLeft: 26,
    lineHeight: 15,
  },
  actionsContainer: {
    marginTop: 8,
    gap: 10,
  },
  continueBtn: {
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
  continueBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  fixBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    gap: 8,
  },
  fixBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  btnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
});

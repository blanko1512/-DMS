import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StatusBadge } from '@/components/dms';

export default function AiClassificationResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    docName?: string;
    caseId?: string;
    docType?: string;
    department?: string;
    sensitivity?: string;
    filesize?: string;
    filetype?: string;
    sha256?: string;
    description?: string;
  }>();

  const docName = params.docName || 'First_Information_Report_FIR_2026_04.pdf';
  const caseId = params.caseId || 'CASE-2026-062';

  // State for AI-generated extracted fields (editable per spec)
  const [detectedType, setDetectedType] = useState(
    params.docType || 'First Information Report (FIR)'
  );
  const [confidence] = useState(99.4);
  const [extractedCaseNumber, setExtractedCaseNumber] = useState(
    params.caseId ? `${params.caseId}/EVID` : 'FIR/CYB/2026/04'
  );
  const [incidentDate, setIncidentDate] = useState('2026-09-12 23:45 IST');
  const [complainantName, setComplainantName] = useState('Chief Cyber Security Cell, HQ');
  const [accusedSubject, setAccusedSubject] = useState('Unidentified IP Cluster (Proxy Origin)');
  const [statutorySection, setStatutorySection] = useState('IT Act 2000 - Sec 66F, 43(a)');

  const [isEditing, setIsEditing] = useState(false);

  const handleConfirmClassification = () => {
    // Proceed to Step 11: Validation Result
    router.push({
      pathname: '/validation-result',
      params: {
        docName,
        caseId,
        docType: detectedType,
        caseNumber: extractedCaseNumber,
        incidentDate,
        complainant: complainantName,
        statutorySection,
        department: params.department || 'Metropolitan Police Station 4',
        sensitivity: params.sensitivity || 'HIGH',
        filesize: params.filesize || '1.52 MB',
        filetype: params.filetype || 'application/pdf',
        sha256: params.sha256 || '3a88c2114d77ee09923315af1287c2b4e8832a67e5bb9910d55e88fa2901cce1',
        description: params.description || '',
      },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0B192C" />
        </Pressable>
        <View style={styles.headerTitles}>
          <Text style={styles.headerTitle}>AI Classification Result</Text>
          <Text style={styles.headerSub}>Step 4 of 4 • Review & Confirmation</Text>
        </View>
        <Pressable
          style={styles.editToggleBtn}
          onPress={() => setIsEditing(!isEditing)}>
          <Ionicons name={isEditing ? 'checkmark' : 'create-outline'} size={18} color="#6334FA" />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Ollama Service Banner */}
        <View style={styles.ollamaBanner}>
          <View style={styles.ollamaIconWrap}>
            <Ionicons name="hardware-chip" size={22} color="#6334FA" />
          </View>
          <View style={styles.ollamaInfo}>
            <View style={styles.ollamaTopRow}>
              <Text style={styles.ollamaTitle}>Ollama LLM Engine Active</Text>
              <StatusBadge status="ACTIVE" label="Local Inference" size="small" />
            </View>
            <Text style={styles.ollamaSub}>
              Model: llama3:8b-instruct-q8_0 • Zero data leakage to public clouds
            </Text>
          </View>
        </View>

        {/* Primary Classification Result Card */}
        <View style={styles.primaryResultCard}>
          <Text style={styles.cardHeaderSmall}>DETECTED DOCUMENT TYPE</Text>
          <View style={styles.typeResultRow}>
            <Text style={styles.detectedTypeTitle}>{detectedType}</Text>
            <View style={styles.confidenceBadge}>
              <Ionicons name="sparkles" size={14} color="#10B981" />
              <Text style={styles.confidenceText}>{confidence}% Confidence</Text>
            </View>
          </View>
          <View style={styles.aiNoticeRow}>
            <Ionicons name="alert-circle-outline" size={14} color="#6334FA" />
            <Text style={styles.aiNoticeText}>
              All values below are AI-generated. Review and verify before anchoring.
            </Text>
          </View>
        </View>

        {/* Extracted Fields Card */}
        <View style={styles.fieldsCard}>
          <View style={styles.fieldsCardHeader}>
            <Text style={styles.fieldsCardTitle}>Extracted Entity Metadata</Text>
            <Text style={styles.fieldsEditHint}>
              {isEditing ? 'Editing Mode' : 'Tap Edit icon above to modify'}
            </Text>
          </View>

          {/* Field 1: Case Number */}
          <View style={styles.fieldItem}>
            <View style={styles.fieldLabelRow}>
              <Text style={styles.fieldLabel}>POLICE RECORD / FIR NO.</Text>
              <Text style={styles.aiTag}>AI-GENERATED</Text>
            </View>
            {isEditing ? (
              <TextInput
                style={styles.fieldInput}
                value={extractedCaseNumber}
                onChangeText={setExtractedCaseNumber}
              />
            ) : (
              <Text style={styles.fieldValue}>{extractedCaseNumber}</Text>
            )}
          </View>

          {/* Field 2: Incident Date */}
          <View style={styles.fieldItem}>
            <View style={styles.fieldLabelRow}>
              <Text style={styles.fieldLabel}>INCIDENT DATE & TIME</Text>
              <Text style={styles.aiTag}>AI-GENERATED</Text>
            </View>
            {isEditing ? (
              <TextInput
                style={styles.fieldInput}
                value={incidentDate}
                onChangeText={setIncidentDate}
              />
            ) : (
              <Text style={styles.fieldValue}>{incidentDate}</Text>
            )}
          </View>

          {/* Field 3: Complainant */}
          <View style={styles.fieldItem}>
            <View style={styles.fieldLabelRow}>
              <Text style={styles.fieldLabel}>COMPLAINANT / INITIATOR</Text>
              <Text style={styles.aiTag}>AI-GENERATED</Text>
            </View>
            {isEditing ? (
              <TextInput
                style={styles.fieldInput}
                value={complainantName}
                onChangeText={setComplainantName}
              />
            ) : (
              <Text style={styles.fieldValue}>{complainantName}</Text>
            )}
          </View>

          {/* Field 4: Accused */}
          <View style={styles.fieldItem}>
            <View style={styles.fieldLabelRow}>
              <Text style={styles.fieldLabel}>SUSPECT / ACCUSED ENTITY</Text>
              <Text style={styles.aiTag}>AI-GENERATED</Text>
            </View>
            {isEditing ? (
              <TextInput
                style={styles.fieldInput}
                value={accusedSubject}
                onChangeText={setAccusedSubject}
              />
            ) : (
              <Text style={styles.fieldValue}>{accusedSubject}</Text>
            )}
          </View>

          {/* Field 5: Statutory Section */}
          <View style={[styles.fieldItem, { borderBottomWidth: 0 }]}>
            <View style={styles.fieldLabelRow}>
              <Text style={styles.fieldLabel}>STATUTORY PROVISIONS</Text>
              <Text style={styles.aiTag}>AI-GENERATED</Text>
            </View>
            {isEditing ? (
              <TextInput
                style={styles.fieldInput}
                value={statutorySection}
                onChangeText={setStatutorySection}
              />
            ) : (
              <Text style={styles.fieldValue}>{statutorySection}</Text>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        <Pressable
          style={({ pressed }) => [styles.confirmBtn, pressed && styles.confirmBtnPressed]}
          onPress={handleConfirmClassification}>
          <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
          <Text style={styles.confirmBtnText}>Confirm Classification & Continue</Text>
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
  editToggleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FAF5FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9D5FF',
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
  ollamaBanner: {
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
  ollamaIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FAF5FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ollamaInfo: {
    flex: 1,
  },
  ollamaTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  ollamaTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0B192C',
  },
  ollamaSub: {
    fontSize: 11,
    color: '#64748B',
  },
  primaryResultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#E9D5FF',
    marginBottom: 16,
    shadowColor: '#6334FA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeaderSmall: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  typeResultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detectedTypeTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0B192C',
    flex: 1,
    marginRight: 8,
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
  },
  aiNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF5FF',
    padding: 8,
    borderRadius: 8,
    gap: 6,
  },
  aiNoticeText: {
    fontSize: 11,
    color: '#6334FA',
    fontWeight: '500',
    flex: 1,
  },
  fieldsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  fieldsCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  fieldsCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0B192C',
  },
  fieldsEditHint: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  fieldItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  fieldLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  aiTag: {
    fontSize: 9,
    fontWeight: '700',
    color: '#6334FA',
    backgroundColor: '#FAF5FF',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  fieldValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0B192C',
  },
  fieldInput: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0B192C',
    backgroundColor: '#F8FAFD',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#6334FA',
  },
  confirmBtn: {
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
  confirmBtnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

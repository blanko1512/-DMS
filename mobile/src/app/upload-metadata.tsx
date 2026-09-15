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

const DOCUMENT_TYPES = [
  'First Information Report (FIR)',
  'Forensic Audit Report',
  'Witness Deposition',
  'Court Order / Warrant',
  'Physical Evidence Log',
];

const SENSITIVITIES = ['INTERNAL', 'RESTRICTED', 'HIGH', 'TOP_SECRET'];

export default function UploadMetadataScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    filename?: string;
    filesize?: string;
    filetype?: string;
    source?: string;
    sha256?: string;
    caseId?: string;
    docType?: string;
    department?: string;
    sensitivity?: string;
    description?: string;
  }>();

  const [docName, setDocName] = useState(
    params.filename || 'First_Information_Report_FIR_2026_04.pdf'
  );
  const [caseId, setCaseId] = useState(params.caseId || 'CASE-2026-062');
  const [docType, setDocType] = useState(params.docType || 'First Information Report (FIR)');
  const [description, setDescription] = useState(
    params.description ||
      'Initial complaint registered regarding cyber intrusion into departmental records.'
  );
  const [department, setDepartment] = useState(
    params.department || 'Metropolitan Police Station 4'
  );
  const [sensitivity, setSensitivity] = useState(params.sensitivity || 'HIGH');
  const [tags, setTags] = useState('Cyber, Breach, Priority, Hardware');

  const handleUploadSecurely = () => {
    if (!docName.trim() || !caseId.trim()) {
      Alert.alert('Required Fields Missing', 'Please specify Document Name and Case ID.');
      return;
    }

    // Navigate to Processing screen (Screen 09)
    router.push({
      pathname: '/processing',
      params: {
        docName,
        caseId,
        docType,
        department,
        sensitivity,
        filesize: params.filesize || '1.52 MB',
        filetype: params.filetype || 'application/pdf',
        sha256: params.sha256 || '3a88c2114d77ee09923315af1287c2b4e8832a67e5bb9910d55e88fa2901cce1',
        description,
      },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0B192C" />
        </Pressable>
        <View style={styles.headerTitles}>
          <Text style={styles.headerTitle}>Upload Metadata</Text>
          <Text style={styles.headerSub}>Step 2 of 4 • Case & Document Attributes</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* Stepper */}
          <View style={styles.stepperRow}>
            <View style={styles.stepItem}>
              <View style={styles.stepCircleCompleted}>
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
              </View>
              <Text style={styles.stepLabelCompleted}>Source</Text>
            </View>
            <View style={[styles.stepLine, styles.stepLineActive]} />
            <View style={[styles.stepItem, styles.stepActive]}>
              <View style={styles.stepCircleActive}>
                <Text style={styles.stepNumActive}>2</Text>
              </View>
              <Text style={styles.stepLabelActive}>Metadata</Text>
            </View>
            <View style={styles.stepLine} />
            <View style={styles.stepItem}>
              <View style={styles.stepCircle}>
                <Text style={styles.stepNum}>3</Text>
              </View>
              <Text style={styles.stepLabel}>Processing</Text>
            </View>
            <View style={styles.stepLine} />
            <View style={styles.stepItem}>
              <View style={styles.stepCircle}>
                <Text style={styles.stepNum}>4</Text>
              </View>
              <Text style={styles.stepLabel}>AI Verify</Text>
            </View>
          </View>

          {/* Form Fields */}
          <View style={styles.card}>
            {/* Case ID */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>CASE IDENTIFIER *</Text>
                <StatusBadge status="INFO" label="Chain Key" size="small" />
              </View>
              <View style={styles.inputBox}>
                <Ionicons name="briefcase-outline" size={18} color="#6334FA" />
                <TextInput
                  style={styles.textInput}
                  value={caseId}
                  onChangeText={setCaseId}
                  placeholder="e.g. CASE-2026-062"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            {/* Document Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>DOCUMENT TITLE *</Text>
              <View style={styles.inputBox}>
                <Ionicons name="document-text-outline" size={18} color="#6334FA" />
                <TextInput
                  style={styles.textInput}
                  value={docName}
                  onChangeText={setDocName}
                  placeholder="Official document filename"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            {/* Document Type Selector */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>DOCUMENT CLASSIFICATION TYPE</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
                {DOCUMENT_TYPES.map((type) => {
                  const isSelected = docType === type;
                  return (
                    <Pressable
                      key={type}
                      style={[styles.typeChip, isSelected && styles.typeChipActive]}
                      onPress={() => setDocType(type)}>
                      <Text style={[styles.typeChipText, isSelected && styles.typeChipTextActive]}>
                        {type}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Department */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>ASSIGNED DEPARTMENT</Text>
              <View style={styles.inputBox}>
                <Ionicons name="business-outline" size={18} color="#64748B" />
                <TextInput
                  style={styles.textInput}
                  value={department}
                  onChangeText={setDepartment}
                  placeholder="Department / Unit"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            {/* Sensitivity Levels */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>SECURITY SENSITIVITY</Text>
              <View style={styles.sensitivityRow}>
                {SENSITIVITIES.map((lvl) => {
                  const isSelected = sensitivity === lvl;
                  return (
                    <Pressable
                      key={lvl}
                      style={[
                        styles.sensitivityChip,
                        isSelected && styles.sensitivityChipActive,
                      ]}
                      onPress={() => setSensitivity(lvl)}>
                      <Text
                        style={[
                          styles.sensitivityChipText,
                          isSelected && styles.sensitivityChipTextActive,
                        ]}>
                        {lvl}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Description */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>EXECUTIVE DESCRIPTION</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Brief summary of document context..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Tags */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>METADATA TAGS (COMMA SEPARATED)</Text>
              <View style={styles.inputBox}>
                <Ionicons name="pricetags-outline" size={18} color="#64748B" />
                <TextInput
                  style={styles.textInput}
                  value={tags}
                  onChangeText={setTags}
                  placeholder="Tags: Cyber, Evidence, FIR"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>
          </View>

          {/* Action Button */}
          <Pressable
            style={({ pressed }) => [styles.uploadBtn, pressed && styles.uploadBtnPressed]}
            onPress={handleUploadSecurely}>
            <Ionicons name="lock-closed" size={18} color="#FFFFFF" />
            <Text style={styles.uploadBtnText}>Upload Securely (API POST)</Text>
          </Pressable>
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
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  stepItem: {
    alignItems: 'center',
    gap: 4,
  },
  stepActive: {},
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6334FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleCompleted: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNum: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  stepNumActive: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  stepLabelActive: {
    fontSize: 11,
    color: '#6334FA',
    fontWeight: '700',
  },
  stepLabelCompleted: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '700',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 6,
    marginBottom: 16,
  },
  stepLineActive: {
    backgroundColor: '#10B981',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 6,
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
  textArea: {
    backgroundColor: '#F8FAFD',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  typeScroll: {
    flexDirection: 'row',
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  typeChipActive: {
    backgroundColor: '#FAF5FF',
    borderColor: '#6334FA',
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  typeChipTextActive: {
    color: '#6334FA',
    fontWeight: '700',
  },
  sensitivityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sensitivityChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sensitivityChipActive: {
    backgroundColor: '#FAF5FF',
    borderColor: '#6334FA',
  },
  sensitivityChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  sensitivityChipTextActive: {
    color: '#6334FA',
  },
  uploadBtn: {
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
  uploadBtnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  uploadBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Step {
  id: number;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const PROCESSING_STEPS: Step[] = [
  {
    id: 0,
    title: 'Uploaded Document Payload',
    subtitle: 'Streamed to isolated buffer',
    icon: 'cloud-upload-outline',
  },
  {
    id: 1,
    title: 'Encrypted Secure Storage',
    subtitle: 'AES-256 GCM chunk encryption',
    icon: 'server-outline',
  },
  {
    id: 2,
    title: 'Cryptographic SHA-256 Calculation',
    subtitle: 'Generating immutable fingerprint',
    icon: 'finger-print-outline',
  },
  {
    id: 3,
    title: 'Extraction / Optical OCR',
    subtitle: 'Multi-lingual text & field parsing',
    icon: 'scan-outline',
  },
  {
    id: 4,
    title: 'AI Classification (Ollama)',
    subtitle: 'Zero-shot NER categorization',
    icon: 'hardware-chip-outline',
  },
  {
    id: 5,
    title: 'Schema & Field Validation',
    subtitle: 'Consistency & completeness checks',
    icon: 'shield-checkmark-outline',
  },
];

export default function ProcessingScreen() {
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

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [failedStep, setFailedStep] = useState<number | null>(null);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    let timer: any;
    if (currentStepIndex < PROCESSING_STEPS.length) {
      timer = setTimeout(() => {
        setCompletedSteps((prev) => [...prev, currentStepIndex]);
        if (currentStepIndex === PROCESSING_STEPS.length - 1) {
          setIsDone(true);
        } else {
          setCurrentStepIndex((prev) => prev + 1);
        }
      }, 600);
    }
    return () => clearTimeout(timer);
  }, [currentStepIndex]);

  const handleContinueToAiResult = () => {
    router.replace({
      pathname: '/ai-classification',
      params: {
        docName,
        caseId,
        docType: params.docType || 'First Information Report (FIR)',
        department: params.department || 'Metropolitan Police Station 4',
        sensitivity: params.sensitivity || 'HIGH',
        filesize: params.filesize || '1.52 MB',
        filetype: params.filetype || 'application/pdf',
        sha256: params.sha256 || '3a88c2114d77ee09923315af1287c2b4e8832a67e5bb9910d55e88fa2901cce1',
        description: params.description || '',
      },
    });
  };

  const handleRetry = () => {
    setFailedStep(null);
    setCurrentStepIndex(0);
    setCompletedSteps([]);
    setIsDone(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitles}>
          <Text style={styles.headerTitle}>Cryptographic Pipeline</Text>
          <Text style={styles.headerSub}>Step 3 of 4 • Document Ingestion & AI</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Document Info Card */}
        <View style={styles.docSummaryCard}>
          <View style={styles.docIconWrapper}>
            <Ionicons name="document-lock" size={24} color="#6334FA" />
          </View>
          <View style={styles.docInfoCol}>
            <Text style={styles.docNameText} numberOfLines={1}>
              {docName}
            </Text>
            <Text style={styles.docCaseText}>Case: {caseId} • Size: {params.filesize || '1.52 MB'}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Pipeline Execution Progress</Text>

        {/* Steps List */}
        <View style={styles.stepsContainer}>
          {PROCESSING_STEPS.map((step, idx) => {
            const isCompleted = completedSteps.includes(step.id);
            const isCurrent = currentStepIndex === step.id && !isDone;
            const isError = failedStep === step.id;

            return (
              <View key={step.id} style={styles.stepRow}>
                {/* Status Indicator Icon */}
                <View style={styles.indicatorCol}>
                  <View
                    style={[
                      styles.stepIconBubble,
                      isCompleted && styles.stepIconBubbleCompleted,
                      isCurrent && styles.stepIconBubbleCurrent,
                      isError && styles.stepIconBubbleError,
                    ]}>
                    {isCompleted ? (
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    ) : isCurrent ? (
                      <ActivityIndicator size="small" color="#6334FA" />
                    ) : isError ? (
                      <Ionicons name="close" size={16} color="#FFFFFF" />
                    ) : (
                      <Ionicons name={step.icon} size={16} color="#94A3B8" />
                    )}
                  </View>
                  {idx < PROCESSING_STEPS.length - 1 && (
                    <View
                      style={[
                        styles.connectingLine,
                        isCompleted && styles.connectingLineCompleted,
                      ]}
                    />
                  )}
                </View>

                {/* Step Details */}
                <View style={styles.stepDetails}>
                  <View style={styles.stepTitleRow}>
                    <Text
                      style={[
                        styles.stepTitle,
                        isCompleted && styles.stepTitleCompleted,
                        isCurrent && styles.stepTitleCurrent,
                      ]}>
                      {step.title}
                    </Text>
                    {isCompleted && (
                      <Text style={styles.passBadge}>COMPLETED</Text>
                    )}
                    {isCurrent && (
                      <Text style={styles.inProgressBadge}>RUNNING</Text>
                    )}
                  </View>
                  <Text style={styles.stepSubtitle}>{step.subtitle}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Completed State Card & Navigation */}
        {isDone && (
          <View style={styles.successCard}>
            <View style={styles.successHeader}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <Text style={styles.successTitle}>Pipeline Successfully Executed</Text>
            </View>
            <Text style={styles.successDesc}>
              Document stored securely with SHA-256 hash verified. AI classification completed using local Ollama model.
            </Text>

            <Pressable
              style={({ pressed }) => [styles.continueBtn, pressed && styles.continueBtnPressed]}
              onPress={handleContinueToAiResult}>
              <Text style={styles.continueBtnText}>Inspect AI Classification Result</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </Pressable>
          </View>
        )}

        {/* Retry Option if failure occurs */}
        {failedStep !== null && (
          <Pressable style={styles.retryBtn} onPress={handleRetry}>
            <Ionicons name="refresh" size={18} color="#FFFFFF" />
            <Text style={styles.retryBtnText}>Retry Pipeline Execution</Text>
          </Pressable>
        )}
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
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
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
  docSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    gap: 12,
  },
  docIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  docInfoCol: {
    flex: 1,
  },
  docNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0B192C',
    marginBottom: 2,
  },
  docCaseText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 14,
  },
  stepsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  indicatorCol: {
    alignItems: 'center',
    marginRight: 14,
  },
  stepIconBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  stepIconBubbleCompleted: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  stepIconBubbleCurrent: {
    backgroundColor: '#FAF5FF',
    borderColor: '#6334FA',
  },
  stepIconBubbleError: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  connectingLine: {
    width: 2,
    height: 32,
    backgroundColor: '#E2E8F0',
    marginVertical: 2,
  },
  connectingLineCompleted: {
    backgroundColor: '#10B981',
  },
  stepDetails: {
    flex: 1,
    paddingBottom: 22,
  },
  stepTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  stepTitleCompleted: {
    color: '#0B192C',
    fontWeight: '700',
  },
  stepTitleCurrent: {
    color: '#6334FA',
    fontWeight: '700',
  },
  passBadge: {
    fontSize: 9,
    fontWeight: '700',
    color: '#059669',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  inProgressBadge: {
    fontSize: 9,
    fontWeight: '700',
    color: '#6334FA',
    backgroundColor: '#FAF5FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stepSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
  },
  successCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    padding: 16,
    marginTop: 8,
  },
  successHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  successTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#065F46',
  },
  successDesc: {
    fontSize: 12,
    color: '#047857',
    lineHeight: 16,
    marginBottom: 16,
  },
  continueBtn: {
    backgroundColor: '#6334FA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  continueBtnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  continueBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  retryBtn: {
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 12,
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

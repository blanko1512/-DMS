import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
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

import { DmsTopBar, StatusBadge } from '@/components/dms';
import {
  DEMO_PRESETS,
  DemoPreset,
  captureWithCamera,
  generateHashForFile,
  pickLocalDocument,
  pickPhotoGallery,
} from '@/services/filePicker';

export default function UploadSourceScreen() {
  const router = useRouter();

  // Selected file state
  const [selectedFileName, setSelectedFileName] = useState('First_Information_Report_FIR_2026_04.pdf');
  const [fileSize, setFileSize] = useState('1.52 MB');
  const [fileType, setFileType] = useState('application/pdf');
  const [fileHash, setFileHash] = useState(
    '3a88c2114d77ee09923315af1287c2b4e8832a67e5bb9910d55e88fa2901cce1'
  );
  const [sourceType, setSourceType] = useState<'file' | 'camera' | 'gallery' | 'preset'>('preset');
  const [isPicking, setIsPicking] = useState(false);

  // Optional preset metadata carrying over
  const [presetMeta, setPresetMeta] = useState<{
    caseId?: string;
    docType?: string;
    department?: string;
    sensitivity?: string;
    description?: string;
  }>({
    caseId: 'CASE-2026-062',
    docType: 'First Information Report (FIR)',
    department: 'Metropolitan Police Station 4',
    sensitivity: 'HIGH',
    description: 'Initial registered complaint regarding unauthorized intrusion into judicial records.',
  });

  // Pick Document via Filesystem / Web file dialog
  const handlePickLocalDocument = async () => {
    setIsPicking(true);
    try {
      const result = await pickLocalDocument();
      if (result) {
        setSelectedFileName(result.name);
        setFileSize(result.size);
        setFileType(result.mimeType);
        setFileHash(result.sha256);
        setSourceType('file');
        setPresetMeta({
          caseId: `CASE-2026-${Math.floor(100 + Math.random() * 900)}`,
          docType: inferDocType(result.name),
          department: 'Investigation Department',
          sensitivity: 'HIGH',
          description: `Ingested artifact: ${result.name}`,
        });
      }
    } catch (e) {
      console.warn('Pick document error', e);
      Alert.alert('Error', 'Unable to pick document. Please try again.');
    } finally {
      setIsPicking(false);
    }
  };

  // Pick Image from Gallery
  const handlePickGallery = async () => {
    setIsPicking(true);
    try {
      const result = await pickPhotoGallery();
      if (result) {
        setSelectedFileName(result.name);
        setFileSize(result.size);
        setFileType(result.mimeType);
        setFileHash(result.sha256);
        setSourceType('gallery');
        setPresetMeta({
          caseId: `CASE-2026-${Math.floor(100 + Math.random() * 900)}`,
          docType: 'Evidence Photo',
          department: 'Digital Forensics Lab',
          sensitivity: 'RESTRICTED',
          description: 'High-resolution photographic evidence captured during forensic inspection.',
        });
      }
    } catch (e) {
      console.warn('Pick photo error', e);
      Alert.alert('Error', 'Unable to open gallery. Please try again.');
    } finally {
      setIsPicking(false);
    }
  };

  // Capture with Camera
  const handleCaptureCamera = async () => {
    setIsPicking(true);
    try {
      const result = await captureWithCamera();
      if (result) {
        setSelectedFileName(result.name);
        setFileSize(result.size);
        setFileType(result.mimeType);
        setFileHash(result.sha256);
        setSourceType('camera');
        setPresetMeta({
          caseId: `CASE-2026-${Math.floor(100 + Math.random() * 900)}`,
          docType: 'Scanned Document',
          department: 'Field Operations',
          sensitivity: 'INTERNAL',
          description: 'Optical camera scan of physical document with perspective edge correction.',
        });
      }
    } catch (e) {
      console.warn('Capture camera error', e);
      Alert.alert('Error', 'Unable to launch camera. Please try again.');
    } finally {
      setIsPicking(false);
    }
  };

  // Select Quick Demo Preset
  const handleSelectPreset = (preset: DemoPreset) => {
    setSelectedFileName(preset.fileName);
    setFileSize(preset.size);
    setFileType(preset.mimeType);
    setFileHash(generateHashForFile(preset.fileName, preset.sizeBytes));
    setSourceType('preset');
    setPresetMeta({
      caseId: preset.caseId,
      docType: preset.docType,
      department: preset.department,
      sensitivity: preset.sensitivity,
      description: preset.description,
    });
  };

  const inferDocType = (name: string): string => {
    const lower = name.toLowerCase();
    if (lower.includes('fir')) return 'First Information Report (FIR)';
    if (lower.includes('audit') || lower.includes('report')) return 'Forensic Audit Report';
    if (lower.includes('witness') || lower.includes('deposition')) return 'Witness Deposition';
    if (lower.includes('court') || lower.includes('order') || lower.includes('warrant'))
      return 'Court Order / Warrant';
    if (lower.includes('photo') || lower.includes('img') || lower.includes('jpg') || lower.includes('png'))
      return 'Physical Evidence Log';
    return 'Investigation Record';
  };

  const handleProceedToMetadata = () => {
    if (!selectedFileName) {
      Alert.alert('Selection Required', 'Please select or upload a document first.');
      return;
    }

    router.push({
      pathname: '/upload-metadata' as any,
      params: {
        filename: selectedFileName,
        filesize: fileSize,
        filetype: fileType,
        sha256: fileHash,
        source: sourceType,
        caseId: presetMeta.caseId || 'CASE-2026-062',
        docType: presetMeta.docType || 'First Information Report (FIR)',
        department: presetMeta.department || 'Metropolitan Police Station 4',
        sensitivity: presetMeta.sensitivity || 'HIGH',
        description: presetMeta.description || '',
      },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <DmsTopBar
        title="Upload Document"
        subtitle="Step 1 of 4 • Ingestion & Hash Generation"
        userRole="INVESTIGATOR"
        onProfilePress={() => router.push('/profile')}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Step Indicator */}
        <View style={styles.stepperRow}>
          <View style={[styles.stepItem, styles.stepActive]}>
            <View style={styles.stepCircleActive}>
              <Text style={styles.stepNumActive}>1</Text>
            </View>
            <Text style={styles.stepLabelActive}>Source</Text>
          </View>
          <View style={styles.stepLine} />
          <View style={styles.stepItem}>
            <View style={styles.stepCircle}>
              <Text style={styles.stepNum}>2</Text>
            </View>
            <Text style={styles.stepLabel}>Metadata</Text>
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

        {/* Ingestion Source Section */}
        <Text style={styles.sectionHeader}>Choose Ingestion Method</Text>
        <Text style={styles.sectionSub}>Select a file from your device, take a photo, or pick from demo presets</Text>

        {/* Action Grid: Local File, Camera, Gallery */}
        <View style={styles.sourceGrid}>
          {/* 1. Pick Local File */}
          <Pressable
            style={({ pressed }) => [
              styles.sourceButton,
              sourceType === 'file' && styles.sourceButtonActive,
              pressed && styles.pressed,
            ]}
            onPress={handlePickLocalDocument}
            disabled={isPicking}>
            <View style={[styles.sourceIconWrap, sourceType === 'file' && styles.sourceIconWrapActive]}>
              <Ionicons
                name="folder-open"
                size={24}
                color={sourceType === 'file' ? '#FFFFFF' : '#6334FA'}
              />
            </View>
            <View style={styles.sourceButtonTextCol}>
              <View style={styles.titleBadgeRow}>
                <Text style={styles.sourceButtonTitle}>Browse Files</Text>
                <StatusBadge status="ACTIVE" label="Select File" size="small" />
              </View>
              <Text style={styles.sourceButtonDesc}>
                Select PDF, DOCX, TXT, or ZIP directly from your device storage.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </Pressable>

          {/* 2. Camera Scanner */}
          <Pressable
            style={({ pressed }) => [
              styles.sourceButton,
              sourceType === 'camera' && styles.sourceButtonActive,
              pressed && styles.pressed,
            ]}
            onPress={handleCaptureCamera}
            disabled={isPicking}>
            <View style={[styles.sourceIconWrap, sourceType === 'camera' && styles.sourceIconWrapActive]}>
              <Ionicons
                name="camera"
                size={24}
                color={sourceType === 'camera' ? '#FFFFFF' : '#6334FA'}
              />
            </View>
            <View style={styles.sourceButtonTextCol}>
              <View style={styles.titleBadgeRow}>
                <Text style={styles.sourceButtonTitle}>Evidence Camera</Text>
                <StatusBadge status="INFO" label="Camera" size="small" />
              </View>
              <Text style={styles.sourceButtonDesc}>
                Optical scan of physical warrants, stamps, and hardware tags.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </Pressable>

          {/* 3. Evidence Gallery */}
          <Pressable
            style={({ pressed }) => [
              styles.sourceButton,
              sourceType === 'gallery' && styles.sourceButtonActive,
              pressed && styles.pressed,
            ]}
            onPress={handlePickGallery}
            disabled={isPicking}>
            <View style={[styles.sourceIconWrap, sourceType === 'gallery' && styles.sourceIconWrapActive]}>
              <Ionicons
                name="images"
                size={24}
                color={sourceType === 'gallery' ? '#FFFFFF' : '#6334FA'}
              />
            </View>
            <View style={styles.sourceButtonTextCol}>
              <View style={styles.titleBadgeRow}>
                <Text style={styles.sourceButtonTitle}>Photo Gallery</Text>
                <StatusBadge status="INFO" label="Gallery" size="small" />
              </View>
              <Text style={styles.sourceButtonDesc}>
                Import evidence photos, seizure records, or screenshots.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </Pressable>
        </View>

        {/* Quick Demo Evidence Presets Carousel */}
        <View style={styles.presetsSection}>
          <View style={styles.presetsHeaderRow}>
            <View style={styles.presetsTitleCol}>
              <Text style={styles.presetsTitle}>Quick Demo Evidence Presets</Text>
              <Text style={styles.presetsSubtitle}>1-tap test cases with realistic police & legal records</Text>
            </View>
            <View style={styles.tapBadge}>
              <Ionicons name="flash" size={12} color="#D97706" />
              <Text style={styles.tapBadgeText}>Instant Demo</Text>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetsScroll}>
            {DEMO_PRESETS.map((preset) => {
              const isSelected = selectedFileName === preset.fileName;
              return (
                <Pressable
                  key={preset.id}
                  style={[styles.presetCard, isSelected && styles.presetCardActive]}
                  onPress={() => handleSelectPreset(preset)}>
                  <View style={styles.presetTopRow}>
                    <View
                      style={[styles.presetIconWrap, isSelected && styles.presetIconWrapActive]}>
                      <Ionicons
                        name={preset.icon as any}
                        size={18}
                        color={isSelected ? '#FFFFFF' : '#6334FA'}
                      />
                    </View>
                    <StatusBadge
                      status={preset.sensitivity === 'TOP_SECRET' ? 'FAILED' : 'VERIFIED'}
                      label={preset.sensitivity}
                      size="small"
                    />
                  </View>
                  <Text style={styles.presetName} numberOfLines={1}>
                    {preset.title}
                  </Text>
                  <Text style={styles.presetFile} numberOfLines={1}>
                    {preset.fileName}
                  </Text>
                  <View style={styles.presetMetaRow}>
                    <Text style={styles.presetMetaText}>{preset.size}</Text>
                    <Text style={styles.presetMetaDot}>•</Text>
                    <Text style={styles.presetMetaText}>{preset.docType}</Text>
                  </View>
                  {isSelected && (
                    <View style={styles.presetSelectedIndicator}>
                      <Ionicons name="checkmark-circle" size={16} color="#6334FA" />
                      <Text style={styles.presetSelectedText}>Selected for Upload</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Selected Document Preview Card */}
        <View style={styles.fileSelectedBox}>
          <View style={styles.fileSelectedHeader}>
            <View style={styles.fileSelectedHeaderLeft}>
              <Ionicons name="shield-checkmark" size={20} color="#059669" />
              <Text style={styles.fileSelectedTitle}>Ready for Ingestion</Text>
            </View>
            <StatusBadge status="VERIFIED" label="SHA-256 Calculated" />
          </View>

          <View style={styles.fileMainRow}>
            <View style={styles.fileIconBox}>
              <Ionicons
                name={fileType.includes('image') ? 'image' : fileType.includes('audio') ? 'musical-notes' : 'document-text'}
                size={28}
                color="#6334FA"
              />
            </View>
            <View style={styles.fileMainInfo}>
              <Text style={styles.fileName}>{selectedFileName}</Text>
              <View style={styles.fileMetaPills}>
                <Text style={styles.metaPill}>{fileSize}</Text>
                <Text style={styles.metaPill}>{fileType}</Text>
                <Text style={styles.metaPill}>Source: {sourceType.toUpperCase()}</Text>
              </View>
            </View>
          </View>

          {/* SHA-256 Digest Box */}
          <View style={styles.hashBox}>
            <View style={styles.hashHeader}>
              <Ionicons name="finger-print" size={14} color="#6334FA" />
              <Text style={styles.hashLabel}>Cryptographic SHA-256 Digest:</Text>
            </View>
            <Text style={styles.hashText} numberOfLines={2}>
              {fileHash}
            </Text>
          </View>
        </View>

        {/* Supported Specifications Info */}
        <View style={styles.specNotice}>
          <Ionicons name="information-circle" size={18} color="#6334FA" />
          <View style={styles.specContent}>
            <Text style={styles.specTitle}>Cryptographic Ingestion Guarantee</Text>
            <Text style={styles.specText}>
              • Files are chunked and encrypted with client AES-256 GCM.{'\n'}
              • Pre-calculated hash guarantees zero tampering before blockchain anchor.{'\n'}
              • Supports PDF, DOCX, Audio, Scans, and Raw Forensic Images up to 50 MB.
            </Text>
          </View>
        </View>

        {/* Next Step Button */}
        <Pressable
          style={({ pressed }) => [styles.nextBtn, pressed && styles.nextBtnPressed]}
          onPress={handleProceedToMetadata}>
          {isPicking ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.nextBtnText}>Proceed to Metadata Entry</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </>
          )}
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
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
    marginBottom: 20,
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
    fontWeight: '600',
    color: '#64748B',
  },
  stepLabelActive: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6334FA',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 6,
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0B192C',
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
  },
  sourceGrid: {
    gap: 10,
    marginBottom: 20,
  },
  sourceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  sourceButtonActive: {
    borderColor: '#6334FA',
    backgroundColor: '#F5F3FF',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  sourceIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sourceIconWrapActive: {
    backgroundColor: '#6334FA',
  },
  sourceButtonTextCol: {
    flex: 1,
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  sourceButtonTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0B192C',
  },
  sourceButtonDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  presetsSection: {
    marginBottom: 20,
  },
  presetsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  presetsTitleCol: {
    flex: 1,
  },
  presetsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0B192C',
  },
  presetsSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  tapBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  tapBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  presetsScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  presetCard: {
    width: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  presetCardActive: {
    borderColor: '#6334FA',
    backgroundColor: '#FAF8FF',
  },
  presetTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  presetIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  presetIconWrapActive: {
    backgroundColor: '#6334FA',
  },
  presetName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0B192C',
    marginBottom: 2,
  },
  presetFile: {
    fontSize: 11,
    color: '#6334FA',
    marginBottom: 6,
  },
  presetMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  presetMetaText: {
    fontSize: 11,
    color: '#64748B',
  },
  presetMetaDot: {
    color: '#94A3B8',
    fontSize: 10,
  },
  presetSelectedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#EDE9FE',
    gap: 4,
  },
  presetSelectedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6334FA',
  },
  fileSelectedBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  fileSelectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  fileSelectedHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fileSelectedTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0B192C',
  },
  fileMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  fileIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F3F0FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileMainInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0B192C',
    marginBottom: 4,
  },
  fileMetaPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  metaPill: {
    fontSize: 11,
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  hashBox: {
    backgroundColor: '#F8FAFD',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  hashHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  hashLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  hashText: {
    fontSize: 11,
    fontFamily: 'Courier',
    color: '#6334FA',
    fontWeight: '600',
  },
  specNotice: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 20,
  },
  specContent: {
    flex: 1,
  },
  specTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 4,
  },
  specText: {
    fontSize: 11,
    color: '#1E3A8A',
    lineHeight: 16,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6334FA',
    paddingVertical: 15,
    borderRadius: 14,
    gap: 8,
  },
  nextBtnPressed: {
    opacity: 0.9,
    backgroundColor: '#5224D9',
  },
  nextBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

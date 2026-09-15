import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

export interface PickedFileResult {
  name: string;
  size: string;
  sizeBytes: number;
  mimeType: string;
  uri?: string;
  sha256: string;
  sourceType: 'file' | 'camera' | 'gallery' | 'preset';
}

/**
 * Deterministic or random SHA-256 generator for prototype integrity calculation
 */
export function generateHashForFile(fileName: string, sizeBytes: number = 1024): string {
  let hashVal = 0;
  const combined = `${fileName}_${sizeBytes}_${Date.now()}`;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hashVal = (hashVal << 5) - hashVal + char;
    hashVal |= 0;
  }
  const hexPart1 = Math.abs(hashVal).toString(16).padStart(8, '0');
  const hexPart2 = Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
  const hexPart3 = Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
  const hexPart4 = Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
  const hexPart5 = Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
  const hexPart6 = Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
  const hexPart7 = Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
  const hexPart8 = Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
  return `${hexPart1}${hexPart2}${hexPart3}${hexPart4}${hexPart5}${hexPart6}${hexPart7}${hexPart8}`.slice(0, 64);
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Pick any document from device filesystem or browser
 */
export async function pickLocalDocument(): Promise<PickedFileResult | null> {
  try {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,.doc,.docx,.png,.jpg,.jpeg,.txt,.csv';
        input.onchange = (e: any) => {
          const file = e.target.files?.[0];
          if (!file) {
            resolve(null);
            return;
          }
          const sizeBytes = file.size || 1024 * 512;
          resolve({
            name: file.name,
            size: formatBytes(sizeBytes),
            sizeBytes,
            mimeType: file.type || 'application/pdf',
            sha256: generateHashForFile(file.name, sizeBytes),
            sourceType: 'file',
          });
        };
        input.click();
      });
    }

    // React Native Expo Document Picker
    const result = await DocumentPicker.getDocumentAsync({
      type: ['*/*'],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    const sizeBytes = asset.size || 1024 * 768;
    return {
      name: asset.name,
      size: formatBytes(sizeBytes),
      sizeBytes,
      mimeType: asset.mimeType || 'application/octet-stream',
      uri: asset.uri,
      sha256: generateHashForFile(asset.name, sizeBytes),
      sourceType: 'file',
    };
  } catch (error) {
    console.warn('Error picking document:', error);
    return null;
  }
}

/**
 * Pick photo or evidence from Gallery
 */
export async function pickPhotoGallery(): Promise<PickedFileResult | null> {
  try {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      // Fallback on web or simulate if permission denied in simulator
      if (Platform.OS === 'web') {
        return pickLocalDocument();
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    const fileName = asset.fileName || `Evidence_Photo_${Date.now().toString().slice(-4)}.jpg`;
    const sizeBytes = asset.fileSize || 1024 * 1024 * 2.4;

    return {
      name: fileName,
      size: formatBytes(sizeBytes),
      sizeBytes,
      mimeType: asset.mimeType || 'image/jpeg',
      uri: asset.uri,
      sha256: generateHashForFile(fileName, sizeBytes),
      sourceType: 'gallery',
    };
  } catch (error) {
    console.warn('Error picking photo:', error);
    return null;
  }
}

/**
 * Capture evidence photo using Camera
 */
export async function captureWithCamera(): Promise<PickedFileResult | null> {
  try {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted && Platform.OS !== 'web') {
      console.warn('Camera permission not granted');
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.9,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    const fileName = asset.fileName || `Scanned_Document_${Date.now().toString().slice(-4)}.jpg`;
    const sizeBytes = asset.fileSize || 1024 * 1024 * 1.8;

    return {
      name: fileName,
      size: formatBytes(sizeBytes),
      sizeBytes,
      mimeType: asset.mimeType || 'image/jpeg',
      uri: asset.uri,
      sha256: generateHashForFile(fileName, sizeBytes),
      sourceType: 'camera',
    };
  } catch (error) {
    console.warn('Error launching camera:', error);
    return null;
  }
}

/**
 * Quick Load Sample Evidence Presets for fast 1-click testing during demonstrations
 */
export interface DemoPreset {
  id: string;
  title: string;
  fileName: string;
  size: string;
  sizeBytes: number;
  mimeType: string;
  docType: string;
  caseId: string;
  department: string;
  sensitivity: 'INTERNAL' | 'RESTRICTED' | 'HIGH' | 'TOP_SECRET';
  description: string;
  icon: string;
}

export const DEMO_PRESETS: DemoPreset[] = [
  {
    id: 'preset-fir',
    title: 'FIR Cyber Intrusion Complaint',
    fileName: 'FIR_Cyber_Extortion_2026_09.pdf',
    size: '1.48 MB',
    sizeBytes: 1550000,
    mimeType: 'application/pdf',
    docType: 'First Information Report (FIR)',
    caseId: 'CASE-2026-095',
    department: 'Metropolitan Cyber Crime Division',
    sensitivity: 'HIGH',
    description: 'Registered criminal complaint under IT Act Section 66F and IPC 384 regarding unauthorized ransomware intrusion.',
    icon: 'document-text',
  },
  {
    id: 'preset-audit',
    title: 'Financial Forensics Ledger Audit',
    fileName: 'Forensic_Bank_Ledger_Audit_Q4.pdf',
    size: '2.84 MB',
    sizeBytes: 2980000,
    mimeType: 'application/pdf',
    docType: 'Forensic Audit Report',
    caseId: 'CASE-2026-102',
    department: 'Financial Crimes Intelligence Bureau',
    sensitivity: 'RESTRICTED',
    description: 'Transaction discrepancy trail highlighting offshore shell corporate beneficiary transfers.',
    icon: 'calculator',
  },
  {
    id: 'preset-deposition',
    title: 'Sworn Witness Deposition',
    fileName: 'Witness_Deposition_Recorded_Audio.wav',
    size: '4.15 MB',
    sizeBytes: 4350000,
    mimeType: 'audio/wav',
    docType: 'Witness Deposition',
    caseId: 'CASE-2026-081',
    department: 'Legal Prosecution Bureau',
    sensitivity: 'HIGH',
    description: 'Verbatim transcript and audio recording of primary confidential whistleblower testimony.',
    icon: 'mic',
  },
  {
    id: 'preset-hardware',
    title: 'Hardware Seizure Evidence Photo',
    fileName: 'Seized_Server_Drive_Tag_Photo.jpg',
    size: '3.60 MB',
    sizeBytes: 3770000,
    mimeType: 'image/jpeg',
    docType: 'Physical Evidence Log',
    caseId: 'CASE-2026-068',
    department: 'Digital Forensics Lab',
    sensitivity: 'INTERNAL',
    description: 'Cryptographic tamper seals and physical barcode serial numbers photographed during raid.',
    icon: 'hardware-chip',
  },
  {
    id: 'preset-warrant',
    title: 'High Court Search Warrant',
    fileName: 'Judicial_Search_Seizure_Warrant.pdf',
    size: '890 KB',
    sizeBytes: 911000,
    mimeType: 'application/pdf',
    docType: 'Court Order / Warrant',
    caseId: 'CASE-2026-110',
    department: 'High Court Judicial Registry',
    sensitivity: 'TOP_SECRET',
    description: 'Certified judicial warrant authorizing electronic search and immediate chain of custody seizure.',
    icon: 'shield-checkmark',
  },
];

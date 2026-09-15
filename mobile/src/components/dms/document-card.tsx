import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { StatusBadge } from './status-badge';

export type DocumentItemData = {
  id: string;
  case_id: string;
  original_filename: string;
  document_type?: string | null;
  department?: string | null;
  sensitivity?: string | null;
  mime_type?: string | null;
  file_size?: number | null;
  sha256_hash?: string | null;
  status: string;
  created_at: string;
};

type DocumentCardProps = {
  document: DocumentItemData;
  onPress?: () => void;
  onMenuPress?: () => void;
};

function formatFileSize(bytes?: number | null): string {
  if (!bytes) return 'Unknown size';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(filename: string, mime?: string | null): {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  tag: string;
} {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf' || mime?.includes('pdf')) {
    return { icon: 'document-text', color: '#DC2626', bg: '#FEF2F2', tag: 'PDF' };
  }
  if (ext === 'docx' || ext === 'doc' || mime?.includes('word')) {
    return { icon: 'document-attach', color: '#1C3FB7', bg: '#EEF2FF', tag: 'DOC' };
  }
  if (['jpg', 'jpeg', 'png', 'webp'].includes(ext) || mime?.includes('image')) {
    return { icon: 'image', color: '#059669', bg: '#ECFDF5', tag: 'IMG' };
  }
  return { icon: 'document', color: '#5B45E0', bg: '#F5F3FF', tag: 'FILE' };
}

function formatRelativeDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return isoString;
  }
}

export function DocumentCard({ document, onPress, onMenuPress }: DocumentCardProps) {
  const fileDetails = getFileIcon(document.original_filename, document.mime_type);
  const hashDisplay = document.sha256_hash
    ? `${document.sha256_hash.slice(0, 8)}...${document.sha256_hash.slice(-6)}`
    : 'No hash';

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}>
      <View style={styles.topRow}>
        <View style={styles.fileHeader}>
          <View style={[styles.iconBox, { backgroundColor: fileDetails.bg }]}>
            <Ionicons name={fileDetails.icon} size={22} color={fileDetails.color} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.filename} numberOfLines={1}>
              {document.original_filename}
            </Text>
            <View style={styles.caseBadgeRow}>
              <View style={styles.caseBadge}>
                <Ionicons name="folder-outline" size={11} color="#475569" />
                <Text style={styles.caseText}>{document.case_id || 'Case #--'}</Text>
              </View>
              {document.department && (
                <Text style={styles.departmentDot}>• {document.department}</Text>
              )}
            </View>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.menuBtn, pressed && styles.menuPressed]}
          onPress={onMenuPress}
          hitSlop={8}>
          <Ionicons name="ellipsis-vertical" size={16} color="#94A3B8" />
        </Pressable>
      </View>

      <View style={styles.divider} />

      <View style={styles.bottomRow}>
        <View style={styles.metaRow}>
          <View style={styles.hashChip}>
            <Ionicons name="finger-print-outline" size={12} color="#1C3FB7" />
            <Text style={styles.hashText}>{hashDisplay}</Text>
          </View>
          <Text style={styles.sizeText}>{formatFileSize(document.file_size)}</Text>
          <Text style={styles.dateText}>{formatRelativeDate(document.created_at)}</Text>
        </View>

        <StatusBadge status={document.status} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 12,
  },
  pressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.92,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  filename: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  caseBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  caseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  caseText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  departmentDot: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  menuBtn: {
    padding: 6,
    borderRadius: 8,
  },
  menuPressed: {
    backgroundColor: '#F8FAFD',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  hashChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  hashText: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '600',
    color: '#1C3FB7',
  },
  sizeText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  dateText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
});

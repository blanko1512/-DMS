import { StyleSheet, Text, View } from 'react-native';

type StatusType =
  | 'VERIFIED'
  | 'SEALED'
  | 'ACTIVE'
  | 'CONSISTENT'
  | 'PENDING'
  | 'IN_REVIEW'
  | 'PROCESSING'
  | 'INCONSISTENT'
  | 'REVOKED'
  | 'EXPIRED'
  | 'ERROR'
  | 'BLOCKCHAIN'
  | 'INFO'
  | 'ADMIN'
  | 'INVESTIGATOR'
  | 'AUDITOR';

type StatusBadgeProps = {
  status: string | StatusType;
  label?: string;
  size?: 'small' | 'medium';
};

const statusConfig: Record<
  string,
  { bg: string; text: string; dot: string; label: string }
> = {
  VERIFIED: {
    bg: '#ECFDF5',
    text: '#047857',
    dot: '#059669',
    label: 'Verified',
  },
  SEALED: {
    bg: '#EEF2FF',
    text: '#1C3FB7',
    dot: '#1C3FB7',
    label: 'Chain Sealed',
  },
  ACTIVE: {
    bg: '#ECFDF5',
    text: '#047857',
    dot: '#059669',
    label: 'Active',
  },
  CONSISTENT: {
    bg: '#ECFDF5',
    text: '#047857',
    dot: '#059669',
    label: 'Consistent',
  },
  PENDING: {
    bg: '#FFFBEB',
    text: '#B45309',
    dot: '#D97706',
    label: 'Pending',
  },
  IN_REVIEW: {
    bg: '#FFFBEB',
    text: '#B45309',
    dot: '#D97706',
    label: 'In Review',
  },
  PROCESSING: {
    bg: '#FFFBEB',
    text: '#B45309',
    dot: '#D97706',
    label: 'Processing',
  },
  INCONSISTENT: {
    bg: '#FEF2F2',
    text: '#B91C1C',
    dot: '#DC2626',
    label: 'Inconsistent',
  },
  REVOKED: {
    bg: '#FEF2F2',
    text: '#B91C1C',
    dot: '#DC2626',
    label: 'Revoked',
  },
  EXPIRED: {
    bg: '#F1F5F9',
    text: '#475569',
    dot: '#64748B',
    label: 'Expired',
  },
  ERROR: {
    bg: '#FEF2F2',
    text: '#B91C1C',
    dot: '#DC2626',
    label: 'Failed',
  },
  BLOCKCHAIN: {
    bg: '#EEF2FF',
    text: '#1C3FB7',
    dot: '#1C3FB7',
    label: 'Blockchain',
  },
  ADMIN: {
    bg: '#F5F3FF',
    text: '#5B45E0',
    dot: '#5B45E0',
    label: 'Admin',
  },
  INVESTIGATOR: {
    bg: '#EEF2FF',
    text: '#1C3FB7',
    dot: '#1C3FB7',
    label: 'Investigator',
  },
  AUDITOR: {
    bg: '#F0FDF4',
    text: '#15803D',
    dot: '#16A34A',
    label: 'Auditor',
  },
};

export function StatusBadge({ status, label, size = 'small' }: StatusBadgeProps) {
  const normalizedKey = (status || '').toUpperCase();
  const config = statusConfig[normalizedKey] ?? {
    bg: '#F1F5F9',
    text: '#475569',
    dot: '#64748B',
    label: status,
  };

  const displayLabel = label ?? config.label;
  const isSmall = size === 'small';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: config.bg },
        isSmall ? styles.badgeSmall : styles.badgeMedium,
      ]}>
      <View style={[styles.dot, { backgroundColor: config.dot }]} />
      <Text
        style={[
          styles.text,
          { color: config.text },
          isSmall ? styles.textSmall : styles.textMedium,
        ]}
        numberOfLines={1}>
        {displayLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
  },
  badgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 5,
  },
  badgeMedium: {
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  textSmall: {
    fontSize: 11,
  },
  textMedium: {
    fontSize: 12,
  },
});

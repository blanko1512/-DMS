import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

export type ActivityItemData = {
  id: string;
  type: 'TRANSFER' | 'BLOCKCHAIN' | 'UPLOAD' | 'SHARE' | 'VERIFY' | 'AUDIT';
  title: string;
  description?: string;
  fromUser?: string | null;
  toUser?: string | null;
  timestamp: string;
  status?: string;
  isLast?: boolean;
};

type ActivityTimelineItemProps = {
  item: ActivityItemData;
};

function getActivityIcon(type: ActivityItemData['type']): {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
} {
  switch (type) {
    case 'BLOCKCHAIN':
      return { icon: 'shield-checkmark', color: '#1C3FB7', bg: '#EEF2FF' };
    case 'TRANSFER':
      return { icon: 'swap-horizontal', color: '#5B45E0', bg: '#F5F3FF' };
    case 'UPLOAD':
      return { icon: 'cloud-upload', color: '#0284C7', bg: '#F0F9FF' };
    case 'SHARE':
      return { icon: 'share-social', color: '#7C3AED', bg: '#F5F3FF' };
    case 'VERIFY':
      return { icon: 'checkmark-circle', color: '#059669', bg: '#ECFDF5' };
    default:
      return { icon: 'time', color: '#64748B', bg: '#F1F5F9' };
  }
}

export function ActivityTimelineItem({ item }: ActivityTimelineItemProps) {
  const iconConfig = getActivityIcon(item.type);

  return (
    <View style={styles.container}>
      <View style={styles.leftColumn}>
        <View style={[styles.iconCircle, { backgroundColor: iconConfig.bg }]}>
          <Ionicons name={iconConfig.icon} size={15} color={iconConfig.color} />
        </View>
        {!item.isLast && <View style={styles.timelineLine} />}
      </View>

      <View style={styles.contentColumn}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.timeText}>{item.timestamp}</Text>
        </View>

        {item.description && (
          <Text style={styles.description}>{item.description}</Text>
        )}

        {(item.fromUser || item.toUser) && (
          <View style={styles.transferRow}>
            {item.fromUser && (
              <View style={styles.userChip}>
                <Ionicons name="person-outline" size={10} color="#475569" />
                <Text style={styles.userText}>{item.fromUser}</Text>
              </View>
            )}
            {item.fromUser && item.toUser && (
              <Ionicons name="arrow-forward" size={11} color="#94A3B8" />
            )}
            {item.toUser && (
              <View style={[styles.userChip, styles.toUserChip]}>
                <Ionicons name="arrow-down-outline" size={10} color="#1C3FB7" />
                <Text style={[styles.userText, styles.toUserText]}>{item.toUser}</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  leftColumn: {
    alignItems: 'center',
    width: 32,
    marginRight: 10,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },
  contentColumn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  timeText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  description: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
    marginBottom: 6,
  },
  transferRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  userChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  toUserChip: {
    backgroundColor: '#EEF2FF',
  },
  userText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#334155',
  },
  toUserText: {
    color: '#1C3FB7',
  },
});

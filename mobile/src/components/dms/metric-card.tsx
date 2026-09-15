import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type MetricCardProps = {
  label: string;
  value: string | number;
  sublabel?: string;
  icon: keyof typeof Ionicons.glyphMap;
  accentColor?: string;
  bgColor?: string;
  onPress?: () => void;
};

export function MetricCard({
  label,
  value,
  sublabel,
  icon,
  accentColor = '#1C3FB7',
  bgColor = '#FFFFFF',
  onPress,
}: MetricCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: bgColor },
        pressed && styles.pressed,
      ]}
      onPress={onPress}
      disabled={!onPress}>
      <View style={styles.topRow}>
        <View style={[styles.iconContainer, { backgroundColor: `${accentColor}14` }]}>
          <Ionicons name={icon} size={20} color={accentColor} />
        </View>
        {sublabel && (
          <View style={[styles.pill, { backgroundColor: `${accentColor}10` }]}>
            <Text style={[styles.pillText, { color: accentColor }]}>{sublabel}</Text>
          </View>
        )}
      </View>

      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 150,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    justifyContent: 'space-between',
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  value: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
    letterSpacing: 0.1,
  },
});

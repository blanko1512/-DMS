import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type QuickActionButtonProps = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  variant?: 'primary' | 'surface' | 'accent';
  onPress: () => void;
  badge?: string | number;
};

export function QuickActionButton({
  title,
  icon,
  variant = 'surface',
  onPress,
  badge,
}: QuickActionButtonProps) {
  const isPrimary = variant === 'primary';
  const isAccent = variant === 'accent';

  const iconColor = isPrimary ? '#FFFFFF' : isAccent ? '#FFFFFF' : '#1C3FB7';
  const iconBg = isPrimary ? '#1C3FB7' : isAccent ? '#5B45E0' : '#FFFFFF';

  return (
    <Pressable
      style={({ pressed }) => [styles.wrapper, pressed && styles.pressed]}
      onPress={onPress}>
      <View style={[styles.iconButton, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
        {badge !== undefined && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>
      <Text style={styles.label} numberOfLines={2} textBreakStrategy="simple">
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    width: 76,
    gap: 6,
  },
  pressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.85,
  },
  iconButton: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#1C3FB7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    position: 'relative',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'center',
    lineHeight: 14,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#5B45E0',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});

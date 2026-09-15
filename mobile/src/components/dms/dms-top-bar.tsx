import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type DmsTopBarProps = {
  title?: string;
  subtitle?: string;
  userRole?: string;
  username?: string;
  onNotificationPress?: () => void;
  onProfilePress?: () => void;
};

export function DmsTopBar({
  title = 'DMS Workspace',
  subtitle = 'Secure Document Registry',
  userRole = 'ADMIN',
  username = 'Investigator',
  onNotificationPress,
  onProfilePress,
}: DmsTopBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.leftCol}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoText}>D</Text>
        </View>
        <View>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{title}</Text>
            <View style={styles.liveDot} />
          </View>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </View>

      <View style={styles.rightCol}>
        <Pressable
          style={({ pressed }) => [styles.iconBtn, pressed && styles.btnPressed]}
          onPress={onNotificationPress}>
          <Ionicons name="notifications-outline" size={20} color="#0F172A" />
          <View style={styles.notificationDot} />
        </Pressable>

        {/* <Pressable
          style={({ pressed }) => [styles.profileBtn, pressed && styles.btnPressed]}
          onPress={onProfilePress}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {username.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.roleChip}>
            <Text style={styles.roleChipText}>{userRole}</Text>
          </View>
        </Pressable> */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  leftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#1C3FB7',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1C3FB7',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  logoText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 18,
    letterSpacing: -0.5,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  rightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#5B45E0',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  profileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingRight: 8,
    paddingLeft: 3,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#5B45E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  roleChip: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1C3FB7',
    letterSpacing: 0.2,
  },
  btnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
});

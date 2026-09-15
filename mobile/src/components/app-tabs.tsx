import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type TabButtonProps = TabTriggerSlotProps & {
  label: string;
  iconName: keyof typeof Ionicons.glyphMap;
  activeIconName: keyof typeof Ionicons.glyphMap;
  isCenter?: boolean;
  isActive?: boolean;
  href: string;
};

export function DmsTabButton({
  children: _children,
  isFocused,
  label,
  iconName,
  activeIconName,
  isCenter = false,
  isActive: propIsActive,
  href,
  onPress: slotOnPress,
  ...props
}: TabButtonProps) {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);

  // Consider active if explicitly computed from pathname OR reported by slot
  const active = Boolean(propIsActive ?? isFocused);

  const handlePress = (e: any) => {
    if (slotOnPress) {
      slotOnPress(e);
    }
    if (href) {
      router.push(href as any);
    }
  };

  // isCenter is kept as a prop for backwards compatibility, but the upload
  // tab now renders exactly like every other tab button (no floating FAB).
  const isHighlighted = active || isHovered;
  const color = active ? '#7C3AED' : isHovered ? '#6D28D9' : '#94A3B8';
  const icon = active ? activeIconName : iconName;

  return (
    <Pressable
      {...props}
      onPress={handlePress}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      style={({ pressed, hovered }: any) => [
        styles.tabButton,
        (hovered || isHovered) && styles.tabButtonHovered,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.iconWrapper}>
        <Ionicons name={icon} size={21} color={color} />
      </View>
      <Text
        numberOfLines={1}
        style={[
          styles.tabLabel,
          { color },
          active && styles.tabLabelActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'ios' ? 14 : 10);

  return (
    <View style={[styles.tabListContainer, { paddingBottom: bottomPadding }]}>
      <View style={styles.innerBar}>{props.children}</View>
    </View>
  );
}

export default function AppTabs() {
  const pathname = usePathname() || '/';
  const insets = useSafeAreaInsets();
  const authRoutes = ['/login', '/splash', '/otp', '/document-viewer'];
  const hideTabs = authRoutes.includes(pathname);
  // Reserve space at the bottom of every screen so content doesn't sit
  // underneath the floating tab bar (bar height + its bottom offset).
  const slotBottomPadding = hideTabs ? 0 : 60;

  // Precise pathname-based active checks
  const isHomeActive =
    pathname === '/' || pathname === '/index' || pathname === '';
  const isDocumentsActive =
    pathname.startsWith('/document') ||
    pathname.startsWith('/search') ||
    pathname.startsWith('/duplicate');
  const isUploadActive =
    pathname.startsWith('/upload') ||
    pathname.startsWith('/processing') ||
    pathname.startsWith('/validation') ||
    pathname.startsWith('/ai-classification');
  const isAlertsActive = pathname.startsWith('/notification');
  const isProfileActive =
    pathname.startsWith('/profile') ||
    pathname.startsWith('/security-settings') ||
    pathname.startsWith('/custody') ||
    pathname.startsWith('/audit') ||
    pathname.startsWith('/blockchain') ||
    pathname.startsWith('/backup') ||
    pathname.startsWith('/shared');

  // All routes that are NOT visible tabs but need router.push navigation
  const hiddenRoutes = [
    'upload-metadata',
    'processing',
    'ai-classification',
    'validation-result',
    'document-detail',
    'document-viewer',
    'search',
    'notifications',
    'share-create',
    'share-detail',
    'shared-with-me',
    'custody',
    'audit',
    'blockchain',
    'backup',
    'integrity',
    'duplicates',
    'versions',
    'security-settings',
    'login',
    'splash',
    'otp',
    'explore',
  ];

  return (
    <Tabs style={styles.container}>
      <TabSlot style={[styles.slot, { paddingBottom: slotBottomPadding }]} />

      <TabList asChild>
        <CustomTabList>
          {/* Hidden triggers – enables router.push for every secondary screen */}
          {hiddenRoutes.map((route) => (
            <TabTrigger
              key={route}
              name={route}
              href={`/${route}` as any}
              style={{ position: 'absolute', width: 0, height: 0, opacity: 0, overflow: 'hidden' }}
            />
          ))}

          {!hideTabs && (
            <>
              <TabTrigger name="index" href="/" asChild>
                <DmsTabButton
                  label="Home"
                  iconName="home-outline"
                  activeIconName="home"
                  isActive={isHomeActive}
                  href="/"
                />
              </TabTrigger>

              <TabTrigger name="documents" href="/documents" asChild>
                <DmsTabButton
                  label="Documents"
                  iconName="folder-outline"
                  activeIconName="folder"
                  isActive={isDocumentsActive}
                  href="/documents"
                />
              </TabTrigger>

              <TabTrigger name="upload" href="/upload" asChild>
                <DmsTabButton
                  label="Upload"
                  iconName="cloud-upload-outline"
                  activeIconName="cloud-upload"
                  isCenter
                  isActive={isUploadActive}
                  href="/upload"
                />
              </TabTrigger>

              <TabTrigger name="profile" href="/profile" asChild>
                <DmsTabButton
                  label="Profile"
                  iconName="person-circle-outline"
                  activeIconName="person-circle"
                  isActive={isProfileActive}
                  href="/profile"
                />
              </TabTrigger>
            </>
          )}
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: '100%',
    backgroundColor: '#F8FAFD',
  },
  slot: {
    flex: 1,
    height: '100%',
  },

  /* ── Tab bar container ────────────────────────── */
  tabListContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    pointerEvents: 'box-none',
  },
  innerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(226,232,240,0.8)',
    maxWidth: 440,
    width: '100%',
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 10,
    // Softer, more premium elevation
    shadowColor: '#3730A3',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 14,
  },

  /* ── Regular tab buttons ──────────────────────── */
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    minWidth: 60,
    flex: 1,
    borderRadius: 18,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  tabButtonHovered: {
    backgroundColor: '#FAF8FF',
  },
  iconWrapper: {
    width: 42,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    marginTop: 4,
    letterSpacing: 0.15,
  },
  tabLabelActive: {
    fontWeight: '700',
    color: '#7C3AED',
  },

  /* ── Press feedback ───────────────────────────── */
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.95 }],
  },
});
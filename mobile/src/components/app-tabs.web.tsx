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
import { Pressable, StyleSheet, Text, View } from 'react-native';

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

  // Active state based on pathname or slot trigger
  const active = Boolean(propIsActive ?? isFocused);

  const handlePress = (e: any) => {
    if (slotOnPress) {
      slotOnPress(e);
    }
    if (href) {
      router.push(href as any);
    }
  };

  if (isCenter) {
    const isHighlighted = active || isHovered;
    return (
      <Pressable
        {...props}
        onPress={handlePress}
        onHoverIn={() => setIsHovered(true)}
        onHoverOut={() => setIsHovered(false)}
        style={({ pressed, hovered }: any) => [
          styles.centerTab,
          (hovered || isHovered) && styles.centerTabHovered,
          pressed && styles.pressed,
        ]}
      >
        <View
          style={[
            styles.centerIconWrapper,
            isHighlighted && styles.centerIconWrapperActive,
            active && styles.centerIconWrapperSelected,
          ]}
        >
          <Ionicons name="cloud-upload" size={24} color="#FFFFFF" />
        </View>
        <Text
          style={[
            styles.centerLabel,
            (active || isHovered) && styles.centerLabelActive,
          ]}
        >
          {label}
        </Text>
        {active && <View style={styles.activeDot} />}
      </Pressable>
    );
  }

  const isHighlighted = active || isHovered;
  const color = isHighlighted ? '#6334FA' : '#94A3B8';
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
      <View
        style={[
          styles.iconWrapper,
          isHovered && styles.iconWrapperHovered,
          active && styles.iconWrapperActive,
        ]}
      >
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text
        style={[
          styles.tabLabel,
          { color },
          active && styles.tabLabelActive,
        ]}
      >
        {label}
      </Text>
      {active && <View style={styles.activeDot} />}
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  return (
    <View {...props} style={styles.tabListContainer}>
      <View style={styles.innerBar}>{props.children}</View>
    </View>
  );
}

export default function AppTabs() {
  const pathname = usePathname() || '/';
  const authRoutes = ['/login', '/splash', '/otp', '/document-viewer'];
  const hideTabs = authRoutes.includes(pathname);

  // Exact pathname-based active tabs
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

  return (
    <Tabs style={styles.container}>
      <TabSlot style={styles.slot} />
      {!hideTabs && (
        <TabList asChild>
          <CustomTabList>
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

            <TabTrigger name="notifications" href="/notifications" asChild>
              <DmsTabButton
                label="Alerts"
                iconName="notifications-outline"
                activeIconName="notifications"
                isActive={isAlertsActive}
                href="/notifications"
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
          </CustomTabList>
        </TabList>
      )}
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
  tabListContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    pointerEvents: 'box-none',
  },
  innerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    maxWidth: 500,
    width: '100%',
    paddingVertical: 8,
    paddingHorizontal: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    minWidth: 64,
    borderRadius: 16,
    cursor: 'pointer',
    transitionProperty: 'all',
    transitionDuration: '150ms',
  } as any,
  tabButtonHovered: {
    backgroundColor: '#F8F6FF',
    transform: [{ translateY: -2 }],
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    transitionProperty: 'all',
    transitionDuration: '150ms',
  } as any,
  iconWrapperHovered: {
    backgroundColor: '#F0EBFF',
    transform: [{ scale: 1.08 }],
  },
  iconWrapperActive: {
    backgroundColor: '#EDE9FE',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
    letterSpacing: 0.1,
    transitionProperty: 'color',
    transitionDuration: '150ms',
  } as any,
  tabLabelActive: {
    fontWeight: '700',
    color: '#6334FA',
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#6334FA',
    marginTop: 2,
  },
  centerTab: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
    paddingHorizontal: 6,
    cursor: 'pointer',
    transitionProperty: 'transform',
    transitionDuration: '150ms',
  } as any,
  centerTabHovered: {
    transform: [{ translateY: -3 }],
  },
  centerIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 20,
    backgroundColor: '#6334FA',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6334FA',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    transitionProperty: 'all',
    transitionDuration: '150ms',
  } as any,
  centerIconWrapperActive: {
    backgroundColor: '#5224E3',
    shadowOpacity: 0.55,
    transform: [{ scale: 1.08 }],
  },
  centerIconWrapperSelected: {
    backgroundColor: '#4318D1',
    borderColor: '#E0E7FF',
    borderWidth: 3,
    shadowOpacity: 0.65,
    shadowRadius: 16,
  },
  centerLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 3,
    transitionProperty: 'color',
    transitionDuration: '150ms',
  } as any,
  centerLabelActive: {
    color: '#6334FA',
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.94 }],
  },
});

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StatusBadge } from '@/components/dms';
import { INITIAL_NOTIFICATIONS, NotificationItem } from '@/constants/mockData';
import { DmsApi } from '@/services/api';

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');
  const [refreshing, setRefreshing] = useState(false);

  const fetchLiveNotifications = async () => {
    try {
      const res = await DmsApi.listAuditLogs(20, 0);
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        const liveItems: NotificationItem[] = res.data.map((l: any, idx: number) => {
          const actionUpper = (l.action || '').toUpperCase();
          let category: NotificationItem['category'] = 'VALIDATION';
          if (actionUpper.includes('BLOCKCHAIN')) category = 'BLOCKCHAIN';
          else if (actionUpper.includes('SHARE')) category = 'SHARE';
          else if (actionUpper.includes('HASH') || actionUpper.includes('VERIF')) category = 'INTEGRITY';
          else if (actionUpper.includes('AUTH') || actionUpper.includes('SECURITY')) category = 'SECURITY';

          return {
            id: l.id || `notif-${idx}`,
            title: l.action || 'System Audit Event',
            description: l.details || l.description || 'Action successfully committed in DMS repository.',
            timestamp: l.timestamp ? new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now',
            isRead: idx > 2,
            category,
            docId: l.document_id || undefined,
          };
        });
        setNotifications(liveItems);
      }
    } catch {
      // fallback
    }
  };

  React.useEffect(() => {
    fetchLiveNotifications();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLiveNotifications();
    setRefreshing(false);
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filteredList =
    filter === 'UNREAD' ? notifications.filter((n) => !n.isRead) : notifications;

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleNotificationPress = (item: NotificationItem) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
    );

    if (item.docId) {
      router.push({
        pathname: '/document-detail',
        params: { id: item.docId },
      });
    } else if (item.category === 'SECURITY') {
      router.push('/security-settings');
    }
  };

  const getCategoryIcon = (category: NotificationItem['category']) => {
    switch (category) {
      case 'SHARE':
        return { name: 'share-social', color: '#6334FA', bg: '#FAF5FF' };
      case 'BLOCKCHAIN':
        return { name: 'cube', color: '#0284C7', bg: '#E0F2FE' };
      case 'VALIDATION':
        return { name: 'hardware-chip', color: '#D97706', bg: '#FEF3C7' };
      case 'INTEGRITY':
        return { name: 'finger-print', color: '#059669', bg: '#D1FAE5' };
      case 'SECURITY':
        return { name: 'shield-outline', color: '#DC2626', bg: '#FEE2E2' };
      default:
        return { name: 'notifications', color: '#6334FA', bg: '#FAF5FF' };
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Alerts & Notifications</Text>
        {unreadCount > 0 && (
          <Pressable onPress={handleMarkAllRead}>
            <Text style={styles.markAllText}>Mark all as read</Text>
          </Pressable>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        <Pressable
          style={[styles.filterBtn, filter === 'ALL' && styles.filterBtnActive]}
          onPress={() => setFilter('ALL')}>
          <Text style={[styles.filterBtnText, filter === 'ALL' && styles.filterBtnTextActive]}>
            All ({notifications.length})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.filterBtn, filter === 'UNREAD' && styles.filterBtnActive]}
          onPress={() => setFilter('UNREAD')}>
          <Text style={[styles.filterBtnText, filter === 'UNREAD' && styles.filterBtnTextActive]}>
            Unread ({unreadCount})
          </Text>
        </Pressable>
      </View>

      {/* Notifications List */}
      <FlatList
        data={filteredList}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const cat = getCategoryIcon(item.category);

          return (
            <Pressable
              style={({ pressed }) => [
                styles.notifCard,
                !item.isRead && styles.notifCardUnread,
                pressed && styles.cardPressed,
              ]}
              onPress={() => handleNotificationPress(item)}>
              <View style={[styles.categoryIconCircle, { backgroundColor: cat.bg }]}>
                <Ionicons name={cat.name as any} size={20} color={cat.color} />
              </View>

              <View style={styles.notifContent}>
                <View style={styles.notifHeaderRow}>
                  <Text style={[styles.notifTitle, !item.isRead && styles.notifTitleUnread]}>
                    {item.title}
                  </Text>
                  <Text style={styles.notifTime}>{item.timestamp}</Text>
                </View>

                <Text style={styles.notifDesc}>{item.description}</Text>

                <View style={styles.categoryBadgeRow}>
                  <Text style={[styles.categoryBadge, { color: cat.color }]}>
                    {item.category}
                  </Text>
                  {!item.isRead && <View style={styles.unreadDot} />}
                </View>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={48} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No Alerts Found</Text>
            <Text style={styles.emptySub}>All investigation notifications have been cleared.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFD',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0B192C',
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6334FA',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  filterBtnActive: {
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#6334FA',
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  filterBtnTextActive: {
    color: '#6334FA',
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 110,
  },
  notifCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  notifCardUnread: {
    backgroundColor: '#FAF5FF',
    borderColor: '#E9D5FF',
  },
  cardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  categoryIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifContent: {
    flex: 1,
  },
  notifHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0B192C',
    flex: 1,
    marginRight: 8,
  },
  notifTitleUnread: {
    fontWeight: '800',
  },
  notifTime: {
    fontSize: 11,
    color: '#94A3B8',
  },
  notifDesc: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
    marginBottom: 8,
  },
  categoryBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryBadge: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6334FA',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0B192C',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
});

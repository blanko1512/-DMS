import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  DmsTopBar,
  DocumentCard,
  DocumentItemData,
  SearchBar,
  SectionHeader,
  StatusBadge,
} from '@/components/dms';
import { DmsApi } from '@/services/api';
import { DocumentStore, useDocuments, toDocumentItem } from '@/services/documentStore';

const filterCategories = ['All', 'Sealed', 'Verified', 'Pending', 'High Risk'];

export default function DocumentsScreen() {
  const router = useRouter();
  const rawDocs = useDocuments();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');

  const documents = useMemo(() => {
    return rawDocs.map(toDocumentItem);
  }, [rawDocs]);

  const fetchDocs = async () => {
    try {
      const synced = await DocumentStore.syncWithBackend();
      setIsLive(synced);
    } catch {
      setIsLive(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDocs();
    setRefreshing(false);
  };

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch =
        query.trim() === '' ||
        (doc.original_filename || '').toLowerCase().includes(query.toLowerCase()) ||
        (doc.case_id || '').toLowerCase().includes(query.toLowerCase()) ||
        (doc.department || '').toLowerCase().includes(query.toLowerCase()) ||
        (doc.sha256_hash || '').toLowerCase().includes(query.toLowerCase());

      if (!matchesSearch) return false;

      if (selectedFilter === 'Sealed') return (doc.status || '').toUpperCase() === 'SEALED';
      if (selectedFilter === 'Verified') return (doc.status || '').toUpperCase() === 'VERIFIED';
      if (selectedFilter === 'Pending') return (doc.status || '').toUpperCase() === 'PENDING';
      if (selectedFilter === 'High Risk') return doc.sensitivity === 'HIGH' || doc.sensitivity === 'TOP_SECRET';

      return true;
    });
  }, [documents, query, selectedFilter]);

  const handleDocumentAction = (doc: DocumentItemData) => {
    router.push({
      pathname: '/document-detail',
      params: { id: doc.id },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <DmsTopBar
        title="Document Repository"
        subtitle={isLive ? `Live Database (${documents.length} records)` : 'Evidence Archive'}
        userRole="INVESTIGATOR"
        onProfilePress={() => router.push('/profile')}
      />

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6334FA" />
        }>
        {/* Search */}
        <View style={styles.searchRow}>
          <SearchBar
            value={query}
            onChangeText={setQuery}
            placeholder="Search by case, title or hash..."
          />
        </View>

        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}>
          {filterCategories.map((cat) => {
            const isSelected = selectedFilter === cat;
            return (
              <Pressable
                key={cat}
                style={[styles.filterChip, isSelected && styles.filterChipActive]}
                onPress={() => setSelectedFilter(cat)}>
                <Text style={[styles.filterText, isSelected && styles.filterTextActive]}>
                  {cat}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Results Header */}
        <SectionHeader
          title="Archive Records"
          badge={filteredDocuments.length}
          actionText="+ Ingest New"
          onActionPress={() => router.push('/upload')}
        />

        {/* Document Cards List */}
        {loading && documents.length === 0 ? (
          <View style={{ paddingVertical: 48, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#6334FA" />
            <Text style={{ marginTop: 12, fontSize: 13, color: '#64748B' }}>Connecting to DMS Repository...</Text>
          </View>
        ) : filteredDocuments.length > 0 ? (
          filteredDocuments.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              onPress={() => handleDocumentAction(doc)}
              onMenuPress={() => handleDocumentAction(doc)}
            />
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="search-outline" size={32} color="#94A3B8" />
            </View>
            <Text style={styles.emptyTitle}>No matching documents</Text>
            <Text style={styles.emptySubtitle}>
              {isLive ? 'No records match your query.' : 'Database is not running or no records found.'}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFD',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 120 : 100,
  },
  searchRow: {
    marginVertical: 12,
  },
  filterList: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#1C3FB7',
    borderColor: '#1C3FB7',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 240,
  },
});

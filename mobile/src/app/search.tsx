import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DocumentCard, StatusBadge } from '@/components/dms';
import { INITIAL_DOCUMENTS, DmsDocument } from '@/constants/mockData';
import { DmsApi } from '@/services/api';
import { DocumentStore } from '@/services/documentStore';

const RECENT_SEARCHES = [
  'CASE-2026-089',
  'Forensic Audit',
  'Witness Deposition',
  'FIR',
  'Financial Crimes',
];

const FILTER_TYPES = ['All', 'FIR', 'Audit Report', 'Deposition', 'Evidence Photo'];
const SENSITIVITY_FILTERS = ['All', 'HIGH', 'RESTRICTED', 'INTERNAL', 'TOP_SECRET'];

export default function GlobalSearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedSensitivity, setSelectedSensitivity] = useState('All');
  const [recentSearches, setRecentSearches] = useState<string[]>(RECENT_SEARCHES);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isLive, setIsLive] = useState(false);

  // Perform search against FastAPI or local DocumentStore
  React.useEffect(() => {
    let isMounted = true;
    const executeSearch = async () => {
      setLoading(true);
      try {
        const res = await DmsApi.searchDocuments({
          q: query.trim() || undefined,
          document_type: selectedType === 'All' ? undefined : selectedType,
        });

        if (isMounted) {
          if (res.data && Array.isArray(res.data) && res.data.length > 0) {
            setResults(res.data);
            setIsLive(true);
          } else {
            // Filter local DocumentStore
            setIsLive(false);
            const allStoreDocs = DocumentStore.getDocuments();
            const fallback = allStoreDocs.filter((doc) => {
              const matchesQuery =
                !query.trim() ||
                doc.original_filename.toLowerCase().includes(query.toLowerCase()) ||
                doc.case_id.toLowerCase().includes(query.toLowerCase()) ||
                doc.document_type.toLowerCase().includes(query.toLowerCase()) ||
                doc.department.toLowerCase().includes(query.toLowerCase()) ||
                doc.sha256_hash.toLowerCase().includes(query.toLowerCase());
              const matchesType =
                selectedType === 'All' || doc.document_type.toLowerCase().includes(selectedType.toLowerCase());
              const matchesSensitivity =
                selectedSensitivity === 'All' || doc.sensitivity === selectedSensitivity;
              return matchesQuery && matchesType && matchesSensitivity;
            });
            setResults(fallback);
          }
        }
      } catch {
        if (isMounted) {
          setIsLive(false);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    const timer = setTimeout(executeSearch, 250);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [query, selectedType, selectedSensitivity]);

  const handleSelectRecent = (term: string) => {
    setQuery(term);
  };

  const handleClearRecent = () => {
    setRecentSearches([]);
  };

  const handleDocumentPress = (doc: any) => {
    router.push({
      pathname: '/document-detail',
      params: { id: doc.id },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Search Bar Header */}
      <View style={styles.searchHeader}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0B192C" />
        </Pressable>

        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={18} color="#6334FA" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by case ID, filename, metadata..."
            placeholderTextColor="#94A3B8"
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Filter Scroll Chips */}
      <View style={styles.filtersWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChipsContainer}>
          <Text style={styles.filterLabel}>Type:</Text>
          {FILTER_TYPES.map((type) => {
            const isSelected = selectedType === type;
            return (
              <Pressable
                key={type}
                style={[styles.filterChip, isSelected && styles.filterChipActive]}
                onPress={() => setSelectedType(type)}>
                <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                  {type}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Results or Recent Searches */}
      {!query.trim() && recentSearches.length > 0 ? (
        <View style={styles.recentSection}>
          <View style={styles.recentHeaderRow}>
            <Text style={styles.sectionTitle}>Recent Searches</Text>
            <Pressable onPress={handleClearRecent}>
              <Text style={styles.clearText}>Clear All</Text>
            </Pressable>
          </View>
          <View style={styles.recentTags}>
            {recentSearches.map((term, idx) => (
              <Pressable
                key={idx}
                style={styles.recentTag}
                onPress={() => handleSelectRecent(term)}>
                <Ionicons name="time-outline" size={14} color="#64748B" />
                <Text style={styles.recentTagText}>{term}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {/* Results Header */}
      <View style={styles.resultsInfoRow}>
        <Text style={styles.resultsCountText}>
          {results.length} document{results.length !== 1 ? 's' : ''} found {isLive ? '(Live DB)' : ''}
        </Text>
        <Text style={styles.apiBadgeText}>API: GET /api/documents/search</Text>
      </View>

      {/* Loading Spinner */}
      {loading ? (
        <View style={{ paddingVertical: 32, alignItems: 'center' }}>
          <ActivityIndicator size="small" color="#6334FA" />
          <Text style={{ marginTop: 8, fontSize: 12, color: '#64748B' }}>Searching live database...</Text>
        </View>
      ) : null}

      {/* Document List */}
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <DocumentCard
            document={{
              id: item.id,
              case_id: item.case_id,
              original_filename: item.original_filename,
              document_type: item.document_type,
              department: item.department,
              sensitivity: item.sensitivity,
              mime_type: item.mime_type,
              file_size: item.file_size,
              sha256_hash: item.sha256_hash,
              status: item.status,
              created_at: item.created_at,
            }}
            onPress={() => handleDocumentPress(item)}
            onMenuPress={() => handleDocumentPress(item)}
          />
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="search-outline" size={40} color="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>No matching documents found</Text>
              <Text style={styles.emptySubtitle}>
                Try searching with another Case ID, cryptographic hash snippet, or adjust category filters.
              </Text>
            </View>
          ) : null
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
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFD',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0B192C',
    fontWeight: '500',
  },
  filtersWrapper: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  filterChipsContainer: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginRight: 4,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#F3E8FF',
    borderColor: '#6334FA',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#6334FA',
    fontWeight: '700',
  },
  recentSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  recentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0B192C',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  clearText: {
    fontSize: 12,
    color: '#6334FA',
    fontWeight: '600',
  },
  recentTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  recentTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  recentTagText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#334155',
  },
  resultsInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  resultsCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  apiBadgeText: {
    fontSize: 11,
    color: '#6334FA',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0B192C',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
});

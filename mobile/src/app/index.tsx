import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  ActivityItemData,
  ActivityTimelineItem,
  DmsTopBar,
  DocumentCard,
  DocumentItemData,
  MetricCard,
  QuickActionButton,
  SearchBar,
  SectionHeader,
  StatusBadge,
} from "@/components/dms";

const mockRecentDocuments: DocumentItemData[] = [
  {
    id: "doc-101",
    case_id: "CASE-2026-089",
    original_filename: "Forensic_Audit_Report_Q3.pdf",
    document_type: "Audit Report",
    department: "Financial Crimes",
    sensitivity: "HIGH",
    mime_type: "application/pdf",
    file_size: 2450000,
    sha256_hash:
      "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
    status: "SEALED",
    created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
  },
  {
    id: "doc-102",
    case_id: "CASE-2026-074",
    original_filename: "Witness_Deposition_Transcript.docx",
    document_type: "Deposition",
    department: "Legal Prosecution",
    sensitivity: "RESTRICTED",
    mime_type:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    file_size: 894000,
    sha256_hash:
      "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
    status: "VERIFIED",
    created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
  },
  {
    id: "doc-103",
    case_id: "CASE-2026-062",
    original_filename: "Chain_Custody_Evidence_Photos.png",
    document_type: "Evidence Photo",
    department: "Forensic Lab",
    sensitivity: "INTERNAL",
    mime_type: "image/png",
    file_size: 4200000,
    sha256_hash:
      "4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a",
    status: "PENDING",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
  },
];

const mockRecentActivity: ActivityItemData[] = [
  {
    id: "act-1",
    type: "TRANSFER",
    title: "Custody Handover Completed",
    description:
      "Case folder #CASE-2026-089 physically transferred & accepted.",
    fromUser: "Det. Vance",
    toUser: "Lead Prosecutor",
    timestamp: "14 mins ago",
  },
  {
    id: "act-2",
    type: "BLOCKCHAIN",
    title: "Smart Contract Proof Registered",
    description: "SHA-256 hash anchored to Ethereum EVM block #4,921,842.",
    timestamp: "35 mins ago",
  },
  {
    id: "act-3",
    type: "UPLOAD",
    title: "New Investigation Document Ingested",
    description:
      "Witness_Deposition_Transcript.docx uploaded with AI OCR metadata.",
    fromUser: "Officer Davis",
    timestamp: "3 hours ago",
    isLast: true,
  },
];

import { DmsApi, ApiConfig } from "@/services/api";
import { DocumentStore, useDocuments, toDocumentItem } from "@/services/documentStore";

export default function DashboardScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [isBackendLive, setIsBackendLive] = useState(false);
  const [dbStatus, setDbStatus] = useState("Checking...");

  // Reactive documents state from DocumentStore
  const allDocs = useDocuments();
  const recentDocs = allDocs.slice(0, 5).map(toDocumentItem);
  const activities = DocumentStore.getRecentActivities();

  const loadDashboardData = async () => {
    try {
      // 1. Check health
      const healthRes = await DmsApi.getHealth();
      if (healthRes.data && healthRes.data.status === "ok") {
        setIsBackendLive(true);
      } else {
        setIsBackendLive(false);
      }

      // 2. Check DB health
      const dbRes = await DmsApi.getDbHealth();
      if (dbRes.data && dbRes.data.status === "ok") {
        setDbStatus("Connected (PostgreSQL)");
      } else {
        setDbStatus(healthRes.data ? "DB Offline" : "Server Offline");
      }

      // 3. Sync live backend docs if any
      await DocumentStore.syncWithBackend();
    } catch {
      setIsBackendLive(false);
      setDbStatus("Offline");
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleDocumentAction = (doc: DocumentItemData) => {
    router.push({
      pathname: "/document-detail",
      params: { id: doc.id },
    });
  };

  const verifiedCount = allDocs.filter(
    (d) =>
      (d.status || "").toUpperCase().includes("SEAL") ||
      (d.status || "").toUpperCase().includes("VERIF")
  ).length;

  const pendingCount = allDocs.filter((d) =>
    (d.status || "").toUpperCase().includes("PEND")
  ).length;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <DmsTopBar
        title="DMS Secure"
        subtitle="Digital Document Management"
        userRole="INVESTIGATOR"
        username="Det. Vance"
        onNotificationPress={() => router.push("/notifications")}
        onProfilePress={() => router.push("/profile")}
      />

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6334FA"
          />
        }
      >
        {/* Core Demo Journey Ribbon (PDF Section 5) */}
        <Pressable
          style={styles.journeyRibbon}
          onPress={() => router.push("/upload")}
        >
          <View style={styles.journeyRibbonLeft}>
            <View style={styles.journeyBadge}>
              <Ionicons name="play" size={12} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.journeyTitle}>Core Demo Journey</Text>
              <Text style={styles.journeySub}>
                Upload→AI→Validation→Blockchain
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#6334FA" />
        </Pressable>

        {/* Search & Filter Bar */}
        <Pressable
          style={styles.searchSection}
          onPress={() => router.push("/search")}
        >
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search Case ID, SHA-256, filename..."
            onFilterPress={() => router.push("/search")}
          />
        </Pressable>

        {/* Security & System Integrity Health Card */}
        <View style={styles.integrityCard}>
          <View style={styles.integrityHeader}>
            <View style={styles.shieldIconWrapper}>
              <Ionicons name="shield-checkmark" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.integrityInfo}>
              <View style={styles.integrityBadgeRow}>
                <Text style={styles.integrityTitle}>Security Status</Text>
              </View>
              <Text style={styles.integritySubtitle}>
                SHA-256 hash consistency: 100% • EVM Anchor Online
              </Text>
            </View>
          </View>
          <View style={styles.integrityFooter}>
            <Pressable
              style={styles.integrityMetric}
              onPress={() => router.push("/backup")}
            >
              <Text style={styles.metricLabel}>Backup & Recovery</Text>
              <Text style={styles.metricValue}>Healthy (View Status →)</Text>
            </Pressable>
            <View style={styles.integrityDivider} />
            <Pressable
              style={styles.integrityMetric}
              onPress={() => router.push("/audit")}
            >
              <Text style={styles.metricLabel}>Audit Trail</Text>
              <Text style={styles.metricValue}>100% Logged (View →)</Text>
            </Pressable>
          </View>
        </View>

        {/* Quick KPI Overview (PDF: document/verified/shared/pending counts) */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricsRow}>
            <MetricCard
              label="Documents"
              value={String(allDocs.length)}
              // sublabel="Active repo"
              icon="documents"
              accentColor="#6334FA"
              onPress={() => router.push("/documents")}
            />
            <MetricCard
              label="Verified Proofs"
              value={String(verifiedCount)}
              // sublabel="SHA-256"
              icon="shield-checkmark"
              accentColor="#059669"
              onPress={() => router.push("/custody")}
            />
          </View>
          <View style={styles.metricsRow}>
            <MetricCard
              label="Shared With Me"
              value="19"
              // sublabel="View authorized"
              icon="share-social"
              accentColor="#6334FA"
              onPress={() => router.push("/shared-with-me")}
            />
            <MetricCard
              label="Pending Review"
              value={String(pendingCount)}
              // sublabel="Awaiting review"
              icon="time"
              accentColor="#D97706"
              onPress={() => router.push("/documents")}
            />
          </View>
        </View>

        {/* Quick Actions Row (PDF: Upload, Search, Shared With Me) */}
        <View style={styles.sectionContainer}>
          <SectionHeader title="Quick Actions" />
          <View style={styles.actionsBar}>
            <QuickActionButton
              title="Upload"
              icon="cloud-upload"
              variant="primary"
              onPress={() => router.push("/upload")}
            />
            <QuickActionButton
              title="Search"
              icon="search"
              variant="surface"
              onPress={() => router.push("/search")}
            />
            <QuickActionButton
              title="Shared With Me"
              icon="people-outline"
              variant="surface"
              onPress={() => router.push("/shared-with-me")}
            />
            <QuickActionButton
              title="Audit Log"
              icon="receipt-outline"
              variant="accent"
              onPress={() => router.push("/audit")}
            />
          </View>
        </View>

        {/* Recent Documents Section */}
        <View style={styles.sectionContainer}>
          <SectionHeader
            title="Recent Documents"
            badge={recentDocs.length}
            actionText="View all"
            onActionPress={() => router.push("/documents")}
          />
          {recentDocs.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              onPress={() => handleDocumentAction(doc)}
              onMenuPress={() => handleDocumentAction(doc)}
            />
          ))}
        </View>

        {/* Recent Chain-of-Custody Activity Feed */}
        <View style={styles.sectionContainer}>
          <SectionHeader
            title="Chain of Custody & Audit"
            actionText="Full Trail"
            onActionPress={() => router.push("/custody")}
          />
          <View style={styles.activityList}>
            {activities.map((act) => (
              <ActivityTimelineItem key={act.id} item={act} />
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFD",
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === "ios" ? 120 : 100,
  },
  journeyRibbon: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FAF5FF",
    borderWidth: 1.5,
    borderColor: "#E9D5FF",
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  journeyRibbonLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  journeyBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#6334FA",
    justifyContent: "center",
    alignItems: "center",
  },
  journeyTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0B192C",
  },
  journeySub: {
    fontSize: 11,
    color: "#6334FA",
    fontWeight: "600",
  },
  searchSection: {
    marginVertical: 10,
  },
  integrityCard: {
    backgroundColor: "#0B192C",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#0B192C",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  integrityHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  shieldIconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  integrityInfo: {
    flex: 1,
  },
  integrityBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  integrityTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  integritySubtitle: {
    color: "#DCE6FC",
    fontSize: 12,
    lineHeight: 16,
  },
  integrityFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(0, 0, 0, 0.16)",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginTop: 14,
  },
  integrityMetric: {
    flex: 1,
  },
  integrityDivider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    marginHorizontal: 12,
  },
  metricLabel: {
    fontSize: 10,
    color: "#BFDBFE",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: "600",
  },
  metricValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 2,
  },
  metricsGrid: {
    gap: 12,
    marginBottom: 16,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 12,
  },
  sectionContainer: {
    marginBottom: 20,
  },
  actionsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  activityList: {
    marginTop: 4,
  },
});

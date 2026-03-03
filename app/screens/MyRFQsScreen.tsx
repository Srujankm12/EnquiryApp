import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Constants from "expo-constants";
import { router } from "expo-router";
import { jwtDecode } from "jwt-decode";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
const API_URL = Constants.expoConfig?.extra?.API_URL;

interface RFQ {
  id: string;
  business_id: string;
  business_name: string;
  business_phone: string;
  business_email: string;
  address: string;
  city: string;
  state: string;
  category_id: string;
  sub_category_id: string;
  product_name: string;
  quantity: number;
  unit: string;
  price: number;
  is_rfq_active: boolean;
  created_at: string;
  updated_at: string;
}

const MyRFQsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [businessId, setBusinessId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");

  useEffect(() => { loadAndFetch(); }, []);

  const loadAndFetch = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;
      const decoded: any = jwtDecode(token);
      const storedCompanyId = await AsyncStorage.getItem("companyId");
      const bId = storedCompanyId || decoded.business_id || "";
      setBusinessId(bId);
      if (bId) await fetchMyRFQs(bId);
      else setLoading(false);
    } catch { setLoading(false); }
  };

  const fetchMyRFQs = async (bId: string) => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_URL}/rfq/get/${bId}`, { headers });
      const data = res.data?.rfqs || res.data?.data?.rfqs || [];
      setRfqs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching my RFQs:", error);
      setRfqs([]);
    } finally { setLoading(false); }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (businessId) await fetchMyRFQs(businessId);
    setRefreshing(false);
  }, [businessId]);

  const handleToggleStatus = async (rfqId: string, currentActive: boolean) => {
    try {
      const token = await AsyncStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`${API_URL}/rfq/update/status/${rfqId}`, { is_rfq_active: !currentActive }, { headers });
      setRfqs((prev) => prev.map((r) => r.id === rfqId ? { ...r, is_rfq_active: !currentActive } : r));
    } catch (error: any) {
      Alert.alert("Error", error?.response?.data?.error || "Failed to update status");
    }
  };

  const handleDelete = (rfqId: string) => {
    Alert.alert("Delete RFQ", "Are you sure you want to delete this RFQ?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };
            await axios.delete(`${API_URL}/rfq/delete/${rfqId}`, { headers });
            setRfqs((prev) => prev.filter((r) => r.id !== rfqId));
          } catch (error: any) {
            Alert.alert("Error", error?.response?.data?.error || "Failed to delete RFQ");
          }
        },
      },
    ]);
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      if (days === 0) return "Today";
      if (days === 1) return "Yesterday";
      if (days < 7) return `${days} days ago`;
      return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    } catch { return dateStr; }
  };

  const activeRFQs = rfqs.filter((r) => r.is_rfq_active);
  const inactiveRFQs = rfqs.filter((r) => !r.is_rfq_active);

  const filtered = rfqs.filter((r) => {
    const matchesFilter = filter === "all" || (filter === "active" && r.is_rfq_active) || (filter === "inactive" && !r.is_rfq_active);
    const q = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || r.product_name?.toLowerCase().includes(q) || r.city?.toLowerCase().includes(q) || r.business_name?.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  const renderRFQCard = (rfq: RFQ, index: number) => (
    <View key={`${rfq.id}-${index}`} style={[styles.rfqCard, !rfq.is_rfq_active && styles.rfqCardInactive]}>
      {/* Top accent */}
      <View style={[styles.cardAccent, { backgroundColor: rfq.is_rfq_active ? "#0078D7" : "#CBD5E1" }]} />

      {/* Header */}
      <View style={styles.cardInner}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.cardIconWrap, { backgroundColor: rfq.is_rfq_active ? "#EBF5FF" : "#F1F5F9" }]}>
              <Ionicons name="cube" size={20} color={rfq.is_rfq_active ? "#0078D7" : "#94A3B8"} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rfqProductName, !rfq.is_rfq_active && { color: '#94A3B8' }]} numberOfLines={1}>{rfq.product_name}</Text>
              <Text style={styles.rfqDate}>{formatDate(rfq.created_at)}</Text>
            </View>
          </View>
          <View style={[styles.statusPill, rfq.is_rfq_active ? styles.statusPillActive : styles.statusPillInactive]}>
            <View style={[styles.statusDot, { backgroundColor: rfq.is_rfq_active ? "#4ADE80" : "#94A3B8" }]} />
            <Text style={[styles.statusPillText, { color: rfq.is_rfq_active ? "#16A34A" : "#94A3B8" }]}>
              {rfq.is_rfq_active ? "Active" : "Closed"}
            </Text>
          </View>
        </View>

        {/* Chips */}
        <View style={styles.chipsRow}>
          <View style={[styles.chip, { backgroundColor: rfq.is_rfq_active ? "#EBF5FF" : "#F1F5F9" }]}>
            <Ionicons name="layers-outline" size={11} color={rfq.is_rfq_active ? "#0078D7" : "#94A3B8"} />
            <Text style={[styles.chipText, { color: rfq.is_rfq_active ? "#0078D7" : "#94A3B8" }]}>{rfq.quantity} {rfq.unit}</Text>
          </View>
          <View style={[styles.chip, { backgroundColor: rfq.is_rfq_active ? "#EBF5FF" : "#F1F5F9" }]}>
            <Ionicons name="pricetag-outline" size={11} color={rfq.is_rfq_active ? "#0078D7" : "#94A3B8"} />
            <Text style={[styles.chipText, { color: rfq.is_rfq_active ? "#0078D7" : "#94A3B8" }]}>
              {rfq.price > 0 ? `₹${rfq.price}` : "On Request"}
            </Text>
          </View>
          {rfq.city && (
            <View style={[styles.chip, { backgroundColor: "#F1F5F9" }]}>
              <Ionicons name="location-outline" size={11} color="#64748B" />
              <Text style={[styles.chipText, { color: "#64748B" }]} numberOfLines={1}>{rfq.city}{rfq.state ? `, ${rfq.state}` : ""}</Text>
            </View>
          )}
        </View>

        {/* Footer actions */}
        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={[styles.actionBtn, rfq.is_rfq_active ? styles.deactivateBtn : styles.activateBtn]}
            onPress={() => handleToggleStatus(rfq.id, rfq.is_rfq_active)}
          >
            <Ionicons name={rfq.is_rfq_active ? "pause-circle-outline" : "play-circle-outline"} size={15} color={rfq.is_rfq_active ? "#F59E0B" : "#16A34A"} />
            <Text style={[styles.actionBtnText, { color: rfq.is_rfq_active ? "#F59E0B" : "#16A34A" }]}>
              {rfq.is_rfq_active ? "Pause" : "Activate"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => handleDelete(rfq.id)}>
            <Ionicons name="trash-outline" size={15} color="#EF4444" />
            <Text style={[styles.actionBtnText, { color: "#EF4444" }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0060B8" />

      {/* ── Premium Header ── */}
      <View style={[styles.headerWrapper, { paddingTop: insets.top }]}>
        <View style={styles.orb1} /><View style={styles.orb2} /><View style={styles.orb3} />
        <View style={styles.headerInner}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.eyebrow}>PROCUREMENT</Text>
            <Text style={styles.headerTitle}>My RFQs</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => router.push("/pages/requestQutation" as any)}>
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={[styles.searchWrap, searchFocused && styles.searchWrapFocused]}>
          <View style={styles.searchIconCircle}>
            <Ionicons name="search-outline" size={14} color="#0078D7" />
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Search RFQs..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity style={styles.searchClearBtn} onPress={() => setSearchQuery("")}>
              <Ionicons name="close" size={14} color="#0078D7" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Stats Strip ── */}
      {!loading && (
        <View style={styles.statsStrip}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{rfqs.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#16A34A' }]}>{activeRFQs.length}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#94A3B8' }]}>{inactiveRFQs.length}</Text>
            <Text style={styles.statLabel}>Closed</Text>
          </View>
        </View>
      )}

      {/* ── Filter Chips ── */}
      {!loading && (
        <View style={styles.filterRow}>
          {(["all", "active", "inactive"] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, filter === f && styles.filterChipActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {loading ? (
        <View style={styles.loaderContainer}>
          <View style={styles.loaderCard}>
            <ActivityIndicator size="large" color="#0078D7" />
            <Text style={styles.loaderText}>Loading your RFQs...</Text>
          </View>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0078D7"]} tintColor="#0078D7" />}
        >
          {filtered.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="document-text-outline" size={30} color="#0078D7" />
              </View>
              <Text style={styles.emptyTitle}>{searchQuery ? "No Results Found" : "No RFQs Yet"}</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery ? `Nothing matches "${searchQuery}"` : "Create a Request for Quotation to let sellers know what you need"}
              </Text>
              {!searchQuery && (
                <TouchableOpacity style={styles.createBtn} onPress={() => router.push("/pages/requestQutation" as any)}>
                  <Ionicons name="add-circle-outline" size={18} color="#fff" />
                  <Text style={styles.createBtnText}>Create RFQ</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <>
              <Text style={styles.resultsInfo}>{filtered.length} request{filtered.length !== 1 ? "s" : ""} {searchQuery ? "found" : "total"}</Text>
              {filtered.map((rfq, index) => renderRFQCard(rfq, index))}
            </>
          )}
        </ScrollView>
      )}

      {/* ── FAB ── */}
      <TouchableOpacity style={styles.fab} onPress={() => router.push("/pages/requestQutation" as any)}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

export default MyRFQsScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F9FC" },

  // ── Header ──
  headerWrapper: {
    backgroundColor: "#0060B8", paddingHorizontal: 20, paddingBottom: 18,
    overflow: "hidden", shadowColor: "#003E80",
    shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 24, elevation: 18,
  },
  orb1: { position: "absolute", width: 280, height: 280, borderRadius: 140, backgroundColor: "rgba(255,255,255,0.06)", top: -100, right: -70 },
  orb2: { position: "absolute", width: 180, height: 180, borderRadius: 90, backgroundColor: "rgba(255,255,255,0.04)", bottom: 10, left: -60 },
  orb3: { position: "absolute", width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(100,180,255,0.08)", top: 20, right: width * 0.35 },
  headerInner: { flexDirection: "row", alignItems: "center", paddingTop: 16, paddingBottom: 16 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.15)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  eyebrow: { fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.65)", letterSpacing: 2, marginBottom: 2 },
  headerTitle: { fontSize: 26, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.5 },
  addBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" },

  searchWrap: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", paddingHorizontal: 12, height: 46, borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.3)", shadowColor: "#003E80", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 10, elevation: 6 },
  searchWrapFocused: { borderColor: "rgba(255,255,255,0.6)" },
  searchIconCircle: { width: 28, height: 28, borderRadius: 9, backgroundColor: "#EBF5FF", justifyContent: "center", alignItems: "center", marginRight: 8 },
  searchInput: { flex: 1, fontSize: 13, color: "#0F172A", fontWeight: "500" },
  searchClearBtn: { width: 28, height: 28, borderRadius: 9, backgroundColor: "#EBF5FF", justifyContent: "center", alignItems: "center", marginLeft: 6 },

  // ── Stats Strip ──
  statsStrip: { flexDirection: "row", backgroundColor: "#fff", marginHorizontal: 16, marginTop: 16, borderRadius: 18, paddingVertical: 14, shadowColor: "#1B4FBF", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 4, borderWidth: 1, borderColor: "#F0F4F8" },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 20, fontWeight: "900", color: "#0F172A", letterSpacing: -0.5 },
  statLabel: { fontSize: 10, color: "#94A3B8", fontWeight: "600", marginTop: 3 },
  statDivider: { width: 1, backgroundColor: "#F1F5F9" },

  // ── Filter Chips ──
  filterRow: { flexDirection: "row", paddingHorizontal: 16, marginTop: 14, gap: 8 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: "#F1F5F9", borderWidth: 1, borderColor: "#E2E8F0" },
  filterChipActive: { backgroundColor: "#EBF5FF", borderColor: "#0078D7" },
  filterChipText: { fontSize: 13, fontWeight: "700", color: "#94A3B8" },
  filterChipTextActive: { color: "#0078D7" },

  // ── Loader / Empty ──
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  loaderCard: { backgroundColor: "#fff", borderRadius: 20, padding: 32, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 6 },
  loaderText: { marginTop: 12, fontSize: 13, color: "#94A3B8", fontWeight: "500" },
  emptyContainer: { alignItems: "center", paddingVertical: 60, paddingHorizontal: 20 },
  emptyIconWrap: { width: 70, height: 70, borderRadius: 24, backgroundColor: "#EBF5FF", justifyContent: "center", alignItems: "center", marginBottom: 18 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A", letterSpacing: -0.3 },
  emptySubtitle: { fontSize: 13, color: "#94A3B8", textAlign: "center", marginTop: 8, lineHeight: 20, marginBottom: 24 },
  createBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#0078D7", paddingHorizontal: 24, paddingVertical: 13, borderRadius: 14, shadowColor: "#0078D7", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6 },
  createBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  resultsInfo: { fontSize: 12, color: "#94A3B8", fontWeight: "600", marginBottom: 12 },

  // ── RFQ Card ──
  rfqCard: {
    backgroundColor: "#fff", borderRadius: 22, marginBottom: 14,
    shadowColor: "#1B4FBF", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.09, shadowRadius: 16, elevation: 5,
    borderWidth: 1, borderColor: "#F0F4F8", overflow: "hidden",
  },
  rfqCardInactive: { opacity: 0.7 },
  cardAccent: { height: 3, width: "100%" },
  cardInner: { padding: 14 },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  cardHeaderLeft: { flexDirection: "row", alignItems: "center", flex: 1, gap: 12 },
  cardIconWrap: { width: 44, height: 44, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  rfqProductName: { fontSize: 15, fontWeight: "800", color: "#0F172A", letterSpacing: -0.2 },
  rfqDate: { fontSize: 11, color: "#94A3B8", marginTop: 2, fontWeight: "500" },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusPillActive: { backgroundColor: "#DCFCE7" },
  statusPillInactive: { backgroundColor: "#F1F5F9" },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusPillText: { fontSize: 11, fontWeight: "800" },

  chipsRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 14 },
  chip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20 },
  chipText: { fontSize: 11, fontWeight: "700" },

  cardFooter: { flexDirection: "row", gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 9, borderRadius: 12, borderWidth: 1 },
  activateBtn: { borderColor: "#16A34A", backgroundColor: "#F0FFF4" },
  deactivateBtn: { borderColor: "#F59E0B", backgroundColor: "#FFFBEB" },
  deleteBtn: { borderColor: "#EF4444", backgroundColor: "#FEF2F2" },
  actionBtnText: { fontSize: 13, fontWeight: "700" },

  // ── FAB ──
  fab: {
    position: "absolute", bottom: 36, right: 20,
    width: 58, height: 58, borderRadius: 20,
    backgroundColor: "#0078D7", justifyContent: "center", alignItems: "center",
    shadowColor: "#0078D7", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45, shadowRadius: 16, elevation: 10,
  },
});

import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Constants from "expo-constants";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Dimensions,
  Linking,
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
  product_name: string;
  quantity: number;
  unit: string;
  price: number;
  is_rfq_active: boolean;
  created_at: string;
  updated_at: string;
}

const BuyTradeLeadsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tradeLeads, setTradeLeads] = useState<RFQ[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    fetchTradeLeads();
  }, []);

  useEffect(() => {
    intervalRef.current = setInterval(() => fetchTradeLeads(false), 30000);
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === "active")
        fetchTradeLeads(false);
      appState.current = nextAppState;
    });
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      subscription.remove();
    };
  }, []);

  const fetchTradeLeads = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await axios.get(`${API_URL}/rfq/get/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const rfqs = res.data?.rfqs || res.data?.data?.rfqs || [];
      setTradeLeads(Array.isArray(rfqs) ? rfqs : []);
    } catch {
      if (showLoader) setTradeLeads([]);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTradeLeads(false);
    setRefreshing(false);
  }, []);

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

  const filtered = tradeLeads.filter((lead) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      lead.product_name?.toLowerCase().includes(q) ||
      lead.business_name?.toLowerCase().includes(q) ||
      lead.city?.toLowerCase().includes(q)
    );
  });

  const LeadCard = ({ lead }: { lead: RFQ }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => router.push({ pathname: "/pages/rfqDetail" as any, params: { rfq_id: lead.id } })}
    >
      {/* Top accent */}
      <View style={styles.cardAccent} />

      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={styles.cardIconWrap}>
            <Ionicons name="briefcase" size={18} color="#0078D7" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.productName} numberOfLines={1}>{lead.product_name}</Text>
            <View style={styles.bizRow}>
              <Ionicons name="storefront-outline" size={10} color="#94A3B8" />
              <Text style={styles.businessName} numberOfLines={1}>{lead.business_name}</Text>
            </View>
          </View>
        </View>
        <View style={styles.tradeBadge}>
          <Text style={styles.tradeBadgeText}>RFQ</Text>
        </View>
      </View>

      <View style={styles.chipsRow}>
        <View style={styles.chip}>
          <Ionicons name="layers-outline" size={11} color="#0078D7" />
          <Text style={styles.chipText}>{lead.quantity} {lead.unit}</Text>
        </View>
        <View style={styles.chip}>
          <Ionicons name="pricetag-outline" size={11} color="#0078D7" />
          <Text style={styles.chipText}>{lead.price > 0 ? `₹${lead.price}` : "On Request"}</Text>
        </View>
        {lead.city ? (
          <View style={[styles.chip, styles.chipMuted]}>
            <Ionicons name="location-outline" size={11} color="#64748B" />
            <Text style={[styles.chipText, { color: "#64748B" }]} numberOfLines={1}>{lead.city}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.cardFooter}>
        <View style={styles.dateRow}>
          <Ionicons name="time-outline" size={11} color="#94A3B8" />
          <Text style={styles.dateText}>{formatDate(lead.created_at)}</Text>
        </View>
        <View style={styles.footerActions}>
          <TouchableOpacity
            style={styles.footerBtn}
            onPress={(e) => { e.stopPropagation(); router.push({ pathname: "/pages/bussinesProfile" as any, params: { business_id: lead.business_id } }); }}
          >
            <Ionicons name="person-outline" size={15} color="#0078D7" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.footerBtn}
            onPress={(e) => { e.stopPropagation(); if (lead.business_phone) Linking.openURL(`tel:${lead.business_phone}`); }}
          >
            <Ionicons name="call-outline" size={15} color="#0078D7" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.footerBtn, styles.footerBtnWA]}
            onPress={(e) => { e.stopPropagation(); if (lead.business_phone) Linking.openURL(`https://wa.me/${lead.business_phone.replace(/[^0-9]/g, "")}`); }}
          >
            <Ionicons name="logo-whatsapp" size={15} color="#25D366" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.footerArrow}>
            <Ionicons name="arrow-forward" size={13} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0060B8" />

      {/* ── PREMIUM HEADER ── */}
      <View style={[styles.headerWrapper, { paddingTop: insets.top }]}>
        <View style={styles.headerOrb1} />
        <View style={styles.headerOrb2} />
        <View style={styles.headerOrb3} />

        <View style={styles.headerInner}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.headerEyebrow}>MARKETPLACE</Text>
            <Text style={styles.headerTitle}>Trade Leads</Text>
          </View>
          <View style={styles.headerBadge}>
            <View style={styles.headerBadgeDot} />
            <Text style={styles.headerBadgeText}>{tradeLeads.length} live</Text>
          </View>
        </View>

        {/* Search inside header */}
        <View style={[styles.searchWrap, searchFocused && styles.searchWrapFocused]}>
          <View style={styles.searchIconCircle}>
            <Ionicons name="search-outline" size={14} color="#0078D7" />
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by product, business, city…"
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity style={styles.searchClearBtn} onPress={() => setSearchQuery("")}>
              <Ionicons name="close" size={15} color="#0078D7" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <View style={styles.loaderCard}>
            <ActivityIndicator size="large" color="#0078D7" />
            <Text style={styles.loaderText}>Loading trade leads…</Text>
          </View>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0078D7"]} tintColor="#0078D7" />
          }
        >


          {/* Section header */}
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>{searchQuery ? "Search Results" : "All Trade Leads"}</Text>
              <Text style={styles.sectionSubtitle}>{filtered.length} request{filtered.length !== 1 ? "s" : ""} found</Text>
            </View>
            {searchQuery ? (
              <TouchableOpacity style={styles.clearChip} onPress={() => setSearchQuery("")}>
                <Text style={styles.clearChipText}>Clear</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="document-text-outline" size={32} color="#0078D7" />
              </View>
              <Text style={styles.emptyTitle}>{searchQuery ? "No Results Found" : "No Trade Leads"}</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery ? `Nothing matches "${searchQuery}"` : "Active trade leads will appear here"}
              </Text>
              {searchQuery ? (
                <TouchableOpacity style={styles.outlineBtn} onPress={() => setSearchQuery("")}>
                  <Text style={styles.outlineBtnText}>Clear Search</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : (
            filtered.map((lead, i) => <LeadCard key={`${lead.id}-${i}`} lead={lead} />)
          )}
        </ScrollView>
      )}
    </View>
  );
};

export default BuyTradeLeadsScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F9FC" },

  // ── Premium Header ──
  headerWrapper: {
    backgroundColor: "#0060B8",
    paddingHorizontal: 20,
    paddingBottom: 18,
    overflow: "hidden",
    shadowColor: "#003E80",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 18,
  },
  headerOrb1: { position: "absolute", width: 280, height: 280, borderRadius: 140, backgroundColor: "rgba(255,255,255,0.06)", top: -100, right: -70 },
  headerOrb2: { position: "absolute", width: 180, height: 180, borderRadius: 90, backgroundColor: "rgba(255,255,255,0.04)", bottom: 10, left: -60 },
  headerOrb3: { position: "absolute", width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(100,180,255,0.08)", top: 20, right: width * 0.35 },
  headerInner: { flexDirection: "row", alignItems: "center", paddingTop: 16, paddingBottom: 16 },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center", alignItems: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
  },
  headerEyebrow: { fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.65)", letterSpacing: 2, marginBottom: 2 },
  headerTitle: { fontSize: 26, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.5 },
  headerBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
  },
  headerBadgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#4ADE80" },
  headerBadgeText: { fontSize: 11, fontWeight: "800", color: "#fff" },

  searchWrap: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF",
    paddingHorizontal: 12, height: 46, borderRadius: 16,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.3)",
    shadowColor: "#003E80", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18, shadowRadius: 10, elevation: 6,
  },
  searchWrapFocused: { borderColor: "rgba(255,255,255,0.6)" },
  searchIconCircle: { width: 28, height: 28, borderRadius: 9, backgroundColor: "#EBF5FF", justifyContent: "center", alignItems: "center", marginRight: 8 },
  searchInput: { flex: 1, fontSize: 13, color: "#0F172A", fontWeight: "500" },
  searchClearBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: "#EBF5FF", justifyContent: "center", alignItems: "center", marginLeft: 6 },

  // ── Loader ──
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F7F9FC" },
  loaderCard: { backgroundColor: "#fff", borderRadius: 20, padding: 32, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 6 },
  loaderText: { marginTop: 12, fontSize: 13, color: "#94A3B8", fontWeight: "500" },

  // ── Stats ──
  statsBar: {
    flexDirection: "row", margin: 16, marginBottom: 0,
    backgroundColor: "#0078D7", borderRadius: 18,
    paddingVertical: 18, paddingHorizontal: 10,
    shadowColor: "#0078D7", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28, shadowRadius: 14, elevation: 8,
  },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 20, fontWeight: "900", color: "#FFFFFF", letterSpacing: -0.5 },
  statLabel: { fontSize: 11, color: "rgba(255,255,255,0.72)", marginTop: 2, fontWeight: "600" },
  statDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.2)" },

  // ── Section ──
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, marginTop: 22, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A", letterSpacing: -0.4 },
  sectionSubtitle: { fontSize: 12, color: "#94A3B8", marginTop: 2, fontWeight: "500" },
  clearChip: { backgroundColor: "#EBF5FF", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  clearChipText: { fontSize: 12, fontWeight: "700", color: "#0078D7" },

  // ── Card ──
  card: {
    backgroundColor: "#fff", borderRadius: 22,
    marginHorizontal: 16, marginBottom: 14,
    shadowColor: "#1B4FBF", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.09, shadowRadius: 16, elevation: 6,
    borderWidth: 1, borderColor: "#F0F4F8", overflow: "hidden",
  },
  cardAccent: { height: 3, backgroundColor: "#0078D7", width: "100%" },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, paddingBottom: 10 },
  cardHeaderLeft: { flexDirection: "row", alignItems: "center", flex: 1, gap: 12 },
  cardIconWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#EBF5FF", justifyContent: "center", alignItems: "center" },
  productName: { fontSize: 15, fontWeight: "800", color: "#0F172A", letterSpacing: -0.2 },
  bizRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  businessName: { fontSize: 11, color: "#94A3B8", fontWeight: "500" },
  tradeBadge: { backgroundColor: "#0078D7", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, shadowColor: "#0078D7", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 3 },
  tradeBadgeText: { fontSize: 10, fontWeight: "800", color: "#FFFFFF", letterSpacing: 0.5 },

  chipsRow: { flexDirection: "row", paddingHorizontal: 14, paddingBottom: 12, gap: 8, flexWrap: "wrap" },
  chip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#EBF5FF", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20 },
  chipMuted: { backgroundColor: "#F1F5F9" },
  chipText: { fontSize: 11, fontWeight: "700", color: "#0078D7" },

  cardDivider: { height: 1, backgroundColor: "#F1F5F9", marginHorizontal: 14 },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 11 },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  dateText: { fontSize: 11, color: "#94A3B8", fontWeight: "500" },
  footerActions: { flexDirection: "row", gap: 7, alignItems: "center" },
  footerBtn: { width: 34, height: 34, borderRadius: 11, backgroundColor: "#EBF5FF", justifyContent: "center", alignItems: "center" },
  footerBtnWA: { backgroundColor: "#F0FDF4" },
  footerArrow: { width: 34, height: 34, borderRadius: 11, backgroundColor: "#0078D7", justifyContent: "center", alignItems: "center", shadowColor: "#0078D7", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 6, elevation: 4 },

  // ── Empty ──
  emptyState: { alignItems: "center", paddingVertical: 60, paddingHorizontal: 40 },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#EBF5FF", justifyContent: "center", alignItems: "center", marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A", letterSpacing: -0.3 },
  emptySubtitle: { fontSize: 13, color: "#94A3B8", textAlign: "center", marginTop: 8, lineHeight: 20 },
  outlineBtn: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 11, borderRadius: 12, borderWidth: 1.5, borderColor: "#0078D7" },
  outlineBtnText: { color: "#0078D7", fontSize: 13, fontWeight: "700" },
});

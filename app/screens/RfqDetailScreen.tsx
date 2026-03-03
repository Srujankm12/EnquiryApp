import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Constants from "expo-constants";
import { router, useLocalSearchParams } from "expo-router";
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

// ── Helpers ────────────────────────────────────────────────────────────────
const formatDate = (dateStr: string) => {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
      day: "numeric", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return dateStr; }
};

const formatDateShort = (dateStr: string) => {
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

// ── Section card helper ────────────────────────────────────────────────────
const SectionCard = ({
  iconName, iconBg, iconColor, title, children,
}: {
  iconName: any; iconBg: string; iconColor: string; title: string; children: React.ReactNode;
}) => (
  <View style={styles.sectionCard}>
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIconBg, { backgroundColor: iconBg }]}>
        <Ionicons name={iconName} size={16} color={iconColor} />
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    {children}
  </View>
);

// ── Detail row helper ──────────────────────────────────────────────────────
const DetailRow = ({
  label, value, icon,
}: {
  label: string; value: string; icon?: any;
}) => (
  <View style={styles.detailRow}>
    {icon && (
      <View style={styles.detailIconWrap}>
        <Ionicons name={icon} size={15} color="#0078D7" />
      </View>
    )}
    <View style={styles.detailContent}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || "N/A"}</Text>
    </View>
  </View>
);

// ── Main Screen ────────────────────────────────────────────────────────────
const RfqDetailScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { rfq_id } = useLocalSearchParams<{ rfq_id: string }>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rfq, setRfq] = useState<RFQ | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appState = useRef(AppState.currentState);

  const fetchRfqDetail = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const token = await AsyncStorage.getItem("token");
      const res = await axios.get(`${API_URL}/rfq/get/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data?.rfqs || res.data?.data?.rfqs || [];
      const found = (Array.isArray(data) ? data : []).find((r: RFQ) => r.id === rfq_id);
      if (found) setRfq(found);
    } catch { }
    finally { if (showLoader) setLoading(false); }
  }, [rfq_id]);

  useEffect(() => { fetchRfqDetail(); }, [fetchRfqDetail]);

  useEffect(() => {
    intervalRef.current = setInterval(() => fetchRfqDetail(false), 30000);
    const sub = AppState.addEventListener("change", (next) => {
      if (appState.current.match(/inactive|background/) && next === "active") fetchRfqDetail(false);
      appState.current = next;
    });
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      sub.remove();
    };
  }, [fetchRfqDetail]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRfqDetail(false);
    setRefreshing(false);
  }, [fetchRfqDetail]);

  // ── Shared header ──
  const Header = ({ productName, isActive }: { productName?: string; isActive?: boolean }) => (
    <View style={[styles.headerWrapper, { paddingTop: insets.top }]}>
      <View style={styles.orb1} /><View style={styles.orb2} /><View style={styles.orb3} />
      <View style={styles.headerInner}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={styles.eyebrow}>REQUEST FOR QUOTATION</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {productName || "RFQ Details"}
          </Text>
        </View>
        {isActive !== undefined && (
          <View style={[styles.statusPill, isActive ? styles.statusPillActive : styles.statusPillInactive]}>
            <View style={[styles.statusDot, { backgroundColor: isActive ? "#4ADE80" : "#F87171" }]} />
            <Text style={[styles.statusPillText, { color: isActive ? "#4ADE80" : "#F87171" }]}>
              {isActive ? "Active" : "Closed"}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  // ── Loading ──
  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0060B8" />
        <Header />
        <View style={styles.loaderContainer}>
          <View style={styles.loaderCard}>
            <ActivityIndicator size="large" color="#0078D7" />
            <Text style={styles.loaderText}>Loading RFQ details…</Text>
          </View>
        </View>
      </View>
    );
  }

  // ── Not found ──
  if (!rfq) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0060B8" />
        <Header />
        <View style={styles.loaderContainer}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="document-text-outline" size={32} color="#0078D7" />
          </View>
          <Text style={styles.emptyTitle}>RFQ Not Found</Text>
          <Text style={styles.emptySubtitle}>This request may have been removed or is no longer active.</Text>
          <TouchableOpacity style={styles.backToListBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={16} color="#fff" />
            <Text style={styles.backToListText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0060B8" />
      <Header productName={rfq.product_name} isActive={rfq.is_rfq_active} />

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0078D7"]} tintColor="#0078D7" />
        }
      >
        {/* ── Hero stats strip ── */}
        <View style={styles.heroStrip}>
          <View style={styles.heroStatItem}>
            <View style={styles.heroStatIcon}>
              <Ionicons name="layers-outline" size={18} color="#0078D7" />
            </View>
            <Text style={styles.heroStatValue}>{rfq.quantity} {rfq.unit}</Text>
            <Text style={styles.heroStatLabel}>Required Qty</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStatItem}>
            <View style={styles.heroStatIcon}>
              <Ionicons name="pricetag-outline" size={18} color="#0078D7" />
            </View>
            <Text style={styles.heroStatValue}>{rfq.price > 0 ? `₹${rfq.price}` : "Open"}</Text>
            <Text style={styles.heroStatLabel}>{rfq.price > 0 ? "Budget / Unit" : "On Request"}</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStatItem}>
            <View style={styles.heroStatIcon}>
              <Ionicons name="time-outline" size={18} color="#0078D7" />
            </View>
            <Text style={styles.heroStatValue}>{formatDateShort(rfq.created_at)}</Text>
            <Text style={styles.heroStatLabel}>Posted</Text>
          </View>
        </View>

        {/* ── Business Details ── */}
        <SectionCard iconName="storefront-outline" iconBg="#EBF5FF" iconColor="#0078D7" title="Business Details">
          <DetailRow icon="storefront-outline" label="Business Name" value={rfq.business_name} />
          <DetailRow icon="mail-outline" label="Email Address" value={rfq.business_email} />
          <DetailRow icon="call-outline" label="Phone Number" value={rfq.business_phone} />
        </SectionCard>

        {/* ── Location ── */}
        {(rfq.city || rfq.state || rfq.address) && (
          <SectionCard iconName="location-outline" iconBg="#FFF7ED" iconColor="#F97316" title="Location">
            {rfq.address ? <DetailRow icon="map-outline" label="Address" value={rfq.address} /> : null}
            {rfq.city ? <DetailRow icon="pin-outline" label="City" value={rfq.city} /> : null}
            {rfq.state ? <DetailRow icon="globe-outline" label="State" value={rfq.state} /> : null}
          </SectionCard>
        )}

        {/* ── Timeline ── */}
        <SectionCard iconName="calendar-outline" iconBg="#FDF4FF" iconColor="#9333EA" title="Timeline">
          <DetailRow icon="add-circle-outline" label="Date Posted" value={formatDate(rfq.created_at)} />
          {rfq.updated_at && rfq.updated_at !== rfq.created_at && (
            <DetailRow icon="refresh-outline" label="Last Updated" value={formatDate(rfq.updated_at)} />
          )}
        </SectionCard>

        {/* ── RFQ ID ── */}
        <View style={styles.rfqIdCard}>
          <Ionicons name="barcode-outline" size={14} color="#94A3B8" />
          <Text style={styles.rfqIdText}>RFQ : {rfq.is_rfq_active ? "Active" : "Closed"}</Text>
        </View>
      </ScrollView>

      {/* ── Sticky action bar ── */}
      <View style={[styles.actionBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={styles.actionBarBtn}
          onPress={() => router.push({ pathname: "/pages/bussinesProfile" as any, params: { business_id: rfq.business_id } })}
        >
          <View style={[styles.actionBtnIcon, { backgroundColor: "#EBF5FF" }]}>
            <Ionicons name="person-outline" size={20} color="#0078D7" />
          </View>
          <Text style={styles.actionBtnLabel}>Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBarBtn}
          onPress={() => rfq.business_phone && Linking.openURL(`tel:${rfq.business_phone}`)}
        >
          <View style={[styles.actionBtnIcon, { backgroundColor: "#DCFCE7" }]}>
            <Ionicons name="call-outline" size={20} color="#16A34A" />
          </View>
          <Text style={[styles.actionBtnLabel, { color: "#16A34A" }]}>Call</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBarBtn}
          onPress={() => rfq.business_phone && Linking.openURL(`https://wa.me/${rfq.business_phone.replace(/[^0-9]/g, "")}`)}
        >
          <View style={[styles.actionBtnIcon, { backgroundColor: "#DCFCE7" }]}>
            <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
          </View>
          <Text style={[styles.actionBtnLabel, { color: "#25D366" }]}>WhatsApp</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBarBtn, styles.actionBarBtnPrimary]}
          onPress={() => rfq.business_email && Linking.openURL(`mailto:${rfq.business_email}`)}
        >
          <Ionicons name="mail-outline" size={18} color="#fff" />
          <Text style={styles.actionBarBtnPrimaryText}>Send Email</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default RfqDetailScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F9FC" },

  // ── Header ──
  headerWrapper: {
    backgroundColor: "#0060B8", paddingHorizontal: 20, paddingBottom: 20,
    overflow: "hidden", shadowColor: "#003E80",
    shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 24, elevation: 18,
  },
  orb1: { position: "absolute", width: 280, height: 280, borderRadius: 140, backgroundColor: "rgba(255,255,255,0.06)", top: -100, right: -70 },
  orb2: { position: "absolute", width: 180, height: 180, borderRadius: 90, backgroundColor: "rgba(255,255,255,0.04)", bottom: 10, left: -60 },
  orb3: { position: "absolute", width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(100,180,255,0.08)", top: 20, right: width * 0.35 },
  headerInner: { flexDirection: "row", alignItems: "center", paddingTop: 16 },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center", alignItems: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
  },
  eyebrow: { fontSize: 9, fontWeight: "700", color: "rgba(255,255,255,0.6)", letterSpacing: 1.5, marginBottom: 2 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.4 },
  statusPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
  },
  statusPillActive: {},
  statusPillInactive: {},
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusPillText: { fontSize: 11, fontWeight: "800" },

  // ── Loader ──
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  loaderCard: { backgroundColor: "#fff", borderRadius: 20, padding: 32, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 6 },
  loaderText: { marginTop: 12, fontSize: 13, color: "#94A3B8", fontWeight: "500" },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#EBF5FF", justifyContent: "center", alignItems: "center", marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A", letterSpacing: -0.3 },
  emptySubtitle: { fontSize: 13, color: "#94A3B8", textAlign: "center", marginTop: 8, lineHeight: 20 },
  backToListBtn: { marginTop: 24, backgroundColor: "#0078D7", paddingHorizontal: 24, paddingVertical: 13, borderRadius: 14, flexDirection: "row", alignItems: "center", gap: 8, shadowColor: "#0078D7", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6 },
  backToListText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  // ── Hero strip ──
  heroStrip: {
    flexDirection: "row", marginHorizontal: 16, marginTop: 18, marginBottom: 6,
    backgroundColor: "#fff", borderRadius: 22,
    shadowColor: "#1B4FBF", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1, shadowRadius: 16, elevation: 6,
    borderWidth: 1, borderColor: "#F0F4F8", overflow: "hidden",
  },
  heroStatItem: { flex: 1, alignItems: "center", paddingVertical: 18, paddingHorizontal: 8 },
  heroStatIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#EBF5FF", justifyContent: "center", alignItems: "center", marginBottom: 8 },
  heroStatValue: { fontSize: 14, fontWeight: "800", color: "#0F172A", letterSpacing: -0.3, textAlign: "center" },
  heroStatLabel: { fontSize: 10, color: "#94A3B8", fontWeight: "600", marginTop: 2, textAlign: "center" },
  heroStatDivider: { width: 1, backgroundColor: "#F1F5F9", marginVertical: 16 },

  // ── Section card ──
  sectionCard: {
    backgroundColor: "#fff", borderRadius: 22, marginHorizontal: 16, marginTop: 12,
    shadowColor: "#1B4FBF", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07, shadowRadius: 14, elevation: 4,
    borderWidth: 1, borderColor: "#F0F4F8", padding: 18, overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginBottom: 14, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: "#F1F5F9",
  },
  sectionIconBg: { width: 32, height: 32, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: "#0F172A", letterSpacing: -0.2 },

  // ── Detail row ──
  detailRow: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 10, gap: 12, borderBottomWidth: 1, borderBottomColor: "#F8FAFC" },
  detailIconWrap: { width: 30, height: 30, borderRadius: 9, backgroundColor: "#EBF5FF", justifyContent: "center", alignItems: "center", marginTop: 2 },
  detailContent: { flex: 1 },
  detailLabel: { fontSize: 11, color: "#94A3B8", fontWeight: "600", marginBottom: 3, letterSpacing: 0.3, textTransform: "uppercase" },
  detailValue: { fontSize: 14, fontWeight: "700", color: "#0F172A" },

  // ── RFQ ID ──
  rfqIdCard: { flexDirection: "row", alignItems: "center", gap: 6, marginHorizontal: 16, marginTop: 12, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: "#F1F5F9", borderRadius: 12 },
  rfqIdText: { fontSize: 11, color: "#94A3B8", fontWeight: "600", fontFamily: "monospace" },

  // ── Action bar ──
  actionBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", paddingHorizontal: 16, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: "#F1F5F9",
    shadowColor: "#1B4FBF", shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 16,
    gap: 8,
  },
  actionBarBtn: { alignItems: "center", gap: 4, minWidth: 52 },
  actionBtnIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  actionBtnLabel: { fontSize: 10, fontWeight: "700", color: "#0078D7" },
  actionBarBtnPrimary: {
    flex: 1, flexDirection: "row", justifyContent: "center", gap: 8,
    backgroundColor: "#0078D7", paddingVertical: 14, borderRadius: 16,
    shadowColor: "#0078D7", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
  },
  actionBarBtnPrimaryText: { color: "#fff", fontSize: 14, fontWeight: "800" },
});

import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Constants from "expo-constants";
import { router } from "expo-router";
import { jwtDecode } from "jwt-decode";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
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
import {
  addFollowToCache,
  fetchFollowedCompanyIds,
  removeFollowFromCache,
} from "../utils/followState";

const { width } = Dimensions.get("window");
const API_URL = Constants.expoConfig?.extra?.API_URL;
const S3_URL = Constants.expoConfig?.extra?.S3_FETCH_URL;
const CLOUDFRONT_URL = Constants.expoConfig?.extra?.CLOUDFRONT_URL;

const getImageUri = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const path = url.startsWith("/") ? url : `/${url}`;
  if (CLOUDFRONT_URL) return `${CLOUDFRONT_URL}${path}`;
  return `${S3_URL}${path}`;
};

interface CompanyInfo {
  company_id: string;
  user_id: string;
  company_name: string;
  company_email: string;
  company_phone: string;
  company_profile_url: string | null;
  company_address: string;
  company_city: string;
  company_state: string;
  is_approved: boolean;
  is_verified: boolean;
  contact_person?: string;
  rating?: number;
}

const SellerDirectoryScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [companies, setCompanies] = useState<CompanyInfo[]>([]);
  const [followedCompanyIds, setFollowedCompanyIds] = useState<Set<string>>(new Set());
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [userId, setUserId] = useState("");
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;
      const decoded: any = jwtDecode(token);
      const currentUserId = decoded.user_id;
      setUserId(currentUserId);
      const storedCompanyId = await AsyncStorage.getItem("companyId");
      setUserCompanyId(storedCompanyId);
      const headers = { Authorization: `Bearer ${token}` };

      let allCompanies: CompanyInfo[] = [];
      try {
        const res = await axios.get(`${API_URL}/company/get/all`, { headers });
        const data = res.data?.data?.companies || res.data?.data || [];
        allCompanies = (Array.isArray(data) ? data : [])
          .filter((c: any) => c.is_approved)
          .map((c: any) => ({
            company_id: String(c.company_id || c.id || ""),
            user_id: String(c.user_id || ""),
            company_name: c.company_name || c.name || "",
            company_email: c.company_email || c.email || "",
            company_phone: c.company_phone || c.phone || "",
            company_profile_url: c.company_profile_url || c.profile_image || null,
            company_address: c.company_address || c.address || "",
            company_city: c.company_city || c.city || "",
            company_state: c.company_state || c.state || "",
            is_approved: true,
            is_verified: c.is_verified || c.is_business_verified || false,
            contact_person: c.contact_person || "",
            rating: c.rating || 0,
          }));
      } catch { allCompanies = []; }

      if (allCompanies.length === 0) {
        try {
          const res = await axios.get(`${API_URL}/business/get/all`, { headers });
          const data = res.data?.data?.businesses || res.data?.businesses || res.data?.data || [];
          allCompanies = (Array.isArray(data) ? data : []).map((b: any) => {
            const biz = b.business_details || b;
            return {
              company_id: String(biz.id || b.id || ""),
              user_id: String(biz.user_id || b.user_id || ""),
              company_name: biz.name || b.name || "",
              company_email: biz.email || b.email || "",
              company_phone: biz.phone || b.phone || "",
              company_profile_url: biz.profile_image || b.profile_image || null,
              company_address: biz.address || b.address || "",
              company_city: biz.city || b.city || "",
              company_state: biz.state || b.state || "",
              is_approved: biz.is_business_approved !== false,
              is_verified: biz.is_business_verified || b.is_business_verified || false,
              contact_person: biz.contact_person || b.contact_person || "",
              rating: biz.rating || b.rating || 0,
            };
          }).filter((c: any) => c.is_approved);
        } catch { }
      }

      setCompanies(allCompanies);
      const ids = await fetchFollowedCompanyIds(currentUserId, token);
      setFollowedCompanyIds(ids);
    } catch { }
    finally { setLoading(false); }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const performFollow = async (companyIdStr: string) => {
    setProcessingId(companyIdStr);
    try {
      const token = await AsyncStorage.getItem("token");
      await axios.post(`${API_URL}/follower/follow`,
        { user_id: userId, business_id: companyIdStr },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFollowedCompanyIds((prev) => { const s = new Set(prev); s.add(companyIdStr); return s; });
      await addFollowToCache(companyIdStr);
    } catch { Alert.alert("Error", "Failed to follow."); }
    finally { setProcessingId(null); }
  };

  const performUnfollow = async (companyIdStr: string) => {
    setProcessingId(companyIdStr);
    try {
      const token = await AsyncStorage.getItem("token");
      await axios.post(`${API_URL}/follower/unfollow`,
        { user_id: userId, business_id: companyIdStr },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFollowedCompanyIds((prev) => { const s = new Set(prev); s.delete(companyIdStr); return s; });
      await removeFollowFromCache(companyIdStr);
    } catch { Alert.alert("Error", "Failed to unfollow."); }
    finally { setProcessingId(null); }
  };

  const handleFollow = (companyId: string) => {
    if (!companyId) { Alert.alert("Error", "Unable to follow this seller."); return; }
    const cid = String(companyId);
    if (followedCompanyIds.has(cid)) {
      const co = companies.find((c) => String(c.company_id) === cid);
      Alert.alert("Unfollow", `Unfollow ${co?.company_name || "this company"}?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Unfollow", style: "destructive", onPress: () => performUnfollow(cid) },
      ]);
    } else {
      performFollow(cid);
    }
  };

  const filteredCompanies = companies.filter((c) => {
    if (c.user_id && String(c.user_id) === String(userId)) return false;
    if (userCompanyId && String(c.company_id) === String(userCompanyId)) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.company_name?.toLowerCase().includes(q) ||
      c.company_city?.toLowerCase().includes(q) ||
      c.company_state?.toLowerCase().includes(q)
    );
  });

  const renderStars = (rating: number) => {
    const full = Math.floor(rating || 0);
    const half = (rating || 0) % 1 >= 0.5;
    const empty = 5 - Math.ceil(rating || 0);
    return (
      <View style={styles.starsRow}>
        {Array.from({ length: full }).map((_, i) => <Ionicons key={`f${i}`} name="star" size={12} color="#FFB800" />)}
        {half && <Ionicons key="h" name="star-half" size={12} color="#FFB800" />}
        {Array.from({ length: empty }).map((_, i) => <Ionicons key={`e${i}`} name="star-outline" size={12} color="#FFB800" />)}
      </View>
    );
  };

  const SellerCard = ({ company, index }: { company: CompanyInfo; index: number }) => {
    const cid = String(company.company_id);
    const isFollowing = followedCompanyIds.has(cid);
    const isProcessing = processingId === cid;
    const imageUri = getImageUri(company.company_profile_url);

    return (
      <View style={styles.card}>
        {/* TOP ROW */}
        <View style={styles.cardTop}>
          <TouchableOpacity onPress={() => router.push({ pathname: "/pages/bussinesProfile" as any, params: { business_id: cid } })}>
            {imageUri
              ? <Image source={{ uri: `${imageUri}?t=${Date.now()}` }} style={styles.avatar} resizeMode="cover" />
              : <View style={[styles.avatar, styles.avatarFill]}><Ionicons name="business" size={26} color="#0078D7" /></View>}
          </TouchableOpacity>

          <View style={styles.infoBlock}>
            <View style={styles.nameRow}>
              <Text style={styles.companyName} numberOfLines={1}>{company.company_name || "Business"}</Text>
              {company.is_verified
                ? <View style={styles.verifiedBadge}><Ionicons name="shield-checkmark" size={11} color="#16A34A" /><Text style={styles.verifiedText}>Verified</Text></View>
                : <View style={styles.unverifiedBadge}><Ionicons name="shield-outline" size={11} color="#DC2626" /><Text style={styles.unverifiedText}>Unverified</Text></View>}
            </View>
            {renderStars(company.rating || 4)}
            {!!company.contact_person && <Text style={styles.contactText} numberOfLines={1}>{company.contact_person}</Text>}
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={11} color="#94A3B8" />
              <Text style={styles.locationText} numberOfLines={1}>{company.company_city}{company.company_state ? `, ${company.company_state}` : ""}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.followBtn, isFollowing && styles.followingBtn, isProcessing && { opacity: 0.6 }]}
            onPress={() => handleFollow(cid)}
            disabled={isProcessing}
          >
            {isProcessing
              ? <ActivityIndicator size="small" color={isFollowing ? "#0078D7" : "#fff"} />
              : <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>{isFollowing ? "Following" : "Follow"}</Text>}
          </TouchableOpacity>
        </View>

        {/* ACTION ROW */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push({ pathname: "/pages/bussinesProfile" as any, params: { business_id: cid } })}>
            <View style={styles.actionIconWrap}><Ionicons name="person-outline" size={18} color="#0078D7" /></View>
            <Text style={styles.actionLabel}>Profile</Text>
          </TouchableOpacity>
          <View style={styles.actionDivider} />
          <TouchableOpacity style={styles.actionBtn} onPress={() => company.company_phone && Linking.openURL(`tel:${company.company_phone}`)}>
            <View style={styles.actionIconWrap}><Ionicons name="call-outline" size={18} color="#0078D7" /></View>
            <Text style={styles.actionLabel}>Call</Text>
          </TouchableOpacity>
          <View style={styles.actionDivider} />
          <TouchableOpacity style={styles.actionBtn} onPress={() => company.company_email && Linking.openURL(`mailto:${company.company_email}`)}>
            <View style={styles.actionIconWrap}><Ionicons name="mail-outline" size={18} color="#0078D7" /></View>
            <Text style={styles.actionLabel}>Email</Text>
          </TouchableOpacity>
          <View style={styles.actionDivider} />
          <TouchableOpacity style={styles.actionBtn} onPress={() => company.company_phone && Linking.openURL(`https://wa.me/${company.company_phone.replace(/[^0-9]/g, "")}`)}>
            <View style={[styles.actionIconWrap, styles.waIconWrap]}><Ionicons name="logo-whatsapp" size={18} color="#25D366" /></View>
            <Text style={[styles.actionLabel, { color: "#25D366" }]}>WhatsApp</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0060B8" />

      {/* ── PREMIUM HEADER ── */}
      <View style={[styles.headerWrapper, { paddingTop: insets.top }]}>
        <View style={styles.orb1} /><View style={styles.orb2} /><View style={styles.orb3} />
        <View style={styles.headerInner}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.eyebrow}>DISCOVER</Text>
            <Text style={styles.headerTitle}>Seller Directory</Text>
          </View>
          <View style={styles.headerBadge}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>{filteredCompanies.length} sellers</Text>
          </View>
        </View>
        <View style={[styles.searchWrap, searchFocused && styles.searchWrapFocused]}>
          <View style={styles.searchIconCircle}><Ionicons name="search-outline" size={14} color="#0078D7" /></View>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, city, state…"
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity style={styles.clearBtn} onPress={() => setSearchQuery("")}><Ionicons name="close" size={15} color="#0078D7" /></TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <View style={styles.loaderCard}><ActivityIndicator size="large" color="#0078D7" /><Text style={styles.loaderText}>Loading sellers…</Text></View>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0078D7"]} tintColor="#0078D7" />}>



          {/* Section header */}
          <View style={styles.sectionRow}>
            <View>
              <Text style={styles.sectionTitle}>{searchQuery ? "Search Results" : "All Sellers"}</Text>
              <Text style={styles.sectionSubtitle}>{filteredCompanies.length} seller{filteredCompanies.length !== 1 ? "s" : ""} found</Text>
            </View>
            {searchQuery ? (
              <TouchableOpacity style={styles.clearChip} onPress={() => setSearchQuery("")}>
                <Text style={styles.clearChipText}>Clear</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {filteredCompanies.length > 0
            ? filteredCompanies.map((c, i) => <SellerCard key={`${c.company_id}-${i}`} company={c} index={i} />)
            : (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconWrap}><Ionicons name="storefront-outline" size={32} color="#0078D7" /></View>
                <Text style={styles.emptyTitle}>{searchQuery ? "No Results Found" : "No Sellers Found"}</Text>
                <Text style={styles.emptySubtitle}>{searchQuery ? `Nothing matches "${searchQuery}"` : "Approved sellers will appear here"}</Text>
                {searchQuery ? (
                  <TouchableOpacity style={styles.outlineBtn} onPress={() => setSearchQuery("")}>
                    <Text style={styles.outlineBtnText}>Clear Search</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            )}
        </ScrollView>
      )}
    </View>
  );
};

export default SellerDirectoryScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F9FC" },
  headerWrapper: { backgroundColor: "#0060B8", paddingHorizontal: 20, paddingBottom: 18, overflow: "hidden", shadowColor: "#003E80", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 24, elevation: 18 },
  orb1: { position: "absolute", width: 280, height: 280, borderRadius: 140, backgroundColor: "rgba(255,255,255,0.06)", top: -100, right: -70 },
  orb2: { position: "absolute", width: 180, height: 180, borderRadius: 90, backgroundColor: "rgba(255,255,255,0.04)", bottom: 10, left: -60 },
  orb3: { position: "absolute", width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(100,180,255,0.08)", top: 20, right: width * 0.35 },
  headerInner: { flexDirection: "row", alignItems: "center", paddingTop: 16, paddingBottom: 16 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.15)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  eyebrow: { fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.65)", letterSpacing: 2, marginBottom: 2 },
  headerTitle: { fontSize: 26, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.5 },
  headerBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#4ADE80" },
  badgeText: { fontSize: 11, fontWeight: "800", color: "#fff" },
  searchWrap: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", paddingHorizontal: 12, height: 46, borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.3)", shadowColor: "#003E80", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 10, elevation: 6 },
  searchWrapFocused: { borderColor: "rgba(255,255,255,0.6)" },
  searchIconCircle: { width: 28, height: 28, borderRadius: 9, backgroundColor: "#EBF5FF", justifyContent: "center", alignItems: "center", marginRight: 8 },
  searchInput: { flex: 1, fontSize: 13, color: "#0F172A", fontWeight: "500" },
  clearBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: "#EBF5FF", justifyContent: "center", alignItems: "center", marginLeft: 6 },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loaderCard: { backgroundColor: "#fff", borderRadius: 20, padding: 32, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 6 },
  loaderText: { marginTop: 12, fontSize: 13, color: "#94A3B8", fontWeight: "500" },
  statsBar: { flexDirection: "row", margin: 16, marginBottom: 0, backgroundColor: "#0078D7", borderRadius: 18, paddingVertical: 18, paddingHorizontal: 10, shadowColor: "#0078D7", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 14, elevation: 8 },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 20, fontWeight: "900", color: "#FFFFFF", letterSpacing: -0.5 },
  statLabel: { fontSize: 11, color: "rgba(255,255,255,0.72)", marginTop: 2, fontWeight: "600" },
  statDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.2)" },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, marginTop: 22, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A", letterSpacing: -0.4 },
  sectionSubtitle: { fontSize: 12, color: "#94A3B8", marginTop: 2, fontWeight: "500" },
  clearChip: { backgroundColor: "#EBF5FF", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  clearChipText: { fontSize: 12, fontWeight: "700", color: "#0078D7" },
  card: { backgroundColor: "#fff", borderRadius: 22, marginHorizontal: 16, marginBottom: 14, shadowColor: "#1B4FBF", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.09, shadowRadius: 16, elevation: 6, borderWidth: 1, borderColor: "#F0F4F8", overflow: "hidden" },
  cardTop: { flexDirection: "row", alignItems: "flex-start", padding: 14, gap: 12 },
  avatar: { width: 60, height: 60, borderRadius: 18, backgroundColor: "#EBF5FF" },
  avatarFill: { justifyContent: "center", alignItems: "center" },
  infoBlock: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  companyName: { fontSize: 15, fontWeight: "800", color: "#0F172A", letterSpacing: -0.2, flex: 1 },
  verifiedBadge: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#DCFCE7", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20 },
  verifiedText: { fontSize: 10, fontWeight: "700", color: "#16A34A" },
  unverifiedBadge: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#FEE2E2", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20 },
  unverifiedText: { fontSize: 10, fontWeight: "700", color: "#DC2626" },
  starsRow: { flexDirection: "row", gap: 1, marginBottom: 4 },
  contactText: { fontSize: 11, color: "#64748B", fontWeight: "500", marginBottom: 3 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  locationText: { fontSize: 12, color: "#94A3B8", fontWeight: "500", flex: 1 },
  followBtn: { backgroundColor: "#0078D7", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, minWidth: 82, alignItems: "center", shadowColor: "#0078D7", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 4 },
  followingBtn: { backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#0078D7", shadowOpacity: 0 },
  followBtnText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  followingBtnText: { color: "#0078D7" },
  actionRow: { flexDirection: "row", alignItems: "center", borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  actionBtn: { flex: 1, alignItems: "center", paddingVertical: 12, gap: 4 },
  actionIconWrap: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#EBF5FF", justifyContent: "center", alignItems: "center" },
  waIconWrap: { backgroundColor: "#F0FDF4" },
  actionLabel: { fontSize: 10, fontWeight: "700", color: "#0078D7" },
  actionDivider: { width: 1, height: 32, backgroundColor: "#F1F5F9" },
  emptyState: { alignItems: "center", paddingVertical: 60, paddingHorizontal: 40 },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#EBF5FF", justifyContent: "center", alignItems: "center", marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A", letterSpacing: -0.3 },
  emptySubtitle: { fontSize: 13, color: "#94A3B8", textAlign: "center", marginTop: 8, lineHeight: 20 },
  outlineBtn: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 11, borderRadius: 12, borderWidth: 1.5, borderColor: "#0078D7" },
  outlineBtnText: { color: "#0078D7", fontSize: 13, fontWeight: "700" },
});

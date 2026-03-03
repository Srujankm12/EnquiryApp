import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Constants from "expo-constants";
import { router } from "expo-router";
import { jwtDecode } from "jwt-decode";
import React, { useCallback, useEffect, useRef, useState } from "react";
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
import { removeFollowFromCache, saveCachedFollowedIds } from "../utils/followState";

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

const extractFollowings = (d: any): any[] => {
  if (!d) return [];
  if (Array.isArray(d?.followings)) return d.followings;
  if (Array.isArray(d?.data?.followings)) return d.data.followings;
  if (Array.isArray(d?.data)) return d.data;
  return [];
};
const extractFollowers = (d: any): any[] => {
  if (!d) return [];
  if (Array.isArray(d?.followers)) return d.followers;
  if (Array.isArray(d?.data?.followers)) return d.data.followers;
  if (Array.isArray(d?.data)) return d.data;
  return [];
};

interface FollowerDetail {
  follower_id: string;
  follower_profile_image: string;
  follower_name: string;
  follower_email: string;
  follower_phone: string;
  created_at: string;
}
interface FollowingDetail {
  following_id: string;
  following_profile_image: string;
  following_name: string;
  following_phone: string;
  following_address: string;
  following_city: string;
  following_state: string;
  following_telegram: string | null;
}
type TabType = "followers" | "following";

const FollowersScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabType>("following");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [followers, setFollowers] = useState<FollowerDetail[]>([]);
  const [followedCompanies, setFollowedCompanies] = useState<FollowingDetail[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isSeller, setIsSeller] = useState(false);
  const userIdRef = useRef<string>("");

  useEffect(() => { loadNetworkData(); }, []);

  const loadNetworkData = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) { setLoading(false); return; }
      const decoded: any = jwtDecode(token);
      const currentUserId = String(decoded.user_id ?? "").trim();
      userIdRef.current = currentUserId;
      const headers = { Authorization: `Bearer ${token}` };
      const storedCompanyId = await AsyncStorage.getItem("companyId");
      const sellerStatus = await AsyncStorage.getItem("sellerStatus");
      const isApproved = sellerStatus?.toLowerCase() === "approved";
      setIsSeller(isApproved);

      try {
        const res = await axios.get(`${API_URL}/follower/get/followings/${currentUserId}`, { headers });
        const companies: FollowingDetail[] = extractFollowings(res.data);
        setFollowedCompanies(companies);
        setFollowingCount(companies.length);
        const ids = new Set<string>(
          companies.map((c) => String(c.following_id).trim()).filter((id) => id && id !== "undefined" && id !== "null")
        );
        await saveCachedFollowedIds(ids);
      } catch { setFollowedCompanies([]); setFollowingCount(0); }

      if (isApproved && storedCompanyId) {
        try {
          const res = await axios.get(`${API_URL}/follower/get/followers/${storedCompanyId}`, { headers });
          setFollowers(extractFollowers(res.data));
        } catch { setFollowers([]); }
        try {
          const res = await axios.get(`${API_URL}/follower/get/followers/count/${storedCompanyId}`, { headers });
          const d = res.data;
          const cnt = d?.followers_count ?? d?.following_count ?? d?.data?.followers_count ?? d?.data?.following_count ?? 0;
          setFollowerCount(typeof cnt === "number" ? cnt : parseInt(cnt, 10) || 0);
        } catch { setFollowerCount(0); }
      }
    } catch { }
    finally { setLoading(false); }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadNetworkData();
    setRefreshing(false);
  }, []);

  const handleUnfollow = (company: FollowingDetail) => {
    Alert.alert("Unfollow", `Unfollow ${company.following_name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Unfollow", style: "destructive",
        onPress: async () => {
          const userId = userIdRef.current;
          if (!userId) return;
          setProcessingId(company.following_id);
          try {
            const token = await AsyncStorage.getItem("token");
            if (!token) throw new Error("No token");
            await axios.post(`${API_URL}/follower/unfollow`,
              { user_id: userId, business_id: company.following_id },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            setFollowedCompanies((prev) => prev.filter((c) => c.following_id !== company.following_id));
            setFollowingCount((prev) => Math.max(0, prev - 1));
            await removeFollowFromCache(company.following_id);
          } catch { Alert.alert("Error", "Failed to unfollow."); }
          finally { setProcessingId(null); }
        },
      },
    ]);
  };

  const q = searchQuery.toLowerCase();
  const filteredFollowing = followedCompanies.filter((c) =>
    !q || c.following_name?.toLowerCase().includes(q) || c.following_city?.toLowerCase().includes(q)
  );
  const filteredFollowers = followers.filter((f) =>
    !q || f.follower_name?.toLowerCase().includes(q) || f.follower_email?.toLowerCase().includes(q)
  );
  const activeList = activeTab === "following" ? filteredFollowing : filteredFollowers;

  const CompanyCard = ({ company }: { company: FollowingDetail }) => {
    const isProcessing = processingId === company.following_id;
    const imageUri = getImageUri(company.following_profile_image);
    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.85}
        onPress={() => router.push({ pathname: "/pages/sellerProfile" as any, params: { business_id: company.following_id } })}>
        <View style={styles.cardContent}>
          {imageUri
            ? <Image source={{ uri: imageUri }} style={styles.avatar} resizeMode="cover" />
            : <View style={[styles.avatar, styles.avatarFill]}><Ionicons name="business" size={22} color="#0078D7" /></View>}
          <View style={styles.cardInfo}>
            <Text style={styles.cardName} numberOfLines={1}>{company.following_name}</Text>
            {company.following_city ? (
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={11} color="#94A3B8" />
                <Text style={styles.infoText} numberOfLines={1}>{company.following_city}{company.following_state ? `, ${company.following_state}` : ""}</Text>
              </View>
            ) : null}
          </View>
          <TouchableOpacity style={[styles.unfollowBtn, isProcessing && { opacity: 0.6 }]}
            onPress={() => handleUnfollow(company)} disabled={isProcessing}>
            {isProcessing ? <ActivityIndicator size="small" color="#64748B" /> : <Text style={styles.unfollowBtnText}>Unfollow</Text>}
          </TouchableOpacity>
        </View>
        <View style={styles.footerRow}>
          <TouchableOpacity style={styles.footerBtn}
            onPress={() => router.push({ pathname: "/pages/sellerProfile" as any, params: { business_id: company.following_id } })}>
            <Ionicons name="storefront-outline" size={14} color="#0078D7" />
            <Text style={styles.footerBtnText}>Profile</Text>
          </TouchableOpacity>
          {company.following_phone ? (
            <>
              <View style={styles.footerDivider} />
              <TouchableOpacity style={styles.footerBtn} onPress={() => Linking.openURL(`tel:${company.following_phone}`)}>
                <Ionicons name="call-outline" size={14} color="#0078D7" />
                <Text style={styles.footerBtnText}>Call</Text>
              </TouchableOpacity>
              <View style={styles.footerDivider} />
              <TouchableOpacity style={styles.footerBtn}
                onPress={() => Linking.openURL(`https://wa.me/${company.following_phone.replace(/[^0-9]/g, "")}`)}>
                <Ionicons name="logo-whatsapp" size={14} color="#25D366" />
                <Text style={[styles.footerBtnText, { color: "#25D366" }]}>WhatsApp</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  const FollowerCard = ({ follower }: { follower: FollowerDetail }) => {
    const imageUri = getImageUri(follower.follower_profile_image);
    return (
      <View style={styles.card}>
        <View style={styles.cardContent}>
          {imageUri
            ? <Image source={{ uri: imageUri }} style={styles.avatar} resizeMode="cover" />
            : <View style={[styles.avatar, styles.avatarFill]}><Ionicons name="person" size={22} color="#0078D7" /></View>}
          <View style={styles.cardInfo}>
            <Text style={styles.cardName} numberOfLines={1}>{follower.follower_name}</Text>
            {follower.follower_email ? (
              <View style={styles.infoRow}><Ionicons name="mail-outline" size={11} color="#94A3B8" /><Text style={styles.infoText} numberOfLines={1}>{follower.follower_email}</Text></View>
            ) : null}
            {follower.follower_phone ? (
              <View style={styles.infoRow}><Ionicons name="call-outline" size={11} color="#94A3B8" /><Text style={styles.infoText}>{follower.follower_phone}</Text></View>
            ) : null}
          </View>
          <View style={styles.followerBadge}>
            <Text style={styles.followerBadgeText}>Follower</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0060B8" />
      <View style={[styles.headerWrapper, { paddingTop: insets.top }]}>
        <View style={styles.orb1} /><View style={styles.orb2} /><View style={styles.orb3} />
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.eyebrow}>NETWORK</Text>
            <Text style={styles.headerTitle}>My Network</Text>
          </View>
        </View>
        <View style={styles.tabRow}>
          <TouchableOpacity style={[styles.tabPill, activeTab === "following" && styles.tabPillActive]} onPress={() => setActiveTab("following")}>
            <Text style={[styles.tabPillText, activeTab === "following" && styles.tabPillTextActive]}>Following · {followingCount}</Text>
          </TouchableOpacity>
          {isSeller && (
            <TouchableOpacity style={[styles.tabPill, activeTab === "followers" && styles.tabPillActive]} onPress={() => setActiveTab("followers")}>
              <Text style={[styles.tabPillText, activeTab === "followers" && styles.tabPillTextActive]}>Followers · {followerCount}</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={[styles.searchWrap, searchFocused && styles.searchWrapFocused]}>
          <View style={styles.searchIconCircle}><Ionicons name="search-outline" size={14} color="#0078D7" /></View>
          <TextInput style={styles.searchInput} placeholder={activeTab === "following" ? "Search companies…" : "Search followers…"}
            placeholderTextColor="#94A3B8" value={searchQuery} onChangeText={setSearchQuery}
            onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)} />
          {searchQuery.length > 0 && (
            <TouchableOpacity style={styles.clearBtn} onPress={() => setSearchQuery("")}><Ionicons name="close" size={15} color="#0078D7" /></TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <View style={styles.loaderCard}><ActivityIndicator size="large" color="#0078D7" /><Text style={styles.loaderText}>Loading your network…</Text></View>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0078D7"]} tintColor="#0078D7" />}>
          {/* <View style={styles.statsBar}>
            <View style={styles.statItem}><Text style={styles.statValue}>{followingCount}</Text><Text style={styles.statLabel}>Following</Text></View>
            <View style={styles.statDivider} />
            {isSeller && (<><View style={styles.statItem}><Text style={styles.statValue}>{followerCount}</Text><Text style={styles.statLabel}>Followers</Text></View><View style={styles.statDivider} /></>)}
          </View> */}
          <View style={styles.sectionRow}>
            <View>
              <Text style={styles.sectionTitle}>{activeTab === "following" ? "Companies You Follow" : "Your Followers"}</Text>
              <Text style={styles.sectionSubtitle}>{activeList.length} {activeTab === "following" ? "companies" : "followers"}</Text>
            </View>
          </View>
          {activeList.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}><Ionicons name="people-outline" size={32} color="#0078D7" /></View>
              <Text style={styles.emptyTitle}>{searchQuery ? "No Results Found" : activeTab === "following" ? "Not Following Anyone" : "No Followers Yet"}</Text>
              <Text style={styles.emptySubtitle}>{searchQuery ? `Nothing matches "${searchQuery}"` : activeTab === "following" ? "Follow companies to see them here" : "People who follow your business will appear here"}</Text>
              {!searchQuery && activeTab === "following" && (
                <TouchableOpacity style={styles.actionBtn} onPress={() => router.push("/screens/SellerDirectoryScreen" as any)}>
                  <Ionicons name="storefront-outline" size={16} color="#fff" />
                  <Text style={styles.actionBtnText}>Browse Sellers</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : activeTab === "following"
            ? filteredFollowing.map((c) => <CompanyCard key={c.following_id} company={c} />)
            : filteredFollowers.map((f) => <FollowerCard key={f.follower_id} follower={f} />)}
        </ScrollView>
      )}
    </View>
  );
};

export default FollowersScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F9FC" },
  headerWrapper: { backgroundColor: "#0060B8", paddingHorizontal: 20, paddingBottom: 18, overflow: "hidden", shadowColor: "#003E80", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 24, elevation: 18 },
  orb1: { position: "absolute", width: 280, height: 280, borderRadius: 140, backgroundColor: "rgba(255,255,255,0.06)", top: -100, right: -70 },
  orb2: { position: "absolute", width: 180, height: 180, borderRadius: 90, backgroundColor: "rgba(255,255,255,0.04)", bottom: 10, left: -60 },
  orb3: { position: "absolute", width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(100,180,255,0.08)", top: 20, right: width * 0.35 },
  headerTop: { flexDirection: "row", alignItems: "center", paddingTop: 16, paddingBottom: 14 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.15)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  eyebrow: { fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.65)", letterSpacing: 2, marginBottom: 2 },
  headerTitle: { fontSize: 26, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.5 },
  tabRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  tabPill: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.15)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  tabPillActive: { backgroundColor: "#FFFFFF" },
  tabPillText: { fontSize: 13, fontWeight: "700", color: "rgba(255,255,255,0.85)" },
  tabPillTextActive: { color: "#0060B8" },
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
  card: { backgroundColor: "#fff", borderRadius: 22, marginHorizontal: 16, marginBottom: 14, shadowColor: "#1B4FBF", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.09, shadowRadius: 16, elevation: 6, borderWidth: 1, borderColor: "#F0F4F8", overflow: "hidden" },
  cardContent: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  avatar: { width: 54, height: 54, borderRadius: 16, backgroundColor: "#EBF5FF" },
  avatarFill: { justifyContent: "center", alignItems: "center" },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: "800", color: "#0F172A", letterSpacing: -0.2, marginBottom: 4 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 2 },
  infoText: { fontSize: 12, color: "#94A3B8", fontWeight: "500", flex: 1 },
  unfollowBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1.5, borderColor: "#E2E8F0", backgroundColor: "#fff", minWidth: 76, alignItems: "center" },
  unfollowBtnText: { fontSize: 12, fontWeight: "700", color: "#64748B" },
  followerBadge: { backgroundColor: "#EBF5FF", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  followerBadgeText: { fontSize: 11, fontWeight: "700", color: "#0078D7" },
  footerRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  footerBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12 },
  footerBtnText: { fontSize: 12, fontWeight: "700", color: "#0078D7" },
  footerDivider: { width: 1, backgroundColor: "#F1F5F9", marginVertical: 8 },
  emptyState: { alignItems: "center", paddingVertical: 60, paddingHorizontal: 40 },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#EBF5FF", justifyContent: "center", alignItems: "center", marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A", letterSpacing: -0.3 },
  emptySubtitle: { fontSize: 13, color: "#94A3B8", textAlign: "center", marginTop: 8, lineHeight: 20 },
  actionBtn: { marginTop: 24, backgroundColor: "#0078D7", paddingHorizontal: 24, paddingVertical: 13, borderRadius: 14, flexDirection: "row", alignItems: "center", gap: 8, shadowColor: "#0078D7", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6 },
  actionBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
});
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Constants from "expo-constants";
import { router, useFocusEffect } from "expo-router";
import { jwtDecode } from "jwt-decode";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BecomeSellerToaster from "../../components/BecomeSellerToaster";

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

const BANNERS = [
  { id: "1", image: require("../../assets/banners/banner1.png") },
  { id: "2", image: require("../../assets/banners/banner2.png") },
];

const QUICK_ACTIONS = [
  {
    id: "1",
    icon: "newspaper-outline" as const,
    label: "RFQ",
    route: "/pages/requestQutation",
  },
  {
    id: "2",
    icon: "search-outline" as const,
    label: "Leads",
    route: "/pages/bussinesLeads",
  },
  {
    id: "3",
    icon: "git-network-outline" as const,
    label: "Network",
    route: "/pages/followers",
  },
  {
    id: "4",
    icon: "people-outline" as const,
    label: "Sellers",
    route: "/pages/sellerDirectory",
  },
];

const HomeScreen = () => {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userDetails, setUserDetails] = useState<any>(null);
  const [jwtUserName, setJwtUserName] = useState<string>("");
  const [categories, setCategories] = useState<any[]>([]);

  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [followerProducts, setFollowerProducts] = useState<any[]>([]);

  const [showToaster, setShowToaster] = useState(true);
  const [toasterKey, setToasterKey] = useState(0);
  const [sellerStatus, setSellerStatus] = useState<string | null>(null);
  const [activeBanner, setActiveBanner] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  useEffect(() => {
    loadData();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  useFocusEffect(
    useCallback(() => {
      setShowToaster(true);
      setToasterKey((p) => p + 1);
      checkSellerStatus();
      refreshProducts();
    }, []),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchAllProducts(),
      fetchFollowerProducts(),
      fetchCategories(),
      checkSellerStatus(),
    ]);
    setRefreshing(false);
  }, []);

  const refreshProducts = async () => {
    await Promise.all([fetchAllProducts(), fetchFollowerProducts()]);
  };

  const checkSellerStatus = async () => {
    try {
      const s = await AsyncStorage.getItem("sellerStatus");
      const n = s?.toLowerCase()?.trim() || null;
      if (n === "approved" || n === "accepted" || n === "active") {
        setSellerStatus("approved");
        return;
      }
      setSellerStatus(n);
      const token = await AsyncStorage.getItem("token");
      if (token) {
        const dec: any = jwtDecode(token);
        const bId = dec.business_id;
        if (bId) {
          await AsyncStorage.setItem("companyId", bId);
          try {
            const r = await fetch(`${API_URL}/business/status/${bId}`, {
              headers: { "Content-Type": "application/json" },
            });
            if (r.ok) {
              const d = await r.json();
              if (d?.is_approved === true || d?.is_business_approved === true) {
                await AsyncStorage.setItem("sellerStatus", "approved");
                setSellerStatus("approved");
              }
            }
          } catch {}
        }
      }
    } catch {}
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      getProfile(),
      fetchCategories(),
      fetchAllProducts(),
      fetchFollowerProducts(),
    ]);
    setLoading(false);
  };

  const getProfile = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;
      const dec: any = jwtDecode(token);
      if (dec.user_name) setJwtUserName(dec.user_name);
      setCurrentUserId(dec.user_id || "");
      try {
        const res = await axios.get(`${API_URL}/user/get/user/${dec.user_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUserDetails(res.data?.user || res.data);
      } catch {}
    } catch {}
  };

  const fetchCategories = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await axios.get(`${API_URL}/category/get/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCategories(res.data?.categories || []);
    } catch {}
  };

  const fetchAllProducts = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;
      const res = await axios.get(`${API_URL}/product/get/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const raw: any[] = res.data?.products || [];
      const activeOnly = raw.filter((p) => p.is_product_active !== false);
      setAllProducts(activeOnly.slice(0, 10));
    } catch {
      setAllProducts([]);
    }
  };

  const fetchFollowerProducts = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;
      const dec: any = jwtDecode(token);
      const res = await axios.get(
        `${API_URL}/product/get/followers/${dec.user_id}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const raw: any[] = res.data?.products || [];
      const activeOnly = raw.filter((p) => p.is_product_active !== false);
      setFollowerProducts(activeOnly.slice(0, 10));
    } catch {
      setFollowerProducts([]);
    }
  };

  const getProductImage = (product: any): string | null => {
    if (product.product_images?.length > 0)
      return getImageUri(product.product_images[0].image);
    return null;
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#0078D7" />
        <Text style={styles.loaderText}>Loading...</Text>
      </View>
    );
  }

  const displayName =
    jwtUserName ||
    (userDetails?.first_name
      ? `${userDetails.first_name}${userDetails.last_name ? " " + userDetails.last_name : ""}`
      : "Welcome");

  const hasAnyProducts = allProducts.length > 0 || followerProducts.length > 0;

  // ── Premium Product Card ──
  const PremiumProductCard = ({
    item,
    onPress,
  }: {
    item: any;
    onPress: () => void;
  }) => {
    const img = getProductImage(item);
    return (
      <TouchableOpacity style={styles.premiumCard} activeOpacity={0.92} onPress={onPress}>
        {/* Image */}
        <View style={styles.premiumImgWrap}>
          {img ? (
            <Image source={{ uri: img }} style={styles.premiumImg} resizeMode="cover" />
          ) : (
            <View style={styles.premiumImgPlaceholder}>
              <Ionicons name="cube-outline" size={34} color="#C8D8E8" />
            </View>
          )}
          {/* Active badge */}
          <View style={styles.premiumBadge}>
            <View style={styles.premiumBadgeDot} />
            <Text style={styles.premiumBadgeText}>Active</Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.premiumContent}>
          <Text style={styles.premiumName} numberOfLines={2}>
            {item.name}
          </Text>

          {item.business_name ? (
            <View style={styles.premiumBizRow}>
              <Ionicons name="storefront-outline" size={10} color="#94A3B8" />
              <Text style={styles.premiumBizName} numberOfLines={1}>
                {item.business_name}
              </Text>
            </View>
          ) : (
            <View style={{ height: 2 }} />
          )}

          {item.product_description ? (
            <Text style={styles.premiumDesc} numberOfLines={2}>
              {item.product_description}
            </Text>
          ) : item.category_name ? (
            <View style={styles.premiumCategoryChip}>
              <Ionicons name="pricetag-outline" size={9} color="#0078D7" />
              <Text style={styles.premiumCategoryText} numberOfLines={1}>
                {item.category_name}
              </Text>
            </View>
          ) : null}

          <View style={styles.premiumDivider} />

          <View style={styles.premiumFooter}>
            <View>
              <Text style={styles.premiumPriceLabel}>PRICE</Text>
              <Text style={styles.premiumPrice}>
                ₹{item.price}
                <Text style={styles.premiumUnit}>/{item.unit}</Text>
              </Text>
            </View>
            <View style={styles.premiumEnquireBtn}>
              <Ionicons name="arrow-forward" size={14} color="#fff" />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E90FF" />

      {sellerStatus !== "approved" &&
        sellerStatus !== "accepted" &&
        sellerStatus !== "active" && (
          <BecomeSellerToaster
            key={toasterKey}
            visible={showToaster}
            onClose={() => setShowToaster(false)}
          />
        )}

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: 14 + insets.top }]}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.headerGreeting}>Hello 👋</Text>
            <Text style={styles.headerName} numberOfLines={1}>
              {displayName}
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIconBtn}>
            <Ionicons name="notifications-outline" size={21} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn}>
            <Ionicons name="chatbox-outline" size={21} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <Animated.ScrollView
        style={{ opacity: fadeAnim }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 + insets.bottom }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#0078D7"]}
            tintColor="#0078D7"
            title="Refreshing..."
            titleColor="#0078D7"
          />
        }
      >
        {/* ── Search ── */}
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={17} color="#BDBDBD" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products, categories..."
            placeholderTextColor="#BDBDBD"
          />
        </View>

        {/* ── Banners ── */}
        <FlatList
          data={BANNERS}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          snapToInterval={width - 32}
          decelerationRate="fast"
          contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
          onMomentumScrollEnd={(e) =>
            setActiveBanner(
              Math.round(e.nativeEvent.contentOffset.x / (width - 32)),
            )
          }
          renderItem={({ item }) => (
            <View style={styles.bannerCard}>
              <Image source={item.image} style={styles.bannerImg} resizeMode="cover" />
            </View>
          )}
          keyExtractor={(i) => i.id}
        />
        <View style={styles.dotsRow}>
          {BANNERS.map((_, i) => (
            <View key={i} style={[styles.dot, i === activeBanner && styles.dotActive]} />
          ))}
        </View>

        {/* ── Quick Actions ── */}
        <View style={styles.quickCard}>
          {QUICK_ACTIONS.map((a) => (
            <TouchableOpacity
              key={a.id}
              style={styles.quickItem}
              activeOpacity={0.7}
              onPress={() => router.push(a.route as any)}
            >
              <View style={styles.quickIconWrap}>
                <Ionicons name={a.icon} size={24} color="#0078D7" />
              </View>
              <Text style={styles.quickLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Categories ── */}
        {categories.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Categories</Text>
              <TouchableOpacity
                style={styles.viewAllBtn}
                onPress={() => router.push("/(tabs)/catgories" as any)}
              >
                <Text style={styles.seeAll}>View All</Text>
                <Ionicons name="chevron-forward" size={13} color="#0078D7" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={categories}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.catCard}
                  activeOpacity={0.8}
                  onPress={() =>
                    router.push({
                      pathname: "/pages/specificCategory",
                      params: { id: item.id, name: item.name },
                    })
                  }
                >
                  {item.category_image ? (
                    <Image
                      source={{ uri: getImageUri(item.category_image)! }}
                      style={styles.catImg}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.catImg, styles.catImgPlaceholder]}>
                      <Ionicons name="leaf-outline" size={22} color="#0078D7" />
                    </View>
                  )}
                  <View style={styles.catLabelWrap}>
                    <Text style={styles.catLabel} numberOfLines={1}>
                      {item.name}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              keyExtractor={(i) => i.id}
            />
          </View>
        )}

        {/* ── SECTION 1: All Products ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>All Products</Text>
              <Text style={styles.sectionSubtitle}>Discover what's available</Text>
            </View>
            <TouchableOpacity
              style={styles.viewAllBtn}
              onPress={() => router.push("/(tabs)/listing" as any)}
            >
              <Text style={styles.seeAll}>View All</Text>
              <Ionicons name="chevron-forward" size={13} color="#0078D7" />
            </TouchableOpacity>
          </View>
          {allProducts.length > 0 ? (
            <FlatList
              data={allProducts}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hList}
              renderItem={({ item }) => (
                <PremiumProductCard
                  item={item}
                  onPress={() =>
                    router.push({
                      pathname: "/pages/productDetail" as any,
                      params: { product_id: item.id },
                    })
                  }
                />
              )}
              keyExtractor={(i) => i.id}
            />
          ) : (
            <View style={styles.emptySection}>
              <Ionicons name="cube-outline" size={32} color="#E0E0E0" />
              <Text style={styles.emptySectionText}>No products available</Text>
            </View>
          )}
        </View>

        {/* ── SECTION 2: From Sellers You Follow ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>From Sellers You Follow</Text>
              <Text style={styles.sectionSubtitle}>Curated for you</Text>
            </View>
            <TouchableOpacity
              style={styles.viewAllBtn}
              onPress={() => router.push("/(tabs)/listing" as any)}
            >
              <Text style={styles.seeAll}>View All</Text>
              <Ionicons name="chevron-forward" size={13} color="#0078D7" />
            </TouchableOpacity>
          </View>
          {followerProducts.length > 0 ? (
            <FlatList
              data={followerProducts}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hList}
              renderItem={({ item }) => (
                <PremiumProductCard
                  item={item}
                  onPress={() =>
                    router.push({
                      pathname: "/pages/productDetail" as any,
                      params: { product_id: item.id },
                    })
                  }
                />
              )}
              keyExtractor={(i, idx) => `${i.id}-${idx}`}
            />
          ) : (
            <View style={styles.emptySection}>
              <Ionicons name="people-outline" size={32} color="#E0E0E0" />
              <Text style={styles.emptySectionText}>
                Follow sellers to see their products here
              </Text>
              <TouchableOpacity
                style={styles.followSellersBtn}
                onPress={() => router.push("/pages/sellerDirectory" as any)}
              >
                <Text style={styles.followSellersBtnText}>Browse Sellers</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── Global empty ── */}
        {!hasAnyProducts && !refreshing && (
          <View style={styles.emptyWrap}>
            <Ionicons name="cube-outline" size={44} color="#E0E0E0" />
            <Text style={styles.emptyTitle}>No active products yet</Text>
            <Text style={styles.emptySub}>Pull down to refresh</Text>
          </View>
        )}
      </Animated.ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F4F8" },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F0F4F8",
  },
  loaderText: { marginTop: 10, fontSize: 14, color: "#999" },

  /* Header */
  header: {
    backgroundColor: "#1E90FF",
    paddingHorizontal: 16,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.22)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  headerGreeting: {
    fontSize: 10,
    color: "rgba(255,255,255,0.75)",
    marginBottom: 1,
  },
  headerName: { fontSize: 14, fontWeight: "700", color: "#fff", maxWidth: 180 },
  headerRight: { flexDirection: "row", gap: 6 },
  headerIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },

  /* Search */
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 13, color: "#333" },

  /* Banner */
  bannerCard: {
    width: width - 32,
    height: 155,
    borderRadius: 16,
    overflow: "hidden",
    marginRight: 12,
  },
  bannerImg: { width: "100%", height: "100%" },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 5,
    marginTop: 8,
    marginBottom: 2,
  },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#C0DCFF" },
  dotActive: { width: 16, backgroundColor: "#0078D7" },

  /* Quick Actions */
  quickCard: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  quickItem: { alignItems: "center", gap: 6 },
  quickIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#EBF5FF",
    justifyContent: "center",
    alignItems: "center",
  },
  quickLabel: { fontSize: 11, fontWeight: "600", color: "#333" },

  /* Section */
  section: { marginTop: 22 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 1,
    fontWeight: "500",
  },
  viewAllBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
  seeAll: { fontSize: 13, fontWeight: "600", color: "#0078D7" },
  hList: { paddingHorizontal: 16, paddingBottom: 6 },

  /* Category Cards */
  catCard: {
    width: 115,
    height: 115,
    borderRadius: 14,
    marginRight: 10,
    overflow: "hidden",
    backgroundColor: "#EBF5FF",
  },
  catImg: { width: "100%", height: "100%" },
  catImgPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#EBF5FF",
  },
  catLabelWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingVertical: 5,
  },
  catLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
  },

  /* ── PREMIUM Product Card ── */
  premiumCard: {
    width: 235,
    backgroundColor: "#fff",
    borderRadius: 20,
    marginRight: 14,
    overflow: "hidden",
    shadowColor: "#1B4FBF",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 7,
    borderWidth: 1,
    borderColor: "rgba(0,120,215,0.08)",
  },
  premiumImgWrap: {
    width: "100%",
    height: 118,
    backgroundColor: "#EEF4FB",
    position: "relative",
  },
  premiumImg: { width: "100%", height: "100%" },
  premiumImgPlaceholder: {
    width: "100%",
    height: 118,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F1F7FD",
  },
  premiumBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  premiumBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#16A34A",
  },
  premiumBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#16A34A",
    letterSpacing: 0.4,
  },
  premiumContent: {
    padding: 10,
    paddingTop: 9,
  },
  premiumName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    lineHeight: 18,
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  premiumBizRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 5,
  },
  premiumBizName: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "500",
    flex: 1,
  },
  premiumDesc: {
    fontSize: 11,
    color: "#64748B",
    lineHeight: 16,
    marginBottom: 6,
    fontWeight: "400",
  },
  premiumCategoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EBF5FF",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 6,
  },
  premiumCategoryText: {
    fontSize: 10,
    color: "#0078D7",
    fontWeight: "600",
  },
  premiumDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginBottom: 8,
  },
  premiumFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  premiumPriceLabel: {
    fontSize: 9,
    color: "#94A3B8",
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  premiumPrice: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0078D7",
    letterSpacing: -0.4,
  },
  premiumUnit: {
    fontSize: 11,
    fontWeight: "500",
    color: "#94A3B8",
  },
  premiumEnquireBtn: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "#0078D7",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0078D7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },

  /* Empty section */
  emptySection: {
    alignItems: "center",
    paddingVertical: 28,
    marginHorizontal: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E8F0F8",
    borderStyle: "dashed",
  },
  emptySectionText: {
    fontSize: 13,
    color: "#BDBDBD",
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 16,
  },
  followSellersBtn: {
    marginTop: 12,
    backgroundColor: "#0078D7",
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 10,
  },
  followSellersBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  /* Global empty */
  emptyWrap: { alignItems: "center", paddingVertical: 40 },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#BDBDBD",
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: "#DEDEDE",
    marginTop: 4,
    textAlign: "center",
    paddingHorizontal: 32,
  },
});

export default HomeScreen;
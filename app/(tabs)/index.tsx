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
    color: "#0078D7",
    bg: "#EBF5FF",
  },
  {
    id: "2",
    icon: "search-outline" as const,
    label: "Leads",
    route: "/pages/bussinesLeads",
    color: "#7C3AED",
    bg: "#F3EEFF",
  },
  {
    id: "3",
    icon: "git-network-outline" as const,
    label: "Network",
    route: "/pages/followers",
    color: "#059669",
    bg: "#ECFDF5",
  },
  {
    id: "4",
    icon: "people-outline" as const,
    label: "Sellers",
    route: "/pages/sellerDirectory",
    color: "#D97706",
    bg: "#FFFBEB",
  },
];

const HomeScreen = () => {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.97)).current;

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
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 9,
        useNativeDriver: true,
      }),
    ]).start();
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
      setAllProducts(
        raw.filter((p) => p.is_product_active !== false).slice(0, 10),
      );
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
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const raw: any[] = res.data?.products || [];
      setFollowerProducts(
        raw.filter((p) => p.is_product_active !== false).slice(0, 10),
      );
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
        <View style={styles.loaderCard}>
          <ActivityIndicator size="large" color="#0078D7" />
          <Text style={styles.loaderText}>Loading...</Text>
        </View>
      </View>
    );
  }

  const displayName =
    jwtUserName ||
    (userDetails?.first_name
      ? `${userDetails.first_name}${userDetails.last_name ? " " + userDetails.last_name : ""}`
      : "Welcome");

  const hasAnyProducts = allProducts.length > 0 || followerProducts.length > 0;

  const ProductCard = ({
    item,
    onPress,
  }: {
    item: any;
    onPress: () => void;
  }) => {
    const img = getProductImage(item);
    return (
      <TouchableOpacity
        style={styles.productCard}
        activeOpacity={0.93}
        onPress={onPress}
      >
        <View style={styles.productImgWrap}>
          {img ? (
            <Image
              source={{ uri: img }}
              style={styles.productImg}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.productImgPlaceholder}>
              <Ionicons name="cube-outline" size={36} color="#D1D9E2" />
            </View>
          )}
          <View style={styles.activePill}>
            <View style={styles.activeDot} />
            <Text style={styles.activeText}>Active</Text>
          </View>
          {item.category_name && (
            <View style={styles.categoryPillImg}>
              <Text style={styles.categoryPillImgText} numberOfLines={1}>
                {item.category_name}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.productBody}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.name}
          </Text>
          {item.business_name && (
            <View style={styles.bizRow}>
              <Ionicons name="storefront-outline" size={10} color="#A0AEC0" />
              <Text style={styles.bizName} numberOfLines={1}>
                {item.business_name}
              </Text>
            </View>
          )}
          {item.product_description ? (
            <Text style={styles.productDesc} numberOfLines={2}>
              {item.product_description}
            </Text>
          ) : (
            <View style={{ height: 4 }} />
          )}
          <View style={styles.separator} />
          <View style={styles.priceRow}>
            <View>
              <Text style={styles.priceLabel}>PRICE</Text>
              <View style={styles.priceValueRow}>
                <Text style={styles.priceCurrency}>₹</Text>
                <Text style={styles.priceValue}>{item.price}</Text>
                <Text style={styles.priceUnit}>/{item.unit}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.enquireBtn}
              onPress={onPress}
              activeOpacity={0.85}
            >
              <Text style={styles.enquireBtnText}>Enquire</Text>
              <Ionicons name="arrow-forward" size={11} color="#0078D7" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0078D7" />

      {sellerStatus !== "approved" &&
        sellerStatus !== "accepted" &&
        sellerStatus !== "active" && (
          <BecomeSellerToaster
            key={toasterKey}
            visible={showToaster}
            onClose={() => setShowToaster(false)}
          />
        )}

      {/* ── ULTRA PREMIUM HEADER ── */}
      <View style={[styles.headerWrapper, { paddingTop: insets.top }]}>
        {/* Layered decorative orbs */}
        <View style={styles.headerOrb1} />
        <View style={styles.headerOrb2} />
        <View style={styles.headerOrb3} />

        {/* Top Row */}
        <View style={styles.headerInner}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarWrapper}>
              <View style={styles.avatarRing}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>
                    {displayName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              </View>
              <View style={styles.avatarOnlineDot} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.greetingRow}>
                <Text style={styles.headerGreeting}>Good morning </Text>
                <Text style={styles.greetingEmoji}>☀️</Text>
              </View>
              <Text style={styles.headerName} numberOfLines={1}>
                {displayName}
              </Text>
              <View style={styles.headerBadge}>
                <View style={styles.headerBadgeDot} />
                <Text style={styles.headerBadgeText}>Active Trader</Text>
              </View>
            </View>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerIconBtn} activeOpacity={0.75}>
              <Ionicons
                name="notifications-outline"
                size={19}
                color="#FFFFFF"
              />
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>3</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerIconBtn} activeOpacity={0.75}>
              <Ionicons
                name="chatbox-ellipses-outline"
                size={19}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.headerSearchWrap}>
          <View style={styles.searchIconCircle}>
            <Ionicons name="search-outline" size={14} color="#0078D7" />
          </View>
          <TextInput
            style={styles.headerSearchInput}
            placeholder="Search products, sellers, categories..."
            placeholderTextColor="#94A3B8"
          />
          <TouchableOpacity style={styles.searchFilterBtn} activeOpacity={0.8}>
            <Ionicons name="options-outline" size={15} color="#0078D7" />
          </TouchableOpacity>
        </View>

        {/* Bottom curved mask */}
      </View>

      <Animated.ScrollView
        style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 + insets.bottom }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#0078D7"]}
            tintColor="#0078D7"
          />
        }
      >
        {/* Banners */}
        <FlatList
          data={BANNERS}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          snapToInterval={width - 32}
          decelerationRate="fast"
          style={{ marginTop: 16 }}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
          onMomentumScrollEnd={(e) =>
            setActiveBanner(
              Math.round(e.nativeEvent.contentOffset.x / (width - 32)),
            )
          }
          renderItem={({ item }) => (
            <View style={styles.bannerCard}>
              <Image
                source={item.image}
                style={styles.bannerImg}
                resizeMode="cover"
              />
              <View style={styles.bannerShine} />
            </View>
          )}
          keyExtractor={(i) => i.id}
        />
        <View style={styles.dotsRow}>
          {BANNERS.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === activeBanner && styles.dotActive]}
            />
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickSection}>
          <Text style={styles.quickTitle}>Quick Actions</Text>
          <View style={styles.quickGrid}>
            {QUICK_ACTIONS.map((a) => (
              <TouchableOpacity
                key={a.id}
                style={styles.quickItem}
                activeOpacity={0.8}
                onPress={() => router.push(a.route as any)}
              >
                <View style={[styles.quickIconWrap, { backgroundColor: a.bg }]}>
                  <Ionicons name={a.icon} size={22} color={a.color} />
                </View>
                <Text style={styles.quickLabel}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Categories */}
        {categories.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Categories</Text>
                <Text style={styles.sectionSubtitle}>Browse by type</Text>
              </View>
              <TouchableOpacity
                style={styles.viewAllChip}
                onPress={() => router.push("/(tabs)/catgories" as any)}
              >
                <Text style={styles.viewAllChipText}>View All</Text>
                <Ionicons name="chevron-forward" size={11} color="#0078D7" />
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
                  activeOpacity={0.85}
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
                      <Ionicons name="leaf-outline" size={24} color="#0078D7" />
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

        {/* Stats Bar */}
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{allProducts.length}+</Text>
            <Text style={styles.statLabel}>Products</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{categories.length}+</Text>
            <Text style={styles.statLabel}>Categories</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{followerProducts.length}+</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
        </View>

        {/* All Products */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>All Products</Text>
              <Text style={styles.sectionSubtitle}>
                Discover what's available
              </Text>
            </View>
            <TouchableOpacity
              style={styles.viewAllChip}
              onPress={() => router.push("/(tabs)/listing" as any)}
            >
              <Text style={styles.viewAllChipText}>View All</Text>
              <Ionicons name="chevron-forward" size={11} color="#0078D7" />
            </TouchableOpacity>
          </View>
          {allProducts.length > 0 ? (
            <FlatList
              data={allProducts}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hList}
              renderItem={({ item }) => (
                <ProductCard
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
              <View style={styles.emptyIconWrap}>
                <Ionicons name="cube-outline" size={28} color="#CBD5E1" />
              </View>
              <Text style={styles.emptyTitle}>No products available</Text>
              <Text style={styles.emptySubtitle}>Check back soon</Text>
            </View>
          )}
        </View>

        {/* From Sellers You Follow */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>From Sellers You Follow</Text>
              <Text style={styles.sectionSubtitle}>Curated for you</Text>
            </View>
            <TouchableOpacity
              style={styles.viewAllChip}
              onPress={() => router.push("/(tabs)/listing" as any)}
            >
              <Text style={styles.viewAllChipText}>View All</Text>
              <Ionicons name="chevron-forward" size={11} color="#0078D7" />
            </TouchableOpacity>
          </View>
          {followerProducts.length > 0 ? (
            <FlatList
              data={followerProducts}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hList}
              renderItem={({ item }) => (
                <ProductCard
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
              <View style={styles.emptyIconWrap}>
                <Ionicons name="people-outline" size={28} color="#CBD5E1" />
              </View>
              <Text style={styles.emptyTitle}>No curated products yet</Text>
              <Text style={styles.emptySubtitle}>
                Follow sellers to see their listings
              </Text>
              <TouchableOpacity
                style={styles.browseSellersBtn}
                onPress={() => router.push("/pages/sellerDirectory" as any)}
              >
                <Text style={styles.browseSellersBtnText}>Browse Sellers</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {!hasAnyProducts && !refreshing && (
          <View style={styles.emptyWrap}>
            <Ionicons name="cube-outline" size={40} color="#E2E8F0" />
            <Text style={styles.emptyWrapTitle}>No active products yet</Text>
            <Text style={styles.emptyWrapSub}>Pull down to refresh</Text>
          </View>
        )}
      </Animated.ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F9FC" },

  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F7F9FC",
  },
  loaderCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  loaderText: {
    marginTop: 12,
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "500",
  },

  // ── PREMIUM HEADER ──
  // ─────────────────────────────────
  // ULTRA PREMIUM HEADER STYLES
  // ─────────────────────────────────
  headerWrapper: {
    backgroundColor: "#0060B8",
    paddingHorizontal: 20,
    paddingBottom: 16,
    overflow: "hidden",
    shadowColor: "#003E80",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 18,
  },
  headerOrb1: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(255,255,255,0.06)",
    top: -100,
    right: -70,
  },
  headerOrb2: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.04)",
    bottom: 10,
    left: -60,
  },
  headerOrb3: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(100,180,255,0.08)",
    top: 20,
    right: width * 0.35,
  },
  headerInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
  avatarWrapper: { position: "relative" },
  avatarRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)",
    padding: 3,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255,255,255,0.22)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.5)",
  },
  avatarText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 20,
    letterSpacing: 0.5,
  },
  avatarOnlineDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: "#22C55E",
    borderWidth: 2.5,
    borderColor: "#0060B8",
  },
  greetingRow: { flexDirection: "row", alignItems: "center", marginBottom: 2 },
  greetingEmoji: { fontSize: 13 },
  headerGreeting: {
    fontSize: 12,
    color: "rgba(255,255,255,0.68)",
    fontWeight: "500",
  },
  headerName: {
    fontSize: 19,
    fontWeight: "800",
    color: "#FFFFFF",
    maxWidth: 180,
    letterSpacing: -0.5,
    lineHeight: 24,
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 5,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignSelf: "flex-start",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  headerBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4ADE80",
  },
  headerBadgeText: {
    fontSize: 10,
    color: "rgba(255,255,255,0.85)",
    fontWeight: "700",
  },
  headerRight: { flexDirection: "row", gap: 10 },
  headerIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  notifBadge: {
    position: "absolute",
    top: 7,
    right: 7,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#FF3B30",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#0060B8",
    paddingHorizontal: 3,
  },
  notifBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#fff",
    lineHeight: 11,
  },
  headerSearchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 0,
    marginBottom: 0,
    paddingHorizontal: 12,
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    shadowColor: "#003E80",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
  searchIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: "#EBF5FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  headerSearchInput: {
    flex: 1,
    fontSize: 13,
    color: "#0F172A",
    fontWeight: "500",
  },
  searchFilterBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#EBF5FF",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
  },
  headerBottomCurve: {
    height: 28,
    backgroundColor: "#F7F9FC",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: 18,
  },

  // ── SEARCH ──
  searchOuter: { paddingHorizontal: 16, marginTop: 2, marginBottom: 14 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EDF2F7",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 13, color: "#2D3748" },
  filterBtn: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: "#EBF5FF",
    justifyContent: "center",
    alignItems: "center",
  },

  bannerCard: {
    width: width - 32,
    height: 160,
    borderRadius: 20,
    overflow: "hidden",
    marginRight: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  bannerImg: { width: "100%", height: "100%" },
  bannerShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "45%",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 5,
    marginTop: 10,
    marginBottom: 4,
  },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#CBD5E1" },
  dotActive: { width: 18, backgroundColor: "#0078D7", borderRadius: 3 },

  quickSection: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F0F4F8",
  },
  quickTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 14,
  },
  quickGrid: { flexDirection: "row", justifyContent: "space-between" },
  quickItem: { alignItems: "center", gap: 8, flex: 1 },
  quickIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  quickLabel: { fontSize: 11, fontWeight: "700", color: "#334155" },

  statsBar: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 22,
    backgroundColor: "#0078D7",
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 10,
    shadowColor: "#0078D7",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 8,
  },
  statItem: { flex: 1, alignItems: "center" },
  statValue: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.72)",
    marginTop: 2,
    fontWeight: "600",
  },
  statDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.2)" },

  section: { marginTop: 28 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 2,
    fontWeight: "500",
  },
  viewAllChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#EBF5FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  viewAllChipText: { fontSize: 12, fontWeight: "700", color: "#0078D7" },
  hList: { paddingHorizontal: 16, paddingBottom: 4 },

  catCard: {
    width: 120,
    height: 120,
    borderRadius: 18,
    marginRight: 10,
    overflow: "hidden",
    backgroundColor: "#EBF5FF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  catImg: { width: "100%", height: "100%" },
  catImgPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F0F8FF",
  },
  catLabelWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(15,23,42,0.58)",
    paddingVertical: 7,
    paddingHorizontal: 6,
  },
  catLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    letterSpacing: 0.1,
  },

  productCard: {
    width: 240,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    marginRight: 14,
    overflow: "hidden",
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.09,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: "#F0F4F8",
  },
  productImgWrap: {
    width: "100%",
    height: 132,
    backgroundColor: "#F7F9FC",
    position: "relative",
  },
  productImg: { width: "100%", height: "100%" },
  productImgPlaceholder: {
    width: "100%",
    height: 132,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F7F9FC",
  },
  activePill: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  activeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#10B981",
    letterSpacing: 0.5,
  },
  categoryPillImg: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.48)",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: 90,
  },
  categoryPillImgText: { fontSize: 9, color: "#fff", fontWeight: "600" },
  productBody: { padding: 13 },
  productName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    lineHeight: 20,
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  bizRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
  },
  bizName: { fontSize: 11, color: "#94A3B8", fontWeight: "500", flex: 1 },
  productDesc: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 17,
    marginBottom: 8,
  },
  separator: {
    height: 1,
    backgroundColor: "#F0F4F8",
    marginBottom: 10,
    marginTop: 2,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  priceLabel: {
    fontSize: 9,
    color: "#A0AEC0",
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 2,
  },
  priceValueRow: { flexDirection: "row", alignItems: "baseline", gap: 1 },
  priceCurrency: { fontSize: 13, fontWeight: "700", color: "#0078D7" },
  priceValue: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0078D7",
    letterSpacing: -0.5,
  },
  priceUnit: { fontSize: 11, color: "#94A3B8", fontWeight: "500" },
  enquireBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#EBF5FF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  enquireBtnText: { fontSize: 11, fontWeight: "700", color: "#0078D7" },

  emptySection: {
    alignItems: "center",
    paddingVertical: 32,
    marginHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#F0F4F8",
    borderStyle: "dashed",
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#F7F9FC",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#94A3B8",
    marginTop: 4,
  },
  emptySubtitle: { fontSize: 12, color: "#CBD5E1", marginTop: 3 },
  browseSellersBtn: {
    marginTop: 14,
    backgroundColor: "#0078D7",
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: "#0078D7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  browseSellersBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  emptyWrap: { alignItems: "center", paddingVertical: 40 },
  emptyWrapTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#CBD5E1",
    marginTop: 10,
  },
  emptyWrapSub: { fontSize: 12, color: "#E2E8F0", marginTop: 4 },
});

export default HomeScreen;

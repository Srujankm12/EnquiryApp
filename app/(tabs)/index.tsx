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
  ScrollView,
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
    gradientStart: "#0078D7",
  },
  {
    id: "2",
    icon: "search-outline" as const,
    label: "Leads",
    route: "/pages/bussinesLeads",
    color: "#7C3AED",
    bg: "#F3EEFF",
    gradientStart: "#7C3AED",
  },
  {
    id: "3",
    icon: "git-network-outline" as const,
    label: "Network",
    route: "/pages/followers",
    color: "#059669",
    bg: "#ECFDF5",
    gradientStart: "#059669",
  },
  {
    id: "4",
    icon: "storefront-outline" as const,
    label: "Sellers",
    route: "/pages/sellerDirectory",
    color: "#D97706",
    bg: "#FFF7ED",
    gradientStart: "#D97706",
  },
];

/* ─── Category placeholder colours cycling ─── */
const CAT_COLORS = [
  { bg: "#EBF5FF", icon: "#0078D7" },
  { bg: "#F3EEFF", icon: "#7C3AED" },
  { bg: "#ECFDF5", icon: "#059669" },
  { bg: "#FFF7ED", icon: "#D97706" },
  { bg: "#FFF1F2", icon: "#E11D48" },
  { bg: "#F0FDFA", icon: "#0D9488" },
];

const HomeScreen = () => {
  const insets = useSafeAreaInsets();

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
  const [greeting, setGreeting] = useState({ text: "", emoji: "" });

  /* subtle pulse animation for the online dot */
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.4, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return { text: "Good Morning", emoji: "☀️" };
    if (h >= 12 && h < 17) return { text: "Good Afternoon", emoji: "🌤️" };
    if (h >= 17 && h < 21) return { text: "Good Evening", emoji: "🌇" };
    return { text: "Good Night", emoji: "🌙" };
  };

  useEffect(() => {
    setGreeting(getGreeting());
    const t = setInterval(() => setGreeting(getGreeting()), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { loadData(); }, []);

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
    await Promise.all([fetchAllProducts(), fetchFollowerProducts(), fetchCategories(), checkSellerStatus()]);
    setRefreshing(false);
  }, []);

  const refreshProducts = async () => {
    await Promise.all([fetchAllProducts(), fetchFollowerProducts()]);
  };

  const checkSellerStatus = async () => {
    try {
      const s = await AsyncStorage.getItem("sellerStatus");
      const n = s?.toLowerCase()?.trim() || null;
      if (n === "approved" || n === "accepted" || n === "active") { setSellerStatus("approved"); return; }
      setSellerStatus(n);
      const token = await AsyncStorage.getItem("token");
      if (token) {
        const dec: any = jwtDecode(token);
        const bId = dec.business_id;
        if (bId) {
          await AsyncStorage.setItem("companyId", bId);
          try {
            const r = await fetch(`${API_URL}/business/status/${bId}`, { headers: { "Content-Type": "application/json" } });
            if (r.ok) {
              const d = await r.json();
              if (d?.is_approved === true || d?.is_business_approved === true) {
                await AsyncStorage.setItem("sellerStatus", "approved");
                setSellerStatus("approved");
              }
            }
          } catch { }
        }
      }
    } catch { }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([getProfile(), fetchCategories(), fetchAllProducts(), fetchFollowerProducts()]);
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
        const res = await axios.get(`${API_URL}/user/get/user/${dec.user_id}`, { headers: { Authorization: `Bearer ${token}` } });
        setUserDetails(res.data?.user || res.data);
      } catch { }
    } catch { }
  };

  const fetchCategories = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await axios.get(`${API_URL}/category/get/all`, { headers: { Authorization: `Bearer ${token}` } });
      setCategories(res.data?.categories || []);
    } catch { }
  };

  const fetchAllProducts = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;
      const headers = { Authorization: `Bearer ${token}` };
      const companyId = await AsyncStorage.getItem("companyId");
      const fetches: Promise<any>[] = [
        axios.get(`${API_URL}/product/get/all`, { headers }),
      ];
      if (companyId) {
        fetches.push(axios.get(`${API_URL}/product/get/business/${companyId}`, { headers }).catch(() => ({ data: { products: [] } })));
      }
      const [allRes, ownRes] = await Promise.all(fetches);
      const ownIds = new Set<string>();
      if (ownRes) {
        const ownList = ownRes.data?.products || [];
        (Array.isArray(ownList) ? ownList : []).forEach((p: any) => {
          if (p.id) ownIds.add(String(p.id));
          if (p.product_id) ownIds.add(String(p.product_id));
        });
      }
      const raw: any[] = allRes.data?.products || [];
      setAllProducts(
        raw
          .filter((p) => {
            if (p.is_product_active === false) return false;
            if (ownIds.has(String(p.id))) return false;
            if (p.product_id && ownIds.has(String(p.product_id))) return false;
            return true;
          })
          .slice(0, 20),
      );
    } catch { setAllProducts([]); }
  };

  const fetchFollowerProducts = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;
      const dec: any = jwtDecode(token);
      const headers = { Authorization: `Bearer ${token}` };
      const companyId = await AsyncStorage.getItem("companyId");
      const fetches: Promise<any>[] = [
        axios.get(`${API_URL}/product/get/followers/${dec.user_id}`, { headers }),
      ];
      if (companyId) {
        fetches.push(axios.get(`${API_URL}/product/get/business/${companyId}`, { headers }).catch(() => ({ data: { products: [] } })));
      }
      const [follRes, ownRes] = await Promise.all(fetches);
      const ownIds = new Set<string>();
      if (ownRes) {
        const ownList = ownRes.data?.products || [];
        (Array.isArray(ownList) ? ownList : []).forEach((p: any) => {
          if (p.id) ownIds.add(String(p.id));
          if (p.product_id) ownIds.add(String(p.product_id));
        });
      }
      const raw: any[] = follRes.data?.products || [];
      setFollowerProducts(
        raw
          .filter((p) => {
            if (p.is_product_active === false) return false;
            if (ownIds.has(String(p.id))) return false;
            if (p.product_id && ownIds.has(String(p.product_id))) return false;
            return true;
          })
          .slice(0, 20),
      );
    } catch { setFollowerProducts([]); }
  };

  const getProductImage = (product: any): string | null => {
    if (product.product_images?.length > 0) return getImageUri(product.product_images[0].image);
    return null;
  };

  /* ─── LOADING SCREEN ─── */
  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <View style={styles.loaderCard}>
          <View style={styles.loaderIconWrap}>
            <ActivityIndicator size="large" color="#0078D7" />
          </View>
          <Text style={styles.loaderTitle}>Preparing your feed</Text>
          <Text style={styles.loaderText}>Finding the best deals for you…</Text>
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

  /* ─── PREMIUM PRODUCT CARD ─── */
  const ProductCard = ({ item, onPress }: { item: any; onPress: () => void }) => {
    const img = getProductImage(item);
    const desc = item.product_description || item.description || "";
    return (
      <TouchableOpacity style={styles.productCard} activeOpacity={0.9} onPress={onPress}>

        {/* ── IMAGE (full-width, tall) ── */}
        <View style={styles.productImgWrap}>
          {img ? (
            <Image source={{ uri: img }} style={styles.productImg} resizeMode="cover" />
          ) : (
            <View style={styles.productImgPlaceholder}>
              <Ionicons name="image-outline" size={40} color="#B8C8DC" />
              <Text style={styles.noImgText}>No Image</Text>
            </View>
          )}
          {/* Active badge - top left */}
          <View style={styles.activePill}>
            <View style={styles.activeDot} />
            <Text style={styles.activeText}>Active</Text>
          </View>
          {/* Category chip - top right */}
          {item.category_name && (
            <View style={styles.categoryPillImg}>
              <Text style={styles.categoryPillImgText} numberOfLines={1}>{item.category_name}</Text>
            </View>
          )}
        </View>

        {/* ── CONTENT BODY ── */}
        <View style={styles.productBody}>

          {/* Product name - large + bold */}
          <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>

          {/* Seller row */}
          {item.business_name && (
            <View style={styles.bizRow}>
              <Ionicons name="storefront-outline" size={11} color="#0078D7" />
              <Text style={styles.bizName} numberOfLines={1}>{item.business_name}</Text>
              {item.city ? (
                <>
                  <Text style={styles.bizDot}>·</Text>
                  <Ionicons name="location-outline" size={10} color="#94A3B8" />
                  <Text style={styles.bizCity} numberOfLines={1}>{item.city}</Text>
                </>
              ) : null}
            </View>
          )}

          {/* Description */}
          {desc ? (
            <Text style={styles.productDesc} numberOfLines={3}>{desc}</Text>
          ) : null}

          <View style={styles.separator} />

          {/* Price + CTA */}
          <View style={styles.priceRow}>
            <View>
              <Text style={styles.priceLabel}>BEST PRICE</Text>
              <View style={styles.priceValueRow}>
                <Text style={styles.priceCurrency}>₹</Text>
                <Text style={styles.priceValue}>
                  {Number(item.price).toLocaleString('en-IN')}
                </Text>
                {item.unit ? <Text style={styles.priceUnit}>/{item.unit}</Text> : null}
              </View>
              {item.moq ? <Text style={styles.moqText}>MOQ: {item.moq}</Text> : null}
            </View>
            <TouchableOpacity style={styles.enquireBtn} onPress={onPress} activeOpacity={0.82}>
              <Text style={styles.enquireBtnText}>Enquire Now</Text>
              <Ionicons name="arrow-forward" size={12} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  /* ─── MAIN RETURN ─── */
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#005BB5" />

      {sellerStatus !== "approved" &&
        sellerStatus !== "accepted" &&
        sellerStatus !== "active" && (
          <BecomeSellerToaster
            key={toasterKey}
            visible={showToaster}
            onClose={() => setShowToaster(false)}
          />
        )}

      {/* ══════════════ ULTRA PREMIUM HEADER ══════════════ */}
      <View style={[styles.headerWrapper, { paddingTop: insets.top }]}>
        {/* Decorative blobs */}
        <View style={styles.blob1} />
        <View style={styles.blob2} />
        <View style={styles.blob3} />
        <View style={styles.blob4} />

        {/* Top Row */}
        <View style={styles.headerInner}>
          <View style={styles.headerLeft}>
            {/* Avatar */}
            <View style={styles.avatarWrapper}>
              <View style={styles.avatarRing}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
                </View>
              </View>
              <Animated.View style={[styles.avatarOnlineDot, { transform: [{ scale: pulseAnim }] }]} />
            </View>

            {/* Greeting + Name */}
            <View style={{ flex: 1 }}>
              <View style={styles.greetingRow}>
                <Text style={styles.headerGreeting}>{greeting.text} </Text>
                <Text style={styles.greetingEmoji}>{greeting.emoji}</Text>
              </View>
              <Text style={styles.headerName} numberOfLines={1}>{displayName}</Text>
              <View style={styles.headerBadge}>
                <View style={styles.headerBadgeDot} />
                <Text style={styles.headerBadgeText}>Active Trader</Text>
              </View>
            </View>
          </View>

          {/* Right icons */}
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerIconBtn} activeOpacity={0.75}>
              <Ionicons name="notifications-outline" size={19} color="#FFFFFF" />
              <View style={styles.notifBadge}><Text style={styles.notifBadgeText}>3</Text></View>
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
            placeholder="Search products, sellers, categories…"
            placeholderTextColor="#94A3B8"
          />
          <TouchableOpacity style={styles.searchFilterBtn} activeOpacity={0.8}>
            <Ionicons name="options-outline" size={15} color="#0078D7" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ══════════════ SCROLL CONTENT ══════════════ */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 36 + insets.bottom }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0078D7"]} tintColor="#0078D7" />
        }
      >
        {/* ── BANNER CAROUSEL ── */}
        <FlatList
          data={BANNERS}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          snapToInterval={width - 32}
          decelerationRate="fast"
          style={{ marginTop: 18 }}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
          onMomentumScrollEnd={(e) =>
            setActiveBanner(Math.round(e.nativeEvent.contentOffset.x / (width - 32)))
          }
          renderItem={({ item }) => (
            <View style={styles.bannerCard}>
              <Image source={item.image} style={styles.bannerImg} resizeMode="cover" />
              <View style={styles.bannerShineTop} />
            </View>
          )}
          keyExtractor={(i) => i.id}
        />
        <View style={styles.dotsRow}>
          {BANNERS.map((_, i) => (
            <View key={i} style={[styles.dot, i === activeBanner && styles.dotActive]} />
          ))}
        </View>

        {/* ── QUICK ACTIONS ── */}
        <View style={styles.qaSection}>
          <View style={styles.qaHeaderRow}>
            <Text style={styles.qaTitle}>Quick Actions</Text>
            <View style={styles.qaTitleAccent} />
          </View>
          <View style={styles.qaGrid}>
            {QUICK_ACTIONS.map((a) => (
              <TouchableOpacity
                key={a.id}
                style={styles.qaItem}
                activeOpacity={0.78}
                onPress={() => router.push(a.route as any)}
              >
                <View style={[styles.qaIconOuter, { borderColor: a.color + "22" }]}>
                  <View style={[styles.qaIconInner, { backgroundColor: a.bg }]}>
                    <Ionicons name={a.icon} size={24} color={a.color} />
                  </View>
                </View>
                <Text style={[styles.qaLabel, { color: a.color }]}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── CATEGORIES ── */}
        {categories.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Categories</Text>
                <Text style={styles.sectionSubtitle}>Browse by product type</Text>
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
              renderItem={({ item, index }) => {
                const cc = CAT_COLORS[index % CAT_COLORS.length];
                return (
                  <TouchableOpacity
                    style={styles.catCard}
                    activeOpacity={0.82}
                    onPress={() =>
                      router.push({ pathname: "/pages/specificCategory", params: { id: item.id, name: item.name } })
                    }
                  >
                    {item.category_image ? (
                      <Image
                        source={{ uri: getImageUri(item.category_image)! }}
                        style={styles.catImg}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.catImg, { backgroundColor: cc.bg, justifyContent: "center", alignItems: "center" }]}>
                        <Ionicons name="leaf-outline" size={30} color={cc.icon} />
                      </View>
                    )}
                    {/* Dark gradient label */}
                    <View style={styles.catOverlay}>
                      <Text style={styles.catLabel} numberOfLines={2}>{item.name}</Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
              keyExtractor={(i) => i.id}
            />
          </View>
        )}

        {/* ── STATS STRIP ── */}
        <View style={styles.statsStrip}>
          <View style={styles.statCell}>
            <Ionicons name="cube-outline" size={18} color="#fff" style={{ marginBottom: 3 }} />
            <Text style={styles.statValue}>{allProducts.length}+</Text>
            <Text style={styles.statLabel}>Products</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCell}>
            <Ionicons name="layers-outline" size={18} color="#fff" style={{ marginBottom: 3 }} />
            <Text style={styles.statValue}>{categories.length}+</Text>
            <Text style={styles.statLabel}>Categories</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCell}>
            <Ionicons name="people-outline" size={18} color="#fff" style={{ marginBottom: 3 }} />
            <Text style={styles.statValue}>{followerProducts.length}+</Text>
            <Text style={styles.statLabel}>From Network</Text>
          </View>
        </View>

        {/* ── ALL PRODUCTS ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>All Products</Text>
              <Text style={styles.sectionSubtitle}>Discover what's available</Text>
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
                    router.push({ pathname: "/pages/productDetail" as any, params: { product_id: item.id } })
                  }
                />
              )}
              keyExtractor={(i) => i.id}
            />
          ) : (
            <View style={styles.emptySection}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="cube-outline" size={32} color="#CBD5E1" />
              </View>
              <Text style={styles.emptyTitle}>No products available</Text>
              <Text style={styles.emptySubtitle}>Check back soon for new listings</Text>
            </View>
          )}
        </View>

        {/* ── FROM SELLERS YOU FOLLOW ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>From Your Network</Text>
              <Text style={styles.sectionSubtitle}>Curated from sellers you follow</Text>
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
                    router.push({ pathname: "/pages/productDetail" as any, params: { product_id: item.id } })
                  }
                />
              )}
              keyExtractor={(i, idx) => `${i.id}-${idx}`}
            />
          ) : (
            <View style={styles.emptySection}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="people-outline" size={32} color="#CBD5E1" />
              </View>
              <Text style={styles.emptyTitle}>No curated products yet</Text>
              <Text style={styles.emptySubtitle}>Follow sellers to see their listings here</Text>
              <TouchableOpacity
                style={styles.browseSellersBtn}
                onPress={() => router.push("/pages/sellerDirectory" as any)}
              >
                <Ionicons name="storefront-outline" size={14} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.browseSellersBtnText}>Browse Sellers</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {!hasAnyProducts && !refreshing && (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyWrapIcon}>
              <Ionicons name="cube-outline" size={40} color="#94A3B8" />
            </View>
            <Text style={styles.emptyWrapTitle}>No active products yet</Text>
            <Text style={styles.emptyWrapSub}>Pull down to refresh</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

/* ════════════════════════════════════════════
   S T Y L E S
════════════════════════════════════════════ */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F5FB" },

  /* ── LOADER ── */
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F0F5FB",
  },
  loaderCard: {
    backgroundColor: "#fff",
    borderRadius: 28,
    padding: 36,
    alignItems: "center",
    shadowColor: "#0078D7",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
    width: width * 0.72,
  },
  loaderIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "#EBF5FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  loaderTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  loaderText: { fontSize: 12, color: "#94A3B8", fontWeight: "500" },

  /* ── HEADER ── */
  headerWrapper: {
    backgroundColor: "#005BB5",
    paddingHorizontal: 20,
    paddingBottom: 18,
    overflow: "hidden",
    shadowColor: "#003E80",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 20,
  },
  blob1: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "rgba(255,255,255,0.06)",
    top: -130,
    right: -80,
  },
  blob2: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.04)",
    bottom: -60,
    left: -60,
  },
  blob3: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(100,180,255,0.07)",
    top: 30,
    right: width * 0.38,
  },
  blob4: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.05)",
    bottom: 10,
    right: 30,
  },
  headerInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 18,
    paddingBottom: 18,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
  avatarWrapper: { position: "relative" },
  avatarRing: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.38)",
    padding: 3,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarCircle: {
    width: 47,
    height: 47,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.5)",
  },
  avatarText: { color: "#FFFFFF", fontWeight: "900", fontSize: 21, letterSpacing: 0.5 },
  avatarOnlineDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#22C55E",
    borderWidth: 2.5,
    borderColor: "#005BB5",
  },
  greetingRow: { flexDirection: "row", alignItems: "center", marginBottom: 2 },
  greetingEmoji: { fontSize: 13 },
  headerGreeting: { fontSize: 12, color: "rgba(255,255,255,0.68)", fontWeight: "600" },
  headerName: {
    fontSize: 20,
    fontWeight: "900",
    color: "#FFFFFF",
    maxWidth: 190,
    letterSpacing: -0.5,
    lineHeight: 25,
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
    backgroundColor: "rgba(255,255,255,0.13)",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  headerBadgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#4ADE80" },
  headerBadgeText: { fontSize: 10, color: "rgba(255,255,255,0.88)", fontWeight: "700" },
  headerRight: { flexDirection: "row", gap: 10 },
  headerIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.13)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  notifBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: "#FF3B30",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#005BB5",
    paddingHorizontal: 3,
  },
  notifBadgeText: { fontSize: 9, fontWeight: "900", color: "#fff" },
  headerSearchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    height: 48,
    borderRadius: 16,
    shadowColor: "#003E80",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  searchIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#EBF5FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 9,
  },
  headerSearchInput: { flex: 1, fontSize: 13, color: "#0F172A", fontWeight: "500" },
  searchFilterBtn: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "#EBF5FF",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
  },

  /* ── BANNER ── */
  bannerCard: {
    width: width - 32,
    height: 168,
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.13,
    shadowRadius: 16,
    elevation: 7,
  },
  bannerImg: { width: "100%", height: "100%" },
  bannerShineTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "40%",
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
    marginBottom: 2,
  },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#CBD5E1" },
  dotActive: { width: 20, backgroundColor: "#0078D7", borderRadius: 3 },

  /* ── QUICK ACTIONS ── */
  qaSection: {
    marginHorizontal: 16,
    marginTop: 22,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 18,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 5,
    borderWidth: 1,
    borderColor: "#EEF2F7",
  },
  qaHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 18 },
  qaTitle: { fontSize: 11, fontWeight: "800", color: "#64748B", letterSpacing: 1.2, textTransform: "uppercase" },
  qaTitleAccent: { flex: 1, height: 1.5, backgroundColor: "#F0F4F8", borderRadius: 1 },
  qaGrid: { flexDirection: "row", justifyContent: "space-between" },
  qaItem: { alignItems: "center", gap: 9, flex: 1 },
  qaIconOuter: {
    width: 62,
    height: 62,
    borderRadius: 20,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  qaIconInner: {
    width: 50,
    height: 50,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  qaLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 0.2 },

  /* ── SECTION COMMON ── */
  section: { marginTop: 28 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  sectionSubtitle: { fontSize: 12, color: "#94A3B8", marginTop: 2, fontWeight: "500" },
  viewAllChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#EBF5FF",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  viewAllChipText: { fontSize: 12, fontWeight: "700", color: "#0078D7" },
  hList: { paddingHorizontal: 16, paddingBottom: 6 },

  /* ── CATEGORIES ── */
  catCard: {
    width: 118,
    height: 130,
    borderRadius: 22,
    marginRight: 12,
    overflow: "hidden",
    shadowColor: "#0078D7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  catImg: { width: "100%", height: "100%" },
  catOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: "rgba(10,20,40,0.62)",
  },
  catLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    letterSpacing: 0.2,
  },

  /* ── STATS STRIP ── */
  statsStrip: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 24,
    backgroundColor: "#0078D7",
    borderRadius: 22,
    paddingVertical: 20,
    paddingHorizontal: 8,
    shadowColor: "#0060B0",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 10,
  },
  statCell: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 22, fontWeight: "900", color: "#FFFFFF", letterSpacing: -0.5 },
  statLabel: { fontSize: 10, color: "rgba(255,255,255,0.7)", fontWeight: "600", marginTop: 2 },
  statDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.2)", marginVertical: 4 },

  /* ── PRODUCT CARD ── */
  productCard: {
    width: 230,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    marginRight: 14,
    overflow: "hidden",
    shadowColor: "#4A6FA5",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 7,
    borderWidth: 1,
    borderColor: "#EEF2F8",
  },
  // ── Product card image ──
  productImgWrap: { position: 'relative', width: '100%', height: 200, backgroundColor: '#EEF3F9' },
  productImg: { width: '100%', height: '100%' },
  productImgPlaceholder: {
    width: '100%', height: '100%', backgroundColor: '#EEF3F9',
    justifyContent: 'center', alignItems: 'center', gap: 6,
  },
  noImgText: { fontSize: 11, color: '#B8C8DC', fontWeight: '600' },
  productImgOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 50,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  activePill: {
    position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#10B981" },
  activeText: { fontSize: 9, fontWeight: "800", color: "#10B981", letterSpacing: 0.5 },
  categoryPillImg: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.52)",
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 4,
    maxWidth: 90,
  },
  categoryPillImgText: { fontSize: 9, color: "#fff", fontWeight: "700" },
  productBody: { padding: 14 },
  productName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 22,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  bizRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  bizName: { fontSize: 12, color: '#0078D7', fontWeight: '600', flex: 1 },
  bizDot: { fontSize: 10, color: '#CBD5E1', fontWeight: '700' },
  bizCity: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
  productDesc: { fontSize: 13, color: '#475569', lineHeight: 19, marginBottom: 10 },
  separator: { height: 1, backgroundColor: '#F0F4F8', marginBottom: 10, marginTop: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  priceLabel: { fontSize: 9, color: '#A0AEC0', fontWeight: '700', letterSpacing: 0.8, marginBottom: 2 },
  priceValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 1 },
  priceCurrency: { fontSize: 14, fontWeight: '700', color: '#0060B0' },
  priceValue: { fontSize: 22, fontWeight: '900', color: '#0060B0', letterSpacing: -0.5 },
  priceUnit: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },
  moqText: { fontSize: 10, color: '#94A3B8', fontWeight: '600', marginTop: 2 },
  enquireBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#0078D7',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    shadowColor: '#0060B0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.32,
    shadowRadius: 8,
    elevation: 5,
  },
  enquireBtnText: { fontSize: 12, fontWeight: '800', color: '#fff' },

  /* ── EMPTY STATES ── */
  emptySection: {
    alignItems: "center",
    paddingVertical: 36,
    marginHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: "#EEF4FB",
    borderStyle: "dashed",
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "#F7F9FC",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  emptyTitle: { fontSize: 14, fontWeight: "700", color: "#94A3B8", marginTop: 4 },
  emptySubtitle: { fontSize: 12, color: "#CBD5E1", marginTop: 4, textAlign: "center", paddingHorizontal: 24 },
  browseSellersBtn: {
    marginTop: 16,
    backgroundColor: "#0078D7",
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#0060B0",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 5,
  },
  browseSellersBtnText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  emptyWrap: { alignItems: "center", paddingVertical: 48 },
  emptyWrapIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: "#F0F5FB",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  emptyWrapTitle: { fontSize: 16, fontWeight: "700", color: "#94A3B8", marginTop: 4 },
  emptyWrapSub: { fontSize: 12, color: "#CBD5E1", marginTop: 4 },
});

export default HomeScreen;

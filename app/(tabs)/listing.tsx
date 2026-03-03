import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Constants from "expo-constants";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
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
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

interface Category {
  id: string;
  name: string;
  category_image: string | null;
  description: string;
}
interface Product {
  id: string;
  name: string;
  description: string;
  product_description?: string;
  quantity: number;
  unit: string;
  price: number;
  moq: string;
  business_name?: string;
  category_name?: string;
  city?: string;
  state?: string;
  product_images?: any[];
  created_at: string;
  updated_at: string;
}

const CARD_WIDTH = (width - 44) / 2;

const SellerTab: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sellerStatus, setSellerStatus] = useState<string | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await AsyncStorage.getItem("token");
      if (!token) return;
      const headers = { Authorization: `Bearer ${token}` };

      const status = await AsyncStorage.getItem("sellerStatus");
      const norm = status?.toLowerCase()?.trim() || null;
      const approved =
        norm === "approved" || norm === "accepted" || norm === "active";
      setSellerStatus(approved ? "approved" : norm);

      const [catRes, prodRes] = await Promise.allSettled([
        axios.get(`${API_URL}/category/get/all`, { headers }),
        axios.get(`${API_URL}/product/get/all`, { headers }),
      ]);
      if (catRes.status === "fulfilled")
        setCategories(catRes.value.data?.categories || []);
      if (prodRes.status === "fulfilled") {
        const d = prodRes.value.data?.products || [];
        setAllProducts(Array.isArray(d) ? d : []);
      }
    } catch {
      setError("Unable to load data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const getProductImageUrl = (p: Product) =>
    p.product_images?.length ? getImageUri(p.product_images[0].image) : null;

  const isApproved = sellerStatus === "approved";

  const filteredProducts = allProducts.filter((p) => {
    const matchSearch = !searchQuery
      ? true
      : p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.product_description || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    const matchCat = !selectedCategory
      ? true
      : (p as any).category_id === selectedCategory;
    return matchSearch && matchCat;
  });

  // ── Premium Product Card ──
  const PremiumCard = ({ item }: { item: Product }) => {
    const scaleCard = useRef(new Animated.Value(1)).current;
    const img = getProductImageUrl(item);
    const desc = (item as any).product_description || item.description;

    return (
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={() =>
          Animated.spring(scaleCard, {
            toValue: 0.96,
            useNativeDriver: true,
            speed: 20,
          }).start()
        }
        onPressOut={() =>
          Animated.spring(scaleCard, {
            toValue: 1,
            useNativeDriver: true,
            speed: 20,
          }).start()
        }
        onPress={() =>
          router.push({
            pathname: "/pages/productDetail" as any,
            params: { product_id: item.id },
          })
        }
      >
        <Animated.View
          style={[styles.premiumCard, { transform: [{ scale: scaleCard }] }]}
        >
          {/* Image */}
          <View style={styles.cardImgWrap}>
            {img ? (
              <Image
                source={{ uri: img }}
                style={styles.cardImg}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.cardImgPlaceholder}>
                <View style={styles.cardImgPlaceholderIcon}>
                  <Ionicons name="cube-outline" size={28} color="#0078D7" />
                </View>
              </View>
            )}
            {/* Active pill */}
            <View style={styles.activeBadge}>
              <View style={styles.activeDot} />
              <Text style={styles.activeBadgeText}>Active</Text>
            </View>
            {/* Category overlay */}
            {(item as any).category_name && (
              <View style={styles.categoryOverlay}>
                <Text style={styles.categoryOverlayText} numberOfLines={1}>
                  {(item as any).category_name}
                </Text>
              </View>
            )}
          </View>

          {/* Body */}
          <View style={styles.cardBody}>
            <Text style={styles.cardName} numberOfLines={2}>
              {item.name}
            </Text>

            {(item as any).business_name && (
              <View style={styles.cardBizRow}>
                <Ionicons name="storefront-outline" size={10} color="#64748B" />
                <Text style={styles.cardBizName} numberOfLines={1}>
                  {(item as any).business_name}
                </Text>
                {(item as any).city && (
                  <>
                    <Text style={styles.cardBizDot}>·</Text>
                    <Ionicons
                      name="location-outline"
                      size={9}
                      color="#94A3B8"
                    />
                    <Text style={styles.cardBizCity} numberOfLines={1}>
                      {(item as any).city}
                    </Text>
                  </>
                )}
              </View>
            )}

            {desc ? (
              <Text style={styles.cardDesc} numberOfLines={2}>
                {desc}
              </Text>
            ) : null}

            <View style={styles.cardChipsRow}>
              <View style={styles.cardChip}>
                <Ionicons name="cube-outline" size={9} color="#0078D7" />
                <Text style={styles.cardChipText}>
                  {item.quantity} {item.unit}
                </Text>
              </View>
              {item.moq ? (
                <View style={[styles.cardChip, styles.cardChipMuted]}>
                  <Ionicons name="layers-outline" size={9} color="#64748B" />
                  <Text style={[styles.cardChipText, { color: "#64748B" }]}>
                    MOQ: {item.moq}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.cardDivider} />

            <View style={styles.cardFooter}>
              <View>
                <Text style={styles.cardPriceLabel}>PRICE</Text>
                <View style={styles.cardPriceRow}>
                  <Text style={styles.cardPriceCurrency}>₹</Text>
                  <Text style={styles.cardPrice}>{item.price}</Text>
                  <Text style={styles.cardUnit}>/{item.unit}</Text>
                </View>
              </View>
              <View style={styles.cardEnquireBtn}>
                <Ionicons name="arrow-forward" size={13} color="#fff" />
              </View>
            </View>
          </View>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  // ── Loading state ──
  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0060B8" />
        <View style={[styles.headerWrapper, { paddingTop: insets.top }]}>
          <View style={styles.headerOrb1} />
          <View style={styles.headerOrb2} />
          <View style={styles.headerOrb3} />
          <View style={styles.headerInner}>
            <View>
              <Text style={styles.headerEyebrow}>
                {isApproved ? "SELLER HUB" : "MARKETPLACE"}
              </Text>
              <Text style={styles.headerTitle}>
                {isApproved ? "Seller Hub" : "Products"}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.loaderContainer}>
          <View style={styles.loaderCard}>
            <ActivityIndicator size="large" color="#0078D7" />
            <Text style={styles.loaderText}>Loading products…</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0060B8" />

      {/* ── HEADER ── */}
      <View style={[styles.headerWrapper, { paddingTop: insets.top }]}>
        <View style={styles.headerOrb1} />
        <View style={styles.headerOrb2} />
        <View style={styles.headerOrb3} />

        <View style={styles.headerInner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerEyebrow}>
              {isApproved ? "SELLER HUB" : "MARKETPLACE"}
            </Text>
            <Text style={styles.headerTitle}>
              {isApproved ? "Seller Hub" : "Products"}
            </Text>
          </View>
          <View style={styles.headerRightRow}>
            {isApproved && (
              <>
                <TouchableOpacity
                  style={styles.headerMyProductsBtn}
                  onPress={() => router.push("/pages/myProducts" as any)}
                >
                  <Ionicons name="cube" size={13} color="#fff" />
                  <Text style={styles.headerMyProductsText}>My Products</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.headerAddBtn}
                  onPress={() => router.push("/pages/addProduct" as any)}
                >
                  <Ionicons name="add" size={20} color="#0078D7" />
                </TouchableOpacity>
              </>
            )}
            {!isApproved && (
              <View style={styles.headerBadge}>
                <View style={styles.headerBadgeDot} />
                <Text style={styles.headerBadgeText}>
                  {allProducts.length} items
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Search */}
        <View
          style={[
            styles.headerSearchWrap,
            searchFocused && styles.headerSearchFocused,
          ]}
        >
          <View style={styles.searchIconCircle}>
            <Ionicons name="search-outline" size={14} color="#0078D7" />
          </View>
          <TextInput
            style={styles.headerSearchInput}
            placeholder="Search products, businesses..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.searchClearBtn}
              onPress={() => setSearchQuery("")}
            >
              <Ionicons name="close" size={15} color="#0078D7" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── ERROR ── */}
      {error ? (
        <View style={styles.stateContainer}>
          <View style={styles.stateIconWrapper}>
            <Ionicons name="cloud-offline-outline" size={32} color="#0078D7" />
          </View>
          <Text style={styles.stateTitle}>Connection Error</Text>
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity style={styles.actionButton} onPress={loadData}>
            <Ionicons name="refresh" size={15} color="#fff" />
            <Text style={styles.actionButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 110 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#0078D7"]}
              tintColor="#0078D7"
            />
          }
        >
          {/* Stats bar */}
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
              <Text style={styles.statValue}>Live</Text>
              <Text style={styles.statLabel}>Updated</Text>
            </View>
          </View>

          {/* Categories */}
          {categories.length > 0 && (
            <View style={styles.catSection}>
              <View style={styles.sectionHeaderRow}>
                <View>
                  <Text style={styles.sectionTitle}>Categories</Text>
                  <Text style={styles.sectionSubtitle}>Browse by type</Text>
                </View>
                <View style={styles.viewAllChip}>
                  <Text style={styles.viewAllChipText}>
                    {categories.length} total
                  </Text>
                </View>
              </View>
              <FlatList
                data={[
                  {
                    id: "all",
                    name: "All",
                    category_image: null,
                    description: "",
                  },
                  ...categories,
                ]}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(i) => i.id}
                contentContainerStyle={styles.catRow}
                renderItem={({ item }) => {
                  const isSelected =
                    item.id === "all"
                      ? selectedCategory === null
                      : selectedCategory === item.id;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.catChip,
                        isSelected && styles.catChipActive,
                      ]}
                      activeOpacity={0.75}
                      onPress={() =>
                        setSelectedCategory(item.id === "all" ? null : item.id)
                      }
                    >
                      <View
                        style={[
                          styles.catChipIcon,
                          isSelected && styles.catChipIconActive,
                        ]}
                      >
                        {item.id !== "all" && item.category_image ? (
                          <Image
                            source={{ uri: getImageUri(item.category_image)! }}
                            style={styles.catChipImage}
                          />
                        ) : (
                          <Ionicons
                            name={
                              item.id === "all"
                                ? "apps-outline"
                                : "leaf-outline"
                            }
                            size={13}
                            color={isSelected ? "#fff" : "#0078D7"}
                          />
                        )}
                      </View>
                      <Text
                        style={[
                          styles.catChipText,
                          isSelected && styles.catChipTextActive,
                        ]}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          )}

          {/* Products grid */}
          {filteredProducts.length > 0 ? (
            <View style={styles.productsSection}>
              <View style={styles.sectionHeaderRow}>
                <View>
                  <Text style={styles.sectionTitle}>
                    {selectedCategory
                      ? categories.find((c) => c.id === selectedCategory)
                        ?.name || "Category"
                      : "All Products"}
                  </Text>
                  <Text style={styles.sectionSubtitle}>
                    {filteredProducts.length} items available
                  </Text>
                </View>
                {searchQuery ? (
                  <TouchableOpacity
                    style={styles.viewAllChip}
                    onPress={() => setSearchQuery("")}
                  >
                    <Text style={styles.viewAllChipText}>Clear</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              <View style={styles.grid}>
                {filteredProducts.map((product) => (
                  <PremiumCard key={product.id} item={product} />
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.stateIconWrapper}>
                <Ionicons name="cube-outline" size={32} color="#0078D7" />
              </View>
              <Text style={styles.stateTitle}>
                {searchQuery ? "No Results Found" : "No Products Yet"}
              </Text>
              <Text style={styles.stateText}>
                {searchQuery
                  ? `No products match "${searchQuery}"`
                  : "Products will appear here once sellers post them"}
              </Text>
              {searchQuery && (
                <TouchableOpacity
                  style={styles.outlineButton}
                  onPress={() => setSearchQuery("")}
                >
                  <Text style={styles.outlineButtonText}>Clear Search</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Become Seller */}
          {!isApproved && (
            <TouchableOpacity
              style={styles.becomeSellerBanner}
              onPress={() => router.push("/pages/becomeSellerForm" as any)}
              activeOpacity={0.85}
            >
              <View style={styles.becomeSellerIconWrap}>
                <Ionicons name="storefront" size={22} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.becomeSellerTitle}>Become a Seller</Text>
                <Text style={styles.becomeSellerSub}>
                  Register your business and start selling
                </Text>
              </View>
              <View style={styles.becomeSellerArrow}>
                <Ionicons name="chevron-forward" size={16} color="#0078D7" />
              </View>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F9FC" },

  // ── Loader ──
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

  // ── Header ──
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
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingTop: 16,
    paddingBottom: 18,
  },
  headerEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.65)",
    letterSpacing: 2,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  headerRightRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 5,
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
    fontSize: 11,
    color: "rgba(255,255,255,0.85)",
    fontWeight: "700",
  },
  headerMyProductsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  headerMyProductsText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  headerAddBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  headerSearchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
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
  headerSearchFocused: { borderColor: "rgba(255,255,255,0.6)" },
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
  searchClearBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#EBF5FF",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
  },

  // ── Stats bar ──
  statsBar: {
    flexDirection: "row",
    margin: 16,
    marginBottom: 0,
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
    fontSize: 20,
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

  // ── Section headers ──
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
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

  // ── Categories ──
  catSection: { paddingTop: 22, paddingBottom: 6 },
  catRow: { paddingHorizontal: 16, gap: 8 },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 22,
    paddingVertical: 7,
    paddingHorizontal: 12,
    gap: 7,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  catChipActive: { backgroundColor: "#0078D7", borderColor: "#0078D7" },
  catChipIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#EBF5FF",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  catChipIconActive: { backgroundColor: "rgba(255,255,255,0.25)" },
  catChipImage: { width: 24, height: 24, borderRadius: 12 },
  catChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    maxWidth: 90,
  },
  catChipTextActive: { color: "#fff" },

  // ── Grid ──
  productsSection: { paddingTop: 22 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    gap: 10,
  },

  // ── Premium Card ──
  premiumCard: {
    width: CARD_WIDTH,
    backgroundColor: "#fff",
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: "#1B4FBF",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: "#F0F4F8",
  },
  cardImgWrap: {
    width: "100%",
    height: 140,
    backgroundColor: "#EEF4FB",
    position: "relative",
  },
  cardImg: { width: "100%", height: "100%" },
  cardImgPlaceholder: {
    width: "100%",
    height: 140,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#EBF5FF",
  },
  cardImgPlaceholderIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "rgba(0,120,215,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  activeBadge: {
    position: "absolute",
    top: 9,
    left: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#16A34A",
  },
  activeBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#16A34A",
    letterSpacing: 0.3,
  },
  categoryOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(10,20,40,0.52)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  categoryOverlayText: {
    fontSize: 10,
    color: "rgba(255,255,255,0.92)",
    fontWeight: "600",
    letterSpacing: 0.2,
  },

  cardBody: { padding: 12 },
  cardName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    lineHeight: 18,
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  cardBizRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginBottom: 5,
  },
  cardBizName: { fontSize: 10, color: "#64748B", fontWeight: "600", flex: 1 },
  cardBizDot: { fontSize: 10, color: "#CBD5E1", marginHorizontal: 1 },
  cardBizCity: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "500",
    maxWidth: 55,
  },
  cardDesc: { fontSize: 11, color: "#64748B", lineHeight: 15, marginBottom: 7 },
  cardChipsRow: {
    flexDirection: "row",
    gap: 5,
    flexWrap: "wrap",
    marginBottom: 8,
  },
  cardChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#EBF5FF",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
  },
  cardChipMuted: { backgroundColor: "#F1F5F9" },
  cardChipText: { fontSize: 9, fontWeight: "700", color: "#0078D7" },
  cardDivider: { height: 1, backgroundColor: "#F1F5F9", marginBottom: 9 },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardPriceLabel: {
    fontSize: 8,
    color: "#94A3B8",
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 1,
  },
  cardPriceRow: { flexDirection: "row", alignItems: "baseline", gap: 1 },
  cardPriceCurrency: { fontSize: 12, fontWeight: "700", color: "#0078D7" },
  cardPrice: {
    fontSize: 17,
    fontWeight: "900",
    color: "#0078D7",
    letterSpacing: -0.5,
  },
  cardUnit: { fontSize: 10, fontWeight: "500", color: "#94A3B8" },
  cardEnquireBtn: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: "#0078D7",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0078D7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },

  // ── State screens ──
  stateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 52,
    paddingHorizontal: 40,
  },
  stateIconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#EBF5FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  stateText: {
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  actionButton: {
    marginTop: 24,
    backgroundColor: "#0078D7",
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: "#0078D7",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  actionButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  outlineButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#0078D7",
  },
  outlineButtonText: { color: "#0078D7", fontSize: 13, fontWeight: "700" },

  // ── Become Seller ──
  becomeSellerBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 22,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#DBEAFE",
    shadowColor: "#0078D7",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 4,
  },
  becomeSellerIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#0078D7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
    shadowColor: "#0078D7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  becomeSellerTitle: { fontSize: 15, fontWeight: "800", color: "#0F172A" },
  becomeSellerSub: { fontSize: 12, color: "#64748B", marginTop: 2 },
  becomeSellerArrow: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: "#EBF5FF",
    justifyContent: "center",
    alignItems: "center",
  },
});

export default SellerTab;

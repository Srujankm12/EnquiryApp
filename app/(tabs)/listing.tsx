import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Constants from "expo-constants";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
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

const CARD_WIDTH = (width - 36) / 2;

const SellerTab: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
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

      let status = await AsyncStorage.getItem("sellerStatus");
      const normalizedStatus = status?.toLowerCase()?.trim() || null;
      const isApproved =
        normalizedStatus === "approved" ||
        normalizedStatus === "accepted" ||
        normalizedStatus === "active";
      setSellerStatus(isApproved ? "approved" : normalizedStatus);

      const [catRes, productsRes] = await Promise.allSettled([
        axios.get(`${API_URL}/category/get/all`, { headers }),
        axios.get(`${API_URL}/product/get/all`, { headers }),
      ]);

      if (catRes.status === "fulfilled") {
        setCategories(catRes.value.data?.categories || []);
      }

      if (productsRes.status === "fulfilled") {
        const productsData = productsRes.value.data?.products || [];
        setAllProducts(Array.isArray(productsData) ? productsData : []);
      }
    } catch (err: any) {
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

  const getProductImageUrl = (product: Product): string | null => {
    if (product.product_images && product.product_images.length > 0) {
      return getImageUri(product.product_images[0].image);
    }
    return null;
  };

  const isApproved = sellerStatus === "approved";

  const filteredProducts = allProducts.filter((p) => {
    const matchesSearch = !searchQuery
      ? true
      : p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.product_description
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory
      ? true
      : (p as any).category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // ── Premium Product Card ──
  const PremiumCard = ({ item }: { item: Product }) => {
    const img = getProductImageUrl(item);
    const desc = (item as any).product_description || item.description;
    return (
      <TouchableOpacity
        style={styles.premiumCard}
        activeOpacity={0.91}
        onPress={() =>
          router.push({
            pathname: "/pages/productDetail" as any,
            params: { product_id: item.id },
          })
        }
      >
        {/* ── Image area ── */}
        <View style={styles.cardImgWrap}>
          {img ? (
            <Image
              source={{ uri: img }}
              style={styles.cardImg}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.cardImgPlaceholder}>
              <Ionicons name="cube-outline" size={36} color="#C2D4E8" />
              <Text style={styles.cardImgPlaceholderText}>No Image</Text>
            </View>
          )}

          {/* Active badge */}
          <View style={styles.activeBadge}>
            <View style={styles.activeDot} />
            <Text style={styles.activeBadgeText}>Active</Text>
          </View>

          {/* Category tag overlay */}
          {(item as any).category_name && (
            <View style={styles.categoryOverlay}>
              <Text style={styles.categoryOverlayText} numberOfLines={1}>
                {(item as any).category_name}
              </Text>
            </View>
          )}
        </View>

        {/* ── Content area ── */}
        <View style={styles.cardBody}>
          {/* Product name */}
          <Text style={styles.cardName} numberOfLines={2}>
            {item.name}
          </Text>

          {/* Business + location row */}
          {(item as any).business_name && (
            <View style={styles.cardBizRow}>
              <Ionicons name="storefront-outline" size={10} color="#64748B" />
              <Text style={styles.cardBizName} numberOfLines={1}>
                {(item as any).business_name}
              </Text>
              {(item as any).city && (
                <>
                  <Text style={styles.cardBizDot}>·</Text>
                  <Ionicons name="location-outline" size={9} color="#94A3B8" />
                  <Text style={styles.cardBizCity} numberOfLines={1}>
                    {(item as any).city}
                  </Text>
                </>
              )}
            </View>
          )}

          {/* Description */}
          {desc ? (
            <Text style={styles.cardDesc} numberOfLines={2}>
              {desc}
            </Text>
          ) : null}

          {/* Qty + MOQ chips */}
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

          {/* Divider */}
          <View style={styles.cardDivider} />

          {/* Price + CTA */}
          <View style={styles.cardFooter}>
            <View>
              <Text style={styles.cardPriceLabel}>PRICE</Text>
              <Text style={styles.cardPrice}>
                ₹{item.price}
                <Text style={styles.cardUnit}>/{item.unit}</Text>
              </Text>
            </View>
            <View style={styles.cardEnquireBtn}>
              <Ionicons name="arrow-forward" size={13} color="#fff" />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E90FF" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>
            {isApproved ? "Seller Hub" : "Products"}
          </Text>
          <Text style={styles.headerSubtitle}>
            {filteredProducts.length} products available
          </Text>
        </View>
        {isApproved && (
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => router.push("/pages/myProducts" as any)}
              style={styles.headerMyProductsBtn}
            >
              <Ionicons name="cube" size={15} color="#fff" />
              <Text style={styles.headerMyProductsText}>My Products</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/pages/addProduct" as any)}
              style={styles.headerAddBtn}
            >
              <Ionicons name="add" size={22} color="#1E90FF" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── Search Bar ── */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products, businesses..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94A3B8"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#1E90FF" />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      ) : error ? (
        <View style={styles.loaderContainer}>
          <Ionicons name="cloud-offline-outline" size={64} color="#CCC" />
          <Text style={styles.errorTitle}>Connection Error</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#1E90FF"]}
              tintColor="#1E90FF"
            />
          }
        >
          {/* ── Categories horizontal scroll ── */}
          {categories.length > 0 && (
            <View style={styles.catSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Categories</Text>
                <Text style={styles.sectionCount}>
                  {categories.length} total
                </Text>
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
                keyExtractor={(item) => item.id}
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
                            size={14}
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

          {/* ── Products grid ── */}
          {filteredProducts.length > 0 ? (
            <View style={styles.productsSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>
                  {selectedCategory
                    ? categories.find((c) => c.id === selectedCategory)?.name ||
                      "Category"
                    : "All Products"}
                </Text>
                <Text style={styles.sectionCount}>
                  {filteredProducts.length} items
                </Text>
              </View>
              <View style={styles.grid}>
                {filteredProducts.map((product) => (
                  <PremiumCard key={product.id} item={product} />
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="cube-outline" size={40} color="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>
                {searchQuery ? "No results found" : "No products yet"}
              </Text>
              <Text style={styles.emptySubtext}>
                {searchQuery
                  ? `No products match "${searchQuery}"`
                  : "Products will appear here once sellers post them"}
              </Text>
            </View>
          )}

          {/* ── Become Seller banner ── */}
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

          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F4F8" },

  /* Header */
  header: {
    backgroundColor: "#1E90FF",
    paddingTop: 52,
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 11,
    color: "rgba(255,255,255,0.72)",
    marginTop: 2,
    fontWeight: "500",
  },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerMyProductsBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 5,
  },
  headerMyProductsText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  headerAddBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },

  /* Search */
  searchWrapper: {
    backgroundColor: "#F0F4F8",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  searchContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    height: 44,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: "#1A1A1A" },

  /* Loader / Error */
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  loadingText: { marginTop: 12, fontSize: 14, color: "#94A3B8" },
  errorTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1A1A1A",
    marginTop: 16,
  },
  errorText: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    marginTop: 6,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: "#0078D7",
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  retryButtonText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  scrollView: { flex: 1 },

  /* Section headers */
  sectionHeaderRow: {
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
  sectionCount: { fontSize: 12, color: "#94A3B8", fontWeight: "600" },

  /* Categories */
  catSection: { paddingTop: 18, paddingBottom: 6 },
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
  catChipActive: {
    backgroundColor: "#0078D7",
    borderColor: "#0078D7",
  },
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

  /* Products grid */
  productsSection: { paddingTop: 18 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    justifyContent: "space-between",
  },

  /* ── Premium Card ── */
  premiumCard: {
    width: CARD_WIDTH,
    backgroundColor: "#fff",
    borderRadius: 18,
    marginBottom: 14,
    overflow: "hidden",
    shadowColor: "#1B4FBF",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 6,
    borderWidth: 1,
    borderColor: "rgba(0,120,215,0.07)",
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
    backgroundColor: "#F1F7FD",
    gap: 6,
  },
  cardImgPlaceholderText: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
  },
  activeBadge: {
    position: "absolute",
    top: 9,
    left: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.95)",
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
    backgroundColor: "rgba(0,0,0,0.42)",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  categoryOverlayText: {
    fontSize: 10,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
    letterSpacing: 0.2,
  },

  /* Card body */
  cardBody: { padding: 11 },
  cardName: {
    fontSize: 13,
    fontWeight: "700",
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
  cardDesc: {
    fontSize: 11,
    color: "#64748B",
    lineHeight: 15,
    marginBottom: 7,
    fontWeight: "400",
  },
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
  cardDivider: { height: 1, backgroundColor: "#F1F5F9", marginBottom: 8 },
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
  cardPrice: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0078D7",
    letterSpacing: -0.3,
  },
  cardUnit: { fontSize: 10, fontWeight: "500", color: "#94A3B8" },
  cardEnquireBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#0078D7",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0078D7",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },

  /* Empty */
  emptyState: {
    alignItems: "center",
    paddingVertical: 52,
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#334155" },
  emptySubtext: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 6,
    textAlign: "center",
    lineHeight: 19,
  },

  /* Become Seller banner */
  becomeSellerBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#DBEAFE",
    shadowColor: "#0078D7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  becomeSellerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: "#0078D7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  becomeSellerTitle: { fontSize: 15, fontWeight: "800", color: "#0F172A" },
  becomeSellerSub: { fontSize: 12, color: "#64748B", marginTop: 2 },
  becomeSellerArrow: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#EBF5FF",
    justifyContent: "center",
    alignItems: "center",
  },
});

export default SellerTab;

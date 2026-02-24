import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  RefreshControl,
  StatusBar,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import Constants from "expo-constants";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";

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

const SellerTab: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Seller-specific state
  const [sellerStatus, setSellerStatus] = useState<string | null>(null);

  // All products from all sellers
  const [allProducts, setAllProducts] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await AsyncStorage.getItem("token");
      if (!token) return;
      const headers = { Authorization: `Bearer ${token}` };

      // Check seller status
      let status = await AsyncStorage.getItem("sellerStatus");
      const normalizedStatus = status?.toLowerCase()?.trim() || null;
      const isApproved =
        normalizedStatus === "approved" ||
        normalizedStatus === "accepted" ||
        normalizedStatus === "active";
      setSellerStatus(isApproved ? "approved" : normalizedStatus);

      // Fetch categories and all companies in parallel
      const [catRes, companyRes] = await Promise.allSettled([
        axios.get(`${API_URL}/category/get/all`, { headers }),
        axios.get(`${API_URL}/company/get/approved/all`, { headers }),
      ]);

      if (catRes.status === "fulfilled") {
        setCategories(catRes.value.data?.categories || []);
      }

      // Get all approved companies, then fetch products from each
      let companies: any[] = [];
      if (companyRes.status === "fulfilled") {
        const compData =
          companyRes.value.data?.data?.companies ||
          companyRes.value.data?.data ||
          companyRes.value.data?.companies ||
          [];
        companies = Array.isArray(compData) ? compData : [];
      }

      // Fallback: try all companies and filter approved
      if (companies.length === 0) {
        try {
          const allRes = await axios.get(`${API_URL}/company/get/all`, { headers });
          const allData = allRes.data?.data?.companies || allRes.data?.data || [];
          companies = (Array.isArray(allData) ? allData : []).filter((c: any) => c.is_approved);
        } catch {}
      }

      // Fallback: try business endpoint
      if (companies.length === 0) {
        try {
          const bizRes = await axios.get(`${API_URL}/business/get/all`, { headers });
          const bizData = bizRes.data?.data?.businesses || bizRes.data?.businesses || bizRes.data?.data || [];
          companies = (Array.isArray(bizData) ? bizData : []).map((b: any) => ({
            company_id: b.id || b.business_id,
            company_name: b.name || b.business_name,
            company_profile_url: b.profile_image,
            company_city: b.city,
            company_state: b.state,
            is_verified: b.is_business_verified,
            is_approved: b.is_business_approved,
          }));
        } catch {}
      }

      // Fetch products from all companies
      let productsFromAll: any[] = [];
      await Promise.all(
        companies.map(async (company: any) => {
          try {
            const prodRes = await axios.get(
              `${API_URL}/product/get/company/${company.company_id}`,
              { headers }
            );
            const productsData =
              prodRes.data?.data?.products || prodRes.data?.data || [];
            const productsList = Array.isArray(productsData)
              ? productsData
              : [];
            const activeProducts = productsList
              .filter((p: any) => p.is_product_active)
              .map((p: any) => ({
                ...p,
                company_name: company.company_name,
                company_id: company.company_id,
                company_profile_url: company.company_profile_url,
                company_city: company.company_city,
                company_state: company.company_state,
                is_verified: company.is_verified,
                is_approved: company.is_approved,
              }));
            productsFromAll = [...productsFromAll, ...activeProducts];
          } catch {
            // Company may have no products
          }
        })
      );

      // Fetch images for products (limit to first 20 for performance)
      const productsWithImages = await Promise.all(
        productsFromAll.slice(0, 20).map(async (product: any) => {
          try {
            const imgRes = await axios.get(
              `${API_URL}/product/image/get/${product.product_id}`,
              { headers }
            );
            return {
              ...product,
              images: imgRes.data.data?.images || [],
            };
          } catch {
            return { ...product, images: [] };
          }
        })
      );

      // Add remaining products without images
      const remaining = productsFromAll.slice(20).map((p: any) => ({
        ...p,
        images: [],
      }));

      setAllProducts([...productsWithImages, ...remaining]);
    } catch (err: any) {
      console.error("Error loading data:", err);
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

  const handleCategoryPress = (category: Category) => {
    router.push({
      pathname: "/pages/specificCategory" as any,
      params: { id: category.id, name: category.name },
    });
  };

  const getProductImageUrl = (product: any): string | null => {
    if (product.images && product.images.length > 0) {
      const sorted = [...product.images].sort(
        (a: any, b: any) =>
          a.product_image_sequence_number - b.product_image_sequence_number
      );
      return getImageUri(sorted[0].product_image_url);
    }
    return null;
  };

  const isApproved = sellerStatus === "approved";

  // Filter products by search
  const filteredProducts = allProducts.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.product_name?.toLowerCase().includes(q) ||
      p.company_name?.toLowerCase().includes(q)
    );
  });

  // Group products by category
  const productsByCategory: { [key: string]: any[] } = {};
  filteredProducts.forEach((product) => {
    const catId = product.product_category_id || "uncategorized";
    if (!productsByCategory[catId]) {
      productsByCategory[catId] = [];
    }
    productsByCategory[catId].push(product);
  });

  const getCategoryName = (catId: string): string => {
    if (catId === "uncategorized") return "Other Products";
    const cat = categories.find((c) => c.id === catId);
    return cat?.name || "Products";
  };

  const renderCategoryItem = ({ item }: { item: Category }) => (
    <TouchableOpacity
      style={styles.categoryChip}
      onPress={() => handleCategoryPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.categoryChipIcon}>
        {item.category_image ? (
          <Image
            source={{ uri: getImageUri(item.category_image)! }}
            style={styles.categoryChipImage}
          />
        ) : (
          <Ionicons name="leaf-outline" size={18} color="#1E90FF" />
        )}
      </View>
      <Text style={styles.categoryChipText} numberOfLines={1}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderProductCard = (item: any) => {
    const imageUrl = getProductImageUrl(item);
    return (
      <TouchableOpacity
        key={item.product_id}
        style={styles.productGridCard}
        onPress={() =>
          router.push({
            pathname: "/pages/productDetail" as any,
            params: { product_id: item.product_id },
          })
        }
        activeOpacity={0.7}
      >
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.productGridImage} />
        ) : (
          <View style={[styles.productGridImage, styles.productImagePlaceholder]}>
            <Ionicons name="cube-outline" size={28} color="#CCC" />
          </View>
        )}
        <View style={styles.productGridInfo}>
          <Text style={styles.productGridName} numberOfLines={1}>
            {item.product_name}
          </Text>
          <Text style={styles.productGridPrice} numberOfLines={1}>
            {item.product_price}
          </Text>
          {item.company_name && (
            <View style={styles.productCompanyRow}>
              <Ionicons name="business-outline" size={11} color="#888" />
              <Text style={styles.productCompanyName} numberOfLines={1}>
                {item.company_name}
              </Text>
            </View>
          )}
          {/* Verification badge */}
          {item.is_verified ? (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={12} color="#28A745" />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          ) : (
            <View style={styles.notVerifiedBadge}>
              <Ionicons name="alert-circle" size={12} color="#DC3545" />
              <Text style={styles.notVerifiedText}>Not Verified</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E90FF" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {isApproved ? "Seller" : "Products"}
        </Text>
        {isApproved && (
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => router.push("/pages/myProducts" as any)}
              style={styles.headerMyProductsBtn}
            >
              <Ionicons name="cube" size={16} color="#FFFFFF" />
              <Text style={styles.headerMyProductsText}>My Products</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/pages/addProduct" as any)}
              style={styles.headerAddBtn}
            >
              <Ionicons name="add" size={20} color="#1E90FF" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products, sellers..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#1E90FF" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : error ? (
        <View style={styles.loaderContainer}>
          <Ionicons name="cloud-offline-outline" size={64} color="#CCC" />
          <Text style={styles.errorTitle}>Connection Error</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Ionicons name="refresh" size={18} color="#FFFFFF" />
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
            />
          }
        >
          {/* Categories Row */}
          {categories.length > 0 && (
            <View style={styles.categoriesSection}>
              <Text style={styles.sectionTitle}>Browse by Category</Text>
              <FlatList
                data={categories}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                renderItem={renderCategoryItem}
                contentContainerStyle={styles.categoriesRow}
              />
            </View>
          )}

          {/* All Products grouped by Category */}
          {Object.keys(productsByCategory).length > 0 ? (
            Object.keys(productsByCategory).map((catId) => (
              <View key={catId} style={styles.productCategorySection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>
                    {getCategoryName(catId)}
                  </Text>
                  <Text style={styles.productCountText}>
                    {productsByCategory[catId].length} products
                  </Text>
                </View>
                <View style={styles.productsGrid}>
                  {productsByCategory[catId]
                    .slice(0, 6)
                    .map((product) => renderProductCard(product))}
                </View>
                {productsByCategory[catId].length > 6 && (
                  <TouchableOpacity
                    style={styles.viewMoreBtn}
                    onPress={() => {
                      const cat = categories.find((c) => c.id === catId);
                      if (cat) handleCategoryPress(cat);
                    }}
                  >
                    <Text style={styles.viewMoreText}>
                      View All {productsByCategory[catId].length} Products
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color="#1E90FF"
                    />
                  </TouchableOpacity>
                )}
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="cube-outline" size={48} color="#CCC" />
              <Text style={styles.emptyTitle}>
                {searchQuery ? "No products found" : "No products yet"}
              </Text>
              <Text style={styles.emptySubtext}>
                {searchQuery
                  ? "Try a different search term"
                  : "Products will appear here once sellers post them"}
              </Text>
            </View>
          )}

          {/* Become Seller prompt for non-sellers */}
          {!isApproved && (
            <TouchableOpacity
              style={styles.becomeSellerBanner}
              onPress={() =>
                router.push("/pages/becomeSellerForm" as any)
              }
              activeOpacity={0.7}
            >
              <View style={styles.becomeSellerIcon}>
                <Ionicons name="storefront" size={24} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.becomeSellerTitle}>Become a Seller</Text>
                <Text style={styles.becomeSellerSubtitle}>
                  Register your business and start selling
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    backgroundColor: "#1E90FF",
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerMyProductsBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  headerMyProductsText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  headerAddBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  searchWrapper: {
    backgroundColor: "#1E90FF",
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  searchContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: "#333",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#666",
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 8,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: "#1E90FF",
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  // Categories
  categoriesSection: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  categoriesRow: {
    paddingHorizontal: 16,
    gap: 10,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  categoryChipIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#EBF5FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    overflow: "hidden",
  },
  categoryChipImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    maxWidth: 100,
  },
  // Product Category Section
  productCategorySection: {
    marginTop: 16,
    marginBottom: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  productCountText: {
    fontSize: 13,
    color: "#888",
    paddingHorizontal: 16,
  },
  // Products Grid
  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    justifyContent: "space-between",
  },
  productGridCard: {
    width: (width - 36) / 2,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  productGridImage: {
    width: "100%",
    height: 120,
    backgroundColor: "#F0F0F0",
  },
  productImagePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  productGridInfo: {
    padding: 10,
  },
  productGridName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  productGridPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: "#28A745",
    marginBottom: 4,
  },
  productCompanyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  productCompanyName: {
    fontSize: 11,
    color: "#888",
    flex: 1,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  verifiedText: {
    fontSize: 11,
    color: "#28A745",
    fontWeight: "600",
  },
  notVerifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FFF5F5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#FFDDDD",
  },
  notVerifiedText: {
    fontSize: 10,
    color: "#DC3545",
    fontWeight: "600",
  },
  viewMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    gap: 4,
  },
  viewMoreText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E90FF",
  },
  // Empty State
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: "#999",
    marginTop: 6,
    textAlign: "center",
  },
  // Become Seller Banner
  becomeSellerBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0078D7",
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
  },
  becomeSellerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  becomeSellerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  becomeSellerSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
});

export default SellerTab;

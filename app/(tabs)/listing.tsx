import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Dimensions,
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
import { useRouter } from "expo-router";
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
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const path = url.startsWith('/') ? url : `/${url}`;
  if (CLOUDFRONT_URL) return `${CLOUDFRONT_URL}${path}`;
  return `${S3_URL}${path}`;
};

const ListingsScreen: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [followedCompanyIds, setFollowedCompanyIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await AsyncStorage.getItem("token");
      if (!token) return;
      const headers = { Authorization: `Bearer ${token}` };
      const decoded: any = jwtDecode(token);
      const userId = decoded.user_id;

      // Fetch categories
      const catRes = await axios.get(`${API_URL}/category/get/all`, { headers });
      const cats = catRes.data?.categories || [];
      setCategories(cats);

      // Get followed companies
      let companyIds: string[] = [];
      try {
        const followingRes = await axios.get(
          `${API_URL}/company/followers/get/user/${userId}`,
          { headers }
        );
        const companies = followingRes.data?.data?.companies || followingRes.data?.data || [];
        companyIds = (Array.isArray(companies) ? companies : []).map(
          (c: any) => c.company_id
        );
      } catch {
        companyIds = [];
      }
      setFollowedCompanyIds(companyIds);

      // Fetch products from followed companies
      await fetchProductsFromFollowed(null, companyIds, headers);
    } catch (error: any) {
      console.error("Error loading data:", error);
      setError("Unable to load products. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchProductsFromFollowed = async (
    categoryId: string | null,
    companyIds: string[],
    headers?: any
  ) => {
    try {
      if (!headers) {
        const token = await AsyncStorage.getItem("token");
        headers = { Authorization: `Bearer ${token}` };
      }

      if (companyIds.length === 0) {
        setProducts([]);
        return;
      }

      let allProducts: any[] = [];

      if (categoryId) {
        try {
          const res = await axios.get(
            `${API_URL}/product/get/category/${categoryId}`,
            { headers }
          );
          const productsData = res.data.data?.products || res.data.data || [];
          allProducts = (Array.isArray(productsData) ? productsData : []).filter(
            (p: any) => p.is_product_active && companyIds.includes(p.company_id)
          );
        } catch (err: any) {
          if (err.response?.status !== 404) throw err;
        }
      } else {
        await Promise.all(
          companyIds.map(async (companyId: string) => {
            try {
              const res = await axios.get(
                `${API_URL}/product/get/company/${companyId}`,
                { headers }
              );
              const productsData = res.data?.data?.products || res.data?.data || [];
              const active = (Array.isArray(productsData) ? productsData : []).filter(
                (p: any) => p.is_product_active
              );
              allProducts = [...allProducts, ...active];
            } catch {
              // Company may have no products
            }
          })
        );
      }

      // Fetch images for products
      const productsWithImages = await Promise.all(
        allProducts.map(async (product: any) => {
          try {
            const imgRes = await axios.get(
              `${API_URL}/product/image/get/${product.product_id}`,
              { headers }
            );
            return { ...product, images: imgRes.data.data?.images || [] };
          } catch {
            return { ...product, images: [] };
          }
        })
      );

      setProducts(productsWithImages);
    } catch (error: any) {
      if (error.response?.status === 404) {
        setProducts([]);
      } else {
        console.error("Error fetching products:", error);
      }
    }
  };

  const handleCategorySelect = async (categoryId: string | null) => {
    setSelectedCategory(categoryId);
    setLoading(true);
    await fetchProductsFromFollowed(categoryId, followedCompanyIds);
    setLoading(false);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  }, []);

  const getProductImageUrl = (product: any): string | null => {
    if (product.images && product.images.length > 0) {
      const sorted = [...product.images].sort(
        (a: any, b: any) => a.product_image_sequence_number - b.product_image_sequence_number
      );
      return getImageUri(sorted[0].product_image_url);
    }
    return null;
  };

  const filteredProducts = products.filter((product) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      product.product_name?.toLowerCase().includes(query) ||
      product.product_description?.toLowerCase().includes(query)
    );
  });

  const handleProductPress = (product: any) => {
    router.push({
      pathname: "/pages/productDetail" as any,
      params: { product_id: product.product_id },
    });
  };

  const renderProductCard = (product: any, index: number) => {
    const imageUrl = getProductImageUrl(product);

    return (
      <TouchableOpacity
        key={product.product_id}
        style={styles.productCard}
        onPress={() => handleProductPress(product)}
        activeOpacity={0.7}
      >
        <View style={styles.productImageContainer}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.productImage} resizeMode="cover" />
          ) : (
            <View style={styles.productImagePlaceholder}>
              <Ionicons name="cube-outline" size={32} color="#CCC" />
            </View>
          )}
        </View>
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {product.product_name}
          </Text>
          <Text style={styles.productQty} numberOfLines={1}>
            Qty: {product.product_quantity}
          </Text>
          <Text style={styles.productPrice} numberOfLines={1}>
            {product.product_price}
          </Text>
          <TouchableOpacity style={styles.enquireButton}>
            <Text style={styles.enquireButtonText}>Enquire</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E90FF" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Products</Text>
        {products.length > 0 && (
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{filteredProducts.length}</Text>
          </View>
        )}
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
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

      {/* Category Filter Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        <TouchableOpacity
          style={[
            styles.categoryPill,
            selectedCategory === null && styles.categoryPillActive,
          ]}
          onPress={() => handleCategorySelect(null)}
        >
          <Text
            style={[
              styles.categoryText,
              selectedCategory === null && styles.categoryTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryPill,
              selectedCategory === category.id && styles.categoryPillActive,
            ]}
            onPress={() => handleCategorySelect(category.id)}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategory === category.id && styles.categoryTextActive,
              ]}
            >
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
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
          <TouchableOpacity style={styles.retryButton} onPress={loadInitialData}>
            <Ionicons name="refresh" size={18} color="#FFFFFF" />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : followedCompanyIds.length === 0 ? (
        <View style={styles.loaderContainer}>
          <Ionicons name="people-outline" size={64} color="#CCC" />
          <Text style={styles.emptyTitle}>No Followed Companies</Text>
          <Text style={styles.emptySubtext}>
            Follow companies from the Seller Directory to see their products here
          </Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => router.push("/pages/sellerDirectory" as any)}
          >
            <Ionicons name="search-outline" size={18} color="#FFFFFF" />
            <Text style={styles.browseButtonText}>Browse Sellers</Text>
          </TouchableOpacity>
        </View>
      ) : filteredProducts.length === 0 ? (
        <View style={styles.loaderContainer}>
          <Ionicons name="cube-outline" size={64} color="#CCC" />
          <Text style={styles.emptyTitle}>No Products Found</Text>
          <Text style={styles.emptySubtext}>
            {searchQuery ? "Try a different search term" : "No products available in this category from followed companies"}
          </Text>
          {searchQuery ? (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => setSearchQuery("")}
            >
              <Text style={styles.clearButtonText}>Clear Search</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : (
        <ScrollView
          style={styles.productsScrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.productsContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#1E90FF"]} />
          }
        >
          <Text style={styles.resultCount}>
            {filteredProducts.length} product{filteredProducts.length !== 1 ? "s" : ""} found
          </Text>
          <View style={styles.productsGrid}>
            {filteredProducts.map((product, index) => renderProductCard(product, index))}
          </View>
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
  headerBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  headerBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  searchWrapper: {
    backgroundColor: "#1E90FF",
    paddingHorizontal: 16,
    paddingBottom: 12,
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
  categoriesContainer: {
    maxHeight: 56,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  categoriesContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: "center",
  },
  categoryPill: {
    height: 36,
    paddingHorizontal: 18,
    justifyContent: "center",
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#1E90FF",
    marginRight: 8,
    backgroundColor: "#FFFFFF",
  },
  categoryPillActive: {
    backgroundColor: "#1E90FF",
  },
  categoryText: {
    fontSize: 13,
    color: "#1E90FF",
    fontWeight: "600",
  },
  categoryTextActive: {
    color: "#FFFFFF",
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
    lineHeight: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
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
  browseButton: {
    marginTop: 20,
    backgroundColor: "#1E90FF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  browseButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  clearButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1E90FF",
  },
  clearButtonText: {
    color: "#1E90FF",
    fontSize: 14,
    fontWeight: "600",
  },
  productsScrollView: {
    flex: 1,
  },
  productsContent: {
    paddingBottom: 100,
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  resultCount: {
    fontSize: 13,
    color: "#888",
    paddingHorizontal: 4,
    marginBottom: 12,
    fontWeight: "500",
  },
  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  productCard: {
    width: (width - 36) / 2,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    overflow: "hidden",
    elevation: 2,
  },
  productImageContainer: {
    width: "100%",
    height: 140,
    backgroundColor: "#F0F4F8",
  },
  productImage: {
    width: "100%",
    height: 140,
  },
  productImagePlaceholder: {
    width: "100%",
    height: 140,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
  },
  productInfo: {
    padding: 10,
  },
  productName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 4,
    lineHeight: 18,
  },
  productQty: {
    fontSize: 12,
    color: "#888",
    marginBottom: 2,
  },
  productPrice: {
    fontSize: 15,
    color: "#28A745",
    fontWeight: "700",
    marginBottom: 8,
  },
  enquireButton: {
    backgroundColor: "#1E90FF",
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  enquireButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
});

export default ListingsScreen;

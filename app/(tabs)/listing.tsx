import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
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
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");

const API_URL = Constants.expoConfig?.extra?.API_URL;
const S3_URL = Constants.expoConfig?.extra?.S3_FETCH_URL;

const getImageUri = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${S3_URL}/${url}`;
};

const ListingsScreen: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await AsyncStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch categories
      const catRes = await axios.get(`${API_URL}/category/get/complete/all`, { headers });
      const cats = catRes.data.data?.categories || [];
      setCategories(cats);

      // Fetch all products
      await fetchProducts(null, headers);
    } catch (error: any) {
      console.error("Error loading data:", error);
      setError("Unable to load products. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async (categoryId: string | null, headers?: any) => {
    try {
      if (!headers) {
        const token = await AsyncStorage.getItem("token");
        headers = { Authorization: `Bearer ${token}` };
      }

      let endpoint = `${API_URL}/product/get/all`;
      if (categoryId) {
        endpoint = `${API_URL}/product/get/category/${categoryId}`;
      }

      const res = await axios.get(endpoint, { headers });
      const productsData = res.data.data?.products || res.data.data || [];

      // Fetch images for products
      const productsWithImages = await Promise.all(
        (Array.isArray(productsData) ? productsData : [])
          .filter((p: any) => p.is_product_active)
          .map(async (product: any) => {
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
    await fetchProducts(categoryId);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProducts(selectedCategory);
    setRefreshing(false);
  };

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

  const renderProductCard = (product: any) => {
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
          <Text style={styles.productName} numberOfLines={1}>
            {product.product_name}
          </Text>
          <View style={styles.productBottom}>
            <View>
              <Text style={styles.productQty}>Qty: {product.product_quantity}</Text>
              <Text style={styles.productPrice}>
                Price: {product.product_price}
              </Text>
            </View>
            <TouchableOpacity style={styles.enquireButton}>
              <Text style={styles.enquireButtonText}>Enquire</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Products</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
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
            key={category.category_id}
            style={[
              styles.categoryPill,
              selectedCategory === category.category_id && styles.categoryPillActive,
            ]}
            onPress={() => handleCategorySelect(category.category_id)}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategory === category.category_id && styles.categoryTextActive,
              ]}
            >
              {category.category_name}
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
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadInitialData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filteredProducts.length === 0 ? (
        <View style={styles.loaderContainer}>
          <Ionicons name="cube-outline" size={64} color="#CCC" />
          <Text style={styles.emptyText}>No products found</Text>
          <Text style={styles.emptySubtext}>
            {searchQuery ? "Try a different search term" : "No products available in this category"}
          </Text>
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
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.productsHorizontalContent}
          >
            {filteredProducts.map((product) => renderProductCard(product))}
          </ScrollView>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    backgroundColor: "#1E90FF",
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  searchContainer: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: "#333",
  },
  categoriesContainer: {
    maxHeight: 80,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  categoryPill: {
    height: 40,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1E90FF",
    marginRight: 10,
    marginTop: 12,
    backgroundColor: "#FFFFFF",
  },
  categoryPillActive: {
    backgroundColor: "#1E90FF",
  },
  categoryText: {
    fontSize: 14,
    color: "#1E90FF",
    fontWeight: "500",
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
    fontSize: 16,
    color: "#666",
  },
  errorText: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    marginTop: 16,
    lineHeight: 22,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: "#1E90FF",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  productsScrollView: {
    flex: 1,
  },
  productsContent: {
    paddingBottom: 100,
  },
  resultCount: {
    fontSize: 14,
    color: "#888",
    paddingHorizontal: 16,
    marginBottom: 12,
    fontWeight: "500",
  },
  productsHorizontalContent: {
    paddingHorizontal: 16,
    paddingRight: 16,
  },
  productCard: {
    width: 250,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginRight: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: "hidden",
    elevation: 3,
  },
  productImageContainer: {
    width: "100%",
    height: 120,
    backgroundColor: "#F0F0F0",
  },
  productImage: {
    width: "100%",
    height: 120,
    backgroundColor: "#E0E0E0",
  },
  productImagePlaceholder: {
    width: "100%",
    height: 120,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
  },
  productBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 6,
  },
  productQty: {
    fontSize: 13,
    color: "#666",
  },
  productPrice: {
    fontSize: 13,
    color: "#28A745",
    fontWeight: "600",
    marginBottom: 10,
  },
  enquireButton: {
    backgroundColor: "#1E90FF",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginLeft: 12,
    marginBottom: 12,
  },
  enquireButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});

export default ListingsScreen;

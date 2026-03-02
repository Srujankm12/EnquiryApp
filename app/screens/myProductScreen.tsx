import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Constants from "expo-constants";
import { router, useFocusEffect } from "expo-router";
import { jwtDecode } from "jwt-decode";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
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

interface Product {
  id: string;
  business_id?: string;
  category_id?: string;
  sub_category_id?: string;
  name: string;
  description: string;
  quantity: number;
  unit: string;
  price: number;
  moq: string;
  product_images?: any[];
  is_product_active: boolean;
  created_at: string;
  updated_at: string;
}

const MyProductsScreen: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [togglingStatus, setTogglingStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchProducts();
    }, []),
  );

  const fetchProducts = async () => {
    console.log("📦 [FetchProducts] Starting...");
    try {
      setError(null);
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Session Expired", "Please login again to continue.");
        router.replace("/pages/loginMail" as any);
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };
      let businessId = await AsyncStorage.getItem("companyId");

      if (!businessId) {
        try {
          const decoded: any = jwtDecode(token);
          if (decoded.business_id) {
            businessId = decoded.business_id;
            await AsyncStorage.setItem("companyId", businessId!);
          }
        } catch {
          // User may not have a business
        }
      }

      console.log("📦 [FetchProducts] business_id:", businessId);

      if (!businessId) {
        console.warn(
          "📦 [FetchProducts] No business ID found — returning empty.",
        );
        setProducts([]);
        return;
      }

      const url = `${API_URL}/product/get/business/${businessId}`;
      console.log("📦 [FetchProducts] GET", url);

      const res = await axios.get(url, { headers });
      console.log("📦 [FetchProducts] Response status:", res.status);
      console.log(
        "📦 [FetchProducts] Raw response:",
        JSON.stringify(res.data, null, 2),
      );

      const productsData = res.data?.products || [];
      console.log(
        "📦 [FetchProducts] ✅ Loaded",
        productsData.length,
        "products.",
      );

      // Log active/inactive breakdown
      const active = productsData.filter((p: Product) => p.is_product_active);
      const inactive = productsData.filter(
        (p: Product) => !p.is_product_active,
      );
      console.log(
        "📦 [FetchProducts] Active:",
        active.length,
        "| Inactive:",
        inactive.length,
      );

      setProducts(Array.isArray(productsData) ? productsData : []);
    } catch (error: any) {
      console.error(
        "📦 [FetchProducts] ❌ Error:",
        error?.response?.status,
        error?.message,
      );
      if (error.response?.status === 404) {
        setProducts([]);
      } else {
        setError("Unable to load your products. Please try again.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      console.log("📦 [FetchProducts] Done.");
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProducts();
  };

  const handleBack = () => router.back();

  const handleViewProduct = (product: Product) => {
    router.push({
      pathname: "/pages/productDetail" as any,
      params: { product_id: product.id },
    });
  };

  const handleEditProduct = (product: Product) => {
    router.push({
      pathname: "/pages/editProduct" as any,
      params: { product_id: product.id },
    });
  };

  const handleAddProduct = () => {
    router.push("/pages/addProduct");
  };

  const handleToggleStatus = async (product: Product) => {
    const newStatus = !product.is_product_active;

    console.log("🔄 [ToggleStatus] ─────────────────────────────────");
    console.log("🔄 [ToggleStatus] Product ID  :", product.id);
    console.log("🔄 [ToggleStatus] Product Name:", product.name);
    console.log(
      "🔄 [ToggleStatus] Current is_product_active:",
      product.is_product_active,
    );
    console.log("🔄 [ToggleStatus] Sending  is_product_active:", newStatus);

    try {
      setTogglingStatus(product.id);
      const token = await AsyncStorage.getItem("token");
      console.log("🔄 [ToggleStatus] Token present:", !!token);

      const url = `${API_URL}/product/update/status/${product.id}`;
      const payload = { is_product_active: newStatus };

      console.log("🔄 [ToggleStatus] PATCH", url);
      console.log(
        "🔄 [ToggleStatus] Payload:",
        JSON.stringify(payload, null, 2),
      );

      const res = await axios.patch(url, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log("🔄 [ToggleStatus] ✅ Response status:", res.status);
      console.log(
        "🔄 [ToggleStatus] ✅ Response data:",
        JSON.stringify(res.data, null, 2),
      );

      // Optimistically update local state
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, is_product_active: newStatus } : p,
        ),
      );
      console.log(
        "🔄 [ToggleStatus] ✅ Local state updated — product now:",
        newStatus ? "ACTIVE" : "INACTIVE",
      );

      Alert.alert(
        "Status Updated",
        `Product "${product.name}" is now ${newStatus ? "active" : "inactive"}.`,
      );
    } catch (error: any) {
      console.error("🔄 [ToggleStatus] ❌ Error toggling status:");
      console.error(
        "🔄 [ToggleStatus]   response status:",
        error?.response?.status,
      );
      console.error(
        "🔄 [ToggleStatus]   response data  :",
        JSON.stringify(error?.response?.data, null, 2),
      );
      console.error("🔄 [ToggleStatus]   message        :", error?.message);
      Alert.alert(
        "Error",
        error.response?.data?.error || "Failed to update product status.",
      );
    } finally {
      setTogglingStatus(null);
      console.log("🔄 [ToggleStatus] ─────────────────────────────────");
    }
  };

  const handleDeleteProduct = (product: Product) => {
    Alert.alert(
      "Delete Product",
      `Are you sure you want to delete "${product.name}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            console.log("🗑️ [DeleteProduct] Deleting product ID:", product.id);
            try {
              const token = await AsyncStorage.getItem("token");
              const url = `${API_URL}/product/delete/${product.id}`;
              console.log("🗑️ [DeleteProduct] DELETE", url);

              const res = await axios.delete(url, {
                headers: { Authorization: `Bearer ${token}` },
              });
              console.log("🗑️ [DeleteProduct] ✅ Response status:", res.status);

              setProducts((prev) => prev.filter((p) => p.id !== product.id));
              Alert.alert("Deleted", "Product has been removed successfully.");
            } catch (error: any) {
              console.error(
                "🗑️ [DeleteProduct] ❌ Error:",
                error?.response?.status,
                error?.response?.data,
              );
              Alert.alert(
                "Error",
                error.response?.data?.error || "Failed to delete product.",
              );
            }
          },
        },
      ],
    );
  };

  const getProductImageUrl = (product: Product): string | null => {
    if (product.product_images && product.product_images.length > 0) {
      return getImageUri(product.product_images[0].image);
    }
    return null;
  };

  const activeProducts = products.filter((p) => p.is_product_active);
  const inactiveProducts = products.filter((p) => !p.is_product_active);

  const filteredActiveProducts = activeProducts.filter(
    (product) =>
      product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredInactiveProducts = inactiveProducts.filter(
    (product) =>
      product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const renderProductCard = (product: Product) => {
    const imageUrl = getProductImageUrl(product);
    const isToggling = togglingStatus === product.id;

    return (
      <View
        key={product.id}
        style={[
          styles.productCard,
          !product.is_product_active && styles.productCardInactive,
        ]}
      >
        <View style={styles.cardContent}>
          <View style={styles.imageWrapper}>
            {imageUrl ? (
              <Image
                source={{ uri: imageUrl }}
                style={[
                  styles.productImage,
                  !product.is_product_active && styles.productImageInactive,
                ]}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.productImage, styles.imagePlaceholder]}>
                <Ionicons name="cube-outline" size={32} color="#CCC" />
              </View>
            )}
            {!product.is_product_active && <View style={styles.imageOverlay} />}
          </View>

          <View style={styles.productInfo}>
            <Text
              style={[
                styles.productName,
                !product.is_product_active && styles.textInactive,
              ]}
              numberOfLines={1}
            >
              {product.name}
            </Text>
            <Text
              style={[
                styles.productQty,
                !product.is_product_active && styles.textInactive,
              ]}
              numberOfLines={1}
            >
              Qty: {product.quantity} {product.unit}
            </Text>
            <Text
              style={[
                styles.productPrice,
                !product.is_product_active && styles.textInactive,
              ]}
              numberOfLines={1}
            >
              Rs {product.price}/{product.unit}
            </Text>
            <Text
              style={[
                styles.productMoq,
                !product.is_product_active && styles.textInactive,
              ]}
              numberOfLines={1}
            >
              MOQ: {product.moq}
            </Text>

            <View style={styles.statusToggle}>
              <Text style={styles.statusLabel}>
                {product.is_product_active ? "Active" : "Inactive"}
              </Text>
              {isToggling ? (
                <ActivityIndicator size="small" color="#177DDF" />
              ) : (
                <Switch
                  value={product.is_product_active}
                  onValueChange={() => handleToggleStatus(product)}
                  trackColor={{ false: "#E0E0E0", true: "#A8D5FF" }}
                  thumbColor={product.is_product_active ? "#177DDF" : "#999"}
                />
              )}
            </View>
          </View>

          <View style={styles.actionsColumn}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleViewProduct(product)}
            >
              <Ionicons name="eye-outline" size={20} color="#0078D7" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleEditProduct(product)}
            >
              <Ionicons name="create-outline" size={20} color="#28A745" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDeleteProduct(product)}
            >
              <Ionicons name="trash-outline" size={20} color="#DC3545" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#177DDF"
        translucent={false}
      />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Products</Text>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{products.length}</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={20}
          color="#999"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search your products..."
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

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#177DDF" />
          <Text style={styles.loadingText}>Loading your products...</Text>
        </View>
      ) : error ? (
        <View style={styles.loaderContainer}>
          <Ionicons name="cloud-offline-outline" size={64} color="#CCC" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchProducts}>
            <Text style={styles.retryButtonText}>Retry</Text>
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
              colors={["#177DDF"]}
              tintColor="#177DDF"
            />
          }
        >
          {filteredActiveProducts.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Active</Text>
                <View style={styles.sectionBadge}>
                  <Text style={styles.sectionBadgeText}>
                    {filteredActiveProducts.length}
                  </Text>
                </View>
              </View>
              {filteredActiveProducts.map((product) =>
                renderProductCard(product),
              )}
            </View>
          )}

          {filteredInactiveProducts.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: "#999" }]}>
                  Inactive
                </Text>
                <View
                  style={[styles.sectionBadge, { backgroundColor: "#F0F0F0" }]}
                >
                  <Text style={[styles.sectionBadgeText, { color: "#999" }]}>
                    {filteredInactiveProducts.length}
                  </Text>
                </View>
              </View>
              {filteredInactiveProducts.map((product) =>
                renderProductCard(product),
              )}
            </View>
          )}

          {filteredActiveProducts.length === 0 &&
            filteredInactiveProducts.length === 0 && (
              <View style={styles.emptyContainer}>
                <Ionicons name="cube-outline" size={64} color="#CCC" />
                <Text style={styles.emptyText}>No products found</Text>
                <Text style={styles.emptySubtext}>
                  {searchQuery.length > 0
                    ? "Try adjusting your search"
                    : "Add your first product to start selling"}
                </Text>
                {searchQuery.length === 0 && (
                  <TouchableOpacity
                    style={styles.addFirstButton}
                    onPress={handleAddProduct}
                  >
                    <Ionicons
                      name="add-circle-outline"
                      size={20}
                      color="#FFFFFF"
                    />
                    <Text style={styles.addFirstButtonText}>Add Product</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

          <View style={styles.bottomPadding} />
        </ScrollView>
      )}

      <TouchableOpacity
        style={styles.floatingButton}
        onPress={handleAddProduct}
      >
        <Ionicons name="add" size={30} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  header: {
    backgroundColor: "#177DDF",
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: { marginRight: 16 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: "600", color: "#FFFFFF" },
  headerBadge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  headerBadgeText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  searchContainer: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
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
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: "#333" },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  loadingText: { marginTop: 12, fontSize: 16, color: "#666" },
  errorText: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    marginTop: 16,
    lineHeight: 22,
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: "#177DDF",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
  scrollView: { flex: 1 },
  section: { marginBottom: 20 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#000" },
  sectionBadge: {
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
  },
  sectionBadgeText: { fontSize: 13, fontWeight: "700", color: "#0078D7" },
  productCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  productCardInactive: {
    backgroundColor: "#FAFAFA",
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  cardContent: { flexDirection: "row", padding: 12, alignItems: "center" },
  imageWrapper: { position: "relative" },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: "#E0E0E0",
  },
  productImageInactive: { opacity: 0.5 },
  imagePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
  },
  imageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
    borderRadius: 10,
  },
  productInfo: { flex: 1, marginLeft: 12, marginRight: 8 },
  productName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  productQty: { fontSize: 13, color: "#666", marginBottom: 2 },
  productPrice: {
    fontSize: 13,
    color: "#28A745",
    fontWeight: "600",
    marginBottom: 2,
  },
  productMoq: { fontSize: 12, color: "#888", marginBottom: 6 },
  textInactive: { color: "#AAAAAA" },
  statusToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusLabel: { fontSize: 12, color: "#888" },
  actionsColumn: { gap: 8 },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyText: { fontSize: 18, fontWeight: "600", color: "#666", marginTop: 16 },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
  },
  addFirstButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#177DDF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
    gap: 8,
  },
  addFirstButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
  bottomPadding: { height: 100 },
  floatingButton: {
    position: "absolute",
    bottom: 40,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#177DDF",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});

export default MyProductsScreen;

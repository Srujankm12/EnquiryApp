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
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [togglingStatus, setTogglingStatus] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => { fetchProducts(); }, []);

  useFocusEffect(useCallback(() => { fetchProducts(); }, []));

  const fetchProducts = async () => {
    try {
      setError(null);
      const token = await AsyncStorage.getItem("token");
      if (!token) { Alert.alert("Session Expired", "Please login again."); router.replace("/pages/loginMail" as any); return; }
      const headers = { Authorization: `Bearer ${token}` };
      let businessId = await AsyncStorage.getItem("companyId");
      if (!businessId) {
        try {
          const decoded: any = jwtDecode(token);
          if (decoded.business_id) { businessId = decoded.business_id; await AsyncStorage.setItem("companyId", businessId!); }
        } catch { }
      }
      if (!businessId) { setProducts([]); return; }
      const res = await axios.get(`${API_URL}/product/get/business/${businessId}`, { headers });
      const productsData = res.data?.products || [];
      setProducts(Array.isArray(productsData) ? productsData : []);
    } catch (error: any) {
      if (error.response?.status === 404) setProducts([]);
      else setError("Unable to load your products. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => { setRefreshing(true); await fetchProducts(); };
  const handleBack = () => router.back();
  const handleViewProduct = (product: Product) => router.push({ pathname: "/pages/productDetail" as any, params: { product_id: product.id } });
  const handleEditProduct = (product: Product) => router.push({ pathname: "/pages/editProduct" as any, params: { product_id: product.id } });
  const handleAddProduct = () => router.push("/pages/addProduct");

  const handleToggleStatus = async (product: Product) => {
    const newStatus = !product.is_product_active;
    try {
      setTogglingStatus(product.id);
      const token = await AsyncStorage.getItem("token");
      await axios.patch(`${API_URL}/product/update/status/${product.id}`, { is_product_active: newStatus }, { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
      setProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, is_product_active: newStatus } : p));
      Alert.alert("Status Updated", `"${product.name}" is now ${newStatus ? "active" : "inactive"}.`);
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.error || "Failed to update product status.");
    } finally {
      setTogglingStatus(null);
    }
  };

  const handleDeleteProduct = (product: Product) => {
    Alert.alert("Delete Product", `Are you sure you want to delete "${product.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem("token");
            await axios.delete(`${API_URL}/product/delete/${product.id}`, { headers: { Authorization: `Bearer ${token}` } });
            setProducts((prev) => prev.filter((p) => p.id !== product.id));
            Alert.alert("Deleted", "Product has been removed successfully.");
          } catch (error: any) {
            Alert.alert("Error", error.response?.data?.error || "Failed to delete product.");
          }
        },
      },
    ]);
  };

  const getProductImageUrl = (product: Product): string | null => {
    if (product.product_images && product.product_images.length > 0) {
      const img = product.product_images[0];
      // Try multiple field names the API might use
      const rawUrl = img.image || img.image_url || img.url || img.product_image || null;
      return getImageUri(rawUrl);
    }
    return null;
  };

  const activeProducts = products.filter((p) => p.is_product_active);
  const inactiveProducts = products.filter((p) => !p.is_product_active);

  const filteredActive = activeProducts.filter((p) =>
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredInactive = inactiveProducts.filter((p) =>
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderGridCard = (product: Product) => {
    const imageUrl = getProductImageUrl(product);
    const isToggling = togglingStatus === product.id;
    return (
      <TouchableOpacity
        key={product.id}
        style={[styles.gridCard, !product.is_product_active && styles.gridCardInactive]}
        onPress={() => handleViewProduct(product)}
        activeOpacity={0.88}
      >
        <View style={styles.gridAccent} />
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={[styles.gridImage, !product.is_product_active && styles.imageInactive]} resizeMode="cover" />
        ) : (
          <View style={styles.gridImagePlaceholder}>
            <Ionicons name="cube-outline" size={28} color="#CBD5E1" />
          </View>
        )}
        <View style={styles.gridCardBody}>
          <Text style={[styles.gridProductName, !product.is_product_active && { color: '#94A3B8' }]} numberOfLines={2}>{product.name}</Text>
          {product.price > 0 && (
            <Text style={[styles.gridProductPrice, !product.is_product_active && { color: '#94A3B8' }]}>₹{product.price}/{product.unit}</Text>
          )}
          {product.moq && <Text style={styles.gridProductMoq}>MOQ: {product.moq}</Text>}

          <View style={styles.gridCardFooter}>
            <View style={styles.gridToggleRow}>
              {isToggling ? (
                <ActivityIndicator size="small" color="#0078D7" />
              ) : (
                <Switch
                  value={product.is_product_active}
                  onValueChange={() => handleToggleStatus(product)}
                  trackColor={{ false: "#E2E8F0", true: "#93C5FD" }}
                  thumbColor={product.is_product_active ? "#0078D7" : "#94A3B8"}
                  style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                />
              )}
            </View>
            <View style={styles.gridCardActions}>
              <TouchableOpacity style={styles.gridActionBtn} onPress={() => handleEditProduct(product)}>
                <Ionicons name="create-outline" size={14} color="#16A34A" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.gridActionBtn, { backgroundColor: '#FEF2F2' }]} onPress={() => handleDeleteProduct(product)}>
                <Ionicons name="trash-outline" size={14} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderListCard = (product: Product) => {
    const imageUrl = getProductImageUrl(product);
    const isToggling = togglingStatus === product.id;
    return (
      <View key={product.id} style={[styles.listCard, !product.is_product_active && styles.listCardInactive]}>
        <View style={styles.listCardAccent} />
        <View style={styles.listCardContent}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={[styles.listImage, !product.is_product_active && styles.imageInactive]} resizeMode="cover" />
          ) : (
            <View style={styles.listImagePlaceholder}>
              <Ionicons name="cube-outline" size={24} color="#CBD5E1" />
            </View>
          )}
          <View style={styles.listInfo}>
            <Text style={[styles.listName, !product.is_product_active && { color: '#94A3B8' }]} numberOfLines={1}>{product.name}</Text>
            <Text style={styles.listQty} numberOfLines={1}>Qty: {product.quantity} {product.unit}</Text>
            {product.price > 0 && <Text style={[styles.listPrice, !product.is_product_active && { color: '#94A3B8' }]}>₹{product.price}/{product.unit}</Text>}
            {product.moq && <Text style={styles.listMoq}>MOQ: {product.moq}</Text>}
          </View>
          <View style={styles.listActions}>
            <TouchableOpacity style={styles.listActionBtn} onPress={() => handleViewProduct(product)}>
              <Ionicons name="eye-outline" size={16} color="#0078D7" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.listActionBtn, { backgroundColor: '#DCFCE7' }]} onPress={() => handleEditProduct(product)}>
              <Ionicons name="create-outline" size={16} color="#16A34A" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.listActionBtn, { backgroundColor: '#FEF2F2' }]} onPress={() => handleDeleteProduct(product)}>
              <Ionicons name="trash-outline" size={16} color="#EF4444" />
            </TouchableOpacity>
            {isToggling ? (
              <ActivityIndicator size="small" color="#0078D7" />
            ) : (
              <Switch
                value={product.is_product_active}
                onValueChange={() => handleToggleStatus(product)}
                trackColor={{ false: "#E2E8F0", true: "#93C5FD" }}
                thumbColor={product.is_product_active ? "#0078D7" : "#94A3B8"}
                style={{ transform: [{ scaleX: 0.75 }, { scaleY: 0.75 }] }}
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  const allFiltered = [...filteredActive, ...filteredInactive];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0060B8" />

      {/* ── Premium Header ── */}
      <View style={[styles.headerWrapper, { paddingTop: insets.top }]}>
        <View style={styles.orb1} /><View style={styles.orb2} /><View style={styles.orb3} />
        <View style={styles.headerInner}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.eyebrow}>CATALOGUE</Text>
            <Text style={styles.headerTitle}>My Products</Text>
          </View>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{products.length}</Text>
          </View>
        </View>

        {/* Search */}
        <View style={[styles.searchWrap, searchFocused && styles.searchWrapFocused]}>
          <View style={styles.searchIconCircle}>
            <Ionicons name="search-outline" size={14} color="#0078D7" />
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity style={styles.searchClearBtn} onPress={() => setSearchQuery("")}>
              <Ionicons name="close" size={14} color="#0078D7" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Stats Strip ── */}
      {!loading && (
        <View style={styles.statsStrip}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{products.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#16A34A' }]}>{activeProducts.length}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#94A3B8' }]}>{inactiveProducts.length}</Text>
            <Text style={styles.statLabel}>Inactive</Text>
          </View>
          <View style={styles.statDivider} />
          {/* View mode toggle */}
          <View style={styles.viewToggle}>
            <TouchableOpacity style={[styles.viewToggleBtn, viewMode === 'grid' && styles.viewToggleBtnActive]} onPress={() => setViewMode('grid')}>
              <Ionicons name="grid-outline" size={16} color={viewMode === 'grid' ? '#0078D7' : '#94A3B8'} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.viewToggleBtn, viewMode === 'list' && styles.viewToggleBtnActive]} onPress={() => setViewMode('list')}>
              <Ionicons name="list-outline" size={16} color={viewMode === 'list' ? '#0078D7' : '#94A3B8'} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.loaderContainer}>
          <View style={styles.loaderCard}>
            <ActivityIndicator size="large" color="#0078D7" />
            <Text style={styles.loaderText}>Loading your products...</Text>
          </View>
        </View>
      ) : error ? (
        <View style={styles.loaderContainer}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="cloud-offline-outline" size={30} color="#0078D7" />
          </View>
          <Text style={styles.emptyTitle}>Couldn't Load Products</Text>
          <Text style={styles.emptySubtitle}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchProducts}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0078D7"]} tintColor="#0078D7" />}
        >
          {allFiltered.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="cube-outline" size={30} color="#0078D7" />
              </View>
              <Text style={styles.emptyTitle}>{searchQuery ? "No Results Found" : "No Products Yet"}</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery ? `Nothing matches "${searchQuery}"` : "Add your first product to start selling"}
              </Text>
              {!searchQuery && (
                <TouchableOpacity style={styles.retryBtn} onPress={handleAddProduct}>
                  <Ionicons name="add-circle-outline" size={18} color="#fff" />
                  <Text style={styles.retryBtnText}>Add Product</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : viewMode === "grid" ? (
            <>
              {filteredActive.length > 0 && (
                <View>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>Active</Text>
                    <View style={styles.sectionBadge}>
                      <Text style={styles.sectionBadgeText}>{filteredActive.length}</Text>
                    </View>
                  </View>
                  <View style={styles.gridContainer}>
                    {filteredActive.map((p) => renderGridCard(p))}
                  </View>
                </View>
              )}
              {filteredInactive.length > 0 && (
                <View>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={[styles.sectionTitle, { color: '#94A3B8' }]}>Inactive</Text>
                    <View style={[styles.sectionBadge, { backgroundColor: '#F1F5F9' }]}>
                      <Text style={[styles.sectionBadgeText, { color: '#94A3B8' }]}>{filteredInactive.length}</Text>
                    </View>
                  </View>
                  <View style={styles.gridContainer}>
                    {filteredInactive.map((p) => renderGridCard(p))}
                  </View>
                </View>
              )}
            </>
          ) : (
            <>
              {filteredActive.length > 0 && (
                <View>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>Active</Text>
                    <View style={styles.sectionBadge}>
                      <Text style={styles.sectionBadgeText}>{filteredActive.length}</Text>
                    </View>
                  </View>
                  {filteredActive.map((p) => renderListCard(p))}
                </View>
              )}
              {filteredInactive.length > 0 && (
                <View>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={[styles.sectionTitle, { color: '#94A3B8' }]}>Inactive</Text>
                    <View style={[styles.sectionBadge, { backgroundColor: '#F1F5F9' }]}>
                      <Text style={[styles.sectionBadgeText, { color: '#94A3B8' }]}>{filteredInactive.length}</Text>
                    </View>
                  </View>
                  {filteredInactive.map((p) => renderListCard(p))}
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}

      {/* ── FAB ── */}
      <TouchableOpacity style={styles.fab} onPress={handleAddProduct}>
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
};

export default MyProductsScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F9FC" },

  // ── Header ──
  headerWrapper: {
    backgroundColor: "#0060B8", paddingHorizontal: 20, paddingBottom: 18,
    overflow: "hidden", shadowColor: "#003E80",
    shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 24, elevation: 18,
  },
  orb1: { position: "absolute", width: 280, height: 280, borderRadius: 140, backgroundColor: "rgba(255,255,255,0.06)", top: -100, right: -70 },
  orb2: { position: "absolute", width: 180, height: 180, borderRadius: 90, backgroundColor: "rgba(255,255,255,0.04)", bottom: 10, left: -60 },
  orb3: { position: "absolute", width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(100,180,255,0.08)", top: 20, right: width * 0.35 },
  headerInner: { flexDirection: "row", alignItems: "center", paddingTop: 16, paddingBottom: 16 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.15)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  eyebrow: { fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.65)", letterSpacing: 2, marginBottom: 2 },
  headerTitle: { fontSize: 26, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.5 },
  headerBadge: { backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" },
  headerBadgeText: { fontSize: 14, fontWeight: "800", color: "#fff" },

  searchWrap: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", paddingHorizontal: 12, height: 46, borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.3)", shadowColor: "#003E80", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 10, elevation: 6 },
  searchWrapFocused: { borderColor: "rgba(255,255,255,0.6)" },
  searchIconCircle: { width: 28, height: 28, borderRadius: 9, backgroundColor: "#EBF5FF", justifyContent: "center", alignItems: "center", marginRight: 8 },
  searchInput: { flex: 1, fontSize: 13, color: "#0F172A", fontWeight: "500" },
  searchClearBtn: { width: 28, height: 28, borderRadius: 9, backgroundColor: "#EBF5FF", justifyContent: "center", alignItems: "center", marginLeft: 6 },

  // ── Stats Strip ──
  statsStrip: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", marginHorizontal: 16, marginTop: 16, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 8, shadowColor: "#1B4FBF", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 4, borderWidth: 1, borderColor: "#F0F4F8" },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 18, fontWeight: "900", color: "#0F172A", letterSpacing: -0.3 },
  statLabel: { fontSize: 10, color: "#94A3B8", fontWeight: "600", marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: "#F1F5F9" },
  viewToggle: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  viewToggleBtn: { width: 32, height: 32, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  viewToggleBtnActive: { backgroundColor: "#EBF5FF" },

  // ── Loader / Empty ──
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  loaderCard: { backgroundColor: "#fff", borderRadius: 20, padding: 32, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 6 },
  loaderText: { marginTop: 12, fontSize: 13, color: "#94A3B8", fontWeight: "500" },
  emptyContainer: { alignItems: "center", paddingVertical: 60, paddingHorizontal: 40 },
  emptyIconWrap: { width: 70, height: 70, borderRadius: 24, backgroundColor: "#EBF5FF", justifyContent: "center", alignItems: "center", marginBottom: 18 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A", letterSpacing: -0.3 },
  emptySubtitle: { fontSize: 13, color: "#94A3B8", textAlign: "center", marginTop: 8, lineHeight: 20, marginBottom: 24 },
  retryBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#0078D7", paddingHorizontal: 24, paddingVertical: 13, borderRadius: 14, shadowColor: "#0078D7", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6 },
  retryBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  // ── Section Header ──
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20, marginTop: 22, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#0F172A", letterSpacing: -0.3 },
  sectionBadge: { backgroundColor: "#EBF5FF", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  sectionBadgeText: { fontSize: 12, fontWeight: "800", color: "#0078D7" },

  // ── Grid cards ──
  gridContainer: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, gap: 12 },
  gridCard: { width: (width - 40) / 2, backgroundColor: "#fff", borderRadius: 20, overflow: "hidden", shadowColor: "#1B4FBF", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 14, elevation: 4, borderWidth: 1, borderColor: "#F0F4F8" },
  gridCardInactive: { opacity: 0.7 },
  gridAccent: { height: 3, backgroundColor: "#0078D7" },
  gridImage: { width: "100%", height: 110, backgroundColor: "#E2E8F0" },
  gridImagePlaceholder: { width: "100%", height: 110, backgroundColor: "#F1F5F9", justifyContent: "center", alignItems: "center" },
  imageInactive: { opacity: 0.5 },
  gridCardBody: { padding: 10 },
  gridProductName: { fontSize: 13, fontWeight: "700", color: "#0F172A", marginBottom: 4, lineHeight: 18 },
  gridProductPrice: { fontSize: 13, color: "#16A34A", fontWeight: "700", marginBottom: 2 },
  gridProductMoq: { fontSize: 10, color: "#94A3B8", fontWeight: "600", marginBottom: 8 },
  gridCardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  gridToggleRow: { flexDirection: "row", alignItems: "center" },
  gridCardActions: { flexDirection: "row", gap: 6 },
  gridActionBtn: { width: 28, height: 28, borderRadius: 9, backgroundColor: "#DCFCE7", justifyContent: "center", alignItems: "center" },

  // ── List cards ──
  listCard: { backgroundColor: "#fff", marginHorizontal: 16, marginBottom: 10, borderRadius: 18, overflow: "hidden", shadowColor: "#1B4FBF", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 3, borderWidth: 1, borderColor: "#F0F4F8" },
  listCardInactive: { opacity: 0.65 },
  listCardAccent: { height: 3, backgroundColor: "#0078D7" },
  listCardContent: { flexDirection: "row", padding: 12, alignItems: "center", gap: 12 },
  listImage: { width: 72, height: 72, borderRadius: 14, backgroundColor: "#E2E8F0" },
  listImagePlaceholder: { width: 72, height: 72, borderRadius: 14, backgroundColor: "#F1F5F9", justifyContent: "center", alignItems: "center" },
  listInfo: { flex: 1 },
  listName: { fontSize: 14, fontWeight: "700", color: "#0F172A", marginBottom: 4 },
  listQty: { fontSize: 12, color: "#64748B", marginBottom: 2 },
  listPrice: { fontSize: 13, color: "#16A34A", fontWeight: "700", marginBottom: 2 },
  listMoq: { fontSize: 11, color: "#94A3B8", fontWeight: "600" },
  listActions: { flexDirection: "column", gap: 6, alignItems: "center" },
  listActionBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: "#EBF5FF", justifyContent: "center", alignItems: "center" },

  // ── FAB ──
  fab: {
    position: "absolute", bottom: 36, right: 20,
    width: 58, height: 58, borderRadius: 20,
    backgroundColor: "#0078D7", justifyContent: "center", alignItems: "center",
    shadowColor: "#0078D7", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45, shadowRadius: 16, elevation: 10,
  },
});

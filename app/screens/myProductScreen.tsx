import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  StatusBar,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import Constants from 'expo-constants';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';

const { width } = Dimensions.get('window');
const API_URL = Constants.expoConfig?.extra?.API_URL;
const S3_URL = Constants.expoConfig?.extra?.S3_FETCH_URL;

const getImageUri = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${S3_URL}/${url}`;
};

interface Product {
  product_id: string;
  product_name: string;
  product_description: string;
  product_quantity: string;
  product_price: string;
  product_category_id: string;
  product_sub_category_id?: string;
  is_product_active: boolean;
  created_at: string;
  updated_at: string;
  images?: any[];
}

const MyProductsScreen: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [togglingStatus, setTogglingStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchProducts();
    }, [])
  );

  const fetchProducts = async () => {
    try {
      setError(null);
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Session Expired', 'Please login again to continue.');
        router.replace('/pages/loginMail' as any);
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch all products (seller sees their own)
      const res = await axios.get(`${API_URL}/product/get/all`, { headers });
      const productsData = res.data.data?.products || res.data.data || [];

      // Fetch images for each product
      const productsWithImages = await Promise.all(
        (Array.isArray(productsData) ? productsData : []).map(async (product: Product) => {
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
      console.error('Error fetching products:', error);
      if (error.response?.status === 404) {
        setProducts([]);
      } else {
        setError('Unable to load your products. Please try again.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProducts();
  };

  const handleBack = () => {
    router.back();
  };

  const handleEditProduct = (product: Product) => {
    router.push({
      pathname: '/pages/productDetail' as any,
      params: { product_id: product.product_id },
    });
  };

  const handleAddProduct = () => {
    router.push('/pages/addProduct');
  };

  const handleToggleStatus = async (product: Product) => {
    try {
      setTogglingStatus(product.product_id);
      const token = await AsyncStorage.getItem('token');
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      await axios.put(
        `${API_URL}/product/update/status`,
        {
          product_id: product.product_id,
          is_product_active: !product.is_product_active,
        },
        { headers }
      );

      // Update local state
      setProducts((prev) =>
        prev.map((p) =>
          p.product_id === product.product_id
            ? { ...p, is_product_active: !p.is_product_active }
            : p
        )
      );

      Alert.alert(
        'Status Updated',
        `Product "${product.product_name}" is now ${!product.is_product_active ? 'active' : 'inactive'}.`
      );
    } catch (error: any) {
      console.error('Error toggling product status:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to update product status. Please try again.');
    } finally {
      setTogglingStatus(null);
    }
  };

  const handleDeleteProduct = (product: Product) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product.product_name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              await axios.delete(
                `${API_URL}/product/delete/${product.product_id}`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              setProducts((prev) =>
                prev.filter((p) => p.product_id !== product.product_id)
              );
              Alert.alert('Deleted', 'Product has been removed successfully.');
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to delete product. Please try again.');
            }
          },
        },
      ]
    );
  };

  const getProductImageUrl = (product: Product): string | null => {
    if (product.images && product.images.length > 0) {
      const sorted = [...product.images].sort(
        (a: any, b: any) => a.product_image_sequence_number - b.product_image_sequence_number
      );
      return getImageUri(sorted[0].product_image_url);
    }
    return null;
  };

  const activeProducts = products.filter((p) => p.is_product_active);
  const inactiveProducts = products.filter((p) => !p.is_product_active);

  const filteredActiveProducts = activeProducts.filter(
    (product) =>
      product.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.product_description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredInactiveProducts = inactiveProducts.filter(
    (product) =>
      product.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.product_description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderProductCard = (product: Product) => {
    const imageUrl = getProductImageUrl(product);
    const isToggling = togglingStatus === product.product_id;

    return (
      <View
        key={product.product_id}
        style={[
          styles.productCard,
          !product.is_product_active && styles.productCardInactive,
        ]}
      >
        <View style={styles.cardContent}>
          {/* Product Image */}
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

          {/* Product Info */}
          <View style={styles.productInfo}>
            <Text
              style={[styles.productName, !product.is_product_active && styles.textInactive]}
              numberOfLines={1}
            >
              {product.product_name}
            </Text>
            <Text
              style={[styles.productQty, !product.is_product_active && styles.textInactive]}
              numberOfLines={1}
            >
              Qty: {product.product_quantity}
            </Text>
            <Text
              style={[styles.productPrice, !product.is_product_active && styles.textInactive]}
              numberOfLines={1}
            >
              Price: {product.product_price}
            </Text>

            {/* Toggle Status */}
            <View style={styles.statusToggle}>
              <Text style={styles.statusLabel}>
                {product.is_product_active ? 'Active' : 'Inactive'}
              </Text>
              {isToggling ? (
                <ActivityIndicator size="small" color="#177DDF" />
              ) : (
                <Switch
                  value={product.is_product_active}
                  onValueChange={() => handleToggleStatus(product)}
                  trackColor={{ false: '#E0E0E0', true: '#A8D5FF' }}
                  thumbColor={product.is_product_active ? '#177DDF' : '#999'}
                />
              )}
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actionsColumn}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleEditProduct(product)}
            >
              <Ionicons name="eye-outline" size={20} color="#0078D7" />
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
      <StatusBar barStyle="light-content" backgroundColor="#177DDF" translucent={false} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Products</Text>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{products.length}</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search your products..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
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
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#177DDF']} tintColor="#177DDF" />
          }
        >
          {/* Active Products */}
          {filteredActiveProducts.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Active</Text>
                <View style={styles.sectionBadge}>
                  <Text style={styles.sectionBadgeText}>{filteredActiveProducts.length}</Text>
                </View>
              </View>
              {filteredActiveProducts.map((product) => renderProductCard(product))}
            </View>
          )}

          {/* Inactive Products */}
          {filteredInactiveProducts.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: '#999' }]}>Inactive</Text>
                <View style={[styles.sectionBadge, { backgroundColor: '#F0F0F0' }]}>
                  <Text style={[styles.sectionBadgeText, { color: '#999' }]}>
                    {filteredInactiveProducts.length}
                  </Text>
                </View>
              </View>
              {filteredInactiveProducts.map((product) => renderProductCard(product))}
            </View>
          )}

          {/* Empty State */}
          {filteredActiveProducts.length === 0 && filteredInactiveProducts.length === 0 && (
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={64} color="#CCC" />
              <Text style={styles.emptyText}>No products found</Text>
              <Text style={styles.emptySubtext}>
                {searchQuery.length > 0
                  ? 'Try adjusting your search'
                  : 'Add your first product to start selling'}
              </Text>
              {searchQuery.length === 0 && (
                <TouchableOpacity style={styles.addFirstButton} onPress={handleAddProduct}>
                  <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.addFirstButtonText}>Add Product</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={styles.bottomPadding} />
        </ScrollView>
      )}

      {/* Floating Add Button */}
      <TouchableOpacity style={styles.floatingButton} onPress={handleAddProduct}>
        <Ionicons name="add" size={30} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    backgroundColor: '#177DDF',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: { marginRight: 16 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '600', color: '#FFFFFF' },
  headerBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  headerBadgeText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: '#333' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  loadingText: { marginTop: 12, fontSize: 16, color: '#666' },
  errorText: { fontSize: 15, color: '#666', textAlign: 'center', marginTop: 16, lineHeight: 22 },
  retryButton: { marginTop: 16, backgroundColor: '#177DDF', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 8 },
  retryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  scrollView: { flex: 1 },
  section: { marginBottom: 20 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#000' },
  sectionBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
  },
  sectionBadgeText: { fontSize: 13, fontWeight: '700', color: '#0078D7' },
  productCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  productCardInactive: { backgroundColor: '#FAFAFA', borderWidth: 1, borderColor: '#F0F0F0' },
  cardContent: { flexDirection: 'row', padding: 12, alignItems: 'center' },
  imageWrapper: { position: 'relative' },
  productImage: { width: 80, height: 80, borderRadius: 10, backgroundColor: '#E0E0E0' },
  productImageInactive: { opacity: 0.5 },
  imagePlaceholder: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F8F8' },
  imageOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 10,
  },
  productInfo: { flex: 1, marginLeft: 12, marginRight: 8 },
  productName: { fontSize: 16, fontWeight: '600', color: '#000', marginBottom: 4 },
  productQty: { fontSize: 13, color: '#666', marginBottom: 2 },
  productPrice: { fontSize: 13, color: '#28A745', fontWeight: '600', marginBottom: 6 },
  textInactive: { color: '#AAAAAA' },
  statusToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusLabel: { fontSize: 12, color: '#888' },
  actionsColumn: { gap: 8 },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#666', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#999', marginTop: 8, textAlign: 'center' },
  addFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#177DDF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
    gap: 8,
  },
  addFirstButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  bottomPadding: { height: 100 },
  floatingButton: {
    position: 'absolute',
    bottom: 40,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#177DDF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});

export default MyProductsScreen;

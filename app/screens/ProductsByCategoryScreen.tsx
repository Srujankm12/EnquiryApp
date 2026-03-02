import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Constants from 'expo-constants';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
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

interface Product {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unit: string;
  price: number;
  moq: string;
  product_images?: any[];
  is_product_active?: boolean;
  created_at: string;
  updated_at: string;
}

const ProductsByCategoryScreen = () => {
  const router = useRouter();
  const { category_id, sub_category_id, title } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const screenTitle = (title as string) || 'Products';

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await AsyncStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      let endpoint = '';
      if (sub_category_id) {
        // Backend: GET /product/get/sub/category/{id}
        endpoint = `${API_URL}/product/get/sub/category/${sub_category_id}`;
      } else if (category_id) {
        // Backend: GET /product/get/category/{id}
        endpoint = `${API_URL}/product/get/category/${category_id}`;
      } else {
        // Backend: GET /product/get/all
        endpoint = `${API_URL}/product/get/all`;
      }

      const res = await axios.get(endpoint, { headers });
      const productsData = res.data?.products || [];
      setProducts(Array.isArray(productsData) ? productsData : []);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      if (error.response?.status === 404) {
        setProducts([]);
      } else {
        setError('Unable to load products. Please try again.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  const handleProductPress = (product: Product) => {
    router.push({
      pathname: '/pages/productDetail' as any,
      params: { product_id: product.id },
    });
  };

  const getProductImageUrl = (product: Product): string | null => {
    if (product.product_images && product.product_images.length > 0) {
      return getImageUri(product.product_images[0].image);
    }
    return null;
  };

  const renderProductCard = ({ item }: { item: Product }) => {
    const imageUrl = getProductImageUrl(item);

    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => handleProductPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.productImageContainer}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.productImage} />
          ) : (
            <View style={styles.productImagePlaceholder}>
              <Ionicons name="cube-outline" size={40} color="#CCC" />
            </View>
          )}
        </View>
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.productDescription} numberOfLines={2}>
            {item.description}
          </Text>
          <View style={styles.productMeta}>
            <View style={styles.productMetaItem}>
              <Ionicons name="cube-outline" size={14} color="#0078D7" />
              <Text style={styles.productMetaText}>Qty: {item.quantity} {item.unit}</Text>
            </View>
            <View style={styles.productMetaItem}>
              <Ionicons name="pricetag-outline" size={14} color="#28A745" />
              <Text style={styles.productPriceText}>Rs {item.price}/{item.unit}</Text>
            </View>
          </View>
          {item.moq && (
            <Text style={styles.productMoq}>MOQ: {item.moq}</Text>
          )}
          <TouchableOpacity
            style={styles.enquireButton}
            onPress={() => handleProductPress(item)}
          >
            <Text style={styles.enquireButtonText}>View Details</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{screenTitle}</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#0078D7" />
          <Text style={styles.loaderText}>Loading products...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{screenTitle}</Text>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{products.length}</Text>
        </View>
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="cloud-offline-outline" size={64} color="#CCC" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchProducts}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : products.length === 0 ? (
        <View style={styles.errorContainer}>
          <Ionicons name="cube-outline" size={64} color="#CCC" />
          <Text style={styles.errorText}>No products found</Text>
          <Text style={styles.errorSubtext}>
            No products are available in this category yet.
          </Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={renderProductCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0078D7']} />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    backgroundColor: '#1E90FF', paddingTop: 50, paddingBottom: 15, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center',
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  headerBadge: { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  headerBadgeText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderText: { marginTop: 12, fontSize: 16, color: '#666' },
  listContent: { padding: 16, paddingBottom: 40 },
  productCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 16, overflow: 'hidden',
    elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6,
  },
  productImageContainer: { width: '100%', height: 200, backgroundColor: '#F0F0F0' },
  productImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  productImagePlaceholder: {
    width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F8F8',
  },
  productInfo: { padding: 16 },
  productName: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginBottom: 6 },
  productDescription: { fontSize: 14, color: '#666', lineHeight: 20, marginBottom: 12 },
  productMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  productMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  productMetaText: { fontSize: 14, color: '#555', fontWeight: '500' },
  productPriceText: { fontSize: 14, color: '#28A745', fontWeight: '700' },
  productMoq: { fontSize: 13, color: '#888', marginBottom: 14 },
  enquireButton: { backgroundColor: '#0078D7', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  enquireButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  errorText: { fontSize: 16, color: '#666', textAlign: 'center', marginTop: 16 },
  errorSubtext: { fontSize: 14, color: '#999', textAlign: 'center', marginTop: 8 },
  retryButton: { marginTop: 16, backgroundColor: '#0078D7', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 8 },
  retryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});

export default ProductsByCategoryScreen;

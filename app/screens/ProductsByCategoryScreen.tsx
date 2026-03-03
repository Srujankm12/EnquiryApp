import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Dimensions,
  FlatList,
  Image,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  id: string; name: string; description: string; quantity: number;
  unit: string; price: number; moq: string; product_images?: any[];
  is_product_active?: boolean; created_at: string; updated_at: string;
  business_name?: string; city?: string; state?: string;
}

const ProductsByCategoryScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { category_id, sub_category_id, title } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const screenTitle = (title as string) || 'Products';

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true); setError(null);
      const token = await AsyncStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const companyId = await AsyncStorage.getItem("companyId");
      let endpoint = '';
      if (sub_category_id) endpoint = `${API_URL}/product/get/sub/category/${sub_category_id}`;
      else if (category_id) endpoint = `${API_URL}/product/get/category/${category_id}`;
      else endpoint = `${API_URL}/product/get/all`;
      const fetches: Promise<any>[] = [
        axios.get(endpoint, { headers }),
      ];
      if (companyId) {
        fetches.push(axios.get(`${API_URL}/product/get/business/${companyId}`, { headers }).catch(() => ({ data: { products: [] } })));
      }
      const [prodRes, ownRes] = await Promise.all(fetches);
      const ownIds = new Set<string>();
      if (ownRes) {
        const ownList = ownRes.data?.products || [];
        (Array.isArray(ownList) ? ownList : []).forEach((p: any) => {
          if (p.id) ownIds.add(String(p.id));
          if (p.product_id) ownIds.add(String(p.product_id));
        });
      }
      const data = prodRes.data?.products || [];
      const raw = Array.isArray(data) ? data : [];
      setProducts(
        raw.filter((p: any) => {
          if (p.is_product_active === false) return false;
          if (ownIds.has(String(p.id))) return false;
          if (p.product_id && ownIds.has(String(p.product_id))) return false;
          return true;
        })
      );
    } catch (err: any) {
      if (err.response?.status === 404) setProducts([]);
      else setError('Unable to load products. Please try again.');
    } finally { setLoading(false); setRefreshing(false); }
  };

  const onRefresh = () => { setRefreshing(true); fetchProducts(); };
  const handleProductPress = (product: Product) => router.push({ pathname: '/pages/productDetail' as any, params: { product_id: product.id } });
  const getProductImageUrl = (product: Product): string | null => {
    if (product.product_images && product.product_images.length > 0 && product.product_images[0] && product.product_images[0].image) {
      return getImageUri(product.product_images[0].image);
    }
    return null;
  };

  const renderGridCard = ({ item }: { item: Product }) => {
    const imageUrl = getProductImageUrl(item);
    return (
      <TouchableOpacity style={styles.gridCard} onPress={() => handleProductPress(item)} activeOpacity={0.85}>
        <View style={styles.gridAccent} />
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.gridImage} resizeMode="cover" />
        ) : (
          <View style={styles.gridImagePlaceholder}>
            <Ionicons name="cube-outline" size={30} color="#CBD5E1" />
          </View>
        )}
        <View style={styles.gridBody}>
          <Text style={styles.gridName} numberOfLines={2}>{item.name}</Text>
          {item.price > 0 && <Text style={styles.gridPrice}>₹{item.price}/{item.unit}</Text>}
          {item.moq && <Text style={styles.gridMoq}>MOQ: {item.moq}</Text>}
          <TouchableOpacity style={styles.gridViewBtn} onPress={() => handleProductPress(item)}>
            <Text style={styles.gridViewBtnText}>View Details</Text>
            <Ionicons name="chevron-forward" size={12} color="#0078D7" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderListCard = ({ item }: { item: Product }) => {
    const imageUrl = getProductImageUrl(item);
    return (
      <TouchableOpacity style={styles.listCard} onPress={() => handleProductPress(item)} activeOpacity={0.85}>
        <View style={styles.listAccent} />
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.listImage} resizeMode="cover" />
        ) : (
          <View style={styles.listImagePlaceholder}>
            <Ionicons name="cube-outline" size={22} color="#CBD5E1" />
          </View>
        )}
        <View style={styles.listBody}>
          <Text style={styles.listName} numberOfLines={1}>{item.name}</Text>
          {item.description ? <Text style={styles.listDesc} numberOfLines={2}>{item.description}</Text> : null}
          <View style={styles.listMeta}>
            {item.price > 0 && (
              <View style={styles.chip}>
                <Ionicons name="pricetag-outline" size={11} color="#16A34A" />
                <Text style={[styles.chipText, { color: '#16A34A' }]}>₹{item.price}/{item.unit}</Text>
              </View>
            )}
            <View style={styles.chip}>
              <Ionicons name="cube-outline" size={11} color="#0078D7" />
              <Text style={[styles.chipText, { color: '#0078D7' }]}>{item.quantity} {item.unit}</Text>
            </View>
            {item.moq && (
              <View style={styles.chip}>
                <Ionicons name="layers-outline" size={11} color="#64748B" />
                <Text style={[styles.chipText, { color: '#64748B' }]}>MOQ: {item.moq}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.listArrow}>
          <Ionicons name="chevron-forward" size={16} color="#0078D7" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0060B8" />

      {/* ── Premium Header ── */}
      <View style={[styles.headerWrapper, { paddingTop: insets.top }]}>
        <View style={styles.orb1} /><View style={styles.orb2} />
        <View style={styles.headerInner}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.eyebrow}>PRODUCTS</Text>
            <Text style={styles.headerTitle} numberOfLines={1}>{screenTitle}</Text>
          </View>
          {!loading && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{products.length}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Stats + View Toggle */}
      {!loading && products.length > 0 && (
        <View style={styles.statsBar}>
          <View style={styles.statsBarLeft}>
            <Ionicons name="cube-outline" size={14} color="#0078D7" />
            <Text style={styles.statsBarText}>{products.length} product{products.length !== 1 ? 's' : ''} found</Text>
          </View>
          <View style={styles.viewToggle}>
            <TouchableOpacity style={[styles.viewBtn, viewMode === 'grid' && styles.viewBtnActive]} onPress={() => setViewMode('grid')}>
              <Ionicons name="grid-outline" size={16} color={viewMode === 'grid' ? '#0078D7' : '#94A3B8'} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.viewBtn, viewMode === 'list' && styles.viewBtnActive]} onPress={() => setViewMode('list')}>
              <Ionicons name="list-outline" size={16} color={viewMode === 'list' ? '#0078D7' : '#94A3B8'} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#0078D7" />
          <Text style={styles.loaderText}>Loading products...</Text>
        </View>
      ) : error ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIconWrap}><Ionicons name="cloud-offline-outline" size={28} color="#0078D7" /></View>
          <Text style={styles.emptyTitle}>Couldn't Load</Text>
          <Text style={styles.emptySubtitle}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchProducts}>
            <Ionicons name="refresh" size={16} color="#fff" />
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : products.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIconWrap}><Ionicons name="cube-outline" size={28} color="#0078D7" /></View>
          <Text style={styles.emptyTitle}>No Products Found</Text>
          <Text style={styles.emptySubtitle}>No products available in this category yet.</Text>
        </View>
      ) : viewMode === 'grid' ? (
        <FlatList
          key="grid"
          data={products}
          numColumns={2}
          keyExtractor={item => item.id}
          renderItem={renderGridCard}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0078D7']} tintColor="#0078D7" />}
        />
      ) : (
        <FlatList
          key="list"
          data={products}
          numColumns={1}
          keyExtractor={item => item.id}
          renderItem={renderListCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0078D7']} tintColor="#0078D7" />}
        />
      )}
    </View>
  );
};

export default ProductsByCategoryScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9FC' },
  headerWrapper: {
    backgroundColor: '#0060B8', paddingHorizontal: 20, paddingBottom: 22, overflow: 'hidden',
    shadowColor: '#003E80', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 24, elevation: 18,
  },
  orb1: { position: 'absolute', width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(255,255,255,0.06)', top: -80, right: -60 },
  orb2: { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.04)', bottom: 5, left: -50 },
  headerInner: { flexDirection: 'row', alignItems: 'center', paddingTop: 16 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  eyebrow: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.65)', letterSpacing: 2, marginBottom: 2 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.4 },
  countBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  countBadgeText: { fontSize: 14, fontWeight: '800', color: '#fff' },

  statsBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  statsBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statsBarText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  viewToggle: { flexDirection: 'row', gap: 4, backgroundColor: '#F1F5F9', borderRadius: 10, padding: 3 },
  viewBtn: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  viewBtnActive: { backgroundColor: '#fff', shadowColor: '#1B4FBF', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },

  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loaderText: { fontSize: 13, color: '#94A3B8', fontWeight: '500' },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyIconWrap: { width: 64, height: 64, borderRadius: 22, backgroundColor: '#EBF5FF', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  emptySubtitle: { fontSize: 13, color: '#94A3B8', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0078D7', paddingHorizontal: 22, paddingVertical: 12, borderRadius: 14, marginTop: 20 },
  retryBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Grid
  gridContent: { padding: 16, paddingBottom: 60 },
  columnWrapper: { gap: 12, marginBottom: 12 },
  gridCard: { width: (width - 44) / 2, backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden', shadowColor: '#1B4FBF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4, borderWidth: 1, borderColor: '#F0F4F8' },
  gridAccent: { height: 3, backgroundColor: '#0078D7' },
  gridImage: { width: '100%', height: 130, backgroundColor: '#E2E8F0' },
  gridImagePlaceholder: { width: '100%', height: 130, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  gridBody: { padding: 10 },
  gridName: { fontSize: 13, fontWeight: '700', color: '#0F172A', lineHeight: 18, marginBottom: 4 },
  gridPrice: { fontSize: 13, color: '#16A34A', fontWeight: '800', marginBottom: 2 },
  gridMoq: { fontSize: 10, color: '#94A3B8', fontWeight: '600', marginBottom: 8 },
  gridViewBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#EBF5FF', paddingVertical: 7, borderRadius: 10 },
  gridViewBtnText: { fontSize: 11, fontWeight: '700', color: '#0078D7' },

  // List
  listContent: { padding: 16, paddingBottom: 60 },
  listCard: { backgroundColor: '#fff', borderRadius: 18, marginBottom: 10, overflow: 'hidden', shadowColor: '#1B4FBF', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 3, borderWidth: 1, borderColor: '#F0F4F8', flexDirection: 'row', alignItems: 'center' },
  listAccent: { width: 3, height: '100%', backgroundColor: '#0078D7' },
  listImage: { width: 80, height: 80, backgroundColor: '#E2E8F0' },
  listImagePlaceholder: { width: 80, height: 80, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  listBody: { flex: 1, paddingHorizontal: 12, paddingVertical: 10 },
  listName: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  listDesc: { fontSize: 12, color: '#64748B', lineHeight: 17, marginBottom: 6 },
  listMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F7F9FC', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  chipText: { fontSize: 11, fontWeight: '700' },
  listArrow: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#EBF5FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
});

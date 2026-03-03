import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Dimensions,
  FlatList,
  Image,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const numColumns = 2;
const cardWidth = (width - 56) / 2;

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

interface SubCategory {
  id: string; category_id: string; category_image: string | null; name: string; description: string;
}

const SpecificCategoriesScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [categoryName, setCategoryName] = useState('Sub Categories');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { id, name } = useLocalSearchParams();

  useEffect(() => {
    if (name) setCategoryName(name as string);
    fetchSubCategories();
  }, []);

  const fetchSubCategories = async () => {
    try {
      setError(null);
      const token = await AsyncStorage.getItem('token');
      const res = await axios.get(`${API_URL}/category/sub/get/category/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setSubCategories(res.data?.sub_categories || []);
    } catch (err: any) {
      if (err.response?.status === 404) setSubCategories([]);
      else setError('Unable to load sub-categories. Please try again.');
    } finally { setLoading(false); setRefreshing(false); }
  };

  const onRefresh = useCallback(() => { setRefreshing(true); fetchSubCategories(); }, []);

  const handleSubCategoryPress = (subCategory: SubCategory) => {
    router.push({ pathname: '/pages/productsByCategory' as any, params: { category_id: id as string, sub_category_id: subCategory.id, title: subCategory.name } });
  };

  const handleViewAllCategoryProducts = () => {
    router.push({ pathname: '/pages/productsByCategory' as any, params: { category_id: id as string, title: categoryName } });
  };

  const filtered = subCategories.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const renderSubCategoryCard = ({ item }: { item: SubCategory }) => (
    <TouchableOpacity style={styles.categoryCard} onPress={() => handleSubCategoryPress(item)} activeOpacity={0.85}>
      <View style={styles.cardImageWrap}>
        {item.category_image ? (
          <Image source={{ uri: getImageUri(item.category_image)! }} style={styles.categoryImage} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="layers-outline" size={28} color="#0078D7" />
          </View>
        )}
        <View style={styles.cardOverlay} />
      </View>
      <View style={styles.cardLabel}>
        <Text style={styles.categoryName} numberOfLines={2}>{item.name}</Text>
        <View style={styles.cardArrow}>
          <Ionicons name="arrow-forward" size={12} color="#0078D7" />
        </View>
      </View>
    </TouchableOpacity>
  );

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
            <Text style={styles.eyebrow}>CATEGORY</Text>
            <Text style={styles.headerTitle} numberOfLines={1}>{categoryName}</Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{subCategories.length}</Text>
          </View>
        </View>

        {/* Search */}
        <View style={[styles.searchWrap, searchFocused && styles.searchWrapFocused]}>
          <View style={styles.searchIconWrap}>
            <Ionicons name="search-outline" size={14} color="#0078D7" />
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Search sub-categories..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchClear}>
              <Ionicons name="close" size={14} color="#0078D7" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* View All Banner */}
      <TouchableOpacity style={styles.viewAllBanner} onPress={handleViewAllCategoryProducts} activeOpacity={0.85}>
        <View style={styles.viewAllIconWrap}>
          <Ionicons name="grid" size={20} color="#0078D7" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.viewAllTitle}>Browse All Products</Text>
          <Text style={styles.viewAllSubtitle}>See all products in {categoryName}</Text>
        </View>
        <View style={styles.viewAllArrow}>
          <Ionicons name="chevron-forward" size={18} color="#0078D7" />
        </View>
      </TouchableOpacity>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#0078D7" />
          <Text style={styles.loaderText}>Loading...</Text>
        </View>
      ) : error ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIconWrap}><Ionicons name="cloud-offline-outline" size={28} color="#0078D7" /></View>
          <Text style={styles.emptyTitle}>Connection Error</Text>
          <Text style={styles.emptySubtitle}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchSubCategories}>
            <Ionicons name="refresh" size={16} color="#fff" />
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : subCategories.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIconWrap}><Ionicons name="layers-outline" size={28} color="#0078D7" /></View>
          <Text style={styles.emptyTitle}>No Sub-Categories</Text>
          <Text style={styles.emptySubtitle}>Browse all products in this category instead.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={handleViewAllCategoryProducts}>
            <Ionicons name="search-outline" size={16} color="#fff" />
            <Text style={styles.retryBtnText}>Browse All Products</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          numColumns={numColumns}
          keyExtractor={item => item.id}
          renderItem={renderSubCategoryCard}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0078D7']} tintColor="#0078D7" />}
          ListHeaderComponent={
            <Text style={styles.sectionLabel}>
              {filtered.length} sub-categor{filtered.length === 1 ? 'y' : 'ies'}
            </Text>
          }
          ListEmptyComponent={
            searchQuery ? (
              <View style={[styles.emptyWrap, { paddingTop: 40 }]}>
                <Text style={styles.emptyTitle}>No results for "{searchQuery}"</Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
};

export default SpecificCategoriesScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9FC' },

  // ── Header ──
  headerWrapper: {
    backgroundColor: '#0060B8', paddingHorizontal: 20, paddingBottom: 18, overflow: 'hidden',
    shadowColor: '#003E80', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 24, elevation: 18,
  },
  orb1: { position: 'absolute', width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(255,255,255,0.06)', top: -80, right: -60 },
  orb2: { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.04)', bottom: 5, left: -50 },
  headerInner: { flexDirection: 'row', alignItems: 'center', paddingTop: 16, paddingBottom: 16 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  eyebrow: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.65)', letterSpacing: 2, marginBottom: 2 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.4 },
  countBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  countBadgeText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 12, height: 46, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  searchWrapFocused: { borderColor: 'rgba(255,255,255,0.7)' },
  searchIconWrap: { width: 28, height: 28, borderRadius: 9, backgroundColor: '#EBF5FF', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  searchInput: { flex: 1, fontSize: 13, color: '#0F172A', fontWeight: '500' },
  searchClear: { width: 28, height: 28, borderRadius: 9, backgroundColor: '#EBF5FF', justifyContent: 'center', alignItems: 'center', marginLeft: 6 },

  // ── View All Banner ──
  viewAllBanner: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginTop: 16,
    borderRadius: 18, padding: 14, shadowColor: '#1B4FBF', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4, borderWidth: 1, borderColor: '#EBF5FF',
  },
  viewAllIconWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#EBF5FF', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  viewAllTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  viewAllSubtitle: { fontSize: 12, color: '#94A3B8', marginTop: 2, fontWeight: '500' },
  viewAllArrow: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#EBF5FF', justifyContent: 'center', alignItems: 'center' },

  // ── Loader / Empty ──
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loaderText: { fontSize: 13, color: '#94A3B8', fontWeight: '500' },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyIconWrap: { width: 64, height: 64, borderRadius: 22, backgroundColor: '#EBF5FF', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A', letterSpacing: -0.2 },
  emptySubtitle: { fontSize: 13, color: '#94A3B8', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0078D7', paddingHorizontal: 22, paddingVertical: 12, borderRadius: 14, marginTop: 20 },
  retryBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  sectionLabel: { fontSize: 10, fontWeight: '800', color: '#94A3B8', letterSpacing: 2, marginBottom: 14, textTransform: 'uppercase' },
  gridContent: { padding: 16, paddingBottom: 60 },
  columnWrapper: { gap: 14, marginBottom: 14 },

  // ── Category Cards ──
  categoryCard: {
    width: cardWidth, backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden',
    shadowColor: '#1B4FBF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
    borderWidth: 1, borderColor: '#F0F4F8',
  },
  cardImageWrap: { width: '100%', aspectRatio: 1.1, position: 'relative' },
  categoryImage: { width: '100%', height: '100%' },
  imagePlaceholder: { width: '100%', height: '100%', backgroundColor: '#EBF5FF', justifyContent: 'center', alignItems: 'center' },
  cardOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.03)' },
  cardLabel: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 10 },
  categoryName: { flex: 1, fontSize: 12, fontWeight: '700', color: '#0F172A', lineHeight: 16 },
  cardArrow: { width: 22, height: 22, borderRadius: 8, backgroundColor: '#EBF5FF', justifyContent: 'center', alignItems: 'center' },
});

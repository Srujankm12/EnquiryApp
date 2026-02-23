import React, { useState, useEffect, useCallback } from 'react';
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
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Constants from "expo-constants";
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const numColumns = 3;
const cardMargin = 8;
const cardWidth = (width - 32 - (numColumns - 1) * cardMargin) / numColumns;

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
  id: string;
  category_id: string;
  category_image: string | null;
  name: string;
  description: string;
}

const SpecificCategoriesScreen = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [categoryName, setCategoryName] = useState('Sub Categories');
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
      const res = await axios.get(`${API_URL}/category/sub/get/category/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSubCategories(res.data?.sub_categories || []);
    } catch (err: any) {
      console.error('Error fetching sub-categories:', err);
      if (err.response?.status === 404) {
        setSubCategories([]);
      } else {
        setError('Unable to load sub-categories. Please try again.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSubCategories();
  }, []);

  const handleSubCategoryPress = (subCategory: SubCategory) => {
    router.push({
      pathname: "/pages/productsByCategory" as any,
      params: {
        category_id: id as string,
        sub_category_id: subCategory.id,
        title: subCategory.name,
      },
    });
  };

  const handleViewAllCategoryProducts = () => {
    router.push({
      pathname: "/pages/productsByCategory" as any,
      params: {
        category_id: id as string,
        title: categoryName,
      },
    });
  };

  const renderSubCategoryCard = ({ item }: { item: SubCategory }) => (
    <TouchableOpacity
      style={styles.categoryCard}
      onPress={() => handleSubCategoryPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.imageContainer}>
        {item.category_image ? (
          <Image
            source={{ uri: getImageUri(item.category_image)! }}
            style={styles.categoryImage}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="layers-outline" size={28} color="#0078D7" />
          </View>
        )}
      </View>
      <View style={styles.cardLabelContainer}>
        <Text style={styles.categoryName} numberOfLines={2}>{item.name}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1E90FF" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{categoryName}</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#1E90FF" />
          <Text style={styles.loaderText}>Loading sub-categories...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E90FF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{categoryName}</Text>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{subCategories.length}</Text>
        </View>
      </View>

      {/* View All Products Button */}
      <TouchableOpacity style={styles.viewAllButton} onPress={handleViewAllCategoryProducts}>
        <View style={styles.viewAllIconContainer}>
          <Ionicons name="grid-outline" size={20} color="#1E90FF" />
        </View>
        <View style={styles.viewAllTextContainer}>
          <Text style={styles.viewAllTitle}>View All Products</Text>
          <Text style={styles.viewAllSubtitle}>Browse all products in {categoryName}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#1E90FF" />
      </TouchableOpacity>

      {error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="cloud-offline-outline" size={64} color="#CCC" />
          <Text style={styles.errorTitle}>Connection Error</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchSubCategories}>
            <Ionicons name="refresh" size={18} color="#FFFFFF" />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : subCategories.length === 0 ? (
        <View style={styles.errorContainer}>
          <Ionicons name="layers-outline" size={64} color="#CCC" />
          <Text style={styles.errorTitle}>No Sub-Categories</Text>
          <Text style={styles.errorText}>
            No sub-categories found. Browse all products in this category instead.
          </Text>
          <TouchableOpacity style={styles.browseAllButton} onPress={handleViewAllCategoryProducts}>
            <Ionicons name="search-outline" size={18} color="#FFFFFF" />
            <Text style={styles.retryButtonText}>Browse All Products</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={subCategories}
          numColumns={numColumns}
          contentContainerStyle={styles.gridContainer}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          renderItem={renderSubCategoryCard}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#1E90FF']}
            />
          }
          ListHeaderComponent={
            <Text style={styles.sectionLabel}>
              {subCategories.length} sub-categor{subCategories.length === 1 ? 'y' : 'ies'}
            </Text>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#1E90FF',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    marginLeft: 4,
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  headerBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loaderText: {
    marginTop: 12,
    fontSize: 15,
    color: '#666',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  viewAllIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#EBF5FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  viewAllTextContainer: {
    flex: 1,
  },
  viewAllTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  viewAllSubtitle: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#888',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gridContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  columnWrapper: {
    gap: cardMargin,
    marginBottom: cardMargin,
  },
  categoryCard: {
    width: cardWidth,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#F0F4F8',
  },
  categoryImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EBF5FF',
  },
  cardLabelContainer: {
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    lineHeight: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#1E90FF',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  browseAllButton: {
    marginTop: 20,
    backgroundColor: '#0078D7',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default SpecificCategoriesScreen;

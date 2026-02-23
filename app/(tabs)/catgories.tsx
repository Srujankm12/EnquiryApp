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
  TextInput,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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

interface Category {
  id: string;
  category_image: string | null;
  name: string;
  description: string;
}

const CategoriesScreen = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setError(null);
      const token = await AsyncStorage.getItem('token');
      const res = await axios.get(`${API_URL}/category/get/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCategories(res.data?.categories || []);
    } catch (err: any) {
      console.error('Error fetching categories:', err);
      setError('Unable to load categories. Please check your connection and try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCategories();
  }, []);

  const handleCategoryPress = (category: Category) => {
    router.push({
      pathname: "/pages/specificCategory",
      params: {
        id: category.id,
        name: category.name,
      }
    });
  };

  const filteredCategories = categories.filter((cat) => {
    if (!searchQuery) return true;
    return cat.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const renderCategoryCard = ({ item }: { item: Category }) => (
    <TouchableOpacity
      style={styles.categoryCard}
      onPress={() => handleCategoryPress(item)}
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
            <Ionicons name="leaf-outline" size={28} color="#0078D7" />
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
          <Text style={styles.headerTitle}>Categories</Text>
        </View>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#1E90FF" />
          <Text style={styles.loaderText}>Loading categories...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E90FF" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Categories</Text>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{categories.length}</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search categories..."
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
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="cloud-offline-outline" size={64} color="#CCC" />
          <Text style={styles.errorTitle}>Connection Error</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchCategories}>
            <Ionicons name="refresh" size={18} color="#FFFFFF" />
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : filteredCategories.length === 0 ? (
        <View style={styles.errorContainer}>
          <Ionicons name="grid-outline" size={64} color="#CCC" />
          <Text style={styles.errorTitle}>
            {searchQuery ? 'No Results' : 'No Categories'}
          </Text>
          <Text style={styles.errorText}>
            {searchQuery
              ? `No categories matching "${searchQuery}"`
              : 'No categories available at the moment'}
          </Text>
          {searchQuery && (
            <TouchableOpacity
              style={styles.clearSearchButton}
              onPress={() => setSearchQuery('')}
            >
              <Text style={styles.clearSearchText}>Clear Search</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredCategories}
          numColumns={numColumns}
          contentContainerStyle={styles.gridContainer}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          renderItem={renderCategoryCard}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#1E90FF']}
            />
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
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
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
    backgroundColor: '#1E90FF',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: '#333',
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
  retryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  clearSearchButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E90FF',
  },
  clearSearchText: {
    color: '#1E90FF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default CategoriesScreen;

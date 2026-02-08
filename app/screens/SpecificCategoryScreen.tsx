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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Constants from "expo-constants";
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const numColumns = 3;
const cardMargin = 12;
const cardWidth = (width - (numColumns + 1) * cardMargin) / numColumns;

const API_URL = Constants.expoConfig?.extra?.API_URL;
const S3_URL = Constants.expoConfig?.extra?.S3_FETCH_URL;

const getImageUri = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${S3_URL}/${url}`;
};

const SpecificCategoriesScreen = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [subCategories, setSubCategories] = useState<any[]>([]);
  const [categoryName, setCategoryName] = useState('Sub Categories');
  const [error, setError] = useState<string | null>(null);
  const { id, name } = useLocalSearchParams();

  useEffect(() => {
    if (name) setCategoryName(name as string);
    fetchSubCategories();
  }, []);

  const fetchSubCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await AsyncStorage.getItem('token');
      let res = await axios.get(`${API_URL}/category/get/sub/complete/all/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setSubCategories(res.data.data.sub_categories || []);
    } catch (error: any) {
      console.error('Error fetching sub-categories:', error);
      setError('Unable to load sub-categories. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubCategoryPress = (subCategory: any) => {
    router.push({
      pathname: "/pages/productsByCategory" as any,
      params: {
        category_id: id as string,
        sub_category_id: subCategory.sub_category_id,
        title: subCategory.sub_category_name,
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

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{categoryName}</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#0078D7" />
          <Text style={styles.loaderText}>Loading sub-categories...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{categoryName}</Text>
        <View style={styles.backButton} />
      </View>

      {/* View All Products Button */}
      <TouchableOpacity style={styles.viewAllButton} onPress={handleViewAllCategoryProducts}>
        <Ionicons name="grid-outline" size={20} color="#0078D7" />
        <Text style={styles.viewAllText}>View All Products in {categoryName}</Text>
        <Ionicons name="chevron-forward" size={18} color="#0078D7" />
      </TouchableOpacity>

      {error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="cloud-offline-outline" size={64} color="#CCC" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchSubCategories}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : subCategories.length === 0 ? (
        <View style={styles.errorContainer}>
          <Ionicons name="layers-outline" size={64} color="#CCC" />
          <Text style={styles.errorText}>No sub-categories found</Text>
          <Text style={styles.errorSubtext}>Browse all products in this category instead</Text>
        </View>
      ) : (
        <FlatList
          data={subCategories}
          numColumns={numColumns}
          contentContainerStyle={styles.gridContainer}
          showsVerticalScrollIndicator={false}
          keyExtractor={(item) => item.sub_category_id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.categoryCard}
              onPress={() => handleSubCategoryPress(item)}
              activeOpacity={0.7}
            >
              <View style={styles.imageContainer}>
                <Image source={{ uri: getImageUri(item.sub_category_image_url)! }} style={styles.categoryImage} />
              </View>
              <Text style={styles.categoryName}>{item.sub_category_name}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#1E90FF',
    paddingTop: 50,
    paddingBottom: 15,
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
    marginLeft: 2,
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loaderText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    gap: 10,
  },
  viewAllText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#0078D7',
  },
  gridContainer: {
    marginTop: 12,
    paddingHorizontal: 5,
    paddingBottom: 100,
  },
  categoryCard: {
    width: cardWidth,
    margin: cardMargin / 2,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#F0F0F0',
  },
  categoryImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  errorText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 22,
  },
  errorSubtext: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#0078D7',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default SpecificCategoriesScreen;

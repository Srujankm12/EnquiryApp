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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Constants from "expo-constants";
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
const { width } = Dimensions.get('window');
const numColumns = 3;
const cardMargin = 12;
const cardWidth = (width - (numColumns + 1) * cardMargin) / numColumns;

const API_URL = Constants.expoConfig?.extra?.API_URL;
const S3_URL = Constants.expoConfig?.extra?.S3_FETCH_URL;



const CategoriesScreen = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await AsyncStorage.getItem('token');
      let res = await axios.get(`${API_URL}/category/get/complete/all`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setCategories(res.data.data.categories || []);
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      setError('Unable to load categories. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryPress = (category: any) => {
    router.push({
      pathname: "/pages/specificCategory",
      params: {
        id: category.category_id,
        name: category.category_name,
      }
    });
  };
  

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Categories</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#0078D7" />
          <Text style={styles.loaderText}>Loading categories...</Text>
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
        <Text style={styles.headerTitle}>Categories</Text>
        <View style={styles.backButton} />
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="cloud-offline-outline" size={64} color="#CCC" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchCategories}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : categories.length === 0 ? (
        <View style={styles.errorContainer}>
          <Ionicons name="grid-outline" size={64} color="#CCC" />
          <Text style={styles.errorText}>No categories available</Text>
        </View>
      ) : (
        <FlatList
          data={categories}
          numColumns={numColumns}
          contentContainerStyle={styles.gridContainer}
          showsVerticalScrollIndicator={false}
          keyExtractor={(item) => item.category_id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.categoryCard}
              onPress={() => handleCategoryPress(item)}
              activeOpacity={0.7}
            >
              <View style={styles.imageContainer}>
                <Image source={{ uri: `${S3_URL}/${item.category_image_url}` }} style={styles.categoryImage} />
              </View>
              <Text style={styles.categoryName}>{item.category_name}</Text>
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
    marginLeft:2,
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
  gridContainer: {
    marginTop:20,
    paddingHorizontal:5,
    paddingBottom: 100, // Space for FAB and tab bar
  },
  categoryCard: {
    width: cardWidth,
    margin: cardMargin / 2,
    marginBottom:10,
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
  retryButton: {
    marginTop: 16,
    backgroundColor: '#0078D7',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default CategoriesScreen;
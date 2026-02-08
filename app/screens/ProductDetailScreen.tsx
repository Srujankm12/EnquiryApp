import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Constants from 'expo-constants';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const API_URL = Constants.expoConfig?.extra?.API_URL;
const S3_URL = Constants.expoConfig?.extra?.S3_FETCH_URL;

const getImageUri = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${S3_URL}/${url}`;
};

const ProductDetailScreen = () => {
  const router = useRouter();
  const { product_id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [product, setProduct] = useState<any>(null);
  const [images, setImages] = useState<any[]>([]);
  const [ratingInfo, setRatingInfo] = useState<any>(null);
  const [ratings, setRatings] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    fetchProductDetails();
  }, [product_id]);

  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await AsyncStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch complete product details
      const res = await axios.get(
        `${API_URL}/product/get/complete/${product_id}`,
        { headers }
      );

      const data = res.data.data?.product_details || res.data.data;

      if (data) {
        setProduct(data.product || null);
        setImages(data.images || []);
        setRatingInfo(data.rating_info || null);
      }

      // Fetch ratings
      try {
        const ratingsRes = await axios.get(
          `${API_URL}/product/rating/get/${product_id}`,
          { headers }
        );
        setRatings(ratingsRes.data.data?.ratings || []);
      } catch {
        setRatings([]);
      }
    } catch (error: any) {
      console.error('Error fetching product details:', error);
      setError('Unable to load product details. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchProductDetails();
  };

  const renderStars = (rating: number, size: number = 16) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Ionicons key={`full-${i}`} name="star" size={size} color="#FFB800" />);
    }
    if (hasHalf) {
      stars.push(<Ionicons key="half" name="star-half" size={size} color="#FFB800" />);
    }
    for (let i = 0; i < 5 - Math.ceil(rating); i++) {
      stars.push(<Ionicons key={`empty-${i}`} name="star-outline" size={size} color="#FFB800" />);
    }
    return stars;
  };

  const sortedImages = [...images].sort(
    (a, b) => a.product_image_sequence_number - b.product_image_sequence_number
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Product Details</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#0078D7" />
          <Text style={styles.loaderText}>Loading product...</Text>
        </View>
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Product Details</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#CCC" />
          <Text style={styles.errorText}>{error || 'Product not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchProductDetails}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const avgRating = ratingInfo?.average_rating || 0;
  const totalRatings = ratingInfo?.total_ratings || 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Product Details</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0078D7']} />
        }
      >
        {/* Image Carousel */}
        {sortedImages.length > 0 ? (
          <View>
            <FlatList
              data={sortedImages}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / width);
                setActiveImageIndex(index);
              }}
              renderItem={({ item }) => (
                <Image
                  source={{ uri: getImageUri(item.product_image_url)! }}
                  style={styles.carouselImage}
                  resizeMode="cover"
                />
              )}
              keyExtractor={(item) => item.product_image_id}
            />
            {sortedImages.length > 1 && (
              <View style={styles.dotsContainer}>
                {sortedImages.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.dot,
                      index === activeImageIndex && styles.dotActive,
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.noImageContainer}>
            <Ionicons name="image-outline" size={64} color="#CCC" />
            <Text style={styles.noImageText}>No images available</Text>
          </View>
        )}

        {/* Product Info */}
        <View style={styles.productInfoCard}>
          <Text style={styles.productName}>{product.product_name}</Text>

          {/* Status Badge */}
          <View style={styles.statusRow}>
            <View style={[
              styles.statusBadge,
              { backgroundColor: product.is_product_active ? '#E8F5E9' : '#FFEBEE' }
            ]}>
              <Ionicons
                name={product.is_product_active ? 'checkmark-circle' : 'close-circle'}
                size={14}
                color={product.is_product_active ? '#28A745' : '#DC3545'}
              />
              <Text style={{
                fontSize: 12,
                fontWeight: '600',
                color: product.is_product_active ? '#28A745' : '#DC3545',
              }}>
                {product.is_product_active ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>

          {/* Rating */}
          {totalRatings > 0 && (
            <View style={styles.ratingRow}>
              <View style={styles.starsRow}>{renderStars(avgRating)}</View>
              <Text style={styles.ratingText}>{avgRating.toFixed(1)}</Text>
              <Text style={styles.ratingCount}>({totalRatings} reviews)</Text>
            </View>
          )}

          {/* Price & Quantity */}
          <View style={styles.priceQtyRow}>
            <View style={styles.priceBox}>
              <Text style={styles.priceLabel}>Price</Text>
              <Text style={styles.priceValue}>{product.product_price}</Text>
            </View>
            <View style={styles.qtyBox}>
              <Text style={styles.priceLabel}>Quantity</Text>
              <Text style={styles.qtyValue}>{product.product_quantity}</Text>
            </View>
          </View>

          {/* Description */}
          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descriptionText}>{product.product_description}</Text>
          </View>
        </View>

        {/* Ratings & Reviews */}
        {ratings.length > 0 && (
          <View style={styles.reviewsSection}>
            <Text style={styles.sectionTitle}>Reviews ({ratings.length})</Text>
            {ratings.slice(0, 5).map((review: any, index: number) => (
              <View key={review.product_id + '-' + index} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.starsRow}>{renderStars(review.rating, 14)}</View>
                  <Text style={styles.reviewDate}>
                    {new Date(review.created_at).toLocaleDateString()}
                  </Text>
                </View>
                {review.remarks && (
                  <Text style={styles.reviewText}>{review.remarks}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.enquireButton}>
          <Ionicons name="chatbubble-outline" size={20} color="#FFFFFF" />
          <Text style={styles.enquireButtonText}>Enquire Now</Text>
        </TouchableOpacity>
      </View>
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
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
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
  scrollView: {
    flex: 1,
  },
  carouselImage: {
    width: width,
    height: 300,
    backgroundColor: '#F0F0F0',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
    width: 24,
  },
  noImageContainer: {
    width: '100%',
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
  },
  noImageText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  productInfoCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 16,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  productName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  starsRow: {
    flexDirection: 'row',
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginLeft: 6,
  },
  ratingCount: {
    fontSize: 13,
    color: '#888',
    marginLeft: 4,
  },
  priceQtyRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  priceBox: {
    flex: 1,
    backgroundColor: '#E8F5E9',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  qtyBox: {
    flex: 1,
    backgroundColor: '#E3F2FD',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#28A745',
  },
  qtyValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0078D7',
  },
  descriptionSection: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
  },
  reviewsSection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  reviewDate: {
    fontSize: 11,
    color: '#999',
  },
  reviewText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  enquireButton: {
    backgroundColor: '#0078D7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  enquireButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default ProductDetailScreen;

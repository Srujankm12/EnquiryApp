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
  TextInput,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [companySocial, setCompanySocial] = useState<any>(null);
  const [companyRatingInfo, setCompanyRatingInfo] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  // Product rating state
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [existingUserRating, setExistingUserRating] = useState<any>(null);

  useEffect(() => {
    fetchProductDetails();
  }, [product_id]);

  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await AsyncStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // Decode user ID
      if (token) {
        try {
          const decoded: any = jwtDecode(token);
          setCurrentUserId(decoded.user_id || '');
        } catch {}
      }

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

        // Fetch company info for the product
        const productCompanyId = (data.product || data)?.company_id;
        if (productCompanyId) {
          // Fetch company complete details
          try {
            const companyRes = await axios.get(
              `${API_URL}/company/get/complete/${productCompanyId}`,
              { headers }
            );
            const compDetails = companyRes.data.data?.company_details;
            if (compDetails) {
              setCompanyInfo(compDetails.company || compDetails);
              setCompanyRatingInfo(compDetails.rating_info || null);
            } else {
              const compData = companyRes.data.data?.company || companyRes.data.data;
              setCompanyInfo(compData);
            }
          } catch {
            // Fallback: fetch basic company info
            try {
              const basicRes = await axios.get(
                `${API_URL}/company/get/${productCompanyId}`,
                { headers }
              );
              setCompanyInfo(basicRes.data.data?.company || basicRes.data.data);
            } catch {
              setCompanyInfo(null);
            }
          }

          // Fetch company social details
          try {
            const socialRes = await axios.get(
              `${API_URL}/company/social/get/${productCompanyId}`,
              { headers }
            );
            setCompanySocial(socialRes.data.data?.social_details || socialRes.data.data);
          } catch {
            setCompanySocial(null);
          }

          // Fetch company average rating
          if (!companyRatingInfo) {
            try {
              const compRatingRes = await axios.get(
                `${API_URL}/company/rating/get/average/${productCompanyId}`,
                { headers }
              );
              setCompanyRatingInfo(compRatingRes.data.data?.rating_info || compRatingRes.data.data);
            } catch {
              setCompanyRatingInfo(null);
            }
          }
        }
      }

      // Fetch product ratings
      try {
        const ratingsRes = await axios.get(
          `${API_URL}/product/rating/get/${product_id}`,
          { headers }
        );
        const ratingsData = ratingsRes.data.data?.ratings || ratingsRes.data.data || [];
        const ratingsList = Array.isArray(ratingsData) ? ratingsData : [];
        setRatings(ratingsList);

        // Check for existing user rating
        if (token) {
          const decoded: any = jwtDecode(token);
          const existingRating = ratingsList.find(
            (r: any) => r.user_id === decoded.user_id
          );
          if (existingRating) {
            setExistingUserRating(existingRating);
            setUserRating(existingRating.rating);
            setReviewText(existingRating.remarks || '');
          }
        }
      } catch {
        setRatings([]);
      }

      // Fetch product average rating from dedicated endpoint
      try {
        const avgRes = await axios.get(
          `${API_URL}/product/rating/get/average/${product_id}`,
          { headers }
        );
        const avgData = avgRes.data.data?.rating_info || avgRes.data.data;
        if (avgData) {
          setRatingInfo(avgData);
        }
      } catch {
        // Keep rating info from complete details
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

  const handleSubmitRating = async () => {
    if (userRating === 0) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }

    try {
      setSubmittingRating(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      if (existingUserRating) {
        await axios.put(
          `${API_URL}/product/rating/update`,
          {
            product_id: product_id as string,
            user_id: currentUserId,
            rating: userRating,
            remarks: reviewText.trim() || undefined,
          },
          { headers }
        );
        Alert.alert('Success', 'Your rating has been updated');
      } else {
        await axios.post(
          `${API_URL}/product/rating/create`,
          {
            product_id: product_id as string,
            user_id: currentUserId,
            rating: userRating,
            remarks: reviewText.trim() || undefined,
          },
          { headers }
        );
        Alert.alert('Success', 'Thank you for your rating!');
      }

      setShowRatingForm(false);
      fetchProductDetails();
    } catch (error: any) {
      console.error('Error submitting rating:', error?.response?.data || error);
      const msg = error.response?.data?.message || 'Failed to submit rating. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleDeleteRating = async () => {
    if (!existingUserRating) return;

    Alert.alert('Delete Rating', 'Are you sure you want to delete your rating?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem('token');
            if (!token) return;
            await axios.delete(
              `${API_URL}/product/rating/delete/${product_id}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            setExistingUserRating(null);
            setUserRating(0);
            setReviewText('');
            Alert.alert('Success', 'Rating deleted');
            fetchProductDetails();
          } catch (error: any) {
            Alert.alert('Error', error?.response?.data?.message || 'Failed to delete rating');
          }
        },
      },
    ]);
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

  const renderSelectableStars = () => {
    return (
      <View style={styles.selectableStarsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity key={star} onPress={() => setUserRating(star)}>
            <Ionicons
              name={star <= userRating ? 'star' : 'star-outline'}
              size={36}
              color="#FFB800"
              style={{ marginHorizontal: 4 }}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
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
  const companyAvgRating = companyRatingInfo?.average_rating || 0;
  const companyTotalRatings = companyRatingInfo?.total_ratings || 0;

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
            <View style={styles.imageCountBadge}>
              <Ionicons name="images-outline" size={14} color="#FFFFFF" />
              <Text style={styles.imageCountText}>
                {activeImageIndex + 1}/{sortedImages.length}
              </Text>
            </View>
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

        {/* Product Info Card */}
        <View style={styles.productInfoCard}>
          <View style={styles.productNameRow}>
            <Text style={styles.productName}>{product.product_name}</Text>
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
                fontSize: 11,
                fontWeight: '600',
                color: product.is_product_active ? '#28A745' : '#DC3545',
              }}>
                {product.is_product_active ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>

          {/* Rating Summary */}
          <View style={styles.ratingRow}>
            <View style={styles.starsRow}>{renderStars(avgRating)}</View>
            <Text style={styles.ratingText}>{avgRating.toFixed(1)}</Text>
            <Text style={styles.ratingCount}>({totalRatings} {totalRatings === 1 ? 'review' : 'reviews'})</Text>
          </View>

          {/* Price & Quantity */}
          <View style={styles.priceQtyRow}>
            <View style={styles.priceBox}>
              <Ionicons name="pricetag-outline" size={18} color="#28A745" />
              <Text style={styles.priceLabel}>Price</Text>
              <Text style={styles.priceValue}>{product.product_price}</Text>
            </View>
            <View style={styles.qtyBox}>
              <Ionicons name="cube-outline" size={18} color="#0078D7" />
              <Text style={styles.priceLabel}>Quantity</Text>
              <Text style={styles.qtyValue}>{product.product_quantity}</Text>
            </View>
          </View>

          {/* Product Details Grid */}
          <View style={styles.detailsGrid}>
            {product.product_category_id && (
              <View style={styles.detailItem}>
                <Ionicons name="grid-outline" size={16} color="#666" />
                <Text style={styles.detailLabel}>Category</Text>
                <Text style={styles.detailValue}>Available</Text>
              </View>
            )}
            {product.created_at && (
              <View style={styles.detailItem}>
                <Ionicons name="calendar-outline" size={16} color="#666" />
                <Text style={styles.detailLabel}>Listed</Text>
                <Text style={styles.detailValue}>
                  {new Date(product.created_at).toLocaleDateString()}
                </Text>
              </View>
            )}
            {product.updated_at && (
              <View style={styles.detailItem}>
                <Ionicons name="time-outline" size={16} color="#666" />
                <Text style={styles.detailLabel}>Updated</Text>
                <Text style={styles.detailValue}>
                  {new Date(product.updated_at).toLocaleDateString()}
                </Text>
              </View>
            )}
          </View>

          {/* Description */}
          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="document-text-outline" size={16} color="#1A1A1A" /> Description
            </Text>
            <Text style={styles.descriptionText}>{product.product_description}</Text>
          </View>
        </View>

        {/* Seller Info Card - Enhanced */}
        {companyInfo && (
          <View style={styles.sellerCard}>
            <Text style={styles.sellerCardTitle}>Sold By</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() =>
                router.push({
                  pathname: '/pages/bussinesProfile' as any,
                  params: { company_id: companyInfo.company_id },
                })
              }
            >
              <View style={styles.sellerHeader}>
                {companyInfo.company_profile_url ? (
                  <Image
                    source={{ uri: getImageUri(companyInfo.company_profile_url)! }}
                    style={styles.sellerLogo}
                  />
                ) : (
                  <View style={[styles.sellerLogo, styles.sellerLogoPlaceholder]}>
                    <Ionicons name="business" size={28} color="#0078D7" />
                  </View>
                )}
                <View style={styles.sellerInfo}>
                  <View style={styles.sellerNameRow}>
                    <Text style={styles.sellerName}>{companyInfo.company_name}</Text>
                    {companyInfo.is_verified && (
                      <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                    )}
                  </View>
                  <Text style={styles.sellerLocation}>
                    <Ionicons name="location-outline" size={12} color="#888" />
                    {' '}{companyInfo.company_city}, {companyInfo.company_state}
                    {companyInfo.company_pincode ? ` - ${companyInfo.company_pincode}` : ''}
                  </Text>
                  {companyTotalRatings > 0 && (
                    <View style={styles.sellerRatingRow}>
                      <View style={styles.starsRow}>{renderStars(companyAvgRating, 12)}</View>
                      <Text style={styles.sellerRatingText}>
                        {companyAvgRating.toFixed(1)} ({companyTotalRatings})
                      </Text>
                    </View>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </View>
            </TouchableOpacity>

            {/* Company Contact Actions */}
            <View style={styles.companyContactRow}>
              {companyInfo.company_phone && (
                <TouchableOpacity
                  style={styles.contactButton}
                  onPress={() => Linking.openURL(`tel:${companyInfo.company_phone}`)}
                >
                  <Ionicons name="call-outline" size={18} color="#0078D7" />
                  <Text style={styles.contactButtonText}>Call</Text>
                </TouchableOpacity>
              )}
              {companyInfo.company_email && (
                <TouchableOpacity
                  style={styles.contactButton}
                  onPress={() => Linking.openURL(`mailto:${companyInfo.company_email}`)}
                >
                  <Ionicons name="mail-outline" size={18} color="#0078D7" />
                  <Text style={styles.contactButtonText}>Email</Text>
                </TouchableOpacity>
              )}
              {(companySocial?.whatsapp_number || companyInfo.company_phone) && (
                <TouchableOpacity
                  style={styles.contactButton}
                  onPress={() =>
                    Linking.openURL(
                      `whatsapp://send?phone=${companySocial?.whatsapp_number || companyInfo.company_phone}`
                    )
                  }
                >
                  <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
                  <Text style={styles.contactButtonText}>WhatsApp</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.contactButton}
                onPress={() =>
                  router.push({
                    pathname: '/pages/bussinesProfile' as any,
                    params: { company_id: companyInfo.company_id },
                  })
                }
              >
                <Ionicons name="storefront-outline" size={18} color="#0078D7" />
                <Text style={styles.contactButtonText}>Profile</Text>
              </TouchableOpacity>
            </View>

            {/* Company Address */}
            {companyInfo.company_address && (
              <View style={styles.companyAddressRow}>
                <Ionicons name="location" size={16} color="#666" />
                <Text style={styles.companyAddressText}>
                  {companyInfo.company_address}, {companyInfo.company_city}, {companyInfo.company_state}
                  {companyInfo.company_pincode ? ` - ${companyInfo.company_pincode}` : ''}
                </Text>
              </View>
            )}

            {/* Company Establishment */}
            {companyInfo.company_establishment_date && (
              <View style={styles.companyEstRow}>
                <Ionicons name="calendar" size={14} color="#888" />
                <Text style={styles.companyEstText}>
                  Established: {new Date(companyInfo.company_establishment_date).getFullYear()}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Rate This Product */}
        <View style={styles.rateSection}>
          <View style={styles.rateSectionHeader}>
            <Text style={styles.sectionTitle}>Ratings & Reviews</Text>
            <TouchableOpacity
              style={styles.rateButton}
              onPress={() => setShowRatingForm(!showRatingForm)}
            >
              <Ionicons name="star" size={16} color="#FFB800" />
              <Text style={styles.rateButtonText}>
                {existingUserRating ? 'Edit Rating' : 'Rate Product'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Rating Summary */}
          <View style={styles.ratingsSummaryCard}>
            <View style={styles.avgRatingBox}>
              <Text style={styles.avgRatingNumber}>{avgRating.toFixed(1)}</Text>
              <View style={styles.avgRatingStars}>{renderStars(avgRating, 16)}</View>
              <Text style={styles.avgRatingCount}>
                {totalRatings} {totalRatings === 1 ? 'review' : 'reviews'}
              </Text>
            </View>
          </View>

          {/* Rating Form */}
          {showRatingForm && (
            <View style={styles.ratingFormCard}>
              <Text style={styles.ratingFormTitle}>
                {existingUserRating ? 'Update Your Rating' : 'Rate This Product'}
              </Text>
              {renderSelectableStars()}
              <TextInput
                style={styles.reviewInput}
                placeholder="Write a review (optional)"
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                value={reviewText}
                onChangeText={setReviewText}
                maxLength={1000}
              />
              <View style={styles.ratingFormActions}>
                <TouchableOpacity
                  style={styles.submitRatingButton}
                  onPress={handleSubmitRating}
                  disabled={submittingRating}
                >
                  {submittingRating ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitRatingText}>
                      {existingUserRating ? 'Update' : 'Submit'}
                    </Text>
                  )}
                </TouchableOpacity>
                {existingUserRating && (
                  <TouchableOpacity
                    style={styles.deleteRatingButton}
                    onPress={handleDeleteRating}
                  >
                    <Text style={styles.deleteRatingText}>Delete</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.cancelRatingButton}
                  onPress={() => setShowRatingForm(false)}
                >
                  <Text style={styles.cancelRatingText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Reviews List */}
          {ratings.length > 0 ? (
            <View style={styles.reviewsList}>
              {ratings.slice(0, 10).map((review: any, index: number) => (
                <View key={(review.rating_id || review.product_id) + '-' + index} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.starsRow}>{renderStars(review.rating, 14)}</View>
                    <Text style={styles.reviewDate}>
                      {new Date(review.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  {review.remarks && (
                    <Text style={styles.reviewText}>{review.remarks}</Text>
                  )}
                  {review.user_id === currentUserId && (
                    <Text style={styles.yourReviewBadge}>Your review</Text>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.noReviewsContainer}>
              <Ionicons name="chatbubble-outline" size={32} color="#CCC" />
              <Text style={styles.noReviewsText}>No reviews yet. Be the first to rate!</Text>
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.enquireButton}
          onPress={() => {
            if (companyInfo) {
              router.push({
                pathname: '/pages/requestQutation' as any,
                params: {
                  product_id: product.product_id,
                  product_name: product.product_name,
                  company_id: companyInfo.company_id,
                },
              });
            }
          }}
        >
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
    height: 320,
    backgroundColor: '#F0F0F0',
  },
  imageCountBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 4,
  },
  imageCountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
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
  productNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  productName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    flex: 1,
    marginRight: 8,
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
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 4,
  },
  qtyBox: {
    flex: 1,
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 4,
  },
  priceLabel: {
    fontSize: 12,
    color: '#666',
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
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  detailLabel: {
    fontSize: 12,
    color: '#888',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
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
  sellerCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  sellerCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  sellerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sellerLogo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F0F0F0',
  },
  sellerLogoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
  },
  sellerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  sellerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  sellerName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  sellerLocation: {
    fontSize: 13,
    color: '#888',
    marginBottom: 4,
  },
  sellerRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sellerRatingText: {
    fontSize: 12,
    color: '#888',
    marginLeft: 2,
  },
  companyContactRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  contactButton: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
  },
  contactButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  companyAddressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 8,
  },
  companyAddressText: {
    fontSize: 13,
    color: '#555',
    flex: 1,
    lineHeight: 20,
  },
  companyEstRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  companyEstText: {
    fontSize: 12,
    color: '#888',
  },
  rateSection: {
    marginBottom: 16,
  },
  rateSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  rateButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F59E0B',
  },
  ratingsSummaryCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    marginBottom: 12,
  },
  avgRatingBox: {
    alignItems: 'center',
  },
  avgRatingNumber: {
    fontSize: 36,
    fontWeight: '700',
    color: '#000',
  },
  avgRatingStars: {
    flexDirection: 'row',
    marginVertical: 6,
  },
  avgRatingCount: {
    fontSize: 13,
    color: '#888',
  },
  ratingFormCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  ratingFormTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
    textAlign: 'center',
  },
  selectableStarsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#000',
    backgroundColor: '#FAFAFA',
    height: 80,
    marginBottom: 12,
  },
  ratingFormActions: {
    flexDirection: 'row',
    gap: 8,
  },
  submitRatingButton: {
    flex: 1,
    backgroundColor: '#0078D7',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitRatingText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  deleteRatingButton: {
    backgroundColor: '#FFF5F5',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F5C6CB',
    alignItems: 'center',
  },
  deleteRatingText: {
    color: '#DC3545',
    fontSize: 15,
    fontWeight: '600',
  },
  cancelRatingButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
  },
  cancelRatingText: {
    color: '#666',
    fontSize: 15,
    fontWeight: '600',
  },
  reviewsList: {
    paddingHorizontal: 16,
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
  yourReviewBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0078D7',
    marginTop: 6,
  },
  noReviewsContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  noReviewsText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
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

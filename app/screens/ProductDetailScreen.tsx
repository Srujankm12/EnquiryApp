import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Constants from "expo-constants";
import { useLocalSearchParams, useRouter } from "expo-router";
import { jwtDecode } from "jwt-decode";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  addFollowToCache,
  fetchFollowedCompanyIds,
  removeFollowFromCache,
} from "../utils/followState";

const { width } = Dimensions.get("window");
const API_URL = Constants.expoConfig?.extra?.API_URL;
const S3_URL = Constants.expoConfig?.extra?.S3_FETCH_URL;
const CLOUDFRONT_URL = Constants.expoConfig?.extra?.CLOUDFRONT_URL;

const getImageUri = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const path = url.startsWith("/") ? url : `/${url}`;
  if (CLOUDFRONT_URL) return `${CLOUDFRONT_URL}${path}`;
  return `${S3_URL}${path}`;
};

const ProductDetailScreen = () => {
  const router = useRouter();
  const { product_id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [productDetails, setProductDetails] = useState<any>(null);
  const [images, setImages] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  // Follow state
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // Rating state
  const [ratings, setRatings] = useState<any[]>([]);
  const [ratingInfo, setRatingInfo] = useState<any>(null);
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);
  const [existingUserRating, setExistingUserRating] = useState<any>(null);

  useEffect(() => {
    fetchProductDetails();
  }, [product_id]);

  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await AsyncStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      if (token) {
        try {
          const decoded: any = jwtDecode(token);
          setCurrentUserId(decoded.user_id || "");
        } catch {}
      }

      // Backend: GET /product/get/{id} - returns CompleteProduct with business/category info
      const res = await axios.get(`${API_URL}/product/get/${product_id}`, {
        headers,
      });
      const data = res.data?.product_details;

      if (data) {
        setProductDetails(data);

        // Check follow status for business
        if (data.business_id && token) {
          try {
            const decoded: any = jwtDecode(token);
            const followedIds = await fetchFollowedCompanyIds(
              decoded.user_id,
              token,
            );
            setIsFollowing(followedIds.has(String(data.business_id)));
          } catch {}
        }
      }

      // Try to fetch product images (optional endpoint)
      try {
        const imgRes = await axios.get(
          `${API_URL}/product/image/get/${product_id}`,
          { headers },
        );
        setImages(imgRes.data?.images || imgRes.data?.data?.images || []);
      } catch {
        setImages([]);
      }

      // Try to fetch product ratings (optional endpoint)
      try {
        const ratingsRes = await axios.get(
          `${API_URL}/product/rating/get/${product_id}`,
          { headers },
        );
        const ratingsData =
          ratingsRes.data?.ratings || ratingsRes.data?.data?.ratings || [];
        const ratingsList = Array.isArray(ratingsData) ? ratingsData : [];
        setRatings(ratingsList);

        if (token) {
          const decoded: any = jwtDecode(token);
          const existing = ratingsList.find(
            (r: any) => r.user_id === decoded.user_id,
          );
          if (existing) {
            setExistingUserRating(existing);
            setUserRating(existing.rating);
            setReviewText(existing.remarks || "");
          }
        }
      } catch {
        setRatings([]);
      }

      try {
        const avgRes = await axios.get(
          `${API_URL}/product/rating/get/average/${product_id}`,
          { headers },
        );
        setRatingInfo(
          avgRes.data?.rating_info || avgRes.data?.data?.rating_info || null,
        );
      } catch {
        setRatingInfo(null);
      }
    } catch (error: any) {
      console.error("Error fetching product details:", error);
      setError("Unable to load product details. Please try again.");
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
      Alert.alert("Error", "Please select a rating");
      return;
    }
    try {
      setSubmittingRating(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) return;
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
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
          { headers },
        );
        Alert.alert("Success", "Your rating has been updated");
      } else {
        await axios.post(
          `${API_URL}/product/rating/create`,
          {
            product_id: product_id as string,
            user_id: currentUserId,
            rating: userRating,
            remarks: reviewText.trim() || undefined,
          },
          { headers },
        );
        Alert.alert("Success", "Thank you for your rating!");
      }
      setShowRatingForm(false);
      fetchProductDetails();
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to submit rating.",
      );
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleDeleteRating = async () => {
    if (!existingUserRating) return;
    Alert.alert(
      "Delete Rating",
      "Are you sure you want to delete your rating?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem("token");
              if (!token) return;
              await axios.delete(
                `${API_URL}/product/rating/delete/${product_id}`,
                {
                  headers: { Authorization: `Bearer ${token}` },
                },
              );
              setExistingUserRating(null);
              setUserRating(0);
              setReviewText("");
              Alert.alert("Success", "Rating deleted");
              fetchProductDetails();
            } catch (error: any) {
              Alert.alert(
                "Error",
                error?.response?.data?.message || "Failed to delete rating",
              );
            }
          },
        },
      ],
    );
  };

  const performFollowAction = async (shouldUnfollow: boolean) => {
    if (!productDetails?.business_id) return;
    try {
      setFollowLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) return;
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };
      const decoded: any = jwtDecode(token);

      if (shouldUnfollow) {
        await axios.post(
          `${API_URL}/follower/unfollow`,
          {
            user_id: decoded.user_id,
            business_id: productDetails.business_id,
          },
          { headers },
        );
        setIsFollowing(false);
        await removeFollowFromCache(productDetails.business_id);
      } else {
        await axios.post(
          `${API_URL}/follower/follow`,
          {
            user_id: decoded.user_id,
            business_id: productDetails.business_id,
          },
          { headers },
        );
        setIsFollowing(true);
        await addFollowToCache(productDetails.business_id);
      }
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.response?.data?.message || "Failed to update follow status",
      );
    } finally {
      setFollowLoading(false);
    }
  };

  const handleFollowCompany = () => {
    if (!productDetails?.business_id || followLoading) return;
    if (isFollowing) {
      Alert.alert(
        "Unfollow",
        `Are you sure you want to unfollow ${productDetails.business_name || "this business"}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Unfollow",
            style: "destructive",
            onPress: () => performFollowAction(true),
          },
        ],
      );
    } else {
      performFollowAction(false);
    }
  };

  const renderStars = (rating: number, size: number = 16) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Ionicons key={`full-${i}`} name="star" size={size} color="#FFB800" />,
      );
    }
    if (hasHalf)
      stars.push(
        <Ionicons key="half" name="star-half" size={size} color="#FFB800" />,
      );
    for (let i = 0; i < 5 - Math.ceil(rating); i++) {
      stars.push(
        <Ionicons
          key={`empty-${i}`}
          name="star-outline"
          size={size}
          color="#FFB800"
        />,
      );
    }
    return stars;
  };

  const renderSelectableStars = () => (
    <View style={styles.selectableStarsRow}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity key={star} onPress={() => setUserRating(star)}>
          <Ionicons
            name={star <= userRating ? "star" : "star-outline"}
            size={36}
            color="#FFB800"
            style={{ marginHorizontal: 4 }}
          />
        </TouchableOpacity>
      ))}
    </View>
  );

  const sortedImages = [...images].sort(
    (a, b) =>
      (a.product_image_sequence_number || 0) -
      (b.product_image_sequence_number || 0),
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
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

  if (error || !productDetails) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Product Details</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#CCC" />
          <Text style={styles.errorText}>{error || "Product not found"}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchProductDetails}
          >
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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Product Details
        </Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#0078D7"]}
          />
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
              onMomentumScrollEnd={(e) =>
                setActiveImageIndex(
                  Math.round(e.nativeEvent.contentOffset.x / width),
                )
              }
              renderItem={({ item }) => (
                <Image
                  source={{
                    uri: getImageUri(item.product_image_url || item.image)!,
                  }}
                  style={styles.carouselImage}
                  resizeMode="cover"
                />
              )}
              keyExtractor={(item, index) => item.id || `img-${index}`}
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
            <Text style={styles.productName}>
              {productDetails.product_name}
            </Text>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: productDetails.is_product_active
                    ? "#E8F5E9"
                    : "#FFEBEE",
                },
              ]}
            >
              <Ionicons
                name={
                  productDetails.is_product_active
                    ? "checkmark-circle"
                    : "close-circle"
                }
                size={14}
                color={productDetails.is_product_active ? "#28A745" : "#DC3545"}
              />
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "600",
                  color: productDetails.is_product_active
                    ? "#28A745"
                    : "#DC3545",
                }}
              >
                {productDetails.is_product_active ? "Active" : "Inactive"}
              </Text>
            </View>
          </View>

          {totalRatings > 0 && (
            <View style={styles.ratingRow}>
              <View style={styles.starsRow}>{renderStars(avgRating)}</View>
              <Text style={styles.ratingText}>{avgRating.toFixed(1)}</Text>
              <Text style={styles.ratingCount}>
                ({totalRatings} {totalRatings === 1 ? "review" : "reviews"})
              </Text>
            </View>
          )}

          <View style={styles.priceQtyRow}>
            <View style={styles.priceBox}>
              <Ionicons name="pricetag-outline" size={18} color="#28A745" />
              <Text style={styles.priceLabel}>Price</Text>
              <Text style={styles.priceValue}>
                Rs {productDetails.price}/{productDetails.unit}
              </Text>
            </View>
            <View style={styles.qtyBox}>
              <Ionicons name="cube-outline" size={18} color="#0078D7" />
              <Text style={styles.priceLabel}>Quantity</Text>
              <Text style={styles.qtyValue}>
                {productDetails.quantity} {productDetails.unit}
              </Text>
            </View>
          </View>

          {productDetails.moq && (
            <View style={styles.moqRow}>
              <Ionicons name="layers-outline" size={16} color="#666" />
              <Text style={styles.moqLabel}>Minimum Order:</Text>
              <Text style={styles.moqValue}>{productDetails.moq}</Text>
            </View>
          )}

          <View style={styles.detailsGrid}>
            {productDetails.category_name && (
              <View style={styles.detailItem}>
                <Ionicons name="grid-outline" size={16} color="#666" />
                <Text style={styles.detailLabel}>Category</Text>
                <Text style={styles.detailValue}>
                  {productDetails.category_name}
                </Text>
              </View>
            )}
            {productDetails.sub_category_name && (
              <View style={styles.detailItem}>
                <Ionicons name="layers-outline" size={16} color="#666" />
                <Text style={styles.detailLabel}>Sub-Category</Text>
                <Text style={styles.detailValue}>
                  {productDetails.sub_category_name}
                </Text>
              </View>
            )}
            {productDetails.created_at && (
              <View style={styles.detailItem}>
                <Ionicons name="calendar-outline" size={16} color="#666" />
                <Text style={styles.detailLabel}>Listed</Text>
                <Text style={styles.detailValue}>
                  {new Date(productDetails.created_at).toLocaleDateString()}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Seller Info */}
        {productDetails.business_id && (
          <View style={styles.sellerCard}>
            <Text style={styles.sellerCardTitle}>Sold By</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() =>
                router.push({
                  pathname: "/pages/bussinesProfile" as any,
                  params: { business_id: productDetails.business_id },
                })
              }
            >
              <View style={styles.sellerHeader}>
                <View style={[styles.sellerLogo, styles.sellerLogoPlaceholder]}>
                  <Ionicons name="business" size={28} color="#0078D7" />
                </View>
                <View style={styles.sellerInfo}>
                  <Text style={styles.sellerName}>
                    {productDetails.business_name}
                  </Text>
                  <Text style={styles.sellerLocation}>
                    <Ionicons name="location-outline" size={12} color="#888" />{" "}
                    {productDetails.city}, {productDetails.state}
                    {productDetails.pincode
                      ? ` - ${productDetails.pincode}`
                      : ""}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </View>
            </TouchableOpacity>

            <View style={styles.companyContactRow}>
              {productDetails.business_phone && (
                <TouchableOpacity
                  style={styles.contactButton}
                  onPress={() =>
                    Linking.openURL(`tel:${productDetails.business_phone}`)
                  }
                >
                  <Ionicons name="call-outline" size={18} color="#0078D7" />
                  <Text style={styles.contactButtonText}>Call</Text>
                </TouchableOpacity>
              )}
              {productDetails.business_email && (
                <TouchableOpacity
                  style={styles.contactButton}
                  onPress={() =>
                    Linking.openURL(`mailto:${productDetails.business_email}`)
                  }
                >
                  <Ionicons name="mail-outline" size={18} color="#0078D7" />
                  <Text style={styles.contactButtonText}>Email</Text>
                </TouchableOpacity>
              )}
              {productDetails.business_phone && (
                <TouchableOpacity
                  style={styles.contactButton}
                  onPress={() =>
                    Linking.openURL(
                      `whatsapp://send?phone=${productDetails.business_phone}`,
                    )
                  }
                >
                  <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
                  <Text style={styles.contactButtonText}>WhatsApp</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.followCompanyButton,
                isFollowing && styles.followingCompanyButton,
              ]}
              onPress={handleFollowCompany}
              disabled={followLoading}
            >
              {followLoading ? (
                <ActivityIndicator
                  size="small"
                  color={isFollowing ? "#0078D7" : "#FFFFFF"}
                />
              ) : (
                <>
                  <Ionicons
                    name={
                      isFollowing ? "checkmark-circle" : "add-circle-outline"
                    }
                    size={18}
                    color={isFollowing ? "#0078D7" : "#FFFFFF"}
                  />
                  <Text
                    style={[
                      styles.followCompanyText,
                      isFollowing && styles.followingCompanyText,
                    ]}
                  >
                    {isFollowing ? "Following" : "Follow Business"}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {productDetails.address && (
              <View style={styles.companyAddressRow}>
                <Ionicons name="location" size={16} color="#666" />
                <Text style={styles.companyAddressText}>
                  {productDetails.address}, {productDetails.city},{" "}
                  {productDetails.state}
                  {productDetails.pincode ? ` - ${productDetails.pincode}` : ""}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Ratings */}
        <View style={styles.rateSection}>
          <View style={styles.rateSectionHeader}>
            <Text style={styles.sectionTitle}>Ratings & Reviews</Text>
            <TouchableOpacity
              style={styles.rateButton}
              onPress={() => setShowRatingForm(!showRatingForm)}
            >
              <Ionicons name="star" size={16} color="#FFB800" />
              <Text style={styles.rateButtonText}>
                {existingUserRating ? "Edit Rating" : "Rate Product"}
              </Text>
            </TouchableOpacity>
          </View>

          {totalRatings > 0 && (
            <View style={styles.ratingsSummaryCard}>
              <View style={styles.avgRatingBox}>
                <Text style={styles.avgRatingNumber}>
                  {avgRating.toFixed(1)}
                </Text>
                <View style={styles.avgRatingStars}>
                  {renderStars(avgRating, 16)}
                </View>
                <Text style={styles.avgRatingCount}>
                  {totalRatings} {totalRatings === 1 ? "review" : "reviews"}
                </Text>
              </View>
            </View>
          )}

          {showRatingForm && (
            <View style={styles.ratingFormCard}>
              <Text style={styles.ratingFormTitle}>
                {existingUserRating
                  ? "Update Your Rating"
                  : "Rate This Product"}
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
                      {existingUserRating ? "Update" : "Submit"}
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

          {ratings.length > 0 ? (
            <View style={styles.reviewsList}>
              {ratings.slice(0, 10).map((review: any, index: number) => (
                <View
                  key={(review.rating_id || review.product_id) + "-" + index}
                  style={styles.reviewCard}
                >
                  <View style={styles.reviewHeader}>
                    <View style={styles.starsRow}>
                      {renderStars(review.rating, 14)}
                    </View>
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
              <Text style={styles.noReviewsText}>
                No reviews yet. Be the first to rate!
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.enquireButton} onPress={() => {
          router.push({ pathname: '/pages/requestQutation' as any, params: { product_id: productDetails.id, product_name: productDetails.product_name, company_id: productDetails.business_id } });
        }}>
          <Ionicons name="chatbubble-outline" size={20} color="#FFFFFF" />
          <Text style={styles.enquireButtonText}>Enquire Now</Text>
        </TouchableOpacity>
      </View> */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  header: {
    backgroundColor: "#1E90FF",
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loaderText: { marginTop: 12, fontSize: 16, color: "#666" },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 16,
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: "#0078D7",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
  scrollView: { flex: 1 },
  carouselImage: { width: width, height: 320, backgroundColor: "#F0F0F0" },
  imageCountBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.6)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 4,
  },
  imageCountText: { color: "#FFFFFF", fontSize: 12, fontWeight: "600" },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    position: "absolute",
    bottom: 16,
    left: 0,
    right: 0,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.5)",
    marginHorizontal: 4,
  },
  dotActive: { backgroundColor: "#FFFFFF", width: 24 },
  noImageContainer: {
    width: "100%",
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
  },
  noImageText: { fontSize: 14, color: "#999", marginTop: 8 },
  productInfoCard: {
    backgroundColor: "#FFFFFF",
    margin: 16,
    borderRadius: 16,
    padding: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  productNameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  productName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1A1A1A",
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 6,
  },
  starsRow: { flexDirection: "row", alignItems: "center" },
  ratingText: { fontSize: 14, fontWeight: "700", color: "#333" },
  ratingCount: { fontSize: 13, color: "#888" },
  priceQtyRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  priceBox: {
    flex: 1,
    backgroundColor: "#F0FFF4",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D4EDDA",
  },
  qtyBox: {
    flex: 1,
    backgroundColor: "#EBF5FF",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D0E8FF",
  },
  priceLabel: { fontSize: 12, color: "#666", marginTop: 4 },
  priceValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#28A745",
    marginTop: 2,
  },
  qtyValue: { fontSize: 18, fontWeight: "700", color: "#0078D7", marginTop: 2 },
  moqRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  moqLabel: { fontSize: 14, color: "#666" },
  moqValue: { fontSize: 14, fontWeight: "600", color: "#333" },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  detailItem: {
    backgroundColor: "#F8F9FA",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    minWidth: (width - 96) / 3,
    flex: 1,
  },
  detailLabel: { fontSize: 11, color: "#888", marginTop: 4 },
  detailValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    marginTop: 2,
    textAlign: "center",
  },
  sellerCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  sellerCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 12,
  },
  sellerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sellerLogo: { width: 56, height: 56, borderRadius: 28 },
  sellerLogoPlaceholder: {
    backgroundColor: "#F0F8FF",
    justifyContent: "center",
    alignItems: "center",
  },
  sellerInfo: { flex: 1, marginLeft: 12 },
  sellerName: { fontSize: 16, fontWeight: "700", color: "#1A1A1A" },
  sellerLocation: { fontSize: 13, color: "#888", marginTop: 4 },
  companyContactRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  contactButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#F0F8FF",
    gap: 4,
  },
  contactButtonText: { fontSize: 12, fontWeight: "600", color: "#0078D7" },
  followCompanyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#0078D7",
    marginBottom: 12,
  },
  followingCompanyButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#0078D7",
  },
  followCompanyText: { fontSize: 15, fontWeight: "600", color: "#FFFFFF" },
  followingCompanyText: { color: "#0078D7" },
  companyAddressRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  companyAddressText: { fontSize: 13, color: "#666", flex: 1, lineHeight: 18 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1A1A1A" },
  rateSection: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  rateSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  rateButton: { flexDirection: "row", alignItems: "center", gap: 4 },
  rateButtonText: { fontSize: 14, fontWeight: "600", color: "#0078D7" },
  ratingsSummaryCard: { marginBottom: 16, alignItems: "center" },
  avgRatingBox: { alignItems: "center" },
  avgRatingNumber: { fontSize: 36, fontWeight: "800", color: "#1A1A1A" },
  avgRatingStars: { flexDirection: "row", marginTop: 4 },
  avgRatingCount: { fontSize: 13, color: "#888", marginTop: 4 },
  selectableStarsRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 12,
  },
  ratingFormCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  ratingFormTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
    textAlign: "center",
  },
  reviewInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#333",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    minHeight: 80,
    textAlignVertical: "top",
  },
  ratingFormActions: { flexDirection: "row", gap: 8, marginTop: 12 },
  submitRatingButton: {
    flex: 1,
    backgroundColor: "#0078D7",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  submitRatingText: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
  deleteRatingButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#FFEBEE",
    alignItems: "center",
  },
  deleteRatingText: { color: "#DC3545", fontSize: 15, fontWeight: "600" },
  cancelRatingButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelRatingText: { color: "#666", fontSize: 15 },
  reviewsList: { gap: 8 },
  reviewCard: { backgroundColor: "#F8F9FA", borderRadius: 10, padding: 14 },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  reviewDate: { fontSize: 12, color: "#999" },
  reviewText: { fontSize: 14, color: "#333", lineHeight: 20 },
  yourReviewBadge: {
    fontSize: 11,
    fontWeight: "600",
    color: "#0078D7",
    marginTop: 8,
    backgroundColor: "#EBF5FF",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  noReviewsContainer: { alignItems: "center", paddingVertical: 20 },
  noReviewsText: { fontSize: 14, color: "#999", marginTop: 8 },
  bottomBar: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  enquireButton: {
    backgroundColor: "#0078D7",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  enquireButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});

export default ProductDetailScreen;

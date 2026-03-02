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
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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

export default function ProductDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { product_id } = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [product, setProduct] = useState<any>(null);
  const [images, setImages] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeImg, setActiveImg] = useState(0);
  const [currentUserId, setCurrentUserId] = useState("");
  const [myBusinessId, setMyBusinessId] = useState("");

  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const [ratings, setRatings] = useState<any[]>([]);
  const [ratingInfo, setRatingInfo] = useState<any>(null);
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [existingRating, setExistingRating] = useState<any>(null);

  const [similarProducts, setSimilarProducts] = useState<any[]>([]);
  const [descExpanded, setDescExpanded] = useState(false);

  useEffect(() => {
    load();
  }, [product_id]);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await AsyncStorage.getItem("token");
      const h = { Authorization: `Bearer ${token}` };

      if (token) {
        const dec: any = jwtDecode(token);
        setCurrentUserId(dec.user_id || "");
        const storedBiz = await AsyncStorage.getItem("companyId");
        setMyBusinessId(dec.business_id || storedBiz || "");
      }

      const res = await axios.get(`${API_URL}/product/get/${product_id}`, {
        headers: h,
      });
      const data = res.data?.product_details;
      if (!data) throw new Error("Not found");
      setProduct(data);

      // Follow check
      if (token) {
        const dec: any = jwtDecode(token);
        const storedBiz = await AsyncStorage.getItem("companyId");
        const ownBiz = dec.business_id || storedBiz || "";
        if (data.business_id && String(data.business_id) !== String(ownBiz)) {
          try {
            const ids = await fetchFollowedCompanyIds(dec.user_id, token);
            setIsFollowing(ids.has(String(data.business_id)));
          } catch {}
        }
      }

      // Similar products
      if (data.category_id) {
        try {
          const sim = await axios.get(
            `${API_URL}/product/get/category/${data.category_id}`,
            { headers: h },
          );
          const raw: any[] = sim.data?.products || [];
          setSimilarProducts(
            raw
              .filter((p) => p.id !== data.id && p.is_product_active !== false)
              .slice(0, 6),
          );
        } catch {
          setSimilarProducts([]);
        }
      }

      // Images
      try {
        const ir = await axios.get(
          `${API_URL}/product/image/get/${product_id}`,
          { headers: h },
        );
        setImages(ir.data?.images || ir.data?.data?.images || []);
      } catch {
        setImages([]);
      }

      // Ratings
      try {
        const rr = await axios.get(
          `${API_URL}/product/rating/get/${product_id}`,
          { headers: h },
        );
        const list = Array.isArray(rr.data?.ratings) ? rr.data.ratings : [];
        setRatings(list);
        if (token) {
          const dec: any = jwtDecode(token);
          const mine = list.find((r: any) => r.user_id === dec.user_id);
          if (mine) {
            setExistingRating(mine);
            setUserRating(mine.rating);
            setReviewText(mine.remarks || "");
          }
        }
      } catch {
        setRatings([]);
      }

      try {
        const ar = await axios.get(
          `${API_URL}/product/rating/get/average/${product_id}`,
          { headers: h },
        );
        setRatingInfo(ar.data?.rating_info || null);
      } catch {
        setRatingInfo(null);
      }
    } catch {
      setError("Unable to load product. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const isOwnBusiness =
    product?.business_id &&
    myBusinessId &&
    String(product.business_id) === String(myBusinessId);

  const handleFollow = () => {
    if (isOwnBusiness || followLoading) return;
    if (isFollowing) {
      Alert.alert("Unfollow", `Unfollow ${product.business_name}?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unfollow",
          style: "destructive",
          onPress: () => doFollow(true),
        },
      ]);
    } else {
      doFollow(false);
    }
  };

  const doFollow = async (unfollow: boolean) => {
    try {
      setFollowLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) return;
      const dec: any = jwtDecode(token);
      const h = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };
      if (unfollow) {
        await axios.post(
          `${API_URL}/follower/unfollow`,
          { user_id: dec.user_id, business_id: product.business_id },
          { headers: h },
        );
        setIsFollowing(false);
        await removeFollowFromCache(product.business_id);
      } else {
        await axios.post(
          `${API_URL}/follower/follow`,
          { user_id: dec.user_id, business_id: product.business_id },
          { headers: h },
        );
        setIsFollowing(true);
        await addFollowToCache(product.business_id);
      }
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message || "Failed");
    } finally {
      setFollowLoading(false);
    }
  };

  const submitRating = async () => {
    if (!userRating) {
      Alert.alert("Error", "Please select a rating");
      return;
    }
    try {
      setSubmitting(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) return;
      const h = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };
      const body = {
        product_id: product_id as string,
        user_id: currentUserId,
        rating: userRating,
        remarks: reviewText.trim() || undefined,
      };
      if (existingRating) {
        await axios.put(`${API_URL}/product/rating/update`, body, {
          headers: h,
        });
        Alert.alert("Success", "Rating updated");
      } else {
        await axios.post(`${API_URL}/product/rating/create`, body, {
          headers: h,
        });
        Alert.alert("Success", "Thank you!");
      }
      setShowRatingForm(false);
      load();
    } catch (e: any) {
      Alert.alert("Error", e.response?.data?.message || "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteRating = async () => {
    Alert.alert("Delete", "Delete your rating?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem("token");
            await axios.delete(
              `${API_URL}/product/rating/delete/${product_id}`,
              { headers: { Authorization: `Bearer ${token}` } },
            );
            setExistingRating(null);
            setUserRating(0);
            setReviewText("");
            load();
          } catch (e: any) {
            Alert.alert("Error", e?.response?.data?.message || "Failed");
          }
        },
      },
    ]);
  };

  const Stars = ({ rating, size = 14 }: { rating: number; size?: number }) => (
    <View style={{ flexDirection: "row" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={
            i <= Math.floor(rating)
              ? "star"
              : i - 0.5 <= rating
                ? "star-half"
                : "star-outline"
          }
          size={size}
          color="#FFB800"
        />
      ))}
    </View>
  );

  const sortedImages = [...images].sort(
    (a, b) =>
      (a.product_image_sequence_number || 0) -
      (b.product_image_sequence_number || 0),
  );

  const hasImages = sortedImages.length > 0;
  const avgRating = ratingInfo?.average_rating || 0;
  const totalRatings = ratingInfo?.total_ratings || 0;

  // ── Loading ──
  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.headerBtn}
          >
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Product Details</Text>
          <View style={styles.headerBtn} />
        </View>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color="#0078D7" />
          <Text style={{ color: "#999", marginTop: 10 }}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.headerBtn}
          >
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Product Details</Text>
          <View style={styles.headerBtn} />
        </View>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 32,
          }}
        >
          <Ionicons name="alert-circle-outline" size={56} color="#CCC" />
          <Text style={{ color: "#888", marginTop: 12, textAlign: "center" }}>
            {error || "Product not found"}
          </Text>
          <TouchableOpacity
            onPress={load}
            style={{
              marginTop: 16,
              backgroundColor: "#0078D7",
              paddingHorizontal: 28,
              paddingVertical: 11,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E90FF" />

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBtn}
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Product Details
        </Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            colors={["#0078D7"]}
            tintColor="#0078D7"
          />
        }
        contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
      >
        {/* ── SECTION 1: Business header ── */}
        <View style={styles.bizHeaderCard}>
          <View style={styles.bizHeaderLeft}>
            <View style={styles.bizLogoLarge}>
              <Ionicons name="business" size={28} color="#0078D7" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bizHeaderName}>{product.business_name}</Text>
              <Text style={styles.bizLocation}>
                {product.city}
                {product.state ? `, ${product.state}` : ""}
              </Text>
              {totalRatings > 0 && (
                <View style={{ marginTop: 3 }}>
                  <Stars rating={avgRating} size={13} />
                </View>
              )}
            </View>
          </View>
          {isOwnBusiness ? (
            <View style={styles.ownBizPill}>
              <Ionicons
                name="shield-checkmark-outline"
                size={13}
                color="#0078D7"
              />
              <Text style={styles.ownBizPillText}>Your Business</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.topFollowBtn,
                isFollowing && styles.topFollowBtnActive,
              ]}
              onPress={handleFollow}
              disabled={followLoading}
            >
              {followLoading ? (
                <ActivityIndicator
                  size="small"
                  color={isFollowing ? "#0078D7" : "#fff"}
                />
              ) : (
                <Text
                  style={[
                    styles.topFollowText,
                    isFollowing && styles.topFollowTextActive,
                  ]}
                >
                  {isFollowing ? "Following" : "Follow"}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* ── SECTION 2: Image carousel OR No Image placeholder ── */}
        <View style={styles.imageSection}>
          {!hasImages ? (
            /* ── No images state ── */
            <View style={styles.noImageContainer}>
              <Ionicons name="image-outline" size={60} color="#C8C8C8" />
              <Text style={styles.noImageTitle}>No Images Available</Text>
              <Text style={styles.noImageSubtitle}>
                This product has no images yet
              </Text>
            </View>
          ) : (
            <>
              <FlatList
                data={sortedImages}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) =>
                  setActiveImg(
                    Math.round(e.nativeEvent.contentOffset.x / width),
                  )
                }
                renderItem={({ item }) => (
                  <Image
                    source={{
                      uri: getImageUri(
                        item.product_image_url || item.image,
                      )!,
                    }}
                    style={styles.mainImage}
                    resizeMode="cover"
                  />
                )}
                keyExtractor={(item, i) => item.id || `img-${i}`}
              />
              {/* Dots */}
              <View style={styles.dotsRow}>
                {sortedImages.map((_, i) => (
                  <View
                    key={i}
                    style={[styles.dot, i === activeImg && styles.dotActive]}
                  />
                ))}
              </View>
              {/* Counter badge */}
              {sortedImages.length > 1 && (
                <View style={styles.imgCountBadge}>
                  <Text style={styles.imgCountText}>
                    {activeImg + 1}/{sortedImages.length}
                  </Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* ── SECTION 3: Product name + price ── */}
        <View style={styles.productHeaderCard}>
          <View style={styles.productNameRow}>
            <Text style={styles.productName} numberOfLines={2}>
              {product.product_name}
            </Text>
            <View
              style={[
                styles.statusChip,
                {
                  backgroundColor: product.is_product_active
                    ? "#E8F5E9"
                    : "#FFEBEE",
                },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: product.is_product_active
                      ? "#28A745"
                      : "#DC3545",
                  },
                ]}
              />
              <Text
                style={[
                  styles.statusChipText,
                  { color: product.is_product_active ? "#28A745" : "#DC3545" },
                ]}
              >
                {product.is_product_active ? "Active" : "Inactive"}
              </Text>
            </View>
          </View>

          {product.category_name && (
            <Text style={styles.productSubline}>{product.category_name}</Text>
          )}

          <Text style={styles.priceText}>
            Rs {product.price}
            <Text style={styles.pricePerUnit}>/{product.unit}</Text>
          </Text>

          {totalRatings > 0 && (
            <View style={styles.starsRow}>
              <Stars rating={avgRating} size={15} />
              <Text style={styles.ratingNumText}>{avgRating.toFixed(1)}</Text>
              <Text style={styles.ratingCountText}>({totalRatings})</Text>
            </View>
          )}

          <View style={styles.qtyInfoRow}>
            <View style={styles.qtyInfoChip}>
              <Ionicons name="cube-outline" size={14} color="#0078D7" />
              <Text style={styles.qtyInfoText}>
                Qty: {product.quantity} {product.unit}
              </Text>
            </View>
            {product.moq && (
              <View style={styles.qtyInfoChip}>
                <Ionicons name="layers-outline" size={14} color="#888" />
                <Text style={styles.qtyInfoText}>
                  Min. Order: {product.moq}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── SECTION 4: Product details ── */}
        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>Product details</Text>

          {product.product_description ? (
            <View style={styles.descBlock}>
              <Text style={styles.detailRowLabel}>Description</Text>
              <Text
                style={styles.descText}
                numberOfLines={descExpanded ? undefined : 3}
              >
                {product.product_description}
              </Text>
              {product.product_description.length > 120 && (
                <TouchableOpacity
                  onPress={() => setDescExpanded(!descExpanded)}
                >
                  <Text style={styles.moreText}>
                    {descExpanded ? "less" : "more"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null}

          {[
            { label: "Category", value: product.category_name },
            {
              label: "Quantity",
              value: product.quantity
                ? `${product.quantity} ${product.unit}`
                : null,
            },
            { label: "Price", value: `Rs ${product.price}/${product.unit}` },
            { label: "Min. Order", value: product.moq },
            {
              label: "Listed on",
              value: product.created_at
                ? new Date(product.created_at).toLocaleDateString()
                : null,
            },
          ]
            .filter((r) => r.value)
            .map((row, i, arr) => (
              <View
                key={row.label}
                style={[
                  styles.detailRow,
                  i === arr.length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                <Text style={styles.detailRowLabel}>{row.label}</Text>
                <Text style={styles.detailRowValue}>{row.value}</Text>
              </View>
            ))}
        </View>

        {/* ── SECTION 5: Enquiry ── */}
        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>Enquiry</Text>
          <View style={styles.enquiryCard}>
            <View style={styles.enquiryTop}>
              <View style={styles.enquiryLogo}>
                <Ionicons name="business" size={22} color="#0078D7" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.enquiryBizName}>
                  {product.business_name}
                </Text>
                {totalRatings > 0 && <Stars rating={avgRating} size={12} />}
                <Text style={styles.enquiryLocation}>
                  {product.city}
                  {product.state ? `, ${product.state}` : ""}
                </Text>
              </View>
              {isOwnBusiness ? (
                <View style={styles.ownBizSmall}>
                  <Text style={styles.ownBizSmallText}>Your Business</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.enquiryFollowBtn,
                    isFollowing && styles.enquiryFollowingBtn,
                  ]}
                  onPress={handleFollow}
                  disabled={followLoading}
                >
                  {followLoading ? (
                    <ActivityIndicator
                      size="small"
                      color={isFollowing ? "#0078D7" : "#fff"}
                    />
                  ) : (
                    <Text
                      style={[
                        styles.enquiryFollowText,
                        isFollowing && styles.enquiryFollowingText,
                      ]}
                    >
                      {isFollowing ? "Following" : "Follow"}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() =>
                  router.push({
                    pathname: "/pages/bussinesProfile" as any,
                    params: { business_id: product.business_id },
                  })
                }
              >
                <Ionicons name="person-outline" size={17} color="#444" />
                <Text style={styles.actionBtnLabel}>Profile</Text>
              </TouchableOpacity>

              {product.business_phone && (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() =>
                    Linking.openURL(`tel:${product.business_phone}`)
                  }
                >
                  <Ionicons name="call-outline" size={17} color="#444" />
                  <Text style={styles.actionBtnLabel}>Contact</Text>
                </TouchableOpacity>
              )}

              {product.business_email && (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() =>
                    Linking.openURL(`mailto:${product.business_email}`)
                  }
                >
                  <Ionicons name="chatbubble-outline" size={17} color="#444" />
                  <Text style={styles.actionBtnLabel}>Message</Text>
                </TouchableOpacity>
              )}

              {product.business_phone && (
                <TouchableOpacity
                  style={[styles.actionBtn, { borderRightWidth: 0 }]}
                  onPress={() =>
                    Linking.openURL(
                      `whatsapp://send?phone=${product.business_phone}`,
                    )
                  }
                >
                  <Ionicons name="logo-whatsapp" size={17} color="#25D366" />
                  <Text style={[styles.actionBtnLabel, { color: "#25D366" }]}>
                    WhatsApp
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* ── SECTION 6: Similar Products ── */}
        {similarProducts.length > 0 && (
          <View style={styles.detailsSection}>
            <Text style={styles.sectionTitle}>Similar Products</Text>
            <View style={styles.similarGrid}>
              {similarProducts.map((item) => {
                const img =
                  item.product_images?.length > 0
                    ? getImageUri(item.product_images[0].image)
                    : null;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.similarCard}
                    activeOpacity={0.85}
                    onPress={() =>
                      router.push({
                        pathname: "/pages/productDetail" as any,
                        params: { product_id: item.id },
                      })
                    }
                  >
                    {img ? (
                      <Image
                        source={{ uri: img }}
                        style={styles.similarImg}
                        resizeMode="cover"
                      />
                    ) : (
                      <View
                        style={[
                          styles.similarImg,
                          {
                            backgroundColor: "#F0F0F0",
                            justifyContent: "center",
                            alignItems: "center",
                          },
                        ]}
                      >
                        <Ionicons name="cube-outline" size={28} color="#CCC" />
                      </View>
                    )}
                    <View style={styles.similarCardBody}>
                      <Text style={styles.similarName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.similarMeta}>
                        Qty: {item.quantity} {item.unit}
                      </Text>
                      <View style={styles.similarFooter}>
                        <Text style={styles.similarPrice}>
                          Price: {item.price}rs/{item.unit}
                        </Text>
                        <TouchableOpacity
                          style={styles.enquireChip}
                          onPress={() =>
                            router.push({
                              pathname: "/pages/productDetail" as any,
                              params: { product_id: item.id },
                            })
                          }
                        >
                          <Text style={styles.enquireChipText}>Enquire</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ── SECTION 7: Ratings & Reviews ── */}
        <View style={styles.detailsSection}>
          <View style={styles.ratingsTitleRow}>
            <Text style={styles.sectionTitle}>Ratings & Reviews</Text>
            <TouchableOpacity
              style={styles.rateChip}
              onPress={() => setShowRatingForm(!showRatingForm)}
            >
              <Ionicons name="star" size={13} color="#FFB800" />
              <Text style={styles.rateChipText}>
                {existingRating ? "Edit" : "Rate"}
              </Text>
            </TouchableOpacity>
          </View>

          {totalRatings > 0 && (
            <View style={styles.avgRatingCard}>
              <Text style={styles.avgBigNum}>{avgRating.toFixed(1)}</Text>
              <View>
                <Stars rating={avgRating} size={20} />
                <Text style={styles.avgSubText}>
                  {totalRatings} {totalRatings === 1 ? "review" : "reviews"}
                </Text>
              </View>
            </View>
          )}

          {showRatingForm && (
            <View style={styles.ratingFormBox}>
              <Text style={styles.ratingFormTitle}>
                {existingRating ? "Update Rating" : "Rate This Product"}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "center",
                  marginBottom: 14,
                }}
              >
                {[1, 2, 3, 4, 5].map((s) => (
                  <TouchableOpacity key={s} onPress={() => setUserRating(s)}>
                    <Ionicons
                      name={s <= userRating ? "star" : "star-outline"}
                      size={36}
                      color="#FFB800"
                      style={{ marginHorizontal: 4 }}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.reviewInput}
                placeholder="Write a review (optional)"
                placeholderTextColor="#BBB"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                value={reviewText}
                onChangeText={setReviewText}
                maxLength={1000}
              />
              <View style={styles.formBtnRow}>
                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={submitRating}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.submitBtnText}>
                      {existingRating ? "Update" : "Submit"}
                    </Text>
                  )}
                </TouchableOpacity>
                {existingRating && (
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={deleteRating}
                  >
                    <Text style={styles.deleteBtnText}>Delete</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setShowRatingForm(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {ratings.length > 0 ? (
            <View style={{ gap: 8, marginTop: 12 }}>
              {ratings.slice(0, 10).map((r: any, i: number) => (
                <View
                  key={`${r.rating_id || r.product_id}-${i}`}
                  style={styles.reviewCard}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginBottom: 5,
                    }}
                  >
                    <Stars rating={r.rating} size={13} />
                    <Text style={{ fontSize: 11, color: "#BBB" }}>
                      {new Date(r.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  {r.remarks && (
                    <Text
                      style={{ fontSize: 13, color: "#444", lineHeight: 19 }}
                    >
                      {r.remarks}
                    </Text>
                  )}
                  {r.user_id === currentUserId && (
                    <View
                      style={{
                        marginTop: 5,
                        backgroundColor: "#EBF5FF",
                        paddingHorizontal: 7,
                        paddingVertical: 2,
                        borderRadius: 4,
                        alignSelf: "flex-start",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: "700",
                          color: "#0078D7",
                        }}
                      >
                        Your review
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          ) : (
            !showRatingForm && (
              <View style={{ alignItems: "center", paddingVertical: 20 }}>
                <Ionicons name="chatbubble-outline" size={30} color="#DDD" />
                <Text style={{ fontSize: 13, color: "#CCC", marginTop: 8 }}>
                  No reviews yet. Be the first!
                </Text>
              </View>
            )
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F3F5" },

  /* Header */
  header: {
    backgroundColor: "#1E90FF",
    paddingHorizontal: 14,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerBtn: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
  },

  /* Business header */
  bizHeaderCard: {
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  bizHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  bizLogoLarge: {
    width: 46,
    height: 46,
    borderRadius: 10,
    backgroundColor: "#EBF5FF",
    justifyContent: "center",
    alignItems: "center",
  },
  bizHeaderName: { fontSize: 15, fontWeight: "700", color: "#1A1A1A" },
  bizLocation: { fontSize: 11, color: "#999", marginTop: 2 },
  ownBizPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EBF5FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D0E8FF",
  },
  ownBizPillText: { fontSize: 11, fontWeight: "700", color: "#0078D7" },
  topFollowBtn: {
    backgroundColor: "#0078D7",
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 7,
  },
  topFollowBtnActive: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#0078D7",
  },
  topFollowText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  topFollowTextActive: { color: "#0078D7" },

  /* Image section */
  imageSection: { position: "relative" },
  mainImage: { width, height: 290, backgroundColor: "#F0F0F0" },

  /* ── No images state ── */
  noImageContainer: {
    width,
    height: 290,
    backgroundColor: "#F7F8FA",
    justifyContent: "center",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#ECECEC",
  },
  noImageTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#AAAAAA",
    marginTop: 14,
  },
  noImageSubtitle: {
    fontSize: 12,
    color: "#C8C8C8",
    marginTop: 4,
  },

  dotsRow: {
    position: "absolute",
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(0,0,0,0.18)",
    marginHorizontal: 3,
  },
  dotActive: { backgroundColor: "#0078D7", width: 18 },
  imgCountBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.48)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  imgCountText: { color: "#fff", fontSize: 11, fontWeight: "600" },

  /* Product header */
  productHeaderCard: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  productNameRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  productName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
    flex: 1,
    marginRight: 10,
    lineHeight: 26,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 5,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusChipText: { fontSize: 11, fontWeight: "700" },
  productSubline: { fontSize: 12, color: "#888", marginBottom: 8 },

  priceText: {
    fontSize: 28,
    fontWeight: "800",
    color: "#28A745",
    marginBottom: 8,
  },
  pricePerUnit: { fontSize: 16, fontWeight: "500", color: "#4CAF50" },

  starsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 12,
  },
  ratingNumText: { fontSize: 13, fontWeight: "700", color: "#333" },
  ratingCountText: { fontSize: 12, color: "#999" },

  qtyInfoRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  qtyInfoChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F4F6FB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  qtyInfoText: { fontSize: 13, color: "#444", fontWeight: "500" },

  /* Details section */
  detailsSection: {
    backgroundColor: "#fff",
    marginTop: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 12,
  },
  descBlock: { marginBottom: 4 },
  descText: { fontSize: 13, color: "#444", lineHeight: 20, marginTop: 4 },
  moreText: { fontSize: 13, fontWeight: "700", color: "#0078D7", marginTop: 2 },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#F4F4F4",
  },
  detailRowLabel: { fontSize: 13, color: "#888", fontWeight: "500" },
  detailRowValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#222",
    textAlign: "right",
    flex: 1,
    marginLeft: 16,
  },

  /* Enquiry card */
  enquiryCard: {
    borderWidth: 1,
    borderColor: "#E8E8E8",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 8,
  },
  enquiryTop: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 10,
  },
  enquiryLogo: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#EBF5FF",
    justifyContent: "center",
    alignItems: "center",
  },
  enquiryBizName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 2,
  },
  enquiryLocation: { fontSize: 11, color: "#999", marginTop: 2 },
  enquiryFollowBtn: {
    backgroundColor: "#0078D7",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 7,
  },
  enquiryFollowingBtn: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#0078D7",
  },
  enquiryFollowText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  enquiryFollowingText: { color: "#0078D7" },
  ownBizSmall: {
    backgroundColor: "#EBF5FF",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#D0E8FF",
  },
  ownBizSmallText: { fontSize: 11, fontWeight: "700", color: "#0078D7" },
  actionRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 5,
    borderRightWidth: 1,
    borderRightColor: "#F0F0F0",
  },
  actionBtnLabel: { fontSize: 11, fontWeight: "600", color: "#444" },

  /* Similar */
  similarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 8,
  },
  similarCard: {
    width: (width - 42) / 2,
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#ECECEC",
  },
  similarImg: { width: "100%", height: 130 },
  similarCardBody: { padding: 10 },
  similarName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 3,
  },
  similarMeta: { fontSize: 12, color: "#666", marginBottom: 2 },
  similarFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 5,
  },
  similarPrice: { fontSize: 11, color: "#555", flex: 1 },
  enquireChip: {
    backgroundColor: "#0078D7",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  enquireChipText: { color: "#fff", fontSize: 11, fontWeight: "700" },

  /* Ratings */
  ratingsTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  rateChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF8E1",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  rateChipText: { fontSize: 13, fontWeight: "600", color: "#F59E0B" },
  avgRatingCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 4,
  },
  avgBigNum: { fontSize: 42, fontWeight: "800", color: "#1A1A1A" },
  avgSubText: { fontSize: 12, color: "#999", marginTop: 4 },
  ratingFormBox: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  ratingFormTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
    textAlign: "center",
  },
  reviewInput: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 11,
    fontSize: 13,
    color: "#333",
    borderWidth: 1,
    borderColor: "#E8E8E8",
    minHeight: 75,
    textAlignVertical: "top",
  },
  formBtnRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  submitBtn: {
    flex: 1,
    backgroundColor: "#0078D7",
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: "center",
  },
  submitBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  deleteBtn: {
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: "#FFEBEE",
    alignItems: "center",
  },
  deleteBtnText: { color: "#DC3545", fontSize: 14, fontWeight: "600" },
  cancelBtn: {
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelBtnText: { color: "#999", fontSize: 14 },
  reviewCard: { backgroundColor: "#F8F9FA", borderRadius: 10, padding: 12 },
});
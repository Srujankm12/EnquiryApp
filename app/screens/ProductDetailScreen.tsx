import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Constants from "expo-constants";
import { useLocalSearchParams, useRouter } from "expo-router";
import { jwtDecode } from "jwt-decode";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
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

// ── Star Rating Component ─────────────────────────────────────────────────────
const Stars = ({ rating, size = 14 }: { rating: number; size?: number }) => (
  <View style={{ flexDirection: "row", gap: 1 }}>
    {[1, 2, 3, 4, 5].map((i) => (
      <Ionicons
        key={i}
        name={i <= Math.floor(rating) ? "star" : i - 0.5 <= rating ? "star-half" : "star-outline"}
        size={size}
        color="#FFB800"
      />
    ))}
  </View>
);

// ── Spec Row ──────────────────────────────────────────────────────────────────
const SpecRow = ({ icon, iconBg, label, value, last }: {
  icon: keyof typeof Ionicons.glyphMap; iconBg: string; label: string; value: string; last?: boolean;
}) => (
  <View style={[s.specRow, last && { borderBottomWidth: 0 }]}>
    <View style={[s.specIconWrap, { backgroundColor: iconBg }]}>
      <Ionicons name={icon} size={14} color="#0078D7" />
    </View>
    <Text style={s.specLabel}>{label}</Text>
    <Text style={s.specValue}>{value}</Text>
  </View>
);

export default function ProductDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { product_id } = useLocalSearchParams();
  const scrollY = useRef(new Animated.Value(0)).current;

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

  useEffect(() => { load(); }, [product_id]);

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

      const res = await axios.get(`${API_URL}/product/get/${product_id}`, { headers: h });
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
          } catch { }
        }
      }

      // Similar products
      if (data.category_id) {
        try {
          const sim = await axios.get(`${API_URL}/product/get/category/${data.category_id}`, { headers: h });
          const raw: any[] = sim.data?.products || [];
          setSimilarProducts(raw.filter((p) => p.id !== data.id && p.is_product_active !== false).slice(0, 8));
        } catch { setSimilarProducts([]); }
      }

      // Images
      try {
        const ir = await axios.get(`${API_URL}/product/image/get/${product_id}`, { headers: h });
        setImages(ir.data?.images || ir.data?.data?.images || []);
      } catch { setImages([]); }

      // Ratings
      try {
        const rr = await axios.get(`${API_URL}/product/rating/get/${product_id}`, { headers: h });
        const list = Array.isArray(rr.data?.ratings) ? rr.data.ratings : [];
        setRatings(list);
        if (token) {
          const dec: any = jwtDecode(token);
          const mine = list.find((r: any) => r.user_id === dec.user_id);
          if (mine) { setExistingRating(mine); setUserRating(mine.rating); setReviewText(mine.remarks || ""); }
        }
      } catch { setRatings([]); }

      try {
        const ar = await axios.get(`${API_URL}/product/rating/get/average/${product_id}`, { headers: h });
        setRatingInfo(ar.data?.rating_info || null);
      } catch { setRatingInfo(null); }
    } catch {
      setError("Unable to load product. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const isOwnBusiness = product?.business_id && myBusinessId && String(product.business_id) === String(myBusinessId);

  const handleFollow = () => {
    if (isOwnBusiness || followLoading) return;
    if (isFollowing) {
      Alert.alert("Unfollow", `Unfollow ${product.business_name}?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Unfollow", style: "destructive", onPress: () => doFollow(true) },
      ]);
    } else { doFollow(false); }
  };

  const doFollow = async (unfollow: boolean) => {
    try {
      setFollowLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) return;
      const dec: any = jwtDecode(token);
      const h = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
      if (unfollow) {
        await axios.post(`${API_URL}/follower/unfollow`, { user_id: dec.user_id, business_id: product.business_id }, { headers: h });
        setIsFollowing(false);
        await removeFollowFromCache(product.business_id);
      } else {
        await axios.post(`${API_URL}/follower/follow`, { user_id: dec.user_id, business_id: product.business_id }, { headers: h });
        setIsFollowing(true);
        await addFollowToCache(product.business_id);
      }
    } catch (e: any) { Alert.alert("Error", e?.response?.data?.message || "Failed"); }
    finally { setFollowLoading(false); }
  };

  const submitRating = async () => {
    if (!userRating) { Alert.alert("Required", "Please select a star rating first."); return; }
    try {
      setSubmitting(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) return;
      const h = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
      const body = { product_id: product_id as string, user_id: currentUserId, rating: userRating, remarks: reviewText.trim() || undefined };
      if (existingRating) {
        await axios.put(`${API_URL}/product/rating/update`, body, { headers: h });
        Alert.alert("Updated ✓", "Your rating has been updated.");
      } else {
        await axios.post(`${API_URL}/product/rating/create`, body, { headers: h });
        Alert.alert("Thank you!", "Your review has been submitted.");
      }
      setShowRatingForm(false);
      load();
    } catch (e: any) { Alert.alert("Error", e.response?.data?.message || "Failed to submit."); }
    finally { setSubmitting(false); }
  };

  const deleteRating = async () => {
    Alert.alert("Delete Review", "Are you sure you want to delete your review?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem("token");
            await axios.delete(`${API_URL}/product/rating/delete/${product_id}`, { headers: { Authorization: `Bearer ${token}` } });
            setExistingRating(null); setUserRating(0); setReviewText("");
            load();
          } catch (e: any) { Alert.alert("Error", e?.response?.data?.message || "Failed"); }
        },
      },
    ]);
  };

  const sortedImages = [...images].sort((a, b) => (a.product_image_sequence_number || 0) - (b.product_image_sequence_number || 0));
  const hasImages = sortedImages.length > 0;
  const avgRating = ratingInfo?.average_rating || 0;
  const totalRatings = ratingInfo?.total_ratings || 0;

  // ── Loading ──
  if (loading && !refreshing) {
    return (
      <View style={s.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0060B8" />
        <View style={[s.headerWrapper, { paddingTop: insets.top }]}>
          <View style={s.orb1} /><View style={s.orb2} />
          <View style={s.headerInner}>
            <TouchableOpacity style={s.headerBackBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={s.headerEyebrow}>PRODUCT</Text>
              <Text style={s.headerTitle}>Product Details</Text>
            </View>
          </View>
        </View>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 14 }}>
          <View style={s.loaderCard}>
            <ActivityIndicator size="large" color="#0078D7" />
            <Text style={s.loaderText}>Loading product…</Text>
          </View>
        </View>
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={s.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0060B8" />
        <View style={[s.headerWrapper, { paddingTop: insets.top }]}>
          <View style={s.orb1} /><View style={s.orb2} />
          <View style={s.headerInner}>
            <TouchableOpacity style={s.headerBackBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={s.headerEyebrow}>PRODUCT</Text>
              <Text style={s.headerTitle}>Product Details</Text>
            </View>
          </View>
        </View>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 32 }}>
          <View style={s.emptyIconWrap}><Ionicons name="alert-circle-outline" size={30} color="#0078D7" /></View>
          <Text style={s.emptyTitle}>{error ? "Failed to Load" : "Not Found"}</Text>
          <Text style={s.emptySubtitle}>{error || "Product not found"}</Text>
          <TouchableOpacity onPress={load} style={s.retryBtn}>
            <Ionicons name="refresh" size={16} color="#fff" />
            <Text style={s.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0060B8" />

      {/* ── Premium Header ── */}
      <View style={[s.headerWrapper, { paddingTop: insets.top }]}>
        <View style={s.orb1} /><View style={s.orb2} />
        <View style={s.headerInner}>
          <TouchableOpacity style={s.headerBackBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={s.headerEyebrow}>PRODUCT</Text>
            <Text style={s.headerTitle} numberOfLines={1}>Product Details</Text>
          </View>
          {isOwnBusiness && (
            <TouchableOpacity
              style={s.editHeaderBtn}
              onPress={() => router.push({ pathname: "/pages/editProduct" as any, params: { product_id } })}
            >
              <Ionicons name="create-outline" size={16} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={["#0078D7"]} tintColor="#0078D7" />}
        contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
      >
        {/* ── IMAGE CAROUSEL ─────────────────────────────────── */}
        <View style={s.imageSection}>
          {!hasImages ? (
            <View style={s.noImageContainer}>
              <View style={s.noImageIconWrap}>
                <Ionicons name="image-outline" size={48} color="#CBD5E1" />
              </View>
              <Text style={s.noImageTitle}>No Images Available</Text>
              <Text style={s.noImageSub}>This product has no photos yet</Text>
            </View>
          ) : (
            <>
              <FlatList
                data={sortedImages}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => setActiveImg(Math.round(e.nativeEvent.contentOffset.x / width))}
                renderItem={({ item }) => (
                  <Image
                    source={{ uri: getImageUri(item.product_image_url || item.image)! }}
                    style={s.mainImage}
                    resizeMode="cover"
                  />
                )}
                keyExtractor={(item, i) => item.id || `img-${i}`}
              />
              {/* Gradient overlay at bottom */}
              <View style={s.imageGradientOverlay} />
              {/* Dot indicators */}
              {sortedImages.length > 1 && (
                <View style={s.dotsRow}>
                  {sortedImages.map((_, i) => (
                    <View key={i} style={[s.dot, i === activeImg && s.dotActive]} />
                  ))}
                </View>
              )}
              {/* Photo count badge */}
              {sortedImages.length > 1 && (
                <View style={s.imgCountBadge}>
                  <Ionicons name="images-outline" size={11} color="#fff" />
                  <Text style={s.imgCountText}>{activeImg + 1}/{sortedImages.length}</Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* ── PRODUCT TITLE + STATUS ─────────────────────────── */}
        <View style={s.titleCard}>
          {/* Category + Status row */}
          <View style={s.titleMetaRow}>
            {product.category_name && (
              <View style={s.categoryPill}>
                <Ionicons name="layers-outline" size={11} color="#7C3AED" />
                <Text style={s.categoryPillText}>{product.category_name}</Text>
              </View>
            )}
            {product.sub_category_name && (
              <View style={[s.categoryPill, { backgroundColor: '#F0FFF4', marginLeft: 6 }]}>
                <Ionicons name="list-outline" size={11} color="#16A34A" />
                <Text style={[s.categoryPillText, { color: '#16A34A' }]}>{product.sub_category_name}</Text>
              </View>
            )}
            <View style={{ flex: 1 }} />
            <View style={[s.statusChip, { backgroundColor: product.is_product_active ? "#DCFCE7" : "#FEF2F2" }]}>
              <View style={[s.statusDot, { backgroundColor: product.is_product_active ? "#16A34A" : "#EF4444" }]} />
              <Text style={[s.statusChipText, { color: product.is_product_active ? "#16A34A" : "#EF4444" }]}>
                {product.is_product_active ? "Active" : "Inactive"}
              </Text>
            </View>
          </View>

          {/* Product Name */}
          <Text style={s.productName}>{product.product_name}</Text>

          {/* Star Rating Summary */}
          {totalRatings > 0 && (
            <View style={s.ratingQuickRow}>
              <Stars rating={avgRating} size={14} />
              <Text style={s.ratingQuickNum}>{avgRating.toFixed(1)}</Text>
              <Text style={s.ratingQuickCount}>({totalRatings} review{totalRatings > 1 ? "s" : ""})</Text>
            </View>
          )}

          {/* ── PRICE HERO BANNER ── */}
          <View style={s.priceHero}>
            <View style={s.priceHeroLeft}>
              <Text style={s.priceHeroEyebrow}>UNIT PRICE</Text>
              <View style={s.priceHeroValueRow}>
                <Text style={s.priceHeroCurrency}>₹</Text>
                <Text style={s.priceHeroAmount}>{product.price}</Text>
                <Text style={s.priceHeroUnit}>/{product.unit}</Text>
              </View>
            </View>
            <View style={s.priceHeroDivider} />
            <View style={s.priceHeroRight}>
              <Text style={s.priceHeroEyebrow}>AVAILABLE STOCK</Text>
              <Text style={s.priceHeroStock}>{product.quantity} <Text style={s.priceHeroStockUnit}>{product.unit}</Text></Text>
              {product.moq && (
                <View style={s.moqPill}>
                  <Ionicons name="bag-outline" size={11} color="#F59E0B" />
                  <Text style={s.moqPillText}>MOQ: {product.moq}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* ── DESCRIPTION CARD ───────────────────────────────── */}
        {product.product_description ? (
          <View style={s.card}>
            <View style={s.cardHeader}>
              <View style={[s.cardIconWrap, { backgroundColor: '#EBF5FF' }]}>
                <Ionicons name="document-text-outline" size={16} color="#0078D7" />
              </View>
              <Text style={s.cardTitle}>Description</Text>
            </View>
            <Text style={s.descText}>{product.product_description}</Text>
          </View>
        ) : null}

        {/* ── PRODUCT SPECS ──────────────────────────────────── */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={[s.cardIconWrap, { backgroundColor: '#F3EEFF' }]}>
              <Ionicons name="list-outline" size={16} color="#7C3AED" />
            </View>
            <Text style={s.cardTitle}>Product Specifications</Text>
          </View>

          {product.category_name && <SpecRow icon="grid-outline" iconBg="#EBF5FF" label="Category" value={product.category_name} />}
          {product.sub_category_name && <SpecRow icon="list-outline" iconBg="#F0FFF4" label="Sub-Category" value={product.sub_category_name} />}
          <SpecRow icon="layers-outline" iconBg="#F3EEFF" label="Quantity" value={`${product.quantity} ${product.unit}`} />
          <SpecRow icon="cash-outline" iconBg="#F0FFF4" label="Price" value={`₹${product.price}/${product.unit}`} />
          {product.moq && <SpecRow icon="bag-outline" iconBg="#FFFBEB" label="Min. Order Qty" value={product.moq} />}
          {product.created_at && (
            <SpecRow
              icon="calendar-outline" iconBg="#F7F9FC" label="Listed On"
              value={new Date(product.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              last
            />
          )}
        </View>

        {/* ── SELLER / CONTACT CARD ──────────────────────────── */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={[s.cardIconWrap, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="storefront-outline" size={16} color="#16A34A" />
            </View>
            <Text style={s.cardTitle}>Seller Information</Text>
          </View>

          {/* Seller row */}
          <View style={s.sellerRow}>
            <View style={s.sellerAvatarWrap}>
              <Ionicons name="business" size={22} color="#0078D7" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.sellerName}>{product.business_name}</Text>
              {(product.city || product.state) && (
                <View style={s.sellerLocRow}>
                  <Ionicons name="location-outline" size={11} color="#94A3B8" />
                  <Text style={s.sellerLoc}>{product.city}{product.state ? `, ${product.state}` : ""}</Text>
                </View>
              )}
              {totalRatings > 0 && <View style={{ marginTop: 4 }}><Stars rating={avgRating} size={11} /></View>}
            </View>
            {isOwnBusiness ? (
              <View style={s.ownBizPill}>
                <Ionicons name="shield-checkmark-outline" size={12} color="#0078D7" />
                <Text style={s.ownBizPillText}>Your Business</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[s.followBtn, isFollowing && s.followBtnActive]}
                onPress={handleFollow}
                disabled={followLoading}
              >
                {followLoading ? (
                  <ActivityIndicator size="small" color={isFollowing ? "#0078D7" : "#fff"} />
                ) : (
                  <Text style={[s.followBtnText, isFollowing && s.followBtnTextActive]}>
                    {isFollowing ? "Following" : "+ Follow"}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Contact Actions */}
          <View style={s.contactActionsRow}>
            <TouchableOpacity
              style={s.contactActionBtn}
              onPress={() => router.push({ pathname: "/pages/bussinesProfile" as any, params: { business_id: product.business_id } })}
              activeOpacity={0.8}
            >
              <View style={[s.contactActionIcon, { backgroundColor: "#EBF5FF" }]}>
                <Ionicons name="storefront-outline" size={22} color="#0078D7" />
              </View>
              <Text style={[s.contactActionLabel, { color: "#0078D7" }]}>Profile</Text>
            </TouchableOpacity>

            {product.business_phone && (
              <TouchableOpacity style={s.contactActionBtn} onPress={() => Linking.openURL(`tel:${product.business_phone}`)} activeOpacity={0.8}>
                <View style={[s.contactActionIcon, { backgroundColor: "#DCFCE7" }]}>
                  <Ionicons name="call-outline" size={22} color="#16A34A" />
                </View>
                <Text style={[s.contactActionLabel, { color: "#16A34A" }]}>Call</Text>
              </TouchableOpacity>
            )}

            {product.business_phone && (
              <TouchableOpacity style={s.contactActionBtn} onPress={() => Linking.openURL(`whatsapp://send?phone=${product.business_phone}`)} activeOpacity={0.8}>
                <View style={[s.contactActionIcon, { backgroundColor: "#DCFCE7" }]}>
                  <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
                </View>
                <Text style={[s.contactActionLabel, { color: "#25D366" }]}>WhatsApp</Text>
              </TouchableOpacity>
            )}

            {product.business_email && (
              <TouchableOpacity style={s.contactActionBtn} onPress={() => Linking.openURL(`mailto:${product.business_email}`)} activeOpacity={0.8}>
                <View style={[s.contactActionIcon, { backgroundColor: "#FEF3C7" }]}>
                  <Ionicons name="mail-outline" size={22} color="#F59E0B" />
                </View>
                <Text style={[s.contactActionLabel, { color: "#F59E0B" }]}>Email</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── SIMILAR PRODUCTS ───────────────────────────────── */}
        {similarProducts.length > 0 && (
          <View style={s.card}>
            <View style={s.cardHeader}>
              <View style={[s.cardIconWrap, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="grid-outline" size={16} color="#F59E0B" />
              </View>
              <Text style={s.cardTitle}>Similar Products</Text>
            </View>
            <FlatList
              data={similarProducts}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ gap: 12 }}
              renderItem={({ item }) => {
                const img = item.product_images?.length > 0 ? getImageUri(item.product_images[0].image) : null;
                return (
                  <TouchableOpacity
                    style={s.similarCard}
                    activeOpacity={0.85}
                    onPress={() => router.push({ pathname: "/pages/productDetail" as any, params: { product_id: item.id } })}
                  >
                    <View style={s.similarAccent} />
                    {img ? (
                      <Image source={{ uri: img }} style={s.similarImg} resizeMode="cover" />
                    ) : (
                      <View style={s.similarImgPlaceholder}>
                        <Ionicons name="cube-outline" size={28} color="#CBD5E1" />
                      </View>
                    )}
                    <View style={s.similarBody}>
                      <Text style={s.similarName} numberOfLines={2}>{item.name}</Text>
                      <Text style={s.similarPrice}>₹{item.price}/{item.unit}</Text>
                      <Text style={s.similarMoq} numberOfLines={1}>MOQ: {item.moq || "—"}</Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        )}

        {/* ── RATINGS & REVIEWS ──────────────────────────────── */}
        <View style={s.card}>
          <View style={[s.cardHeader, { marginBottom: 0 }]}>
            <View style={[s.cardIconWrap, { backgroundColor: '#FFFBEB' }]}>
              <Ionicons name="star-outline" size={16} color="#F59E0B" />
            </View>
            <Text style={s.cardTitle}>Ratings & Reviews</Text>
            <View style={{ flex: 1 }} />
            <TouchableOpacity
              style={s.rateChip}
              onPress={() => setShowRatingForm(!showRatingForm)}
            >
              <Ionicons name="star" size={12} color="#F59E0B" />
              <Text style={s.rateChipText}>{existingRating ? "Edit" : "Rate"}</Text>
            </TouchableOpacity>
          </View>

          {/* Avg rating banner */}
          {totalRatings > 0 && (
            <View style={s.avgBanner}>
              <View style={s.avgLeft}>
                <Text style={s.avgBigNum}>{avgRating.toFixed(1)}</Text>
                <Stars rating={avgRating} size={18} />
                <Text style={s.avgBottomText}>{totalRatings} review{totalRatings > 1 ? "s" : ""}</Text>
              </View>
              <View style={s.avgBarWrap}>
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = ratings.filter((r: any) => Math.round(r.rating) === star).length;
                  const pct = totalRatings > 0 ? (count / totalRatings) * 100 : 0;
                  return (
                    <View key={star} style={s.avgBarRow}>
                      <Text style={s.avgBarLabel}>{star}</Text>
                      <Ionicons name="star" size={10} color="#FFB800" />
                      <View style={s.avgBarBg}>
                        <View style={[s.avgBarFill, { width: `${pct}%` }]} />
                      </View>
                      <Text style={s.avgBarCount}>{count}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Rating form */}
          {showRatingForm && (
            <View style={s.ratingFormBox}>
              <Text style={s.ratingFormTitle}>{existingRating ? "Update Your Review" : "Rate This Product"}</Text>

              {/* Stars picker */}
              <View style={s.starsPickerRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity key={star} onPress={() => setUserRating(star)} style={s.starPickerBtn}>
                    <Ionicons
                      name={star <= userRating ? "star" : "star-outline"}
                      size={38}
                      color={star <= userRating ? "#FFB800" : "#E2E8F0"}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              {userRating > 0 && (
                <Text style={s.selectedRatingLabel}>
                  {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][userRating]}
                </Text>
              )}

              <TextInput
                style={s.reviewInput}
                placeholder="Write a review (optional)…"
                placeholderTextColor="#CBD5E1"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                value={reviewText}
                onChangeText={setReviewText}
                maxLength={1000}
              />

              <View style={s.formBtnRow}>
                <TouchableOpacity style={s.submitBtn} onPress={submitRating} disabled={submitting}>
                  {submitting ? <ActivityIndicator size="small" color="#fff" /> : (
                    <Text style={s.submitBtnText}>{existingRating ? "Update Review" : "Submit Review"}</Text>
                  )}
                </TouchableOpacity>
              </View>
              <View style={s.formSecondRow}>
                {existingRating && (
                  <TouchableOpacity style={s.deleteBtn} onPress={deleteRating}>
                    <Ionicons name="trash-outline" size={14} color="#EF4444" />
                    <Text style={s.deleteBtnText}>Delete</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={s.cancelBtn} onPress={() => setShowRatingForm(false)}>
                  <Text style={s.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Review list */}
          {ratings.length > 0 ? (
            <View style={{ gap: 10, marginTop: 14 }}>
              {ratings.slice(0, 10).map((r: any, i: number) => (
                <View key={`${r.rating_id || r.product_id}-${i}`} style={s.reviewCard}>
                  <View style={s.reviewCardHeader}>
                    <View style={s.reviewAvatar}>
                      <Ionicons name="person" size={16} color="#0078D7" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={s.reviewTopRow}>
                        <Stars rating={r.rating} size={12} />
                        <Text style={s.reviewDate}>{new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</Text>
                      </View>
                      {r.user_id === currentUserId && (
                        <View style={s.yourReviewBadge}>
                          <Text style={s.yourReviewBadgeText}>Your Review</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  {r.remarks ? <Text style={s.reviewText}>{r.remarks}</Text> : null}
                </View>
              ))}
            </View>
          ) : (
            !showRatingForm && (
              <View style={s.noReviewsWrap}>
                <View style={s.noReviewsIcon}>
                  <Ionicons name="chatbubble-ellipses-outline" size={28} color="#CBD5E1" />
                </View>
                <Text style={s.noReviewsTitle}>No Reviews Yet</Text>
                <Text style={s.noReviewsSub}>Be the first to share your experience!</Text>
              </View>
            )
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F9FC" },

  // ── Header ──
  headerWrapper: { backgroundColor: "#0060B8", paddingHorizontal: 20, paddingBottom: 22, overflow: "hidden", shadowColor: "#003E80", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 24, elevation: 18 },
  orb1: { position: "absolute", width: 240, height: 240, borderRadius: 120, backgroundColor: "rgba(255,255,255,0.06)", top: -80, right: -60 },
  orb2: { position: "absolute", width: 160, height: 160, borderRadius: 80, backgroundColor: "rgba(255,255,255,0.04)", bottom: 5, left: -50 },
  headerInner: { flexDirection: "row", alignItems: "center", paddingTop: 16 },
  headerBackBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.15)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  headerEyebrow: { fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.65)", letterSpacing: 2, marginBottom: 2 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#fff", letterSpacing: -0.3 },
  editHeaderBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.15)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },

  // ── Loader / Error ──
  loaderCard: { backgroundColor: "#fff", borderRadius: 24, padding: 36, alignItems: "center", gap: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 6 },
  loaderText: { fontSize: 14, color: "#94A3B8", fontWeight: "600" },
  emptyIconWrap: { width: 70, height: 70, borderRadius: 24, backgroundColor: "#EBF5FF", justifyContent: "center", alignItems: "center", marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A", marginBottom: 6 },
  emptySubtitle: { fontSize: 13, color: "#94A3B8", textAlign: "center", lineHeight: 20 },
  retryBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#0078D7", paddingHorizontal: 22, paddingVertical: 12, borderRadius: 14, marginTop: 20 },
  retryBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  // ── Image Carousel ──
  imageSection: { position: "relative" },
  mainImage: { width, height: 310, backgroundColor: "#F0F0F0" },
  imageGradientOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, height: 80, backgroundColor: "rgba(0,0,0,0.18)" },
  noImageContainer: { width, height: 220, backgroundColor: "#F1F5F9", justifyContent: "center", alignItems: "center", gap: 10 },
  noImageIconWrap: { width: 80, height: 80, borderRadius: 24, backgroundColor: "#E2E8F0", justifyContent: "center", alignItems: "center" },
  noImageTitle: { fontSize: 15, fontWeight: "700", color: "#94A3B8" },
  noImageSub: { fontSize: 12, color: "#CBD5E1", fontWeight: "500" },
  dotsRow: { position: "absolute", bottom: 14, left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.5)" },
  dotActive: { backgroundColor: "#fff", width: 20 },
  imgCountBadge: { position: "absolute", top: 14, right: 14, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  imgCountText: { color: "#fff", fontSize: 11, fontWeight: "700" },

  // ── Title Card ──
  titleCard: { backgroundColor: "#fff", paddingHorizontal: 18, paddingTop: 18, paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  titleMetaRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", marginBottom: 10, gap: 6 },
  categoryPill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#F3EEFF", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  categoryPillText: { fontSize: 11, fontWeight: "700", color: "#7C3AED" },
  statusChip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10, gap: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusChipText: { fontSize: 11, fontWeight: "800" },
  productName: { fontSize: 24, fontWeight: "800", color: "#0F172A", letterSpacing: -0.4, lineHeight: 30, marginBottom: 8 },
  ratingQuickRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 16 },
  ratingQuickNum: { fontSize: 13, fontWeight: "800", color: "#0F172A" },
  ratingQuickCount: { fontSize: 12, color: "#94A3B8" },

  // ── Price Hero ──
  priceHero: { flexDirection: "row", backgroundColor: "#F0FFF4", borderRadius: 20, padding: 16, borderWidth: 1.5, borderColor: "#BBF7D0" },
  priceHeroLeft: { flex: 1.2 },
  priceHeroEyebrow: { fontSize: 9, fontWeight: "800", color: "#94A3B8", letterSpacing: 1.5, marginBottom: 5, textTransform: "uppercase" },
  priceHeroValueRow: { flexDirection: "row", alignItems: "flex-end", gap: 1 },
  priceHeroCurrency: { fontSize: 22, fontWeight: "800", color: "#16A34A", paddingBottom: 2 },
  priceHeroAmount: { fontSize: 38, fontWeight: "900", color: "#16A34A", letterSpacing: -1 },
  priceHeroUnit: { fontSize: 14, fontWeight: "600", color: "#4ADE80", paddingBottom: 5 },
  priceHeroDivider: { width: 1, backgroundColor: "#BBF7D0", marginHorizontal: 16 },
  priceHeroRight: { flex: 1, justifyContent: "center" },
  priceHeroStock: { fontSize: 22, fontWeight: "800", color: "#0F172A", letterSpacing: -0.3 },
  priceHeroStockUnit: { fontSize: 14, color: "#64748B", fontWeight: "600" },
  moqPill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#FFFBEB", alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, marginTop: 8 },
  moqPillText: { fontSize: 11, fontWeight: "700", color: "#F59E0B" },

  // ── Cards ──
  card: { backgroundColor: "#fff", borderRadius: 22, marginHorizontal: 12, marginTop: 12, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 18, shadowColor: "#1B4FBF", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 14, elevation: 4, borderWidth: 1, borderColor: "#F0F4F8" },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  cardIconWrap: { width: 34, height: 34, borderRadius: 11, justifyContent: "center", alignItems: "center" },
  cardTitle: { fontSize: 15, fontWeight: "800", color: "#0F172A", letterSpacing: -0.2 },

  // ── Description ──
  descText: { fontSize: 14, color: "#334155", lineHeight: 22, fontWeight: "400" },

  // ── Specs ──
  specRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F8FAFC", gap: 10 },
  specIconWrap: { width: 28, height: 28, borderRadius: 9, justifyContent: "center", alignItems: "center" },
  specLabel: { flex: 1, fontSize: 13, color: "#64748B", fontWeight: "600" },
  specValue: { fontSize: 13, fontWeight: "700", color: "#0F172A", textAlign: "right", maxWidth: "55%" },

  // ── Seller ──
  sellerRow: { flexDirection: "row", alignItems: "center", marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  sellerAvatarWrap: { width: 48, height: 48, borderRadius: 16, backgroundColor: "#EBF5FF", justifyContent: "center", alignItems: "center" },
  sellerName: { fontSize: 15, fontWeight: "800", color: "#0F172A", marginBottom: 2 },
  sellerLocRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
  sellerLoc: { fontSize: 11, color: "#94A3B8", fontWeight: "500" },
  ownBizPill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#EBF5FF", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: "#BFDBFE" },
  ownBizPillText: { fontSize: 11, fontWeight: "800", color: "#0078D7" },
  followBtn: { backgroundColor: "#0078D7", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  followBtnActive: { backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#0078D7" },
  followBtnText: { fontSize: 12, fontWeight: "800", color: "#fff" },
  followBtnTextActive: { color: "#0078D7" },
  contactActionsRow: { flexDirection: "row", justifyContent: "space-around" },
  contactActionBtn: { alignItems: "center", gap: 7 },
  contactActionIcon: { width: 54, height: 54, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  contactActionLabel: { fontSize: 11, fontWeight: "800" },

  // ── Similar Products ──
  similarCard: { width: 154, backgroundColor: "#fff", borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: "#F0F4F8", shadowColor: "#1B4FBF", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 3 },
  similarAccent: { height: 3, backgroundColor: "#0078D7" },
  similarImg: { width: "100%", height: 110, backgroundColor: "#F1F5F9" },
  similarImgPlaceholder: { width: "100%", height: 110, backgroundColor: "#F1F5F9", justifyContent: "center", alignItems: "center" },
  similarBody: { padding: 10 },
  similarName: { fontSize: 13, fontWeight: "700", color: "#0F172A", marginBottom: 4, lineHeight: 18 },
  similarPrice: { fontSize: 13, color: "#16A34A", fontWeight: "800", marginBottom: 2 },
  similarMoq: { fontSize: 11, color: "#94A3B8", fontWeight: "600" },

  // ── Ratings ──
  rateChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#FFFBEB", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: "#FDE68A" },
  rateChipText: { fontSize: 12, fontWeight: "800", color: "#F59E0B" },

  avgBanner: { flexDirection: "row", backgroundColor: "#FFFBEB", borderRadius: 18, padding: 16, marginTop: 14, borderWidth: 1, borderColor: "#FDE68A", gap: 16 },
  avgLeft: { alignItems: "center", justifyContent: "center", gap: 6 },
  avgBigNum: { fontSize: 44, fontWeight: "900", color: "#0F172A", letterSpacing: -2 },
  avgBottomText: { fontSize: 11, color: "#94A3B8", fontWeight: "600" },
  avgBarWrap: { flex: 1, justifyContent: "center", gap: 5 },
  avgBarRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  avgBarLabel: { fontSize: 11, fontWeight: "700", color: "#64748B", width: 10, textAlign: "right" },
  avgBarBg: { flex: 1, height: 6, backgroundColor: "#F1F5F9", borderRadius: 3, overflow: "hidden" },
  avgBarFill: { height: "100%", backgroundColor: "#FFB800", borderRadius: 3 },
  avgBarCount: { fontSize: 11, color: "#94A3B8", width: 16, textAlign: "right" },

  ratingFormBox: { backgroundColor: "#F7F9FC", borderRadius: 20, padding: 18, marginTop: 14, borderWidth: 1, borderColor: "#E2E8F0" },
  ratingFormTitle: { fontSize: 15, fontWeight: "800", color: "#0F172A", textAlign: "center", marginBottom: 16 },
  starsPickerRow: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 8 },
  starPickerBtn: { padding: 4 },
  selectedRatingLabel: { fontSize: 13, fontWeight: "700", color: "#F59E0B", textAlign: "center", marginBottom: 14 },
  reviewInput: { backgroundColor: "#fff", borderRadius: 14, padding: 14, fontSize: 14, color: "#334155", borderWidth: 1.5, borderColor: "#E2E8F0", minHeight: 90, textAlignVertical: "top", fontWeight: "400" },
  formBtnRow: { marginTop: 12 },
  submitBtn: { backgroundColor: "#0078D7", paddingVertical: 14, borderRadius: 14, alignItems: "center", shadowColor: "#0078D7", shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
  submitBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  formSecondRow: { flexDirection: "row", justifyContent: "center", gap: 12, marginTop: 10 },
  deleteBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: "#FEF2F2" },
  deleteBtnText: { color: "#EF4444", fontSize: 13, fontWeight: "700" },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12 },
  cancelBtnText: { color: "#94A3B8", fontSize: 13, fontWeight: "600" },

  reviewCard: { backgroundColor: "#F7F9FC", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#F1F5F9" },
  reviewCardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 8 },
  reviewAvatar: { width: 34, height: 34, borderRadius: 11, backgroundColor: "#EBF5FF", justifyContent: "center", alignItems: "center" },
  reviewTopRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  reviewDate: { fontSize: 11, color: "#94A3B8", fontWeight: "500" },
  yourReviewBadge: { backgroundColor: "#EBF5FF", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, alignSelf: "flex-start" },
  yourReviewBadgeText: { fontSize: 10, fontWeight: "800", color: "#0078D7" },
  reviewText: { fontSize: 13, color: "#334155", lineHeight: 20 },

  noReviewsWrap: { alignItems: "center", paddingVertical: 28, gap: 10 },
  noReviewsIcon: { width: 60, height: 60, borderRadius: 20, backgroundColor: "#F1F5F9", justifyContent: "center", alignItems: "center" },
  noReviewsTitle: { fontSize: 15, fontWeight: "700", color: "#64748B" },
  noReviewsSub: { fontSize: 12, color: "#94A3B8", fontWeight: "500" },
});
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Constants from "expo-constants";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { jwtDecode } from "jwt-decode";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Linking,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width } = Dimensions.get("window");

const API_URL = Constants.expoConfig?.extra?.API_URL;
const S3_URL = Constants.expoConfig?.extra?.S3_FETCH_URL;
const CLOUDFRONT_URL = Constants.expoConfig?.extra?.CLOUDFRONT_URL;

// ✅ Fixed: guards against double-URL when API already returns full https:// URLs
const getImageUri = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const path = url.startsWith("/") ? url : `/${url}`;
  if (CLOUDFRONT_URL) return `${CLOUDFRONT_URL}${path}`;
  if (S3_URL) return `${S3_URL}${path}`;
  return url;
};

const BusinessProfileScreen: React.FC = () => {
  const { business_id } = useLocalSearchParams();
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"products" | "statutory">("products");
  const [businessDetails, setBusinessDetails] = useState<any>(null);
  const [socialDetails, setSocialDetails] = useState<any>(null);
  const [legalDetails, setLegalDetails] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState<boolean>(false);
  const [followersCount, setFollowersCount] = useState<number>(0);
  const [followingCount, setFollowingCount] = useState<number>(0);
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [followLoading, setFollowLoading] = useState<boolean>(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [isOwnProfile, setIsOwnProfile] = useState<boolean>(false);
  const [imageUploading, setImageUploading] = useState<boolean>(false);

  useEffect(() => {
    fetchBusinessProfile();
  }, [business_id]);

  const fetchBusinessProfile = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const decoded: any = jwtDecode(token);
      const userId = decoded.user_id;
      setCurrentUserId(userId);

      const authHeaders = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      let businessId = business_id as string;

      if (!businessId) {
        businessId =
          decoded.business_id ||
          (await AsyncStorage.getItem("companyId")) ||
          "";
      }

      if (!businessId) {
        try {
          const bizIdRes = await fetch(
            `${API_URL}/business/get/user/${decoded.user_id}`,
            { headers: authHeaders }
          );
          if (bizIdRes.ok) {
            const result = await bizIdRes.json();
            businessId = result.business_id;
          }
        } catch {}
      }

      if (!businessId) {
        setLoading(false);
        return;
      }

      try {
        const completeRes = await fetch(
          `${API_URL}/business/get/complete/${businessId}`,
          { headers: authHeaders }
        );

        if (completeRes.ok) {
          const result = await completeRes.json();
          const details = result.details;
          setBusinessDetails({ ...details.business_details, id: businessId });
          setSocialDetails(details.social_details);
          setLegalDetails(details.legal_details);
        } else {
          const [bizRes, socialRes, legalRes] = await Promise.allSettled([
            fetch(`${API_URL}/business/get/${businessId}`, { headers: authHeaders }),
            fetch(`${API_URL}/business/social/get/${businessId}`, { headers: authHeaders }),
            fetch(`${API_URL}/business/legal/get/${businessId}`, { headers: authHeaders }),
          ]);

          if (bizRes.status === "fulfilled" && bizRes.value.ok) {
            const r = await bizRes.value.json();
            setBusinessDetails({ ...r.details, id: businessId });
          }
          if (socialRes.status === "fulfilled" && socialRes.value.ok) {
            const r = await socialRes.value.json();
            setSocialDetails(r.details);
          }
          if (legalRes.status === "fulfilled" && legalRes.value.ok) {
            const r = await legalRes.value.json();
            setLegalDetails(r.details);
          }
        }
      } catch (e) {
        console.error("Business fetch error:", e);
        setBusinessDetails(null);
      }

      fetchProducts(businessId, { Authorization: `Bearer ${token}` });

      const storedCompanyId = await AsyncStorage.getItem("companyId");
      setIsOwnProfile(
        String(businessId) === String(storedCompanyId) || String(businessId) === String(decoded.business_id)
      );

      try {
        const followersRes = await axios.get(
          `${API_URL}/follower/get/followers/${businessId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const fData =
          followersRes.data?.data?.followers ||
          followersRes.data?.followers ||
          [];
        setFollowersCount(Array.isArray(fData) ? fData.length : 0);
      } catch {
        setFollowersCount(0);
      }

      try {
        const followingRes = await axios.get(
          `${API_URL}/follower/get/followings/${userId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const followings =
          followingRes.data?.data?.followings ||
          followingRes.data?.followings ||
          [];
        const followedIds = (Array.isArray(followings) ? followings : []).map(
          (f: any) => String(f.following_id || f.business_id || "")
        );
        setIsFollowing(followedIds.includes(String(businessId)));
      } catch {
        setIsFollowing(false);
      }
    } catch (error) {
      console.error("Error fetching business profile:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchProducts = async (businessId: string, headers: any) => {
    try {
      setProductsLoading(true);
      const res = await axios.get(
        `${API_URL}/product/get/company/${businessId}`,
        { headers }
      );
      const productsData = res.data?.data?.products || res.data?.data || [];
      const productsList = Array.isArray(productsData) ? productsData : [];
      const activeProducts = productsList.filter((p: any) => p.is_product_active);

      const productsWithImages = await Promise.all(
        activeProducts.slice(0, 20).map(async (product: any) => {
          try {
            const imgRes = await axios.get(
              `${API_URL}/product/image/get/${product.product_id}`,
              { headers }
            );
            return { ...product, images: imgRes.data.data?.images || [] };
          } catch {
            return { ...product, images: [] };
          }
        })
      );

      const remaining = activeProducts.slice(20).map((p: any) => ({ ...p, images: [] }));
      setProducts([...productsWithImages, ...remaining]);
    } catch {
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  };

  // Upload image to S3 using XMLHttpRequest for reliable React Native support
  const uploadToS3WithXHR = (presignedUrl: string, fileUri: string): Promise<void> => {
    return new Promise(async (resolve, reject) => {
      try {
        const response = await fetch(fileUri);
        const blob = await response.blob();
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", presignedUrl);
        xhr.setRequestHeader("Content-Type", "image/png");
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`S3 upload failed with status ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error("Network error during S3 upload"));
        xhr.send(blob);
      } catch (err) {
        reject(err);
      }
    });
  };

  const handleProfileImageUpload = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission required", "Please allow photo library access to upload an image.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const imageAsset = result.assets[0];
      const token = await AsyncStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const businessId = businessDetails?.id;

      if (!businessId) {
        Alert.alert("Error", "Business ID not found.");
        return;
      }

      setImageUploading(true);

      // Step 1: Get presigned URL from backend
      const presignRes = await axios.get(
        `${API_URL}/blob/businesses/${businessId}/profile-image`,
        { headers }
      );

      const presignedUrl: string = presignRes.data?.url;
      if (!presignedUrl) {
        Alert.alert("Error", "Failed to get upload URL from server.");
        return;
      }

      // Step 2: Upload to S3 using XMLHttpRequest (more reliable in React Native)
      await uploadToS3WithXHR(presignedUrl, imageAsset.uri);

      // Step 3: Save image path to business record using dedicated image endpoint
      const imagePath = `profile/business/${businessId}.png`;
      try {
        await axios.put(
          `${API_URL}/business/update/image/${businessId}`,
          { profile_image: imagePath },
          { headers }
        );
      } catch (saveErr) {
        // Fallback to general update endpoint
        try {
          await axios.put(
            `${API_URL}/business/update/${businessId}`,
            { profile_image: imagePath },
            { headers }
          );
        } catch (fallbackErr) {
          console.warn("Could not save image path to business record:", fallbackErr);
        }
      }

      // Step 4: Update local state with cache-busted URL so image refreshes instantly
      const cacheBust = `?t=${Date.now()}`;
      const newImageUri = CLOUDFRONT_URL
        ? `${CLOUDFRONT_URL}/${imagePath}${cacheBust}`
        : `${S3_URL}/${imagePath}${cacheBust}`;

      setBusinessDetails((prev: any) => ({
        ...prev,
        profile_image: newImageUri,
      }));

      Alert.alert("Success", "Profile image updated successfully!");
    } catch (error: any) {
      console.error("Upload error:", error?.response?.data || error);
      Alert.alert("Error", "Something went wrong during upload. Please try again.");
    } finally {
      setImageUploading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBusinessProfile();
  };

  const handleBack = () => router.back();

  const getBizField = (field: string, fallback: string = "") =>
    businessDetails?.[field] || businessDetails?.[`business_${field}`] || fallback;

  const handleContact = () => {
    const phone = getBizField("phone");
    if (phone) Linking.openURL(`tel:${phone}`);
  };

  const handleMessage = () => {
    const email = getBizField("email");
    if (email) Linking.openURL(`mailto:${email}`);
  };

  const handleWhatsApp = () => {
    const phone = getBizField("phone");
    if (phone) {
      const cleaned = phone.replace(/[^0-9]/g, "");
      Linking.openURL(`https://wa.me/${cleaned}`);
    }
  };

  const handleSocialMedia = (url?: string | null) => {
    if (url) Linking.openURL(url);
  };

  const handleFollowToggle = async () => {
    const businessId = businessDetails?.id;
    if (!businessId || !currentUserId) return;
    setFollowLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      if (isFollowing) {
        await axios.post(
          `${API_URL}/follower/unfollow`,
          { user_id: currentUserId, business_id: businessId },
          { headers }
        );
        setIsFollowing(false);
        setFollowersCount((prev) => Math.max(0, prev - 1));
      } else {
        await axios.post(
          `${API_URL}/follower/follow`,
          { user_id: currentUserId, business_id: businessId },
          { headers }
        );
        setIsFollowing(true);
        setFollowersCount((prev) => prev + 1);
      }
    } catch (error: any) {
      console.error("Follow error:", error?.response?.data || error);
    } finally {
      setFollowLoading(false);
    }
  };

  const getProductImageUrl = (product: any): string | null => {
    if (product.images && product.images.length > 0) {
      const sorted = [...product.images].sort(
        (a: any, b: any) =>
          a.product_image_sequence_number - b.product_image_sequence_number
      );
      return getImageUri(sorted[0].product_image_url);
    }
    return null;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#177DDF" translucent={false} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Business Profile</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#177DDF" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  if (!businessDetails) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#177DDF" translucent={false} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Business Profile</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loaderContainer}>
          <Ionicons name="business-outline" size={64} color="#CCC" />
          <Text style={styles.loadingText}>Business not found</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchBusinessProfile}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const businessName = getBizField("name");
  const businessPhone = getBizField("phone");
  const businessEmail = getBizField("email");
  const businessCity = businessDetails.city || "";
  const businessState = businessDetails.state || "";
  const profileImageUrl =
    businessDetails.profile_image ||
    businessDetails.business_profile_image ||
    null;
  const imageUri = getImageUri(profileImageUrl);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#177DDF" translucent={false} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Business Profile</Text>
        <TouchableOpacity onPress={() => {}}>
          <Ionicons name="share-social-outline" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#177DDF"]}
            tintColor="#177DDF"
          />
        }
      >
        {/* Profile Header */}
        <View style={styles.profileHeaderSection}>
          <View style={styles.topBadgesRow}>
            {businessDetails.is_business_trusted ? (
              <View style={styles.trustedBadge}>
                <Ionicons name="ribbon" size={14} color="#28A745" />
                <Text style={styles.trustedBadgeText}>Trusted</Text>
              </View>
            ) : (
              <View style={styles.notTrustedBadge}>
                <Ionicons name="ribbon-outline" size={14} color="#DC3545" />
                <Text style={styles.notTrustedBadgeText}>Not Trusted</Text>
              </View>
            )}
            {businessDetails.is_business_verified ? (
              <View style={styles.verifiedTopBadge}>
                <Ionicons name="shield-checkmark" size={14} color="#28A745" />
                <Text style={styles.verifiedTopBadgeText}>Verified</Text>
              </View>
            ) : (
              <View style={styles.notVerifiedTopBadge}>
                <Ionicons name="shield-outline" size={14} color="#DC3545" />
                <Text style={styles.notVerifiedTopBadgeText}>Not Verified</Text>
              </View>
            )}
          </View>

          <View style={styles.profileHeader}>
            {/* ✅ Logo is tappable only for own profile */}
            <TouchableOpacity
              onPress={isOwnProfile ? handleProfileImageUpload : undefined}
              activeOpacity={isOwnProfile ? 0.7 : 1}
              disabled={imageUploading}
            >
              <View style={styles.logoContainer}>
                {imageUploading ? (
                  <View style={[styles.logo, styles.logoPlaceholder]}>
                    <ActivityIndicator size="small" color="#177DDF" />
                  </View>
                ) : imageUri ? (
                  <Image
                    source={{ uri: imageUri }}
                    style={styles.logo}
                    resizeMode="cover"
                    onError={(e) =>
                      console.log(
                        "❌ Image load error:",
                        e.nativeEvent.error,
                        "URL:",
                        imageUri
                      )
                    }
                    onLoad={() => console.log("✅ Image loaded:", imageUri)}
                  />
                ) : (
                  <View style={[styles.logo, styles.logoPlaceholder]}>
                    <Ionicons name="business" size={40} color="#177DDF" />
                  </View>
                )}

                {/* Camera icon overlay — only on own profile */}
                {isOwnProfile && !imageUploading && (
                  <View style={styles.editImageOverlay}>
                    <Ionicons name="camera" size={14} color="#FFFFFF" />
                  </View>
                )}

                {businessDetails.is_business_verified && (
                  <View style={styles.verifiedOverlay}>
                    <Ionicons name="checkmark-circle" size={22} color="#28A745" />
                  </View>
                )}
              </View>
            </TouchableOpacity>

            <View style={styles.basicInfo}>
              <Text style={styles.businessName}>{businessName}</Text>
              {businessDetails.contact_person && (
                <View style={styles.infoRow}>
                  <Ionicons name="person-outline" size={14} color="#666" />
                  <Text style={styles.infoText}>{businessDetails.contact_person}</Text>
                </View>
              )}
              <View style={styles.infoRow}>
                <Ionicons name="call-outline" size={14} color="#666" />
                <Text style={styles.infoText}>{businessPhone || "N/A"}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={14} color="#666" />
                <Text style={styles.infoText}>
                  {businessCity}
                  {businessState ? `, ${businessState}` : ""}
                </Text>
              </View>
              {businessEmail ? (
                <View style={styles.infoRow}>
                  <Ionicons name="mail-outline" size={14} color="#666" />
                  <Text style={styles.infoText} numberOfLines={1}>
                    {businessEmail}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Star Rating */}
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Ionicons
                key={star}
                name="star"
                size={18}
                color={star <= 4 ? "#FFB800" : "#E0E0E0"}
              />
            ))}
            <Text style={styles.ratingText}>4.0</Text>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <TouchableOpacity style={styles.statItem}>
              <Text style={styles.statNumber}>{followersCount}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity style={styles.statItem}>
              <Text style={styles.statNumber}>{followingCount}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity style={styles.statItem}>
              <Text style={styles.statNumber}>{products.length}</Text>
              <Text style={styles.statLabel}>Products</Text>
            </TouchableOpacity>
          </View>

          {/* Follow Button */}
          {!isOwnProfile && (
            <View style={{ paddingHorizontal: 16, marginTop: 14 }}>
              <TouchableOpacity
                style={[styles.followBtn, isFollowing && styles.followingBtn]}
                onPress={handleFollowToggle}
                disabled={followLoading}
                activeOpacity={0.7}
              >
                {followLoading ? (
                  <ActivityIndicator
                    size="small"
                    color={isFollowing ? "#177DDF" : "#FFFFFF"}
                  />
                ) : (
                  <>
                    <Ionicons
                      name={
                        isFollowing ? "checkmark-circle" : "add-circle-outline"
                      }
                      size={18}
                      color={isFollowing ? "#177DDF" : "#FFFFFF"}
                    />
                    <Text
                      style={[
                        styles.followBtnText,
                        isFollowing && styles.followingBtnText,
                      ]}
                    >
                      {isFollowing ? "Following" : "Follow"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                if (businessDetails?.id) {
                  router.push({
                    pathname: "/pages/sellerProfile" as any,
                    params: { business_id: businessDetails.id },
                  });
                }
              }}
            >
              <Ionicons name="person-outline" size={20} color="#177DDF" />
              <Text style={styles.actionButtonText}>Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleContact}>
              <Ionicons name="call-outline" size={20} color="#177DDF" />
              <Text style={styles.actionButtonText}>Contact</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleMessage}>
              <Ionicons name="mail-outline" size={20} color="#177DDF" />
              <Text style={styles.actionButtonText}>Message</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleWhatsApp}>
              <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
              <Text style={[styles.actionButtonText, { color: "#25D366" }]}>
                WhatsApp
              </Text>
            </TouchableOpacity>
          </View>

          {/* Social Media */}
          {socialDetails &&
            (socialDetails.linkedin ||
              socialDetails.instagram ||
              socialDetails.facebook ||
              socialDetails.website ||
              socialDetails.youtube ||
              socialDetails.telegram ||
              socialDetails.x) && (
              <View style={styles.socialMediaSection}>
                <View style={styles.socialMediaIcons}>
                  {socialDetails.instagram && (
                    <TouchableOpacity
                      style={styles.socialIcon}
                      onPress={() => handleSocialMedia(socialDetails.instagram)}
                    >
                      <Ionicons name="logo-instagram" size={22} color="#E4405F" />
                    </TouchableOpacity>
                  )}
                  {socialDetails.youtube && (
                    <TouchableOpacity
                      style={styles.socialIcon}
                      onPress={() => handleSocialMedia(socialDetails.youtube)}
                    >
                      <Ionicons name="logo-youtube" size={22} color="#FF0000" />
                    </TouchableOpacity>
                  )}
                  {socialDetails.facebook && (
                    <TouchableOpacity
                      style={styles.socialIcon}
                      onPress={() => handleSocialMedia(socialDetails.facebook)}
                    >
                      <Ionicons name="logo-facebook" size={22} color="#1877F2" />
                    </TouchableOpacity>
                  )}
                  {socialDetails.linkedin && (
                    <TouchableOpacity
                      style={styles.socialIcon}
                      onPress={() => handleSocialMedia(socialDetails.linkedin)}
                    >
                      <Ionicons name="logo-linkedin" size={22} color="#0A66C2" />
                    </TouchableOpacity>
                  )}
                  {socialDetails.telegram && (
                    <TouchableOpacity
                      style={styles.socialIcon}
                      onPress={() => handleSocialMedia(socialDetails.telegram)}
                    >
                      <Ionicons
                        name="paper-plane-outline"
                        size={22}
                        color="#0088CC"
                      />
                    </TouchableOpacity>
                  )}
                  {socialDetails.x && (
                    <TouchableOpacity
                      style={styles.socialIcon}
                      onPress={() => handleSocialMedia(socialDetails.x)}
                    >
                      <Ionicons name="logo-twitter" size={22} color="#000" />
                    </TouchableOpacity>
                  )}
                  {socialDetails.website && (
                    <TouchableOpacity
                      style={styles.socialIcon}
                      onPress={() => handleSocialMedia(socialDetails.website)}
                    >
                      <Ionicons name="globe-outline" size={22} color="#666" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "products" && styles.activeTab]}
            onPress={() => setActiveTab("products")}
          >
            <Ionicons
              name="cube-outline"
              size={18}
              color={activeTab === "products" ? "#177DDF" : "#999"}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "products" && styles.activeTabText,
              ]}
            >
              Products
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "statutory" && styles.activeTab]}
            onPress={() => setActiveTab("statutory")}
          >
            <Ionicons
              name="document-text-outline"
              size={18}
              color={activeTab === "statutory" ? "#177DDF" : "#999"}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "statutory" && styles.activeTabText,
              ]}
            >
              Statutory Details
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {activeTab === "products" ? (
          <View style={styles.tabContent}>
            {productsLoading ? (
              <View style={styles.emptyContainer}>
                <ActivityIndicator size="large" color="#177DDF" />
                <Text style={styles.emptyText}>Loading products...</Text>
              </View>
            ) : products.length > 0 ? (
              <View style={styles.productsGrid}>
                {products.map((product) => {
                  const imageUrl = getProductImageUrl(product);
                  return (
                    <TouchableOpacity
                      key={product.product_id}
                      style={styles.productCard}
                      onPress={() =>
                        router.push({
                          pathname: "/pages/productDetail" as any,
                          params: { product_id: product.product_id },
                        })
                      }
                      activeOpacity={0.7}
                    >
                      {imageUrl ? (
                        <Image
                          source={{ uri: imageUrl }}
                          style={styles.productImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View
                          style={[
                            styles.productImage,
                            styles.productImagePlaceholder,
                          ]}
                        >
                          <Ionicons name="cube-outline" size={32} color="#CCC" />
                        </View>
                      )}
                      <View style={styles.productInfo}>
                        <Text style={styles.productName} numberOfLines={2}>
                          {product.product_name}
                        </Text>
                        {product.product_quantity && (
                          <Text style={styles.productQuantity}>
                            Qty: {product.product_quantity}
                          </Text>
                        )}
                        {product.product_price && (
                          <Text style={styles.productPrice}>
                            {product.product_price}
                          </Text>
                        )}
                        <TouchableOpacity
                          style={styles.enquireButton}
                          onPress={() =>
                            router.push({
                              pathname: "/pages/productDetail" as any,
                              params: { product_id: product.product_id },
                            })
                          }
                        >
                          <Text style={styles.enquireButtonText}>Enquire</Text>
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="cube-outline" size={64} color="#CCC" />
                <Text style={styles.emptyText}>No products available</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.tabContent}>
            {legalDetails &&
            (legalDetails.pan ||
              legalDetails.gst ||
              legalDetails.msme ||
              legalDetails.aadhaar ||
              legalDetails.fassi ||
              legalDetails.export_import) ? (
              <View style={styles.infoCard}>
                <View style={styles.infoCardHeader}>
                  <Ionicons name="document-text" size={18} color="#177DDF" />
                  <Text style={styles.infoCardTitle}>
                    Legal / Statutory Information
                  </Text>
                </View>
                {legalDetails.gst && (
                  <InfoRow
                    label="GST Number"
                    value={legalDetails.gst}
                    icon="receipt-outline"
                  />
                )}
                {legalDetails.pan && (
                  <InfoRow
                    label="PAN Number"
                    value={legalDetails.pan}
                    icon="document-outline"
                  />
                )}
                {legalDetails.aadhaar && (
                  <InfoRow
                    label="Aadhaar"
                    value={legalDetails.aadhaar}
                    icon="card-outline"
                  />
                )}
                {legalDetails.msme && (
                  <InfoRow
                    label="MSME"
                    value={legalDetails.msme}
                    icon="business-outline"
                  />
                )}
                {legalDetails.fassi && (
                  <InfoRow
                    label="FSSAI"
                    value={legalDetails.fassi}
                    icon="nutrition-outline"
                  />
                )}
                {legalDetails.export_import && (
                  <InfoRow
                    label="Export/Import Code"
                    value={legalDetails.export_import}
                    icon="globe-outline"
                  />
                )}
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons
                  name="document-text-outline"
                  size={64}
                  color="#CCC"
                />
                <Text style={styles.emptyText}>
                  No statutory details available
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
};

const InfoRow = ({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: keyof typeof Ionicons.glyphMap;
}) => (
  <View style={styles.infoCardRow}>
    {icon && <Ionicons name={icon} size={16} color="#888" />}
    <View style={{ flex: 1, marginLeft: icon ? 10 : 0 }}>
      <Text style={styles.infoCardLabel}>{label}</Text>
      <Text style={styles.infoCardValue}>{value || "N/A"}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  header: {
    backgroundColor: "#177DDF",
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#FFFFFF" },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, fontSize: 16, color: "#666" },
  retryBtn: {
    marginTop: 16,
    backgroundColor: "#177DDF",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
  scrollView: { flex: 1 },
  profileHeaderSection: {
    backgroundColor: "#FFFFFF",
    paddingBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  topBadgesRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 8,
  },
  trustedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  trustedBadgeText: { fontSize: 12, fontWeight: "600", color: "#28A745" },
  notTrustedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF5F5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFDDDD",
  },
  notTrustedBadgeText: { fontSize: 12, fontWeight: "600", color: "#DC3545" },
  verifiedTopBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedTopBadgeText: { fontSize: 12, fontWeight: "600", color: "#28A745" },
  notVerifiedTopBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF5F5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFDDDD",
  },
  notVerifiedTopBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#DC3545",
  },
  profileHeader: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  logoContainer: {
    position: "relative",
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: "visible",
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E0E0E0",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  logoPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#E3F2FD",
  },
  // ✅ NEW: Camera overlay for own profile
  editImageOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#177DDF",
    borderRadius: 12,
    padding: 5,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  verifiedOverlay: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 1,
  },
  basicInfo: { flex: 1, marginLeft: 16, justifyContent: "center" },
  businessName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
    marginBottom: 6,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
    gap: 6,
  },
  infoText: { fontSize: 13, color: "#666", flex: 1 },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 3,
  },
  ratingText: { fontSize: 14, fontWeight: "600", color: "#333", marginLeft: 6 },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 14,
    paddingVertical: 14,
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
  },
  statItem: { alignItems: "center", flex: 1 },
  statNumber: { fontSize: 18, fontWeight: "700", color: "#1A1A1A" },
  statLabel: { fontSize: 12, color: "#888", marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: "#E0E0E0" },
  followBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#177DDF",
    paddingVertical: 12,
    borderRadius: 10,
  },
  followingBtn: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#177DDF",
  },
  followBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  followingBtnText: { color: "#177DDF" },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 12,
    paddingVertical: 14,
    marginTop: 12,
  },
  actionButton: { alignItems: "center", gap: 4, flex: 1 },
  actionButtonText: { fontSize: 11, color: "#177DDF", fontWeight: "600" },
  socialMediaSection: {
    paddingHorizontal: 16,
    marginTop: 10,
    paddingBottom: 4,
  },
  socialMediaIcons: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
  },
  socialIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F7FA",
    justifyContent: "center",
    alignItems: "center",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    marginTop: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    borderBottomWidth: 2.5,
    borderBottomColor: "transparent",
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  activeTab: { borderBottomColor: "#177DDF" },
  tabText: { fontSize: 14, fontWeight: "500", color: "#999" },
  activeTabText: { color: "#177DDF", fontWeight: "600" },
  tabContent: { flex: 1, padding: 12 },
  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  productCard: {
    width: (width - 36) / 2,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  productImage: {
    width: "100%",
    height: 120,
    backgroundColor: "#F0F0F0",
  },
  productImagePlaceholder: { justifyContent: "center", alignItems: "center" },
  productInfo: { padding: 10 },
  productName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  productQuantity: { fontSize: 12, color: "#888", marginBottom: 2 },
  productPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: "#28A745",
    marginBottom: 8,
  },
  enquireButton: {
    backgroundColor: "#177DDF",
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
  },
  enquireButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  infoCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  infoCardTitle: { fontSize: 16, fontWeight: "700", color: "#1A1A1A" },
  infoCardRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F8F8F8",
  },
  infoCardLabel: { fontSize: 12, color: "#888" },
  infoCardValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#999",
    marginTop: 16,
  },
  bottomPadding: { height: 20 },
});

export default BusinessProfileScreen;
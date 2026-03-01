import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Constants from "expo-constants";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { jwtDecode } from "jwt-decode";
import React, { useEffect, useRef, useState } from "react";
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
import {
  addFollowToCache,
  getCachedFollowedIds,
  removeFollowFromCache,
  saveCachedFollowedIds,
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
  if (S3_URL) return `${S3_URL}${path}`;
  return url;
};

/**
 * Fetch all business IDs the current USER follows.
 * The API: GET /follower/get/followings/:user_id
 * Returns list where each item has `following_id` = the business UUID stored in DB.
 * Always syncs cache. Falls back to cache on error.
 */
const fetchUserFollowedBusinessIds = async (
  userId: string,
  token: string,
): Promise<Set<string>> => {
  try {
    const res = await axios.get(
      `${API_URL}/follower/get/followings/${userId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    const resData = res.data;
    const followings: any[] = Array.isArray(resData?.followings)
      ? resData.followings
      : Array.isArray(resData?.data?.followings)
        ? resData.data.followings
        : Array.isArray(resData?.data)
          ? resData.data
          : [];

    // Each row in DB: business_id | user_id
    // API returns: following_id = business_id column value
    const ids = new Set<string>(
      followings
        .map((f: any) => {
          // following_id is the business UUID from the DB `business_id` column
          const raw = f.following_id ?? f.business_id ?? f.id ?? "";
          return String(raw).trim();
        })
        .filter((id) => id !== "" && id !== "undefined" && id !== "null"),
    );

    await saveCachedFollowedIds(ids);

    console.log(
      `[FollowCheck] User ${userId} follows ${ids.size} business(es): [${[...ids].join(", ")}]`,
    );

    return ids;
  } catch (err: any) {
    console.warn(
      "[FollowCheck] Backend fetch failed, using local cache. Status:",
      err?.response?.status,
      err?.response?.data ?? err?.message,
    );
    return getCachedFollowedIds();
  }
};

const BusinessProfileScreen: React.FC = () => {
  const params = useLocalSearchParams();

  // business_id param = the UUID of the company being viewed
  // This must match the `business_id` column in the followers table
  const paramBusinessId = params.business_id
    ? String(params.business_id).trim()
    : "";

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"products" | "statutory">(
    "products",
  );
  const [businessDetails, setBusinessDetails] = useState<any>(null);
  const [socialDetails, setSocialDetails] = useState<any>(null);
  const [legalDetails, setLegalDetails] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState<boolean>(false);
  const [followersCount, setFollowersCount] = useState<number>(0);
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [followLoading, setFollowLoading] = useState<boolean>(false);
  const [imageUploading, setImageUploading] = useState<boolean>(false);
  const [isOwnProfile, setIsOwnProfile] = useState<boolean>(false);

  // These refs hold stable values used in follow/unfollow calls
  const currentUserIdRef = useRef<string>("");
  const resolvedBusinessIdRef = useRef<string>("");

  useEffect(() => {
    fetchBusinessProfile();
  }, [paramBusinessId]);

  const fetchBusinessProfile = async () => {
    try {
      setLoading(true);

      const token = await AsyncStorage.getItem("token");
      if (!token) {
        console.warn("[BizProfile] No auth token.");
        setLoading(false);
        return;
      }

      const decoded: any = jwtDecode(token);
      // user_id = the logged-in user's UUID
      const userId = String(decoded.user_id ?? "").trim();
      currentUserIdRef.current = userId;

      const authHeaders = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      // ── Step 1: Resolve which business we are viewing ──────────────────────
      // business_id in DB = the company UUID, not the user UUID
      let businessId = paramBusinessId;

      if (!businessId) {
        // Fallback: viewing own business profile
        const storedCompanyId = await AsyncStorage.getItem("companyId");
        businessId = storedCompanyId
          ? String(storedCompanyId).trim()
          : String(decoded.business_id ?? "").trim();
      }

      if (!businessId) {
        console.warn("[BizProfile] Cannot resolve business ID.");
        setLoading(false);
        return;
      }

      resolvedBusinessIdRef.current = businessId;
      console.log(
        "[BizProfile] Viewing business:",
        businessId,
        "| Current user:",
        userId,
      );

      // ── Step 2: Is this the user's own company? ────────────────────────────
      // A regular user (non-seller) will have NO companyId stored — isOwnProfile stays false
      const storedCompanyId = await AsyncStorage.getItem("companyId");
      const ownProfile =
        !!storedCompanyId && String(storedCompanyId).trim() === businessId;
      setIsOwnProfile(ownProfile);
      console.log("[BizProfile] isOwnProfile:", ownProfile);

      // ── Step 3: Fetch business details ────────────────────────────────────
      try {
        const completeRes = await fetch(
          `${API_URL}/business/get/complete/${businessId}`,
          { headers: authHeaders },
        );

        if (completeRes.ok) {
          const result = await completeRes.json();
          const details = result.details;
          setBusinessDetails({ ...details.business_details, id: businessId });
          setSocialDetails(details.social_details);
          setLegalDetails(details.legal_details);
        } else {
          const [bizRes, socialRes, legalRes] = await Promise.allSettled([
            fetch(`${API_URL}/business/get/${businessId}`, {
              headers: authHeaders,
            }),
            fetch(`${API_URL}/business/social/get/${businessId}`, {
              headers: authHeaders,
            }),
            fetch(`${API_URL}/business/legal/get/${businessId}`, {
              headers: authHeaders,
            }),
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
        console.error("[BizProfile] Business details fetch error:", e);
      }

      // ── Step 4: Fetch this business's followers count ──────────────────────
      try {
        const followersRes = await axios.get(
          `${API_URL}/follower/get/followers/${businessId}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const fResData = followersRes.data;
        const fList: any[] = Array.isArray(fResData?.followers)
          ? fResData.followers
          : Array.isArray(fResData?.data?.followers)
            ? fResData.data.followers
            : Array.isArray(fResData?.data)
              ? fResData.data
              : [];
        setFollowersCount(fList.length);
      } catch {
        setFollowersCount(0);
      }

      // ── Step 5: Check if current USER follows this BUSINESS ───────────────
      // Only check for non-own profiles — companies don't follow anyone
      if (!ownProfile) {
        const followedBusinessIds = await fetchUserFollowedBusinessIds(
          userId,
          token,
        );

        // businessId must match the `business_id` column value returned in `following_id`
        const following = followedBusinessIds.has(businessId);

        console.log(
          `[FollowCheck] Does user ${userId} follow business ${businessId}? → ${following}`,
        );
        console.log(
          `[FollowCheck] All followed IDs: [${[...followedBusinessIds].join(", ")}]`,
        );

        setIsFollowing(following);
      } else {
        // Own profile — never show follow button, state irrelevant
        setIsFollowing(false);
      }

      // ── Step 6: Fetch products ─────────────────────────────────────────────
      fetchProducts(businessId, { Authorization: `Bearer ${token}` });
    } catch (error) {
      console.error("[BizProfile] Unexpected error:", error);
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
        { headers },
      );
      const productsData = res.data?.data?.products || res.data?.data || [];
      const productsList = Array.isArray(productsData) ? productsData : [];
      const activeProducts = productsList.filter(
        (p: any) => p.is_product_active,
      );

      const productsWithImages = await Promise.all(
        activeProducts.slice(0, 20).map(async (product: any) => {
          try {
            const imgRes = await axios.get(
              `${API_URL}/product/image/get/${product.product_id}`,
              { headers },
            );
            return { ...product, images: imgRes.data.data?.images || [] };
          } catch {
            return { ...product, images: [] };
          }
        }),
      );

      const remaining = activeProducts
        .slice(20)
        .map((p: any) => ({ ...p, images: [] }));
      setProducts([...productsWithImages, ...remaining]);
    } catch {
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  };

  // ─── Follow / Unfollow ────────────────────────────────────────────────────
  /**
   * USER follows/unfollows a BUSINESS.
   * Payload: { user_id: currentUserId, business_id: businessId }
   * This matches exactly what's stored in DB:
   *   business_id | user_id
   */
  const performFollowToggle = async (shouldUnfollow: boolean) => {
    const userId = currentUserIdRef.current;
    const businessId = resolvedBusinessIdRef.current;

    if (!userId || !businessId) {
      console.warn("[FollowToggle] Missing userId or businessId", {
        userId,
        businessId,
      });
      return;
    }

    // Optimistic UI update
    const prevFollowing = isFollowing;
    const prevCount = followersCount;
    setIsFollowing(!shouldUnfollow);
    setFollowersCount((prev) =>
      shouldUnfollow ? Math.max(0, prev - 1) : prev + 1,
    );
    setFollowLoading(true);

    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("No auth token");

      const headers = { Authorization: `Bearer ${token}` };
      const endpoint = shouldUnfollow
        ? `${API_URL}/follower/unfollow`
        : `${API_URL}/follower/follow`;

      // Payload: user_id = who is following, business_id = who is being followed
      await axios.post(
        endpoint,
        { user_id: userId, business_id: businessId },
        { headers },
      );

      if (shouldUnfollow) {
        await removeFollowFromCache(businessId);
        console.log(
          `[FollowToggle] ✅ User ${userId} unfollowed business ${businessId}`,
        );
      } else {
        await addFollowToCache(businessId);
        console.log(
          `[FollowToggle] ✅ User ${userId} followed business ${businessId}`,
        );
      }
    } catch (error: any) {
      // Rollback on failure
      console.error(
        "[FollowToggle] ❌ Failed:",
        error?.response?.status,
        error?.response?.data ?? error?.message,
      );
      setIsFollowing(prevFollowing);
      setFollowersCount(prevCount);
      Alert.alert("Error", "Failed to update follow status. Please try again.");
    } finally {
      setFollowLoading(false);
    }
  };

  const handleFollowToggle = () => {
    if (followLoading) return;
    if (isFollowing) {
      const name =
        businessDetails?.name ||
        businessDetails?.business_name ||
        "this company";
      Alert.alert("Unfollow", `Are you sure you want to unfollow ${name}?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unfollow",
          style: "destructive",
          onPress: () => performFollowToggle(true),
        },
      ]);
    } else {
      performFollowToggle(false);
    }
  };

  // ─── S3 Image Upload ──────────────────────────────────────────────────────
  const uploadToS3WithXHR = (
    presignedUrl: string,
    fileUri: string,
    mimeType: string = "image/jpeg",
  ): Promise<void> =>
    new Promise(async (resolve, reject) => {
      try {
        const response = await fetch(fileUri);
        const blob = await response.blob();
        if (blob.size === 0) {
          reject(new Error("Blob is empty"));
          return;
        }
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", presignedUrl);
        xhr.setRequestHeader("Content-Type", mimeType);
        xhr.onload = () =>
          xhr.status >= 200 && xhr.status < 300
            ? resolve()
            : reject(new Error(`S3 HTTP ${xhr.status}`));
        xhr.onerror = () => reject(new Error("Network error during S3 upload"));
        xhr.ontimeout = () => reject(new Error("S3 upload timed out"));
        xhr.send(blob);
      } catch (err) {
        reject(err);
      }
    });

  const handleProfileImageUpload = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission required",
          "Please allow photo library access.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const imageAsset = result.assets[0];
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Error", "Authentication token not found.");
        return;
      }

      const businessId = resolvedBusinessIdRef.current;
      if (!businessId) {
        Alert.alert("Error", "Business ID not found.");
        return;
      }

      setImageUploading(true);

      let presignedUrl = "";
      try {
        const presignRes = await axios.get(
          `${API_URL}/business/get/presigned/${businessId}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        presignedUrl = presignRes.data?.url || presignRes.data?.data?.url || "";
        if (!presignedUrl) {
          Alert.alert("Error", "Failed to get upload URL.");
          return;
        }
      } catch (e: any) {
        Alert.alert(
          "Error",
          `Upload URL failed (${e?.response?.status ?? "network error"})`,
        );
        return;
      }

      try {
        await uploadToS3WithXHR(
          presignedUrl,
          imageAsset.uri,
          imageAsset.mimeType ?? "image/jpeg",
        );
      } catch {
        Alert.alert("Error", "Failed to upload image. Please try again.");
        return;
      }

      const imagePath = `profile/business/${businessId}.png`;
      try {
        await axios.put(
          `${API_URL}/business/update/image/${businessId}`,
          { profile_image: imagePath },
          { headers: { Authorization: `Bearer ${token}` } },
        );
      } catch {
        console.warn("[BizImageUpload] Image on S3 but path not saved to DB.");
      }

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
      console.error("[BizImageUpload] Error:", error?.message);
      Alert.alert("Error", "Something went wrong. Please try again.");
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
    businessDetails?.[field] ||
    businessDetails?.[`business_${field}`] ||
    fallback;

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
    if (phone) Linking.openURL(`https://wa.me/${phone.replace(/[^0-9]/g, "")}`);
  };

  const handleSocialMedia = (url?: string | null) => {
    if (url) Linking.openURL(url);
  };

  const getProductImageUrl = (product: any): string | null => {
    if (product.images?.length > 0) {
      const sorted = [...product.images].sort(
        (a: any, b: any) =>
          a.product_image_sequence_number - b.product_image_sequence_number,
      );
      return getImageUri(sorted[0].product_image_url);
    }
    return null;
  };

  // ─── Loading / Not Found ──────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar
          barStyle="light-content"
          backgroundColor="#177DDF"
          translucent={false}
        />
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
        <StatusBar
          barStyle="light-content"
          backgroundColor="#177DDF"
          translucent={false}
        />
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
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={fetchBusinessProfile}
          >
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
      <StatusBar
        barStyle="light-content"
        backgroundColor="#177DDF"
        translucent={false}
      />

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
        {/* Profile Header Card */}
        <View style={styles.profileHeaderSection}>
          {/* Trust / Verified Badges */}
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

          {/* Logo + Basic Info */}
          <View style={styles.profileHeader}>
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
                  />
                ) : (
                  <View style={[styles.logo, styles.logoPlaceholder]}>
                    <Ionicons name="business" size={40} color="#177DDF" />
                  </View>
                )}
                {isOwnProfile && !imageUploading && (
                  <View style={styles.editImageOverlay}>
                    <Ionicons name="camera" size={14} color="#FFFFFF" />
                  </View>
                )}
                {businessDetails.is_business_verified && (
                  <View style={styles.verifiedOverlay}>
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color="#28A745"
                    />
                  </View>
                )}
              </View>
            </TouchableOpacity>

            <View style={styles.basicInfo}>
              <Text style={styles.businessName}>{businessName}</Text>
              {businessDetails.contact_person ? (
                <View style={styles.infoRow}>
                  <Ionicons name="person-outline" size={14} color="#666" />
                  <Text style={styles.infoText}>
                    {businessDetails.contact_person}
                  </Text>
                </View>
              ) : null}
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

          {/* Rating */}
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

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{followersCount}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{products.length}</Text>
              <Text style={styles.statLabel}>Products</Text>
            </View>
          </View>

          {/*
            Follow button:
            - Shown ONLY when viewing ANOTHER company's profile (not own)
            - USER follows the COMPANY — companies cannot follow anyone
          */}
          {!isOwnProfile && (
            <View style={styles.followBtnWrapper}>
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
              onPress={handleContact}
            >
              <Ionicons name="call-outline" size={20} color="#177DDF" />
              <Text style={styles.actionButtonText}>Contact</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleMessage}
            >
              <Ionicons name="mail-outline" size={20} color="#177DDF" />
              <Text style={styles.actionButtonText}>Message</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleWhatsApp}
            >
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
                      <Ionicons
                        name="logo-instagram"
                        size={22}
                        color="#E4405F"
                      />
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
                      <Ionicons
                        name="logo-facebook"
                        size={22}
                        color="#1877F2"
                      />
                    </TouchableOpacity>
                  )}
                  {socialDetails.linkedin && (
                    <TouchableOpacity
                      style={styles.socialIcon}
                      onPress={() => handleSocialMedia(socialDetails.linkedin)}
                    >
                      <Ionicons
                        name="logo-linkedin"
                        size={22}
                        color="#0A66C2"
                      />
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
                          <Ionicons
                            name="cube-outline"
                            size={32}
                            color="#CCC"
                          />
                        </View>
                      )}
                      <View style={styles.productInfo}>
                        <Text style={styles.productName} numberOfLines={2}>
                          {product.product_name}
                        </Text>
                        {product.product_quantity ? (
                          <Text style={styles.productQuantity}>
                            Qty: {product.product_quantity}
                          </Text>
                        ) : null}
                        {product.product_price ? (
                          <Text style={styles.productPrice}>
                            {product.product_price}
                          </Text>
                        ) : null}
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
                <Ionicons name="document-text-outline" size={64} color="#CCC" />
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
  editImageOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#177DDF",
    borderRadius: 12,
    padding: 5,
    borderWidth: 2,
    borderColor: "#FFFFFF",
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
  followBtnWrapper: { paddingHorizontal: 16, marginTop: 14 },
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
  socialMediaIcons: { flexDirection: "row", gap: 10, justifyContent: "center" },
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
  productImage: { width: "100%", height: 120, backgroundColor: "#F0F0F0" },
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
  emptyText: { fontSize: 16, fontWeight: "600", color: "#999", marginTop: 16 },
  bottomPadding: { height: 20 },
});

export default BusinessProfileScreen;

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
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
    const ids = new Set<string>(
      followings
        .map((f: any) => {
          const raw = f.following_id ?? f.business_id ?? f.id ?? "";
          return String(raw).trim();
        })
        .filter((id) => id !== "" && id !== "undefined" && id !== "null"),
    );
    await saveCachedFollowedIds(ids);
    return ids;
  } catch {
    return getCachedFollowedIds();
  }
};

// ── Section card helper ────────────────────────────────────────────────────
const SectionCard = ({
  iconName, iconBg, iconColor, title, children, onEdit,
}: {
  iconName: any; iconBg: string; iconColor: string; title: string;
  children: React.ReactNode; onEdit?: () => void;
}) => (
  <View style={styles.sectionCard}>
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIconBg, { backgroundColor: iconBg }]}>
        <Ionicons name={iconName} size={16} color={iconColor} />
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
      {onEdit && (
        <TouchableOpacity style={styles.sectionEditBtn} onPress={onEdit}>
          <Ionicons name="create-outline" size={15} color="#0078D7" />
          <Text style={styles.sectionEditText}>Edit</Text>
        </TouchableOpacity>
      )}
    </View>
    {children}
  </View>
);

// ── Detail row helper ──────────────────────────────────────────────────────
const DetailRow = ({
  label, value, icon,
}: {
  label: string; value?: string; icon?: any;
}) => (
  <View style={styles.detailRow}>
    {icon && (
      <View style={styles.detailIconWrap}>
        <Ionicons name={icon} size={14} color="#0078D7" />
      </View>
    )}
    <View style={styles.detailContent}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || "N/A"}</Text>
    </View>
  </View>
);

const BusinessProfileScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const paramBusinessId = params.business_id
    ? String(params.business_id).trim()
    : "";

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"products" | "statutory">("products");
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

  const currentUserIdRef = useRef<string>("");
  const resolvedBusinessIdRef = useRef<string>("");

  useEffect(() => {
    fetchBusinessProfile();
  }, [paramBusinessId]);

  const fetchBusinessProfile = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) { setLoading(false); return; }
      const decoded: any = jwtDecode(token);
      const userId = String(decoded.user_id ?? "").trim();
      currentUserIdRef.current = userId;
      const authHeaders = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
      let businessId = paramBusinessId;
      if (!businessId) {
        const storedCompanyId = await AsyncStorage.getItem("companyId");
        businessId = storedCompanyId ? String(storedCompanyId).trim() : String(decoded.business_id ?? "").trim();
      }
      if (!businessId) { setLoading(false); return; }
      resolvedBusinessIdRef.current = businessId;
      const storedCompanyId = await AsyncStorage.getItem("companyId");
      const ownProfile = !!storedCompanyId && String(storedCompanyId).trim() === businessId;
      setIsOwnProfile(ownProfile);

      try {
        const completeRes = await fetch(`${API_URL}/business/get/complete/${businessId}`, { headers: authHeaders });
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
      } catch (e) { console.error(e); }

      try {
        const followersRes = await axios.get(`${API_URL}/follower/get/followers/${businessId}`, { headers: { Authorization: `Bearer ${token}` } });
        const fResData = followersRes.data;
        const fList: any[] = Array.isArray(fResData?.followers) ? fResData.followers : Array.isArray(fResData?.data?.followers) ? fResData.data.followers : Array.isArray(fResData?.data) ? fResData.data : [];
        setFollowersCount(fList.length);
      } catch { setFollowersCount(0); }

      if (!ownProfile) {
        const followedBusinessIds = await fetchUserFollowedBusinessIds(userId, token);
        setIsFollowing(followedBusinessIds.has(businessId));
      } else {
        setIsFollowing(false);
      }

      fetchProducts(businessId, { Authorization: `Bearer ${token}` }, ownProfile);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchProducts = async (businessId: string, headers: any, ownProfile: boolean = false) => {
    try {
      setProductsLoading(true);
      // Own profile: fetch ALL products (incl. inactive) via /business endpoint
      // Other profiles: fetch only active products via /company endpoint
      let productsList: any[] = [];
      try {
        if (ownProfile) {
          const res = await axios.get(`${API_URL}/product/get/business/${businessId}`, { headers });
          const data = res.data?.products || res.data?.data?.products || res.data?.data || [];
          productsList = Array.isArray(data) ? data : [];
        } else {
          const res = await axios.get(`${API_URL}/product/get/company/${businessId}`, { headers });
          const data = res.data?.data?.products || res.data?.data || res.data?.products || [];
          productsList = Array.isArray(data) ? data : [];
          productsList = productsList.filter((p: any) => p.is_product_active !== false);
        }
      } catch {
        // Fallback: try the business endpoint
        try {
          const res = await axios.get(`${API_URL}/product/get/business/${businessId}`, { headers });
          const data = res.data?.products || res.data?.data?.products || [];
          productsList = Array.isArray(data) ? data : [];
        } catch { productsList = []; }
      }

      // Fetch images for first 20 products – normalize id field
      const productsWithImages = await Promise.all(
        productsList.slice(0, 20).map(async (product: any) => {
          const pid = product.product_id || product.id || "";
          try {
            if (!pid) return { ...product, images: [] };
            const imgRes = await axios.get(`${API_URL}/product/image/get/${pid}`, { headers });
            return { ...product, product_id: pid, images: imgRes.data.data?.images || imgRes.data?.images || [] };
          } catch { return { ...product, product_id: pid, images: [] }; }
        }),
      );
      const remaining = productsList.slice(20).map((p: any) => ({
        ...p, product_id: p.product_id || p.id || "", images: [],
      }));
      setProducts([...productsWithImages, ...remaining]);
    } catch { setProducts([]); }
    finally { setProductsLoading(false); }
  };

  const performFollowToggle = async (shouldUnfollow: boolean) => {
    const userId = currentUserIdRef.current;
    const businessId = resolvedBusinessIdRef.current;
    if (!userId || !businessId) return;
    const prevFollowing = isFollowing;
    const prevCount = followersCount;
    setIsFollowing(!shouldUnfollow);
    setFollowersCount((prev) => shouldUnfollow ? Math.max(0, prev - 1) : prev + 1);
    setFollowLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("No auth token");
      const headers = { Authorization: `Bearer ${token}` };
      const endpoint = shouldUnfollow ? `${API_URL}/follower/unfollow` : `${API_URL}/follower/follow`;
      await axios.post(endpoint, { user_id: userId, business_id: businessId }, { headers });
      if (shouldUnfollow) await removeFollowFromCache(businessId);
      else await addFollowToCache(businessId);
    } catch {
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
      const name = businessDetails?.name || businessDetails?.business_name || "this company";
      Alert.alert("Unfollow", `Are you sure you want to unfollow ${name}?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Unfollow", style: "destructive", onPress: () => performFollowToggle(true) },
      ]);
    } else {
      performFollowToggle(false);
    }
  };

  const uploadToS3WithXHR = (presignedUrl: string, fileUri: string, mimeType: string = "image/jpeg"): Promise<void> =>
    new Promise(async (resolve, reject) => {
      try {
        const response = await fetch(fileUri);
        const blob = await response.blob();
        if (blob.size === 0) { reject(new Error("Blob is empty")); return; }
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", presignedUrl);
        xhr.setRequestHeader("Content-Type", mimeType);
        xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`S3 HTTP ${xhr.status}`));
        xhr.onerror = () => reject(new Error("Network error during S3 upload"));
        xhr.ontimeout = () => reject(new Error("S3 upload timed out"));
        xhr.send(blob);
      } catch (err) { reject(err); }
    });

  const handleProfileImageUpload = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) { Alert.alert("Permission required", "Please allow photo library access."); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      if (result.canceled || !result.assets?.[0]) return;
      const imageAsset = result.assets[0];
      const token = await AsyncStorage.getItem("token");
      if (!token) { Alert.alert("Error", "Authentication token not found."); return; }
      const businessId = resolvedBusinessIdRef.current;
      if (!businessId) { Alert.alert("Error", "Business ID not found."); return; }
      setImageUploading(true);
      let presignedUrl = "";
      try {
        const presignRes = await axios.get(`${API_URL}/business/get/presigned/${businessId}`, { headers: { Authorization: `Bearer ${token}` } });
        presignedUrl = presignRes.data?.url || presignRes.data?.data?.url || "";
        if (!presignedUrl) { Alert.alert("Error", "Failed to get upload URL."); return; }
      } catch (e: any) { Alert.alert("Error", `Upload URL failed`); return; }
      try {
        await uploadToS3WithXHR(presignedUrl, imageAsset.uri, imageAsset.mimeType ?? "image/jpeg");
      } catch { Alert.alert("Error", "Failed to upload image."); return; }
      const imagePath = `profile/business/${businessId}.png`;
      try {
        await axios.put(`${API_URL}/business/update/image/${businessId}`, { profile_image: imagePath }, { headers: { Authorization: `Bearer ${token}` } });
      } catch { }
      const cacheBust = `?t=${Date.now()}`;
      const newImageUri = CLOUDFRONT_URL ? `${CLOUDFRONT_URL}/${imagePath}${cacheBust}` : `${S3_URL}/${imagePath}${cacheBust}`;
      setBusinessDetails((prev: any) => ({ ...prev, profile_image: newImageUri }));
      Alert.alert("Success", "Profile image updated successfully!");
    } catch { Alert.alert("Error", "Something went wrong."); }
    finally { setImageUploading(false); }
  };

  const onRefresh = async () => { setRefreshing(true); await fetchBusinessProfile(); };
  const handleBack = () => router.back();
  const getBizField = (field: string, fallback: string = "") => businessDetails?.[field] || businessDetails?.[`business_${field}`] || fallback;
  const handleContact = () => { const phone = getBizField("phone"); if (phone) Linking.openURL(`tel:${phone}`); };
  const handleMessage = () => { const email = getBizField("email"); if (email) Linking.openURL(`mailto:${email}`); };
  const handleWhatsApp = () => { const phone = getBizField("phone"); if (phone) Linking.openURL(`https://wa.me/${phone.replace(/[^0-9]/g, "")}`); };
  const handleSocialMedia = (url?: string | null) => { if (url) Linking.openURL(url); };
  const getProductImageUrl = (product: any): string | null => {
    if (product.images?.length > 0) {
      const sorted = [...product.images].sort((a: any, b: any) => a.product_image_sequence_number - b.product_image_sequence_number);
      return getImageUri(sorted[0].product_image_url);
    }
    return null;
  };

  // ── Shared Header ──────────────────────────────────────────────────────────
  const Header = () => (
    <View style={[styles.headerWrapper, { paddingTop: insets.top }]}>
      <View style={styles.orb1} /><View style={styles.orb2} /><View style={styles.orb3} />
      <View style={styles.headerInner}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={styles.eyebrow}>COMPANY</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>Business Profile</Text>
        </View>
        <TouchableOpacity style={styles.shareBtn} onPress={() => { }}>
          <Ionicons name="share-social-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0060B8" />
        <Header />
        <View style={styles.loaderContainer}>
          <View style={styles.loaderCard}>
            <ActivityIndicator size="large" color="#0078D7" />
            <Text style={styles.loaderText}>Loading profile...</Text>
          </View>
        </View>
      </View>
    );
  }

  if (!businessDetails) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0060B8" />
        <Header />
        <View style={styles.loaderContainer}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="business-outline" size={32} color="#0078D7" />
          </View>
          <Text style={styles.emptyTitle}>Business Not Found</Text>
          <Text style={styles.emptySubtitle}>This profile may have been removed or is no longer active.</Text>
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
  const profileImageUrl = businessDetails.profile_image || businessDetails.business_profile_image || null;
  const imageUri = getImageUri(profileImageUrl);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0060B8" />

      {/* ── Premium Header ── */}
      <View style={[styles.headerWrapper, { paddingTop: insets.top }]}>
        <View style={styles.orb1} /><View style={styles.orb2} /><View style={styles.orb3} />
        <View style={styles.headerInner}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.eyebrow}>COMPANY</Text>
            <Text style={styles.headerTitle} numberOfLines={1}>{businessName || "Business Profile"}</Text>
          </View>
          <TouchableOpacity style={styles.shareBtn} onPress={() => { }}>
            <Ionicons name="share-social-outline" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0078D7"]} tintColor="#0078D7" />
        }
      >
        {/* ── Profile Hero Card ── */}
        <View style={styles.profileHeroCard}>
          {/* Badge row */}
          <View style={styles.badgeRow}>
            <View style={[styles.badge, businessDetails.is_business_trusted ? styles.badgeTrusted : styles.badgeUntrusted]}>
              <Ionicons name={businessDetails.is_business_trusted ? "ribbon" : "ribbon-outline"} size={11} color={businessDetails.is_business_trusted ? "#16A34A" : "#EF4444"} />
              <Text style={[styles.badgeText, { color: businessDetails.is_business_trusted ? "#16A34A" : "#EF4444" }]}>
                {businessDetails.is_business_trusted ? "Trusted" : "Not Trusted"}
              </Text>
            </View>
            <View style={[styles.badge, businessDetails.is_business_verified ? styles.badgeVerified : styles.badgeUnverified]}>
              <Ionicons name={businessDetails.is_business_verified ? "shield-checkmark" : "shield-outline"} size={11} color={businessDetails.is_business_verified ? "#0078D7" : "#EF4444"} />
              <Text style={[styles.badgeText, { color: businessDetails.is_business_verified ? "#0078D7" : "#EF4444" }]}>
                {businessDetails.is_business_verified ? "Verified" : "Not Verified"}
              </Text>
            </View>
          </View>

          {/* Avatar + Info */}
          <View style={styles.avatarRow}>
            <TouchableOpacity
              onPress={isOwnProfile ? handleProfileImageUpload : undefined}
              activeOpacity={isOwnProfile ? 0.7 : 1}
              disabled={imageUploading}
            >
              <View style={styles.avatarWrap}>
                {imageUploading ? (
                  <View style={styles.avatarPlaceholder}><ActivityIndicator size="small" color="#0078D7" /></View>
                ) : imageUri ? (
                  <Image source={{ uri: imageUri }} style={styles.avatar} resizeMode="cover" />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="business" size={36} color="#0078D7" />
                  </View>
                )}
                {isOwnProfile && !imageUploading && (
                  <View style={styles.cameraOverlay}>
                    <Ionicons name="camera" size={12} color="#fff" />
                  </View>
                )}
                {businessDetails.is_business_verified && (
                  <View style={styles.verifiedOverlay}>
                    <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
                  </View>
                )}
              </View>
            </TouchableOpacity>

            <View style={styles.bizInfo}>
              <Text style={styles.bizName}>{businessName}</Text>
              {businessDetails.contact_person ? (
                <View style={styles.infoChip}>
                  <Ionicons name="person-outline" size={12} color="#64748B" />
                  <Text style={styles.infoChipText}>{businessDetails.contact_person}</Text>
                </View>
              ) : null}
              <View style={styles.infoChip}>
                <Ionicons name="location-outline" size={12} color="#64748B" />
                <Text style={styles.infoChipText}>{businessCity}{businessState ? `, ${businessState}` : ""}</Text>
              </View>
              {businessEmail ? (
                <View style={styles.infoChip}>
                  <Ionicons name="mail-outline" size={12} color="#64748B" />
                  <Text style={styles.infoChipText} numberOfLines={1}>{businessEmail}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Rating */}
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Ionicons key={star} name="star" size={16} color={star <= 4 ? "#F59E0B" : "#E2E8F0"} />
            ))}
            <Text style={styles.ratingText}>4.0</Text>
          </View>

          {/* Stats */}
          <View style={styles.statsStrip}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{followersCount}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{products.length}</Text>
              <Text style={styles.statLabel}>Products</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{businessDetails.business_type || 'B2B'}</Text>
              <Text style={styles.statLabel}>Type</Text>
            </View>
          </View>

          {/* ── Social Media Pills (always visible) ── */}
          {socialDetails && (socialDetails.website || socialDetails.instagram || socialDetails.facebook || socialDetails.linkedin || socialDetails.youtube || socialDetails.x || socialDetails.telegram) && (
            <View style={styles.socialPillsRow}>
              {socialDetails.instagram && (
                <TouchableOpacity style={[styles.socialPill, { backgroundColor: '#FCE7F3' }]} onPress={() => handleSocialMedia(socialDetails.instagram)}>
                  <Ionicons name="logo-instagram" size={16} color="#E4405F" />
                  <Text style={[styles.socialPillText, { color: '#E4405F' }]}>Instagram</Text>
                </TouchableOpacity>
              )}
              {socialDetails.linkedin && (
                <TouchableOpacity style={[styles.socialPill, { backgroundColor: '#E8F0FA' }]} onPress={() => handleSocialMedia(socialDetails.linkedin)}>
                  <Ionicons name="logo-linkedin" size={16} color="#0A66C2" />
                  <Text style={[styles.socialPillText, { color: '#0A66C2' }]}>LinkedIn</Text>
                </TouchableOpacity>
              )}
              {socialDetails.facebook && (
                <TouchableOpacity style={[styles.socialPill, { backgroundColor: '#EBF5FF' }]} onPress={() => handleSocialMedia(socialDetails.facebook)}>
                  <Ionicons name="logo-facebook" size={16} color="#1877F2" />
                  <Text style={[styles.socialPillText, { color: '#1877F2' }]}>Facebook</Text>
                </TouchableOpacity>
              )}
              {socialDetails.youtube && (
                <TouchableOpacity style={[styles.socialPill, { backgroundColor: '#FEF2F2' }]} onPress={() => handleSocialMedia(socialDetails.youtube)}>
                  <Ionicons name="logo-youtube" size={16} color="#FF0000" />
                  <Text style={[styles.socialPillText, { color: '#FF0000' }]}>YouTube</Text>
                </TouchableOpacity>
              )}
              {socialDetails.x && (
                <TouchableOpacity style={[styles.socialPill, { backgroundColor: '#F1F5F9' }]} onPress={() => handleSocialMedia(socialDetails.x)}>
                  <Ionicons name="logo-twitter" size={16} color="#1A1A1A" />
                  <Text style={[styles.socialPillText, { color: '#1A1A1A' }]}>X</Text>
                </TouchableOpacity>
              )}
              {socialDetails.telegram && (
                <TouchableOpacity style={[styles.socialPill, { backgroundColor: '#E5F5FD' }]} onPress={() => handleSocialMedia(socialDetails.telegram)}>
                  <Ionicons name="paper-plane-outline" size={16} color="#0088CC" />
                  <Text style={[styles.socialPillText, { color: '#0088CC' }]}>Telegram</Text>
                </TouchableOpacity>
              )}
              {socialDetails.website && (
                <TouchableOpacity style={[styles.socialPill, { backgroundColor: '#F1F5F9' }]} onPress={() => handleSocialMedia(socialDetails.website)}>
                  <Ionicons name="globe-outline" size={16} color="#334155" />
                  <Text style={[styles.socialPillText, { color: '#334155' }]}>Website</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Follow button */}
          {!isOwnProfile && (
            <TouchableOpacity
              style={[styles.followBtn, isFollowing ? styles.followingBtn : styles.followNotBtn]}
              onPress={handleFollowToggle}
              disabled={followLoading}
            >
              {followLoading ? (
                <ActivityIndicator size="small" color={isFollowing ? "#0078D7" : "#fff"} />
              ) : (
                <>
                  <Ionicons name={isFollowing ? "checkmark-circle" : "add-circle-outline"} size={18} color={isFollowing ? "#0078D7" : "#fff"} />
                  <Text style={[styles.followBtnText, isFollowing ? styles.followingBtnText : styles.followNotBtnText]}>
                    {isFollowing ? "Following" : "Follow"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* ── Action Buttons ── */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleContact}>
            <View style={[styles.actionBtnIcon, { backgroundColor: "#DCFCE7" }]}>
              <Ionicons name="call-outline" size={20} color="#16A34A" />
            </View>
            <Text style={[styles.actionBtnLabel, { color: "#16A34A" }]}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleWhatsApp}>
            <View style={[styles.actionBtnIcon, { backgroundColor: "#DCFCE7" }]}>
              <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
            </View>
            <Text style={[styles.actionBtnLabel, { color: "#25D366" }]}>WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleMessage}>
            <View style={[styles.actionBtnIcon, { backgroundColor: "#EBF5FF" }]}>
              <Ionicons name="mail-outline" size={20} color="#0078D7" />
            </View>
            <Text style={[styles.actionBtnLabel, { color: "#0078D7" }]}>Email</Text>
          </TouchableOpacity>
          {isOwnProfile && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => router.push({ pathname: "/pages/editBusinessDetails" as any, params: { business_id: resolvedBusinessIdRef.current } })}
            >
              <View style={[styles.actionBtnIcon, { backgroundColor: "#FDF4FF" }]}>
                <Ionicons name="create-outline" size={20} color="#9333EA" />
              </View>
              <Text style={[styles.actionBtnLabel, { color: "#9333EA" }]}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Tabs ── */}
        <View style={styles.tabRow}>
          {(["products", "statutory"] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Ionicons
                name={tab === "products" ? "cube-outline" : "shield-checkmark-outline"}
                size={16}
                color={activeTab === tab ? "#0078D7" : "#94A3B8"}
              />
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === "products" ? "Products" : "Statutory"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Products Tab ── */}
        {activeTab === "products" && (
          <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
            {productsLoading ? (
              <View style={styles.tabLoader}>
                <ActivityIndicator size="small" color="#0078D7" />
                <Text style={styles.tabLoaderText}>Loading products...</Text>
              </View>
            ) : products.length === 0 ? (
              <View style={styles.emptyTab}>
                <View style={styles.emptyTabIcon}>
                  <Ionicons name="cube-outline" size={28} color="#0078D7" />
                </View>
                <Text style={styles.emptyTabTitle}>No Products Yet</Text>
                <Text style={styles.emptyTabSubtitle}>Products listed by this business will appear here</Text>
              </View>
            ) : (
              <View style={styles.productsGrid}>
                {products.map((product: any, index: number) => {
                  const imgUrl = getProductImageUrl(product);
                  return (
                    <TouchableOpacity
                      key={product.product_id || index}
                      style={styles.productCard}
                      onPress={() => router.push({ pathname: "/pages/productDetail" as any, params: { product_id: product.product_id } })}
                      activeOpacity={0.85}
                    >
                      <View style={styles.productAccentBar} />
                      {imgUrl ? (
                        <Image source={{ uri: imgUrl }} style={styles.productImage} resizeMode="cover" />
                      ) : (
                        <View style={styles.productImagePlaceholder}>
                          <Ionicons name="cube-outline" size={26} color="#CBD5E1" />
                        </View>
                      )}
                      <View style={styles.productCardBody}>
                        <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                        {product.price > 0 && (
                          <Text style={styles.productPrice}>₹{product.price}/{product.unit}</Text>
                        )}
                        <View style={styles.productFooter}>
                          {product.moq && <Text style={styles.productMoq}>MOQ: {product.moq}</Text>}
                          <View style={styles.productViewBtn}>
                            <Ionicons name="arrow-forward" size={10} color="#0078D7" />
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* ── Statutory Tab ── */}
        {activeTab === "statutory" && (
          <View>
            {/* Business Info */}
            <SectionCard iconName="storefront-outline" iconBg="#EBF5FF" iconColor="#0078D7" title="Business Information"
              onEdit={isOwnProfile ? () => router.push({ pathname: "/pages/editBusinessDetails" as any, params: { business_id: resolvedBusinessIdRef.current } }) : undefined}>
              <DetailRow icon="storefront-outline" label="Business Name" value={businessName} />
              <DetailRow icon="call-outline" label="Phone" value={businessPhone} />
              <DetailRow icon="mail-outline" label="Email" value={businessEmail} />
              <DetailRow icon="location-outline" label="Location" value={`${businessCity}${businessState ? `, ${businessState}` : ""}`} />
              {businessDetails.address && <DetailRow icon="map-outline" label="Address" value={businessDetails.address} />}
              {businessDetails.pincode && <DetailRow icon="navigate-outline" label="Pincode" value={businessDetails.pincode} />}
              {businessDetails.business_type && <DetailRow icon="briefcase-outline" label="Business Type" value={businessDetails.business_type} />}
              {businessDetails.gst && <DetailRow icon="document-text-outline" label="GST" value={businessDetails.gst} />}
            </SectionCard>

            {/* Legal Details */}
            {legalDetails && (
              <SectionCard iconName="shield-checkmark-outline" iconBg="#DCFCE7" iconColor="#16A34A" title="Legal Details"
                onEdit={isOwnProfile ? () => router.push({ pathname: "/pages/editLegalDetails" as any, params: { business_id: resolvedBusinessIdRef.current } }) : undefined}>
                <View style={styles.legalBadgesWrap}>
                  {legalDetails.pan && <LegalBadge label="PAN" />}
                  {legalDetails.gst && <LegalBadge label="GST" />}
                  {legalDetails.msme && <LegalBadge label="MSME" />}
                  {legalDetails.aadhaar && <LegalBadge label="Aadhaar" />}
                  {legalDetails.fassi && <LegalBadge label="FSSAI" />}
                  {legalDetails.export_import && <LegalBadge label="Export/Import" />}
                </View>
              </SectionCard>
            )}

            {/* Social Media */}
            {socialDetails && (socialDetails.linkedin || socialDetails.instagram || socialDetails.facebook || socialDetails.website || socialDetails.youtube) && (
              <SectionCard iconName="share-social-outline" iconBg="#FCE7F3" iconColor="#EC4899" title="Social Media"
                onEdit={isOwnProfile ? () => router.push({ pathname: "/pages/editSocialMedia" as any, params: { business_id: resolvedBusinessIdRef.current } }) : undefined}>
                {socialDetails.instagram && (
                  <TouchableOpacity style={styles.socialRow} onPress={() => handleSocialMedia(socialDetails.instagram)}>
                    <View style={[styles.socialIcon, { backgroundColor: "#FCE7F3" }]}>
                      <Ionicons name="logo-instagram" size={16} color="#E4405F" />
                    </View>
                    <Text style={styles.socialText} numberOfLines={1}>{socialDetails.instagram}</Text>
                    <Ionicons name="open-outline" size={14} color="#94A3B8" />
                  </TouchableOpacity>
                )}
                {socialDetails.facebook && (
                  <TouchableOpacity style={styles.socialRow} onPress={() => handleSocialMedia(socialDetails.facebook)}>
                    <View style={[styles.socialIcon, { backgroundColor: "#EBF5FF" }]}>
                      <Ionicons name="logo-facebook" size={16} color="#1877F2" />
                    </View>
                    <Text style={styles.socialText} numberOfLines={1}>{socialDetails.facebook}</Text>
                    <Ionicons name="open-outline" size={14} color="#94A3B8" />
                  </TouchableOpacity>
                )}
                {socialDetails.linkedin && (
                  <TouchableOpacity style={styles.socialRow} onPress={() => handleSocialMedia(socialDetails.linkedin)}>
                    <View style={[styles.socialIcon, { backgroundColor: "#EBF5FF" }]}>
                      <Ionicons name="logo-linkedin" size={16} color="#0A66C2" />
                    </View>
                    <Text style={styles.socialText} numberOfLines={1}>{socialDetails.linkedin}</Text>
                    <Ionicons name="open-outline" size={14} color="#94A3B8" />
                  </TouchableOpacity>
                )}
                {socialDetails.youtube && (
                  <TouchableOpacity style={styles.socialRow} onPress={() => handleSocialMedia(socialDetails.youtube)}>
                    <View style={[styles.socialIcon, { backgroundColor: "#FEF2F2" }]}>
                      <Ionicons name="logo-youtube" size={16} color="#FF0000" />
                    </View>
                    <Text style={styles.socialText} numberOfLines={1}>{socialDetails.youtube}</Text>
                    <Ionicons name="open-outline" size={14} color="#94A3B8" />
                  </TouchableOpacity>
                )}
                {socialDetails.website && (
                  <TouchableOpacity style={styles.socialRow} onPress={() => handleSocialMedia(socialDetails.website)}>
                    <View style={[styles.socialIcon, { backgroundColor: "#F1F5F9" }]}>
                      <Ionicons name="globe-outline" size={16} color="#64748B" />
                    </View>
                    <Text style={styles.socialText} numberOfLines={1}>{socialDetails.website}</Text>
                    <Ionicons name="open-outline" size={14} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </SectionCard>
            )}

            <View style={{ height: 16 }} />
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const LegalBadge = ({ label }: { label: string }) => (
  <View style={styles.legalBadge}>
    <Ionicons name="checkmark-circle" size={13} color="#16A34A" />
    <Text style={styles.legalBadgeText}>{label}</Text>
  </View>
);

export default BusinessProfileScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F9FC" },

  // ── Premium Header ──
  headerWrapper: {
    backgroundColor: "#0060B8", paddingHorizontal: 20, paddingBottom: 20,
    overflow: "hidden", shadowColor: "#003E80",
    shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 24, elevation: 18,
  },
  orb1: { position: "absolute", width: 280, height: 280, borderRadius: 140, backgroundColor: "rgba(255,255,255,0.06)", top: -100, right: -70 },
  orb2: { position: "absolute", width: 180, height: 180, borderRadius: 90, backgroundColor: "rgba(255,255,255,0.04)", bottom: 10, left: -60 },
  orb3: { position: "absolute", width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(100,180,255,0.08)", top: 20, right: width * 0.35 },
  headerInner: { flexDirection: "row", alignItems: "center", paddingTop: 16 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.15)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  eyebrow: { fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.65)", letterSpacing: 2, marginBottom: 2 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.4 },
  shareBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.15)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },

  // ── Loader ──
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  loaderCard: { backgroundColor: "#fff", borderRadius: 20, padding: 32, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 6 },
  loaderText: { marginTop: 12, fontSize: 13, color: "#94A3B8", fontWeight: "500" },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#EBF5FF", justifyContent: "center", alignItems: "center", marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A", letterSpacing: -0.3 },
  emptySubtitle: { fontSize: 13, color: "#94A3B8", textAlign: "center", marginTop: 8, lineHeight: 20 },
  retryBtn: { marginTop: 24, backgroundColor: "#0078D7", paddingHorizontal: 28, paddingVertical: 12, borderRadius: 14, shadowColor: "#0078D7", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  retryBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  // ── Profile Hero Card ──
  profileHeroCard: {
    backgroundColor: "#fff", marginHorizontal: 16, marginTop: 18, borderRadius: 24,
    padding: 20, shadowColor: "#1B4FBF", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1, shadowRadius: 20, elevation: 8,
    borderWidth: 1, borderColor: "#F0F4F8",
  },

  badgeRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  badgeTrusted: { backgroundColor: "#DCFCE7" },
  badgeUntrusted: { backgroundColor: "#FEF2F2" },
  badgeVerified: { backgroundColor: "#EBF5FF" },
  badgeUnverified: { backgroundColor: "#FEF2F2" },
  badgeText: { fontSize: 11, fontWeight: "700" },

  avatarRow: { flexDirection: "row", alignItems: "flex-start", gap: 16, marginBottom: 16 },
  avatarWrap: { position: "relative" },
  avatar: { width: 84, height: 84, borderRadius: 20, backgroundColor: "#E0E0E0", borderWidth: 3, borderColor: "#EBF5FF" },
  avatarPlaceholder: { width: 84, height: 84, borderRadius: 20, backgroundColor: "#EBF5FF", justifyContent: "center", alignItems: "center", borderWidth: 3, borderColor: "#DBEAFE" },
  cameraOverlay: { position: "absolute", bottom: -4, right: -4, width: 26, height: 26, borderRadius: 13, backgroundColor: "#0078D7", justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#fff" },
  verifiedOverlay: { position: "absolute", top: -6, right: -6, backgroundColor: "#fff", borderRadius: 10 },

  bizInfo: { flex: 1 },
  bizName: { fontSize: 17, fontWeight: "800", color: "#0F172A", letterSpacing: -0.3, marginBottom: 8 },
  infoChip: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 5 },
  infoChipText: { fontSize: 12, color: "#64748B", fontWeight: "500", flex: 1 },

  ratingRow: { flexDirection: "row", alignItems: "center", gap: 3, marginBottom: 16 },
  ratingText: { fontSize: 13, fontWeight: "700", color: "#F59E0B", marginLeft: 6 },

  statsStrip: { flexDirection: "row", backgroundColor: "#F7F9FC", borderRadius: 16, paddingVertical: 14, marginBottom: 16, borderWidth: 1, borderColor: "#F0F4F8" },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 16, fontWeight: "900", color: "#0F172A", letterSpacing: -0.3 },
  statLabel: { fontSize: 10, color: "#94A3B8", fontWeight: "600", marginTop: 3 },
  statDivider: { width: 1, backgroundColor: "#E2E8F0" },

  followBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13, borderRadius: 16 },
  followNotBtn: { backgroundColor: "#0078D7", shadowColor: "#0078D7", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 },
  followingBtn: { backgroundColor: "#EBF5FF", borderWidth: 1.5, borderColor: "#0078D7" },
  followBtnText: { fontSize: 15, fontWeight: "800" },
  followNotBtnText: { color: "#fff" },
  followingBtnText: { color: "#0078D7" },

  // ── Action Row ──
  actionRow: { flexDirection: "row", marginHorizontal: 16, marginTop: 14, backgroundColor: "#fff", borderRadius: 20, padding: 14, justifyContent: "space-around", shadowColor: "#1B4FBF", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 14, elevation: 4, borderWidth: 1, borderColor: "#F0F4F8" },
  actionBtn: { alignItems: "center", gap: 6 },
  actionBtnIcon: { width: 48, height: 48, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  actionBtnLabel: { fontSize: 11, fontWeight: "700" },

  // ── Tabs ──
  tabRow: { flexDirection: "row", marginHorizontal: 16, marginTop: 16, backgroundColor: "#F1F5F9", borderRadius: 16, padding: 4 },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 12 },
  tabActive: { backgroundColor: "#fff", shadowColor: "#1B4FBF", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  tabText: { fontSize: 13, fontWeight: "700", color: "#94A3B8" },
  tabTextActive: { color: "#0078D7" },

  tabLoader: { flexDirection: "row", alignItems: "center", gap: 10, justifyContent: "center", paddingVertical: 32 },
  tabLoaderText: { fontSize: 13, color: "#94A3B8", fontWeight: "500" },

  emptyTab: { alignItems: "center", paddingVertical: 48 },
  emptyTabIcon: { width: 60, height: 60, borderRadius: 20, backgroundColor: "#EBF5FF", justifyContent: "center", alignItems: "center", marginBottom: 14 },
  emptyTabTitle: { fontSize: 16, fontWeight: "800", color: "#0F172A", letterSpacing: -0.2 },
  emptyTabSubtitle: { fontSize: 12, color: "#94A3B8", marginTop: 6, textAlign: "center", lineHeight: 18 },

  // ── Products Grid ──
  productsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, paddingTop: 16, paddingBottom: 16 },
  productCard: { width: (width - 56) / 2, backgroundColor: "#fff", borderRadius: 18, overflow: "hidden", shadowColor: "#1B4FBF", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.09, shadowRadius: 12, elevation: 4, borderWidth: 1, borderColor: "#F0F4F8" },
  productAccentBar: { height: 3, backgroundColor: "#0060B8" },
  productImage: { width: "100%", height: 126, backgroundColor: "#E2E8F0" },
  productImagePlaceholder: { width: "100%", height: 126, backgroundColor: "#F1F5F9", justifyContent: "center", alignItems: "center" },
  productCardBody: { padding: 10 },
  productName: { fontSize: 13, fontWeight: "800", color: "#0F172A", marginBottom: 4, lineHeight: 18 },
  productPrice: { fontSize: 13, color: "#16A34A", fontWeight: "800", marginBottom: 4 },
  productMoq: { fontSize: 10, color: "#94A3B8", fontWeight: "600", flex: 1 },
  productFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 2 },
  productViewBtn: { width: 20, height: 20, borderRadius: 8, backgroundColor: "#EBF5FF", justifyContent: "center", alignItems: "center" },

  // ── Section Card ──
  sectionCard: { backgroundColor: "#fff", borderRadius: 22, marginHorizontal: 16, marginTop: 12, shadowColor: "#1B4FBF", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 14, elevation: 4, borderWidth: 1, borderColor: "#F0F4F8", padding: 18 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  sectionIconBg: { width: 32, height: 32, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  sectionTitle: { flex: 1, fontSize: 15, fontWeight: "800", color: "#0F172A", letterSpacing: -0.2 },
  sectionEditBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#EBF5FF", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  sectionEditText: { fontSize: 12, fontWeight: "700", color: "#0078D7" },

  detailRow: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 10, gap: 12, borderBottomWidth: 1, borderBottomColor: "#F8FAFC" },
  detailIconWrap: { width: 28, height: 28, borderRadius: 9, backgroundColor: "#EBF5FF", justifyContent: "center", alignItems: "center", marginTop: 2 },
  detailContent: { flex: 1 },
  detailLabel: { fontSize: 10, color: "#94A3B8", fontWeight: "600", marginBottom: 3, letterSpacing: 0.3, textTransform: "uppercase" },
  detailValue: { fontSize: 14, fontWeight: "700", color: "#0F172A" },

  // ── Legal Badges ──
  legalBadgesWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingTop: 4 },
  legalBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#DCFCE7", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  legalBadgeText: { fontSize: 12, fontWeight: "700", color: "#16A34A" },

  // ── Social ──
  socialRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, gap: 12, borderBottomWidth: 1, borderBottomColor: "#F8FAFC" },
  socialIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  socialText: { flex: 1, fontSize: 13, color: "#0F172A", fontWeight: "600" },

  // ── Social Pills (inline) ──
  socialPillsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  socialPill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  socialPillText: { fontSize: 12, fontWeight: "700" },
});

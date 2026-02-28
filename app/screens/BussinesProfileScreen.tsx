import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Constants from "expo-constants";
import { router, useLocalSearchParams } from "expo-router";
import { jwtDecode } from "jwt-decode";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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

const getImageUri = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const path = url.startsWith("/") ? url : `/${url}`;
  if (CLOUDFRONT_URL) return `${CLOUDFRONT_URL}${path}`;
  return `${S3_URL}${path}`;
};

const BusinessProfileScreen: React.FC = () => {
  const { business_id } = useLocalSearchParams();
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
  const [followingCount, setFollowingCount] = useState<number>(0);
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [followLoading, setFollowLoading] = useState<boolean>(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [isOwnProfile, setIsOwnProfile] = useState<boolean>(false);

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
      const headers = { Authorization: `Bearer ${token}` };

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
            {
              headers: { "Content-Type": "application/json" },
            },
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

      // Fetch business details
      try {
        const completeRes = await fetch(
          `${API_URL}/business/get/complete/${businessId}`,
          {
            headers: { "Content-Type": "application/json" },
          },
        );

        if (completeRes.ok) {
          const result = await completeRes.json();
          const details = result.details;
          setBusinessDetails(details.business_details);
          setSocialDetails(details.social_details);
          setLegalDetails(details.legal_details);
        } else {
          const [bizRes, socialRes, legalRes] = await Promise.allSettled([
            fetch(`${API_URL}/business/get/${businessId}`, {
              headers: { "Content-Type": "application/json" },
            }),
            fetch(`${API_URL}/business/social/get/${businessId}`, {
              headers: { "Content-Type": "application/json" },
            }),
            fetch(`${API_URL}/business/legal/get/${businessId}`, {
              headers: { "Content-Type": "application/json" },
            }),
          ]);

          if (bizRes.status === "fulfilled" && bizRes.value.ok) {
            const r = await bizRes.value.json();
            setBusinessDetails(r.details);
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
      } catch {
        setBusinessDetails(null);
      }

      // Fetch products for this business
      fetchProducts(businessId, headers);

      // Check if this is user's own profile
      const storedCompanyId = await AsyncStorage.getItem("companyId");
      setIsOwnProfile(
        businessId === storedCompanyId || businessId === decoded.business_id,
      );

      // Fetch followers count
      try {
        const followersRes = await axios.get(
          `${API_URL}/follower/get/followers/${businessId}`,
          { headers },
        );
        const fData =
          followersRes.data?.data?.followers ||
          followersRes.data?.followers ||
          [];
        setFollowersCount(Array.isArray(fData) ? fData.length : 0);
      } catch {
        setFollowersCount(0);
      }

      // Check if user follows this business
      try {
        const followingRes = await axios.get(
          `${API_URL}/follower/get/followings/${userId}`,
          { headers },
        );
        const followings =
          followingRes.data?.data?.followings ||
          followingRes.data?.followings ||
          [];
        const followedIds = (Array.isArray(followings) ? followings : []).map(
          (f: any) => f.following_id,
        );
        setIsFollowing(followedIds.includes(businessId));
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
        { headers },
      );
      const productsData = res.data?.data?.products || res.data?.data || [];
      const productsList = Array.isArray(productsData) ? productsData : [];
      const activeProducts = productsList.filter(
        (p: any) => p.is_product_active,
      );

      // Fetch images for products
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

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBusinessProfile();
  };

  const handleBack = () => {
    router.back();
  };

  const handleContact = () => {
    if (businessDetails?.phone) Linking.openURL(`tel:${businessDetails.phone}`);
  };

  const handleMessage = () => {
    if (businessDetails?.email)
      Linking.openURL(`mailto:${businessDetails.email}`);
  };

  const handleWhatsApp = () => {
    if (businessDetails?.phone) {
      const phone = businessDetails.phone.replace(/[^0-9]/g, "");
      Linking.openURL(`https://wa.me/${phone}`);
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
          { headers },
        );
        setIsFollowing(false);
        setFollowersCount((prev) => Math.max(0, prev - 1));
      } else {
        await axios.post(
          `${API_URL}/follower/follow`,
          { user_id: currentUserId, business_id: businessId },
          { headers },
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
          a.product_image_sequence_number - b.product_image_sequence_number,
      );
      return getImageUri(sorted[0].product_image_url);
    }
    return null;
  };

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

  const imageUri = getImageUri(businessDetails.profile_image);

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
        {/* Profile Header */}
        <View style={styles.profileHeaderSection}>
          {/* Top Badges */}
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
            <View style={styles.logoContainer}>
              {imageUri ? (
                <Image
                  source={{ uri: `${imageUri}?t=${Date.now()}` }}
                  style={styles.logo}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.logo, styles.logoPlaceholder]}>
                  <Ionicons name="business" size={40} color="#177DDF" />
                </View>
              )}
              {businessDetails.is_business_verified && (
                <View style={styles.verifiedOverlay}>
                  <Ionicons name="checkmark-circle" size={22} color="#28A745" />
                </View>
              )}
            </View>

            <View style={styles.basicInfo}>
              <Text style={styles.businessName}>{businessDetails.name}</Text>
              {businessDetails.contact_person && (
                <View style={styles.infoRow}>
                  <Ionicons name="person-outline" size={14} color="#666" />
                  <Text style={styles.infoText}>
                    {businessDetails.contact_person}
                  </Text>
                </View>
              )}
              <View style={styles.infoRow}>
                <Ionicons name="call-outline" size={14} color="#666" />
                <Text style={styles.infoText}>
                  {businessDetails.phone || "N/A"}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={14} color="#666" />
                <Text style={styles.infoText}>
                  {businessDetails.city}, {businessDetails.state}
                </Text>
              </View>
              {businessDetails.email && (
                <View style={styles.infoRow}>
                  <Ionicons name="mail-outline" size={14} color="#666" />
                  <Text style={styles.infoText} numberOfLines={1}>
                    {businessDetails.email}
                  </Text>
                </View>
              )}
              {businessDetails.website && (
                <View style={styles.infoRow}>
                  <Ionicons name="globe-outline" size={14} color="#666" />
                  <Text style={styles.infoText} numberOfLines={1}>
                    {businessDetails.website}
                  </Text>
                </View>
              )}
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

          {/* Followers / Following Row */}
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
              style={[styles.actionButton]}
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

  // Profile Header
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

  // Rating
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 3,
  },
  ratingText: { fontSize: 14, fontWeight: "600", color: "#333", marginLeft: 6 },

  // Stats
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

  // Follow Button
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

  // Action Buttons
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 12,
    paddingVertical: 14,
    marginTop: 12,
  },
  actionButton: { alignItems: "center", gap: 4, flex: 1 },
  actionButtonText: { fontSize: 11, color: "#177DDF", fontWeight: "600" },

  // Social Media
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

  // Tabs
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

  // Tab Content
  tabContent: { flex: 1, padding: 12 },

  // Products Grid
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
  productImagePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  productInfo: {
    padding: 10,
  },
  productName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  productQuantity: {
    fontSize: 12,
    color: "#888",
    marginBottom: 2,
  },
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
  enquireButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },

  // Info Card (statutory)
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

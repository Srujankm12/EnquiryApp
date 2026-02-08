import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StatusBar,
  Linking,
  Dimensions,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import Constants from 'expo-constants';

const { width } = Dimensions.get('window');

const API_URL = Constants.expoConfig?.extra?.API_URL;
const S3_URL = Constants.expoConfig?.extra?.S3_FETCH_URL;

const getImageUri = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${S3_URL}/${url}`;
};

const BusinessProfileScreen: React.FC = () => {
  const { company_id } = useLocalSearchParams();
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'products' | 'statutory'>('products');
  const [companyDetails, setCompanyDetails] = useState<any>(null);
  const [socialDetails, setSocialDetails] = useState<any>(null);
  const [legalDetails, setLegalDetails] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [ratingInfo, setRatingInfo] = useState<any>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followProcessing, setFollowProcessing] = useState(false);
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    fetchBusinessProfile();
  }, [company_id]);

  const fetchBusinessProfile = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const decoded: any = jwtDecode(token);
      const currentUserId = decoded.user_id;
      setUserId(currentUserId);
      const headers = { Authorization: `Bearer ${token}` };

      const companyId = company_id as string;

      // Fetch company complete details
      try {
        const completeRes = await axios.get(
          `${API_URL}/company/get/complete/${companyId}`,
          { headers }
        );
        const details = completeRes.data.data?.company_details;
        if (details) {
          setCompanyDetails(details.company);
          setRatingInfo(details.rating_info);
          setFollowerCount(details.follower_count || 0);
        }
      } catch {
        try {
          const basicRes = await axios.get(
            `${API_URL}/company/get/${companyId}`,
            { headers }
          );
          setCompanyDetails(basicRes.data.data?.company || basicRes.data.data);
        } catch {
          setCompanyDetails(null);
        }
      }

      // Fetch social details
      try {
        const socialRes = await axios.get(
          `${API_URL}/company/social/get/${companyId}`,
          { headers }
        );
        setSocialDetails(socialRes.data.data?.social_details || socialRes.data.data);
      } catch {
        setSocialDetails(null);
      }

      // Fetch legal details
      try {
        const legalRes = await axios.get(
          `${API_URL}/company/legal/get/${companyId}`,
          { headers }
        );
        setLegalDetails(legalRes.data.data?.legal_details || legalRes.data.data);
      } catch {
        setLegalDetails(null);
      }

      // Check if user follows this company
      try {
        const followingRes = await axios.get(
          `${API_URL}/company/followers/get/user/${currentUserId}`,
          { headers }
        );
        const followedCompanies = followingRes.data?.data?.companies || followingRes.data?.data || [];
        const isFollowed = (Array.isArray(followedCompanies) ? followedCompanies : []).some(
          (c: any) => c.company_id === companyId
        );
        setIsFollowing(isFollowed);
      } catch {
        setIsFollowing(false);
      }

      // Fetch products by company_id
      try {
        const prodRes = await axios.get(
          `${API_URL}/product/get/company/${companyId}`,
          { headers }
        );
        const productsData = prodRes.data?.data?.products || prodRes.data?.data || [];
        const productsList = (Array.isArray(productsData) ? productsData : []).filter(
          (p: any) => p.is_product_active
        );

        const productsWithImages = await Promise.all(
          productsList.map(async (product: any) => {
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
        setProducts(productsWithImages);
      } catch {
        setProducts([]);
      }
    } catch (error) {
      console.error('Error fetching business profile:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBusinessProfile();
  };

  const handleBack = () => {
    router.back();
  };

  const handleFollow = async () => {
    if (!company_id) return;
    setFollowProcessing(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const companyId = company_id as string;

      if (isFollowing) {
        await axios.delete(
          `${API_URL}/company/unfollow/${companyId}/${userId}`,
          { headers }
        );
        setIsFollowing(false);
        setFollowerCount((prev) => Math.max(0, prev - 1));
      } else {
        await axios.post(
          `${API_URL}/company/follow/${companyId}/${userId}`,
          {},
          { headers }
        );
        setIsFollowing(true);
        setFollowerCount((prev) => prev + 1);
      }
    } catch (error: any) {
      console.error('Error following/unfollowing:', error?.response?.data || error);
      Alert.alert('Error', 'Failed to update follow status.');
    } finally {
      setFollowProcessing(false);
    }
  };

  const handleContact = () => {
    if (companyDetails?.company_phone) {
      Linking.openURL(`tel:${companyDetails.company_phone}`);
    }
  };

  const handleEmail = () => {
    if (companyDetails?.company_email) {
      Linking.openURL(`mailto:${companyDetails.company_email}`);
    }
  };

  const handleWhatsApp = () => {
    if (socialDetails?.whatsapp_number) {
      Linking.openURL(`whatsapp://send?phone=${socialDetails.whatsapp_number}`);
    }
  };

  const handleSocialMedia = (url?: string | null) => {
    if (url) {
      Linking.openURL(url);
    }
  };

  const handleProductPress = (product: any) => {
    router.push({
      pathname: '/pages/productDetail' as any,
      params: { product_id: product.product_id },
    });
  };

  const handleEnquire = (product: any) => {
    router.push({
      pathname: '/pages/requestQutation' as any,
      params: {
        product_id: product.product_id,
        product_name: product.product_name,
        company_id: company_id as string,
      },
    });
  };

  const getProductImageUrl = (product: any): string | null => {
    if (product.images && product.images.length > 0) {
      const sorted = [...product.images].sort(
        (a: any, b: any) => a.product_image_sequence_number - b.product_image_sequence_number
      );
      return getImageUri(sorted[0].product_image_url);
    }
    return null;
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Ionicons key={`full-${i}`} name="star" size={18} color="#FFB800" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <Ionicons key="half" name="star-half" size={18} color="#FFB800" />
      );
    }

    const remainingStars = 5 - Math.ceil(rating);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(
        <Ionicons
          key={`empty-${i}`}
          name="star-outline"
          size={18}
          color="#FFB800"
        />
      );
    }

    return stars;
  };

  const renderProductCard = (product: any) => {
    const imageUrl = getProductImageUrl(product);

    return (
      <View key={product.product_id} style={styles.productCard}>
        <TouchableOpacity onPress={() => handleProductPress(product)}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.productImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.productImage, styles.productImagePlaceholder]}>
              <Ionicons name="cube-outline" size={28} color="#CCC" />
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={1}>
            {product.product_name}
          </Text>
          <Text style={styles.productQuantity} numberOfLines={1}>
            Qty: {product.product_quantity}
          </Text>
          <Text style={styles.productPrice} numberOfLines={1}>
            {product.product_price}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.enquireBtn}
          onPress={() => handleEnquire(product)}
        >
          <Text style={styles.enquireBtnText}>Enquire</Text>
        </TouchableOpacity>
      </View>
    );
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
        </View>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#177DDF" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  if (!companyDetails) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#177DDF" translucent={false} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Business Profile</Text>
        </View>
        <View style={styles.loaderContainer}>
          <Ionicons name="business-outline" size={64} color="#CCC" />
          <Text style={styles.loadingText}>Company not found</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchBusinessProfile}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const avgRating = ratingInfo?.average_rating || 0;
  const totalRatings = ratingInfo?.total_ratings || 0;
  const imageUri = getImageUri(companyDetails.company_profile_url);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#177DDF" translucent={false} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Business Profile</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#177DDF']} tintColor="#177DDF" />
        }
      >
        <View style={styles.profileHeaderSection}>
          <View style={styles.badgesContainer}>
            {companyDetails.is_verified && (
              <View style={styles.trustedBadge}>
                <Ionicons name="shield-checkmark" size={16} color="#4CAF50" />
                <Text style={styles.trustedText}>Verified</Text>
              </View>
            )}
          </View>

          <View style={styles.profileHeader}>
            <View style={styles.logoContainer}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.logo} resizeMode="cover" />
              ) : (
                <View style={[styles.logo, styles.logoPlaceholder]}>
                  <Ionicons name="business" size={36} color="#177DDF" />
                </View>
              )}
            </View>

            <View style={styles.basicInfo}>
              <Text style={styles.businessName}>{companyDetails.company_name}</Text>
              {totalRatings > 0 && (
                <View style={styles.ratingContainer}>
                  {renderStars(avgRating)}
                  <Text style={styles.reviewsText}>({totalRatings})</Text>
                </View>
              )}
              {companyDetails.company_phone && (
                <View style={styles.infoRow}>
                  <Ionicons name="call-outline" size={14} color="#666" />
                  <Text style={styles.infoText}>{companyDetails.company_phone}</Text>
                </View>
              )}
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={14} color="#666" />
                <Text style={styles.infoText} numberOfLines={1}>
                  {companyDetails.company_city}, {companyDetails.company_state}
                </Text>
              </View>
              {companyDetails.company_email && (
                <View style={styles.infoRow}>
                  <Ionicons name="mail-outline" size={14} color="#666" />
                  <Text style={styles.infoText} numberOfLines={1}>{companyDetails.company_email}</Text>
                </View>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.followButton, isFollowing && styles.followingButton, followProcessing && styles.followButtonDisabled]}
            onPress={handleFollow}
            disabled={followProcessing}
          >
            {followProcessing ? (
              <ActivityIndicator size="small" color={isFollowing ? '#177DDF' : '#FFFFFF'} />
            ) : (
              <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{followerCount}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{products.length}</Text>
              <Text style={styles.statLabel}>Products</Text>
            </View>
            {totalRatings > 0 && (
              <>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{avgRating.toFixed(1)}</Text>
                  <Text style={styles.statLabel}>Rating</Text>
                </View>
              </>
            )}
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionButton} onPress={handleContact}>
              <Ionicons name="call-outline" size={20} color="#666" />
              <Text style={styles.actionButtonText}>Contact</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleEmail}>
              <Ionicons name="mail-outline" size={20} color="#666" />
              <Text style={styles.actionButtonText}>Email</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleWhatsApp}>
              <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
              <Text style={styles.actionButtonText}>WhatsApp</Text>
            </TouchableOpacity>
          </View>

          {socialDetails && (
            <View style={styles.socialMediaSection}>
              <Text style={styles.socialMediaTitle}>Follow us:</Text>
              <View style={styles.socialMediaIcons}>
                {socialDetails.instagram_url && (
                  <TouchableOpacity style={styles.socialIcon} onPress={() => handleSocialMedia(socialDetails.instagram_url)}>
                    <Ionicons name="logo-instagram" size={24} color="#E4405F" />
                  </TouchableOpacity>
                )}
                {socialDetails.facebook_url && (
                  <TouchableOpacity style={styles.socialIcon} onPress={() => handleSocialMedia(socialDetails.facebook_url)}>
                    <Ionicons name="logo-facebook" size={24} color="#1877F2" />
                  </TouchableOpacity>
                )}
                {socialDetails.linkedin_url && (
                  <TouchableOpacity style={styles.socialIcon} onPress={() => handleSocialMedia(socialDetails.linkedin_url)}>
                    <Ionicons name="logo-linkedin" size={24} color="#0A66C2" />
                  </TouchableOpacity>
                )}
                {socialDetails.website_url && (
                  <TouchableOpacity style={styles.socialIcon} onPress={() => handleSocialMedia(socialDetails.website_url)}>
                    <Ionicons name="globe-outline" size={24} color="#666" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>

        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'products' && styles.activeTab]}
            onPress={() => setActiveTab('products')}
          >
            <Text style={[styles.tabText, activeTab === 'products' && styles.activeTabText]}>
              Products ({products.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'statutory' && styles.activeTab]}
            onPress={() => setActiveTab('statutory')}
          >
            <Text style={[styles.tabText, activeTab === 'statutory' && styles.activeTabText]}>
              Company Info
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'products' ? (
          <View style={styles.productsContainer}>
            {products.length > 0 ? (
              <View style={styles.productsGrid}>
                {products.map((product) => renderProductCard(product))}
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="cube-outline" size={64} color="#CCC" />
                <Text style={styles.emptyText}>No products available</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.statutoryContainer}>
            <View style={styles.infoCard}>
              <View style={styles.infoCardHeader}>
                <Ionicons name="business" size={18} color="#177DDF" />
                <Text style={styles.infoCardTitle}>Company Details</Text>
              </View>
              {companyDetails.company_address && (
                <View style={styles.infoCardRow}>
                  <Text style={styles.infoCardLabel}>Address</Text>
                  <Text style={styles.infoCardValue}>{companyDetails.company_address}</Text>
                </View>
              )}
              <View style={styles.infoCardRow}>
                <Text style={styles.infoCardLabel}>City</Text>
                <Text style={styles.infoCardValue}>{companyDetails.company_city}</Text>
              </View>
              <View style={styles.infoCardRow}>
                <Text style={styles.infoCardLabel}>State</Text>
                <Text style={styles.infoCardValue}>{companyDetails.company_state}</Text>
              </View>
              {companyDetails.company_pincode && (
                <View style={styles.infoCardRow}>
                  <Text style={styles.infoCardLabel}>Pincode</Text>
                  <Text style={styles.infoCardValue}>{companyDetails.company_pincode}</Text>
                </View>
              )}
              {companyDetails.company_establishment_date && (
                <View style={styles.infoCardRow}>
                  <Text style={styles.infoCardLabel}>Established</Text>
                  <Text style={styles.infoCardValue}>
                    {new Date(companyDetails.company_establishment_date).toLocaleDateString()}
                  </Text>
                </View>
              )}
            </View>

            {legalDetails && (legalDetails.pan_number || legalDetails.gst_number || legalDetails.msme_number) && (
              <View style={styles.infoCard}>
                <View style={styles.infoCardHeader}>
                  <Ionicons name="document-text" size={18} color="#177DDF" />
                  <Text style={styles.infoCardTitle}>Legal Information</Text>
                </View>
                {legalDetails.gst_number && (
                  <View style={styles.infoCardRow}>
                    <Text style={styles.infoCardLabel}>GST Number</Text>
                    <Text style={styles.infoCardValue}>{legalDetails.gst_number}</Text>
                  </View>
                )}
                {legalDetails.pan_number && (
                  <View style={styles.infoCardRow}>
                    <Text style={styles.infoCardLabel}>PAN Number</Text>
                    <Text style={styles.infoCardValue}>{legalDetails.pan_number}</Text>
                  </View>
                )}
                {legalDetails.msme_number && (
                  <View style={styles.infoCardRow}>
                    <Text style={styles.infoCardLabel}>MSME Number</Text>
                    <Text style={styles.infoCardValue}>{legalDetails.msme_number}</Text>
                  </View>
                )}
              </View>
            )}

            {!legalDetails && (
              <View style={styles.emptyContainer}>
                <Ionicons name="document-text-outline" size={64} color="#CCC" />
                <Text style={styles.emptyText}>No additional details available</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    backgroundColor: '#177DDF', paddingTop: 50, paddingBottom: 15, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
  },
  backButton: { marginRight: 16 },
  headerTitle: { fontSize: 20, fontWeight: '600', color: '#FFFFFF' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#666' },
  retryBtn: { marginTop: 16, backgroundColor: '#177DDF', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 8 },
  retryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  scrollView: { flex: 1 },
  profileHeaderSection: {
    backgroundColor: '#FFFFFF', paddingBottom: 16, elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3,
  },
  badgesContainer: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  trustedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, gap: 4 },
  trustedText: { fontSize: 12, fontWeight: '600', color: '#4CAF50' },
  profileHeader: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 22 },
  logoContainer: {
    width: 90, height: 90, borderRadius: 12, overflow: 'hidden', backgroundColor: '#E0E0E0',
    elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4,
  },
  logo: { width: '100%', height: '100%' },
  logoPlaceholder: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#E3F2FD' },
  basicInfo: { flex: 1, marginLeft: 16 },
  businessName: { fontSize: 22, fontWeight: '700', color: '#000', marginBottom: 6 },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 4 },
  reviewsText: { fontSize: 13, color: '#666', marginLeft: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 6 },
  infoText: { fontSize: 13, color: '#666', flex: 1 },
  followButton: {
    backgroundColor: '#177DDF', marginHorizontal: 16, marginTop: 16, paddingVertical: 12,
    borderRadius: 8, alignItems: 'center', elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2,
  },
  followingButton: { backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#177DDF' },
  followButtonDisabled: { opacity: 0.7 },
  followButtonText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  followingButtonText: { color: '#177DDF' },
  statsContainer: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 16,
    paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#F0F0F0', marginHorizontal: 16,
  },
  statItem: { alignItems: 'center', paddingHorizontal: 24 },
  statNumber: { fontSize: 18, fontWeight: '700', color: '#000', marginBottom: 2 },
  statLabel: { fontSize: 13, color: '#666' },
  statDivider: { width: 1, height: 30, backgroundColor: '#E0E0E0' },
  actionButtons: {
    flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 8,
    paddingVertical: 16, borderBottomWidth: 1, borderColor: '#F0F0F0', marginTop: 12,
  },
  actionButton: { alignItems: 'center', gap: 4 },
  actionButtonText: { fontSize: 12, color: '#666', fontWeight: '500' },
  socialMediaSection: { paddingHorizontal: 16, marginTop: 12 },
  socialMediaTitle: { fontSize: 14, fontWeight: '600', color: '#000', marginBottom: 12 },
  socialMediaIcons: { flexDirection: 'row', gap: 16 },
  socialIcon: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#F5F5F5',
    justifyContent: 'center', alignItems: 'center', elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2,
  },
  tabsContainer: {
    flexDirection: 'row', backgroundColor: '#FFFFFF', marginTop: 8, elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3,
  },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: '#177DDF' },
  tabText: { fontSize: 15, fontWeight: '500', color: '#999' },
  activeTabText: { color: '#177DDF', fontWeight: '600' },
  productsContainer: { padding: 8 },
  productsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  productCard: {
    width: (width - 32) / 2, backgroundColor: '#FFFFFF', borderRadius: 12, marginBottom: 12,
    overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 3,
  },
  productImage: { width: '100%', height: 140, backgroundColor: '#E0E0E0' },
  productImagePlaceholder: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F8F8' },
  productInfo: { padding: 12 },
  productName: { fontSize: 15, fontWeight: '600', color: '#000', marginBottom: 6 },
  productQuantity: { fontSize: 13, color: '#666', marginBottom: 4 },
  productPrice: { fontSize: 14, color: '#28A745', fontWeight: '600', marginBottom: 8 },
  enquireBtn: { backgroundColor: '#177DDF', marginHorizontal: 12, marginBottom: 12, paddingVertical: 8, borderRadius: 6, alignItems: 'center' },
  enquireBtnText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  statutoryContainer: { flex: 1, padding: 16 },
  infoCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4,
  },
  infoCardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12,
    paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  infoCardTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  infoCardRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F8F8F8',
  },
  infoCardLabel: { fontSize: 13, color: '#888', flex: 1 },
  infoCardValue: { fontSize: 14, fontWeight: '600', color: '#1A1A1A', flex: 2, textAlign: 'right' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#999', marginTop: 16 },
  bottomPadding: { height: 20 },
});

export default BusinessProfileScreen;

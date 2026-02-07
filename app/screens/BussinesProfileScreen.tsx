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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface BusinessProfile {
  id: string;
  name: string;
  ownerName: string;
  phoneNumber: string;
  address: string;
  email: string;
  website: string;
  logo: string;
  coverImage?: string;
  rating: number;
  totalReviews: number;
  followers: number;
  following: number;
  isFollowing: boolean;
  isTrusted: boolean;
  natureOfBusiness: string;
  dealsIn: string;
  socialMedia: {
    instagram?: string;
    youtube?: string;
    facebook?: string;
    whatsapp?: string;
    linkedin?: string;
    website?: string;
  };
}

interface Product {
  id: string;
  name: string;
  image: string;
  quantity: string;
  pricePerUnit: string;
  unit: string;
}

const BusinessProfileScreen: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'products' | 'statutory'>('products');
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetchBusinessProfile();
  }, []);

  const fetchBusinessProfile = async () => {
    setLoading(true);

    // Simulate API call
    setTimeout(() => {
      const dummyProfile: BusinessProfile = {
        id: '1',
        name: 'Kaibavi',
        ownerName: 'Sumanth L',
        phoneNumber: '+91 1234567890',
        address: 'Karkala, Mangalore, Karnataka',
        email: 'sumanth123@gmail.com',
        website: 'https://sumanth.in.com',
        logo: 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=400',
        coverImage: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800',
        rating: 4.5,
        totalReviews: 128,
        followers: 10,
        following: 20,
        isFollowing: false,
        isTrusted: true,
        natureOfBusiness: 'XYZ',
        dealsIn: 'Cashew',
        socialMedia: {
          instagram: 'https://instagram.com/kaibavi',
          youtube: 'https://youtube.com/kaibavi',
          facebook: 'https://facebook.com/kaibavi',
          whatsapp: '+911234567890',
          linkedin: 'https://linkedin.com/company/kaibavi',
          website: 'https://kaibavi.com',
        },
      };

      const dummyProducts: Product[] = [
        {
          id: '1',
          name: 'Cashew W-180',
          image: 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=400',
          quantity: '100KG',
          pricePerUnit: '500',
          unit: 'rs',
        },
        {
          id: '2',
          name: 'Almond Local',
          image: 'https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=400',
          quantity: '10KG',
          pricePerUnit: '100',
          unit: 'rs',
        },
        {
          id: '3',
          name: 'Pista A1',
          image: 'https://images.unsplash.com/photo-1599599811136-68bce28283d3?w=400',
          quantity: '50KG',
          pricePerUnit: '500',
          unit: 'rs',
        },
        {
          id: '4',
          name: 'Arabian Dates',
          image: 'https://images.unsplash.com/photo-1587049352846-4a222e784e38?w=400',
          quantity: '200KG',
          pricePerUnit: '128',
          unit: 'rs',
        },
      ];

      setBusinessProfile(dummyProfile);
      setProducts(dummyProducts);
      setLoading(false);
    }, 1500);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBusinessProfile();
    setRefreshing(false);
  };

  const handleBack = () => {
    router.back();
  };

  const handleFollow = () => {
    if (businessProfile) {
      setBusinessProfile({
        ...businessProfile,
        isFollowing: !businessProfile.isFollowing,
        followers: businessProfile.isFollowing
          ? businessProfile.followers - 1
          : businessProfile.followers + 1,
      });
    }
  };

  const handleShare = () => {
    console.log('Share profile');
  };

  const handleProfile = () => {
    console.log('View full profile');
  };

  const handleContact = () => {
    if (businessProfile?.phoneNumber) {
      Linking.openURL(`tel:${businessProfile.phoneNumber}`);
    }
  };

  const handleMessage = () => {
    console.log('Send message');
  };

  const handleWhatsApp = () => {
    if (businessProfile?.socialMedia.whatsapp) {
      Linking.openURL(`whatsapp://send?phone=${businessProfile.socialMedia.whatsapp}`);
    }
  };

  const handleSocialMedia = (platform: string, url?: string) => {
    if (url) {
      Linking.openURL(url);
    }
  };

  const handleProductEnquire = (productId: string, productName: string) => {
    console.log(`Enquire about: ${productName}`);
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

  const renderProductCard = (product: Product) => (
    <View key={product.id} style={styles.productCard}>
      <Image
        source={{ uri: product.image }}
        style={styles.productImage}
        resizeMode="cover"
      />
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={1}>
          {product.name}
        </Text>
        <Text style={styles.productQuantity} numberOfLines={1}>
          Qty: {product.quantity}
        </Text>
        <Text style={styles.productPrice} numberOfLines={1}>
          Price Per Unit: {product.pricePerUnit}{product.unit}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.enquireButton}
        onPress={() => handleProductEnquire(product.id, product.name)}
      >
        <Text style={styles.enquireButtonText}>Enquire</Text>
      </TouchableOpacity>
    </View>
  );

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
        </View>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#177DDF" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  if (!businessProfile) {
    return null;
  }

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#177DDF"
        translucent={false}
      />

      {/* Header */}
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
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#177DDF']}
            tintColor="#177DDF"
          />
        }
      >
        {/* Cover Image */}
        {/* {businessProfile.coverImage && (
          <Image
            source={{ uri: businessProfile.coverImage }}
            style={styles.coverImage}
            resizeMode="cover"
          />
        )} */}

        {/* Profile Header Section */}
        <View style={styles.profileHeaderSection}>
          {/* Trusted and Share Badges */}
          <View style={styles.badgesContainer}>
            {businessProfile.isTrusted && (
              <View style={styles.trustedBadge}>
                <Ionicons name="shield-checkmark" size={16} color="#4CAF50" />
                <Text style={styles.trustedText}>Trusted</Text>
              </View>
            )}
            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
              <Ionicons name="share-social" size={16} color="#177DDF" />
              <Text style={styles.shareText}>Share</Text>
            </TouchableOpacity>
          </View>

          {/* Logo and Basic Info */}
          <View style={styles.profileHeader}>
            <View style={styles.logoContainer}>
              <Image
                source={{ uri: businessProfile.logo }}
                style={styles.logo}
                resizeMode="cover"
              />
            </View>

            <View style={styles.basicInfo}>
              <Text style={styles.businessName}>{businessProfile.name}</Text>

              {/* Rating */}
              <View style={styles.ratingContainer}>
                {renderStars(businessProfile.rating)}
                <Text style={styles.reviewsText}>
                  ({businessProfile.totalReviews})
                </Text>
              </View>

              {/* Contact Info */}
              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={14} color="#666" />
                <Text style={styles.infoText}>{businessProfile.ownerName}</Text>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="call-outline" size={14} color="#666" />
                <Text style={styles.infoText}>{businessProfile.phoneNumber}</Text>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={14} color="#666" />
                <Text style={styles.infoText} numberOfLines={1}>
                  {businessProfile.address}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="mail-outline" size={14} color="#666" />
                <Text style={styles.infoText} numberOfLines={1}>
                  {businessProfile.email}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="globe-outline" size={14} color="#666" />
                <Text style={styles.infoText} numberOfLines={1}>
                  {businessProfile.website}
                </Text>
              </View>
            </View>
          </View>

          {/* Follow Button */}
          <TouchableOpacity
            style={[
              styles.followButton,
              businessProfile.isFollowing && styles.followingButton,
            ]}
            onPress={handleFollow}
          >
            <Text
              style={[
                styles.followButtonText,
                businessProfile.isFollowing && styles.followingButtonText,
              ]}
            >
              {businessProfile.isFollowing ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>

          {/* Followers Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{businessProfile.followers}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{businessProfile.following}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </View>
          </View>

          {/* Business Details */}
          <View style={styles.businessDetails}>
            <View style={styles.businessDetailRow}>
              <Text style={styles.businessDetailLabel}>Nature of business:</Text>
              <Text style={styles.businessDetailValue}>
                {businessProfile.natureOfBusiness}
              </Text>
            </View>
            <View style={styles.businessDetailRow}>
              <Text style={styles.businessDetailLabel}>Deals in:</Text>
              <Text style={styles.businessDetailValue}>
                {businessProfile.dealsIn}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionButton} onPress={handleProfile}>
              <Ionicons name="person-outline" size={20} color="#666" />
              <Text style={styles.actionButtonText}>Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleContact}>
              <Ionicons name="call-outline" size={20} color="#666" />
              <Text style={styles.actionButtonText}>Contact</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleMessage}>
              <Ionicons name="mail-outline" size={20} color="#666" />
              <Text style={styles.actionButtonText}>Message</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleWhatsApp}>
              <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
              <Text style={styles.actionButtonText}>WhatsApp</Text>
            </TouchableOpacity>
          </View>

          {/* Social Media Links */}
          <View style={styles.socialMediaSection}>
            <Text style={styles.socialMediaTitle}>Follow us:</Text>
            <View style={styles.socialMediaIcons}>
              {businessProfile.socialMedia.instagram && (
                <TouchableOpacity
                  style={styles.socialIcon}
                  onPress={() =>
                    handleSocialMedia('instagram', businessProfile.socialMedia.instagram)
                  }
                >
                  <Ionicons name="logo-instagram" size={24} color="#E4405F" />
                </TouchableOpacity>
              )}

              {businessProfile.socialMedia.youtube && (
                <TouchableOpacity
                  style={styles.socialIcon}
                  onPress={() =>
                    handleSocialMedia('youtube', businessProfile.socialMedia.youtube)
                  }
                >
                  <Ionicons name="logo-youtube" size={24} color="#FF0000" />
                </TouchableOpacity>
              )}

              {businessProfile.socialMedia.facebook && (
                <TouchableOpacity
                  style={styles.socialIcon}
                  onPress={() =>
                    handleSocialMedia('facebook', businessProfile.socialMedia.facebook)
                  }
                >
                  <Ionicons name="logo-facebook" size={24} color="#1877F2" />
                </TouchableOpacity>
              )}

              {businessProfile.socialMedia.whatsapp && (
                <TouchableOpacity
                  style={styles.socialIcon}
                  onPress={() =>
                    handleSocialMedia('whatsapp', businessProfile.socialMedia.whatsapp)
                  }
                >
                  <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
                </TouchableOpacity>
              )}

              {businessProfile.socialMedia.linkedin && (
                <TouchableOpacity
                  style={styles.socialIcon}
                  onPress={() =>
                    handleSocialMedia('linkedin', businessProfile.socialMedia.linkedin)
                  }
                >
                  <Ionicons name="logo-linkedin" size={24} color="#0A66C2" />
                </TouchableOpacity>
              )}

              {businessProfile.socialMedia.website && (
                <TouchableOpacity
                  style={styles.socialIcon}
                  onPress={() =>
                    handleSocialMedia('website', businessProfile.socialMedia.website)
                  }
                >
                  <Ionicons name="globe-outline" size={24} color="#666" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'products' && styles.activeTab]}
            onPress={() => setActiveTab('products')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'products' && styles.activeTabText,
              ]}
            >
              Products
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'statutory' && styles.activeTab]}
            onPress={() => setActiveTab('statutory')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'statutory' && styles.activeTabText,
              ]}
            >
              Statutory Details
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content Based on Active Tab */}
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
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={64} color="#CCC" />
              <Text style={styles.emptyText}>No statutory details available</Text>
            </View>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#177DDF',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  coverImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#E0E0E0',
  },
  profileHeaderSection: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  badgesContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  trustedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  trustedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  shareText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#177DDF',
  },
  profileHeader: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 22,
  },
  logoContainer: {
    width: 90,
    height: 90,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#E0E0E0',
    elevation: 3,
     shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  basicInfo: {
    flex: 1,
    marginLeft: 16,
  },
  businessName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
    marginBottom: 6,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  reviewsText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  followButton: {
    backgroundColor: '#177DDF',
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  followingButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#177DDF',
  },
  followButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  followingButtonText: {
    color: '#177DDF',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F0F0F0',
    marginHorizontal: 16,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 13,
    color: '#666',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E0E0E0',
  },
  businessDetails: {
    paddingHorizontal: 16,
    marginTop: 12,
  },
  businessDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  businessDetailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    marginRight: 8,
  },
  businessDetailValue: {
    fontSize: 14,
    color: '#000',
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F0F0F0',
    marginTop: 12,
  },
  actionButton: {
    alignItems: 'center',
    gap: 4,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  socialMediaSection: {
    paddingHorizontal: 16,
    marginTop: 12,
  },
  socialMediaTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  socialMediaIcons: {
    flexDirection: 'row',
    gap: 16,
  },
  socialIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#177DDF',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#999',
  },
  activeTabText: {
    color: '#177DDF',
    fontWeight: '600',
  },
  productsContainer: {
    padding: 8,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  productCard: {
    width: (width - 32) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  productImage: {
    width: '100%',
    height: 140,
    backgroundColor: '#E0E0E0',
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 6,
  },
  productQuantity: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  enquireButton: {
    backgroundColor: '#177DDF',
    marginHorizontal: 12,
    marginBottom: 12,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  enquireButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statutoryContainer: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  bottomPadding: {
    height: 20,
  },
});

export default BusinessProfileScreen;
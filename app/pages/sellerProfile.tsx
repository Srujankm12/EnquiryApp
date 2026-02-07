import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  TextInput,
  Dimensions,
  RefreshControl,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import Constants from 'expo-constants';

const { width } = Dimensions.get('window');
const API_URL = Constants.expoConfig?.extra?.API_URL;
const S3_URL = Constants.expoConfig?.extra?.S3_FETCH_URL;

interface CompanyDetails {
  company_id: string;
  user_id: string;
  company_name: string;
  company_email: string;
  company_phone: string;
  company_profile_url: string | null;
  company_address: string;
  company_city: string;
  company_state: string;
  company_pincode: string;
  company_establishment_date: string;
  is_verified: boolean;
  is_approved: boolean;
  is_blocked: boolean;
}

interface SocialDetails {
  linkedin_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  website_url: string | null;
  whatsapp_number: string | null;
}

interface RatingInfo {
  company_id: string;
  total_ratings: number;
  average_rating: number;
}

interface RatingItem {
  rating_id: string;
  company_id: string;
  user_id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  updated_at: string;
}

const SellerProfile = () => {
  const params = useLocalSearchParams();
  const companyId = params.company_id as string;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [company, setCompany] = useState<CompanyDetails | null>(null);
  const [socialDetails, setSocialDetails] = useState<SocialDetails | null>(null);
  const [ratingInfo, setRatingInfo] = useState<RatingInfo | null>(null);
  const [ratings, setRatings] = useState<RatingItem[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  // Rating submission state
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [existingUserRating, setExistingUserRating] = useState<RatingItem | null>(null);

  useEffect(() => {
    loadProfile();
  }, [companyId]);

  useFocusEffect(
    useCallback(() => {
      if (companyId) loadProfile();
    }, [companyId])
  );

  const loadProfile = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const decoded: any = jwtDecode(token);
      setCurrentUserId(decoded.user_id);

      const headers = { Authorization: `Bearer ${token}` };

      // Fetch company details, ratings, followers in parallel
      const [companyRes, ratingsRes, avgRatingRes, followerCountRes, isFollowingRes, socialRes] =
        await Promise.allSettled([
          axios.get(`${API_URL}/company/get/${companyId}`, { headers }),
          axios.get(`${API_URL}/company/rating/get/all/${companyId}`, { headers }),
          axios.get(`${API_URL}/company/rating/get/average/${companyId}`, { headers }),
          axios.get(`${API_URL}/company/followers/count/${companyId}`, { headers }),
          axios.get(`${API_URL}/company/followers/is-following/${companyId}`, { headers }),
          axios.get(`${API_URL}/company/social/get/${companyId}`, { headers }),
        ]);

      if (companyRes.status === 'fulfilled') {
        const compData = companyRes.value.data.data?.company || companyRes.value.data.data;
        setCompany(compData);
      }

      if (ratingsRes.status === 'fulfilled') {
        const ratingsData = ratingsRes.value.data.data?.ratings || ratingsRes.value.data.data || [];
        setRatings(Array.isArray(ratingsData) ? ratingsData : []);
        // Check if current user has already rated
        const userExistingRating = (Array.isArray(ratingsData) ? ratingsData : []).find(
          (r: RatingItem) => r.user_id === decoded.user_id
        );
        if (userExistingRating) {
          setExistingUserRating(userExistingRating);
          setUserRating(userExistingRating.rating);
          setReviewText(userExistingRating.review_text || '');
        }
      }

      if (avgRatingRes.status === 'fulfilled') {
        const avgData = avgRatingRes.value.data.data?.rating_info || avgRatingRes.value.data.data;
        setRatingInfo(avgData);
      }

      if (followerCountRes.status === 'fulfilled') {
        const countData = followerCountRes.value.data.data;
        setFollowerCount(
          typeof countData === 'number'
            ? countData
            : countData?.follower_count || countData?.count || 0
        );
      }

      if (isFollowingRes.status === 'fulfilled') {
        const followData = isFollowingRes.value.data.data;
        setIsFollowing(
          typeof followData === 'boolean'
            ? followData
            : followData?.is_following || false
        );
      }

      if (socialRes.status === 'fulfilled') {
        const socialData = socialRes.value.data.data?.social_details || socialRes.value.data.data;
        setSocialDetails(socialData);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProfile();
  };

 const handleFollow = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      Alert.alert('Error', 'Authentication token missing');
      return;
    }

    const decoded: any = jwtDecode(token);
    const userId = decoded?.user_id;

    if (!userId || !companyId) {
      Alert.alert('Error', 'Invalid user or company');
      return;
    }

    const headers = { Authorization: `Bearer ${token}` };

    if (isFollowing) {
      await axios.delete(
        `${API_URL}/company/unfollow/${companyId}`,
        {
          headers,
          data: {
            user_id: userId,
            company_id: companyId,
          },
        }
      );
      setFollowerCount((prev) => Math.max(0, prev - 1));
    } else {
      await axios.post(
        `${API_URL}/company/follow/${companyId}`,
        {
          user_id: userId,
          company_id: companyId,
        },
        { headers }
      );
      setFollowerCount((prev) => prev + 1);
    }

    setIsFollowing((prev) => !prev);
  } catch (error: any) {
    console.error('Error toggling follow:', error?.response?.data || error);
    Alert.alert(
      'Error',
      error?.response?.data?.message || 'Failed to update follow status'
    );
  }
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
        // Update existing rating
        await axios.put(
          `${API_URL}/company/rating/update`,
          {
            rating_id: existingUserRating.rating_id,
            user_id: currentUserId,
            rating: userRating,
            review_text: reviewText.trim() || undefined,
          },
          { headers }
        );
        Alert.alert('Success', 'Your rating has been updated');
      } else {
        // Create new rating
        await axios.post(
          `${API_URL}/company/rating/create`,
          {
            company_id: companyId,
            user_id: currentUserId,
            rating: userRating,
            review_text: reviewText.trim() || undefined,
          },
          { headers }
        );
        Alert.alert('Success', 'Thank you for your rating!');
      }

      setShowRatingForm(false);
      // Refresh data
      loadProfile();
    } catch (error: any) {
      console.error('Error submitting rating:', error);
      const msg = error.response?.data?.message || 'Failed to submit rating';
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
              `${API_URL}/company/rating/delete/${existingUserRating.rating_id}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            setExistingUserRating(null);
            setUserRating(0);
            setReviewText('');
            Alert.alert('Success', 'Rating deleted');
            loadProfile();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete rating');
          }
        },
      },
    ]);
  };

  const handleWhatsApp = () => {
    if (socialDetails?.whatsapp_number) {
      Linking.openURL(`whatsapp://send?phone=${socialDetails.whatsapp_number}`);
    } else if (company?.company_phone) {
      Linking.openURL(`whatsapp://send?phone=${company.company_phone}`);
    }
  };

  const handleCall = () => {
    if (company?.company_phone) {
      Linking.openURL(`tel:${company.company_phone}`);
    }
  };

  const handleEmail = () => {
    if (company?.company_email) {
      Linking.openURL(`mailto:${company.company_email}`);
    }
  };

  const handleSocialLink = (url: string | null) => {
    if (url) Linking.openURL(url);
  };

  const renderStars = (rating: number, size: number = 18) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Ionicons key={`full-${i}`} name="star" size={size} color="#FFB800" />);
    }
    if (hasHalf) {
      stars.push(<Ionicons key="half" name="star-half" size={size} color="#FFB800" />);
    }
    const remaining = 5 - Math.ceil(rating);
    for (let i = 0; i < remaining; i++) {
      stars.push(
        <Ionicons key={`empty-${i}`} name="star-outline" size={size} color="#FFB800" />
      );
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

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#0078D7" />
        <Text style={styles.loaderText}>Loading profile...</Text>
      </View>
    );
  }

  if (!company) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Seller Profile</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={80} color="#CCC" />
          <Text style={styles.emptyText}>Profile not found</Text>
        </View>
      </View>
    );
  }

  const avgRating = ratingInfo?.average_rating || 0;
  const totalRatings = ratingInfo?.total_ratings || 0;
  const isOwnCompany = company.user_id === currentUserId;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Seller Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#177DDF']} />
        }
      >
        {/* Profile Header Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.logoContainer}>
              {company.company_profile_url ? (
                <Image
                  source={{ uri: `${S3_URL}/${company.company_profile_url}` }}
                  style={styles.logo}
                />
              ) : (
                <View style={[styles.logo, styles.logoPlaceholder]}>
                  <Ionicons name="business" size={40} color="#0078D7" />
                </View>
              )}
              {company.is_verified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                </View>
              )}
            </View>

            <View style={styles.profileInfo}>
              <Text style={styles.companyName}>{company.company_name}</Text>
              <Text style={styles.companyLocation}>
                {company.company_city}, {company.company_state}
              </Text>

              <View style={styles.ratingContainer}>
                {renderStars(avgRating, 16)}
                <Text style={styles.ratingText}>{avgRating.toFixed(1)}</Text>
                <Text style={styles.ratingSubtext}>({totalRatings} reviews)</Text>
              </View>
            </View>
          </View>

          {/* Stats Row */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{followerCount}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{avgRating.toFixed(1)}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalRatings}</Text>
              <Text style={styles.statLabel}>Reviews</Text>
            </View>
          </View>

          {/* Follow Button (not for own company) */}
          {!isOwnCompany && (
            <TouchableOpacity
              style={[styles.followButton, isFollowing && styles.followingButton]}
              onPress={handleFollow}
            >
              <Ionicons
                name={isFollowing ? 'checkmark' : 'add'}
                size={18}
                color={isFollowing ? '#177DDF' : '#FFFFFF'}
              />
              <Text
                style={[
                  styles.followButtonText,
                  isFollowing && styles.followingButtonText,
                ]}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Contact Actions */}
        <View style={styles.contactActionsRow}>
          <TouchableOpacity style={styles.contactAction} onPress={handleCall}>
            <Ionicons name="call" size={22} color="#0078D7" />
            <Text style={styles.contactActionText}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.contactAction} onPress={handleEmail}>
            <Ionicons name="mail" size={22} color="#0078D7" />
            <Text style={styles.contactActionText}>Email</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.contactAction} onPress={handleWhatsApp}>
            <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
            <Text style={styles.contactActionText}>WhatsApp</Text>
          </TouchableOpacity>
        </View>

        {/* Business Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={20} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{company.company_email}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={20} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>{company.company_phone}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={20} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Address</Text>
                <Text style={styles.infoValue}>
                  {company.company_address}, {company.company_city},{' '}
                  {company.company_state} - {company.company_pincode}
                </Text>
              </View>
            </View>
            {company.company_establishment_date && (
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={20} color="#666" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Established</Text>
                  <Text style={styles.infoValue}>
                    {new Date(company.company_establishment_date).getFullYear()}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Social Media Links */}
        {socialDetails && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Social Media</Text>
            <View style={styles.socialMediaRow}>
              {socialDetails.linkedin_url && (
                <TouchableOpacity
                  style={styles.socialIcon}
                  onPress={() => handleSocialLink(socialDetails.linkedin_url)}
                >
                  <Ionicons name="logo-linkedin" size={24} color="#0A66C2" />
                </TouchableOpacity>
              )}
              {socialDetails.instagram_url && (
                <TouchableOpacity
                  style={styles.socialIcon}
                  onPress={() => handleSocialLink(socialDetails.instagram_url)}
                >
                  <Ionicons name="logo-instagram" size={24} color="#E4405F" />
                </TouchableOpacity>
              )}
              {socialDetails.facebook_url && (
                <TouchableOpacity
                  style={styles.socialIcon}
                  onPress={() => handleSocialLink(socialDetails.facebook_url)}
                >
                  <Ionicons name="logo-facebook" size={24} color="#1877F2" />
                </TouchableOpacity>
              )}
              {socialDetails.website_url && (
                <TouchableOpacity
                  style={styles.socialIcon}
                  onPress={() => handleSocialLink(socialDetails.website_url)}
                >
                  <Ionicons name="globe-outline" size={24} color="#666" />
                </TouchableOpacity>
              )}
              {socialDetails.whatsapp_number && (
                <TouchableOpacity
                  style={styles.socialIcon}
                  onPress={() =>
                    Linking.openURL(
                      `whatsapp://send?phone=${socialDetails.whatsapp_number}`
                    )
                  }
                >
                  <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Rating Section */}
        <View style={styles.section}>
          <View style={styles.ratingSectionHeader}>
            <Text style={styles.sectionTitle}>Ratings & Reviews</Text>
            {!isOwnCompany && (
              <TouchableOpacity
                style={styles.rateButton}
                onPress={() => setShowRatingForm(!showRatingForm)}
              >
                <Ionicons name="star" size={16} color="#FFB800" />
                <Text style={styles.rateButtonText}>
                  {existingUserRating ? 'Edit Rating' : 'Rate'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Average Rating Summary */}
          <View style={styles.ratingsSummaryCard}>
            <View style={styles.avgRatingBox}>
              <Text style={styles.avgRatingNumber}>{avgRating.toFixed(1)}</Text>
              <View style={styles.avgRatingStars}>{renderStars(avgRating, 14)}</View>
              <Text style={styles.avgRatingCount}>{totalRatings} reviews</Text>
            </View>
          </View>

          {/* Rating Form */}
          {showRatingForm && !isOwnCompany && (
            <View style={styles.ratingFormCard}>
              <Text style={styles.ratingFormTitle}>
                {existingUserRating ? 'Update Your Rating' : 'Rate this Seller'}
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
              {ratings.slice(0, 5).map((review) => (
                <View key={review.rating_id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewStars}>
                      {renderStars(review.rating, 14)}
                    </View>
                    <Text style={styles.reviewDate}>
                      {new Date(review.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  {review.review_text && (
                    <Text style={styles.reviewText}>{review.review_text}</Text>
                  )}
                  {review.user_id === currentUserId && (
                    <Text style={styles.yourReviewBadge}>Your review</Text>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.noReviewsContainer}>
              <Ionicons name="chatbubble-outline" size={40} color="#CCC" />
              <Text style={styles.noReviewsText}>No reviews yet</Text>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loaderText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  header: {
    backgroundColor: '#1E90FF',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  profileHeader: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  logoContainer: {
    position: 'relative',
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  logoPlaceholder: {
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  companyName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  companyLocation: {
    fontSize: 13,
    color: '#888',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginLeft: 4,
  },
  ratingSubtext: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0078D7',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#F0F0F0',
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#177DDF',
    marginTop: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
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
  contactActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 14,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  contactAction: {
    alignItems: 'center',
    gap: 4,
  },
  contactActionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  infoRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    color: '#000',
    lineHeight: 20,
  },
  socialMediaRow: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 16,
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
  ratingSectionHeader: {
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
    borderRadius: 10,
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
  reviewStars: {
    flexDirection: 'row',
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
    paddingVertical: 30,
  },
  noReviewsText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
});

export default SellerProfile;

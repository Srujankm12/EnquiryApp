import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  StatusBar,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import Constants from 'expo-constants';

const { width } = Dimensions.get('window');

const API_URL = Constants.expoConfig?.extra?.API_URL;
const S3_URL = Constants.expoConfig?.extra?.S3_FETCH_URL;
const CLOUDFRONT_URL = Constants.expoConfig?.extra?.CLOUDFRONT_URL;

const getImageUri = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const path = url.startsWith('/') ? url : `/${url}`;
  if (CLOUDFRONT_URL) return `${CLOUDFRONT_URL}${path}`;
  return `${S3_URL}${path}`;
};

interface CompanyInfo {
  company_id: string;
  user_id: string;
  company_name: string;
  company_email: string;
  company_phone: string;
  company_profile_url: string | null;
  company_address: string;
  company_city: string;
  company_state: string;
  is_approved: boolean;
  is_verified: boolean;
  contact_person?: string;
  rating?: number;
}

const SellerDirectoryScreen: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [companies, setCompanies] = useState<CompanyInfo[]>([]);
  const [followedCompanyIds, setFollowedCompanyIds] = useState<Set<string>>(new Set());
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const decoded: any = jwtDecode(token);
      const currentUserId = decoded.user_id;
      setUserId(currentUserId);
      const storedCompanyId = await AsyncStorage.getItem('companyId');
      setUserCompanyId(storedCompanyId);
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch all approved companies
      let allCompanies: CompanyInfo[] = [];
      try {
        const res = await axios.get(`${API_URL}/company/get/all`, { headers });
        const data = res.data?.data?.companies || res.data?.data || [];
        allCompanies = (Array.isArray(data) ? data : []).filter(
          (c: any) => c.is_approved
        ).map((c: any) => ({
          company_id: String(c.company_id || c.id || ''),
          user_id: String(c.user_id || ''),
          company_name: c.company_name || c.name || '',
          company_email: c.company_email || c.email || '',
          company_phone: c.company_phone || c.phone || '',
          company_profile_url: c.company_profile_url || c.profile_image || null,
          company_address: c.company_address || c.address || '',
          company_city: c.company_city || c.city || '',
          company_state: c.company_state || c.state || '',
          is_approved: true,
          is_verified: c.is_verified || c.is_business_verified || false,
          contact_person: c.contact_person || '',
          rating: c.rating || 0,
        }));
      } catch {
        allCompanies = [];
      }

      // Fallback: try business endpoint
      if (allCompanies.length === 0) {
        try {
          const res = await axios.get(`${API_URL}/business/get/all`, { headers });
          const data = res.data?.data?.businesses || res.data?.businesses || res.data?.data || [];
          allCompanies = (Array.isArray(data) ? data : []).map((b: any) => {
            const biz = b.business_details || b;
            return {
              company_id: String(biz.id || b.id || ''),
              user_id: String(biz.user_id || b.user_id || ''),
              company_name: biz.name || b.name || '',
              company_email: biz.email || b.email || '',
              company_phone: biz.phone || b.phone || '',
              company_profile_url: biz.profile_image || b.profile_image || null,
              company_address: biz.address || b.address || '',
              company_city: biz.city || b.city || '',
              company_state: biz.state || b.state || '',
              is_approved: biz.is_business_approved !== false,
              is_verified: biz.is_business_verified || b.is_business_verified || false,
              contact_person: biz.contact_person || b.contact_person || '',
              rating: biz.rating || b.rating || 0,
            };
          }).filter((c: any) => c.is_approved);
        } catch {}
      }

      // Also try approved companies endpoint as additional source
      if (allCompanies.length === 0) {
        try {
          const res = await axios.get(`${API_URL}/company/get/approved/all`, { headers });
          const data = res.data?.data?.companies || res.data?.data || [];
          allCompanies = Array.isArray(data) ? data : [];
        } catch {}
      }

      setCompanies(allCompanies);

      // Fetch categories
      try {
        const catRes = await axios.get(`${API_URL}/category/get/all`, { headers });
        setCategories(catRes.data?.categories || []);
      } catch {
        setCategories([]);
      }

      // Fetch user's followed companies
      try {
        const followingRes = await axios.get(
          `${API_URL}/follower/get/followings/${currentUserId}`,
          { headers }
        );
        const followedData = followingRes.data?.data?.followings || followingRes.data?.followings || [];
        const ids = new Set<string>(
          (Array.isArray(followedData) ? followedData : []).map(
            (c: any) => String(c.following_id || c.business_id || "")
          )
        );
        setFollowedCompanyIds(ids);
      } catch {
        setFollowedCompanyIds(new Set());
      }
    } catch (error) {
      console.error('Error fetching directory:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleBack = () => {
    router.back();
  };

  const performFollow = async (companyIdStr: string) => {
    setProcessingId(companyIdStr);
    try {
      const token = await AsyncStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(
        `${API_URL}/follower/follow`,
        { user_id: userId, business_id: companyIdStr },
        { headers }
      );
      setFollowedCompanyIds((prev) => {
        const newSet = new Set(prev);
        newSet.add(companyIdStr);
        return newSet;
      });
    } catch (error: any) {
      console.error('Error following:', error?.response?.data || error);
      Alert.alert('Error', 'Failed to follow. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const performUnfollow = async (companyIdStr: string) => {
    setProcessingId(companyIdStr);
    try {
      const token = await AsyncStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(
        `${API_URL}/follower/unfollow`,
        { user_id: userId, business_id: companyIdStr },
        { headers }
      );
      setFollowedCompanyIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(companyIdStr);
        return newSet;
      });
    } catch (error: any) {
      console.error('Error unfollowing:', error?.response?.data || error);
      Alert.alert('Error', 'Failed to unfollow. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleFollow = (companyId: string) => {
    if (!companyId) {
      Alert.alert('Error', 'Unable to follow this seller. Please try again later.');
      return;
    }
    const companyIdStr = String(companyId);
    const isCurrentlyFollowing = followedCompanyIds.has(companyIdStr);

    if (isCurrentlyFollowing) {
      const company = companies.find((c) => String(c.company_id) === companyIdStr);
      const companyName = company?.company_name || 'this company';
      Alert.alert(
        'Unfollow',
        `Are you sure you want to unfollow ${companyName}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Unfollow',
            style: 'destructive',
            onPress: () => performUnfollow(companyIdStr),
          },
        ]
      );
    } else {
      performFollow(companyIdStr);
    }
  };

  const handleProfile = (companyId: string) => {
    router.push({
      pathname: '/pages/bussinesProfile' as any,
      params: { business_id: companyId },
    });
  };

  const handleContact = (phone: string) => {
    if (phone) Linking.openURL(`tel:${phone}`);
  };

  const handleMessage = (email: string) => {
    if (email) Linking.openURL(`mailto:${email}`);
  };

  const handleWhatsApp = (phone: string) => {
    if (phone) {
      const cleaned = phone.replace(/[^0-9]/g, '');
      Linking.openURL(`https://wa.me/${cleaned}`);
    }
  };

  const filteredCompanies = companies.filter((company) => {
    // Hide the user's own company
    if (company.user_id && String(company.user_id) === String(userId)) return false;
    if (userCompanyId && String(company.company_id) === String(userCompanyId)) return false;

    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      company.company_name?.toLowerCase().includes(query) ||
      company.company_city?.toLowerCase().includes(query) ||
      company.company_state?.toLowerCase().includes(query)
    );
  });

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating || 0);
    const hasHalfStar = (rating || 0) % 1 >= 0.5;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Ionicons key={`full-${i}`} name="star" size={14} color="#FFB800" />
      );
    }
    if (hasHalfStar) {
      stars.push(
        <Ionicons key="half" name="star-half" size={14} color="#FFB800" />
      );
    }
    const remaining = 5 - Math.ceil(rating || 0);
    for (let i = 0; i < remaining; i++) {
      stars.push(
        <Ionicons key={`empty-${i}`} name="star-outline" size={14} color="#FFB800" />
      );
    }
    return <View style={styles.starsContainer}>{stars}</View>;
  };

  const renderSellerCard = (company: CompanyInfo, index: number) => {
    const companyIdStr = String(company.company_id);
    const isFollowing = followedCompanyIds.has(companyIdStr);
    const isProcessing = processingId === companyIdStr;
    const imageUri = getImageUri(company.company_profile_url);

    return (
      <View key={`${company.company_id || 'seller'}-${index}`} style={styles.sellerCard}>
        <View style={styles.sellerHeader}>
          <TouchableOpacity onPress={() => handleProfile(company.company_id)}>
            {imageUri ? (
              <Image
                source={{ uri: `${imageUri}?t=${Date.now()}` }}
                style={styles.sellerImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.sellerImage, styles.imagePlaceholder]}>
                <Ionicons name="business" size={28} color="#177DDF" />
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.sellerInfo}>
            <Text style={styles.sellerName} numberOfLines={1}>
              {company.company_name || 'Business'}
            </Text>
            {renderStars(company.rating || 4)}
            {company.contact_person && (
              <Text style={styles.contactPerson} numberOfLines={1}>
                {company.contact_person}
              </Text>
            )}
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={13} color="#888" />
              <Text style={styles.sellerLocation} numberOfLines={1}>
                {company.company_city}, {company.company_state}
              </Text>
            </View>
            {company.is_verified ? (
              <View style={styles.verifiedBadge}>
                <Ionicons name="shield-checkmark" size={12} color="#28A745" />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            ) : (
              <View style={styles.notVerifiedBadge}>
                <Ionicons name="shield-outline" size={12} color="#DC3545" />
                <Text style={styles.notVerifiedText}>Not Verified</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.followButton,
              isFollowing && styles.followingButton,
              isProcessing && styles.followButtonDisabled,
            ]}
            onPress={() => handleFollow(company.company_id)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color={isFollowing ? '#177DDF' : '#FFFFFF'} />
            ) : (
              <Text
                style={[
                  styles.followButtonText,
                  isFollowing && styles.followingButtonText,
                ]}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleProfile(company.company_id)}
          >
            <Ionicons name="person-outline" size={18} color="#177DDF" />
            <Text style={styles.actionButtonText}>Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleContact(company.company_phone)}
          >
            <Ionicons name="call-outline" size={18} color="#177DDF" />
            <Text style={styles.actionButtonText}>Contact</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleMessage(company.company_email)}
          >
            <Ionicons name="mail-outline" size={18} color="#177DDF" />
            <Text style={styles.actionButtonText}>Message</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleWhatsApp(company.company_phone)}
          >
            <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
            <Text style={[styles.actionButtonText, { color: '#25D366' }]}>WhatsApp</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

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
        <Text style={styles.headerTitle}>Seller Directory</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={20}
          color="#999"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search sellers by name or location..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Loading Indicator */}
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#177DDF" />
          <Text style={styles.loadingText}>Loading sellers...</Text>
        </View>
      ) : (
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
          {/* Results count */}
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsCount}>
              {filteredCompanies.length} seller{filteredCompanies.length !== 1 ? 's' : ''} found
            </Text>
          </View>

          {/* Sellers List */}
          <View style={styles.sellersContainer}>
            {filteredCompanies.length > 0 ? (
              filteredCompanies.map((company, index) => renderSellerCard(company, index))
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={64} color="#CCC" />
                <Text style={styles.emptyText}>No sellers found</Text>
                <Text style={styles.emptySubtext}>
                  Try adjusting your search query
                </Text>
              </View>
            )}
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    backgroundColor: '#177DDF',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#333',
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
  resultsHeader: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  resultsCount: {
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
  },
  sellersContainer: {
    marginTop: 4,
  },
  sellerCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    padding: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  sellerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sellerImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E3F2FD',
    borderWidth: 2,
    borderColor: '#F0F0F0',
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  sellerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 4,
    gap: 1,
  },
  contactPerson: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  sellerLocation: {
    fontSize: 13,
    color: '#888',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#28A745',
  },
  notVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#FFF5F5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFDDDD',
  },
  notVerifiedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#DC3545',
  },
  followButton: {
    backgroundColor: '#177DDF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 85,
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
  },
  followingButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#177DDF',
  },
  followButtonDisabled: {
    opacity: 0.7,
  },
  followButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  followingButtonText: {
    color: '#177DDF',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 4,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#177DDF',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  bottomPadding: {
    height: 20,
  },
});

export default SellerDirectoryScreen;

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

const getImageUri = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${S3_URL}/${url}`;
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
}

const SellerDirectoryScreen: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [companies, setCompanies] = useState<CompanyInfo[]>([]);
  const [followedCompanyIds, setFollowedCompanyIds] = useState<Set<string>>(new Set());
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>('');
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
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch all approved companies
      let allCompanies: CompanyInfo[] = [];
      try {
        const res = await axios.get(`${API_URL}/company/get/all`, { headers });
        const data = res.data?.data?.companies || res.data?.data || [];
        allCompanies = (Array.isArray(data) ? data : []).filter(
          (c: CompanyInfo) => c.is_approved
        );
      } catch {
        allCompanies = [];
      }
      setCompanies(allCompanies);

      // Fetch categories
      try {
        const catRes = await axios.get(`${API_URL}/category/get/complete/all`, { headers });
        setCategories(catRes.data.data?.categories || []);
      } catch {
        setCategories([]);
      }

      // Fetch user's followed companies
      try {
        const followingRes = await axios.get(
          `${API_URL}/company/followers/get/user/${currentUserId}`,
          { headers }
        );
        const followedData = followingRes.data?.data?.companies || followingRes.data?.data || [];
        const ids = new Set(
          (Array.isArray(followedData) ? followedData : []).map((c: any) => c.company_id)
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

  const handleFollow = async (companyId: string) => {
    setProcessingId(companyId);
    try {
      const token = await AsyncStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      if (followedCompanyIds.has(companyId)) {
        // Unfollow
        await axios.delete(
          `${API_URL}/company/unfollow/${companyId}/${userId}`,
          { headers }
        );
        setFollowedCompanyIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(companyId);
          return newSet;
        });
      } else {
        // Follow
        await axios.post(
          `${API_URL}/company/follow/${companyId}/${userId}`,
          {},
          { headers }
        );
        setFollowedCompanyIds((prev) => {
          const newSet = new Set(prev);
          newSet.add(companyId);
          return newSet;
        });
      }
    } catch (error: any) {
      console.error('Error following/unfollowing:', error?.response?.data || error);
      Alert.alert('Error', 'Failed to update follow status. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleProfile = (companyId: string) => {
    router.push({
      pathname: '/pages/bussinesProfile' as any,
      params: { company_id: companyId },
    });
  };

  const filteredCompanies = companies.filter((company) => {
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
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

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

    const remainingStars = 5 - Math.ceil(rating);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(
        <Ionicons
          key={`empty-${i}`}
          name="star-outline"
          size={14}
          color="#FFB800"
        />
      );
    }

    return <View style={styles.starsContainer}>{stars}</View>;
  };

  const renderSellerCard = (company: CompanyInfo) => {
    const isFollowing = followedCompanyIds.has(company.company_id);
    const isProcessing = processingId === company.company_id;
    const imageUri = getImageUri(company.company_profile_url);

    return (
      <View key={company.company_id} style={styles.sellerCard}>
        <View style={styles.sellerHeader}>
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={styles.sellerImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.sellerImage, styles.imagePlaceholder]}>
              <Ionicons name="business" size={24} color="#CCC" />
            </View>
          )}
          <View style={styles.sellerInfo}>
            <Text style={styles.sellerName} numberOfLines={1}>
              {company.company_name}
            </Text>
            <Text style={styles.sellerLocation} numberOfLines={1}>
              {company.company_city}, {company.company_state}
            </Text>
            {company.company_phone && (
              <Text style={styles.sellerPhone} numberOfLines={1}>
                {company.company_phone}
              </Text>
            )}
            {company.is_verified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="shield-checkmark" size={12} color="#28A745" />
                <Text style={styles.verifiedText}>Verified</Text>
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
            <Ionicons name="person-outline" size={18} color="#666" />
            <Text style={styles.actionButtonText}>Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              if (company.company_phone) {
                const { Linking } = require('react-native');
                Linking.openURL(`tel:${company.company_phone}`);
              }
            }}
          >
            <Ionicons name="call-outline" size={18} color="#666" />
            <Text style={styles.actionButtonText}>Contact</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              if (company.company_email) {
                const { Linking } = require('react-native');
                Linking.openURL(`mailto:${company.company_email}`);
              }
            }}
          >
            <Ionicons name="mail-outline" size={18} color="#666" />
            <Text style={styles.actionButtonText}>Email</Text>
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
          placeholder="Search sellers..."
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
              filteredCompanies.map((company) => renderSellerCard(company))
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
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#177DDF',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    borderRadius: 8,
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
    borderRadius: 12,
    padding: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
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
    backgroundColor: '#E0E0E0',
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
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  sellerLocation: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  sellerPhone: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#28A745',
  },
  followButton: {
    backgroundColor: '#177DDF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 85,
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
  },
  followingButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
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
    paddingVertical: 8,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    fontWeight: '500',
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

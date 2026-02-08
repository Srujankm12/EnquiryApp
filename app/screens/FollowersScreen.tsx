import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.API_URL;
const S3_URL = Constants.expoConfig?.extra?.S3_FETCH_URL;

const getImageUri = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${S3_URL}/${url}`;
};

interface CompanyFollower {
  company_id: string;
  user_id: string;
  created_at: string;
}

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
}

type TabType = 'followers' | 'following';

const FollowersScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('following');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [followers, setFollowers] = useState<any[]>([]);
  const [followedCompanies, setFollowedCompanies] = useState<CompanyInfo[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isSeller, setIsSeller] = useState(false);

  useEffect(() => {
    loadNetworkData();
  }, []);

  const loadNetworkData = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const decoded: any = jwtDecode(token);
      const currentUserId = decoded.user_id;
      setUserId(currentUserId);

      const headers = { Authorization: `Bearer ${token}` };
      const storedCompanyId = await AsyncStorage.getItem('companyId');
      const sellerStatus = await AsyncStorage.getItem('sellerStatus');
      const isApprovedSeller = sellerStatus?.toLowerCase() === 'approved';
      setIsSeller(isApprovedSeller);
      setCompanyId(storedCompanyId);

      // Fetch followed companies (companies this user follows)
      try {
        const followingRes = await axios.get(
          `${API_URL}/company/followers/get/user/${currentUserId}`,
          { headers }
        );
        const companies = followingRes.data?.data?.companies || followingRes.data?.data || [];
        setFollowedCompanies(Array.isArray(companies) ? companies : []);
        setFollowingCount(Array.isArray(companies) ? companies.length : 0);
      } catch {
        setFollowedCompanies([]);
        setFollowingCount(0);
      }

      // Fetch followers of user's company (if seller)
      if (isApprovedSeller && storedCompanyId) {
        try {
          const followersRes = await axios.get(
            `${API_URL}/company/followers/get/${storedCompanyId}`,
            { headers }
          );
          const followersList = followersRes.data?.data?.followers || followersRes.data?.data || [];
          setFollowers(Array.isArray(followersList) ? followersList : []);

          const countRes = await axios.get(
            `${API_URL}/company/followers/count/${storedCompanyId}`,
            { headers }
          );
          const count = countRes.data?.data?.count || countRes.data?.data?.follower_count || 0;
          setFollowerCount(typeof count === 'number' ? count : 0);
        } catch {
          setFollowers([]);
          setFollowerCount(0);
        }
      }
    } catch (error) {
      console.error('Error loading network:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadNetworkData();
    setRefreshing(false);
  }, []);

  const handleBack = () => {
    router.back();
  };

  const handleUnfollow = async (company: CompanyInfo) => {
    Alert.alert(
      'Unfollow',
      `Are you sure you want to unfollow ${company.company_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unfollow',
          style: 'destructive',
          onPress: async () => {
            setProcessingId(company.company_id);
            try {
              const token = await AsyncStorage.getItem('token');
              const headers = { Authorization: `Bearer ${token}` };
              await axios.delete(
                `${API_URL}/company/unfollow/${company.company_id}/${userId}`,
                { headers }
              );
              setFollowedCompanies((prev) =>
                prev.filter((c) => c.company_id !== company.company_id)
              );
              setFollowingCount((prev) => Math.max(0, prev - 1));
            } catch (error: any) {
              console.error('Error unfollowing:', error?.response?.data || error);
              Alert.alert('Error', 'Failed to unfollow. Please try again.');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  const handleCompanyPress = (companyItem: CompanyInfo) => {
    router.push({
      pathname: '/pages/sellerProfile' as any,
      params: { company_id: companyItem.company_id },
    });
  };

  const renderCompanyCard = (company: CompanyInfo) => {
    const isProcessing = processingId === company.company_id;
    const imageUri = getImageUri(company.company_profile_url);

    return (
      <TouchableOpacity
        key={company.company_id}
        style={styles.userCard}
        activeOpacity={0.7}
        onPress={() => handleCompanyPress(company)}
      >
        <View style={styles.cardContent}>
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={styles.companyLogo}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.companyLogo, styles.logoPlaceholder]}>
              <Ionicons name="business" size={24} color="#CCC" />
            </View>
          )}

          <View style={styles.userInfo}>
            <Text style={styles.companyName} numberOfLines={1}>
              {company.company_name}
            </Text>
            {company.company_city && (
              <Text style={styles.location} numberOfLines={1}>
                {company.company_city}, {company.company_state}
              </Text>
            )}
            {company.company_phone && (
              <Text style={styles.contactPerson} numberOfLines={1}>
                {company.company_phone}
              </Text>
            )}
          </View>

          {activeTab === 'following' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.unfollowButton, isProcessing && styles.actionButtonDisabled]}
              onPress={() => handleUnfollow(company)}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#666" />
              ) : (
                <Text style={[styles.actionButtonText, styles.unfollowButtonText]}>
                  Unfollow
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderFollowerCard = (follower: CompanyFollower) => {
    return (
      <View key={follower.user_id} style={styles.userCard}>
        <View style={styles.cardContent}>
          <View style={[styles.companyLogo, styles.logoPlaceholder]}>
            <Ionicons name="person" size={24} color="#CCC" />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.companyName} numberOfLines={1}>
              User
            </Text>
            <Text style={styles.location} numberOfLines={1}>
              Followed on {new Date(follower.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const filteredFollowing = followedCompanies.filter(
    (company) =>
      company.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      company.company_city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#177DDF" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Network</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'following' && styles.activeTab]}
          onPress={() => setActiveTab('following')}
        >
          <Text style={[styles.tabText, activeTab === 'following' && styles.activeTabText]}>
            Following <Text style={styles.tabCount}>{followingCount}</Text>
          </Text>
        </TouchableOpacity>

        {isSeller && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'followers' && styles.activeTab]}
            onPress={() => setActiveTab('followers')}
          >
            <Text style={[styles.tabText, activeTab === 'followers' && styles.activeTabText]}>
              Followers <Text style={styles.tabCount}>{followerCount}</Text>
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search..."
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

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#177DDF" />
          <Text style={styles.loadingText}>Loading network...</Text>
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
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {activeTab === 'following' ? 'Companies You Follow' : 'Your Followers'}
            </Text>
          </View>

          {activeTab === 'following' ? (
            filteredFollowing.length > 0 ? (
              filteredFollowing.map((company) => renderCompanyCard(company))
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={64} color="#CCC" />
                <Text style={styles.emptyText}>
                  {searchQuery ? 'No results found' : 'Not following anyone yet'}
                </Text>
                <Text style={styles.emptySubtext}>
                  {searchQuery
                    ? 'Try adjusting your search'
                    : 'Follow companies to see them here'}
                </Text>
              </View>
            )
          ) : followers.length > 0 ? (
            followers.map((follower) => renderFollowerCard(follower))
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color="#CCC" />
              <Text style={styles.emptyText}>No followers yet</Text>
              <Text style={styles.emptySubtext}>
                People who follow your company will appear here
              </Text>
            </View>
          )}

          <View style={styles.bottomPadding} />
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
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
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 30,
    backgroundColor: '#E8E8E8',
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#177DDF',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#666',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  tabCount: {
    fontWeight: '400',
  },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 14,
    borderRadius: 14,
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
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#000',
    letterSpacing: 0.2,
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardContent: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
  },
  companyLogo: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: '#E0E0E0',
  },
  logoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
    marginLeft: 14,
    marginRight: 10,
  },
  companyName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  contactPerson: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  location: {
    fontSize: 12,
    color: '#999',
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 22,
    borderRadius: 8,
    minWidth: 85,
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
  },
  unfollowButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  unfollowButtonText: {
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 19,
    fontWeight: '700',
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
    height: 80,
  },
});

export default FollowersScreen;

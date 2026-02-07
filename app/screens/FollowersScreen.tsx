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

interface User {
  id: string;
  name: string;
  companyLogo: string;
  rating: number;
  contactPerson: string;
  location: string;
  isFollowing: boolean;
  email?: string;
  phone?: string;
  followedAt?: string;
}

interface NetworkResponse {
  followers: User[];
  following: User[];
  totalFollowers: number;
  totalFollowing: number;
}

type TabType = 'followers' | 'following';

// API functions
const fetchNetworkFromAPI = async (): Promise<NetworkResponse> => {
  const response = await fetch('YOUR_API_ENDPOINT/network');
  const data = await response.json();
  return data;
};

const followUser = async (userId: string): Promise<boolean> => {
  const response = await fetch(`YOUR_API_ENDPOINT/users/${userId}/follow`, {
    method: 'POST',
  });
  return response.ok;
};

const unfollowUser = async (userId: string): Promise<boolean> => {
  const response = await fetch(`YOUR_API_ENDPOINT/users/${userId}/unfollow`, {
    method: 'POST',
  });
  return response.ok;
};

const FollowersScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('followers');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [followers, setFollowers] = useState<User[]>([]);
  const [following, setFollowing] = useState<User[]>([]);
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);

  useEffect(() => {
    loadNetworkData();
  }, []);

  const loadNetworkData = async () => {
    setLoading(true);

    try {
      // Uncomment when API is ready
      // const data = await fetchNetworkFromAPI();
      // setFollowers(data.followers);
      // setFollowing(data.following);

      // Dummy data for now
      const dummyFollowers: User[] = [
        {
          id: '1',
          name: 'Bolas',
          companyLogo: 'https://via.placeholder.com/60/FF6347/FFFFFF?text=B',
          rating: 4,
          contactPerson: 'Siddharth HK',
          location: 'Vellala',
          isFollowing: false,
          email: 'contact@bolas.com',
          phone: '+91-1234567890',
        },
        {
          id: '2',
          name: 'Thirumala Cashew',
          companyLogo: 'https://via.placeholder.com/60/FFA500/FFFFFF?text=T',
          rating: 3,
          contactPerson: 'Shivam KL',
          location: 'Mangare',
          isFollowing: false,
        },
        {
          id: '3',
          name: 'Kade Cashew',
          companyLogo: 'https://via.placeholder.com/60/32CD32/FFFFFF?text=K',
          rating: 4,
          contactPerson: 'Pragival S',
          location: 'Mlangare',
          isFollowing: false,
        },
        {
          id: '4',
          name: 'Sri Saraswathi Cashews',
          companyLogo: 'https://via.placeholder.com/60/4169E1/FFFFFF?text=S',
          rating: 4,
          contactPerson: 'Ravi KD',
          location: 'Mangalire',
          isFollowing: false,
        },
      ];

      const dummyFollowing: User[] = [
        {
          id: '5',
          name: 'Crunchy Cashews',
          companyLogo: 'https://via.placeholder.com/60/9370DB/FFFFFF?text=C',
          rating: 4,
          contactPerson: 'Chethan Poojary',
          location: 'Kuvali',
          isFollowing: true,
          followedAt: '2024-01-15',
        },
        {
          id: '6',
          name: 'Kaibavi',
          companyLogo: 'https://via.placeholder.com/60/20B2AA/FFFFFF?text=K',
          rating: 4,
          contactPerson: 'Guruprasth L',
          location: 'Manguru',
          isFollowing: true,
          followedAt: '2024-01-14',
        },
        {
          id: '7',
          name: 'Cashew Coast.',
          companyLogo: 'https://via.placeholder.com/60/FF69B4/FFFFFF?text=CC',
          rating: 4,
          contactPerson: 'Pavan HL',
          location: 'Bangare',
          isFollowing: true,
          followedAt: '2024-01-12',
        },
        {
          id: '8',
          name: 'South Canara Agro Mart',
          companyLogo: 'https://via.placeholder.com/60/FFD700/FFFFFF?text=SC',
          rating: 5,
          contactPerson: 'Deekshith Kulal',
          location: 'Mangore',
          isFollowing: true,
          followedAt: '2024-01-10',
        },
      ];

      setFollowers(dummyFollowers);
      setFollowing(dummyFollowing);
    } catch (error) {
      console.error('Error loading network:', error);
      Alert.alert('Error', 'Failed to load network. Please try again.');
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

  const handleFollow = async (user: User) => {
    setProcessingUserId(user.id);

    try {
      // Optimistically update UI
      setFollowers((prev) => prev.filter((u) => u.id !== user.id));
      setFollowing((prev) => [{ ...user, isFollowing: true }, ...prev]);

      // Call API
      // await followUser(user.id);
      
      console.log('Followed user:', user.name);
    } catch (error) {
      console.error('Error following user:', error);
      Alert.alert('Error', 'Failed to follow user. Please try again.');
      // Revert optimistic update
      await loadNetworkData();
    } finally {
      setProcessingUserId(null);
    }
  };

  const handleUnfollow = async (user: User) => {
    Alert.alert(
      'Unfollow',
      `Are you sure you want to unfollow ${user.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unfollow',
          style: 'destructive',
          onPress: async () => {
            setProcessingUserId(user.id);

            try {
              // Optimistically update UI
              setFollowing((prev) => prev.filter((u) => u.id !== user.id));
              setFollowers((prev) => [{ ...user, isFollowing: false }, ...prev]);

              // Call API
              // await unfollowUser(user.id);
              
              console.log('Unfollowed user:', user.name);
            } catch (error) {
              console.error('Error unfollowing user:', error);
              Alert.alert('Error', 'Failed to unfollow user. Please try again.');
              // Revert optimistic update
              await loadNetworkData();
            } finally {
              setProcessingUserId(null);
            }
          },
        },
      ]
    );
  };

  const handleViewAll = () => {
    console.log('View all followers');
    // navigation.navigate('AllFollowers');
  };

  const handleUserPress = (user: User) => {
    console.log('View user profile:', user.name);
    // navigation.navigate('UserProfile', { userId: user.id });
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={14}
          color="#FFD700"
          style={styles.star}
        />
      );
    }
    return <View style={styles.starsContainer}>{stars}</View>;
  };

  const renderUserCard = (user: User) => {
    const isProcessing = processingUserId === user.id;

    return (
      <TouchableOpacity
        key={user.id}
        style={styles.userCard}
        activeOpacity={0.7}
        onPress={() => handleUserPress(user)}
      >
        <View style={styles.cardContent}>
          {/* Company Logo */}
          <Image
            source={{ uri: user.companyLogo }}
            style={styles.companyLogo}
            resizeMode="cover"
          />

          {/* User Info */}
          <View style={styles.userInfo}>
            <Text style={styles.companyName} numberOfLines={1}>
              {user.name}
            </Text>
            {renderStars(user.rating)}
            <Text style={styles.contactPerson} numberOfLines={1}>
              {user.contactPerson}
            </Text>
            <Text style={styles.location} numberOfLines={1}>
              {user.location}
            </Text>
          </View>

          {/* Action Button */}
          <TouchableOpacity
            style={[
              styles.actionButton,
              user.isFollowing ? styles.unfollowButton : styles.followButton,
              isProcessing && styles.actionButtonDisabled,
            ]}
            onPress={() =>
              user.isFollowing ? handleUnfollow(user) : handleFollow(user)
            }
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color={user.isFollowing ? '#666' : '#FFFFFF'} />
            ) : (
              <Text
                style={[
                  styles.actionButtonText,
                  user.isFollowing && styles.unfollowButtonText,
                ]}
              >
                {user.isFollowing ? 'Unfollow' : 'Follow'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const filteredFollowers = followers.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFollowing = following.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayList = activeTab === 'followers' ? filteredFollowers : filteredFollowing;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#177DDF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Network</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'followers' && styles.activeTab]}
          onPress={() => setActiveTab('followers')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'followers' && styles.activeTabText,
            ]}
          >
            Followers <Text style={styles.tabCount}>{followers.length}</Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'following' && styles.activeTab]}
          onPress={() => setActiveTab('following')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'following' && styles.activeTabText,
            ]}
          >
            Following <Text style={styles.tabCount}>{following.length}</Text>
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
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

      {/* Content */}
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
          {/* Section Header */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {activeTab === 'followers' ? 'Followers' : 'Following'}
            </Text>
            {activeTab === 'followers' && followers.length > 4 && (
              <TouchableOpacity onPress={handleViewAll}>
                <Text style={styles.viewAllText}>View all</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Users List */}
          {displayList.length > 0 ? (
            displayList.map((user) => renderUserCard(user))
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color="#CCC" />
              <Text style={styles.emptyText}>
                {activeTab === 'followers'
                  ? 'No followers found'
                  : 'No following found'}
              </Text>
              <Text style={styles.emptySubtext}>
                {searchQuery.length > 0
                  ? 'Try adjusting your search'
                  : activeTab === 'followers'
                  ? 'People who follow you will appear here'
                  : 'People you follow will appear here'}
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
  viewAllText: {
    fontSize: 14,
    color: '#177DDF',
    fontWeight: '700',
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
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  star: {
    marginRight: 2,
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
  followButton: {
    backgroundColor: '#177DDF',
    elevation: 2,
    shadowColor: '#177DDF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
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
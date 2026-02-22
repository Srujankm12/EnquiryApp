import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import Constants from 'expo-constants';

const { width } = Dimensions.get('window');
const TILE_SIZE = (width - 48 - 12) / 2;

const API_URL = Constants.expoConfig?.extra?.API_URL;
const CLOUDFRONT_URL = Constants.expoConfig?.extra?.CLOUDFRONT_URL;
const S3_URL = Constants.expoConfig?.extra?.S3_FETCH_URL;

const getImageUri = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (CLOUDFRONT_URL) return `${CLOUDFRONT_URL}/${url}`;
  return `${S3_URL}/${url}`;
};

interface DecodedToken {
  user_id: string;
  user_name: string;
  business_id: string;
  iss: string;
  exp: number;
  iat: number;
}

interface GridItem {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
  route?: string;
  condition?: 'always' | 'seller' | 'not-seller' | 'has-application';
}

const MenuScreen: React.FC = () => {
  const [sellerStatus, setSellerStatus] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const decoded = jwtDecode<DecodedToken>(token);
      setUserName(decoded.user_name || '');
      setBusinessId(decoded.business_id || '');

      const status = await AsyncStorage.getItem('sellerStatus');
      const storedCompanyId = await AsyncStorage.getItem('companyId');
      setSellerStatus(status);
      setCompanyId(storedCompanyId || decoded.business_id);

      // Fetch user details for email and profile image
      try {
        const res = await fetch(`${API_URL}/user/get/user/${decoded.user_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const details = data.details || data.data?.user_details || data;
          setUserEmail(details.user_email || details.email || '');
          const profileUrl = details.user_profile_url || details.profile_image;
          if (profileUrl) {
            setProfileImage(`${getImageUri(profileUrl)}?t=${Date.now()}`);
          }
        }
      } catch (e) {
        // Use token data as fallback
      }
    } catch (error) {
      console.error('Error loading menu data:', error);
    } finally {
      setLoading(false);
    }
  };

  const gridItems: GridItem[] = [
    { id: 'business-profile', title: 'Business\nProfile', icon: 'business', color: '#0078D7', bgColor: '#E3F2FD', route: 'business-profile', condition: 'seller' },
    { id: 'manage-post', title: 'Manage\nPost', icon: 'create-outline', color: '#34C759', bgColor: '#E8F5E9', route: 'pages/myProducts', condition: 'seller' },
    { id: 'become-seller', title: 'Become\nSeller', icon: 'storefront', color: '#34C759', bgColor: '#E8F5E9', route: 'pages/becomeSellerForm', condition: 'not-seller' },
    { id: 'app-status', title: 'Application\nStatus', icon: 'document-text', color: '#FF9500', bgColor: '#FFF3E0', route: 'pages/sellerApplicationStatus', condition: 'has-application' },
    { id: 'interested', title: 'Interested\nIn', icon: 'heart-outline', color: '#E91E63', bgColor: '#FCE4EC', condition: 'always' },
    { id: 'saved', title: 'Saved', icon: 'bookmark-outline', color: '#9C27B0', bgColor: '#F3E5F5', condition: 'always' },
    { id: 'followers', title: 'Followers &\nFollowing', icon: 'people-outline', color: '#0078D7', bgColor: '#E3F2FD', route: 'pages/followers', condition: 'always' },
    { id: 'product-interest', title: 'Product\nInterested', icon: 'cube-outline', color: '#FF5722', bgColor: '#FBE9E7', condition: 'always' },
    { id: 'blog', title: 'Blog', icon: 'newspaper-outline', color: '#607D8B', bgColor: '#ECEFF1', condition: 'always' },
    { id: 'news', title: 'News', icon: 'globe-outline', color: '#00BCD4', bgColor: '#E0F7FA', condition: 'always' },
    { id: 'videos', title: 'Videos', icon: 'videocam-outline', color: '#FF0000', bgColor: '#FFEBEE', condition: 'always' },
    { id: 'tutorial', title: 'Tutorial\nVideo', icon: 'play-circle-outline', color: '#FF9800', bgColor: '#FFF3E0', condition: 'always' },
  ];

  const tagItems = [
    { id: 'exhibitor', label: 'Exhibitor', icon: 'ribbon-outline' as keyof typeof Ionicons.glyphMap, color: '#0078D7' },
    { id: 'premium', label: 'Premium Member', icon: 'star-outline' as keyof typeof Ionicons.glyphMap, color: '#FF9500' },
    { id: 'directory', label: 'Directory', icon: 'book-outline' as keyof typeof Ionicons.glyphMap, color: '#34C759' },
    { id: 'share', label: 'App Share', icon: 'share-social-outline' as keyof typeof Ionicons.glyphMap, color: '#9C27B0' },
  ];

  const getVisibleGridItems = (): GridItem[] => {
    const normalizedStatus = sellerStatus?.toLowerCase();
    return gridItems.filter((item) => {
      switch (item.condition) {
        case 'always': return true;
        case 'seller': return normalizedStatus === 'approved';
        case 'not-seller': return normalizedStatus !== 'approved' && normalizedStatus !== 'pending';
        case 'has-application': return normalizedStatus === 'pending' || normalizedStatus === 'rejected';
        default: return true;
      }
    });
  };

  const handleGridItemPress = (item: GridItem) => {
    if (item.id === 'business-profile') {
      const bId = companyId || businessId;
      if (bId) {
        router.push({
          pathname: '/pages/bussinesProfile' as any,
          params: { business_id: bId },
        });
      }
      return;
    }
    if (item.route) {
      //@ts-expect-error
      router.push(`/${item.route}`);
    }
  };

  const performLogout = async () => {
    await AsyncStorage.multiRemove([
      'token', 'accessToken', 'refreshToken', 'user',
      'companyId', 'sellerStatus', 'applicationId',
    ]);
    router.replace('/pages/loginMail');
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', onPress: () => performLogout() },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#177DDF" />
      </View>
    );
  }

  const visibleItems = getVisibleGridItems();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#177DDF" />

      <LinearGradient
        colors={['#177DDF', '#1567BF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Menu</Text>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Card */}
        <TouchableOpacity
          style={styles.profileCard}
          activeOpacity={0.7}
          onPress={() => router.push('/pages/profileSetting' as any)}
        >
          <View style={styles.profileCardRow}>
            <View style={styles.profileImageContainer}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.profileImage} />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <Ionicons name="person" size={32} color="#0078D7" />
                </View>
              )}
            </View>
            <View style={styles.profileTextContainer}>
              <Text style={styles.profileName}>{userName || 'User'}</Text>
              {userEmail ? <Text style={styles.profileEmail}>{userEmail}</Text> : null}
              <Text style={styles.profileLink}>View Profile</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color="#0078D7" />
          </View>
        </TouchableOpacity>

        {/* Seller Dashboard Quick Access */}
        {sellerStatus?.toLowerCase() === 'approved' && (
          <TouchableOpacity
            style={styles.sellerDashboardBanner}
            activeOpacity={0.7}
            onPress={() => router.push('/(seller)' as any)}
          >
            <LinearGradient
              colors={['#177DDF', '#1567BF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.sellerDashboardGradient}
            >
              <Ionicons name="storefront" size={24} color="#FFFFFF" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.sellerDashboardTitle}>Seller Dashboard</Text>
                <Text style={styles.sellerDashboardSubtitle}>Manage your business</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Features Grid */}
        <View style={styles.gridContainer}>
          <Text style={styles.sectionLabel}>Features</Text>
          <View style={styles.grid}>
            {visibleItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.gridItem}
                activeOpacity={0.7}
                onPress={() => handleGridItemPress(item)}
              >
                <View style={[styles.gridIconContainer, { backgroundColor: item.bgColor }]}>
                  <Ionicons name={item.icon} size={28} color={item.color} />
                </View>
                <Text style={styles.gridItemTitle} numberOfLines={2}>{item.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Tags Section */}
        <View style={styles.tagsContainer}>
          <Text style={styles.sectionLabel}>Explore</Text>
          <View style={styles.tagsRow}>
            {tagItems.map((tag) => (
              <TouchableOpacity key={tag.id} style={styles.tagItem} activeOpacity={0.7}>
                <View style={[styles.tagIconContainer, { backgroundColor: `${tag.color}15` }]}>
                  <Ionicons name={tag.icon} size={18} color={tag.color} />
                </View>
                <Text style={styles.tagLabel}>{tag.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionLabel}>Quick Actions</Text>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push('/pages/updateUserProfileScreen' as any)}
          >
            <Ionicons name="person-outline" size={22} color="#0078D7" />
            <Text style={styles.quickActionText}>Update Profile</Text>
            <Ionicons name="chevron-forward" size={18} color="#999" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push('/pages/upadetPasswordScreen' as any)}
          >
            <Ionicons name="key-outline" size={22} color="#0078D7" />
            <Text style={styles.quickActionText}>Update Password</Text>
            <Ionicons name="chevron-forward" size={18} color="#999" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push('/pages/profileSetting' as any)}
          >
            <Ionicons name="settings-outline" size={22} color="#0078D7" />
            <Text style={styles.quickActionText}>Settings</Text>
            <Ionicons name="chevron-forward" size={18} color="#999" />
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} activeOpacity={0.7} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color="#DC3545" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center',
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  profileCard: {
    backgroundColor: '#FFFFFF', marginHorizontal: 16, marginTop: 16, marginBottom: 12,
    borderRadius: 16, padding: 16, elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8,
  },
  profileCardRow: { flexDirection: 'row', alignItems: 'center' },
  profileImageContainer: { width: 56, height: 56, borderRadius: 28, overflow: 'hidden', marginRight: 14 },
  profileImage: { width: 56, height: 56, borderRadius: 28 },
  profileImagePlaceholder: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#E3F2FD',
    justifyContent: 'center', alignItems: 'center',
  },
  profileTextContainer: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginBottom: 2 },
  profileEmail: { fontSize: 13, color: '#888', marginBottom: 4 },
  profileLink: { fontSize: 13, fontWeight: '600', color: '#0078D7' },
  sellerDashboardBanner: { marginHorizontal: 16, marginBottom: 16, borderRadius: 14, overflow: 'hidden' },
  sellerDashboardGradient: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16,
  },
  sellerDashboardTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  sellerDashboardSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  sectionLabel: {
    fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 14, paddingHorizontal: 4,
  },
  gridContainer: { paddingHorizontal: 16, marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridItem: {
    width: TILE_SIZE, backgroundColor: '#FFFFFF', borderRadius: 14, paddingVertical: 18,
    paddingHorizontal: 12, alignItems: 'center', elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,
  },
  gridIconContainer: {
    width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  gridItemTitle: { fontSize: 13, fontWeight: '600', color: '#1A1A1A', textAlign: 'center', lineHeight: 18 },
  tagsContainer: { paddingHorizontal: 16, marginBottom: 16 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tagItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 20,
    paddingVertical: 10, paddingHorizontal: 14, elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  tagIconContainer: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  tagLabel: { fontSize: 13, fontWeight: '600', color: '#333' },
  quickActionsContainer: { paddingHorizontal: 16, marginBottom: 16 },
  quickAction: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12,
    paddingVertical: 16, paddingHorizontal: 16, marginBottom: 8, elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  quickActionText: { flex: 1, fontSize: 15, fontWeight: '500', color: '#1A1A1A', marginLeft: 14 },
  logoutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 16, marginTop: 4, backgroundColor: '#FFFFFF', borderRadius: 12,
    paddingVertical: 16, borderWidth: 1.5, borderColor: '#FFE5E5', gap: 8,
  },
  logoutText: { fontSize: 16, fontWeight: '600', color: '#DC3545' },
});

export default MenuScreen;

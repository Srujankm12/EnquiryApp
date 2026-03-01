import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.API_URL;
const CLOUDFRONT_URL = Constants.expoConfig?.extra?.CLOUDFRONT_URL;
const S3_URL = Constants.expoConfig?.extra?.S3_FETCH_URL;

const getImageUri = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const path = url.startsWith('/') ? url : `/${url}`;
  if (CLOUDFRONT_URL) return `${CLOUDFRONT_URL}${path}`;
  return `${S3_URL}${path}`;
};

interface DecodedToken {
  user_id: string;
  user_name: string;
  business_id: string;
}

const BusinessManagementScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [businessId, setBusinessId] = useState<string>('');
  const [businessName, setBusinessName] = useState<string>('');
  const [businessCity, setBusinessCity] = useState<string>('');
  const [businessState, setBusinessState] = useState<string>('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [isApproved, setIsApproved] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // Refresh data when screen comes back into focus (e.g. after editing)
  useFocusEffect(
    useCallback(() => {
      loadData(false);
    }, [])
  );

  const loadData = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const decoded = jwtDecode<DecodedToken>(token);
      const storedCompanyId = await AsyncStorage.getItem('companyId');
      const bId = storedCompanyId || decoded.business_id;
      setBusinessId(bId);

      if (bId) {
        const res = await fetch(`${API_URL}/business/get/complete/${bId}`, {
          headers: { 'Content-Type': 'application/json' },
        });
        if (res.ok) {
          const result = await res.json();
          const biz = result.details?.business_details || {};
          setBusinessName(biz.name || '');
          setBusinessCity(biz.city || '');
          setBusinessState(biz.state || '');
          setIsVerified(biz.is_business_verified || false);
          setIsApproved(biz.is_business_approved || false);
          if (biz.profile_image) {
            setProfileImage(`${getImageUri(biz.profile_image)}?t=${Date.now()}`);
          } else {
            setProfileImage(null);
          }
        }
      }
    } catch (error) {
      console.error('Error loading business data:', error);
    } finally {
      if (showLoader) setLoading(false);
      setRefreshing(false);
    }
  };

  const menuItems = [
    {
      id: 'business-profile',
      title: 'Business Profile',
      subtitle: 'View your complete business profile',
      icon: 'eye-outline' as keyof typeof Ionicons.glyphMap,
      color: '#0078D7',
      bgColor: '#E3F2FD',
      onPress: () => {
        if (businessId) {
          router.push({
            pathname: '/pages/bussinesProfile' as any,
            params: { business_id: businessId },
          });
        }
      },
    },
    {
      id: 'edit-business',
      title: 'Edit Business Details',
      subtitle: 'Business photo, name, address, contact info',
      icon: 'create-outline' as keyof typeof Ionicons.glyphMap,
      color: '#FF9500',
      bgColor: '#FFF3E0',
      onPress: () => {
        router.push('/pages/editBusinessDetails' as any);
      },
    },
    {
      id: 'legal-details',
      title: 'Legal Details',
      subtitle: 'GST, PAN, MSME, FSSAI, Aadhaar',
      icon: 'document-text-outline' as keyof typeof Ionicons.glyphMap,
      color: '#28A745',
      bgColor: '#E8F5E9',
      onPress: () => {
        router.push('/pages/editLegalDetails' as any);
      },
    },
    {
      id: 'social-media',
      title: 'Social Media',
      subtitle: 'Website, Instagram, Facebook, LinkedIn & more',
      icon: 'share-social-outline' as keyof typeof Ionicons.glyphMap,
      color: '#E91E63',
      bgColor: '#FCE4EC',
      onPress: () => {
        router.push('/pages/editSocialMedia' as any);
      },
    },
  ];

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#177DDF" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Business</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#177DDF" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#177DDF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Business</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadData(false); }}
            colors={['#177DDF']}
          />
        }
      >
        {/* Business Profile Card with Image */}
        <View style={styles.profileCard}>
          <View style={styles.profileImageContainer}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profileImage} />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Ionicons name="business" size={36} color="#177DDF" />
              </View>
            )}
          </View>

          <Text style={styles.businessNameText}>{businessName || 'Your Business'}</Text>

          {(businessCity || businessState) && (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={14} color="#888" />
              <Text style={styles.locationText}>
                {[businessCity, businessState].filter(Boolean).join(', ')}
              </Text>
            </View>
          )}

          <View style={styles.badgesRow}>
            {isApproved && (
              <View style={styles.approvedBadge}>
                <Ionicons name="shield-checkmark" size={14} color="#28A745" />
                <Text style={styles.approvedBadgeText}>Approved Seller</Text>
              </View>
            )}
            {isVerified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#0078D7" />
                <Text style={styles.verifiedBadgeText}>Verified</Text>
              </View>
            )}
          </View>
        </View>

        {/* Menu Items */}
        <Text style={styles.sectionLabel}>Manage Business</Text>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={item.onPress}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: item.bgColor }]}>
              <Ionicons name={item.icon} size={22} color={item.color} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CCC" />
          </TouchableOpacity>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    backgroundColor: '#177DDF',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16 },

  // Profile card
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 16,
    marginBottom: 20,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  profileImageContainer: {
    width: 90,
    height: 90,
    marginBottom: 14,
  },
  profileImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#E0E0E0',
    borderWidth: 3,
    borderColor: '#FFF',
  },
  profileImagePlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
  },
  businessNameText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 6,
    textAlign: 'center',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  locationText: {
    fontSize: 13,
    color: '#888',
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  approvedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  approvedBadgeText: { fontSize: 11, fontWeight: '600', color: '#28A745' },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  verifiedBadgeText: { fontSize: 11, fontWeight: '600', color: '#0078D7' },

  // Section label
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
    paddingHorizontal: 4,
  },

  // Menu items
  menuItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  menuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuTextContainer: { flex: 1 },
  menuTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 3,
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#888',
  },
});

export default BusinessManagementScreen;

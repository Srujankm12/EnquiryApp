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
  const { business_id } = useLocalSearchParams();
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'info' | 'legal'>('info');
  const [businessDetails, setBusinessDetails] = useState<any>(null);
  const [socialDetails, setSocialDetails] = useState<any>(null);
  const [legalDetails, setLegalDetails] = useState<any>(null);
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    fetchBusinessProfile();
  }, [business_id]);

  const fetchBusinessProfile = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const decoded: any = jwtDecode(token);
      setUserId(decoded.user_id);

      const businessId = business_id as string;

      // Fetch complete business details
      try {
        const completeRes = await fetch(`${API_URL}/business/get/complete/${businessId}`, {
          headers: { 'Content-Type': 'application/json' },
        });

        if (completeRes.ok) {
          const result = await completeRes.json();
          const details = result.details;
          setBusinessDetails(details.business_details);
          setSocialDetails(details.social_details);
          setLegalDetails(details.legal_details);
        } else {
          // Fallback: fetch individually
          const [bizRes, socialRes, legalRes] = await Promise.allSettled([
            fetch(`${API_URL}/business/get/${businessId}`, {
              headers: { 'Content-Type': 'application/json' },
            }),
            fetch(`${API_URL}/business/social/get/${businessId}`, {
              headers: { 'Content-Type': 'application/json' },
            }),
            fetch(`${API_URL}/business/legal/get/${businessId}`, {
              headers: { 'Content-Type': 'application/json' },
            }),
          ]);

          if (bizRes.status === 'fulfilled' && bizRes.value.ok) {
            const r = await bizRes.value.json();
            setBusinessDetails(r.details);
          }
          if (socialRes.status === 'fulfilled' && socialRes.value.ok) {
            const r = await socialRes.value.json();
            setSocialDetails(r.details);
          }
          if (legalRes.status === 'fulfilled' && legalRes.value.ok) {
            const r = await legalRes.value.json();
            setLegalDetails(r.details);
          }
        }
      } catch {
        setBusinessDetails(null);
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

  const handleContact = () => {
    if (businessDetails?.phone) {
      Linking.openURL(`tel:${businessDetails.phone}`);
    }
  };

  const handleEmail = () => {
    if (businessDetails?.email) {
      Linking.openURL(`mailto:${businessDetails.email}`);
    }
  };

  const handleSocialMedia = (url?: string | null) => {
    if (url) Linking.openURL(url);
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

  if (!businessDetails) {
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
          <Text style={styles.loadingText}>Business not found</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchBusinessProfile}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const imageUri = getImageUri(businessDetails.profile_image);

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
            {businessDetails.is_business_verified && (
              <View style={styles.trustedBadge}>
                <Ionicons name="shield-checkmark" size={16} color="#4CAF50" />
                <Text style={styles.trustedText}>Verified</Text>
              </View>
            )}
            {businessDetails.is_business_trusted && (
              <View style={styles.trustedBadge}>
                <Ionicons name="ribbon" size={16} color="#FF9500" />
                <Text style={[styles.trustedText, { color: '#FF9500' }]}>Trusted</Text>
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
              <Text style={styles.businessName}>{businessDetails.name}</Text>
              {businessDetails.phone && (
                <View style={styles.infoRow}>
                  <Ionicons name="call-outline" size={14} color="#666" />
                  <Text style={styles.infoText}>{businessDetails.phone}</Text>
                </View>
              )}
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={14} color="#666" />
                <Text style={styles.infoText} numberOfLines={1}>
                  {businessDetails.city}, {businessDetails.state}
                </Text>
              </View>
              {businessDetails.email && (
                <View style={styles.infoRow}>
                  <Ionicons name="mail-outline" size={14} color="#666" />
                  <Text style={styles.infoText} numberOfLines={1}>{businessDetails.email}</Text>
                </View>
              )}
              {businessDetails.business_type && (
                <View style={styles.businessTypeBadge}>
                  <Text style={styles.businessTypeText}>{businessDetails.business_type}</Text>
                </View>
              )}
            </View>
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
          </View>

          {socialDetails && (socialDetails.linkedin || socialDetails.instagram || socialDetails.facebook || socialDetails.website || socialDetails.youtube || socialDetails.telegram || socialDetails.x) && (
            <View style={styles.socialMediaSection}>
              <Text style={styles.socialMediaTitle}>Follow us:</Text>
              <View style={styles.socialMediaIcons}>
                {socialDetails.instagram && (
                  <TouchableOpacity style={styles.socialIcon} onPress={() => handleSocialMedia(socialDetails.instagram)}>
                    <Ionicons name="logo-instagram" size={24} color="#E4405F" />
                  </TouchableOpacity>
                )}
                {socialDetails.facebook && (
                  <TouchableOpacity style={styles.socialIcon} onPress={() => handleSocialMedia(socialDetails.facebook)}>
                    <Ionicons name="logo-facebook" size={24} color="#1877F2" />
                  </TouchableOpacity>
                )}
                {socialDetails.linkedin && (
                  <TouchableOpacity style={styles.socialIcon} onPress={() => handleSocialMedia(socialDetails.linkedin)}>
                    <Ionicons name="logo-linkedin" size={24} color="#0A66C2" />
                  </TouchableOpacity>
                )}
                {socialDetails.youtube && (
                  <TouchableOpacity style={styles.socialIcon} onPress={() => handleSocialMedia(socialDetails.youtube)}>
                    <Ionicons name="logo-youtube" size={24} color="#FF0000" />
                  </TouchableOpacity>
                )}
                {socialDetails.x && (
                  <TouchableOpacity style={styles.socialIcon} onPress={() => handleSocialMedia(socialDetails.x)}>
                    <Ionicons name="logo-twitter" size={24} color="#000" />
                  </TouchableOpacity>
                )}
                {socialDetails.telegram && (
                  <TouchableOpacity style={styles.socialIcon} onPress={() => handleSocialMedia(socialDetails.telegram)}>
                    <Ionicons name="paper-plane-outline" size={24} color="#0088CC" />
                  </TouchableOpacity>
                )}
                {socialDetails.website && (
                  <TouchableOpacity style={styles.socialIcon} onPress={() => handleSocialMedia(socialDetails.website)}>
                    <Ionicons name="globe-outline" size={24} color="#666" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>

        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'info' && styles.activeTab]}
            onPress={() => setActiveTab('info')}
          >
            <Text style={[styles.tabText, activeTab === 'info' && styles.activeTabText]}>
              Business Info
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'legal' && styles.activeTab]}
            onPress={() => setActiveTab('legal')}
          >
            <Text style={[styles.tabText, activeTab === 'legal' && styles.activeTabText]}>
              Legal Details
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'info' ? (
          <View style={styles.statutoryContainer}>
            <View style={styles.infoCard}>
              <View style={styles.infoCardHeader}>
                <Ionicons name="business" size={18} color="#177DDF" />
                <Text style={styles.infoCardTitle}>Business Details</Text>
              </View>
              {businessDetails.address && (
                <View style={styles.infoCardRow}>
                  <Text style={styles.infoCardLabel}>Address</Text>
                  <Text style={styles.infoCardValue}>{businessDetails.address}</Text>
                </View>
              )}
              <View style={styles.infoCardRow}>
                <Text style={styles.infoCardLabel}>City</Text>
                <Text style={styles.infoCardValue}>{businessDetails.city}</Text>
              </View>
              <View style={styles.infoCardRow}>
                <Text style={styles.infoCardLabel}>State</Text>
                <Text style={styles.infoCardValue}>{businessDetails.state}</Text>
              </View>
              {businessDetails.pincode && (
                <View style={styles.infoCardRow}>
                  <Text style={styles.infoCardLabel}>Pincode</Text>
                  <Text style={styles.infoCardValue}>{businessDetails.pincode}</Text>
                </View>
              )}
              {businessDetails.business_type && (
                <View style={styles.infoCardRow}>
                  <Text style={styles.infoCardLabel}>Business Type</Text>
                  <Text style={styles.infoCardValue}>{businessDetails.business_type}</Text>
                </View>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.statutoryContainer}>
            {legalDetails && (legalDetails.pan || legalDetails.gst || legalDetails.msme || legalDetails.aadhaar || legalDetails.fassi || legalDetails.export_import) ? (
              <View style={styles.infoCard}>
                <View style={styles.infoCardHeader}>
                  <Ionicons name="document-text" size={18} color="#177DDF" />
                  <Text style={styles.infoCardTitle}>Legal Information</Text>
                </View>
                {legalDetails.aadhaar && (
                  <View style={styles.infoCardRow}>
                    <Text style={styles.infoCardLabel}>Aadhaar</Text>
                    <Text style={styles.infoCardValue}>{legalDetails.aadhaar}</Text>
                  </View>
                )}
                {legalDetails.pan && (
                  <View style={styles.infoCardRow}>
                    <Text style={styles.infoCardLabel}>PAN</Text>
                    <Text style={styles.infoCardValue}>{legalDetails.pan}</Text>
                  </View>
                )}
                {legalDetails.gst && (
                  <View style={styles.infoCardRow}>
                    <Text style={styles.infoCardLabel}>GST</Text>
                    <Text style={styles.infoCardValue}>{legalDetails.gst}</Text>
                  </View>
                )}
                {legalDetails.msme && (
                  <View style={styles.infoCardRow}>
                    <Text style={styles.infoCardLabel}>MSME</Text>
                    <Text style={styles.infoCardValue}>{legalDetails.msme}</Text>
                  </View>
                )}
                {legalDetails.fassi && (
                  <View style={styles.infoCardRow}>
                    <Text style={styles.infoCardLabel}>FSSAI</Text>
                    <Text style={styles.infoCardValue}>{legalDetails.fassi}</Text>
                  </View>
                )}
                {legalDetails.export_import && (
                  <View style={styles.infoCardRow}>
                    <Text style={styles.infoCardLabel}>Export/Import</Text>
                    <Text style={styles.infoCardValue}>{legalDetails.export_import}</Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="document-text-outline" size={64} color="#CCC" />
                <Text style={styles.emptyText}>No legal details available</Text>
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
  trustedBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, gap: 4,
  },
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
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 6 },
  infoText: { fontSize: 13, color: '#666', flex: 1 },
  businessTypeBadge: {
    alignSelf: 'flex-start', backgroundColor: '#E3F2FD',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 4,
  },
  businessTypeText: { fontSize: 12, fontWeight: '600', color: '#0078D7' },
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

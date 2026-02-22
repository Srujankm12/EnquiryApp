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
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import Constants from 'expo-constants';

const { width } = Dimensions.get('window');

const API_URL = Constants.expoConfig?.extra?.API_URL;
const S3_URL = Constants.expoConfig?.extra?.S3_FETCH_URL;
const CLOUDFRONT_URL = Constants.expoConfig?.extra?.CLOUDFRONT_URL;

const getImageUri = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (CLOUDFRONT_URL) return `${CLOUDFRONT_URL}/${url}`;
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

      let businessId = business_id as string;

      // If no business_id passed, try getting from token or AsyncStorage
      if (!businessId) {
        businessId = decoded.business_id || await AsyncStorage.getItem('companyId') || '';
      }

      if (!businessId) {
        // Try fetching business_id by user_id
        try {
          const bizIdRes = await fetch(`${API_URL}/business/get/user/${decoded.user_id}`, {
            headers: { 'Content-Type': 'application/json' },
          });
          if (bizIdRes.ok) {
            const result = await bizIdRes.json();
            businessId = result.business_id;
          }
        } catch (e) {
          console.error('Error fetching business ID:', e);
        }
      }

      if (!businessId) {
        setLoading(false);
        return;
      }

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
            fetch(`${API_URL}/business/get/${businessId}`, { headers: { 'Content-Type': 'application/json' } }),
            fetch(`${API_URL}/business/social/get/${businessId}`, { headers: { 'Content-Type': 'application/json' } }),
            fetch(`${API_URL}/business/legal/get/${businessId}`, { headers: { 'Content-Type': 'application/json' } }),
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

  const handleBack = () => { router.back(); };

  const handleContact = () => {
    if (businessDetails?.phone) Linking.openURL(`tel:${businessDetails.phone}`);
  };

  const handleEmail = () => {
    if (businessDetails?.email) Linking.openURL(`mailto:${businessDetails.email}`);
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
          <View style={{ width: 40 }} />
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
          <View style={{ width: 40 }} />
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
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#177DDF']} tintColor="#177DDF" />
        }
      >
        {/* Profile Header */}
        <View style={styles.profileHeaderSection}>
          <View style={styles.profileHeader}>
            <View style={styles.logoContainer}>
              {imageUri ? (
                <Image source={{ uri: `${imageUri}?t=${Date.now()}` }} style={styles.logo} resizeMode="cover" />
              ) : (
                <View style={[styles.logo, styles.logoPlaceholder]}>
                  <Ionicons name="business" size={40} color="#177DDF" />
                </View>
              )}
              {businessDetails.is_business_verified && (
                <View style={styles.verifiedOverlay}>
                  <Ionicons name="checkmark-circle" size={22} color="#34C759" />
                </View>
              )}
            </View>

            <View style={styles.basicInfo}>
              <Text style={styles.businessName}>{businessDetails.name}</Text>
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={14} color="#666" />
                <Text style={styles.infoText}>{businessDetails.city}, {businessDetails.state}</Text>
              </View>
              {businessDetails.business_type && (
                <View style={styles.businessTypeBadge}>
                  <Text style={styles.businessTypeText}>{businessDetails.business_type}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Badges Row */}
          <View style={styles.badgesContainer}>
            {businessDetails.is_business_verified && (
              <View style={[styles.badge, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="shield-checkmark" size={14} color="#4CAF50" />
                <Text style={[styles.badgeText, { color: '#4CAF50' }]}>Verified</Text>
              </View>
            )}
            {businessDetails.is_business_trusted && (
              <View style={[styles.badge, { backgroundColor: '#FFF3E0' }]}>
                <Ionicons name="ribbon" size={14} color="#FF9500" />
                <Text style={[styles.badgeText, { color: '#FF9500' }]}>Trusted</Text>
              </View>
            )}
            {businessDetails.is_business_approved && (
              <View style={[styles.badge, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="checkmark-circle" size={14} color="#0078D7" />
                <Text style={[styles.badgeText, { color: '#0078D7' }]}>Approved</Text>
              </View>
            )}
          </View>

          {/* Followers / Following Row */}
          <View style={styles.statsRow}>
            <TouchableOpacity style={styles.statItem}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity style={styles.statItem}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Following</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity style={styles.statItem}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Products</Text>
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionButton} onPress={handleContact}>
              <Ionicons name="call-outline" size={20} color="#0078D7" />
              <Text style={styles.actionButtonText}>Contact</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleEmail}>
              <Ionicons name="mail-outline" size={20} color="#0078D7" />
              <Text style={styles.actionButtonText}>Email</Text>
            </TouchableOpacity>
          </View>

          {/* Social Media */}
          {socialDetails && (socialDetails.linkedin || socialDetails.instagram || socialDetails.facebook || socialDetails.website || socialDetails.youtube || socialDetails.telegram || socialDetails.x) && (
            <View style={styles.socialMediaSection}>
              <Text style={styles.socialMediaTitle}>Social Links</Text>
              <View style={styles.socialMediaIcons}>
                {socialDetails.instagram && (
                  <TouchableOpacity style={styles.socialIcon} onPress={() => handleSocialMedia(socialDetails.instagram)}>
                    <Ionicons name="logo-instagram" size={22} color="#E4405F" />
                  </TouchableOpacity>
                )}
                {socialDetails.facebook && (
                  <TouchableOpacity style={styles.socialIcon} onPress={() => handleSocialMedia(socialDetails.facebook)}>
                    <Ionicons name="logo-facebook" size={22} color="#1877F2" />
                  </TouchableOpacity>
                )}
                {socialDetails.linkedin && (
                  <TouchableOpacity style={styles.socialIcon} onPress={() => handleSocialMedia(socialDetails.linkedin)}>
                    <Ionicons name="logo-linkedin" size={22} color="#0A66C2" />
                  </TouchableOpacity>
                )}
                {socialDetails.youtube && (
                  <TouchableOpacity style={styles.socialIcon} onPress={() => handleSocialMedia(socialDetails.youtube)}>
                    <Ionicons name="logo-youtube" size={22} color="#FF0000" />
                  </TouchableOpacity>
                )}
                {socialDetails.x && (
                  <TouchableOpacity style={styles.socialIcon} onPress={() => handleSocialMedia(socialDetails.x)}>
                    <Ionicons name="logo-twitter" size={22} color="#000" />
                  </TouchableOpacity>
                )}
                {socialDetails.telegram && (
                  <TouchableOpacity style={styles.socialIcon} onPress={() => handleSocialMedia(socialDetails.telegram)}>
                    <Ionicons name="paper-plane-outline" size={22} color="#0088CC" />
                  </TouchableOpacity>
                )}
                {socialDetails.website && (
                  <TouchableOpacity style={styles.socialIcon} onPress={() => handleSocialMedia(socialDetails.website)}>
                    <Ionicons name="globe-outline" size={22} color="#666" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'info' && styles.activeTab]}
            onPress={() => setActiveTab('info')}
          >
            <Ionicons name="business-outline" size={18} color={activeTab === 'info' ? '#177DDF' : '#999'} />
            <Text style={[styles.tabText, activeTab === 'info' && styles.activeTabText]}>Business Info</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'legal' && styles.activeTab]}
            onPress={() => setActiveTab('legal')}
          >
            <Ionicons name="document-text-outline" size={18} color={activeTab === 'legal' ? '#177DDF' : '#999'} />
            <Text style={[styles.tabText, activeTab === 'legal' && styles.activeTabText]}>Legal Details</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {activeTab === 'info' ? (
          <View style={styles.tabContent}>
            <View style={styles.infoCard}>
              <View style={styles.infoCardHeader}>
                <Ionicons name="business" size={18} color="#177DDF" />
                <Text style={styles.infoCardTitle}>Business Details</Text>
              </View>
              {businessDetails.address && (
                <InfoRow label="Address" value={businessDetails.address} />
              )}
              <InfoRow label="City" value={businessDetails.city} />
              <InfoRow label="State" value={businessDetails.state} />
              {businessDetails.pincode && <InfoRow label="Pincode" value={businessDetails.pincode} />}
              {businessDetails.phone && <InfoRow label="Phone" value={businessDetails.phone} />}
              {businessDetails.email && <InfoRow label="Email" value={businessDetails.email} />}
              {businessDetails.business_type && <InfoRow label="Business Type" value={businessDetails.business_type} />}
            </View>
          </View>
        ) : (
          <View style={styles.tabContent}>
            {legalDetails && (legalDetails.pan || legalDetails.gst || legalDetails.msme || legalDetails.aadhaar || legalDetails.fassi || legalDetails.export_import) ? (
              <View style={styles.infoCard}>
                <View style={styles.infoCardHeader}>
                  <Ionicons name="document-text" size={18} color="#177DDF" />
                  <Text style={styles.infoCardTitle}>Legal Information</Text>
                </View>
                {legalDetails.aadhaar && <InfoRow label="Aadhaar" value={legalDetails.aadhaar} />}
                {legalDetails.pan && <InfoRow label="PAN" value={legalDetails.pan} />}
                {legalDetails.gst && <InfoRow label="GST" value={legalDetails.gst} />}
                {legalDetails.msme && <InfoRow label="MSME" value={legalDetails.msme} />}
                {legalDetails.fassi && <InfoRow label="FSSAI" value={legalDetails.fassi} />}
                {legalDetails.export_import && <InfoRow label="Export/Import" value={legalDetails.export_import} />}
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

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.infoCardRow}>
    <Text style={styles.infoCardLabel}>{label}</Text>
    <Text style={styles.infoCardValue}>{value || 'N/A'}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    backgroundColor: '#177DDF', paddingTop: 50, paddingBottom: 15, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#666' },
  retryBtn: { marginTop: 16, backgroundColor: '#177DDF', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 8 },
  retryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  scrollView: { flex: 1 },

  // Profile Header
  profileHeaderSection: {
    backgroundColor: '#FFFFFF', paddingBottom: 16, elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3,
  },
  profileHeader: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 20 },
  logoContainer: {
    position: 'relative', width: 80, height: 80, borderRadius: 40, overflow: 'visible',
  },
  logo: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#E0E0E0',
    borderWidth: 2, borderColor: '#FFFFFF',
  },
  logoPlaceholder: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#E3F2FD' },
  verifiedOverlay: {
    position: 'absolute', bottom: -2, right: -2, backgroundColor: '#FFFFFF', borderRadius: 12,
    padding: 1,
  },
  basicInfo: { flex: 1, marginLeft: 16, justifyContent: 'center' },
  businessName: { fontSize: 20, fontWeight: '700', color: '#000', marginBottom: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 6 },
  infoText: { fontSize: 13, color: '#666', flex: 1 },
  businessTypeBadge: {
    alignSelf: 'flex-start', backgroundColor: '#E3F2FD',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 4,
  },
  businessTypeText: { fontSize: 12, fontWeight: '600', color: '#0078D7' },

  // Badges
  badgesContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  badge: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, gap: 4,
  },
  badgeText: { fontSize: 12, fontWeight: '600' },

  // Stats
  statsRow: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    marginHorizontal: 16, marginTop: 16, paddingVertical: 14,
    backgroundColor: '#F8F9FA', borderRadius: 12,
  },
  statItem: { alignItems: 'center', flex: 1 },
  statNumber: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  statLabel: { fontSize: 12, color: '#888', marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: '#E0E0E0' },

  // Action Buttons
  actionButtons: {
    flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 16,
    paddingVertical: 14, borderBottomWidth: 1, borderColor: '#F0F0F0', marginTop: 12,
  },
  actionButton: { alignItems: 'center', gap: 4 },
  actionButtonText: { fontSize: 12, color: '#0078D7', fontWeight: '500' },

  // Social Media
  socialMediaSection: { paddingHorizontal: 16, marginTop: 14 },
  socialMediaTitle: { fontSize: 14, fontWeight: '600', color: '#000', marginBottom: 10 },
  socialMediaIcons: { flexDirection: 'row', gap: 12 },
  socialIcon: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: '#F5F5F5',
    justifyContent: 'center', alignItems: 'center', elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2,
  },

  // Tabs
  tabsContainer: {
    flexDirection: 'row', backgroundColor: '#FFFFFF', marginTop: 8, elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3,
  },
  tab: {
    flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2.5,
    borderBottomColor: 'transparent', flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  activeTab: { borderBottomColor: '#177DDF' },
  tabText: { fontSize: 14, fontWeight: '500', color: '#999' },
  activeTabText: { color: '#177DDF', fontWeight: '600' },

  // Tab Content
  tabContent: { flex: 1, padding: 16 },
  infoCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4,
  },
  infoCardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12,
    paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  infoCardTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  infoCardRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F8F8F8',
  },
  infoCardLabel: { fontSize: 13, color: '#888', flex: 1 },
  infoCardValue: { fontSize: 14, fontWeight: '600', color: '#1A1A1A', flex: 2, textAlign: 'right' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#999', marginTop: 16 },
  bottomPadding: { height: 20 },
});

export default BusinessProfileScreen;

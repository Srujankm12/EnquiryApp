import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
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

interface BusinessDetails {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  profile_image: string | null;
  address: string;
  city: string;
  state: string;
  pincode: string;
  business_type: string;
  is_business_verified: boolean;
  is_business_trusted: boolean;
  is_business_approved: boolean;
}

interface SocialDetails {
  linkedin: string | null;
  instagram: string | null;
  facebook: string | null;
  website: string | null;
  telegram: string | null;
  youtube: string | null;
  x: string | null;
}

interface LegalDetails {
  aadhaar: string | null;
  pan: string | null;
  gst: string | null;
  msme: string | null;
  fassi: string | null;
  export_import: string | null;
}

const SellerProfile = () => {
  const params = useLocalSearchParams();
  const paramBusinessId = params.business_id as string;
  const paramUserId = params.user_id as string;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [business, setBusiness] = useState<BusinessDetails | null>(null);
  const [socialDetails, setSocialDetails] = useState<SocialDetails | null>(null);
  const [legalDetails, setLegalDetails] = useState<LegalDetails | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  useEffect(() => {
    loadProfile();
  }, [paramBusinessId, paramUserId]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [paramBusinessId, paramUserId])
  );

  const loadProfile = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const decoded: any = jwtDecode(token);
      setCurrentUserId(decoded.user_id);

      let businessId = paramBusinessId;
      if (!businessId && paramUserId) {
        try {
          const res = await fetch(`${API_URL}/business/get/user/${paramUserId}`, {
            headers: { 'Content-Type': 'application/json' },
          });
          if (res.ok) {
            const result = await res.json();
            businessId = result.business_id;
          }
        } catch (e) {
          console.error('Error fetching business by user ID:', e);
        }
      }

      if (!businessId) {
        try {
          const res = await fetch(`${API_URL}/business/get/user/${decoded.user_id}`, {
            headers: { 'Content-Type': 'application/json' },
          });
          if (res.ok) {
            const result = await res.json();
            businessId = result.business_id;
          }
        } catch (e) {
          console.error('Error fetching own business:', e);
        }
      }

      if (!businessId) {
        setLoading(false);
        return;
      }

      const completeRes = await fetch(`${API_URL}/business/get/complete/${businessId}`, {
        headers: { 'Content-Type': 'application/json' },
      });

      if (completeRes.ok) {
        const result = await completeRes.json();
        const details = result.details;
        setBusiness(details.business_details);
        setSocialDetails(details.social_details);
        setLegalDetails(details.legal_details);
      } else {
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
          setBusiness(r.details);
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

  const handleCall = () => {
    if (business?.phone) Linking.openURL(`tel:${business.phone}`);
  };

  const handleEmail = () => {
    if (business?.email) Linking.openURL(`mailto:${business.email}`);
  };

  const handleSocialLink = (url: string | null) => {
    if (url) Linking.openURL(url);
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#0078D7" />
        <Text style={styles.loaderText}>Loading profile...</Text>
      </View>
    );
  }

  if (!business) {
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

  return (
    <View style={styles.container}>
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
              {business.profile_image ? (
                <Image source={{ uri: getImageUri(business.profile_image)! }} style={styles.logo} />
              ) : (
                <View style={[styles.logo, styles.logoPlaceholder]}>
                  <Ionicons name="business" size={40} color="#0078D7" />
                </View>
              )}
              {business.is_business_verified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                </View>
              )}
            </View>

            <View style={styles.profileInfo}>
              <Text style={styles.businessName}>{business.name}</Text>
              <Text style={styles.businessLocation}>
                {business.city}, {business.state}
              </Text>
              {business.business_type && (
                <View style={styles.businessTypeBadge}>
                  <Text style={styles.businessTypeText}>{business.business_type}</Text>
                </View>
              )}
            </View>
          </View>
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
        </View>

        {/* Business Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={20} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{business.email}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={20} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>{business.phone}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={20} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Address</Text>
                <Text style={styles.infoValue}>
                  {business.address}, {business.city}, {business.state} - {business.pincode}
                </Text>
              </View>
            </View>
            {business.business_type && (
              <View style={styles.infoRow}>
                <Ionicons name="briefcase-outline" size={20} color="#666" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Business Type</Text>
                  <Text style={styles.infoValue}>{business.business_type}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Legal Information */}
        {legalDetails && (legalDetails.pan || legalDetails.gst || legalDetails.msme || legalDetails.aadhaar || legalDetails.fassi || legalDetails.export_import) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Legal Information</Text>
            <View style={styles.infoCard}>
              {legalDetails.aadhaar && (
                <View style={styles.infoRow}>
                  <Ionicons name="card-outline" size={20} color="#666" />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Aadhaar</Text>
                    <Text style={styles.infoValue}>{legalDetails.aadhaar}</Text>
                  </View>
                </View>
              )}
              {legalDetails.pan && (
                <View style={styles.infoRow}>
                  <Ionicons name="document-text-outline" size={20} color="#666" />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>PAN</Text>
                    <Text style={styles.infoValue}>{legalDetails.pan}</Text>
                  </View>
                </View>
              )}
              {legalDetails.gst && (
                <View style={styles.infoRow}>
                  <Ionicons name="receipt-outline" size={20} color="#666" />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>GST</Text>
                    <Text style={styles.infoValue}>{legalDetails.gst}</Text>
                  </View>
                </View>
              )}
              {legalDetails.msme && (
                <View style={styles.infoRow}>
                  <Ionicons name="business-outline" size={20} color="#666" />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>MSME</Text>
                    <Text style={styles.infoValue}>{legalDetails.msme}</Text>
                  </View>
                </View>
              )}
              {legalDetails.fassi && (
                <View style={styles.infoRow}>
                  <Ionicons name="nutrition-outline" size={20} color="#666" />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>FSSAI</Text>
                    <Text style={styles.infoValue}>{legalDetails.fassi}</Text>
                  </View>
                </View>
              )}
              {legalDetails.export_import && (
                <View style={styles.infoRow}>
                  <Ionicons name="globe-outline" size={20} color="#666" />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Export/Import Code</Text>
                    <Text style={styles.infoValue}>{legalDetails.export_import}</Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Social Media Links */}
        {socialDetails && (socialDetails.linkedin || socialDetails.instagram || socialDetails.facebook || socialDetails.website || socialDetails.youtube || socialDetails.telegram || socialDetails.x) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Social Media</Text>
            <View style={styles.socialMediaRow}>
              {socialDetails.linkedin && (
                <TouchableOpacity style={styles.socialIcon} onPress={() => handleSocialLink(socialDetails.linkedin)}>
                  <Ionicons name="logo-linkedin" size={24} color="#0A66C2" />
                </TouchableOpacity>
              )}
              {socialDetails.instagram && (
                <TouchableOpacity style={styles.socialIcon} onPress={() => handleSocialLink(socialDetails.instagram)}>
                  <Ionicons name="logo-instagram" size={24} color="#E4405F" />
                </TouchableOpacity>
              )}
              {socialDetails.facebook && (
                <TouchableOpacity style={styles.socialIcon} onPress={() => handleSocialLink(socialDetails.facebook)}>
                  <Ionicons name="logo-facebook" size={24} color="#1877F2" />
                </TouchableOpacity>
              )}
              {socialDetails.youtube && (
                <TouchableOpacity style={styles.socialIcon} onPress={() => handleSocialLink(socialDetails.youtube)}>
                  <Ionicons name="logo-youtube" size={24} color="#FF0000" />
                </TouchableOpacity>
              )}
              {socialDetails.x && (
                <TouchableOpacity style={styles.socialIcon} onPress={() => handleSocialLink(socialDetails.x)}>
                  <Ionicons name="logo-twitter" size={24} color="#000" />
                </TouchableOpacity>
              )}
              {socialDetails.telegram && (
                <TouchableOpacity style={styles.socialIcon} onPress={() => handleSocialLink(socialDetails.telegram)}>
                  <Ionicons name="paper-plane-outline" size={24} color="#0088CC" />
                </TouchableOpacity>
              )}
              {socialDetails.website && (
                <TouchableOpacity style={styles.socialIcon} onPress={() => handleSocialLink(socialDetails.website)}>
                  <Ionicons name="globe-outline" size={24} color="#666" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
  loaderText: { marginTop: 12, fontSize: 14, color: '#666' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 16, color: '#666', marginTop: 16 },
  header: {
    backgroundColor: '#1E90FF', paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  scrollView: { flex: 1 },
  profileCard: {
    backgroundColor: '#FFFFFF', margin: 16, borderRadius: 16, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  profileHeader: { flexDirection: 'row' },
  logoContainer: { position: 'relative' },
  logo: { width: 80, height: 80, borderRadius: 40, marginRight: 16 },
  logoPlaceholder: { backgroundColor: '#F0F8FF', justifyContent: 'center', alignItems: 'center' },
  verifiedBadge: { position: 'absolute', bottom: 0, right: 12, backgroundColor: '#FFFFFF', borderRadius: 12 },
  profileInfo: { flex: 1, justifyContent: 'center' },
  businessName: { fontSize: 18, fontWeight: '700', color: '#000', marginBottom: 4 },
  businessLocation: { fontSize: 13, color: '#888', marginBottom: 8 },
  businessTypeBadge: {
    alignSelf: 'flex-start', backgroundColor: '#E3F2FD', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  businessTypeText: { fontSize: 12, fontWeight: '600', color: '#0078D7' },
  contactActionsRow: {
    flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#FFFFFF',
    marginHorizontal: 16, marginBottom: 12, paddingVertical: 14, borderRadius: 12,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4,
  },
  contactAction: { alignItems: 'center', gap: 4 },
  contactActionText: { fontSize: 12, fontWeight: '500', color: '#666' },
  section: { marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#000', marginHorizontal: 16, marginBottom: 12 },
  infoCard: {
    backgroundColor: '#FFFFFF', padding: 16, marginHorizontal: 16, borderRadius: 12,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  infoRow: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  infoContent: { flex: 1, marginLeft: 12 },
  infoLabel: { fontSize: 12, color: '#666', marginBottom: 4 },
  infoValue: { fontSize: 14, color: '#000', lineHeight: 20 },
  socialMediaRow: { flexDirection: 'row', gap: 16, paddingHorizontal: 16 },
  socialIcon: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#F5F5F5',
    justifyContent: 'center', alignItems: 'center', elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2,
  },
});

export default SellerProfile;

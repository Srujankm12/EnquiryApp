import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StatusBar,
  Alert,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.API_URL;
const S3_FETCH_URL = Constants.expoConfig?.extra?.S3_FETCH_URL;
const CLOUDFRONT_URL = Constants.expoConfig?.extra?.CLOUDFRONT_URL;

const getImageUri = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const path = url.startsWith('/') ? url : `/${url}`;
  if (CLOUDFRONT_URL) return `${CLOUDFRONT_URL}${path}`;
  return `${S3_FETCH_URL}${path}`;
};

interface DecodedToken {
  user_id: string;
  user_name: string;
  business_id: string;
  iss: string;
  exp?: number;
  iat?: number;
}

const ProfileSettingsScreen: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const [userId, setUserId] = useState<string>('');
  const [tokenData, setTokenData] = useState<DecodedToken | null>(null);
  const [userDetails, setUserDetails] = useState<any>(null);
  const [businessDetails, setBusinessDetails] = useState<any>(null);
  const [socialDetails, setSocialDetails] = useState<any>(null);
  const [legalDetails, setLegalDetails] = useState<any>(null);
  const [sellerStatus, setSellerStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchProfileData();
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    console.log('🔐 [Permissions] Media library permission status:', status);
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera roll permissions to change profile picture.');
    }
  };

  const fetchProfileData = async (showLoader = true) => {
    console.log('👤 [ProfileFetch] Starting fetchProfileData — showLoader:', showLoader);
    try {
      if (showLoader) setLoading(true);

      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.error('👤 [ProfileFetch] ❌ No token found in AsyncStorage.');
        Alert.alert('Error', 'Authentication token not found. Please login again.');
        router.replace('/pages/loginMail' as any);
        return;
      }
      console.log('👤 [ProfileFetch] ✅ Token found.');

      const decoded = jwtDecode<DecodedToken>(token);
      console.log('👤 [ProfileFetch] Decoded token:', {
        user_id: decoded.user_id,
        user_name: decoded.user_name,
        business_id: decoded.business_id,
        exp: decoded.exp ? new Date(decoded.exp * 1000).toISOString() : 'none',
      });
      setTokenData(decoded);
      setUserId(decoded.user_id);

      // ─── Fetch user details ──────────────────────────────────────────────────
      console.log('👤 [ProfileFetch] Fetching user details for ID:', decoded.user_id);
      try {
        const res = await axios.get(
          `${API_URL}/user/get/user/${decoded.user_id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log('👤 [ProfileFetch] User details response status:', res.status);
        console.log('👤 [ProfileFetch] User details raw data:', JSON.stringify(res.data, null, 2));

        if (res.data) {
          const details = res.data.user || res.data;
          setUserDetails(details);
          console.log('👤 [ProfileFetch] User details set:', {
            first_name: details.first_name,
            last_name: details.last_name,
            email: details.email,
            phone: details.phone,
            profile_image: details.profile_image,
          });

          const profileUrl = details.profile_image;
          if (profileUrl) {
            const fullImageUrl = getImageUri(profileUrl);
            const finalUrl = `${fullImageUrl}?t=${Date.now()}`;
            console.log('👤 [ProfileFetch] Profile image raw path:', profileUrl);
            console.log('👤 [ProfileFetch] Profile image resolved URL:', finalUrl);
            setProfileImage(finalUrl);
          } else {
            console.log('👤 [ProfileFetch] No profile image found for user.');
            setProfileImage(null);
          }
        }
      } catch (e: any) {
        console.error('👤 [ProfileFetch] ❌ Error fetching user details:', e?.response?.status, e?.response?.data ?? e?.message);
      }

      // ─── Seller status ───────────────────────────────────────────────────────
      const normalizeStatus = (s: string | null): string | null => {
        if (!s) return null;
        const lower = s.toLowerCase().trim();
        if (lower === 'accepted' || lower === 'active') return 'approved';
        if (lower === 'applied' || lower === 'under_review') return 'pending';
        if (lower === 'declined') return 'rejected';
        return lower;
      };

      let status = normalizeStatus(await AsyncStorage.getItem('sellerStatus'));
      console.log('👤 [ProfileFetch] Stored sellerStatus from AsyncStorage:', status);

      const businessId = decoded.business_id || await AsyncStorage.getItem('companyId');
      console.log('👤 [ProfileFetch] Business ID:', businessId);

      if (businessId) {
        // Try application endpoint
        console.log('👤 [ProfileFetch] Fetching business application status...');
        try {
          const appRes = await fetch(`${API_URL}/business/application/get/${businessId}`, {
            headers: { 'Content-Type': 'application/json' },
          });
          console.log('👤 [ProfileFetch] Application endpoint status:', appRes.status);
          if (appRes.ok) {
            const appData = await appRes.json();
            console.log('👤 [ProfileFetch] Application data:', JSON.stringify(appData, null, 2));
            const appStatus = appData.details?.status || appData.application?.status || appData.status;
            console.log('👤 [ProfileFetch] Raw application status:', appStatus);
            if (appStatus) {
              status = normalizeStatus(appStatus);
              console.log('👤 [ProfileFetch] Normalized status:', status);
              await AsyncStorage.setItem('sellerStatus', status || '');
            }
          }
        } catch (e: any) {
          console.warn('👤 [ProfileFetch] ⚠️ Application endpoint failed:', e?.message);
          // Fallback: check business directly
          try {
            const bizCheckRes = await fetch(`${API_URL}/business/get/${businessId}`, {
              headers: { 'Content-Type': 'application/json' },
            });
            console.log('👤 [ProfileFetch] Business check fallback status:', bizCheckRes.status);
            if (bizCheckRes.ok) {
              const bizCheck = await bizCheckRes.json();
              console.log('👤 [ProfileFetch] Business check data:', JSON.stringify(bizCheck, null, 2));
              if (bizCheck.details?.is_business_approved || bizCheck.business?.is_business_approved) {
                status = 'approved';
                await AsyncStorage.setItem('sellerStatus', 'approved');
                console.log('👤 [ProfileFetch] Status set to approved via business check.');
              }
            }
          } catch (e2: any) {
            console.error('👤 [ProfileFetch] ❌ Business check fallback also failed:', e2?.message);
          }
        }

        // Check simple status endpoint
        if (status !== 'approved') {
          console.log('👤 [ProfileFetch] Checking simple status endpoint...');
          try {
            const statusRes = await fetch(`${API_URL}/business/status/${businessId}`, {
              headers: { 'Content-Type': 'application/json' },
            });
            console.log('👤 [ProfileFetch] Simple status endpoint response:', statusRes.status);
            if (statusRes.ok) {
              const statusData = await statusRes.json();
              console.log('👤 [ProfileFetch] Simple status data:', JSON.stringify(statusData, null, 2));
              if (statusData?.is_approved === true || statusData?.details?.is_approved === true ||
                  statusData?.is_business_approved === true || statusData?.details?.is_business_approved === true) {
                status = 'approved';
                await AsyncStorage.setItem('sellerStatus', 'approved');
                console.log('👤 [ProfileFetch] Status set to approved via simple status endpoint.');
              }
            }
          } catch (e: any) {
            console.error('👤 [ProfileFetch] ❌ Simple status endpoint failed:', e?.message);
          }
        }

        await AsyncStorage.setItem('companyId', businessId);
      }

      console.log('👤 [ProfileFetch] Final seller status:', status);
      setSellerStatus(status);

      // ─── Fetch business details ──────────────────────────────────────────────
      if (businessId) {
        console.log('👤 [ProfileFetch] Fetching business details for ID:', businessId);
        try {
          const completeRes = await fetch(`${API_URL}/business/get/complete/${businessId}`, {
            headers: { 'Content-Type': 'application/json' },
          });
          console.log('👤 [ProfileFetch] Business complete endpoint status:', completeRes.status);

          if (completeRes.ok) {
            const result = await completeRes.json();
            console.log('👤 [ProfileFetch] Business complete data:', JSON.stringify(result, null, 2));
            const details = result.details;
            setBusinessDetails({ ...details.business_details, id: businessId });
            setSocialDetails(details.social_details);
            setLegalDetails(details.legal_details);
            console.log('👤 [ProfileFetch] ✅ Business/social/legal details set from complete endpoint.');
          } else {
            console.warn('👤 [ProfileFetch] ⚠️ Complete endpoint failed, falling back to individual endpoints...');
            const [bizRes, socialRes, legalRes] = await Promise.allSettled([
              fetch(`${API_URL}/business/get/${businessId}`, { headers: { 'Content-Type': 'application/json' } }),
              fetch(`${API_URL}/business/social/get/${businessId}`, { headers: { 'Content-Type': 'application/json' } }),
              fetch(`${API_URL}/business/legal/get/${businessId}`, { headers: { 'Content-Type': 'application/json' } }),
            ]);

            console.log('👤 [ProfileFetch] Fallback results — biz:', bizRes.status, '| social:', socialRes.status, '| legal:', legalRes.status);

            if (bizRes.status === 'fulfilled' && bizRes.value.ok) {
              const r = await bizRes.value.json();
              console.log('👤 [ProfileFetch] Business fallback data:', JSON.stringify(r, null, 2));
              setBusinessDetails({ ...r.details, id: businessId });
            }
            if (socialRes.status === 'fulfilled' && socialRes.value.ok) {
              const r = await socialRes.value.json();
              console.log('👤 [ProfileFetch] Social fallback data:', JSON.stringify(r, null, 2));
              setSocialDetails(r.details);
            }
            if (legalRes.status === 'fulfilled' && legalRes.value.ok) {
              const r = await legalRes.value.json();
              console.log('👤 [ProfileFetch] Legal fallback data:', JSON.stringify(r, null, 2));
              setLegalDetails(r.details);
            }
          }
        } catch (e: any) {
          console.error('👤 [ProfileFetch] ❌ Error fetching business details:', e?.message);
        }
      } else {
        console.log('👤 [ProfileFetch] No business ID — skipping business details fetch.');
      }
    } catch (error: any) {
      console.error('👤 [ProfileFetch] ❌ Unhandled error in fetchProfileData:', error?.message, error?.stack);
    } finally {
      if (showLoader) setLoading(false);
      setRefreshing(false);
      console.log('👤 [ProfileFetch] Done.');
    }
  };

  const onRefresh = () => {
    console.log('🔄 [Refresh] Pull-to-refresh triggered.');
    setRefreshing(true);
    fetchProfileData(false);
  };

  const handleBack = () => {
    console.log('⬅️ [Nav] Back pressed.');
    router.back();
  };

  // ─── S3 Upload via fetch ───────────────────────────────────────────────────
  const uploadImageToS3 = async (s3Url: string, imageUri: string) => {
    console.log('☁️ [S3Upload] Fetching blob from local URI:', imageUri);
    const response = await fetch(imageUri);
    const blob = await response.blob();
    console.log('☁️ [S3Upload] Blob — size:', blob.size, '| type:', blob.type);

    if (blob.size === 0) throw new Error('Blob is empty — could not read image file.');

    console.log('☁️ [S3Upload] Sending PUT to S3...');
    const uploadResponse = await fetch(s3Url, {
      method: 'PUT',
      body: blob,
      headers: { 'Content-Type': blob.type || 'image/jpeg' },
    });
    console.log('☁️ [S3Upload] S3 PUT response status:', uploadResponse.status);
    if (!uploadResponse.ok) {
      const responseText = await uploadResponse.text();
      console.error('☁️ [S3Upload] ❌ S3 upload failed. Response body:', responseText.substring(0, 300));
      throw new Error(`S3 upload failed with status ${uploadResponse.status}`);
    }
    console.log('☁️ [S3Upload] ✅ S3 upload successful.');
    return true;
  };

  // ─── Image Pick + Upload Flow ──────────────────────────────────────────────
  const handleImagePick = async () => {
    console.log('📸 [ImagePick] Starting user profile image upload...');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],     // ✅ fixes deprecation warning
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      console.log('📸 [ImagePick] Picker result — canceled:', result.canceled, '| assets:', result.assets?.length ?? 0);
      if (result.canceled || !result.assets?.[0]) {
        console.log('📸 [ImagePick] Aborted by user.');
        return;
      }

      const asset = result.assets[0];
      console.log('📸 [ImagePick] Selected asset:', {
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        fileSize: asset.fileSize,
        mimeType: asset.mimeType,
      });

      setUploadingImage(true);

      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.error('📸 [ImagePick] ❌ No token in AsyncStorage.');
        Alert.alert('Error', 'Authentication token not found.');
        setUploadingImage(false);
        return;
      }

      // STEP 1: Get presigned URL
      const presignEndpoint = `${API_URL}/user/get/presigned/${userId}`;
      console.log('📸 [ImagePick] STEP 1 — Fetching presigned URL from:', presignEndpoint);
      const presignedUrlRes = await axios.get(presignEndpoint, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      console.log('📸 [ImagePick] Presign response status:', presignedUrlRes.status);
      console.log('📸 [ImagePick] Presign response data:', JSON.stringify(presignedUrlRes.data, null, 2));

      const s3PresignedUrl = presignedUrlRes.data.data?.url || presignedUrlRes.data.url;
      if (!s3PresignedUrl) {
        console.error('📸 [ImagePick] ❌ No presigned URL in response:', presignedUrlRes.data);
        throw new Error('Invalid response from server: missing presigned URL');
      }
      console.log('📸 [ImagePick] ✅ Got presigned URL:', s3PresignedUrl.substring(0, 120) + '...');

      // STEP 2: Upload to S3
      console.log('📸 [ImagePick] STEP 2 — Uploading to S3...');
      await uploadImageToS3(s3PresignedUrl, asset.uri);
      console.log('📸 [ImagePick] ✅ S3 upload done.');

      // STEP 3: Notify backend to save image path
      const saveEndpoint = `${API_URL}/user/update/image/${userId}`;
      console.log('📸 [ImagePick] STEP 3 — Saving image path to backend:', saveEndpoint);
      const updateRes = await axios.put(saveEndpoint, null, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      console.log('📸 [ImagePick] Save response status:', updateRes.status);
      console.log('📸 [ImagePick] Save response data:', JSON.stringify(updateRes.data, null, 2));

      if (updateRes.status === 200 || updateRes.data.message) {
        console.log('📸 [ImagePick] ✅ Image path saved. Refreshing profile...');
        await fetchProfileData(false);
        setUploadingImage(false);
        Alert.alert('Success', 'Profile picture updated successfully!');
      } else {
        console.error('📸 [ImagePick] ❌ Backend save returned unexpected status:', updateRes.status);
        throw new Error('Failed to update profile image');
      }
    } catch (error: any) {
      console.error('📸 [ImagePick] ❌ Unhandled error:');
      console.error('  message:', error?.message);
      console.error('  response status:', error?.response?.status);
      console.error('  response data:', JSON.stringify(error?.response?.data, null, 2));
      console.error('  stack:', error?.stack);

      let errorMessage = 'Failed to update profile picture. Please try again.';
      if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        errorMessage = 'Network error. Please check your connection.';
      } else if (error.response) {
        errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
      }
      Alert.alert('Error', errorMessage);
      setUploadingImage(false);
    } finally {
      console.log('📸 [ImagePick] uploadingImage reset to false.');
    }
  };

  const getUserName = () => {
    if (userDetails?.first_name) {
      return `${userDetails.first_name}${userDetails.last_name ? ' ' + userDetails.last_name : ''}`;
    }
    return tokenData?.user_name || 'N/A';
  };

  const getUserEmail = () => userDetails?.email || 'N/A';
  const getUserPhone = () => userDetails?.phone || '';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#177DDF" translucent={false} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#177DDF" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#177DDF']} />
          }
        >
          {/* Profile Image Section */}
          <View style={styles.profileSection}>
            <View style={styles.profileImageContainer}>
              {profileImage ? (
                <Image
                  source={{ uri: profileImage }}
                  style={styles.profileImage}
                  resizeMode="cover"
                  onLoad={() => console.log('🖼️ [Image] ✅ Profile image loaded:', profileImage)}
                  onError={(e) => console.error('🖼️ [Image] ❌ Profile image load error:', e.nativeEvent.error, '| URL:', profileImage)}
                />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <Ionicons name="person" size={60} color="#0078D7" />
                </View>
              )}
              <TouchableOpacity
                style={styles.cameraButton}
                onPress={handleImagePick}
                disabled={uploadingImage}
              >
                {uploadingImage ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="camera" size={18} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
            <Text style={styles.userName}>{getUserName()}</Text>
            <Text style={styles.userEmail}>{getUserEmail()}</Text>
            {getUserPhone() ? <Text style={styles.userPhone}>{getUserPhone()}</Text> : null}
          </View>

          {/* Login Details Section */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconBg, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="key-outline" size={18} color="#0078D7" />
              </View>
              <Text style={styles.sectionTitle}>Login Details</Text>
            </View>
            <DetailRow icon="person-outline" label="Name" value={getUserName()} />
            <DetailRow icon="mail-outline" label="Email" value={getUserEmail()} />
            {getUserPhone() ? <DetailRow icon="call-outline" label="Phone" value={getUserPhone()} /> : null}
            <DetailRow icon="finger-print-outline" label="User ID" value={tokenData?.user_id?.substring(0, 8) + '...' || 'N/A'} />
          </View>

          {/* Business Information Section */}
          {businessDetails && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconBg, { backgroundColor: '#E8F5E9' }]}>
                  <Ionicons name="business-outline" size={18} color="#28A745" />
                </View>
                <Text style={styles.sectionTitle}>Business Information</Text>
              </View>
              <DetailRow icon="storefront-outline" label="Business Name" value={businessDetails.name} />
              <DetailRow icon="mail-outline" label="Business Email" value={businessDetails.email} />
              <DetailRow icon="call-outline" label="Business Phone" value={businessDetails.phone} />
              <DetailRow icon="location-outline" label="Location" value={`${businessDetails.city || ''}, ${businessDetails.state || ''}`} />
              {businessDetails.pincode && <DetailRow icon="navigate-outline" label="Pincode" value={businessDetails.pincode} />}
              {businessDetails.business_type && <DetailRow icon="briefcase-outline" label="Business Type" value={businessDetails.business_type} />}
            </View>
          )}

          {/* Physical Business Directory */}
          {businessDetails && businessDetails.address && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconBg, { backgroundColor: '#FFF3E0' }]}>
                  <Ionicons name="map-outline" size={18} color="#FF9500" />
                </View>
                <Text style={styles.sectionTitle}>Physical Business Directory</Text>
              </View>
              <DetailRow icon="location-outline" label="Address" value={businessDetails.address} />
              <DetailRow icon="business-outline" label="City" value={businessDetails.city} />
              <DetailRow icon="globe-outline" label="State" value={businessDetails.state} />
              {businessDetails.pincode && <DetailRow icon="navigate-outline" label="Pincode" value={businessDetails.pincode} />}
            </View>
          )}

          {/* Business Verification */}
          {businessDetails && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconBg, { backgroundColor: '#E8F5E9' }]}>
                  <Ionicons name="shield-checkmark-outline" size={18} color="#28A745" />
                </View>
                <Text style={styles.sectionTitle}>Business Verification</Text>
              </View>
              <View style={styles.badgesRow}>
                <View style={[styles.statusBadge, businessDetails.is_business_verified ? styles.verifiedBadge : styles.unverifiedBadge]}>
                  <Ionicons name={businessDetails.is_business_verified ? 'checkmark-circle' : 'close-circle'} size={16} color={businessDetails.is_business_verified ? '#28A745' : '#999'} />
                  <Text style={[styles.statusBadgeText, { color: businessDetails.is_business_verified ? '#28A745' : '#999' }]}>
                    {businessDetails.is_business_verified ? 'Verified' : 'Not Verified'}
                  </Text>
                </View>
                <View style={[styles.statusBadge, businessDetails.is_business_trusted ? styles.trustedBadge : styles.unverifiedBadge]}>
                  <Ionicons name={businessDetails.is_business_trusted ? 'ribbon' : 'ribbon-outline'} size={16} color={businessDetails.is_business_trusted ? '#FF9500' : '#999'} />
                  <Text style={[styles.statusBadgeText, { color: businessDetails.is_business_trusted ? '#FF9500' : '#999' }]}>
                    {businessDetails.is_business_trusted ? 'Trusted' : 'Not Trusted'}
                  </Text>
                </View>
                <View style={[styles.statusBadge, businessDetails.is_business_approved ? styles.approvedBadgePill : styles.unverifiedBadge]}>
                  <Ionicons name={businessDetails.is_business_approved ? 'shield-checkmark' : 'shield-outline'} size={16} color={businessDetails.is_business_approved ? '#0078D7' : '#999'} />
                  <Text style={[styles.statusBadgeText, { color: businessDetails.is_business_approved ? '#0078D7' : '#999' }]}>
                    {businessDetails.is_business_approved ? 'Approved' : 'Not Approved'}
                  </Text>
                </View>
              </View>
              {legalDetails && (
                <View style={styles.legalSummary}>
                  {legalDetails.pan && <LegalBadge label="PAN" verified />}
                  {legalDetails.gst && <LegalBadge label="GST" verified />}
                  {legalDetails.msme && <LegalBadge label="MSME" verified />}
                  {legalDetails.aadhaar && <LegalBadge label="Aadhaar" verified />}
                  {legalDetails.fassi && <LegalBadge label="FSSAI" verified />}
                  {legalDetails.export_import && <LegalBadge label="Export/Import" verified />}
                </View>
              )}
            </View>
          )}

          {/* Social Media URLs */}
          {socialDetails && (socialDetails.linkedin || socialDetails.instagram || socialDetails.facebook || socialDetails.website || socialDetails.youtube || socialDetails.telegram || socialDetails.x) && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconBg, { backgroundColor: '#FCE4EC' }]}>
                  <Ionicons name="share-social-outline" size={18} color="#E91E63" />
                </View>
                <Text style={styles.sectionTitle}>Social Media URL</Text>
              </View>
              {socialDetails.instagram && <DetailRow icon="logo-instagram" label="Instagram" value={socialDetails.instagram} iconColor="#E4405F" />}
              {socialDetails.facebook && <DetailRow icon="logo-facebook" label="Facebook" value={socialDetails.facebook} iconColor="#1877F2" />}
              {socialDetails.linkedin && <DetailRow icon="logo-linkedin" label="LinkedIn" value={socialDetails.linkedin} iconColor="#0A66C2" />}
              {socialDetails.youtube && <DetailRow icon="logo-youtube" label="YouTube" value={socialDetails.youtube} iconColor="#FF0000" />}
              {socialDetails.x && <DetailRow icon="logo-twitter" label="X (Twitter)" value={socialDetails.x} iconColor="#000" />}
              {socialDetails.telegram && <DetailRow icon="paper-plane-outline" label="Telegram" value={socialDetails.telegram} iconColor="#0088CC" />}
              {socialDetails.website && <DetailRow icon="globe-outline" label="Website" value={socialDetails.website} iconColor="#666" />}
            </View>
          )}

          {/* Seller Status */}
          {sellerStatus === 'approved' ? (
            <View style={[styles.approvedStatusCard]}>
              <View style={styles.approvedStatusHeader}>
                <View style={styles.approvedIconContainer}>
                  <Ionicons name="shield-checkmark" size={28} color="#FFFFFF" />
                </View>
                <View style={styles.approvedStatusInfo}>
                  <Text style={styles.approvedStatusTitle}>Seller Account Approved</Text>
                  <Text style={styles.approvedStatusSubtitle}>Your seller application has been approved</Text>
                </View>
              </View>
              <View style={styles.approvedBadgeRow}>
                <View style={styles.approvedActiveBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#28A745" />
                  <Text style={styles.approvedActiveBadgeText}>Active</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.viewDetailsButton} onPress={() => router.push('/pages/sellerApplicationStatus' as any)} activeOpacity={0.7}>
                <Ionicons name="eye-outline" size={18} color="#0078D7" />
                <Text style={styles.viewDetailsButtonText}>View & Edit Details</Text>
                <Ionicons name="chevron-forward" size={18} color="#0078D7" />
              </TouchableOpacity>
            </View>
          ) : sellerStatus === 'pending' ? (
            <TouchableOpacity style={[styles.applicationStatusCard, { borderColor: '#FFE0B2' }]} onPress={() => router.push('/pages/sellerApplicationStatus' as any)}>
              <Ionicons name="time" size={24} color="#FFC107" />
              <View style={styles.applicationStatusInfo}>
                <Text style={styles.applicationStatusTitle}>Application Under Review</Text>
                <Text style={styles.applicationStatusSubtitle}>Tap to check status</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color="#666" />
            </TouchableOpacity>
          ) : sellerStatus === 'rejected' ? (
            <TouchableOpacity style={[styles.applicationStatusCard, { borderColor: '#F5C6CB' }]} onPress={() => router.push('/pages/becomeSellerForm' as any)}>
              <Ionicons name="alert-circle" size={24} color="#DC3545" />
              <View style={styles.applicationStatusInfo}>
                <Text style={styles.applicationStatusTitle}>Application Rejected</Text>
                <Text style={styles.applicationStatusSubtitle}>Tap to edit & resubmit</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color="#666" />
            </TouchableOpacity>
          ) : null}

          {/* Action Items */}
          <View style={styles.actionsContainer}>
            {businessDetails && (
              <ActionItem
                icon="business"
                title="View Business Profile"
                onPress={() => {
                  router.push({
                    pathname: '/pages/bussinesProfile' as any,
                    params: { business_id: businessDetails.id || tokenData?.business_id },
                  });
                }}
              />
            )}
            <ActionItem icon="person-outline" title="Update Profile Details" onPress={() => router.push('/pages/updateUserProfileScreen' as any)} />
            <ActionItem icon="key-outline" title="Update Password" onPress={() => router.push('/pages/upadetPasswordScreen' as any)} />
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
};

const DetailRow = ({ icon, label, value, iconColor }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; iconColor?: string }) => (
  <View style={styles.detailRow}>
    <Ionicons name={icon} size={18} color={iconColor || '#888'} style={{ marginRight: 10, marginTop: 2 }} />
    <View style={styles.detailRowContent}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={2}>{value || 'N/A'}</Text>
    </View>
  </View>
);

const LegalBadge = ({ label, verified }: { label: string; verified: boolean }) => (
  <View style={styles.legalBadgeItem}>
    <Ionicons name="checkmark-circle" size={14} color="#28A745" />
    <Text style={styles.legalBadgeText}>{label}</Text>
  </View>
);

const ActionItem = ({ icon, title, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; onPress: () => void }) => (
  <TouchableOpacity style={styles.actionItem} onPress={onPress} activeOpacity={0.7}>
    <Ionicons name={icon} size={22} color="#0078D7" />
    <Text style={styles.actionItemText}>{title}</Text>
    <Ionicons name="chevron-forward" size={20} color="#999" />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    backgroundColor: '#177DDF', paddingTop: 50, paddingBottom: 15, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#666' },
  scrollView: { flex: 1 },
  profileSection: {
    backgroundColor: '#FFFFFF', alignItems: 'center', paddingVertical: 24, marginBottom: 12,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  profileImageContainer: { position: 'relative', width: 110, height: 110, marginBottom: 14 },
  profileImage: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#E0E0E0', borderWidth: 3, borderColor: '#FFFFFF' },
  profileImagePlaceholder: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#FFFFFF' },
  cameraButton: {
    position: 'absolute', bottom: 2, right: 2, width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#177DDF', justifyContent: 'center', alignItems: 'center', elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4,
    borderWidth: 2, borderColor: '#FFFFFF',
  },
  userName: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  userEmail: { fontSize: 14, color: '#888', marginBottom: 2 },
  userPhone: { fontSize: 14, color: '#888' },
  sectionCard: {
    backgroundColor: '#FFFFFF', marginHorizontal: 16, marginBottom: 12, borderRadius: 14, padding: 16,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  sectionIconBg: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  detailRow: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F8F8F8' },
  detailRowContent: { flex: 1 },
  detailLabel: { fontSize: 12, color: '#888', marginBottom: 2 },
  detailValue: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  verifiedBadge: { backgroundColor: '#E8F5E9' },
  trustedBadge: { backgroundColor: '#FFF3E0' },
  approvedBadgePill: { backgroundColor: '#E3F2FD' },
  unverifiedBadge: { backgroundColor: '#F5F5F5' },
  statusBadgeText: { fontSize: 12, fontWeight: '600' },
  legalSummary: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  legalBadgeItem: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F0FFF0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  legalBadgeText: { fontSize: 11, fontWeight: '600', color: '#28A745' },
  applicationStatusCard: {
    backgroundColor: '#FFFFFF', marginHorizontal: 16, marginBottom: 12, borderRadius: 14, padding: 16,
    flexDirection: 'row', alignItems: 'center', elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
    borderWidth: 1, borderColor: '#FFE0B2',
  },
  applicationStatusInfo: { flex: 1, marginLeft: 12 },
  applicationStatusTitle: { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },
  applicationStatusSubtitle: { fontSize: 12, color: '#888', marginTop: 2 },
  approvedStatusCard: {
    backgroundColor: '#FFFFFF', marginHorizontal: 16, marginBottom: 12, borderRadius: 14, padding: 16,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4,
    borderWidth: 1.5, borderColor: '#C3E6CB',
  },
  approvedStatusHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  approvedIconContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#28A745', justifyContent: 'center', alignItems: 'center' },
  approvedStatusInfo: { flex: 1, marginLeft: 12 },
  approvedStatusTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  approvedStatusSubtitle: { fontSize: 13, color: '#666', marginTop: 3 },
  approvedBadgeRow: { flexDirection: 'row', marginBottom: 14 },
  approvedActiveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  approvedActiveBadgeText: { fontSize: 12, fontWeight: '600', color: '#28A745' },
  viewDetailsButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#E3F2FD', paddingVertical: 12, borderRadius: 10 },
  viewDetailsButtonText: { fontSize: 14, fontWeight: '600', color: '#0078D7' },
  actionsContainer: { paddingHorizontal: 16, marginTop: 4 },
  actionItem: {
    backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center',
    paddingVertical: 16, paddingHorizontal: 16, marginBottom: 8, borderRadius: 12,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  actionItemText: { flex: 1, fontSize: 15, fontWeight: '500', color: '#1A1A1A', marginLeft: 14 },
});

export default ProfileSettingsScreen;
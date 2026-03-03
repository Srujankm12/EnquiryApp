import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { jwtDecode } from 'jwt-decode';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
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

// ── Sub-components ─────────────────────────────────────────────────────────
const DetailRow = ({ icon, label, value, iconColor }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; iconColor?: string }) => (
  <View style={styles.detailRow}>
    <View style={styles.detailIconWrap}>
      <Ionicons name={icon} size={14} color={iconColor || '#0078D7'} />
    </View>
    <View style={styles.detailContent}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={2}>{value || 'N/A'}</Text>
    </View>
  </View>
);

const LegalBadge = ({ label }: { label: string }) => (
  <View style={styles.legalBadge}>
    <Ionicons name="checkmark-circle" size={13} color="#16A34A" />
    <Text style={styles.legalBadgeText}>{label}</Text>
  </View>
);

const SectionCard = ({ iconName, iconBg, iconColor, title, children, onEdit }: {
  iconName: any; iconBg: string; iconColor: string; title: string;
  children: React.ReactNode; onEdit?: () => void;
}) => (
  <View style={styles.sectionCard}>
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIconBg, { backgroundColor: iconBg }]}>
        <Ionicons name={iconName} size={16} color={iconColor} />
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
      {onEdit && (
        <TouchableOpacity style={styles.sectionEditBtn} onPress={onEdit}>
          <Ionicons name="create-outline" size={14} color="#0078D7" />
          <Text style={styles.sectionEditText}>Edit</Text>
        </TouchableOpacity>
      )}
    </View>
    {children}
  </View>
);

const ActionItem = ({ icon, iconBg, iconColor, title, subtitle, onPress, rightElement }: {
  icon: keyof typeof Ionicons.glyphMap; iconBg: string; iconColor: string;
  title: string; subtitle?: string; onPress: () => void; rightElement?: React.ReactNode;
}) => (
  <TouchableOpacity style={styles.actionItem} onPress={onPress} activeOpacity={0.75}>
    <View style={[styles.actionItemIconWrap, { backgroundColor: iconBg }]}>
      <Ionicons name={icon} size={20} color={iconColor} />
    </View>
    <View style={styles.actionItemContent}>
      <Text style={styles.actionItemTitle}>{title}</Text>
      {subtitle && <Text style={styles.actionItemSubtitle}>{subtitle}</Text>}
    </View>
    {rightElement || <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />}
  </TouchableOpacity>
);

// ── Main Screen ────────────────────────────────────────────────────────────
const ProfileSettingsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
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
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera roll permissions to change profile picture.');
    }
  };

  const fetchProfileData = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Authentication token not found. Please login again.');
        router.replace('/pages/loginMail' as any);
        return;
      }
      const decoded = jwtDecode<DecodedToken>(token);
      setTokenData(decoded);
      setUserId(decoded.user_id);

      try {
        const res = await axios.get(`${API_URL}/user/get/user/${decoded.user_id}`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.data) {
          const details = res.data.user || res.data;
          setUserDetails(details);
          const profileUrl = details.profile_image;
          if (profileUrl) {
            const fullImageUrl = getImageUri(profileUrl);
            setProfileImage(`${fullImageUrl}?t=${Date.now()}`);
          } else {
            setProfileImage(null);
          }
        }
      } catch (e: any) { console.error('Error fetching user details:', e?.message); }

      const normalizeStatus = (s: string | null): string | null => {
        if (!s) return null;
        const lower = s.toLowerCase().trim();
        if (lower === 'accepted' || lower === 'active') return 'approved';
        if (lower === 'applied' || lower === 'under_review') return 'pending';
        if (lower === 'declined') return 'rejected';
        return lower;
      };

      let status = normalizeStatus(await AsyncStorage.getItem('sellerStatus'));
      const businessId = decoded.business_id || await AsyncStorage.getItem('companyId');

      if (businessId) {
        try {
          const appRes = await fetch(`${API_URL}/business/application/get/${businessId}`, { headers: { 'Content-Type': 'application/json' } });
          if (appRes.ok) {
            const appData = await appRes.json();
            const appStatus = appData.details?.status || appData.application?.status || appData.status;
            if (appStatus) {
              status = normalizeStatus(appStatus);
              await AsyncStorage.setItem('sellerStatus', status || '');
            }
          }
        } catch {
          try {
            const bizCheckRes = await fetch(`${API_URL}/business/get/${businessId}`, { headers: { 'Content-Type': 'application/json' } });
            if (bizCheckRes.ok) {
              const bizCheck = await bizCheckRes.json();
              if (bizCheck.details?.is_business_approved || bizCheck.business?.is_business_approved) {
                status = 'approved';
                await AsyncStorage.setItem('sellerStatus', 'approved');
              }
            }
          } catch { }
        }

        if (status !== 'approved') {
          try {
            const statusRes = await fetch(`${API_URL}/business/status/${businessId}`, { headers: { 'Content-Type': 'application/json' } });
            if (statusRes.ok) {
              const statusData = await statusRes.json();
              if (statusData?.is_approved === true || statusData?.details?.is_approved === true || statusData?.is_business_approved === true) {
                status = 'approved';
                await AsyncStorage.setItem('sellerStatus', 'approved');
              }
            }
          } catch { }
        }

        await AsyncStorage.setItem('companyId', businessId);
      }

      setSellerStatus(status);

      if (businessId) {
        try {
          const completeRes = await fetch(`${API_URL}/business/get/complete/${businessId}`, { headers: { 'Content-Type': 'application/json' } });
          if (completeRes.ok) {
            const result = await completeRes.json();
            const details = result.details;
            setBusinessDetails({ ...details.business_details, id: businessId });
            setSocialDetails(details.social_details);
            setLegalDetails(details.legal_details);
          } else {
            const [bizRes, socialRes, legalRes] = await Promise.allSettled([
              fetch(`${API_URL}/business/get/${businessId}`, { headers: { 'Content-Type': 'application/json' } }),
              fetch(`${API_URL}/business/social/get/${businessId}`, { headers: { 'Content-Type': 'application/json' } }),
              fetch(`${API_URL}/business/legal/get/${businessId}`, { headers: { 'Content-Type': 'application/json' } }),
            ]);
            if (bizRes.status === 'fulfilled' && bizRes.value.ok) { const r = await bizRes.value.json(); setBusinessDetails({ ...r.details, id: businessId }); }
            if (socialRes.status === 'fulfilled' && socialRes.value.ok) { const r = await socialRes.value.json(); setSocialDetails(r.details); }
            if (legalRes.status === 'fulfilled' && legalRes.value.ok) { const r = await legalRes.value.json(); setLegalDetails(r.details); }
          }
        } catch { }
      }
    } catch (error: any) {
      console.error('Error in fetchProfileData:', error?.message);
    } finally {
      if (showLoader) setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); fetchProfileData(false); };
  const handleBack = () => router.back();

  const uploadImageToS3 = async (s3Url: string, imageUri: string) => {
    const response = await fetch(imageUri);
    const blob = await response.blob();
    if (blob.size === 0) throw new Error('Blob is empty');
    const uploadResponse = await fetch(s3Url, { method: 'PUT', body: blob, headers: { 'Content-Type': blob.type || 'image/jpeg' } });
    if (!uploadResponse.ok) throw new Error(`S3 upload failed with status ${uploadResponse.status}`);
    return true;
  };

  const handleImagePick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setUploadingImage(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) { Alert.alert('Error', 'Authentication token not found.'); setUploadingImage(false); return; }
      const presignedUrlRes = await axios.put(`${API_URL}/user/update/image/${userId}`, null, { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 });
      const s3PresignedUrl = presignedUrlRes.data.url;
      if (!s3PresignedUrl) throw new Error('Invalid response from server: missing presigned URL');
      await uploadImageToS3(s3PresignedUrl, asset.uri);
      await fetchProfileData(false);
      setUploadingImage(false);
      Alert.alert('Success', 'Profile picture updated successfully!');
    } catch (error: any) {
      let errorMessage = 'Failed to update profile picture. Please try again.';
      if (error.code === 'ERR_NETWORK') errorMessage = 'Network error. Please check your connection.';
      else if (error.response) errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
      Alert.alert('Error', errorMessage);
      setUploadingImage(false);
    }
  };

  const getUserName = () => {
    if (userDetails?.first_name) return `${userDetails.first_name}${userDetails.last_name ? ' ' + userDetails.last_name : ''}`;
    return tokenData?.user_name || 'N/A';
  };
  const getUserEmail = () => userDetails?.email || 'N/A';
  const getUserPhone = () => userDetails?.phone || '';

  // ── Seller Status Card ─────────────────────────────────────────────────
  const renderSellerStatusCard = () => {
    if (sellerStatus === 'approved') {
      return (
        <View style={styles.sellerApprovedCard}>
          <View style={styles.sellerApprovedHeader}>
            <View style={styles.sellerApprovedIconWrap}>
              <Ionicons name="shield-checkmark" size={24} color="#fff" />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.sellerApprovedTitle}>Seller Account Active</Text>
              <Text style={styles.sellerApprovedSubtitle}>Your application has been approved</Text>
            </View>
            <View style={styles.activePill}>
              <View style={styles.activeDot} />
              <Text style={styles.activePillText}>Active</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.sellerActionBtn}
            onPress={() => router.push('/pages/sellerApplicationStatus' as any)}
            activeOpacity={0.8}
          >
            <Ionicons name="eye-outline" size={16} color="#0078D7" />
            <Text style={styles.sellerActionBtnText}>View & Edit Details</Text>
            <Ionicons name="chevron-forward" size={16} color="#0078D7" />
          </TouchableOpacity>
        </View>
      );
    }
    if (sellerStatus === 'pending') {
      return (
        <TouchableOpacity
          style={[styles.sellerStatusCard, { borderColor: '#FDE68A' }]}
          onPress={() => router.push('/pages/sellerApplicationStatus' as any)}
        >
          <View style={[styles.sellerStatusIconWrap, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="time" size={20} color="#F59E0B" />
          </View>
          <View style={{ flex: 1, marginHorizontal: 12 }}>
            <Text style={styles.sellerStatusTitle}>Application Under Review</Text>
            <Text style={styles.sellerStatusSubtitle}>Tap to check status</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
        </TouchableOpacity>
      );
    }
    if (sellerStatus === 'rejected') {
      return (
        <TouchableOpacity
          style={[styles.sellerStatusCard, { borderColor: '#FECACA' }]}
          onPress={() => router.push('/pages/becomeSellerForm' as any)}
        >
          <View style={[styles.sellerStatusIconWrap, { backgroundColor: '#FEF2F2' }]}>
            <Ionicons name="alert-circle" size={20} color="#EF4444" />
          </View>
          <View style={{ flex: 1, marginHorizontal: 12 }}>
            <Text style={styles.sellerStatusTitle}>Application Rejected</Text>
            <Text style={styles.sellerStatusSubtitle}>Tap to edit & resubmit</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
        </TouchableOpacity>
      );
    }
    return null;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0060B8" />

      {/* ── Premium Header ── */}
      <View style={[styles.headerWrapper, { paddingTop: insets.top }]}>
        <View style={styles.orb1} /><View style={styles.orb2} /><View style={styles.orb3} />
        <View style={styles.headerInner}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.eyebrow}>ACCOUNT</Text>
            <Text style={styles.headerTitle}>Profile Settings</Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <View style={styles.loaderCard}>
            <ActivityIndicator size="large" color="#0078D7" />
            <Text style={styles.loaderText}>Loading profile...</Text>
          </View>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0078D7']} tintColor="#0078D7" />}
        >
          {/* ── Profile Hero ── */}
          <View style={styles.profileHeroCard}>
            <TouchableOpacity
              style={styles.avatarWrap}
              onPress={handleImagePick}
              disabled={uploadingImage}
              activeOpacity={0.8}
            >
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.avatar} resizeMode="cover" />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={44} color="#0078D7" />
                </View>
              )}
              <View style={styles.cameraBtn}>
                {uploadingImage ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="camera" size={14} color="#fff" />
                )}
              </View>
            </TouchableOpacity>

            <Text style={styles.userName}>{getUserName()}</Text>
            <Text style={styles.userEmail}>{getUserEmail()}</Text>
            {getUserPhone() ? <Text style={styles.userPhone}>{getUserPhone()}</Text> : null}

            {/* Quick stats row */}
            {businessDetails && (
              <View style={styles.statsStrip}>
                <View style={styles.statItem}>
                  <View style={[styles.statDot, { backgroundColor: businessDetails.is_business_verified ? '#16A34A' : '#94A3B8' }]} />
                  <Text style={styles.statLabel}>{businessDetails.is_business_verified ? 'Verified' : 'Not Verified'}</Text>
                </View>
                <View style={styles.statSep} />
                <View style={styles.statItem}>
                  <View style={[styles.statDot, { backgroundColor: businessDetails.is_business_trusted ? '#F59E0B' : '#94A3B8' }]} />
                  <Text style={styles.statLabel}>{businessDetails.is_business_trusted ? 'Trusted' : 'Not Trusted'}</Text>
                </View>
                <View style={styles.statSep} />
                <View style={styles.statItem}>
                  <View style={[styles.statDot, { backgroundColor: sellerStatus === 'approved' ? '#0078D7' : '#94A3B8' }]} />
                  <Text style={styles.statLabel}>{sellerStatus === 'approved' ? 'Seller' : 'Buyer'}</Text>
                </View>
              </View>
            )}
          </View>

          {/* ── Seller Status ── */}
          {renderSellerStatusCard()}

          {/* ── Quick Actions ── */}
          <Text style={styles.groupLabel}>QUICK ACTIONS</Text>
          <View style={styles.actionsCard}>
            {businessDetails && (
              <ActionItem
                icon="business"
                iconBg="#EBF5FF"
                iconColor="#0078D7"
                title="View Business Profile"
                subtitle="See your public business page"
                onPress={() => router.push({ pathname: '/pages/bussinesProfile' as any, params: { business_id: businessDetails.id || tokenData?.business_id } })}
              />
            )}
            <ActionItem
              icon="person-outline"
              iconBg="#F0FDF4"
              iconColor="#16A34A"
              title="Update Profile Details"
              subtitle="Edit your personal information"
              onPress={() => router.push('/pages/updateUserProfileScreen' as any)}
            />
            <ActionItem
              icon="key-outline"
              iconBg="#FDF4FF"
              iconColor="#9333EA"
              title="Update Password"
              subtitle="Change your account password"
              onPress={() => router.push('/pages/upadetPasswordScreen' as any)}
            />
          </View>

          {/* ── Login Details ── */}
          <Text style={styles.groupLabel}>LOGIN DETAILS</Text>
          <SectionCard iconName="key-outline" iconBg="#EBF5FF" iconColor="#0078D7" title="Account Information">
            <DetailRow icon="person-outline" label="Full Name" value={getUserName()} />
            <DetailRow icon="mail-outline" label="Email Address" value={getUserEmail()} />
            {getUserPhone() ? <DetailRow icon="call-outline" label="Phone Number" value={getUserPhone()} /> : null}
            <DetailRow icon="finger-print-outline" label="User ID" value={tokenData?.user_id?.substring(0, 8) + '...' || 'N/A'} />
          </SectionCard>

          {/* ── Business Information ── */}
          {businessDetails && (
            <>
              <Text style={styles.groupLabel}>BUSINESS</Text>
              <SectionCard
                iconName="business-outline"
                iconBg="#DCFCE7"
                iconColor="#16A34A"
                title="Business Information"
                onEdit={() => router.push({ pathname: '/pages/editBusinessDetails' as any, params: { business_id: businessDetails.id || tokenData?.business_id } })}
              >
                <DetailRow icon="storefront-outline" label="Business Name" value={businessDetails.name} />
                <DetailRow icon="mail-outline" label="Business Email" value={businessDetails.email} />
                <DetailRow icon="call-outline" label="Business Phone" value={businessDetails.phone} />
                <DetailRow icon="location-outline" label="Location" value={`${businessDetails.city || ''}, ${businessDetails.state || ''}`} />
                {businessDetails.pincode && <DetailRow icon="navigate-outline" label="Pincode" value={businessDetails.pincode} />}
                {businessDetails.business_type && <DetailRow icon="briefcase-outline" label="Business Type" value={businessDetails.business_type} />}
              </SectionCard>

              {/* ── Business Verification ── */}
              <SectionCard iconName="shield-checkmark-outline" iconBg="#DCFCE7" iconColor="#16A34A" title="Verification Status">
                <View style={styles.verificationBadgesRow}>
                  <View style={[styles.verifyBadge, { borderColor: businessDetails.is_business_verified ? '#16A34A' : '#E2E8F0', backgroundColor: businessDetails.is_business_verified ? '#DCFCE7' : '#F8FAFC' }]}>
                    <Ionicons name={businessDetails.is_business_verified ? 'checkmark-circle' : 'close-circle'} size={15} color={businessDetails.is_business_verified ? '#16A34A' : '#94A3B8'} />
                    <Text style={[styles.verifyBadgeText, { color: businessDetails.is_business_verified ? '#16A34A' : '#94A3B8' }]}>
                      {businessDetails.is_business_verified ? 'Verified' : 'Not Verified'}
                    </Text>
                  </View>
                  <View style={[styles.verifyBadge, { borderColor: businessDetails.is_business_trusted ? '#F59E0B' : '#E2E8F0', backgroundColor: businessDetails.is_business_trusted ? '#FEF3C7' : '#F8FAFC' }]}>
                    <Ionicons name={businessDetails.is_business_trusted ? 'ribbon' : 'ribbon-outline'} size={15} color={businessDetails.is_business_trusted ? '#F59E0B' : '#94A3B8'} />
                    <Text style={[styles.verifyBadgeText, { color: businessDetails.is_business_trusted ? '#F59E0B' : '#94A3B8' }]}>
                      {businessDetails.is_business_trusted ? 'Trusted' : 'Not Trusted'}
                    </Text>
                  </View>
                  <View style={[styles.verifyBadge, { borderColor: businessDetails.is_business_approved ? '#0078D7' : '#E2E8F0', backgroundColor: businessDetails.is_business_approved ? '#EBF5FF' : '#F8FAFC' }]}>
                    <Ionicons name={businessDetails.is_business_approved ? 'shield-checkmark' : 'shield-outline'} size={15} color={businessDetails.is_business_approved ? '#0078D7' : '#94A3B8'} />
                    <Text style={[styles.verifyBadgeText, { color: businessDetails.is_business_approved ? '#0078D7' : '#94A3B8' }]}>
                      {businessDetails.is_business_approved ? 'Approved' : 'Pending'}
                    </Text>
                  </View>
                </View>
                {legalDetails && (
                  <View style={styles.legalBadgesWrap}>
                    {legalDetails.pan && <LegalBadge label="PAN" />}
                    {legalDetails.gst && <LegalBadge label="GST" />}
                    {legalDetails.msme && <LegalBadge label="MSME" />}
                    {legalDetails.aadhaar && <LegalBadge label="Aadhaar" />}
                    {legalDetails.fassi && <LegalBadge label="FSSAI" />}
                    {legalDetails.export_import && <LegalBadge label="Export/Import" />}
                  </View>
                )}
              </SectionCard>
            </>
          )}

          {/* ── Social Media ── */}
          {socialDetails && (socialDetails.linkedin || socialDetails.instagram || socialDetails.facebook || socialDetails.website || socialDetails.youtube) && (
            <>
              <Text style={styles.groupLabel}>SOCIAL MEDIA</Text>
              <SectionCard
                iconName="share-social-outline"
                iconBg="#FCE7F3"
                iconColor="#EC4899"
                title="Social Media URLs"
                onEdit={() => router.push({ pathname: '/pages/editSocialMedia' as any, params: { business_id: businessDetails?.id || tokenData?.business_id } })}
              >
                {socialDetails.instagram && <DetailRow icon="logo-instagram" label="Instagram" value={socialDetails.instagram} iconColor="#E4405F" />}
                {socialDetails.facebook && <DetailRow icon="logo-facebook" label="Facebook" value={socialDetails.facebook} iconColor="#1877F2" />}
                {socialDetails.linkedin && <DetailRow icon="logo-linkedin" label="LinkedIn" value={socialDetails.linkedin} iconColor="#0A66C2" />}
                {socialDetails.youtube && <DetailRow icon="logo-youtube" label="YouTube" value={socialDetails.youtube} iconColor="#FF0000" />}
                {socialDetails.website && <DetailRow icon="globe-outline" label="Website" value={socialDetails.website} iconColor="#64748B" />}
              </SectionCard>
            </>
          )}

          <View style={{ height: 20 }} />
        </ScrollView>
      )}
    </View>
  );
};

export default ProfileSettingsScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9FC' },

  // ── Premium Header ──
  headerWrapper: {
    backgroundColor: '#0060B8', paddingHorizontal: 20, paddingBottom: 22,
    overflow: 'hidden', shadowColor: '#003E80',
    shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 24, elevation: 18,
  },
  orb1: { position: 'absolute', width: 280, height: 280, borderRadius: 140, backgroundColor: 'rgba(255,255,255,0.06)', top: -100, right: -70 },
  orb2: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.04)', bottom: 10, left: -60 },
  orb3: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(100,180,255,0.08)', top: 20, right: width * 0.35 },
  headerInner: { flexDirection: 'row', alignItems: 'center', paddingTop: 16 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  eyebrow: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.65)', letterSpacing: 2, marginBottom: 2 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },

  // ── Loader ──
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  loaderCard: { backgroundColor: '#fff', borderRadius: 20, padding: 32, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 6 },
  loaderText: { marginTop: 12, fontSize: 13, color: '#94A3B8', fontWeight: '500' },

  // ── Profile Hero ──
  profileHeroCard: {
    backgroundColor: '#fff', marginHorizontal: 16, marginTop: 20, borderRadius: 24,
    alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20,
    shadowColor: '#1B4FBF', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1, shadowRadius: 20, elevation: 8,
    borderWidth: 1, borderColor: '#F0F4F8',
  },
  avatarWrap: { position: 'relative', marginBottom: 14 },
  avatar: { width: 100, height: 100, borderRadius: 30, backgroundColor: '#E2E8F0', borderWidth: 4, borderColor: '#EBF5FF' },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 30, backgroundColor: '#EBF5FF', justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#DBEAFE' },
  cameraBtn: { position: 'absolute', bottom: -4, right: -4, width: 30, height: 30, borderRadius: 15, backgroundColor: '#0078D7', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff', shadowColor: '#0078D7', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4, elevation: 4 },
  userName: { fontSize: 20, fontWeight: '800', color: '#0F172A', letterSpacing: -0.3, marginBottom: 4 },
  userEmail: { fontSize: 13, color: '#64748B', fontWeight: '500', marginBottom: 2 },
  userPhone: { fontSize: 13, color: '#94A3B8', fontWeight: '500' },

  statsStrip: { flexDirection: 'row', alignItems: 'center', marginTop: 18, backgroundColor: '#F7F9FC', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 10, width: '100%', borderWidth: 1, borderColor: '#F0F4F8' },
  statItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  statDot: { width: 8, height: 8, borderRadius: 4 },
  statLabel: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  statSep: { width: 1, height: 20, backgroundColor: '#E2E8F0' },

  // ── Seller Status Cards ──
  sellerApprovedCard: {
    marginHorizontal: 16, marginTop: 14, backgroundColor: '#fff', borderRadius: 20,
    padding: 16, shadowColor: '#16A34A', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 14, elevation: 5,
    borderWidth: 1.5, borderColor: '#BBF7D0',
  },
  sellerApprovedHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  sellerApprovedIconWrap: { width: 46, height: 46, borderRadius: 16, backgroundColor: '#16A34A', justifyContent: 'center', alignItems: 'center' },
  sellerApprovedTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  sellerApprovedSubtitle: { fontSize: 12, color: '#64748B', marginTop: 2 },
  activePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16A34A' },
  activePillText: { fontSize: 11, fontWeight: '800', color: '#16A34A' },
  sellerActionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#EBF5FF', paddingVertical: 12, borderRadius: 12 },
  sellerActionBtnText: { fontSize: 14, fontWeight: '700', color: '#0078D7' },

  sellerStatusCard: {
    marginHorizontal: 16, marginTop: 14, backgroundColor: '#fff', borderRadius: 16,
    padding: 14, flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    borderWidth: 1,
  },
  sellerStatusIconWrap: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  sellerStatusTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  sellerStatusSubtitle: { fontSize: 12, color: '#94A3B8', marginTop: 2 },

  // ── Group Labels ──
  groupLabel: { fontSize: 10, fontWeight: '800', color: '#94A3B8', letterSpacing: 2, marginHorizontal: 20, marginTop: 22, marginBottom: 6 },

  // ── Actions Card ──
  actionsCard: { marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 20, shadowColor: '#1B4FBF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 14, elevation: 4, borderWidth: 1, borderColor: '#F0F4F8', overflow: 'hidden' },
  actionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  actionItemIconWrap: { width: 42, height: 42, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  actionItemContent: { flex: 1, marginHorizontal: 14 },
  actionItemTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  actionItemSubtitle: { fontSize: 12, color: '#94A3B8', marginTop: 2 },

  // ── Section Card ──
  sectionCard: {
    backgroundColor: '#fff', borderRadius: 20, marginHorizontal: 16,
    shadowColor: '#1B4FBF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 14, elevation: 4,
    borderWidth: 1, borderColor: '#F0F4F8', padding: 18,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  sectionIconBg: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { flex: 1, fontSize: 15, fontWeight: '800', color: '#0F172A', letterSpacing: -0.2 },
  sectionEditBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EBF5FF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  sectionEditText: { fontSize: 12, fontWeight: '700', color: '#0078D7' },

  detailRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, gap: 12, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  detailIconWrap: { width: 28, height: 28, borderRadius: 9, backgroundColor: '#EBF5FF', justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  detailContent: { flex: 1 },
  detailLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '600', marginBottom: 3, letterSpacing: 0.3, textTransform: 'uppercase' },
  detailValue: { fontSize: 14, fontWeight: '700', color: '#0F172A' },

  // ── Verification ──
  verificationBadgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  verifyBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12, borderWidth: 1.5 },
  verifyBadgeText: { fontSize: 12, fontWeight: '700' },

  legalBadgesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  legalBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  legalBadgeText: { fontSize: 12, fontWeight: '700', color: '#16A34A' },
});
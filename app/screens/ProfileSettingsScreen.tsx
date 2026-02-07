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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import Constants from "expo-constants";

const API_URL = Constants.expoConfig?.extra?.API_URL;
const S3_FETCH_URL = Constants.expoConfig?.extra?.S3_FETCH_URL;

interface DecodedToken {
  user_id: string;
  exp?: number;
}

const ProfileSettingsScreen: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const [userId, setUserId] = useState<string>('');
  const [userDetails, setUserDetails] = useState<any>(null);
  const [companyDetails, setCompanyDetails] = useState<any>(null);
  const [sellerStatus, setSellerStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchProfileData();
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant camera roll permissions to change profile picture.'
      );
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

      const decodedToken = jwtDecode<DecodedToken>(token);
      setUserId(decodedToken.user_id);

      // Fetch user details
      const res = await axios.get(
        `${API_URL}/get/user/details/${decodedToken.user_id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.status === 'success') {
        const details = res.data.data.user_details;
        setUserDetails(details);

        if (details.user_profile_url) {
          const fullImageUrl = `${S3_FETCH_URL}/${details.user_profile_url}`;
          setProfileImage(`${fullImageUrl}?timestamp=${Date.now()}`);
        } else {
          setProfileImage(null);
        }
      }

      // Fetch seller status
      const status = await AsyncStorage.getItem('sellerStatus');
      setSellerStatus(status);

      // Fetch company details if seller
      if (status === 'approved' || status === 'pending') {
        try {
          const companyRes = await axios.get(
            `${API_URL}/company/get/user/${decodedToken.user_id}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const compData = companyRes.data.data?.company || companyRes.data.data;
          setCompanyDetails(compData);
        } catch (e) {
          // No company found
        }
      }

      if (showLoader) setLoading(false);
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      if (showLoader) setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const uploadImageToS3 = async (s3Url: string, imageUri: string) => {
    const response = await fetch(imageUri);
    const blob = await response.blob();
    const uploadResponse = await fetch(s3Url, {
      method: 'PUT',
      body: blob,
      headers: { 'Content-Type': blob.type || 'image/jpeg' },
    });
    if (!uploadResponse.ok) {
      throw new Error(`S3 upload failed with status ${uploadResponse.status}`);
    }
    return true;
  };

  const handleImagePick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setUploadingImage(true);
        const selectedImageUri = result.assets[0].uri;

        const token = await AsyncStorage.getItem('token');
        if (!token) {
          Alert.alert('Error', 'Authentication token not found.');
          setUploadingImage(false);
          return;
        }

        const presignedUrlRes = await axios.get(
          `${API_URL}/generate/user/${userId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000,
          }
        );

        const s3PresignedUrl = presignedUrlRes.data.data.url;
        if (!s3PresignedUrl) {
          throw new Error('Invalid response from server: missing presigned URL');
        }

        await uploadImageToS3(s3PresignedUrl, selectedImageUri);

        const updateRes = await axios.put(
          `${API_URL}/update/user/profile/image`,
          { user_id: userId },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            timeout: 10000,
          }
        );

        if (updateRes.data.status === 'success') {
          await fetchProfileData(false);
          setUploadingImage(false);
          Alert.alert('Success', 'Profile picture updated successfully!');
        } else {
          throw new Error('Failed to update profile image');
        }
      }
    } catch (error: any) {
      console.error('Error in handleImagePick:', error);
      let errorMessage = 'Failed to update profile picture. Please try again.';
      if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        errorMessage = 'Network error. Please check your connection.';
      } else if (error.response) {
        errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
      }
      Alert.alert('Error', errorMessage);
      setUploadingImage(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#177DDF" translucent={false} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile Settings</Text>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#177DDF" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Profile Image Section */}
          <View style={styles.profileSection}>
            <View style={styles.profileImageContainer}>
              {profileImage ? (
                <Image
                  source={{ uri: profileImage }}
                  style={styles.profileImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <Ionicons name="person" size={80} color="#CCC" />
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
                  <Ionicons name="camera" size={20} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>

            {/* User Info Below Image */}
            {userDetails && (
              <View style={styles.userInfoBelowImage}>
                <Text style={styles.userName}>{userDetails.user_name}</Text>
                <Text style={styles.userEmail}>{userDetails.user_email}</Text>
                {userDetails.user_phone && (
                  <Text style={styles.userPhone}>{userDetails.user_phone}</Text>
                )}
              </View>
            )}
          </View>

          {/* User Details Card */}
          {userDetails && (
            <View style={styles.detailCard}>
              <View style={styles.detailCardHeader}>
                <Ionicons name="person" size={20} color="#0078D7" />
                <Text style={styles.detailCardTitle}>Personal Information</Text>
              </View>
              <DetailRow label="Name" value={userDetails.user_name} />
              <DetailRow label="Email" value={userDetails.user_email} />
              {userDetails.user_phone && (
                <DetailRow label="Phone" value={userDetails.user_phone} />
              )}
            </View>
          )}

          {/* Company Details Card (for sellers) */}
          {companyDetails && (
            <View style={styles.detailCard}>
              <View style={styles.detailCardHeader}>
                <Ionicons name="business" size={20} color="#0078D7" />
                <Text style={styles.detailCardTitle}>Company Information</Text>
              </View>
              <DetailRow label="Company" value={companyDetails.company_name} />
              <DetailRow label="Email" value={companyDetails.company_email} />
              <DetailRow label="Phone" value={companyDetails.company_phone} />
              <DetailRow
                label="Location"
                value={`${companyDetails.company_city}, ${companyDetails.company_state}`}
              />
              <DetailRow label="Pincode" value={companyDetails.company_pincode} />
              <View style={styles.badgesInCard}>
                {companyDetails.is_verified && (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="#28A745" />
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                )}
                {companyDetails.is_approved && (
                  <View style={styles.approvedBadge}>
                    <Ionicons name="shield-checkmark" size={14} color="#0078D7" />
                    <Text style={styles.approvedText}>Approved</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Seller Status */}
          {sellerStatus && sellerStatus !== 'approved' && (
            <TouchableOpacity
              style={styles.applicationStatusCard}
              onPress={() => router.push('/pages/sellerApplicationStatus' as any)}
            >
              <Ionicons
                name={sellerStatus === 'pending' ? 'time' : 'alert-circle'}
                size={24}
                color={sellerStatus === 'pending' ? '#FFC107' : '#DC3545'}
              />
              <View style={styles.applicationStatusInfo}>
                <Text style={styles.applicationStatusTitle}>
                  Seller Application: {sellerStatus.charAt(0).toUpperCase() + sellerStatus.slice(1)}
                </Text>
                <Text style={styles.applicationStatusSubtitle}>
                  Tap to view details
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color="#666" />
            </TouchableOpacity>
          )}

          {/* Menu Items */}
          <View style={styles.menuContainer}>
            <MenuItem
              title="Update Profile Details"
              onPress={() => router.push('/pages/updateUserProfileScreen' as any)}
            />
            <MenuItem
              title="Update Password"
              onPress={() => router.push('/pages/upadetPasswordScreen' as any)}
            />
            {sellerStatus === 'approved' && (
              <MenuItem
                title="Seller Dashboard"
                onPress={() => router.push('/(seller)' as any)}
              />
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
};

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value || 'N/A'}</Text>
  </View>
);

const MenuItem = ({ title, onPress }: { title: string; onPress: () => void }) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
    <Text style={styles.menuItemText}>{title}</Text>
    <Ionicons name="chevron-forward" size={22} color="#666" />
  </TouchableOpacity>
);

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
  profileSection: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 12,
  },
  profileImageContainer: {
    position: 'relative',
    width: 120,
    height: 120,
    marginBottom: 12,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E0E0E0',
  },
  profileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#177DDF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userInfoBelowImage: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#888',
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 14,
    color: '#888',
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  detailCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detailCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F8F8',
  },
  detailLabel: {
    fontSize: 13,
    color: '#888',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  badgesInCard: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#28A745',
  },
  approvedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  approvedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0078D7',
  },
  applicationStatusCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  applicationStatusInfo: {
    flex: 1,
    marginLeft: 12,
  },
  applicationStatusTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  applicationStatusSubtitle: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  menuContainer: {
    paddingHorizontal: 16,
    marginTop: 4,
  },
  menuItem: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    flex: 1,
  },
});

export default ProfileSettingsScreen;

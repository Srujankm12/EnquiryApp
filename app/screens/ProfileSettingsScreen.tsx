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

interface ProfileData {
  profileImage: string | null;
  businessName: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
}

interface MenuItem {
  id: string;
  title: string;
  route: string;
  icon?: string;
}

interface DecodedToken {
  user_id: string;
  exp?: number;
}

const ProfileSettingsScreen: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const [userId, setUserId] = useState<string>('');

  const menuItems: MenuItem[] = [
    {
      id: '1',
      title: 'Business Information',
      route: '/pages/bussinesProfile',
    },
    {
      id: '2',
      title: 'Physical Business Directory',
      route: '/pages/physicalBusinessDirectory',
    },
    {
      id: '3',
      title: 'Business Verification',
      route: '/pages/businessVerification',
    },
    {
      id: '4',
      title: 'Social Media URL',
      route: '/pages/socialMediaUrl',
    },
    {
      id: '5',
      title: 'Login Details',
      route: '/pages/loginDetails',
    },
  ];

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

  /**
   * Fetch profile data from backend
   * @param showLoader - Whether to show the full page loader (default: true)
   */
  const fetchProfileData = async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      }
      
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        Alert.alert('Error', 'Authentication token not found. Please login again.');
        router.replace('/login' as any);
        return;
      }

      const decodedToken = jwtDecode<DecodedToken>(token);
      console.log('Decoded Token:', decodedToken);
      
      setUserId(decodedToken.user_id);

      const res = await axios.get(
        `${API_URL}/get/user/details/${decodedToken.user_id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log('User Details Response:', res.data);

      if (res.data.status === 'success') {
        const userDetails = res.data.data.user_details;
        
        // Check if profile image exists and fetch it from S3
        if (userDetails.user_profile_url) {
          console.log('Profile Image Path:', userDetails.user_profile_url);
          
          // Combine S3 base URL with the image path
          const fullImageUrl = `${S3_FETCH_URL}/${userDetails.user_profile_url}`;
          console.log('Full S3 Image URL:', fullImageUrl);
          
          // Add cache busting to force image refresh
          // This prevents showing cached old images
          const imageUrlWithCacheBust = `${fullImageUrl}?timestamp=${Date.now()}`;
          setProfileImage(imageUrlWithCacheBust);
        } else {
          console.log('No profile image found');
          setProfileImage(null);
        }
      }

      if (showLoader) {
        setLoading(false);
      }
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      
      if (showLoader) {
        setLoading(false);
      }
    }
  };

  const handleBack = () => {
    router.back();
  };

  const uploadImageToS3 = async (s3Url: string, imageUri: string) => {
    try {
      console.log('Starting S3 upload...');
      console.log('S3 URL:', s3Url);
      console.log('Image URI:', imageUri);

      // Fetch the image as a blob
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      console.log('Blob size:', blob.size);
      console.log('Blob type:', blob.type);

      // Upload to S3 using PUT request with fetch (not axios)
      // Axios can have issues with binary data on mobile
      const uploadResponse = await fetch(s3Url, {
        method: 'PUT',
        body: blob,
        headers: {
          'Content-Type': blob.type || 'image/jpeg',
        },
      });

      console.log('S3 Upload Response Status:', uploadResponse.status);
      
      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('S3 Upload Error:', errorText);
        throw new Error(`S3 upload failed with status ${uploadResponse.status}`);
      }

      console.log('S3 upload successful');
      return true;
    } catch (error: any) {
      console.error('Error uploading to S3:', error);
      console.error('S3 Upload Error Details:', {
        message: error.message,
        stack: error.stack,
      });
      throw error;
    }
  };

  const handleImagePick = async () => {
    try {
      console.log('Opening image picker...');
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setUploadingImage(true);
        const selectedImageUri = result.assets[0].uri;
        console.log('Selected image URI:', selectedImageUri);

        // Step 1: Get S3 presigned URL from backend
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          Alert.alert('Error', 'Authentication token not found.');
          setUploadingImage(false);
          return;
        }

        console.log('Step 1: Getting presigned URL for user:', userId);
        console.log('API URL:', `${API_URL}/generate/user/${userId}`);
        
        const presignedUrlRes = await axios.get(
          `${API_URL}/generate/user/${userId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            timeout: 10000, // 10 second timeout
          }
        );

        console.log('Presigned URL Response:', presignedUrlRes.data);

        // Extract S3 URL from response
        const s3PresignedUrl = presignedUrlRes.data.data.url;
        
        console.log('S3 Presigned URL:', s3PresignedUrl);

        if (!s3PresignedUrl) {
          throw new Error('Invalid response from server: missing presigned URL');
        }

        // Step 2: Upload image to S3
        console.log('Step 2: Uploading image to S3...');
        await uploadImageToS3(s3PresignedUrl, selectedImageUri);

        // Step 3: Update profile image path in backend
        console.log('Step 3: Updating profile image in backend...');
        console.log('Update URL:', `${API_URL}/update/user/profile/image`);
        
        const updateRes = await axios.put(
          `${API_URL}/update/user/profile/image`,
          {
            user_id: userId,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            timeout: 10000, // 10 second timeout
          }
        );

        console.log('Update Response:', updateRes.data);

        if (updateRes.data.status === 'success') {
          console.log('Profile image updated successfully, refreshing...');
          
          // Refetch profile to get the actual S3 URL without showing full page loader
          // This will update the profile image from S3
          await fetchProfileData(false);
          
          setUploadingImage(false);
          Alert.alert('Success', 'Profile picture updated successfully!');
        } else {
          throw new Error('Failed to update profile image');
        }
      }
    } catch (error: any) {
      console.error('Error in handleImagePick:', error);
      console.error('Full Error Object:', {
        message: error.message,
        code: error.code,
        config: error.config,
        response: error.response?.data,
        status: error.response?.status,
        request: error.request,
      });
      
      let errorMessage = 'Failed to update profile picture. Please try again.';
      
      // Provide more specific error messages
      if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        errorMessage = 'Network error. Please check:\n1. Your internet connection\n2. API URL is correct\n3. Backend server is running';
      } else if (error.response) {
        errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Error', errorMessage);
      setUploadingImage(false);
    }
  };

  const handleMenuItemPress = (route: string) => {
    router.push(route as any);
  };

  const renderMenuItem = (item: MenuItem) => (
    <TouchableOpacity
      key={item.id}
      style={styles.menuItem}
      onPress={() => handleMenuItemPress(item.route)}
      activeOpacity={0.7}
    >
      <Text style={styles.menuItemText}>{item.title}</Text>
      <Ionicons name="chevron-forward" size={22} color="#666" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#177DDF"
        translucent={false}
      />

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
        <View style={styles.content}>
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

              {/* Camera Button */}
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
          </View>

          {/* Menu Items */}
          <View style={styles.menuContainer}>
            {menuItems.map((item) => renderMenuItem(item))}
          </View>
        </View>
      )}
    </View>
  );
};

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
  content: {
    flex: 1,
  },
  profileSection: {
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 16,
  },
  profileImageContainer: {
    position: 'relative',
    width: 160,
    height: 160,
  },
  profileImage: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#E0E0E0',
  },
  profileImagePlaceholder: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#177DDF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  menuContainer: {
    paddingHorizontal: 16,
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
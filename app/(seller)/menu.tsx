import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import Constants from 'expo-constants';

const { width } = Dimensions.get('window');
const API_URL = Constants.expoConfig?.extra?.API_URL;
const S3_URL = Constants.expoConfig?.extra?.S3_FETCH_URL;

interface MenuItem {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  color: string;
  gradientColors: string[];
}

const SellerMenuScreen: React.FC = () => {
  const [pressedItem, setPressedItem] = useState<string | null>(null);
  const [companyDetails, setCompanyDetails] = useState<any>(null);
  const [userDetails, setUserDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSellerData();
  }, []);

  const fetchSellerData = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const decoded: any = jwtDecode(token);
      const userId = decoded.user_id;

      // Fetch user details
      try {
        const userRes = await axios.get(
          `${API_URL}/get/user/details/${userId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setUserDetails(userRes.data.data.user_details);
      } catch (e) {
        console.error('Error fetching user details:', e);
      }

      // Fetch company details
      try {
        const companyRes = await axios.get(
          `${API_URL}/company/get/user/${userId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const companyData =
          companyRes.data.data?.company || companyRes.data.data;
        setCompanyDetails(companyData);
      } catch (e) {
        console.error('Error fetching company details:', e);
      }
    } catch (error) {
      console.error('Error fetching seller data:', error);
    } finally {
      setLoading(false);
    }
  };

  const menuItems: MenuItem[] = [
    {
      id: '1',
      title: 'Profile',
      subtitle: 'View and edit profile',
      icon: 'person-circle',
      route: 'pages/profileSetting',
      color: '#177DDF',
      gradientColors: ['#177DDF', '#1567BF'],
    },
    {
      id: '2',
      title: 'My Products',
      subtitle: 'Manage your product listings',
      icon: 'cube',
      route: 'pages/myProducts',
      color: '#177DDF',
      gradientColors: ['#177DDF', '#1567BF'],
    },
    {
      id: '3',
      title: 'Add Product',
      subtitle: 'List a new product',
      icon: 'add-circle',
      route: 'pages/addProduct',
      color: '#34C759',
      gradientColors: ['#34C759', '#28A745'],
    },
    {
      id: '4',
      title: 'My Followers',
      subtitle: 'View your followers',
      icon: 'people',
      route: 'pages/followers',
      color: '#177DDF',
      gradientColors: ['#177DDF', '#1567BF'],
    },
    {
      id: '5',
      title: 'Business Leads',
      subtitle: 'View enquiry leads',
      icon: 'trending-up',
      route: 'pages/bussinesLeads',
      color: '#177DDF',
      gradientColors: ['#177DDF', '#1567BF'],
    },
    {
      id: '6',
      title: 'Application Status',
      subtitle: 'Check seller application',
      icon: 'document-text',
      route: 'pages/sellerApplicationStatus',
      color: '#FF9500',
      gradientColors: ['#FF9500', '#E68A00'],
    },
    {
      id: '7',
      title: 'Buyer Dashboard',
      subtitle: 'Switch to buyer view',
      icon: 'cart',
      route: '(tabs)',
      color: '#177DDF',
      gradientColors: ['#177DDF', '#1567BF'],
    },
    {
      id: '8',
      title: 'Update Password',
      subtitle: 'Change your password',
      icon: 'key',
      route: 'pages/upadetPasswordScreen',
      color: '#177DDF',
      gradientColors: ['#177DDF', '#1567BF'],
    },
    {
      id: '9',
      title: 'Settings',
      subtitle: 'App preferences',
      icon: 'settings',
      route: 'pages/profileSetting',
      color: '#177DDF',
      gradientColors: ['#177DDF', '#1567BF'],
    },
    {
      id: '10',
      title: 'Logout',
      subtitle: 'Sign out of your account',
      icon: 'log-out',
      route: 'Logout',
      color: '#000000',
      gradientColors: ['#333333', '#000000'],
    },
  ];

  const handleBack = () => {
    router.back();
  };

  const performLogout = async () => {
    await AsyncStorage.multiRemove([
      'token',
      'accessToken',
      'refreshToken',
      'user',
      'companyId',
      'sellerStatus',
      'applicationId',
    ]);
    router.replace('/pages/loginMail');
  };

  const handleMenuItemPress = (item: MenuItem) => {
    setPressedItem(item.id);
    setTimeout(() => setPressedItem(null), 200);

    if (item.route === 'Logout') {
      Alert.alert('Logout', 'Are you sure you want to logout?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: () => performLogout() },
      ]);
    } else {
      //@ts-expect-error
      router.push(`/${item.route}`);
    }
  };

  const renderMenuItem = (item: MenuItem, index: number) => {
    const isPressed = pressedItem === item.id;
    const isLogout = item.route === 'Logout';
    const isBuyerDashboard = item.id === '7';

    return (
      <TouchableOpacity
        key={item.id}
        activeOpacity={0.7}
        onPress={() => handleMenuItemPress(item)}
        style={[
          styles.menuItem,
          isPressed && styles.menuItemPressed,
          isLogout && styles.logoutItem,
          isBuyerDashboard && styles.buyerDashboardItem,
        ]}
      >
        <View style={styles.menuItemContent}>
          <View style={styles.iconContainer}>
            <LinearGradient
              //@ts-ignore
              colors={item.gradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconGradient}
            >
              <Ionicons name={item.icon} size={26} color="#FFFFFF" />
            </LinearGradient>
          </View>

          <View style={styles.textContainer}>
            <Text
              style={[
                styles.menuTitle,
                isLogout && styles.logoutTitle,
              ]}
            >
              {item.title}
            </Text>
            <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
          </View>

          <View style={styles.arrowContainer}>
            <Ionicons
              name="chevron-forward"
              size={22}
              color={isLogout ? '#000000' : '#666666'}
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#177DDF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#177DDF" />

      <LinearGradient
        colors={['#177DDF', '#1567BF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Seller Menu</Text>
        <View style={styles.headerRight} />
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Company Info Card */}
        {companyDetails && (
          <View style={styles.companyCard}>
            <View style={styles.companyCardRow}>
              <View style={styles.companyLogoContainer}>
                {companyDetails.company_profile_url ? (
                  <Image
                    source={{
                      uri: `${S3_URL}/${companyDetails.company_profile_url}`,
                    }}
                    style={styles.companyLogo}
                  />
                ) : (
                  <View style={styles.companyLogoPlaceholder}>
                    <Ionicons name="business" size={28} color="#0078D7" />
                  </View>
                )}
              </View>
              <View style={styles.companyInfo}>
                <Text style={styles.companyName}>
                  {companyDetails.company_name}
                </Text>
                <Text style={styles.companyEmail}>
                  {companyDetails.company_email}
                </Text>
                <Text style={styles.companyLocation}>
                  {companyDetails.company_city}, {companyDetails.company_state}
                </Text>
              </View>
            </View>
            <View style={styles.companyBadges}>
              {companyDetails.is_verified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#28A745" />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              )}
              {companyDetails.is_approved && (
                <View style={styles.approvedBadge}>
                  <Ionicons name="shield-checkmark" size={14} color="#0078D7" />
                  <Text style={styles.approvedText}>Approved Seller</Text>
                </View>
              )}
            </View>
          </View>
        )}

        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => renderMenuItem(item, index))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#1E90FF',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
    marginRight: 40,
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  companyCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  companyCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  companyLogoContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    marginRight: 12,
  },
  companyLogo: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  companyLogoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  companyEmail: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
  },
  companyLocation: {
    fontSize: 12,
    color: '#888',
  },
  companyBadges: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
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
  menuContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  menuItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  menuItemPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  logoutItem: {
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: '#FFE5E5',
  },
  buyerDashboardItem: {
    borderWidth: 1.5,
    borderColor: '#BBDEFB',
    backgroundColor: '#E3F2FD',
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    marginRight: 16,
  },
  iconGradient: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  menuTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  logoutTitle: {
    color: '#000000',
  },
  menuSubtitle: {
    fontSize: 13,
    color: '#7F8C8D',
    lineHeight: 18,
  },
  arrowContainer: {
    marginLeft: 8,
  },
});

export default SellerMenuScreen;

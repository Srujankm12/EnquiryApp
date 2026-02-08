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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback } from 'react';

const { width } = Dimensions.get('window');

interface MenuItem {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  color: string;
  gradientColors: string[];
  condition?: 'always' | 'seller' | 'not-seller' | 'has-application' | 'seller-profile';
}

const MenuScreen: React.FC = () => {
  const [pressedItem, setPressedItem] = useState<string | null>(null);
  const [sellerStatus, setSellerStatus] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSellerStatus();
  }, []);

  useFocusEffect(
    useCallback(() => {
      checkSellerStatus();
    }, [])
  );

  const checkSellerStatus = async () => {
    try {
      const status = await AsyncStorage.getItem('sellerStatus');
      const storedCompanyId = await AsyncStorage.getItem('companyId');
      setSellerStatus(status);
      setCompanyId(storedCompanyId);
    } catch (error) {
      console.error('Error checking seller status:', error);
    } finally {
      setLoading(false);
    }
  };

  const allMenuItems: MenuItem[] = [
    {
      id: '1',
      title: 'Profile',
      subtitle: 'View and edit profile',
      icon: 'person-circle',
      route: 'pages/profileSetting',
      color: '#177DDF',
      gradientColors: ['#177DDF', '#1567BF'],
      condition: 'always',
    },
    {
      id: '2',
      title: 'Become a Seller',
      subtitle: 'Start selling your products',
      icon: 'storefront',
      route: 'pages/becomeSellerForm',
      color: '#34C759',
      gradientColors: ['#34C759', '#28A745'],
      condition: 'not-seller',
    },
    {
      id: 'app-status',
      title: 'Application Status',
      subtitle: 'Check your seller application',
      icon: 'document-text',
      route: 'pages/sellerApplicationStatus',
      color: '#FF9500',
      gradientColors: ['#FF9500', '#E68A00'],
      condition: 'has-application',
    },
    {
      id: 'seller-profile',
      title: 'View Seller Profile',
      subtitle: 'View your company details',
      icon: 'business',
      route: 'pages/sellerProfile',
      color: '#34C759',
      gradientColors: ['#34C759', '#28A745'],
      condition: 'seller-profile',
    },
    {
      id: '8',
      title: 'Seller Dashboard',
      subtitle: 'Go to seller dashboard',
      icon: 'storefront',
      route: '(seller)',
      color: '#177DDF',
      gradientColors: ['#177DDF', '#1567BF'],
      condition: 'seller',
    },
    {
      id: '4',
      title: 'My Products',
      subtitle: 'Manage your products',
      icon: 'cube',
      route: 'pages/myProducts',
      color: '#177DDF',
      gradientColors: ['#177DDF', '#1567BF'],
      condition: 'seller',
    },
    {
      id: '5',
      title: 'My Followers',
      subtitle: 'View your followers',
      icon: 'people',
      route: 'pages/followers',
      color: '#177DDF',
      gradientColors: ['#177DDF', '#1567BF'],
      condition: 'always',
    },
    {
      id: '3',
      title: 'Settings',
      subtitle: 'App preferences',
      icon: 'settings',
      route: 'pages/profileSetting',
      color: '#177DDF',
      gradientColors: ['#177DDF', '#1567BF'],
      condition: 'always',
    },
    {
      id: '9',
      title: 'Update Password',
      subtitle: 'Change your password',
      icon: 'key',
      route: 'pages/upadetPasswordScreen',
      color: '#177DDF',
      gradientColors: ['#177DDF', '#1567BF'],
      condition: 'always',
    },
    {
      id: '10',
      title: 'Update Profile Details',
      subtitle: 'Change your details',
      icon: 'person',
      route: 'pages/updateUserProfileScreen',
      color: '#177DDF',
      gradientColors: ['#177DDF', '#1567BF'],
      condition: 'always',
    },
    {
      id: '7',
      title: 'Logout',
      subtitle: 'Sign out of your account',
      icon: 'log-out',
      route: 'Logout',
      color: '#000000',
      gradientColors: ['#333333', '#000000'],
      condition: 'always',
    },
  ];

  const getVisibleMenuItems = (): MenuItem[] => {
    const normalizedStatus = sellerStatus?.toLowerCase();
    return allMenuItems.filter((item) => {
      switch (item.condition) {
        case 'always':
          return true;
        case 'seller':
          return normalizedStatus === 'approved';
        case 'seller-profile':
          return normalizedStatus === 'approved';
        case 'not-seller':
          return normalizedStatus !== 'approved' && normalizedStatus !== 'pending';
        case 'has-application':
          return normalizedStatus === 'pending' || normalizedStatus === 'rejected';
        default:
          return true;
      }
    });
  };

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
      handleLogout();
    } else if (item.id === 'seller-profile' && companyId) {
      router.push({
        pathname: '/pages/sellerProfile' as any,
        params: { company_id: companyId },
      });
    } else {
      navigateToScreen(item.route);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: () => performLogout() },
      ]
    );
  };

  const navigateToScreen = (routeName: string) => {
    //@ts-expect-error
    router.push(`/${routeName}`);
  };

  const renderMenuItem = (item: MenuItem, index: number) => {
    const isPressed = pressedItem === item.id;
    const isLogout = item.route === 'Logout';
    const isBecomeSeller = item.id === '2';
    const isApplicationStatus = item.id === 'app-status';
    const isSellerDashboard = item.id === '8';
    const isSellerProfile = item.id === 'seller-profile';

    return (
      <TouchableOpacity
        key={item.id}
        activeOpacity={0.7}
        onPress={() => handleMenuItemPress(item)}
        style={[
          styles.menuItem,
          isPressed && styles.menuItemPressed,
          isLogout && styles.logoutItem,
          isBecomeSeller && styles.becomeSellerItem,
          isApplicationStatus && styles.applicationStatusItem,
          isSellerDashboard && styles.sellerDashboardItem,
          isSellerProfile && styles.sellerProfileItem,
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
                isBecomeSeller && styles.becomeSellerTitle,
                isSellerDashboard && styles.sellerDashboardTitle,
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
              color={
                isLogout
                  ? '#000000'
                  : isBecomeSeller
                  ? '#34C759'
                  : isSellerDashboard
                  ? '#0078D7'
                  : '#666666'
              }
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

  const visibleItems = getVisibleMenuItems();

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
        <Text style={styles.headerTitle}>Menu</Text>
        <View style={styles.headerRight} />
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.menuContainer}>
          {visibleItems.map((item, index) => renderMenuItem(item, index))}
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
  menuContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
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
  becomeSellerItem: {
    borderWidth: 1.5,
    borderColor: '#C8F5D5',
    backgroundColor: '#F0FFF4',
  },
  applicationStatusItem: {
    borderWidth: 1.5,
    borderColor: '#FFE0B2',
    backgroundColor: '#FFF8E1',
  },
  sellerDashboardItem: {
    borderWidth: 1.5,
    borderColor: '#BBDEFB',
    backgroundColor: '#E3F2FD',
  },
  sellerProfileItem: {
    borderWidth: 1.5,
    borderColor: '#C8F5D5',
    backgroundColor: '#F0FFF4',
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
  becomeSellerTitle: {
    color: '#34C759',
  },
  sellerDashboardTitle: {
    color: '#0078D7',
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

export default MenuScreen;

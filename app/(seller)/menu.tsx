import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  StatusBar,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

interface MenuItem {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  color: string;
  gradientColors: string[];
}

const MenuScreen: React.FC = () => {
  const [pressedItem, setPressedItem] = useState<string | null>(null);

  const menuItems: MenuItem[] = [
    {
      id: '1',
      title: 'Profile',
      subtitle: 'View and Edit Profile',
      icon: 'person-circle',
      route: 'pages/profileSetting',
      color: '#177DDF',
      gradientColors: ['#177DDF', '#1567BF'],
    },
    
    {
      id: '3',
      title: 'Settings',
      subtitle: 'Change Application Settings',
      icon: 'settings',
      route: 'pages/profileSetting',
      color: '#177DDF',
      gradientColors: ['#177DDF', '#1567BF'],
    },
    {
      id: '7',
      title: 'Buyer Dashboard',
      subtitle: 'View Buyer Dashboard',
      icon: 'desktop-outline',
      route: '(tabs)',
      color: '#177DDF',
      gradientColors: ['#177DDF', '#1567BF'],
    },
  ];

  const handleBack = () => {
    router.back();
  };

  const handleMenuItemPress = (item: MenuItem) => {
    setPressedItem(item.id);
    
    // Reset after animation
    setTimeout(() => setPressedItem(null), 200);

    // Handle special cases
    if (item.route === 'Logout') {
      handleLogout();
    } else {
      navigateToScreen(item.route);
    }
  };

  const handleLogout = () => {
    console.log('Logout pressed');
    // Show confirmation dialog
    // Alert.alert(
    //   'Logout',
    //   'Are you sure you want to logout?',
    //   [
    //     { text: 'Cancel', style: 'cancel' },
    //     { text: 'Logout', onPress: () => performLogout() }
    //   ]
    // );
  };

  const navigateToScreen = (routeName: string) => {
    //@ts-expect-error
    router.push(`/${routeName}`);
  };

  const renderMenuItem = (item: MenuItem, index: number) => {
    const isPressed = pressedItem === item.id;
    const isLogout = item.route === 'Logout';
    const isBecomeSeller = item.id === '2';

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
        ]}
      >
        <View style={styles.menuItemContent}>
          {/* Icon with Gradient Background */}
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

          {/* Text Content */}
          <View style={styles.textContainer}>
            <Text style={[
              styles.menuTitle, 
              isLogout && styles.logoutTitle,
              isBecomeSeller && styles.becomeSellerTitle
            ]}>
              {item.title}
            </Text>
            <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
          </View>

          {/* Arrow Icon */}
          <View style={styles.arrowContainer}>
            <Ionicons
              name="chevron-forward"
              size={22}
              color={isLogout ? '#000000' : isBecomeSeller ? '#34C759' : '#666666'}
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#177DDF" />

      {/* Header with Gradient */}
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

      {/* Menu Items */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
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
    backgroundColor: "#1E90FF",
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
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
  menuSubtitle: {
    fontSize: 13,
    color: '#7F8C8D',
    lineHeight: 18,
  },
  arrowContainer: {
    marginLeft: 8,
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  versionText: {
    fontSize: 13,
    color: '#95A5A6',
    marginBottom: 4,
  },
  copyrightText: {
    fontSize: 12,
    color: '#BDC3C7',
  },
});

export default MenuScreen;
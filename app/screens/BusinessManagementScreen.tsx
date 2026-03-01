import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.API_URL;

interface DecodedToken {
  user_id: string;
  user_name: string;
  business_id: string;
}

const BusinessManagementScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [businessId, setBusinessId] = useState<string>('');
  const [businessName, setBusinessName] = useState<string>('');
  const [sellerStatus, setSellerStatus] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const decoded = jwtDecode<DecodedToken>(token);
      const storedCompanyId = await AsyncStorage.getItem('companyId');
      const bId = storedCompanyId || decoded.business_id;
      setBusinessId(bId);

      const status = await AsyncStorage.getItem('sellerStatus');
      setSellerStatus(status?.toLowerCase()?.trim() || null);

      if (bId) {
        try {
          const res = await fetch(`${API_URL}/business/get/${bId}`, {
            headers: { 'Content-Type': 'application/json' },
          });
          if (res.ok) {
            const data = await res.json();
            const details = data.details || data.business || data;
            setBusinessName(details.name || '');
          }
        } catch {}
      }
    } catch (error) {
      console.error('Error loading business data:', error);
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    {
      id: 'business-profile',
      title: 'Business Profile',
      subtitle: 'View your complete business profile',
      icon: 'business' as keyof typeof Ionicons.glyphMap,
      color: '#0078D7',
      bgColor: '#E3F2FD',
      onPress: () => {
        if (businessId) {
          router.push({
            pathname: '/pages/bussinesProfile' as any,
            params: { business_id: businessId },
          });
        }
      },
    },
    {
      id: 'edit-business',
      title: 'Edit Business Details',
      subtitle: 'Update business name, address, contact info',
      icon: 'create-outline' as keyof typeof Ionicons.glyphMap,
      color: '#FF9500',
      bgColor: '#FFF3E0',
      onPress: () => {
        router.push('/pages/sellerApplicationStatus' as any);
      },
    },
    {
      id: 'legal-details',
      title: 'Legal Details',
      subtitle: 'GST, PAN, MSME, FSSAI and other documents',
      icon: 'document-text-outline' as keyof typeof Ionicons.glyphMap,
      color: '#28A745',
      bgColor: '#E8F5E9',
      onPress: () => {
        router.push('/pages/profileSetting' as any);
      },
    },
    {
      id: 'social-media',
      title: 'Social Media',
      subtitle: 'Website, Instagram, Facebook, LinkedIn & more',
      icon: 'share-social-outline' as keyof typeof Ionicons.glyphMap,
      color: '#E91E63',
      bgColor: '#FCE4EC',
      onPress: () => {
        router.push('/pages/profileSetting' as any);
      },
    },
  ];

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#177DDF" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Business</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#177DDF" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#177DDF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Business</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Business Name Card */}
        {businessName ? (
          <View style={styles.businessNameCard}>
            <View style={styles.businessIconContainer}>
              <Ionicons name="business" size={28} color="#177DDF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.businessNameText}>{businessName}</Text>
              <View style={styles.sellerBadge}>
                <Ionicons name="shield-checkmark" size={14} color="#28A745" />
                <Text style={styles.sellerBadgeText}>Approved Seller</Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* Menu Items */}
        <Text style={styles.sectionLabel}>Manage Business</Text>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={item.onPress}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: item.bgColor }]}>
              <Ionicons name={item.icon} size={22} color={item.color} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CCC" />
          </TouchableOpacity>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    backgroundColor: '#177DDF',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16 },
  businessNameCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  businessIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  businessNameText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 6,
  },
  sellerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  sellerBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#28A745',
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  menuItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  menuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuTextContainer: { flex: 1 },
  menuTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 3,
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#888',
  },
});

export default BusinessManagementScreen;

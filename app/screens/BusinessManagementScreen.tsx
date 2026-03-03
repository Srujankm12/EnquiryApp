import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import { jwtDecode } from 'jwt-decode';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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

const API_URL = Constants.expoConfig?.extra?.API_URL;
const CLOUDFRONT_URL = Constants.expoConfig?.extra?.CLOUDFRONT_URL;
const S3_URL = Constants.expoConfig?.extra?.S3_FETCH_URL;

const getImageUri = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const path = url.startsWith('/') ? url : `/${url}`;
  if (CLOUDFRONT_URL) return `${CLOUDFRONT_URL}${path}`;
  return `${S3_URL}${path}`;
};

interface DecodedToken { user_id: string; user_name: string; business_id: string; }

const menuItems = [
  { id: 'business-profile', title: 'Business Profile', subtitle: 'View your public business page', icon: 'eye-outline' as any, color: '#0078D7', bgColor: '#EBF5FF', emoji: '🏢' },
  { id: 'edit-business', title: 'Edit Business Details', subtitle: 'Name, photo, contact info, address', icon: 'create-outline' as any, color: '#F59E0B', bgColor: '#FEF3C7', emoji: '✏️' },
  { id: 'legal-details', title: 'Legal & Compliance', subtitle: 'GST, PAN, MSME, FSSAI, Aadhaar', icon: 'document-text-outline' as any, color: '#16A34A', bgColor: '#DCFCE7', emoji: '🛡️' },
  { id: 'social-media', title: 'Social Media URLs', subtitle: 'Website, Instagram, LinkedIn & more', icon: 'share-social-outline' as any, color: '#EC4899', bgColor: '#FCE7F3', emoji: '🌐' },
];

const BusinessManagementScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [businessId, setBusinessId] = useState<string>('');
  const [businessName, setBusinessName] = useState<string>('');
  const [businessCity, setBusinessCity] = useState<string>('');
  const [businessState, setBusinessState] = useState<string>('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [isTrusted, setIsTrusted] = useState(false);

  useEffect(() => { loadData(); }, []);
  useFocusEffect(useCallback(() => { loadData(false); }, []));

  const loadData = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      const decoded = jwtDecode<DecodedToken>(token);
      const storedCompanyId = await AsyncStorage.getItem('companyId');
      const bId = storedCompanyId || decoded.business_id;
      setBusinessId(bId);
      if (bId) {
        const res = await fetch(`${API_URL}/business/get/complete/${bId}`, { headers: { 'Content-Type': 'application/json' } });
        if (res.ok) {
          const result = await res.json();
          const biz = result.details?.business_details || {};
          setBusinessName(biz.name || '');
          setBusinessCity(biz.city || '');
          setBusinessState(biz.state || '');
          setIsVerified(biz.is_business_verified || false);
          setIsApproved(biz.is_business_approved || false);
          setIsTrusted(biz.is_business_trusted || false);
          if (biz.profile_image) setProfileImage(`${getImageUri(biz.profile_image)}?t=${Date.now()}`);
          else setProfileImage(null);
        }
      }
    } catch (error) { console.error(error); }
    finally { if (showLoader) setLoading(false); setRefreshing(false); }
  };

  const handleMenuPress = (id: string) => {
    switch (id) {
      case 'business-profile': if (businessId) router.push({ pathname: '/pages/bussinesProfile' as any, params: { business_id: businessId } }); break;
      case 'edit-business': router.push('/pages/editBusinessDetails' as any); break;
      case 'legal-details': router.push('/pages/editLegalDetails' as any); break;
      case 'social-media': router.push('/pages/editSocialMedia' as any); break;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0060B8" />

      {/* ── Premium Header ── */}
      <View style={[styles.headerWrapper, { paddingTop: insets.top }]}>
        <View style={styles.orb1} /><View style={styles.orb2} /><View style={styles.orb3} />
        <View style={styles.headerInner}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.eyebrow}>ACCOUNT</Text>
            <Text style={styles.headerTitle}>Business Hub</Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#0078D7" />
          <Text style={styles.loaderText}>Loading...</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(false); }} colors={['#0078D7']} tintColor="#0078D7" />}
        >
          {/* ── Business Hero Card ── */}
          <View style={styles.heroCard}>
            <View style={styles.heroCardBg} />
            <View style={styles.heroContent}>
              <TouchableOpacity
                onPress={() => businessId && router.push({ pathname: '/pages/bussinesProfile' as any, params: { business_id: businessId } })}
                style={styles.avatarWrap}
                activeOpacity={0.85}
              >
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.avatar} resizeMode="cover" />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="business" size={30} color="#0078D7" />
                  </View>
                )}
                <View style={styles.cameraBtn}>
                  <Ionicons name="eye-outline" size={10} color="#fff" />
                </View>
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroName}>{businessName || 'Your Business'}</Text>
                {(businessCity || businessState) && (
                  <View style={styles.heroLocationRow}>
                    <Ionicons name="location-outline" size={13} color="#64748B" />
                    <Text style={styles.heroLocation}>{[businessCity, businessState].filter(Boolean).join(', ')}</Text>
                  </View>
                )}
                {/* Status badges */}
                <View style={styles.heroBadges}>
                  {isApproved && (
                    <View style={styles.badge}>
                      <Ionicons name="shield-checkmark" size={11} color="#16A34A" />
                      <Text style={[styles.badgeText, { color: '#16A34A' }]}>Approved</Text>
                    </View>
                  )}
                  {isVerified && (
                    <View style={[styles.badge, { backgroundColor: '#EBF5FF' }]}>
                      <Ionicons name="checkmark-circle" size={11} color="#0078D7" />
                      <Text style={[styles.badgeText, { color: '#0078D7' }]}>Verified</Text>
                    </View>
                  )}
                  {isTrusted && (
                    <View style={[styles.badge, { backgroundColor: '#FEF3C7' }]}>
                      <Ionicons name="ribbon" size={11} color="#F59E0B" />
                      <Text style={[styles.badgeText, { color: '#F59E0B' }]}>Trusted</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Quick shortcut pills */}
            <View style={styles.quickPills}>
              <TouchableOpacity style={styles.quickPill} onPress={() => router.push('/pages/addProduct' as any)}>
                <Ionicons name="add-circle-outline" size={16} color="#0078D7" />
                <Text style={styles.quickPillText}>Add Product</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickPill} onPress={() => router.push('/pages/myProducts' as any)}>
                <Ionicons name="cube-outline" size={16} color="#0078D7" />
                <Text style={styles.quickPillText}>My Products</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickPill} onPress={() => router.push('/pages/myRfqs' as any)}>
                <Ionicons name="document-text-outline" size={16} color="#0078D7" />
                <Text style={styles.quickPillText}>My RFQs</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Section heading ── */}
          <Text style={styles.sectionLabel}>MANAGE BUSINESS</Text>

          {/* ── Menu Items ── */}
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.menuItem, index === menuItems.length - 1 && { marginBottom: 0 }]}
              activeOpacity={0.8}
              onPress={() => handleMenuPress(item.id)}
            >
              <View style={[styles.menuIconWrap, { backgroundColor: item.bgColor }]}>
                <Ionicons name={item.icon} size={22} color={item.color} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              <View style={styles.menuArrow}>
                <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

export default BusinessManagementScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9FC' },

  // ── Header ──
  headerWrapper: {
    backgroundColor: '#0060B8', paddingHorizontal: 20, paddingBottom: 22, overflow: 'hidden',
    shadowColor: '#003E80', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 24, elevation: 18,
  },
  orb1: { position: 'absolute', width: 280, height: 280, borderRadius: 140, backgroundColor: 'rgba(255,255,255,0.06)', top: -100, right: -70 },
  orb2: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.04)', bottom: 10, left: -60 },
  orb3: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(100,180,255,0.08)', top: 10, right: 100 },
  headerInner: { flexDirection: 'row', alignItems: 'center', paddingTop: 16 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  eyebrow: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.65)', letterSpacing: 2, marginBottom: 2 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.4 },

  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loaderText: { fontSize: 13, color: '#94A3B8', fontWeight: '500' },

  // ── Hero Card ──
  heroCard: {
    backgroundColor: '#fff', marginHorizontal: 16, marginTop: 20, borderRadius: 24, padding: 20,
    shadowColor: '#1B4FBF', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 8,
    borderWidth: 1, borderColor: '#F0F4F8', overflow: 'hidden',
  },
  heroCardBg: { position: 'absolute', top: 0, left: 0, right: 0, height: 6, backgroundColor: '#0060B8' },
  heroContent: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 8, marginBottom: 18 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 76, height: 76, borderRadius: 20, borderWidth: 3, borderColor: '#EBF5FF' },
  avatarPlaceholder: { width: 76, height: 76, borderRadius: 20, backgroundColor: '#EBF5FF', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#DBEAFE' },
  cameraBtn: { position: 'absolute', bottom: -4, right: -4, width: 22, height: 22, borderRadius: 11, backgroundColor: '#0078D7', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  heroName: { fontSize: 17, fontWeight: '800', color: '#0F172A', letterSpacing: -0.3, marginBottom: 4 },
  heroLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  heroLocation: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  heroBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 10, fontWeight: '800' },

  quickPills: { flexDirection: 'row', gap: 8, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  quickPill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: '#EBF5FF', paddingVertical: 10, borderRadius: 12 },
  quickPillText: { fontSize: 11, fontWeight: '700', color: '#0078D7' },

  sectionLabel: { fontSize: 10, fontWeight: '800', color: '#94A3B8', letterSpacing: 2, marginHorizontal: 20, marginTop: 22, marginBottom: 10 },

  // ── Menu Items ──
  menuItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 20,
    marginHorizontal: 16, marginBottom: 10, padding: 16,
    shadowColor: '#1B4FBF', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
    borderWidth: 1, borderColor: '#F0F4F8',
  },
  menuIconWrap: { width: 50, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  menuContent: { flex: 1 },
  menuTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A', marginBottom: 3 },
  menuSubtitle: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },
  menuArrow: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#F7F9FC', justifyContent: 'center', alignItems: 'center' },
});

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  AppState,
  Dimensions,
  Linking,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput, TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const API_URL = Constants.expoConfig?.extra?.API_URL;

interface RFQ {
  id: string;
  business_id: string;
  business_name: string;
  business_phone: string;
  business_email: string;
  address: string;
  city: string;
  state: string;
  product_name: string;
  quantity: number;
  unit: string;
  price: number;
  is_rfq_active: boolean;
  created_at: string;
  updated_at: string;
}

const EnquiriesScreen: React.FC = () => {
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    fetchRFQs();
  }, []);

  useFocusEffect(useCallback(() => { fetchRFQs(false); }, []));

  useEffect(() => {
    intervalRef.current = setInterval(() => { fetchRFQs(false); }, 30000);
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') fetchRFQs(false);
      appState.current = nextAppState;
    });
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      subscription.remove();
    };
  }, []);

  const fetchRFQs = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await axios.get(`${API_URL}/rfq/get/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data?.rfqs || res.data?.data?.rfqs || [];
      setRfqs(Array.isArray(data) ? data : []);
    } catch {
      if (showLoader) setRfqs([]);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRFQs(false);
    setRefreshing(false);
  }, []);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      if (days === 0) return 'Today';
      if (days === 1) return 'Yesterday';
      if (days < 7) return `${days} days ago`;
      return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return dateStr; }
  };

  const filteredRFQs = rfqs.filter((rfq) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      rfq.product_name?.toLowerCase().includes(q) ||
      rfq.business_name?.toLowerCase().includes(q) ||
      rfq.city?.toLowerCase().includes(q)
    );
  });

  // ── RFQ Card ──
  const RFQCard = ({ rfq, index }: { rfq: RFQ; index: number }) => {
    const scaleCard = useRef(new Animated.Value(1)).current;
    return (
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={() => Animated.spring(scaleCard, { toValue: 0.97, useNativeDriver: true, speed: 20 }).start()}
        onPressOut={() => Animated.spring(scaleCard, { toValue: 1, useNativeDriver: true, speed: 20 }).start()}
        onPress={() => router.push({ pathname: '/pages/rfqDetail' as any, params: { rfq_id: rfq.id } })}
      >
        <Animated.View style={[styles.rfqCard, { transform: [{ scale: scaleCard }] }]}>

          {/* Top accent bar */}
          <View style={styles.cardAccentBar} />

          {/* Header */}
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={styles.productIconContainer}>
                <Ionicons name="cube" size={20} color="#0078D7" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.productName} numberOfLines={1}>{rfq.product_name}</Text>
                <View style={styles.bizRow}>
                  <Ionicons name="storefront-outline" size={10} color="#94A3B8" />
                  <Text style={styles.businessNameText} numberOfLines={1}>{rfq.business_name}</Text>
                </View>
              </View>
            </View>
            <View style={styles.rfqBadge}>
              <Text style={styles.rfqBadgeText}>RFQ</Text>
            </View>
          </View>

          {/* Details chips */}
          <View style={styles.detailsRow}>
            <View style={styles.detailChip}>
              <Ionicons name="layers-outline" size={11} color="#0078D7" />
              <Text style={styles.detailChipText}>{rfq.quantity} {rfq.unit}</Text>
            </View>
            <View style={styles.detailChip}>
              <Ionicons name="pricetag-outline" size={11} color="#0078D7" />
              <Text style={styles.detailChipText}>{rfq.price > 0 ? `₹${rfq.price}` : 'On Request'}</Text>
            </View>
            {rfq.city ? (
              <View style={[styles.detailChip, styles.detailChipMuted]}>
                <Ionicons name="location-outline" size={11} color="#64748B" />
                <Text style={[styles.detailChipText, { color: '#64748B' }]} numberOfLines={1}>{rfq.city}</Text>
              </View>
            ) : null}
          </View>

          {/* Divider */}
          <View style={styles.cardDivider} />

          {/* Footer */}
          <View style={styles.cardFooter}>
            <View style={styles.dateRow}>
              <Ionicons name="time-outline" size={11} color="#94A3B8" />
              <Text style={styles.dateText}>{formatDate(rfq.created_at)}</Text>
            </View>
            <View style={styles.footerActions}>
              <TouchableOpacity
                style={styles.footerBtn}
                onPress={(e) => { e.stopPropagation(); router.push({ pathname: '/pages/bussinesProfile' as any, params: { business_id: rfq.business_id } }); }}
              >
                <Ionicons name="person-outline" size={15} color="#0078D7" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.footerBtn}
                onPress={(e) => { e.stopPropagation(); if (rfq.business_phone) Linking.openURL(`tel:${rfq.business_phone}`); }}
              >
                <Ionicons name="call-outline" size={15} color="#0078D7" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.footerBtn, styles.footerBtnWhatsapp]}
                onPress={(e) => { e.stopPropagation(); if (rfq.business_phone) Linking.openURL(`https://wa.me/${rfq.business_phone.replace(/[^0-9]/g, '')}`); }}
              >
                <Ionicons name="logo-whatsapp" size={15} color="#25D366" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.footerArrowBtn}>
                <Ionicons name="arrow-forward" size={13} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0060B8" />
        <View style={[styles.headerWrapper, { paddingTop: insets.top }]}>
          <View style={styles.headerOrb1} /><View style={styles.headerOrb2} /><View style={styles.headerOrb3} />
          <View style={styles.headerInner}>
            <View>
              <Text style={styles.headerEyebrow}>MARKETPLACE</Text>
              <Text style={styles.headerTitle}>Buyer Requests</Text>
            </View>
          </View>
        </View>
        <View style={styles.loaderContainer}>
          <View style={styles.loaderCard}>
            <ActivityIndicator size="large" color="#0078D7" />
            <Text style={styles.loaderText}>Loading requests…</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0060B8" />

      {/* ── HEADER ── */}
      <View style={[styles.headerWrapper, { paddingTop: insets.top }]}>
        <View style={styles.headerOrb1} />
        <View style={styles.headerOrb2} />
        <View style={styles.headerOrb3} />

        <View style={styles.headerInner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerEyebrow}>MARKETPLACE</Text>
            <Text style={styles.headerTitle}>Buyer Requests</Text>
          </View>
          <View style={styles.headerRightRow}>
            <View style={styles.headerBadge}>
              <View style={styles.headerBadgeDot} />
              <Text style={styles.headerBadgeText}>{rfqs.length} active</Text>
            </View>
            <TouchableOpacity
              style={styles.headerAddBtn}
              onPress={() => router.push('/pages/requestQutation' as any)}
            >
              <Ionicons name="add" size={20} color="#0078D7" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search */}
        <View style={[styles.headerSearchWrap, searchFocused && styles.headerSearchFocused]}>
          <View style={styles.searchIconCircle}>
            <Ionicons name="search-outline" size={14} color="#0078D7" />
          </View>
          <TextInput
            style={styles.headerSearchInput}
            placeholder="Search by product, business, city..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity style={styles.searchClearBtn} onPress={() => setSearchQuery('')}>
              <Ionicons name="close" size={15} color="#0078D7" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0078D7']} tintColor="#0078D7" />
        }
      >
        {/* Stats bar */}
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{rfqs.length}+</Text>
            <Text style={styles.statLabel}>Requests</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>Live</Text>
            <Text style={styles.statLabel}>Updated</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>Open</Text>
            <Text style={styles.statLabel}>To Quote</Text>
          </View>
        </View>

        {filteredRFQs.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.stateIconWrapper}>
              <Ionicons name="document-text-outline" size={32} color="#0078D7" />
            </View>
            <Text style={styles.stateTitle}>{searchQuery ? 'No Results Found' : 'No Requests Yet'}</Text>
            <Text style={styles.stateText}>
              {searchQuery ? `No RFQs match "${searchQuery}"` : 'Active buyer requests will appear here'}
            </Text>
            {!searchQuery ? (
              <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/pages/requestQutation' as any)}>
                <Ionicons name="add-circle-outline" size={16} color="#fff" />
                <Text style={styles.actionButtonText}>Create RFQ</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.outlineButton} onPress={() => setSearchQuery('')}>
                <Text style={styles.outlineButtonText}>Clear Search</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.listSection}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>
                  {searchQuery ? 'Search Results' : 'All Requests'}
                </Text>
                <Text style={styles.sectionSubtitle}>{filteredRFQs.length} request{filteredRFQs.length !== 1 ? 's' : ''} found</Text>
              </View>
              {searchQuery ? (
                <TouchableOpacity style={styles.viewAllChip} onPress={() => setSearchQuery('')}>
                  <Text style={styles.viewAllChipText}>Clear</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            {filteredRFQs.map((rfq, index) => (
              <RFQCard key={`${rfq.id}-${index}`} rfq={rfq} index={index} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9FC' },

  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7F9FC' },
  loaderCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 32, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 6,
  },
  loaderText: { marginTop: 12, fontSize: 13, color: '#94A3B8', fontWeight: '500' },

  // ── Header ──
  headerWrapper: {
    backgroundColor: '#0060B8', paddingHorizontal: 20, paddingBottom: 16, overflow: 'hidden',
    shadowColor: '#003E80', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 24, elevation: 18,
  },
  headerOrb1: { position: 'absolute', width: 280, height: 280, borderRadius: 140, backgroundColor: 'rgba(255,255,255,0.06)', top: -100, right: -70 },
  headerOrb2: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.04)', bottom: 10, left: -60 },
  headerOrb3: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(100,180,255,0.08)', top: 20, right: width * 0.35 },
  headerInner: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    paddingTop: 16, paddingBottom: 18,
  },
  headerEyebrow: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.65)', letterSpacing: 2, marginBottom: 2 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  headerRightRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  headerBadgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ADE80' },
  headerBadgeText: { fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: '700' },
  headerAddBtn: {
    width: 36, height: 36, borderRadius: 12, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 3,
  },
  headerSearchWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 12,
    height: 46, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#003E80', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 10, elevation: 6,
  },
  headerSearchFocused: { borderColor: 'rgba(255,255,255,0.6)' },
  searchIconCircle: { width: 28, height: 28, borderRadius: 9, backgroundColor: '#EBF5FF', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  headerSearchInput: { flex: 1, fontSize: 13, color: '#0F172A', fontWeight: '500' },
  searchClearBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#EBF5FF', justifyContent: 'center', alignItems: 'center', marginLeft: 6 },

  // ── Stats ──
  statsBar: {
    flexDirection: 'row', margin: 16, marginBottom: 0, backgroundColor: '#0078D7', borderRadius: 18,
    paddingVertical: 18, paddingHorizontal: 10,
    shadowColor: '#0078D7', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 14, elevation: 8,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.5 },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.72)', marginTop: 2, fontWeight: '600' },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },

  // ── Section ──
  listSection: { paddingTop: 22 },
  sectionHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', letterSpacing: -0.4 },
  sectionSubtitle: { fontSize: 12, color: '#94A3B8', marginTop: 2, fontWeight: '500' },
  viewAllChip: { backgroundColor: '#EBF5FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  viewAllChipText: { fontSize: 12, fontWeight: '700', color: '#0078D7' },

  // ── RFQ Card ──
  rfqCard: {
    backgroundColor: '#fff', borderRadius: 22, marginHorizontal: 16, marginBottom: 14,
    shadowColor: '#1B4FBF', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.09,
    shadowRadius: 16, elevation: 6, borderWidth: 1, borderColor: '#F0F4F8', overflow: 'hidden',
  },
  cardAccentBar: { height: 3, backgroundColor: '#0078D7', width: '100%' },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, paddingBottom: 10,
  },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  productIconContainer: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: '#EBF5FF',
    justifyContent: 'center', alignItems: 'center',
  },
  productName: { fontSize: 15, fontWeight: '800', color: '#0F172A', letterSpacing: -0.2 },
  bizRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  businessNameText: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
  rfqBadge: {
    backgroundColor: '#0078D7', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    shadowColor: '#0078D7', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 3,
  },
  rfqBadgeText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },

  detailsRow: { flexDirection: 'row', paddingHorizontal: 14, paddingBottom: 12, gap: 8, flexWrap: 'wrap' },
  detailChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#EBF5FF', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20,
  },
  detailChipMuted: { backgroundColor: '#F1F5F9' },
  detailChipText: { fontSize: 11, fontWeight: '700', color: '#0078D7' },

  cardDivider: { height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 14 },

  cardFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 11,
  },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
  footerActions: { flexDirection: 'row', gap: 7, alignItems: 'center' },
  footerBtn: {
    width: 34, height: 34, borderRadius: 11, backgroundColor: '#EBF5FF',
    justifyContent: 'center', alignItems: 'center',
  },
  footerBtnWhatsapp: { backgroundColor: '#F0FDF4' },
  footerArrowBtn: {
    width: 34, height: 34, borderRadius: 11, backgroundColor: '#0078D7',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#0078D7', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 6, elevation: 4,
  },

  // ── States ──
  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 },
  stateIconWrapper: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#EBF5FF', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  stateTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', letterSpacing: -0.3 },
  stateText: { fontSize: 13, color: '#94A3B8', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  actionButton: {
    marginTop: 24, backgroundColor: '#0078D7', paddingHorizontal: 28, paddingVertical: 13,
    borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 8,
    shadowColor: '#0078D7', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  actionButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  outlineButton: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 11, borderRadius: 12, borderWidth: 1.5, borderColor: '#0078D7' },
  outlineButtonText: { color: '#0078D7', fontSize: 13, fontWeight: '700' },
});

export default EnquiriesScreen;
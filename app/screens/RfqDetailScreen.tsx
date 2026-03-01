import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Linking,
  AppState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

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

const RfqDetailScreen: React.FC = () => {
  const { rfq_id } = useLocalSearchParams<{ rfq_id: string }>();
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [rfq, setRfq] = useState<RFQ | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appState = useRef(AppState.currentState);

  const fetchRfqDetail = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const token = await AsyncStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_URL}/rfq/get/all`, { headers });
      const data = res.data?.rfqs || res.data?.data?.rfqs || [];
      const allRfqs: RFQ[] = Array.isArray(data) ? data : [];
      const found = allRfqs.find((r) => r.id === rfq_id);
      if (found) {
        setRfq(found);
      }
    } catch (error) {
      console.error('Error fetching RFQ detail:', error);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [rfq_id]);

  useEffect(() => {
    fetchRfqDetail();
  }, [fetchRfqDetail]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      fetchRfqDetail(false);
    }, 30000);

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        fetchRfqDetail(false);
      }
      appState.current = nextAppState;
    });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      subscription.remove();
    };
  }, [fetchRfqDetail]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRfqDetail(false);
    setRefreshing(false);
  }, [fetchRfqDetail]);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const handleProfile = (businessId: string) => {
    if (businessId) {
      router.push({
        pathname: '/pages/bussinesProfile' as any,
        params: { business_id: businessId },
      });
    }
  };

  const handleContact = (phone?: string) => {
    if (phone) Linking.openURL(`tel:${phone}`);
  };

  const handleWhatsApp = (phone?: string) => {
    if (phone) {
      const cleaned = phone.replace(/[^0-9]/g, '');
      Linking.openURL(`https://wa.me/${cleaned}`);
    }
  };

  const handleEmail = (email?: string) => {
    if (email) Linking.openURL(`mailto:${email}`);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#177DDF" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>RFQ Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#177DDF" />
          <Text style={styles.loadingText}>Loading details...</Text>
        </View>
      </View>
    );
  }

  if (!rfq) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#177DDF" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>RFQ Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loaderContainer}>
          <Ionicons name="document-text-outline" size={64} color="#CCC" />
          <Text style={styles.emptyTitle}>RFQ Not Found</Text>
          <Text style={styles.emptySubtext}>This request may have been removed</Text>
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
        <Text style={styles.headerTitle}>RFQ Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#177DDF']}
          />
        }
      >
        {/* Product Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.productIconLarge}>
              <Ionicons name="cube" size={28} color="#177DDF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.productName}>{rfq.product_name}</Text>
              <View style={styles.statusRow}>
                <View style={[styles.statusBadge, rfq.is_rfq_active ? styles.activeBadge : styles.inactiveBadge]}>
                  <View style={[styles.statusDot, { backgroundColor: rfq.is_rfq_active ? '#28A745' : '#DC3545' }]} />
                  <Text style={[styles.statusText, { color: rfq.is_rfq_active ? '#28A745' : '#DC3545' }]}>
                    {rfq.is_rfq_active ? 'Active' : 'Inactive'}
                  </Text>
                </View>
                <View style={styles.rfqBadge}>
                  <Text style={styles.rfqBadgeText}>RFQ</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Requirement Details */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconBg, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="list-outline" size={18} color="#177DDF" />
            </View>
            <Text style={styles.sectionTitle}>Requirement Details</Text>
          </View>

          <View style={styles.detailGrid}>
            <View style={styles.detailGridItem}>
              <Ionicons name="layers-outline" size={20} color="#177DDF" />
              <Text style={styles.detailGridLabel}>Quantity</Text>
              <Text style={styles.detailGridValue}>{rfq.quantity} {rfq.unit}</Text>
            </View>
            <View style={styles.detailGridItem}>
              <Ionicons name="pricetag-outline" size={20} color="#28A745" />
              <Text style={styles.detailGridLabel}>Price</Text>
              <Text style={styles.detailGridValue}>
                {rfq.price > 0 ? `₹${rfq.price}` : 'On Request'}
              </Text>
            </View>
          </View>
        </View>

        {/* Business Details */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconBg, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="business-outline" size={18} color="#28A745" />
            </View>
            <Text style={styles.sectionTitle}>Business Details</Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="storefront-outline" size={18} color="#888" />
            <View style={styles.detailRowContent}>
              <Text style={styles.detailLabel}>Business Name</Text>
              <Text style={styles.detailValue}>{rfq.business_name || 'N/A'}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="mail-outline" size={18} color="#888" />
            <View style={styles.detailRowContent}>
              <Text style={styles.detailLabel}>Email</Text>
              <Text style={styles.detailValue}>{rfq.business_email || 'N/A'}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="call-outline" size={18} color="#888" />
            <View style={styles.detailRowContent}>
              <Text style={styles.detailLabel}>Phone</Text>
              <Text style={styles.detailValue}>{rfq.business_phone || 'N/A'}</Text>
            </View>
          </View>
        </View>

        {/* Location Details */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconBg, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="location-outline" size={18} color="#FF9500" />
            </View>
            <Text style={styles.sectionTitle}>Location</Text>
          </View>

          {rfq.address ? (
            <View style={styles.detailRow}>
              <Ionicons name="map-outline" size={18} color="#888" />
              <View style={styles.detailRowContent}>
                <Text style={styles.detailLabel}>Address</Text>
                <Text style={styles.detailValue}>{rfq.address}</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.detailRow}>
            <Ionicons name="business-outline" size={18} color="#888" />
            <View style={styles.detailRowContent}>
              <Text style={styles.detailLabel}>City</Text>
              <Text style={styles.detailValue}>{rfq.city || 'N/A'}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="globe-outline" size={18} color="#888" />
            <View style={styles.detailRowContent}>
              <Text style={styles.detailLabel}>State</Text>
              <Text style={styles.detailValue}>{rfq.state || 'N/A'}</Text>
            </View>
          </View>
        </View>

        {/* Date Info */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconBg, { backgroundColor: '#FCE4EC' }]}>
              <Ionicons name="time-outline" size={18} color="#E91E63" />
            </View>
            <Text style={styles.sectionTitle}>Timeline</Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={18} color="#888" />
            <View style={styles.detailRowContent}>
              <Text style={styles.detailLabel}>Created</Text>
              <Text style={styles.detailValue}>{formatDate(rfq.created_at)}</Text>
            </View>
          </View>

          {rfq.updated_at && rfq.updated_at !== rfq.created_at && (
            <View style={styles.detailRow}>
              <Ionicons name="refresh-outline" size={18} color="#888" />
              <View style={styles.detailRowContent}>
                <Text style={styles.detailLabel}>Last Updated</Text>
                <Text style={styles.detailValue}>{formatDate(rfq.updated_at)}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsCard}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleProfile(rfq.business_id)}
          >
            <Ionicons name="person-outline" size={22} color="#177DDF" />
            <Text style={styles.actionButtonText}>View Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#E8F5E9' }]}
            onPress={() => handleContact(rfq.business_phone)}
          >
            <Ionicons name="call-outline" size={22} color="#28A745" />
            <Text style={[styles.actionButtonText, { color: '#28A745' }]}>Call</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#E8F5E9' }]}
            onPress={() => handleWhatsApp(rfq.business_phone)}
          >
            <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
            <Text style={[styles.actionButtonText, { color: '#25D366' }]}>WhatsApp</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#FFF3E0' }]}
            onPress={() => handleEmail(rfq.business_email)}
          >
            <Ionicons name="mail-outline" size={22} color="#FF9500" />
            <Text style={[styles.actionButtonText, { color: '#FF9500' }]}>Email</Text>
          </TouchableOpacity>
        </View>

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
  loadingText: { marginTop: 12, fontSize: 15, color: '#666' },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#999', marginTop: 8 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  productIconLarge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  activeBadge: { backgroundColor: '#E8F5E9' },
  inactiveBadge: { backgroundColor: '#FFEBEE' },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  rfqBadge: {
    backgroundColor: '#177DDF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  rfqBadgeText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sectionIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  detailGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  detailGridItem: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 6,
  },
  detailGridLabel: { fontSize: 12, color: '#888' },
  detailGridValue: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  detailRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F8F8',
    gap: 10,
  },
  detailRowContent: { flex: 1 },
  detailLabel: { fontSize: 12, color: '#888', marginBottom: 2 },
  detailValue: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  actionsCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#E3F2FD',
    paddingVertical: 14,
    borderRadius: 12,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#177DDF',
  },
});

export default RfqDetailScreen;

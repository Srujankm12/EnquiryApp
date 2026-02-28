import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
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

const EnquiriesScreen: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [rfqs, setRfqs] = useState<RFQ[]>([]);

  useEffect(() => {
    fetchRFQs();
  }, []);

  const fetchRFQs = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_URL}/rfq/get/all`, { headers });
      const data = res.data?.rfqs || res.data?.data?.rfqs || [];
      setRfqs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching RFQs:', error);
      setRfqs([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRFQs();
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

  const filteredRFQs = rfqs.filter((rfq) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      rfq.product_name?.toLowerCase().includes(query) ||
      rfq.business_name?.toLowerCase().includes(query) ||
      rfq.city?.toLowerCase().includes(query)
    );
  });

  const renderRFQCard = (rfq: RFQ, index: number) => (
    <View key={`${rfq.id}-${index}`} style={styles.rfqCard}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={styles.productIconContainer}>
            <Ionicons name="cube" size={20} color="#177DDF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.productName} numberOfLines={1}>{rfq.product_name}</Text>
            <Text style={styles.businessNameText} numberOfLines={1}>{rfq.business_name}</Text>
          </View>
        </View>
        <View style={styles.rfqBadge}>
          <Text style={styles.rfqBadgeText}>RFQ</Text>
        </View>
      </View>

      {/* Details */}
      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Ionicons name="layers-outline" size={14} color="#888" />
          <Text style={styles.detailText}>{rfq.quantity} {rfq.unit}</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="pricetag-outline" size={14} color="#888" />
          <Text style={styles.detailText}>
            {rfq.price > 0 ? `₹${rfq.price}` : 'On Request'}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="location-outline" size={14} color="#888" />
          <Text style={styles.detailText} numberOfLines={1}>{rfq.city}</Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.cardFooter}>
        <Text style={styles.dateText}>{formatDate(rfq.created_at)}</Text>
        <View style={styles.footerActions}>
          <TouchableOpacity
            style={styles.footerBtn}
            onPress={() => handleProfile(rfq.business_id)}
          >
            <Ionicons name="person-outline" size={16} color="#177DDF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.footerBtn}
            onPress={() => handleContact(rfq.business_phone)}
          >
            <Ionicons name="call-outline" size={16} color="#177DDF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.footerBtn}
            onPress={() => handleWhatsApp(rfq.business_phone)}
          >
            <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#177DDF" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Buyer Requests</Text>
        <TouchableOpacity onPress={() => router.push('/pages/requestQutation' as any)}>
          <Ionicons name="add-circle" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by product, business, city..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Count Banner */}
      <View style={styles.countBanner}>
        <Ionicons name="document-text-outline" size={16} color="#177DDF" />
        <Text style={styles.countText}>
          {filteredRFQs.length} active request{filteredRFQs.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Loading */}
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#177DDF" />
          <Text style={styles.loadingText}>Loading requests...</Text>
        </View>
      ) : (
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
          {filteredRFQs.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={64} color="#CCC" />
              <Text style={styles.emptyTitle}>
                {searchQuery ? 'No Results' : 'No Requests Yet'}
              </Text>
              <Text style={styles.emptySubtext}>
                {searchQuery
                  ? 'Try adjusting your search'
                  : 'Active buyer requests will appear here'}
              </Text>
              {!searchQuery && (
                <TouchableOpacity
                  style={styles.createBtn}
                  onPress={() => router.push('/pages/requestQutation' as any)}
                >
                  <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.createBtnText}>Create RFQ</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            filteredRFQs.map((rfq, index) => renderRFQCard(rfq, index))
          )}

          <View style={styles.bottomPadding} />
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    backgroundColor: '#177DDF', paddingTop: 50, paddingBottom: 12, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  searchWrapper: { backgroundColor: '#177DDF', paddingHorizontal: 16, paddingBottom: 12 },
  searchContainer: {
    backgroundColor: '#FFFFFF', borderRadius: 10, flexDirection: 'row',
    alignItems: 'center', paddingHorizontal: 12, height: 44,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15, color: '#333' },
  countBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#E3F2FD',
  },
  countText: { fontSize: 13, fontWeight: '600', color: '#177DDF' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 15, color: '#666' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingTop: 12 },
  rfqCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, marginBottom: 12,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, paddingBottom: 10,
  },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  productIconContainer: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: '#E3F2FD',
    justifyContent: 'center', alignItems: 'center',
  },
  productName: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  businessNameText: { fontSize: 12, color: '#888', marginTop: 2 },
  rfqBadge: {
    backgroundColor: '#177DDF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  rfqBadgeText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  detailsRow: {
    flexDirection: 'row', paddingHorizontal: 14, paddingBottom: 10, gap: 16,
  },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText: { fontSize: 12, color: '#666' },
  cardFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: '#F0F0F0', backgroundColor: '#FAFAFA',
  },
  dateText: { fontSize: 11, color: '#AAA' },
  footerActions: { flexDirection: 'row', gap: 8 },
  footerBtn: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: '#F0F7FF',
    justifyContent: 'center', alignItems: 'center',
  },
  emptyContainer: {
    justifyContent: 'center', alignItems: 'center',
    paddingVertical: 80, paddingHorizontal: 40,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#999', marginTop: 8, textAlign: 'center', lineHeight: 20 },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#177DDF', paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: 8, marginTop: 20,
  },
  createBtnText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  bottomPadding: { height: 80 },
});

export default EnquiriesScreen;

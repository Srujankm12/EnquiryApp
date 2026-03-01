import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Constants from "expo-constants";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState, useRef } from "react";
import {
  ActivityIndicator,
  AppState,
  Linking,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

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

const BuyTradeLeadsScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tradeLeads, setTradeLeads] = useState<RFQ[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    fetchTradeLeads();
  }, []);

  // Auto-refresh every 30 seconds + on app foreground
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      fetchTradeLeads(false);
    }, 30000);

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === "active") {
        fetchTradeLeads(false);
      }
      appState.current = nextAppState;
    });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      subscription.remove();
    };
  }, []);

  const fetchTradeLeads = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_URL}/rfq/get/all`, { headers });

      const rfqs = res.data?.rfqs || res.data?.data?.rfqs || [];
      setTradeLeads(Array.isArray(rfqs) ? rfqs : []);
    } catch (error) {
      console.error("Error fetching trade leads:", error);
      if (showLoader) setTradeLeads([]);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTradeLeads(false);
    setRefreshing(false);
  }, []);

  const handleBack = () => router.back();

  const handleProfile = (businessId: string) => {
    router.push({
      pathname: "/pages/bussinesProfile" as any,
      params: { business_id: businessId },
    });
  };

  const handleContact = (phone?: string) => {
    if (phone) Linking.openURL(`tel:${phone}`);
  };

  const handleWhatsApp = (phone?: string) => {
    if (phone) {
      const cleaned = phone.replace(/[^0-9]/g, "");
      Linking.openURL(`https://wa.me/${cleaned}`);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const handleRfqPress = (rfqId: string) => {
    router.push({
      pathname: "/pages/rfqDetail" as any,
      params: { rfq_id: rfqId },
    });
  };

  const renderLeadCard = (lead: RFQ, index: number) => (
    <TouchableOpacity
      key={`${lead.id}-${index}`}
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => handleRfqPress(lead.id)}
    >
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={styles.iconContainer}>
            <Ionicons name="briefcase" size={20} color="#177DDF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.productName} numberOfLines={1}>
              {lead.product_name}
            </Text>
            <Text style={styles.businessName} numberOfLines={1}>
              {lead.business_name}
            </Text>
          </View>
        </View>

        <View style={styles.badge}>
          <Text style={styles.badgeText}>TRADE</Text>
        </View>
      </View>

      {/* Details */}
      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Ionicons name="layers-outline" size={14} color="#888" />
          <Text style={styles.detailText}>
            {lead.quantity} {lead.unit}
          </Text>
        </View>

        <View style={styles.detailItem}>
          <Ionicons name="pricetag-outline" size={14} color="#888" />
          <Text style={styles.detailText}>
            {lead.price > 0 ? `₹${lead.price}` : "On Request"}
          </Text>
        </View>

        <View style={styles.detailItem}>
          <Ionicons name="location-outline" size={14} color="#888" />
          <Text style={styles.detailText} numberOfLines={1}>
            {lead.city}
          </Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.cardFooter}>
        <Text style={styles.dateText}>{formatDate(lead.created_at)}</Text>

        <View style={styles.footerActions}>
          <TouchableOpacity
            style={styles.footerBtn}
            onPress={(e) => { e.stopPropagation(); handleProfile(lead.business_id); }}
          >
            <Ionicons name="person-outline" size={16} color="#177DDF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.footerBtn}
            onPress={(e) => { e.stopPropagation(); handleContact(lead.business_phone); }}
          >
            <Ionicons name="call-outline" size={16} color="#177DDF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.footerBtn}
            onPress={(e) => { e.stopPropagation(); handleWhatsApp(lead.business_phone); }}
          >
            <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#177DDF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Buy Trade Leads</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#177DDF" />
          <Text style={styles.loadingText}>Loading trade leads...</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#177DDF"]}
            />
          }
        >
          {/* Info Banner */}
          <View style={styles.infoBanner}>
            <Ionicons name="document-text-outline" size={16} color="#177DDF" />
            <Text style={styles.infoText}>
              {tradeLeads.length} active trade lead
              {tradeLeads.length !== 1 ? "s" : ""}
            </Text>
          </View>

          {tradeLeads.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="briefcase-outline" size={64} color="#CCC" />
              <Text style={styles.emptyTitle}>No Trade Leads</Text>
              <Text style={styles.emptySubtext}>
                Active trade leads will appear here
              </Text>
            </View>
          ) : (
            tradeLeads.map((lead, index) => renderLeadCard(lead, index))
          )}

          <View style={{ height: 80 }} />
        </ScrollView>
      )}
    </View>
  );
};

export default BuyTradeLeadsScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },

  header: {
    backgroundColor: "#177DDF",
    paddingTop: 50,
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#666",
  },

  scrollContent: {
    padding: 16,
    paddingTop: 12,
  },

  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#E3F2FD",
    borderRadius: 8,
    marginBottom: 12,
  },

  infoText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#177DDF",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    overflow: "hidden",
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },

  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },

  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#E3F2FD",
    justifyContent: "center",
    alignItems: "center",
  },

  productName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A1A",
  },

  businessName: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },

  badge: {
    backgroundColor: "#177DDF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },

  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  detailsRow: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingBottom: 10,
    gap: 16,
  },

  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  detailText: {
    fontSize: 12,
    color: "#666",
  },

  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    backgroundColor: "#FAFAFA",
  },

  dateText: {
    fontSize: 11,
    color: "#AAA",
  },

  footerActions: {
    flexDirection: "row",
    gap: 8,
  },

  footerBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F0F7FF",
    justifyContent: "center",
    alignItems: "center",
  },

  emptyContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
  },

  emptySubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
  },
});

import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Constants from "expo-constants";

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
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [tradeLeads, setTradeLeads] = useState<RFQ[]>([]);

  useEffect(() => {
    fetchTradeLeads();
  }, []);

  const fetchTradeLeads = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_URL}/rfq/get/all`, { headers });
      const rfqs = res.data?.rfqs || res.data?.data?.rfqs || [];
      setTradeLeads(Array.isArray(rfqs) ? rfqs : []);
    } catch (error) {
      console.error("Error fetching RFQs:", error);
      setTradeLeads([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTradeLeads();
    setRefreshing(false);
  };

  const handleBack = () => {
    router.back();
  };

  const handleProfile = (businessId: string) => {
    if (businessId) {
      router.push({
        pathname: "/pages/bussinesProfile" as any,
        params: { business_id: businessId },
      });
    }
  };

  const handleContact = (phone?: string) => {
    if (phone) Linking.openURL(`tel:${phone}`);
  };

  const handleMessage = (email?: string) => {
    if (email) Linking.openURL(`mailto:${email}`);
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

  const renderLeadCard = (lead: RFQ, index: number) => (
    <View key={`${lead.id}-${index}`} style={styles.leadCard}>
      {/* Card Header */}
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.businessName} numberOfLines={1}>
            {lead.business_name}
          </Text>
          <View style={styles.locationContainer}>
            <Ionicons name="location" size={14} color="#666" />
            <Text style={styles.locationText}>
              {lead.city}
              {lead.state ? `, ${lead.state}` : ""}
            </Text>
          </View>
        </View>
        <View style={styles.rfqBadge}>
          <Text style={styles.rfqBadgeText}>RFQ</Text>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Lead Details */}
      <View style={styles.detailsContainer}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Product :</Text>
          <Text style={styles.detailValue}>{lead.product_name}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Quantity :</Text>
          <Text style={styles.detailValue}>
            {lead.quantity} {lead.unit}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Price :</Text>
          <Text style={styles.detailValue}>
            {lead.price > 0 ? `₹${lead.price}` : "On Request"}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Posted :</Text>
          <Text style={styles.detailValue}>{formatDate(lead.created_at)}</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleProfile(lead.business_id)}
        >
          <Ionicons name="person-outline" size={18} color="#177DDF" />
          <Text style={styles.actionButtonText}>Profile</Text>
        </TouchableOpacity>

        <View style={styles.actionDivider} />

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleContact(lead.business_phone)}
        >
          <Ionicons name="call-outline" size={18} color="#177DDF" />
          <Text style={styles.actionButtonText}>Contact</Text>
        </TouchableOpacity>

        <View style={styles.actionDivider} />

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleMessage(lead.business_email)}
        >
          <Ionicons name="mail-outline" size={18} color="#177DDF" />
          <Text style={styles.actionButtonText}>Message</Text>
        </TouchableOpacity>

        <View style={styles.actionDivider} />

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleWhatsApp(lead.business_phone)}
        >
          <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
          <Text style={styles.actionButtonText}>WhatsApp</Text>
        </TouchableOpacity>
      </View>
    </View>
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
        <Text style={styles.headerTitle}>Buy Trade Leads</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Loading Indicator */}
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#177DDF" />
          <Text style={styles.loadingText}>Loading trade leads...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#177DDF"]}
              tintColor="#177DDF"
            />
          }
        >
          {/* Info Banner */}
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle" size={20} color="#177DDF" />
            <Text style={styles.infoBannerText}>
              {tradeLeads.length} active trade lead
              {tradeLeads.length !== 1 ? "s" : ""} available
            </Text>
          </View>

          {/* Trade Leads List */}
          <View style={styles.leadsContainer}>
            {tradeLeads.length > 0 ? (
              tradeLeads.map((lead, index) => renderLeadCard(lead, index))
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="briefcase-outline" size={64} color="#CCC" />
                <Text style={styles.emptyText}>No trade leads available</Text>
                <Text style={styles.emptySubtext}>
                  Check back later for new opportunities
                </Text>
              </View>
            )}
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  header: {
    backgroundColor: "#177DDF",
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: { padding: 4 },
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
  loadingText: { marginTop: 12, fontSize: 16, color: "#666" },
  scrollView: { flex: 1 },
  infoBanner: {
    backgroundColor: "#E3F2FD",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 8,
    marginHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  infoBannerText: {
    fontSize: 14,
    color: "#177DDF",
    fontWeight: "500",
    flex: 1,
  },
  leadsContainer: { padding: 16, paddingTop: 12 },
  leadCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 16,
    paddingBottom: 12,
  },
  headerLeft: { flex: 1 },
  businessName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
    marginBottom: 6,
  },
  locationContainer: { flexDirection: "row", alignItems: "center", gap: 4 },
  locationText: { fontSize: 13, color: "#666" },
  rfqBadge: {
    backgroundColor: "#177DDF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  rfqBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  divider: { height: 1, backgroundColor: "#F0F0F0", marginHorizontal: 16 },
  detailsContainer: { padding: 16, paddingTop: 12 },
  detailRow: { flexDirection: "row", marginBottom: 8 },
  detailLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
    width: 120,
  },
  detailValue: {
    fontSize: 14,
    color: "#000",
    fontWeight: "600",
    flex: 1,
  },
  actionButtons: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    backgroundColor: "#FAFAFA",
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 6,
  },
  actionDivider: { width: 1, backgroundColor: "#E0E0E0" },
  actionButtonText: { fontSize: 13, color: "#177DDF", fontWeight: "600" },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#999",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#BBB",
    marginTop: 8,
    textAlign: "center",
  },
  bottomPadding: { height: 80 },
});

export default BuyTradeLeadsScreen;

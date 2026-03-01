import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Constants from "expo-constants";
import { router } from "expo-router";
import { jwtDecode } from "jwt-decode";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  category_id: string;
  sub_category_id: string;
  product_name: string;
  quantity: number;
  unit: string;
  price: number;
  is_rfq_active: boolean;
  created_at: string;
  updated_at: string;
}

const MyRFQsScreen: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [businessId, setBusinessId] = useState<string>("");

  useEffect(() => {
    loadAndFetch();
  }, []);

  const loadAndFetch = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;
      const decoded: any = jwtDecode(token);
      const storedCompanyId = await AsyncStorage.getItem("companyId");
      const bId = storedCompanyId || decoded.business_id || "";
      setBusinessId(bId);
      if (bId) {
        await fetchMyRFQs(bId);
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  };

  const fetchMyRFQs = async (bId: string) => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_URL}/rfq/get/${bId}`, { headers });
      const data = res.data?.rfqs || res.data?.data?.rfqs || [];
      setRfqs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching my RFQs:", error);
      setRfqs([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (businessId) {
      await fetchMyRFQs(businessId);
    }
    setRefreshing(false);
  }, [businessId]);

  const handleToggleStatus = async (rfqId: string, currentActive: boolean) => {
    try {
      const token = await AsyncStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(
        `${API_URL}/rfq/update/status/${rfqId}`,
        { is_rfq_active: !currentActive },
        { headers },
      );
      setRfqs((prev) =>
        prev.map((r) =>
          r.id === rfqId ? { ...r, is_rfq_active: !currentActive } : r,
        ),
      );
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.response?.data?.error || "Failed to update status",
      );
    }
  };

  const handleDelete = (rfqId: string) => {
    Alert.alert("Delete RFQ", "Are you sure you want to delete this RFQ?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };
            await axios.delete(`${API_URL}/rfq/delete/${rfqId}`, { headers });
            setRfqs((prev) => prev.filter((r) => r.id !== rfqId));
          } catch (error: any) {
            Alert.alert(
              "Error",
              error?.response?.data?.error || "Failed to delete RFQ",
            );
          }
        },
      },
    ]);
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      if (days === 0) return "Today";
      if (days === 1) return "Yesterday";
      if (days < 7) return `${days} days ago`;
      return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const renderRFQCard = (rfq: RFQ, index: number) => (
    <View key={`${rfq.id}-${index}`} style={styles.rfqCard}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={styles.productIconContainer}>
            <Ionicons name="cube" size={20} color="#177DDF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.productName} numberOfLines={1}>
              {rfq.product_name}
            </Text>
            <Text style={styles.dateText}>{formatDate(rfq.created_at)}</Text>
          </View>
        </View>
        <View
          style={[
            styles.statusBadge,
            rfq.is_rfq_active ? styles.activeBadge : styles.inactiveBadge,
          ]}
        >
          <Text
            style={[
              styles.statusBadgeText,
              rfq.is_rfq_active ? styles.activeText : styles.inactiveText,
            ]}
          >
            {rfq.is_rfq_active ? "Active" : "Inactive"}
          </Text>
        </View>
      </View>

      {/* Details */}
      <View style={styles.detailsContainer}>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Ionicons name="layers-outline" size={14} color="#888" />
            <Text style={styles.detailText}>
              {rfq.quantity} {rfq.unit}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="pricetag-outline" size={14} color="#888" />
            <Text style={styles.detailText}>
              {rfq.price > 0 ? `₹${rfq.price}` : "On Request"}
            </Text>
          </View>
        </View>
        {rfq.city ? (
          <View style={styles.detailItem}>
            <Ionicons name="location-outline" size={14} color="#888" />
            <Text style={styles.detailText}>
              {rfq.city}
              {rfq.state ? `, ${rfq.state}` : ""}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Actions */}
      <View style={styles.cardFooter}>
        <TouchableOpacity
          style={[
            styles.actionBtn,
            rfq.is_rfq_active ? styles.deactivateBtn : styles.activateBtn,
          ]}
          onPress={() => handleToggleStatus(rfq.id, rfq.is_rfq_active)}
        >
          <Ionicons
            name={
              rfq.is_rfq_active ? "pause-circle-outline" : "play-circle-outline"
            }
            size={16}
            color={rfq.is_rfq_active ? "#FF9500" : "#34C759"}
          />
          <Text
            style={[
              styles.actionBtnText,
              { color: rfq.is_rfq_active ? "#FF9500" : "#34C759" },
            ]}
          >
            {rfq.is_rfq_active ? "Deactivate" : "Activate"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.deleteBtn]}
          onPress={() => handleDelete(rfq.id)}
        >
          <Ionicons name="trash-outline" size={16} color="#DC3545" />
          <Text style={[styles.actionBtnText, { color: "#DC3545" }]}>
            Delete
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#177DDF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My RFQs</Text>
        <TouchableOpacity
          onPress={() => router.push("/pages/requestQutation" as any)}
        >
          <Ionicons name="add-circle" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Ionicons name="document-text-outline" size={16} color="#177DDF" />
        <Text style={styles.infoBannerText}>
          {rfqs.length} RFQ{rfqs.length !== 1 ? "s" : ""} posted by you
        </Text>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#177DDF" />
          <Text style={styles.loadingText}>Loading your RFQs...</Text>
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
              colors={["#177DDF"]}
            />
          }
        >
          {rfqs.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={64} color="#CCC" />
              <Text style={styles.emptyTitle}>No RFQs Yet</Text>
              <Text style={styles.emptySubtext}>
                Create a Request for Quotation to let sellers know what you need
              </Text>
              <TouchableOpacity
                style={styles.createBtn}
                onPress={() => router.push("/pages/requestQutation" as any)}
              >
                <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
                <Text style={styles.createBtnText}>Create RFQ</Text>
              </TouchableOpacity>
            </View>
          ) : (
            rfqs.map((rfq, index) => renderRFQCard(rfq, index))
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
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
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#FFFFFF" },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#E3F2FD",
  },
  infoBannerText: { fontSize: 13, fontWeight: "600", color: "#177DDF" },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, fontSize: 15, color: "#666" },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingTop: 12 },
  rfqCard: {
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
    paddingBottom: 10,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  productIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#E3F2FD",
    justifyContent: "center",
    alignItems: "center",
  },
  productName: { fontSize: 15, fontWeight: "700", color: "#1A1A1A" },
  dateText: { fontSize: 11, color: "#AAA", marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  activeBadge: { backgroundColor: "#E8F5E9" },
  inactiveBadge: { backgroundColor: "#FFF3E0" },
  statusBadgeText: { fontSize: 11, fontWeight: "700" },
  activeText: { color: "#34C759" },
  inactiveText: { color: "#FF9500" },
  detailsContainer: { paddingHorizontal: 14, paddingBottom: 10 },
  detailRow: { flexDirection: "row", gap: 16, marginBottom: 4 },
  detailItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  detailText: { fontSize: 12, color: "#666" },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    backgroundColor: "#FAFAFA",
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  activateBtn: { borderColor: "#34C759", backgroundColor: "#F0FFF4" },
  deactivateBtn: { borderColor: "#FF9500", backgroundColor: "#FFFAF0" },
  deleteBtn: { borderColor: "#DC3545", backgroundColor: "#FFF5F5" },
  actionBtnText: { fontSize: 13, fontWeight: "600" },
  emptyContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: "#333", marginTop: 16 },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#177DDF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  createBtnText: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },
});

export default MyRFQsScreen;

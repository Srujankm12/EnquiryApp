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

interface TradeLead {
  id: string;
  businessName: string;
  location: string;
  productCategory: string;
  productSubCategory: string;
  quantity: string;
  unit: string;
  requirement: string;
  rfqDate: string;
  phoneNumber?: string;
}

const BuyTradeLeadsScreen: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [tradeLeads, setTradeLeads] = useState<TradeLead[]>([]);

  useEffect(() => {
    fetchTradeLeads();
  }, []);

  const fetchTradeLeads = async () => {
    setLoading(true);

    // Simulate API call
    setTimeout(() => {
      const dummyLeads: TradeLead[] = [
        {
          id: "1",
          businessName: "South Canara Agro Mart",
          location: "Mangalore",
          productCategory: "Cashew",
          productSubCategory: "2-Pices",
          quantity: "200kg",
          unit: "300rs",
          requirement: "XYZ",
          rfqDate: "1234567",
          phoneNumber: "+911234567890",
        },
        {
          id: "2",
          businessName: "Kaibavi",
          location: "Mangalore",
          productCategory: "Cashew",
          productSubCategory: "2-Pices",
          quantity: "200kg",
          unit: "300rs",
          requirement: "XYZ",
          rfqDate: "1234567",
          phoneNumber: "+911234567890",
        },
        {
          id: "3",
          businessName: "Cashew Coast.",
          location: "Mangalore",
          productCategory: "Cashew",
          productSubCategory: "2-Pices",
          quantity: "200kg",
          unit: "300rs",
          requirement: "XYZ",
          rfqDate: "1234567",
          phoneNumber: "+911234567890",
        },
        {
          id: "4",
          businessName: "Premium Nuts Trading",
          location: "Bangalore",
          productCategory: "Almond",
          productSubCategory: "California",
          quantity: "500kg",
          unit: "800rs",
          requirement: "A1 Grade",
          rfqDate: "1234568",
          phoneNumber: "+919876543210",
        },
        {
          id: "5",
          businessName: "Golden Harvest",
          location: "Mumbai",
          productCategory: "Dates",
          productSubCategory: "Medjool",
          quantity: "1000kg",
          unit: "150rs",
          requirement: "Fresh Stock",
          rfqDate: "1234569",
          phoneNumber: "+919988776655",
        },
      ];

      setTradeLeads(dummyLeads);
      setLoading(false);
    }, 1500);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTradeLeads();
    setRefreshing(false);
  };

  const handleBack = () => {
    router.back();
  };

  const handleProfile = (leadId: string, businessName: string) => {
    console.log(`View profile: ${businessName}`);
    // router.push(`/pages/businessProfile/${leadId}`);
  };

  const handleContact = (phoneNumber?: string) => {
    if (phoneNumber) {
      Linking.openURL(`tel:${phoneNumber}`);
    }
  };

  const handleMessage = (leadId: string) => {
    console.log(`Send message to lead: ${leadId}`);
  };

  const handleWhatsApp = (phoneNumber?: string) => {
    if (phoneNumber) {
      Linking.openURL(`whatsapp://send?phone=${phoneNumber}`);
    }
  };

  const renderLeadCard = (lead: TradeLead) => (
    <View key={lead.id} style={styles.leadCard}>
      {/* Card Header */}
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.businessName} numberOfLines={1}>
            {lead.businessName}
          </Text>
          <View style={styles.locationContainer}>
            <Ionicons name="location" size={14} color="#666" />
            <Text style={styles.locationText}>{lead.location}</Text>
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
          <Text style={styles.detailLabel}>Product Category :</Text>
          <Text style={styles.detailValue}>{lead.productCategory}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Product Sub Category :</Text>
          <Text style={styles.detailValue}>{lead.productSubCategory}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Quantity :</Text>
          <Text style={styles.detailValue}>{lead.quantity}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Unit :</Text>
          <Text style={styles.detailValue}>{lead.unit}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Requirement :</Text>
          <Text style={styles.detailValue}>{lead.requirement}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>RFQ Date :</Text>
          <Text style={styles.detailValue}>{lead.rfqDate}</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleProfile(lead.id, lead.businessName)}
        >
          <Ionicons name="person-outline" size={18} color="#177DDF" />
          <Text style={styles.actionButtonText}>Profile</Text>
        </TouchableOpacity>

        <View style={styles.actionDivider} />

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleContact(lead.phoneNumber)}
        >
          <Ionicons name="call-outline" size={18} color="#177DDF" />
          <Text style={styles.actionButtonText}>Contact</Text>
        </TouchableOpacity>

        <View style={styles.actionDivider} />

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleMessage(lead.id)}
        >
          <Ionicons name="mail-outline" size={18} color="#177DDF" />
          <Text style={styles.actionButtonText}>Message</Text>
        </TouchableOpacity>

        <View style={styles.actionDivider} />

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleWhatsApp(lead.phoneNumber)}
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
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="filter" size={22} color="#FFFFFF" />
        </TouchableOpacity>
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
              {tradeLeads.length} active trade leads available
            </Text>
          </View>

          {/* Trade Leads List */}
          <View style={styles.leadsContainer}>
            {tradeLeads.length > 0 ? (
              tradeLeads.map((lead) => renderLeadCard(lead))
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
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
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
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FFFFFF",
    flex: 1,
    marginLeft: 12,
  },
  filterButton: {
    padding: 4,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  scrollView: {
    flex: 1,
  },
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
  leadsContainer: {
    padding: 16,
    paddingTop: 12,
  },
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
  headerLeft: {
    flex: 1,
  },
  businessName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
    marginBottom: 6,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    fontSize: 13,
    color: "#666",
  },
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
  divider: {
    height: 1,
    backgroundColor: "#F0F0F0",
    marginHorizontal: 16,
  },
  detailsContainer: {
    padding: 16,
    paddingTop: 12,
  },
  detailRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
    width: 165,
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
    fontSize: 14,             
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 6,
  },
  actionDivider: {
    width: 1,
    backgroundColor: "#E0E0E0",
  },
  actionButtonText: {
    fontSize: 13,
    color: "#177DDF",
    fontWeight: "600",
  },
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
  bottomPadding: {
    height: 80,
  },
});

export default BuyTradeLeadsScreen;

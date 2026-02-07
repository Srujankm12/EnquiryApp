import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  ScrollView,
  Alert,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";
import Constants from "expo-constants";

const API_URL = Constants.expoConfig?.extra?.API_URL;

interface ApplicationData {
  application_id: string;
  company_id: string;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

interface CompanyData {
  company_id: string;
  company_name: string;
  company_email: string;
  company_phone: string;
  company_profile_url: string | null;
  company_city: string;
  company_state: string;
  is_verified: boolean;
  is_approved: boolean;
}

const SellerApplicationStatus: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [application, setApplication] = useState<ApplicationData | null>(null);
  const [company, setCompany] = useState<CompanyData | null>(null);

  useEffect(() => {
    fetchApplicationStatus();
  }, []);

  const fetchApplicationStatus = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Error", "Please login to continue");
        router.replace("/pages/loginMail");
        return;
      }

      const decoded: any = jwtDecode(token);
      const userId = decoded.user_id;

      // First get user's company
      const companyRes = await fetch(
        `${API_URL}/company/get/user/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (companyRes.status === 404) {
        setApplication(null);
        setCompany(null);
        return;
      }

      if (!companyRes.ok) throw new Error("Failed to fetch company");

      const companyResult = await companyRes.json();
      const companyData =
        companyResult.data?.company || companyResult.data;
      const companyId = companyData?.company_id;

      if (!companyId) {
        setApplication(null);
        return;
      }

      setCompany(companyData);

      // Fetch application status
      const appRes = await fetch(
        `${API_URL}/company/application/get/company/${companyId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (appRes.ok) {
        const appResult = await appRes.json();
        const appData =
          appResult.data?.application || appResult.data;
        setApplication(appData);

        if (appData?.status) {
          await AsyncStorage.setItem("sellerStatus", appData.status);
        }
      }
    } catch (error) {
      console.error("Error fetching application status:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchApplicationStatus();
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusConfig = (status: string) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return {
          icon: "checkmark-circle" as const,
          color: "#28A745",
          bgColor: "#D4EDDA",
          borderColor: "#C3E6CB",
          title: "Application Approved",
          message:
            "Your seller application has been approved. You can now access the seller dashboard.",
        };
      case "pending":
        return {
          icon: "time" as const,
          color: "#FFC107",
          bgColor: "#FFF3CD",
          borderColor: "#FFEEBA",
          title: "Application Under Review",
          message:
            "Your seller application is being reviewed by our team. This usually takes 1-3 business days.",
        };
      case "rejected":
        return {
          icon: "close-circle" as const,
          color: "#DC3545",
          bgColor: "#F8D7DA",
          borderColor: "#F5C6CB",
          title: "Application Rejected",
          message:
            "Unfortunately, your seller application was not approved. Please review the feedback and resubmit.",
        };
      default:
        return {
          icon: "help-circle" as const,
          color: "#6C757D",
          bgColor: "#E2E3E5",
          borderColor: "#D6D8DB",
          title: "No Application Found",
          message:
            "You haven't submitted a seller application yet. Start the process to become a seller.",
        };
    }
  };

  const handleGoToSellerDashboard = () => {
    router.replace("/(seller)");
  };

  const handleEditApplication = () => {
    router.push("/pages/becomeSellerForm");
  };

  const handleGoBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#177DDF" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Application Status</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#0078D7" />
          <Text style={styles.loaderText}>Loading status...</Text>
        </View>
      </View>
    );
  }

  const status = application?.status || "none";
  const config = getStatusConfig(status);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#177DDF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Application Status</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Status Card */}
        <View
          style={[
            styles.statusCard,
            { backgroundColor: config.bgColor, borderColor: config.borderColor },
          ]}
        >
          <Ionicons name={config.icon} size={64} color={config.color} />
          <Text style={[styles.statusTitle, { color: config.color }]}>
            {config.title}
          </Text>
          <Text style={styles.statusMessage}>{config.message}</Text>
        </View>

        {/* Company Info */}
        {company && (
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Ionicons name="business" size={20} color="#0078D7" />
              <Text style={styles.infoTitle}>Company Details</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>{company.company_name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{company.company_email}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{company.company_phone}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Location</Text>
              <Text style={styles.infoValue}>
                {company.company_city}, {company.company_state}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Verified</Text>
              <View style={styles.badgeRow}>
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: company.is_verified
                        ? "#D4EDDA"
                        : "#F8D7DA",
                    },
                  ]}
                >
                  <Ionicons
                    name={company.is_verified ? "checkmark" : "close"}
                    size={14}
                    color={company.is_verified ? "#28A745" : "#DC3545"}
                  />
                  <Text
                    style={[
                      styles.badgeText,
                      {
                        color: company.is_verified ? "#28A745" : "#DC3545",
                      },
                    ]}
                  >
                    {company.is_verified ? "Verified" : "Not Verified"}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Application Details */}
        {application && (
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Ionicons name="document-text" size={20} color="#0078D7" />
              <Text style={styles.infoTitle}>Application Details</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Application ID</Text>
              <Text style={styles.infoValueSmall}>
                {application.application_id}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Submitted On</Text>
              <Text style={styles.infoValue}>
                {formatDate(application.created_at)}
              </Text>
            </View>
            {application.reviewed_at && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Reviewed On</Text>
                <Text style={styles.infoValue}>
                  {formatDate(application.reviewed_at)}
                </Text>
              </View>
            )}
            {application.rejection_reason && (
              <View style={styles.rejectionCard}>
                <Ionicons
                  name="warning"
                  size={18}
                  color="#DC3545"
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rejectionTitle}>Rejection Reason</Text>
                  <Text style={styles.rejectionText}>
                    {application.rejection_reason}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {status.toLowerCase() === "approved" && (
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryButton]}
              onPress={handleGoToSellerDashboard}
            >
              <Ionicons name="storefront" size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>
                Go to Seller Dashboard
              </Text>
            </TouchableOpacity>
          )}

          {status.toLowerCase() === "rejected" && (
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryButton]}
              onPress={handleEditApplication}
            >
              <Ionicons name="create" size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>
                Edit & Resubmit Application
              </Text>
            </TouchableOpacity>
          )}

          {!application && (
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryButton]}
              onPress={() => router.push("/pages/becomeSellerForm")}
            >
              <Ionicons name="add-circle" size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>
                Start Seller Application
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={handleGoBack}
          >
            <Ionicons name="arrow-back" size={20} color="#0078D7" />
            <Text style={styles.secondaryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
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
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-start",
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
  loaderText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  scrollView: {
    flex: 1,
  },
  statusCard: {
    margin: 16,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 8,
    textAlign: "center",
  },
  statusMessage: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
    lineHeight: 20,
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F8F8F8",
  },
  infoLabel: {
    fontSize: 13,
    color: "#888",
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
    flex: 2,
    textAlign: "right",
  },
  infoValueSmall: {
    fontSize: 11,
    fontWeight: "500",
    color: "#666",
    flex: 2,
    textAlign: "right",
  },
  badgeRow: {
    flex: 2,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  rejectionCard: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#FFF5F5",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#F5C6CB",
  },
  rejectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#DC3545",
    marginBottom: 4,
  },
  rejectionText: {
    fontSize: 13,
    color: "#721C24",
    lineHeight: 18,
  },
  actionsContainer: {
    paddingHorizontal: 16,
    marginTop: 8,
    gap: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  primaryButton: {
    backgroundColor: "#0078D7",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#0078D7",
  },
  secondaryButtonText: {
    color: "#0078D7",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default SellerApplicationStatus;

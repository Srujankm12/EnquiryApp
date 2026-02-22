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
  id: string;
  status: string;
  reject_reason: string | null;
  created_at: string;
}

interface BusinessData {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  profile_image: string | null;
  address: string;
  city: string;
  state: string;
  pincode: string;
  business_type: string;
  is_business_verified: boolean;
  is_business_trusted: boolean;
  is_business_approved: boolean;
}

interface SocialData {
  linkedin: string | null;
  instagram: string | null;
  facebook: string | null;
  website: string | null;
  telegram: string | null;
  youtube: string | null;
  x: string | null;
}

interface LegalData {
  aadhaar: string | null;
  pan: string | null;
  gst: string | null;
  msme: string | null;
  fassi: string | null;
  export_import: string | null;
}

const SellerApplicationStatus: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [application, setApplication] = useState<ApplicationData | null>(null);
  const [business, setBusiness] = useState<BusinessData | null>(null);
  const [socialDetails, setSocialDetails] = useState<SocialData | null>(null);
  const [legalDetails, setLegalDetails] = useState<LegalData | null>(null);

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

      // Get user's business ID
      const businessIdRes = await fetch(
        `${API_URL}/business/get/user/${userId}`,
        {
          headers: { "Content-Type": "application/json" },
        },
      );

      if (businessIdRes.status === 404 || businessIdRes.status === 400) {
        setApplication(null);
        setBusiness(null);
        return;
      }

      if (!businessIdRes.ok) throw new Error("Failed to fetch business");

      const businessIdResult = await businessIdRes.json();
      const businessId = businessIdResult.business_id;

      if (!businessId) {
        setApplication(null);
        return;
      }

      await AsyncStorage.setItem("businessId", businessId);

      // Fetch complete business details
      const completeRes = await fetch(
        `${API_URL}/business/get/complete/${businessId}`,
        {
          headers: { "Content-Type": "application/json" },
        },
      );

      if (completeRes.ok) {
        const completeResult = await completeRes.json();
        const details = completeResult.details;

        setBusiness(details.business_details);
        setSocialDetails(details.social_details);
        setLegalDetails(details.legal_details);

        const appData = details.business_application;
        if (appData && appData.id) {
          setApplication(appData);

          // Normalize status for AsyncStorage
          const normalizedStatus =
            appData.status === "APPLIED"
              ? "pending"
              : (appData.status || "pending").toLowerCase();
          await AsyncStorage.setItem("sellerStatus", normalizedStatus);
        }
      } else {
        // Fallback: fetch individual endpoints
        const [bizRes, appRes, socialRes, legalRes] =
          await Promise.allSettled([
            fetch(`${API_URL}/business/get/${businessId}`, {
              headers: { "Content-Type": "application/json" },
            }),
            fetch(`${API_URL}/business/application/get/${businessId}`, {
              headers: { "Content-Type": "application/json" },
            }),
            fetch(`${API_URL}/business/social/get/${businessId}`, {
              headers: { "Content-Type": "application/json" },
            }),
            fetch(`${API_URL}/business/legal/get/${businessId}`, {
              headers: { "Content-Type": "application/json" },
            }),
          ]);

        if (bizRes.status === "fulfilled" && bizRes.value.ok) {
          const r = await bizRes.value.json();
          setBusiness(r.details);
        }

        if (appRes.status === "fulfilled" && appRes.value.ok) {
          const r = await appRes.value.json();
          setApplication(r.details);
          const normalizedStatus =
            r.details?.status === "APPLIED"
              ? "pending"
              : (r.details?.status || "pending").toLowerCase();
          await AsyncStorage.setItem("sellerStatus", normalizedStatus);
        }

        if (socialRes.status === "fulfilled" && socialRes.value.ok) {
          const r = await socialRes.value.json();
          setSocialDetails(r.details);
        }

        if (legalRes.status === "fulfilled" && legalRes.value.ok) {
          const r = await legalRes.value.json();
          setLegalDetails(r.details);
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
    const normalizedStatus =
      status === "APPLIED" ? "pending" : status?.toLowerCase();

    switch (normalizedStatus) {
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
            "Unfortunately, your seller application was not approved. Please review the feedback below and edit your details to resubmit.",
        };
      default:
        return {
          icon: "help-circle" as const,
          color: "#6C757D",
          bgColor: "#E2E3E5",
          borderColor: "#D6D8DB",
          title: "Seller Account Not Created",
          message:
            "You haven't created a seller account yet. Start the application process to become a seller.",
        };
    }
  };

  const handleGoToSellerDashboard = () => {
    router.replace("/(seller)");
  };

  const handleViewSellerProfile = () => {
    if (business?.id) {
      router.push({
        pathname: "/pages/sellerProfile" as any,
        params: { business_id: business.id },
      });
    }
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

  const rawStatus = application?.status || "none";
  const normalizedStatus =
    rawStatus === "APPLIED" ? "pending" : rawStatus.toLowerCase();
  const config = getStatusConfig(rawStatus);
  const isPending = normalizedStatus === "pending";
  const isRejected = normalizedStatus === "rejected";
  const isApproved = normalizedStatus === "approved";

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
            {
              backgroundColor: config.bgColor,
              borderColor: config.borderColor,
            },
          ]}
        >
          <Ionicons name={config.icon} size={64} color={config.color} />
          <Text style={[styles.statusTitle, { color: config.color }]}>
            {config.title}
          </Text>
          <Text style={styles.statusMessage}>{config.message}</Text>
        </View>

        {/* Business Details */}
        {business && (
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Ionicons name="business" size={20} color="#0078D7" />
              <Text style={styles.infoTitle}>Business Details</Text>
              {isPending && (
                <View style={styles.lockedBadge}>
                  <Ionicons name="lock-closed" size={12} color="#FFC107" />
                  <Text style={styles.lockedText}>Read Only</Text>
                </View>
              )}
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>{business.name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{business.email}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{business.phone}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Type</Text>
              <Text style={styles.infoValue}>{business.business_type}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Address</Text>
              <Text style={styles.infoValue}>{business.address}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Location</Text>
              <Text style={styles.infoValue}>
                {business.city}, {business.state} - {business.pincode}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Verified</Text>
              <View style={styles.badgeRow}>
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: business.is_business_verified
                        ? "#D4EDDA"
                        : "#F8D7DA",
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      business.is_business_verified ? "checkmark" : "close"
                    }
                    size={14}
                    color={
                      business.is_business_verified ? "#28A745" : "#DC3545"
                    }
                  />
                  <Text
                    style={[
                      styles.badgeText,
                      {
                        color: business.is_business_verified
                          ? "#28A745"
                          : "#DC3545",
                      },
                    ]}
                  >
                    {business.is_business_verified
                      ? "Verified"
                      : "Not Verified"}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Legal Details */}
        {legalDetails &&
          (legalDetails.pan ||
            legalDetails.gst ||
            legalDetails.msme ||
            legalDetails.aadhaar ||
            legalDetails.fassi ||
            legalDetails.export_import) && (
            <View style={styles.infoCard}>
              <View style={styles.infoHeader}>
                <Ionicons name="document-text" size={20} color="#0078D7" />
                <Text style={styles.infoTitle}>Legal Details</Text>
                {isPending && (
                  <View style={styles.lockedBadge}>
                    <Ionicons name="lock-closed" size={12} color="#FFC107" />
                    <Text style={styles.lockedText}>Read Only</Text>
                  </View>
                )}
              </View>
              {legalDetails.aadhaar && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Aadhaar</Text>
                  <Text style={styles.infoValue}>{legalDetails.aadhaar}</Text>
                </View>
              )}
              {legalDetails.pan && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>PAN</Text>
                  <Text style={styles.infoValue}>{legalDetails.pan}</Text>
                </View>
              )}
              {legalDetails.gst && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>GST</Text>
                  <Text style={styles.infoValue}>{legalDetails.gst}</Text>
                </View>
              )}
              {legalDetails.msme && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>MSME</Text>
                  <Text style={styles.infoValue}>{legalDetails.msme}</Text>
                </View>
              )}
              {legalDetails.fassi && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>FSSAI</Text>
                  <Text style={styles.infoValue}>{legalDetails.fassi}</Text>
                </View>
              )}
              {legalDetails.export_import && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Export/Import</Text>
                  <Text style={styles.infoValue}>
                    {legalDetails.export_import}
                  </Text>
                </View>
              )}
            </View>
          )}

        {/* Social Details */}
        {socialDetails &&
          (socialDetails.linkedin ||
            socialDetails.instagram ||
            socialDetails.facebook ||
            socialDetails.website ||
            socialDetails.telegram ||
            socialDetails.youtube ||
            socialDetails.x) && (
            <View style={styles.infoCard}>
              <View style={styles.infoHeader}>
                <Ionicons name="share-social" size={20} color="#0078D7" />
                <Text style={styles.infoTitle}>Social Details</Text>
                {isPending && (
                  <View style={styles.lockedBadge}>
                    <Ionicons name="lock-closed" size={12} color="#FFC107" />
                    <Text style={styles.lockedText}>Read Only</Text>
                  </View>
                )}
              </View>
              {socialDetails.linkedin && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>LinkedIn</Text>
                  <Text style={styles.infoValueSmall} numberOfLines={1}>
                    {socialDetails.linkedin}
                  </Text>
                </View>
              )}
              {socialDetails.instagram && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Instagram</Text>
                  <Text style={styles.infoValueSmall} numberOfLines={1}>
                    {socialDetails.instagram}
                  </Text>
                </View>
              )}
              {socialDetails.facebook && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Facebook</Text>
                  <Text style={styles.infoValueSmall} numberOfLines={1}>
                    {socialDetails.facebook}
                  </Text>
                </View>
              )}
              {socialDetails.youtube && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>YouTube</Text>
                  <Text style={styles.infoValueSmall} numberOfLines={1}>
                    {socialDetails.youtube}
                  </Text>
                </View>
              )}
              {socialDetails.x && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>X (Twitter)</Text>
                  <Text style={styles.infoValueSmall} numberOfLines={1}>
                    {socialDetails.x}
                  </Text>
                </View>
              )}
              {socialDetails.telegram && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Telegram</Text>
                  <Text style={styles.infoValueSmall} numberOfLines={1}>
                    {socialDetails.telegram}
                  </Text>
                </View>
              )}
              {socialDetails.website && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Website</Text>
                  <Text style={styles.infoValueSmall} numberOfLines={1}>
                    {socialDetails.website}
                  </Text>
                </View>
              )}
            </View>
          )}

        {/* Application Details */}
        {application && (
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Ionicons name="clipboard" size={20} color="#0078D7" />
              <Text style={styles.infoTitle}>Application Details</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Application ID</Text>
              <Text style={styles.infoValueSmall}>{application.id}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status</Text>
              <Text style={styles.infoValue}>
                {application.status === "APPLIED"
                  ? "Under Review"
                  : application.status}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Submitted On</Text>
              <Text style={styles.infoValue}>
                {formatDate(application.created_at)}
              </Text>
            </View>
            {application.reject_reason && (
              <View style={styles.rejectionCard}>
                <Ionicons name="warning" size={18} color="#DC3545" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rejectionTitle}>Rejection Reason</Text>
                  <Text style={styles.rejectionText}>
                    {application.reject_reason}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {isApproved && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.sellerProfileButton]}
                onPress={handleViewSellerProfile}
              >
                <Ionicons name="business" size={20} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>
                  View Seller Profile
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.primaryButton]}
                onPress={handleGoToSellerDashboard}
              >
                <Ionicons name="storefront" size={20} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>
                  Go to Seller Dashboard
                </Text>
              </TouchableOpacity>
            </>
          )}

          {isRejected && (
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
    flex: 1,
  },
  lockedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF3CD",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FFEEBA",
  },
  lockedText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#856404",
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
  sellerProfileButton: {
    backgroundColor: "#28A745",
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

// SellerApplicationStatus.tsx - Shows application status with proper user isolation
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { router } from "expo-router";
import { jwtDecode } from "jwt-decode";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface ApplicationStatus {
  status: "pending" | "approved" | "rejected";
  companyName: string;
  companyEmail: string;
  companyLogo: string | null;
  applicationId: string;
  companyId: string;
  userId: string;
  appliedDate: string;
  reviewedDate: string | null;
  rejectionReason: string | null;
}

const SellerApplicationStatus = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [applicationData, setApplicationData] =
    useState<ApplicationStatus | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const API_URL = Constants.expoConfig?.extra?.API_URL;

  useEffect(() => {
    initializeAndFetch();
  }, []);

  const initializeAndFetch = async () => {
    try {
      // Get current user ID from token
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        console.log("❌ No token found");
        router.replace("../auth/login");
        return;
      }

      const decodedToken = jwtDecode<any>(token);
      const userId = decodedToken.user_id;
      setCurrentUserId(userId);

      await fetchApplicationStatus(userId);
    } catch (error) {
      console.error("❌ Error initializing:", error);
      router.replace("../pages/becomeSeller");
    }
  };

  const fetchApplicationStatus = async (userId: string) => {
    try {
      console.log("🔍 Fetching application status for user:", userId);
      const token = await AsyncStorage.getItem("token");

      if (!token) {
        console.log("❌ No token found");
        router.replace("../auth/login");
        return;
      }

      // First, get company for this specific user
      const companyResponse = await fetch(
        `${API_URL}/company/get/user/${userId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!companyResponse.ok) {
        console.log("❌ No company found for user");
        // No company exists for this user
        await AsyncStorage.removeItem("companyId");
        await AsyncStorage.removeItem("sellerStatus");
        router.replace("../pages/becomeSeller");
        return;
      }

      const companyResult = await companyResponse.json();
      const companyId = companyResult.data.company_id;

      // Verify company belongs to current user
      if (companyResult.data.user_id !== userId) {
        console.log("❌ Company does not belong to current user");
        await AsyncStorage.removeItem("companyId");
        await AsyncStorage.removeItem("sellerStatus");
        router.replace("../pages/becomeSeller");
        return;
      }

      // Store company ID for this user
      await AsyncStorage.setItem("companyId", companyId);

      // Now fetch complete company details
      console.log("📡 GET /company/get/complete/" + companyId);

      const response = await fetch(
        `${API_URL}/company/get/complete/${companyId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch application status");
      }

      const result = await response.json();
      console.log("✅ Application status:", result);

      if (result.status === "success") {
        const data = result.data.company_details;

        // Double check user ID matches
        if (data.company.user_id !== userId) {
          console.log("❌ User ID mismatch in company data");
          await AsyncStorage.removeItem("companyId");
          await AsyncStorage.removeItem("sellerStatus");
          router.replace("../pages/becomeSeller");
          return;
        }

        // Check if application exists
        if (!data.application || !data.application.application_id) {
          console.log("❌ No application found for company");
          // Company exists but no application submitted
          router.replace("../pages/becomeSeller");
          return;
        }

        setApplicationData({
          status: data.application.status || "pending",
          companyName: data.company.company_name,
          companyEmail: data.company.company_email,
          companyLogo: data.company.company_profile_url,
          applicationId: data.application.application_id,
          companyId: data.company.company_id,
          userId: data.company.user_id,
          appliedDate: data.application.created_at || "",
          reviewedDate: data.application.reviewed_at || null,
          rejectionReason: data.application.rejection_reason || null,
        });

        // Update local storage
        await AsyncStorage.setItem(
          "sellerStatus",
          data.application.status || "pending",
        );
        await AsyncStorage.setItem(
          "applicationId",
          data.application.application_id,
        );

        // If approved, redirect to seller dashboard after delay
        if (data.application.status === "approved") {
          setTimeout(() => {
            router.replace("../pages/sellerDashboard");
          }, 2000);
        }
      }
    } catch (error) {
      console.error("❌ Error fetching status:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    if (currentUserId) {
      setRefreshing(true);
      fetchApplicationStatus(currentUserId);
    }
  };

  const handleEditApplication = () => {
    router.replace("../pages/becomeSeller");
  };

  const handleBackToBuyer = () => {
    router.replace("../(tabs)/home");
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0078D7" />
        <Text style={styles.loadingText}>Loading application status...</Text>
      </View>
    );
  }

  if (!applicationData) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color="#FF3B30" />
        <Text style={styles.errorTitle}>No Application Found</Text>
        <Text style={styles.errorText}>
          We couldn't find your seller application.
        </Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.replace("../pages/becomeSeller")}
        >
          <Text style={styles.primaryButtonText}>Start Application</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Verify this application belongs to current user
  if (currentUserId && applicationData.userId !== currentUserId) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color="#FF3B30" />
        <Text style={styles.errorTitle}>Access Denied</Text>
        <Text style={styles.errorText}>
          This application does not belong to you.
        </Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleBackToBuyer}
        >
          <Text style={styles.primaryButtonText}>Go to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderPendingStatus = () => (
    <View style={styles.statusContainer}>
      <View style={styles.iconContainer}>
        <View style={[styles.iconCircle, { backgroundColor: "#FFF3CD" }]}>
          <Ionicons name="time" size={48} color="#856404" />
        </View>
      </View>

      <Text style={styles.statusTitle}>Application Under Review</Text>
      <Text style={styles.statusMessage}>
        Your seller application is currently being reviewed by our team. We'll
        notify you once the review is complete.
      </Text>

      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Ionicons name="business" size={20} color="#666" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Company Name</Text>
            <Text style={styles.infoValue}>{applicationData.companyName}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="mail" size={20} color="#666" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{applicationData.companyEmail}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="calendar" size={20} color="#666" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Applied On</Text>
            <Text style={styles.infoValue}>
              {formatDate(applicationData.appliedDate)}
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="finger-print" size={20} color="#666" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Application ID</Text>
            <Text style={styles.infoValue} numberOfLines={1}>
              {applicationData.applicationId}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.timelineContainer}>
        <View style={styles.timelineItem}>
          <View style={[styles.timelineDot, styles.timelineDotCompleted]} />
          <View style={styles.timelineContent}>
            <Text style={styles.timelineTitle}>Application Submitted</Text>
            <Text style={styles.timelineDate}>
              {formatDate(applicationData.appliedDate)}
            </Text>
          </View>
        </View>

        <View style={styles.timelineLine} />

        <View style={styles.timelineItem}>
          <View style={[styles.timelineDot, styles.timelineDotActive]} />
          <View style={styles.timelineContent}>
            <Text style={styles.timelineTitle}>Under Review</Text>
            <Text style={styles.timelineDate}>In Progress</Text>
          </View>
        </View>

        <View style={styles.timelineLine} />

        <View style={styles.timelineItem}>
          <View style={styles.timelineDot} />
          <View style={styles.timelineContent}>
            <Text style={styles.timelineTitle}>Approval Decision</Text>
            <Text style={styles.timelineDate}>Pending</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={handleBackToBuyer}
      >
        <Ionicons name="arrow-back" size={20} color="#0078D7" />
        <Text style={styles.secondaryButtonText}>Continue as Buyer</Text>
      </TouchableOpacity>
    </View>
  );

  const renderApprovedStatus = () => (
    <View style={styles.statusContainer}>
      <View style={styles.iconContainer}>
        <View style={[styles.iconCircle, { backgroundColor: "#D4EDDA" }]}>
          <Ionicons name="checkmark-circle" size={48} color="#155724" />
        </View>
      </View>

      <Text style={[styles.statusTitle, { color: "#155724" }]}>
        Congratulations! 🎉
      </Text>
      <Text style={styles.statusMessage}>
        Your seller application has been approved. You can now start selling on
        our platform!
      </Text>

      {applicationData.companyLogo && (
        <Image
          source={{ uri: applicationData.companyLogo }}
          style={styles.companyLogo}
        />
      )}

      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Ionicons name="business" size={20} color="#155724" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Company Name</Text>
            <Text style={styles.infoValue}>{applicationData.companyName}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="checkmark-done" size={20} color="#155724" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Approved On</Text>
            <Text style={styles.infoValue}>
              {formatDate(
                applicationData.reviewedDate || applicationData.appliedDate,
              )}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.successMessage}>
        <Ionicons name="information-circle" size={20} color="#155724" />
        <Text style={styles.successMessageText}>
          You're now being redirected to your seller dashboard...
        </Text>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => router.replace("../pages/sellerDashboard")}
      >
        <Text style={styles.primaryButtonText}>Go to Seller Dashboard</Text>
        <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );

  const renderRejectedStatus = () => (
    <View style={styles.statusContainer}>
      <View style={styles.iconContainer}>
        <View style={[styles.iconCircle, { backgroundColor: "#F8D7DA" }]}>
          <Ionicons name="close-circle" size={48} color="#721C24" />
        </View>
      </View>

      <Text style={[styles.statusTitle, { color: "#721C24" }]}>
        Application Rejected
      </Text>
      <Text style={styles.statusMessage}>
        Unfortunately, your seller application was not approved. Please review
        the reason below and update your information to resubmit.
      </Text>

      <View
        style={[
          styles.infoCard,
          { borderLeftWidth: 4, borderLeftColor: "#F8D7DA" },
        ]}
      >
        <View style={styles.rejectionHeader}>
          <Ionicons name="alert-circle" size={20} color="#721C24" />
          <Text style={styles.rejectionTitle}>Rejection Reason</Text>
        </View>
        <Text style={styles.rejectionReason}>
          {applicationData.rejectionReason ||
            "No specific reason provided. Please contact support for more details."}
        </Text>
      </View>

      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Ionicons name="business" size={20} color="#666" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Company Name</Text>
            <Text style={styles.infoValue}>{applicationData.companyName}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="calendar" size={20} color="#666" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Reviewed On</Text>
            <Text style={styles.infoValue}>
              {formatDate(
                applicationData.reviewedDate || applicationData.appliedDate,
              )}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.actionCard}>
        <Ionicons name="bulb" size={24} color="#0078D7" />
        <View style={styles.actionContent}>
          <Text style={styles.actionTitle}>What's Next?</Text>
          <Text style={styles.actionText}>
            You can edit your application to address the concerns mentioned
            above and resubmit for review.
          </Text>
        </View>
      </View>

      <View style={styles.buttonGroup}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleEditApplication}
        >
          <Ionicons name="create" size={20} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Edit & Resubmit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleBackToBuyer}
        >
          <Ionicons name="arrow-back" size={20} color="#0078D7" />
          <Text style={styles.secondaryButtonText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackToBuyer} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Application Status</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {applicationData.status === "pending" && renderPendingStatus()}
        {applicationData.status === "approved" && renderApprovedStatus()}
        {applicationData.status === "rejected" && renderRejectedStatus()}
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
    backgroundColor: "#0078D7",
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    padding: 4,
  },
  refreshButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    backgroundColor: "#F5F5F5",
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  statusContainer: {
    flex: 1,
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
    textAlign: "center",
    marginBottom: 12,
  },
  statusMessage: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  companyLogo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: "center",
    marginBottom: 24,
    borderWidth: 3,
    borderColor: "#155724",
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    color: "#333",
    fontWeight: "600",
  },
  timelineContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#E0E0E0",
    marginTop: 2,
    marginRight: 12,
  },
  timelineDotCompleted: {
    backgroundColor: "#28A745",
  },
  timelineDotActive: {
    backgroundColor: "#0078D7",
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  timelineDate: {
    fontSize: 13,
    color: "#666",
  },
  timelineLine: {
    width: 2,
    height: 24,
    backgroundColor: "#E0E0E0",
    marginLeft: 7,
    marginVertical: 4,
  },
  rejectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  rejectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#721C24",
  },
  rejectionReason: {
    fontSize: 14,
    color: "#721C24",
    lineHeight: 20,
    backgroundColor: "#F8D7DA",
    padding: 12,
    borderRadius: 8,
  },
  successMessage: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#D4EDDA",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  successMessageText: {
    flex: 1,
    fontSize: 13,
    color: "#155724",
  },
  actionCard: {
    flexDirection: "row",
    backgroundColor: "#E7F3FF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0078D7",
    marginBottom: 4,
  },
  actionText: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
  },
  buttonGroup: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: "#0078D7",
    paddingVertical: 16,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#0078D7",
    paddingVertical: 16,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  secondaryButtonText: {
    color: "#0078D7",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default SellerApplicationStatus;
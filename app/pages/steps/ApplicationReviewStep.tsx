// steps/ApplicationReviewStep.tsx - Step 4: Review and Submit Application
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

interface ApplicationReviewStepProps {
  companyId: string | null;
  userId: string;
  isEditMode: boolean;
  onComplete: (stepNumber: number, data?: any) => void;
  onBack: () => void;
}

interface CompanyData {
  company: any;
  social: any;
  legal: any;
  application: any;
}

const ApplicationReviewStep: React.FC<ApplicationReviewStepProps> = ({
  companyId,
  userId,
  isEditMode,
  onComplete,
  onBack,
}) => {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);

  const API_URL = Constants.expoConfig?.extra?.API_URL;

  useEffect(() => {
    if (companyId) {
      fetchCompleteData();
    } else {
      setFetching(false);
    }
  }, [companyId]);

  const fetchCompleteData = async () => {
    try {
      setFetching(true);
      const token = await AsyncStorage.getItem("token");

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

      if (response.ok) {
        const result = await response.json();
        setCompanyData({
          company: result.data.company_details.company,
          social: result.data.company_details.social_details,
          legal: result.data.company_details.legal_details,
          application: result.data.company_details.application,
        });
      }
    } catch (error) {
      console.error("Error fetching complete data:", error);
    } finally {
      setFetching(false);
    }
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

  const handleSubmitApplication = async () => {
    if (!companyId) {
      Alert.alert("Error", "Company ID not found");
      return;
    }

    // Check if application already exists
    if (companyData?.application && companyData.application.application_id) {
      const applicationStatus = companyData.application.status;

      if (applicationStatus === "pending") {
        Alert.alert(
          "Application Already Submitted",
          "Your application is already under review. Please wait for the review to complete.",
          [
            {
              text: "View Status",
              onPress: () => {
                router.replace("./sellerApplicationStatus");
              },
            },
          ],
        );
        return;
      } else if (applicationStatus === "approved") {
        Alert.alert(
          "Already Approved",
          "Your application is already approved.",
          [
            {
              text: "Go to Dashboard",
              onPress: () => {
                router.replace("/(seller)");
              },
            },
          ],
        );
        return;
      }
    }

    Alert.alert(
      "Submit Application",
      "Are you sure you want to submit your seller application? You can edit it later if rejected.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Submit",
          onPress: submitApplication,
        },
      ],
    );
  };

  // Alternative: Direct routing in ApplicationReviewStep
  // Replace the submitApplication function in ApplicationReviewStep.tsx:

// ✅ FIXED submitApplication - works with your existing backend endpoints

const submitApplication = async () => {
  try {
    setSubmitting(true);
    const token = await AsyncStorage.getItem("token");

    console.log("📤 Submitting application for company:", companyId);

    // Check if application already exists
    const existingApplicationId = companyData?.application?.application_id;
    const existingStatus = companyData?.application?.status;
    const isResubmit = !!existingApplicationId;

    console.log("📋 Application status:", {
      exists: !!existingApplicationId,
      applicationId: existingApplicationId,
      currentStatus: existingStatus,
      isResubmit,
    });

    // ✅ VALIDATION: Don't allow resubmission if pending or approved
    if (existingApplicationId) {
      if (existingStatus === "pending" || existingStatus === "PENDING") {
        console.log("⚠️ Application already pending");
        Alert.alert(
          "Already Submitted",
          "Your application is already under review.",
          [
            {
              text: "View Status",
              onPress: () => router.replace("/pages/sellerApplicationStatus"),
            },
          ]
        );
        return;
      }
      
      if (existingStatus === "approved" || existingStatus === "APPROVED") {
        console.log("✅ Application already approved");
        Alert.alert(
          "Already Approved",
          "Your application has already been approved.",
          [
            {
              text: "OK",
              onPress: () => router.replace("/(seller)"),
            },
          ]
        );
        return;
      }

      // If we reach here, status is "rejected" - allow resubmission
      console.log("🔄 Application was rejected, allowing resubmission");
    }

    let response;
    let applicationId;

    if (isResubmit && (existingStatus === "rejected" || existingStatus === "REJECTED")) {
      // ✅ RESUBMIT REJECTED APPLICATION
      // Since your backend doesn't have a resubmit endpoint,
      // we'll delete the old application and create a new one
      console.log("🔄 Resubmitting rejected application");
      console.log("   Step 1: Deleting old application:", existingApplicationId);
      
      // First, try to delete the old application (if endpoint exists)
      try {
        await fetch(`${API_URL}/company/application/delete/${existingApplicationId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        console.log("✅ Old application deleted");
      } catch (deleteError) {
        console.log("⚠️ Could not delete old application, continuing anyway");
      }

      console.log("   Step 2: Creating new application");
      
      // Create new application
      response = await fetch(
        `${API_URL}/company/application/create/${companyId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

    } else {
      // ✅ NEW SUBMISSION
      console.log("📝 Creating new application");
      
      response = await fetch(
        `${API_URL}/company/application/create/${companyId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log("📡 Response status:", response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error("❌ Submission failed:", errorData);
      throw new Error(errorData.message || "Failed to submit application");
    }

    const result = await response.json();
    applicationId = result.data.application_id;

    console.log("✅ Application submitted:", applicationId);

    // Save to AsyncStorage
    await AsyncStorage.setItem("applicationId", applicationId);
    await AsyncStorage.setItem("sellerStatus", "pending");

    console.log("💾 Data saved to AsyncStorage");

    // Show success and redirect
    Alert.alert(
      "Success! 🎉",
      isResubmit 
        ? "Your application has been resubmitted and is now under review."
        : "Your application has been submitted and is now under review.",
      [
        {
          text: "View Status",
          onPress: () => {
            console.log("🔀 Redirecting to status page");
            router.replace("/pages/sellerApplicationStatus");
          },
        },
      ],
      { cancelable: false }
    );

  } catch (error: any) {
    console.error("❌ Error submitting application:", error);
    Alert.alert("Error", error.message || "Failed to submit application");
  } finally {
    setSubmitting(false);
  }
};

  if (fetching) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0078D7" />
        <Text style={styles.loadingText}>Loading application details...</Text>
      </View>
    );
  }

  if (!companyData) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#FF3B30" />
        <Text style={styles.errorText}>
          Failed to load company data. Please go back and try again.
        </Text>
      </View>
    );
  }

  const { company, social, legal, application } = companyData;

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Review Your Application</Text>
        <Text style={styles.sectionDescription}>
          Please review all the information below before submitting your
          application.
        </Text>

        {application && application.application_id && (
          <View style={styles.warningBanner}>
            <Ionicons name="information-circle" size={20} color="#856404" />
            <View style={{ flex: 1 }}>
              <Text style={styles.warningText}>
                You have already submitted an application. Status:{" "}
                {application.status}
              </Text>
              <TouchableOpacity
                style={styles.statusButton}
                onPress={() => {
                  console.log("👆 View Application Status button clicked");
                  router.push("/pages/sellerApplicationStatus");
                }}
              >
                <Ionicons name="eye" size={16} color="#0078D7" />
                <Text style={styles.statusButtonText}>
                  View Application Status
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Company Logo */}
      {company.company_profile_url && (
        <View style={styles.logoSection}>
          <Image
            source={{ uri: company.company_profile_url }}
            style={styles.companyLogo}
          />
        </View>
      )}

      {/* Company Information */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="business" size={20} color="#0078D7" />
          <Text style={styles.sectionTitle}>Company Information</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Company Name:</Text>
          <Text style={styles.infoValue}>{company.company_name}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email:</Text>
          <Text style={styles.infoValue}>{company.company_email}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Phone:</Text>
          <Text style={styles.infoValue}>{company.company_phone}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Address:</Text>
          <Text style={styles.infoValue}>
            {company.company_address}, {company.company_city},{" "}
            {company.company_state} - {company.company_pincode}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Established:</Text>
          <Text style={styles.infoValue}>
            {formatDate(company.company_establishment_date)}
          </Text>
        </View>
      </View>

      {/* Legal Details */}
      {legal && (legal.pan_number || legal.gst_number || legal.msme_number) && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text" size={20} color="#0078D7" />
            <Text style={styles.sectionTitle}>Legal Details</Text>
          </View>

          {legal.pan_number && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>PAN Number:</Text>
              <Text style={styles.infoValue}>{legal.pan_number}</Text>
            </View>
          )}

          {legal.gst_number && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>GST Number:</Text>
              <Text style={styles.infoValue}>{legal.gst_number}</Text>
            </View>
          )}

          {legal.msme_number && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>MSME Number:</Text>
              <Text style={styles.infoValue}>{legal.msme_number}</Text>
            </View>
          )}
        </View>
      )}

      {/* Social Details */}
      {social &&
        (social.linkedin_url ||
          social.instagram_url ||
          social.facebook_url ||
          social.website_url ||
          social.whatsapp_number) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="share-social" size={20} color="#0078D7" />
              <Text style={styles.sectionTitle}>Social Media</Text>
            </View>

            {social.linkedin_url && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>LinkedIn:</Text>
                <Text style={styles.infoValue} numberOfLines={1}>
                  {social.linkedin_url}
                </Text>
              </View>
            )}

            {social.instagram_url && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Instagram:</Text>
                <Text style={styles.infoValue} numberOfLines={1}>
                  {social.instagram_url}
                </Text>
              </View>
            )}

            {social.facebook_url && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Facebook:</Text>
                <Text style={styles.infoValue} numberOfLines={1}>
                  {social.facebook_url}
                </Text>
              </View>
            )}

            {social.website_url && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Website:</Text>
                <Text style={styles.infoValue} numberOfLines={1}>
                  {social.website_url}
                </Text>
              </View>
            )}

            {social.whatsapp_number && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>WhatsApp:</Text>
                <Text style={styles.infoValue}>{social.whatsapp_number}</Text>
              </View>
            )}
          </View>
        )}

      {/* Submit Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.button,
            styles.primaryButton,
            submitting && styles.buttonDisabled,
          ]}
          onPress={handleSubmitApplication}
          disabled={
            submitting ||
            (application &&
              application.application_id &&
              (application.status === "pending" ||
                application.status === "approved"))
          }
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="send" size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>
                {application && application.application_id
                  ? "Resubmit Application"
                  : "Submit Application"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
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
  },
  errorText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 16,
  },
  section: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 13,
    color: "#666",
    marginBottom: 16,
    lineHeight: 18,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFF3CD",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  warningText: {
    fontSize: 13,
    color: "#856404",
    marginBottom: 8,
  },
  statusButton: {
    marginTop: 8,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#0078D7",
  },
  statusButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0078D7",
  },
  logoSection: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    alignItems: "center",
    marginBottom: 8,
  },
  companyLogo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: "#0078D7",
  },
  infoRow: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    color: "#000",
    fontWeight: "600",
  },
  buttonContainer: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryButton: {
    backgroundColor: "#0078D7",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});

export default ApplicationReviewStep;

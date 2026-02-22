import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface ApplicationReviewStepProps {
  businessId: string | null;
  userId: string;
  isEditMode: boolean;
  onComplete: (stepNumber: number, data?: any) => void;
  onBack: () => void;
}

interface ReviewData {
  business: any;
  social: any;
  legal: any;
}

const ApplicationReviewStep: React.FC<ApplicationReviewStepProps> = ({
  businessId,
  userId,
  isEditMode,
  onComplete,
  onBack,
}) => {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [reviewData, setReviewData] = useState<ReviewData>({
    business: null,
    social: null,
    legal: null,
  });

  const API_URL = Constants.expoConfig?.extra?.API_URL;

  useEffect(() => {
    fetchAllData();
  }, [businessId]);

  const fetchAllData = async () => {
    if (!businessId) {
      setFetching(false);
      return;
    }

    try {
      setFetching(true);

      const response = await fetch(
        `${API_URL}/business/get/complete/${businessId}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        },
      );

      if (response.ok) {
        const result = await response.json();
        const details = result.details;
        setReviewData({
          business: details.business_details,
          social: details.social_details,
          legal: details.legal_details,
        });
      } else {
        // Fallback: fetch individual endpoints
        const [bizRes, socialRes, legalRes] = await Promise.allSettled([
          fetch(`${API_URL}/business/get/${businessId}`, {
            headers: { "Content-Type": "application/json" },
          }),
          fetch(`${API_URL}/business/social/get/${businessId}`, {
            headers: { "Content-Type": "application/json" },
          }),
          fetch(`${API_URL}/business/legal/get/${businessId}`, {
            headers: { "Content-Type": "application/json" },
          }),
        ]);

        const data: ReviewData = { business: null, social: null, legal: null };

        if (bizRes.status === "fulfilled" && bizRes.value.ok) {
          const r = await bizRes.value.json();
          data.business = r.details;
        }
        if (socialRes.status === "fulfilled" && socialRes.value.ok) {
          const r = await socialRes.value.json();
          data.social = r.details;
        }
        if (legalRes.status === "fulfilled" && legalRes.value.ok) {
          const r = await legalRes.value.json();
          data.legal = r.details;
        }

        setReviewData(data);
      }
    } catch (error) {
      console.error("Error fetching review data:", error);
    } finally {
      setFetching(false);
    }
  };

  const handleSubmitApplication = async () => {
    if (!businessId) {
      Alert.alert("Error", "Business ID not found");
      return;
    }

    Alert.alert(
      "Submit Application",
      "Are you sure you want to submit your seller application for review? You won't be able to edit your information while the application is under review.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Submit",
          onPress: async () => {
            try {
              setLoading(true);

              const response = await fetch(
                `${API_URL}/business/application/create`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id: businessId }),
                },
              );

              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(
                  errorData.error || "Failed to submit application",
                );
              }

              await AsyncStorage.setItem("sellerStatus", "pending");
              await AsyncStorage.setItem("businessId", businessId);

              Alert.alert(
                "Application Submitted!",
                "Your seller application has been submitted for review. You will be notified once it is approved.",
                [
                  {
                    text: "OK",
                    onPress: () =>
                      onComplete(4, { applicationId: businessId }),
                  },
                ],
              );
            } catch (error: any) {
              console.error("Error submitting application:", error);
              Alert.alert(
                "Error",
                error.message || "Failed to submit application",
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleResubmitApplication = async () => {
    if (!businessId) return;

    Alert.alert(
      "Resubmit Application",
      "Are you sure you want to resubmit your application?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Resubmit",
          onPress: async () => {
            try {
              setLoading(true);

              const response = await fetch(
                `${API_URL}/business/application/create`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id: businessId }),
                },
              );

              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(
                  errorData.error || "Failed to resubmit application",
                );
              }

              await AsyncStorage.setItem("sellerStatus", "pending");
              Alert.alert(
                "Application Resubmitted!",
                "Your application has been resubmitted for review.",
                [
                  {
                    text: "OK",
                    onPress: () =>
                      onComplete(4, { applicationId: businessId }),
                  },
                ],
              );
            } catch (error: any) {
              Alert.alert(
                "Error",
                error.message || "Failed to resubmit application",
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  if (fetching) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0078D7" />
        <Text style={styles.loadingText}>Loading review data...</Text>
      </View>
    );
  }

  const { business, social, legal } = reviewData;

  return (
    <View style={styles.container}>
      {/* Business Info Summary */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="business" size={20} color="#0078D7" />
          <Text style={styles.sectionTitle}>Business Information</Text>
          {business && (
            <Ionicons name="checkmark-circle" size={20} color="#28A745" />
          )}
        </View>

        {business ? (
          <View style={styles.reviewCard}>
            <ReviewRow label="Business Name" value={business.name} />
            <ReviewRow label="Email" value={business.email} />
            <ReviewRow label="Phone" value={business.phone} />
            <ReviewRow label="Business Type" value={business.business_type} />
            <ReviewRow label="Address" value={business.address} />
            <ReviewRow
              label="Location"
              value={`${business.city}, ${business.state} - ${business.pincode}`}
            />
          </View>
        ) : (
          <View style={styles.missingCard}>
            <Ionicons name="warning" size={20} color="#FF9500" />
            <Text style={styles.missingText}>
              Business information not found. Please go back to step 1.
            </Text>
          </View>
        )}
      </View>

      {/* Legal Info Summary */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="document-text" size={20} color="#0078D7" />
          <Text style={styles.sectionTitle}>Legal Information</Text>
          {legal && (legal.pan || legal.gst || legal.msme || legal.aadhaar) ? (
            <Ionicons name="checkmark-circle" size={20} color="#28A745" />
          ) : (
            <Text style={styles.optionalBadge}>Optional</Text>
          )}
        </View>

        {legal &&
        (legal.pan ||
          legal.gst ||
          legal.msme ||
          legal.aadhaar ||
          legal.fassi ||
          legal.export_import) ? (
          <View style={styles.reviewCard}>
            {legal.aadhaar && (
              <ReviewRow label="Aadhaar" value={legal.aadhaar} />
            )}
            {legal.pan && <ReviewRow label="PAN" value={legal.pan} />}
            {legal.gst && <ReviewRow label="GST" value={legal.gst} />}
            {legal.msme && <ReviewRow label="MSME" value={legal.msme} />}
            {legal.fassi && <ReviewRow label="FSSAI" value={legal.fassi} />}
            {legal.export_import && (
              <ReviewRow label="Export/Import Code" value={legal.export_import} />
            )}
          </View>
        ) : (
          <View style={styles.skippedCard}>
            <Text style={styles.skippedText}>
              No legal documents added (can be added later)
            </Text>
          </View>
        )}
      </View>

      {/* Social Info Summary */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="share-social" size={20} color="#0078D7" />
          <Text style={styles.sectionTitle}>Social Media</Text>
          {social &&
          (social.linkedin ||
            social.instagram ||
            social.facebook ||
            social.website) ? (
            <Ionicons name="checkmark-circle" size={20} color="#28A745" />
          ) : (
            <Text style={styles.optionalBadge}>Optional</Text>
          )}
        </View>

        {social &&
        (social.linkedin ||
          social.instagram ||
          social.facebook ||
          social.website ||
          social.youtube ||
          social.telegram ||
          social.x) ? (
          <View style={styles.reviewCard}>
            {social.linkedin && (
              <ReviewRow label="LinkedIn" value={social.linkedin} />
            )}
            {social.instagram && (
              <ReviewRow label="Instagram" value={social.instagram} />
            )}
            {social.facebook && (
              <ReviewRow label="Facebook" value={social.facebook} />
            )}
            {social.youtube && (
              <ReviewRow label="YouTube" value={social.youtube} />
            )}
            {social.x && <ReviewRow label="X (Twitter)" value={social.x} />}
            {social.telegram && (
              <ReviewRow label="Telegram" value={social.telegram} />
            )}
            {social.website && (
              <ReviewRow label="Website" value={social.website} />
            )}
          </View>
        ) : (
          <View style={styles.skippedCard}>
            <Text style={styles.skippedText}>
              No social media links added (can be added later)
            </Text>
          </View>
        )}
      </View>

      {/* Submit Button */}
      <View style={styles.buttonContainer}>
        {!business ? (
          <TouchableOpacity
            style={[styles.button, styles.backButton]}
            onPress={onBack}
          >
            <Ionicons name="arrow-back" size={20} color="#666" />
            <Text style={styles.backButtonText}>Go Back to Step 1</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.button,
              styles.submitButton,
              loading && styles.buttonDisabled,
            ]}
            onPress={
              isEditMode
                ? handleResubmitApplication
                : handleSubmitApplication
            }
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="send" size={20} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>
                  {isEditMode
                    ? "Resubmit Application"
                    : "Submit for Verification"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      <View style={{ height: 40 }} />
    </View>
  );
};

const ReviewRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.reviewRow}>
    <Text style={styles.reviewLabel}>{label}</Text>
    <Text style={styles.reviewValue} numberOfLines={2}>
      {value || "N/A"}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  loadingText: { marginTop: 12, fontSize: 14, color: "#666" },
  section: { backgroundColor: "#FFFFFF", padding: 16, marginBottom: 8 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
    flex: 1,
  },
  optionalBadge: {
    fontSize: 11,
    fontWeight: "600",
    color: "#888",
    backgroundColor: "#F0F0F0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  reviewCard: {
    backgroundColor: "#FAFAFA",
    borderRadius: 8,
    padding: 12,
  },
  reviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  reviewLabel: {
    fontSize: 13,
    color: "#888",
    flex: 1,
  },
  reviewValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
    flex: 2,
    textAlign: "right",
  },
  missingCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFF3CD",
    padding: 12,
    borderRadius: 8,
  },
  missingText: { flex: 1, fontSize: 13, color: "#856404" },
  skippedCard: {
    backgroundColor: "#F8F9FA",
    padding: 12,
    borderRadius: 8,
  },
  skippedText: { fontSize: 13, color: "#888", fontStyle: "italic" },
  buttonContainer: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  submitButton: {
    backgroundColor: "#28A745",
    elevation: 3,
    shadowColor: "#28A745",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  backButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  buttonDisabled: { opacity: 0.6 },
  submitButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  backButtonText: { color: "#666", fontSize: 16, fontWeight: "600" },
});

export default ApplicationReviewStep;

import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { router } from "expo-router";
import { jwtDecode } from "jwt-decode";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import ApplicationReviewStep from "./steps/ApplicationReviewStep";
import CompanyBasicInfoStep from "./steps/CompanyBasicInfoStep";
import CompanyLegalInfoStep from "./steps/CompanyLegalInfoStep";
import CompanySocialInfoStep from "./steps/CompanySocialInfoStep";

interface RegistrationState {
  currentStep: number;
  businessId: string | null;
  userId: string;
  basicInfoComplete: boolean;
  legalInfoComplete: boolean;
  socialInfoComplete: boolean;
  applicationSubmitted: boolean;
  applicationId: string | null;
  isEditMode: boolean;
}

const BecomeSellerFlow = () => {
  const [loading, setLoading] = useState(true);
  const [registrationState, setRegistrationState] = useState<RegistrationState>(
    {
      currentStep: 1,
      businessId: null,
      userId: "",
      basicInfoComplete: false,
      legalInfoComplete: false,
      socialInfoComplete: false,
      applicationSubmitted: false,
      applicationId: null,
      isEditMode: false,
    },
  );

  const API_URL = Constants.expoConfig?.extra?.API_URL;

  useEffect(() => {
    initializeFlow();
  }, []);

  const initializeFlow = async () => {
    try {
      setLoading(true);

      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Error", "Please login to continue");
        router.replace("/(tabs)");
        return;
      }

      let userId: string;
      try {
        const decodedToken = jwtDecode<any>(token);
        userId = decodedToken.user_id;

        if (!userId) {
          throw new Error("User ID not found in token");
        }
      } catch (error) {
        Alert.alert("Error", "Invalid session. Please login again.");
        await AsyncStorage.clear();
        router.replace("/(tabs)");
        return;
      }

      await checkUserBusinessFromBackend(userId);
    } catch (error) {
      Alert.alert("Error", "Failed to initialize. Please try again.");
      router.replace("/(tabs)");
    } finally {
      setLoading(false);
    }
  };

  const checkUserBusinessFromBackend = async (userId: string) => {
    try {
      const response = await fetch(`${API_URL}/business/get/user/${userId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.status === 404 || response.status === 400) {
        await AsyncStorage.multiRemove([
          "businessId",
          "sellerStatus",
          "applicationId",
        ]);
        setRegistrationState((prev) => ({
          ...prev,
          userId,
          currentStep: 1,
          businessId: null,
        }));
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();

      if (result.business_id) {
        const businessId = result.business_id;
        await AsyncStorage.setItem("businessId", businessId);
        await loadExistingBusinessState(userId, businessId);
      } else {
        await AsyncStorage.multiRemove([
          "businessId",
          "sellerStatus",
          "applicationId",
        ]);
        setRegistrationState((prev) => ({
          ...prev,
          userId,
          currentStep: 1,
          businessId: null,
        }));
      }
    } catch (error: any) {
      await AsyncStorage.multiRemove([
        "businessId",
        "sellerStatus",
        "applicationId",
      ]);
      setRegistrationState((prev) => ({
        ...prev,
        userId,
        currentStep: 1,
        businessId: null,
      }));
    }
  };

  const loadExistingBusinessState = async (
    userId: string,
    businessId: string,
  ) => {
    try {
      const response = await fetch(
        `${API_URL}/business/get/complete/${businessId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) throw new Error("Failed to fetch");

      const result = await response.json();
      const data = result.details;

      const business = data.business_details;
      const social = data.social_details;
      const legal = data.legal_details;
      const application = data.business_application;

      if (business.user_id !== userId) {
        Alert.alert("Access Denied", "This business does not belong to you.");
        await AsyncStorage.multiRemove([
          "businessId",
          "sellerStatus",
          "applicationId",
        ]);
        setRegistrationState((prev) => ({
          ...prev,
          userId,
          currentStep: 1,
          businessId: null,
        }));
        return;
      }

      const hasApplication = application && application.id;
      const applicationStatus = application?.status;

      // Handle approved status
      if (applicationStatus === "APPROVED" || applicationStatus === "approved") {
        await AsyncStorage.setItem("sellerStatus", "approved");
        Alert.alert("Already Approved", "Redirecting to dashboard...", [
          {
            text: "OK",
            onPress: () => router.replace("/(seller)"),
          },
        ]);
        return;
      }

      // Handle pending/applied status
      if (applicationStatus === "APPLIED" || applicationStatus === "pending") {
        await AsyncStorage.setItem("sellerStatus", "pending");
        if (application.id) {
          await AsyncStorage.setItem("applicationId", application.id);
        }
        Alert.alert("Under Review", "Your application is being reviewed.", [
          {
            text: "View Status",
            onPress: () => router.replace("/pages/sellerApplicationStatus"),
          },
        ]);
        return;
      }

      const basicInfoComplete = !!(
        business.name &&
        business.email &&
        business.phone &&
        business.address
      );
      const legalInfoComplete = !!(
        legal &&
        (legal.pan || legal.gst || legal.msme)
      );
      const socialInfoComplete = !!(
        social &&
        (social.linkedin ||
          social.instagram ||
          social.facebook ||
          social.website ||
          social.telegram ||
          social.youtube ||
          social.x)
      );

      let currentStep = 1;
      if (basicInfoComplete && !legalInfoComplete) currentStep = 2;
      else if (basicInfoComplete && legalInfoComplete && !socialInfoComplete)
        currentStep = 3;
      else if (
        basicInfoComplete &&
        legalInfoComplete &&
        socialInfoComplete &&
        !hasApplication
      )
        currentStep = 4;

      setRegistrationState({
        currentStep,
        businessId,
        userId,
        basicInfoComplete,
        legalInfoComplete,
        socialInfoComplete,
        applicationSubmitted: !!hasApplication,
        applicationId: application?.id || null,
        isEditMode: applicationStatus === "REJECTED" || applicationStatus === "rejected",
      });

      if (hasApplication && application?.id) {
        await AsyncStorage.setItem("applicationId", application.id);
        await AsyncStorage.setItem(
          "sellerStatus",
          applicationStatus === "APPLIED" ? "pending" : (applicationStatus || "pending").toLowerCase(),
        );
      }
    } catch (error) {
      setRegistrationState((prev) => ({
        ...prev,
        userId,
        businessId,
        currentStep: 1,
      }));
    }
  };

  const handleStepComplete = async (stepNumber: number, data?: any) => {
    const updates: Partial<RegistrationState> = {};

    if (stepNumber === 1) {
      updates.basicInfoComplete = true;
      updates.businessId = data?.businessId || registrationState.businessId;
      updates.currentStep = 2;
      if (data?.businessId) {
        await AsyncStorage.setItem("businessId", data.businessId);
      }
    } else if (stepNumber === 2) {
      updates.legalInfoComplete = true;
      updates.currentStep = 3;
    } else if (stepNumber === 3) {
      updates.socialInfoComplete = true;
      updates.currentStep = 4;
    } else if (stepNumber === 4) {
      updates.applicationSubmitted = true;
      updates.applicationId = data?.applicationId;

      if (data?.applicationId) {
        await AsyncStorage.setItem("applicationId", data.applicationId);
        await AsyncStorage.setItem("sellerStatus", "pending");

        router.push("./sellerApplicationStatus");
        return;
      } else {
        // Application created but no separate ID - use businessId
        await AsyncStorage.setItem("sellerStatus", "pending");
        router.push("./sellerApplicationStatus");
        return;
      }
    }

    setRegistrationState((prev) => ({ ...prev, ...updates }));
  };

  const handleBack = () => {
    if (registrationState.currentStep > 1) {
      setRegistrationState((prev) => ({
        ...prev,
        currentStep: prev.currentStep - 1,
      }));
    } else {
      router.back();
    }
  };

  const renderStepIndicator = () => {
    const steps = [
      { number: 1, title: "Basic Info" },
      { number: 2, title: "Legal" },
      { number: 3, title: "Social" },
      { number: 4, title: "Review" },
    ];

    return (
      <View style={styles.stepIndicatorContainer}>
        {steps.map((step, index) => (
          <View key={step.number} style={styles.stepIndicatorWrapper}>
            <View
              style={[
                styles.stepIndicator,
                registrationState.currentStep === step.number &&
                  styles.stepIndicatorActive,
                registrationState.currentStep > step.number &&
                  styles.stepIndicatorComplete,
              ]}
            >
              {registrationState.currentStep > step.number ? (
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              ) : (
                <Text
                  style={[
                    styles.stepNumber,
                    registrationState.currentStep === step.number &&
                      styles.stepNumberActive,
                  ]}
                >
                  {step.number}
                </Text>
              )}
            </View>
            <Text
              style={[
                styles.stepTitle,
                registrationState.currentStep === step.number &&
                  styles.stepTitleActive,
              ]}
            >
              {step.title}
            </Text>
            {index < steps.length - 1 && (
              <View
                style={[
                  styles.stepConnector,
                  registrationState.currentStep > step.number &&
                    styles.stepConnectorComplete,
                ]}
              />
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderCurrentStep = () => {
    const commonProps = {
      businessId: registrationState.businessId,
      userId: registrationState.userId,
      isEditMode: registrationState.isEditMode,
      onComplete: handleStepComplete,
      onBack: handleBack,
    };

    switch (registrationState.currentStep) {
      case 1:
        return <CompanyBasicInfoStep {...commonProps} />;
      case 2:
        return <CompanyLegalInfoStep {...commonProps} />;
      case 3:
        return <CompanySocialInfoStep {...commonProps} />;
      case 4:
        return <ApplicationReviewStep {...commonProps} />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0078D7" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {registrationState.isEditMode
            ? "Edit Application"
            : "Become a Seller"}
        </Text>
        <View style={{ width: 40 }} />
      </View>
      {renderStepIndicator()}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {renderCurrentStep()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  header: {
    backgroundColor: "#0078D7",
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#FFFFFF" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
  loadingText: { marginTop: 12, fontSize: 14, color: "#666" },
  stepIndicatorContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  stepIndicatorWrapper: { flex: 1, alignItems: "center", position: "relative" },
  stepIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E0E0E0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  stepIndicatorActive: { backgroundColor: "#0078D7" },
  stepIndicatorComplete: { backgroundColor: "#28A745" },
  stepNumber: { fontSize: 14, fontWeight: "700", color: "#666" },
  stepNumberActive: { color: "#FFFFFF" },
  stepTitle: { fontSize: 11, color: "#666", textAlign: "center" },
  stepTitleActive: { color: "#0078D7", fontWeight: "600" },
  stepConnector: {
    position: "absolute",
    top: 16,
    left: "50%",
    width: "100%",
    height: 2,
    backgroundColor: "#E0E0E0",
    zIndex: -1,
  },
  stepConnectorComplete: { backgroundColor: "#28A745" },
  scrollView: { flex: 1 },
});

export default BecomeSellerFlow;

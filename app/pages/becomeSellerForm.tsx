// app/pages/becomeSeller.tsx
// Replace your existing becomeSeller.tsx with this file

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
  companyId: string | null;
  userId: string;
  basicInfoComplete: boolean;
  legalInfoComplete: boolean;
  socialInfoComplete: boolean;
  profileImageComplete: boolean;
  applicationSubmitted: boolean;
  applicationId: string | null;
  isEditMode: boolean;
}

const BecomeSellerFlow = () => {
  const [loading, setLoading] = useState(true);
  const [registrationState, setRegistrationState] = useState<RegistrationState>(
    {
      currentStep: 1,
      companyId: null,
      userId: "",
      basicInfoComplete: false,
      legalInfoComplete: false,
      socialInfoComplete: false,
      profileImageComplete: false,
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
        console.log("❌ No token found");
        Alert.alert("Error", "Please login to continue");
        router.replace("/(tabs)/home");
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
        console.error("❌ Invalid token:", error);
        Alert.alert("Error", "Invalid session. Please login again.");
        await AsyncStorage.clear();
        router.replace("/(tabs)/home");
        return;
      }

      console.log("✅ User ID from token:", userId);
      await checkUserCompanyFromBackend(userId, token);
    } catch (error) {
      console.error("❌ Error initializing flow:", error);
      Alert.alert("Error", "Failed to initialize. Please try again.");
      router.replace("/(tabs)/home");
    } finally {
      setLoading(false);
    }
  };

  // This version handles BOTH possible API response structures

  const checkUserCompanyFromBackend = async (userId: string, token: string) => {
    try {
      console.log("🔍 Checking company for user_id:", userId);
      const response = await fetch(`${API_URL}/company/get/user/${userId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log("📡 Response status:", response.status);

      if (response.status === 404) {
        console.log("✅ No company (404) - NEW USER");
        await AsyncStorage.multiRemove([
          "companyId",
          "sellerStatus",
          "applicationId",
        ]);
        setRegistrationState((prev) => ({
          ...prev,
          userId,
          currentStep: 1,
          companyId: null,
        }));
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log("📦 Response:", JSON.stringify(result, null, 2));

      if (result.status === "success" && result.data) {
        // Try to extract companyId and userId from different possible structures
        let companyId: string | undefined;
        let companyUserId: string | undefined;

        // Structure 1: Flat data { company_id: "...", user_id: "..." }
        if (result.data.company_id && result.data.user_id) {
          companyId = result.data.company_id;
          companyUserId = result.data.user_id;
          console.log("✅ Found flat structure");
        }
        // Structure 2: Nested data { company: { company_id: "...", user_id: "..." } }
        else if (result.data.company) {
          companyId = result.data.company.company_id;
          companyUserId = result.data.company.user_id;
          console.log("✅ Found nested structure");
        }
        // Structure 3: Check all possible field names
        else {
          // Try common field name variations
          companyId =
            result.data.company_id || result.data.companyId || result.data.id;
          companyUserId =
            result.data.user_id || result.data.userId || result.data.user?.id;
          console.log("⚠️ Using fallback field detection");
        }

        console.log("🔒 Extracted:", {
          companyId,
          companyUserId,
          tokenUserId: userId,
        });

        // If we couldn't find user_id in response, we CANNOT verify ownership
        if (!companyUserId) {
          console.error("❌ CRITICAL: user_id not found in API response!");
          console.error("📦 Available fields:", Object.keys(result.data));
          console.error(
            "🚨 BACKEND BUG: /company/get/user/:user_id MUST return user_id",
          );

          Alert.alert(
            "Backend Error",
            "The API is not returning the user_id field. This is a backend bug that must be fixed. Contact your backend developer.",
            [
              {
                text: "Continue Anyway (UNSAFE)",
                style: "destructive",
                onPress: async () => {
                  // UNSAFE: Proceed without verification
                  if (companyId) {
                    await AsyncStorage.setItem("companyId", companyId);
                    await loadExistingCompanyState(userId, companyId, token);
                  }
                },
              },
              {
                text: "Start Fresh",
                onPress: async () => {
                  await AsyncStorage.multiRemove([
                    "companyId",
                    "sellerStatus",
                    "applicationId",
                  ]);
                  setRegistrationState((prev) => ({
                    ...prev,
                    userId,
                    currentStep: 1,
                    companyId: null,
                  }));
                },
              },
            ],
          );
          return;
        }

        // Verify ownership
        if (companyUserId !== userId) {
          console.error("❌ User ID mismatch!");
          console.error("Token user:", userId);
          console.error("Company user:", companyUserId);
          Alert.alert("Access Denied", "This company does not belong to you.");
          await AsyncStorage.multiRemove([
            "companyId",
            "sellerStatus",
            "applicationId",
          ]);
          setRegistrationState((prev) => ({
            ...prev,
            userId,
            currentStep: 1,
            companyId: null,
          }));
          return;
        }

        console.log("✅ Ownership verified");
        if (companyId) {
          await AsyncStorage.setItem("companyId", companyId);
          await loadExistingCompanyState(userId, companyId, token);
        }
      } else {
        console.log("✅ No company data - NEW USER");
        await AsyncStorage.multiRemove([
          "companyId",
          "sellerStatus",
          "applicationId",
        ]);
        setRegistrationState((prev) => ({
          ...prev,
          userId,
          currentStep: 1,
          companyId: null,
        }));
      }
    } catch (error: any) {
      console.error("❌ Error:", error.message);
      await AsyncStorage.multiRemove([
        "companyId",
        "sellerStatus",
        "applicationId",
      ]);
      setRegistrationState((prev) => ({
        ...prev,
        userId,
        currentStep: 1,
        companyId: null,
      }));
    }
  };

  const loadExistingCompanyState = async (
    userId: string,
    companyId: string,
    token: string,
  ) => {
    try {
      console.log("📡 Loading complete state");

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

      if (!response.ok) throw new Error("Failed to fetch");

      const result = await response.json();
      const data = result.data.company_details;

      console.log("🔒 Double-check:", {
        token: userId,
        company: data.company.user_id,
        match: data.company.user_id === userId,
      });

      if (data.company.user_id !== userId) {
        console.error("❌ User ID mismatch in complete!");
        Alert.alert("Access Denied", "This company does not belong to you.");
        await AsyncStorage.multiRemove([
          "companyId",
          "sellerStatus",
          "applicationId",
        ]);
        setRegistrationState((prev) => ({
          ...prev,
          userId,
          currentStep: 1,
          companyId: null,
        }));
        return;
      }

      const hasApplication =
        data.application && data.application.application_id;
      const applicationStatus = data.application?.status;

      console.log("📋 Application:", {
        hasApplication,
        status: applicationStatus,
      });

      if (applicationStatus === "approved") {
        console.log("✅ APPROVED - redirecting");
        await AsyncStorage.setItem("sellerStatus", "approved");
        Alert.alert("Already Approved", "Redirecting to dashboard...", [
          {
            text: "OK",
            onPress: () => router.replace("../pages/sellerDashboard"),
          },
        ]);
        return;
      }

      if (applicationStatus === "pending") {
        console.log("⏳ PENDING - redirecting");
        await AsyncStorage.setItem("sellerStatus", "pending");
        await AsyncStorage.setItem(
          "applicationId",
          data.application.application_id,
        );
        Alert.alert("Under Review", "Your application is being reviewed.", [
          {
            text: "View Status",
            onPress: () => router.replace("../pages/sellerApplicationStatus"),
          },
        ]);
        return;
      }

      const basicInfoComplete = !!(
        data.company.company_name &&
        data.company.company_email &&
        data.company.company_phone &&
        data.company.company_address
      );
      const legalInfoComplete = !!(
        data.legal_details &&
        (data.legal_details.pan_number ||
          data.legal_details.gst_number ||
          data.legal_details.msme_number)
      );
      const socialInfoComplete = !!(
        data.social_details &&
        (data.social_details.linkedin_url ||
          data.social_details.instagram_url ||
          data.social_details.facebook_url ||
          data.social_details.website_url ||
          data.social_details.whatsapp_number)
      );
      const profileImageComplete = !!data.company.company_profile_url;

      let currentStep = 1;
      if (basicInfoComplete && !legalInfoComplete) currentStep = 2;
      else if (basicInfoComplete && legalInfoComplete && !socialInfoComplete)
        currentStep = 3;
      else if (
        basicInfoComplete &&
        legalInfoComplete &&
        socialInfoComplete &&
        !profileImageComplete
      )
        currentStep = 3;
      else if (
        basicInfoComplete &&
        legalInfoComplete &&
        socialInfoComplete &&
        profileImageComplete &&
        !hasApplication
      )
        currentStep = 4;

      console.log("📊 State:", {
        currentStep,
        basic: basicInfoComplete,
        legal: legalInfoComplete,
        social: socialInfoComplete,
        image: profileImageComplete,
      });

      setRegistrationState({
        currentStep,
        companyId,
        userId,
        basicInfoComplete,
        legalInfoComplete,
        socialInfoComplete,
        profileImageComplete,
        applicationSubmitted: hasApplication,
        applicationId: data.application?.application_id || null,
        isEditMode: applicationStatus === "rejected",
      });

      if (hasApplication && data.application?.application_id) {
        await AsyncStorage.setItem(
          "applicationId",
          data.application.application_id,
        );
        await AsyncStorage.setItem(
          "sellerStatus",
          applicationStatus || "pending",
        );
      }
    } catch (error) {
      console.error("❌ Error loading state:", error);
      setRegistrationState((prev) => ({
        ...prev,
        userId,
        companyId,
        currentStep: 1,
      }));
    }
  };

  // CRITICAL FIX: Step 4 completion routing
  // Replace the handleStepComplete function in your BecomeSellerFlow.tsx with this:

  const handleStepComplete = async (stepNumber: number, data?: any) => {
    console.log(`✅ Step ${stepNumber} done`, data);

    const updates: Partial<RegistrationState> = {};

    if (stepNumber === 1) {
      updates.basicInfoComplete = true;
      updates.companyId = data?.companyId || registrationState.companyId;
      updates.currentStep = 2;
      if (data?.companyId) {
        await AsyncStorage.setItem("companyId", data.companyId);
        console.log("💾 Saved companyId");
      }
    } else if (stepNumber === 2) {
      updates.legalInfoComplete = true;
      updates.currentStep = 3;
    } else if (stepNumber === 3) {
      updates.socialInfoComplete = true;
      updates.profileImageComplete = data?.imageUploaded || false;
      updates.currentStep = 4;
    } else if (stepNumber === 4) {
      // ✅ APPLICATION SUBMITTED - REDIRECT TO STATUS PAGE
      updates.applicationSubmitted = true;
      updates.applicationId = data?.applicationId;

      if (data?.applicationId) {
        await AsyncStorage.setItem("applicationId", data.applicationId);
        await AsyncStorage.setItem("sellerStatus", "pending");
        console.log("💾 Saved applicationId:", data.applicationId);
        console.log("🔀 Redirecting to status page...");

        // Immediate redirect - no setTimeout needed
        router.push("./sellerApplicationStatus");
        return; // Important: return early, don't update state
      } else {
        console.error("❌ No applicationId received!");
        Alert.alert("Error", "Application ID not received. Please try again.");
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
      { number: 3, title: "Social & Image" },
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
      companyId: registrationState.companyId,
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

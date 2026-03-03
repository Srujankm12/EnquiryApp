import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { router } from "expo-router";
import { jwtDecode } from "jwt-decode";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

const STEPS = [
  { number: 1, title: "Basic Info", icon: "business-outline" as const },
  { number: 2, title: "Legal", icon: "document-text-outline" as const },
  { number: 3, title: "Social", icon: "share-social-outline" as const },
  { number: 4, title: "Review", icon: "checkmark-circle-outline" as const },
];

const BecomeSellerFlow = () => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [registrationState, setRegistrationState] = useState<RegistrationState>({
    currentStep: 1, businessId: null, userId: "",
    basicInfoComplete: false, legalInfoComplete: false, socialInfoComplete: false,
    applicationSubmitted: false, applicationId: null, isEditMode: false,
  });

  const API_URL = Constants.expoConfig?.extra?.API_URL;

  useEffect(() => { initializeFlow(); }, []);

  const initializeFlow = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) { Alert.alert("Error", "Please login to continue"); router.replace("/(tabs)"); return; }
      let userId: string;
      try {
        const decoded = jwtDecode<any>(token);
        userId = decoded.user_id;
        if (!userId) throw new Error("No user_id");
      } catch {
        Alert.alert("Error", "Invalid session. Please login again.");
        await AsyncStorage.clear();
        router.replace("/(tabs)");
        return;
      }
      await checkUserBusiness(userId);
    } catch {
      Alert.alert("Error", "Failed to initialize. Please try again.");
      router.replace("/(tabs)");
    } finally { setLoading(false); }
  };

  const checkUserBusiness = async (userId: string) => {
    try {
      const res = await fetch(`${API_URL}/business/get/user/${userId}`, { headers: { "Content-Type": "application/json" } });
      if (res.status === 404 || res.status === 400) {
        await AsyncStorage.multiRemove(["businessId", "sellerStatus", "applicationId"]);
        setRegistrationState(p => ({ ...p, userId, currentStep: 1, businessId: null }));
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();
      if (result.business_id) {
        await AsyncStorage.setItem("businessId", result.business_id);
        await loadExistingState(userId, result.business_id);
      } else {
        await AsyncStorage.multiRemove(["businessId", "sellerStatus", "applicationId"]);
        setRegistrationState(p => ({ ...p, userId, currentStep: 1, businessId: null }));
      }
    } catch {
      await AsyncStorage.multiRemove(["businessId", "sellerStatus", "applicationId"]);
      setRegistrationState(p => ({ ...p, userId, currentStep: 1, businessId: null }));
    }
  };

  const loadExistingState = async (userId: string, businessId: string) => {
    try {
      const res = await fetch(`${API_URL}/business/get/complete/${businessId}`, { headers: { "Content-Type": "application/json" } });
      if (!res.ok) throw new Error("Failed to fetch");
      const { details } = await res.json();
      const { business_details: biz, social_details: social, legal_details: legal, business_application: app } = details;
      if (biz.user_id !== userId) {
        Alert.alert("Access Denied", "This business does not belong to you.");
        await AsyncStorage.multiRemove(["businessId", "sellerStatus", "applicationId"]);
        setRegistrationState(p => ({ ...p, userId, currentStep: 1, businessId: null }));
        return;
      }
      const status = app?.status;
      if (status === "APPROVED" || status === "approved") {
        await AsyncStorage.setItem("sellerStatus", "approved");
        Alert.alert("Already Approved", "Redirecting to dashboard...", [{ text: "OK", onPress: () => router.replace("/(tabs)") }]);
        return;
      }
      if (status === "APPLIED" || status === "pending") {
        await AsyncStorage.setItem("sellerStatus", "pending");
        if (app.id) await AsyncStorage.setItem("applicationId", app.id);
        Alert.alert("Under Review", "Your application is being reviewed.", [{ text: "View Status", onPress: () => router.replace("/pages/sellerApplicationStatus") }]);
        return;
      }
      const basicOk = !!(biz.name && biz.email && biz.phone && biz.address);
      const legalOk = !!(legal && (legal.pan || legal.gst || legal.msme));
      const socialOk = !!(social && (social.linkedin || social.instagram || social.facebook || social.website || social.telegram || social.youtube || social.x));
      let step = 1;
      if (basicOk && !legalOk) step = 2;
      else if (basicOk && legalOk && !socialOk) step = 3;
      else if (basicOk && legalOk && socialOk && !app?.id) step = 4;
      setRegistrationState({ currentStep: step, businessId, userId, basicInfoComplete: basicOk, legalInfoComplete: legalOk, socialInfoComplete: socialOk, applicationSubmitted: !!app?.id, applicationId: app?.id || null, isEditMode: status === "REJECTED" || status === "rejected" });
      if (app?.id) { await AsyncStorage.setItem("applicationId", app.id); await AsyncStorage.setItem("sellerStatus", status === "APPLIED" ? "pending" : (status || "pending").toLowerCase()); }
    } catch {
      setRegistrationState(p => ({ ...p, userId, businessId, currentStep: 1 }));
    }
  };

  const handleStepComplete = async (stepNumber: number, data?: any) => {
    const updates: Partial<RegistrationState> = {};
    if (stepNumber === 1) {
      updates.basicInfoComplete = true;
      updates.businessId = data?.businessId || registrationState.businessId;
      updates.currentStep = 2;
      if (data?.businessId) await AsyncStorage.setItem("businessId", data.businessId);
    } else if (stepNumber === 2) {
      updates.legalInfoComplete = true; updates.currentStep = 3;
    } else if (stepNumber === 3) {
      updates.socialInfoComplete = true; updates.currentStep = 4;
    } else if (stepNumber === 4) {
      updates.applicationSubmitted = true;
      updates.applicationId = data?.applicationId;
      if (data?.applicationId) await AsyncStorage.setItem("applicationId", data.applicationId);
      await AsyncStorage.setItem("sellerStatus", "pending");
      // ← Navigate back to home after submission
      router.replace("/(tabs)");
      return;
    }
    setRegistrationState(p => ({ ...p, ...updates }));
  };

  const handleBack = () => {
    if (registrationState.currentStep > 1) {
      setRegistrationState(p => ({ ...p, currentStep: p.currentStep - 1 }));
    } else {
      router.back();
    }
  };

  const commonProps = {
    businessId: registrationState.businessId,
    userId: registrationState.userId,
    isEditMode: registrationState.isEditMode,
    onComplete: handleStepComplete,
    onBack: handleBack,
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#fff", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0078D7" />
        <Text style={{ marginTop: 12, fontSize: 14, color: "#64748B" }}>Loading...</Text>
      </View>
    );
  }

  const cur = registrationState.currentStep;

  return (
    <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      <StatusBar barStyle="light-content" backgroundColor="#0060B8" />

      {/* ── Premium Blue Header ── */}
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <View style={s.orb1} /><View style={s.orb2} />

        <View style={s.headerRow}>
          <TouchableOpacity style={s.backBtn} onPress={handleBack}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>
              {registrationState.isEditMode ? "Edit Application" : "Become a Seller"}
            </Text>
            <Text style={s.headerSub}>Step {cur} of 4 — {STEPS[cur - 1].title}</Text>
          </View>
          <View style={s.stepBadge}>
            <Text style={s.stepBadgeText}>{cur}/4</Text>
          </View>
        </View>

        {/* ── Step Indicator ── */}
        <View style={s.stepsRow}>
          {STEPS.map((step, i) => {
            const done = cur > step.number;
            const active = cur === step.number;
            return (
              <React.Fragment key={step.number}>
                <View style={s.stepItem}>
                  <View style={[s.stepCircle, active && s.stepCircleActive, done && s.stepCircleDone]}>
                    {done
                      ? <Ionicons name="checkmark" size={14} color="#fff" />
                      : <Ionicons name={step.icon} size={14} color={active ? "#fff" : "rgba(255,255,255,0.4)"} />
                    }
                  </View>
                  <Text style={[s.stepLabel, active && s.stepLabelActive, done && s.stepLabelDone]}>
                    {step.title}
                  </Text>
                </View>
                {i < STEPS.length - 1 && (
                  <View style={[s.stepLine, done && s.stepLineDone]} />
                )}
              </React.Fragment>
            );
          })}
        </View>
      </View>

      {/* ── Content ── */}
      <KeyboardAwareScrollView
        style={s.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        enableAutomaticScroll={true}
        extraScrollHeight={Platform.OS === "ios" ? 40 : 100}
        extraHeight={120}
        bounces={false}
      >
        {cur === 1 && <CompanyBasicInfoStep {...commonProps} />}
        {cur === 2 && <CompanyLegalInfoStep {...commonProps} />}
        {cur === 3 && <CompanySocialInfoStep {...commonProps} />}
        {cur === 4 && <ApplicationReviewStep {...commonProps} />}
      </KeyboardAwareScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  header: {
    backgroundColor: "#0060B8",
    paddingHorizontal: 20,
    paddingBottom: 24,
    overflow: "hidden",
  },
  orb1: { position: "absolute", width: 260, height: 260, borderRadius: 130, backgroundColor: "rgba(255,255,255,0.05)", top: -80, right: -80 },
  orb2: { position: "absolute", width: 160, height: 160, borderRadius: 80, backgroundColor: "rgba(255,255,255,0.04)", bottom: -60, left: -60 },

  headerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 22 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.15)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  headerTitle: { fontSize: 17, fontWeight: "800", color: "#fff", letterSpacing: -0.2 },
  headerSub: { fontSize: 11, color: "rgba(255,255,255,0.65)", marginTop: 2, fontWeight: "500" },
  stepBadge: { backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" },
  stepBadgeText: { fontSize: 12, fontWeight: "800", color: "#fff" },

  stepsRow: { flexDirection: "row", alignItems: "center" },
  stepItem: { alignItems: "center", gap: 6 },
  stepCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.15)", justifyContent: "center", alignItems: "center", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.2)" },
  stepCircleActive: { backgroundColor: "#fff", borderColor: "#fff" },
  stepCircleDone: { backgroundColor: "#10B981", borderColor: "#10B981" },
  stepLabel: { fontSize: 10, color: "rgba(255,255,255,0.45)", fontWeight: "600" },
  stepLabelActive: { color: "#fff", fontWeight: "800" },
  stepLabelDone: { color: "rgba(255,255,255,0.7)" },
  stepLine: { flex: 1, height: 2, backgroundColor: "rgba(255,255,255,0.15)", marginHorizontal: 4, marginBottom: 16 },
  stepLineDone: { backgroundColor: "#10B981" },

  scroll: { flex: 1 },
});

export default BecomeSellerFlow;

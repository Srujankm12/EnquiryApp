import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Constants from "expo-constants";
import { router } from "expo-router";
import { jwtDecode } from "jwt-decode";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const API_URL = Constants.expoConfig?.extra?.API_URL;

interface DecodedToken { user_id: string; exp?: number; }
interface FieldErrors { newPassword?: string; confirmPassword?: string; }

const UpdatePasswordScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [userId, setUserId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [newFocused, setNewFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);

  useEffect(() => { getUserId(); }, []);

  const clearError = (field: keyof FieldErrors) => {
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const getUserId = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) { Alert.alert("Session Expired", "Please login again."); router.replace("/login" as any); return; }
      const decoded = jwtDecode<DecodedToken>(token);
      setUserId(decoded.user_id);
    } catch {
      Alert.alert("Error", "Failed to get user information.");
      router.replace("/login" as any);
    }
  };

  const getPasswordStrength = (): number => {
    if (newPassword.length < 8) return 0;
    const score = [/[A-Z]/, /[a-z]/, /[0-9]/, /[@$!%*?&]/].filter(r => r.test(newPassword)).length;
    return score <= 2 ? 1 : 2;
  };

  const strength = getPasswordStrength();
  const strengthLabels = ["Weak", "Medium", "Strong"];
  const strengthColors = ["#EF4444", "#F59E0B", "#10B981"];

  const validate = (): boolean => {
    const e: FieldErrors = {};
    if (!newPassword.trim()) e.newPassword = "New password is required";
    else if (!/^[A-Za-z\d@$!%*?&]{8,}$/.test(newPassword)) e.newPassword = "Min 8 chars — letters, digits or @$!%*?&";
    if (!confirmPassword.trim()) e.confirmPassword = "Please confirm your password";
    else if (newPassword !== confirmPassword) e.confirmPassword = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleUpdate = async () => {
    if (!validate()) return;
    const token = await AsyncStorage.getItem("token");
    if (!token || !userId) { Alert.alert("Session Expired", "Please login again."); router.replace("/login" as any); return; }
    try {
      setLoading(true);
      const response = await axios.put(
        `${API_URL}/user/update/password/${userId}`,
        { password: newPassword },
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, timeout: 10000 },
      );
      Alert.alert("Success ✓", response.data.message || "Password updated successfully!", [
        { text: "OK", onPress: () => { setNewPassword(""); setConfirmPassword(""); router.back(); } },
      ]);
    } catch (error: any) {
      const msg: string = error.response?.data?.error ?? "";
      const status: number = error.response?.status ?? 0;
      if (error.code === "ERR_NETWORK") { Alert.alert("Connection Error", "Cannot reach server. Check your connection."); return; }
      if (msg.toLowerCase().includes("password")) { setErrors({ newPassword: msg }); }
      else if (status === 401) { Alert.alert("Session Expired", "Please login again."); router.replace("/login" as any); }
      else Alert.alert("Failed", msg || "Could not update password. Try again.");
    } finally { setLoading(false); }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0060B8" />

      {/* ── Premium Header ── */}
      <View style={[styles.headerWrapper, { paddingTop: insets.top }]}>
        <View style={styles.orb1} /><View style={styles.orb2} />
        <View style={styles.headerInner}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.eyebrow}>ACCOUNT SECURITY</Text>
            <Text style={styles.headerTitle}>Update Password</Text>
          </View>
          <View style={styles.headerIconWrap}>
            <Ionicons name="lock-closed" size={18} color="#fff" />
          </View>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Info banner */}
          <View style={styles.infoBanner}>
            <View style={styles.infoBannerIcon}>
              <Ionicons name="shield-checkmark" size={18} color="#F59E0B" />
            </View>
            <Text style={styles.infoBannerText}>
              Use at least 8 characters including uppercase, lowercase, digits, or @$!%*?&
            </Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconWrap, { backgroundColor: '#F3EEFF' }]}>
                <Ionicons name="lock-closed-outline" size={16} color="#7C3AED" />
              </View>
              <Text style={styles.cardTitle}>Set New Password</Text>
            </View>

            {/* New Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>New Password</Text>
              <View style={[styles.inputRow, newFocused && styles.inputRowFocused, errors.newPassword && styles.inputRowError]}>
                <View style={styles.inputIconWrap}>
                  <Ionicons name="lock-closed-outline" size={16} color={errors.newPassword ? "#EF4444" : "#0078D7"} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Enter new password"
                  placeholderTextColor="#CBD5E1"
                  value={newPassword}
                  onChangeText={v => { setNewPassword(v); clearError("newPassword"); }}
                  secureTextEntry={!showNew}
                  autoCapitalize="none"
                  onFocus={() => setNewFocused(true)}
                  onBlur={() => setNewFocused(false)}
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowNew(!showNew)}>
                  <Ionicons name={showNew ? "eye-off-outline" : "eye-outline"} size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>
              {errors.newPassword && <Text style={styles.errorText}><Ionicons name="alert-circle" size={11} color="#EF4444" /> {errors.newPassword}</Text>}

              {/* Strength bars */}
              {newPassword.length > 0 && (
                <View style={styles.strengthRow}>
                  <View style={styles.strengthBars}>
                    {[0, 1, 2].map(i => (
                      <View key={i} style={[styles.strengthBar, i <= strength && { backgroundColor: strengthColors[strength] }]} />
                    ))}
                  </View>
                  <Text style={[styles.strengthLabel, { color: strengthColors[strength] }]}>{strengthLabels[strength]}</Text>
                </View>
              )}
            </View>

            {/* Confirm Password */}
            <View style={[styles.fieldGroup, { marginBottom: 0 }]}>
              <Text style={styles.fieldLabel}>Confirm New Password</Text>
              <View style={[styles.inputRow, confirmFocused && styles.inputRowFocused, errors.confirmPassword && styles.inputRowError]}>
                <View style={styles.inputIconWrap}>
                  <Ionicons name="checkmark-circle-outline" size={16} color={errors.confirmPassword ? "#EF4444" : "#0078D7"} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Re-enter new password"
                  placeholderTextColor="#CBD5E1"
                  value={confirmPassword}
                  onChangeText={v => { setConfirmPassword(v); clearError("confirmPassword"); }}
                  secureTextEntry={!showConfirm}
                  autoCapitalize="none"
                  onFocus={() => setConfirmFocused(true)}
                  onBlur={() => setConfirmFocused(false)}
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirm(!showConfirm)}>
                  <Ionicons name={showConfirm ? "eye-off-outline" : "eye-outline"} size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>
              {errors.confirmPassword && <Text style={styles.errorText}><Ionicons name="alert-circle" size={11} color="#EF4444" /> {errors.confirmPassword}</Text>}
            </View>
          </View>

          {/* Password tips */}
          <View style={styles.tipsCard}>
            <Text style={styles.tipsTitle}>Password Tips</Text>
            {["At least 8 characters long", "Mix uppercase & lowercase letters", "Include at least one number", "Add a special character (@$!%*?&)"].map((tip, i) => (
              <View key={i} style={styles.tipRow}>
                <View style={styles.tipDot} />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>

          {/* Submit button */}
          <TouchableOpacity
            style={[styles.saveBtn, loading && { opacity: 0.6 }]}
            onPress={handleUpdate}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="lock-closed" size={18} color="#fff" />
                <Text style={styles.saveBtnText}>Update Password</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default UpdatePasswordScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9FC' },

  // Header
  headerWrapper: { backgroundColor: '#0060B8', paddingHorizontal: 20, paddingBottom: 22, overflow: 'hidden', shadowColor: '#003E80', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 24, elevation: 18 },
  orb1: { position: 'absolute', width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(255,255,255,0.06)', top: -80, right: -60 },
  orb2: { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.04)', bottom: 5, left: -50 },
  headerInner: { flexDirection: 'row', alignItems: 'center', paddingTop: 16 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  eyebrow: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.65)', letterSpacing: 2, marginBottom: 2 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.4 },
  headerIconWrap: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },

  // Info Banner
  infoBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFBEB', marginBottom: 16, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#FDE68A' },
  infoBannerIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center' },
  infoBannerText: { flex: 1, fontSize: 12, color: '#92400E', fontWeight: '600', lineHeight: 18 },

  // Card
  card: { backgroundColor: '#fff', borderRadius: 22, padding: 18, shadowColor: '#1B4FBF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 14, elevation: 4, borderWidth: 1, borderColor: '#F0F4F8', marginBottom: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  cardIconWrap: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A' },

  // Fields
  fieldGroup: { marginBottom: 18 },
  fieldLabel: { fontSize: 10, fontWeight: '800', color: '#64748B', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7F9FC', borderRadius: 14, borderWidth: 1.5, borderColor: '#E2E8F0', paddingHorizontal: 10 },
  inputRowFocused: { borderColor: '#0078D7', backgroundColor: '#EBF5FF' },
  inputRowError: { borderColor: '#EF4444', backgroundColor: '#FFF5F5' },
  inputIconWrap: { width: 30, height: 30, borderRadius: 9, backgroundColor: '#EBF5FF', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  input: { flex: 1, fontSize: 14, color: '#0F172A', fontWeight: '600', paddingVertical: 14 },
  eyeBtn: { padding: 8 },
  errorText: { fontSize: 11, color: '#EF4444', marginTop: 6, fontWeight: '600' },

  // Strength
  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  strengthBars: { flex: 1, flexDirection: 'row', gap: 5 },
  strengthBar: { flex: 1, height: 5, backgroundColor: '#E2E8F0', borderRadius: 3 },
  strengthLabel: { fontSize: 11, fontWeight: '700', width: 48, textAlign: 'right' },

  // Tips
  tipsCard: { backgroundColor: '#fff', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#F0F4F8', marginBottom: 20 },
  tipsTitle: { fontSize: 11, fontWeight: '800', color: '#94A3B8', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  tipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#0078D7' },
  tipText: { fontSize: 12, color: '#475569', fontWeight: '500' },

  // Save Button
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#0078D7', paddingVertical: 16, borderRadius: 16, shadowColor: '#0078D7', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 7 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});

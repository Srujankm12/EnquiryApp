import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import Constants from "expo-constants";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const API_URL = Constants.expoConfig?.extra?.API_URL;
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PASSWORD_REGEX = /^[A-Za-z\d@$!%*?&]{8,}$/;
const PHONE_REGEX = /^\d{7,15}$/;

// ─── Field defined OUTSIDE RegisterScreen to prevent remount on each keystroke ───
interface FieldProps {
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  keyboard?: any;
  secure?: boolean;
  toggle?: boolean;
  onToggle?: () => void;
  hasError?: boolean;
  isValid?: boolean;
  isFocused?: boolean;
  onFocus: () => void;
  onBlur: () => void;
}

const Field = React.memo(function Field({
  icon, placeholder, value, onChange, keyboard,
  secure, toggle, onToggle,
  hasError, isValid, isFocused,
  onFocus, onBlur,
}: FieldProps) {
  const borderColor = hasError ? "#EF4444" : isValid ? "#10B981" : isFocused ? "#0078D7" : "#E2E8F0";
  const bgColor = hasError ? "#FFF5F5" : isValid ? "#F0FFF4" : isFocused ? "#EBF5FF" : "#F8FAFC";
  const iconColor = hasError ? "#EF4444" : isValid ? "#10B981" : isFocused ? "#0078D7" : "#94A3B8";
  const iconBg = isFocused ? "#DBEAFE" : isValid ? "#DCFCE7" : "#F1F5F9";

  return (
    <View style={[fs.row, { borderColor, backgroundColor: bgColor }]}>
      <View style={[fs.iconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={16} color={iconColor} />
      </View>
      <TextInput
        style={fs.input}
        placeholder={placeholder}
        placeholderTextColor="#CBD5E1"
        value={value}
        onChangeText={onChange}
        keyboardType={keyboard}
        secureTextEntry={secure}
        autoCapitalize={keyboard === "email-address" || keyboard === "phone-pad" ? "none" : "words"}
        autoCorrect={false}
        onFocus={onFocus}
        onBlur={onBlur}
        returnKeyType="next"
        blurOnSubmit={false}
      />
      {toggle && onToggle && (
        <TouchableOpacity onPress={onToggle} style={fs.eyeBtn}>
          <Ionicons name={secure ? "eye-off-outline" : "eye-outline"} size={17} color="#94A3B8" />
        </TouchableOpacity>
      )}
      {!toggle && isValid && <Ionicons name="checkmark-circle" size={18} color="#10B981" />}
      {hasError && <Ionicons name="alert-circle" size={18} color="#EF4444" />}
    </View>
  );
});

const fs = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    height: 54,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#0F172A",
    fontWeight: "500",
  },
  eyeBtn: { padding: 6 },
});
// ─────────────────────────────────────────────────────────────────────────────

type FN = "firstName" | "lastName" | "email" | "phone" | "password" | "confirmPassword";
interface FieldErrors {
  firstName?: string; email?: string; phone?: string;
  password?: string; confirmPassword?: string; terms?: string;
}

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showCPw, setShowCPw] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [valid, setValid] = useState<Set<FN>>(new Set());
  const [focused, setFocused] = useState<FN | null>(null);

  const markValid = (f: FN) => {
    setValid(p => { const n = new Set(p); n.add(f); return n; });
    setErrors(p => ({ ...p, [f]: undefined }));
  };
  const markInvalid = (f: FN, msg?: string) => {
    setValid(p => { const n = new Set(p); n.delete(f); return n; });
    setErrors(p => ({ ...p, [f]: msg }));
  };

  const isV = (f: FN) => valid.has(f);
  const isF = (f: FN) => focused === f;
  const hasErr = (f: string) => !!(errors as any)[f];

  const onFirstName = (v: string) => { setFirstName(v); v.trim() ? markValid("firstName") : markInvalid("firstName"); };
  const onLastName = (v: string) => setLastName(v);
  const onEmail = (v: string) => { setEmail(v); EMAIL_REGEX.test(v.trim()) ? markValid("email") : markInvalid("email", v.trim().length > 3 ? "Enter a valid email" : undefined); };
  const onPhone = (v: string) => { setPhone(v); PHONE_REGEX.test(v.trim()) ? markValid("phone") : markInvalid("phone", v.trim().length > 3 ? "7–15 digits only" : undefined); };
  const onPassword = (v: string) => {
    setPassword(v);
    PASSWORD_REGEX.test(v) ? markValid("password") : markInvalid("password", v.length > 2 ? "Min 8 chars" : undefined);
    if (confirm.length > 0) { v === confirm ? markValid("confirmPassword") : markInvalid("confirmPassword", "Passwords do not match"); }
  };
  const onConfirm = (v: string) => {
    setConfirm(v);
    v.length ? (v === password ? markValid("confirmPassword") : markInvalid("confirmPassword", "Passwords do not match")) : markInvalid("confirmPassword");
  };

  const pwStrength = (() => {
    if (!password.length) return 0;
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) s++;
    if (/[0-9]/.test(password) || /[@$!%*?&]/.test(password)) s++;
    return s;
  })();
  const strengthColor = ["#E2E8F0", "#EF4444", "#F59E0B", "#10B981"][pwStrength];
  const strengthLabel = ["", "Weak", "Fair", "Strong"][pwStrength];

  const validate = () => {
    const e: FieldErrors = {};
    if (!firstName.trim()) e.firstName = "First name is required";
    if (!EMAIL_REGEX.test(email.trim())) e.email = "Enter a valid email";
    if (!PHONE_REGEX.test(phone.trim())) e.phone = "7–15 digits only";
    if (!PASSWORD_REGEX.test(password)) e.password = "Min 8 chars";
    if (!confirm) e.confirmPassword = "Please confirm your password";
    else if (password !== confirm) e.confirmPassword = "Passwords do not match";
    if (!agreeToTerms) e.terms = "Please agree to the Terms & Conditions";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handlePickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert("Permission required", "Allow access to your photo library."); return; }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!r.canceled) setProfileImage(r.assets[0].uri);
  };

  const uploadImage = async (userId: string, uri: string) => {
    const res = await axios.put(`${API_URL}/user/update/image/${userId}`);
    const blob = await (await fetch(uri)).blob();
    await fetch(res.data.url, { method: "PUT", headers: { "Content-Type": "image/jpeg" }, body: blob });
  };

  const handleRegister = async () => {
    if (!validate()) return;
    const body: Record<string, string> = { first_name: firstName.trim(), email: email.trim(), phone: phone.trim(), password };
    if (lastName.trim()) body.last_name = lastName.trim();
    try {
      setLoading(true);
      const res = await axios.post(`${API_URL}/user/create`, body);
      const userId: string = res.data.user_id;
      if (profileImage && userId) { try { await uploadImage(userId, profileImage); } catch { } }
      Alert.alert("Account Created! 🎉", "Welcome to Agro Mart. Please sign in.", [
        { text: "Sign In", onPress: () => router.replace("/pages/loginMail") }
      ]);
    } catch (error: any) {
      if (error.code === "ERR_NETWORK") { Alert.alert("Cannot Reach Server", `URL: ${API_URL}`); return; }
      const msg: string = error.response?.data?.error ?? "";
      const code: number = error.response?.status ?? 0;
      if (msg.toLowerCase().includes("email")) setErrors(p => ({ ...p, email: "Email already registered" }));
      else if (msg.toLowerCase().includes("phone")) setErrors(p => ({ ...p, phone: "Phone already in use" }));
      else Alert.alert("Registration Failed", msg || `Error ${code || "unknown"}`);
    } finally { setLoading(false); }
  };

  return (
    // Root is white so there's no black gap anywhere
    <View style={{ flex: 1, backgroundColor: "#0060B8" }}>
      <StatusBar barStyle="light-content" backgroundColor="#0060B8" />

      {/*
       * THE KEY FIX: The ENTIRE screen (blue header + white form) is inside
       * KeyboardAwareScrollView. When keyboard opens the whole page scrolls up,
       * so the header scrolls away and the focused field is always visible.
       * No more "field hidden under header" problem.
       */}
      <KeyboardAwareScrollView
        style={{ flex: 1, backgroundColor: "#0060B8" }}
        contentContainerStyle={{ flexGrow: 1, backgroundColor: "#0060B8" }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        enableAutomaticScroll={true}
        extraScrollHeight={Platform.OS === "ios" ? 40 : 80}
        bounces={false}
      >
        {/* ── Blue Hero Header ── */}
        <View style={[s.hero, { paddingTop: insets.top + 12 }]}>
          <View style={s.orb1} />
          <View style={s.orb2} />

          {/* Brand + Back row */}
          <View style={s.brandRow}>
            <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={18} color="#fff" />
            </TouchableOpacity>
            <View style={s.logoBox}>
              <Image source={require("../../assets/images/icon.png")} style={s.logo} resizeMode="contain" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.brandName}>South Canara Agro Mart</Text>
              <Text style={s.brandTag}>B2B Dry Fruits Marketplace</Text>
            </View>
          </View>

          <Text style={s.heroHeading}>Create Account</Text>
          <Text style={s.heroSub}>Join thousands of dry fruit traders across India</Text>
        </View>

        {/* ── White Form Card ── */}
        <View style={[s.formCard, { paddingBottom: insets.bottom + 36 }]}>
          {/* Handle bar */}
          <View style={s.handle} />

          {/* Profile photo */}
          <TouchableOpacity style={s.avatarRow} onPress={handlePickImage} activeOpacity={0.85}>
            {profileImage
              ? <Image source={{ uri: profileImage }} style={s.avatar} />
              : (
                <View style={s.avatarPlaceholder}>
                  <Ionicons name="person-outline" size={26} color="#0078D7" />
                </View>
              )
            }
            <View style={s.cameraBadge}>
              <Ionicons name="camera" size={11} color="#fff" />
            </View>
            <View>
              <Text style={s.avatarLabel}>
                {firstName ? `${firstName} ${lastName}`.trim() : "Add Profile Photo"}
              </Text>
              <Text style={s.avatarSub}>Optional — tap to choose</Text>
            </View>
          </TouchableOpacity>

          {/* ── Personal Info ── */}
          <Text style={s.sectionTitle}>Personal Information</Text>

          <Text style={s.label}>First Name <Text style={s.req}>*</Text></Text>
          <Field
            icon="person-outline" placeholder="Enter first name"
            value={firstName} onChange={onFirstName}
            hasError={hasErr("firstName")} isValid={isV("firstName")} isFocused={isF("firstName")}
            onFocus={() => setFocused("firstName")} onBlur={() => setFocused(null)}
          />
          {errors.firstName && <Text style={s.err}>{errors.firstName}</Text>}

          <Text style={s.label}>Last Name</Text>
          <Field
            icon="person-outline" placeholder="Enter last name (optional)"
            value={lastName} onChange={onLastName}
            hasError={false} isValid={false} isFocused={isF("lastName")}
            onFocus={() => setFocused("lastName")} onBlur={() => setFocused(null)}
          />

          <Text style={s.label}>Email Address <Text style={s.req}>*</Text></Text>
          <Field
            icon="mail-outline" placeholder="you@example.com"
            value={email} onChange={onEmail} keyboard="email-address"
            hasError={hasErr("email")} isValid={isV("email")} isFocused={isF("email")}
            onFocus={() => setFocused("email")} onBlur={() => setFocused(null)}
          />
          {errors.email && <Text style={s.err}>{errors.email}</Text>}

          <Text style={s.label}>Phone Number <Text style={s.req}>*</Text></Text>
          <Field
            icon="call-outline" placeholder="Mobile number"
            value={phone} onChange={onPhone} keyboard="phone-pad"
            hasError={hasErr("phone")} isValid={isV("phone")} isFocused={isF("phone")}
            onFocus={() => setFocused("phone")} onBlur={() => setFocused(null)}
          />
          {errors.phone && <Text style={s.err}>{errors.phone}</Text>}

          {/* ── Security ── */}
          <Text style={[s.sectionTitle, { marginTop: 28 }]}>Security</Text>

          <Text style={s.label}>Password <Text style={s.req}>*</Text></Text>
          <Field
            icon="lock-closed-outline" placeholder="Minimum 8 characters"
            value={password} onChange={onPassword}
            secure={!showPw} toggle onToggle={() => setShowPw(p => !p)}
            hasError={hasErr("password")} isValid={isV("password")} isFocused={isF("password")}
            onFocus={() => setFocused("password")} onBlur={() => setFocused(null)}
          />
          {errors.password && <Text style={s.err}>{errors.password}</Text>}

          {/* Strength bars */}
          {password.length > 0 && (
            <View style={s.strengthRow}>
              {[1, 2, 3].map(l => (
                <View key={l} style={[s.strengthBar, { backgroundColor: pwStrength >= l ? strengthColor : "#E2E8F0" }]} />
              ))}
              {pwStrength > 0 && (
                <Text style={[s.strengthLbl, { color: strengthColor }]}>{strengthLabel}</Text>
              )}
            </View>
          )}

          <Text style={s.label}>Confirm Password <Text style={s.req}>*</Text></Text>
          <Field
            icon="lock-closed-outline" placeholder="Re-enter your password"
            value={confirm} onChange={onConfirm}
            secure={!showCPw} toggle onToggle={() => setShowCPw(p => !p)}
            hasError={hasErr("confirmPassword")} isValid={isV("confirmPassword")} isFocused={isF("confirmPassword")}
            onFocus={() => setFocused("confirmPassword")} onBlur={() => setFocused(null)}
          />
          {errors.confirmPassword && <Text style={s.err}>{errors.confirmPassword}</Text>}
          {!errors.confirmPassword && isV("confirmPassword") && (
            <Text style={s.matchText}>✓ Passwords match</Text>
          )}

          {/* Terms */}
          <TouchableOpacity
            style={s.checkRow}
            onPress={() => { setAgreeToTerms(p => !p); setErrors(p => ({ ...p, terms: undefined })); }}
            activeOpacity={0.8}
          >
            <View style={[s.checkbox, agreeToTerms && s.checkboxOn]}>
              {agreeToTerms && <Ionicons name="checkmark" size={12} color="#fff" />}
            </View>
            <Text style={s.checkLabel}>
              I agree to the{" "}
              <Text style={s.checkLink}>Terms & Conditions</Text>
            </Text>
          </TouchableOpacity>
          {errors.terms && <Text style={s.err}>{errors.terms}</Text>}

          {/* CTA */}
          <TouchableOpacity
            style={[s.ctaBtn, loading && { opacity: 0.75 }]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.88}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : (
                <View style={s.ctaInner}>
                  <Text style={s.ctaText}>Create Account</Text>
                  <View style={s.ctaArrow}>
                    <Ionicons name="arrow-forward" size={16} color="#0078D7" />
                  </View>
                </View>
              )
            }
          </TouchableOpacity>

          {/* Sign in */}
          <View style={s.signinRow}>
            <Text style={s.signinLabel}>Already a member? </Text>
            <TouchableOpacity onPress={() => router.replace("/pages/loginMail")}>
              <Text style={s.signinLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  /* Hero */
  hero: {
    backgroundColor: "#0060B8",
    paddingHorizontal: 22,
    paddingBottom: 30,
    overflow: "hidden",
  },
  orb1: { position: "absolute", width: 260, height: 260, borderRadius: 130, backgroundColor: "rgba(255,255,255,0.05)", top: -80, right: -70 },
  orb2: { position: "absolute", width: 160, height: 160, borderRadius: 80, backgroundColor: "rgba(255,255,255,0.04)", bottom: -50, left: -60 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 22 },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center", alignItems: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
  },
  logoBox: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: "#fff",
    justifyContent: "center", alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 6, elevation: 4,
  },
  logo: { width: 28, height: 28 },
  brandName: { fontSize: 14, fontWeight: "800", color: "#fff" },
  brandTag: { fontSize: 10, color: "rgba(255,255,255,0.6)", fontWeight: "500", marginTop: 1 },
  heroHeading: { fontSize: 28, fontWeight: "900", color: "#fff", letterSpacing: -0.5, marginBottom: 6 },
  heroSub: { fontSize: 13, color: "rgba(255,255,255,0.65)" },

  /* White Form Card */
  formCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    // stretch to fill remaining space
    flexGrow: 1,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: "#E2E8F0",
    alignSelf: "center",
    marginBottom: 24,
  },

  /* Avatar */
  avatarRow: {
    flexDirection: "row", alignItems: "center", gap: 16,
    backgroundColor: "#F8FAFC",
    borderRadius: 16, padding: 16,
    marginBottom: 28,
    borderWidth: 1, borderColor: "#F1F5F9",
    position: "relative",
  },
  avatar: { width: 56, height: 56, borderRadius: 16, borderWidth: 2, borderColor: "#0078D7" },
  avatarPlaceholder: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: "#EBF5FF",
    justifyContent: "center", alignItems: "center",
    borderWidth: 1.5, borderColor: "#BFDBFE",
  },
  cameraBadge: {
    position: "absolute", left: 52, top: 44,
    width: 20, height: 20, borderRadius: 7,
    backgroundColor: "#0078D7",
    justifyContent: "center", alignItems: "center",
    borderWidth: 2, borderColor: "#fff",
  },
  avatarLabel: { fontSize: 15, fontWeight: "800", color: "#0F172A" },
  avatarSub: { fontSize: 12, color: "#94A3B8", marginTop: 3 },

  /* Section titles */
  sectionTitle: {
    fontSize: 12, fontWeight: "800", color: "#0078D7",
    textTransform: "uppercase", letterSpacing: 1,
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: "#EBF5FF",
  },

  /* Field labels */
  label: {
    fontSize: 12, fontWeight: "700", color: "#374151",
    marginBottom: 8, marginTop: 18,
  },
  req: { color: "#EF4444" },
  err: { fontSize: 12, color: "#EF4444", fontWeight: "600", marginTop: 5, marginLeft: 2 },

  /* Password strength */
  strengthRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  strengthBar: { flex: 1, height: 4, borderRadius: 2 },
  strengthLbl: { fontSize: 11, fontWeight: "700", minWidth: 38 },
  matchText: { fontSize: 12, color: "#10B981", fontWeight: "700", marginTop: 6, marginLeft: 2 },

  /* Terms */
  checkRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 24, marginBottom: 8 },
  checkbox: {
    width: 22, height: 22, borderRadius: 7,
    borderWidth: 2, borderColor: "#CBD5E1",
    justifyContent: "center", alignItems: "center",
  },
  checkboxOn: { backgroundColor: "#0078D7", borderColor: "#0078D7" },
  checkLabel: { flex: 1, fontSize: 13, color: "#64748B", lineHeight: 20 },
  checkLink: { color: "#0078D7", fontWeight: "700", textDecorationLine: "underline" },

  /* CTA */
  ctaBtn: {
    backgroundColor: "#0078D7",
    borderRadius: 16, height: 56,
    justifyContent: "center", alignItems: "center",
    marginTop: 20, marginBottom: 20,
    shadowColor: "#0060B8",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 10,
  },
  ctaInner: { flexDirection: "row", alignItems: "center", gap: 14 },
  ctaText: { fontSize: 16, fontWeight: "800", color: "#fff", letterSpacing: 0.3 },
  ctaArrow: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: "#fff",
    justifyContent: "center", alignItems: "center",
  },

  signinRow: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  signinLabel: { fontSize: 14, color: "#94A3B8" },
  signinLink: { fontSize: 14, fontWeight: "800", color: "#0078D7" },
});

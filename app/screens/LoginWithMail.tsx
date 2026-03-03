import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Constants from "expo-constants";
import { router } from "expo-router";
import { useRef, useState } from "react";
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
interface FieldErrors { email?: string; password?: string }

export default function LoginScreenMail() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [emailFocused, setEmailFocused] = useState(false);
  const [pwFocused, setPwFocused] = useState(false);
  const pwRef = useRef<TextInput>(null);

  const clearError = (f: keyof FieldErrors) => {
    if (errors[f]) setErrors(p => ({ ...p, [f]: undefined }));
  };

  const validate = (): boolean => {
    const e: FieldErrors = {};
    if (!email.trim()) e.email = "Email is required";
    else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim()))
      e.email = "Enter a valid email address";
    if (!password) e.password = "Password is required";
    else if (password.length < 8) e.password = "At least 8 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    if (!agreeToTerms) {
      Alert.alert("Terms Required", "Please agree to Terms & Conditions.");
      return;
    }
    try {
      setLoading(true);
      const res = await axios.post(`${API_URL}/user/login`, {
        email: email.trim(), password: password.trim(),
      });
      if (res.data.token) {
        await AsyncStorage.setItem("token", res.data.token);
        router.replace("/(tabs)");
      } else {
        Alert.alert("Login Failed", "Invalid email or password");
      }
    } catch (error: any) {
      if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
        Alert.alert("Cannot Reach Server", `Check your network.\n\nURL: ${API_URL}`);
        return;
      }
      const msg: string = error.response?.data?.error ?? "";
      const code: number = error.response?.status ?? 0;
      if (code === 401 || msg.toLowerCase().includes("invalid") || msg.toLowerCase().includes("password")) {
        setErrors({ email: " ", password: "Incorrect email or password" });
      } else if (msg.toLowerCase().includes("email")) {
        setErrors({ email: "No account found with this email" });
      } else {
        Alert.alert("Login Failed", msg || `Error ${code || "unknown"}`);
      }
    } finally { setLoading(false); }
  };

  const emailOk = email.trim() && !errors.email?.trim();
  const emailErr = !!errors.email?.trim();
  const pwErr = !!errors.password;

  return (
    // Root stays white — no black gap ever
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <StatusBar barStyle="light-content" backgroundColor="#0060B8" />

      {/*
       * Same approach as Register: whole page (hero + form) inside
       * KeyboardAwareScrollView so the hero scrolls up when keyboard opens.
       * This also prevents any black-bottom gap on navigation back.
       */}
      <KeyboardAwareScrollView
        style={{ flex: 1, backgroundColor: "#0060B8" }}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        enableAutomaticScroll={true}
        extraScrollHeight={Platform.OS === "ios" ? 30 : 60}
        bounces={false}
      >
        {/* ── Compact Blue Hero ── */}
        <View style={[s.hero, { paddingTop: insets.top + 12 }]}>
          <View style={s.orb1} />
          <View style={s.orb2} />

          {/* Logo + Brand */}
          <View style={s.brandRow}>
            <View style={s.logoBox}>
              <Image
                source={require("../../assets/images/icon.png")}
                style={s.logo}
                resizeMode="contain"
              />
            </View>
            <View>
              <Text style={s.brandName}>South Canara Agro Mart</Text>
              <Text style={s.brandTag}>B2B Dry Fruits Marketplace</Text>
            </View>
          </View>

          <Text style={s.heroHeading}>Welcome Back 👋</Text>
          <Text style={s.heroSub}>Sign in to access your marketplace</Text>
        </View>

        {/* ── White Form Card (flexGrow fills rest of screen) ── */}
        <View style={[s.formCard, { paddingBottom: insets.bottom + 28 }]}>
          <View style={s.handle} />

          {/* Email */}
          <Text style={s.label}>Email Address</Text>
          <View style={[
            s.inputRow,
            emailFocused && s.inputFocused,
            emailErr && s.inputError,
            emailOk && s.inputValid,
          ]}>
            <View style={[s.iconBox, emailFocused && s.iconBoxActive]}>
              <Ionicons
                name="mail-outline" size={16}
                color={emailErr ? "#EF4444" : emailFocused ? "#0078D7" : "#94A3B8"}
              />
            </View>
            <TextInput
              style={s.input}
              placeholder="you@example.com"
              placeholderTextColor="#CBD5E1"
              value={email}
              onChangeText={v => { setEmail(v); clearError("email"); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              onSubmitEditing={() => pwRef.current?.focus()}
            />
            {emailOk && <Ionicons name="checkmark-circle" size={18} color="#10B981" />}
            {emailErr && <Ionicons name="alert-circle" size={18} color="#EF4444" />}
          </View>
          {emailErr && <Text style={s.err}>{errors.email}</Text>}

          {/* Password */}
          <View style={s.labelRow}>
            <Text style={s.label}>Password</Text>
            <TouchableOpacity onPress={() => router.push("/screens/ForgotPasswordScreen" as any)}>
              <Text style={s.forgot}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>
          <View style={[
            s.inputRow,
            pwFocused && s.inputFocused,
            pwErr && s.inputError,
          ]}>
            <View style={[s.iconBox, pwFocused && s.iconBoxActive]}>
              <Ionicons
                name="lock-closed-outline" size={16}
                color={pwErr ? "#EF4444" : pwFocused ? "#0078D7" : "#94A3B8"}
              />
            </View>
            <TextInput
              ref={pwRef}
              style={s.input}
              placeholder="Min 8 characters"
              placeholderTextColor="#CBD5E1"
              value={password}
              onChangeText={v => { setPassword(v); clearError("password"); }}
              secureTextEntry={!showPw}
              autoCapitalize="none"
              returnKeyType="done"
              onFocus={() => setPwFocused(true)}
              onBlur={() => setPwFocused(false)}
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity onPress={() => setShowPw(p => !p)} style={{ padding: 4 }}>
              <Ionicons
                name={showPw ? "eye-outline" : "eye-off-outline"}
                size={18} color="#94A3B8"
              />
            </TouchableOpacity>
          </View>
          {pwErr && <Text style={s.err}>{errors.password}</Text>}

          {/* Terms */}
          <TouchableOpacity
            style={s.checkRow}
            onPress={() => setAgreeToTerms(p => !p)}
            activeOpacity={0.8}
          >
            <View style={[s.checkbox, agreeToTerms && s.checkboxOn]}>
              {agreeToTerms && <Ionicons name="checkmark" size={12} color="#fff" />}
            </View>
            <Text style={s.checkLabel}>
              I agree to the <Text style={s.checkLink}>Terms & Conditions</Text>
            </Text>
          </TouchableOpacity>

          {/* Sign In CTA */}
          <TouchableOpacity
            style={[s.ctaBtn, (!agreeToTerms || loading) && s.ctaDisabled]}
            onPress={handleLogin}
            disabled={!agreeToTerms || loading}
            activeOpacity={0.88}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : (
                <View style={s.ctaInner}>
                  <Text style={s.ctaText}>Sign In</Text>
                  <View style={s.ctaArrow}>
                    <Ionicons name="arrow-forward" size={16} color="#0078D7" />
                  </View>
                </View>
              )
            }
          </TouchableOpacity>

          {/* Divider */}
          <View style={s.divider}>
            <View style={s.divLine} />
            <Text style={s.divText}>New to Agro Mart?</Text>
            <View style={s.divLine} />
          </View>

          {/* Create Account */}
          <TouchableOpacity
            style={s.outlineBtn}
            onPress={() => router.push("/screens/RegisterScreen")}
            activeOpacity={0.85}
          >
            <Ionicons name="person-add-outline" size={17} color="#0078D7" />
            <Text style={s.outlineBtnText}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    // Blue background shows behind the white card's rounded corners
    // — this is what creates the curved header effect (same as Register)
    backgroundColor: "#0060B8",
  },

  /* Hero */
  hero: {
    backgroundColor: "#0060B8",
    paddingHorizontal: 22,
    paddingBottom: 44,
    overflow: "hidden",
  },
  orb1: {
    position: "absolute", width: 280, height: 280, borderRadius: 140,
    backgroundColor: "rgba(255,255,255,0.05)", top: -90, right: -70,
  },
  orb2: {
    position: "absolute", width: 170, height: 170, borderRadius: 85,
    backgroundColor: "rgba(255,255,255,0.04)", bottom: -50, left: -50,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 24 },
  logoBox: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: "#fff",
    justifyContent: "center", alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 5,
  },
  logo: { width: 32, height: 32 },
  brandName: { fontSize: 15, fontWeight: "800", color: "#fff", letterSpacing: -0.1 },
  brandTag: { fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: "500", marginTop: 1 },
  heroHeading: { fontSize: 28, fontWeight: "900", color: "#fff", letterSpacing: -0.5, marginBottom: 6 },
  heroSub: { fontSize: 13, color: "rgba(255,255,255,0.65)" },

  /* Form card */
  formCard: {
    flexGrow: 1,           // stretches to fill all space below hero
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: "#E2E8F0",
    alignSelf: "center", marginBottom: 28,
  },

  /* Fields */
  label: {
    fontSize: 12, fontWeight: "700", color: "#374151",
    marginBottom: 8, marginTop: 10,
  },
  labelRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8, marginTop: 10,
  },
  forgot: { fontSize: 13, fontWeight: "700", color: "#0078D7" },
  inputRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#F8FAFC", borderRadius: 14,
    borderWidth: 1.5, borderColor: "#E2E8F0",
    paddingHorizontal: 12, height: 54,
  },
  inputFocused: { borderColor: "#0078D7", backgroundColor: "#EFF6FF" },
  inputError: { borderColor: "#EF4444", backgroundColor: "#FFF5F5" },
  inputValid: { borderColor: "#10B981", backgroundColor: "#F0FFF4" },
  iconBox: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: "#F1F5F9",
    justifyContent: "center", alignItems: "center",
  },
  iconBoxActive: { backgroundColor: "#DBEAFE" },
  input: { flex: 1, fontSize: 15, color: "#0F172A", fontWeight: "500" },
  err: { fontSize: 12, color: "#EF4444", fontWeight: "600", marginTop: 5, marginLeft: 2 },

  /* Terms */
  checkRow: {
    flexDirection: "row", alignItems: "center",
    gap: 12, marginTop: 20, marginBottom: 22,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 7,
    borderWidth: 2, borderColor: "#CBD5E1",
    justifyContent: "center", alignItems: "center",
  },
  checkboxOn: { backgroundColor: "#0078D7", borderColor: "#0078D7" },
  checkLabel: { flex: 1, fontSize: 13, color: "#64748B" },
  checkLink: { color: "#0078D7", fontWeight: "700" },

  /* CTA */
  ctaBtn: {
    backgroundColor: "#0078D7",
    borderRadius: 16, height: 56,
    justifyContent: "center", alignItems: "center",
    marginBottom: 24,
    shadowColor: "#0060B8",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 10,
  },
  ctaDisabled: { backgroundColor: "#94A3B8", shadowOpacity: 0 },
  ctaInner: { flexDirection: "row", alignItems: "center", gap: 14 },
  ctaText: { fontSize: 16, fontWeight: "800", color: "#fff", letterSpacing: 0.3 },
  ctaArrow: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: "#fff",
    justifyContent: "center", alignItems: "center",
  },

  /* Divider */
  divider: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  divLine: { flex: 1, height: 1, backgroundColor: "#F1F5F9" },
  divText: { fontSize: 12, color: "#94A3B8", fontWeight: "600" },

  /* Outline button */
  outlineBtn: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 8,
    height: 52, borderRadius: 16,
    borderWidth: 1.5, borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
  },
  outlineBtnText: { fontSize: 15, fontWeight: "800", color: "#0078D7" },
});

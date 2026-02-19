import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";

const API_URL = "http://192.168.1.4:8080";

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PASSWORD_REGEX = /^[A-Za-z\d@$!%*?&]{8,}$/;
const PHONE_REGEX = /^\d{7,15}$/;

interface FieldErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
}

type FieldName = keyof FieldErrors;

const RegisterScreen: React.FC = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [validFields, setValidFields] = useState<Set<FieldName>>(new Set());

  // --- Live field validation ---
  const markValid = (field: FieldName) => {
    setValidFields((prev) => {
      const next = new Set(prev);
      next.add(field);
      return next;
    });
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const markInvalid = (field: FieldName, msg?: string) => {
    setValidFields((prev) => {
      const next = new Set(prev);
      next.delete(field);
      return next;
    });
    if (msg) setErrors((prev) => ({ ...prev, [field]: msg }));
    else setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const onFirstNameChange = (v: string) => {
    setFirstName(v);
    if (v.trim().length > 0) markValid("firstName");
    else markInvalid("firstName");
  };

  const onEmailChange = (v: string) => {
    setEmail(v);
    if (EMAIL_REGEX.test(v.trim())) {
      markValid("email");
    } else {
      markInvalid("email", v.trim().length > 3 ? "Enter a valid email address" : undefined);
    }
  };

  const onPhoneChange = (v: string) => {
    setPhone(v);
    if (PHONE_REGEX.test(v.trim())) {
      markValid("phone");
    } else {
      markInvalid("phone", v.trim().length > 3 ? "Phone must be 7–15 digits, numbers only" : undefined);
    }
  };

  const onPasswordChange = (v: string) => {
    setPassword(v);
    if (PASSWORD_REGEX.test(v)) {
      markValid("password");
    } else {
      markInvalid("password", v.length > 2 ? "Min 8 chars — letters, digits or @$!%*?&" : undefined);
    }
    // Recheck confirm
    if (confirmPassword.length > 0) {
      if (v === confirmPassword) markValid("confirmPassword");
      else markInvalid("confirmPassword", "Passwords do not match");
    }
  };

  const onConfirmPasswordChange = (v: string) => {
    setConfirmPassword(v);
    if (v.length === 0) {
      markInvalid("confirmPassword");
      return;
    }
    if (v === password) markValid("confirmPassword");
    else markInvalid("confirmPassword", "Passwords do not match");
  };

  // Password strength: 0-3
  const getPasswordStrength = (): number => {
    if (password.length === 0) return 0;
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password) || /[@$!%*?&]/.test(password)) score++;
    return score;
  };

  const strengthColors = ["#E0E0E0", "#E53E3E", "#FFA500", "#28A745"];
  const strengthLabels = ["", "Weak", "Fair", "Strong"];
  const pwStrength = getPasswordStrength();

  // --- Full validation on submit ---
  const validate = (): boolean => {
    const newErrors: FieldErrors = {};
    if (!firstName.trim()) newErrors.firstName = "First name is required";
    if (!EMAIL_REGEX.test(email.trim())) newErrors.email = "Enter a valid email address";
    if (!PHONE_REGEX.test(phone.trim())) newErrors.phone = "Phone must be 7–15 digits, numbers only";
    if (!PASSWORD_REGEX.test(password)) newErrors.password = "Min 8 chars — letters, digits or @$!%*?&";
    if (!confirmPassword) newErrors.confirmPassword = "Please confirm your password";
    else if (password !== confirmPassword) newErrors.confirmPassword = "Passwords do not match";
    if (!agreeToTerms) newErrors.terms = "You must agree to the terms and conditions";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission required", "Please allow access to your photo library.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const uploadProfileImage = async (userId: string, imageUri: string) => {
    const presignedRes = await axios.get(`${API_URL}/user/get/presigned/${userId}`);
    const uploadUrl: string = presignedRes.data.data.url;
    const imageResponse = await fetch(imageUri);
    const blob = await imageResponse.blob();
    await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "image/jpeg" },
      body: blob,
    });
    await axios.put(`${API_URL}/user/update/image/${userId}`);
  };

  const handleRegister = async () => {
    if (!validate()) return;

    const body: Record<string, string> = {
      first_name: firstName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      password,
    };
    if (lastName.trim()) body.last_name = lastName.trim();

    try {
      setLoading(true);
      const res = await axios.post(`${API_URL}/user/create`, body);

      const userId: string = res.data.user_id;

      if (profileImage && userId) {
        try {
          await uploadProfileImage(userId, profileImage);
        } catch (imgErr) {
          console.warn("Profile image upload failed:", imgErr);
        }
      }

      Alert.alert(
        "Success",
        res.data.message || "Account created successfully!",
        [{ text: "Login", onPress: () => router.replace("/pages/loginMail") }]
      );
    } catch (error: any) {
      if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
        Alert.alert("Cannot Reach Server", `Check WiFi and server.\n\nURL: ${API_URL}`);
        return;
      }
      const serverMessage: string = error.response?.data?.error ?? "";
      const statusCode: number = error.response?.status ?? 0;

      if (serverMessage.toLowerCase().includes("email")) {
        setErrors((prev) => ({ ...prev, email: "This email is already registered" }));
      } else if (serverMessage.toLowerCase().includes("phone")) {
        setErrors((prev) => ({ ...prev, phone: "This phone number is already in use" }));
      } else if (statusCode === 409) {
        Alert.alert("Already Registered", "An account with these details already exists.");
      } else if (statusCode === 500) {
        Alert.alert("Server Error", "Server error. Please try again later.");
      } else {
        Alert.alert("Registration Failed", serverMessage || `Error ${statusCode || "unknown"}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const fieldBorderColor = (field: FieldName) => {
    if (errors[field]) return "#E53E3E";
    if (validFields.has(field)) return "#28A745";
    return "transparent";
  };

  const fieldBgColor = (field: FieldName) => {
    if (errors[field]) return "#FFF5F5";
    if (validFields.has(field)) return "#F0FFF4";
    return "#F5F5F5";
  };

  const fieldIconColor = (field: FieldName, defaultColor = "#999") => {
    if (errors[field]) return "#E53E3E";
    if (validFields.has(field)) return "#28A745";
    return defaultColor;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        enableAutomaticScroll={true}
        extraScrollHeight={Platform.OS === "ios" ? 20 : 80}
        extraHeight={Platform.OS === "ios" ? 20 : 80}
        bounces={false}
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require("../../assets/images/Small Logo.png")}
            resizeMode="contain"
            style={styles.logo}
          />
        </View>

        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Enter your details below to create your Agromart account
          </Text>
        </View>

        {/* Profile Image Picker */}
        <View style={styles.avatarSection}>
          <TouchableOpacity style={styles.avatarWrapper} onPress={handlePickImage} activeOpacity={0.8}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person-outline" size={30} color="#999" />
              </View>
            )}
            <View style={styles.avatarBadge}>
              <Ionicons name="camera" size={12} color="#FFF" />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Profile photo (optional)</Text>
        </View>

        {/* First Name */}
        <View style={[styles.inputContainer, { borderColor: fieldBorderColor("firstName"), backgroundColor: fieldBgColor("firstName") }]}>
          <View style={styles.inputIconContainer}>
            <Ionicons name="person-outline" size={20} color={fieldIconColor("firstName")} />
          </View>
          <TextInput
            style={styles.input}
            placeholder="First Name *"
            placeholderTextColor="#999"
            value={firstName}
            onChangeText={onFirstNameChange}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="next"
          />
          {validFields.has("firstName") && (
            <Ionicons name="checkmark-circle" size={18} color="#28A745" style={styles.statusIcon} />
          )}
          {errors.firstName && (
            <Ionicons name="alert-circle" size={18} color="#E53E3E" style={styles.statusIcon} />
          )}
        </View>
        {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}

        {/* Last Name */}
        <View style={[styles.inputContainer, { borderColor: "transparent", backgroundColor: "#F5F5F5" }]}>
          <View style={styles.inputIconContainer}>
            <Ionicons name="person-outline" size={20} color="#999" />
          </View>
          <TextInput
            style={styles.input}
            placeholder="Last Name (optional)"
            placeholderTextColor="#999"
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="next"
          />
        </View>

        {/* Email */}
        <View style={[styles.inputContainer, { borderColor: fieldBorderColor("email"), backgroundColor: fieldBgColor("email") }]}>
          <View style={styles.inputIconContainer}>
            <Ionicons name="mail-outline" size={20} color={fieldIconColor("email")} />
          </View>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#999"
            value={email}
            onChangeText={onEmailChange}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            returnKeyType="next"
          />
          {validFields.has("email") && (
            <Ionicons name="checkmark-circle" size={18} color="#28A745" style={styles.statusIcon} />
          )}
          {errors.email && (
            <Ionicons name="alert-circle" size={18} color="#E53E3E" style={styles.statusIcon} />
          )}
        </View>
        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

        {/* Phone */}
        <View style={[styles.inputContainer, { borderColor: fieldBorderColor("phone"), backgroundColor: fieldBgColor("phone") }]}>
          <View style={styles.inputIconContainer}>
            <Ionicons name="call-outline" size={20} color={fieldIconColor("phone")} />
          </View>
          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            placeholderTextColor="#999"
            value={phone}
            onChangeText={onPhoneChange}
            keyboardType="phone-pad"
            maxLength={15}
            returnKeyType="next"
          />
          {validFields.has("phone") && (
            <Ionicons name="checkmark-circle" size={18} color="#28A745" style={styles.statusIcon} />
          )}
          {errors.phone && (
            <Ionicons name="alert-circle" size={18} color="#E53E3E" style={styles.statusIcon} />
          )}
        </View>
        {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}

        {/* Password */}
        <View style={[styles.inputContainer, { borderColor: fieldBorderColor("password"), backgroundColor: fieldBgColor("password") }]}>
          <View style={styles.inputIconContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={fieldIconColor("password")} />
          </View>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            placeholder="Password (min 8 characters)"
            placeholderTextColor="#999"
            value={password}
            onChangeText={onPasswordChange}
            secureTextEntry={!isPasswordVisible}
            autoCapitalize="none"
            returnKeyType="next"
          />
          <TouchableOpacity style={styles.eyeIcon} onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
            <Ionicons
              name={isPasswordVisible ? "eye-outline" : "eye-off-outline"}
              size={20}
              color={fieldIconColor("password")}
            />
          </TouchableOpacity>
        </View>
        {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

        {/* Password strength meter */}
        {password.length > 0 && (
          <View style={styles.strengthContainer}>
            <View style={styles.strengthBars}>
              {[1, 2, 3].map((level) => (
                <View
                  key={level}
                  style={[
                    styles.strengthBar,
                    { backgroundColor: pwStrength >= level ? strengthColors[pwStrength] : "#E0E0E0" },
                  ]}
                />
              ))}
            </View>
            {pwStrength > 0 && (
              <Text style={[styles.strengthLabel, { color: strengthColors[pwStrength] }]}>
                {strengthLabels[pwStrength]}
              </Text>
            )}
          </View>
        )}

        {/* Confirm Password */}
        <View style={[styles.inputContainer, { borderColor: fieldBorderColor("confirmPassword"), backgroundColor: fieldBgColor("confirmPassword") }]}>
          <View style={styles.inputIconContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={fieldIconColor("confirmPassword")} />
          </View>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            placeholder="Confirm Password"
            placeholderTextColor="#999"
            value={confirmPassword}
            onChangeText={onConfirmPasswordChange}
            secureTextEntry={!isConfirmPasswordVisible}
            autoCapitalize="none"
            returnKeyType="done"
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)}
          >
            <Ionicons
              name={isConfirmPasswordVisible ? "eye-outline" : "eye-off-outline"}
              size={20}
              color={fieldIconColor("confirmPassword")}
            />
          </TouchableOpacity>
        </View>
        {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
        {!errors.confirmPassword && validFields.has("confirmPassword") && (
          <Text style={styles.matchText}>Passwords match</Text>
        )}

        {/* Terms */}
        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => {
            setAgreeToTerms(!agreeToTerms);
            setErrors((prev) => ({ ...prev, terms: undefined }));
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, agreeToTerms && styles.checkboxChecked, !!errors.terms && styles.checkboxErrorBorder]}>
            {agreeToTerms && <Ionicons name="checkmark" size={14} color="#FFF" />}
          </View>
          <Text style={styles.checkboxLabel}>
            I agree to all the{" "}
            <Text style={styles.termsLink}>terms & conditions</Text>
            {" "}mentioned while using this.
          </Text>
        </TouchableOpacity>
        {errors.terms && <Text style={[styles.errorText, styles.termsError]}>{errors.terms}</Text>}

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleRegister}
          activeOpacity={0.8}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>Create Account</Text>
          )}
        </TouchableOpacity>

        {/* Login Link */}
        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.replace("/pages/loginMail")}>
            <Text style={styles.loginLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 60,
  },
  logoContainer: { marginBottom: 32 },
  logo: { width: 56, height: 56 },
  titleContainer: { marginBottom: 28 },
  title: { fontSize: 28, fontWeight: "700", color: "#000", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#666", lineHeight: 20 },
  avatarSection: { alignItems: "center", marginBottom: 28 },
  avatarWrapper: { position: "relative", marginBottom: 8 },
  avatarImage: { width: 86, height: 86, borderRadius: 43 },
  avatarPlaceholder: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#0078D7",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  avatarHint: { fontSize: 12, color: "#999" },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    marginBottom: 4,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1.5,
  },
  inputIconContainer: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: "#000" },
  passwordInput: { paddingRight: 40 },
  eyeIcon: { position: "absolute", right: 16, padding: 4 },
  statusIcon: { marginLeft: 4 },
  errorText: {
    fontSize: 12,
    color: "#E53E3E",
    marginBottom: 12,
    marginLeft: 4,
  },
  matchText: {
    fontSize: 12,
    color: "#28A745",
    marginBottom: 12,
    marginLeft: 4,
  },
  strengthContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    marginTop: -2,
    gap: 8,
  },
  strengthBars: { flexDirection: "row", gap: 6, flex: 1 },
  strengthBar: { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: { fontSize: 12, fontWeight: "600", minWidth: 40 },
  termsError: { marginTop: -4, marginBottom: 16 },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
    marginTop: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#DDD",
    marginRight: 10,
    marginTop: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: { backgroundColor: "#0078D7", borderColor: "#0078D7" },
  checkboxErrorBorder: { borderColor: "#E53E3E" },
  checkboxLabel: { flex: 1, fontSize: 13, color: "#999", lineHeight: 20 },
  termsLink: { color: "#0078D7", textDecorationLine: "underline" },
  submitButton: {
    backgroundColor: "#0078D7",
    borderRadius: 12,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
    marginTop: 8,
    shadowColor: "#0078D7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  submitButtonDisabled: {
    backgroundColor: "#B0C4DE",
    shadowOpacity: 0.1,
    elevation: 0,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  loginText: { fontSize: 14, color: "#666" },
  loginLink: { fontSize: 14, color: "#0078D7", fontWeight: "600" },
});

export default RegisterScreen;

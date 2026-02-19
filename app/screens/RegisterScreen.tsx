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

// ⚠️ For physical device use your machine's local IP, NOT localhost
// localhost only works on iOS Simulator, NOT on real Android/iOS devices
// Find your IP: run `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
// Example: "http://192.168.1.10:8080"
const API_URL = "http://192.168.1.4:8080";

interface FieldErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
}

const RegisterScreen: React.FC = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
    useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const clearError = (field: keyof FieldErrors) => {
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: FieldErrors = {};

    if (!firstName.trim()) {
      newErrors.firstName = "First name is required";
    }
    if (email.trim() === "") {
      newErrors.email = "Email is required";
    } else if (
      !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim())
    ) {
      newErrors.email = "Enter a valid email address";
    }
    if (phone.trim() === "") {
      newErrors.phone = "Phone number is required";
    } else if (!/^\d{7,15}$/.test(phone.trim())) {
      newErrors.phone = "Phone must be 7–15 digits, numbers only";
    }
    if (password === "") {
      newErrors.password = "Password is required";
    } else if (!/^[A-Za-z\d@$!%*?&]{8,}$/.test(password)) {
      newErrors.password = "Min 8 characters — letters, digits or @$!%*?&";
    }
    if (confirmPassword === "") {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    if (!agreeToTerms) {
      newErrors.terms = "You must agree to the terms and conditions";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission required",
        "Please allow access to your photo library.",
      );
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
    const presignedRes = await axios.get(
      `${API_URL}/user/get/presigned/${userId}`,
    );
    const uploadUrl: string = presignedRes.data.url;
    const imageResponse = await fetch(imageUri);
    const blob = await imageResponse.blob();
    await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "image/png" },
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
    if (lastName.trim()) {
      body.last_name = lastName.trim();
    }

    // 🔍 Log what we're sending — check Expo terminal output
    console.log("=== REGISTER REQUEST ===");
    console.log("URL:", `${API_URL}/user/create`);
    console.log("Body:", JSON.stringify(body, null, 2));

    try {
      setLoading(true);
      const res = await axios.post(`${API_URL}/user/create`, body);

      console.log("=== REGISTER SUCCESS ===");
      console.log("Status:", res.status);
      console.log("Response:", JSON.stringify(res.data, null, 2));

      const userId: string = res.data.id;

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
        [{ text: "Login", onPress: () => router.replace("/pages/loginMail") }],
      );
    } catch (error: any) {
      // 🔍 Log full error details
      console.log("=== REGISTER ERROR ===");
      console.log("Error message:", error.message);
      console.log("Error code:", error.code);
      console.log("Response status:", error.response?.status);
      console.log(
        "Response data:",
        JSON.stringify(error.response?.data, null, 2),
      );
      console.log("Request URL:", error.config?.url);
      console.log("Is network error:", error.code === "ERR_NETWORK");

      // Network error — can't reach server at all
      if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
        Alert.alert(
          "Cannot Reach Server",
          `Make sure:\n\n1. Your Go server is running\n2. Your phone and server are on the same WiFi\n3. API_URL is set to your machine's local IP (not localhost)\n\nCurrent URL: ${API_URL}`,
        );
        return;
      }

      const serverMessage: string = error.response?.data?.error ?? "";
      const statusCode: number = error.response?.status ?? 0;

      // Map specific backend errors to fields
      if (serverMessage.toLowerCase().includes("email")) {
        setErrors((prev) => ({
          ...prev,
          email: "This email is already registered",
        }));
      } else if (serverMessage.toLowerCase().includes("phone")) {
        setErrors((prev) => ({
          ...prev,
          phone: "This phone number is already in use",
        }));
      } else if (serverMessage.toLowerCase().includes("password")) {
        setErrors((prev) => ({ ...prev, password: serverMessage }));
      } else if (statusCode === 400) {
        Alert.alert(
          "Invalid Data",
          serverMessage || "Please check your inputs and try again.",
        );
      } else if (statusCode === 409) {
        Alert.alert(
          "Already Registered",
          "An account with these details already exists.",
        );
      } else if (statusCode === 500) {
        Alert.alert(
          "Server Error",
          "The server encountered an error. Please try again later.",
        );
      } else {
        Alert.alert(
          "Registration Failed",
          serverMessage ||
            `Error ${statusCode || "unknown"} — check console for details`,
        );
      }
    } finally {
      setLoading(false);
    }
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
          <TouchableOpacity
            style={styles.avatarWrapper}
            onPress={handlePickImage}
            activeOpacity={0.8}
          >
            {profileImage ? (
              <Image
                source={{ uri: profileImage }}
                style={styles.avatarImage}
              />
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
        <View
          style={[styles.inputContainer, errors.firstName && styles.inputError]}
        >
          <View style={styles.inputIconContainer}>
            <Ionicons
              name="person-outline"
              size={20}
              color={errors.firstName ? "#E53E3E" : "#999"}
            />
          </View>
          <TextInput
            style={styles.input}
            placeholder="First Name *"
            placeholderTextColor="#999"
            value={firstName}
            onChangeText={(v) => {
              setFirstName(v);
              clearError("firstName");
            }}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="next"
          />
          {errors.firstName && (
            <Ionicons
              name="alert-circle"
              size={18}
              color="#E53E3E"
              style={styles.errorIcon}
            />
          )}
        </View>
        {errors.firstName && (
          <Text style={styles.errorText}>{errors.firstName}</Text>
        )}

        {/* Last Name */}
        <View style={styles.inputContainer}>
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
        <View
          style={[styles.inputContainer, errors.email && styles.inputError]}
        >
          <View style={styles.inputIconContainer}>
            <Ionicons
              name="mail-outline"
              size={20}
              color={errors.email ? "#E53E3E" : "#999"}
            />
          </View>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#999"
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              clearError("email");
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            returnKeyType="next"
          />
          {errors.email && (
            <Ionicons
              name="alert-circle"
              size={18}
              color="#E53E3E"
              style={styles.errorIcon}
            />
          )}
        </View>
        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

        {/* Phone */}
        <View
          style={[styles.inputContainer, errors.phone && styles.inputError]}
        >
          <View style={styles.inputIconContainer}>
            <Ionicons
              name="call-outline"
              size={20}
              color={errors.phone ? "#E53E3E" : "#999"}
            />
          </View>
          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            placeholderTextColor="#999"
            value={phone}
            onChangeText={(v) => {
              setPhone(v);
              clearError("phone");
            }}
            keyboardType="phone-pad"
            maxLength={15}
            returnKeyType="next"
          />
          {errors.phone && (
            <Ionicons
              name="alert-circle"
              size={18}
              color="#E53E3E"
              style={styles.errorIcon}
            />
          )}
        </View>
        {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}

        {/* Password */}
        <View
          style={[styles.inputContainer, errors.password && styles.inputError]}
        >
          <View style={styles.inputIconContainer}>
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color={errors.password ? "#E53E3E" : "#999"}
            />
          </View>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            placeholder="Password (min 8 characters)"
            placeholderTextColor="#999"
            value={password}
            onChangeText={(v) => {
              setPassword(v);
              clearError("password");
            }}
            secureTextEntry={!isPasswordVisible}
            autoCapitalize="none"
            returnKeyType="next"
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
          >
            <Ionicons
              name={isPasswordVisible ? "eye-outline" : "eye-off-outline"}
              size={20}
              color="#999"
            />
          </TouchableOpacity>
        </View>
        {errors.password && (
          <Text style={styles.errorText}>{errors.password}</Text>
        )}

        {/* Confirm Password */}
        <View
          style={[
            styles.inputContainer,
            errors.confirmPassword && styles.inputError,
          ]}
        >
          <View style={styles.inputIconContainer}>
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color={errors.confirmPassword ? "#E53E3E" : "#999"}
            />
          </View>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            placeholder="Confirm Password"
            placeholderTextColor="#999"
            value={confirmPassword}
            onChangeText={(v) => {
              setConfirmPassword(v);
              clearError("confirmPassword");
            }}
            secureTextEntry={!isConfirmPasswordVisible}
            autoCapitalize="none"
            returnKeyType="done"
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() =>
              setIsConfirmPasswordVisible(!isConfirmPasswordVisible)
            }
          >
            <Ionicons
              name={
                isConfirmPasswordVisible ? "eye-outline" : "eye-off-outline"
              }
              size={20}
              color="#999"
            />
          </TouchableOpacity>
        </View>
        {errors.confirmPassword && (
          <Text style={styles.errorText}>{errors.confirmPassword}</Text>
        )}

        {/* Terms */}
        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => {
            setAgreeToTerms(!agreeToTerms);
            clearError("terms");
          }}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.checkbox,
              agreeToTerms && styles.checkboxChecked,
              !!errors.terms && styles.checkboxErrorBorder,
            ]}
          >
            {agreeToTerms && (
              <Ionicons name="checkmark" size={14} color="#FFF" />
            )}
          </View>
          <Text style={styles.checkboxLabel}>
            I agree to all the terms and conditions mentioned while using this.{" "}
            <Text style={styles.termsLink}>terms&conditions</Text>
          </Text>
        </TouchableOpacity>
        {errors.terms && (
          <Text style={[styles.errorText, styles.termsError]}>
            {errors.terms}
          </Text>
        )}

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
          <TouchableOpacity onPress={() => router.replace("/pages/login")}>
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
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    marginBottom: 4,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  inputError: { borderColor: "#E53E3E", backgroundColor: "#FFF5F5" },
  inputIconContainer: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: "#000" },
  passwordInput: { paddingRight: 40 },
  eyeIcon: { position: "absolute", right: 16, padding: 4 },
  errorIcon: { marginLeft: 4 },
  errorText: {
    fontSize: 12,
    color: "#E53E3E",
    marginBottom: 12,
    marginLeft: 4,
  },
  termsError: { marginTop: -4, marginBottom: 16 },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
    marginTop: 4,
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

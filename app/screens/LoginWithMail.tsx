import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Constants from "expo-constants";

const API_URL = Constants.expoConfig?.extra?.API_URL;

interface FieldErrors {
  email?: string;
  password?: string;
}

const LoginScreenMail: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const clearError = (field: keyof FieldErrors) => {
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: FieldErrors = {};

    if (email.trim() === "") {
      newErrors.email = "Email is required";
    } else if (
      !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim())
    ) {
      newErrors.email = "Enter a valid email address";
    }

    if (password === "") {
      newErrors.password = "Password is required";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    if (!agreeToTerms) {
      Alert.alert("Error", "Please agree to the terms and conditions");
      return;
    }

    console.log("=== LOGIN REQUEST ===");
    console.log("URL:", `${API_URL}/user/login`);
    console.log("Email:", email.trim());

    try {
      setLoading(true);
      const res = await axios.post(`${API_URL}/user/login`, {
        email: email.trim(),
        password: password.trim(),
      });

      console.log("=== LOGIN SUCCESS ===");
      console.log("Response:", JSON.stringify(res.data, null, 2));

      if (res.data.token) {
        await AsyncStorage.setItem("token", res.data.token);
        router.replace("/(tabs)");
      } else {
        Alert.alert("Login Failed", "Invalid email or password");
      }
    } catch (error: any) {
      console.log("=== LOGIN ERROR ===");
      console.log("Error message:", error.message);
      console.log("Error code:", error.code);
      console.log("Response status:", error.response?.status);
      console.log(
        "Response data:",
        JSON.stringify(error.response?.data, null, 2),
      );

      // Network error — can't reach server
      if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
        Alert.alert(
          "Cannot Reach Server",
          `Make sure:\n\n1. Your Go server is running\n2. Your phone and Mac are on the same WiFi\n\nCurrent URL: ${API_URL}`,
        );
        return;
      }

      const serverMessage: string = error.response?.data?.error ?? "";
      const statusCode: number = error.response?.status ?? 0;

      if (
        statusCode === 401 ||
        serverMessage.toLowerCase().includes("invalid") ||
        serverMessage.toLowerCase().includes("password")
      ) {
        // Wrong credentials — show on both fields
        setErrors({
          email: " ", // space to trigger red border without text
          password: "Incorrect email or password",
        });
      } else if (serverMessage.toLowerCase().includes("email")) {
        setErrors({ email: "No account found with this email" });
      } else if (statusCode === 500) {
        Alert.alert(
          "Server Error",
          "The server encountered an error. Please try again later.",
        );
      } else {
        Alert.alert(
          "Login Failed",
          serverMessage ||
            `Error ${statusCode || "unknown"} — check console for details`,
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    console.log("Forgot password");
    // Navigate to forgot password screen
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <StatusBar style="dark" />
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo Section */}
          <View style={styles.logoContainer}>
            <View style={styles.logoBox}>
              <View style={styles.logoIconContainer}>
                <Image
                  source={require("../../assets/images/Small Logo.png")}
                  resizeMode="contain"
                  style={styles.logoBox}
                />
              </View>
            </View>
            <View style={styles.brandTextContainer}>
              <Text style={styles.brandName}>South Canara</Text>
              <Text style={styles.brandSubtitle}>Agro Mart</Text>
              <Text style={styles.brandTagline}>B2B Agri Marketplace</Text>
            </View>
          </View>

          {/* Title Section */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Login with Email</Text>
            <Text style={styles.subtitle}>
              Enter your Email and Password and make sure the provided details
              are valid
            </Text>
          </View>

          {/* Email Input */}
          <View
            style={[
              styles.inputContainer,
              !!errors.email && errors.email.trim() && styles.inputError,
            ]}
          >
            <View style={styles.inputIconContainer}>
              <Ionicons
                name="mail-outline"
                size={20}
                color={errors.email?.trim() ? "#E53E3E" : "#999"}
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
            {!!errors.email?.trim() && (
              <Ionicons
                name="alert-circle"
                size={18}
                color="#E53E3E"
                style={styles.errorIcon}
              />
            )}
          </View>
          {!!errors.email?.trim() && (
            <Text style={styles.errorText}>{errors.email}</Text>
          )}

          {/* Password Input */}
          <View
            style={[
              styles.inputContainer,
              !!errors.password && styles.inputError,
            ]}
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
              placeholder="Password"
              placeholderTextColor="#999"
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                clearError("password");
              }}
              secureTextEntry={!isPasswordVisible}
              autoCapitalize="none"
              autoComplete="password"
              returnKeyType="done"
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

          {/* Forgot Password */}
          <TouchableOpacity
            onPress={handleForgotPassword}
            style={styles.forgotPasswordContainer}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Terms and Conditions Checkbox */}
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setAgreeToTerms(!agreeToTerms)}
            activeOpacity={0.7}
          >
            <View
              style={[styles.checkbox, agreeToTerms && styles.checkboxChecked]}
            >
              {agreeToTerms && (
                <Ionicons name="checkmark" size={14} color="#FFF" />
              )}
            </View>
            <Text style={styles.checkboxLabel}>
              I agree to all the terms and conditions mentioned while using
              this. <Text style={styles.termsLink}>terms&conditions</Text>
            </Text>
          </TouchableOpacity>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!agreeToTerms || loading) && styles.submitButtonDisabled,
            ]}
            onPress={handleLogin}
            activeOpacity={0.8}
            disabled={!agreeToTerms || loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Submit</Text>
            )}
          </TouchableOpacity>

          {/* Register Link */}
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <TouchableOpacity
              onPress={() => router.push("/screens/RegisterScreen")}
            >
              <Text style={styles.registerLink}>Register</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 40,
  },
  logoBox: {
    width: 120,
    height: 120,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  logoIconContainer: {
    width: 60,
    height: 60,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  brandTextContainer: {
    flex: 1,
  },
  brandName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2C3E50",
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2C3E50",
    letterSpacing: 0.5,
  },
  brandTagline: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
    fontWeight: "500",
  },
  titleContainer: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#000",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
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
  inputError: {
    borderColor: "#E53E3E",
    backgroundColor: "#FFF5F5",
  },
  inputIconContainer: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#000",
  },
  passwordInput: {
    paddingRight: 40,
  },
  eyeIcon: {
    position: "absolute",
    right: 16,
    padding: 4,
  },
  errorIcon: {
    marginLeft: 4,
  },
  errorText: {
    fontSize: 12,
    color: "#E53E3E",
    marginBottom: 12,
    marginLeft: 4,
  },
  forgotPasswordContainer: {
    alignSelf: "flex-end",
    marginBottom: 20,
    marginTop: 4,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: "#0078D7",
    fontWeight: "500",
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 24,
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
  checkboxChecked: {
    backgroundColor: "#0078D7",
    borderColor: "#0078D7",
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 13,
    color: "#999",
    lineHeight: 20,
  },
  termsLink: {
    color: "#0078D7",
    textDecorationLine: "underline",
  },
  submitButton: {
    backgroundColor: "#0078D7",
    borderRadius: 12,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
    shadowColor: "#0078D7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  submitButtonDisabled: {
    backgroundColor: "#B0C4DE",
    shadowOpacity: 0.1,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  registerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  registerText: {
    fontSize: 14,
    color: "#666",
  },
  registerLink: {
    fontSize: 14,
    color: "#0078D7",
    fontWeight: "600",
  },
});

export default LoginScreenMail;

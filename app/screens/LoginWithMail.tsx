import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useRef, useState } from "react";
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
  const passwordRef = useRef<TextInput>(null);

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

    try {
      setLoading(true);
      const res = await axios.post(`${API_URL}/user/login`, {
        email: email.trim(),
        password: password.trim(),
      });

      if (res.data.token) {
        await AsyncStorage.setItem("token", res.data.token);
        router.replace("/(tabs)");
      } else {
        Alert.alert("Login Failed", "Invalid email or password");
      }
    } catch (error: any) {
      if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
        Alert.alert(
          "Cannot Reach Server",
          `Make sure:\n\n1. Your server is running\n2. Your phone and server are on the same network\n\nCurrent URL: ${API_URL}`,
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
        setErrors({
          email: " ",
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
    router.push("/screens/ForgotPasswordScreen" as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {/* Logo Section */}
          <View style={styles.logoContainer}>
            <Image
              source={require("../../assets/images/Small Logo.png")}
              resizeMode="contain"
              style={styles.logoImage}
            />
            <View style={styles.brandTextContainer}>
              <Text style={styles.brandName}>South Canara</Text>
              <Text style={styles.brandSubtitle}>Agro Mart</Text>
              <Text style={styles.brandTagline}>B2B Agri Marketplace</Text>
            </View>
          </View>

          {/* Title Section */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>
              Sign in with your email and password to continue
            </Text>
          </View>

          {/* Email Input */}
          <Text style={styles.fieldLabel}>Email Address</Text>
          <View
            style={[
              styles.inputContainer,
              !!errors.email && errors.email.trim() && styles.inputError,
            ]}
          >
            <Ionicons
              name="mail-outline"
              size={20}
              color={errors.email?.trim() ? "#E53E3E" : "#999"}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor="#B0B0B0"
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
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
            {!!errors.email?.trim() && (
              <Ionicons name="alert-circle" size={18} color="#E53E3E" />
            )}
          </View>
          {!!errors.email?.trim() && (
            <Text style={styles.errorText}>{errors.email}</Text>
          )}

          {/* Password Input */}
          <Text style={styles.fieldLabel}>Password</Text>
          <View
            style={[
              styles.inputContainer,
              !!errors.password && styles.inputError,
            ]}
          >
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color={errors.password ? "#E53E3E" : "#999"}
              style={styles.inputIcon}
            />
            <TextInput
              ref={passwordRef}
              style={[styles.input, { paddingRight: 44 }]}
              placeholder="Enter your password"
              placeholderTextColor="#B0B0B0"
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                clearError("password");
              }}
              secureTextEntry={!isPasswordVisible}
              autoCapitalize="none"
              autoComplete="password"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setIsPasswordVisible(!isPasswordVisible)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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

          {/* Terms and Conditions */}
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
              I agree to the{" "}
              <Text style={styles.termsLink}>Terms & Conditions</Text>
            </Text>
          </TouchableOpacity>

          {/* Login Button */}
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
              <Text style={styles.submitButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Register Link */}
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <TouchableOpacity
              onPress={() => router.push("/screens/RegisterScreen")}
            >
              <Text style={styles.registerLink}>Create Account</Text>
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
    paddingTop: 24,
    paddingBottom: 40,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 36,
  },
  logoImage: {
    width: 72,
    height: 72,
    borderRadius: 16,
    marginRight: 14,
  },
  brandTextContainer: {
    flex: 1,
  },
  brandName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1A1A1A",
    letterSpacing: 0.3,
  },
  brandSubtitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1A1A1A",
    letterSpacing: 0.3,
  },
  brandTagline: {
    fontSize: 13,
    color: "#888",
    marginTop: 2,
    fontWeight: "500",
  },
  titleContainer: {
    marginBottom: 32,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#888",
    lineHeight: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2C3E50",
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    marginBottom: 4,
    paddingHorizontal: 14,
    height: 52,
    borderWidth: 1.5,
    borderColor: "#E8E8E8",
  },
  inputError: {
    borderColor: "#E53E3E",
    backgroundColor: "#FFF5F5",
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#1A1A1A",
  },
  eyeIcon: {
    position: "absolute",
    right: 14,
    padding: 4,
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
    marginTop: 8,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: "#0078D7",
    fontWeight: "600",
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
    borderColor: "#D0D0D0",
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
    color: "#888",
    lineHeight: 20,
  },
  termsLink: {
    color: "#0078D7",
    fontWeight: "600",
  },
  submitButton: {
    backgroundColor: "#0078D7",
    borderRadius: 12,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 28,
    shadowColor: "#0078D7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    backgroundColor: "#B0C4DE",
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  registerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  registerText: {
    fontSize: 14,
    color: "#888",
  },
  registerLink: {
    fontSize: 14,
    color: "#0078D7",
    fontWeight: "700",
  },
});

export default LoginScreenMail;

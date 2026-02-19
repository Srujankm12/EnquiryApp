import Checkbox from "expo-checkbox";
import { router } from "expo-router";
import React, { useState } from "react";
import {
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

import {SafeAreaView } from "react-native-safe-area-context"

const LoginScreen = () => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isAgreed, setIsAgreed] = useState(false);

  const handleSendOTP = () => {
    if (!phoneNumber) {
      alert("Please enter your phone number");
      return;
    }
    if (!isAgreed) {
      alert("Please agree to terms and conditions");
      return;
    }
    // Add your OTP sending logic here
    console.log("Sending OTP to:", phoneNumber);
    router.push({
      pathname: "/pages/otp",
      params: {
        phoneNumber,
      },
    })
      };

  const handleGoogleLogin = () => {
    // Add Google login logic here
    console.log("Google login clicked");
  };

  const handleGmailLogin = () => {
    // Add Gmail login logic here
    console.log("Gmail login clicked");
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Section */}
          <View style={styles.headerSection}>
            <Text style={styles.title}>Welcome to Agromart</Text>
            <Text style={styles.subtitle}>
              Please enter your credentials to login to your Agromart account
            </Text>
          </View>

          {/* Logo Section */}
          <View style={styles.logoContainer}>
            <Image
              source={require("../../assets/images/Small Logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* Phone Input Section */}
          <View style={styles.inputContainer}>
            <View style={styles.phoneInputWrapper}>
              <Text style={styles.countryCode}>+91</Text>
              <TextInput
                style={styles.phoneInput}
                placeholder="Phone Number"
                placeholderTextColor="#999"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>
          </View>

          {/* Terms and Conditions Checkbox */}
          <View style={styles.checkboxContainer}>
            <Checkbox
              value={isAgreed}
              onValueChange={setIsAgreed}
              color={isAgreed ? "#0078D7" : undefined}
              style={styles.checkbox}
            />
            <Text style={styles.checkboxText}>
              I agree to all the terms and conditions mentioned while using
              this. <Text style={styles.linkText}>terms&conditions</Text>
            </Text>
          </View>

          {/* Send OTP Button */}
          <TouchableOpacity
            style={[styles.sendOTPButton, !isAgreed && styles.disabledButton]}
            onPress={handleSendOTP}
            disabled={!isAgreed}
          >
            <Text style={styles.sendOTPButtonText}>Send OTP</Text>
          </TouchableOpacity>

          {/* OR Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social Login Buttons */}
          <View style={styles.socialLoginContainer}>
            <TouchableOpacity
              style={styles.socialButton}
              onPress={handleGoogleLogin}
            >
              <Image
                source={require("../../assets/images/gmail.png")}
                style={styles.socialIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.socialButton}
              onPress={handleGmailLogin}
            >
              <Image
                source={require("../../assets/images/google.png")}
                style={styles.socialIcon}
                resizeMode="contain"
              />
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  headerSection: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#666666",
    lineHeight: 20,
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 30,
  },
  logo: {
    width: 280,
    height: 280,
  },
  inputContainer: {
    marginBottom: 20,
  },
  phoneInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  countryCode: {
    fontSize: 16,
    color: "#999999",
    marginRight: 8,
    fontWeight: "500",
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    color: "#000000",
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  checkbox: {
    marginRight: 8,
    marginTop: 2,
  },
  checkboxText: {
    flex: 1,
    fontSize: 12,
    color: "#666666",
    lineHeight: 18,
  },
  linkText: {
    color: "#0078D7",
    textDecorationLine: "underline",
  },
  sendOTPButton: {
    backgroundColor: "#0078D7",
    borderRadius: 12,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  disabledButton: {
    opacity: 0.5,
  },
  sendOTPButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E0E0E0",
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: "#CCCCCC",
    fontWeight: "500",
  },
  socialLoginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginBottom: 40,
  },
  socialButton: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  socialIcon: {
    width: 32,
    height: 32,
  },
});

export default LoginScreen;
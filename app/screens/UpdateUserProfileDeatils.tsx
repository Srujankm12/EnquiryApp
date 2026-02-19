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

const API_URL = Constants.expoConfig?.extra?.API_URL;

interface DecodedToken {
  user_id: string;
  exp?: number;
}

interface UserDetails {
  user_name: string;
  user_email: string;
  user_phone: string;
  user_id: string;
  user_profile_url: string | null;
  created_at: string;
}

const UpdateProfileDetailsScreen: React.FC = () => {
  const [userId, setUserId] = useState<string>("");
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [userPhone, setUserPhone] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(true);
  const [updating, setUpdating] = useState<boolean>(false);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");

      if (!token) {
        Alert.alert("Error", "Authentication token not found. Please login again.");
        router.replace("/pages/loginMail" as any);
        return;
      }

      const decodedToken = jwtDecode<DecodedToken>(token);
      setUserId(decodedToken.user_id);

      const res = await axios.get(
        `${API_URL}/get/user/details/${decodedToken.user_id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.status === "success") {
        const userDetails: UserDetails = res.data.data.user_details;
        // Split user_name into first and last name
        const nameParts = (userDetails.user_name || "").split(" ");
        setFirstName(nameParts[0] || "");
        setLastName(nameParts.slice(1).join(" ") || "");
        setUserEmail(userDetails.user_email || "");
        setUserPhone(userDetails.user_phone || "");
      }

      setLoading(false);
    } catch (error: any) {
      console.error("Error fetching profile:", error);
      Alert.alert("Error", "Failed to load profile data. Please try again.");
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    return /^\d{7,15}$/.test(phone.replace(/[\s\-\(\)]/g, ""));
  };

  const handleUpdateProfile = async () => {
    try {
      if (!firstName.trim()) {
        Alert.alert("Error", "Please enter your first name");
        return;
      }
      if (!userEmail.trim() || !validateEmail(userEmail)) {
        Alert.alert("Error", "Please enter a valid email address");
        return;
      }
      if (!userPhone.trim() || !validatePhone(userPhone)) {
        Alert.alert("Error", "Please enter a valid phone number (7–15 digits)");
        return;
      }

      setUpdating(true);

      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Error", "Authentication token not found. Please login again.");
        setUpdating(false);
        return;
      }

      const response = await axios.put(
        `${API_URL}/user/update/details/${userId}`,
        {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: userEmail.trim(),
          phone: userPhone.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );

      if (response.status === 200 || response.data.message) {
        Alert.alert("Success", "Profile updated successfully!", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        throw new Error(response.data.message || "Failed to update profile");
      }

      setUpdating(false);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      let errorMessage = "Failed to update profile. Please try again.";
      if (error.response) {
        errorMessage = error.response.data?.error || error.response.data?.message || `Server error: ${error.response.status}`;
      } else if (error.message) {
        errorMessage = error.message;
      }
      Alert.alert("Error", errorMessage);
      setUpdating(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar barStyle="light-content" backgroundColor="#177DDF" translucent={false} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Update Profile Details</Text>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#177DDF" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {/* Info Card */}
            <View style={styles.infoCard}>
              <Ionicons name="information-circle" size={24} color="#177DDF" />
              <Text style={styles.infoText}>
                Update your personal information below. Make sure all details are accurate.
              </Text>
            </View>

            {/* First Name */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>First Name *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your first name"
                  placeholderTextColor="#999"
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Last Name */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Last Name (optional)</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your last name"
                  placeholderTextColor="#999"
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email Address *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor="#999"
                  value={userEmail}
                  onChangeText={setUserEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                />
              </View>
            </View>

            {/* Phone */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Phone Number *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="call-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your phone number"
                  placeholderTextColor="#999"
                  value={userPhone}
                  onChangeText={setUserPhone}
                  keyboardType="phone-pad"
                  maxLength={15}
                />
              </View>
            </View>

            {/* Update Button */}
            <TouchableOpacity
              style={[styles.updateButton, updating && styles.updateButtonDisabled]}
              onPress={handleUpdateProfile}
              disabled={updating}
            >
              {updating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.updateButtonText}>Update Profile</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  header: {
    backgroundColor: "#177DDF",
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: { marginRight: 16 },
  headerTitle: { fontSize: 20, fontWeight: "600", color: "#FFFFFF" },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, fontSize: 16, color: "#666" },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  content: { flex: 1, padding: 16 },
  infoCard: {
    backgroundColor: "#E3F2FD",
    borderRadius: 8,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: "#177DDF",
  },
  infoText: { flex: 1, fontSize: 14, color: "#333", marginLeft: 12, lineHeight: 20 },
  inputContainer: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: "500", color: "#333", marginBottom: 8 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    paddingHorizontal: 16,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, paddingVertical: 14, fontSize: 16, color: "#000" },
  updateButton: {
    backgroundColor: "#177DDF",
    borderRadius: 8,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginTop: 8,
  },
  updateButtonDisabled: { backgroundColor: "#A0C4E8" },
  updateButtonText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF", marginLeft: 8 },
});

export default UpdateProfileDetailsScreen;

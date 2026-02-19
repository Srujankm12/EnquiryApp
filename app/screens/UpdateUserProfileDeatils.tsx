import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Constants from "expo-constants";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { jwtDecode } from "jwt-decode";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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

const API_URL ="http://192.168.1.4:8080";

interface DecodedToken {
  user_id: string;
  exp?: number;
}

interface FieldErrors {
  firstName?: string;
  email?: string;
  phone?: string;
}

const UpdateProfileDetailsScreen: React.FC = () => {
  const [userId, setUserId] = useState<string>("");
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [profileImage, setProfileImage] = useState<string | null>(null); // local URI or remote URL
  const [imageUploading, setImageUploading] = useState<boolean>(false);
  const [updating, setUpdating] = useState<boolean>(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    loadUserIdFromToken();
  }, []);

  const clearError = (field: keyof FieldErrors) => {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  // ─── Load userId from JWT token ────────────────────────────────────────────
  const loadUserIdFromToken = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Session Expired", "Please login again.");
        router.replace("/pages/loginMail" as any);
        return;
      }
      const decoded = jwtDecode<DecodedToken>(token);
      console.log("=== USER ID FROM TOKEN ===", decoded.user_id);
      setUserId(decoded.user_id);
    } catch (error: any) {
      console.error("Token decode error:", error);
      Alert.alert("Error", "Failed to get user information. Please login again.");
      router.replace("/pages/loginMail" as any);
    }
  };

  // ─── Pick profile image from gallery ──────────────────────────────────────
  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Required", "Please allow access to your photo library.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      const localUri = result.assets[0].uri;
      setProfileImage(localUri);
      await handleUploadImage(localUri);
    }
  };

  // ─── Upload profile image via presigned URL ────────────────────────────────
  // Flow: GET /user/get/presigned/{id} → PUT to S3 → PUT /user/update/image/{id}
  const handleUploadImage = async (imageUri: string) => {
    if (!userId) {
      Alert.alert("Error", "User ID not found. Please try again.");
      return;
    }

    setImageUploading(true);
    console.log("=== PROFILE IMAGE UPLOAD START ===");
    console.log("User ID:", userId);
    console.log("Image URI:", imageUri);

    try {
      const token = await AsyncStorage.getItem("token");

      // Step 1: GET presigned URL from backend
      console.log("Step 1: Getting presigned URL...");
      console.log("URL:", `${API_URL}/user/get/presigned/${userId}`);

      const presignedRes = await axios.get(
        `${API_URL}/user/get/presigned/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Backend returns: utils.Envelope{"url": url, "message": "..."}
      const uploadUrl: string = presignedRes.data.url;
      console.log("Step 1 ✅ Presigned URL received:", uploadUrl);

      // Step 2: PUT image blob directly to S3
      console.log("Step 2: Uploading image to S3...");
      const imageResponse = await fetch(imageUri);
      const blob = await imageResponse.blob();

      const s3Res = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "image/png" },
        body: blob,
      });

      if (!s3Res.ok) {
        throw new Error(`S3 upload failed with status: ${s3Res.status}`);
      }
      console.log("Step 2 ✅ Image uploaded to S3");

      // Step 3: Notify backend to save image path in DB
      console.log("Step 3: Notifying backend to save image path...");
      console.log("URL:", `${API_URL}/user/update/image/${userId}`);

      const updateRes = await axios.put(
        `${API_URL}/user/update/image/${userId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log("Step 3 ✅ Image path saved in DB");
      console.log("Response:", JSON.stringify(updateRes.data, null, 2));

      Alert.alert("Success", "Profile photo updated successfully!");
    } catch (error: any) {
      console.log("=== PROFILE IMAGE UPLOAD ERROR ===");
      console.log("Error message:", error.message);
      console.log("Error code:", error.code);
      console.log("Response status:", error.response?.status);
      console.log("Response data:", JSON.stringify(error.response?.data, null, 2));

      if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
        Alert.alert("Cannot Reach Server", `Check your connection.\nURL: ${API_URL}`);
      } else {
        // Backend returns utils.Envelope{"error": "..."}
        const msg = error.response?.data?.error || "Failed to upload profile photo.";
        Alert.alert("Upload Failed", msg);
      }
      // Revert local image on failure
      setProfileImage(null);
    } finally {
      setImageUploading(false);
    }
  };

  // ─── Validate fields ───────────────────────────────────────────────────────
  const validate = (): boolean => {
    const newErrors: FieldErrors = {};

    if (!firstName.trim()) {
      newErrors.firstName = "First name is required";
    }
    if (email.trim() === "") {
      newErrors.email = "Email is required";
    } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim())) {
      newErrors.email = "Enter a valid email address";
    }
    if (phone.trim() === "") {
      newErrors.phone = "Phone number is required";
    } else if (!/^\d{7,15}$/.test(phone.trim())) {
      newErrors.phone = "Phone must be 7–15 digits, numbers only";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ─── Update profile details ────────────────────────────────────────────────
  const handleUpdateProfile = async () => {
    if (!validate()) return;

    const token = await AsyncStorage.getItem("token");
    if (!token || !userId) {
      Alert.alert("Session Expired", "Please login again.");
      router.replace("/pages/loginMail" as any);
      return;
    }

    // Matches updateUserProfileDetailsRequest struct exactly:
    // { first_name, last_name, email, phone }
    const body: Record<string, string> = {
      first_name: firstName.trim(),
      email: email.trim(),
      phone: phone.trim(),
    };
    // last_name is *string (nullable) — only send if provided
    if (lastName.trim()) {
      body.last_name = lastName.trim();
    }

    console.log("=== UPDATE PROFILE REQUEST ===");
    console.log("URL:", `${API_URL}/user/update/details/${userId}`);
    console.log("Body:", JSON.stringify(body, null, 2));

    try {
      setUpdating(true);

      // PUT /user/update/details/{id}
      const response = await axios.put(
        `${API_URL}/user/update/details/${userId}`,
        body,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );

      console.log("=== UPDATE PROFILE SUCCESS ===");
      console.log("Status:", response.status);
      console.log("Response:", JSON.stringify(response.data, null, 2));

      // Backend returns: utils.Envelope{"message": "..."}
      Alert.alert("Success", response.data.message || "Profile updated successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.log("=== UPDATE PROFILE ERROR ===");
      console.log("Error message:", error.message);
      console.log("Response status:", error.response?.status);
      console.log("Response data:", JSON.stringify(error.response?.data, null, 2));

      if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
        Alert.alert("Cannot Reach Server", `Check your connection.\nURL: ${API_URL}`);
        return;
      }

      // Backend returns utils.Envelope{"error": "..."}
      const serverMessage: string = error.response?.data?.error ?? "";
      const statusCode: number = error.response?.status ?? 0;

      if (serverMessage.toLowerCase().includes("email")) {
        setErrors((prev) => ({ ...prev, email: "This email is already in use" }));
      } else if (serverMessage.toLowerCase().includes("phone")) {
        setErrors((prev) => ({ ...prev, phone: "This phone number is already in use" }));
      } else if (statusCode === 401) {
        Alert.alert("Session Expired", "Please login again.");
        router.replace("/pages/loginMail" as any);
      } else if (statusCode === 404) {
        Alert.alert("Not Found", "User not found. Please login again.");
      } else if (statusCode === 500) {
        Alert.alert("Server Error", "Something went wrong on the server. Please try again.");
      } else {
        Alert.alert("Update Failed", serverMessage || "Could not update profile. Please try again.");
      }
    } finally {
      setUpdating(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0078D7" translucent={false} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Update Profile</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>

          {/* ── Profile Image Section ── */}
          <View style={styles.avatarSection}>
            <TouchableOpacity
              style={styles.avatarWrapper}
              onPress={handlePickImage}
              disabled={imageUploading}
              activeOpacity={0.8}
            >
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person-outline" size={38} color="#B0BEC5" />
                </View>
              )}

              {/* Camera badge or loading spinner */}
              <View style={styles.avatarBadge}>
                {imageUploading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Ionicons name="camera" size={14} color="#FFF" />
                )}
              </View>
            </TouchableOpacity>
            <Text style={styles.avatarHint}>
              {imageUploading ? "Uploading..." : "Tap to change photo"}
            </Text>
          </View>

          {/* Info Card */}
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={20} color="#0078D7" />
            <Text style={styles.infoText}>
              Update your personal information below. All fields marked * are required.
            </Text>
          </View>

          {/* First Name */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>First Name *</Text>
            <View style={[styles.inputWrapper, errors.firstName && styles.inputWrapperError]}>
              <Ionicons
                name="person-outline"
                size={20}
                color={errors.firstName ? "#E53E3E" : "#999"}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Enter your first name"
                placeholderTextColor="#999"
                value={firstName}
                onChangeText={(v) => { setFirstName(v); clearError("firstName"); }}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="next"
              />
              {errors.firstName && (
                <Ionicons name="alert-circle" size={18} color="#E53E3E" style={styles.errorIcon} />
              )}
            </View>
            {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
          </View>

          {/* Last Name */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Last Name (optional)</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your last name"
                placeholderTextColor="#999"
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Email Address *</Text>
            <View style={[styles.inputWrapper, errors.email && styles.inputWrapperError]}>
              <Ionicons
                name="mail-outline"
                size={20}
                color={errors.email ? "#E53E3E" : "#999"}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#999"
                value={email}
                onChangeText={(v) => { setEmail(v); clearError("email"); }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                returnKeyType="next"
              />
              {errors.email && (
                <Ionicons name="alert-circle" size={18} color="#E53E3E" style={styles.errorIcon} />
              )}
            </View>
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          {/* Phone */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Phone Number *</Text>
            <View style={[styles.inputWrapper, errors.phone && styles.inputWrapperError]}>
              <Ionicons
                name="call-outline"
                size={20}
                color={errors.phone ? "#E53E3E" : "#999"}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Enter your phone number"
                placeholderTextColor="#999"
                value={phone}
                onChangeText={(v) => { setPhone(v); clearError("phone"); }}
                keyboardType="phone-pad"
                maxLength={15}
                returnKeyType="done"
              />
              {errors.phone && (
                <Ionicons name="alert-circle" size={18} color="#E53E3E" style={styles.errorIcon} />
              )}
            </View>
            {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
          </View>

          {/* Update Button */}
          <TouchableOpacity
            style={[styles.updateButton, (updating || imageUploading) && styles.updateButtonDisabled]}
            onPress={handleUpdateProfile}
            disabled={updating || imageUploading}
            activeOpacity={0.8}
          >
            {updating ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.updateButtonText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F9FC",
  },
  header: {
    backgroundColor: "#0078D7",
    paddingTop: Platform.OS === "ios" ? 54 : 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    marginRight: 16,
    padding: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 20, paddingBottom: 40 },
  content: { flex: 1 },

  // Avatar
  avatarSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  avatarWrapper: {
    position: "relative",
    marginBottom: 8,
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: "#E8F0FE",
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#F5F5F5",
    borderWidth: 2,
    borderColor: "#E0E0E0",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#0078D7",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  avatarHint: {
    fontSize: 12,
    color: "#999",
  },

  // Info card
  infoCard: {
    backgroundColor: "#EBF4FF",
    borderRadius: 10,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: "#0078D7",
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#444",
    marginLeft: 10,
    lineHeight: 20,
  },

  // Fields
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2C3E50",
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputWrapperError: {
    borderColor: "#E53E3E",
    backgroundColor: "#FFF5F5",
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: "#000",
  },
  errorIcon: {
    marginLeft: 4,
  },
  errorText: {
    fontSize: 12,
    color: "#E53E3E",
    marginTop: 6,
    marginLeft: 4,
  },

  // Update button
  updateButton: {
    backgroundColor: "#0078D7",
    borderRadius: 12,
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    shadowColor: "#0078D7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    gap: 8,
  },
  updateButtonDisabled: {
    backgroundColor: "#B0C4DE",
    shadowOpacity: 0.1,
    elevation: 0,
  },
  updateButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: 0.4,
  },
});

export default UpdateProfileDetailsScreen;
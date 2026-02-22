import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface CompanySocialInfoStepProps {
  businessId: string | null;
  userId: string;
  isEditMode: boolean;
  onComplete: (stepNumber: number, data?: any) => void;
  onBack: () => void;
}

interface SocialInfo {
  linkedin: string;
  instagram: string;
  facebook: string;
  website: string;
  telegram: string;
  youtube: string;
  x: string;
}

const CompanySocialInfoStep: React.FC<CompanySocialInfoStepProps> = ({
  businessId,
  userId,
  isEditMode,
  onComplete,
  onBack,
}) => {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [isExisting, setIsExisting] = useState(false);
  const [formData, setFormData] = useState<SocialInfo>({
    linkedin: "",
    instagram: "",
    facebook: "",
    website: "",
    telegram: "",
    youtube: "",
    x: "",
  });

  const API_URL = Constants.expoConfig?.extra?.API_URL;

  useEffect(() => {
    if (businessId) {
      fetchSocialData();
    } else {
      setFetching(false);
    }
  }, [businessId]);

  const fetchSocialData = async () => {
    try {
      setFetching(true);
      const response = await fetch(
        `${API_URL}/business/social/get/${businessId}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        },
      );

      if (response.ok) {
        const result = await response.json();
        const social = result.details;
        setIsExisting(true);
        setFormData({
          linkedin: social.linkedin || "",
          instagram: social.instagram || "",
          facebook: social.facebook || "",
          website: social.website || "",
          telegram: social.telegram || "",
          youtube: social.youtube || "",
          x: social.x || "",
        });
      }
    } catch (error) {
      console.error("Error fetching social data:", error);
    } finally {
      setFetching(false);
    }
  };

  const handleInputChange = (field: keyof SocialInfo, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async () => {
    if (!businessId) {
      Alert.alert(
        "Error",
        "Business ID not found. Please complete step 1 first.",
      );
      return;
    }

    try {
      setLoading(true);

      const payload: any = {
        id: businessId,
      };

      if (formData.linkedin.trim()) payload.linkedin = formData.linkedin.trim();
      if (formData.instagram.trim())
        payload.instagram = formData.instagram.trim();
      if (formData.facebook.trim()) payload.facebook = formData.facebook.trim();
      if (formData.website.trim()) payload.website = formData.website.trim();
      if (formData.telegram.trim()) payload.telegram = formData.telegram.trim();
      if (formData.youtube.trim()) payload.youtube = formData.youtube.trim();
      if (formData.x.trim()) payload.x = formData.x.trim();

      if (isExisting || isEditMode) {
        // Update existing social details
        const response = await fetch(
          `${API_URL}/business/social/update/${businessId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );

        if (!response.ok) throw new Error("Failed to update social details");
      } else {
        // Create new social details
        const response = await fetch(`${API_URL}/business/social/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) throw new Error("Failed to create social details");
      }

      onComplete(3);
    } catch (error: any) {
      console.error("Error submitting social info:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to save social information",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    onComplete(3);
  };

  if (fetching) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0078D7" />
        <Text style={styles.loadingText}>Loading social information...</Text>
      </View>
    );
  }

  const socialFields: {
    key: keyof SocialInfo;
    label: string;
    placeholder: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
  }[] = [
    {
      key: "linkedin",
      label: "LinkedIn",
      placeholder: "https://linkedin.com/in/yourprofile",
      icon: "logo-linkedin",
      color: "#0A66C2",
    },
    {
      key: "instagram",
      label: "Instagram",
      placeholder: "https://instagram.com/yourhandle",
      icon: "logo-instagram",
      color: "#E4405F",
    },
    {
      key: "facebook",
      label: "Facebook",
      placeholder: "https://facebook.com/yourpage",
      icon: "logo-facebook",
      color: "#1877F2",
    },
    {
      key: "youtube",
      label: "YouTube",
      placeholder: "https://youtube.com/@yourchannel",
      icon: "logo-youtube",
      color: "#FF0000",
    },
    {
      key: "x",
      label: "X (Twitter)",
      placeholder: "https://x.com/yourhandle",
      icon: "logo-twitter",
      color: "#000000",
    },
    {
      key: "telegram",
      label: "Telegram",
      placeholder: "https://t.me/yourchannel",
      icon: "paper-plane-outline",
      color: "#0088CC",
    },
    {
      key: "website",
      label: "Website",
      placeholder: "https://yourbusiness.com",
      icon: "globe-outline",
      color: "#666",
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Social Media Links</Text>
        <Text style={styles.sectionSubtitle}>
          Add your social media profiles (optional). These will be displayed on
          your seller profile.
        </Text>

        {socialFields.map((field) => (
          <View key={field.key} style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Ionicons name={field.icon} size={18} color={field.color} />
              <Text style={styles.label}>{field.label}</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder={field.placeholder}
              placeholderTextColor="#999"
              value={formData[field.key]}
              onChangeText={(text) => handleInputChange(field.key, text)}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>
        ))}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={handleSkip}
        >
          <Text style={styles.secondaryButtonText}>Skip for Now</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            styles.primaryButton,
            loading && styles.buttonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.primaryButtonText}>Save & Continue</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  loadingText: { marginTop: 12, fontSize: 14, color: "#666" },
  section: { backgroundColor: "#FFFFFF", padding: 16, marginBottom: 8 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "#888",
    marginBottom: 20,
    lineHeight: 18,
  },
  inputGroup: { marginBottom: 16 },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  label: { fontSize: 14, fontWeight: "600", color: "#333" },
  input: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#000",
    backgroundColor: "#FAFAFA",
  },
  buttonContainer: {
    paddingHorizontal: 16,
    marginTop: 8,
    gap: 10,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryButton: { backgroundColor: "#0078D7" },
  secondaryButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  buttonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  secondaryButtonText: { color: "#666", fontSize: 16, fontWeight: "600" },
});

export default CompanySocialInfoStep;

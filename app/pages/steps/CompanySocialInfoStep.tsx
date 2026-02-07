// steps/CompanySocialInfoStep.tsx - Step 3: Social Media & Profile Image
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface CompanySocialInfoStepProps {
  companyId: string | null;
  userId: string;
  isEditMode: boolean;
  onComplete: (stepNumber: number, data?: any) => void;
  onBack: () => void;
}

interface SocialInfo {
  linkedinUrl: string;
  instagramUrl: string;
  facebookUrl: string;
  websiteUrl: string;
  whatsappNumber: string;
}

const CompanySocialInfoStep: React.FC<CompanySocialInfoStepProps> = ({
  companyId,
  userId,
  isEditMode,
  onComplete,
  onBack,
}) => {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [hasExistingData, setHasExistingData] = useState(false);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [companyLogoFile, setCompanyLogoFile] = useState<any>(null);
  const [existingLogoUrl, setExistingLogoUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState<SocialInfo>({
    linkedinUrl: "",
    instagramUrl: "",
    facebookUrl: "",
    websiteUrl: "",
    whatsappNumber: "",
  });
  const [errors, setErrors] = useState<any>({});

  const API_URL = Constants.expoConfig?.extra?.API_URL;

  useEffect(() => {
    if (companyId) {
      fetchSocialDataAndImage();
    } else {
      setFetching(false);
    }
  }, [companyId]);

  const fetchSocialDataAndImage = async () => {
    try {
      setFetching(true);
      const token = await AsyncStorage.getItem("token");

      // Fetch social details
      const socialResponse = await fetch(
        `${API_URL}/company/social/get/${companyId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (socialResponse.ok) {
        const socialResult = await socialResponse.json();
        const social = socialResult.data;

        setFormData({
          linkedinUrl: social.linkedin_url || "",
          instagramUrl: social.instagram_url || "",
          facebookUrl: social.facebook_url || "",
          websiteUrl: social.website_url || "",
          whatsappNumber: social.whatsapp_number || "",
        });

        setHasExistingData(true);
      }

      // Fetch company logo
      const companyResponse = await fetch(
        `${API_URL}/company/get/${companyId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (companyResponse.ok) {
        const companyResult = await companyResponse.json();
        const company = companyResult.data;

        if (company.company_profile_url) {
          setExistingLogoUrl(company.company_profile_url);
          setCompanyLogo(company.company_profile_url);
        }

        // If not in edit mode and data exists, make read-only
        setIsReadOnly(!isEditMode && (hasExistingData || company.company_profile_url));
      }
    } catch (error) {
      console.error("Error fetching social data:", error);
      setHasExistingData(false);
    } finally {
      setFetching(false);
    }
  };

  const handleInputChange = (field: keyof SocialInfo, value: string) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: "" });
    }
  };

  const pickLogo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setCompanyLogo(result.assets[0].uri);
        setCompanyLogoFile(result.assets[0]);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const validateForm = (): boolean => {
    const newErrors: any = {};
    const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;

    if (formData.linkedinUrl && !urlPattern.test(formData.linkedinUrl)) {
      newErrors.linkedinUrl = "Invalid LinkedIn URL";
    }

    if (formData.instagramUrl && !urlPattern.test(formData.instagramUrl)) {
      newErrors.instagramUrl = "Invalid Instagram URL";
    }

    if (formData.facebookUrl && !urlPattern.test(formData.facebookUrl)) {
      newErrors.facebookUrl = "Invalid Facebook URL";
    }

    if (formData.websiteUrl && !urlPattern.test(formData.websiteUrl)) {
      newErrors.websiteUrl = "Invalid Website URL";
    }

    if (
      formData.whatsappNumber &&
      !/^\d{10}$/.test(formData.whatsappNumber)
    ) {
      newErrors.whatsappNumber = "Invalid WhatsApp number (10 digits required)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

// Fixed uploadImageToS3 function - copy this into CompanySocialInfoStep.tsx

const uploadImageToS3 = async (presignedUrl: string, imageUri: string) => {
  try {
    console.log('🔄 Starting S3 upload...');
    console.log('📍 S3 URL:', presignedUrl);
    console.log('📷 Image URI:', imageUri);

    // Fetch the image as a blob
    const response = await fetch(imageUri);
    const blob = await response.blob();
    
    console.log('📦 Blob size:', blob.size);
    console.log('📦 Blob type:', blob.type);

    // ✅ Upload to S3 using PUT request with fetch
    const uploadResponse = await fetch(presignedUrl, {
      method: 'PUT',
      body: blob,
      headers: {
        'Content-Type': blob.type || 'image/jpeg',
      },
    });

    console.log('📡 S3 Upload Response Status:', uploadResponse.status);
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('❌ S3 Upload Error:', errorText);
      throw new Error(`S3 upload failed with status ${uploadResponse.status}`);
    }

    console.log('✅ S3 upload successful');
    return true;
  } catch (error: any) {
    console.error('❌ Error uploading to S3:', error);
    console.error('📋 Error details:', {
      message: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

// Complete handleSubmit function - Replace the entire function in CompanySocialInfoStep.tsx

const handleSubmit = async () => {
  if (!validateForm()) {
    Alert.alert("Validation Error", "Please correct the errors in the form");
    return;
  }

  if (!companyId) {
    Alert.alert("Error", "Company ID not found");
    return;
  }

  try {
    setLoading(true);
    const token = await AsyncStorage.getItem("token");

    // ============================================
    // STEP 1: Save Social Details
    // ============================================
    const socialData: any = {
      company_id: companyId,
    };

    if (formData.linkedinUrl.trim()) {
      socialData.linkedin_url = formData.linkedinUrl;
    }
    if (formData.instagramUrl.trim()) {
      socialData.instagram_url = formData.instagramUrl;
    }
    if (formData.facebookUrl.trim()) {
      socialData.facebook_url = formData.facebookUrl;
    }
    if (formData.websiteUrl.trim()) {
      socialData.website_url = formData.websiteUrl;
    }
    if (formData.whatsappNumber.trim()) {
      socialData.whatsapp_number = formData.whatsappNumber;
    }

    if (hasExistingData) {
      // Update existing social details
      const response = await fetch(`${API_URL}/company/social/update`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(socialData),
      });

      if (!response.ok) {
        throw new Error("Failed to update social details");
      }
    } else {
      // Create new social details
      const response = await fetch(`${API_URL}/company/social/create`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(socialData),
      });

      if (!response.ok) {
        throw new Error("Failed to create social details");
      }
    }

    // ============================================
    // STEP 2: Upload Company Logo (if selected)
    // ============================================
    let imageUploaded = !!existingLogoUrl;

    if (companyLogoFile) {
      setUploadingImage(true);
      console.log('📤 Starting company logo upload...');
      console.log('🏢 Company ID:', companyId);

      try {
        // Step 2.1: Get presigned URL from backend
        console.log('📍 Step 1: Getting presigned URL...');
        console.log('🔗 API URL:', `${API_URL}/company/generate/${companyId}`);
        
        const presignedResponse = await fetch(
          `${API_URL}/company/generate/${companyId}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!presignedResponse.ok) {
          const errorData = await presignedResponse.text();
          console.error('❌ Presigned URL Error:', errorData);
          throw new Error("Failed to get presigned URL");
        }

        const presignedResult = await presignedResponse.json();
        console.log('📦 Presigned Response:', JSON.stringify(presignedResult, null, 2));

        // Extract presigned URL - handle multiple possible response structures
        const presignedUrl = presignedResult.data?.url || 
                            presignedResult.data?.presigned_url ||
                            presignedResult.url ||
                            presignedResult.presigned_url;

        if (!presignedUrl) {
          console.error('❌ No presigned URL found in response');
          console.error('📦 Response data:', presignedResult);
          throw new Error("Invalid presigned URL response");
        }

        console.log('✅ Got presigned URL:', presignedUrl);

        // Step 2.2: Upload image to S3
        console.log('📍 Step 2: Uploading to S3...');
        console.log('🔄 Starting S3 upload...');
        console.log('📍 S3 URL:', presignedUrl);
        console.log('📷 Image URI:', companyLogo);

        // Fetch the image as a blob
        const response = await fetch(companyLogo!);
        const blob = await response.blob();
        
        console.log('📦 Blob size:', blob.size);
        console.log('📦 Blob type:', blob.type);

        // Upload to S3 using PUT request with fetch
        const uploadResponse = await fetch(presignedUrl, {
          method: 'PUT',
          body: blob,
          headers: {
            'Content-Type': blob.type || 'image/jpeg',
          },
        });

        console.log('📡 S3 Upload Response Status:', uploadResponse.status);
        
        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.error('❌ S3 Upload Error:', errorText);
          throw new Error(`S3 upload failed with status ${uploadResponse.status}`);
        }

        console.log('✅ S3 upload successful');

        // Step 2.3: Update profile image status in backend
        console.log('📍 Step 3: Updating profile image status...');

        // Extract the S3 path (backend stores relative path, not full URL)
        const baseS3Url = presignedUrl.split('?')[0];
console.log('📍 Base S3 URL:', baseS3Url);

        const updateResponse = await fetch(
          `${API_URL}/company/update/profile-image`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              company_id: companyId,
              company_profile_url: baseS3Url,  // ✅ Both fields required!
            }),
          }
        );

        if (!updateResponse.ok) {
          const errorData = await updateResponse.text();
          console.error('❌ Update profile error:', errorData);
          throw new Error("Failed to update profile image status");
        }

        const updateResult = await updateResponse.json();
        console.log('✅ Profile image status updated:', updateResult);
        imageUploaded = true;

      } catch (uploadError: any) {
        console.error('❌ Image upload failed:', uploadError);
        console.error('📋 Error details:', {
          message: uploadError.message,
          stack: uploadError.stack,
        });
        
        // Don't throw - allow form to continue even if image fails
        Alert.alert(
          "Image Upload Failed",
          "Social media details saved, but logo upload failed. You can try uploading the logo again later."
        );
      } finally {
        setUploadingImage(false);
      }
    }

    // ============================================
    // SUCCESS
    // ============================================
    Alert.alert("Success", "Information saved successfully");
    onComplete(3, { imageUploaded });

  } catch (error: any) {
    console.error("❌ Error submitting social info:", error);
    console.error("📋 Error details:", {
      message: error.message,
      stack: error.stack,
    });
    Alert.alert("Error", error.message || "Failed to save information");
  } finally {
    setLoading(false);
    setUploadingImage(false);
  }
};

  const handleSkipLater = () => {
    // Allow skipping if at least logo is uploaded or exists
    if (existingLogoUrl || companyLogo) {
      onComplete(3, { imageUploaded: !!existingLogoUrl });
    } else {
      Alert.alert(
        "Company Logo Required",
        "Please upload a company logo before continuing."
      );
    }
  };

  const handleNext = () => {
    if (isReadOnly) {
      onComplete(3, { imageUploaded: !!existingLogoUrl });
    } else {
      handleSubmit();
    }
  };

  if (fetching) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0078D7" />
        <Text style={styles.loadingText}>
          Loading social media & image information...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Company Logo *</Text>

        {isReadOnly && (
          <View style={styles.readOnlyBanner}>
            <Ionicons name="lock-closed" size={16} color="#0078D7" />
            <Text style={styles.readOnlyText}>
              Information saved. Click "Next" to continue.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.logoUpload}
          onPress={pickLogo}
          disabled={isReadOnly}
        >
          {companyLogo ? (
            <Image source={{ uri: companyLogo }} style={styles.logoImage} />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Ionicons name="camera" size={32} color="#999" />
              <Text style={styles.uploadText}>Upload Logo</Text>
            </View>
          )}
        </TouchableOpacity>
        {!existingLogoUrl && !companyLogo && (
          <Text style={styles.helperText}>
            Company logo is required. Click to upload.
          </Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Social Media & Contact (Optional)
        </Text>
        <Text style={styles.sectionDescription}>
          Add your company's social media profiles to increase credibility.
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>LinkedIn URL</Text>
          <TextInput
            style={[
              styles.input,
              errors.linkedinUrl && styles.inputError,
              isReadOnly && styles.inputReadOnly,
            ]}
            placeholder="https://linkedin.com/company/..."
            value={formData.linkedinUrl}
            onChangeText={(text) => handleInputChange("linkedinUrl", text)}
            autoCapitalize="none"
            keyboardType="url"
            editable={!isReadOnly}
          />
          {errors.linkedinUrl && (
            <Text style={styles.errorText}>{errors.linkedinUrl}</Text>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Instagram URL</Text>
          <TextInput
            style={[
              styles.input,
              errors.instagramUrl && styles.inputError,
              isReadOnly && styles.inputReadOnly,
            ]}
            placeholder="https://instagram.com/..."
            value={formData.instagramUrl}
            onChangeText={(text) => handleInputChange("instagramUrl", text)}
            autoCapitalize="none"
            keyboardType="url"
            editable={!isReadOnly}
          />
          {errors.instagramUrl && (
            <Text style={styles.errorText}>{errors.instagramUrl}</Text>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Facebook URL</Text>
          <TextInput
            style={[
              styles.input,
              errors.facebookUrl && styles.inputError,
              isReadOnly && styles.inputReadOnly,
            ]}
            placeholder="https://facebook.com/..."
            value={formData.facebookUrl}
            onChangeText={(text) => handleInputChange("facebookUrl", text)}
            autoCapitalize="none"
            keyboardType="url"
            editable={!isReadOnly}
          />
          {errors.facebookUrl && (
            <Text style={styles.errorText}>{errors.facebookUrl}</Text>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Website URL</Text>
          <TextInput
            style={[
              styles.input,
              errors.websiteUrl && styles.inputError,
              isReadOnly && styles.inputReadOnly,
            ]}
            placeholder="https://www.yourcompany.com"
            value={formData.websiteUrl}
            onChangeText={(text) => handleInputChange("websiteUrl", text)}
            autoCapitalize="none"
            keyboardType="url"
            editable={!isReadOnly}
          />
          {errors.websiteUrl && (
            <Text style={styles.errorText}>{errors.websiteUrl}</Text>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>WhatsApp Number</Text>
          <TextInput
            style={[
              styles.input,
              errors.whatsappNumber && styles.inputError,
              isReadOnly && styles.inputReadOnly,
            ]}
            placeholder="10-digit WhatsApp number"
            value={formData.whatsappNumber}
            onChangeText={(text) => handleInputChange("whatsappNumber", text)}
            keyboardType="phone-pad"
            maxLength={10}
            editable={!isReadOnly}
          />
          {errors.whatsappNumber && (
            <Text style={styles.errorText}>{errors.whatsappNumber}</Text>
          )}
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.button,
            styles.primaryButton,
            (loading || uploadingImage) && styles.buttonDisabled,
          ]}
          onPress={handleNext}
          disabled={loading || uploadingImage}
        >
          {loading || uploadingImage ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.primaryButtonText}>
                {isReadOnly ? "Next" : "Save & Continue"}
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
      </View>

      {uploadingImage && (
        <View style={styles.uploadingBanner}>
          <ActivityIndicator color="#0078D7" />
          <Text style={styles.uploadingText}>Uploading logo...</Text>
        </View>
      )}

      <View style={{ height: 40 }} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },
  section: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
    marginBottom: 16,
  },
  sectionDescription: {
    fontSize: 13,
    color: "#666",
    marginBottom: 16,
    lineHeight: 18,
  },
  readOnlyBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E7F3FF",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  readOnlyText: {
    flex: 1,
    fontSize: 13,
    color: "#0078D7",
    fontWeight: "600",
  },
  logoUpload: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    overflow: "hidden",
    marginBottom: 8,
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
  logoPlaceholder: {
    alignItems: "center",
  },
  uploadText: {
    fontSize: 12,
    color: "#999",
    marginTop: 8,
  },
  helperText: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    marginTop: 4,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
  },
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
  inputError: {
    borderColor: "#FF3B30",
  },
  inputReadOnly: {
    backgroundColor: "#F0F0F0",
    color: "#666",
  },
  errorText: {
    fontSize: 12,
    color: "#FF3B30",
    marginTop: 4,
  },
  buttonContainer: {
    paddingHorizontal: 16,
    marginTop: 8,
    gap: 12,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryButton: {
    backgroundColor: "#0078D7",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  uploadingBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E7F3FF",
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    gap: 8,
  },
  uploadingText: {
    fontSize: 13,
    color: "#0078D7",
    fontWeight: "600",
  },
});

export default CompanySocialInfoStep;
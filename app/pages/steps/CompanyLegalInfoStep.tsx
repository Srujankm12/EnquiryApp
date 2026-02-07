// steps/CompanyLegalInfoStep.tsx - Step 2: Legal Company Information
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
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

interface CompanyLegalInfoStepProps {
  companyId: string | null;
  userId: string;
  isEditMode: boolean;
  onComplete: (stepNumber: number, data?: any) => void;
  onBack: () => void;
}

interface LegalInfo {
  panNumber: string;
  gstNumber: string;
  msmeNumber: string;
}

const CompanyLegalInfoStep: React.FC<CompanyLegalInfoStepProps> = ({
  companyId,
  userId,
  isEditMode,
  onComplete,
  onBack,
}) => {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [hasExistingData, setHasExistingData] = useState(false);
  const [formData, setFormData] = useState<LegalInfo>({
    panNumber: "",
    gstNumber: "",
    msmeNumber: "",
  });
  const [errors, setErrors] = useState<any>({});

  const API_URL = Constants.expoConfig?.extra?.API_URL;

  useEffect(() => {
    if (companyId) {
      fetchLegalData();
    } else {
      setFetching(false);
    }
  }, [companyId]);

  const fetchLegalData = async () => {
    try {
      setFetching(true);
      const token = await AsyncStorage.getItem("token");

      const response = await fetch(
        `${API_URL}/company/legal/get/${companyId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        const legal = result.data;

        setFormData({
          panNumber: legal.pan_number || "",
          gstNumber: legal.gst_number || "",
          msmeNumber: legal.msme_number || "",
        });

        setHasExistingData(true);
        // If not in edit mode and data exists, make read-only
        setIsReadOnly(!isEditMode);
      } else {
        // No legal data exists yet
        setHasExistingData(false);
        setIsReadOnly(false);
      }
    } catch (error) {
      console.error("Error fetching legal data:", error);
      setHasExistingData(false);
    } finally {
      setFetching(false);
    }
  };

  const handleInputChange = (field: keyof LegalInfo, value: string) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: "" });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: any = {};

    // Legal fields are optional, but validate format if provided
    if (formData.panNumber && formData.panNumber.length !== 10) {
      newErrors.panNumber = "PAN number must be 10 characters";
    }

    if (formData.gstNumber && formData.gstNumber.length !== 15) {
      newErrors.gstNumber = "GST number must be 15 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert(
        "Validation Error",
        "Please correct the errors in the form"
      );
      return;
    }

    if (!companyId) {
      Alert.alert("Error", "Company ID not found");
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");

      const requestData: any = {
        company_id: companyId,
      };

      // Only add fields that have values
      if (formData.panNumber.trim()) {
        requestData.pan_number = formData.panNumber;
      }
      if (formData.gstNumber.trim()) {
        requestData.gst_number = formData.gstNumber;
      }
      if (formData.msmeNumber.trim()) {
        requestData.msme_number = formData.msmeNumber;
      }

      if (hasExistingData) {
        // Update existing legal details
        const response = await fetch(`${API_URL}/company/legal/update`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestData),
        });

        if (!response.ok) {
          throw new Error("Failed to update legal details");
        }

        Alert.alert("Success", "Legal information updated successfully");
      } else {
        // Create new legal details
        const response = await fetch(`${API_URL}/company/legal/create`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestData),
        });

        if (!response.ok) {
          throw new Error("Failed to create legal details");
        }
      }

      onComplete(2);
    } catch (error: any) {
      console.error("Error submitting legal info:", error);
      Alert.alert("Error", error.message || "Failed to save legal information");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    // User can skip this step
    onComplete(2);
  };

  const handleNext = () => {
    if (isReadOnly) {
      // Just move to next step if read-only
      onComplete(2);
    } else {
      handleSubmit();
    }
  };

  if (fetching) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0078D7" />
        <Text style={styles.loadingText}>Loading legal information...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Legal Details (Optional)</Text>
        <Text style={styles.sectionDescription}>
          Provide your company's legal registration details. These are optional
          but recommended for credibility.
        </Text>

        {isReadOnly && (
          <View style={styles.readOnlyBanner}>
            <Ionicons name="lock-closed" size={16} color="#0078D7" />
            <Text style={styles.readOnlyText}>
              Information saved. Click "Next" to continue.
            </Text>
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>PAN Number</Text>
          <TextInput
            style={[
              styles.input,
              errors.panNumber && styles.inputError,
              isReadOnly && styles.inputReadOnly,
            ]}
            placeholder="10-character PAN number"
            value={formData.panNumber}
            onChangeText={(text) =>
              handleInputChange("panNumber", text.toUpperCase())
            }
            maxLength={10}
            autoCapitalize="characters"
            editable={!isReadOnly}
          />
          {errors.panNumber && (
            <Text style={styles.errorText}>{errors.panNumber}</Text>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>GST Number</Text>
          <TextInput
            style={[
              styles.input,
              errors.gstNumber && styles.inputError,
              isReadOnly && styles.inputReadOnly,
            ]}
            placeholder="15-character GST number"
            value={formData.gstNumber}
            onChangeText={(text) =>
              handleInputChange("gstNumber", text.toUpperCase())
            }
            maxLength={15}
            autoCapitalize="characters"
            editable={!isReadOnly}
          />
          {errors.gstNumber && (
            <Text style={styles.errorText}>{errors.gstNumber}</Text>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>MSME Number</Text>
          <TextInput
            style={[
              styles.input,
              errors.msmeNumber && styles.inputError,
              isReadOnly && styles.inputReadOnly,
            ]}
            placeholder="MSME registration number"
            value={formData.msmeNumber}
            onChangeText={(text) => handleInputChange("msmeNumber", text)}
            maxLength={50}
            editable={!isReadOnly}
          />
          {errors.msmeNumber && (
            <Text style={styles.errorText}>{errors.msmeNumber}</Text>
          )}
        </View>
      </View>

      <View style={styles.buttonContainer}>
        {!isReadOnly && (
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleSkip}
          >
            <Text style={styles.secondaryButtonText}>Skip for Now</Text>
            <Ionicons name="arrow-forward" size={20} color="#0078D7" />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.button,
            styles.primaryButton,
            loading && styles.buttonDisabled,
          ]}
          onPress={handleNext}
          disabled={loading}
        >
          {loading ? (
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
    marginBottom: 8,
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
  secondaryButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#0078D7",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButtonText: {
    color: "#0078D7",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default CompanyLegalInfoStep;
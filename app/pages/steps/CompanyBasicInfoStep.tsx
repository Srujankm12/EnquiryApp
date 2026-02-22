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

interface CompanyBasicInfoStepProps {
  businessId: string | null;
  userId: string;
  isEditMode: boolean;
  onComplete: (stepNumber: number, data?: any) => void;
  onBack: () => void;
}

interface BasicInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  businessType: string;
}

const BUSINESS_TYPES = [
  "Agriculture",
  "Wholesale",
  "Retail",
  "Export",
  "Import",
  "Manufacturing",
  "Trading",
  "Other",
];

const CompanyBasicInfoStep: React.FC<CompanyBasicInfoStepProps> = ({
  businessId,
  userId,
  isEditMode,
  onComplete,
  onBack,
}) => {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [isExisting, setIsExisting] = useState(false);
  const [formData, setFormData] = useState<BasicInfo>({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    businessType: "",
  });
  const [errors, setErrors] = useState<any>({});

  const API_URL = Constants.expoConfig?.extra?.API_URL;

  useEffect(() => {
    if (businessId) {
      fetchBusinessData();
    } else {
      setFetching(false);
    }
  }, [businessId]);

  const fetchBusinessData = async () => {
    try {
      setFetching(true);
      const response = await fetch(`${API_URL}/business/get/${businessId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        const result = await response.json();
        const business = result.details;
        setIsExisting(true);
        setFormData({
          name: business.name || "",
          email: business.email || "",
          phone: business.phone || "",
          address: business.address || "",
          city: business.city || "",
          state: business.state || "",
          pincode: business.pincode || "",
          businessType: business.business_type || "",
        });
      }
    } catch (error) {
      console.error("Error fetching business data:", error);
    } finally {
      setFetching(false);
    }
  };

  const handleInputChange = (field: keyof BasicInfo, value: string) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: "" });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: any = {};

    if (!formData.name.trim()) newErrors.name = "Business name is required";
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^\d{10}$/.test(formData.phone)) {
      newErrors.phone = "Invalid phone number (10 digits required)";
    }
    if (!formData.address.trim()) newErrors.address = "Address is required";
    if (!formData.city.trim()) newErrors.city = "City is required";
    if (!formData.state.trim()) newErrors.state = "State is required";
    if (!formData.pincode.trim()) {
      newErrors.pincode = "Pincode is required";
    } else if (!/^\d{6}$/.test(formData.pincode)) {
      newErrors.pincode = "Invalid pincode (6 digits required)";
    }
    if (!formData.businessType.trim())
      newErrors.businessType = "Business type is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert(
        "Validation Error",
        "Please fill all required fields correctly",
      );
      return;
    }

    try {
      setLoading(true);

      if (businessId && (isEditMode || isExisting)) {
        // Update existing business
        const response = await fetch(
          `${API_URL}/business/update/${businessId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: formData.name,
              email: formData.email,
              phone: formData.phone,
              address: formData.address,
              city: formData.city,
              state: formData.state,
              pincode: formData.pincode,
              business_type: formData.businessType,
            }),
          },
        );

        if (!response.ok) throw new Error("Failed to update business");
        onComplete(1, { businessId });
      } else {
        // Create new business
        const response = await fetch(`${API_URL}/business/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: userId,
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            address: formData.address,
            city: formData.city,
            state: formData.state,
            pincode: formData.pincode,
            business_type: formData.businessType,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to create business");
        }

        const result = await response.json();
        const newBusinessId = result.business_id;
        onComplete(1, { businessId: newBusinessId });
      }
    } catch (error: any) {
      console.error("Error submitting basic info:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to save business information",
      );
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0078D7" />
        <Text style={styles.loadingText}>Loading business information...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Business Information</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Business Name *</Text>
          <TextInput
            style={[styles.input, errors.name && styles.inputError]}
            placeholder="Enter business name"
            placeholderTextColor="#999"
            value={formData.name}
            onChangeText={(text) => handleInputChange("name", text)}
          />
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email *</Text>
          <TextInput
            style={[styles.input, errors.email && styles.inputError]}
            placeholder="business@example.com"
            placeholderTextColor="#999"
            value={formData.email}
            onChangeText={(text) => handleInputChange("email", text)}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number *</Text>
          <TextInput
            style={[styles.input, errors.phone && styles.inputError]}
            placeholder="10-digit phone number"
            placeholderTextColor="#999"
            value={formData.phone}
            onChangeText={(text) => handleInputChange("phone", text)}
            keyboardType="phone-pad"
            maxLength={10}
          />
          {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Business Type *</Text>
          <View style={styles.businessTypeContainer}>
            {BUSINESS_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.businessTypeChip,
                  formData.businessType === type &&
                    styles.businessTypeChipActive,
                ]}
                onPress={() => handleInputChange("businessType", type)}
              >
                <Text
                  style={[
                    styles.businessTypeText,
                    formData.businessType === type &&
                      styles.businessTypeTextActive,
                  ]}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {errors.businessType && (
            <Text style={styles.errorText}>{errors.businessType}</Text>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Address Information</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Address *</Text>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              errors.address && styles.inputError,
            ]}
            placeholder="Enter full address"
            placeholderTextColor="#999"
            value={formData.address}
            onChangeText={(text) => handleInputChange("address", text)}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          {errors.address && (
            <Text style={styles.errorText}>{errors.address}</Text>
          )}
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.label}>City *</Text>
            <TextInput
              style={[styles.input, errors.city && styles.inputError]}
              placeholder="City"
              placeholderTextColor="#999"
              value={formData.city}
              onChangeText={(text) => handleInputChange("city", text)}
            />
            {errors.city && (
              <Text style={styles.errorText}>{errors.city}</Text>
            )}
          </View>

          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.label}>State *</Text>
            <TextInput
              style={[styles.input, errors.state && styles.inputError]}
              placeholder="State"
              placeholderTextColor="#999"
              value={formData.state}
              onChangeText={(text) => handleInputChange("state", text)}
            />
            {errors.state && (
              <Text style={styles.errorText}>{errors.state}</Text>
            )}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Pincode *</Text>
          <TextInput
            style={[styles.input, errors.pincode && styles.inputError]}
            placeholder="6-digit pincode"
            placeholderTextColor="#999"
            value={formData.pincode}
            onChangeText={(text) => handleInputChange("pincode", text)}
            keyboardType="number-pad"
            maxLength={6}
          />
          {errors.pincode && (
            <Text style={styles.errorText}>{errors.pincode}</Text>
          )}
        </View>
      </View>

      <View style={styles.buttonContainer}>
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
    marginBottom: 16,
  },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 6 },
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
  inputError: { borderColor: "#FF3B30" },
  textArea: { height: 80, paddingTop: 10 },
  errorText: { fontSize: 12, color: "#FF3B30", marginTop: 4 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  halfWidth: { width: "48%" },
  businessTypeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  businessTypeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    backgroundColor: "#FAFAFA",
  },
  businessTypeChipActive: {
    backgroundColor: "#0078D7",
    borderColor: "#0078D7",
  },
  businessTypeText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
  businessTypeTextActive: {
    color: "#FFFFFF",
  },
  buttonContainer: { paddingHorizontal: 16, marginTop: 8 },
  button: {
    paddingVertical: 16,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryButton: { backgroundColor: "#0078D7" },
  buttonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});

export default CompanyBasicInfoStep;

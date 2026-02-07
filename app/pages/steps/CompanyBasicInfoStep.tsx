// CompanyBasicInfoStep.tsx - WITH APPLICATION STATUS CHECK
// This version checks if application is PENDING/APPROVED and locks all fields

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

interface CompanyBasicInfoStepProps {
  companyId: string | null;
  userId: string;
  isEditMode: boolean;
  onComplete: (stepNumber: number, data?: any) => void;
  onBack: () => void;
}

interface BasicInfo {
  companyName: string;
  email: string;
  phoneNumber: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  date: string;
}

const CompanyBasicInfoStep: React.FC<CompanyBasicInfoStepProps> = ({
  companyId,
  userId,
  isEditMode,
  onComplete,
  onBack,
}) => {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null);
  const [formData, setFormData] = useState<BasicInfo>({
    companyName: "",
    email: "",
    phoneNumber: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    date: "",
  });
  const [errors, setErrors] = useState<any>({});

  const API_URL = Constants.expoConfig?.extra?.API_URL;

  useEffect(() => {
    if (companyId) {
      fetchCompanyDataAndApplicationStatus();
    } else {
      setFetching(false);
    }
  }, [companyId]);

  const fetchCompanyDataAndApplicationStatus = async () => {
    try {
      setFetching(true);
      const token = await AsyncStorage.getItem("token");

      // Fetch company data
      const companyResponse = await fetch(`${API_URL}/company/get/${companyId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (companyResponse.ok) {
        const result = await companyResponse.json();
        const company = result.data;

        const establishmentDate = new Date(company.company_establishment_date);
        const formattedDate = `${String(establishmentDate.getDate()).padStart(2, "0")}/${String(establishmentDate.getMonth() + 1).padStart(2, "0")}/${establishmentDate.getFullYear()}`;

        setFormData({
          companyName: company.company_name,
          email: company.company_email,
          phoneNumber: company.company_phone,
          address: company.company_address,
          city: company.company_city,
          state: company.company_state,
          pincode: company.company_pincode,
          date: formattedDate,
        });
      }

      // ✅ NEW: Fetch application status
      try {
        const appResponse = await fetch(
          `${API_URL}/company/application/get/company/${companyId}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (appResponse.ok) {
          const appResult = await appResponse.json();
          const status = appResult.data?.status;
          setApplicationStatus(status);
          
          console.log("📋 Application status:", status);
          
          // ✅ Force read-only if pending or approved
          if (status === 'pending' || status === 'PENDING' || 
              status === 'approved' || status === 'APPROVED') {
            console.log("🔒 Locking fields - application is", status);
            setIsReadOnly(true);
          } else if (!isEditMode) {
            setIsReadOnly(true);
          }
        }
      } catch (appError) {
        console.log("⚠️ No application found");
        // No application exists - allow editing if not in edit mode
        if (!isEditMode) {
          setIsReadOnly(true);
        }
      }
    } catch (error) {
      console.error("Error fetching company data:", error);
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

    if (!formData.companyName.trim()) newErrors.companyName = "Company name is required";
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }
    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = "Phone number is required";
    } else if (!/^\d{10}$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = "Invalid phone number (10 digits required)";
    }
    if (!formData.address.trim()) newErrors.address = "Address is required";
    if (!formData.city.trim()) newErrors.city = "City is required";
    if (!formData.state.trim()) newErrors.state = "State is required";
    if (!formData.pincode.trim()) {
      newErrors.pincode = "Pincode is required";
    } else if (!/^\d{6}$/.test(formData.pincode)) {
      newErrors.pincode = "Invalid pincode (6 digits required)";
    }
    if (!formData.date.trim()) {
      newErrors.date = "Date is required";
    } else if (!/^\d{2}\/\d{2}\/\d{4}$/.test(formData.date)) {
      newErrors.date = "Invalid date format (DD/MM/YYYY)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const formatDateForBackend = (date: string): string => {
    const [day, month, year] = date.split("/");
    return `${year}-${month}-${day}`;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert("Validation Error", "Please fill all required fields correctly");
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");

      if (companyId && isEditMode) {
        const updateData: any = {
          company_id: companyId,
          company_name: formData.companyName,
          company_email: formData.email,
          company_phone: formData.phoneNumber,
          company_address: formData.address,
          company_city: formData.city,
          company_state: formData.state,
          company_pincode: formData.pincode,
        };

        const response = await fetch(`${API_URL}/company/update/details`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updateData),
        });

        if (!response.ok) throw new Error("Failed to update company");

        Alert.alert("Success", "Company information updated successfully");
        onComplete(1, { companyId });
      } else {
        const createData = {
          user_id: userId,
          company_name: formData.companyName,
          company_email: formData.email,
          company_phone: formData.phoneNumber,
          company_address: formData.address,
          company_city: formData.city,
          company_state: formData.state,
          company_pincode: formData.pincode,
          company_establishment_date: formatDateForBackend(formData.date),
        };

        const response = await fetch(`${API_URL}/company/create`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(createData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to create company");
        }

        const result = await response.json();
        const newCompanyId = result.data.company_id;
        onComplete(1, { companyId: newCompanyId });
      }
    } catch (error: any) {
      console.error("Error submitting basic info:", error);
      Alert.alert("Error", error.message || "Failed to save company information");
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (isReadOnly) {
      onComplete(1, { companyId });
    } else {
      handleSubmit();
    }
  };

  if (fetching) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0078D7" />
        <Text style={styles.loadingText}>Loading company information...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Company Information</Text>

        {/* ✅ Application Status Banners */}
        {(applicationStatus === 'pending' || applicationStatus === 'PENDING') && (
          <View style={styles.applicationBanner}>
            <Ionicons name="hourglass" size={20} color="#856404" />
            <View style={{ flex: 1 }}>
              <Text style={styles.applicationBannerTitle}>Application Under Review</Text>
              <Text style={styles.applicationBannerText}>
                Your application is being reviewed. You cannot edit information while under review.
              </Text>
            </View>
          </View>
        )}

        {(applicationStatus === 'approved' || applicationStatus === 'APPROVED') && (
          <View style={styles.approvedBanner}>
            <Ionicons name="checkmark-circle" size={20} color="#155724" />
            <View style={{ flex: 1 }}>
              <Text style={styles.approvedBannerTitle}>Application Approved</Text>
              <Text style={styles.approvedBannerText}>
                Your application has been approved. Information is locked.
              </Text>
            </View>
          </View>
        )}

        {isReadOnly && !applicationStatus && (
          <View style={styles.readOnlyBanner}>
            <Ionicons name="lock-closed" size={16} color="#0078D7" />
            <Text style={styles.readOnlyText}>
              Information saved. Click "Next" to continue.
            </Text>
          </View>
        )}

        {/* Form fields remain the same... */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Company Name *</Text>
          <TextInput
            style={[styles.input, errors.companyName && styles.inputError, isReadOnly && styles.inputReadOnly]}
            placeholder="Enter company name"
            value={formData.companyName}
            onChangeText={(text) => handleInputChange("companyName", text)}
            editable={!isReadOnly}
          />
          {errors.companyName && <Text style={styles.errorText}>{errors.companyName}</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email *</Text>
          <TextInput
            style={[styles.input, errors.email && styles.inputError, isReadOnly && styles.inputReadOnly]}
            placeholder="company@example.com"
            value={formData.email}
            onChangeText={(text) => handleInputChange("email", text)}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!isReadOnly}
          />
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number *</Text>
          <TextInput
            style={[styles.input, errors.phoneNumber && styles.inputError, isReadOnly && styles.inputReadOnly]}
            placeholder="10-digit phone number"
            value={formData.phoneNumber}
            onChangeText={(text) => handleInputChange("phoneNumber", text)}
            keyboardType="phone-pad"
            maxLength={10}
            editable={!isReadOnly}
          />
          {errors.phoneNumber && <Text style={styles.errorText}>{errors.phoneNumber}</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Establishment Date * (DD/MM/YYYY)</Text>
          <TextInput
            style={[styles.input, errors.date && styles.inputError, isReadOnly && styles.inputReadOnly]}
            placeholder="DD/MM/YYYY"
            value={formData.date}
            onChangeText={(text) => handleInputChange("date", text)}
            maxLength={10}
            editable={!isReadOnly}
          />
          {errors.date && <Text style={styles.errorText}>{errors.date}</Text>}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Address Information</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Address *</Text>
          <TextInput
            style={[styles.input, styles.textArea, errors.address && styles.inputError, isReadOnly && styles.inputReadOnly]}
            placeholder="Enter full address"
            value={formData.address}
            onChangeText={(text) => handleInputChange("address", text)}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            editable={!isReadOnly}
          />
          {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.label}>City *</Text>
            <TextInput
              style={[styles.input, errors.city && styles.inputError, isReadOnly && styles.inputReadOnly]}
              placeholder="City"
              value={formData.city}
              onChangeText={(text) => handleInputChange("city", text)}
              editable={!isReadOnly}
            />
            {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
          </View>

          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.label}>State *</Text>
            <TextInput
              style={[styles.input, errors.state && styles.inputError, isReadOnly && styles.inputReadOnly]}
              placeholder="State"
              value={formData.state}
              onChangeText={(text) => handleInputChange("state", text)}
              editable={!isReadOnly}
            />
            {errors.state && <Text style={styles.errorText}>{errors.state}</Text>}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Pincode *</Text>
          <TextInput
            style={[styles.input, errors.pincode && styles.inputError, isReadOnly && styles.inputReadOnly]}
            placeholder="6-digit pincode"
            value={formData.pincode}
            onChangeText={(text) => handleInputChange("pincode", text)}
            keyboardType="number-pad"
            maxLength={6}
            editable={!isReadOnly}
          />
          {errors.pincode && <Text style={styles.errorText}>{errors.pincode}</Text>}
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton, loading && styles.buttonDisabled]}
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
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  loadingText: { marginTop: 12, fontSize: 14, color: "#666" },
  section: { backgroundColor: "#FFFFFF", padding: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#000", marginBottom: 16 },
  
  // ✅ Application status banners
  applicationBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFF3CD",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#856404",
  },
  applicationBannerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#856404",
    marginBottom: 4,
  },
  applicationBannerText: {
    fontSize: 12,
    color: "#856404",
    lineHeight: 16,
  },
  approvedBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#D4EDDA",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#155724",
  },
  approvedBannerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#155724",
    marginBottom: 4,
  },
  approvedBannerText: {
    fontSize: 12,
    color: "#155724",
    lineHeight: 16,
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
  readOnlyText: { flex: 1, fontSize: 13, color: "#0078D7", fontWeight: "600" },
  
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
  inputReadOnly: { backgroundColor: "#F0F0F0", color: "#666" },
  textArea: { height: 80, paddingTop: 10 },
  errorText: { fontSize: 12, color: "#FF3B30", marginTop: 4 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  halfWidth: { width: "48%" },
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
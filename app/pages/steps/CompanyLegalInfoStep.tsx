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

interface CompanyLegalInfoStepProps {
  businessId: string | null;
  userId: string;
  isEditMode: boolean;
  onComplete: (stepNumber: number, data?: any) => void;
  onBack: () => void;
}

interface LegalInfo {
  aadhaar: string;
  pan: string;
  exportImport: string;
  msme: string;
  fassi: string;
  gst: string;
}

const CompanyLegalInfoStep: React.FC<CompanyLegalInfoStepProps> = ({
  businessId,
  userId,
  isEditMode,
  onComplete,
  onBack,
}) => {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [isExisting, setIsExisting] = useState(false);
  const [formData, setFormData] = useState<LegalInfo>({
    aadhaar: "",
    pan: "",
    exportImport: "",
    msme: "",
    fassi: "",
    gst: "",
  });

  const API_URL = Constants.expoConfig?.extra?.API_URL;

  useEffect(() => {
    if (businessId) {
      fetchLegalData();
    } else {
      setFetching(false);
    }
  }, [businessId]);

  const fetchLegalData = async () => {
    try {
      setFetching(true);
      const response = await fetch(
        `${API_URL}/business/legal/get/${businessId}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        },
      );

      if (response.ok) {
        const result = await response.json();
        const legal = result.details;
        setIsExisting(true);
        setFormData({
          aadhaar: legal.aadhaar || "",
          pan: legal.pan || "",
          exportImport: legal.export_import || "",
          msme: legal.msme || "",
          fassi: legal.fassi || "",
          gst: legal.gst || "",
        });
      }
    } catch (error) {
      console.error("Error fetching legal data:", error);
    } finally {
      setFetching(false);
    }
  };

  const handleInputChange = (field: keyof LegalInfo, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async () => {
    if (!businessId) {
      Alert.alert("Error", "Business ID not found. Please complete step 1 first.");
      return;
    }

    try {
      setLoading(true);

      const payload: any = {
        id: businessId,
      };

      if (formData.aadhaar.trim()) payload.aadhaar = formData.aadhaar.trim();
      if (formData.pan.trim()) payload.pan = formData.pan.trim();
      if (formData.exportImport.trim()) payload.export_import = formData.exportImport.trim();
      if (formData.msme.trim()) payload.msme = formData.msme.trim();
      if (formData.fassi.trim()) payload.fassi = formData.fassi.trim();
      if (formData.gst.trim()) payload.gst = formData.gst.trim();

      if (isExisting || isEditMode) {
        // Update existing legal details
        const response = await fetch(
          `${API_URL}/business/legal/update/${businessId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );

        if (!response.ok) throw new Error("Failed to update legal details");
      } else {
        // Create new legal details
        const response = await fetch(`${API_URL}/business/legal/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) throw new Error("Failed to create legal details");
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
    onComplete(2);
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
        <Text style={styles.sectionTitle}>Legal Information</Text>
        <Text style={styles.sectionSubtitle}>
          Add your legal documents (optional). You can fill these later.
        </Text>

        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Ionicons name="card-outline" size={16} color="#666" />
            <Text style={styles.label}>Aadhaar Number</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Enter 12-digit Aadhaar number"
            placeholderTextColor="#999"
            value={formData.aadhaar}
            onChangeText={(text) => handleInputChange("aadhaar", text)}
            keyboardType="number-pad"
            maxLength={12}
          />
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Ionicons name="document-text-outline" size={16} color="#666" />
            <Text style={styles.label}>PAN Number</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Enter PAN number (e.g., ABCDE1234F)"
            placeholderTextColor="#999"
            value={formData.pan}
            onChangeText={(text) => handleInputChange("pan", text.toUpperCase())}
            autoCapitalize="characters"
            maxLength={10}
          />
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Ionicons name="receipt-outline" size={16} color="#666" />
            <Text style={styles.label}>GST Number</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Enter GST number"
            placeholderTextColor="#999"
            value={formData.gst}
            onChangeText={(text) => handleInputChange("gst", text.toUpperCase())}
            autoCapitalize="characters"
            maxLength={15}
          />
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Ionicons name="business-outline" size={16} color="#666" />
            <Text style={styles.label}>MSME Number</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Enter MSME/Udyam registration number"
            placeholderTextColor="#999"
            value={formData.msme}
            onChangeText={(text) => handleInputChange("msme", text)}
          />
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Ionicons name="nutrition-outline" size={16} color="#666" />
            <Text style={styles.label}>FSSAI Number</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Enter FSSAI license number"
            placeholderTextColor="#999"
            value={formData.fassi}
            onChangeText={(text) => handleInputChange("fassi", text)}
            maxLength={14}
          />
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Ionicons name="globe-outline" size={16} color="#666" />
            <Text style={styles.label}>Export/Import Code</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Enter IEC code"
            placeholderTextColor="#999"
            value={formData.exportImport}
            onChangeText={(text) => handleInputChange("exportImport", text)}
            maxLength={10}
          />
        </View>
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
    gap: 6,
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

export default CompanyLegalInfoStep;

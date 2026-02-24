import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  ScrollView,
  Alert,
  RefreshControl,
  TextInput,
  Image,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";
import Constants from "expo-constants";
import * as ImagePicker from "expo-image-picker";

const { width } = Dimensions.get("window");
const API_URL = Constants.expoConfig?.extra?.API_URL;
const S3_URL = Constants.expoConfig?.extra?.S3_FETCH_URL;
const CLOUDFRONT_URL = Constants.expoConfig?.extra?.CLOUDFRONT_URL;

const getImageUri = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const path = url.startsWith("/") ? url : `/${url}`;
  if (CLOUDFRONT_URL) return `${CLOUDFRONT_URL}${path}`;
  return `${S3_URL}${path}`;
};

interface BusinessFields {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  business_type: string;
  profile_image: string | null;
}

interface LegalFields {
  aadhaar: string;
  pan: string;
  gst: string;
  msme: string;
  fassi: string;
  export_import: string;
}

interface SocialFields {
  linkedin: string;
  instagram: string;
  facebook: string;
  website: string;
  telegram: string;
  youtube: string;
  x: string;
}

const EditBusinessDetails: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string>("");

  const [expandedSection, setExpandedSection] = useState<string | null>("business");

  const [business, setBusiness] = useState<BusinessFields>({
    name: "", email: "", phone: "", address: "", city: "", state: "", pincode: "", business_type: "", profile_image: null,
  });
  const [legal, setLegal] = useState<LegalFields>({
    aadhaar: "", pan: "", gst: "", msme: "", fassi: "", export_import: "",
  });
  const [social, setSocial] = useState<SocialFields>({
    linkedin: "", instagram: "", facebook: "", website: "", telegram: "", youtube: "", x: "",
  });

  useEffect(() => {
    fetchAllDetails();
  }, []);

  const fetchAllDetails = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Error", "Please login to continue");
        router.replace("/pages/loginMail");
        return;
      }

      const decoded: any = jwtDecode(token);
      const userId = decoded.user_id;

      // Get user's business ID
      let bId = decoded.business_id || (await AsyncStorage.getItem("companyId")) || "";

      if (!bId) {
        try {
          const bizIdRes = await fetch(`${API_URL}/business/get/user/${userId}`, {
            headers: { "Content-Type": "application/json" },
          });
          if (bizIdRes.ok) {
            const result = await bizIdRes.json();
            bId = result.business_id;
          }
        } catch {}
      }

      if (!bId) {
        setLoading(false);
        return;
      }

      setBusinessId(bId);
      await AsyncStorage.setItem("businessId", bId);

      // Fetch complete business details
      try {
        const completeRes = await fetch(`${API_URL}/business/get/complete/${bId}`, {
          headers: { "Content-Type": "application/json" },
        });

        if (completeRes.ok) {
          const result = await completeRes.json();
          const details = result.details;

          if (details.business_details) {
            const bd = details.business_details;
            setBusiness({
              name: bd.name || "", email: bd.email || "", phone: bd.phone || "",
              address: bd.address || "", city: bd.city || "", state: bd.state || "",
              pincode: bd.pincode || "", business_type: bd.business_type || "",
              profile_image: bd.profile_image || null,
            });
          }
          if (details.legal_details) {
            const ld = details.legal_details;
            setLegal({
              aadhaar: ld.aadhaar || "", pan: ld.pan || "", gst: ld.gst || "",
              msme: ld.msme || "", fassi: ld.fassi || "", export_import: ld.export_import || "",
            });
          }
          if (details.social_details) {
            const sd = details.social_details;
            setSocial({
              linkedin: sd.linkedin || "", instagram: sd.instagram || "",
              facebook: sd.facebook || "", website: sd.website || "",
              telegram: sd.telegram || "", youtube: sd.youtube || "", x: sd.x || "",
            });
          }
        } else {
          // Fallback: fetch individually
          const [bizRes, legalRes, socialRes] = await Promise.allSettled([
            fetch(`${API_URL}/business/get/${bId}`, { headers: { "Content-Type": "application/json" } }),
            fetch(`${API_URL}/business/legal/get/${bId}`, { headers: { "Content-Type": "application/json" } }),
            fetch(`${API_URL}/business/social/get/${bId}`, { headers: { "Content-Type": "application/json" } }),
          ]);

          if (bizRes.status === "fulfilled" && bizRes.value.ok) {
            const r = await bizRes.value.json();
            const bd = r.details || r.business || r;
            setBusiness({
              name: bd.name || "", email: bd.email || "", phone: bd.phone || "",
              address: bd.address || "", city: bd.city || "", state: bd.state || "",
              pincode: bd.pincode || "", business_type: bd.business_type || "",
              profile_image: bd.profile_image || null,
            });
          }
          if (legalRes.status === "fulfilled" && legalRes.value.ok) {
            const r = await legalRes.value.json();
            const ld = r.details || r;
            setLegal({
              aadhaar: ld.aadhaar || "", pan: ld.pan || "", gst: ld.gst || "",
              msme: ld.msme || "", fassi: ld.fassi || "", export_import: ld.export_import || "",
            });
          }
          if (socialRes.status === "fulfilled" && socialRes.value.ok) {
            const r = await socialRes.value.json();
            const sd = r.details || r;
            setSocial({
              linkedin: sd.linkedin || "", instagram: sd.instagram || "",
              facebook: sd.facebook || "", website: sd.website || "",
              telegram: sd.telegram || "", youtube: sd.youtube || "", x: sd.x || "",
            });
          }
        }
      } catch (error) {
        console.error("Error fetching details:", error);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllDetails();
  };

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permission Required", "Please allow access to your photo library.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const uploadProfileImage = async (imageUri: string) => {
    try {
      setSaving("photo");
      const token = await AsyncStorage.getItem("token");
      const formData = new FormData();
      const filename = imageUri.split("/").pop() || "profile.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : "image/jpeg";

      formData.append("profile_image", {
        uri: imageUri,
        name: filename,
        type,
      } as any);

      const res = await fetch(`${API_URL}/business/update/profile-image/${businessId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (res.ok) {
        setBusiness((prev) => ({ ...prev, profile_image: imageUri }));
        Alert.alert("Success", "Profile photo updated successfully");
      } else {
        Alert.alert("Error", "Failed to upload photo. Please try again.");
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      Alert.alert("Error", "Failed to upload photo");
    } finally {
      setSaving(null);
    }
  };

  const saveBusinessDetails = async () => {
    try {
      setSaving("business");
      const token = await AsyncStorage.getItem("token");

      const res = await fetch(`${API_URL}/business/update/${businessId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: business.name,
          email: business.email,
          phone: business.phone,
          address: business.address,
          city: business.city,
          state: business.state,
          pincode: business.pincode,
          business_type: business.business_type,
        }),
      });

      if (res.ok) {
        Alert.alert("Success", "Business details updated successfully");
      } else {
        Alert.alert("Error", "Failed to update business details");
      }
    } catch (error) {
      console.error("Error saving business:", error);
      Alert.alert("Error", "Failed to save business details");
    } finally {
      setSaving(null);
    }
  };

  const saveLegalDetails = async () => {
    try {
      setSaving("legal");
      const token = await AsyncStorage.getItem("token");

      const res = await fetch(`${API_URL}/business/legal/update/${businessId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(legal),
      });

      if (res.ok) {
        Alert.alert("Success", "Legal details updated successfully");
      } else {
        Alert.alert("Error", "Failed to update legal details");
      }
    } catch (error) {
      console.error("Error saving legal:", error);
      Alert.alert("Error", "Failed to save legal details");
    } finally {
      setSaving(null);
    }
  };

  const saveSocialDetails = async () => {
    try {
      setSaving("social");
      const token = await AsyncStorage.getItem("token");

      const res = await fetch(`${API_URL}/business/social/update/${businessId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(social),
      });

      if (res.ok) {
        Alert.alert("Success", "Social details updated successfully");
      } else {
        Alert.alert("Error", "Failed to update social details");
      }
    } catch (error) {
      console.error("Error saving social:", error);
      Alert.alert("Error", "Failed to save social details");
    } finally {
      setSaving(null);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#177DDF" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Business Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#177DDF" />
          <Text style={styles.loaderText}>Loading details...</Text>
        </View>
      </View>
    );
  }

  const profileImageUri = business.profile_image?.startsWith("file://")
    ? business.profile_image
    : getImageUri(business.profile_image);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#177DDF" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Business Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#177DDF"]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Company Profile Photo */}
        <View style={styles.photoSection}>
          <TouchableOpacity style={styles.photoContainer} onPress={pickImage} activeOpacity={0.7}>
            {profileImageUri ? (
              <Image source={{ uri: `${profileImageUri}?t=${Date.now()}` }} style={styles.profilePhoto} />
            ) : (
              <View style={[styles.profilePhoto, styles.photoPlaceholder]}>
                <Ionicons name="business" size={48} color="#177DDF" />
              </View>
            )}
            <View style={styles.cameraOverlay}>
              {saving === "photo" ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="camera" size={18} color="#FFFFFF" />
              )}
            </View>
          </TouchableOpacity>
          <Text style={styles.photoLabel}>Tap to change company photo</Text>
          {business.name ? <Text style={styles.companyNameLabel}>{business.name}</Text> : null}
        </View>

        {/* Business Details Section */}
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection("business")}
          activeOpacity={0.7}
        >
          <View style={styles.sectionHeaderLeft}>
            <View style={[styles.sectionIcon, { backgroundColor: "#E3F2FD" }]}>
              <Ionicons name="business" size={20} color="#177DDF" />
            </View>
            <Text style={styles.sectionTitle}>Business Details</Text>
          </View>
          <Ionicons
            name={expandedSection === "business" ? "chevron-up" : "chevron-down"}
            size={22}
            color="#666"
          />
        </TouchableOpacity>

        {expandedSection === "business" && (
          <View style={styles.sectionContent}>
            <InputField label="Business Name" value={business.name} onChangeText={(v) => setBusiness({ ...business, name: v })} icon="storefront-outline" />
            <InputField label="Email" value={business.email} onChangeText={(v) => setBusiness({ ...business, email: v })} icon="mail-outline" keyboardType="email-address" />
            <InputField label="Phone" value={business.phone} onChangeText={(v) => setBusiness({ ...business, phone: v })} icon="call-outline" keyboardType="phone-pad" />
            <InputField label="Business Type" value={business.business_type} onChangeText={(v) => setBusiness({ ...business, business_type: v })} icon="briefcase-outline" />
            <InputField label="Address" value={business.address} onChangeText={(v) => setBusiness({ ...business, address: v })} icon="location-outline" multiline />
            <InputField label="City" value={business.city} onChangeText={(v) => setBusiness({ ...business, city: v })} icon="navigate-outline" />
            <InputField label="State" value={business.state} onChangeText={(v) => setBusiness({ ...business, state: v })} icon="map-outline" />
            <InputField label="Pincode" value={business.pincode} onChangeText={(v) => setBusiness({ ...business, pincode: v })} icon="pin-outline" keyboardType="number-pad" />

            <TouchableOpacity
              style={[styles.saveButton, saving === "business" && styles.saveButtonDisabled]}
              onPress={saveBusinessDetails}
              disabled={saving === "business"}
            >
              {saving === "business" ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Save Business Details</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Legal Details Section */}
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection("legal")}
          activeOpacity={0.7}
        >
          <View style={styles.sectionHeaderLeft}>
            <View style={[styles.sectionIcon, { backgroundColor: "#FFF3E0" }]}>
              <Ionicons name="document-text" size={20} color="#FF9500" />
            </View>
            <Text style={styles.sectionTitle}>Legal Details</Text>
          </View>
          <Ionicons
            name={expandedSection === "legal" ? "chevron-up" : "chevron-down"}
            size={22}
            color="#666"
          />
        </TouchableOpacity>

        {expandedSection === "legal" && (
          <View style={styles.sectionContent}>
            <InputField label="Aadhaar Number" value={legal.aadhaar} onChangeText={(v) => setLegal({ ...legal, aadhaar: v })} icon="card-outline" keyboardType="number-pad" />
            <InputField label="PAN Number" value={legal.pan} onChangeText={(v) => setLegal({ ...legal, pan: v })} icon="document-outline" autoCapitalize="characters" />
            <InputField label="GST Number" value={legal.gst} onChangeText={(v) => setLegal({ ...legal, gst: v })} icon="receipt-outline" autoCapitalize="characters" />
            <InputField label="MSME Number" value={legal.msme} onChangeText={(v) => setLegal({ ...legal, msme: v })} icon="business-outline" />
            <InputField label="FSSAI Number" value={legal.fassi} onChangeText={(v) => setLegal({ ...legal, fassi: v })} icon="nutrition-outline" />
            <InputField label="Export/Import Code" value={legal.export_import} onChangeText={(v) => setLegal({ ...legal, export_import: v })} icon="globe-outline" />

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: "#FF9500" }, saving === "legal" && styles.saveButtonDisabled]}
              onPress={saveLegalDetails}
              disabled={saving === "legal"}
            >
              {saving === "legal" ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Save Legal Details</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Social Details Section */}
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection("social")}
          activeOpacity={0.7}
        >
          <View style={styles.sectionHeaderLeft}>
            <View style={[styles.sectionIcon, { backgroundColor: "#F3E5F5" }]}>
              <Ionicons name="share-social" size={20} color="#9C27B0" />
            </View>
            <Text style={styles.sectionTitle}>Social Details</Text>
          </View>
          <Ionicons
            name={expandedSection === "social" ? "chevron-up" : "chevron-down"}
            size={22}
            color="#666"
          />
        </TouchableOpacity>

        {expandedSection === "social" && (
          <View style={styles.sectionContent}>
            <InputField label="LinkedIn" value={social.linkedin} onChangeText={(v) => setSocial({ ...social, linkedin: v })} icon="logo-linkedin" placeholder="https://linkedin.com/in/..." />
            <InputField label="Instagram" value={social.instagram} onChangeText={(v) => setSocial({ ...social, instagram: v })} icon="logo-instagram" placeholder="https://instagram.com/..." />
            <InputField label="Facebook" value={social.facebook} onChangeText={(v) => setSocial({ ...social, facebook: v })} icon="logo-facebook" placeholder="https://facebook.com/..." />
            <InputField label="YouTube" value={social.youtube} onChangeText={(v) => setSocial({ ...social, youtube: v })} icon="logo-youtube" placeholder="https://youtube.com/..." />
            <InputField label="X (Twitter)" value={social.x} onChangeText={(v) => setSocial({ ...social, x: v })} icon="logo-twitter" placeholder="https://x.com/..." />
            <InputField label="Telegram" value={social.telegram} onChangeText={(v) => setSocial({ ...social, telegram: v })} icon="paper-plane-outline" placeholder="https://t.me/..." />
            <InputField label="Website" value={social.website} onChangeText={(v) => setSocial({ ...social, website: v })} icon="globe-outline" placeholder="https://yourwebsite.com" />

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: "#9C27B0" }, saving === "social" && styles.saveButtonDisabled]}
              onPress={saveSocialDetails}
              disabled={saving === "social"}
            >
              {saving === "social" ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Save Social Details</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const InputField = ({
  label,
  value,
  onChangeText,
  icon,
  placeholder,
  keyboardType,
  multiline,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  icon: keyof typeof Ionicons.glyphMap;
  placeholder?: string;
  keyboardType?: any;
  multiline?: boolean;
  autoCapitalize?: any;
}) => (
  <View style={styles.inputGroup}>
    <Text style={styles.inputLabel}>{label}</Text>
    <View style={[styles.inputContainer, multiline && { minHeight: 80, alignItems: "flex-start" }]}>
      <Ionicons name={icon} size={18} color="#999" style={{ marginTop: multiline ? 12 : 0 }} />
      <TextInput
        style={[styles.input, multiline && { minHeight: 60, textAlignVertical: "top" }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || `Enter ${label.toLowerCase()}`}
        placeholderTextColor="#BBB"
        keyboardType={keyboardType}
        multiline={multiline}
        autoCapitalize={autoCapitalize || "none"}
      />
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  header: {
    backgroundColor: "#177DDF",
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loaderText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  scrollView: {
    flex: 1,
  },
  // Photo Section
  photoSection: {
    alignItems: "center",
    paddingVertical: 24,
    backgroundColor: "#FFFFFF",
    marginBottom: 8,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  photoContainer: {
    position: "relative",
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
  },
  profilePhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "#177DDF",
  },
  photoPlaceholder: {
    backgroundColor: "#E3F2FD",
    justifyContent: "center",
    alignItems: "center",
  },
  cameraOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#177DDF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  photoLabel: {
    fontSize: 13,
    color: "#999",
  },
  companyNameLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    marginTop: 6,
  },
  // Section Header
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginTop: 8,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  // Section Content
  sectionContent: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingBottom: 20,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  // Input Fields
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555",
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E8ECF0",
    paddingHorizontal: 12,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#1A1A1A",
    paddingVertical: 12,
  },
  // Save Button
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#177DDF",
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 8,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});

export default EditBusinessDetails;

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
import { useSafeAreaInsets } from "react-native-safe-area-context";

const API_URL = Constants.expoConfig?.extra?.API_URL;
const CLOUDFRONT_URL = Constants.expoConfig?.extra?.CLOUDFRONT_URL;
const S3_URL = Constants.expoConfig?.extra?.S3_FETCH_URL;

const getImageUri = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const path = url.startsWith('/') ? url : `/${url}`;
  if (CLOUDFRONT_URL) return `${CLOUDFRONT_URL}${path}`;
  return `${S3_URL}${path}`;
};

interface DecodedToken { user_id: string; exp?: number; }
interface FieldErrors { firstName?: string; email?: string; phone?: string; }

// ── Reusable Input Field ──────────────────────────────────────────────────────
const InputField = ({
  icon, label, value, onChangeText, keyboardType, error, placeholder, secure, onToggleSecure, showEye,
}: {
  icon: keyof typeof Ionicons.glyphMap; label: string; value: string;
  onChangeText: (t: string) => void; keyboardType?: any;
  error?: string; placeholder?: string; secure?: boolean;
  onToggleSecure?: () => void; showEye?: boolean;
}) => {
  const [focused, setFocused] = useState(false);
  return (
    <View style={iStyles.fieldGroup}>
      <Text style={iStyles.label}>{label}</Text>
      <View style={[iStyles.row, focused && iStyles.rowFocused, !!error && iStyles.rowError]}>
        <View style={[iStyles.iconWrap, { backgroundColor: error ? '#FEF2F2' : '#EBF5FF' }]}>
          <Ionicons name={icon} size={16} color={error ? '#EF4444' : '#0078D7'} />
        </View>
        <TextInput
          style={iStyles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder || label}
          placeholderTextColor="#CBD5E1"
          keyboardType={keyboardType}
          secureTextEntry={secure}
          autoCapitalize="none"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {showEye && (
          <TouchableOpacity style={iStyles.eyeBtn} onPress={onToggleSecure}>
            <Ionicons name={secure ? "eye-off-outline" : "eye-outline"} size={18} color="#94A3B8" />
          </TouchableOpacity>
        )}
        {value.trim() && !error && (
          <View style={iStyles.checkWrap}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
          </View>
        )}
      </View>
      {error ? <Text style={iStyles.error}><Ionicons name="alert-circle" size={11} color="#EF4444" /> {error}</Text> : null}
    </View>
  );
};

const iStyles = StyleSheet.create({
  fieldGroup: { marginBottom: 14 },
  label: { fontSize: 10, fontWeight: '800', color: '#64748B', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 7 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7F9FC', borderRadius: 14, borderWidth: 1.5, borderColor: '#E2E8F0', paddingHorizontal: 10 },
  rowFocused: { borderColor: '#0078D7', backgroundColor: '#EBF5FF' },
  rowError: { borderColor: '#EF4444', backgroundColor: '#FFF5F5' },
  iconWrap: { width: 30, height: 30, borderRadius: 9, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  input: { flex: 1, fontSize: 14, color: '#0F172A', fontWeight: '600', paddingVertical: 13 },
  eyeBtn: { padding: 8 },
  checkWrap: { marginLeft: 6 },
  error: { fontSize: 11, color: '#EF4444', marginTop: 6, fontWeight: '600' },
});

// ── Main Screen ───────────────────────────────────────────────────────────────
const UpdateProfileDetailsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [userId, setUserId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => { loadUserData(); }, []);

  const clearError = (field: keyof FieldErrors) => {
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const loadUserData = async () => {
    try {
      setLoadingData(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) { Alert.alert("Session Expired", "Please login again."); router.replace("/pages/loginMail" as any); return; }
      const decoded = jwtDecode<DecodedToken>(token);
      setUserId(decoded.user_id);
      try {
        const res = await axios.get(`${API_URL}/user/get/user/${decoded.user_id}`, { headers: { Authorization: `Bearer ${token}` } });
        const user = res.data?.user || res.data;
        if (user) {
          if (user.first_name) setFirstName(user.first_name);
          if (user.last_name) setLastName(user.last_name);
          if (user.email) setEmail(user.email);
          if (user.phone) setPhone(user.phone);
          if (user.profile_image) { const u = getImageUri(user.profile_image); if (u) setProfileImage(`${u}?t=${Date.now()}`); }
        }
      } catch { }
    } catch { Alert.alert("Error", "Failed to load profile."); router.replace("/pages/loginMail" as any); }
    finally { setLoadingData(false); }
  };

  const handlePickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert("Permission Required", "Please allow access to your photos."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled) { setProfileImage(result.assets[0].uri); await handleUploadImage(result.assets[0].uri); }
  };

  const handleUploadImage = async (uri: string) => {
    if (!userId) return;
    setImageUploading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const presignedRes = await axios.get(`${API_URL}/user/get/presigned/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
      const uploadUrl: string = presignedRes.data.url;
      const blob = await (await fetch(uri)).blob();
      const s3Res = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": "image/png" }, body: blob });
      if (!s3Res.ok) throw new Error("S3 upload failed");
      await axios.put(`${API_URL}/user/update/image/${userId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      Alert.alert("Done", "Profile photo updated!");
    } catch { Alert.alert("Upload Failed", "Could not update profile photo."); setProfileImage(null); }
    finally { setImageUploading(false); }
  };

  const validate = (): boolean => {
    const e: FieldErrors = {};
    if (!firstName.trim()) e.firstName = "First name is required";
    if (!email.trim()) e.email = "Email is required";
    else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim())) e.email = "Enter a valid email";
    if (!phone.trim()) e.phone = "Phone number is required";
    else if (!/^\d{7,15}$/.test(phone.trim())) e.phone = "Phone must be 7–15 digits";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const token = await AsyncStorage.getItem("token");
    if (!token || !userId) { Alert.alert("Session Expired", "Please login again."); router.replace("/pages/loginMail" as any); return; }
    const body: Record<string, string> = { first_name: firstName.trim(), email: email.trim(), phone: phone.trim() };
    if (lastName.trim()) body.last_name = lastName.trim();
    try {
      setUpdating(true);
      const res = await axios.put(`${API_URL}/user/update/details/${userId}`, body, { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, timeout: 10000 });
      Alert.alert("Success ✓", res.data.message || "Profile updated!", [{ text: "OK", onPress: () => router.back() }]);
    } catch (error: any) {
      const msg: string = error.response?.data?.error ?? "";
      if (msg.toLowerCase().includes("email")) setErrors(prev => ({ ...prev, email: "This email is already in use" }));
      else if (msg.toLowerCase().includes("phone")) setErrors(prev => ({ ...prev, phone: "This phone is already in use" }));
      else Alert.alert("Failed", msg || "Could not update profile.");
    } finally { setUpdating(false); }
  };

  if (loadingData) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0060B8" />
        <View style={[styles.headerWrapper, { paddingTop: insets.top }]}>
          <View style={styles.orb1} /><View style={styles.orb2} />
          <View style={styles.headerInner}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.eyebrow}>MY ACCOUNT</Text>
              <Text style={styles.headerTitle}>Update Profile</Text>
            </View>
          </View>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14 }}>
          <ActivityIndicator size="large" color="#0078D7" />
          <Text style={{ color: '#94A3B8', fontSize: 13, fontWeight: '500' }}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0060B8" />

      {/* ── Premium Header ── */}
      <View style={[styles.headerWrapper, { paddingTop: insets.top }]}>
        <View style={styles.orb1} /><View style={styles.orb2} />
        <View style={styles.headerInner}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.eyebrow}>MY ACCOUNT</Text>
            <Text style={styles.headerTitle}>Update Profile</Text>
          </View>
          <TouchableOpacity
            style={[styles.saveHeaderBtn, (updating || imageUploading) && { opacity: 0.5 }]}
            onPress={handleSave}
            disabled={updating || imageUploading}
          >
            {updating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveHeaderBtnText}>Save</Text>}
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Avatar ── */}
          <View style={styles.avatarSection}>
            <TouchableOpacity style={styles.avatarWrap} onPress={handlePickImage} disabled={imageUploading} activeOpacity={0.85}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.avatar} resizeMode="cover" />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person-outline" size={36} color="#0078D7" />
                </View>
              )}
              <View style={styles.avatarCameraBtn}>
                {imageUploading ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="camera" size={14} color="#fff" />}
              </View>
            </TouchableOpacity>
            <Text style={styles.avatarHint}>{imageUploading ? "Uploading photo…" : "Tap avatar to change photo"}</Text>
          </View>

          {/* ── Personal Details Card ── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconWrap, { backgroundColor: '#EBF5FF' }]}>
                <Ionicons name="person-outline" size={16} color="#0078D7" />
              </View>
              <Text style={styles.cardTitle}>Personal Information</Text>
            </View>

            <InputField icon="person-outline" label="First Name *" value={firstName} onChangeText={v => { setFirstName(v); clearError('firstName'); }} error={errors.firstName} placeholder="Enter first name" />
            <InputField icon="person-outline" label="Last Name (optional)" value={lastName} onChangeText={setLastName} placeholder="Enter last name" />
          </View>

          {/* ── Contact Card ── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconWrap, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="call-outline" size={16} color="#16A34A" />
              </View>
              <Text style={styles.cardTitle}>Contact Details</Text>
            </View>

            <InputField icon="mail-outline" label="Email Address *" value={email} onChangeText={v => { setEmail(v); clearError('email'); }} keyboardType="email-address" error={errors.email} placeholder="email@example.com" />
            <InputField icon="call-outline" label="Phone Number *" value={phone} onChangeText={v => { setPhone(v); clearError('phone'); }} keyboardType="phone-pad" error={errors.phone} placeholder="+91 00000 00000" />
          </View>

          {/* ── Save button ── */}
          <TouchableOpacity
            style={[styles.saveBtn, (updating || imageUploading) && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={updating || imageUploading}
            activeOpacity={0.85}
          >
            {updating ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default UpdateProfileDetailsScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9FC' },

  // Header
  headerWrapper: { backgroundColor: '#0060B8', paddingHorizontal: 20, paddingBottom: 22, overflow: 'hidden', shadowColor: '#003E80', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 24, elevation: 18 },
  orb1: { position: 'absolute', width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(255,255,255,0.06)', top: -80, right: -60 },
  orb2: { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.04)', bottom: 5, left: -50 },
  headerInner: { flexDirection: 'row', alignItems: 'center', paddingTop: 16 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  eyebrow: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.65)', letterSpacing: 2, marginBottom: 2 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.4 },
  saveHeaderBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  saveHeaderBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  // Avatar
  avatarSection: { alignItems: 'center', marginBottom: 6, marginTop: 8 },
  avatarWrap: { position: 'relative', width: 100, height: 100, marginBottom: 10 },
  avatar: { width: 100, height: 100, borderRadius: 26, borderWidth: 3, borderColor: '#EBF5FF' },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 26, backgroundColor: '#EBF5FF', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#DBEAFE' },
  avatarCameraBtn: { position: 'absolute', bottom: -4, right: -4, width: 32, height: 32, borderRadius: 16, backgroundColor: '#0078D7', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  avatarHint: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },

  // Cards
  card: { backgroundColor: '#fff', borderRadius: 22, padding: 18, shadowColor: '#1B4FBF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 14, elevation: 4, borderWidth: 1, borderColor: '#F0F4F8', marginBottom: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  cardIconWrap: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A' },

  // Save Button
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#0078D7', paddingVertical: 16, borderRadius: 16, shadowColor: '#0078D7', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 7 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
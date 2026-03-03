import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { jwtDecode } from "jwt-decode";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const API_URL = Constants.expoConfig?.extra?.API_URL;
const S3_URL = Constants.expoConfig?.extra?.S3_FETCH_URL;
const CLOUDFRONT_URL = Constants.expoConfig?.extra?.CLOUDFRONT_URL;

const getImageUri = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const path = url.startsWith("/") ? url : `/${url}`;
  return CLOUDFRONT_URL ? `${CLOUDFRONT_URL}${path}` : `${S3_URL}${path}`;
};

interface BusinessFields {
  name: string; email: string; phone: string; address: string;
  city: string; state: string; pincode: string; business_type: string;
  profile_image: string | null;
}
interface LegalFields { aadhaar: string; pan: string; gst: string; msme: string; fassi: string; export_import: string; }
interface SocialFields { linkedin: string; instagram: string; facebook: string; website: string; telegram: string; youtube: string; x: string; }

// ── Shared field component (defined outside to avoid remount on keystroke) ──
interface FieldProps {
  label: string; value: string; onChangeText: (v: string) => void;
  icon: keyof typeof Ionicons.glyphMap; placeholder?: string;
  keyboard?: any; multiline?: boolean; caps?: any;
}
const Field = React.memo(function Field({ label, value, onChangeText, icon, placeholder, keyboard, multiline, caps }: FieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={f.label}>{label}</Text>
      <View style={[f.row, focused && f.rowFocused, multiline && { height: 80, alignItems: "flex-start" }]}>
        <View style={[f.iconBox, focused && f.iconBoxActive]}>
          <Ionicons name={icon} size={15} color={focused ? "#0078D7" : "#94A3B8"} />
        </View>
        <TextInput
          style={[f.input, multiline && { textAlignVertical: "top", paddingTop: 4 }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder || `Enter ${label.toLowerCase()}`}
          placeholderTextColor="#CBD5E1"
          keyboardType={keyboard}
          multiline={multiline}
          autoCapitalize={caps || "none"}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          returnKeyType="next"
          blurOnSubmit={false}
        />
      </View>
    </View>
  );
});

const f = StyleSheet.create({
  label: { fontSize: 11, fontWeight: "700", color: "#374151", marginBottom: 7, textTransform: "uppercase", letterSpacing: 0.2 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 12, paddingHorizontal: 12, minHeight: 50, backgroundColor: "#F8FAFC" },
  rowFocused: { borderColor: "#0078D7", backgroundColor: "#EFF6FF" },
  iconBox: { width: 28, height: 28, borderRadius: 8, backgroundColor: "#F1F5F9", justifyContent: "center", alignItems: "center", alignSelf: "flex-start", marginTop: 11 },
  iconBoxActive: { backgroundColor: "#DBEAFE" },
  input: { flex: 1, fontSize: 14, color: "#0F172A", fontWeight: "500", paddingVertical: 12 },
});

// ── Collapsible Section ──
function Section({ title, icon, iconBg, iconColor, expanded, onToggle, children, saving, onSave, saveColor = "#0078D7" }:
  { title: string; icon: keyof typeof Ionicons.glyphMap; iconBg: string; iconColor: string; expanded: boolean; onToggle: () => void; children: React.ReactNode; saving: boolean; onSave: () => void; saveColor?: string }) {
  return (
    <View style={sec.card}>
      <TouchableOpacity style={sec.header} onPress={onToggle} activeOpacity={0.8}>
        <View style={[sec.iconBox, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={17} color={iconColor} />
        </View>
        <Text style={sec.title}>{title}</Text>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color="#94A3B8" />
      </TouchableOpacity>
      {expanded && (
        <View style={sec.body}>
          {children}
          <TouchableOpacity
            style={[sec.saveBtn, { backgroundColor: saveColor }, saving && { opacity: 0.7 }]}
            onPress={onSave}
            disabled={saving}
            activeOpacity={0.88}
          >
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : (
                <View style={sec.saveBtnInner}>
                  <Ionicons name="checkmark-circle-outline" size={17} color="#fff" />
                  <Text style={sec.saveBtnTxt}>Save {title}</Text>
                </View>
              )
            }
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const sec = StyleSheet.create({
  card: { backgroundColor: "#fff", marginHorizontal: 16, marginTop: 12, borderRadius: 20, overflow: "hidden", shadowColor: "#0078D7", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: "#F1F5F9" },
  header: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  iconBox: { width: 36, height: 36, borderRadius: 11, justifyContent: "center", alignItems: "center" },
  title: { flex: 1, fontSize: 15, fontWeight: "800", color: "#0F172A" },
  body: { paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  saveBtn: { height: 50, borderRadius: 14, justifyContent: "center", alignItems: "center", marginTop: 12, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
  saveBtnInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  saveBtnTxt: { fontSize: 15, fontWeight: "800", color: "#fff" },
});

// ── Status Badge ──
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  pending: { label: "Under Review", color: "#D97706", bg: "#FEF3C7", icon: "time-outline" },
  approved: { label: "Approved", color: "#059669", bg: "#D1FAE5", icon: "checkmark-circle-outline" },
  rejected: { label: "Rejected", color: "#DC2626", bg: "#FEE2E2", icon: "close-circle-outline" },
};

export default function SellerApplicationStatus() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState("");
  const [appStatus, setAppStatus] = useState<string>("pending");
  const [expanded, setExpanded] = useState<string | null>("business");

  const [business, setBusiness] = useState<BusinessFields>({ name: "", email: "", phone: "", address: "", city: "", state: "", pincode: "", business_type: "", profile_image: null });
  const [legal, setLegal] = useState<LegalFields>({ aadhaar: "", pan: "", gst: "", msme: "", fassi: "", export_import: "" });
  const [social, setSocial] = useState<SocialFields>({ linkedin: "", instagram: "", facebook: "", website: "", telegram: "", youtube: "", x: "" });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) { router.replace("/pages/loginMail"); return; }
      const decoded: any = jwtDecode(token);
      const userId = decoded.user_id;

      let bId = decoded.business_id || (await AsyncStorage.getItem("businessId")) || "";
      if (!bId) {
        try {
          const r = await fetch(`${API_URL}/business/get/user/${userId}`, { headers: { "Content-Type": "application/json" } });
          if (r.ok) { const d = await r.json(); bId = d.business_id; }
        } catch { }
      }
      if (!bId) { setLoading(false); return; }
      setBusinessId(bId);
      await AsyncStorage.setItem("businessId", bId);

      // Fetch status
      const statusVal = await AsyncStorage.getItem("sellerStatus");
      if (statusVal) setAppStatus(statusVal.toLowerCase());

      // Fetch complete
      const res = await fetch(`${API_URL}/business/get/complete/${bId}`, { headers: { "Content-Type": "application/json" } });
      if (res.ok) {
        const { details } = await res.json();
        if (details.business_application?.status) {
          setAppStatus(details.business_application.status.toLowerCase() === "applied" ? "pending" : details.business_application.status.toLowerCase());
        }
        if (details.business_details) {
          const bd = details.business_details;
          setBusiness({ name: bd.name || "", email: bd.email || "", phone: bd.phone || "", address: bd.address || "", city: bd.city || "", state: bd.state || "", pincode: bd.pincode || "", business_type: bd.business_type || "", profile_image: bd.profile_image || null });
        }
        if (details.legal_details) {
          const ld = details.legal_details;
          setLegal({ aadhaar: ld.aadhaar || "", pan: ld.pan || "", gst: ld.gst || "", msme: ld.msme || "", fassi: ld.fassi || "", export_import: ld.export_import || "" });
        }
        if (details.social_details) {
          const sd = details.social_details;
          setSocial({ linkedin: sd.linkedin || "", instagram: sd.instagram || "", facebook: sd.facebook || "", website: sd.website || "", telegram: sd.telegram || "", youtube: sd.youtube || "", x: sd.x || "" });
        }
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert("Permission Required", "Allow photo library access."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled && result.assets[0]) { await uploadPhoto(result.assets[0].uri); }
  };

  const uploadPhoto = async (uri: string) => {
    try {
      setSaving("photo");
      const token = await AsyncStorage.getItem("token");
      const presignRes = await fetch(`${API_URL}/business/get/presigned/${businessId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (presignRes.ok) {
        const { data } = await presignRes.json();
        const presignedUrl = data?.url || data?.upload_url;
        if (presignedUrl) {
          const blob = await (await fetch(uri)).blob();
          const s3Res = await fetch(presignedUrl, { method: "PUT", body: blob, headers: { "Content-Type": blob.type || "image/jpeg" } });
          if (s3Res.ok) {
            await fetch(`${API_URL}/business/update/image/${businessId}`, { method: "PUT", headers: { Authorization: `Bearer ${token}` } });
            setBusiness(p => ({ ...p, profile_image: uri }));
            Alert.alert("Success", "Photo updated!");
            return;
          }
        }
      }
      Alert.alert("Error", "Failed to upload photo");
    } catch { Alert.alert("Error", "Failed to upload photo"); }
    finally { setSaving(null); }
  };

  const saveBusiness = async () => {
    try {
      setSaving("business");
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${API_URL}/business/update/${businessId}`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ name: business.name, email: business.email, phone: business.phone, address: business.address, city: business.city, state: business.state, pincode: business.pincode, business_type: business.business_type }) });
      res.ok ? Alert.alert("Saved!", "Business details updated.") : Alert.alert("Error", "Could not update");
    } catch { Alert.alert("Error", "Failed to save"); }
    finally { setSaving(null); }
  };

  const saveLegal = async () => {
    try {
      setSaving("legal");
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${API_URL}/business/legal/update/${businessId}`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(legal) });
      res.ok ? Alert.alert("Saved!", "Legal details updated.") : Alert.alert("Error", "Could not update");
    } catch { Alert.alert("Error", "Failed to save"); }
    finally { setSaving(null); }
  };

  const saveSocial = async () => {
    try {
      setSaving("social");
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${API_URL}/business/social/update/${businessId}`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(social) });
      res.ok ? Alert.alert("Saved!", "Social details updated.") : Alert.alert("Error", "Could not update");
    } catch { Alert.alert("Error", "Failed to save"); }
    finally { setSaving(null); }
  };

  const toggle = (s: string) => setExpanded(p => p === s ? null : s);
  const profileUri = business.profile_image?.startsWith("file://") ? business.profile_image : getImageUri(business.profile_image);
  const statusCfg = STATUS_CONFIG[appStatus] || STATUS_CONFIG.pending;

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#fff", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0078D7" />
        <Text style={{ marginTop: 12, fontSize: 14, color: "#64748B" }}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      <StatusBar barStyle="light-content" backgroundColor="#0060B8" />

      {/* ── Premium Blue Header ── */}
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <View style={s.orb1} /><View style={s.orb2} />
        <View style={s.headerRow}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.replace("/(tabs)")}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>Seller Application</Text>
            <Text style={s.headerSub}>Manage your business profile</Text>
          </View>
          <TouchableOpacity style={s.refreshBtn} onPress={() => { setRefreshing(true); fetchAll(); }}>
            <Ionicons name="refresh" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        enableAutomaticScroll={true}
        extraScrollHeight={Platform.OS === "ios" ? 40 : 100}
        bounces={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} colors={["#0078D7"]} tintColor="#0078D7" />}
      >
        {/* ── Status Banner ── */}
        <View style={[s.statusCard, { borderLeftColor: statusCfg.color }]}>
          <View style={[s.statusIcon, { backgroundColor: statusCfg.bg }]}>
            <Ionicons name={statusCfg.icon} size={22} color={statusCfg.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.statusTitle}>Application Status</Text>
            <Text style={[s.statusLabel, { color: statusCfg.color }]}>{statusCfg.label}</Text>
            {appStatus === "pending" && <Text style={s.statusHint}>Our team is reviewing your application. This usually takes 1–2 business days.</Text>}
            {appStatus === "approved" && <Text style={s.statusHint}>Congratulations! You can now sell on the marketplace.</Text>}
            {appStatus === "rejected" && <Text style={s.statusHint}>Your application was not approved. Update your details and resubmit.</Text>}
          </View>
        </View>

        {/* ── Profile Photo Card ── */}
        <View style={s.photoCard}>
          <TouchableOpacity style={s.photoWrap} onPress={pickImage} activeOpacity={0.85}>
            {profileUri
              ? <Image source={{ uri: `${profileUri}?t=${Date.now()}` }} style={s.photo} />
              : (
                <View style={[s.photo, s.photoPlaceholder]}>
                  <Ionicons name="business" size={36} color="#0078D7" />
                </View>
              )
            }
            <View style={s.cameraBadge}>
              {saving === "photo"
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="camera" size={13} color="#fff" />
              }
            </View>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            {business.name ? <Text style={s.photoName}>{business.name}</Text> : null}
            <Text style={s.photoHint}>Tap logo to update company photo</Text>
            {business.business_type ? (
              <View style={s.typeBadge}><Text style={s.typeBadgeTxt}>{business.business_type}</Text></View>
            ) : null}
          </View>
        </View>

        {/* ── Business Details Section ── */}
        <Section
          title="Business Details" icon="business-outline" iconBg="#EBF5FF" iconColor="#0078D7"
          expanded={expanded === "business"} onToggle={() => toggle("business")}
          saving={saving === "business"} onSave={saveBusiness} saveColor="#0078D7"
        >
          <View style={{ marginTop: 16 }}>
            <Field label="Business Name" value={business.name} onChangeText={v => setBusiness(p => ({ ...p, name: v }))} icon="storefront-outline" caps="words" />
            <Field label="Business Email" value={business.email} onChangeText={v => setBusiness(p => ({ ...p, email: v }))} icon="mail-outline" keyboard="email-address" />
            <Field label="Phone Number" value={business.phone} onChangeText={v => setBusiness(p => ({ ...p, phone: v }))} icon="call-outline" keyboard="phone-pad" />
            <Field label="Business Type" value={business.business_type} onChangeText={v => setBusiness(p => ({ ...p, business_type: v }))} icon="briefcase-outline" caps="words" />
            <Field label="Address" value={business.address} onChangeText={v => setBusiness(p => ({ ...p, address: v }))} icon="location-outline" multiline caps="sentences" />
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Field label="City" value={business.city} onChangeText={v => setBusiness(p => ({ ...p, city: v }))} icon="navigate-outline" caps="words" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="State" value={business.state} onChangeText={v => setBusiness(p => ({ ...p, state: v }))} icon="map-outline" caps="words" />
              </View>
            </View>
            <Field label="Pincode" value={business.pincode} onChangeText={v => setBusiness(p => ({ ...p, pincode: v }))} icon="pin-outline" keyboard="number-pad" />
          </View>
        </Section>

        {/* ── Legal Details Section ── */}
        <Section
          title="Legal Documents" icon="document-text-outline" iconBg="#FFF7ED" iconColor="#F59E0B"
          expanded={expanded === "legal"} onToggle={() => toggle("legal")}
          saving={saving === "legal"} onSave={saveLegal} saveColor="#F59E0B"
        >
          <View style={{ marginTop: 16 }}>
            <Field label="Aadhaar Number" value={legal.aadhaar} onChangeText={v => setLegal(p => ({ ...p, aadhaar: v }))} icon="card-outline" keyboard="number-pad" />
            <Field label="PAN Number" value={legal.pan} onChangeText={v => setLegal(p => ({ ...p, pan: v.toUpperCase() }))} icon="document-outline" caps="characters" />
            <Field label="GST Number" value={legal.gst} onChangeText={v => setLegal(p => ({ ...p, gst: v.toUpperCase() }))} icon="receipt-outline" caps="characters" />
            <Field label="MSME / Udyam" value={legal.msme} onChangeText={v => setLegal(p => ({ ...p, msme: v }))} icon="business-outline" />
            <Field label="FSSAI License" value={legal.fassi} onChangeText={v => setLegal(p => ({ ...p, fassi: v }))} icon="nutrition-outline" />
            <Field label="Export/Import Code" value={legal.export_import} onChangeText={v => setLegal(p => ({ ...p, export_import: v }))} icon="globe-outline" />
          </View>
        </Section>

        {/* ── Social Media Section ── */}
        <Section
          title="Social Media" icon="share-social-outline" iconBg="#F5F3FF" iconColor="#7C3AED"
          expanded={expanded === "social"} onToggle={() => toggle("social")}
          saving={saving === "social"} onSave={saveSocial} saveColor="#7C3AED"
        >
          <View style={{ marginTop: 16 }}>
            <Field label="LinkedIn" value={social.linkedin} onChangeText={v => setSocial(p => ({ ...p, linkedin: v }))} icon="logo-linkedin" placeholder="https://linkedin.com/in/..." />
            <Field label="Instagram" value={social.instagram} onChangeText={v => setSocial(p => ({ ...p, instagram: v }))} icon="logo-instagram" placeholder="https://instagram.com/..." />
            <Field label="Facebook" value={social.facebook} onChangeText={v => setSocial(p => ({ ...p, facebook: v }))} icon="logo-facebook" placeholder="https://facebook.com/..." />
            <Field label="YouTube" value={social.youtube} onChangeText={v => setSocial(p => ({ ...p, youtube: v }))} icon="logo-youtube" placeholder="https://youtube.com/..." />
            <Field label="X (Twitter)" value={social.x} onChangeText={v => setSocial(p => ({ ...p, x: v }))} icon="logo-twitter" placeholder="https://x.com/..." />
            <Field label="Telegram" value={social.telegram} onChangeText={v => setSocial(p => ({ ...p, telegram: v }))} icon="paper-plane-outline" placeholder="https://t.me/..." />
            <Field label="Website" value={social.website} onChangeText={v => setSocial(p => ({ ...p, website: v }))} icon="globe-outline" placeholder="https://yourbusiness.com" />
          </View>
        </Section>

        {/* ── Go to Home ── */}
        <TouchableOpacity style={s.homeBtn} onPress={() => router.replace("/(tabs)")} activeOpacity={0.85}>
          <Ionicons name="home-outline" size={18} color="#0078D7" />
          <Text style={s.homeBtnTxt}>Back to Home</Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  /* Header */
  header: { backgroundColor: "#0060B8", paddingHorizontal: 20, paddingBottom: 24, overflow: "hidden" },
  orb1: { position: "absolute", width: 260, height: 260, borderRadius: 130, backgroundColor: "rgba(255,255,255,0.05)", top: -80, right: -80 },
  orb2: { position: "absolute", width: 160, height: 160, borderRadius: 80, backgroundColor: "rgba(255,255,255,0.04)", bottom: -50, left: -60 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.15)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  refreshBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.12)", justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "900", color: "#fff", letterSpacing: -0.3 },
  headerSub: { fontSize: 11, color: "rgba(255,255,255,0.65)", marginTop: 2 },

  /* Status Card */
  statusCard: { flexDirection: "row", alignItems: "flex-start", gap: 14, backgroundColor: "#fff", marginHorizontal: 16, marginTop: 16, borderRadius: 20, padding: 16, borderLeftWidth: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  statusIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  statusTitle: { fontSize: 11, fontWeight: "700", color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 },
  statusLabel: { fontSize: 16, fontWeight: "900", letterSpacing: -0.2, marginBottom: 4 },
  statusHint: { fontSize: 12, color: "#64748B", lineHeight: 17 },

  /* Photo Card */
  photoCard: { flexDirection: "row", alignItems: "center", gap: 16, backgroundColor: "#fff", marginHorizontal: 16, marginTop: 12, borderRadius: 20, padding: 16, shadowColor: "#0078D7", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: "#F1F5F9" },
  photoWrap: { position: "relative" },
  photo: { width: 72, height: 72, borderRadius: 20, borderWidth: 2.5, borderColor: "#0078D7" },
  photoPlaceholder: { backgroundColor: "#EBF5FF", justifyContent: "center", alignItems: "center" },
  cameraBadge: { position: "absolute", bottom: -4, right: -4, width: 26, height: 26, borderRadius: 8, backgroundColor: "#0078D7", justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#fff" },
  photoName: { fontSize: 16, fontWeight: "900", color: "#0F172A", marginBottom: 2 },
  photoHint: { fontSize: 12, color: "#94A3B8" },
  typeBadge: { marginTop: 6, alignSelf: "flex-start", backgroundColor: "#EBF5FF", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  typeBadgeTxt: { fontSize: 11, fontWeight: "700", color: "#0078D7" },

  /* Home Button */
  homeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginHorizontal: 16, marginTop: 20, height: 52, borderRadius: 16, borderWidth: 1.5, borderColor: "#BFDBFE", backgroundColor: "#EFF6FF" },
  homeBtnTxt: { fontSize: 15, fontWeight: "800", color: "#0078D7" },
});

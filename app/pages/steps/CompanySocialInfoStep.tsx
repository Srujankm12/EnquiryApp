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

interface Props {
  businessId: string | null;
  userId: string;
  isEditMode: boolean;
  onComplete: (stepNumber: number, data?: any) => void;
  onBack: () => void;
}

interface SocialInfo {
  linkedin: string; instagram: string; facebook: string;
  website: string; telegram: string; youtube: string; x: string;
}

const API_URL = Constants.expoConfig?.extra?.API_URL;

const SOCIAL_FIELDS: { key: keyof SocialInfo; label: string; placeholder: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/in/...", icon: "logo-linkedin", color: "#0A66C2" },
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/...", icon: "logo-instagram", color: "#E4405F" },
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/...", icon: "logo-facebook", color: "#1877F2" },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@...", icon: "logo-youtube", color: "#FF0000" },
  { key: "x", label: "X (Twitter)", placeholder: "https://x.com/...", icon: "logo-twitter", color: "#000" },
  { key: "telegram", label: "Telegram", placeholder: "https://t.me/...", icon: "paper-plane-outline", color: "#0088CC" },
  { key: "website", label: "Website", placeholder: "https://yourbusiness.com", icon: "globe-outline", color: "#0078D7" },
];

const CompanySocialInfoStep: React.FC<Props> = ({ businessId, isEditMode, onComplete }) => {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [isExisting, setIsExisting] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [formData, setFormData] = useState<SocialInfo>({ linkedin: "", instagram: "", facebook: "", website: "", telegram: "", youtube: "", x: "" });

  useEffect(() => { businessId ? fetchData() : setFetching(false); }, [businessId]);

  const fetchData = async () => {
    try {
      const res = await fetch(`${API_URL}/business/social/get/${businessId}`, { headers: { "Content-Type": "application/json" } });
      if (res.ok) {
        const { details } = await res.json();
        setIsExisting(true);
        setFormData({ linkedin: details.linkedin || "", instagram: details.instagram || "", facebook: details.facebook || "", website: details.website || "", telegram: details.telegram || "", youtube: details.youtube || "", x: details.x || "" });
      }
    } catch (e) { console.error(e); }
    finally { setFetching(false); }
  };

  const set = (field: keyof SocialInfo, value: string) => setFormData(p => ({ ...p, [field]: value }));

  const handleSubmit = async () => {
    if (!businessId) { Alert.alert("Error", "Complete step 1 first."); return; }
    try {
      setLoading(true);
      const payload: any = { id: businessId };
      Object.entries(formData).forEach(([k, v]) => { if (v.trim()) payload[k] = v.trim(); });
      const url = isExisting || isEditMode ? `${API_URL}/business/social/update/${businessId}` : `${API_URL}/business/social/create`;
      const method = isExisting || isEditMode ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("Failed to save");
      onComplete(3);
    } catch (e: any) { Alert.alert("Error", e.message || "Failed to save"); }
    finally { setLoading(false); }
  };

  const handleSkip = async () => {
    if (!businessId || isExisting) { onComplete(3); return; }
    try { await fetch(`${API_URL}/business/social/create`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: businessId }) }); } catch { }
    onComplete(3);
  };

  if (fetching) return <View style={s.center}><ActivityIndicator size="large" color="#0078D7" /><Text style={s.loadingTxt}>Loading...</Text></View>;

  return (
    <View style={s.container}>
      <View style={s.card}>
        <View style={s.cardHeader}>
          <View style={s.cardIcon}><Ionicons name="share-social-outline" size={16} color="#0078D7" /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>Social Media Links</Text>
            <Text style={s.cardSub}>These appear on your seller profile (optional)</Text>
          </View>
        </View>

        {SOCIAL_FIELDS.map(f => (
          <View key={f.key}>
            <View style={s.labelRow}>
              <View style={[s.socialDot, { backgroundColor: f.color }]}><Ionicons name={f.icon} size={12} color="#fff" /></View>
              <Text style={s.label}>{f.label}</Text>
            </View>
            <View style={[s.inputRow, focused === f.key && s.inputFocused]}>
              <TextInput
                style={s.input}
                placeholder={f.placeholder}
                placeholderTextColor="#CBD5E1"
                value={formData[f.key]}
                onChangeText={v => set(f.key, v)}
                autoCapitalize="none"
                keyboardType="url"
                onFocus={() => setFocused(f.key)}
                onBlur={() => setFocused(null)}
              />
            </View>
          </View>
        ))}
      </View>

      <View style={s.cta}>
        <TouchableOpacity style={s.skipBtn} onPress={handleSkip} activeOpacity={0.85}>
          <Text style={s.skipTxt}>Skip for Now</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.ctaBtn, loading && { opacity: 0.7 }]} onPress={handleSubmit} disabled={loading} activeOpacity={0.88}>
          {loading ? <ActivityIndicator color="#fff" /> : (
            <View style={s.ctaInner}>
              <Text style={s.ctaTxt}>Save & Continue</Text>
              <View style={s.ctaArrow}><Ionicons name="arrow-forward" size={15} color="#0078D7" /></View>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  loadingTxt: { marginTop: 12, fontSize: 14, color: "#64748B" },

  card: { backgroundColor: "#fff", marginHorizontal: 16, marginTop: 16, borderRadius: 20, padding: 18, shadowColor: "#0078D7", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: "#F1F5F9" },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  cardIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: "#EBF5FF", justifyContent: "center", alignItems: "center", marginTop: 2 },
  cardTitle: { fontSize: 15, fontWeight: "800", color: "#0F172A" },
  cardSub: { fontSize: 12, color: "#94A3B8", marginTop: 2 },

  labelRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14, marginBottom: 7 },
  socialDot: { width: 22, height: 22, borderRadius: 7, justifyContent: "center", alignItems: "center" },
  label: { fontSize: 12, fontWeight: "700", color: "#374151", textTransform: "uppercase", letterSpacing: 0.2 },
  inputRow: { borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 12, paddingHorizontal: 14, height: 50, backgroundColor: "#F8FAFC", justifyContent: "center" },
  inputFocused: { borderColor: "#0078D7", backgroundColor: "#EFF6FF" },
  input: { fontSize: 14, color: "#0F172A", fontWeight: "500" },

  cta: { paddingHorizontal: 16, paddingTop: 20, gap: 10 },
  skipBtn: { height: 50, borderRadius: 14, borderWidth: 1.5, borderColor: "#BFDBFE", backgroundColor: "#EFF6FF", justifyContent: "center", alignItems: "center" },
  skipTxt: { fontSize: 15, fontWeight: "700", color: "#0078D7" },
  ctaBtn: { backgroundColor: "#0078D7", borderRadius: 16, height: 56, justifyContent: "center", alignItems: "center", shadowColor: "#0060B8", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 12, elevation: 8 },
  ctaInner: { flexDirection: "row", alignItems: "center", gap: 12 },
  ctaTxt: { fontSize: 16, fontWeight: "800", color: "#fff" },
  ctaArrow: { width: 26, height: 26, borderRadius: 8, backgroundColor: "#fff", justifyContent: "center", alignItems: "center" },
});

export default CompanySocialInfoStep;

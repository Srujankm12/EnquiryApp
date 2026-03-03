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

interface LegalInfo {
  aadhaar: string; pan: string; exportImport: string;
  msme: string; fassi: string; gst: string;
}

const API_URL = Constants.expoConfig?.extra?.API_URL;

const FIELDS: { key: keyof LegalInfo; label: string; placeholder: string; icon: keyof typeof Ionicons.glyphMap; maxLength?: number; keyboard?: any; caps?: any }[] = [
  { key: "aadhaar", label: "Aadhaar Number", placeholder: "12-digit Aadhaar", icon: "card-outline", maxLength: 12, keyboard: "number-pad" },
  { key: "pan", label: "PAN Number", placeholder: "ABCDE1234F", icon: "document-text-outline", maxLength: 10, caps: "characters" },
  { key: "gst", label: "GST Number", placeholder: "15-char GST number", icon: "receipt-outline", maxLength: 15, caps: "characters" },
  { key: "msme", label: "MSME / Udyam Number", placeholder: "Udyam registration", icon: "business-outline" },
  { key: "fassi", label: "FSSAI License", placeholder: "14-digit FSSAI", icon: "nutrition-outline", maxLength: 14 },
  { key: "exportImport", label: "Export / Import Code", placeholder: "IEC code", icon: "globe-outline", maxLength: 10 },
];

const CompanyLegalInfoStep: React.FC<Props> = ({ businessId, isEditMode, onComplete }) => {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [isExisting, setIsExisting] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [formData, setFormData] = useState<LegalInfo>({ aadhaar: "", pan: "", exportImport: "", msme: "", fassi: "", gst: "" });

  useEffect(() => { businessId ? fetchData() : setFetching(false); }, [businessId]);

  const fetchData = async () => {
    try {
      const res = await fetch(`${API_URL}/business/legal/get/${businessId}`, { headers: { "Content-Type": "application/json" } });
      if (res.ok) {
        const { details } = await res.json();
        setIsExisting(true);
        setFormData({ aadhaar: details.aadhaar || "", pan: details.pan || "", exportImport: details.export_import || "", msme: details.msme || "", fassi: details.fassi || "", gst: details.gst || "" });
      }
    } catch (e) { console.error(e); }
    finally { setFetching(false); }
  };

  const set = (field: keyof LegalInfo, value: string) => setFormData(p => ({ ...p, [field]: value }));

  const handleSubmit = async () => {
    if (!businessId) { Alert.alert("Error", "Complete step 1 first."); return; }
    try {
      setLoading(true);
      const payload: any = { id: businessId };
      if (formData.aadhaar.trim()) payload.aadhaar = formData.aadhaar.trim();
      if (formData.pan.trim()) payload.pan = formData.pan.trim();
      if (formData.exportImport.trim()) payload.export_import = formData.exportImport.trim();
      if (formData.msme.trim()) payload.msme = formData.msme.trim();
      if (formData.fassi.trim()) payload.fassi = formData.fassi.trim();
      if (formData.gst.trim()) payload.gst = formData.gst.trim();
      const url = isExisting || isEditMode ? `${API_URL}/business/legal/update/${businessId}` : `${API_URL}/business/legal/create`;
      const method = isExisting || isEditMode ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("Failed to save");
      onComplete(2);
    } catch (e: any) { Alert.alert("Error", e.message || "Failed to save"); }
    finally { setLoading(false); }
  };

  const handleSkip = async () => {
    if (!businessId || isExisting) { onComplete(2); return; }
    try {
      await fetch(`${API_URL}/business/legal/create`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: businessId }) });
    } catch { }
    onComplete(2);
  };

  if (fetching) return <View style={s.center}><ActivityIndicator size="large" color="#0078D7" /><Text style={s.loadingTxt}>Loading...</Text></View>;

  return (
    <View style={s.container}>
      <View style={s.card}>
        <View style={s.cardHeader}>
          <View style={s.cardIcon}><Ionicons name="document-text-outline" size={16} color="#0078D7" /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>Legal Documents</Text>
            <Text style={s.cardSub}>All fields are optional — add what you have</Text>
          </View>
        </View>

        {FIELDS.map(f => (
          <View key={f.key}>
            <Text style={s.label}>{f.label}</Text>
            <View style={[s.inputRow, focused === f.key && s.inputFocused]}>
              <View style={[s.iconBox, focused === f.key && s.iconBoxActive]}>
                <Ionicons name={f.icon} size={15} color={focused === f.key ? "#0078D7" : "#94A3B8"} />
              </View>
              <TextInput
                style={s.input}
                placeholder={f.placeholder}
                placeholderTextColor="#CBD5E1"
                value={formData[f.key]}
                onChangeText={v => set(f.key, f.caps === "characters" ? v.toUpperCase() : v)}
                keyboardType={f.keyboard}
                autoCapitalize={f.caps}
                maxLength={f.maxLength}
                onFocus={() => setFocused(f.key)}
                onBlur={() => setFocused(null)}
              />
            </View>
          </View>
        ))}
      </View>

      {/* Buttons */}
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

  label: { fontSize: 11, fontWeight: "700", color: "#374151", marginBottom: 7, marginTop: 14, textTransform: "uppercase", letterSpacing: 0.2 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 12, paddingHorizontal: 12, height: 50, backgroundColor: "#F8FAFC" },
  inputFocused: { borderColor: "#0078D7", backgroundColor: "#EFF6FF" },
  iconBox: { width: 28, height: 28, borderRadius: 8, backgroundColor: "#F1F5F9", justifyContent: "center", alignItems: "center" },
  iconBoxActive: { backgroundColor: "#DBEAFE" },
  input: { flex: 1, fontSize: 14, color: "#0F172A", fontWeight: "500" },

  cta: { paddingHorizontal: 16, paddingTop: 20, gap: 10 },
  skipBtn: { height: 50, borderRadius: 14, borderWidth: 1.5, borderColor: "#BFDBFE", backgroundColor: "#EFF6FF", justifyContent: "center", alignItems: "center" },
  skipTxt: { fontSize: 15, fontWeight: "700", color: "#0078D7" },
  ctaBtn: { backgroundColor: "#0078D7", borderRadius: 16, height: 56, justifyContent: "center", alignItems: "center", shadowColor: "#0060B8", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 12, elevation: 8 },
  ctaInner: { flexDirection: "row", alignItems: "center", gap: 12 },
  ctaTxt: { fontSize: 16, fontWeight: "800", color: "#fff" },
  ctaArrow: { width: 26, height: 26, borderRadius: 8, backgroundColor: "#fff", justifyContent: "center", alignItems: "center" },
});

export default CompanyLegalInfoStep;

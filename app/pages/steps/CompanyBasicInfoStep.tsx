import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import LocationDropdown from "../../../components/LocationDropdown";
import { getCitiesForState, getPincodeForCity, STATES } from "../../utils/indiaData";

interface Props {
  businessId: string | null;
  userId: string;
  isEditMode: boolean;
  onComplete: (stepNumber: number, data?: any) => void;
  onBack: () => void;
}

interface BasicInfo {
  name: string; email: string; phone: string; address: string;
  city: string; state: string; pincode: string; businessType: string;
}

const BUSINESS_TYPES = ["Agriculture", "Wholesale", "Retail", "Export", "Import", "Manufacturing", "Trading", "Other"];
const API_URL = Constants.expoConfig?.extra?.API_URL;

const CompanyBasicInfoStep: React.FC<Props> = ({ businessId, userId, isEditMode, onComplete }) => {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [isExisting, setIsExisting] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [formData, setFormData] = useState<BasicInfo>({ name: "", email: "", phone: "", address: "", city: "", state: "", pincode: "", businessType: "" });
  const [errors, setErrors] = useState<any>({});

  useEffect(() => { businessId ? fetchData() : setFetching(false); }, [businessId]);

  const fetchData = async () => {
    try {
      const res = await fetch(`${API_URL}/business/get/${businessId}`, { headers: { "Content-Type": "application/json" } });
      if (res.ok) {
        const { details } = await res.json();
        setIsExisting(true);
        setFormData({ name: details.name || "", email: details.email || "", phone: details.phone || "", address: details.address || "", city: details.city || "", state: details.state || "", pincode: details.pincode || "", businessType: details.business_type || "" });
      }
    } catch (e) { console.error(e); }
    finally { setFetching(false); }
  };

  const set = (field: keyof BasicInfo, value: string) => {
    setFormData(p => ({ ...p, [field]: value }));
    if (errors[field]) setErrors((p: any) => ({ ...p, [field]: "" }));
  };

  const validate = () => {
    const e: any = {};
    if (!formData.name.trim()) e.name = "Business name is required";
    if (!formData.email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) e.email = "Invalid email format";
    if (!formData.phone.trim()) e.phone = "Phone is required";
    else if (!/^\d{10}$/.test(formData.phone)) e.phone = "Must be 10 digits";
    if (!formData.address.trim()) e.address = "Address is required";
    if (!formData.city.trim()) e.city = "City is required";
    if (!formData.state.trim()) e.state = "State is required";
    if (!formData.pincode.trim()) e.pincode = "Pincode is required";
    else if (!/^\d{6}$/.test(formData.pincode)) e.pincode = "Must be 6 digits";
    if (!formData.businessType) e.businessType = "Select a business type";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) { Alert.alert("Validation Error", "Please fill all required fields correctly"); return; }
    try {
      setLoading(true);
      const payload = { name: formData.name, email: formData.email, phone: formData.phone, address: formData.address, city: formData.city, state: formData.state, pincode: formData.pincode, business_type: formData.businessType };
      if (businessId && (isEditMode || isExisting)) {
        const res = await fetch(`${API_URL}/business/update/${businessId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error("Failed to update");
        onComplete(1, { businessId });
      } else {
        const res = await fetch(`${API_URL}/business/create`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: userId, ...payload }) });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Failed to create"); }
        const { business_id } = await res.json();
        onComplete(1, { businessId: business_id });
      }
    } catch (e: any) { Alert.alert("Error", e.message || "Failed to save"); }
    finally { setLoading(false); }
  };

  if (fetching) return <View style={s.center}><ActivityIndicator size="large" color="#0078D7" /><Text style={s.loadingTxt}>Loading...</Text></View>;

  const inp = (field: keyof BasicInfo) => ({
    style: [s.input, focused === field && s.inputFocused, !!errors[field] && s.inputError],
    value: formData[field],
    onChangeText: (v: string) => set(field, v),
    onFocus: () => setFocused(field),
    onBlur: () => setFocused(null),
    placeholderTextColor: "#CBD5E1",
  });

  // Cascading dropdown helpers
  const stateOptions = useMemo(() => STATES.map(st => ({ label: st, value: st })), []);
  const cityOptions = useMemo(
    () => getCitiesForState(formData.state).map(c => ({ label: c.name, value: c.name })),
    [formData.state]
  );
  const pincodeOptions = useMemo(
    () => getCitiesForState(formData.state).map(c => ({ label: `${c.name} — ${c.pincode}`, value: c.pincode })),
    [formData.state]
  );

  const handleStateSelect = (stateName: string) => {
    setFormData(p => ({ ...p, state: stateName, city: "", pincode: "" }));
    if (errors.state) setErrors((p: any) => ({ ...p, state: "" }));
  };

  const handleCitySelect = (cityName: string) => {
    const pincode = getPincodeForCity(formData.state, cityName);
    setFormData(p => ({ ...p, city: cityName, pincode }));
    if (errors.city) setErrors((p: any) => ({ ...p, city: "" }));
    if (errors.pincode) setErrors((p: any) => ({ ...p, pincode: "" }));
  };

  const handlePincodeSelect = (pincode: string) => {
    setFormData(p => ({ ...p, pincode }));
    if (errors.pincode) setErrors((p: any) => ({ ...p, pincode: "" }));
  };

  return (
    <View style={s.container}>
      {/* Business Info Card */}
      <View style={s.card}>
        <View style={s.cardHeader}>
          <View style={s.cardIcon}><Ionicons name="business-outline" size={16} color="#0078D7" /></View>
          <Text style={s.cardTitle}>Business Information</Text>
        </View>

        <Text style={s.label}>Business Name <Text style={s.req}>*</Text></Text>
        <TextInput {...inp("name")} placeholder="Enter business name" />
        {errors.name && <Text style={s.err}>{errors.name}</Text>}

        <Text style={s.label}>Business Email <Text style={s.req}>*</Text></Text>
        <TextInput {...inp("email")} placeholder="business@example.com" keyboardType="email-address" autoCapitalize="none" />
        {errors.email && <Text style={s.err}>{errors.email}</Text>}

        <Text style={s.label}>Phone Number <Text style={s.req}>*</Text></Text>
        <TextInput {...inp("phone")} placeholder="10-digit number" keyboardType="phone-pad" maxLength={10} />
        {errors.phone && <Text style={s.err}>{errors.phone}</Text>}

        <Text style={s.label}>Business Type <Text style={s.req}>*</Text></Text>
        <View style={s.chipWrap}>
          {BUSINESS_TYPES.map(type => (
            <TouchableOpacity key={type} style={[s.chip, formData.businessType === type && s.chipActive]} onPress={() => set("businessType", type)}>
              <Text style={[s.chipText, formData.businessType === type && s.chipTextActive]}>{type}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {errors.businessType && <Text style={s.err}>{errors.businessType}</Text>}
      </View>

      {/* Address Card */}
      <View style={s.card}>
        <View style={s.cardHeader}>
          <View style={[s.cardIcon, { backgroundColor: "#F0FFF4" }]}><Ionicons name="location-outline" size={16} color="#10B981" /></View>
          <Text style={s.cardTitle}>Address Information</Text>
        </View>

        <Text style={s.label}>Full Address <Text style={s.req}>*</Text></Text>
        <TextInput {...inp("address")} placeholder="Street / Area / Locality" multiline numberOfLines={3} style={[inp("address").style, s.textarea]} textAlignVertical="top" />
        {errors.address && <Text style={s.err}>{errors.address}</Text>}

        {/* State Dropdown */}
        <LocationDropdown
          label="State *"
          placeholder="Select State"
          value={formData.state}
          options={stateOptions}
          onSelect={handleStateSelect}
          error={errors.state}
          variant="flat"
        />

        {/* City Dropdown */}
        <LocationDropdown
          label="City *"
          placeholder={formData.state ? "Select City" : "Select State first"}
          value={formData.city}
          options={cityOptions}
          onSelect={handleCitySelect}
          error={errors.city}
          disabled={!formData.state}
          variant="flat"
        />

        {/* Pincode Dropdown */}
        <LocationDropdown
          label="Pincode *"
          placeholder={formData.state ? "Select Pincode" : "Select State first"}
          value={formData.pincode}
          options={pincodeOptions}
          onSelect={handlePincodeSelect}
          error={errors.pincode}
          disabled={!formData.state}
          variant="flat"
        />
      </View>

      {/* CTA */}
      <View style={s.cta}>
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
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  cardIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: "#EBF5FF", justifyContent: "center", alignItems: "center" },
  cardTitle: { fontSize: 15, fontWeight: "800", color: "#0F172A" },

  label: { fontSize: 12, fontWeight: "700", color: "#374151", marginBottom: 7, marginTop: 14, textTransform: "uppercase", letterSpacing: 0.2 },
  req: { color: "#EF4444" },
  input: { borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: "#0F172A", backgroundColor: "#F8FAFC", fontWeight: "500" },
  inputFocused: { borderColor: "#0078D7", backgroundColor: "#EFF6FF" },
  inputError: { borderColor: "#EF4444", backgroundColor: "#FFF5F5" },
  textarea: { height: 80, paddingTop: 12, textAlignVertical: "top" },
  err: { fontSize: 11, color: "#EF4444", fontWeight: "600", marginTop: 4 },

  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 2 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, borderWidth: 1.5, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC" },
  chipActive: { backgroundColor: "#0078D7", borderColor: "#0078D7" },
  chipText: { fontSize: 13, color: "#64748B", fontWeight: "600" },
  chipTextActive: { color: "#fff" },

  cta: { paddingHorizontal: 16, paddingTop: 20 },
  ctaBtn: { backgroundColor: "#0078D7", borderRadius: 16, height: 56, justifyContent: "center", alignItems: "center", shadowColor: "#0060B8", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 12, elevation: 8 },
  ctaInner: { flexDirection: "row", alignItems: "center", gap: 12 },
  ctaTxt: { fontSize: 16, fontWeight: "800", color: "#fff" },
  ctaArrow: { width: 26, height: 26, borderRadius: 8, backgroundColor: "#fff", justifyContent: "center", alignItems: "center" },
});

export default CompanyBasicInfoStep;

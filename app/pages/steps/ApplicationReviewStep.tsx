import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
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

interface ReviewData { business: any; social: any; legal: any; }

const API_URL = Constants.expoConfig?.extra?.API_URL;

const ReviewRow = ({ label, value }: { label: string; value: string }) => (
  <View style={s.reviewRow}>
    <Text style={s.reviewLabel}>{label}</Text>
    <Text style={s.reviewValue} numberOfLines={2}>{value || "N/A"}</Text>
  </View>
);

const ApplicationReviewStep: React.FC<Props> = ({ businessId, isEditMode, onBack, onComplete }) => {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [reviewData, setReviewData] = useState<ReviewData>({ business: null, social: null, legal: null });

  useEffect(() => { fetchAll(); }, [businessId]);

  const fetchAll = async () => {
    if (!businessId) { setFetching(false); return; }
    try {
      const res = await fetch(`${API_URL}/business/get/complete/${businessId}`, { headers: { "Content-Type": "application/json" } });
      if (res.ok) {
        const { details } = await res.json();
        setReviewData({ business: details.business_details, social: details.social_details, legal: details.legal_details });
      } else {
        const [b, soc, leg] = await Promise.allSettled([
          fetch(`${API_URL}/business/get/${businessId}`, { headers: { "Content-Type": "application/json" } }),
          fetch(`${API_URL}/business/social/get/${businessId}`, { headers: { "Content-Type": "application/json" } }),
          fetch(`${API_URL}/business/legal/get/${businessId}`, { headers: { "Content-Type": "application/json" } }),
        ]);
        const data: ReviewData = { business: null, social: null, legal: null };
        if (b.status === "fulfilled" && b.value.ok) { const r = await b.value.json(); data.business = r.details; }
        if (soc.status === "fulfilled" && soc.value.ok) { const r = await soc.value.json(); data.social = r.details; }
        if (leg.status === "fulfilled" && leg.value.ok) { const r = await leg.value.json(); data.legal = r.details; }
        setReviewData(data);
      }
    } catch (e) { console.error(e); }
    finally { setFetching(false); }
  };

  const submitApplication = async () => {
    if (!businessId) { Alert.alert("Error", "Business ID not found"); return; }
    Alert.alert(
      "Submit Application",
      "Are you sure you want to submit your seller application for review?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Submit", onPress: async () => {
            try {
              setLoading(true);
              const res = await fetch(`${API_URL}/business/application/create`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: businessId }) });
              if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed to submit"); }
              await AsyncStorage.setItem("sellerStatus", "pending");
              await AsyncStorage.setItem("businessId", businessId);
              Alert.alert("Application Submitted! 🎉", "Your application is under review. We'll notify you once approved.", [
                { text: "Go to Home", onPress: () => onComplete(4, { applicationId: businessId }) }
              ]);
            } catch (e: any) { Alert.alert("Error", e.message || "Failed to submit"); }
            finally { setLoading(false); }
          }
        }
      ]
    );
  };

  if (fetching) return <View style={s.center}><ActivityIndicator size="large" color="#0078D7" /><Text style={s.loadingTxt}>Loading review data...</Text></View>;

  const { business, social, legal } = reviewData;
  const legalHasData = legal && (legal.pan || legal.gst || legal.msme || legal.aadhaar || legal.fassi || legal.export_import);
  const socialHasData = social && (social.linkedin || social.instagram || social.facebook || social.website || social.youtube || social.telegram || social.x);

  return (
    <View style={s.container}>
      {/* Business Info */}
      <View style={s.card}>
        <View style={s.cardHeader}>
          <View style={s.cardIcon}><Ionicons name="business-outline" size={16} color="#0078D7" /></View>
          <Text style={s.cardTitle}>Business Information</Text>
          {business
            ? <View style={s.badge}><Ionicons name="checkmark-circle" size={14} color="#10B981" /><Text style={s.badgeTxt}>Complete</Text></View>
            : <View style={[s.badge, s.badgeWarn]}><Ionicons name="warning" size={14} color="#F59E0B" /><Text style={[s.badgeTxt, { color: "#F59E0B" }]}>Missing</Text></View>
          }
        </View>
        {business ? (
          <View style={s.reviewCard}>
            <ReviewRow label="Business Name" value={business.name} />
            <ReviewRow label="Email" value={business.email} />
            <ReviewRow label="Phone" value={business.phone} />
            <ReviewRow label="Business Type" value={business.business_type} />
            <ReviewRow label="Address" value={business.address} />
            <ReviewRow label="Location" value={`${business.city}, ${business.state} – ${business.pincode}`} />
          </View>
        ) : (
          <View style={s.missingBox}>
            <Ionicons name="alert-circle-outline" size={20} color="#F59E0B" />
            <Text style={s.missingTxt}>Business information not found. Please go back to step 1.</Text>
          </View>
        )}
      </View>

      {/* Legal Info */}
      <View style={s.card}>
        <View style={s.cardHeader}>
          <View style={[s.cardIcon, { backgroundColor: "#F0FFF4" }]}><Ionicons name="document-text-outline" size={16} color="#10B981" /></View>
          <Text style={s.cardTitle}>Legal Documents</Text>
          {legalHasData
            ? <View style={s.badge}><Ionicons name="checkmark-circle" size={14} color="#10B981" /><Text style={s.badgeTxt}>Added</Text></View>
            : <View style={[s.badge, { backgroundColor: "#F1F5F9" }]}><Text style={[s.badgeTxt, { color: "#94A3B8" }]}>Optional</Text></View>
          }
        </View>
        {legalHasData ? (
          <View style={s.reviewCard}>
            {legal.aadhaar && <ReviewRow label="Aadhaar" value={legal.aadhaar} />}
            {legal.pan && <ReviewRow label="PAN" value={legal.pan} />}
            {legal.gst && <ReviewRow label="GST" value={legal.gst} />}
            {legal.msme && <ReviewRow label="MSME" value={legal.msme} />}
            {legal.fassi && <ReviewRow label="FSSAI" value={legal.fassi} />}
            {legal.export_import && <ReviewRow label="IEC Code" value={legal.export_import} />}
          </View>
        ) : (
          <View style={s.skippedBox}><Text style={s.skippedTxt}>No legal documents added — can be added later</Text></View>
        )}
      </View>

      {/* Social Info */}
      <View style={s.card}>
        <View style={s.cardHeader}>
          <View style={[s.cardIcon, { backgroundColor: "#FFF5F5" }]}><Ionicons name="share-social-outline" size={16} color="#EF4444" /></View>
          <Text style={s.cardTitle}>Social Media</Text>
          {socialHasData
            ? <View style={s.badge}><Ionicons name="checkmark-circle" size={14} color="#10B981" /><Text style={s.badgeTxt}>Added</Text></View>
            : <View style={[s.badge, { backgroundColor: "#F1F5F9" }]}><Text style={[s.badgeTxt, { color: "#94A3B8" }]}>Optional</Text></View>
          }
        </View>
        {socialHasData ? (
          <View style={s.reviewCard}>
            {social.linkedin && <ReviewRow label="LinkedIn" value={social.linkedin} />}
            {social.instagram && <ReviewRow label="Instagram" value={social.instagram} />}
            {social.facebook && <ReviewRow label="Facebook" value={social.facebook} />}
            {social.youtube && <ReviewRow label="YouTube" value={social.youtube} />}
            {social.x && <ReviewRow label="X (Twitter)" value={social.x} />}
            {social.telegram && <ReviewRow label="Telegram" value={social.telegram} />}
            {social.website && <ReviewRow label="Website" value={social.website} />}
          </View>
        ) : (
          <View style={s.skippedBox}><Text style={s.skippedTxt}>No social media links added — can be added later</Text></View>
        )}
      </View>

      {/* Submit */}
      <View style={s.cta}>
        {!business ? (
          <TouchableOpacity style={s.backBtn} onPress={onBack} activeOpacity={0.85}>
            <Ionicons name="arrow-back" size={17} color="#0078D7" />
            <Text style={s.backTxt}>Back to Step 1</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[s.ctaBtn, loading && { opacity: 0.7 }]} onPress={submitApplication} disabled={loading} activeOpacity={0.88}>
            {loading ? <ActivityIndicator color="#fff" /> : (
              <View style={s.ctaInner}>
                <Ionicons name="send" size={17} color="#fff" />
                <Text style={s.ctaTxt}>{isEditMode ? "Resubmit Application" : "Submit for Verification"}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  loadingTxt: { marginTop: 12, fontSize: 14, color: "#64748B" },

  card: { backgroundColor: "#fff", marginHorizontal: 16, marginTop: 16, borderRadius: 20, padding: 18, shadowColor: "#0078D7", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: "#F1F5F9" },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  cardIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: "#EBF5FF", justifyContent: "center", alignItems: "center" },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: "800", color: "#0F172A" },

  badge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#F0FFF4", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeTxt: { fontSize: 11, fontWeight: "700", color: "#10B981" },
  badgeWarn: { backgroundColor: "#FFFBEB" },

  reviewCard: { backgroundColor: "#F8FAFC", borderRadius: 12, overflow: "hidden" },
  reviewRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  reviewLabel: { fontSize: 12, color: "#94A3B8", fontWeight: "600", flex: 1 },
  reviewValue: { fontSize: 13, fontWeight: "700", color: "#0F172A", flex: 2, textAlign: "right" },

  missingBox: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#FFFBEB", borderRadius: 12, padding: 14 },
  missingTxt: { flex: 1, fontSize: 13, color: "#92400E" },
  skippedBox: { backgroundColor: "#F8FAFC", borderRadius: 12, padding: 14, alignItems: "center" },
  skippedTxt: { fontSize: 13, color: "#94A3B8", fontStyle: "italic" },

  cta: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 },
  backBtn: { height: 50, borderRadius: 14, borderWidth: 1.5, borderColor: "#BFDBFE", backgroundColor: "#EFF6FF", flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 },
  backTxt: { fontSize: 15, fontWeight: "700", color: "#0078D7" },
  ctaBtn: { backgroundColor: "#10B981", borderRadius: 16, height: 56, justifyContent: "center", alignItems: "center", shadowColor: "#10B981", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  ctaInner: { flexDirection: "row", alignItems: "center", gap: 12 },
  ctaTxt: { fontSize: 16, fontWeight: "800", color: "#fff" },
});

export default ApplicationReviewStep;

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { jwtDecode } from 'jwt-decode';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Dimensions,
  Image,
  Linking,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text, TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const API_URL = Constants.expoConfig?.extra?.API_URL;
const S3_URL = Constants.expoConfig?.extra?.S3_FETCH_URL;
const CLOUDFRONT_URL = Constants.expoConfig?.extra?.CLOUDFRONT_URL;

const getImageUri = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const path = url.startsWith('/') ? url : `/${url}`;
  if (CLOUDFRONT_URL) return `${CLOUDFRONT_URL}${path}`;
  return `${S3_URL}${path}`;
};

interface BusinessDetails {
  id: string; user_id: string; name: string; email: string; phone: string;
  profile_image: string | null; address: string; city: string; state: string;
  pincode: string; business_type: string; is_business_verified: boolean;
  is_business_trusted: boolean; is_business_approved: boolean;
}
interface SocialDetails { linkedin: string | null; instagram: string | null; facebook: string | null; website: string | null; telegram: string | null; youtube: string | null; x: string | null; }
interface LegalDetails { aadhaar: string | null; pan: string | null; gst: string | null; msme: string | null; fassi: string | null; export_import: string | null; }

// ── Sub-components ────────────────────────────────────────────────────────────
const SectionCard = ({ icon, iconBg, iconColor, title, children }: any) => (
  <View style={styles.sectionCard}>
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={15} color={iconColor} />
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    {children}
  </View>
);

const InfoRow = ({ icon, iconBg, label, value }: any) => (
  value ? (
    <View style={styles.infoRow}>
      <View style={[styles.infoIconWrap, { backgroundColor: iconBg || '#EBF5FF' }]}>
        <Ionicons name={icon} size={13} color="#0078D7" />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  ) : null
);

const LegalBadge = ({ label }: { label: string }) => (
  <View style={styles.legalBadge}>
    <Ionicons name="checkmark-circle" size={13} color="#16A34A" />
    <Text style={styles.legalBadgeText}>{label}</Text>
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
const SellerProfile = () => {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const paramBusinessId = params.business_id as string;
  const paramUserId = params.user_id as string;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [business, setBusiness] = useState<BusinessDetails | null>(null);
  const [socialDetails, setSocialDetails] = useState<SocialDetails | null>(null);
  const [legalDetails, setLegalDetails] = useState<LegalDetails | null>(null);

  useEffect(() => { loadProfile(); }, [paramBusinessId, paramUserId]);
  useFocusEffect(useCallback(() => { loadProfile(); }, [paramBusinessId, paramUserId]));

  const loadProfile = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      const decoded: any = jwtDecode(token);

      let businessId = paramBusinessId;
      if (!businessId && paramUserId) {
        try {
          const res = await fetch(`${API_URL}/business/get/user/${paramUserId}`, { headers: { 'Content-Type': 'application/json' } });
          if (res.ok) { const r = await res.json(); businessId = r.business_id; }
        } catch { }
      }
      if (!businessId) {
        try {
          const res = await fetch(`${API_URL}/business/get/user/${decoded.user_id}`, { headers: { 'Content-Type': 'application/json' } });
          if (res.ok) { const r = await res.json(); businessId = r.business_id; }
        } catch { }
      }
      if (!businessId) { setLoading(false); return; }

      const completeRes = await fetch(`${API_URL}/business/get/complete/${businessId}`, { headers: { 'Content-Type': 'application/json' } });
      if (completeRes.ok) {
        const result = await completeRes.json();
        const details = result.details;
        setBusiness(details.business_details);
        setSocialDetails(details.social_details);
        setLegalDetails(details.legal_details);
      } else {
        const [bizRes, socialRes, legalRes] = await Promise.allSettled([
          fetch(`${API_URL}/business/get/${businessId}`, { headers: { 'Content-Type': 'application/json' } }),
          fetch(`${API_URL}/business/social/get/${businessId}`, { headers: { 'Content-Type': 'application/json' } }),
          fetch(`${API_URL}/business/legal/get/${businessId}`, { headers: { 'Content-Type': 'application/json' } }),
        ]);
        if (bizRes.status === 'fulfilled' && bizRes.value.ok) { const r = await bizRes.value.json(); setBusiness(r.details); }
        if (socialRes.status === 'fulfilled' && socialRes.value.ok) { const r = await socialRes.value.json(); setSocialDetails(r.details); }
        if (legalRes.status === 'fulfilled' && legalRes.value.ok) { const r = await legalRes.value.json(); setLegalDetails(r.details); }
      }
    } catch { }
    finally { setLoading(false); setRefreshing(false); }
  };

  const onRefresh = () => { setRefreshing(true); loadProfile(); };
  const handleSocialLink = (url: string | null) => { if (url) Linking.openURL(url); };

  const SOCIAL_LINKS = [
    { key: 'instagram', icon: 'logo-instagram', color: '#E4405F', bg: '#FCE7F3', label: 'Instagram' },
    { key: 'linkedin', icon: 'logo-linkedin', color: '#0A66C2', bg: '#E8F0FA', label: 'LinkedIn' },
    { key: 'facebook', icon: 'logo-facebook', color: '#1877F2', bg: '#EBF5FF', label: 'Facebook' },
    { key: 'youtube', icon: 'logo-youtube', color: '#FF0000', bg: '#FEF2F2', label: 'YouTube' },
    { key: 'x', icon: 'logo-twitter', color: '#1A1A1A', bg: '#F1F5F9', label: 'X' },
    { key: 'telegram', icon: 'paper-plane-outline', color: '#0088CC', bg: '#E5F5FD', label: 'Telegram' },
    { key: 'website', icon: 'globe-outline', color: '#334155', bg: '#F1F5F9', label: 'Website' },
  ];

  const PremiumHeader = () => (
    <View style={[styles.headerWrapper, { paddingTop: insets.top }]}>
      <View style={styles.orb1} /><View style={styles.orb2} />
      <View style={styles.headerInner}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={styles.headerEyebrow}>BUSINESS</Text>
          <Text style={styles.headerTitle}>Seller Profile</Text>
        </View>
        <TouchableOpacity style={styles.headerShareBtn} onPress={() => { }}>
          <Ionicons name="share-social-outline" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0060B8" />
        <PremiumHeader />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14 }}>
          <ActivityIndicator size="large" color="#0078D7" />
          <Text style={{ color: '#94A3B8', fontSize: 13, fontWeight: '500' }}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  if (!business) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0060B8" />
        <PremiumHeader />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
          <View style={styles.emptyIconWrap}><Ionicons name="business-outline" size={30} color="#0078D7" /></View>
          <Text style={styles.emptyTitle}>Profile Not Found</Text>
          <Text style={styles.emptySubtitle}>This seller profile could not be loaded.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadProfile}>
            <Ionicons name="refresh" size={15} color="#fff" />
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const imageUri = getImageUri(business.profile_image);
  const hasSocial = socialDetails && (socialDetails.linkedin || socialDetails.instagram || socialDetails.facebook || socialDetails.website || socialDetails.youtube || socialDetails.telegram || socialDetails.x);
  const hasLegal = legalDetails && (legalDetails.pan || legalDetails.gst || legalDetails.msme || legalDetails.aadhaar || legalDetails.fassi || legalDetails.export_import);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0060B8" />
      <PremiumHeader />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 50 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0078D7']} tintColor="#0078D7" />}
      >
        {/* ── Hero Profile Card ── */}
        <View style={styles.heroCard}>
          {/* Badges */}
          <View style={styles.badgeRow}>
            {business.is_business_trusted && (
              <View style={styles.badgeTrusted}>
                <Ionicons name="ribbon" size={11} color="#16A34A" />
                <Text style={styles.badgeTrustedText}>Trusted</Text>
              </View>
            )}
            {business.is_business_verified && (
              <View style={styles.badgeVerified}>
                <Ionicons name="shield-checkmark" size={11} color="#0078D7" />
                <Text style={styles.badgeVerifiedText}>Verified</Text>
              </View>
            )}
          </View>

          {/* Avatar + Info */}
          <View style={styles.avatarRow}>
            <View style={styles.avatarWrap}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.avatar} resizeMode="cover" />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="business" size={34} color="#0078D7" />
                </View>
              )}
              {business.is_business_verified && (
                <View style={styles.verifiedOverlay}>
                  <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
                </View>
              )}
            </View>

            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={styles.bizName}>{business.name}</Text>
              {(business.city || business.state) && (
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={11} color="#94A3B8" />
                  <Text style={styles.locationText}>{business.city}{business.state ? `, ${business.state}` : ''}</Text>
                </View>
              )}
              {business.business_type && (
                <View style={styles.typePill}>
                  <Ionicons name="briefcase-outline" size={11} color="#7C3AED" />
                  <Text style={styles.typePillText}>{business.business_type}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Contact Actions */}
          <View style={styles.contactRow}>
            <TouchableOpacity style={styles.contactBtn} onPress={() => { if (business.phone) Linking.openURL(`tel:${business.phone}`); }}>
              <View style={[styles.contactIcon, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="call-outline" size={20} color="#16A34A" />
              </View>
              <Text style={[styles.contactLabel, { color: '#16A34A' }]}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.contactBtn} onPress={() => { if (business.phone) Linking.openURL(`https://wa.me/${business.phone.replace(/[^0-9]/g, '')}`); }}>
              <View style={[styles.contactIcon, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
              </View>
              <Text style={[styles.contactLabel, { color: '#25D366' }]}>WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.contactBtn} onPress={() => { if (business.email) Linking.openURL(`mailto:${business.email}`); }}>
              <View style={[styles.contactIcon, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="mail-outline" size={20} color="#F59E0B" />
              </View>
              <Text style={[styles.contactLabel, { color: '#F59E0B' }]}>Email</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.contactBtn}
              onPress={() => router.push({ pathname: '/pages/bussinesProfile' as any, params: { business_id: business.id } })}
            >
              <View style={[styles.contactIcon, { backgroundColor: '#EBF5FF' }]}>
                <Ionicons name="storefront-outline" size={20} color="#0078D7" />
              </View>
              <Text style={[styles.contactLabel, { color: '#0078D7' }]}>Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Social Media Pills ── */}
        {hasSocial && (
          <SectionCard icon="share-social-outline" iconBg="#FCE7F3" iconColor="#EC4899" title="Connect on Social">
            <View style={styles.socialPillsRow}>
              {SOCIAL_LINKS.map((s) => {
                const url = (socialDetails as any)?.[s.key];
                if (!url) return null;
                return (
                  <TouchableOpacity key={s.key} style={[styles.socialPill, { backgroundColor: s.bg }]} onPress={() => handleSocialLink(url)}>
                    <Ionicons name={s.icon as any} size={16} color={s.color} />
                    <Text style={[styles.socialPillText, { color: s.color }]}>{s.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </SectionCard>
        )}

        {/* ── Business Info ── */}
        <SectionCard icon="storefront-outline" iconBg="#EBF5FF" iconColor="#0078D7" title="Business Information">
          <InfoRow icon="mail-outline" iconBg="#EBF5FF" label="Email" value={business.email} />
          <InfoRow icon="call-outline" iconBg="#DCFCE7" label="Phone" value={business.phone} />
          <InfoRow icon="location-outline" iconBg="#FEF3C7" label="Address" value={[business.address, business.city, business.state, business.pincode].filter(Boolean).join(', ')} />
          <InfoRow icon="briefcase-outline" iconBg="#F3EEFF" label="Business Type" value={business.business_type} />
        </SectionCard>

        {/* ── Legal Credentials ── */}
        {hasLegal && (
          <SectionCard icon="shield-checkmark-outline" iconBg="#DCFCE7" iconColor="#16A34A" title="Legal Credentials">
            <View style={styles.legalBadgesWrap}>
              {legalDetails!.pan && <LegalBadge label="PAN" />}
              {legalDetails!.gst && <LegalBadge label="GST" />}
              {legalDetails!.msme && <LegalBadge label="MSME" />}
              {legalDetails!.aadhaar && <LegalBadge label="Aadhaar" />}
              {legalDetails!.fassi && <LegalBadge label="FSSAI" />}
              {legalDetails!.export_import && <LegalBadge label="Export/Import" />}
            </View>
          </SectionCard>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
};

export default SellerProfile;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9FC' },

  /* ── Header ── */
  headerWrapper: { backgroundColor: '#0060B8', paddingHorizontal: 20, paddingBottom: 22, overflow: 'hidden', shadowColor: '#003E80', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 24, elevation: 18 },
  orb1: { position: 'absolute', width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(255,255,255,0.06)', top: -80, right: -60 },
  orb2: { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.04)', bottom: 5, left: -50 },
  headerInner: { flexDirection: 'row', alignItems: 'center', paddingTop: 16 },
  headerBackBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  headerEyebrow: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.65)', letterSpacing: 2, marginBottom: 2 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.4 },
  headerShareBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },

  /* Empty / loading */
  emptyIconWrap: { width: 70, height: 70, borderRadius: 24, backgroundColor: '#EBF5FF', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 6 },
  emptySubtitle: { fontSize: 13, color: '#94A3B8', textAlign: 'center', marginBottom: 20 },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0078D7', paddingHorizontal: 22, paddingVertical: 12, borderRadius: 14 },
  retryBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  /* Hero Card */
  heroCard: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 16, borderRadius: 24, padding: 20, shadowColor: '#1B4FBF', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 18, elevation: 6, borderWidth: 1, borderColor: '#F0F4F8' },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  badgeTrusted: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  badgeTrustedText: { fontSize: 11, fontWeight: '800', color: '#16A34A' },
  badgeVerified: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EBF5FF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  badgeVerifiedText: { fontSize: 11, fontWeight: '800', color: '#0078D7' },

  avatarRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 80, height: 80, borderRadius: 20, borderWidth: 3, borderColor: '#EBF5FF' },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 20, backgroundColor: '#EBF5FF', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#DBEAFE' },
  verifiedOverlay: { position: 'absolute', top: -6, right: -6, backgroundColor: '#fff', borderRadius: 10 },
  bizName: { fontSize: 18, fontWeight: '800', color: '#0F172A', letterSpacing: -0.3, marginBottom: 6 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  locationText: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },
  typePill: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: '#F3EEFF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  typePillText: { fontSize: 11, fontWeight: '700', color: '#7C3AED' },

  /* Contact Row */
  contactRow: { flexDirection: 'row', justifyContent: 'space-around', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 16, marginTop: 4 },
  contactBtn: { alignItems: 'center', gap: 6 },
  contactIcon: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  contactLabel: { fontSize: 11, fontWeight: '800' },

  /* Section Card */
  sectionCard: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 14, borderRadius: 22, padding: 18, shadowColor: '#1B4FBF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 14, elevation: 4, borderWidth: 1, borderColor: '#F0F4F8' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  sectionIconWrap: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A' },

  /* Info Rows */
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F8FAFC', gap: 12 },
  infoIconWrap: { width: 28, height: 28, borderRadius: 9, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '700', marginBottom: 3, letterSpacing: 0.4, textTransform: 'uppercase' },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#0F172A', lineHeight: 20 },

  /* Legal Badges */
  legalBadgesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 4 },
  legalBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#DCFCE7', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12 },
  legalBadgeText: { fontSize: 12, fontWeight: '700', color: '#16A34A' },

  /* Social Pills */
  socialPillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 4 },
  socialPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  socialPillText: { fontSize: 12, fontWeight: '700' },
});

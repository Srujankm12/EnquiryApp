import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { jwtDecode } from 'jwt-decode';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text, TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const API_URL = Constants.expoConfig?.extra?.API_URL;

interface SocialData {
  website: string; instagram: string; facebook: string;
  linkedin: string; youtube: string; x: string; telegram: string;
}

const SOCIAL_FIELDS: { key: keyof SocialData; icon: any; label: string; placeholder: string; color: string; bg: string }[] = [
  { key: 'website', icon: 'globe-outline', label: 'Website', placeholder: 'https://yourwebsite.com', color: '#0F172A', bg: '#F1F5F9' },
  { key: 'instagram', icon: 'logo-instagram', label: 'Instagram', placeholder: 'https://instagram.com/yourbusiness', color: '#E4405F', bg: '#FEF1F4' },
  { key: 'facebook', icon: 'logo-facebook', label: 'Facebook', placeholder: 'https://facebook.com/yourbusiness', color: '#1877F2', bg: '#EBF5FE' },
  { key: 'linkedin', icon: 'logo-linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/company/...', color: '#0A66C2', bg: '#E8F0FA' },
  { key: 'youtube', icon: 'logo-youtube', label: 'YouTube', placeholder: 'https://youtube.com/@yourchannel', color: '#FF0000', bg: '#FEE8E8' },
  { key: 'x', icon: 'logo-twitter', label: 'X (Twitter)', placeholder: 'https://x.com/yourbusiness', color: '#1A1A1A', bg: '#F1F5F9' },
  { key: 'telegram', icon: 'paper-plane-outline', label: 'Telegram', placeholder: 'https://t.me/yourbusiness', color: '#0088CC', bg: '#E5F5FD' },
];

const EditSocialMediaScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [businessId, setBusinessId] = useState('');
  const [form, setForm] = useState<SocialData>({ website: '', instagram: '', facebook: '', linkedin: '', youtube: '', x: '', telegram: '' });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      const decoded: any = jwtDecode(token);
      const storedId = await AsyncStorage.getItem('companyId');
      const bId = storedId || decoded.business_id;
      setBusinessId(bId);
      if (bId) {
        const res = await fetch(`${API_URL}/business/get/complete/${bId}`, { headers: { 'Content-Type': 'application/json' } });
        if (res.ok) {
          const result = await res.json();
          const social = result.details?.social_details || {};
          setForm({ website: social.website || '', instagram: social.instagram || '', facebook: social.facebook || '', linkedin: social.linkedin || '', youtube: social.youtube || '', x: social.x || '', telegram: social.telegram || '' });
        }
      }
    } catch (e) { console.error(e); }
    finally { if (showLoader) setLoading(false); setRefreshing(false); }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_URL}/business/social/update/${businessId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (res.ok) { Alert.alert('Success', 'Social media links updated!'); router.back(); }
      else Alert.alert('Error', 'Failed to update social links.');
    } catch { Alert.alert('Error', 'Something went wrong.'); }
    finally { setSaving(false); }
  };

  const filledCount = Object.values(form).filter(v => v.trim()).length;

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
            <Text style={styles.eyebrow}>BUSINESS PRESENCE</Text>
            <Text style={styles.headerTitle}>Social Media</Text>
          </View>
          <TouchableOpacity style={[styles.saveHeaderBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveHeaderBtnText}>Save</Text>}
          </TouchableOpacity>
        </View>
        {/* Progress */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(filledCount / SOCIAL_FIELDS.length) * 100}%` }]} />
        </View>
        <Text style={styles.progressLabel}>{filledCount} of {SOCIAL_FIELDS.length} platforms linked</Text>
      </View>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#0078D7" />
          <Text style={styles.loaderText}>Loading social links...</Text>
        </View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(false); }} colors={['#0078D7']} tintColor="#0078D7" />}
          >
            {/* Info Banner */}
            <View style={styles.infoBanner}>
              <View style={styles.infoBannerIcon}>
                <Ionicons name="share-social" size={18} color="#EC4899" />
              </View>
              <Text style={styles.infoBannerText}>
                Connect your social platforms so customers can follow and engage with your brand.
              </Text>
            </View>

            {/* Connected Platforms Preview */}
            {filledCount > 0 && (
              <View style={styles.previewCard}>
                <Text style={styles.previewTitle}>Connected Platforms</Text>
                <View style={styles.previewChips}>
                  {SOCIAL_FIELDS.filter(f => form[f.key].trim()).map(f => (
                    <View key={f.key} style={[styles.previewChip, { backgroundColor: f.bg }]}>
                      <Ionicons name={f.icon} size={14} color={f.color} />
                      <Text style={[styles.previewChipText, { color: f.color }]}>{f.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Fields */}
            <View style={styles.card}>
              {SOCIAL_FIELDS.map((f, idx) => (
                <View key={f.key} style={[styles.fieldGroup, idx === SOCIAL_FIELDS.length - 1 && { borderBottomWidth: 0, marginBottom: 0 }]}>
                  <View style={styles.fieldLabelRow}>
                    <View style={[styles.fieldIconWrap, { backgroundColor: f.bg }]}>
                      <Ionicons name={f.icon} size={16} color={f.color} />
                    </View>
                    <Text style={styles.fieldLabel}>{f.label}</Text>
                    {form[f.key].trim() ? <Ionicons name="checkmark-circle" size={16} color="#16A34A" /> : null}
                  </View>
                  <View style={[styles.inputWrap, form[f.key].trim() && { borderColor: f.color + '55', backgroundColor: f.bg }]}>
                    <TextInput
                      style={styles.input}
                      value={form[f.key]}
                      onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))}
                      placeholder={f.placeholder}
                      placeholderTextColor="#CBD5E1"
                      autoCapitalize="none"
                      keyboardType="url"
                    />
                    {form[f.key].trim() ? (
                      <TouchableOpacity onPress={() => setForm(p => ({ ...p, [f.key]: '' }))} style={styles.clearBtn}>
                        <Ionicons name="close-circle" size={16} color="#CBD5E1" />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>

            {/* Save */}
            <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                  <Text style={styles.saveBtnText}>Save Social Links</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
};

export default EditSocialMediaScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9FC' },
  headerWrapper: {
    backgroundColor: '#0060B8', paddingHorizontal: 20, paddingBottom: 20, overflow: 'hidden',
    shadowColor: '#003E80', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 24, elevation: 18,
  },
  orb1: { position: 'absolute', width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(255,255,255,0.06)', top: -80, right: -60 },
  orb2: { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.04)', bottom: 5, left: -50 },
  headerInner: { flexDirection: 'row', alignItems: 'center', paddingTop: 16, marginBottom: 16 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  eyebrow: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.65)', letterSpacing: 2, marginBottom: 2 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.4 },
  saveHeaderBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  saveHeaderBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  progressBar: { height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4, marginBottom: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#F472B6', borderRadius: 4 },
  progressLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loaderText: { fontSize: 13, color: '#94A3B8', fontWeight: '500' },
  infoBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FCE7F3', marginHorizontal: 16, marginTop: 18, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#FBCFE8' },
  infoBannerIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#FBBFE4', justifyContent: 'center', alignItems: 'center' },
  infoBannerText: { flex: 1, fontSize: 12, color: '#9D174D', fontWeight: '600', lineHeight: 18 },
  previewCard: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#F0F4F8' },
  previewTitle: { fontSize: 10, fontWeight: '800', color: '#94A3B8', letterSpacing: 1.5, marginBottom: 10, textTransform: 'uppercase' },
  previewChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  previewChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  previewChipText: { fontSize: 12, fontWeight: '700' },
  card: { backgroundColor: '#fff', borderRadius: 22, marginHorizontal: 16, marginTop: 12, padding: 18, shadowColor: '#1B4FBF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 14, elevation: 4, borderWidth: 1, borderColor: '#F0F4F8' },
  fieldGroup: { marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  fieldIconWrap: { width: 30, height: 30, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  fieldLabel: { flex: 1, fontSize: 13, fontWeight: '700', color: '#334155' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7F9FC', borderRadius: 14, borderWidth: 1.5, borderColor: '#E2E8F0', paddingHorizontal: 14 },
  input: { flex: 1, fontSize: 13, color: '#0F172A', fontWeight: '500', paddingVertical: 12 },
  clearBtn: { padding: 4 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#EC4899', marginHorizontal: 16, marginTop: 20, paddingVertical: 16, borderRadius: 16, shadowColor: '#EC4899', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 7 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});

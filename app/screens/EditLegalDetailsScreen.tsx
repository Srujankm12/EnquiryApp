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

interface LegalData {
  pan: string; gst: string; msme: string;
  aadhaar: string; fassi: string; export_import: string;
}

const FIELDS: { key: keyof LegalData; icon: any; label: string; placeholder: string; maxLength?: number; keyboard?: any; upper?: boolean }[] = [
  { key: 'pan', icon: 'card-outline', label: 'PAN Number', placeholder: 'ABCDE1234F', maxLength: 10, upper: true },
  { key: 'gst', icon: 'receipt-outline', label: 'GST Number', placeholder: '22AAAAA0000A1Z5', maxLength: 15, upper: true },
  { key: 'msme', icon: 'business-outline', label: 'MSME (Udyam) Number', placeholder: 'UDYAM-XX-00-0000000' },
  { key: 'aadhaar', icon: 'finger-print-outline', label: 'Aadhaar Number', placeholder: '1234 5678 9012', maxLength: 12, keyboard: 'number-pad' },
  { key: 'fassi', icon: 'nutrition-outline', label: 'FSSAI License', placeholder: '12345678901234', maxLength: 14 },
  { key: 'export_import', icon: 'globe-outline', label: 'Export / Import Code', placeholder: 'IEC Code' },
];

const EditLegalDetailsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [businessId, setBusinessId] = useState('');
  const [form, setForm] = useState<LegalData>({ pan: '', gst: '', msme: '', aadhaar: '', fassi: '', export_import: '' });

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
          const legal = result.details?.legal_details || {};
          setForm({ pan: legal.pan || '', gst: legal.gst || '', msme: legal.msme || '', aadhaar: legal.aadhaar || '', fassi: legal.fassi || '', export_import: legal.export_import || '' });
        }
      }
    } catch (e) { console.error(e); }
    finally { if (showLoader) setLoading(false); setRefreshing(false); }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_URL}/business/legal/update/${businessId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (res.ok) { Alert.alert('Success', 'Legal details updated!'); router.back(); }
      else Alert.alert('Error', 'Failed to update legal details.');
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
            <Text style={styles.eyebrow}>LEGAL & COMPLIANCE</Text>
            <Text style={styles.headerTitle}>Legal Details</Text>
          </View>
          <TouchableOpacity style={[styles.saveHeaderBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveHeaderBtnText}>Save</Text>}
          </TouchableOpacity>
        </View>
        {/* Progress bar */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(filledCount / FIELDS.length) * 100}%` }]} />
        </View>
        <Text style={styles.progressLabel}>{filledCount} of {FIELDS.length} fields filled</Text>
      </View>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#0078D7" />
          <Text style={styles.loaderText}>Loading legal details...</Text>
        </View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(false); }} colors={['#16A34A']} tintColor="#16A34A" />}
          >
            {/* Info Banner */}
            <View style={styles.infoBanner}>
              <View style={styles.infoBannerIcon}>
                <Ionicons name="shield-checkmark" size={18} color="#16A34A" />
              </View>
              <Text style={styles.infoBannerText}>
                Adding legal details builds trust with buyers and helps verify your business.
              </Text>
            </View>

            {/* Fields Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconWrap, { backgroundColor: '#DCFCE7' }]}>
                  <Ionicons name="document-text-outline" size={16} color="#16A34A" />
                </View>
                <Text style={styles.cardTitle}>Registration Numbers</Text>
              </View>

              {FIELDS.map((f, idx) => (
                <View key={f.key} style={[styles.fieldGroup, idx === FIELDS.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={styles.fieldLabelRow}>
                    <View style={[styles.fieldIconWrap, form[f.key] ? { backgroundColor: '#DCFCE7' } : { backgroundColor: '#F1F5F9' }]}>
                      <Ionicons name={f.icon} size={14} color={form[f.key] ? '#16A34A' : '#94A3B8'} />
                    </View>
                    <Text style={styles.fieldLabel}>{f.label}</Text>
                    {form[f.key] ? <Ionicons name="checkmark-circle" size={16} color="#16A34A" /> : null}
                  </View>
                  <View style={[styles.inputWrap, form[f.key] && styles.inputWrapFilled]}>
                    <TextInput
                      style={styles.input}
                      value={form[f.key]}
                      onChangeText={v => setForm(p => ({ ...p, [f.key]: f.upper ? v.toUpperCase() : v }))}
                      keyboardType={f.keyboard || 'default'}
                      maxLength={f.maxLength}
                      placeholder={f.placeholder}
                      placeholderTextColor="#CBD5E1"
                      autoCapitalize={f.upper ? 'characters' : 'none'}
                    />
                    {form[f.key] ? (
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
                  <Text style={styles.saveBtnText}>Save Legal Details</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
};

export default EditLegalDetailsScreen;

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
  progressFill: { height: '100%', backgroundColor: '#4ADE80', borderRadius: 4 },
  progressLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loaderText: { fontSize: 13, color: '#94A3B8', fontWeight: '500' },
  infoBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#DCFCE7', marginHorizontal: 16, marginTop: 18, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#BBF7D0' },
  infoBannerIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#BBFDE8', justifyContent: 'center', alignItems: 'center' },
  infoBannerText: { flex: 1, fontSize: 12, color: '#15803D', fontWeight: '600', lineHeight: 18 },
  card: { backgroundColor: '#fff', borderRadius: 22, marginHorizontal: 16, marginTop: 16, padding: 18, shadowColor: '#1B4FBF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 14, elevation: 4, borderWidth: 1, borderColor: '#F0F4F8' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  cardIconWrap: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  fieldGroup: { marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  fieldIconWrap: { width: 28, height: 28, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  fieldLabel: { flex: 1, fontSize: 11, fontWeight: '700', color: '#64748B', letterSpacing: 0.3 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7F9FC', borderRadius: 14, borderWidth: 1.5, borderColor: '#E2E8F0', paddingHorizontal: 14 },
  inputWrapFilled: { borderColor: '#BBF7D0', backgroundColor: '#F0FFF4' },
  input: { flex: 1, fontSize: 14, color: '#0F172A', fontWeight: '600', paddingVertical: 13, fontFamily: 'monospace' },
  clearBtn: { padding: 4 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#16A34A', marginHorizontal: 16, marginTop: 20, paddingVertical: 16, borderRadius: 16, shadowColor: '#16A34A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 7 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});

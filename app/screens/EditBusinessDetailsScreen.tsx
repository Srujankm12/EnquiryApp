import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Dimensions,
  Image,
  KeyboardAvoidingView, Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import LocationDropdown from '../../components/LocationDropdown';
import { getCitiesForState, getPincodeForCity, STATES } from '../utils/indiaData';

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

// ── Styled Input Field ────────────────────────────────────────────────────
const InputField = ({
  icon, label, value, onChangeText, keyboardType, multiline, maxLength, placeholder,
}: {
  icon: keyof typeof Ionicons.glyphMap; label: string; value: string;
  onChangeText: (t: string) => void; keyboardType?: any;
  multiline?: boolean; maxLength?: number; placeholder?: string;
}) => (
  <View style={styles.inputGroup}>
    <Text style={styles.inputLabel}>{label}</Text>
    <View style={[styles.inputRow, multiline && { alignItems: 'flex-start' }]}>
      <View style={styles.inputIconWrap}>
        <Ionicons name={icon} size={16} color="#0078D7" />
      </View>
      <TextInput
        style={[styles.input, multiline && { height: 90, textAlignVertical: 'top', paddingTop: 10 }]}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        multiline={multiline}
        maxLength={maxLength}
        placeholder={placeholder || label}
        placeholderTextColor="#CBD5E1"
      />
    </View>
  </View>
);

interface BusinessData {
  name: string; email: string; phone: string; business_type: string;
  address: string; city: string; state: string; pincode: string; description: string;
}

const EditBusinessDetailsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [businessId, setBusinessId] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [form, setForm] = useState<BusinessData>({
    name: '', email: '', phone: '', business_type: '',
    address: '', city: '', state: '', pincode: '', description: '',
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      const { jwtDecode } = await import('jwt-decode');
      const decoded: any = jwtDecode(token);
      const storedId = await AsyncStorage.getItem('companyId');
      const bId = storedId || decoded.business_id;
      setBusinessId(bId);
      if (bId) {
        const res = await fetch(`${API_URL}/business/get/complete/${bId}`, { headers: { 'Content-Type': 'application/json' } });
        if (res.ok) {
          const result = await res.json();
          const biz = result.details?.business_details || {};
          setForm({ name: biz.name || '', email: biz.email || '', phone: biz.phone || '', business_type: biz.business_type || '', address: biz.address || '', city: biz.city || '', state: biz.state || '', pincode: biz.pincode || '', description: biz.description || '' });
          if (biz.profile_image) setProfileImage(`${getImageUri(biz.profile_image)}?t=${Date.now()}`);
        }
      }
    } catch (e) { console.error(e); }
    finally { if (showLoader) setLoading(false); setRefreshing(false); }
  };

  const handleImagePick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      if (result.canceled || !result.assets?.[0]) return;
      setUploadingImage(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      const presignRes = await fetch(`${API_URL}/business/update/image/${businessId}`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
      const presignData = await presignRes.json();
      const s3Url = presignData.url;
      if (!s3Url) throw new Error('No presigned URL');
      const imageResponse = await fetch(result.assets[0].uri);
      const blob = await imageResponse.blob();
      await fetch(s3Url, { method: 'PUT', body: blob, headers: { 'Content-Type': blob.type || 'image/jpeg' } });
      await fetchData(false);
      const { Alert } = await import('react-native');
      Alert.alert('Success', 'Business photo updated!');
    } catch { const { Alert } = await import('react-native'); Alert.alert('Error', 'Failed to update photo.'); }
    finally { setUploadingImage(false); }
  };

  const handleSave = async () => {
    const { Alert } = await import('react-native');
    if (!form.name.trim()) { Alert.alert('Required', 'Business name is required.'); return; }
    try {
      setSaving(true);
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_URL}/business/update/${businessId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (res.ok) { Alert.alert('Success', 'Business details updated!'); router.back(); }
      else Alert.alert('Error', 'Failed to update details.');
    } catch { const { Alert } = await import('react-native'); Alert.alert('Error', 'Something went wrong.'); }
    finally { setSaving(false); }
  };

  const updateField = (key: keyof BusinessData, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  // Cascading dropdown helpers
  const stateOptions = useMemo(() => STATES.map(s => ({ label: s, value: s })), []);
  const cityOptions = useMemo(
    () => getCitiesForState(form.state).map(c => ({ label: c.name, value: c.name })),
    [form.state]
  );
  const pincodeOptions = useMemo(
    () => getCitiesForState(form.state).map(c => ({ label: `${c.name} — ${c.pincode}`, value: c.pincode })),
    [form.state]
  );

  const handleStateSelect = (stateName: string) => {
    setForm(prev => ({ ...prev, state: stateName, city: '', pincode: '' }));
  };
  const handleCitySelect = (cityName: string) => {
    const pincode = getPincodeForCity(form.state, cityName);
    setForm(prev => ({ ...prev, city: cityName, pincode }));
  };

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
            <Text style={styles.eyebrow}>BUSINESS</Text>
            <Text style={styles.headerTitle}>Edit Details</Text>
          </View>
          <TouchableOpacity style={[styles.saveHeaderBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveHeaderBtnText}>Save</Text>}
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#0078D7" />
          <Text style={styles.loaderText}>Loading details...</Text>
        </View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(false); }} colors={['#0078D7']} tintColor="#0078D7" />}
          >
            {/* Photo */}
            <View style={styles.photoSection}>
              <TouchableOpacity style={styles.photoWrap} onPress={handleImagePick} disabled={uploadingImage} activeOpacity={0.85}>
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.photo} resizeMode="cover" />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Ionicons name="business" size={40} color="#0078D7" />
                  </View>
                )}
                <View style={styles.cameraBtn}>
                  {uploadingImage ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="camera" size={14} color="#fff" />}
                </View>
              </TouchableOpacity>
              <Text style={styles.photoHint}>Tap to change business photo</Text>
            </View>

            {/* Business Info Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconWrap, { backgroundColor: '#EBF5FF' }]}>
                  <Ionicons name="storefront-outline" size={16} color="#0078D7" />
                </View>
                <Text style={styles.cardTitle}>Business Information</Text>
              </View>
              <InputField icon="storefront-outline" label="Business Name" value={form.name} onChangeText={v => updateField('name', v)} placeholder="Enter business name" />
              <InputField icon="mail-outline" label="Email" value={form.email} onChangeText={v => updateField('email', v)} keyboardType="email-address" placeholder="business@example.com" />
              <InputField icon="call-outline" label="Phone" value={form.phone} onChangeText={v => updateField('phone', v)} keyboardType="phone-pad" placeholder="+91 00000 00000" />
              <InputField icon="briefcase-outline" label="Business Type" value={form.business_type} onChangeText={v => updateField('business_type', v)} placeholder="e.g. Manufacturer, Wholesaler" />
              <InputField icon="document-text-outline" label="Description" value={form.description} onChangeText={v => updateField('description', v)} multiline placeholder="Tell customers about your business..." />
            </View>

            {/* Address Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconWrap, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="location-outline" size={16} color="#F59E0B" />
                </View>
                <Text style={styles.cardTitle}>Address</Text>
              </View>

              <InputField icon="map-outline" label="Street Address" value={form.address} onChangeText={v => updateField('address', v)} multiline placeholder="Full address" />

              {/* State Dropdown */}
              <LocationDropdown
                label="State"
                placeholder="Select State"
                value={form.state}
                options={stateOptions}
                onSelect={handleStateSelect}
                variant="card"
              />

              {/* City Dropdown */}
              <LocationDropdown
                label="City"
                placeholder={form.state ? "Select City" : "Select State first"}
                value={form.city}
                options={cityOptions}
                onSelect={handleCitySelect}
                disabled={!form.state}
                variant="card"
              />

              {/* Pincode Dropdown */}
              <LocationDropdown
                label="Pincode"
                placeholder={form.state ? "Select Pincode" : "Select State first"}
                value={form.pincode}
                options={pincodeOptions}
                onSelect={v => updateField('pincode', v)}
                disabled={!form.state}
                variant="card"
              />
            </View>

            {/* Save Button */}
            <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
            <View style={{ height: 20 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
};

export default EditBusinessDetailsScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9FC' },
  headerWrapper: {
    backgroundColor: '#0060B8', paddingHorizontal: 20, paddingBottom: 22, overflow: 'hidden',
    shadowColor: '#003E80', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 24, elevation: 18,
  },
  orb1: { position: 'absolute', width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(255,255,255,0.06)', top: -80, right: -60 },
  orb2: { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.04)', bottom: 5, left: -50 },
  headerInner: { flexDirection: 'row', alignItems: 'center', paddingTop: 16 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  eyebrow: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.65)', letterSpacing: 2, marginBottom: 2 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.4 },
  saveHeaderBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  saveHeaderBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loaderText: { fontSize: 13, color: '#94A3B8', fontWeight: '500' },
  photoSection: { alignItems: 'center', marginTop: 24, marginBottom: 6 },
  photoWrap: { position: 'relative', width: 96, height: 96 },
  photo: { width: 96, height: 96, borderRadius: 24, borderWidth: 3, borderColor: '#EBF5FF' },
  photoPlaceholder: { width: 96, height: 96, borderRadius: 24, backgroundColor: '#EBF5FF', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#DBEAFE' },
  cameraBtn: { position: 'absolute', bottom: -4, right: -4, width: 28, height: 28, borderRadius: 14, backgroundColor: '#0078D7', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  photoHint: { fontSize: 12, color: '#94A3B8', marginTop: 10, fontWeight: '500' },
  card: { backgroundColor: '#fff', borderRadius: 22, marginHorizontal: 16, marginTop: 16, padding: 18, shadowColor: '#1B4FBF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 14, elevation: 4, borderWidth: 1, borderColor: '#F0F4F8' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  cardIconWrap: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A', letterSpacing: -0.2 },
  inputGroup: { marginBottom: 14 },
  inputLabel: { fontSize: 10, fontWeight: '700', color: '#94A3B8', marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase' },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7F9FC', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 12 },
  inputIconWrap: { width: 28, height: 28, borderRadius: 9, backgroundColor: '#EBF5FF', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  input: { flex: 1, fontSize: 14, color: '#0F172A', fontWeight: '600', paddingVertical: 13 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#0078D7', marginHorizontal: 16, marginTop: 20, paddingVertical: 16, borderRadius: 16, shadowColor: '#0078D7', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 7 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});

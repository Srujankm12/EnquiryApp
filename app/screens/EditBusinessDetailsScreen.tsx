import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import Constants from 'expo-constants';

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

interface BusinessData {
  name: string;
  email: string;
  phone: string;
  business_type: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  description: string;
}

const EditBusinessDetailsScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [businessId, setBusinessId] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [form, setForm] = useState<BusinessData>({
    name: '',
    email: '',
    phone: '',
    business_type: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    description: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

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
        const res = await fetch(`${API_URL}/business/get/complete/${bId}`, {
          headers: { 'Content-Type': 'application/json' },
        });
        if (res.ok) {
          const result = await res.json();
          const biz = result.details?.business_details || {};
          setForm({
            name: biz.name || '',
            email: biz.email || '',
            phone: biz.phone || '',
            business_type: biz.business_type || '',
            address: biz.address || '',
            city: biz.city || '',
            state: biz.state || '',
            pincode: biz.pincode || '',
            description: biz.description || '',
          });
          if (biz.profile_image) {
            setProfileImage(`${getImageUri(biz.profile_image)}?t=${Date.now()}`);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching business details:', error);
    } finally {
      if (showLoader) setLoading(false);
      setRefreshing(false);
    }
  };

  const handleImagePick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]) return;

      setUploadingImage(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      // Step 1: Get presigned URL
      const presignRes = await fetch(`${API_URL}/business/get/presigned/${businessId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const presignData = await presignRes.json();
      const s3Url = presignData.data?.url || presignData.url;
      if (!s3Url) throw new Error('No presigned URL');

      // Step 2: Upload to S3
      const imageResponse = await fetch(result.assets[0].uri);
      const blob = await imageResponse.blob();
      await fetch(s3Url, {
        method: 'PUT',
        body: blob,
        headers: { 'Content-Type': blob.type || 'image/jpeg' },
      });

      // Step 3: Save image path
      await fetch(`${API_URL}/business/update/image/${businessId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });

      await fetchData(false);
      Alert.alert('Success', 'Business photo updated!');
    } catch (error) {
      console.error('Image upload error:', error);
      Alert.alert('Error', 'Failed to update photo.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Required', 'Business name is required.');
      return;
    }
    try {
      setSaving(true);
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_URL}/business/update/${businessId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        Alert.alert('Success', 'Business details updated!');
        router.back();
      } else {
        Alert.alert('Error', 'Failed to update details.');
      }
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (key: keyof BusinessData, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#177DDF" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Business</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#177DDF" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#177DDF" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Business</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(false); }} colors={['#177DDF']} />
        }
      >
        {/* Profile Photo */}
        <View style={styles.photoSection}>
          <TouchableOpacity style={styles.photoContainer} onPress={handleImagePick} disabled={uploadingImage}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="business" size={40} color="#177DDF" />
              </View>
            )}
            <View style={styles.cameraBtn}>
              {uploadingImage ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Ionicons name="camera" size={16} color="#FFF" />
              )}
            </View>
          </TouchableOpacity>
          <Text style={styles.photoHint}>Tap to change business photo</Text>
        </View>

        {/* Form Fields */}
        <View style={styles.card}>
          <InputField icon="storefront-outline" label="Business Name" value={form.name} onChangeText={(v) => updateField('name', v)} />
          <InputField icon="mail-outline" label="Email" value={form.email} onChangeText={(v) => updateField('email', v)} keyboardType="email-address" />
          <InputField icon="call-outline" label="Phone" value={form.phone} onChangeText={(v) => updateField('phone', v)} keyboardType="phone-pad" />
          <InputField icon="briefcase-outline" label="Business Type" value={form.business_type} onChangeText={(v) => updateField('business_type', v)} />
          <InputField icon="document-text-outline" label="Description" value={form.description} onChangeText={(v) => updateField('description', v)} multiline />
        </View>

        <View style={styles.card}>
          <View style={styles.cardTitle}>
            <Ionicons name="location-outline" size={18} color="#FF9500" />
            <Text style={styles.cardTitleText}>Address</Text>
          </View>
          <InputField icon="map-outline" label="Address" value={form.address} onChangeText={(v) => updateField('address', v)} multiline />
          <InputField icon="navigate-outline" label="City" value={form.city} onChangeText={(v) => updateField('city', v)} />
          <InputField icon="globe-outline" label="State" value={form.state} onChangeText={(v) => updateField('state', v)} />
          <InputField icon="pin-outline" label="Pincode" value={form.pincode} onChangeText={(v) => updateField('pincode', v)} keyboardType="number-pad" maxLength={6} />
        </View>

        {/* Save Button */}
        <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const InputField = ({
  icon, label, value, onChangeText, keyboardType, multiline, maxLength,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: any;
  multiline?: boolean;
  maxLength?: number;
}) => (
  <View style={styles.inputGroup}>
    <Text style={styles.inputLabel}>{label}</Text>
    <View style={styles.inputRow}>
      <Ionicons name={icon} size={18} color="#888" style={{ marginRight: 10, marginTop: multiline ? 12 : 0 }} />
      <TextInput
        style={[styles.input, multiline && { height: 80, textAlignVertical: 'top' }]}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        multiline={multiline}
        maxLength={maxLength}
        placeholderTextColor="#CCC"
      />
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    backgroundColor: '#177DDF', paddingTop: 50, paddingBottom: 15, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16 },
  photoSection: { alignItems: 'center', marginBottom: 20 },
  photoContainer: { position: 'relative', width: 100, height: 100 },
  photo: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#E0E0E0', borderWidth: 3, borderColor: '#FFF' },
  photoPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#FFF' },
  cameraBtn: {
    position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#177DDF', justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#FFF',
  },
  photoHint: { fontSize: 12, color: '#888', marginTop: 8 },
  card: {
    backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginBottom: 12,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  cardTitle: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  cardTitleText: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  inputGroup: { marginBottom: 14 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#888', marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-start' },
  input: {
    flex: 1, borderWidth: 1, borderColor: '#E8E8E8', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1A1A1A', backgroundColor: '#FAFAFA',
  },
  saveBtn: {
    flexDirection: 'row', backgroundColor: '#177DDF', paddingVertical: 16, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4,
  },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});

export default EditBusinessDetailsScreen;

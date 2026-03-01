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
  StatusBar,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.API_URL;

interface LegalData {
  pan: string;
  gst: string;
  msme: string;
  aadhaar: string;
  fassi: string;
  export_import: string;
}

const EditLegalDetailsScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [businessId, setBusinessId] = useState('');
  const [form, setForm] = useState<LegalData>({
    pan: '',
    gst: '',
    msme: '',
    aadhaar: '',
    fassi: '',
    export_import: '',
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
          const legal = result.details?.legal_details || {};
          setForm({
            pan: legal.pan || '',
            gst: legal.gst || '',
            msme: legal.msme || '',
            aadhaar: legal.aadhaar || '',
            fassi: legal.fassi || '',
            export_import: legal.export_import || '',
          });
        }
      }
    } catch (error) {
      console.error('Error fetching legal details:', error);
    } finally {
      if (showLoader) setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_URL}/business/legal/update/${businessId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        Alert.alert('Success', 'Legal details updated!');
        router.back();
      } else {
        Alert.alert('Error', 'Failed to update legal details.');
      }
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (key: keyof LegalData, value: string) => {
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
          <Text style={styles.headerTitle}>Legal Details</Text>
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
        <Text style={styles.headerTitle}>Legal Details</Text>
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
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={18} color="#177DDF" />
          <Text style={styles.infoText}>
            Update your business legal documents and registration numbers
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardTitle}>
            <Ionicons name="document-text-outline" size={18} color="#28A745" />
            <Text style={styles.cardTitleText}>Registration Numbers</Text>
          </View>

          <LegalField
            icon="card-outline"
            label="PAN Number"
            value={form.pan}
            onChangeText={(v) => updateField('pan', v.toUpperCase())}
            maxLength={10}
            placeholder="e.g. ABCDE1234F"
          />

          <LegalField
            icon="receipt-outline"
            label="GST Number"
            value={form.gst}
            onChangeText={(v) => updateField('gst', v.toUpperCase())}
            maxLength={15}
            placeholder="e.g. 22AAAAA0000A1Z5"
          />

          <LegalField
            icon="business-outline"
            label="MSME Number"
            value={form.msme}
            onChangeText={(v) => updateField('msme', v)}
            placeholder="e.g. UDYAM-XX-00-0000000"
          />

          <LegalField
            icon="finger-print-outline"
            label="Aadhaar Number"
            value={form.aadhaar}
            onChangeText={(v) => updateField('aadhaar', v)}
            keyboardType="number-pad"
            maxLength={12}
            placeholder="e.g. 1234 5678 9012"
          />

          <LegalField
            icon="nutrition-outline"
            label="FSSAI License"
            value={form.fassi}
            onChangeText={(v) => updateField('fassi', v)}
            placeholder="e.g. 12345678901234"
          />

          <LegalField
            icon="globe-outline"
            label="Export/Import License"
            value={form.export_import}
            onChangeText={(v) => updateField('export_import', v)}
            placeholder="e.g. IEC Code"
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
              <Text style={styles.saveBtnText}>Save Legal Details</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const LegalField = ({
  icon, label, value, onChangeText, keyboardType, maxLength, placeholder,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: any;
  maxLength?: number;
  placeholder?: string;
}) => (
  <View style={styles.inputGroup}>
    <Text style={styles.inputLabel}>{label}</Text>
    <View style={styles.inputRow}>
      <Ionicons name={icon} size={18} color="#888" style={{ marginRight: 10 }} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        maxLength={maxLength}
        placeholder={placeholder}
        placeholderTextColor="#CCC"
      />
      {value ? (
        <View style={styles.filledBadge}>
          <Ionicons name="checkmark-circle" size={16} color="#28A745" />
        </View>
      ) : null}
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
  infoCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#E3F2FD',
    padding: 14, borderRadius: 12, marginBottom: 16,
  },
  infoText: { flex: 1, fontSize: 13, color: '#177DDF', fontWeight: '500' },
  card: {
    backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginBottom: 12,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  cardTitle: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  cardTitleText: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#888', marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  input: {
    flex: 1, borderWidth: 1, borderColor: '#E8E8E8', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1A1A1A', backgroundColor: '#FAFAFA',
  },
  filledBadge: { marginLeft: 8 },
  saveBtn: {
    flexDirection: 'row', backgroundColor: '#28A745', paddingVertical: 16, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4,
  },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});

export default EditLegalDetailsScreen;

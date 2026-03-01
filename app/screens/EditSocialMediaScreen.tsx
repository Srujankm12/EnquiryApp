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

interface SocialData {
  linkedin: string;
  instagram: string;
  facebook: string;
  youtube: string;
  x: string;
  telegram: string;
  website: string;
}

const EditSocialMediaScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [businessId, setBusinessId] = useState('');
  const [form, setForm] = useState<SocialData>({
    linkedin: '',
    instagram: '',
    facebook: '',
    youtube: '',
    x: '',
    telegram: '',
    website: '',
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
          const social = result.details?.social_details || {};
          setForm({
            linkedin: social.linkedin || '',
            instagram: social.instagram || '',
            facebook: social.facebook || '',
            youtube: social.youtube || '',
            x: social.x || '',
            telegram: social.telegram || '',
            website: social.website || '',
          });
        }
      }
    } catch (error) {
      console.error('Error fetching social details:', error);
    } finally {
      if (showLoader) setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_URL}/business/social/update/${businessId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        Alert.alert('Success', 'Social media links updated!');
        router.back();
      } else {
        Alert.alert('Error', 'Failed to update social links.');
      }
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (key: keyof SocialData, value: string) => {
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
          <Text style={styles.headerTitle}>Social Media</Text>
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
        <Text style={styles.headerTitle}>Social Media</Text>
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
          <Ionicons name="information-circle-outline" size={18} color="#E91E63" />
          <Text style={styles.infoText}>
            Add your social media links so customers can find you online
          </Text>
        </View>

        <View style={styles.card}>
          <SocialField
            icon="globe-outline"
            label="Website"
            value={form.website}
            onChangeText={(v) => updateField('website', v)}
            placeholder="https://www.yourwebsite.com"
            iconColor="#666"
          />

          <SocialField
            icon="logo-instagram"
            label="Instagram"
            value={form.instagram}
            onChangeText={(v) => updateField('instagram', v)}
            placeholder="https://instagram.com/yourbusiness"
            iconColor="#E4405F"
          />

          <SocialField
            icon="logo-facebook"
            label="Facebook"
            value={form.facebook}
            onChangeText={(v) => updateField('facebook', v)}
            placeholder="https://facebook.com/yourbusiness"
            iconColor="#1877F2"
          />

          <SocialField
            icon="logo-linkedin"
            label="LinkedIn"
            value={form.linkedin}
            onChangeText={(v) => updateField('linkedin', v)}
            placeholder="https://linkedin.com/company/yourbusiness"
            iconColor="#0A66C2"
          />

          <SocialField
            icon="logo-youtube"
            label="YouTube"
            value={form.youtube}
            onChangeText={(v) => updateField('youtube', v)}
            placeholder="https://youtube.com/@yourchannel"
            iconColor="#FF0000"
          />

          <SocialField
            icon="logo-twitter"
            label="X (Twitter)"
            value={form.x}
            onChangeText={(v) => updateField('x', v)}
            placeholder="https://x.com/yourbusiness"
            iconColor="#000"
          />

          <SocialField
            icon="paper-plane-outline"
            label="Telegram"
            value={form.telegram}
            onChangeText={(v) => updateField('telegram', v)}
            placeholder="https://t.me/yourbusiness"
            iconColor="#0088CC"
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
              <Text style={styles.saveBtnText}>Save Social Links</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const SocialField = ({
  icon, label, value, onChangeText, placeholder, iconColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  iconColor?: string;
}) => (
  <View style={styles.inputGroup}>
    <View style={styles.labelRow}>
      <Ionicons name={icon} size={18} color={iconColor || '#888'} />
      <Text style={styles.inputLabel}>{label}</Text>
      {value ? <Ionicons name="checkmark-circle" size={14} color="#28A745" /> : null}
    </View>
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#CCC"
      autoCapitalize="none"
      keyboardType="url"
    />
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
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FCE4EC',
    padding: 14, borderRadius: 12, marginBottom: 16,
  },
  infoText: { flex: 1, fontSize: 13, color: '#E91E63', fontWeight: '500' },
  card: {
    backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginBottom: 12,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  inputGroup: { marginBottom: 16 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  inputLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: '#555' },
  input: {
    borderWidth: 1, borderColor: '#E8E8E8', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1A1A1A', backgroundColor: '#FAFAFA',
  },
  saveBtn: {
    flexDirection: 'row', backgroundColor: '#E91E63', paddingVertical: 16, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4,
  },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});

export default EditSocialMediaScreen;

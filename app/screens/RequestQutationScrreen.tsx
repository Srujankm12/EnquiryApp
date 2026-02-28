import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';
import { jwtDecode } from 'jwt-decode';

const API_URL = Constants.expoConfig?.extra?.API_URL;

export default function RequestForQuotation() {
  const params = useLocalSearchParams();
  const [productName, setProductName] = useState((params.product_name as string) || '');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [price, setPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [businessId, setBusinessId] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [subCategories, setSubCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubCategory, setSelectedSubCategory] = useState('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showSubCategoryPicker, setShowSubCategoryPicker] = useState(false);
  const [showUnitPicker, setShowUnitPicker] = useState(false);

  const units = ['kg', 'g', 'ton', 'quintal', 'litre', 'ml', 'piece', 'dozen', 'box', 'bag', 'packet'];

  useEffect(() => {
    loadUserData();
    fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      fetchSubCategories(selectedCategory);
    } else {
      setSubCategories([]);
      setSelectedSubCategory('');
    }
  }, [selectedCategory]);

  const loadUserData = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      const decoded: any = jwtDecode(token);
      const storedCompanyId = await AsyncStorage.getItem('companyId');
      setBusinessId(storedCompanyId || decoded.business_id || '');
    } catch {}
  };

  const fetchCategories = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_URL}/category/get/all`, { headers });
      setCategories(res.data?.categories || res.data?.data?.categories || []);
    } catch {
      setCategories([]);
    }
  };

  const fetchSubCategories = async (categoryId: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_URL}/category/sub/get/${categoryId}`, { headers });
      setSubCategories(res.data?.sub_categories || res.data?.data?.sub_categories || []);
    } catch {
      setSubCategories([]);
    }
  };

  const handleSubmit = async () => {
    if (!productName.trim()) {
      Alert.alert('Required', 'Please enter a product name');
      return;
    }
    if (!selectedCategory) {
      Alert.alert('Required', 'Please select a category');
      return;
    }
    if (!selectedSubCategory) {
      Alert.alert('Required', 'Please select a sub category');
      return;
    }
    if (!quantity || parseFloat(quantity) <= 0) {
      Alert.alert('Required', 'Please enter a valid quantity');
      return;
    }
    if (!unit) {
      Alert.alert('Required', 'Please select a unit');
      return;
    }
    if (!price || parseFloat(price) <= 0) {
      Alert.alert('Required', 'Please enter a valid price');
      return;
    }
    if (!businessId) {
      Alert.alert('Error', 'Business ID not found. Please become a seller first.');
      return;
    }

    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(
        `${API_URL}/rfq/create`,
        {
          business_id: businessId,
          category_id: selectedCategory,
          sub_category_id: selectedSubCategory,
          product_name: productName.trim(),
          quantity: parseFloat(quantity),
          unit: unit,
          price: parseFloat(price),
          is_rfq_active: true,
        },
        { headers }
      );
      Alert.alert('Success', 'Your RFQ has been submitted successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error('RFQ submit error:', error?.response?.data || error);
      Alert.alert('Error', error?.response?.data?.error || 'Failed to submit RFQ. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#177DDF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create RFQ</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle" size={18} color="#177DDF" />
          <Text style={styles.infoBannerText}>
            Submit a Request for Quotation to let sellers know what you need
          </Text>
        </View>

        {/* Product Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Product Name <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="What product do you need?"
            placeholderTextColor="#999"
            value={productName}
            onChangeText={setProductName}
          />
        </View>

        {/* Category Picker */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Category <Text style={styles.required}>*</Text></Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowCategoryPicker(!showCategoryPicker)}
          >
            <Text style={selectedCategory ? styles.pickerText : styles.pickerPlaceholder}>
              {selectedCategory
                ? (categories.find((c) => (c.id || c.category_id) === selectedCategory)?.name ||
                   categories.find((c) => (c.id || c.category_id) === selectedCategory)?.category_name || 'Selected')
                : 'Select category'}
            </Text>
            <Ionicons name={showCategoryPicker ? 'chevron-up' : 'chevron-down'} size={20} color="#666" />
          </TouchableOpacity>
          {showCategoryPicker && (
            <View style={styles.pickerOptions}>
              <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                {categories.map((cat) => {
                  const catId = cat.id || cat.category_id;
                  const catName = cat.name || cat.category_name || '';
                  return (
                    <TouchableOpacity
                      key={catId}
                      style={[styles.pickerOption, selectedCategory === catId && styles.pickerOptionSelected]}
                      onPress={() => {
                        setSelectedCategory(catId);
                        setSelectedSubCategory('');
                        setShowCategoryPicker(false);
                      }}
                    >
                      <Text style={[styles.pickerOptionText, selectedCategory === catId && styles.pickerOptionTextSelected]}>
                        {catName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Sub Category Picker */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Sub Category <Text style={styles.required}>*</Text></Text>
          <TouchableOpacity
            style={[styles.pickerButton, !selectedCategory && styles.pickerDisabled]}
            onPress={() => selectedCategory && setShowSubCategoryPicker(!showSubCategoryPicker)}
            disabled={!selectedCategory}
          >
            <Text style={selectedSubCategory ? styles.pickerText : styles.pickerPlaceholder}>
              {selectedSubCategory
                ? (subCategories.find((c) => (c.id || c.sub_category_id) === selectedSubCategory)?.name ||
                   subCategories.find((c) => (c.id || c.sub_category_id) === selectedSubCategory)?.sub_category_name || 'Selected')
                : selectedCategory ? 'Select sub category' : 'Select category first'}
            </Text>
            <Ionicons name={showSubCategoryPicker ? 'chevron-up' : 'chevron-down'} size={20} color="#666" />
          </TouchableOpacity>
          {showSubCategoryPicker && subCategories.length > 0 && (
            <View style={styles.pickerOptions}>
              <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                {subCategories.map((sub) => {
                  const subId = sub.id || sub.sub_category_id;
                  const subName = sub.name || sub.sub_category_name || '';
                  return (
                    <TouchableOpacity
                      key={subId}
                      style={[styles.pickerOption, selectedSubCategory === subId && styles.pickerOptionSelected]}
                      onPress={() => {
                        setSelectedSubCategory(subId);
                        setShowSubCategoryPicker(false);
                      }}
                    >
                      <Text style={[styles.pickerOptionText, selectedSubCategory === subId && styles.pickerOptionTextSelected]}>
                        {subName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Quantity and Unit Row */}
        <View style={styles.rowInputs}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Quantity <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 100"
              placeholderTextColor="#999"
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Unit <Text style={styles.required}>*</Text></Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowUnitPicker(!showUnitPicker)}
            >
              <Text style={unit ? styles.pickerText : styles.pickerPlaceholder}>
                {unit || 'Select unit'}
              </Text>
              <Ionicons name={showUnitPicker ? 'chevron-up' : 'chevron-down'} size={20} color="#666" />
            </TouchableOpacity>
            {showUnitPicker && (
              <View style={styles.pickerOptions}>
                <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                  {units.map((u) => (
                    <TouchableOpacity
                      key={u}
                      style={[styles.pickerOption, unit === u && styles.pickerOptionSelected]}
                      onPress={() => {
                        setUnit(u);
                        setShowUnitPicker(false);
                      }}
                    >
                      <Text style={[styles.pickerOptionText, unit === u && styles.pickerOptionTextSelected]}>
                        {u}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        </View>

        {/* Price */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Price (₹) <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="Enter expected price"
            placeholderTextColor="#999"
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="send" size={18} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>Submit RFQ</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    backgroundColor: '#177DDF', paddingTop: 50, paddingBottom: 15, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 3,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  formContainer: { flex: 1, padding: 16 },
  infoBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#E3F2FD',
    padding: 14, borderRadius: 10, marginBottom: 20,
  },
  infoBannerText: { fontSize: 13, color: '#177DDF', flex: 1, lineHeight: 18 },
  inputGroup: { marginBottom: 18 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  required: { color: '#DC3545' },
  input: {
    backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 14, fontSize: 15, color: '#333',
  },
  rowInputs: { flexDirection: 'row', gap: 12 },
  pickerButton: {
    backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 14, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
  },
  pickerDisabled: { opacity: 0.5 },
  pickerText: { fontSize: 15, color: '#333' },
  pickerPlaceholder: { fontSize: 15, color: '#999' },
  pickerOptions: {
    backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 10,
    marginTop: 4, overflow: 'hidden',
  },
  pickerOption: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  pickerOptionSelected: { backgroundColor: '#E3F2FD' },
  pickerOptionText: { fontSize: 14, color: '#333' },
  pickerOptionTextSelected: { color: '#177DDF', fontWeight: '600' },
  submitButton: {
    backgroundColor: '#177DDF', borderRadius: 10, paddingVertical: 16,
    alignItems: 'center', marginTop: 8, flexDirection: 'row',
    justifyContent: 'center', gap: 8, elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2, shadowRadius: 2,
  },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  Alert,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Constants from 'expo-constants';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const API_URL = Constants.expoConfig?.extra?.API_URL;

interface Category {
  id: string;
  name: string;
  category_image: string | null;
  description: string;
}

interface SubCategory {
  id: string;
  category_id: string;
  name: string;
  category_image: string | null;
  description: string;
}

const UNIT_OPTIONS = [
  'kg', 'g', 'lb', 'ton', 'quintal',
  'litre', 'ml',
  'piece', 'dozen', 'pack', 'box', 'bag',
  'metre', 'cm', 'feet', 'inch',
  'acre', 'hectare',
  'other',
];

const EditProductScreen: React.FC = () => {
  const router = useRouter();
  const { product_id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productQuantity, setProductQuantity] = useState('');
  const [productUnit, setProductUnit] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productMOQ, setProductMOQ] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<SubCategory | null>(null);

  // Category data
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingSubCategories, setLoadingSubCategories] = useState(false);

  // Modals
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSubCategoryModal, setShowSubCategoryModal] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);

  useEffect(() => {
    loadProductDetails();
    fetchCategories();
  }, [product_id]);

  const loadProductDetails = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // Backend: GET /product/get/{id} - returns CompleteProduct
      const res = await axios.get(`${API_URL}/product/get/${product_id}`, { headers });
      const data = res.data?.product_details;

      if (data) {
        setProductName(data.product_name || '');
        setProductDescription(''); // Description not in CompleteProduct, keep empty
        setProductQuantity(String(data.quantity || ''));
        setProductUnit(data.unit || '');
        setProductPrice(String(data.price || ''));
        setProductMOQ(data.moq || '');
        setSelectedCategoryId(data.category_id || '');
        setSelectedSubCategoryId(data.sub_category_id || '');

        // Set category display name from details
        if (data.category_id && data.category_name) {
          setSelectedCategory({ id: data.category_id, name: data.category_name, category_image: null, description: '' });
        }
        if (data.sub_category_id && data.sub_category_name) {
          setSelectedSubCategory({ id: data.sub_category_id, category_id: data.category_id, name: data.sub_category_name, category_image: null, description: '' });
        }

        // Fetch subcategories for the current category
        if (data.category_id) {
          fetchSubCategories(data.category_id);
        }
      }
    } catch (error: any) {
      console.error('Error loading product:', error);
      Alert.alert('Error', 'Unable to load product details.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const token = await AsyncStorage.getItem('token');
      const res = await axios.get(`${API_URL}/category/get/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCategories(res.data?.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchSubCategories = async (categoryId: string) => {
    try {
      setLoadingSubCategories(true);
      setSubCategories([]);
      const token = await AsyncStorage.getItem('token');
      const res = await axios.get(
        `${API_URL}/category/sub/get/category/${categoryId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSubCategories(res.data?.sub_categories || []);
    } catch (error) {
      console.error('Error fetching sub-categories:', error);
      setSubCategories([]);
    } finally {
      setLoadingSubCategories(false);
    }
  };

  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
    setSelectedCategoryId(category.id);
    setSelectedSubCategory(null);
    setSelectedSubCategoryId('');
    setShowCategoryModal(false);
    fetchSubCategories(category.id);
  };

  const handleSubCategorySelect = (subCategory: SubCategory) => {
    setSelectedSubCategory(subCategory);
    setSelectedSubCategoryId(subCategory.id);
    setShowSubCategoryModal(false);
  };

  const validateForm = (): boolean => {
    if (!productName.trim()) {
      Alert.alert('Missing Information', 'Please enter a product name.');
      return false;
    }
    if (!productQuantity.trim() || isNaN(Number(productQuantity))) {
      Alert.alert('Missing Information', 'Please enter a valid quantity.');
      return false;
    }
    if (!productUnit.trim()) {
      Alert.alert('Missing Information', 'Please select a unit.');
      return false;
    }
    if (!productPrice.trim() || isNaN(Number(productPrice))) {
      Alert.alert('Missing Information', 'Please enter a valid price.');
      return false;
    }
    if (!productMOQ.trim()) {
      Alert.alert('Missing Information', 'Please enter the MOQ.');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Session Expired', 'Please login again.');
        return;
      }

      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      // Backend: PUT /product/update/{id}
      const updateData: any = {
        name: productName.trim(),
        description: productDescription.trim() || undefined,
        category_id: selectedCategoryId || undefined,
        sub_category_id: selectedSubCategoryId || undefined,
        quantity: parseFloat(productQuantity),
        unit: productUnit.trim(),
        price: parseFloat(productPrice),
        moq: productMOQ.trim(),
      };

      await axios.put(`${API_URL}/product/update/${product_id}`, updateData, { headers });

      Alert.alert('Success', 'Product updated successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error('Error updating product:', error);
      const msg =
        error.response?.data?.error ||
        error.response?.data?.message ||
        'Failed to update product. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#177DDF" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Product</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#177DDF" />
          <Text style={styles.loaderText}>Loading product...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#177DDF" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Product</Text>
        <View style={styles.backButton} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Product Name */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Product Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter product name"
              placeholderTextColor="#999"
              value={productName}
              onChangeText={setProductName}
              maxLength={50}
            />
          </View>

          {/* Description */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Update product description"
              placeholderTextColor="#999"
              value={productDescription}
              onChangeText={setProductDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={styles.charCount}>{productDescription.length}/500</Text>
          </View>

          {/* Category */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Category</Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setShowCategoryModal(true)}
            >
              <Text style={[styles.selectButtonText, !selectedCategory && styles.placeholderText]}>
                {selectedCategory ? selectedCategory.name : 'Select a category'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Sub-Category */}
          {selectedCategory && (
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Sub-Category</Text>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => setShowSubCategoryModal(true)}
                disabled={loadingSubCategories}
              >
                {loadingSubCategories ? (
                  <ActivityIndicator size="small" color="#0078D7" />
                ) : (
                  <>
                    <Text style={[styles.selectButtonText, !selectedSubCategory && styles.placeholderText]}>
                      {selectedSubCategory
                        ? selectedSubCategory.name
                        : subCategories.length > 0 ? 'Select a sub-category' : 'No sub-categories'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#666" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Quantity */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Quantity *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 100"
              placeholderTextColor="#999"
              value={productQuantity}
              onChangeText={setProductQuantity}
              keyboardType="numeric"
              maxLength={20}
            />
          </View>

          {/* Unit */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Unit *</Text>
            <TouchableOpacity style={styles.selectButton} onPress={() => setShowUnitModal(true)}>
              <Text style={[styles.selectButtonText, !productUnit && styles.placeholderText]}>
                {productUnit || 'Select unit'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Price */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Price *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 500"
              placeholderTextColor="#999"
              value={productPrice}
              onChangeText={setProductPrice}
              keyboardType="numeric"
              maxLength={20}
            />
          </View>

          {/* MOQ */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Minimum Order Quantity (MOQ) *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 10 kg"
              placeholderTextColor="#999"
              value={productMOQ}
              onChangeText={setProductMOQ}
              maxLength={100}
            />
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <View style={styles.submitContent}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.submitText}>Updating...</Text>
              </View>
            ) : (
              <View style={styles.submitContent}>
                <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
                <Text style={styles.submitText}>Update Product</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Category Modal */}
      <Modal visible={showCategoryModal} transparent animationType="slide" onRequestClose={() => setShowCategoryModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={categories}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, selectedCategory?.id === item.id && styles.modalItemSelected]}
                  onPress={() => handleCategorySelect(item)}
                >
                  <Text style={styles.modalItemText}>{item.name}</Text>
                  {selectedCategory?.id === item.id && <Ionicons name="checkmark" size={20} color="#0078D7" />}
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.modalEmptyText}>No categories available</Text>}
            />
          </View>
        </View>
      </Modal>

      {/* Sub-Category Modal */}
      <Modal visible={showSubCategoryModal} transparent animationType="slide" onRequestClose={() => setShowSubCategoryModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Sub-Category</Text>
              <TouchableOpacity onPress={() => setShowSubCategoryModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={subCategories}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, selectedSubCategory?.id === item.id && styles.modalItemSelected]}
                  onPress={() => handleSubCategorySelect(item)}
                >
                  <Text style={styles.modalItemText}>{item.name}</Text>
                  {selectedSubCategory?.id === item.id && <Ionicons name="checkmark" size={20} color="#0078D7" />}
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.modalEmptyText}>No sub-categories available</Text>}
            />
          </View>
        </View>
      </Modal>

      {/* Unit Modal */}
      <Modal visible={showUnitModal} transparent animationType="slide" onRequestClose={() => setShowUnitModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Unit</Text>
              <TouchableOpacity onPress={() => setShowUnitModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={UNIT_OPTIONS}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, productUnit === item && styles.modalItemSelected]}
                  onPress={() => { setProductUnit(item); setShowUnitModal(false); }}
                >
                  <Text style={styles.modalItemText}>{item}</Text>
                  {productUnit === item && <Ionicons name="checkmark" size={20} color="#0078D7" />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    backgroundColor: '#177DDF', paddingTop: 50, paddingBottom: 15, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center',
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderText: { marginTop: 12, fontSize: 16, color: '#666' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },
  fieldContainer: { marginBottom: 16 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: {
    backgroundColor: '#FFFFFF', borderRadius: 10, padding: 14, fontSize: 15,
    color: '#1A1A1A', borderWidth: 1, borderColor: '#E0E0E0',
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  charCount: { fontSize: 12, color: '#999', textAlign: 'right', marginTop: 4 },
  selectButton: {
    backgroundColor: '#FFFFFF', borderRadius: 10, padding: 14, borderWidth: 1,
    borderColor: '#E0E0E0', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  selectButtonText: { fontSize: 15, color: '#1A1A1A', flex: 1 },
  placeholderText: { color: '#999' },
  submitButton: {
    backgroundColor: '#177DDF', borderRadius: 12, paddingVertical: 16, marginTop: 8,
    elevation: 3, shadowColor: '#0078D7', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4,
  },
  submitButtonDisabled: { backgroundColor: '#A0C4E8', elevation: 0 },
  submitContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  submitText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%', paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  modalItem: {
    flexDirection: 'row', alignItems: 'center', padding: 14, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#F8F8F8',
  },
  modalItemSelected: { backgroundColor: '#F0F8FF' },
  modalItemText: { flex: 1, fontSize: 15, color: '#333' },
  modalEmptyText: { padding: 40, fontSize: 15, color: '#999', textAlign: 'center' },
});

export default EditProductScreen;

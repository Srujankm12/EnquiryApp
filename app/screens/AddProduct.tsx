import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
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
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const API_URL = Constants.expoConfig?.extra?.API_URL;
const S3_URL = Constants.expoConfig?.extra?.S3_FETCH_URL;

const getImageUri = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${S3_URL}/${url}`;
};

interface Category {
  category_id: string;
  category_name: string;
  category_image_url: string;
}

interface SubCategory {
  sub_category_id: string;
  sub_category_name: string;
  sub_category_image_url: string;
}

const AddProductsScreen: React.FC = () => {
  const [submitting, setSubmitting] = useState(false);
  const [isSeller, setIsSeller] = useState<boolean | null>(null);

  // Form fields
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productQuantity, setProductQuantity] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<SubCategory | null>(null);

  // Category data
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingSubCategories, setLoadingSubCategories] = useState(false);

  // Modals
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSubCategoryModal, setShowSubCategoryModal] = useState(false);

  // Images
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  const [companyId, setCompanyId] = useState<string | null>(null);

  useEffect(() => {
    checkSellerStatus();
    fetchCategories();
  }, []);

  const checkSellerStatus = async () => {
    const status = await AsyncStorage.getItem('sellerStatus');
    const storedCompanyId = await AsyncStorage.getItem('companyId');
    if (status?.toLowerCase() !== 'approved' || !storedCompanyId) {
      setIsSeller(false);
      Alert.alert(
        'Access Denied',
        'Only approved sellers can add products. Please become a seller first.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } else {
      setIsSeller(true);
      setCompanyId(storedCompanyId);
    }
  };

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const token = await AsyncStorage.getItem('token');
      const res = await axios.get(`${API_URL}/category/get/complete/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCategories(res.data.data?.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      Alert.alert('Error', 'Unable to load categories. Please try again.');
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
        `${API_URL}/category/get/sub/complete/all/${categoryId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSubCategories(res.data.data?.sub_categories || []);
    } catch (error) {
      console.error('Error fetching sub-categories:', error);
      setSubCategories([]);
    } finally {
      setLoadingSubCategories(false);
    }
  };

  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
    setSelectedSubCategory(null);
    setShowCategoryModal(false);
    fetchSubCategories(category.category_id);
  };

  const handleSubCategorySelect = (subCategory: SubCategory) => {
    setSelectedSubCategory(subCategory);
    setShowSubCategoryModal(false);
  };

  const handlePickImage = async () => {
    if (selectedImages.length >= 3) {
      Alert.alert('Limit Reached', 'You can add up to 3 images per product.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setSelectedImages((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const handleRemoveImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const validateForm = (): boolean => {
    if (!productName.trim()) {
      Alert.alert('Missing Information', 'Please enter a product name.');
      return false;
    }
    if (productName.trim().length < 2) {
      Alert.alert('Invalid Name', 'Product name must be at least 2 characters long.');
      return false;
    }
    if (!productDescription.trim()) {
      Alert.alert('Missing Information', 'Please enter a product description.');
      return false;
    }
    if (productDescription.trim().length < 10) {
      Alert.alert('Invalid Description', 'Product description must be at least 10 characters long.');
      return false;
    }
    if (!productQuantity.trim()) {
      Alert.alert('Missing Information', 'Please enter the product quantity.');
      return false;
    }
    if (!productPrice.trim()) {
      Alert.alert('Missing Information', 'Please enter the product price.');
      return false;
    }
    if (!selectedCategory) {
      Alert.alert('Missing Information', 'Please select a category for your product.');
      return false;
    }
    return true;
  };

  const uploadImage = async (
    productId: string,
    imageUri: string,
    sequenceNumber: number,
    token: string
  ) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };

      // Get pre-signed URL
      const presignRes = await axios.get(
        `${API_URL}/product/image/generate/upload-url/${productId}/${sequenceNumber}`,
        { headers }
      );

      const uploadUrl = presignRes.data.data?.url || presignRes.data.data?.upload_url;

      if (!uploadUrl) {
        throw new Error('Failed to get upload URL');
      }

      // Upload image to S3
      const imageResponse = await fetch(imageUri);
      const imageBlob = await imageResponse.blob();
      await fetch(uploadUrl, {
        method: 'PUT',
        body: imageBlob,
        headers: { 'Content-Type': 'image/png' },
      });

      // Create product image record with the full S3 URL
      // Backend presigned URL generates key: images/products/{productId}/{sequenceNumber}.png
      const imageUrl = `${S3_URL}/images/products/${productId}/${sequenceNumber}.png`;
      await axios.post(
        `${API_URL}/product/image/create`,
        {
          product_id: productId,
          product_image_url: imageUrl,
          product_image_sequence_number: sequenceNumber,
        },
        { headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error(`Error uploading image ${sequenceNumber}:`, error);
      throw error;
    }
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

      if (!companyId) {
        Alert.alert('Error', 'Company information not found. Please try again.');
        return;
      }

      // Create product
      const productData: any = {
        company_id: companyId,
        product_name: productName.trim(),
        product_description: productDescription.trim(),
        product_quantity: productQuantity.trim(),
        product_price: productPrice.trim(),
        product_category_id: selectedCategory!.category_id,
      };

      if (selectedSubCategory) {
        productData.product_sub_category_id = selectedSubCategory.sub_category_id;
      }

      const createRes = await axios.post(
        `${API_URL}/product/create`,
        productData,
        { headers }
      );

      const productId =
        createRes.data.data?.product_id || createRes.data.data?.id;

      if (!productId) {
        Alert.alert('Error', 'Product was created but ID was not returned. Please check your products list.');
        router.back();
        return;
      }

      // Upload images if any
      if (selectedImages.length > 0) {
        try {
          for (let i = 0; i < selectedImages.length; i++) {
            await uploadImage(productId, selectedImages[i], i + 1, token);
          }
        } catch (imgError) {
          console.error('Error uploading images:', imgError);
          Alert.alert(
            'Product Created',
            'Product was created successfully but some images could not be uploaded. You can add images later.'
          );
          router.back();
          return;
        }
      }

      Alert.alert('Product Created', 'Your product has been added successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error('Error creating product:', error);
      const msg =
        error.response?.data?.message ||
        'Failed to create product. Please check your input and try again.';
      Alert.alert('Error', msg);
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
        <Text style={styles.headerTitle}>Add Product</Text>
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
          {/* Images Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Product Images</Text>
            <Text style={styles.sectionSubtitle}>Add up to 3 images (recommended)</Text>
            <View style={styles.imagesRow}>
              {selectedImages.map((uri, index) => (
                <View key={index} style={styles.imageBox}>
                  <Image source={{ uri }} style={styles.imagePreview} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => handleRemoveImage(index)}
                  >
                    <Ionicons name="close-circle" size={22} color="#DC3545" />
                  </TouchableOpacity>
                </View>
              ))}
              {selectedImages.length < 3 && (
                <TouchableOpacity style={styles.addImageBox} onPress={handlePickImage}>
                  <Ionicons name="camera-outline" size={28} color="#0078D7" />
                  <Text style={styles.addImageText}>Add</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

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

          {/* Product Description */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe your product (min 10 characters)"
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
            <Text style={styles.fieldLabel}>Category *</Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setShowCategoryModal(true)}
            >
              <Text
                style={[
                  styles.selectButtonText,
                  !selectedCategory && styles.placeholderText,
                ]}
              >
                {selectedCategory
                  ? selectedCategory.category_name
                  : 'Select a category'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Sub-Category */}
          {selectedCategory && (
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Sub-Category (Optional)</Text>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => setShowSubCategoryModal(true)}
                disabled={loadingSubCategories}
              >
                {loadingSubCategories ? (
                  <ActivityIndicator size="small" color="#0078D7" />
                ) : (
                  <>
                    <Text
                      style={[
                        styles.selectButtonText,
                        !selectedSubCategory && styles.placeholderText,
                      ]}
                    >
                      {selectedSubCategory
                        ? selectedSubCategory.sub_category_name
                        : subCategories.length > 0
                        ? 'Select a sub-category'
                        : 'No sub-categories available'}
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
              placeholder="e.g., 100 kg, 50 pieces"
              placeholderTextColor="#999"
              value={productQuantity}
              onChangeText={setProductQuantity}
              maxLength={100}
            />
          </View>

          {/* Price */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Price *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Rs 500/kg, Rs 1000/piece"
              placeholderTextColor="#999"
              value={productPrice}
              onChangeText={setProductPrice}
              maxLength={100}
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              submitting && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <View style={styles.submitContent}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.submitText}>Creating Product...</Text>
              </View>
            ) : (
              <View style={styles.submitContent}>
                <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
                <Text style={styles.submitText}>Create Product</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Category Modal */}
      <Modal
        visible={showCategoryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            {loadingCategories ? (
              <View style={styles.modalLoader}>
                <ActivityIndicator size="large" color="#0078D7" />
              </View>
            ) : (
              <FlatList
                data={categories}
                keyExtractor={(item) => item.category_id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.modalItem,
                      selectedCategory?.category_id === item.category_id &&
                        styles.modalItemSelected,
                    ]}
                    onPress={() => handleCategorySelect(item)}
                  >
                    {item.category_image_url && (
                      <Image
                        source={{ uri: getImageUri(item.category_image_url)! }}
                        style={styles.modalItemImage}
                      />
                    )}
                    <Text style={styles.modalItemText}>{item.category_name}</Text>
                    {selectedCategory?.category_id === item.category_id && (
                      <Ionicons name="checkmark" size={20} color="#0078D7" />
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={styles.modalEmptyText}>No categories available</Text>
                }
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Sub-Category Modal */}
      <Modal
        visible={showSubCategoryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSubCategoryModal(false)}
      >
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
              keyExtractor={(item) => item.sub_category_id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    selectedSubCategory?.sub_category_id === item.sub_category_id &&
                      styles.modalItemSelected,
                  ]}
                  onPress={() => handleSubCategorySelect(item)}
                >
                  {item.sub_category_image_url && (
                    <Image
                      source={{ uri: getImageUri(item.sub_category_image_url)! }}
                      style={styles.modalItemImage}
                    />
                  )}
                  <Text style={styles.modalItemText}>{item.sub_category_name}</Text>
                  {selectedSubCategory?.sub_category_id === item.sub_category_id && (
                    <Ionicons name="checkmark" size={20} color="#0078D7" />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.modalEmptyText}>No sub-categories available</Text>
              }
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
    backgroundColor: '#177DDF',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  sectionSubtitle: { fontSize: 13, color: '#888', marginBottom: 12 },
  imagesRow: { flexDirection: 'row', gap: 12 },
  imageBox: { width: 90, height: 90, borderRadius: 12, position: 'relative' },
  imagePreview: { width: 90, height: 90, borderRadius: 12 },
  removeImageButton: { position: 'absolute', top: -8, right: -8, backgroundColor: '#FFFFFF', borderRadius: 11 },
  addImageBox: {
    width: 90,
    height: 90,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#0078D7',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
  },
  addImageText: { fontSize: 12, color: '#0078D7', fontWeight: '600', marginTop: 4 },
  fieldContainer: { marginBottom: 16 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  charCount: { fontSize: 12, color: '#999', textAlign: 'right', marginTop: 4 },
  selectButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectButtonText: { fontSize: 15, color: '#1A1A1A', flex: 1 },
  placeholderText: { color: '#999' },
  submitButton: {
    backgroundColor: '#177DDF',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 8,
    elevation: 3,
    shadowColor: '#0078D7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  submitButtonDisabled: { backgroundColor: '#A0C4E8', elevation: 0 },
  submitContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  modalLoader: { padding: 40, alignItems: 'center' },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F8F8',
  },
  modalItemSelected: { backgroundColor: '#F0F8FF' },
  modalItemImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#F0F0F0',
  },
  modalItemText: { flex: 1, fontSize: 15, color: '#333' },
  modalEmptyText: {
    padding: 40,
    fontSize: 15,
    color: '#999',
    textAlign: 'center',
  },
});

export default AddProductsScreen;

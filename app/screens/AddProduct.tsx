import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput, TouchableOpacity,
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

interface Category { id: string; name: string; category_image: string | null; description: string; }
interface SubCategory { id: string; category_id: string; name: string; category_image: string | null; description: string; }

const UNIT_OPTIONS = [
  { label: 'Kilogram', value: 'kg' }, { label: 'Gram', value: 'g' }, { label: 'Pound', value: 'lb' },
  { label: 'Ton', value: 'ton' }, { label: 'Quintal', value: 'quintal' }, { label: 'Litre', value: 'litre' },
  { label: 'Millilitre', value: 'ml' }, { label: 'Piece', value: 'piece' }, { label: 'Dozen', value: 'dozen' },
  { label: 'Pack', value: 'pack' }, { label: 'Box', value: 'box' }, { label: 'Bag', value: 'bag' },
  { label: 'Metre', value: 'metre' }, { label: 'Centimetre', value: 'cm' }, { label: 'Feet', value: 'feet' },
  { label: 'Inch', value: 'inch' }, { label: 'Acre', value: 'acre' }, { label: 'Hectare', value: 'hectare' }, { label: 'Other', value: 'other' },
];

// Styled field component
const FormSection = ({ title, icon, iconBg, iconColor, children }: any) => (
  <View style={styles.formSection}>
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={15} color={iconColor} />
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    {children}
  </View>
);

const AddProductsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [submitting, setSubmitting] = useState(false);
  const [isSeller, setIsSeller] = useState<boolean | null>(null);
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productQuantity, setProductQuantity] = useState('');
  const [productUnit, setProductUnit] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productMOQ, setProductMOQ] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<SubCategory | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingSubCategories, setLoadingSubCategories] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSubCategoryModal, setShowSubCategoryModal] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [businessId, setBusinessId] = useState<string | null>(null);

  useEffect(() => {
    checkSellerStatus();
    fetchCategories();
  }, []);

  const checkSellerStatus = async () => {
    const status = await AsyncStorage.getItem('sellerStatus');
    const storedBusinessId = await AsyncStorage.getItem('companyId');
    if (!storedBusinessId) {
      setIsSeller(false);
      Alert.alert('Seller Account Required', 'You need to create a seller account before you can post products. Please register your business first.', [{ text: 'OK', onPress: () => router.back() }]);
    } else if (status?.toLowerCase() !== 'approved') {
      setIsSeller(false);
      Alert.alert('Account Pending', 'Your seller account is not yet approved. Please wait for approval before posting products.', [{ text: 'OK', onPress: () => router.back() }]);
    } else {
      setIsSeller(true);
      setBusinessId(storedBusinessId);
    }
  };

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const token = await AsyncStorage.getItem('token');
      const res = await axios.get(`${API_URL}/category/get/all`, { headers: { Authorization: `Bearer ${token}` } });
      setCategories(res.data?.categories || []);
    } catch { Alert.alert('Error', 'Unable to load categories.'); }
    finally { setLoadingCategories(false); }
  };

  const fetchSubCategories = async (categoryId: string) => {
    try {
      setLoadingSubCategories(true);
      setSubCategories([]);
      const token = await AsyncStorage.getItem('token');
      const res = await axios.get(`${API_URL}/category/sub/get/category/${categoryId}`, { headers: { Authorization: `Bearer ${token}` } });
      setSubCategories(res.data?.sub_categories || []);
    } catch { setSubCategories([]); }
    finally { setLoadingSubCategories(false); }
  };

  const handleCategorySelect = (cat: Category) => {
    setSelectedCategory(cat);
    setSelectedSubCategory(null);
    setShowCategoryModal(false);
    fetchSubCategories(cat.id);
  };

  const handlePickImage = async () => {
    if (selectedImages.length >= 3) { Alert.alert('Limit Reached', 'Max 3 images per product.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled && result.assets[0]?.uri) setSelectedImages(prev => [...prev, result.assets[0].uri]);
  };

  const handleSubmit = async () => {
    if (!productName.trim()) { Alert.alert('Missing', 'Product name is required.'); return; }
    if (!productDescription.trim() || productDescription.trim().length < 10) { Alert.alert('Missing', 'Description must be at least 10 characters.'); return; }
    if (!productQuantity || isNaN(Number(productQuantity))) { Alert.alert('Missing', 'Enter a valid quantity.'); return; }
    if (!productUnit) { Alert.alert('Missing', 'Select a unit.'); return; }
    if (!productPrice || isNaN(Number(productPrice))) { Alert.alert('Missing', 'Enter a valid price.'); return; }
    if (!productMOQ.trim()) { Alert.alert('Missing', 'Enter minimum order quantity.'); return; }
    if (!selectedCategory) { Alert.alert('Missing', 'Select a category.'); return; }
    try {
      setSubmitting(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) { Alert.alert('Error', 'Session expired. Please log in again.'); return; }
      if (!businessId) { Alert.alert('Seller Account Required', 'Please register your business first.'); return; }

      // ── Step 1: Create the product ──
      const productData = {
        business_id: businessId, name: productName.trim(), description: productDescription.trim(),
        quantity: parseFloat(productQuantity), unit: productUnit, price: parseFloat(productPrice),
        moq: productMOQ.trim(), category_id: selectedCategory.id,
        sub_category_id: selectedSubCategory?.id || '', is_product_active: true,
      };
      console.log('[AddProduct] Step 1 – Creating product:', JSON.stringify(productData, null, 2));

      const createRes = await axios.post(
        `${API_URL}/product/create`, productData,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      console.log('[AddProduct] Step 1 – Product create response status:', createRes.status);
      console.log('[AddProduct] Step 1 – Product create response data:', JSON.stringify(createRes.data, null, 2));
      console.log('[AddProduct] Step 1 – Response keys:', Object.keys(createRes.data || {}));

      // Try every possible field name the backend might use
      const d = createRes.data;
      const productId =
        d?.product_id ||
        d?.id ||
        d?.productId ||
        d?.data?.product_id ||
        d?.data?.id ||
        d?.product?.id ||
        d?.product?.product_id ||
        d?.result?.id ||
        d?.result?.product_id ||
        Object.values(d || {}).find((v) => typeof v === 'string' && v.length > 8 && !v.includes(' ')); // last-resort: first UUID-like string

      console.log('[AddProduct] Step 1 – Extracted productId:', productId);

      // ── Step 2: Upload each image ──
      if (productId && selectedImages.length > 0) {
        console.log(`[AddProduct] Step 2 – Uploading ${selectedImages.length} image(s) for productId: ${productId}`);

        for (let i = 0; i < selectedImages.length; i++) {
          const localUri = selectedImages[i];
          console.log(`[AddProduct] Step 2.${i} – Image ${i + 1}: local URI = ${localUri}`);

          try {
            // Backend: `Index <= 0 || Index > 3` → accepts only 1, 2, 3
            const presignPayload = {
              product_id: productId,
              index: i + 1,  // send 1, 2, 3 (backend rejects 0)
              id: '',
              image: '',
              created_at: 0,
              updated_at: 0,
            };
            console.log(`[AddProduct] Step 2.${i}a – Requesting presigned URL:`, JSON.stringify(presignPayload));

            const imgRes = await axios.put(
              `${API_URL}/product/update/image`,
              presignPayload,
              { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
            );
            console.log(`[AddProduct] Step 2.${i}a – Presigned URL response status:`, imgRes.status);
            console.log(`[AddProduct] Step 2.${i}a – Presigned URL response data:`, JSON.stringify(imgRes.data, null, 2));

            const presignedUrl = imgRes.data?.url;
            console.log(`[AddProduct] Step 2.${i}a – Presigned URL:`, presignedUrl);

            if (!presignedUrl) {
              console.warn(`[AddProduct] Step 2.${i}a – No presigned URL returned, skipping image ${i + 1}`);
              continue;
            }

            // Fetch image as blob
            console.log(`[AddProduct] Step 2.${i}b – Fetching blob from: ${localUri}`);
            const imgFetchRes = await fetch(localUri);
            const blob = await imgFetchRes.blob();
            console.log(`[AddProduct] Step 2.${i}b – Blob: size=${blob.size} bytes, type=${blob.type}`);

            // Upload to S3
            console.log(`[AddProduct] Step 2.${i}c – Uploading to S3...`);
            const s3Res = await fetch(presignedUrl, {
              method: 'PUT',
              body: blob,
              headers: { 'Content-Type': blob.type || 'image/jpeg' },
            });
            console.log(`[AddProduct] Step 2.${i}c – S3 status: ${s3Res.status} ${s3Res.statusText}`);

            if (s3Res.ok) {
              console.log(`[AddProduct] Step 2.${i}c – ✅ Image ${i + 1} uploaded`);
            } else {
              const body = await s3Res.text();
              console.error(`[AddProduct] Step 2.${i}c – ❌ S3 failed:`, body);
            }
          } catch (imgErr: any) {
            console.error(`[AddProduct] Step 2.${i} – ❌ Error uploading image ${i + 1}:`, imgErr?.message || imgErr);
          }
        }
        console.log('[AddProduct] Step 2 – All image uploads attempted.');
      } else {
        console.log('[AddProduct] Step 2 – No images to upload (selectedImages.length =', selectedImages.length, ')');
      }

      console.log('[AddProduct] ✅ Product creation complete. productId =', productId);
      Alert.alert('Product Created! 🎉', 'Your product has been added successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      console.error('[AddProduct] ❌ Fatal error during product creation:', err?.message || err);
      console.error('[AddProduct] Response data:', JSON.stringify(err?.response?.data, null, 2));
      Alert.alert('Error', err.response?.data?.error || err.response?.data?.message || 'Failed to create product.');
    } finally { setSubmitting(false); }
  };

  const SelectButton = ({ label, value, onPress, loading: lod }: { label: string; value: string; onPress: () => void; loading?: boolean }) => (
    <TouchableOpacity style={styles.selectBtn} onPress={onPress} disabled={!!lod} activeOpacity={0.85}>
      {lod ? (
        <ActivityIndicator size="small" color="#0078D7" style={{ flex: 1 }} />
      ) : (
        <>
          <Text style={[styles.selectBtnText, !value && styles.selectBtnPlaceholder]} numberOfLines={1}>{value || label}</Text>
          <View style={styles.selectChevron}><Ionicons name="chevron-down" size={14} color="#0078D7" /></View>
        </>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0060B8" />

      {/* ── Premium Header ── */}
      <View style={[styles.headerWrapper, { paddingTop: insets.top }]}>
        <View style={styles.orb1} /><View style={styles.orb2} />
        <View style={styles.headerInner}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.eyebrow}>PRODUCT LISTING</Text>
            <Text style={styles.headerTitle}>Add Product</Text>
          </View>
          <TouchableOpacity style={[styles.publishBtn, submitting && { opacity: 0.6 }]} onPress={handleSubmit} disabled={submitting}>
            {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.publishBtnText}>Publish</Text>}
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

          {/* ── Images Section ── */}
          <FormSection title="Product Images" icon="images-outline" iconBg="#EBF5FF" iconColor="#0078D7">
            <Text style={styles.sectionHint}>Add up to 3 photos to showcase your product</Text>
            <View style={styles.imagesRow}>
              {selectedImages.map((uri, i) => (
                <View key={i} style={styles.imageBox}>
                  <Image source={{ uri }} style={styles.imagePreview} resizeMode="cover" />
                  <TouchableOpacity style={styles.removeImg} onPress={() => setSelectedImages(prev => prev.filter((_, j) => j !== i))}>
                    <Ionicons name="close-circle" size={20} color="#EF4444" />
                  </TouchableOpacity>
                  {i === 0 && <View style={styles.primaryBadge}><Text style={styles.primaryBadgeText}>Cover</Text></View>}
                </View>
              ))}
              {selectedImages.length < 3 && (
                <TouchableOpacity style={styles.addImageBox} onPress={handlePickImage} activeOpacity={0.85}>
                  <View style={styles.addImageIcon}><Ionicons name="camera-outline" size={22} color="#0078D7" /></View>
                  <Text style={styles.addImageText}>Add Photo</Text>
                </TouchableOpacity>
              )}
            </View>
          </FormSection>

          {/* ── Basic Info ── */}
          <FormSection title="Basic Information" icon="information-circle-outline" iconBg="#EBF5FF" iconColor="#0078D7">
            <Text style={styles.inputLabel}>Product Name *</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="cube-outline" size={15} color="#0078D7" style={styles.inputIcon} />
              <TextInput style={styles.textInput} value={productName} onChangeText={setProductName} placeholder="e.g. Premium Basmati Rice" placeholderTextColor="#CBD5E1" maxLength={50} />
              <Text style={styles.charHint}>{productName.length}/50</Text>
            </View>

            <Text style={styles.inputLabel}>Description *</Text>
            <View style={[styles.inputWrap, { alignItems: 'flex-start', paddingTop: 10 }]}>
              <Ionicons name="document-text-outline" size={15} color="#0078D7" style={[styles.inputIcon, { marginTop: 2 }]} />
              <TextInput style={[styles.textInput, { height: 90, textAlignVertical: 'top' }]} value={productDescription} onChangeText={setProductDescription} placeholder="Describe your product, quality, usage, etc. (min 10 chars)" placeholderTextColor="#CBD5E1" multiline maxLength={500} />
            </View>
            <Text style={styles.charHintRight}>{productDescription.length}/500</Text>
          </FormSection>

          {/* ── Category ── */}
          <FormSection title="Category" icon="layers-outline" iconBg="#FEF3C7" iconColor="#F59E0B">
            <Text style={styles.inputLabel}>Category *</Text>
            <SelectButton label="Select a category" value={selectedCategory?.name || ''} onPress={() => setShowCategoryModal(true)} loading={loadingCategories} />
            {selectedCategory && (
              <>
                <Text style={[styles.inputLabel, { marginTop: 12 }]}>Sub-Category (Optional)</Text>
                <SelectButton label={subCategories.length > 0 ? 'Select sub-category' : 'No sub-categories'} value={selectedSubCategory?.name || ''} onPress={() => subCategories.length > 0 && setShowSubCategoryModal(true)} loading={loadingSubCategories} />
              </>
            )}
          </FormSection>

          {/* ── Pricing & Qty ── */}
          <FormSection title="Pricing & Quantity" icon="pricetag-outline" iconBg="#DCFCE7" iconColor="#16A34A">
            <View style={styles.rowFields}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Quantity *</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="archive-outline" size={15} color="#16A34A" style={styles.inputIcon} />
                  <TextInput style={styles.textInput} value={productQuantity} onChangeText={setProductQuantity} placeholder="0" placeholderTextColor="#CBD5E1" keyboardType="numeric" />
                </View>
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.inputLabel}>Unit *</Text>
                <SelectButton label="kg, litre..." value={productUnit} onPress={() => setShowUnitModal(true)} />
              </View>
            </View>

            <Text style={styles.inputLabel}>Price (₹) *</Text>
            <View style={styles.inputWrap}>
              <Text style={[styles.inputIcon, { fontSize: 16, color: '#16A34A', fontWeight: '800', marginTop: 0 }]}>₹</Text>
              <TextInput style={styles.textInput} value={productPrice} onChangeText={setProductPrice} placeholder="0.00" placeholderTextColor="#CBD5E1" keyboardType="numeric" />
              {productUnit ? <Text style={styles.unitSuffix}>per {productUnit}</Text> : null}
            </View>

            <Text style={styles.inputLabel}>Minimum Order Quantity (MOQ) *</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="layers-outline" size={15} color="#16A34A" style={styles.inputIcon} />
              <TextInput style={styles.textInput} value={productMOQ} onChangeText={setProductMOQ} placeholder="e.g. 10 kg, 5 pieces" placeholderTextColor="#CBD5E1" maxLength={100} />
            </View>
          </FormSection>

          {/* ── Submit ── */}
          <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.6 }]} onPress={handleSubmit} disabled={submitting} activeOpacity={0.85}>
            {submitting ? (
              <View style={styles.submitInner}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.submitText}>Publishing...</Text>
              </View>
            ) : (
              <View style={styles.submitInner}>
                <Ionicons name="rocket-outline" size={20} color="#fff" />
                <Text style={styles.submitText}>Publish Product</Text>
              </View>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Category Modal ── */}
      <Modal visible={showCategoryModal} transparent animationType="slide" onRequestClose={() => setShowCategoryModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={categories}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={[styles.modalItem, selectedCategory?.id === item.id && styles.modalItemSelected]} onPress={() => handleCategorySelect(item)}>
                  {item.category_image && <Image source={{ uri: getImageUri(item.category_image)! }} style={styles.modalItemImg} />}
                  <Text style={styles.modalItemText}>{item.name}</Text>
                  {selectedCategory?.id === item.id && <Ionicons name="checkmark-circle" size={20} color="#0078D7" />}
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.modalEmpty}>No categories found</Text>}
            />
          </View>
        </View>
      </Modal>

      {/* ── SubCategory Modal ── */}
      <Modal visible={showSubCategoryModal} transparent animationType="slide" onRequestClose={() => setShowSubCategoryModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Sub-Category</Text>
              <TouchableOpacity onPress={() => setShowSubCategoryModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={subCategories}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={[styles.modalItem, selectedSubCategory?.id === item.id && styles.modalItemSelected]} onPress={() => { setSelectedSubCategory(item); setShowSubCategoryModal(false); }}>
                  <Text style={styles.modalItemText}>{item.name}</Text>
                  {selectedSubCategory?.id === item.id && <Ionicons name="checkmark-circle" size={20} color="#0078D7" />}
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.modalEmpty}>No sub-categories</Text>}
            />
          </View>
        </View>
      </Modal>

      {/* ── Unit Modal ── */}
      <Modal visible={showUnitModal} transparent animationType="slide" onRequestClose={() => setShowUnitModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Unit</Text>
              <TouchableOpacity onPress={() => setShowUnitModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={UNIT_OPTIONS}
              keyExtractor={item => item.value}
              numColumns={3}
              columnWrapperStyle={{ gap: 8, padding: 8, paddingBottom: 0 }}
              contentContainerStyle={{ paddingBottom: 20 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.unitChip, productUnit === item.value && styles.unitChipSelected]}
                  onPress={() => { setProductUnit(item.value); setShowUnitModal(false); }}
                >
                  <Text style={[styles.unitChipText, productUnit === item.value && styles.unitChipTextSelected]}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default AddProductsScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9FC' },

  // ── Header ──
  headerWrapper: {
    backgroundColor: '#0060B8', paddingHorizontal: 20, paddingBottom: 22, overflow: 'hidden',
    shadowColor: '#003E80', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 24, elevation: 18,
  },
  orb1: { position: 'absolute', width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(255,255,255,0.06)', top: -80, right: -60 },
  orb2: { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.04)', bottom: 5, left: -50 },
  headerInner: { flexDirection: 'row', alignItems: 'center', paddingTop: 16 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  eyebrow: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.65)', letterSpacing: 2, marginBottom: 2 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.4 },
  publishBtn: { backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  publishBtnText: { color: '#0060B8', fontWeight: '800', fontSize: 13 },

  // ── Form Sections ──
  formSection: { backgroundColor: '#fff', borderRadius: 22, marginHorizontal: 16, marginTop: 16, padding: 18, shadowColor: '#1B4FBF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 14, elevation: 4, borderWidth: 1, borderColor: '#F0F4F8' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  sectionIconWrap: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  sectionHint: { fontSize: 12, color: '#94A3B8', marginBottom: 14, fontWeight: '500' },

  // ── Images ──
  imagesRow: { flexDirection: 'row', gap: 10 },
  imageBox: { width: 80, height: 80, borderRadius: 16, position: 'relative' },
  imagePreview: { width: 80, height: 80, borderRadius: 16 },
  removeImg: { position: 'absolute', top: -8, right: -8, backgroundColor: '#fff', borderRadius: 10 },
  primaryBadge: { position: 'absolute', bottom: 4, left: 4, backgroundColor: '#0078D7', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6 },
  primaryBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  addImageBox: { width: 80, height: 80, borderRadius: 16, borderWidth: 2, borderColor: '#CBD5E1', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7F9FC' },
  addImageIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#EBF5FF', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  addImageText: { fontSize: 10, fontWeight: '700', color: '#0078D7' },

  // ── Inputs ──
  inputLabel: { fontSize: 11, fontWeight: '700', color: '#64748B', marginBottom: 8, letterSpacing: 0.4, textTransform: 'uppercase' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7F9FC', borderRadius: 14, borderWidth: 1.5, borderColor: '#E2E8F0', paddingHorizontal: 12, marginBottom: 14 },
  inputIcon: { marginRight: 10 },
  textInput: { flex: 1, fontSize: 14, color: '#0F172A', fontWeight: '600', paddingVertical: 13 },
  charHint: { fontSize: 10, color: '#CBD5E1', fontWeight: '600' },
  charHintRight: { fontSize: 10, color: '#CBD5E1', fontWeight: '600', textAlign: 'right', marginTop: -10, marginBottom: 14 },
  unitSuffix: { fontSize: 12, color: '#94A3B8', fontWeight: '600', marginLeft: 6 },
  selectBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7F9FC', borderRadius: 14, borderWidth: 1.5, borderColor: '#E2E8F0', paddingHorizontal: 14, paddingVertical: 13, marginBottom: 0 },
  selectBtnText: { flex: 1, fontSize: 14, color: '#0F172A', fontWeight: '600' },
  selectBtnPlaceholder: { color: '#CBD5E1' },
  selectChevron: { width: 26, height: 26, borderRadius: 9, backgroundColor: '#EBF5FF', justifyContent: 'center', alignItems: 'center' },
  rowFields: { flexDirection: 'row', gap: 0, marginBottom: 14 },

  // ── Submit ──
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0078D7', marginHorizontal: 16, marginTop: 20, paddingVertical: 17, borderRadius: 18, shadowColor: '#0078D7', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8 },
  submitInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  submitText: { color: '#fff', fontSize: 17, fontWeight: '800' },

  // ── Modals ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '75%', paddingBottom: 30 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  modalCloseBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  modalItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F8FAFC', gap: 12 },
  modalItemSelected: { backgroundColor: '#EBF5FF' },
  modalItemImg: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F1F5F9' },
  modalItemText: { flex: 1, fontSize: 15, color: '#0F172A', fontWeight: '600' },
  modalEmpty: { padding: 40, textAlign: 'center', color: '#94A3B8', fontSize: 14, fontWeight: '500' },
  unitChip: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: '#F7F9FC', borderWidth: 1.5, borderColor: '#E2E8F0' },
  unitChipSelected: { backgroundColor: '#0078D7', borderColor: '#0078D7' },
  unitChipText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  unitChipTextSelected: { color: '#fff' },
});

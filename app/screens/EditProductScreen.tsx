import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Constants from "expo-constants";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
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

const UNIT_OPTIONS = ["kg", "g", "lb", "ton", "quintal", "litre", "ml", "piece", "dozen", "pack", "box", "bag", "metre", "cm", "feet", "inch", "acre", "hectare", "other"];

// ── Reusable Input Field Component ────────────────────────────────────────────
const InputField = ({
  icon, label, value, onChangeText, placeholder,
  keyboardType, multiline, maxLength, required,
}: {
  icon: keyof typeof Ionicons.glyphMap; label: string; value: string;
  onChangeText: (t: string) => void; placeholder?: string;
  keyboardType?: any; multiline?: boolean; maxLength?: number; required?: boolean;
}) => {
  const [focused, setFocused] = useState(false);
  return (
    <View style={fi.group}>
      <View style={fi.labelRow}>
        <Text style={fi.label}>{label}</Text>
        {required && <View style={fi.requiredDot} />}
      </View>
      <View style={[fi.row, focused && fi.rowFocused, multiline && fi.rowMulti]}>
        <View style={fi.iconWrap}>
          <Ionicons name={icon} size={16} color={focused ? "#0078D7" : "#94A3B8"} />
        </View>
        <TextInput
          style={[fi.input, multiline && fi.inputMulti]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder || label}
          placeholderTextColor="#CBD5E1"
          keyboardType={keyboardType}
          multiline={multiline}
          maxLength={maxLength}
          textAlignVertical={multiline ? "top" : "center"}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {value.trim() && !multiline && (
          <Ionicons name="checkmark-circle" size={16} color="#10B981" style={{ marginRight: 4 }} />
        )}
      </View>
      {multiline && maxLength && (
        <Text style={fi.charCount}>{value.length}/{maxLength}</Text>
      )}
    </View>
  );
};

const fi = StyleSheet.create({
  group: { marginBottom: 14 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 7 },
  label: { fontSize: 10, fontWeight: '800', color: '#64748B', letterSpacing: 1, textTransform: 'uppercase' },
  requiredDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#EF4444', marginTop: 1 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7F9FC', borderRadius: 14, borderWidth: 1.5, borderColor: '#E2E8F0', paddingHorizontal: 10 },
  rowFocused: { borderColor: '#0078D7', backgroundColor: '#EBF5FF' },
  rowMulti: { alignItems: 'flex-start', paddingTop: 10 },
  iconWrap: { width: 30, height: 30, borderRadius: 9, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  input: { flex: 1, fontSize: 14, color: '#0F172A', fontWeight: '600', paddingVertical: 13 },
  inputMulti: { minHeight: 90, paddingVertical: 4 },
  charCount: { fontSize: 10, color: '#94A3B8', fontWeight: '600', textAlign: 'right', marginTop: 4 },
});

// ── Select Button ─────────────────────────────────────────────────────────────
const SelectButton = ({ icon, label, value, placeholder, onPress, loading }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; value: string; placeholder: string;
  onPress: () => void; loading?: boolean;
}) => (
  <View style={sb.group}>
    <Text style={sb.label}>{label}</Text>
    <TouchableOpacity style={sb.btn} onPress={onPress} activeOpacity={0.8}>
      <View style={[sb.iconWrap, value ? { backgroundColor: '#EBF5FF' } : { backgroundColor: '#F7F9FC' }]}>
        {loading ? <ActivityIndicator size="small" color="#0078D7" /> : (
          <Ionicons name={icon} size={16} color={value ? '#0078D7' : '#94A3B8'} />
        )}
      </View>
      <Text style={[sb.text, !value && sb.placeholder]} numberOfLines={1}>{value || placeholder}</Text>
      {value ? (
        <View style={sb.selectedBadge}>
          <Ionicons name="checkmark-circle" size={14} color="#10B981" />
        </View>
      ) : null}
      <Ionicons name="chevron-down" size={16} color="#94A3B8" />
    </TouchableOpacity>
  </View>
);

const sb = StyleSheet.create({
  group: { marginBottom: 14 },
  label: { fontSize: 10, fontWeight: '800', color: '#64748B', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 7 },
  btn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7F9FC', borderRadius: 14, borderWidth: 1.5, borderColor: '#E2E8F0', paddingHorizontal: 10, paddingVertical: 10, gap: 10 },
  iconWrap: { width: 30, height: 30, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  text: { flex: 1, fontSize: 14, color: '#0F172A', fontWeight: '600' },
  placeholder: { color: '#CBD5E1', fontWeight: '500' },
  selectedBadge: { marginRight: 2 },
});

// ── Main Screen ───────────────────────────────────────────────────────────────
const EditProductScreen: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { product_id } = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productQuantity, setProductQuantity] = useState("");
  const [productUnit, setProductUnit] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productMOQ, setProductMOQ] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<SubCategory | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [loadingSubCategories, setLoadingSubCategories] = useState(false);

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSubCategoryModal, setShowSubCategoryModal] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);

  // Image state
  const [existingImages, setExistingImages] = useState<{ id: string; image: string; index: number }[]>([]);
  const [newImages, setNewImages] = useState<string[]>([]); // local URIs to upload
  const [uploadingImages, setUploadingImages] = useState(false);

  useEffect(() => { loadProductDetails(); fetchCategories(); }, [product_id]);

  const loadProductDetails = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      const res = await axios.get(`${API_URL}/product/get/${product_id}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = res.data?.product_details;
      if (data) {
        setProductName(data.product_name || "");
        setProductDescription(data.product_description || "");
        setProductQuantity(String(data.quantity || ""));
        setProductUnit(data.unit || "");
        setProductPrice(String(data.price || ""));
        setProductMOQ(data.moq || "");
        setSelectedCategoryId(data.category_id || "");
        setSelectedSubCategoryId(data.sub_category_id || "");
        if (data.category_id && data.category_name) setSelectedCategory({ id: data.category_id, name: data.category_name, category_image: null, description: "" });
        if (data.sub_category_id && data.sub_category_name) setSelectedSubCategory({ id: data.sub_category_id, category_id: data.category_id, name: data.sub_category_name, category_image: null, description: "" });
        if (data.category_id) fetchSubCategories(data.category_id);
        // Load existing product images
        if (data.product_images && Array.isArray(data.product_images)) {
          setExistingImages(data.product_images.map((img: any) => ({
            id: img.id || "",
            image: getImageUri(img.image) || "",
            index: img.index || 0,
          })));
        }
      }
    } catch {
      Alert.alert("Error", "Unable to load product details.", [{ text: "OK", onPress: () => router.back() }]);
    } finally { setLoading(false); }
  };

  const handlePickImage = async () => {
    const totalImages = existingImages.length + newImages.length;
    if (totalImages >= 3) { Alert.alert("Limit Reached", "Max 3 images per product."); return; }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert("Permission Required", "Allow photo library access."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled && result.assets[0]?.uri) setNewImages(prev => [...prev, result.assets[0].uri]);
  };

  const handleDeleteExistingImage = (imgId: string) => {
    Alert.alert("Remove Image", "Remove this image from the product?", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => setExistingImages(prev => prev.filter(img => img.id !== imgId)) },
    ]);
  };

  const fetchCategories = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await axios.get(`${API_URL}/category/get/all`, { headers: { Authorization: `Bearer ${token}` } });
      setCategories(res.data?.categories || []);
    } catch { }
  };

  const fetchSubCategories = async (categoryId: string) => {
    try {
      setLoadingSubCategories(true);
      setSubCategories([]);
      const token = await AsyncStorage.getItem("token");
      const res = await axios.get(`${API_URL}/category/sub/get/category/${categoryId}`, { headers: { Authorization: `Bearer ${token}` } });
      setSubCategories(res.data?.sub_categories || []);
    } catch { setSubCategories([]); }
    finally { setLoadingSubCategories(false); }
  };

  const handleCategorySelect = (cat: Category) => {
    setSelectedCategory(cat); setSelectedCategoryId(cat.id);
    setSelectedSubCategory(null); setSelectedSubCategoryId("");
    setShowCategoryModal(false); fetchSubCategories(cat.id);
  };

  const handleSubCategorySelect = (sub: SubCategory) => {
    setSelectedSubCategory(sub); setSelectedSubCategoryId(sub.id);
    setShowSubCategoryModal(false);
  };

  const validateForm = (): boolean => {
    if (!productName.trim()) { Alert.alert("Required", "Please enter a product name."); return false; }
    if (!productQuantity.trim() || isNaN(Number(productQuantity))) { Alert.alert("Required", "Please enter a valid quantity."); return false; }
    if (!productUnit.trim()) { Alert.alert("Required", "Please select a unit."); return false; }
    if (!productPrice.trim() || isNaN(Number(productPrice))) { Alert.alert("Required", "Please enter a valid price."); return false; }
    if (!productMOQ.trim()) { Alert.alert("Required", "Please enter the MOQ."); return false; }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    try {
      setSubmitting(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) { Alert.alert("Session Expired", "Please login again."); return; }
      const payload: any = {
        name: productName.trim(),
        description: productDescription.trim() || undefined,
        category_id: selectedCategoryId || undefined,
        sub_category_id: selectedSubCategoryId || undefined,
        quantity: parseFloat(productQuantity),
        unit: productUnit.trim(),
        price: parseFloat(productPrice),
        moq: productMOQ.trim(),
      };
      const res = await axios.put(`${API_URL}/product/update/${product_id}`, payload, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });

      // Upload any new images via presigned URLs
      if (newImages.length > 0) {
        setUploadingImages(true);
        const startIndex = existingImages.length + 1; // continue from last existing slot
        for (let i = 0; i < newImages.length; i++) {
          const localUri = newImages[i];
          const imgIndex = startIndex + i;
          if (imgIndex > 3) break; // max 3 images
          try {
            const presignPayload = { product_id: String(product_id), index: imgIndex, id: "", image: "", created_at: 0, updated_at: 0 };
            const imgRes = await axios.put(`${API_URL}/product/update/image`, presignPayload,
              { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
            const presignedUrl = imgRes.data?.url;
            if (presignedUrl) {
              const blob = await (await fetch(localUri)).blob();
              await fetch(presignedUrl, { method: "PUT", body: blob, headers: { "Content-Type": blob.type || "image/jpeg" } });
            }
          } catch { /* continue uploading rest */ }
        }
        setUploadingImages(false);
      }

      Alert.alert("Updated ✓", res.data?.message || "Product updated successfully!", [{ text: "OK", onPress: () => router.back() }]);
    } catch (error: any) {
      const msg = error.response?.data?.error || error.response?.data?.message || "Failed to update product.";
      Alert.alert("Error", msg);
    } finally { setSubmitting(false); }
  };

  // ── Premium Bottom-sheet Modal ──
  const PremiumModal = ({ visible, title, icon, onClose, children }: {
    visible: boolean; title: string; icon: keyof typeof Ionicons.glyphMap; onClose: () => void; children: React.ReactNode;
  }) => (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={ms.overlay} activeOpacity={1} onPress={onClose} />
      <View style={ms.sheet}>
        {/* Drag handle */}
        <View style={ms.handle} />
        <View style={ms.sheetHeader}>
          <View style={ms.sheetIconWrap}>
            <Ionicons name={icon} size={18} color="#0078D7" />
          </View>
          <Text style={ms.sheetTitle}>{title}</Text>
          <TouchableOpacity style={ms.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>
        {children}
      </View>
    </Modal>
  );

  const ms = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
    sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '75%', paddingBottom: insets.bottom + 16 },
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginTop: 10, marginBottom: 4 },
    sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    sheetIconWrap: { width: 36, height: 36, borderRadius: 11, backgroundColor: '#EBF5FF', justifyContent: 'center', alignItems: 'center' },
    sheetTitle: { flex: 1, fontSize: 16, fontWeight: '800', color: '#0F172A', letterSpacing: -0.2 },
    closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#F7F9FC', justifyContent: 'center', alignItems: 'center' },
  });

  const ModalItem = ({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) => (
    <TouchableOpacity
      style={[styles.modalItem, selected && styles.modalItemSelected]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.modalItemIcon, selected && styles.modalItemIconSelected]}>
        <Ionicons name={selected ? "checkmark" : "ellipse-outline"} size={14} color={selected ? "#fff" : "#CBD5E1"} />
      </View>
      <Text style={[styles.modalItemText, selected && styles.modalItemTextSelected]}>{label}</Text>
      {selected && <View style={styles.selectedPill}><Text style={styles.selectedPillText}>Selected</Text></View>}
    </TouchableOpacity>
  );

  if (loading) {
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
              <Text style={styles.eyebrow}>PRODUCT MANAGEMENT</Text>
              <Text style={styles.headerTitle}>Edit Product</Text>
            </View>
          </View>
        </View>
        <View style={styles.loaderWrap}>
          <View style={styles.loaderCard}>
            <ActivityIndicator size="large" color="#0078D7" />
            <Text style={styles.loaderText}>Loading product details…</Text>
          </View>
        </View>
      </View>
    );
  }

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
            <Text style={styles.eyebrow}>PRODUCT MANAGEMENT</Text>
            <Text style={styles.headerTitle}>Edit Product</Text>
          </View>
          <TouchableOpacity
            style={[styles.saveHeaderBtn, submitting && { opacity: 0.5 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.saveHeaderBtnText}>Save</Text>}
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Images Card ── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconWrap, { backgroundColor: '#EBF5FF' }]}>
                <Ionicons name="images-outline" size={16} color="#0078D7" />
              </View>
              <View>
                <Text style={styles.cardTitle}>Product Images</Text>
                <Text style={styles.cardSubtitle}>Up to 3 photos · tap to change</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {/* Existing images */}
              {existingImages.map((img, i) => (
                <View key={img.id || i} style={styles.imgBox}>
                  <Image source={{ uri: `${img.image}?t=${Date.now()}` }} style={styles.imgPreview} resizeMode="cover" />
                  {i === 0 && <View style={styles.imgCoverBadge}><Text style={styles.imgCoverText}>Cover</Text></View>}
                  <TouchableOpacity style={styles.imgRemoveBtn} onPress={() => handleDeleteExistingImage(img.id)}>
                    <Ionicons name="close-circle" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
              {/* New local images to upload */}
              {newImages.map((uri, i) => (
                <View key={`new-${i}`} style={styles.imgBox}>
                  <Image source={{ uri }} style={styles.imgPreview} resizeMode="cover" />
                  <View style={styles.imgNewBadge}><Text style={styles.imgNewText}>New</Text></View>
                  <TouchableOpacity style={styles.imgRemoveBtn} onPress={() => setNewImages(prev => prev.filter((_, j) => j !== i))}>
                    <Ionicons name="close-circle" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
              {/* Add photo button */}
              {existingImages.length + newImages.length < 3 && (
                <TouchableOpacity style={styles.imgAddBox} onPress={handlePickImage} activeOpacity={0.85}>
                  <View style={styles.imgAddIcon}><Ionicons name="camera-outline" size={22} color="#0078D7" /></View>
                  <Text style={styles.imgAddText}>Add Photo</Text>
                </TouchableOpacity>
              )}
            </View>
            {uploadingImages && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
                <ActivityIndicator size="small" color="#0078D7" />
                <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '600' }}>Uploading images...</Text>
              </View>
            )}
          </View>

          {/* ── Basic Details Card ── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconWrap, { backgroundColor: '#EBF5FF' }]}>
                <Ionicons name="cube-outline" size={16} color="#0078D7" />
              </View>
              <View>
                <Text style={styles.cardTitle}>Basic Details</Text>
                <Text style={styles.cardSubtitle}>Product name & description</Text>
              </View>
            </View>

            <InputField
              icon="cube-outline" label="Product Name" required
              value={productName} onChangeText={setProductName}
              placeholder="e.g. Organic Wheat Grains" maxLength={50}
            />
            <InputField
              icon="document-text-outline" label="Description"
              value={productDescription} onChangeText={setProductDescription}
              placeholder="Describe your product — quality, grade, usage..."
              multiline maxLength={500}
            />
          </View>

          {/* ── Category Card ── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconWrap, { backgroundColor: '#F3EEFF' }]}>
                <Ionicons name="grid-outline" size={16} color="#7C3AED" />
              </View>
              <View>
                <Text style={styles.cardTitle}>Classification</Text>
                <Text style={styles.cardSubtitle}>Category & sub-category</Text>
              </View>
            </View>

            <SelectButton
              icon="grid-outline" label="Category"
              value={selectedCategory?.name || ""}
              placeholder="Select a category"
              onPress={() => setShowCategoryModal(true)}
            />
            {selectedCategory && (
              <SelectButton
                icon="list-outline" label="Sub-Category"
                value={selectedSubCategory?.name || ""}
                placeholder={subCategories.length > 0 ? "Select a sub-category" : "No sub-categories"}
                onPress={() => subCategories.length > 0 && setShowSubCategoryModal(true)}
                loading={loadingSubCategories}
              />
            )}
          </View>

          {/* ── Quantity & Pricing Card ── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconWrap, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="pricetag-outline" size={16} color="#16A34A" />
              </View>
              <View>
                <Text style={styles.cardTitle}>Quantity & Pricing</Text>
                <Text style={styles.cardSubtitle}>Stock, unit, price & MOQ</Text>
              </View>
            </View>

            {/* Quantity + Unit side by side */}
            <View style={styles.row2Col}>
              <View style={{ flex: 1 }}>
                <InputField
                  icon="layers-outline" label="Quantity" required
                  value={productQuantity} onChangeText={setProductQuantity}
                  placeholder="e.g. 100" keyboardType="numeric" maxLength={20}
                />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <SelectButton
                  icon="scale-outline" label="Unit"
                  value={productUnit} placeholder="Select unit"
                  onPress={() => setShowUnitModal(true)}
                />
              </View>
            </View>

            <InputField
              icon="cash-outline" label="Price (₹)" required
              value={productPrice} onChangeText={setProductPrice}
              placeholder="e.g. 2500" keyboardType="numeric" maxLength={20}
            />
            <InputField
              icon="bag-outline" label="Minimum Order Qty (MOQ)" required
              value={productMOQ} onChangeText={setProductMOQ}
              placeholder="e.g. 10 kg or 5 boxes" maxLength={100}
            />
          </View>

          {/* ── Update Button ── */}
          <TouchableOpacity
            style={[styles.saveBtn, submitting && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <Text style={styles.saveBtnText}>Update Product</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Category Modal ── */}
      <PremiumModal visible={showCategoryModal} title="Select Category" icon="grid-outline" onClose={() => setShowCategoryModal(false)}>
        <FlatList
          data={categories}
          keyExtractor={i => i.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8 }}
          renderItem={({ item }) => (
            <ModalItem label={item.name} selected={selectedCategory?.id === item.id} onPress={() => handleCategorySelect(item)} />
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No categories found</Text>}
        />
      </PremiumModal>

      {/* ── Sub-Category Modal ── */}
      <PremiumModal visible={showSubCategoryModal} title="Select Sub-Category" icon="list-outline" onClose={() => setShowSubCategoryModal(false)}>
        <FlatList
          data={subCategories}
          keyExtractor={i => i.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8 }}
          renderItem={({ item }) => (
            <ModalItem label={item.name} selected={selectedSubCategory?.id === item.id} onPress={() => handleSubCategorySelect(item)} />
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No sub-categories found</Text>}
        />
      </PremiumModal>

      {/* ── Unit Modal ── */}
      <PremiumModal visible={showUnitModal} title="Select Unit" icon="scale-outline" onClose={() => setShowUnitModal(false)}>
        <FlatList
          data={UNIT_OPTIONS}
          keyExtractor={i => i}
          numColumns={3}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }}
          columnWrapperStyle={{ gap: 8, marginBottom: 8 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.unitChip, productUnit === item && styles.unitChipSelected]}
              onPress={() => { setProductUnit(item); setShowUnitModal(false); }}
              activeOpacity={0.8}
            >
              {productUnit === item && <Ionicons name="checkmark" size={12} color="#fff" />}
              <Text style={[styles.unitChipText, productUnit === item && styles.unitChipTextSelected]}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </PremiumModal>
    </View>
  );
};

export default EditProductScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9FC' },

  // Header
  headerWrapper: { backgroundColor: '#0060B8', paddingHorizontal: 20, paddingBottom: 22, overflow: 'hidden', shadowColor: '#003E80', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 24, elevation: 18 },
  orb1: { position: 'absolute', width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(255,255,255,0.06)', top: -80, right: -60 },
  orb2: { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.04)', bottom: 5, left: -50 },
  headerInner: { flexDirection: 'row', alignItems: 'center', paddingTop: 16 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  eyebrow: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.65)', letterSpacing: 2, marginBottom: 2 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.4 },
  saveHeaderBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', minWidth: 56, alignItems: 'center' },
  saveHeaderBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  // Loader
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderCard: { backgroundColor: '#fff', borderRadius: 24, padding: 36, alignItems: 'center', gap: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 6 },
  loaderText: { fontSize: 14, color: '#94A3B8', fontWeight: '600' },

  // Cards
  card: { backgroundColor: '#fff', borderRadius: 22, padding: 18, shadowColor: '#1B4FBF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 14, elevation: 4, borderWidth: 1, borderColor: '#F0F4F8', marginBottom: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  cardIconWrap: { width: 36, height: 36, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A', letterSpacing: -0.2 },
  cardSubtitle: { fontSize: 11, color: '#94A3B8', fontWeight: '500', marginTop: 2 },

  // 2-col row
  row2Col: { flexDirection: 'row', alignItems: 'flex-start' },

  // Save button
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#0078D7', paddingVertical: 16, borderRadius: 16, shadowColor: '#0078D7', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 7 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  // Modal items (list)
  modalItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  modalItemSelected: { backgroundColor: '#F0F9FF', borderRadius: 12, paddingHorizontal: 10, marginHorizontal: -10, borderBottomColor: 'transparent' },
  modalItemIcon: { width: 26, height: 26, borderRadius: 8, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  modalItemIconSelected: { backgroundColor: '#0078D7' },
  modalItemText: { flex: 1, fontSize: 14, color: '#334155', fontWeight: '600' },
  modalItemTextSelected: { color: '#0078D7', fontWeight: '700' },
  selectedPill: { backgroundColor: '#EBF5FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  selectedPillText: { fontSize: 10, color: '#0078D7', fontWeight: '800' },
  emptyText: { textAlign: 'center', color: '#94A3B8', fontSize: 13, fontWeight: '500', paddingVertical: 30 },

  // Unit chips
  unitChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 11, paddingHorizontal: 8, backgroundColor: '#F7F9FC', borderRadius: 12, borderWidth: 1.5, borderColor: '#E2E8F0', minWidth: (width - 80) / 3 },
  unitChipSelected: { backgroundColor: '#0078D7', borderColor: '#0060B8' },
  unitChipText: { fontSize: 13, fontWeight: '700', color: '#475569', textTransform: 'lowercase' },
  unitChipTextSelected: { color: '#fff' },
  // Image styles
  imgBox: { width: 92, height: 92, borderRadius: 16, position: 'relative' },
  imgPreview: { width: 92, height: 92, borderRadius: 16, backgroundColor: '#E2E8F0' },
  imgCoverBadge: { position: 'absolute', bottom: 4, left: 4, backgroundColor: '#0078D7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  imgCoverText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  imgNewBadge: { position: 'absolute', bottom: 4, left: 4, backgroundColor: '#16A34A', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  imgNewText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  imgRemoveBtn: { position: 'absolute', top: -8, right: -8, backgroundColor: '#fff', borderRadius: 10 },
  imgAddBox: { width: 92, height: 92, borderRadius: 16, borderWidth: 2, borderColor: '#CBD5E1', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7F9FC' },
  imgAddIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#EBF5FF', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  imgAddText: { fontSize: 10, fontWeight: '700', color: '#0078D7' },
});

import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Constants from "expo-constants";
import { router, useLocalSearchParams } from "expo-router";
import { jwtDecode } from "jwt-decode";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
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

// ─────────────────────────────────────────────────────────────
// FocusableInput — owns its own focus state; no parent re-render
// ─────────────────────────────────────────────────────────────
function FocusableInput({
  icon,
  placeholder,
  value,
  onChangeText,
  keyboardType,
  onFocusChange,
}: {
  icon: keyof typeof import("@expo/vector-icons/build/Ionicons").default.glyphMap;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  keyboardType?: "default" | "numeric";
  onFocusChange?: () => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[inputStyles.wrap, focused && inputStyles.wrapFocused]}>
      <View style={inputStyles.iconCircle}>
        <Ionicons name={icon} size={14} color="#0078D7" />
      </View>
      <TextInput
        style={inputStyles.input}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType ?? "default"}
        onFocus={() => {
          setFocused(true);
          onFocusChange?.();
        }}
        onBlur={() => setFocused(false)}
      />
      {value.length > 0 && (
        <View style={inputStyles.check}>
          <Ionicons name="checkmark" size={11} color="#16A34A" />
        </View>
      )}
    </View>
  );
}
const inputStyles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7F9FC",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    paddingHorizontal: 10,
    paddingVertical: 12,
    gap: 8,
  },
  wrapFocused: {
    borderColor: "#0078D7",
    backgroundColor: "#FAFCFF",
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: "#EBF5FF",
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
    fontWeight: "500",
    padding: 0,
  },
  check: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
  },
});

// ─────────────────────────────────────────────────────────────
// FieldLabel
// ─────────────────────────────────────────────────────────────
function FieldLabel({
  label,
  required,
  step,
}: {
  label: string;
  required?: boolean;
  step: number;
}) {
  return (
    <View style={fieldLabelStyles.row}>
      <View style={fieldLabelStyles.stepBadge}>
        <Text style={fieldLabelStyles.stepText}>{step}</Text>
      </View>
      <Text style={fieldLabelStyles.label}>
        {label}
        {required && <Text style={fieldLabelStyles.required}> *</Text>}
      </Text>
    </View>
  );
}
const fieldLabelStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  stepBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#0078D7",
    justifyContent: "center",
    alignItems: "center",
  },
  stepText: { fontSize: 10, fontWeight: "800", color: "#fff" },
  label: { fontSize: 13, fontWeight: "700", color: "#0F172A" },
  required: { color: "#EF4444" },
});

// ─────────────────────────────────────────────────────────────
// DropdownList
// ─────────────────────────────────────────────────────────────
function DropdownList({
  items,
  getId,
  getName,
  selectedId,
  onSelect,
  loading,
  emptyText,
}: {
  items: any[];
  getId: (item: any) => string;
  getName: (item: any) => string;
  selectedId: string;
  onSelect: (id: string) => void;
  loading: boolean;
  emptyText: string;
}) {
  return (
    <View style={dropdownStyles.container}>
      {loading ? (
        <ActivityIndicator
          style={{ paddingVertical: 20 }}
          color="#0078D7"
          size="small"
        />
      ) : items.length === 0 ? (
        <Text style={dropdownStyles.emptyText}>{emptyText}</Text>
      ) : (
        <ScrollView
          style={{ maxHeight: 200 }}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {items.map((item) => {
            const id = getId(item);
            const name = getName(item);
            const isSelected = selectedId === id;
            return (
              <TouchableOpacity
                key={id}
                style={[
                  dropdownStyles.option,
                  isSelected && dropdownStyles.optionSelected,
                ]}
                onPress={() => onSelect(id)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    dropdownStyles.optionDot,
                    isSelected && dropdownStyles.optionDotSelected,
                  ]}
                />
                <Text
                  style={[
                    dropdownStyles.optionText,
                    isSelected && dropdownStyles.optionTextSelected,
                  ]}
                >
                  {name}
                </Text>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={16} color="#0078D7" />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
const dropdownStyles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#DBEAFE",
    marginTop: 6,
    overflow: "hidden",
    shadowColor: "#0078D7",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 10,
  },
  optionSelected: { backgroundColor: "#EBF5FF" },
  optionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E2E8F0",
  },
  optionDotSelected: { backgroundColor: "#0078D7" },
  optionText: { flex: 1, fontSize: 13, color: "#334155", fontWeight: "500" },
  optionTextSelected: { color: "#0078D7", fontWeight: "700" },
  emptyText: {
    paddingHorizontal: 14,
    paddingVertical: 18,
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
  },
});

// ─────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────
export default function RequestForQuotation() {
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const [productName, setProductName] = useState(
    (params.product_name as string) || "",
  );
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [price, setPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [businessId, setBusinessId] = useState("");
  const [categories, setCategories] = useState<any[]>([]);
  const [subCategories, setSubCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showSubCategoryPicker, setShowSubCategoryPicker] = useState(false);
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const [loadingSubCategories, setLoadingSubCategories] = useState(false);

  const units = [
    "kg", "g", "ton", "quintal", "litre",
    "ml", "piece", "dozen", "box", "bag", "packet",
  ];

  useEffect(() => {
    loadUserData();
    fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      fetchSubCategories(selectedCategory);
    } else {
      setSubCategories([]);
      setSelectedSubCategory("");
    }
    setShowSubCategoryPicker(false);
  }, [selectedCategory]);

  const loadUserData = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;
      const decoded: any = jwtDecode(token);
      const storedCompanyId = await AsyncStorage.getItem("companyId");
      setBusinessId(storedCompanyId || decoded.business_id || "");
    } catch { }
  };

  const fetchCategories = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_URL}/category/get/all`, { headers });
      const cats = res.data?.categories || res.data?.data?.categories || [];
      setCategories(cats);
    } catch {
      setCategories([]);
    }
  };

  const fetchSubCategories = async (categoryId: string) => {
    setLoadingSubCategories(true);
    setSubCategories([]);
    setSelectedSubCategory("");
    try {
      const token = await AsyncStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(
        `${API_URL}/category/sub/get/category/${categoryId}`,
        { headers },
      );
      const subs =
        res.data?.sub_categories || res.data?.data?.sub_categories || [];
      setSubCategories(subs);
    } catch {
      setSubCategories([]);
    } finally {
      setLoadingSubCategories(false);
    }
  };

  const handleSubmit = async () => {
    if (!productName.trim()) {
      Alert.alert("Required", "Please enter a product name");
      return;
    }
    if (!selectedCategory) {
      Alert.alert("Required", "Please select a category");
      return;
    }
    if (!selectedSubCategory) {
      Alert.alert("Required", "Please select a sub category");
      return;
    }
    if (!quantity || parseFloat(quantity) <= 0) {
      Alert.alert("Required", "Please enter a valid quantity");
      return;
    }
    if (!unit) {
      Alert.alert("Required", "Please select a unit");
      return;
    }
    if (!price || parseFloat(price) <= 0) {
      Alert.alert("Required", "Please enter a valid price");
      return;
    }
    if (!businessId) {
      Alert.alert("Error", "Business ID not found. Please become a seller first.");
      return;
    }

    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(
        `${API_URL}/rfq/create`,
        {
          business_id: businessId,
          category_id: selectedCategory,
          sub_category_id: selectedSubCategory,
          product_name: productName.trim(),
          quantity: parseFloat(quantity),
          unit,
          price: parseFloat(price),
          is_rfq_active: true,
        },
        { headers },
      );
      Alert.alert("Success", "Your RFQ has been submitted successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.response?.data?.error || "Failed to submit RFQ. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const closeAllPickers = () => {
    setShowCategoryPicker(false);
    setShowSubCategoryPicker(false);
    setShowUnitPicker(false);
  };

  const selectedCategoryName = (() => {
    const cat = categories.find(
      (c) => (c.id || c.category_id) === selectedCategory,
    );
    return cat ? cat.name || cat.category_name : null;
  })();

  const selectedSubCategoryName = (() => {
    const sub = subCategories.find(
      (s) => (s.id || s.sub_category_id) === selectedSubCategory,
    );
    return sub ? sub.name || sub.sub_category_name : null;
  })();

  const filledCount = [
    productName.trim(),
    selectedCategory,
    selectedSubCategory,
    quantity,
    unit,
    price,
  ].filter(Boolean).length;
  const progress = filledCount / 6;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0060B8" />

      {/* ── HEADER (outside KAV so it never shifts) ── */}
      <View style={[styles.headerWrapper, { paddingTop: insets.top }]}>
        <View style={styles.headerOrb1} />
        <View style={styles.headerOrb2} />
        <View style={styles.headerOrb3} />

        <View style={styles.headerInner}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.headerEyebrow}>BUYER HUB</Text>
            <Text style={styles.headerTitle}>Create RFQ</Text>
          </View>

          <View style={styles.progressBadge}>
            <Text style={styles.progressBadgeText}>{filledCount}/6</Text>
          </View>
        </View>

        <View style={styles.progressBarTrack}>
          <View
            style={[styles.progressBarFill, { width: `${progress * 100}%` }]}
          />
        </View>
      </View>

      <View style={{ flex: 1 }}>
        <ScrollView
          style={styles.formScroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Info Banner ── */}
          <View style={styles.infoBanner}>
            <View style={styles.infoBannerIcon}>
              <Ionicons name="megaphone-outline" size={16} color="#0078D7" />
            </View>
            <Text style={styles.infoBannerText}>
              Post your requirement and let verified sellers compete with their best quotes.
            </Text>
          </View>

          {/* ── Stats row ── */}
          <View style={styles.statsBar}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>Fast</Text>
              <Text style={styles.statLabel}>Response</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>Verified</Text>
              <Text style={styles.statLabel}>Sellers</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>Free</Text>
              <Text style={styles.statLabel}>to Post</Text>
            </View>
          </View>

          {/* ── Form Card ── */}
          <View style={styles.formCard}>

            {/* 1 · Product Name */}
            <FieldLabel label="Product Name" required step={1} />
            <FocusableInput
              icon="cube-outline"
              placeholder="What product do you need?"
              value={productName}
              onChangeText={setProductName}
              onFocusChange={closeAllPickers}
            />

            <View style={styles.fieldSpacer} />

            {/* 2 · Category */}
            <FieldLabel label="Category" required step={2} />
            <TouchableOpacity
              style={[
                styles.pickerWrap,
                showCategoryPicker && styles.pickerWrapOpen,
              ]}
              activeOpacity={0.8}
              onPress={() => {
                setShowCategoryPicker((v) => !v);
                setShowSubCategoryPicker(false);
                setShowUnitPicker(false);
              }}
            >
              <View style={styles.pickerIconCircle}>
                <Ionicons name="grid-outline" size={14} color="#0078D7" />
              </View>
              <Text
                style={
                  selectedCategoryName
                    ? styles.pickerValue
                    : styles.pickerPlaceholder
                }
              >
                {selectedCategoryName || "Select category"}
              </Text>
              {selectedCategoryName && (
                <View style={styles.checkCircle}>
                  <Ionicons name="checkmark" size={11} color="#16A34A" />
                </View>
              )}
              <Ionicons
                name={showCategoryPicker ? "chevron-up" : "chevron-down"}
                size={16}
                color="#64748B"
                style={{ marginLeft: 6 }}
              />
            </TouchableOpacity>
            {showCategoryPicker && (
              <DropdownList
                items={categories}
                getId={(c) => c.id || c.category_id}
                getName={(c) => c.name || c.category_name || ""}
                selectedId={selectedCategory}
                onSelect={(id) => {
                  setSelectedCategory(id);
                  setSelectedSubCategory("");
                  setShowCategoryPicker(false);
                }}
                loading={false}
                emptyText="No categories found"
              />
            )}

            <View style={styles.fieldSpacer} />

            {/* 3 · Sub Category */}
            <FieldLabel label="Sub Category" required step={3} />
            <TouchableOpacity
              style={[
                styles.pickerWrap,
                !selectedCategory && styles.pickerDisabled,
                showSubCategoryPicker && styles.pickerWrapOpen,
              ]}
              activeOpacity={selectedCategory ? 0.8 : 1}
              onPress={() => {
                if (!selectedCategory) return;
                setShowSubCategoryPicker((v) => !v);
                setShowCategoryPicker(false);
                setShowUnitPicker(false);
              }}
            >
              <View style={styles.pickerIconCircle}>
                <Ionicons name="layers-outline" size={14} color="#0078D7" />
              </View>
              <Text
                style={
                  selectedSubCategoryName
                    ? styles.pickerValue
                    : styles.pickerPlaceholder
                }
              >
                {selectedSubCategoryName ||
                  (selectedCategory
                    ? "Select sub category"
                    : "Select category first")}
              </Text>
              {selectedSubCategoryName && (
                <View style={styles.checkCircle}>
                  <Ionicons name="checkmark" size={11} color="#16A34A" />
                </View>
              )}
              <Ionicons
                name={showSubCategoryPicker ? "chevron-up" : "chevron-down"}
                size={16}
                color="#64748B"
                style={{ marginLeft: 6 }}
              />
            </TouchableOpacity>
            {showSubCategoryPicker && (
              <DropdownList
                items={subCategories}
                getId={(s) => s.id || s.sub_category_id}
                getName={(s) => s.name || s.sub_category_name || ""}
                selectedId={selectedSubCategory}
                onSelect={(id) => {
                  setSelectedSubCategory(id);
                  setShowSubCategoryPicker(false);
                }}
                loading={loadingSubCategories}
                emptyText="No sub categories found"
              />
            )}

            <View style={styles.fieldSpacer} />

            {/* 4 + 5 · Quantity & Unit row */}
            <View style={styles.rowWrap}>
              <View style={{ flex: 1 }}>
                <FieldLabel label="Quantity" required step={4} />
                <FocusableInput
                  icon="scale-outline"
                  placeholder="e.g. 100"
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="numeric"
                  onFocusChange={closeAllPickers}
                />
              </View>

              <View style={{ width: 10 }} />

              <View style={{ flex: 1 }}>
                <FieldLabel label="Unit" required step={5} />
                <TouchableOpacity
                  style={[
                    styles.pickerWrap,
                    showUnitPicker && styles.pickerWrapOpen,
                  ]}
                  activeOpacity={0.8}
                  onPress={() => {
                    setShowUnitPicker((v) => !v);
                    setShowCategoryPicker(false);
                    setShowSubCategoryPicker(false);
                  }}
                >
                  <View style={styles.pickerIconCircle}>
                    <Ionicons name="options-outline" size={14} color="#0078D7" />
                  </View>
                  <Text
                    style={unit ? styles.pickerValue : styles.pickerPlaceholder}
                    numberOfLines={1}
                  >
                    {unit || "Unit"}
                  </Text>
                  {unit && (
                    <View style={styles.checkCircle}>
                      <Ionicons name="checkmark" size={11} color="#16A34A" />
                    </View>
                  )}
                  <Ionicons
                    name={showUnitPicker ? "chevron-up" : "chevron-down"}
                    size={14}
                    color="#64748B"
                    style={{ marginLeft: 4 }}
                  />
                </TouchableOpacity>
                {showUnitPicker && (
                  <DropdownList
                    items={units.map((u) => ({ id: u, name: u }))}
                    getId={(u) => u.id}
                    getName={(u) => u.name}
                    selectedId={unit}
                    onSelect={(id) => {
                      setUnit(id);
                      setShowUnitPicker(false);
                    }}
                    loading={false}
                    emptyText=""
                  />
                )}
              </View>
            </View>

            <View style={styles.fieldSpacer} />

            {/* 6 · Price */}
            <FieldLabel label="Expected Price (₹)" required step={6} />
            <FocusableInput
              icon="cash-outline"
              placeholder="Enter your target price"
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
              onFocusChange={closeAllPickers}
            />
          </View>

          {/* ── Summary chips ── */}
          {filledCount > 0 && (
            <View style={styles.summaryRow}>
              {productName ? (
                <View style={styles.summaryChip}>
                  <Ionicons name="cube-outline" size={11} color="#0078D7" />
                  <Text style={styles.summaryChipText} numberOfLines={1}>
                    {productName}
                  </Text>
                </View>
              ) : null}
              {selectedCategoryName ? (
                <View style={styles.summaryChip}>
                  <Ionicons name="grid-outline" size={11} color="#0078D7" />
                  <Text style={styles.summaryChipText}>{selectedCategoryName}</Text>
                </View>
              ) : null}
              {quantity && unit ? (
                <View style={styles.summaryChip}>
                  <Ionicons name="scale-outline" size={11} color="#0078D7" />
                  <Text style={styles.summaryChipText}>
                    {quantity} {unit}
                  </Text>
                </View>
              ) : null}
              {price ? (
                <View style={styles.summaryChip}>
                  <Text style={styles.summaryChipRupee}>₹</Text>
                  <Text style={styles.summaryChipText}>{price}</Text>
                </View>
              ) : null}
            </View>
          )}

          {/* ── Submit ── */}
          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <View style={styles.submitIconWrap}>
                  <Ionicons name="send" size={15} color="#0078D7" />
                </View>
                <Text style={styles.submitBtnText}>Submit RFQ</Text>
                <Ionicons
                  name="arrow-forward"
                  size={16}
                  color="rgba(255,255,255,0.7)"
                />
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.footerNote}>
            Your RFQ will be visible to all verified sellers on the platform.
          </Text>
        </ScrollView>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F9FC" },

  // Header
  headerWrapper: {
    backgroundColor: "#0060B8",
    paddingHorizontal: 20,
    paddingBottom: 20,
    overflow: "hidden",
    shadowColor: "#003E80",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 18,
  },
  headerOrb1: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(255,255,255,0.06)",
    top: -100,
    right: -70,
  },
  headerOrb2: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.04)",
    bottom: 10,
    left: -60,
  },
  headerOrb3: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(100,180,255,0.08)",
    top: 20,
    right: width * 0.35,
  },
  headerInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 16,
    paddingBottom: 16,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  headerEyebrow: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255,255,255,0.65)",
    letterSpacing: 2,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  progressBadge: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  progressBadgeText: { fontSize: 12, fontWeight: "800", color: "#fff" },
  progressBarTrack: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#4ADE80",
    borderRadius: 2,
  },

  // Scroll
  formScroll: { flex: 1 },

  // Info banner
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#EBF5FF",
    marginHorizontal: 16,
    marginTop: 18,
    marginBottom: 4,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  infoBannerIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0078D7",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 12,
    color: "#0F4C8A",
    lineHeight: 18,
    fontWeight: "500",
  },

  // Stats bar
  statsBar: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 4,
    backgroundColor: "#0078D7",
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 10,
    shadowColor: "#0078D7",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 8,
  },
  statItem: { flex: 1, alignItems: "center" },
  statValue: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
    fontWeight: "600",
  },
  statDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.2)" },

  // Form card
  formCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 18,
    borderRadius: 24,
    padding: 20,
    shadowColor: "#1B4FBF",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
    borderWidth: 1,
    borderColor: "#F0F4F8",
  },
  fieldSpacer: { height: 18 },
  rowWrap: { flexDirection: "row" },

  // Picker
  pickerWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7F9FC",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    paddingHorizontal: 10,
    paddingVertical: 12,
    gap: 8,
  },
  pickerWrapOpen: { borderColor: "#0078D7", backgroundColor: "#FAFCFF" },
  pickerDisabled: { opacity: 0.45 },
  pickerIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: "#EBF5FF",
    justifyContent: "center",
    alignItems: "center",
  },
  pickerValue: { flex: 1, fontSize: 14, color: "#0F172A", fontWeight: "500" },
  pickerPlaceholder: { flex: 1, fontSize: 14, color: "#94A3B8" },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
  },

  // Summary chips
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 18,
  },
  summaryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#EBF5FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  summaryChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0F4C8A",
    maxWidth: 100,
  },
  summaryChipRupee: { fontSize: 11, fontWeight: "800", color: "#0078D7" },

  // Submit
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#0078D7",
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 17,
    borderRadius: 18,
    shadowColor: "#0060B8",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  submitBtnDisabled: { opacity: 0.65 },
  submitIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },

  // Footer note
  footerNote: {
    textAlign: "center",
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 14,
    paddingHorizontal: 32,
    lineHeight: 16,
  },
});

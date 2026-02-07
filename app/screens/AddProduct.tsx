import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
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

interface ProductForm {
  name: string;
  category: string;
  subCategory: string;
  unit: string;
  quantity: string;
  price: string;
  minimumOrderQty: string;
  origin: string;
  description: string;
  isActive: boolean;
  images: string[];
}

interface DropdownOption {
  label: string;
  value: string;
}

const categories: DropdownOption[] = [
  { label: "Cashew", value: "cashew" },
  { label: "Almond", value: "almond" },
  { label: "Pista", value: "pista" },
  { label: "Dates", value: "dates" },
  { label: "Raisins", value: "raisins" },
];

const units: DropdownOption[] = [
  { label: "KG (Kilograms)", value: "kg" },
  { label: "L (Liters)", value: "l" },
  { label: "Pieces", value: "pieces" },
  { label: "Grams", value: "g" },
  { label: "Tons", value: "tons" },
];

const AddProductsScreenEnhanced: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [showCategoryModal, setShowCategoryModal] = useState<boolean>(false);
  const [showUnitModal, setShowUnitModal] = useState<boolean>(false);
  const [formData, setFormData] = useState<ProductForm>({
    name: "",
    category: "",
    subCategory: "",
    unit: "",
    quantity: "",
    price: "",
    minimumOrderQty: "",
    origin: "",
    description: "",
    isActive: true,
    images: [],
  });

  const handleBack = () => {
    if (hasFormData()) {
      Alert.alert(
        "Discard Changes?",
        "You have unsaved changes. Are you sure you want to go back?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => {
              router.back();
            },
          },
        ]
      );
    } else {
      router.back();
    }
  };

  const hasFormData = (): boolean => {
    return !!(
      formData.name ||
      formData.category ||
      formData.quantity ||
      formData.price ||
      formData.description
    );
  };

  const handleInputChange = (field: keyof ProductForm, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCategorySelect = (value: string) => {
    handleInputChange("category", value);
    setShowCategoryModal(false);
  };

  const handleUnitSelect = (value: string) => {
    handleInputChange("unit", value);
    setShowUnitModal(false);
  };

  const toggleActive = () => {
    setFormData((prev) => ({ ...prev, isActive: !prev.isActive }));
  };

  const requestPermissions = async (): Promise<boolean> => {
    try {
      if (Platform.OS === "android") {
        // For Android 13 and above, we need specific permissions
        const { status: mediaStatus } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (mediaStatus !== "granted") {
          Alert.alert(
            "Permission Required",
            "Please allow access to your photos to upload product images.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Open Settings", onPress: () => Linking.openSettings() },
            ]
          );
          return false;
        }
      } else if (Platform.OS === "ios") {
        // For iOS
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (status !== "granted") {
          Alert.alert(
            "Permission Required",
            "Please allow access to your photos to upload product images.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Open Settings", onPress: () => Linking.openSettings() },
            ]
          );
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error("Permission error:", error);
      return false;
    }
  };

  const handleImageUpload = async () => {
    try {
      // Check how many images can still be added
      const remainingSlots = 3 - formData.images.length;
      if (remainingSlots <= 0) {
        Alert.alert("Limit Reached", "You can only upload up to 3 images");
        return;
      }

      // Request permissions
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      // Show options: Camera or Gallery
      Alert.alert(
        "Upload Image",
        "Choose an option",
        [
          {
            text: "Take Photo",
            onPress: () => handleCamera(),
          },
          {
            text: "Choose from Gallery",
            onPress: () => handleGallery(),
          },
          {
            text: "Cancel",
            style: "cancel",
          },
        ],
        { cancelable: true }
      );
    } catch (error) {
      console.error("Image upload error:", error);
      Alert.alert("Error", "Failed to upload image. Please try again.");
    }
  };

  const handleCamera = async () => {
    try {
      // Request camera permission
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Camera Permission Required",
          "Please allow camera access to take photos.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newImage = result.assets[0].uri;
        setFormData((prev) => ({
          ...prev,
          images: [...prev.images, newImage].slice(0, 3),
        }));
      }
    } catch (error) {
      console.error("Camera error:", error);
      Alert.alert("Error", "Failed to open camera");
    }
  };

  const handleGallery = async () => {
    try {
      const remainingSlots = 3 - formData.images.length;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: remainingSlots > 1,
        selectionLimit: remainingSlots,
        quality: 0.8,
        allowsEditing: remainingSlots === 1, // Only allow editing if selecting one image
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newImages = result.assets.map((asset: any) => asset.uri);
        setFormData((prev) => ({
          ...prev,
          images: [...prev.images, ...newImages].slice(0, 3),
        }));
      }
    } catch (error) {
      console.error("Gallery error:", error);
      Alert.alert("Error", "Failed to pick images from gallery");
    }
  };

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      Alert.alert("Validation Error", "Please enter product name");
      return false;
    }
    if (!formData.category.trim()) {
      Alert.alert("Validation Error", "Please select product category");
      return false;
    }
    if (!formData.quantity.trim()) {
      Alert.alert("Validation Error", "Please enter quantity");
      return false;
    }
    if (!formData.price.trim() || isNaN(Number(formData.price))) {
      Alert.alert("Validation Error", "Please enter valid price");
      return false;
    }
    return true;
  };

  const handlePublish = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const productData = {
        ...formData,
        quantity: Number(formData.quantity),
        price: Number(formData.price),
        minimumOrderQty: formData.minimumOrderQty
          ? Number(formData.minimumOrderQty)
          : null,
      };

      console.log("Publishing product:", productData);

      Alert.alert("Success", "Product published successfully!", [
        {
          text: "Add Another",
          onPress: () => {
            setFormData({
              name: "",
              category: "",
              subCategory: "",
              unit: "",
              quantity: "",
              price: "",
              minimumOrderQty: "",
              origin: "",
              description: "",
              isActive: true,
              images: [],
            });
          },
        },
        { text: "Done", onPress: () => handleBack() },
      ]);
    } catch (error) {
      Alert.alert("Error", "Failed to publish product. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderDropdownModal = (
    visible: boolean,
    onClose: () => void,
    options: DropdownOption[],
    onSelect: (value: string) => void,
    title: string
  ) => (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <ScrollView>
            {options.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={styles.modalOption}
                onPress={() => onSelect(option.value)}
              >
                <Text style={styles.modalOptionText}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar barStyle="light-content" backgroundColor="#177DDF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Products</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.formContainer}>
          {/* Product Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Product Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Enter product name"
              placeholderTextColor="#999"
              value={formData.name}
              onChangeText={(value) => handleInputChange("name", value)}
            />
          </View>

          {/* Product Category */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Product Category <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowCategoryModal(true)}
            >
              <Text
                style={[
                  styles.inputText,
                  !formData.category && styles.placeholderText,
                ]}
              >
                {formData.category
                  ? categories.find((c) => c.value === formData.category)?.label
                  : "Select category"}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#999" />
            </TouchableOpacity>
          </View>

          {/* Product Sub Category */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Product Sub Category</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter sub category (optional)"
              placeholderTextColor="#999"
              value={formData.subCategory}
              onChangeText={(value) => handleInputChange("subCategory", value)}
            />
          </View>

          {/* Product Unit */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Product Unit</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowUnitModal(true)}
            >
              <Text
                style={[
                  styles.inputText,
                  !formData.unit && styles.placeholderText,
                ]}
              >
                {formData.unit
                  ? units.find((u) => u.value === formData.unit)?.label
                  : "Select unit (KG, L, etc.)"}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#999" />
            </TouchableOpacity>
          </View>

          {/* Quantity */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Quantity <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Enter quantity"
              placeholderTextColor="#999"
              keyboardType="numeric"
              value={formData.quantity}
              onChangeText={(value) => handleInputChange("quantity", value)}
            />
          </View>

          {/* Price */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Price <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Enter price per unit"
              placeholderTextColor="#999"
              keyboardType="numeric"
              value={formData.price}
              onChangeText={(value) => handleInputChange("price", value)}
            />
          </View>

          {/* Minimum Order Quantity */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Minimum Order Quantity</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter minimum order quantity"
              placeholderTextColor="#999"
              keyboardType="numeric"
              value={formData.minimumOrderQty}
              onChangeText={(value) =>
                handleInputChange("minimumOrderQty", value)
              }
            />
          </View>

          {/* Origin */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Origin</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter origin location"
              placeholderTextColor="#999"
              value={formData.origin}
              onChangeText={(value) => handleInputChange("origin", value)}
            />
          </View>

          {/* Product Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Product Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter product description"
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={formData.description}
              onChangeText={(value) => handleInputChange("description", value)}
            />
          </View>

          {/* Active Toggle */}
          <View style={styles.toggleContainer}>
            <Text style={styles.toggleLabel}>Active</Text>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                formData.isActive && styles.toggleButtonActive,
              ]}
              onPress={toggleActive}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.toggleCircle,
                  formData.isActive && styles.toggleCircleActive,
                ]}
              />
            </TouchableOpacity>
          </View>

          {/* Image Upload */}
          <View style={styles.imageUploadContainer}>
            <Text style={styles.label}>Product Images</Text>

            {formData.images.length > 0 && (
              <View style={styles.imagesPreview}>
                {formData.images.map((image, index) => (
                  <View key={index} style={styles.imagePreviewItem}>
                    <Image
                      source={{ uri: image }}
                      style={styles.previewImage}
                    />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => removeImage(index)}
                    >
                      <Ionicons name="close-circle" size={24} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {formData.images.length < 3 && (
              <TouchableOpacity
                style={styles.imageUploadBox}
                onPress={handleImageUpload}
              >
                <Ionicons name="image-outline" size={48} color="#177DDF" />
                <Text style={styles.imageUploadText}>
                  Upload {formData.images.length > 0 ? "More" : "2-3"} Images
                </Text>
                <Text style={styles.imageUploadSubtext}>
                  {3 - formData.images.length} remaining
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Publish Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.publishButton,
            loading && styles.publishButtonDisabled,
          ]}
          onPress={handlePublish}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons
                name="checkmark-circle-outline"
                size={24}
                color="#FFFFFF"
                style={styles.buttonIcon}
              />
              <Text style={styles.publishButtonText}>Publish Product</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Category Modal */}
      {renderDropdownModal(
        showCategoryModal,
        () => setShowCategoryModal(false),
        categories,
        handleCategorySelect,
        "Select Category"
      )}

      {/* Unit Modal */}
      {renderDropdownModal(
        showUnitModal,
        () => setShowUnitModal(false),
        units,
        handleUnitSelect,
        "Select Unit"
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    backgroundColor: "#177DDF",
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  formContainer: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  required: {
    color: "#FF3B30",
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#333",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  inputText: {
    fontSize: 15,
    color: "#333",
    flex: 1,
  },
  placeholderText: {
    color: "#999",
  },
  textArea: {
    height: 100,
    paddingTop: 14,
  },
  toggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: "#333",
  },
  toggleButton: {
    width: 52,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#E0E0E0",
    padding: 2,
    justifyContent: "center",
  },
  toggleButtonActive: {
    backgroundColor: "#177DDF",
  },
  toggleCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  toggleCircleActive: {
    alignSelf: "flex-end",
  },
  imageUploadContainer: {
    marginTop: 8,
  },
  imagesPreview: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
  },
  imagePreviewItem: {
    width: 100,
    height: 100,
    marginRight: 12,
    marginBottom: 12,
    position: "relative",
    borderRadius: 10,
    overflow: "hidden",
  },
  previewImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#E0E0E0",
  },
  removeImageButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
  },
  imageUploadBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#177DDF",
    borderStyle: "dashed",
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  imageUploadText: {
    fontSize: 14,
    color: "#177DDF",
    marginTop: 12,
    fontWeight: "600",
  },
  imageUploadSubtext: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  buttonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  publishButton: {
    backgroundColor: "#177DDF",
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    elevation: 3,
    shadowColor: "#177DDF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  publishButtonDisabled: {
    opacity: 0.6,
  },
  buttonIcon: {
    marginRight: 8,
  },
  publishButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  modalOption: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  modalOptionText: {
    fontSize: 16,
    color: "#333",
  },
});

export default AddProductsScreenEnhanced;

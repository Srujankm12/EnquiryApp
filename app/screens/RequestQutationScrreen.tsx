import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function RequestForQuotation() {
  const [productName, setProductName] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [productSubCategory, setProductSubCategory] = useState('');
  const [productUnit, setProductUnit] = useState('');
  const [quantity, setQuantity] = useState('');
  const [productDescription, setProductDescription] = useState('');

  const handleSubmit = () => {
    // Handle form submission
    const formData = {
      productName,
      productCategory,
      productSubCategory,
      productUnit,
      quantity,
      productDescription,
    };
    console.log('Form submitted:', formData);
    // Add your submission logic here
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1976D2" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" onPress={() => router                                .back()} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request for Quotation</Text>
      </View>

      {/* Form */}
      <ScrollView style={styles.formContainer}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Product Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter"
            placeholderTextColor="#999"
            value={productName}
            onChangeText={setProductName}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Product Category</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter"
            placeholderTextColor="#999"
            value={productCategory}
            onChangeText={setProductCategory}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Product Sub Category</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter"
            placeholderTextColor="#999"
            value={productSubCategory}
            onChangeText={setProductSubCategory}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Product Unit</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter"
            placeholderTextColor="#999"
            value={productUnit}
            onChangeText={setProductUnit}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Quantity</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter"
            placeholderTextColor="#999"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Product Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Enter"
            placeholderTextColor="#999"
            value={productDescription}
            onChangeText={setProductDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Submit RFQ</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#1E90FF',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  formContainer: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  submitButton: {
    backgroundColor: '#1976D2',
    borderRadius: 4,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 32,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
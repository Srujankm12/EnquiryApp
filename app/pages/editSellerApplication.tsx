import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CompanyDetails {
  companyName: string;
  ownerName: string;
  email: string;
  phoneNumber: string;
  gstNumber: string;
  panNumber: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  businessType: string;
  description: string;
  companyLogo?: string;
  gstDocument?: string;
  panDocument?: string;
}

const EditSellerApplication = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [gstDocument, setGstDocument] = useState<any>(null);
  const [panDocument, setPanDocument] = useState<any>(null);
  const [remarks, setRemarks] = useState<string>('');
  
  const [formData, setFormData] = useState<CompanyDetails>({
    companyName: '',
    ownerName: '',
    email: '',
    phoneNumber: '',
    gstNumber: '',
    panNumber: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    businessType: '',
    description: '',
  });

  const [errors, setErrors] = useState<Partial<CompanyDetails>>({});

  useEffect(() => {
    loadExistingApplication();
  }, []);

  const loadExistingApplication = async () => {
    try {
      setLoading(true);
      const application = await AsyncStorage.getItem('sellerApplication');
      
      if (application) {
        const parsedApplication = JSON.parse(application);
        setFormData(parsedApplication);
        setCompanyLogo(parsedApplication.companyLogo || null);
        setRemarks(parsedApplication.remarks || '');
        
        if (parsedApplication.gstDocument) {
          setGstDocument({ uri: parsedApplication.gstDocument, name: 'GST Document' });
        }
        if (parsedApplication.panDocument) {
          setPanDocument({ uri: parsedApplication.panDocument, name: 'PAN Document' });
        }
      }
    } catch (error) {
      console.error('Error loading application:', error);
      Alert.alert('Error', 'Failed to load application data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CompanyDetails, value: string) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const pickLogo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setCompanyLogo(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const pickDocument = async (type: 'gst' | 'pan') => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        if (type === 'gst') {
          setGstDocument(result.assets[0]);
        } else {
          setPanDocument(result.assets[0]);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<CompanyDetails> = {};

    if (!formData.companyName.trim()) newErrors.companyName = 'Required';
    if (!formData.ownerName.trim()) newErrors.ownerName = 'Required';
    if (!formData.email.trim()) newErrors.email = 'Required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email';
    if (!formData.phoneNumber.trim()) newErrors.phoneNumber = 'Required';
    else if (!/^\d{10}$/.test(formData.phoneNumber)) newErrors.phoneNumber = 'Invalid';
    if (!formData.gstNumber.trim()) newErrors.gstNumber = 'Required';
    if (!formData.panNumber.trim()) newErrors.panNumber = 'Required';
    if (!formData.address.trim()) newErrors.address = 'Required';
    if (!formData.city.trim()) newErrors.city = 'Required';
    if (!formData.state.trim()) newErrors.state = 'Required';
    if (!formData.pincode.trim()) newErrors.pincode = 'Required';
    if (!formData.bankName.trim()) newErrors.bankName = 'Required';
    if (!formData.accountNumber.trim()) newErrors.accountNumber = 'Required';
    if (!formData.ifscCode.trim()) newErrors.ifscCode = 'Required';
    if (!formData.businessType.trim()) newErrors.businessType = 'Required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleResubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fill all required fields correctly');
      return;
    }

    Alert.alert(
      'Confirm Resubmission',
      'Are you sure you want to resubmit your application for review?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Resubmit',
          onPress: async () => {
            try {
              setSubmitting(true);

              const submissionData = {
                ...formData,
                companyLogo,
                gstDocument: gstDocument?.uri,
                panDocument: panDocument?.uri,
                status: 'pending',
                submittedAt: new Date().toISOString(),
                resubmittedAt: new Date().toISOString(),
              };

              // In real app:
              // await fetch('YOUR_API_URL/seller/resubmit', {
              //   method: 'POST',
              //   body: JSON.stringify(submissionData),
              // });

              await AsyncStorage.setItem('sellerApplication', JSON.stringify(submissionData));
              await AsyncStorage.setItem('sellerStatus', 'pending');

              Alert.alert(
                'Success',
                'Your application has been resubmitted successfully!',
                [
                  {
                    text: 'OK',
                    onPress: () => router.replace('../pages/sellerApplicationStatus'),
                  },
                ]
              );
            } catch (error) {
              console.error('Error resubmitting:', error);
              Alert.alert('Error', 'Failed to resubmit application');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#0078D7" />
        <Text style={styles.loaderText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Application</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Admin Remarks Alert */}
        {remarks && (
          <View style={styles.remarksAlert}>
            <View style={styles.remarksHeader}>
              <Ionicons name="alert-circle" size={20} color="#FF3B30" />
              <Text style={styles.remarksTitle}>Admin Remarks</Text>
            </View>
            <Text style={styles.remarksText}>{remarks}</Text>
            <Text style={styles.remarksSubtext}>
              Please address these issues before resubmitting
            </Text>
          </View>
        )}

        {/* Company Logo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Company Logo *</Text>
          <TouchableOpacity style={styles.logoUpload} onPress={pickLogo}>
            {companyLogo ? (
              <Image source={{ uri: companyLogo }} style={styles.logoImage} />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Ionicons name="camera" size={32} color="#999" />
                <Text style={styles.uploadText}>Upload Logo</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Company Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Company Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Company Name *</Text>
            <TextInput
              style={[styles.input, errors.companyName && styles.inputError]}
              value={formData.companyName}
              onChangeText={(text) => handleInputChange('companyName', text)}
            />
            {errors.companyName && <Text style={styles.errorText}>{errors.companyName}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Owner Name *</Text>
            <TextInput
              style={[styles.input, errors.ownerName && styles.inputError]}
              value={formData.ownerName}
              onChangeText={(text) => handleInputChange('ownerName', text)}
            />
            {errors.ownerName && <Text style={styles.errorText}>{errors.ownerName}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              value={formData.email}
              onChangeText={(text) => handleInputChange('email', text)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number *</Text>
            <TextInput
              style={[styles.input, errors.phoneNumber && styles.inputError]}
              value={formData.phoneNumber}
              onChangeText={(text) => handleInputChange('phoneNumber', text)}
              keyboardType="phone-pad"
              maxLength={10}
            />
            {errors.phoneNumber && <Text style={styles.errorText}>{errors.phoneNumber}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Business Type *</Text>
            <TextInput
              style={[styles.input, errors.businessType && styles.inputError]}
              value={formData.businessType}
              onChangeText={(text) => handleInputChange('businessType', text)}
            />
            {errors.businessType && <Text style={styles.errorText}>{errors.businessType}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Business Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(text) => handleInputChange('description', text)}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Tax Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tax Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>GST Number *</Text>
            <TextInput
              style={[styles.input, errors.gstNumber && styles.inputError]}
              value={formData.gstNumber}
              onChangeText={(text) => handleInputChange('gstNumber', text.toUpperCase())}
              autoCapitalize="characters"
              maxLength={15}
            />
            {errors.gstNumber && <Text style={styles.errorText}>{errors.gstNumber}</Text>}
          </View>

          <TouchableOpacity style={styles.documentUpload} onPress={() => pickDocument('gst')}>
            <Ionicons
              name={gstDocument ? 'document-text' : 'cloud-upload-outline'}
              size={24}
              color={gstDocument ? '#0078D7' : '#999'}
            />
            <Text style={styles.documentUploadText}>
              {gstDocument?.name || 'Upload GST Certificate *'}
            </Text>
          </TouchableOpacity>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>PAN Number *</Text>
            <TextInput
              style={[styles.input, errors.panNumber && styles.inputError]}
              value={formData.panNumber}
              onChangeText={(text) => handleInputChange('panNumber', text.toUpperCase())}
              autoCapitalize="characters"
              maxLength={10}
            />
            {errors.panNumber && <Text style={styles.errorText}>{errors.panNumber}</Text>}
          </View>

          <TouchableOpacity style={styles.documentUpload} onPress={() => pickDocument('pan')}>
            <Ionicons
              name={panDocument ? 'document-text' : 'cloud-upload-outline'}
              size={24}
              color={panDocument ? '#0078D7' : '#999'}
            />
            <Text style={styles.documentUploadText}>
              {panDocument?.name || 'Upload PAN Card *'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Address Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Address Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.address}
              onChangeText={(text) => handleInputChange('address', text)}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>City *</Text>
              <TextInput
                style={[styles.input, errors.city && styles.inputError]}
                value={formData.city}
                onChangeText={(text) => handleInputChange('city', text)}
              />
              {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
            </View>

            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>State *</Text>
              <TextInput
                style={[styles.input, errors.state && styles.inputError]}
                value={formData.state}
                onChangeText={(text) => handleInputChange('state', text)}
              />
              {errors.state && <Text style={styles.errorText}>{errors.state}</Text>}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Pincode *</Text>
            <TextInput
              style={[styles.input, errors.pincode && styles.inputError]}
              value={formData.pincode}
              onChangeText={(text) => handleInputChange('pincode', text)}
              keyboardType="number-pad"
              maxLength={6}
            />
            {errors.pincode && <Text style={styles.errorText}>{errors.pincode}</Text>}
          </View>
        </View>

        {/* Bank Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bank Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bank Name *</Text>
            <TextInput
              style={[styles.input, errors.bankName && styles.inputError]}
              value={formData.bankName}
              onChangeText={(text) => handleInputChange('bankName', text)}
            />
            {errors.bankName && <Text style={styles.errorText}>{errors.bankName}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Account Number *</Text>
            <TextInput
              style={[styles.input, errors.accountNumber && styles.inputError]}
              value={formData.accountNumber}
              onChangeText={(text) => handleInputChange('accountNumber', text)}
              keyboardType="number-pad"
            />
            {errors.accountNumber && <Text style={styles.errorText}>{errors.accountNumber}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>IFSC Code *</Text>
            <TextInput
              style={[styles.input, errors.ifscCode && styles.inputError]}
              value={formData.ifscCode}
              onChangeText={(text) => handleInputChange('ifscCode', text.toUpperCase())}
              autoCapitalize="characters"
              maxLength={11}
            />
            {errors.ifscCode && <Text style={styles.errorText}>{errors.ifscCode}</Text>}
          </View>
        </View>

        {/* Resubmit Button */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleResubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>Resubmit Application</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loaderText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  header: {
    backgroundColor: '#1E90FF',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  remarksAlert: {
    backgroundColor: '#FFEBEE',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
  },
  remarksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  remarksTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF3B30',
    marginLeft: 8,
  },
  remarksText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 8,
  },
  remarksSubtext: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
  },
  logoUpload: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  logoPlaceholder: {
    alignItems: 'center',
  },
  uploadText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#000',
    backgroundColor: '#FAFAFA',
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  textArea: {
    height: 80,
    paddingTop: 10,
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
  },
  documentUpload: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    borderStyle: 'dashed',
    marginBottom: 16,
    backgroundColor: '#FAFAFA',
  },
  documentUploadText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#0078D7',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default EditSellerApplication;
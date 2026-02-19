import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StatusBar,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = "http://192.168.1.4:8080";

interface DecodedToken {
  user_id: string;
  exp?: number;
}

interface FieldErrors {
  newPassword?: string;
  confirmPassword?: string;
}

const UpdatePasswordScreen: React.FC = () => {
  const [userId, setUserId] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    getUserId();
  }, []);

  const clearError = (field: keyof FieldErrors) => {
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const getUserId = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Session Expired', 'Please login again.');
        router.replace('/login' as any);
        return;
      }
      const decoded = jwtDecode<DecodedToken>(token);
      setUserId(decoded.user_id);
    } catch (error: any) {
      console.error('Error decoding token:', error);
      Alert.alert('Error', 'Failed to get user information. Please login again.');
      router.replace('/login' as any);
    }
  };

  // Password strength: 0 = weak, 1 = medium, 2 = strong
  const getPasswordStrength = (): number => {
    if (newPassword.length < 8) return 0;
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecial = /[@$!%*?&]/.test(newPassword);
    const score = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
    if (score <= 2) return 1;
    return 2;
  };

  const strengthLevel = getPasswordStrength();
  const strengthLabels = ['Weak', 'Medium', 'Strong'];
  const strengthColors = ['#E53E3E', '#F6AD55', '#48BB78'];

  const validate = (): boolean => {
    const newErrors: FieldErrors = {};

    if (!newPassword.trim()) {
      newErrors.newPassword = 'New password is required';
    } else if (!/^[A-Za-z\d@$!%*?&]{8,}$/.test(newPassword)) {
      // Matches backend passwordRegx exactly
      newErrors.newPassword = 'Min 8 characters — letters, digits or @$!%*?&';
    }

    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpdatePassword = async () => {
    if (!validate()) return;

    const token = await AsyncStorage.getItem('token');
    if (!token || !userId) {
      Alert.alert('Session Expired', 'Please login again.');
      router.replace('/login' as any);
      return;
    }

    console.log('=== UPDATE PASSWORD REQUEST ===');
    console.log('URL:', `${API_URL}/user/update/password/${userId}`);

    try {
      setLoading(true);

      // PUT /user/update/password/{id}
      // Body matches updatePasswordRequest: { "password": "..." }
      const response = await axios.put(
        `${API_URL}/user/update/password/${userId}`,
        {
          password: newPassword,   // ✅ matches updatePasswordRequest struct
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      console.log('=== UPDATE PASSWORD SUCCESS ===');
      console.log('Status:', response.status);
      console.log('Response:', JSON.stringify(response.data, null, 2));

      // Backend returns: utils.Envelope{"message": "..."}
      Alert.alert('Success', response.data.message || 'Password updated successfully!', [
        {
          text: 'OK',
          onPress: () => {
            setNewPassword('');
            setConfirmPassword('');
            router.back();
          },
        },
      ]);
    } catch (error: any) {
      console.log('=== UPDATE PASSWORD ERROR ===');
      console.log('Status:', error.response?.status);
      console.log('Response:', JSON.stringify(error.response?.data, null, 2));
      console.log('Message:', error.message);

      if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        Alert.alert('Cannot Reach Server', `Check your connection.\nURL: ${API_URL}`);
        return;
      }

      // Backend returns: utils.Envelope{"error": "..."}  ← key is "error" not "message"
      const serverMessage: string = error.response?.data?.error ?? '';
      const statusCode: number = error.response?.status ?? 0;

      if (serverMessage.toLowerCase().includes('password')) {
        setErrors({ newPassword: serverMessage });
      } else if (statusCode === 401) {
        Alert.alert('Session Expired', 'Please login again.');
        router.replace('/login' as any);
      } else if (statusCode === 404) {
        Alert.alert('Not Found', 'User not found. Please login again.');
      } else if (statusCode === 500) {
        Alert.alert('Server Error', 'Something went wrong on the server. Please try again.');
      } else {
        Alert.alert('Failed', serverMessage || 'Could not update password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0078D7" translucent={false} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Update Password</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>

          {/* Info Card */}
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={22} color="#0078D7" />
            <Text style={styles.infoText}>
              Use at least 8 characters including uppercase, lowercase, digits, or @$!%*?&
            </Text>
          </View>

          {/* New Password */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>New Password</Text>
            <View style={[styles.inputWrapper, errors.newPassword && styles.inputWrapperError]}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter new password"
                placeholderTextColor="#999"
                value={newPassword}
                onChangeText={(v) => { setNewPassword(v); clearError('newPassword'); }}
                secureTextEntry={!showNewPassword}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowNewPassword(!showNewPassword)}
              >
                <Ionicons
                  name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#999"
                />
              </TouchableOpacity>
            </View>
            {errors.newPassword && (
              <Text style={styles.errorText}>{errors.newPassword}</Text>
            )}
          </View>

          {/* Password Strength Indicator */}
          {newPassword.length > 0 && (
            <View style={styles.strengthContainer}>
              <View style={styles.strengthBars}>
                {[0, 1, 2].map((i) => (
                  <View
                    key={i}
                    style={[
                      styles.strengthBar,
                      i <= strengthLevel && { backgroundColor: strengthColors[strengthLevel] },
                    ]}
                  />
                ))}
              </View>
              <Text style={[styles.strengthLabel, { color: strengthColors[strengthLevel] }]}>
                {strengthLabels[strengthLevel]}
              </Text>
            </View>
          )}

          {/* Confirm Password */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Confirm New Password</Text>
            <View style={[styles.inputWrapper, errors.confirmPassword && styles.inputWrapperError]}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Re-enter new password"
                placeholderTextColor="#999"
                value={confirmPassword}
                onChangeText={(v) => { setConfirmPassword(v); clearError('confirmPassword'); }}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#999"
                />
              </TouchableOpacity>
            </View>
            {errors.confirmPassword && (
              <Text style={styles.errorText}>{errors.confirmPassword}</Text>
            )}
          </View>

          {/* Update Button */}
          <TouchableOpacity
            style={[styles.updateButton, loading && styles.updateButtonDisabled]}
            onPress={handleUpdatePassword}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="lock-closed" size={18} color="#FFFFFF" />
                <Text style={styles.updateButtonText}>Update Password</Text>
              </>
            )}
          </TouchableOpacity>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  header: {
    backgroundColor: '#0078D7',
    paddingTop: Platform.OS === 'ios' ? 54 : 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
    padding: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  content: {
    flex: 1,
  },
  infoCard: {
    backgroundColor: '#EBF4FF',
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 28,
    borderLeftWidth: 4,
    borderLeftColor: '#0078D7',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#444',
    marginLeft: 10,
    lineHeight: 20,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputWrapperError: {
    borderColor: '#E53E3E',
    backgroundColor: '#FFF5F5',
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#000',
  },
  eyeButton: {
    padding: 14,
  },
  errorText: {
    fontSize: 12,
    color: '#E53E3E',
    marginTop: 6,
    marginLeft: 4,
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -12,
    marginBottom: 20,
    gap: 10,
  },
  strengthBars: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
  },
  strengthBar: {
    flex: 1,
    height: 5,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '600',
    width: 50,
    textAlign: 'right',
  },
  updateButton: {
    backgroundColor: '#0078D7',
    borderRadius: 12,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#0078D7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    gap: 8,
  },
  updateButtonDisabled: {
    backgroundColor: '#B0C4DE',
    shadowOpacity: 0.1,
    elevation: 0,
  },
  updateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
});

export default UpdatePasswordScreen;
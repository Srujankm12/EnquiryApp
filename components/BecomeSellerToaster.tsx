import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.API_URL;

interface BecomeSellerToasterProps {
  visible?: boolean;
  onClose?: () => void;
}

const BecomeSellerToaster: React.FC<BecomeSellerToasterProps> = ({
  visible = true,
  onClose,
}) => {
  const [show, setShow] = useState(false);
  const [sellerStatus, setSellerStatus] = useState<string | null>(null);
  const slideAnim = new Animated.Value(100);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    checkToasterStatus();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const checkToasterStatus = async () => {
    try {
      const status = await AsyncStorage.getItem('sellerStatus');
      const normalizedStatus = status?.toLowerCase()?.trim() || null;

      // Check multiple approved states
      if (
        normalizedStatus === 'approved' ||
        normalizedStatus === 'accepted' ||
        normalizedStatus === 'active'
      ) {
        setSellerStatus('approved');
        setShow(false);
        return;
      }

      // Also check via API if businessId is available
      const businessId = await AsyncStorage.getItem('companyId');
      if (businessId) {
        try {
          const statusRes = await fetch(`${API_URL}/business/status/${businessId}`, {
            headers: { 'Content-Type': 'application/json' },
          });
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            // Check if business is approved from status endpoint
            if (
              statusData?.is_approved === true ||
              statusData?.details?.is_approved === true ||
              statusData?.is_business_approved === true ||
              statusData?.details?.is_business_approved === true
            ) {
              await AsyncStorage.setItem('sellerStatus', 'approved');
              setSellerStatus('approved');
              setShow(false);
              return;
            }
          }
        } catch {
          // Status endpoint not available, continue with stored status
        }

        // Also check application status
        try {
          const appRes = await fetch(`${API_URL}/business/application/get/${businessId}`, {
            headers: { 'Content-Type': 'application/json' },
          });
          if (appRes.ok) {
            const appData = await appRes.json();
            const appStatus = (
              appData?.details?.status ||
              appData?.application?.status ||
              appData?.status ||
              ''
            ).toLowerCase().trim();

            if (appStatus === 'approved' || appStatus === 'accepted' || appStatus === 'active') {
              await AsyncStorage.setItem('sellerStatus', 'approved');
              setSellerStatus('approved');
              setShow(false);
              return;
            } else if (appStatus === 'applied' || appStatus === 'pending' || appStatus === 'under_review') {
              await AsyncStorage.setItem('sellerStatus', 'pending');
              setSellerStatus('pending');
            } else if (appStatus === 'rejected' || appStatus === 'declined') {
              await AsyncStorage.setItem('sellerStatus', 'rejected');
              setSellerStatus('rejected');
            }
          }
        } catch {
          // Application endpoint not available
        }
      }

      setSellerStatus(normalizedStatus);

      if (normalizedStatus !== 'approved') {
        setShow(true);
        slideUp();
      }
    } catch (error) {
      console.error('Error checking toaster status:', error);
    }
  };

  const slideUp = () => {
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const slideDown = () => {
    Animated.timing(slideAnim, {
      toValue: 100,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShow(false);
      onClose?.();

      timeoutRef.current = setTimeout(() => {
        checkToasterStatus();
      }, 15000);
    });
  };

  const handleDismiss = async () => {
    try {
      slideDown();
    } catch (error) {
      console.error('Error dismissing toaster:', error);
    }
  };

  const handlePress = () => {
    slideDown();
    const normalizedStatus = sellerStatus?.toLowerCase();
    if (normalizedStatus === 'pending' || normalizedStatus === 'applied' || normalizedStatus === 'under_review') {
      router.push('/pages/sellerApplicationStatus');
    } else if (normalizedStatus === 'rejected' || normalizedStatus === 'declined') {
      router.push('/pages/becomeSellerForm');
    } else {
      router.push('/pages/becomeSellerForm');
    }
  };

  if (!show || !visible) {
    return null;
  }

  const isPending = sellerStatus === 'pending' || sellerStatus === 'applied' || sellerStatus === 'under_review';
  const isRejected = sellerStatus === 'rejected' || sellerStatus === 'declined';

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.toasterButton,
          isPending && styles.pendingButton,
          isRejected && styles.rejectedButton,
        ]}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        <View style={styles.iconContainer}>
          <Ionicons
            name={isPending ? 'time' : isRejected ? 'alert-circle' : 'storefront'}
            size={18}
            color="#FFFFFF"
          />
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.title}>
            {isPending
              ? 'Application Under Review'
              : isRejected
              ? 'Application Rejected'
              : 'Seller Account Not Created'}
          </Text>
          <Text style={styles.subtitle}>
            {isPending
              ? 'Tap to check status'
              : isRejected
              ? 'Tap to resubmit'
              : 'Tap to become a seller and start selling!'}
          </Text>
        </View>

        <Ionicons name="arrow-forward-circle" size={22} color="#FFFFFF" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.closeButton}
        onPress={handleDismiss}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="close-circle" size={18} color="#666" />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 110,
    left: 24,
    right: 24,
    zIndex: 1000,
  },
  toasterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0078D7',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  pendingButton: {
    backgroundColor: '#FF9500',
  },
  rejectedButton: {
    backgroundColor: '#DC3545',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 10,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  closeButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 2,
  },
});

export default BecomeSellerToaster;

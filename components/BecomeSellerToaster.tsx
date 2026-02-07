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

interface BecomeSellerToasterProps {
  visible?: boolean;
  onClose?: () => void;
}

const BecomeSellerToaster: React.FC<BecomeSellerToasterProps> = ({
  visible = true,
  onClose,
}) => {
  const [show, setShow] = useState(false);
  const slideAnim = new Animated.Value(100);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    checkToasterStatus();
    
    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const checkToasterStatus = async () => {
    try {
      const sellerStatus = await AsyncStorage.getItem('sellerStatus');
      
      // Show toaster if user is not already a seller
      if (sellerStatus !== 'approved') {
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
      
      // Show again after 15 seconds
      timeoutRef.current = setTimeout(() => {
        checkToasterStatus();
      }, 15000); // 15 seconds
    });
  };

  const handleDismiss = async () => {
    try {
      // Just close, don't save to AsyncStorage so it can reappear
      slideDown();
    } catch (error) {
      console.error('Error dismissing toaster:', error);
    }
  };

  const handleBecomeSeller = () => {
    slideDown();
    router.push('/pages/becomeSellerForm');
  };

  if (!show || !visible) {
    return null;
  }

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
        style={styles.toasterButton}
        onPress={handleBecomeSeller}
        activeOpacity={0.9}
      >
        <View style={styles.iconContainer}>
          <Ionicons name="storefront" size={18} color="#FFFFFF" />
        </View>
        
        <View style={styles.textContainer}>
          <Text style={styles.title}>Become a Seller</Text>
          <Text style={styles.subtitle}>Start selling now!</Text>
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
    bottom: 110, // Moved up more
    left: 24, // Increased margins for smaller width
    right: 24,
    zIndex: 1000,
  },
  toasterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0078D7',
    paddingVertical: 10, // Reduced from 12
    paddingHorizontal: 14, // Reduced from 16
    borderRadius: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconContainer: {
    width: 32, // Reduced from 36
    height: 32, // Reduced from 36
    borderRadius: 16, // Adjusted for new size
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10, // Reduced from 12
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 13, // Reduced from 14
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 10, // Reduced from 11
    color: '#FFFFFF',
    opacity: 0.9,
  },
  closeButton: {
    position: 'absolute',
    top: -6, // Adjusted for smaller size
    right: -6,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 2,
  },
});

export default BecomeSellerToaster;
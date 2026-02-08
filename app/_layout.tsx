import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useEffect } from 'react';
import AsyncStorage from "@react-native-async-storage/async-storage"


export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  useEffect(() => {
    const checkLogin = async () => {
      const token = await AsyncStorage.getItem("token")
      if (token) {
        router.replace("/(tabs)");
      }
    }
  
    checkLogin()
  }, [])

 

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name='pages/splash' options={{ headerShown: false }} />
        <Stack.Screen name='pages/loginMail' options={{ headerShown: false }} />
        <Stack.Screen name='(tabs)' options={{ headerShown: false }} />
        <Stack.Screen name='(seller)' options={{ headerShown: false }} />
        <Stack.Screen name='pages/login' options={{ headerShown: false }} /> 
        <Stack.Screen name='pages/otp' options={{ headerShown: false }} />
        <Stack.Screen name='pages/myProducts' options={{ headerShown: false }} />
        <Stack.Screen name='pages/addProduct' options={{ headerShown: false }} />
        <Stack.Screen name='pages/followers' options={{ headerShown: false }} />
        <Stack.Screen name='pages/requestQutation' options={{ headerShown: false }} />
        <Stack.Screen name='pages/sellerDirectory' options={{ headerShown: false }} />
        <Stack.Screen name='pages/profileSetting' options={{ headerShown: false }} />
        <Stack.Screen name='pages/bussinesProfile' options={{ headerShown: false }} />
        <Stack.Screen name='pages/bussinesLeads' options={{ headerShown: false }} />
        <Stack.Screen name='pages/specificCategory' options={{ headerShown: false }} />
        <Stack.Screen name='pages/becomeSellerForm' options={{ headerShown: false }} />
        <Stack.Screen name='pages/sellerApplicationStatus' options={{ headerShown: false }} />
        <Stack.Screen name='pages/sellerProfile' options={{ headerShown: false }} />
        <Stack.Screen name='pages/productsByCategory' options={{ headerShown: false }} />
        <Stack.Screen name='pages/productDetail' options={{ headerShown: false }} />
        <Stack.Screen name='pages/editSellerApplication' options={{ headerShown: false }} />
        <Stack.Screen name='pages/upadetPasswordScreen' options={{ headerShown: false }} />
        <Stack.Screen name='pages/updateUserProfileScreen' options={{ headerShown: false }} />
      </Stack>  
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

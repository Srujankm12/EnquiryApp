import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import { jwtDecode } from "jwt-decode";
import React, { useCallback, useEffect, useState } from "react";
import Constants from "expo-constants";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import BecomeSellerToaster from "../../components/BecomeSellerToaster";
import axios from "axios";

const { width } = Dimensions.get("window");

const API_URL = Constants.expoConfig?.extra?.API_URL;
const S3_URL = Constants.expoConfig?.extra?.S3_FETCH_URL;

const getImageUri = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${S3_URL}/${url}`;
};

const BANNERS = [
  {
    id: "1",
    image: require("../../assets/banners/banner1.png"),
    title: "South Canara Agro Mart",
  },
  {
    id: "2",
    image: require("../../assets/banners/banner2.png"),
    title: "Premium Quality",
  },
];

const QUICK_ACTIONS = [
  {
    id: "1",
    icon: "newspaper-outline" as const,
    label: "RFQ",
    route: "/pages/requestQutation",
  },
  {
    id: "2",
    icon: "search-outline" as const,
    label: "Leads",
    route: "/pages/bussinesLeads",
  },
  {
    id: "3",
    icon: "git-network-outline" as const,
    label: "Network",
    route: "/pages/followers",
  },
  {
    id: "4",
    icon: "people-outline" as const,
    label: "Sellers",
    route: "/pages/sellerDirectory",
  },
];

const HomeScreen = () => {
  const [loading, setLoading] = useState(true);
  const [userDetails, setUserDetails] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [showToaster, setShowToaster] = useState(true);
  const [toasterKey, setToasterKey] = useState(0);
  const [sellerStatus, setSellerStatus] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      setShowToaster(true);
      setToasterKey((prev) => prev + 1);
      checkSellerStatus();
    }, [])
  );

  const checkSellerStatus = async () => {
    const status = await AsyncStorage.getItem("sellerStatus");
    setSellerStatus(status);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([getProfile(), fetchCategories(), fetchCompanies(), fetchProducts()]);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getProfile = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (token) {
        const decodedToken: any = jwtDecode(token);
        const res = await axios.get(
          `${API_URL}/get/user/details/${decodedToken?.user_id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setUserDetails(res.data.data.user_details);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await axios.get(`${API_URL}/category/get/complete/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.data?.categories) {
        setCategories(res.data.data.categories);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchCompanies = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await axios.get(`${API_URL}/company/get/approved/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.data?.companies) {
        setCompanies(res.data.data.companies);
      } else if (res.data?.data) {
        const data = res.data.data;
        if (Array.isArray(data)) {
          setCompanies(data);
        }
      }
    } catch (error) {
      console.error("Error fetching companies:", error);
    }
  };

  const fetchProducts = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_URL}/product/get/all`, { headers });
      const productsData = res.data?.data?.products || res.data?.data || [];
      const activeProducts = (Array.isArray(productsData) ? productsData : [])
        .filter((p: any) => p.is_product_active);

      // Fetch images for first 6 products
      const productsWithImages = await Promise.all(
        activeProducts.slice(0, 6).map(async (product: any) => {
          try {
            const imgRes = await axios.get(
              `${API_URL}/product/image/get/${product.product_id}`,
              { headers }
            );
            return { ...product, images: imgRes.data.data?.images || [] };
          } catch {
            return { ...product, images: [] };
          }
        })
      );
      setProducts(productsWithImages);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const getProductImageUrl = (product: any): string | null => {
    if (product.images && product.images.length > 0) {
      const sorted = [...product.images].sort(
        (a: any, b: any) => a.product_image_sequence_number - b.product_image_sequence_number
      );
      return getImageUri(sorted[0].product_image_url);
    }
    return null;
  };

  const handleCategoryPress = (category: any) => {
    router.push({
      pathname: "/pages/specificCategory",
      params: { id: category.category_id, name: category.category_name },
    });
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
      {/* Become Seller Toaster - only show if not approved */}
      {sellerStatus !== "approved" && (
        <BecomeSellerToaster
          key={toasterKey}
          visible={showToaster}
          onClose={() => setShowToaster(false)}
        />
      )}

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.locationContainer}>
          <Ionicons name="person-circle-outline" size={24} color="#FFFFFF" />
          <View style={styles.locationText}>
            <Text style={styles.locationName}>
              {userDetails?.user_name || "Welcome"}
            </Text>
            <Text style={styles.locationAddress}>
              {userDetails?.user_email || ""}
            </Text>
          </View>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="chatbox-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products, categories..."
            placeholderTextColor="#999"
          />
        </View>

        {/* Banner Carousel */}
        <FlatList
          data={BANNERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          pagingEnabled
          decelerationRate="fast"
          snapToInterval={width - 40}
          contentContainerStyle={styles.bannerContainer}
          renderItem={({ item }) => (
            <View style={styles.bannerCard}>
              <Image source={item.image} style={styles.bannerImage} />
            </View>
          )}
          keyExtractor={(item) => item.id}
        />

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={styles.quickActionItem}
              onPress={() => router.push(action.route as any)}
            >
              <View style={styles.quickActionIcon}>
                <Ionicons name={action.icon} size={28} color="#0078D7" />
              </View>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Categories from API */}
        {categories.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Categories</Text>
              <TouchableOpacity onPress={() => router.push("/(tabs)/catgories" as any)}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={categories}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.categoryCard}
                  onPress={() => handleCategoryPress(item)}
                >
                  <Image
                    source={{ uri: getImageUri(item.category_image_url)! }}
                    style={styles.categoryImage}
                  />
                  <Text style={styles.categoryName}>{item.category_name}</Text>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.category_id}
            />
          </View>
        )}

        {/* Products */}
        {products.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Products</Text>
              <TouchableOpacity onPress={() => router.push("/(tabs)/listing" as any)}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={products}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              renderItem={({ item }) => {
                const imageUrl = getProductImageUrl(item);
                return (
                  <TouchableOpacity
                    style={styles.productCard}
                    onPress={() =>
                      router.push({
                        pathname: "/pages/productDetail" as any,
                        params: { product_id: item.product_id },
                      })
                    }
                  >
                    <View style={styles.productImageContainer}>
                      {imageUrl ? (
                        <Image
                          source={{ uri: imageUrl }}
                          style={styles.productImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.productImagePlaceholder}>
                          <Ionicons name="cube-outline" size={28} color="#CCC" />
                        </View>
                      )}
                    </View>
                    <View style={styles.productInfo}>
                      <Text style={styles.productName} numberOfLines={1}>
                        {item.product_name}
                      </Text>
                      <Text style={styles.productPrice} numberOfLines={1}>
                        {item.product_price}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
              keyExtractor={(item) => item.product_id}
            />
          </View>
        )}

        {/* Approved Companies */}
        {companies.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Top Sellers</Text>
              <TouchableOpacity
                onPress={() => router.push("/pages/sellerDirectory" as any)}
              >
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={companies}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.companyCard}
                  onPress={() =>
                    router.push({
                      pathname: "/pages/sellerProfile" as any,
                      params: { company_id: item.company_id },
                    })
                  }
                >
                  <View style={styles.companyImageContainer}>
                    {item.company_profile_url ? (
                      <Image
                        source={{
                          uri: getImageUri(item.company_profile_url)!,
                        }}
                        style={styles.companyImage}
                      />
                    ) : (
                      <View style={styles.companyImagePlaceholder}>
                        <Ionicons
                          name="business"
                          size={32}
                          color="#0078D7"
                        />
                      </View>
                    )}
                  </View>
                  <Text style={styles.companyName} numberOfLines={2}>
                    {item.company_name}
                  </Text>
                  <Text style={styles.companyLocation} numberOfLines={1}>
                    {item.company_city}, {item.company_state}
                  </Text>
                  {item.is_verified && (
                    <View style={styles.verifiedBadge}>
                      <Ionicons
                        name="checkmark-circle"
                        size={12}
                        color="#28A745"
                      />
                      <Text style={styles.verifiedText}>Verified</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.company_id}
            />
          </View>
        )}

        {/* Bottom Spacing for tab bar */}
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  loaderText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  header: {
    backgroundColor: "#1E90FF",
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  locationText: {
    marginLeft: 8,
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  locationAddress: {
    fontSize: 12,
    color: "#FFFFFF",
    opacity: 0.9,
  },
  headerIcons: {
    flexDirection: "row",
    gap: 12,
  },
  iconButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: "#000",
  },
  bannerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  bannerCard: {
    width: width - 40,
    marginRight: 12,
    borderRadius: 12,
    overflow: "hidden",
  },
  bannerImage: {
    width: "100%",
    height: 180,
    borderRadius: 12,
  },
  quickActionsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  quickActionItem: {
    alignItems: "center",
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "#F0F8FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 12,
    color: "#333",
    fontWeight: "500",
  },
  section: {
    marginTop: 20,
    marginBottom: 8,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0078D7",
  },
  horizontalList: {
    paddingHorizontal: 16,
  },
  categoryCard: {
    width: 110,
    marginRight: 12,
    alignItems: "center",
  },
  categoryImage: {
    width: 110,
    height: 80,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: "#F0F0F0",
  },
  categoryName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },
  companyCard: {
    width: 150,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginRight: 12,
    padding: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  companyImageContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 8,
    overflow: "hidden",
  },
  companyImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  companyImagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F0F8FF",
    justifyContent: "center",
    alignItems: "center",
  },
  companyName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
    textAlign: "center",
    marginBottom: 4,
  },
  companyLocation: {
    fontSize: 11,
    color: "#888",
    textAlign: "center",
    marginBottom: 4,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#28A745",
  },
  productCard: {
    width: 150,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginRight: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  productImageContainer: {
    width: "100%",
    height: 110,
    backgroundColor: "#F0F0F0",
  },
  productImage: {
    width: "100%",
    height: 110,
  },
  productImagePlaceholder: {
    width: "100%",
    height: 110,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
  },
  productInfo: {
    padding: 10,
  },
  productName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 13,
    color: "#28A745",
    fontWeight: "600",
  },
});

export default HomeScreen;

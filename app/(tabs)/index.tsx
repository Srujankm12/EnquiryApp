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
const CLOUDFRONT_URL = Constants.expoConfig?.extra?.CLOUDFRONT_URL;

const getImageUri = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const path = url.startsWith('/') ? url : `/${url}`;
  if (CLOUDFRONT_URL) return `${CLOUDFRONT_URL}${path}`;
  return `${S3_URL}${path}`;
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
  const [jwtUserName, setJwtUserName] = useState<string>("");
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
    try {
      const status = await AsyncStorage.getItem("sellerStatus");
      const normalizedStored = status?.toLowerCase()?.trim() || null;

      // If already approved, no need for API calls
      if (normalizedStored === "approved" || normalizedStored === "accepted" || normalizedStored === "active") {
        setSellerStatus("approved");
        return;
      }

      setSellerStatus(normalizedStored);

      // Refresh from API to keep in sync
      const token = await AsyncStorage.getItem("token");
      if (token) {
        const decoded: any = jwtDecode(token);

        // Use business_id from token if available
        let businessId = decoded.business_id;

        if (!businessId) {
          // Fallback: try fetching business by user_id
          try {
            const bizRes = await fetch(`${API_URL}/business/get/user/${decoded.user_id}`, {
              headers: { "Content-Type": "application/json" },
            });
            if (bizRes.ok) {
              const bizData = await bizRes.json();
              businessId = bizData.business_id || bizData.details?.business_id || bizData.id;
            }
          } catch {
            // No business found
          }
        }

        if (businessId) {
          await AsyncStorage.setItem("companyId", businessId);

          // First check business status endpoint (simple check)
          try {
            const statusRes = await fetch(`${API_URL}/business/status/${businessId}`, {
              headers: { "Content-Type": "application/json" },
            });
            if (statusRes.ok) {
              const statusData = await statusRes.json();
              if (
                statusData?.is_approved === true ||
                statusData?.details?.is_approved === true ||
                statusData?.is_business_approved === true ||
                statusData?.details?.is_business_approved === true
              ) {
                await AsyncStorage.setItem("sellerStatus", "approved");
                setSellerStatus("approved");
                return;
              }
            }
          } catch {
            // Status endpoint not available
          }

          // Check application status
          try {
            const appRes = await fetch(`${API_URL}/business/application/get/${businessId}`, {
              headers: { "Content-Type": "application/json" },
            });
            if (appRes.ok) {
              const appData = await appRes.json();
              const appStatus = (
                appData.details?.status ||
                appData.application?.status ||
                appData.status ||
                ""
              ).toLowerCase().trim();

              if (appStatus === "approved" || appStatus === "accepted" || appStatus === "active") {
                await AsyncStorage.setItem("sellerStatus", "approved");
                setSellerStatus("approved");
              } else if (appStatus === "applied" || appStatus === "pending" || appStatus === "under_review") {
                await AsyncStorage.setItem("sellerStatus", "pending");
                setSellerStatus("pending");
              } else if (appStatus === "rejected" || appStatus === "declined") {
                await AsyncStorage.setItem("sellerStatus", "rejected");
                setSellerStatus("rejected");
              } else if (appStatus) {
                await AsyncStorage.setItem("sellerStatus", appStatus);
                setSellerStatus(appStatus);
              }
            }
          } catch {
            // Check if business itself is approved
            try {
              const bizDetailRes = await fetch(`${API_URL}/business/get/${businessId}`, {
                headers: { "Content-Type": "application/json" },
              });
              if (bizDetailRes.ok) {
                const bizDetail = await bizDetailRes.json();
                const biz = bizDetail.details || bizDetail.business;
                if (biz?.is_business_approved || biz?.is_approved) {
                  await AsyncStorage.setItem("sellerStatus", "approved");
                  setSellerStatus("approved");
                }
              }
            } catch {
              // Business not accessible
            }
          }
        }
      }
    } catch (error) {
      console.error("Error checking seller status:", error);
    }
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
        // Show name from JWT immediately without waiting for API
        if (decodedToken.user_name) {
          setJwtUserName(decodedToken.user_name);
        }
        try {
          const res = await axios.get(
            `${API_URL}/user/get/user/${decodedToken?.user_id}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          // Backend returns: { message: "...", user: { id, first_name, last_name, email, phone, profile_image, ... } }
          const details = res.data?.user || res.data;
          setUserDetails(details);
        } catch {
          // API error - rely on token data
        }
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await axios.get(`${API_URL}/category/get/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.categories) {
        setCategories(res.data.categories);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchCompanies = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      // Normalize company fields from any API response
      const normalizeCompany = (c: any) => ({
        company_id: c.company_id || c.id || c.business_id,
        company_name: c.company_name || c.name || c.business_name || "",
        company_profile_url: c.company_profile_url || c.profile_image || null,
        company_city: c.company_city || c.city || "",
        company_state: c.company_state || c.state || "",
        company_phone: c.company_phone || c.phone || "",
        company_email: c.company_email || c.email || "",
        is_verified: c.is_verified || c.is_business_verified || false,
        is_approved: c.is_approved !== undefined ? c.is_approved : (c.is_business_approved !== false),
        name: c.company_name || c.name || c.business_name || "",
      });

      // Try fetching approved companies
      let fetchedCompanies: any[] = [];
      try {
        const res = await axios.get(`${API_URL}/company/get/approved/all`, { headers });
        let raw: any[] = [];
        if (res.data?.data?.companies) {
          raw = res.data.data.companies;
        } else if (res.data?.data && Array.isArray(res.data.data)) {
          raw = res.data.data;
        }
        fetchedCompanies = raw.map(normalizeCompany);
      } catch {}

      // Fallback: try all companies and filter approved
      if (fetchedCompanies.length === 0) {
        try {
          const res = await axios.get(`${API_URL}/company/get/all`, { headers });
          const data = res.data?.data?.companies || res.data?.data || [];
          fetchedCompanies = (Array.isArray(data) ? data : [])
            .filter((c: any) => c.is_approved)
            .map(normalizeCompany);
        } catch {}
      }

      // Fallback: try business endpoint
      if (fetchedCompanies.length === 0) {
        try {
          const res = await axios.get(`${API_URL}/business/get/all`, { headers });
          const data = res.data?.data?.businesses || res.data?.businesses || res.data?.data || [];
          fetchedCompanies = (Array.isArray(data) ? data : []).map((b: any) => ({
            company_id: b.id || b.business_id,
            company_name: b.name || b.business_name,
            company_profile_url: b.profile_image,
            company_city: b.city,
            company_state: b.state,
            company_phone: b.phone,
            company_email: b.email,
            is_verified: b.is_business_verified,
            is_approved: b.is_business_approved,
          }));
        } catch {}
      }

      setCompanies(fetchedCompanies);
    } catch (error) {
      console.error("Error fetching companies:", error);
    }
  };

  const fetchProducts = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;
      const headers = { Authorization: `Bearer ${token}` };
      const decoded: any = jwtDecode(token);
      const userId = decoded.user_id;

      // Get list of companies the user follows
      let followedCompanyIds: string[] = [];
      try {
        const followingRes = await axios.get(
          `${API_URL}/company/followers/get/user/${userId}`,
          { headers }
        );
        const companies = followingRes.data?.data?.companies || followingRes.data?.data || [];
        followedCompanyIds = (Array.isArray(companies) ? companies : []).map(
          (c: any) => c.company_id
        );
      } catch {
        followedCompanyIds = [];
      }

      if (followedCompanyIds.length === 0) {
        setProducts([]);
        return;
      }

      // Fetch products from each followed company
      let allProducts: any[] = [];
      await Promise.all(
        followedCompanyIds.map(async (companyId: string) => {
          try {
            const res = await axios.get(
              `${API_URL}/product/get/company/${companyId}`,
              { headers }
            );
            const productsData = res.data?.data?.products || res.data?.data || [];
            const active = (Array.isArray(productsData) ? productsData : []).filter(
              (p: any) => p.is_product_active
            );
            allProducts = [...allProducts, ...active];
          } catch {
            // Company may have no products
          }
        })
      );

      // Fetch images for first 6 products
      const productsWithImages = await Promise.all(
        allProducts.slice(0, 6).map(async (product: any) => {
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
      params: { id: category.id, name: category.name },
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
      {sellerStatus !== "approved" && sellerStatus !== "accepted" && sellerStatus !== "active" && (
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
              {jwtUserName || (userDetails?.first_name ? `${userDetails.first_name}${userDetails.last_name ? ' ' + userDetails.last_name : ''}` : "Welcome")}
            </Text>
            <Text style={styles.locationAddress}>
              {userDetails?.email || ""}
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
                  {item.category_image ? (
                    <Image
                      source={{ uri: getImageUri(item.category_image)! }}
                      style={styles.categoryImage}
                    />
                  ) : (
                    <View style={[styles.categoryImage, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#EBF5FF' }]}>
                      <Ionicons name="leaf-outline" size={24} color="#0078D7" />
                    </View>
                  )}
                  <Text style={styles.categoryName}>{item.name}</Text>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.id}
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

        {/* All Sellers / Top Sellers */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Top Sellers</Text>
            <TouchableOpacity
              onPress={() => router.push("/pages/sellerDirectory" as any)}
            >
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          {companies.length > 0 ? (
            <FlatList
              data={companies}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              renderItem={({ item }) => {
                const logoUri = getImageUri(item.company_profile_url);
                const displayName = item.company_name || item.name || "Business";
                return (
                  <TouchableOpacity
                    style={styles.companyCard}
                    onPress={() =>
                      router.push({
                        pathname: "/pages/bussinesProfile" as any,
                        params: { business_id: item.company_id },
                      })
                    }
                  >
                    <View style={styles.companyImageContainer}>
                      {logoUri ? (
                        <Image
                          source={{ uri: `${logoUri}?t=${Date.now()}` }}
                          style={styles.companyImage}
                          resizeMode="cover"
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
                      {displayName}
                    </Text>
                    <Text style={styles.companyLocation} numberOfLines={1}>
                      {item.company_city}, {item.company_state}
                    </Text>
                    {item.is_verified ? (
                      <View style={styles.verifiedBadge}>
                        <Ionicons
                          name="checkmark-circle"
                          size={12}
                          color="#28A745"
                        />
                        <Text style={styles.verifiedText}>Verified</Text>
                      </View>
                    ) : (
                      <View style={styles.notVerifiedBadge}>
                        <Ionicons
                          name="alert-circle"
                          size={12}
                          color="#DC3545"
                        />
                        <Text style={styles.notVerifiedText}>Not Verified</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
              keyExtractor={(item) => item.company_id}
            />
          ) : (
            <View style={{ paddingVertical: 30, alignItems: "center" }}>
              <Ionicons name="people-outline" size={40} color="#CCC" />
              <Text style={{ color: "#999", marginTop: 8, fontSize: 14 }}>
                No sellers available
              </Text>
            </View>
          )}
        </View>

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
  notVerifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF5F5",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FFDDDD",
  },
  notVerifiedText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#DC3545",
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

import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import { jwtDecode } from "jwt-decode";
import React, { useCallback, useEffect, useState } from "react";
import Constants from "expo-constants";
import axios from "axios";
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

const { width } = Dimensions.get("window");

const API_URL = Constants.expoConfig?.extra?.API_URL;
const S3_URL = Constants.expoConfig?.extra?.S3_FETCH_URL;

const getImageUri = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${S3_URL}/${url}`;
};

const SellerHomeScreen = () => {
  const [loading, setLoading] = useState(true);
  const [userDetails, setUserDetails] = useState<any>(null);
  const [companyDetails, setCompanyDetails] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [ratingInfo, setRatingInfo] = useState<any>(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [myProducts, setMyProducts] = useState<any[]>([]);

  useEffect(() => {
    loadSellerData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSellerData();
    }, [])
  );

  const loadSellerData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        router.replace("/pages/loginMail");
        return;
      }

      const decoded: any = jwtDecode(token);
      const userId = decoded.user_id;

      await Promise.all([
        fetchUserProfile(userId, token),
        fetchCompanyDetails(userId, token),
        fetchCategories(token),
      ]);
    } catch (error) {
      console.error("Error loading seller data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async (userId: string, token: string) => {
    try {
      const res = await axios.get(
        `${API_URL}/get/user/details/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUserDetails(res.data.data.user_details);
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  const fetchCompanyDetails = async (userId: string, token: string) => {
    try {
      const companyRes = await axios.get(
        `${API_URL}/company/get/user/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const companyData =
        companyRes.data.data?.company || companyRes.data.data;
      const companyId = companyData?.company_id;

      if (!companyId) return;

      // Fetch complete company details
      const completeRes = await axios.get(
        `${API_URL}/company/get/complete/${companyId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const details = completeRes.data.data?.company_details;
      if (details) {
        setCompanyDetails(details.company);
        setRatingInfo(details.rating_info);
        setFollowerCount(details.follower_count || 0);
      }

      // Fetch seller's own products by company_id
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const prodRes = await axios.get(
          `${API_URL}/product/get/company/${companyId}`,
          { headers }
        );
        const productsData = prodRes.data?.data?.products || prodRes.data?.data || [];
        const productsList = Array.isArray(productsData) ? productsData : [];

        // Fetch images for products
        const productsWithImages = await Promise.all(
          productsList.slice(0, 6).map(async (product: any) => {
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
        setMyProducts(productsWithImages);
      } catch {
        setMyProducts([]);
      }
    } catch (error) {
      console.error("Error fetching company details:", error);
    }
  };

  const fetchCategories = async (token: string) => {
    try {
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
        <Text style={styles.loaderText}>Loading seller dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.locationContainer}>
          <Ionicons name="storefront" size={24} color="#FFFFFF" />
          <View style={styles.locationText}>
            <Text style={styles.locationName}>
              {companyDetails?.company_name || userDetails?.user_name || "Seller Dashboard"}
            </Text>
            <Text style={styles.locationAddress}>
              {companyDetails
                ? `${companyDetails.company_city}, ${companyDetails.company_state}`
                : "Seller Dashboard"}
            </Text>
          </View>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Company Overview Card */}
        {companyDetails && (
          <View style={styles.companyOverviewCard}>
            <View style={styles.companyOverviewHeader}>
              <View style={styles.companyLogoContainer}>
                {companyDetails.company_profile_url ? (
                  <Image
                    source={{
                      uri: getImageUri(companyDetails.company_profile_url)!,
                    }}
                    style={styles.companyLogo}
                  />
                ) : (
                  <View style={styles.companyLogoPlaceholder}>
                    <Ionicons name="business" size={32} color="#0078D7" />
                  </View>
                )}
              </View>
              <View style={styles.companyOverviewInfo}>
                <Text style={styles.companyOverviewName}>
                  {companyDetails.company_name}
                </Text>
                <Text style={styles.companyOverviewEmail}>
                  {companyDetails.company_email}
                </Text>
                <View style={styles.badgesRow}>
                  {companyDetails.is_verified && (
                    <View style={[styles.statusBadge, styles.verifiedBadge]}>
                      <Ionicons name="checkmark-circle" size={12} color="#28A745" />
                      <Text style={styles.verifiedBadgeText}>Verified</Text>
                    </View>
                  )}
                  {companyDetails.is_approved && (
                    <View style={[styles.statusBadge, styles.approvedBadge]}>
                      <Ionicons name="shield-checkmark" size={12} color="#0078D7" />
                      <Text style={styles.approvedBadgeText}>Approved</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{followerCount}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {ratingInfo?.average_rating
                    ? ratingInfo.average_rating.toFixed(1)
                    : "N/A"}
                </Text>
                <Text style={styles.statLabel}>Rating</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {ratingInfo?.total_ratings || 0}
                </Text>
                <Text style={styles.statLabel}>Reviews</Text>
              </View>
            </View>
          </View>
        )}

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search your products..."
            placeholderTextColor="#999"
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity
            style={styles.quickActionItem}
            onPress={() => router.push("/pages/addProduct" as any)}
          >
            <View style={styles.quickActionIcon}>
              <Ionicons name="add-circle" size={28} color="#0078D7" />
            </View>
            <Text style={styles.quickActionLabel}>Add Product</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionItem}
            onPress={() => router.push("/pages/myProducts" as any)}
          >
            <View style={styles.quickActionIcon}>
              <Ionicons name="cube" size={28} color="#0078D7" />
            </View>
            <Text style={styles.quickActionLabel}>My Products</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionItem}
            onPress={() => router.push("/pages/followers" as any)}
          >
            <View style={styles.quickActionIcon}>
              <Ionicons name="people" size={28} color="#0078D7" />
            </View>
            <Text style={styles.quickActionLabel}>Followers</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionItem}
            onPress={() => router.push("/pages/bussinesLeads" as any)}
          >
            <View style={styles.quickActionIcon}>
              <Ionicons name="trending-up" size={28} color="#0078D7" />
            </View>
            <Text style={styles.quickActionLabel}>Leads</Text>
          </TouchableOpacity>
        </View>

        {/* My Products */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Products</Text>
            {myProducts.length > 0 && (
              <TouchableOpacity onPress={() => router.push("/pages/myProducts" as any)}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            )}
          </View>
          {myProducts.length > 0 ? (
            <FlatList
              data={myProducts}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              renderItem={({ item }) => {
                const imageUrl =
                  item.images && item.images.length > 0
                    ? getImageUri(
                        [...item.images].sort(
                          (a: any, b: any) =>
                            a.product_image_sequence_number - b.product_image_sequence_number
                        )[0].product_image_url
                      )
                    : null;
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
                    {imageUrl ? (
                      <Image source={{ uri: imageUrl }} style={styles.productImage} />
                    ) : (
                      <View style={[styles.productImage, styles.productImagePlaceholder]}>
                        <Ionicons name="cube-outline" size={28} color="#CCC" />
                      </View>
                    )}
                    <View style={styles.productInfo}>
                      <Text style={styles.productName} numberOfLines={1}>
                        {item.product_name}
                      </Text>
                      <Text style={styles.productPrice} numberOfLines={1}>
                        {item.product_price}
                      </Text>
                      <View
                        style={[
                          styles.productStatusBadge,
                          {
                            backgroundColor: item.is_product_active
                              ? "#E8F5E9"
                              : "#FFF3E0",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.productStatusText,
                            {
                              color: item.is_product_active ? "#28A745" : "#FF9800",
                            },
                          ]}
                        >
                          {item.is_product_active ? "Active" : "Inactive"}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }}
              keyExtractor={(item) => item.product_id}
            />
          ) : (
            <View style={styles.emptyProductsContainer}>
              <Ionicons name="cube-outline" size={40} color="#CCC" />
              <Text style={styles.emptyProductsText}>No products yet</Text>
              <TouchableOpacity
                style={styles.addProductButton}
                onPress={() => router.push("/pages/addProduct" as any)}
              >
                <Ionicons name="add" size={16} color="#FFFFFF" />
                <Text style={styles.addProductButtonText}>Add Product</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Categories */}
        {categories.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Categories</Text>
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
  companyOverviewCard: {
    backgroundColor: "#FFFFFF",
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  companyOverviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  companyLogoContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: "hidden",
    marginRight: 12,
  },
  companyLogo: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  companyLogoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#F0F8FF",
    justifyContent: "center",
    alignItems: "center",
  },
  companyOverviewInfo: {
    flex: 1,
  },
  companyOverviewName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 2,
  },
  companyOverviewEmail: {
    fontSize: 12,
    color: "#888",
    marginBottom: 6,
  },
  badgesRow: {
    flexDirection: "row",
    gap: 8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  verifiedBadge: {
    backgroundColor: "#E8F5E9",
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#28A745",
  },
  approvedBadge: {
    backgroundColor: "#E3F2FD",
  },
  approvedBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#0078D7",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingTop: 12,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0078D7",
  },
  statLabel: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#F0F0F0",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
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
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0078D7",
  },
  productCard: {
    width: 150,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginRight: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    overflow: "hidden",
  },
  productImage: {
    width: 150,
    height: 100,
    backgroundColor: "#F0F0F0",
  },
  productImagePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
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
    fontWeight: "600",
    color: "#28A745",
    marginBottom: 6,
  },
  productStatusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  productStatusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  emptyProductsContainer: {
    alignItems: "center",
    paddingVertical: 30,
    marginHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
  },
  emptyProductsText: {
    fontSize: 15,
    color: "#999",
    marginTop: 8,
    marginBottom: 12,
  },
  addProductButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0078D7",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  addProductButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
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
});

export default SellerHomeScreen;

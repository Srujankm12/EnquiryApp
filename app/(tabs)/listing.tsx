import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState, useCallback } from "react";
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
  RefreshControl,
  StatusBar,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import Constants from "expo-constants";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";

const { width } = Dimensions.get("window");

const API_URL = Constants.expoConfig?.extra?.API_URL;
const S3_URL = Constants.expoConfig?.extra?.S3_FETCH_URL;
const CLOUDFRONT_URL = Constants.expoConfig?.extra?.CLOUDFRONT_URL;

const getImageUri = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const path = url.startsWith("/") ? url : `/${url}`;
  if (CLOUDFRONT_URL) return `${CLOUDFRONT_URL}${path}`;
  return `${S3_URL}${path}`;
};

interface Category {
  id: string;
  name: string;
  category_image: string | null;
  description: string;
}

interface Company {
  company_id: string;
  user_id: string;
  company_name: string;
  company_email: string;
  company_phone: string;
  company_profile_url: string | null;
  company_address: string;
  company_city: string;
  company_state: string;
  is_approved: boolean;
  is_verified: boolean;
}

const SellerTab: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Seller-specific state
  const [sellerStatus, setSellerStatus] = useState<string | null>(null);
  const [companyDetails, setCompanyDetails] = useState<any>(null);
  const [myProducts, setMyProducts] = useState<any[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [ratingInfo, setRatingInfo] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await AsyncStorage.getItem("token");
      if (!token) return;
      const headers = { Authorization: `Bearer ${token}` };
      const decoded: any = jwtDecode(token);
      const userId = decoded.user_id;

      // Check seller status
      let status = await AsyncStorage.getItem("sellerStatus");
      const normalizedStatus = status?.toLowerCase()?.trim() || null;
      const isApproved =
        normalizedStatus === "approved" ||
        normalizedStatus === "accepted" ||
        normalizedStatus === "active";
      setSellerStatus(isApproved ? "approved" : normalizedStatus);

      // Fetch categories and companies in parallel
      const [catRes, companyRes] = await Promise.allSettled([
        axios.get(`${API_URL}/category/get/all`, { headers }),
        axios.get(`${API_URL}/company/get/approved/all`, { headers }),
      ]);

      if (catRes.status === "fulfilled") {
        setCategories(catRes.value.data?.categories || []);
      }

      if (companyRes.status === "fulfilled") {
        const compData =
          companyRes.value.data?.data?.companies ||
          companyRes.value.data?.data ||
          companyRes.value.data?.companies ||
          [];
        setCompanies(Array.isArray(compData) ? compData : []);
      }

      // If user is an approved seller, fetch their company details and products
      if (isApproved) {
        try {
          const companyRes = await axios.get(
            `${API_URL}/company/get/user/${userId}`,
            { headers }
          );
          const companyData =
            companyRes.data.data?.company || companyRes.data.data;
          const companyId = companyData?.company_id;

          if (companyId) {
            // Fetch complete company details
            try {
              const completeRes = await axios.get(
                `${API_URL}/company/get/complete/${companyId}`,
                { headers }
              );
              const details = completeRes.data.data?.company_details;
              if (details) {
                setCompanyDetails(details.company);
                setRatingInfo(details.rating_info);
                setFollowerCount(details.follower_count || 0);
              }
            } catch {
              setCompanyDetails(companyData);
            }

            // Fetch seller's own products
            try {
              const prodRes = await axios.get(
                `${API_URL}/product/get/company/${companyId}`,
                { headers }
              );
              const productsData =
                prodRes.data?.data?.products || prodRes.data?.data || [];
              const productsList = Array.isArray(productsData)
                ? productsData
                : [];

              const productsWithImages = await Promise.all(
                productsList.slice(0, 6).map(async (product: any) => {
                  try {
                    const imgRes = await axios.get(
                      `${API_URL}/product/image/get/${product.product_id}`,
                      { headers }
                    );
                    return {
                      ...product,
                      images: imgRes.data.data?.images || [],
                    };
                  } catch {
                    return { ...product, images: [] };
                  }
                })
              );
              setMyProducts(productsWithImages);
            } catch {
              setMyProducts([]);
            }
          }
        } catch {
          // Company not found
        }
      }
    } catch (err: any) {
      console.error("Error loading data:", err);
      setError("Unable to load data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const handleCategoryPress = (category: Category) => {
    router.push({
      pathname: "/pages/specificCategory" as any,
      params: { id: category.id, name: category.name },
    });
  };

  const handleCompanyPress = (company: Company) => {
    router.push({
      pathname: "/pages/sellerProfile" as any,
      params: { business_id: company.company_id },
    });
  };

  const handleViewAllSellers = () => {
    router.push("/pages/sellerDirectory" as any);
  };

  const getProductImageUrl = (product: any): string | null => {
    if (product.images && product.images.length > 0) {
      const sorted = [...product.images].sort(
        (a: any, b: any) =>
          a.product_image_sequence_number - b.product_image_sequence_number
      );
      return getImageUri(sorted[0].product_image_url);
    }
    return null;
  };

  const filteredCompanies = companies.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.company_name?.toLowerCase().includes(q) ||
      c.company_city?.toLowerCase().includes(q)
    );
  });

  const isApproved = sellerStatus === "approved";

  const renderCategoryItem = ({ item }: { item: Category }) => (
    <TouchableOpacity
      style={styles.categoryChip}
      onPress={() => handleCategoryPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.categoryChipIcon}>
        {item.category_image ? (
          <Image
            source={{ uri: getImageUri(item.category_image)! }}
            style={styles.categoryChipImage}
          />
        ) : (
          <Ionicons name="leaf-outline" size={18} color="#1E90FF" />
        )}
      </View>
      <Text style={styles.categoryChipText} numberOfLines={1}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderCompanyCard = (company: Company) => (
    <TouchableOpacity
      key={company.company_id}
      style={styles.companyCard}
      onPress={() => handleCompanyPress(company)}
      activeOpacity={0.7}
    >
      <View style={styles.companyImageContainer}>
        {company.company_profile_url ? (
          <Image
            source={{ uri: getImageUri(company.company_profile_url)! }}
            style={styles.companyImage}
          />
        ) : (
          <View style={styles.companyImagePlaceholder}>
            <Ionicons name="business-outline" size={24} color="#1E90FF" />
          </View>
        )}
      </View>
      <View style={styles.companyInfo}>
        <Text style={styles.companyName} numberOfLines={1}>
          {company.company_name}
        </Text>
        <View style={styles.companyLocationRow}>
          <Ionicons name="location-outline" size={12} color="#888" />
          <Text style={styles.companyLocation} numberOfLines={1}>
            {company.company_city}
            {company.company_state ? `, ${company.company_state}` : ""}
          </Text>
        </View>
        {company.is_verified && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={12} color="#28A745" />
            <Text style={styles.verifiedText}>Verified</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E90FF" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {isApproved ? "My Business" : "Sellers"}
        </Text>
        {isApproved && companyDetails && (
          <TouchableOpacity
            onPress={() => router.push("/pages/sellerDirectory" as any)}
            style={styles.headerBadge}
          >
            <Text style={styles.headerBadgeText}>Browse Sellers</Text>
          </TouchableOpacity>
        )}
        {!isApproved && companies.length > 0 && (
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{companies.length}</Text>
          </View>
        )}
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder={
              isApproved
                ? "Search your products..."
                : "Search sellers, locations..."
            }
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#1E90FF" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : error ? (
        <View style={styles.loaderContainer}>
          <Ionicons name="cloud-offline-outline" size={64} color="#CCC" />
          <Text style={styles.errorTitle}>Connection Error</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Ionicons name="refresh" size={18} color="#FFFFFF" />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#1E90FF"]}
            />
          }
        >
          {/* === SELLER VIEW (Approved Sellers) === */}
          {isApproved && (
            <>
              {/* Company Overview Card */}
              {companyDetails && (
                <View style={styles.companyOverviewCard}>
                  <View style={styles.companyOverviewHeader}>
                    <View style={styles.companyLogoContainer}>
                      {companyDetails.company_profile_url ? (
                        <Image
                          source={{
                            uri: getImageUri(
                              companyDetails.company_profile_url
                            )!,
                          }}
                          style={styles.companyLogo}
                        />
                      ) : (
                        <View style={styles.companyLogoPlaceholder}>
                          <Ionicons
                            name="business"
                            size={32}
                            color="#0078D7"
                          />
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
                          <View
                            style={[
                              styles.statusBadge,
                              styles.verifiedStatusBadge,
                            ]}
                          >
                            <Ionicons
                              name="checkmark-circle"
                              size={12}
                              color="#28A745"
                            />
                            <Text style={styles.verifiedBadgeText}>
                              Verified
                            </Text>
                          </View>
                        )}
                        {companyDetails.is_approved && (
                          <View
                            style={[
                              styles.statusBadge,
                              styles.approvedBadge,
                            ]}
                          >
                            <Ionicons
                              name="shield-checkmark"
                              size={12}
                              color="#0078D7"
                            />
                            <Text style={styles.approvedBadgeText}>
                              Approved
                            </Text>
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

              {/* Quick Actions for Seller */}
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

              {/* My Products Section */}
              <View style={styles.sellerSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>My Products</Text>
                  {myProducts.length > 0 && (
                    <TouchableOpacity
                      onPress={() =>
                        router.push("/pages/myProducts" as any)
                      }
                    >
                      <Text style={styles.seeAllText}>See All</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {myProducts.length > 0 ? (
                  <FlatList
                    data={myProducts.filter((p) => {
                      if (!searchQuery) return true;
                      return p.product_name
                        ?.toLowerCase()
                        .includes(searchQuery.toLowerCase());
                    })}
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
                          {imageUrl ? (
                            <Image
                              source={{ uri: imageUrl }}
                              style={styles.productImage}
                            />
                          ) : (
                            <View
                              style={[
                                styles.productImage,
                                styles.productImagePlaceholder,
                              ]}
                            >
                              <Ionicons
                                name="cube-outline"
                                size={28}
                                color="#CCC"
                              />
                            </View>
                          )}
                          <View style={styles.productInfo}>
                            <Text
                              style={styles.productName}
                              numberOfLines={1}
                            >
                              {item.product_name}
                            </Text>
                            <Text
                              style={styles.productPrice}
                              numberOfLines={1}
                            >
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
                                    color: item.is_product_active
                                      ? "#28A745"
                                      : "#FF9800",
                                  },
                                ]}
                              >
                                {item.is_product_active
                                  ? "Active"
                                  : "Inactive"}
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
                    <Text style={styles.emptyProductsText}>
                      No products yet
                    </Text>
                    <TouchableOpacity
                      style={styles.addProductButton}
                      onPress={() =>
                        router.push("/pages/addProduct" as any)
                      }
                    >
                      <Ionicons name="add" size={16} color="#FFFFFF" />
                      <Text style={styles.addProductButtonText}>
                        Add Product
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </>
          )}

          {/* === BUYER/BROWSE VIEW (Non-sellers or below seller content) === */}

          {/* Categories Row */}
          {categories.length > 0 && (
            <View style={styles.categoriesSection}>
              <Text style={styles.sectionTitle}>Browse by Category</Text>
              <FlatList
                data={categories}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                renderItem={renderCategoryItem}
                contentContainerStyle={styles.categoriesRow}
              />
            </View>
          )}

          {/* View All Sellers */}
          <TouchableOpacity
            style={styles.viewAllBanner}
            onPress={handleViewAllSellers}
            activeOpacity={0.7}
          >
            <View style={styles.viewAllIcon}>
              <Ionicons name="people" size={22} color="#1E90FF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.viewAllTitle}>Seller Directory</Text>
              <Text style={styles.viewAllSubtitle}>
                Browse all sellers, filter & follow
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#1E90FF" />
          </TouchableOpacity>

          {/* All Companies / Top Sellers */}
          <View style={styles.sellersSection}>
            <Text style={styles.sectionTitle}>
              {isApproved ? "All Sellers" : "Top Sellers"}
            </Text>
            {filteredCompanies.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons
                  name="storefront-outline"
                  size={48}
                  color="#CCC"
                />
                <Text style={styles.emptyTitle}>
                  {searchQuery ? "No sellers found" : "No sellers yet"}
                </Text>
                <Text style={styles.emptySubtext}>
                  {searchQuery
                    ? "Try a different search term"
                    : "Sellers will appear here once approved"}
                </Text>
              </View>
            ) : (
              <View style={styles.sellersGrid}>
                {filteredCompanies
                  .slice(0, 10)
                  .map((company) => renderCompanyCard(company))}
              </View>
            )}
          </View>

          {/* Become Seller prompt for non-sellers */}
          {!isApproved && (
            <TouchableOpacity
              style={styles.becomeSellerBanner}
              onPress={() =>
                router.push("/pages/becomeSellerForm" as any)
              }
              activeOpacity={0.7}
            >
              <View style={styles.becomeSellerIcon}>
                <Ionicons name="storefront" size={24} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.becomeSellerTitle}>Become a Seller</Text>
                <Text style={styles.becomeSellerSubtitle}>
                  Register your business and start selling
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    backgroundColor: "#1E90FF",
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  headerBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  headerBadgeText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  searchWrapper: {
    backgroundColor: "#1E90FF",
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  searchContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: "#333",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#666",
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 8,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: "#1E90FF",
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  // Company Overview (Seller)
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
  verifiedStatusBadge: {
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
  // Quick Actions
  quickActionsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 12,
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
  // Seller Section
  sellerSection: {
    marginTop: 8,
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
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
  // Categories
  categoriesSection: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  categoriesRow: {
    paddingHorizontal: 16,
    gap: 10,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  categoryChipIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#EBF5FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    overflow: "hidden",
  },
  categoryChipImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    maxWidth: 100,
  },
  // View All Banner
  viewAllBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  viewAllIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#EBF5FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  viewAllTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  viewAllSubtitle: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  // Sellers Grid
  sellersSection: {
    paddingTop: 16,
  },
  sellersGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    justifyContent: "space-between",
  },
  companyCard: {
    width: (width - 36) / 2,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  companyImageContainer: {
    width: "100%",
    height: 100,
    backgroundColor: "#F0F4F8",
  },
  companyImage: {
    width: "100%",
    height: 100,
    resizeMode: "cover",
  },
  companyImagePlaceholder: {
    width: "100%",
    height: 100,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#EBF5FF",
  },
  companyInfo: {
    padding: 10,
  },
  companyName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  companyLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginBottom: 4,
  },
  companyLocation: {
    fontSize: 12,
    color: "#888",
    flex: 1,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  verifiedText: {
    fontSize: 11,
    color: "#28A745",
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: "#999",
    marginTop: 6,
    textAlign: "center",
  },
  // Become Seller Banner
  becomeSellerBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0078D7",
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
  },
  becomeSellerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  becomeSellerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  becomeSellerSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
});

export default SellerTab;

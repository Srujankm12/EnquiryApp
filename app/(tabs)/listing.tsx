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
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

const ListingsScreen: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await AsyncStorage.getItem("token");
      if (!token) return;
      const headers = { Authorization: `Bearer ${token}` };

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

  const filteredCompanies = companies.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.company_name?.toLowerCase().includes(q) ||
      c.company_city?.toLowerCase().includes(q)
    );
  });

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
        <Text style={styles.headerTitle}>Sellers</Text>
        {companies.length > 0 && (
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
            placeholder="Search sellers, locations..."
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
          <Text style={styles.loadingText}>Loading sellers...</Text>
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

          {/* Top Sellers */}
          <View style={styles.sellersSection}>
            <Text style={styles.sectionTitle}>Top Sellers</Text>
            {filteredCompanies.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="storefront-outline" size={48} color="#CCC" />
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
});

export default ListingsScreen;

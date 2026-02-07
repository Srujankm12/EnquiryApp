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

const DUMMY_DATA = {
  location: {
    name: "Prajwal Andanur",
    address: "Mumbai, Maharashtra",
  },
  banners: [
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
  ],
  quickActions: [
    {
      id: "1",
      icon: "newspaper-outline",
      label: "RFQ",
      route: "/pages/requestQutation",
    },
    {
      id: "2",
      icon: "search-outline",
      label: "Leads",
      route: "/pages/bussinesLeads",
    },
    {
      id: "3",
      icon: "git-network-outline",
      label: "Network",
      route: "/pages/followers",
    },
    {
      id: "4",
      icon: "people-outline",
      label: "Sellers",
      route: "/pages/sellerDirectory",
    },
  ],
  categories: [
    {
      id: "1",
      name: "Cashew",
      image: require("../../assets/categories/cashew.png"),
    },
    {
      id: "2",
      name: "Almond",
      image: require("../../assets/categories/almond.png"),
    },
    {
      id: "3",
      name: "Anjeera",
      image: require("../../assets/categories/anjeers.png"),
    },
    {
      id: "4",
      name: "Hazelnut",
      image: require("../../assets/categories/hazelnut.png"),
    },
    {
      id: "5",
      name: "Dates",
      image: require("../../assets/categories/dates.png"),
    },
    {
      id: "6",
      name: "Raisins",
      image: require("../../assets/categories/raisins.png"),
    },
    {
      id: "7",
      name: "Walnut",
      image: require("../../assets/categories/wallnut.png"),
    },
    {
      id: "8",
      name: "Pista",
      image: require("../../assets/categories/pista.png"),
    },
  ],
  featuredProducts: [
    {
      id: "1",
      name: "Cashew W-180",
      image: require("../../assets/featured/featured1.png"),
      quantity: "160KG",
      pricePerUnit: "200rs",
    },
    {
      id: "2",
      name: "Almond Local",
      image: require("../../assets/featured/featured2.png"),
      quantity: "10KG",
      pricePerUnit: "100rs",
    },
  ],
  productOfFollowers: [
    {
      id: "1",
      name: "Pista A1",
      image: require("../../assets/categories/pista.png"),
      quantity: "20KG",
      pricePerUnit: "500rs",
    },
    {
      id: "2",
      name: "Arabian Dates",
      image: require("../../assets/categories/dates.png"),
      quantity: "200KG",
      pricePerUnit: "128rs",
    },
  ],
  productsOnCashew: [
    {
      id: "1",
      name: "Cashew 2 Piece",
      image: require("../../assets/cashews/2piece.png"),
      quantity: "50KG",
      pricePerUnit: "1000rs",
    },
    {
      id: "2",
      name: "Cashew 4 Piece",
      image: require("../../assets/cashews/4piece.png"),
      quantity: "100KG",
      pricePerUnit: "800rs",
    },
  ],
  productsOnAlmond: [
    {
      id: "1",
      name: "Almond A1",
      image: require("../../assets/featured/featured2.png"),
      quantity: "100KG",
      pricePerUnit: "2000rs",
    },
    {
      id: "2",
      name: "Almond Local",
      image: require("../../assets/categories/almond.png"),
      quantity: "10KG",
      pricePerUnit: "100rs",
    },
  ],
  productsOnDates: [
    {
      id: "1",
      name: "Dates Local",
      image: require("../../assets/categories/dates.png"),
      quantity: "200KG",
      pricePerUnit: "100rs",
    },
    {
      id: "2",
      name: "Rabbi Dates",
      image: require("../../assets/dates/dates1.png"),
      quantity: "20KG",
      pricePerUnit: "150rs",
    },
  ],
};

const API_URL = Constants.expoConfig?.extra?.API_URL;


const HomeScreen = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [userDetails, setUserDetails] = useState<any>(null);
  const [showToaster, setShowToaster] = useState(true);
  const [toasterKey, setToasterKey] = useState(0);

  // Simulate API call
  useEffect(() => {
    fetchData();
    getprofile();
  }, []);

  // Reset toaster when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      setShowToaster(true);
      setToasterKey((prev) => prev + 1); // Force re-render of toaster
    }, [])
  );

  const getprofile = async () => {
    const token = await AsyncStorage.getItem("token");
    if (token) {
      const decodedToken:any = jwtDecode(token);
      console.log(decodedToken,"decodedToken");
      const res:any = await axios.get(`${API_URL}/get/user/details/${decodedToken?.user_id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      console.log(res.data,"res.data.data");
      setUserDetails(res.data.data.user_details);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // In real app, replace with:
      // const response = await fetch('YOUR_API_URL/home');
      // const data = await response.json();

      // setData(DUMMY_DATA);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#0078D7" />
        <Text style={styles.loaderText}>Loading...</Text>
      </View>
    );
  }
  console.log(userDetails,"userDetails");

  return (
    <View style={styles.container}>
      {/* Become Seller Toaster */}
      <BecomeSellerToaster
        key={toasterKey}
        visible={showToaster}
        onClose={() => setShowToaster(false)}
      />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.locationContainer}>
          <Ionicons name="location-outline" size={20} color="#0078D7" />
          <View style={styles.locationText}>
            <Text style={styles.locationName}>{userDetails?.user_name}</Text>
            <Text style={styles.locationAddress}>{userDetails?.user_email}</Text>
          </View>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="cart-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
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
            placeholder="Search..."
            placeholderTextColor="#999"
          />
        </View>

        {/* Banner Carousel */}
        <FlatList
          data={data?.banners}
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
          {data?.quickActions.map((action: any) => (
            <TouchableOpacity
              key={action.id}
              style={styles.quickActionItem}
              onPress={() => router.push(action.route)}
            >
              <View style={styles.quickActionIcon}>
                <Ionicons name={action.icon as any} size={28} color="#0078D7" />
              </View>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categorie's</Text>
          <FlatList
            data={data?.categories}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.categoryCard}>
                <Image source={item.image} style={styles.categoryImage} />
                <Text style={styles.categoryName}>{item.name}</Text>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.id}
          />
        </View>

        {/* Featured Products */}
        <ProductSection
          title="Featured Product's"
          products={data?.featuredProducts}
        />

        {/* Product of Followers */}
        <ProductSection
          title="Product of Follower's"
          products={data?.productOfFollowers}
        />

        {/* Products on Cashew */}
        <ProductSection
          title="Products on Cashew's"
          products={data?.productsOnCashew}
        />

        {/* Products on Almond */}
        <ProductSection
          title="Products on Almond's"
          products={data?.productsOnAlmond}
        />

        {/* Products on Dates */}
        <ProductSection
          title="Products on Dates"
          products={data?.productsOnDates}
        />

        {/* Bottom Spacing for tab bar */}
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
};

// Product Section Component
const ProductSection = ({ title, products }: any) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <FlatList
      data={products}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.horizontalList}
      renderItem={({ item }) => (
        <View style={styles.productCard}>
          <Image source={item.image} style={styles.productImage} />
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{item.name}</Text>
            <View style={styles.productBottom}>
              <View>
                <Text style={styles.productQuantity}>Qty: {item.quantity}</Text>
                <Text style={styles.productPrice}>
                  Price Per Unit: {item.pricePerUnit}
                </Text>
              </View>
              <TouchableOpacity style={styles.enquireButton}>
                <Text style={styles.enquireButtonText}>Enquire</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
      keyExtractor={(item) => item.id}
    />
  </View>
);

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
  },
  locationText: {
    marginLeft: 8,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
    marginLeft: 16,
    marginBottom: 12,
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
  },
  categoryName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },
  productCard: {
    width: 250,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginRight: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  productImage: {
    width: "100%",
    height: 140,
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  productQuantity: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
  },
  productPrice: {
    fontSize: 12,
    color: "#666",
    marginBottom: 12,
  },
  productBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  enquireButton: {
    backgroundColor: "#0078D7",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: "center",
  },
  enquireButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});

export default HomeScreen;

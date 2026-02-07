import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const { width } = Dimensions.get("window");

interface Product {
  id: string;
  name: string;
  image: string;
  qty: string;
  pricePerUnit: string;
}

interface ProductSection {
  title: string;
  products: Product[];
}

const ListingsScreen: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Cashew");
  const [productSections, setProductSections] = useState<ProductSection[]>([]);

  const categories = [
    "Cashew",
    "Almond",
    "Dates",
    "Pista",
    "2 Piece",
    "4 Piece",
    "A1 Almond",
    "A2 Pista",
  ];

  // Simulate fetching data from backend
  useEffect(() => {
    fetchProductsFromBackend();
  }, []);

  const fetchProductsFromBackend = async () => {
    setLoading(true);

    // Simulate API call delay
    setTimeout(() => {
      const dummyData: ProductSection[] = [
        {
          title: "Featured Product's",
          products: [
            {
              id: "1",
              name: "Cashew W-180",
              image:
                "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=400",
              qty: "100KG",
              pricePerUnit: "200rs",
            },
            {
              id: "2",
              name: "Almond Local",
              image:
                "https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=400",
              qty: "10KG",
              pricePerUnit: "100rs",
            },
          ],
        },
        {
          title: "Product of Follower's",
          products: [
            {
              id: "3",
              name: "Pista A1",
              image:
                "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=400",
              qty: "20KG",
              pricePerUnit: "500rs",
            },
            {
              id: "4",
              name: "Arabian Dates",
              image:
                "https://images.unsplash.com/photo-1587049352846-4a222e784e38?w=400",
              qty: "200KG",
              pricePerUnit: "128rs",
            },
          ],
        },
        {
          title: "Products on Cashew's",
          products: [
            {
              id: "5",
              name: "Cashew 2 Piece",
              image:
                "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=400",
              qty: "50KG",
              pricePerUnit: "1000rs",
            },
            {
              id: "6",
              name: "Cashew 4 Piece",
              image:
                "https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=400",
              qty: "100KG",
              pricePerUnit: "900rs",
            },
          ],
        },
      ];

      setProductSections(dummyData);
      setLoading(false);
    }, 1500);
  };

  const renderProductCard = (product: Product) => (
    <TouchableOpacity key={product.id} style={styles.productCard}>
      <Image
        source={{ uri: product.image }}
        style={styles.productImage}
        resizeMode="cover"
      />
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={1}>
          {product.name}
        </Text>
        <View style={styles.productBottom}>
          <View>
            <Text style={styles.productQty}>Qty: {product.qty}</Text>
            <Text style={styles.productPrice}>
              Price Per Unit: {product.pricePerUnit}
            </Text>
          </View>
          <TouchableOpacity style={styles.enquireButton}>
            <Text style={styles.enquireButtonText}>Enquire</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Listings</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={20}
          color="#999"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
      </View>

      {/* Category Filter Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryPill,
              selectedCategory === category && styles.categoryPillActive,
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategory === category && styles.categoryTextActive,
              ]}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Loading Indicator */}
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#1E90FF" />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      ) : (
        /* Products List */
        <ScrollView
          style={styles.productsScrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.productsContent}
        >
          {productSections.map((section, index) => (
            <View key={index} style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.productsHorizontalContent}
              >
                {section.products.map((product) => renderProductCard(product))}
              </ScrollView>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Floating Add Button */}
      <TouchableOpacity style={styles.floatingButton}>
        <Ionicons name="add" size={30} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    backgroundColor: "#1E90FF",
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  searchContainer: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: "#333",
  },
  categoriesContainer: {
    maxHeight: 80,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  categoryPill: {
    height: 40,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1E90FF",
    marginRight: 10,
    marginTop: 12,
    backgroundColor: "#FFFFFF",
  },
  categoryPillActive: {
    backgroundColor: "#1E90FF",
  },
  categoryText: {
    fontSize: 14,
    color: "#1E90FF",
    fontWeight: "500",
  },
  categoryTextActive: {
    color: "#FFFFFF",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  productsScrollView: {
    flex: 1,
  },
  productsContent: {
    paddingBottom: 100,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  productsHorizontalContent: {
    paddingHorizontal: 16,
    paddingRight: 16,
  },
  productCard: {
    width: 250,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginRight: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: "hidden",
  },
  productBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  productImage: {
    width: "100%",
    height: 120,
    backgroundColor: "#E0E0E0",
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 6,
  },
  productQty: {
    fontSize: 13,
    color: "#666",
  },
  productPrice: {
    fontSize: 13,
    color: "#666",
    marginBottom: 10,
  },
  enquireButton: {
    backgroundColor: "#1E90FF",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginLeft: 12,
    marginBottom: 12,
  },
  enquireButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  floatingButton: {
    position: "absolute",
    bottom: 40,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1E90FF",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});

export default ListingsScreen;

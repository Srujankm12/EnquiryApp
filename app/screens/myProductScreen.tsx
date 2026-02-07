import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

interface Product {
  id: string;
  name: string;
  category: string;
  image: string;
  qty: string;
  pricePerUnit: string;
  isActive: boolean;
}

const MyProductsScreen: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeProducts, setActiveProducts] = useState<Product[]>([]);
  const [inactiveProducts, setInactiveProducts] = useState<Product[]>([]);

  // Fetch products on component mount
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);

    // Simulate API call delay
    setTimeout(() => {
      const dummyActiveProducts: Product[] = [
        {
          id: '1',
          name: 'Cashew A1',
          category: 'Cashew',
          image: 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=400',
          qty: '50KG',
          pricePerUnit: '1000rs',
          isActive: true,
        },
        {
          id: '2',
          name: 'Pista A1',
          category: 'Pista',
          image: 'https://images.unsplash.com/photo-1599599811136-68bce28283d3?w=400',
          qty: '20KG',
          pricePerUnit: '500rs',
          isActive: true,
        },
        {
          id: '3',
          name: 'Almond A1',
          category: 'Almond',
          image: 'https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=400',
          qty: '100KG',
          pricePerUnit: '2000rs',
          isActive: true,
        },
      ];

      const dummyInactiveProducts: Product[] = [
        {
          id: '4',
          name: 'Almond Local',
          category: 'Almond',
          image: 'https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=400',
          qty: '10KG',
          pricePerUnit: '100rs',
          isActive: false,
        },
        {
          id: '5',
          name: 'Arabian Dates',
          category: 'Dates',
          image: 'https://images.unsplash.com/photo-1587049352846-4a222e784e38?w=400',
          qty: '200KG',
          pricePerUnit: '128rs',
          isActive: false,
        },
        {
          id: '6',
          name: 'Raisins Local',
          category: 'Raisins',
          image: 'https://images.unsplash.com/photo-1568164420504-33f736f85d4f?w=400',
          qty: '100KG',
          pricePerUnit: '800rs',
          isActive: false,
        },
      ];

      setActiveProducts(dummyActiveProducts);
      setInactiveProducts(dummyInactiveProducts);
      setLoading(false);
    }, 1500);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProducts();
    setRefreshing(false);
  };

  const handleBack = () => {
    router.back();
};

  const handleEditProduct = (productId: string, productName: string) => {
    console.log(`Edit product: ${productName}`);
    // navigation.navigate('EditProduct', { productId });
  };

  const handleAddProduct = () => {
    router.push('/pages/addProduct');
};

  const handleViewAll = (section: string) => {
    console.log(`View all ${section} products`);
    // navigation.navigate('AllProducts', { section });
  };

  const renderProductCard = (product: Product) => (
    <TouchableOpacity
      key={product.id}
      style={[
        styles.productCard,
        !product.isActive && styles.productCardInactive,
      ]}
      activeOpacity={0.7}
      onPress={() => handleEditProduct(product.id, product.name)}
    >
      <View style={styles.cardContent}>
        {/* Product Image */}
        <View style={styles.imageWrapper}>
          <Image
            source={{ uri: product.image }}
            style={[
              styles.productImage,
              !product.isActive && styles.productImageInactive,
            ]}
            resizeMode="cover"
          />
          {!product.isActive && <View style={styles.imageOverlay} />}
        </View>

        {/* Product Info */}
        <View style={styles.productInfo}>
          <Text
            style={[
              styles.productName,
              !product.isActive && styles.textInactive,
            ]}
            numberOfLines={1}
          >
            {product.name}
          </Text>
          <Text
            style={[
              styles.productCategory,
              !product.isActive && styles.textInactive,
            ]}
            numberOfLines={1}
          >
            {product.category}
          </Text>
          <Text
            style={[
              styles.productQty,
              !product.isActive && styles.textInactive,
            ]}
            numberOfLines={1}
          >
            Qty: {product.qty}
          </Text>
          <Text
            style={[
              styles.productPrice,
              !product.isActive && styles.textInactive,
            ]}
            numberOfLines={1}
          >
            Price Per Unit: {product.pricePerUnit}
          </Text>
        </View>

        {/* Edit Icon */}
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => handleEditProduct(product.id, product.name)}
        >
          <Ionicons
            name="create-outline"
            size={22}
            color={product.isActive ? '#666666' : '#AAAAAA'}
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const filteredActiveProducts = activeProducts.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredInactiveProducts = inactiveProducts.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#177DDF" translucent={false} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Products</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Loading Indicator */}
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#177DDF" />
          <Text style={styles.loadingText}>Loading your products...</Text>
        </View>
      ) : (
        /* Products List */
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#177DDF']}
              tintColor="#177DDF"
            />
          }
        >
          {/* Active Products Section */}
          {filteredActiveProducts.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Active</Text>
              {filteredActiveProducts.map((product) => renderProductCard(product))}
              {activeProducts.length > 3 && (
                <TouchableOpacity
                  style={styles.viewAllButton}
                  onPress={() => handleViewAll('active')}
                >
                  <Text style={styles.viewAllText}>View all</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Inactive Products Section */}
          {filteredInactiveProducts.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Inactive</Text>
              {filteredInactiveProducts.map((product) => renderProductCard(product))}
            </View>
          )}

          {/* Empty State */}
          {filteredActiveProducts.length === 0 &&
            filteredInactiveProducts.length === 0 && (
              <View style={styles.emptyContainer}>
                <Ionicons name="cube-outline" size={64} color="#CCC" />
                <Text style={styles.emptyText}>No products found</Text>
                <Text style={styles.emptySubtext}>
                  {searchQuery.length > 0
                    ? 'Try adjusting your search'
                    : 'Add your first product to get started'}
                </Text>
              </View>
            )}

          <View style={styles.bottomPadding} />
        </ScrollView>
      )}

      {/* Floating Add Button */}
      <TouchableOpacity style={styles.floatingButton} onPress={handleAddProduct}>
        <Ionicons name="add" size={30} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#177DDF',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    elevation: 2,
    shadowColor: '#000',
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
    color: '#333',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  productCardInactive: {
    backgroundColor: '#F9F9F9',
    opacity: 0.6,
  },
  cardContent: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
  },
  imageWrapper: {
    position: 'relative',
  },
  productImage: {
    width: 90,
    height: 90,
    borderRadius: 10,
    backgroundColor: '#E0E0E0',
  },
  productImageInactive: {
    opacity: 0.5,
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 10,
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  productQty: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  productPrice: {
    fontSize: 13,
    color: '#666',
  },
  textInactive: {
    color: '#AAAAAA',
  },
  editButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewAllButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 4,
  },
  viewAllText: {
    fontSize: 14,
    color: '#177DDF',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  bottomPadding: {
    height: 100,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 40,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#177DDF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});

export default MyProductsScreen;
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

interface Location {
  id: string;
  name: string;
  isSelected: boolean;
}

interface Category {
  id: string;
  name: string;
  isSelected: boolean;
}

interface Seller {
  id: string;
  name: string;
  rating: number;
  location: string;
  city: string;
  image: string;
  isFollowing: boolean;
}

const SellerDirectoryScreen: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [locations, setLocations] = useState<Location[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [filteredSellers, setFilteredSellers] = useState<Seller[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterSellers();
  }, [searchQuery, locations, categories, sellers]);

  const fetchData = async () => {
    setLoading(true);

    // Simulate API call delay
    setTimeout(() => {
      // Dummy locations data
      const dummyLocations: Location[] = [
        { id: '1', name: 'Banglore', isSelected: true },
        { id: '2', name: 'Manglore', isSelected: false },
        { id: '3', name: 'Karkala', isSelected: false },
        { id: '4', name: 'Invali', isSelected: false },
      ];

      // Dummy categories data
      const dummyCategories: Category[] = [
        { id: '1', name: 'Cashew', isSelected: true },
        { id: '2', name: 'Almond', isSelected: false },
        { id: '3', name: 'Dates', isSelected: false },
        { id: '4', name: 'Pista', isSelected: false },
      ];

      // Dummy sellers data
      const dummySellers: Seller[] = [
        {
          id: '1',
          name: 'Crunchy Cashews',
          rating: 4.5,
          location: 'Deelban Poojary',
          city: 'Banglore',
          image: 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=400',
          isFollowing: false,
        },
        {
          id: '2',
          name: 'Bolas',
          rating: 4.0,
          location: 'Shivaram HR',
          city: 'Banglore',
          image: 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=400',
          isFollowing: false,
        },
        {
          id: '3',
          name: 'Kade Cashew',
          rating: 4.5,
          location: 'Lorem Ipsum',
          city: 'Banglore',
          image: 'https://images.unsplash.com/photo-1599599811136-68bce28283d3?w=400',
          isFollowing: false,
        },
        {
          id: '4',
          name: 'Sri Saraswathi Cashews',
          rating: 5.0,
          location: 'Sathvik KD',
          city: 'Banglore',
          image: 'https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=400',
          isFollowing: false,
        },
        {
          id: '5',
          name: 'Kaibavi',
          rating: 4.5,
          location: 'Samarth k',
          city: 'Manglore',
          image: 'https://images.unsplash.com/photo-1587049352846-4a222e784e38?w=400',
          isFollowing: false,
        },
        {
          id: '6',
          name: 'Cashew Coast.',
          rating: 4.0,
          location: 'Suresh HL',
          city: 'Banglore',
          image: 'https://images.unsplash.com/photo-1568164420504-33f736f85d4f?w=400',
          isFollowing: false,
        },
      ];

      setLocations(dummyLocations);
      setCategories(dummyCategories);
      setSellers(dummySellers);
      setLoading(false);
    }, 1500);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleBack = () => {
    router.back();
  };

  const toggleLocation = (locationId: string) => {
    setLocations((prev) =>
      prev.map((loc) =>
        loc.id === locationId
          ? { ...loc, isSelected: !loc.isSelected }
          : loc
      )
    );
  };

  const toggleCategory = (categoryId: string) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === categoryId
          ? { ...cat, isSelected: !cat.isSelected }
          : cat
      )
    );
  };

  const toggleFollow = (sellerId: string) => {
    setSellers((prev) =>
      prev.map((seller) =>
        seller.id === sellerId
          ? { ...seller, isFollowing: !seller.isFollowing }
          : seller
      )
    );
  };

  const filterSellers = () => {
    let filtered = sellers;

    // Filter by search query
    if (searchQuery.length > 0) {
      filtered = filtered.filter(
        (seller) =>
          seller.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          seller.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
          seller.city.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by selected locations
    const selectedLocations = locations.filter((loc) => loc.isSelected);
    if (selectedLocations.length > 0) {
      filtered = filtered.filter((seller) =>
        selectedLocations.some((loc) => seller.city === loc.name)
      );
    }

    // Filter by selected categories (in real app, sellers would have category field)
    const selectedCategories = categories.filter((cat) => cat.isSelected);
    if (selectedCategories.length > 0) {
      // In a real app, you would filter based on seller's categories
      // For now, we'll just show all if any category is selected
    }

    setFilteredSellers(filtered);
  };

  const handleProfile = (sellerId: string) => {
    console.log(`View profile: ${sellerId}`);
    // router.push(`/pages/sellerProfile/${sellerId}`);
  };

  const handleContact = (sellerId: string) => {
    console.log(`Contact seller: ${sellerId}`);
  };

  const handleMessage = (sellerId: string) => {
    console.log(`Message seller: ${sellerId}`);
  };

  const handleWhatsApp = (sellerId: string) => {
    console.log(`WhatsApp seller: ${sellerId}`);
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Ionicons key={`full-${i}`} name="star" size={14} color="#FFB800" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <Ionicons key="half" name="star-half" size={14} color="#FFB800" />
      );
    }

    const remainingStars = 5 - Math.ceil(rating);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(
        <Ionicons
          key={`empty-${i}`}
          name="star-outline"
          size={14}
          color="#FFB800"
        />
      );
    }

    return <View style={styles.starsContainer}>{stars}</View>;
  };

  const renderSellerCard = (seller: Seller) => (
    <View key={seller.id} style={styles.sellerCard}>
      {/* Seller Header */}
      <View style={styles.sellerHeader}>
        <Image
          source={{ uri: seller.image }}
          style={styles.sellerImage}
          resizeMode="cover"
        />
        <View style={styles.sellerInfo}>
          <Text style={styles.sellerName} numberOfLines={1}>
            {seller.name}
          </Text>
          {renderStars(seller.rating)}
          <Text style={styles.sellerLocation} numberOfLines={1}>
            {seller.location}
          </Text>
          <Text style={styles.sellerCity} numberOfLines={1}>
            {seller.city}
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.followButton,
            seller.isFollowing && styles.followingButton,
          ]}
          onPress={() => toggleFollow(seller.id)}
        >
          <Text
            style={[
              styles.followButtonText,
              seller.isFollowing && styles.followingButtonText,
            ]}
          >
            {seller.isFollowing ? 'Following' : 'Follow'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleProfile(seller.id)}
        >
          <Ionicons name="person-outline" size={18} color="#666" />
          <Text style={styles.actionButtonText}>Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleContact(seller.id)}
        >
          <Ionicons name="call-outline" size={18} color="#666" />
          <Text style={styles.actionButtonText}>Contact</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleMessage(seller.id)}
        >
          <Ionicons name="mail-outline" size={18} color="#666" />
          <Text style={styles.actionButtonText}>Message</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleWhatsApp(seller.id)}
        >
          <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
          <Text style={styles.actionButtonText}>WhatsApp</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#177DDF"
        translucent={false}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Seller Directory</Text>
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
          <Text style={styles.loadingText}>Loading sellers...</Text>
        </View>
      ) : (
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
          {/* Location Filters */}
          <View style={styles.filterSection}>
            <View style={styles.filterRow}>
              <Ionicons
                name="location"
                size={18}
                color="#E53935"
                style={styles.filterIcon}
              />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterScroll}
              >
                {locations.map((location) => (
                  <TouchableOpacity
                    key={location.id}
                    style={[
                      styles.filterChip,
                      location.isSelected && styles.filterChipSelected,
                    ]}
                    onPress={() => toggleLocation(location.id)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        location.isSelected && styles.filterChipTextSelected,
                      ]}
                    >
                      {location.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          {/* Category Filters */}
          <View style={styles.filterSection}>
            <View style={styles.filterRow}>
              <Ionicons
                name="options"
                size={18}
                color="#666"
                style={styles.filterIcon}
              />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterScroll}
              >
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.filterChip,
                      category.isSelected && styles.filterChipSelected,
                    ]}
                    onPress={() => toggleCategory(category.id)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        category.isSelected && styles.filterChipTextSelected,
                      ]}
                    >
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          {/* Sellers List */}
          <View style={styles.sellersContainer}>
            {filteredSellers.length > 0 ? (
              filteredSellers.map((seller) => renderSellerCard(seller))
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={64} color="#CCC" />
                <Text style={styles.emptyText}>No sellers found</Text>
                <Text style={styles.emptySubtext}>
                  Try adjusting your filters or search query
                </Text>
              </View>
            )}
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>
      )}
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
    marginBottom: 12,
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
  filterSection: {
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
  },
  filterIcon: {
    marginRight: 8,
  },
  filterScroll: {
    flex: 1,
  },
  filterChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterChipSelected: {
    backgroundColor: '#177DDF',
    borderColor: '#177DDF',
  },
  filterChipText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  filterChipTextSelected: {
    color: '#FFFFFF',
  },
  sellersContainer: {
    marginTop: 8,
  },
  sellerCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  sellerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sellerImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E0E0E0',
  },
  sellerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  sellerLocation: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  sellerCity: {
    fontSize: 12,
    color: '#999',
  },
  followButton: {
    backgroundColor: '#177DDF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  followingButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#177DDF',
  },
  followButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  followingButtonText: {
    color: '#177DDF',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    fontWeight: '500',
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
    height: 20,
  },
});

export default SellerDirectoryScreen;
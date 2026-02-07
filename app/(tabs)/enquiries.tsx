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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface Enquiry {
  id: string;
  companyName: string;
  companyLogo: string;
  rating: number;
  contactPerson: string;
  location: string;
  isNew: boolean;
}

const EnquiriesScreen: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [newEnquiries, setNewEnquiries] = useState<Enquiry[]>([]);
  const [oldEnquiries, setOldEnquiries] = useState<Enquiry[]>([]);

  // Fetch enquiries on component mount
  useEffect(() => {
    fetchEnquiries();
  }, []);

  const fetchEnquiries = async () => {
    setLoading(true);

    // Simulate API call delay
    setTimeout(() => {
      const dummyNewEnquiries: Enquiry[] = [
        {
          id: '1',
          companyName: 'Bolas',
          companyLogo: 'https://via.placeholder.com/60/FF6347/FFFFFF?text=B',
          rating: 4,
          contactPerson: 'Yogeswaran KK',
          location: 'Vellala',
          isNew: true,
        },
        {
          id: '2',
          companyName: 'Thirumala Cashew',
          companyLogo: 'https://via.placeholder.com/60/FFA500/FFFFFF?text=T',
          rating: 3,
          contactPerson: 'Jeevanantham KL',
          location: 'Mangare',
          isNew: true,
        },
        {
          id: '3',
          companyName: 'Kade Cashew',
          companyLogo: 'https://via.placeholder.com/60/32CD32/FFFFFF?text=K',
          rating: 5,
          contactPerson: 'Ragival S',
          location: 'Mlangare',
          isNew: true,
        },
        {
          id: '4',
          companyName: 'Sri Saraswathi Cashews',
          companyLogo: 'https://via.placeholder.com/60/4169E1/FFFFFF?text=S',
          rating: 4,
          contactPerson: 'Ravi KD',
          location: 'Mangalire',
          isNew: true,
        },
      ];

      const dummyOldEnquiries: Enquiry[] = [
        {
          id: '5',
          companyName: 'Crunchy Cashews',
          companyLogo: 'https://via.placeholder.com/60/9370DB/FFFFFF?text=C',
          rating: 4,
          contactPerson: 'Chethan Poojary',
          location: 'Kuvali',
          isNew: false,
        },
        {
          id: '6',
          companyName: 'Kaibavi',
          companyLogo: 'https://via.placeholder.com/60/20B2AA/FFFFFF?text=K',
          rating: 3,
          contactPerson: 'Guruprasth L',
          location: 'Manguru',
          isNew: false,
        },
        {
          id: '7',
          companyName: 'Cashew Coast.',
          companyLogo: 'https://via.placeholder.com/60/FF69B4/FFFFFF?text=CC',
          rating: 4,
          contactPerson: 'Pavan HL',
          location: 'Bangare',
          isNew: false,
        },
        {
          id: '8',
          companyName: 'South Canara Agro Mart',
          companyLogo: 'https://via.placeholder.com/60/FFD700/FFFFFF?text=SC',
          rating: 5,
          contactPerson: 'Melkathith Kulal',
          location: 'Mangore',
          isNew: false,
        },
        {
          id: '9',
          companyName: 'DVK Cashews',
          companyLogo: 'https://via.placeholder.com/60/DC143C/FFFFFF?text=D',
          rating: 4,
          contactPerson: 'Dinesh KR',
          location: 'Mangore',
          isNew: false,
        },
      ];

      setNewEnquiries(dummyNewEnquiries);
      setOldEnquiries(dummyOldEnquiries);
      setLoading(false);
    }, 1500);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEnquiries();
    setRefreshing(false);
  };

  const handleRead = (enquiryId: string, companyName: string) => {
    console.log(`Read enquiry from ${companyName}`);
    // Navigate to enquiry details or show modal
  };

  const handleView = (enquiryId: string, companyName: string) => {
    console.log(`View enquiry from ${companyName}`);
    // Navigate to enquiry details
  };

  const handleBack = () => {
    // Navigate back
    console.log('Back pressed');
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={14}
          color="#FFD700"
          style={styles.star}
        />
      );
    }
    return <View style={styles.starsContainer}>{stars}</View>;
  };

  const renderEnquiryCard = (enquiry: Enquiry) => (
    <View key={enquiry.id} style={styles.enquiryCard}>
      <View style={styles.cardContent}>
        {/* Company Logo */}
        <Image
          source={{ uri: enquiry.companyLogo }}
          style={styles.companyLogo}
          resizeMode="cover"
        />

        {/* Company Info */}
        <View style={styles.companyInfo}>
          <Text style={styles.companyName}>{enquiry.companyName}</Text>
          {renderStars(enquiry.rating)}
          <Text style={styles.contactPerson}>{enquiry.contactPerson}</Text>
          <Text style={styles.location}>{enquiry.location}</Text>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[
            styles.actionButton,
            enquiry.isNew ? styles.readButton : styles.viewButton,
          ]}
          onPress={() =>
            enquiry.isNew
              ? handleRead(enquiry.id, enquiry.companyName)
              : handleView(enquiry.id, enquiry.companyName)
          }
        >
          <Text style={enquiry.isNew ? styles.actionButtonText : styles.viewText}>
            {enquiry.isNew ? 'Read' : 'View'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const filteredNewEnquiries = newEnquiries.filter((enquiry) =>
    enquiry.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    enquiry.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
    enquiry.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredOldEnquiries = oldEnquiries.filter((enquiry) =>
    enquiry.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    enquiry.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
    enquiry.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Enquiries</Text>
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
          <ActivityIndicator size="large" color="#1E90FF" />
          <Text style={styles.loadingText}>Loading enquiries...</Text>
        </View>
      ) : (
        /* Enquiries List */
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#1E90FF']}
              tintColor="#1E90FF"
            />
          }
        >
          {/* New Enquiries Section */}
          {filteredNewEnquiries.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>New Enquiries</Text>
              {filteredNewEnquiries.map((enquiry) => renderEnquiryCard(enquiry))}
            </View>
          )}

          {/* Old Enquiries Section */}
          {filteredOldEnquiries.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Old Enquiries</Text>
                <TouchableOpacity>
                  <Text style={styles.viewAllText}>View all</Text>
                </TouchableOpacity>
              </View>
              {filteredOldEnquiries.map((enquiry) => renderEnquiryCard(enquiry))}
            </View>
          )}

          {/* Empty State */}
          {filteredNewEnquiries.length === 0 && filteredOldEnquiries.length === 0 && (
            <View style={styles.emptyContainer}>
              <Ionicons name="mail-outline" size={64} color="#CCC" />
              <Text style={styles.emptyText}>No enquiries found</Text>
              <Text style={styles.emptySubtext}>
                Try adjusting your search
              </Text>
            </View>
          )}

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
    backgroundColor: '#1E90FF',
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 14,
    color: '#717171',
    fontWeight: '500',
  },
  enquiryCard: {
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
  cardContent: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
  },
  companyLogo: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#E0E0E0',
  },
  companyInfo: {
    flex: 1,
    marginLeft: 12,
  },
  companyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  star: {
    marginRight: 2,
  },
  contactPerson: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  location: {
    fontSize: 12,
    color: '#999',
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  viewText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#717171',
  },
  readButton: {
    marginTop: 10,
    backgroundColor: '#1E90FF',
  },
  viewButton: {
    marginTop: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDD',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffff',
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
});

export default EnquiriesScreen;
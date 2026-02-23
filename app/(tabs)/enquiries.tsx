import React, { useState, useEffect, useCallback } from 'react';
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

const { width } = Dimensions.get('window');

interface Enquiry {
  id: string;
  companyName: string;
  companyLogo: string;
  rating: number;
  contactPerson: string;
  location: string;
  isNew: boolean;
  date?: string;
  productName?: string;
}

const EnquiriesScreen: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [newEnquiries, setNewEnquiries] = useState<Enquiry[]>([]);
  const [oldEnquiries, setOldEnquiries] = useState<Enquiry[]>([]);

  useEffect(() => {
    fetchEnquiries();
  }, []);

  const fetchEnquiries = async () => {
    setLoading(true);
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
          date: 'Today',
          productName: 'Raw Cashew Nuts',
        },
        {
          id: '2',
          companyName: 'Thirumala Cashew',
          companyLogo: 'https://via.placeholder.com/60/FFA500/FFFFFF?text=T',
          rating: 3,
          contactPerson: 'Jeevanantham KL',
          location: 'Mangare',
          isNew: true,
          date: 'Today',
          productName: 'Processed Cashew',
        },
        {
          id: '3',
          companyName: 'Kade Cashew',
          companyLogo: 'https://via.placeholder.com/60/32CD32/FFFFFF?text=K',
          rating: 5,
          contactPerson: 'Ragival S',
          location: 'Mlangare',
          isNew: true,
          date: 'Yesterday',
          productName: 'Cashew Butter',
        },
        {
          id: '4',
          companyName: 'Sri Saraswathi Cashews',
          companyLogo: 'https://via.placeholder.com/60/4169E1/FFFFFF?text=S',
          rating: 4,
          contactPerson: 'Ravi KD',
          location: 'Mangalire',
          isNew: true,
          date: 'Yesterday',
          productName: 'Roasted Cashew',
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
          date: '2 days ago',
          productName: 'Premium Cashews',
        },
        {
          id: '6',
          companyName: 'Kaibavi',
          companyLogo: 'https://via.placeholder.com/60/20B2AA/FFFFFF?text=K',
          rating: 3,
          contactPerson: 'Guruprasth L',
          location: 'Manguru',
          isNew: false,
          date: '3 days ago',
          productName: 'Cashew Oil',
        },
        {
          id: '7',
          companyName: 'Cashew Coast.',
          companyLogo: 'https://via.placeholder.com/60/FF69B4/FFFFFF?text=CC',
          rating: 4,
          contactPerson: 'Pavan HL',
          location: 'Bangare',
          isNew: false,
          date: '1 week ago',
          productName: 'Organic Cashew',
        },
        {
          id: '8',
          companyName: 'South Canara Agro Mart',
          companyLogo: 'https://via.placeholder.com/60/FFD700/FFFFFF?text=SC',
          rating: 5,
          contactPerson: 'Melkathith Kulal',
          location: 'Mangore',
          isNew: false,
          date: '2 weeks ago',
          productName: 'Cashew Mix',
        },
        {
          id: '9',
          companyName: 'DVK Cashews',
          companyLogo: 'https://via.placeholder.com/60/DC143C/FFFFFF?text=D',
          rating: 4,
          contactPerson: 'Dinesh KR',
          location: 'Mangore',
          isNew: false,
          date: '1 month ago',
          productName: 'Whole Cashews',
        },
      ];

      setNewEnquiries(dummyNewEnquiries);
      setOldEnquiries(dummyOldEnquiries);
      setLoading(false);
    }, 1000);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEnquiries();
    setRefreshing(false);
  }, []);

  const handleRead = (enquiryId: string, companyName: string) => {
    console.log(`Read enquiry from ${companyName}`);
  };

  const handleView = (enquiryId: string, companyName: string) => {
    console.log(`View enquiry from ${companyName}`);
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={12}
          color="#FFD700"
          style={{ marginRight: 1 }}
        />
      );
    }
    return <View style={styles.starsContainer}>{stars}</View>;
  };

  const renderEnquiryCard = (enquiry: Enquiry) => (
    <TouchableOpacity
      key={enquiry.id}
      style={styles.enquiryCard}
      activeOpacity={0.7}
      onPress={() =>
        enquiry.isNew
          ? handleRead(enquiry.id, enquiry.companyName)
          : handleView(enquiry.id, enquiry.companyName)
      }
    >
      <View style={styles.cardContent}>
        {/* Company Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={{ uri: enquiry.companyLogo }}
            style={styles.companyLogo}
            resizeMode="cover"
          />
          {enquiry.isNew && <View style={styles.newDot} />}
        </View>

        {/* Company Info */}
        <View style={styles.companyInfo}>
          <View style={styles.companyNameRow}>
            <Text style={styles.companyName} numberOfLines={1}>{enquiry.companyName}</Text>
            <Text style={styles.dateText}>{enquiry.date}</Text>
          </View>
          {renderStars(enquiry.rating)}
          {enquiry.productName && (
            <Text style={styles.productNameText} numberOfLines={1}>
              {enquiry.productName}
            </Text>
          )}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="person-outline" size={12} color="#888" />
              <Text style={styles.contactPerson}>{enquiry.contactPerson}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={12} color="#888" />
              <Text style={styles.location}>{enquiry.location}</Text>
            </View>
          </View>
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
          <Ionicons
            name={enquiry.isNew ? 'mail-unread-outline' : 'eye-outline'}
            size={16}
            color={enquiry.isNew ? '#FFFFFF' : '#1E90FF'}
          />
          <Text style={enquiry.isNew ? styles.readButtonText : styles.viewButtonText}>
            {enquiry.isNew ? 'Read' : 'View'}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const currentEnquiries = activeTab === 'new' ? newEnquiries : oldEnquiries;

  const filteredEnquiries = currentEnquiries.filter((enquiry) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      enquiry.companyName.toLowerCase().includes(query) ||
      enquiry.contactPerson.toLowerCase().includes(query) ||
      enquiry.location.toLowerCase().includes(query) ||
      (enquiry.productName?.toLowerCase().includes(query) ?? false)
    );
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E90FF" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Enquiries</Text>
        {newEnquiries.length > 0 && (
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{newEnquiries.length} new</Text>
          </View>
        )}
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search enquiries..."
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
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'new' && styles.tabActive]}
          onPress={() => setActiveTab('new')}
        >
          <Text style={[styles.tabText, activeTab === 'new' && styles.tabTextActive]}>
            New ({newEnquiries.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
            History ({oldEnquiries.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Loading Indicator */}
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#1E90FF" />
          <Text style={styles.loadingText}>Loading enquiries...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#1E90FF']}
            />
          }
        >
          {filteredEnquiries.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons
                name={activeTab === 'new' ? 'mail-outline' : 'time-outline'}
                size={64}
                color="#CCC"
              />
              <Text style={styles.emptyTitle}>
                {searchQuery ? 'No Results' : activeTab === 'new' ? 'No New Enquiries' : 'No History'}
              </Text>
              <Text style={styles.emptySubtext}>
                {searchQuery
                  ? 'Try adjusting your search term'
                  : activeTab === 'new'
                  ? 'New enquiries will appear here'
                  : 'Your past enquiries will appear here'}
              </Text>
            </View>
          ) : (
            filteredEnquiries.map((enquiry) => renderEnquiryCard(enquiry))
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
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#1E90FF',
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  headerBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  searchWrapper: {
    backgroundColor: '#1E90FF',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: '#333',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#1E90FF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
  },
  tabTextActive: {
    color: '#1E90FF',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 20,
  },
  enquiryCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  cardContent: {
    flexDirection: 'row',
    padding: 14,
    alignItems: 'center',
  },
  logoContainer: {
    position: 'relative',
  },
  companyLogo: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#E0E0E0',
  },
  newDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF3B30',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  companyInfo: {
    flex: 1,
    marginLeft: 12,
  },
  companyNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  companyName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1,
    marginRight: 8,
  },
  dateText: {
    fontSize: 11,
    color: '#AAA',
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  productNameText: {
    fontSize: 12,
    color: '#1E90FF',
    fontWeight: '500',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  contactPerson: {
    fontSize: 12,
    color: '#888',
  },
  location: {
    fontSize: 12,
    color: '#888',
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    marginLeft: 8,
  },
  readButton: {
    backgroundColor: '#1E90FF',
  },
  viewButton: {
    backgroundColor: '#F0F7FF',
    borderWidth: 1,
    borderColor: '#D0E3F7',
  },
  readButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  viewButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E90FF',
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  bottomPadding: {
    height: 80,
  },
});

export default EnquiriesScreen;

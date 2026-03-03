import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
  category_image: string | null;
  name: string;
  description: string;
}

const numColumns = 2;
const cardMargin = 12;
const cardWidth = (width - 32 - cardMargin) / numColumns;

const CategoryCard = ({
  item,
  onPress,
}: {
  item: Category;
  onPress: () => void;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () =>
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 20,
    }).start();
  const handlePressOut = () =>
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
    }).start();

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <Animated.View
        style={[styles.categoryCard, { transform: [{ scale: scaleAnim }] }]}
      >
        <View style={styles.imageContainer}>
          {item.category_image ? (
            <Image
              source={{ uri: getImageUri(item.category_image)! }}
              style={styles.categoryImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <View style={styles.placeholderIconWrap}>
                <Ionicons name="leaf-outline" size={32} color="#0078D7" />
              </View>
            </View>
          )}
          <View style={styles.arrowBadge}>
            <Ionicons name="arrow-forward" size={11} color="#0078D7" />
          </View>
          <View style={styles.cardLabelContainer}>
            <Text style={styles.categoryName} numberOfLines={2}>
              {item.name}
            </Text>
            {item.description ? (
              <Text style={styles.categoryDescription} numberOfLines={1}>
                {item.description}
              </Text>
            ) : null}
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const CategoriesScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setError(null);
      const token = await AsyncStorage.getItem("token");
      const res = await axios.get(`${API_URL}/category/get/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCategories(res.data?.categories || []);
    } catch {
      setError(
        "Unable to load categories. Please check your connection and try again.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCategories();
  }, []);

  const handleCategoryPress = (category: Category) => {
    router.push({
      pathname: "/pages/specificCategory",
      params: { id: category.id, name: category.name },
    });
  };

  const filteredCategories = categories.filter((cat) =>
    !searchQuery
      ? true
      : cat.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const Header = () => (
    <View style={[styles.headerWrapper, { paddingTop: insets.top }]}>
      <View style={styles.headerOrb1} />
      <View style={styles.headerOrb2} />
      <View style={styles.headerOrb3} />
      <View style={styles.headerInner}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerEyebrow}>EXPLORE</Text>
          <Text style={styles.headerTitle}>Categories</Text>
        </View>
        <View style={styles.headerBadge}>
          <View style={styles.headerBadgeDot} />
          <Text style={styles.headerBadgeText}>{categories.length} total</Text>
        </View>
      </View>
      <View
        style={[
          styles.headerSearchWrap,
          searchFocused && styles.headerSearchWrapFocused,
        ]}
      >
        <View style={styles.searchIconCircle}>
          <Ionicons name="search-outline" size={14} color="#0078D7" />
        </View>
        <TextInput
          style={styles.headerSearchInput}
          placeholder="Search categories..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.searchFilterBtn}
            onPress={() => setSearchQuery("")}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={15} color="#0078D7" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0060B8" />
        <Header />
        <View style={styles.loaderContainer}>
          <View style={styles.loaderCard}>
            <ActivityIndicator size="large" color="#0078D7" />
            <Text style={styles.loaderText}>Loading categories…</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0060B8" />
      <Header />

      {error ? (
        <View style={styles.stateContainer}>
          <View style={styles.stateIconWrapper}>
            <Ionicons name="cloud-offline-outline" size={32} color="#0078D7" />
          </View>
          <Text style={styles.stateTitle}>Connection Error</Text>
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={fetchCategories}
          >
            <Ionicons name="refresh" size={15} color="#fff" />
            <Text style={styles.actionButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : filteredCategories.length === 0 ? (
        <View style={styles.stateContainer}>
          <View style={styles.stateIconWrapper}>
            <Ionicons name="grid-outline" size={32} color="#0078D7" />
          </View>
          <Text style={styles.stateTitle}>
            {searchQuery ? "No Results Found" : "No Categories"}
          </Text>
          <Text style={styles.stateText}>
            {searchQuery
              ? `No categories match "${searchQuery}"`
              : "No categories available at the moment"}
          </Text>
          {searchQuery && (
            <TouchableOpacity
              style={styles.outlineButton}
              onPress={() => setSearchQuery("")}
            >
              <Text style={styles.outlineButtonText}>Clear Search</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <FlatList
            data={filteredCategories}
            numColumns={numColumns}
            contentContainerStyle={styles.gridContainer}
            columnWrapperStyle={styles.columnWrapper}
            showsVerticalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <CategoryCard
                item={item}
                onPress={() => handleCategoryPress(item)}
              />
            )}
            ListHeaderComponent={
              searchQuery ? (
                <Text style={styles.resultsLabel}>
                  {filteredCategories.length} result
                  {filteredCategories.length !== 1 ? "s" : ""}
                </Text>
              ) : (
                <View style={styles.statsBar}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{categories.length}+</Text>
                    <Text style={styles.statLabel}>Categories</Text>
                  </View>
                </View>
              )
            }
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={["#0078D7"]}
                tintColor="#0078D7"
              />
            }
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F9FC" },

  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F7F9FC",
  },
  loaderCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  loaderText: {
    marginTop: 12,
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "500",
  },

  headerWrapper: {
    backgroundColor: "#0060B8",
    paddingHorizontal: 20,
    paddingBottom: 16,
    overflow: "hidden",
    shadowColor: "#003E80",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 18,
  },
  headerOrb1: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(255,255,255,0.06)",
    top: -100,
    right: -70,
  },
  headerOrb2: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.04)",
    bottom: 10,
    left: -60,
  },
  headerOrb3: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(100,180,255,0.08)",
    top: 20,
    right: width * 0.35,
  },

  headerInner: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingTop: 16,
    paddingBottom: 18,
  },
  headerEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.65)",
    letterSpacing: 2,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  headerBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4ADE80",
  },
  headerBadgeText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.85)",
    fontWeight: "700",
  },

  headerSearchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    shadowColor: "#003E80",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
  headerSearchWrapFocused: { borderColor: "rgba(255,255,255,0.6)" },
  searchIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: "#EBF5FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  headerSearchInput: {
    flex: 1,
    fontSize: 13,
    color: "#0F172A",
    fontWeight: "500",
  },
  searchFilterBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#EBF5FF",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
  },

  statsBar: {
    flexDirection: "row",
    marginBottom: 16,
    backgroundColor: "#0078D7",
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 10,
    shadowColor: "#0078D7",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 8,
  },
  statItem: { flex: 1, alignItems: "center" },
  statValue: {
    fontSize: 20,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.72)",
    marginTop: 2,
    fontWeight: "600",
  },
  statDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.2)" },

  resultsLabel: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "600",
    marginBottom: 12,
    letterSpacing: 0.2,
  },

  gridContainer: { padding: 16, paddingBottom: 110 },
  columnWrapper: { gap: cardMargin, marginBottom: cardMargin },

  categoryCard: {
    width: cardWidth,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.09,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: "#F0F4F8",
  },
  imageContainer: { width: "100%", aspectRatio: 0.85, position: "relative" },
  categoryImage: { width: "100%", height: "100%" },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#EBF5FF",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "rgba(0,120,215,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  arrowBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  cardLabelContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(10,20,40,0.58)",
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  categoryName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
    lineHeight: 18,
    letterSpacing: -0.1,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  categoryDescription: {
    fontSize: 10,
    color: "rgba(255,255,255,0.72)",
    marginTop: 2,
    fontWeight: "500",
  },

  stateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  stateIconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#EBF5FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  stateText: {
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  actionButton: {
    marginTop: 24,
    backgroundColor: "#0078D7",
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: "#0078D7",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  actionButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  outlineButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#0078D7",
  },
  outlineButtonText: { color: "#0078D7", fontSize: 13, fontWeight: "700" },
});

export default CategoriesScreen;

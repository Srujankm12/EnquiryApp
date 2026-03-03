import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { router, useFocusEffect } from "expo-router";
import { jwtDecode } from "jwt-decode";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
const TILE_SIZE = (width - 48 - 12) / 2;

const API_URL = Constants.expoConfig?.extra?.API_URL;
const CLOUDFRONT_URL = Constants.expoConfig?.extra?.CLOUDFRONT_URL;
const S3_URL = Constants.expoConfig?.extra?.S3_FETCH_URL;

const getImageUri = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const path = url.startsWith("/") ? url : `/${url}`;
  if (CLOUDFRONT_URL) return `${CLOUDFRONT_URL}${path}`;
  return `${S3_URL}${path}`;
};

interface DecodedToken {
  user_id: string;
  user_name: string;
  business_id: string;
  iss: string;
  exp: number;
  iat: number;
}

interface GridItem {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
  route?: string;
  condition?: "always" | "seller" | "not-seller" | "has-application";
}

// ─── Animated Grid Tile ───────────────────────────────────────────────────────
const GridTile = ({
  item,
  onPress,
  index,
}: {
  item: GridItem;
  onPress: () => void;
  index: number;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 60,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        tension: 60,
        friction: 9,
        delay: index * 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY }, { scale: scaleAnim }],
      }}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={() =>
          Animated.spring(scaleAnim, {
            toValue: 0.95,
            useNativeDriver: true,
            speed: 20,
          }).start()
        }
        onPressOut={() =>
          Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            speed: 20,
          }).start()
        }
        activeOpacity={1}
        style={styles.gridItem}
      >
        <View
          style={[styles.gridIconContainer, { backgroundColor: item.bgColor }]}
        >
          <Ionicons name={item.icon} size={28} color={item.color} />
        </View>
        <Text style={styles.gridItemTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.gridArrow}>
          <Ionicons name="arrow-forward" size={10} color="#0078D7" />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Quick Action Row ─────────────────────────────────────────────────────────
const QuickActionRow = ({
  icon,
  label,
  subtitle,
  onPress,
  danger,
  iconColor,
  iconBg,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  onPress: () => void;
  danger?: boolean;
  iconColor?: string;
  iconBg?: string;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const resolvedIconColor = danger ? '#EF4444' : (iconColor || '#0078D7');
  const resolvedIconBg = danger ? '#FEF2F2' : (iconBg || '#EBF5FF');
  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[styles.quickAction, danger && styles.quickActionDanger]}
        onPress={onPress}
        onPressIn={() =>
          Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, speed: 20 }).start()
        }
        onPressOut={() =>
          Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 20 }).start()
        }
        activeOpacity={1}
      >
        <View style={[styles.qaAccentBar, { backgroundColor: resolvedIconColor }]} />
        <View style={[styles.qaIconWrap, { backgroundColor: resolvedIconBg }]}>
          <Ionicons name={icon} size={20} color={resolvedIconColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.quickActionText, danger && { color: '#EF4444' }]}>{label}</Text>
          {subtitle ? <Text style={styles.quickActionSub}>{subtitle}</Text> : null}
        </View>
        <View style={styles.qaChevronWrap}>
          <Ionicons name="chevron-forward" size={14} color={danger ? '#EF4444' : '#CBD5E1'} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
const MenuScreen: React.FC = () => {
  const insets = useSafeAreaInsets();

  const [sellerStatus, setSellerStatus] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string>("");

  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  const loadData = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;
      const decoded = jwtDecode<DecodedToken>(token);
      setUserName(decoded.user_name || "");
      setBusinessId(decoded.business_id || "");

      let status = await AsyncStorage.getItem("sellerStatus");
      const storedCompanyId = await AsyncStorage.getItem("companyId");
      const bId = storedCompanyId || decoded.business_id;
      setCompanyId(bId);

      const normalizeStatus = (s: string | null): string | null => {
        if (!s) return null;
        const lower = s.toLowerCase().trim();
        if (lower === "accepted" || lower === "active") return "approved";
        if (lower === "applied" || lower === "under_review") return "pending";
        if (lower === "declined") return "rejected";
        return lower;
      };
      status = normalizeStatus(status);

      if (bId) {
        try {
          const appRes = await fetch(
            `${API_URL}/business/application/get/${bId}`,
            {
              headers: { "Content-Type": "application/json" },
            },
          );
          if (appRes.ok) {
            const appData = await appRes.json();
            const appStatus =
              appData.details?.status ||
              appData.application?.status ||
              appData.status;
            if (appStatus) {
              status = normalizeStatus(appStatus);
              await AsyncStorage.setItem("sellerStatus", status || "");
            }
          }
        } catch {
          try {
            const bizRes = await fetch(`${API_URL}/business/get/${bId}`, {
              headers: { "Content-Type": "application/json" },
            });
            if (bizRes.ok) {
              const bizData = await bizRes.json();
              if (
                bizData.details?.is_business_approved ||
                bizData.business?.is_business_approved
              ) {
                status = "approved";
                await AsyncStorage.setItem("sellerStatus", "approved");
              }
            }
          } catch { }
        }
        if (status !== "approved") {
          try {
            const statusRes = await fetch(`${API_URL}/business/status/${bId}`, {
              headers: { "Content-Type": "application/json" },
            });
            if (statusRes.ok) {
              const statusData = await statusRes.json();
              if (
                statusData?.is_approved === true ||
                statusData?.details?.is_approved === true ||
                statusData?.is_business_approved === true ||
                statusData?.details?.is_business_approved === true
              ) {
                status = "approved";
                await AsyncStorage.setItem("sellerStatus", "approved");
              }
            }
          } catch { }
        }
      }
      setSellerStatus(status);

      try {
        const res = await fetch(`${API_URL}/user/get/user/${decoded.user_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const details = data.user || data;
          setUserEmail(details.email || "");
          if (details.first_name) {
            setUserName(
              `${details.first_name}${details.last_name ? " " + details.last_name : ""}`,
            );
          }
          const profileUrl = details.profile_image;
          if (profileUrl) {
            setProfileImage(`${getImageUri(profileUrl)}?t=${Date.now()}`);
          }
        }
      } catch { }
    } catch (error) {
      console.error("Error loading menu data:", error);
    } finally {
      setLoading(false);
    }
  };

  const gridItems: GridItem[] = [
    {
      id: "business-mgmt",
      title: "Business",
      icon: "business",
      color: "#0078D7",
      bgColor: "#E3F2FD",
      route: "pages/businessManagement",
      condition: "seller",
    },
    {
      id: "my-products",
      title: "My\nProducts",
      icon: "cube",
      color: "#177DDF",
      bgColor: "#E3F2FD",
      route: "pages/myProducts",
      condition: "seller",
    },
    {
      id: "my-rfqs",
      title: "My\nRFQs",
      icon: "document-text",
      color: "#177DDF",
      bgColor: "#E3F2FD",
      route: "pages/myRfqs",
      condition: "seller",
    },
    {
      id: "become-seller",
      title: "Become\nSeller",
      icon: "storefront",
      color: "#34C759",
      bgColor: "#E8F5E9",
      route: "pages/becomeSellerForm",
      condition: "not-seller",
    },
    {
      id: "edit-details-pending",
      title: "Edit\nDetails",
      icon: "create",
      color: "#FF9500",
      bgColor: "#FFF3E0",
      route: "pages/sellerApplicationStatus",
      condition: "has-application",
    },
    {
      id: "followers",
      title: "Followers &\nFollowing",
      icon: "people-outline",
      color: "#0078D7",
      bgColor: "#E3F2FD",
      route: "pages/followers",
      condition: "always",
    },
  ];

  const isApproved = sellerStatus === "approved";
  const isPending = sellerStatus === "pending";
  const isRejected = sellerStatus === "rejected";

  const getVisibleGridItems = (): GridItem[] =>
    gridItems.filter((item) => {
      switch (item.condition) {
        case "always":
          return true;
        case "seller":
          return isApproved;
        case "not-seller":
          return !isApproved && !isPending;
        case "has-application":
          return isPending || isRejected;
        default:
          return true;
      }
    });

  const handleGridItemPress = (item: GridItem) => {
    if (item.route) router.push(`/${item.route}` as any);
  };

  const performLogout = async () => {
    await AsyncStorage.multiRemove([
      "token",
      "accessToken",
      "refreshToken",
      "user",
      "companyId",
      "sellerStatus",
      "applicationId",
    ]);
    router.replace("/pages/loginMail");
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: performLogout },
    ]);
  };

  // ── Header ─────────────────────────────────────────────────────────────────
  const Header = () => (
    <View style={[styles.headerWrapper, { paddingTop: insets.top }]}>
      {/* decorative orbs — identical to Categories */}
      <View style={styles.headerOrb1} />
      <View style={styles.headerOrb2} />
      <View style={styles.headerOrb3} />

      <View style={styles.headerInner}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerEyebrow}>ACCOUNT</Text>
          <Text style={styles.headerTitle}>Menu</Text>
        </View>
        {isApproved && (
          <View style={styles.headerBadge}>
            <View
              style={[styles.headerBadgeDot, { backgroundColor: "#4ADE80" }]}
            />
            <Text style={styles.headerBadgeText}>Seller</Text>
          </View>
        )}
        {isPending && (
          <View
            style={[styles.headerBadge, { borderColor: "rgba(255,165,0,0.4)" }]}
          >
            <View
              style={[styles.headerBadgeDot, { backgroundColor: "#FFA500" }]}
            />
            <Text style={styles.headerBadgeText}>Pending</Text>
          </View>
        )}
        {!isApproved && !isPending && (
          <View style={styles.headerBadge}>
            <View
              style={[styles.headerBadgeDot, { backgroundColor: "#94A3B8" }]}
            />
            <Text style={styles.headerBadgeText}>Buyer</Text>
          </View>
        )}
      </View>

      {/* Profile strip inside header */}
      <TouchableOpacity
        style={styles.headerProfile}
        activeOpacity={0.8}
        onPress={() => router.push("/pages/profileSetting" as any)}
      >
        <View style={styles.headerAvatarWrap}>
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.headerAvatar} />
          ) : (
            <View style={styles.headerAvatarPlaceholder}>
              <Ionicons name="person" size={22} color="#0078D7" />
            </View>
          )}
          <View style={styles.headerAvatarOnline} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerProfileName} numberOfLines={1}>
            {userName || "User"}
          </Text>
          {userEmail ? (
            <Text style={styles.headerProfileEmail} numberOfLines={1}>
              {userEmail}
            </Text>
          ) : null}
        </View>
        <View style={styles.headerProfileArrow}>
          <Ionicons name="chevron-forward" size={14} color="#0078D7" />
        </View>
      </TouchableOpacity>
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
            <Text style={styles.loaderText}>Loading…</Text>
          </View>
        </View>
      </View>
    );
  }

  const visibleItems = getVisibleGridItems();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0060B8" />
      <Header />

      <View style={{ flex: 1 }}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: 100 + insets.bottom },
          ]}
        >
          {/* Stats Bar — identical to Categories */}
          {/* <View style={styles.statsBar}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{visibleItems.length}</Text>
              <Text style={styles.statLabel}>Features</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{isApproved ? "Seller" : "Buyer"}</Text>
              <Text style={styles.statLabel}>Account</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>Live</Text>
              <Text style={styles.statLabel}>Status</Text>
            </View>
          </View> */}

          {/* Features Grid */}
          <View style={[styles.sectionContainer, { marginTop: 20 }]}>
            <Text style={styles.sectionLabel}>Features</Text>
            <View style={styles.grid}>
              {visibleItems.map((item, index) => (
                <GridTile
                  key={item.id}
                  item={item}
                  index={index}
                  onPress={() => handleGridItemPress(item)}
                />
              ))}
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionEyebrow}>ACCOUNT</Text>
            <Text style={styles.sectionLabel}>Quick Actions</Text>

            {isApproved && (
              <QuickActionRow
                icon="storefront-outline"
                label="View Seller Profile"
                subtitle="See your public business page"
                iconColor="#0078D7"
                iconBg="#EBF5FF"
                onPress={() => {
                  const bId = companyId || businessId;
                  if (bId) {
                    router.push({
                      pathname: "/pages/sellerProfile" as any,
                      params: { business_id: bId },
                    });
                  }
                }}
              />
            )}

            <QuickActionRow
              icon="person-circle-outline"
              label="Update Profile"
              subtitle="Edit name, photo & contact info"
              iconColor="#7C3AED"
              iconBg="#F3EEFF"
              onPress={() => router.push("/pages/updateUserProfileScreen" as any)}
            />

            <QuickActionRow
              icon="lock-closed-outline"
              label="Update Password"
              subtitle="Change your login password"
              iconColor="#F59E0B"
              iconBg="#FEF3C7"
              onPress={() => router.push("/pages/upadetPasswordScreen" as any)}
            />
          </View>

          {/* Logout */}
          <View style={styles.sectionContainer}>
            <QuickActionRow
              icon="log-out-outline"
              label="Logout"
              onPress={handleLogout}
              danger
            />
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F9FC" },

  // ── Loader ────────────────────────────────────────────────────────────────
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
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

  // ── Header (mirrors Categories exactly) ──────────────────────────────────
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
    paddingBottom: 14,
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
  headerBadgeDot: { width: 6, height: 6, borderRadius: 3 },
  headerBadgeText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.85)",
    fontWeight: "700",
  },

  // Profile strip inside header
  headerProfile: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    marginBottom: 4,
    gap: 12,
  },
  headerAvatarWrap: { position: "relative" },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
  },
  headerAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EBF5FF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
  },
  headerAvatarOnline: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#4ADE80",
    borderWidth: 2,
    borderColor: "#0060B8",
  },
  headerProfileName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
  headerProfileEmail: {
    fontSize: 12,
    color: "rgba(255,255,255,0.65)",
    marginTop: 1,
    fontWeight: "500",
  },
  headerProfileArrow: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },

  // ── Stats Bar (mirrors Categories exactly) ────────────────────────────────
  statsBar: {
    flexDirection: "row",
    backgroundColor: "#0078D7",
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 10,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 20,
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

  // ── Sections ──────────────────────────────────────────────────────────────
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  sectionContainer: { paddingHorizontal: 16, marginBottom: 20 },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 14,
    letterSpacing: -0.3,
  },

  // ── Feature Grid ─────────────────────────────────────────────────────────
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  gridItem: {
    width: TILE_SIZE,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingVertical: 20,
    paddingHorizontal: 12,
    alignItems: "center",
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.09,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: "#F0F4F8",
    position: "relative",
  },
  gridIconContainer: {
    width: 58,
    height: 58,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  gridItemTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
    lineHeight: 18,
    letterSpacing: -0.1,
  },
  gridArrow: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#EBF5FF",
  },

  // ── Quick Actions ─────────────────────────────────────────────────────────
  sectionEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 2,
    marginBottom: 4,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 0,
    marginBottom: 10,
    shadowColor: '#1B4FBF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F0F4F8',
    overflow: 'hidden',
  },
  quickActionDanger: {
    borderColor: '#FECACA',
    backgroundColor: '#FFFBFB',
  },
  qaAccentBar: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 2,
    marginRight: 14,
  },
  qaIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  quickActionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  quickActionSub: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
    marginTop: 3,
  },
  qaChevronWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#F7F9FC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
});

export default MenuScreen;

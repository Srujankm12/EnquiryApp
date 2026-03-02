import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#0078D7",
        tabBarInactiveTintColor: "#94A3B8",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: 0,
          height: 64 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 0,
          // Premium shadow
          shadowColor: "#1B4FBF",
          shadowOffset: { width: 0, height: -6 },
          shadowOpacity: 0.1,
          shadowRadius: 16,
          elevation: 18,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "700",
          letterSpacing: 0.2,
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingVertical: 8,
        },
        tabBarIcon: undefined,
      }}
    >
      {/* HOME */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <Ionicons
                name={focused ? "home" : "home-outline"}
                size={20}
                color={focused ? "#0078D7" : "#94A3B8"}
              />
            </View>
          ),
        }}
      />

      {/* CATEGORIES */}
      <Tabs.Screen
        name="catgories"
        options={{
          title: "Categories",
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <Ionicons
                name={focused ? "grid" : "grid-outline"}
                size={20}
                color={focused ? "#0078D7" : "#94A3B8"}
              />
            </View>
          ),
        }}
      />

      {/* PRODUCTS — center hero tab */}
      <Tabs.Screen
        name="listing"
        options={{
          title: "Products",
          tabBarIcon: ({ focused }) => (
            <View style={styles.heroTabWrap}>
              <View style={[styles.heroIconWrap, focused && styles.heroIconWrapActive]}>
                <Ionicons
                  name={focused ? "storefront" : "storefront-outline"}
                  size={22}
                  color="#FFFFFF"
                />
              </View>
            </View>
          ),
          tabBarLabel: ({ focused }) => (
            <View style={{ marginTop: 28 }}>
            </View>
          ),
        }}
      />

      {/* LEADS */}
      <Tabs.Screen
        name="enquiries"
        options={{
          title: "Leads",
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <Ionicons
                name={focused ? "document-text" : "document-text-outline"}
                size={20}
                color={focused ? "#0078D7" : "#94A3B8"}
              />
            </View>
          ),
        }}
      />

      {/* MENU */}
      <Tabs.Screen
        name="menu"
        options={{
          title: "Menu",
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <Ionicons
                name={focused ? "menu" : "menu-outline"}
                size={20}
                color={focused ? "#0078D7" : "#94A3B8"}
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  // Regular tab icon pill
  iconWrap: {
    width: 40,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  iconWrapActive: {
    backgroundColor: "#EBF5FF",
  },

  // Center hero tab
  heroTabWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: -18, // lifts the button above the tab bar
  },
  heroIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "#0060B8",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0060B8",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  heroIconWrapActive: {
    backgroundColor: "#003E80",
    shadowOpacity: 0.6,
  },
});
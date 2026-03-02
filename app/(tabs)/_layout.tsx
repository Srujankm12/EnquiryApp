import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context"; // ✅ ADDED

export default function TabLayout() {
  const insets = useSafeAreaInsets(); // ✅ ADDED — detects system nav bar height

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#0078D7",
        tabBarInactiveTintColor: "#666",
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#E0E0E0",
          height: 60 + insets.bottom, // ✅ FIXED — adds system nav bar height automatically
          paddingBottom: 8 + insets.bottom, // ✅ FIXED — pushes icons/labels up above system buttons
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "500",
        },
      }}
    >
      {/* HOME */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={size ?? 24}
              color={color}
            />
          ),
        }}
      />

      {/* CATEGORIES */}
      <Tabs.Screen
        name="catgories"
        options={{
          title: "Categories",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "grid" : "grid-outline"}
              size={size ?? 24}
              color={color}
            />
          ),
        }}
      />

      {/* PRODUCTS */}
      <Tabs.Screen
        name="listing"
        options={{
          title: "Products",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "storefront" : "storefront-outline"}
              size={size ?? 24}
              color={color}
            />
          ),
        }}
      />

      {/* LEADS */}
      <Tabs.Screen
        name="enquiries"
        options={{
          title: "Leads",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "search" : "search-outline"}
              size={size ?? 24}
              color={color}
            />
          ),
        }}
      />

      {/* MENU */}
      <Tabs.Screen
        name="menu"
        options={{
          title: "Menu",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "menu" : "menu-outline"}
              size={size ?? 24}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}

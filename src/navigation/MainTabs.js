import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { HomeScreen } from "../screens/HomeScreen";
import { PartnersScreen } from "../screens/PartnersScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { Icon } from "../components/ui/Icon";
import { colors } from "../utils/colors";
import { useResponsive } from "../utils/useResponsive";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const Tab = createBottomTabNavigator();

export function MainTabs() {
  const { scale, vScale } = useResponsive();
  const insets = useSafeAreaInsets();
  const tabBarBottomPadding = Math.max(insets.bottom, vScale(8));
  const tabBarHeight = vScale(52) + tabBarBottomPadding;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brandRed,
        tabBarInactiveTintColor: colors.gray400,
        tabBarStyle: {
          height: tabBarHeight,
          paddingBottom: tabBarBottomPadding,
          paddingTop: vScale(6),
          backgroundColor: colors.white,
          borderTopWidth: 1,
          borderTopColor: colors.gray200,
        },
        tabBarLabelStyle: {
          fontSize: scale(9),
          fontWeight: "600",
          marginBottom: vScale(2),
        },
        tabBarIconStyle: {
          marginTop: vScale(2),
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size }) => (
            <Icon name="joystick" size={size + 8} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Partners"
        component={PartnersScreen}
        options={{
          tabBarLabel: "Partners",
          tabBarIcon: ({ color, size }) => (
            <Icon name="people" size={size + 8} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Icon name="user" size={size + 8} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

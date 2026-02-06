import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { HomeScreen } from "../screens/HomeScreen";
import { PartnersScreen } from "../screens/PartnersScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { Icon } from "../components/ui/Icon";
import { colors } from "../utils/colors";
import { useResponsive } from "../utils/useResponsive";

const Tab = createBottomTabNavigator();

export function MainTabs() {
  const { scale, vScale } = useResponsive();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brandRed,
        tabBarStyle: {
          height: vScale(44),
          paddingBottom: vScale(6),
          paddingTop: vScale(6),
        },
        tabBarLabelStyle: {
          fontSize: scale(9),
          fontWeight: "600",
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size }) => (
            <Icon name="joystick" size={size - 2} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Partners"
        component={PartnersScreen}
        options={{
          tabBarLabel: "Partners",
          tabBarIcon: ({ color, size }) => (
            <Icon name="people" size={size - 2} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Icon name="user" size={size - 2} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

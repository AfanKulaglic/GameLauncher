import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AuthStack } from "./AuthStack";
import { MainTabs } from "./MainTabs";
import { GameLobbyScreen } from "../screens/GameLobbyScreen";
import { useAuth } from "../context/AuthContext";

const Stack = createNativeStackNavigator();

function MainStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={MainTabs} />
      <Stack.Screen
        name="GameLobby"
        component={GameLobbyScreen}
        options={{ animation: "slide_from_bottom" }}
      />
    </Stack.Navigator>
  );
}

export function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) return null;

  return <NavigationContainer>{user ? <MainStack /> : <AuthStack />}</NavigationContainer>;
}

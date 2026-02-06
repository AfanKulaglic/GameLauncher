import React from "react";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "./src/context/AuthContext";
import { FriendsProvider } from "./src/context/FriendsContext";
import { RootNavigator } from "./src/navigation/RootNavigator";

export default function App() {
  return (
    <AuthProvider>
      <FriendsProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </FriendsProvider>
    </AuthProvider>
  );
}

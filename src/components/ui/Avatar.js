import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { colors } from "../../utils/colors";

export function Avatar({ uri, fallback, size = 40 }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
      ) : (
        <Text style={styles.fallback}>{fallback}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: colors.gray200,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  fallback: {
    color: colors.gray700,
    fontWeight: "700",
  },
});

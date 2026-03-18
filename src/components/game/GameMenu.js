import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors } from "../../utils/colors";

const menuItems = [
  "Achievements",
  "Friends",
  "News",
  "Game Rules",
  "Guide",
  "Info",
];

export function GameMenu({ onClose, active = "Achievements" }) {
  return (
    <View style={styles.container}>
      {menuItems.map((label) => (
        <View
          key={label}
          style={[styles.item, active === label ? styles.itemActive : null]}
        >
          <Text style={styles.itemText}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.brandRed,
    paddingHorizontal: 18,
    paddingVertical: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: 10,
  },
  item: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  itemActive: {
    backgroundColor: colors.brandRedDark,
  },
  itemText: {
    color: colors.white,
    fontWeight: "600",
    fontSize: 18,
  },
});

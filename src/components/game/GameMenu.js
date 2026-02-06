import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors } from "../../utils/colors";

const menuItems = [
  "Achievements",
  "Friends",
  "News",
  "Recent Posts",
  "Add-Ons",
  "Soundtrack",
  "Guide",
];

export function GameMenu({ onClose, active = "Achievements" }) {
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onClose} style={styles.closeRow}>
        <Text style={styles.closeText}>Close</Text>
      </TouchableOpacity>
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
  closeRow: {
    marginBottom: 8,
  },
  closeText: {
    color: colors.white,
    fontWeight: "700",
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
  },
});

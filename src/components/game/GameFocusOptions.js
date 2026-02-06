import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors } from "../../utils/colors";
import { useResponsive } from "../../utils/useResponsive";

const options = [
  "Achievements",
  "Friends",
  "News",
  "Recent Posts",
  "Add-Ons",
  "Soundtrack",
  "Guide",
];

export function GameFocusOptions({ onClose }) {
  const { scale, vScale } = useResponsive();
  const textSize = scale(9);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        speed: 40,
        bounciness: 2,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          marginTop: 0,
          paddingTop: vScale(8),
          paddingBottom: vScale(10),
          borderBottomLeftRadius: scale(20),
          borderBottomRightRadius: scale(20),
        },
      ]}
    >
      <TouchableOpacity onPress={onClose} activeOpacity={0.8}>
        <Text style={[styles.closeText, { fontSize: textSize }]}>Close</Text>
      </TouchableOpacity>
      <View style={[styles.list, { gap: vScale(4), paddingHorizontal: scale(8) }]}>
        {options.map((option, index) => (
          <View
            key={option}
            style={[
              styles.item,
              { paddingVertical: vScale(6), paddingHorizontal: scale(8) },
              index === 0 ? styles.itemActive : null,
            ]}
          >
            <Text style={[styles.itemText, { fontSize: textSize }]}>{option}</Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 0,
    backgroundColor: colors.brandRed,
    borderBottomLeftRadius: 90,
    borderBottomRightRadius: 90,
    paddingTop: 10,
    paddingBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  closeText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 10,
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  list: {
    gap: 6,
    paddingHorizontal: 10,
  },
  item: {
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  itemActive: {
    backgroundColor: colors.brandRedDark,
  },
  itemText: {
    color: colors.white,
    fontWeight: "600",
    fontSize: 10,
  },
});

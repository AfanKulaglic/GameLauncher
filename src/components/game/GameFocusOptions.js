import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../../utils/colors";
import { useResponsive } from "../../utils/useResponsive";

const options = [
  "Achievements",
  "Friends",
  "News",
  "Game Rules",
  "Guide",
  "Info",
];

export function GameFocusOptions({ onClose, onOptionPress }) {
  const { scale, vScale } = useResponsive();
  const textSize = scale(14);
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
      pointerEvents="box-none"
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
      <View pointerEvents="box-none" style={[styles.list, { gap: vScale(4), paddingHorizontal: 0 }]}>
        {options.map((option, index) => (
          <Pressable
            key={option}
            onPress={() => onOptionPress?.(option)}
            style={({ pressed }) => [
              styles.item,
              { paddingVertical: vScale(6), paddingHorizontal: scale(12), opacity: pressed ? 0.7 : 1 },
              index === 0 ? styles.itemActive : null,
            ]}
          >
            <Text style={[styles.itemText, { fontSize: textSize }]}>{option}</Text>
          </Pressable>
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
  list: {
    gap: 6,
    paddingHorizontal: 0,
  },
  item: {
    borderRadius: 0,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  itemActive: {
    backgroundColor: colors.brandRedDark,
  },
  itemText: {
    color: colors.white,
    fontWeight: "600",
    fontSize: 16,
  },
});

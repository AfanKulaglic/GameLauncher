import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { colors } from "../../utils/colors";

export function Button({
  children,
  onPress,
  style,
  textStyle,
  variant = "primary",
  size = "md",
  disabled = false,
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        styles[size],
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
        style,
      ]}
      disabled={disabled}
    >
      <Text style={[styles.text, styles[`${variant}Text`], textStyle]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primary: {
    backgroundColor: colors.brandRed,
  },
  primaryText: {
    color: colors.white,
    fontWeight: "600",
  },
  secondary: {
    backgroundColor: colors.gray100,
  },
  secondaryText: {
    color: colors.gray800,
    fontWeight: "600",
  },
  ghost: {
    backgroundColor: "transparent",
  },
  ghostText: {
    color: colors.gray700,
    fontWeight: "600",
  },
  outline: {
    borderWidth: 1,
    borderColor: colors.gray200,
    backgroundColor: "transparent",
  },
  outlineText: {
    color: colors.gray800,
    fontWeight: "600",
  },
  md: {
    paddingVertical: 12,
  },
  sm: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.6,
  },
});

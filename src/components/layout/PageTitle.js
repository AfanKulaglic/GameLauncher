import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../utils/colors";
import { useResponsive } from "../../utils/useResponsive";

export function PageTitle({ title, subtitle, style }) {
  const { scale, vScale } = useResponsive();
  const titleSize = scale(18);
  const subtitleSize = scale(12);

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.title, { fontSize: titleSize }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { fontSize: subtitleSize, marginTop: vScale(3) }]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  title: {
    fontWeight: "700",
    color: colors.gray900,
  },
  subtitle: {
    color: colors.gray600,
  },
});

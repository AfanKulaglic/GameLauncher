import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Card } from "../ui/Card";
import { Avatar } from "../ui/Avatar";
import { colors } from "../../utils/colors";
import { useResponsive } from "../../utils/useResponsive";

export function PartnerCard({ partner }) {
  const { scale, vScale } = useResponsive();
  const nameSize = scale(10);
  const metaSize = scale(9);
  const isOnline = partner.status === "online" || partner.status === "in-game";

  return (
    <Card style={[styles.card, { padding: vScale(6), gap: vScale(3) }]}>
      <View style={[styles.row, { gap: scale(4) }]}>
        <Avatar
          uri={partner.avatar}
          fallback={partner.displayName?.slice(0, 2) ?? "PR"}
          size={scale(26)}
        />
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { fontSize: nameSize }]} numberOfLines={1}>
              {partner.displayName}
            </Text>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isOnline ? "#22C55E" : "#EF4444" },
              ]}
            />
          </View>
          <Text style={[styles.meta, { fontSize: metaSize }]} numberOfLines={1}>
            {partner.status === "in-game" ? "In game" : isOnline ? "Online" : "Offline"}
          </Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 8,
    gap: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  name: {
    fontWeight: "700",
    color: colors.gray900,
    fontSize: 12,
  },
  meta: {
    fontSize: 11,
    color: colors.gray600,
  },
});

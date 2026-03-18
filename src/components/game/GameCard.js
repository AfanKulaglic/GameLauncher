import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Card } from "../ui/Card";
import { Icon } from "../ui/Icon";
import { colors } from "../../utils/colors";
import { useResponsive } from "../../utils/useResponsive";

export function GameCard({
  game,
  onPress,
  focused = false,
  cardWidth = 200,
  imageHeight = 260,
  isLastPlayed = false,
  hasLastPlayed = false,
}) {
  const { scale, vScale } = useResponsive();
  const baseFont = scale(10);
  const smallFont = scale(9);
  const badgeFont = scale(13);
  const badgeIcon = scale(11);

  const showActivityBadge = isLastPlayed || (!hasLastPlayed && game.status === "playing");
  const activityText = isLastPlayed ? "Played last time" : "Playing";

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <Card style={[styles.card, { width: cardWidth }, focused ? styles.focusedCard : null]}>
        <View style={[styles.imageWrap, { height: imageHeight }]}>
          <Image source={game.coverImage} style={styles.image} resizeMode="cover" />
          {showActivityBadge ? (
            <View style={[styles.playing, { paddingVertical: vScale(5) }]}>
              <Icon name="play" size={badgeIcon} color={colors.white} />
              <Text style={[styles.playingText, { fontSize: badgeFont }]}>{activityText}</Text>
            </View>
          ) : null}
          {game.status === "completed" ? (
            <View style={styles.completed}>
              <Text style={styles.completedText}>Completed</Text>
            </View>
          ) : null}
          <View style={styles.playersBadge}>
            <View style={styles.playersRow}>
              <Icon name="people" size={11} color={colors.white} />
              <Text style={styles.playersText}>2P</Text>
            </View>
          </View>
        </View>
        <View style={[styles.body, { padding: vScale(7) }]}>
          <Text style={[styles.title, { fontSize: baseFont }]} numberOfLines={1}>
            {game.title}
          </Text>
          <Text style={[styles.genre, { fontSize: smallFont }]} numberOfLines={1}>
            {game.genre.join(" • ")}
          </Text>
          <View style={[styles.achievements, { marginTop: vScale(5) }]}>
            <Icon name="trophy" size={smallFont} color={colors.gray600} />
            <Text style={[styles.achievementText, { fontSize: smallFont }]}>
              {game.achievements.unlocked}/{game.achievements.total}
            </Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  focusedCard: {
    borderColor: colors.brandRed,
    borderWidth: 1,
  },
  imageWrap: {
    height: 260,
    backgroundColor: colors.gray200,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  playing: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 6,
    backgroundColor: colors.brandRed,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    zIndex: 2,
  },
  playingIcon: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 10,
  },
  playingText: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 13,
  },
  completed: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: colors.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  completedText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: "700",
  },
  playersBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  playersRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  playersText: {
    color: colors.white,
    fontSize: 11,
  },
  body: {
    padding: 8,
    backgroundColor: "#ffffff",
    zIndex: 2,
  },
  title: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.gray900,
  },
  genre: {
    marginTop: 4,
    fontSize: 10,
    color: colors.gray600,
  },
  achievements: {
    marginTop: 6,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  achievementText: {
    fontSize: 10,
    color: colors.gray600,
  },
});

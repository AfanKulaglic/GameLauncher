import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PageContainer } from "../components/layout/PageContainer";
import { Header } from "../components/layout/Header";
import { GameCarousel } from "../components/game/GameCarousel";
import { GameDetailModal } from "../components/game/GameDetailModal";
import { PartnerCard } from "../components/partner/PartnerCard";
import { mockGames } from "../data/mockData";
import { colors } from "../utils/colors";
import { useResponsive } from "../utils/useResponsive";
import { useFriends } from "../context/FriendsContext";
import { useAuth } from "../context/AuthContext";

export function HomeScreen() {
  const navigation = useNavigation();
  const isFocusedScreen = useIsFocused();
  const insets = useSafeAreaInsets();
  const { scale, hScale, vScale, height } = useResponsive();
  const { user } = useAuth();
  const friendsCtx = useFriends();
  const horizontalPadding = hScale(6);
  const partnerItemWidth = hScale(110);
  const cardWidth = hScale(175);
  const sectionTitleSize = scale(10);
  const linkSize = scale(8);
  const emptyTextSize = scale(9);
  const [selectedGame, setSelectedGame] = useState(null);
  const [focusedGame, setFocusedGame] = useState(mockGames[0]);

  const featuredGames = useMemo(() => mockGames.slice(0, 5), []);
  const friendsList = friendsCtx?.friends || [];
  const matchHistory = friendsCtx?.matchHistory || [];
  const lastPlayedGameId = matchHistory[0]?.gameId || null;
  const partnersToDisplay = useMemo(() => {
    const sorted = [...friendsList].sort((a, b) => {
      const order = { online: 0, "in-game": 1, offline: 2 };
      return (order[a.status] ?? 2) - (order[b.status] ?? 2);
    });
    return sorted.slice(0, 3);
  }, [friendsList]);

  const partnerScoreMap = useMemo(() => {
    const map = {};
    if (!focusedGame?.id || !user?.id) return map;

    const gameMatches = matchHistory.filter((m) => m.gameId === focusedGame.id);

    friendsList.forEach((friend) => {
      const vsMatches = gameMatches.filter(
        (m) => m.players?.[user.id] && m.players?.[friend.id]
      );
      const myWins = vsMatches.filter((m) => m.winnerId === user.id).length;
      const myLosses = vsMatches.filter((m) => m.winnerId === friend.id).length;

      map[friend.id] = { wins: myWins, losses: myLosses };
    });

    return map;
  }, [focusedGame?.id, friendsList, matchHistory, user?.id]);

  useEffect(() => {
    if (!lastPlayedGameId) return;
    const match = featuredGames.find((g) => g.id === lastPlayedGameId);
    if (match && focusedGame?.id !== match.id) {
      setFocusedGame(match);
    }
  }, [lastPlayedGameId, featuredGames, focusedGame?.id]);

  return (
    <PageContainer>
      <Header />
      <View style={[styles.heroShell, { paddingHorizontal: horizontalPadding }]}>
        {focusedGame?.coverImage ? (
          <ImageBackground source={focusedGame.coverImage} style={styles.heroImage}>
            <View style={styles.heroOverlay} />
          </ImageBackground>
        ) : null}

        {/* Partners section */}
        <View
          style={[
            styles.heroContent,
            {
              paddingHorizontal: horizontalPadding,
              paddingTop: vScale(2),
              paddingBottom: vScale(4),
            },
          ]}
        >
          <View style={styles.partnersHeader}>
            <Text style={[styles.sectionTitle, { fontSize: sectionTitleSize }]}>Your partners</Text>
            <TouchableOpacity onPress={() => navigation.navigate("Partners")}>
              <Text style={[styles.link, { fontSize: linkSize }]}>View all partners</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            horizontal
            data={partnersToDisplay}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              styles.partnerList,
              { paddingVertical: vScale(2), gap: hScale(2) },
            ]}
            renderItem={({ item }) => (
              <View style={[styles.partnerItem, { width: partnerItemWidth }]}>
                <PartnerCard
                  partner={item}
                  score={partnerScoreMap[item.id] || { wins: 0, losses: 0 }}
                />
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyPartner}>
                <Text style={[styles.emptyPartnerText, { fontSize: emptyTextSize }]}>
                  Add your first partner to see them here.
                </Text>
              </View>
            }
          />
        </View>

        {/* Game carousel — takes remaining space */}
        <View style={styles.carouselWrap}>
          <GameCarousel
            games={featuredGames}
            onSelect={setSelectedGame}
            onFocus={setFocusedGame}
            initialGameId={lastPlayedGameId}
            lastPlayedGameId={lastPlayedGameId}
            isHomeFocused={isFocusedScreen}
            cardWidth={cardWidth}
          />
        </View>
      </View>

      <GameDetailModal
        game={selectedGame}
        visible={Boolean(selectedGame)}
        onClose={() => setSelectedGame(null)}
      />
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  heroShell: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.7)",
    overflow: "hidden",
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.2,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  heroContent: {
    paddingHorizontal: 6,
    paddingTop: 2,
    paddingBottom: 0,
  },
  partnersHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontWeight: "700",
    color: colors.gray900,
  },
  link: {
    color: colors.brandRed,
    fontWeight: "600",
  },
  partnerList: {
    paddingVertical: 2,
    gap: 2,
  },
  partnerItem: {
    width: 170,
  },
  emptyPartner: {
    padding: 4,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.gray200,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.7)",
  },
  emptyPartnerText: {
    color: colors.gray600,
  },
  carouselWrap: {
    flex: 1,
    justifyContent: "center",
  },
});

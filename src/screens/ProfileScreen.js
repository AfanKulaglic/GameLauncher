import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { PageContainer } from "../components/layout/PageContainer";
import { Header } from "../components/layout/Header";
import { PageTitle } from "../components/layout/PageTitle";
import { Card } from "../components/ui/Card";
import { Avatar } from "../components/ui/Avatar";
import { Icon } from "../components/ui/Icon";
import { colors } from "../utils/colors";
import { Button } from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";
import { useResponsive } from "../utils/useResponsive";
import { db } from "../lib/firebase";
import { onValue, ref } from "firebase/database";

function InfoRow({ label, value, scale }) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { fontSize: scale(9) }]}>{label}</Text>
      <Text style={[styles.infoValue, { fontSize: scale(10) }]}>{value}</Text>
    </View>
  );
}

export function ProfileScreen() {
  const { scale, vScale } = useResponsive();
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [overallStats, setOverallStats] = useState(null);
  const [gameStats, setGameStats] = useState([]);

  useEffect(() => {
    if (!user?.id) {
      setProfile(null);
      setOverallStats(null);
      setGameStats([]);
      return;
    }

    const userRef = ref(db, `users/${user.id}`);
    const statsRef = ref(db, `userStats/${user.id}`);
    const gamesRef = ref(db, `gameStats/${user.id}`);

    const unsubUser = onValue(userRef, (snapshot) => {
      setProfile(snapshot.val() || null);
    });

    const unsubStats = onValue(statsRef, (snapshot) => {
      setOverallStats(snapshot.val() || null);
    });

    const unsubGames = onValue(gamesRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setGameStats([]);
        return;
      }
      const list = Object.entries(data).map(([id, val]) => ({ id, ...val }));
      setGameStats(list);
    });

    return () => {
      unsubUser();
      unsubStats();
      unsubGames();
    };
  }, [user?.id]);

  const createdAtLabel = useMemo(() => {
    const ts = profile?.createdAt;
    if (!ts) return "—";
    const date = new Date(ts);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString();
  }, [profile?.createdAt]);

  const displayName = profile?.displayName || user?.displayName || "Player";
  const email = profile?.email || user?.email || "—";
  const avatar = profile?.avatar || null;

  const overallStatItems = useMemo(() => {
    const items = [
      { label: "Total Games", value: overallStats?.totalGames },
      { label: "Achievements", value: overallStats?.totalAchievements },
      { label: "Hours Played", value: overallStats?.hoursPlayed },
      { label: "Completed", value: overallStats?.gamesCompleted },
      { label: "Achievement Points", value: overallStats?.achievementPoints },
      { label: "Favorite Genre", value: overallStats?.favoriteGenre },
    ];
    return items.filter((item) => item.value !== undefined && item.value !== null);
  }, [overallStats]);

  return (
    <PageContainer>
      <Header />
      <ScrollView contentContainerStyle={[styles.scroll, { padding: vScale(12) }]}>
        <PageTitle title="Profile" subtitle="Manage your co-op identity" />

        {!user ? (
          <Card style={[styles.noticeCard, { padding: vScale(16) }]}>
            <Icon name="lock" size={scale(20)} color={colors.gray500} />
            <Text style={[styles.noticeText, { fontSize: scale(11) }]}>
              Sign in to view your profile details and stats.
            </Text>
          </Card>
        ) : (
          <View style={styles.grid}>
            <Card style={[styles.profileCard, { padding: vScale(16) }]}>
              <Avatar uri={avatar} fallback={displayName.slice(0, 2)} size={scale(64)} />
              <Text style={[styles.name, { fontSize: scale(14) }]}>{displayName}</Text>
              <Text style={[styles.handle, { fontSize: scale(10) }]}>{email}</Text>

              <View style={[styles.infoList, { marginTop: vScale(10) }]}>
                <InfoRow label="Created" value={createdAtLabel} scale={scale} />
              </View>

              <Button variant="outline" onPress={logout} style={styles.logoutButton}>
                Sign out
              </Button>
            </Card>

            <View>
              <Text style={[styles.sectionTitle, { fontSize: scale(11) }]}>Overall stats</Text>
              {overallStatItems.length === 0 ? (
                <Card style={[styles.emptyCard, { padding: vScale(12) }]}> 
                  <Text style={[styles.emptyText, { fontSize: scale(9) }]}>No overall stats yet.</Text>
                </Card>
              ) : (
                <View style={styles.statsGrid}>
                  {overallStatItems.map((item) => (
                    <Card key={item.label} style={[styles.statCard, { padding: vScale(12) }]}>
                      <Text style={[styles.statLabel, { fontSize: scale(9) }]}>{item.label}</Text>
                      <Text style={[styles.statValue, { fontSize: scale(16) }]}>{item.value}</Text>
                    </Card>
                  ))}
                </View>
              )}
            </View>

            <View>
              <Text style={[styles.sectionTitle, { fontSize: scale(11) }]}>Game stats</Text>
              {gameStats.length === 0 ? (
                <Card style={[styles.emptyCard, { padding: vScale(12) }]}> 
                  <Text style={[styles.emptyText, { fontSize: scale(9) }]}>
                    No per-game stats yet.
                  </Text>
                </Card>
              ) : (
                <View style={[styles.gameStatsList, { gap: vScale(10) }]}> 
                  {gameStats.map((game) => {
                    const fields = [
                      { label: "Hours", value: game.hoursPlayed },
                      { label: "Matches", value: game.matches },
                      { label: "Wins", value: game.wins },
                      { label: "Achievements", value: game.achievements },
                      { label: "Last Played", value: game.lastPlayed },
                    ].filter((item) => item.value !== undefined && item.value !== null);

                    return (
                      <Card key={game.id} style={[styles.gameCard, { padding: vScale(12) }]}>
                        <View style={styles.gameHeader}>
                          <Text style={[styles.gameTitle, { fontSize: scale(11) }]}>
                            {game.title || game.name || game.id}
                          </Text>
                          {game.platform ? (
                            <Text style={[styles.gamePlatform, { fontSize: scale(8) }]}>
                              {game.platform}
                            </Text>
                          ) : null}
                        </View>
                        {fields.length === 0 ? (
                          <Text style={[styles.emptyText, { fontSize: scale(9) }]}>No stats yet.</Text>
                        ) : (
                          <View style={styles.gameStatGrid}>
                            {fields.map((item) => (
                              <View key={item.label} style={styles.gameStatItem}>
                                <Text style={[styles.gameStatLabel, { fontSize: scale(8) }]}>
                                  {item.label}
                                </Text>
                                <Text style={[styles.gameStatValue, { fontSize: scale(10) }]}>
                                  {item.value}
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </Card>
                    );
                  })}
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  grid: {
    gap: 16,
  },
  noticeCard: {
    alignItems: "center",
    gap: 8,
  },
  noticeIcon: {},
  noticeText: {
    color: colors.gray600,
    textAlign: "center",
  },
  profileCard: {
    padding: 20,
    alignItems: "center",
    gap: 10,
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.gray900,
  },
  handle: {
    color: colors.gray500,
    fontSize: 12,
  },
  infoList: {
    width: "100%",
    gap: 6,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 2,
  },
  infoLabel: {
    color: colors.gray500,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  infoValue: {
    color: colors.gray900,
    fontWeight: "600",
  },
  logoutButton: {
    marginTop: 8,
    width: "100%",
  },
  sectionTitle: {
    color: colors.gray700,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    flexBasis: "48%",
    padding: 16,
  },
  statLabel: {
    fontSize: 11,
    color: colors.gray500,
  },
  statValue: {
    marginTop: 6,
    fontSize: 20,
    fontWeight: "700",
    color: colors.gray900,
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  emptyText: {
    color: colors.gray500,
    textAlign: "center",
  },
  gameStatsList: {
    gap: 12,
  },
  gameCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  gameHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  gameTitle: {
    fontWeight: "700",
    color: colors.gray900,
  },
  gamePlatform: {
    color: colors.gray500,
  },
  gameStatGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  gameStatItem: {
    minWidth: "45%",
  },
  gameStatLabel: {
    color: colors.gray500,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  gameStatValue: {
    color: colors.gray900,
    fontWeight: "700",
    marginTop: 2,
  },
});

import React, { useEffect, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../utils/colors";
import { Icon } from "../components/ui/Icon";
import { Avatar } from "../components/ui/Avatar";
import { useFriends } from "../context/FriendsContext";
import { useAuth } from "../context/AuthContext";
import { db } from "../lib/firebase";
import { ref, onValue } from "firebase/database";

function PlayerSlot({ player, isHost, label }) {
  if (!player) {
    return (
      <View style={slotStyles.card}>
        <View style={slotStyles.emptyAvatar}>
          <Icon name="clock" size={20} color={colors.gray300} />
        </View>
        <Text style={slotStyles.emptyName}>{label || "Waiting..."}</Text>
        <View style={slotStyles.statusPill}>
          <View style={[slotStyles.statusDot, { backgroundColor: colors.gray300 }]} />
          <Text style={slotStyles.statusText}>Pending</Text>
        </View>
      </View>
    );
  }

  const statusColor =
    player.status === "in-lobby" ? "#22C55E" : player.status === "accepted" ? "#F59E0B" : colors.gray300;
  const statusLabel =
    player.status === "in-lobby" ? "In Lobby" : player.status === "accepted" ? "Joining..." : "Pending";

  return (
    <View style={[slotStyles.card, player.status === "in-lobby" && slotStyles.cardActive]}>
      <View style={slotStyles.avatarWrap}>
        <Avatar uri={player.avatar} size={48} />
        {isHost && (
          <View style={slotStyles.hostBadge}>
            <Icon name="trophy" size={8} color={colors.white} />
          </View>
        )}
      </View>
      <Text style={slotStyles.name} numberOfLines={1}>{player.name}</Text>
      <View style={slotStyles.statusPill}>
        <View style={[slotStyles.statusDot, { backgroundColor: statusColor }]} />
        <Text style={slotStyles.statusText}>{statusLabel}</Text>
      </View>
    </View>
  );
}

const slotStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.gray200,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardActive: {
    borderColor: "rgba(225,29,72,0.2)",
    backgroundColor: "rgba(225,29,72,0.02)",
  },
  avatarWrap: {
    position: "relative",
  },
  hostBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.brandRed,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.white,
  },
  emptyAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.gray100,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.gray200,
  },
  name: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.gray900,
    textAlign: "center",
  },
  emptyName: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.gray400,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: colors.gray50,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 9,
    fontWeight: "600",
    color: colors.gray500,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
});

export function GameLobbyScreen({ route }) {
  const { lobbyId } = route?.params || {};
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { user } = useAuth();
  const friendsCtx = useFriends();
  const lobby = friendsCtx?.activeLobby;

  // If we got here from accepting an invite and lobby wasn't set yet, listen to it
  useEffect(() => {
    if (!lobbyId) return;
    if (lobby?.lobbyId === lobbyId) return;

    // Load the lobby data
    const lobbyRef = ref(db, `gameLobbies/${lobbyId}`);
    const unsub = onValue(lobbyRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        friendsCtx?.setActiveLobby?.(data);
      }
    });
    return () => unsub();
  }, [lobbyId]);

  const isSmall = height < 700;

  const gameTitle = lobby?.gameTitle || "Game";
  const hostId = lobby?.hostId;
  const players = lobby?.players || {};
  const invited = lobby?.invited || {};

  // Build player slots
  const allSlots = useMemo(() => {
    const slots = [];

    // Players already in lobby
    Object.entries(players).forEach(([uid, data]) => {
      slots.push({
        uid,
        name: data.name,
        avatar: data.avatar,
        status: "in-lobby",
        isHost: uid === hostId,
      });
    });

    // Invited but not yet joined
    Object.entries(invited).forEach(([uid, data]) => {
      if (!players[uid] && data.status !== "declined") {
        slots.push({
          uid,
          name: data.name,
          avatar: data.avatar,
          status: data.status || "pending",
          isHost: false,
        });
      }
    });

    return slots;
  }, [players, invited, hostId]);

  const inLobbyCount = Object.keys(players).length;
  const pendingCount = allSlots.filter((s) => s.status === "pending").length;

  const handleLeave = async () => {
    await friendsCtx?.leaveLobby?.();
    navigation.goBack();
  };

  if (!lobby) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.centered}>
          <Icon name="clock" size={32} color={colors.gray300} />
          <Text style={styles.emptyTitle}>Loading lobby...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Pressable onPress={handleLeave} style={styles.backBtn}>
          <Icon name="close" size={18} color={colors.gray700} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerSub}>GAME LOBBY</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>{gameTitle}</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* ── Status bar ── */}
      <View style={styles.statusBar}>
        <View style={styles.statusItem}>
          <View style={[styles.statusIndicator, { backgroundColor: "#22C55E" }]} />
          <Text style={styles.statusItemText}>{inLobbyCount} in lobby</Text>
        </View>
        {pendingCount > 0 && (
          <View style={styles.statusItem}>
            <View style={[styles.statusIndicator, { backgroundColor: "#F59E0B" }]} />
            <Text style={styles.statusItemText}>{pendingCount} pending</Text>
          </View>
        )}
      </View>

      {/* ── Player cards ── */}
      <View style={styles.playersSection}>
        <Text style={styles.sectionLabel}>PLAYERS</Text>
        <View style={styles.playersRow}>
          {allSlots.map((slot) => (
            <PlayerSlot
              key={slot.uid}
              player={slot}
              isHost={slot.isHost}
            />
          ))}
          {allSlots.length < 2 && (
            <PlayerSlot player={null} label="Waiting for player..." />
          )}
        </View>
      </View>

      {/* ── Waiting message ── */}
      <View style={styles.waitingSection}>
        {inLobbyCount < 2 ? (
          <>
            <View style={styles.waitingIconWrap}>
              <Icon name="clock" size={28} color={colors.brandRed} />
            </View>
            <Text style={styles.waitingTitle}>Waiting for partner</Text>
            <Text style={styles.waitingSubtext}>
              Your invitation has been sent. They'll appear here when they join.
            </Text>
          </>
        ) : (
          <>
            <View style={[styles.waitingIconWrap, { backgroundColor: "rgba(34,197,94,0.1)" }]}>
              <Icon name="check" size={28} color="#22C55E" />
            </View>
            <Text style={styles.waitingTitle}>Everyone's here!</Text>
            <Text style={styles.waitingSubtext}>
              All players have joined the lobby. Ready to start!
            </Text>
          </>
        )}
      </View>

      {/* ── Bottom actions ── */}
      <View style={[styles.actions, { paddingBottom: insets.bottom + 12 }]}>
        {user?.id === hostId && inLobbyCount >= 2 && (
          <Pressable
            style={({ pressed }) => [styles.startBtn, pressed && { opacity: 0.85 }]}
            onPress={() => {
              // TODO: Start the game
            }}
          >
            <Icon name="play" size={16} color={colors.white} />
            <Text style={styles.startBtnText}>Start Game</Text>
          </Pressable>
        )}
        <Pressable
          style={({ pressed }) => [styles.leaveBtn, pressed && { opacity: 0.85 }]}
          onPress={handleLeave}
        >
          <Text style={styles.leaveBtnText}>Leave Lobby</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray100,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.gray400,
  },

  /* ── Header ── */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    alignItems: "center",
  },
  headerSub: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.gray400,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.gray900,
    marginTop: 1,
  },

  /* ── Status bar ── */
  statusBar: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    paddingVertical: 10,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  statusItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusItemText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.gray600,
  },

  /* ── Players section ── */
  playersSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.gray400,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  playersRow: {
    flexDirection: "row",
    gap: 12,
  },

  /* ── Waiting ── */
  waitingSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 8,
  },
  waitingIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(225,29,72,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  waitingTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.gray900,
  },
  waitingSubtext: {
    fontSize: 12,
    color: colors.gray500,
    textAlign: "center",
    lineHeight: 18,
  },

  /* ── Actions ── */
  actions: {
    paddingHorizontal: 16,
    gap: 8,
  },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.brandRed,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: colors.brandRed,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  startBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "700",
  },
  leaveBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  leaveBtnText: {
    color: colors.gray600,
    fontSize: 14,
    fontWeight: "600",
  },
});

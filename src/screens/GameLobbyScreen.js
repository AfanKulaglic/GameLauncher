import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Alert,
  ScrollView,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Icon } from "../components/ui/Icon";
import { Avatar } from "../components/ui/Avatar";
import { useFriends } from "../context/FriendsContext";
import { useAuth } from "../context/AuthContext";
import { useResponsive } from "../utils/useResponsive";
import { colors } from "../utils/colors";
import { db } from "../lib/firebase";
import { ref, onValue, update, set, push, serverTimestamp } from "firebase/database";

const gameScreenMap = {
  "1": "Battleship",
  "3": "Slagalica",
  "4": "Ludo",
};

const gameMaxPlayers = {
  "1": 2,
  "3": 2,
  "4": 4,
};

function PlayerSlot({ player, isHost, label, s }) {
  const avatarSize = s(54);
  const badgeSize = s(20);

  if (!player) {
    return (
      <View style={ps.card}>
        <View style={[ps.emptyAvatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}>
          <Icon name="clock" size={s(18)} color={colors.gray400} />
        </View>
        <Text style={[ps.emptyName, { fontSize: s(11) }]}>{label || "Waiting..."}</Text>
        <View style={ps.statusPill}>
          <View style={[ps.statusDot, { backgroundColor: colors.gray400 }]} />
          <Text style={[ps.statusText, { fontSize: s(8) }]}>PENDING</Text>
        </View>
      </View>
    );
  }

  const isReady = player.status === "in-lobby";
  const isJoining = player.status === "accepted";
  const dotColor = isReady ? colors.success : isJoining ? "#F59E0B" : colors.gray400;
  const statusLabel = isReady ? "READY" : isJoining ? "JOINING" : "PENDING";
  const glowBg = isReady ? "rgba(16,185,129,0.12)" : isJoining ? "rgba(245,158,11,0.12)" : colors.gray100;

  return (
    <View style={[ps.card, isReady && ps.cardReady]}>
      <View style={[ps.avatarRing, { width: avatarSize + s(8), height: avatarSize + s(8), borderRadius: (avatarSize + s(8)) / 2, borderColor: isReady ? colors.success : isJoining ? "#F59E0B" : colors.gray200, shadowColor: dotColor }]}>
        <Avatar uri={player.avatar} size={avatarSize} />
        {isHost && (
          <View style={[ps.hostBadge, { width: badgeSize, height: badgeSize, borderRadius: badgeSize / 2 }]}>
            <Text style={{ fontSize: s(9) }}>👑</Text>
          </View>
        )}
      </View>
      <Text style={[ps.name, { fontSize: s(12) }]} numberOfLines={1}>{player.name}</Text>
      <View style={[ps.statusPill, { backgroundColor: glowBg }]}>
        <View style={[ps.statusDot, { backgroundColor: dotColor }]} />
        <Text style={[ps.statusText, { fontSize: s(8), color: dotColor }]}>{statusLabel}</Text>
      </View>
    </View>
  );
}

const ps = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.gray200,
    paddingVertical: 18,
    paddingHorizontal: 10,
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  cardReady: {
    borderColor: "rgba(16,185,129,0.35)",
    shadowColor: colors.success,
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  avatarRing: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
    position: "relative",
  },
  hostBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#F59E0B",
  },
  emptyAvatar: {
    backgroundColor: colors.gray100,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.gray300,
  },
  name: {
    fontWeight: "700",
    color: colors.gray900,
    textAlign: "center",
  },
  emptyName: {
    fontWeight: "600",
    color: colors.gray400,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: colors.gray100,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: {
    fontWeight: "700",
    color: colors.gray400,
    letterSpacing: 0.8,
  },
});

export function GameLobbyScreen({ route }) {
  const { lobbyId } = route?.params || {};
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { scale, vScale, hScale } = useResponsive();
  const { user } = useAuth();
  const friendsCtx = useFriends();
  const lobby = friendsCtx?.activeLobby;
  const [inviteModalVisible, setInviteModalVisible] = useState(false);

  useEffect(() => {
    if (!lobbyId) return;
    if (lobby?.lobbyId === lobbyId) return;
    const lobbyRef = ref(db, `gameLobbies/${lobbyId}`);
    const unsub = onValue(lobbyRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        friendsCtx?.setActiveLobby?.(data);
      }
    });
    return () => unsub();
  }, [lobbyId]);

  const gameTitle = lobby?.gameTitle || "Game";
  const hostId = lobby?.hostId;
  const players = lobby?.players || {};
  const invited = lobby?.invited || {};
  const maxPlayers = gameMaxPlayers[lobby?.gameId] || 2;

  const allSlots = useMemo(() => {
    const slots = [];
    Object.entries(players).forEach(([uid, data]) => {
      slots.push({ uid, name: data.name, avatar: data.avatar, status: "in-lobby", isHost: uid === hostId });
    });
    Object.entries(invited).forEach(([uid, data]) => {
      if (!players[uid] && data.status !== "declined") {
        slots.push({ uid, name: data.name, avatar: data.avatar, status: data.status || "pending", isHost: false });
      }
    });
    return slots;
  }, [players, invited, hostId]);

  const inLobbyCount = Object.keys(players).length;
  const pendingCount = allSlots.filter((s) => s.status === "pending").length;
  const emptySlots = Math.max(0, maxPlayers - allSlots.length);
  const isHost = user?.id === hostId;

  const invitableFriends = useMemo(() => {
    if (!friendsCtx?.friends) return [];
    const taken = new Set([...Object.keys(players), ...Object.keys(invited)]);
    return friendsCtx.friends.filter((f) => !taken.has(f.id));
  }, [friendsCtx?.friends, players, invited]);

  const handleInviteFriend = useCallback(async (friend) => {
    if (!lobby?.lobbyId || !user?.id) return;
    try {
      await set(ref(db, `gameLobbies/${lobby.lobbyId}/invited/${friend.id}`), {
        name: friend.displayName || "Player",
        avatar: friend.avatar || "",
        status: "pending",
        invitedAt: serverTimestamp(),
      });
      const invRef = ref(db, `gameInvites/${friend.id}`);
      const newInv = push(invRef);
      await set(newInv, {
        type: "game_invite",
        lobbyId: lobby.lobbyId,
        gameId: lobby.gameId,
        gameTitle: lobby.gameTitle,
        from: user.id,
        fromName: user.displayName || "Player",
        fromAvatar: `https://api.dicebear.com/7.x/avataaars/png?seed=${user.id}`,
        timestamp: serverTimestamp(),
      });
      setInviteModalVisible(false);
    } catch (err) {
      Alert.alert("Error", "Failed to send invite.");
    }
  }, [lobby, user]);

  const handleLeave = async () => {
    await friendsCtx?.leaveLobby?.();
    navigation.goBack();
  };

  const handleStartGame = async () => {
    if (!lobby?.lobbyId || !user?.id) return;
    if (user.id !== hostId || inLobbyCount < 2) return;
    const screenName = gameScreenMap[lobby.gameId];
    if (!screenName) {
      Alert.alert("Game not wired", "This game does not have a screen configured yet.");
      return;
    }
    try {
      await update(ref(db, `gameLobbies/${lobby.lobbyId}`), {
        status: "started",
        startedAt: Date.now(),
        startedBy: user.id,
      });
    } catch (err) {
      Alert.alert("Unable to start", "Failed to start the game. Please try again.");
    }
  };

  useEffect(() => {
    if (lobby?.status !== "started") return;
    const screenName = gameScreenMap[lobby?.gameId];
    if (!screenName || !lobby?.lobbyId) return;
    navigation.replace(screenName, { lobbyId: lobby.lobbyId });
  }, [lobby?.status, lobby?.gameId, lobby?.lobbyId, navigation]);

  const ready = inLobbyCount >= 2;
  const full = inLobbyCount >= maxPlayers;

  if (!lobby) {
    return (
      <View style={[st.container, { paddingTop: insets.top }]}>
        <View style={st.centered}>
          <Icon name="clock" size={scale(28)} color={colors.gray400} />
          <Text style={[st.loadingText, { fontSize: scale(13) }]}>Loading lobby...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[st.container, { paddingTop: insets.top }]}>

      {/* ── Header ── */}
      <View style={[st.header, { paddingHorizontal: hScale(16), paddingVertical: vScale(12) }]}>
        <Pressable onPress={handleLeave} style={[st.backBtn, { width: scale(34), height: scale(34), borderRadius: scale(11) }]}>
          <Icon name="close" size={scale(14)} color={colors.gray500} />
        </Pressable>
        <View style={st.headerCenter}>
          <Text style={[st.headerKicker, { fontSize: scale(9) }]}>GAME LOBBY</Text>
          <Text style={[st.headerTitle, { fontSize: scale(16) }]} numberOfLines={1}>{gameTitle}</Text>
        </View>
        {isHost && invitableFriends.length > 0 ? (
          <Pressable onPress={() => setInviteModalVisible(true)} style={[st.inviteHeaderBtn, { width: scale(34), height: scale(34), borderRadius: scale(11) }]}>
            <Icon name="people" size={scale(14)} color={colors.brandRed} />
          </Pressable>
        ) : (
          <View style={{ width: scale(34) }} />
        )}
      </View>

      {/* ── Status pills ── */}
      <View style={[st.statusBar, { paddingVertical: vScale(8), paddingHorizontal: hScale(16), gap: hScale(10) }]}>
        <View style={[st.pill, { backgroundColor: "rgba(16,185,129,0.12)" }]}>
          <View style={[st.pillDot, { backgroundColor: colors.success }]} />
          <Text style={[st.pillText, { fontSize: scale(10), color: colors.success }]}>{inLobbyCount}/{maxPlayers} Ready</Text>
        </View>
        {pendingCount > 0 && (
          <View style={[st.pill, { backgroundColor: "rgba(245,158,11,0.12)" }]}>
            <View style={[st.pillDot, { backgroundColor: "#F59E0B" }]} />
            <Text style={[st.pillText, { fontSize: scale(10), color: "#F59E0B" }]}>{pendingCount} Pending</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={[st.body, { paddingHorizontal: hScale(16) }]} showsVerticalScrollIndicator={false}>

        {/* ── Player cards ── */}
        <Text style={[st.sectionLabel, { fontSize: scale(10), marginTop: vScale(16), marginBottom: vScale(10) }]}>PLAYERS</Text>

        {maxPlayers <= 2 ? (
          <View style={[st.vsRow, { gap: hScale(12) }]}>
            {allSlots.map((slot) => (
              <View key={slot.uid} style={{ flex: 1 }}>
                <PlayerSlot player={slot} isHost={slot.isHost} s={scale} />
              </View>
            ))}
            {emptySlots > 0 && Array.from({ length: emptySlots }).map((_, i) => (
              <Pressable key={`e-${i}`} style={{ flex: 1 }} onPress={isHost ? () => setInviteModalVisible(true) : undefined}>
                <PlayerSlot player={null} label={isHost ? "Tap to invite" : "Waiting..."} s={scale} />
              </Pressable>
            ))}
            {allSlots.length >= 1 && (allSlots.length + emptySlots >= 2) && (
              <View style={[st.vsBadge, { width: scale(36), height: scale(36), borderRadius: scale(18) }]} pointerEvents="none">
                <Text style={[st.vsText, { fontSize: scale(12) }]}>VS</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={[st.gridWrap, { gap: hScale(10) }]}>
            {allSlots.map((slot) => (
              <View key={slot.uid} style={st.gridItem}>
                <PlayerSlot player={slot} isHost={slot.isHost} s={scale} />
              </View>
            ))}
            {Array.from({ length: emptySlots }).map((_, i) => (
              <Pressable key={`e-${i}`} style={st.gridItem} onPress={isHost ? () => setInviteModalVisible(true) : undefined}>
                <PlayerSlot player={null} label={isHost ? "Tap to invite" : "Waiting..."} s={scale} />
              </Pressable>
            ))}
          </View>
        )}

        {/* ── Status message ── */}
        <View style={[st.statusSection, { marginTop: vScale(28), gap: vScale(8), paddingHorizontal: hScale(12) }]}>
          <View style={[st.statusIcon, {
            width: scale(52), height: scale(52), borderRadius: scale(26),
            backgroundColor: ready ? "rgba(16,185,129,0.12)" : "rgba(225,29,72,0.10)",
            borderColor: ready ? colors.success : colors.brandRed,
          }]}>
            {ready
              ? <Text style={{ fontSize: scale(22) }}>✓</Text>
              : <Icon name="clock" size={scale(22)} color={colors.brandRed} />}
          </View>
          <Text style={[st.statusTitle, { fontSize: scale(16) }]}>
            {full ? "Everyone's here!" : ready ? "Ready to start!" : "Waiting for players"}
          </Text>
          <Text style={[st.statusSub, { fontSize: scale(11), lineHeight: scale(17) }]}>
            {full
              ? "All players have joined. Let's go!"
              : ready
              ? `${inLobbyCount}/${maxPlayers} joined. Start now or invite more.`
              : maxPlayers > 2
              ? `Need at least 2 of ${maxPlayers} players to start.`
              : "Invitation sent. They'll appear when they join."}
          </Text>
        </View>
      </ScrollView>

      {/* ── Bottom actions ── */}
      <View style={[st.actions, { paddingHorizontal: hScale(16), paddingBottom: insets.bottom + vScale(12), gap: vScale(8) }]}>
        {isHost && ready && (
          <Pressable style={({ pressed }) => [st.startBtn, { paddingVertical: vScale(14), borderRadius: scale(14) }, pressed && { opacity: 0.85 }]} onPress={handleStartGame}>
            <Icon name="play" size={scale(16)} color={colors.white} />
            <Text style={[st.startText, { fontSize: scale(14) }]}>Start Game</Text>
          </Pressable>
        )}
        <Pressable style={({ pressed }) => [st.leaveBtn, { paddingVertical: vScale(12), borderRadius: scale(14) }, pressed && { opacity: 0.85 }]} onPress={handleLeave}>
          <Text style={[st.leaveText, { fontSize: scale(13) }]}>Leave Lobby</Text>
        </Pressable>
      </View>

      {/* ── Invite modal ── */}
      <Modal visible={inviteModalVisible} transparent animationType="slide" onRequestClose={() => setInviteModalVisible(false)}>
        <View style={st.modalOverlay}>
          <View style={[st.modalContent, { paddingBottom: insets.bottom + vScale(16) }]}>
            <View style={[st.modalHeader, { paddingHorizontal: hScale(20), paddingVertical: vScale(14) }]}>
              <Text style={[st.modalTitle, { fontSize: scale(15) }]}>Invite a Friend</Text>
              <Pressable onPress={() => setInviteModalVisible(false)} style={[st.modalCloseBtn, { width: scale(30), height: scale(30), borderRadius: scale(15) }]}>
                <Icon name="close" size={scale(13)} color={colors.gray500} />
              </Pressable>
            </View>
            <ScrollView style={{ paddingHorizontal: hScale(16) }}>
              {invitableFriends.length === 0 ? (
                <Text style={[st.modalEmpty, { fontSize: scale(12), paddingVertical: vScale(24) }]}>No friends available to invite</Text>
              ) : (
                invitableFriends.map((friend) => (
                  <Pressable key={friend.id} style={({ pressed }) => [st.modalRow, { paddingVertical: vScale(10), gap: hScale(12) }, pressed && { opacity: 0.7 }]} onPress={() => handleInviteFriend(friend)}>
                    <Avatar uri={friend.avatar} size={scale(36)} />
                    <Text style={[st.modalFriendName, { fontSize: scale(13) }]} numberOfLines={1}>{friend.displayName}</Text>
                    <View style={[st.modalInvBtn, { paddingHorizontal: hScale(14), paddingVertical: vScale(6), borderRadius: scale(10) }]}>
                      <Text style={[st.modalInvText, { fontSize: scale(11) }]}>Invite</Text>
                    </View>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray100 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  loadingText: { fontWeight: "600", color: colors.gray400 },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderBottomWidth: 1, borderBottomColor: colors.gray200,
    backgroundColor: colors.white,
  },
  backBtn: { backgroundColor: colors.gray100, alignItems: "center", justifyContent: "center" },
  inviteHeaderBtn: { backgroundColor: "rgba(225,29,72,0.08)", alignItems: "center", justifyContent: "center" },
  headerCenter: { alignItems: "center", flex: 1 },
  headerKicker: { fontWeight: "800", color: colors.brandRed, letterSpacing: 2, textTransform: "uppercase" },
  headerTitle: { fontWeight: "800", color: colors.gray900, marginTop: 2 },

  statusBar: {
    flexDirection: "row", justifyContent: "center",
    borderBottomWidth: 1, borderBottomColor: colors.gray200,
    backgroundColor: colors.white,
  },
  pill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
  },
  pillDot: { width: 7, height: 7, borderRadius: 4 },
  pillText: { fontWeight: "700" },

  body: { flexGrow: 1 },
  sectionLabel: { fontWeight: "800", color: colors.gray400, letterSpacing: 1.5, textTransform: "uppercase" },

  vsRow: { flexDirection: "row", position: "relative" },
  vsBadge: {
    position: "absolute", left: "50%", top: "50%",
    marginLeft: -18, marginTop: -18,
    backgroundColor: colors.brandRed, alignItems: "center", justifyContent: "center",
    shadowColor: colors.brandRed, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 0 },
    elevation: 5, zIndex: 10,
  },
  vsText: { fontWeight: "900", color: colors.white, letterSpacing: 1 },

  gridWrap: { flexDirection: "row", flexWrap: "wrap" },
  gridItem: { width: "48%" },

  statusSection: { alignItems: "center" },
  statusIcon: { alignItems: "center", justifyContent: "center", borderWidth: 2 },
  statusTitle: { fontWeight: "700", color: colors.gray900 },
  statusSub: { color: colors.gray500, textAlign: "center" },

  actions: {},
  startBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: colors.success,
    shadowColor: colors.success, shadowOpacity: 0.3, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },
  startText: { color: colors.white, fontWeight: "800" },
  leaveBtn: {
    alignItems: "center", justifyContent: "center",
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray200,
  },
  leaveText: { color: colors.gray500, fontWeight: "600" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "60%" },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderBottomWidth: 1, borderBottomColor: colors.gray200,
  },
  modalTitle: { fontWeight: "700", color: colors.gray900 },
  modalCloseBtn: { backgroundColor: colors.gray100, alignItems: "center", justifyContent: "center" },
  modalEmpty: { textAlign: "center", fontWeight: "600", color: colors.gray400 },
  modalRow: {
    flexDirection: "row", alignItems: "center",
    borderBottomWidth: 1, borderBottomColor: colors.gray100,
  },
  modalFriendName: { flex: 1, fontWeight: "600", color: colors.gray900 },
  modalInvBtn: { backgroundColor: colors.brandRed },
  modalInvText: { color: colors.white, fontWeight: "700" },
});

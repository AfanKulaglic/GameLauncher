import React, { useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Icon } from "../ui/Icon";
import { colors } from "../../utils/colors";
import { appName } from "../../utils/constants";
import { useResponsive } from "../../utils/useResponsive";
import { useFriends } from "../../context/FriendsContext";
import { Avatar } from "../ui/Avatar";

export function Header() {
  const { scale, vScale, hScale } = useResponsive();
  const friends = useFriends();
  const navigation = useNavigation();
  const incomingRequests = friends?.incomingRequests || [];
  const notifications = friends?.notifications || [];
  const gameInvites = friends?.gameInvites || [];
  const [showNotifications, setShowNotifications] = useState(false);

  const displayItems = [
    ...incomingRequests.map((req) => ({
      id: req.id,
      type: "friend_request",
      from: req.from,
      fromName: req.fromName,
      fromAvatar: req.fromAvatar,
      timestamp: req.timestamp,
    })),
    ...notifications.map((notif) => ({
      id: notif.id,
      type: notif.type || "notification",
      from: notif.from,
      fromName: notif.fromName,
      fromAvatar: notif.fromAvatar,
      timestamp: notif.timestamp,
    })),
    ...gameInvites.map((inv) => ({
      id: inv.id,
      type: "game_invite",
      from: inv.from,
      fromName: inv.fromName,
      fromAvatar: inv.fromAvatar,
      timestamp: inv.timestamp,
      lobbyId: inv.lobbyId,
      gameTitle: inv.gameTitle,
      gameId: inv.gameId,
    })),
  ].sort((a, b) => {
    const ta = a.timestamp || 0;
    const tb = b.timestamp || 0;
    return tb - ta;
  });

  const requestCount = displayItems.length;

  return (
    <>
      <View
        style={[
          styles.header,
          { paddingHorizontal: scale(12), paddingVertical: vScale(8) },
        ]}
      >
        <View style={styles.brandRow}>
          <View
            style={[
              styles.logo,
              {
                width: scale(32),
                height: scale(32),
                borderRadius: scale(10),
              },
            ]}
          >
            <Text style={[styles.logoText, { fontSize: scale(11) }]}>
              {appName.slice(0, 2)}
            </Text>
          </View>
          <View>
            <Text style={[styles.tagline, { fontSize: scale(8) }]}>Partner Launcher</Text>
            <Text style={[styles.title, { fontSize: scale(12) }]}>{appName}</Text>
          </View>
        </View>
        <View style={styles.badges}>
          <View
            style={[
              styles.badge,
              { width: scale(36), height: scale(36), borderRadius: scale(14) },
            ]}
          >
            <Icon name="people" size={scale(22)} color={colors.gray700} />
          </View>
          <TouchableOpacity
            onPress={() => setShowNotifications(true)}
            style={[
              styles.badge,
              { width: scale(36), height: scale(36), borderRadius: scale(14) },
            ]}
          >
            <Icon name="bell" size={scale(22)} color={colors.gray700} />
            {requestCount > 0 ? (
              <View
                style={[
                  styles.notifDot,
                  {
                    width: scale(14),
                    height: scale(14),
                    borderRadius: scale(7),
                    top: -scale(4),
                    right: -scale(4),
                  },
                ]}
              >
                <Text style={[styles.notifDotText, { fontSize: scale(7) }]}>
                  {requestCount > 9 ? "9+" : requestCount}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>
      </View>

      {/* Notification Modal */}
      <Modal
        visible={showNotifications}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNotifications(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowNotifications(false)}
        >
          <View style={styles.modalAnchor}>
            <TouchableOpacity activeOpacity={1}>
              <View
                style={[
                  styles.notifPanel,
                  {
                    borderRadius: scale(16),
                    padding: vScale(12),
                    maxHeight: vScale(350),
                    width: "100%",
                  },
                ]}
              >
                <View style={styles.notifHeader}>
                  <Text style={[styles.notifTitle, { fontSize: scale(12) }]}>
                    Notifications
                  </Text>
                  <TouchableOpacity onPress={() => setShowNotifications(false)}>
                    <Icon name="close" size={scale(14)} color={colors.gray400} />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={{ marginTop: vScale(8) }}
                  showsVerticalScrollIndicator={false}
                >
                  {requestCount === 0 ? (
                    <View style={[styles.notifEmpty, { paddingVertical: vScale(20) }]}>
                      <Icon name="bell-off" size={scale(22)} color={colors.gray400} />
                      <Text style={[styles.notifEmptyText, { fontSize: scale(10) }]}>
                        No notifications
                      </Text>
                    </View>
                  ) : (
                    displayItems.map((item) => (
                      <View
                        key={`${item.type}-${item.id}`}
                        style={[
                          styles.notifItem,
                          {
                            padding: vScale(8),
                            borderRadius: scale(12),
                            marginBottom: vScale(6),
                          },
                        ]}
                      >
                        <View style={[styles.notifRow, { gap: hScale(8) }]}>
                          <Avatar
                            uri={item.fromAvatar}
                            fallback={item.fromName?.slice(0, 2) || "??"}
                            size={scale(28)}
                          />
                          <View style={styles.notifInfo}>
                            <Text
                              style={[styles.notifName, { fontSize: scale(10) }]}
                              numberOfLines={1}
                            >
                              {item.fromName || "Someone"}
                            </Text>
                            <Text style={[styles.notifSub, { fontSize: scale(8) }]}>
                              {item.type === "friend_request"
                                ? "wants to be your friend"
                                : item.type === "friend_accepted"
                                ? "accepted your request"
                                : item.type === "game_invite"
                                ? `invited you to play ${item.gameTitle || "a game"}`
                                : "sent you a notification"}
                            </Text>
                          </View>
                        </View>
                        {item.type === "friend_request" ? (
                          <View
                            style={[
                              styles.notifActions,
                              { marginTop: vScale(6), gap: hScale(6) },
                            ]}
                          >
                            <TouchableOpacity
                              style={[
                                styles.notifAccept,
                                {
                                  paddingVertical: vScale(5),
                                  borderRadius: scale(8),
                                },
                              ]}
                              onPress={() => {
                                friends?.acceptRequest(item.id, item.from);
                              }}
                            >
                              <View style={styles.inlineLabelRow}>
                                <Icon name="check" size={scale(9)} color="#FFFFFF" />
                                <Text
                                  style={[styles.notifAcceptText, { fontSize: scale(8) }]}
                                >
                                  Accept
                                </Text>
                              </View>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[
                                styles.notifDecline,
                                {
                                  paddingVertical: vScale(5),
                                  borderRadius: scale(8),
                                },
                              ]}
                              onPress={() => {
                                friends?.declineRequest(item.id, item.from);
                              }}
                            >
                              <View style={styles.inlineLabelRow}>
                                <Icon name="close" size={scale(9)} color={colors.gray500} />
                                <Text
                                  style={[styles.notifDeclineText, { fontSize: scale(8) }]}
                                >
                                  Decline
                                </Text>
                              </View>
                            </TouchableOpacity>
                          </View>
                        ) : item.type === "game_invite" ? (
                          <View
                            style={[
                              styles.notifActions,
                              { marginTop: vScale(6), gap: hScale(6) },
                            ]}
                          >
                            <TouchableOpacity
                              style={[
                                styles.notifAccept,
                                {
                                  paddingVertical: vScale(5),
                                  borderRadius: scale(8),
                                  backgroundColor: colors.brandRed,
                                },
                              ]}
                              onPress={async () => {
                                const lobbyId = await friends?.acceptGameInvite(item.id, item.lobbyId);
                                setShowNotifications(false);
                                if (lobbyId) {
                                  navigation.navigate("GameLobby", { lobbyId });
                                }
                              }}
                            >
                              <View style={styles.inlineLabelRow}>
                                <Icon name="play" size={scale(9)} color="#FFFFFF" />
                                <Text
                                  style={[styles.notifAcceptText, { fontSize: scale(8) }]}
                                >
                                  Join
                                </Text>
                              </View>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[
                                styles.notifDecline,
                                {
                                  paddingVertical: vScale(5),
                                  borderRadius: scale(8),
                                },
                              ]}
                              onPress={() => {
                                friends?.declineGameInvite(item.id, item.lobbyId);
                              }}
                            >
                              <View style={styles.inlineLabelRow}>
                                <Icon name="close" size={scale(9)} color={colors.gray500} />
                                <Text
                                  style={[styles.notifDeclineText, { fontSize: scale(8) }]}
                                >
                                  Decline
                                </Text>
                              </View>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <View style={[styles.notifActions, { marginTop: vScale(6) }]}
                          >
                            <TouchableOpacity
                              style={[
                                styles.notifDecline,
                                {
                                  paddingVertical: vScale(5),
                                  borderRadius: scale(8),
                                },
                              ]}
                              onPress={() => {
                                friends?.clearNotification(item.id);
                              }}
                            >
                              <Text
                                style={[styles.notifDeclineText, { fontSize: scale(8) }]}
                              >
                                Dismiss
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    ))
                  )}
                </ScrollView>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.brandRed,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 16,
  },
  tagline: {
    color: colors.gray500,
    fontSize: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.gray900,
  },
  badges: {
    flexDirection: "row",
    gap: 10,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.gray100,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  badgeText: {
    fontSize: 16,
  },
  notifDot: {
    position: "absolute",
    backgroundColor: colors.brandRed,
    alignItems: "center",
    justifyContent: "center",
  },
  notifDotText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "flex-start",
    alignItems: "stretch",
  },
  modalAnchor: {
    marginTop: 80,
    paddingHorizontal: 12,
    width: "100%",
  },
  notifPanel: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  notifHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  notifTitle: {
    fontWeight: "700",
    color: colors.gray900,
  },
  notifClose: {
    color: colors.gray400,
    fontWeight: "600",
  },
  notifEmpty: {
    alignItems: "center",
    gap: 6,
  },
  notifEmptyIcon: {},
  notifEmptyText: {
    color: colors.gray500,
  },
  notifItem: {
    backgroundColor: "rgba(241,245,249,0.6)",
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.6)",
  },
  notifRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  notifInfo: {
    flex: 1,
  },
  notifName: {
    fontWeight: "700",
    color: colors.gray900,
  },
  notifSub: {
    color: colors.gray500,
    marginTop: 1,
  },
  notifActions: {
    flexDirection: "row",
  },
  notifAccept: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#22C55E",
  },
  notifAcceptText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  notifDecline: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "rgba(241,245,249,0.8)",
  },
  notifDeclineText: {
    color: colors.gray500,
    fontWeight: "600",
  },
  inlineLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
});

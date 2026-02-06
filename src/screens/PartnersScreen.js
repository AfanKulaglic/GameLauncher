import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Icon } from "../components/ui/Icon";
import { PageContainer } from "../components/layout/PageContainer";
import { Header } from "../components/layout/Header";
import { PageTitle } from "../components/layout/PageTitle";
import { Card } from "../components/ui/Card";
import { Avatar } from "../components/ui/Avatar";
import { colors } from "../utils/colors";
import { useAuth } from "../context/AuthContext";
import { useFriends } from "../context/FriendsContext";
import { useResponsive } from "../utils/useResponsive";

const TABS = ["Friends", "Requests", "Discover"];

function StatusDot({ status, size = 10 }) {
  const dotColor =
    status === "online"
      ? "#22C55E"
      : status === "in-game"
      ? "#F59E0B"
      : "#94A3B8";
  return (
    <View
      style={[
        statusDotStyles.dot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: dotColor,
          borderWidth: size * 0.2,
        },
      ]}
    />
  );
}

const statusDotStyles = StyleSheet.create({
  dot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    borderColor: "#FFFFFF",
  },
});

function StatChip({ icon, value, label, scale: s }) {
  return (
    <View style={chipStyles.chip}>
      <Text style={[chipStyles.icon, { fontSize: s(10) }]}>{icon}</Text>
      <View>
        <Text style={[chipStyles.value, { fontSize: s(9) }]}>{value}</Text>
        <Text style={[chipStyles.label, { fontSize: s(7) }]}>{label}</Text>
      </View>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(241,245,249,0.8)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  icon: { fontSize: 10 },
  value: { fontWeight: "700", color: "#1F2937", fontSize: 9 },
  label: { color: "#64748B", fontSize: 7 },
});

export function PartnersScreen() {
  const { scale, vScale, hScale } = useResponsive();
  const horizontalPadding = hScale(12);
  const { user } = useAuth();
  const friendsCtx = useFriends();
  const [activeTab, setActiveTab] = useState(0);
  const tabAnim = useRef(new Animated.Value(0)).current;
  const [searchQuery, setSearchQuery] = useState("");
  const searchTimer = useRef(null);

  // Pull everything from FriendsContext
  const friendsList = friendsCtx?.friends || [];
  const incomingRequests = friendsCtx?.incomingRequests || [];
  const outgoingRequests = friendsCtx?.outgoingRequests || [];
  const searchResults = friendsCtx?.searchResults || [];
  const searching = friendsCtx?.searching || false;
  const friendsMap = friendsCtx?.friendsMap || {};

  // Filter local friends list by search query
  const filteredFriends = friendsList.filter((p) =>
    p.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const switchTab = (idx) => {
    setActiveTab(idx);
    Animated.spring(tabAnim, {
      toValue: idx,
      speed: 20,
      bounciness: 4,
      useNativeDriver: true,
    }).start();
  };

  // Debounced search for Discover tab
  const handleDiscoverSearch = useCallback(
    (text) => {
      setSearchQuery(text);
      if (searchTimer.current) clearTimeout(searchTimer.current);
      searchTimer.current = setTimeout(() => {
        friendsCtx?.searchUsers(text);
      }, 400);
    },
    [friendsCtx]
  );

  // Determine relationship status with a user
  const getRelationship = useCallback(
    (uid) => {
      if (friendsMap[uid]) return "friends";
      const hasOutgoing = outgoingRequests.find((r) => r.to === uid);
      if (hasOutgoing) return "outgoing";
      const hasIncoming = incomingRequests.find((r) => r.from === uid);
      if (hasIncoming) return "incoming";
      return "none";
    },
    [friendsMap, outgoingRequests, incomingRequests]
  );

  const tabWidth = (hScale(340) - horizontalPadding * 2) / TABS.length;

  const renderFriendsTab = () => (
    <View style={[styles.tabContent, { gap: vScale(8) }]}>
      {/* Search bar */}
      <View style={[styles.searchRow, { borderRadius: scale(14), paddingHorizontal: hScale(10) }]}>
        <Icon name="search" size={scale(12)} color={colors.gray500} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search friends..."
          placeholderTextColor={colors.gray400}
          style={[styles.searchInput, { fontSize: scale(10), paddingVertical: vScale(8) }]}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Icon name="close" size={scale(12)} color={colors.gray400} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Online friends first, then offline */}
      {filteredFriends.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="people" size={scale(26)} color={colors.gray400} />
          <Text style={[styles.emptyTitle, { fontSize: scale(12) }]}>
            {searchQuery ? "No matches found" : "No friends yet"}
          </Text>
          <Text style={[styles.emptySubtitle, { fontSize: scale(9) }]}>
            {searchQuery
              ? "Try a different search term"
              : "Head to Discover to find players to connect with!"}
          </Text>
        </View>
      ) : (
        filteredFriends
          .sort((a, b) => {
            const order = { "in-game": 0, online: 1, offline: 2 };
            return (order[a.status] ?? 2) - (order[b.status] ?? 2);
          })
          .map((profile) => (
            <Card key={profile.id} style={[styles.friendCard, { padding: vScale(10), borderRadius: scale(16) }]}>
              <View style={[styles.friendRow, { gap: hScale(8) }]}>
                <View style={{ position: "relative" }}>
                  <Avatar
                    uri={profile.avatar}
                    fallback={profile.displayName?.slice(0, 2)}
                    size={scale(32)}
                  />
                  <StatusDot status={profile.status} size={scale(10)} />
                </View>
                <View style={styles.friendInfo}>
                  <View style={styles.friendNameRow}>
                    <Text style={[styles.friendName, { fontSize: scale(11) }]}>
                      {profile.displayName}
                    </Text>
                    <Text
                      style={[
                        styles.statusLabel,
                        {
                          fontSize: scale(7),
                          color:
                            profile.status === "online"
                              ? "#22C55E"
                              : colors.gray400,
                        },
                      ]}
                    >
                      {profile.status === "online" ? "Online" : "Offline"}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={[styles.friendActions, { marginTop: vScale(8), gap: hScale(6) }]}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnInvite, { paddingVertical: vScale(6), borderRadius: scale(10) }]}
                >
                  <Text style={[styles.actionBtnInviteText, { fontSize: scale(9) }]}>
                    Invite to game
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnRemove, { paddingVertical: vScale(6), borderRadius: scale(10) }]}
                  onPress={() => friendsCtx?.removeFriend(profile.id)}
                >
                  <Text style={[styles.actionBtnRemoveText, { fontSize: scale(9) }]}>Remove</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))
      )}
    </View>
  );

  const renderRequestsTab = () => (
    <View style={[styles.tabContent, { gap: vScale(10) }]}>
      {/* Incoming */}
      <View>
        <View style={[styles.sectionLabelRow, { marginBottom: vScale(6) }]}>
          <Icon name="mail-unread" size={scale(12)} color={colors.gray600} />
          <Text style={[styles.sectionLabel, { fontSize: scale(10) }]}>Incoming ({incomingRequests.length})</Text>
        </View>
        {incomingRequests.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="mail" size={scale(24)} color={colors.gray400} />
            <Text style={[styles.emptyTitle, { fontSize: scale(12) }]}>No incoming requests</Text>
            <Text style={[styles.emptySubtitle, { fontSize: scale(9) }]}>
              When someone sends you a friend request, it will appear here.
            </Text>
          </View>
        ) : (
          incomingRequests.map((req) => (
            <Card key={req.id} style={[styles.requestCard, { padding: vScale(10), marginBottom: vScale(6), borderRadius: scale(16) }]}>
              <View style={[styles.friendRow, { gap: hScale(8) }]}>
                <Avatar
                  uri={req.fromAvatar}
                  fallback={req.fromName?.slice(0, 2) || "??"}
                  size={scale(30)}
                />
                <View style={styles.friendInfo}>
                  <Text style={[styles.friendName, { fontSize: scale(11) }]}>
                    {req.fromName || "Unknown"}
                  </Text>
                  <Text style={[styles.requestMeta, { fontSize: scale(8) }]}>
                    Wants to be your friend
                  </Text>
                </View>
              </View>
              <View style={[styles.requestActions, { marginTop: vScale(8), gap: hScale(6) }]}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnAccept, { paddingVertical: vScale(7), borderRadius: scale(10), flex: 1 }]}
                  onPress={() => friendsCtx?.acceptRequest(req.id, req.from)}
                >
                  <View style={styles.inlineLabelRow}>
                    <Icon name="check" size={scale(10)} color="#FFFFFF" />
                    <Text style={[styles.actionBtnAcceptText, { fontSize: scale(9) }]}>Accept</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnDecline, { paddingVertical: vScale(7), borderRadius: scale(10), flex: 1 }]}
                  onPress={() => friendsCtx?.declineRequest(req.id, req.from)}
                >
                  <View style={styles.inlineLabelRow}>
                    <Icon name="close" size={scale(10)} color={colors.gray500} />
                    <Text style={[styles.actionBtnDeclineText, { fontSize: scale(9) }]}>Decline</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </Card>
          ))
        )}
      </View>

      {/* Outgoing */}
      {outgoingRequests.length > 0 ? (
        <View>
          <View style={[styles.sectionLabelRow, { marginBottom: vScale(6) }]}>
            <Icon name="send" size={scale(12)} color={colors.gray600} />
            <Text style={[styles.sectionLabel, { fontSize: scale(10) }]}>Sent ({outgoingRequests.length})</Text>
          </View>
          {outgoingRequests.map((req) => (
            <Card key={req.id} style={[styles.requestCard, { padding: vScale(10), marginBottom: vScale(6), borderRadius: scale(16) }]}>
              <View style={[styles.friendRow, { gap: hScale(8) }]}>
                <Avatar
                  uri={req.toAvatar}
                  fallback={req.toName?.slice(0, 2) || "??"}
                  size={scale(30)}
                />
                <View style={styles.friendInfo}>
                  <Text style={[styles.friendName, { fontSize: scale(11) }]}>
                    {req.toName || "Unknown"}
                  </Text>
                  <Text style={[styles.requestMeta, { fontSize: scale(8) }]}>Pending…</Text>
                </View>
                <TouchableOpacity
                  style={[styles.cancelBtn, { paddingVertical: vScale(5), paddingHorizontal: hScale(10), borderRadius: scale(8) }]}
                  onPress={() => friendsCtx?.cancelRequest(req.id, req.to)}
                >
                  <Text style={[styles.cancelBtnText, { fontSize: scale(8) }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))}
        </View>
      ) : null}
    </View>
  );

  const renderDiscoverTab = () => (
    <View style={[styles.tabContent, { gap: vScale(8) }]}> 

      {/* Search by name */}
      <View style={[styles.searchRow, { borderRadius: scale(14), paddingHorizontal: hScale(10) }]}>
        <Icon name="search" size={scale(12)} color={colors.gray500} />
        <TextInput
          value={searchQuery}
          onChangeText={handleDiscoverSearch}
          placeholder="Search exact name..."
          placeholderTextColor={colors.gray400}
          style={[styles.searchInput, { fontSize: scale(10), paddingVertical: vScale(8) }]}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => { setSearchQuery(""); friendsCtx?.searchUsers(""); }}>
            <Icon name="close" size={scale(12)} color={colors.gray400} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Search results */}
      {searching ? (
        <View style={[styles.emptyState, { paddingVertical: vScale(16) }]}>
          <ActivityIndicator size="small" color={colors.brandRed} />
          <Text style={[styles.emptySubtitle, { fontSize: scale(9), marginTop: vScale(6) }]}>
            Searching...
          </Text>
        </View>
      ) : searchQuery.length >= 2 && searchResults.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="search" size={scale(24)} color={colors.gray400} />
          <Text style={[styles.emptyTitle, { fontSize: scale(12) }]}>No players found</Text>
          <Text style={[styles.emptySubtitle, { fontSize: scale(9) }]}>
            Try a different name or check the spelling.
          </Text>
        </View>
      ) : searchQuery.length < 2 && searchResults.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="globe" size={scale(24)} color={colors.gray400} />
          <Text style={[styles.emptyTitle, { fontSize: scale(12) }]}>Find new friends</Text>
          <Text style={[styles.emptySubtitle, { fontSize: scale(9) }]}>
            Type at least 2 characters to search for players.
          </Text>
        </View>
      ) : (
        searchResults.map((profile) => {
          const relationship = getRelationship(profile.id);
          const inReq = incomingRequests.find((r) => r.from === profile.id);
          const outReq = outgoingRequests.find((r) => r.to === profile.id);

          return (
            <Card key={profile.id} style={[styles.discoverCard, { padding: vScale(10), borderRadius: scale(16) }]}>
              <View style={[styles.friendRow, { gap: hScale(8) }]}>
                <Avatar
                  uri={profile.avatar}
                  fallback={profile.displayName?.slice(0, 2)}
                  size={scale(30)}
                />
                <View style={styles.friendInfo}>
                  <Text style={[styles.friendName, { fontSize: scale(11) }]}>
                    {profile.displayName}
                  </Text>
                </View>
              </View>
              <View style={[styles.discoverAction, { marginTop: vScale(6) }]}>
                {relationship === "friends" ? (
                  <View style={[styles.friendBadge, { paddingVertical: vScale(5), paddingHorizontal: hScale(12), borderRadius: scale(8) }]}>
                    <View style={styles.inlineLabelRow}>
                      <Icon name="check" size={scale(9)} color="#22C55E" />
                      <Text style={[styles.friendBadgeText, { fontSize: scale(8) }]}>Friends</Text>
                    </View>
                  </View>
                ) : relationship === "incoming" && inReq ? (
                  <View style={[styles.requestActions, { gap: hScale(6) }]}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionBtnAccept, { paddingVertical: vScale(6), paddingHorizontal: hScale(12), borderRadius: scale(8) }]}
                      onPress={() => friendsCtx?.acceptRequest(inReq.id, inReq.from)}
                    >
                      <Text style={[styles.actionBtnAcceptText, { fontSize: scale(8) }]}>Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionBtnDecline, { paddingVertical: vScale(6), paddingHorizontal: hScale(12), borderRadius: scale(8) }]}
                      onPress={() => friendsCtx?.declineRequest(inReq.id, inReq.from)}
                    >
                      <Text style={[styles.actionBtnDeclineText, { fontSize: scale(8) }]}>Decline</Text>
                    </TouchableOpacity>
                  </View>
                ) : relationship === "outgoing" && outReq ? (
                  <TouchableOpacity
                    style={[styles.cancelBtn, { paddingVertical: vScale(5), paddingHorizontal: hScale(12), borderRadius: scale(8) }]}
                    onPress={() => friendsCtx?.cancelRequest(outReq.id, outReq.to)}
                  >
                    <View style={styles.inlineLabelRow}>
                      <Icon name="clock" size={scale(9)} color={colors.gray500} />
                      <Text style={[styles.cancelBtnText, { fontSize: scale(8) }]}>Pending</Text>
                    </View>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.addBtn, { paddingVertical: vScale(6), paddingHorizontal: hScale(14), borderRadius: scale(8) }]}
                    onPress={() => friendsCtx?.sendFriendRequest(profile.id, profile)}
                  >
                    <Text style={[styles.addBtnText, { fontSize: scale(8) }]}>+ Add friend</Text>
                  </TouchableOpacity>
                )}
              </View>
            </Card>
          );
        })
      )}
    </View>
  );

  // Summary stats bar
  const onlineCount = friendsList.filter((f) => f.status === "online").length;

  return (
    <PageContainer>
      <Header />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingHorizontal: horizontalPadding }]}>
        <PageTitle title="Partners" subtitle="Keep your co-op squad together" />

        {/* Stats summary */}
        <View style={[styles.statsBar, { marginBottom: vScale(10), gap: hScale(8) }]}>
          <View style={[styles.statBox, { padding: vScale(8), borderRadius: scale(14) }]}>
            <Text style={[styles.statNumber, { fontSize: scale(16) }]}>{friendsList.length}</Text>
            <Text style={[styles.statLabel, { fontSize: scale(7) }]}>Friends</Text>
          </View>
          <View style={[styles.statBox, styles.statBoxActive, { padding: vScale(8), borderRadius: scale(14) }]}>
            <Text style={[styles.statNumber, styles.statNumberActive, { fontSize: scale(16) }]}>
              {onlineCount}
            </Text>
            <Text style={[styles.statLabel, styles.statLabelActive, { fontSize: scale(7) }]}>Online</Text>
          </View>
          <View style={[styles.statBox, { padding: vScale(8), borderRadius: scale(14) }]}>
            <Text style={[styles.statNumber, { fontSize: scale(16) }]}>{incomingRequests.length}</Text>
            <Text style={[styles.statLabel, { fontSize: scale(7) }]}>Requests</Text>
          </View>
        </View>

        {!user ? (
          <Card style={[styles.notice, { padding: vScale(14), borderRadius: scale(16) }]}>
            <Icon name="lock" size={scale(20)} color={colors.gray500} />
            <Text style={[styles.noticeText, { fontSize: scale(11) }]}>
              Sign in to add friends and manage partner requests.
            </Text>
          </Card>
        ) : (
          <View style={{ gap: vScale(10) }}>
            {/* Tab bar */}
            <View style={[styles.tabBar, { borderRadius: scale(14), padding: scale(3) }]}>
              <Animated.View
                style={[
                  styles.tabIndicator,
                  {
                    width: tabWidth,
                    borderRadius: scale(11),
                    transform: [
                      {
                        translateX: tabAnim.interpolate({
                          inputRange: [0, 1, 2],
                          outputRange: [0, tabWidth, tabWidth * 2],
                        }),
                      },
                    ],
                  },
                ]}
              />
              {TABS.map((tab, idx) => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tab, { paddingVertical: vScale(8) }]}
                  onPress={() => switchTab(idx)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.tabText,
                      {
                        fontSize: scale(10),
                        color: activeTab === idx ? colors.white : colors.gray500,
                        fontWeight: activeTab === idx ? "700" : "500",
                      },
                    ]}
                  >
                    {tab}
                    {tab === "Requests" && incomingRequests.length > 0
                      ? ` (${incomingRequests.length})`
                      : ""}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Tab content */}
            {activeTab === 0 && renderFriendsTab()}
            {activeTab === 1 && renderRequestsTab()}
            {activeTab === 2 && renderDiscoverTab()}
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

  // Stats bar
  statsBar: {
    flexDirection: "row",
    gap: 8,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.gray200,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  statBoxActive: {
    backgroundColor: colors.brandRed,
    borderColor: colors.brandRed,
  },
  statNumber: {
    fontWeight: "800",
    color: colors.gray900,
  },
  statNumberActive: {
    color: "#FFFFFF",
  },
  statLabel: {
    color: colors.gray500,
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statLabelActive: {
    color: "rgba(255,255,255,0.85)",
  },

  // Tab bar
  tabBar: {
    flexDirection: "row",
    backgroundColor: colors.gray200,
    position: "relative",
  },
  tabIndicator: {
    position: "absolute",
    top: 3,
    bottom: 3,
    left: 3,
    backgroundColor: colors.brandRed,
    shadowColor: colors.brandRed,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  tabText: {
    textAlign: "center",
  },
  tabContent: {
    gap: 8,
  },

  // Notice
  notice: {
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.95)",
  },
  noticeIcon: {},
  noticeText: {
    color: colors.gray600,
    textAlign: "center",
  },

  // Search
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.gray200,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.gray900,
  },

  // Friend card
  friendCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.6)",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  friendInfo: {
    flex: 1,
  },
  friendNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  friendName: {
    fontWeight: "700",
    color: colors.gray900,
  },
  statusLabel: {
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  currentGame: {
    color: colors.gray500,
    marginTop: 1,
  },
  statsRow: {
    flexDirection: "row",
  },
  friendActions: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "rgba(226,232,240,0.5)",
    paddingTop: 8,
  },
  actionBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnInvite: {
    backgroundColor: colors.brandRed,
  },
  actionBtnInviteText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  actionBtnRemove: {
    backgroundColor: "rgba(241,245,249,0.8)",
  },
  actionBtnRemoveText: {
    color: colors.gray500,
    fontWeight: "600",
  },

  // Request card
  requestCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.6)",
  },
  requestMeta: {
    color: colors.gray500,
    marginTop: 2,
  },
  requestActions: {
    flexDirection: "row",
  },
  actionBtnAccept: {
    backgroundColor: "#22C55E",
  },
  actionBtnAcceptText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  actionBtnDecline: {
    backgroundColor: "rgba(241,245,249,0.8)",
  },
  actionBtnDeclineText: {
    color: colors.gray500,
    fontWeight: "600",
  },
  inlineLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  // Cancel / pending
  cancelBtn: {
    backgroundColor: "rgba(241,245,249,0.8)",
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  cancelBtnText: {
    color: colors.gray500,
    fontWeight: "600",
  },

  // Section label
  sectionLabel: {
    fontWeight: "700",
    color: colors.gray700,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  // Empty state
  emptyState: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 6,
  },
  emptyIcon: {},
  emptyTitle: {
    fontWeight: "700",
    color: colors.gray800,
  },
  emptySubtitle: {
    color: colors.gray500,
    textAlign: "center",
    paddingHorizontal: 20,
  },

  // Discover
  inviteCard: {
    backgroundColor: "rgba(225,29,72,0.04)",
    borderWidth: 1,
    borderColor: "rgba(225,29,72,0.15)",
  },
  inviteTitle: {
    fontWeight: "700",
    color: colors.gray900,
  },
  inviteTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  inviteSubtitle: {
    color: colors.gray500,
    marginTop: 2,
  },
  uidRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.8)",
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  uidLabel: {
    color: colors.gray500,
    fontWeight: "500",
  },
  uidValue: {
    fontWeight: "700",
    color: colors.gray800,
    letterSpacing: 0.5,
  },

  // Discover card
  discoverCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.6)",
  },
  discoverAction: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },

  // Add friend button
  addBtn: {
    backgroundColor: colors.brandRed,
  },
  addBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  // Friend badge
  friendBadge: {
    backgroundColor: "rgba(34,197,94,0.1)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.2)",
  },
  friendBadgeText: {
    color: "#22C55E",
    fontWeight: "700",
  },
});

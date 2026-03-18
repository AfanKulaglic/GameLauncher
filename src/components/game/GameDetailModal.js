import React, { useCallback, useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  View,
  Image,
  ImageBackground,
  TouchableOpacity,
  useWindowDimensions,
  Pressable,
  TextInput,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../../utils/colors";
import { Icon } from "../ui/Icon";
import { Avatar } from "../ui/Avatar";
import { useFriends } from "../../context/FriendsContext";

/* ── Small partner row used inside the picker ── */
function PartnerRow({ item, selected, onSelect, status }) {
  const isOnline = status === "online";
  return (
    <Pressable
      onPress={() => onSelect(item)}
      style={({ pressed }) => [
        pStyles.row,
        selected && pStyles.rowSelected,
        pressed && { opacity: 0.8 },
      ]}
    >
      <View style={pStyles.avatarWrap}>
        <Avatar uri={item.avatar} size={30} />
        <View style={[pStyles.dot, { backgroundColor: isOnline ? "#22C55E" : colors.gray300 }]} />
      </View>
      <View style={pStyles.info}>
        <Text style={pStyles.name} numberOfLines={1}>{item.displayName}</Text>
        <Text style={pStyles.status}>{isOnline ? "Online" : "Offline"}</Text>
      </View>
      {selected ? (
        <View style={pStyles.checkCircle}>
          <Icon name="check" size={12} color={colors.white} />
        </View>
      ) : (
        <View style={pStyles.emptyCircle} />
      )}
    </Pressable>
  );
}

/* ── Search result row ── */
function SearchRow({ item, onInvite, isFriend, requestSent }) {
  return (
    <View style={pStyles.row}>
      <Avatar uri={item.avatar} size={30} />
      <View style={pStyles.info}>
        <Text style={pStyles.name} numberOfLines={1}>{item.displayName}</Text>
        <Text style={pStyles.status}>
          {isFriend ? "Already friends" : requestSent ? "Request sent" : "Not a friend"}
        </Text>
      </View>
      {!isFriend && !requestSent && (
        <Pressable onPress={() => onInvite(item)} style={pStyles.inviteBtn}>
          <Icon name="send" size={12} color={colors.white} />
        </Pressable>
      )}
      {requestSent && (
        <View style={pStyles.sentBadge}>
          <Text style={pStyles.sentText}>Sent</Text>
        </View>
      )}
    </View>
  );
}

const pStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  rowSelected: {
    backgroundColor: "rgba(225,29,72,0.06)",
  },
  avatarWrap: { position: "relative" },
  dot: {
    position: "absolute",
    bottom: 0,
    right: -1,
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  info: { flex: 1 },
  name: { fontSize: 12, fontWeight: "700", color: colors.gray900 },
  status: { fontSize: 9, color: colors.gray400, marginTop: 1 },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.brandRed,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.gray300,
  },
  inviteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.brandRed,
    alignItems: "center",
    justifyContent: "center",
  },
  sentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: colors.gray100,
  },
  sentText: { fontSize: 9, fontWeight: "700", color: colors.gray400 },
});

export function GameDetailModal({ game, visible, onClose }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const friendsCtx = useFriends();
  const navigation = useNavigation();

  const [showPartnerPicker, setShowPartnerPicker] = useState(false);
  const [selectedPartners, setSelectedPartners] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sending, setSending] = useState(false);

  const maxPartners = (game?.players ?? 2) - 1; // host counts as 1

  if (!game) return null;

  const isSmall = height < 700;
  const isTiny = height < 600;

  const unlocked = game.achievements?.unlocked ?? 0;
  const total = game.achievements?.total ?? 0;
  const progress = total > 0 ? unlocked / total : 0;

  const friendsList = friendsCtx?.friends || [];
  const friendsMap = friendsCtx?.friendsMap || {};
  const presenceMap = friendsCtx?.presenceMap || {};
  const searchResults = friendsCtx?.searchResults || [];
  const searching = friendsCtx?.searching || false;
  const outgoingRequests = friendsCtx?.outgoingRequests || [];

  const handlePlayPress = () => {
    setShowPartnerPicker(true);
    setSelectedPartners([]);
    setSearchQuery("");
    friendsCtx?.searchUsers?.("");
  };

  const handleBack = () => {
    setShowPartnerPicker(false);
    setSelectedPartners([]);
    setSearchQuery("");
  };

  const handleClose = () => {
    setShowPartnerPicker(false);
    setSelectedPartners([]);
    setSearchQuery("");
    onClose();
  };

  const togglePartner = (partner) => {
    setSelectedPartners((prev) => {
      const exists = prev.find((p) => p.id === partner.id);
      if (exists) return prev.filter((p) => p.id !== partner.id);
      if (prev.length >= maxPartners) return prev;
      return [...prev, partner];
    });
  };

  const handleSearchChange = (text) => {
    setSearchQuery(text);
    friendsCtx?.searchUsers?.(text);
  };

  const handleInvite = (item) => {
    friendsCtx?.sendFriendRequest?.(item.id, item);
  };

  const isRequestSent = (uid) => outgoingRequests.some((r) => r.to === uid);

  // Filter search results to non-friends only
  const filteredSearch = searchResults.filter((r) => !friendsMap[r.id]);

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.root}>
        <ImageBackground
          source={game.coverImage}
          style={StyleSheet.absoluteFill}
          blurRadius={25}
        >
          <View style={styles.bgTint} />
        </ImageBackground>

        <View style={[styles.safe, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>
          {/* ── Top bar ── */}
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={showPartnerPicker ? handleBack : handleClose}
              style={styles.backBtn}
              activeOpacity={0.7}
            >
              <Icon name="close" size={18} color={colors.white} />
            </TouchableOpacity>
            <Text style={styles.topTitle} numberOfLines={1}>
              {showPartnerPicker ? "Choose Partner" : "Game Details"}
            </Text>
            <View style={{ width: 36 }} />
          </View>

          {/* ── Hero cover ── */}
          <View style={[styles.heroWrap, { height: showPartnerPicker ? (isTiny ? 80 : 100) : (isTiny ? 120 : isSmall ? 150 : 180) }]}>
            <Image source={game.coverImage} style={styles.heroImage} resizeMode="cover" />
            <View style={styles.heroGradient} />
            {!showPartnerPicker && game.status === "playing" && (
              <View style={styles.liveTag}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>Now Playing</Text>
              </View>
            )}
            {showPartnerPicker && (
              <View style={styles.heroTitleOverlay}>
                <Text style={styles.heroTitleText} numberOfLines={1}>{game.title}</Text>
              </View>
            )}
          </View>

          {/* ── Content card ── */}
          <View style={styles.contentCard}>
            {showPartnerPicker ? (
              /* ═══ Partner Picker View ═══ */
              <>
                {/* Search bar */}
                <View style={styles.searchBar}>
                  <Icon name="search" size={14} color={colors.gray400} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search people..."
                    placeholderTextColor={colors.gray400}
                    value={searchQuery}
                    onChangeText={handleSearchChange}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => handleSearchChange("")}>
                      <Icon name="close" size={14} color={colors.gray400} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Selection counter for multi-player */}
                {maxPartners > 1 && (
                  <View style={styles.selectionCounter}>
                    <Text style={styles.selectionCounterText}>
                      {selectedPartners.length}/{maxPartners} selected
                    </Text>
                  </View>
                )}

                {/* Content area */}
                <View style={styles.pickerList}>
                  {searchQuery.length >= 2 ? (
                    /* Search results */
                    searching ? (
                      <View style={styles.centered}>
                        <ActivityIndicator size="small" color={colors.brandRed} />
                      </View>
                    ) : filteredSearch.length > 0 ? (
                      <FlatList
                        data={filteredSearch.slice(0, 6)}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                          <SearchRow
                            item={item}
                            onInvite={handleInvite}
                            isFriend={!!friendsMap[item.id]}
                            requestSent={isRequestSent(item.id)}
                          />
                        )}
                        showsVerticalScrollIndicator={false}
                        ListHeaderComponent={
                          <Text style={styles.listHeader}>Search Results</Text>
                        }
                      />
                    ) : (
                      <View style={styles.centered}>
                        <Icon name="search" size={20} color={colors.gray300} />
                        <Text style={styles.emptyText}>No users found</Text>
                      </View>
                    )
                  ) : friendsList.length > 0 ? (
                    /* Friends list */
                    <FlatList
                      data={friendsList}
                      keyExtractor={(item) => item.id}
                      renderItem={({ item }) => (
                        <PartnerRow
                          item={item}
                          selected={selectedPartners.some((p) => p.id === item.id)}
                          onSelect={togglePartner}
                          status={item.status}
                        />
                      )}
                      showsVerticalScrollIndicator={false}
                      ListHeaderComponent={
                        <Text style={styles.listHeader}>Your Friends</Text>
                      }
                    />
                  ) : (
                    /* Empty state */
                    <View style={styles.centered}>
                      <Icon name="people" size={24} color={colors.gray300} />
                      <Text style={styles.emptyText}>No friends yet</Text>
                      <Text style={styles.emptySubtext}>Search above to find people</Text>
                    </View>
                  )}
                </View>
              </>
            ) : (
              /* ═══ Default Game Info View ═══ */
              <>
                <Text style={[styles.title, isTiny && { fontSize: 16 }]} numberOfLines={1}>
                  {game.title}
                </Text>

                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <Icon name="people" size={16} color={colors.brandRed} />
                    <Text style={styles.statValue}>{game.players}</Text>
                    <Text style={styles.statLabel}>Players</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statBox}>
                    <Icon name="trophy" size={16} color={colors.brandRed} />
                    <Text style={styles.statValue}>{unlocked}/{total}</Text>
                    <Text style={styles.statLabel}>Trophies</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statBox}>
                    <View style={styles.progressRing}>
                      <Text style={styles.progressText}>{Math.round(progress * 100)}%</Text>
                    </View>
                    <Text style={styles.statLabel}>Complete</Text>
                  </View>
                </View>

                <View style={styles.tagsRow}>
                  {game.genre.map((tag) => (
                    <View key={tag} style={styles.chip}>
                      <Text style={styles.chipText}>{tag}</Text>
                    </View>
                  ))}
                </View>

                <Text
                  style={[styles.description, isTiny && { fontSize: 11 }]}
                  numberOfLines={isTiny ? 2 : isSmall ? 3 : 4}
                >
                  {game.longDescription ?? game.description}
                </Text>

                <View style={styles.progressBarWrap}>
                  <View style={styles.progressBarTrack}>
                    <View style={[styles.progressBarFill, { width: `${Math.round(progress * 100)}%` }]} />
                  </View>
                  <Text style={styles.progressBarLabel}>{unlocked} of {total} achievements</Text>
                </View>
              </>
            )}
          </View>

          {/* ── Bottom actions ── */}
          <View style={styles.actionsRow}>
            {showPartnerPicker ? (
              <>
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    (selectedPartners.length === 0) && styles.btnDisabled,
                    pressed && { opacity: 0.85 },
                  ]}
                  onPress={async () => {
                    if (selectedPartners.length > 0 && game && !sending) {
                      setSending(true);
                      try {
                        const lobbyId = await friendsCtx?.sendGameInvite?.(
                          selectedPartners,
                          game
                        );
                        handleClose();
                        if (lobbyId) {
                          navigation.navigate("GameLobby", { lobbyId });
                        }
                      } catch (err) {
                        console.warn("Failed to send game invite:", err);
                      } finally {
                        setSending(false);
                      }
                    }
                  }}
                  disabled={selectedPartners.length === 0 || sending}
                >
                  <Icon name="play" size={16} color={colors.white} />
                  <Text style={styles.primaryBtnText}>
                    {sending
                      ? "Sending invites..."
                      : selectedPartners.length === 0
                        ? `Select Partners (0/${maxPartners})`
                        : selectedPartners.length === 1
                          ? `Play with ${selectedPartners[0].displayName}`
                          : `Play with ${selectedPartners.length} friends`}
                  </Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.85 }]}
                  onPress={handleBack}
                >
                  <Text style={styles.secondaryBtnText}>Back</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
                  onPress={handlePlayPress}
                >
                  <Icon name="play" size={16} color={colors.white} />
                  <Text style={styles.primaryBtnText}>
                    {maxPartners > 1 ? `Play with Partners (up to ${maxPartners})` : "Play with Partner"}
                  </Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.85 }]}
                  onPress={() => {
                    handleClose();
                    navigation.navigate("Partners", {
                      openDiscover: true,
                      discoverToken: Date.now(),
                    });
                  }}
                >
                  <Icon name="send" size={14} color={colors.brandRed} />
                  <Text style={styles.secondaryBtnText}>Invite</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  bgTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
  },
  safe: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: "space-between",
  },

  /* ── Top bar ── */
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "rgba(255,255,255,0.8)",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  /* ── Hero ── */
  heroWrap: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 12,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  liveTag: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(225, 29, 72, 0.9)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
  },
  liveText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  /* ── Content card ── */
  contentCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.gray200,
    justifyContent: "space-evenly",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.gray900,
    letterSpacing: -0.3,
  },

  /* ── Stats ── */
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: colors.gray50,
    borderRadius: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  statBox: {
    alignItems: "center",
    gap: 2,
    flex: 1,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.gray900,
    marginTop: 2,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: colors.gray400,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.gray200,
  },
  progressRing: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2.5,
    borderColor: colors.brandRed,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(225,29,72,0.06)",
  },
  progressText: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.brandRed,
  },

  /* ── Tags ── */
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  chipText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.gray600,
  },

  /* ── Description ── */
  description: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.gray500,
  },

  /* ── Progress bar ── */
  progressBarWrap: {
    gap: 4,
  },
  progressBarTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.gray200,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: colors.brandRed,
  },
  progressBarLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: colors.gray400,
  },

  /* ── Actions ── */
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  primaryBtn: {
    flex: 1,
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
  btnDisabled: {
    backgroundColor: colors.gray300,
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryBtnText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "700",
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  secondaryBtnText: {
    color: colors.brandRed,
    fontSize: 14,
    fontWeight: "700",
  },

  /* ── Partner picker ── */
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.gray50,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.gray900,
    padding: 0,
  },
  pickerList: {
    flex: 1,
    marginTop: 6,
  },
  selectionCounter: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  selectionCounterText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.brandRed,
  },
  listHeader: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.gray400,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  emptyText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.gray400,
  },
  emptySubtext: {
    fontSize: 10,
    color: colors.gray300,
  },
  heroTitleOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,23,42,0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  heroTitleText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
});

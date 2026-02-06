import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AppState } from "react-native";
import { db } from "../lib/firebase";
import {
  ref,
  set,
  get,
  push,
  remove,
  onValue,
  onDisconnect,
  serverTimestamp,
  query,
  orderByChild,
  startAt,
  endAt,
} from "firebase/database";
import { useAuth } from "./AuthContext";

const FriendsContext = createContext(null);

function levenshtein(a = "", b = "") {
  const alen = a.length;
  const blen = b.length;
  if (alen === 0) return blen;
  if (blen === 0) return alen;

  const dp = Array.from({ length: alen + 1 }, () => Array(blen + 1).fill(0));
  for (let i = 0; i <= alen; i += 1) dp[i][0] = i;
  for (let j = 0; j <= blen; j += 1) dp[0][j] = j;

  for (let i = 1; i <= alen; i += 1) {
    for (let j = 1; j <= blen; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[alen][blen];
}

/**
 * Firebase RTDB structure:
 *
 * users/{uid}/
 *   displayName, email, avatar, createdAt
 *
 * presence/{uid}/
 *   online: true|false
 *   lastSeen: timestamp
 *
 * friendRequests/{toUid}/{requestId}/
 *   from: uid
 *   fromName: displayName
 *   fromAvatar: avatar
 *   timestamp: serverTimestamp
 *
 * friends/{uid}/{friendUid}: true
 * friends/{friendUid}/{uid}: true
 */

export function FriendsProvider({ children }) {
  const { user } = useAuth();
  const [friends, setFriends] = useState({}); // { friendUid: true }
  const [incomingRequests, setIncomingRequests] = useState([]); // [{ id, from, fromName, fromAvatar, timestamp }]
  const [outgoingRequests, setOutgoingRequests] = useState([]); // [{ id, to, toName, toAvatar }]
  const [notifications, setNotifications] = useState([]); // [{ id, type, from, fromName, fromAvatar, timestamp }]
  const [presenceMap, setPresenceMap] = useState({}); // { uid: { online, lastSeen } }
  const [allUsers, setAllUsers] = useState({}); // { uid: { displayName, email, avatar } }
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [gameInvites, setGameInvites] = useState([]); // incoming game invites
  const [activeLobby, setActiveLobby] = useState(null); // { lobbyId, gameId, gameTitle, gameCover, hostId, hostName, players: { uid: { name, avatar, status } } }

  // ─── Register user profile in RTDB ───
  const registerUserProfile = useCallback(
    async (userData) => {
      if (!userData?.id) return;
      const displayName = userData.displayName || "Player";
      const email = userData.email || "";
      const userRef = ref(db, `users/${userData.id}`);
      const existing = await get(userRef);
      const existingData = existing.exists() ? existing.val() : null;

      await set(userRef, {
        displayName,
        displayNameLower: displayName.toLowerCase(),
        email,
        emailLower: email.toLowerCase(),
        avatar: `https://api.dicebear.com/7.x/avataaars/png?seed=${userData.id}`,
        createdAt: existingData?.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    },
    []
  );

  // ─── Presence management ───
  useEffect(() => {
    if (!user?.id) return;

    const presRef = ref(db, `presence/${user.id}`);

    // Set online
    set(presRef, { online: true, lastSeen: serverTimestamp() });

    // Set offline on disconnect
    onDisconnect(presRef).set({
      online: false,
      lastSeen: serverTimestamp(),
    });

    // Handle app state changes (background/foreground)
    const handleAppState = (state) => {
      if (state === "active") {
        set(presRef, { online: true, lastSeen: serverTimestamp() });
      } else {
        set(presRef, { online: false, lastSeen: serverTimestamp() });
      }
    };

    const sub = AppState.addEventListener("change", handleAppState);

    return () => {
      sub.remove();
      set(presRef, { online: false, lastSeen: serverTimestamp() });
    };
  }, [user?.id]);

  // ─── Listen to friends list ───
  useEffect(() => {
    if (!user?.id) return;
    const friendsRef = ref(db, `friends/${user.id}`);
    const unsub = onValue(friendsRef, (snapshot) => {
      setFriends(snapshot.val() || {});
    });
    return () => unsub();
  }, [user?.id]);

  // ─── Listen to incoming friend requests ───
  useEffect(() => {
    if (!user?.id) return;
    const reqRef = ref(db, `friendRequests/${user.id}`);
    const unsub = onValue(reqRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setIncomingRequests([]);
        return;
      }
      const reqs = Object.entries(data).map(([id, val]) => ({
        id,
        ...val,
      }));
      setIncomingRequests(reqs);
    });
    return () => unsub();
  }, [user?.id]);

  // ─── Listen to outgoing requests ───
  useEffect(() => {
    if (!user?.id) return;
    const outRef = ref(db, `outgoingRequests/${user.id}`);
    const unsub = onValue(outRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setOutgoingRequests([]);
        return;
      }
      const reqs = Object.entries(data).map(([id, val]) => ({
        id,
        ...val,
      }));
      setOutgoingRequests(reqs);
    });
    return () => unsub();
  }, [user?.id]);

  // ─── Listen to notifications ───
  useEffect(() => {
    if (!user?.id) return;
    const notifRef = ref(db, `notifications/${user.id}`);
    const unsub = onValue(notifRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setNotifications([]);
        return;
      }
      const list = Object.entries(data).map(([id, val]) => ({ id, ...val }));
      setNotifications(list);
    });
    return () => unsub();
  }, [user?.id]);

  // ─── Listen to presence of friends ───
  useEffect(() => {
    const friendUids = Object.keys(friends);
    if (friendUids.length === 0) {
      setPresenceMap({});
      return;
    }

    const unsubs = friendUids.map((uid) => {
      const presRef = ref(db, `presence/${uid}`);
      return onValue(presRef, (snapshot) => {
        setPresenceMap((prev) => ({
          ...prev,
          [uid]: snapshot.val() || { online: false, lastSeen: null },
        }));
      });
    });

    return () => unsubs.forEach((u) => u());
  }, [friends]);

  // ─── Listen to incoming game invites ───
  useEffect(() => {
    if (!user?.id) return;
    const invRef = ref(db, `gameInvites/${user.id}`);
    const unsub = onValue(invRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setGameInvites([]);
        return;
      }
      const list = Object.entries(data).map(([id, val]) => ({ id, ...val }));
      setGameInvites(list);
    });
    return () => unsub();
  }, [user?.id]);

  // ─── Listen to active lobby ───
  useEffect(() => {
    if (!activeLobby?.lobbyId) return;
    const lobbyRef = ref(db, `gameLobbies/${activeLobby.lobbyId}`);
    const unsub = onValue(lobbyRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setActiveLobby(null);
        return;
      }
      setActiveLobby((prev) => ({
        ...prev,
        ...data,
      }));
    });
    return () => unsub();
  }, [activeLobby?.lobbyId]);

  // ─── Send game invite ───
  const sendGameInvite = useCallback(
    async (targetUid, targetProfile, game) => {
      if (!user?.id || !targetUid || !game) return null;

      // Create a lobby
      const lobbyId = `${user.id}_${targetUid}_${Date.now()}`;
      const lobbyData = {
        lobbyId,
        gameId: game.id,
        gameTitle: game.title,
        hostId: user.id,
        hostName: user.displayName || "Player",
        createdAt: serverTimestamp(),
        players: {
          [user.id]: {
            name: user.displayName || "Player",
            avatar: `https://api.dicebear.com/7.x/avataaars/png?seed=${user.id}`,
            status: "in-lobby",
            joinedAt: serverTimestamp(),
          },
        },
        invited: {
          [targetUid]: {
            name: targetProfile?.displayName || "Player",
            avatar: targetProfile?.avatar || "",
            status: "pending",
            invitedAt: serverTimestamp(),
          },
        },
      };

      // Write lobby
      await set(ref(db, `gameLobbies/${lobbyId}`), lobbyData);

      // Send invite notification to target
      const invRef = ref(db, `gameInvites/${targetUid}`);
      const newInv = push(invRef);
      await set(newInv, {
        type: "game_invite",
        lobbyId,
        gameId: game.id,
        gameTitle: game.title,
        from: user.id,
        fromName: user.displayName || "Player",
        fromAvatar: `https://api.dicebear.com/7.x/avataaars/png?seed=${user.id}`,
        timestamp: serverTimestamp(),
      });

      // Set this as active lobby for the sender
      setActiveLobby(lobbyData);
      return lobbyId;
    },
    [user]
  );

  // ─── Accept game invite ───
  const acceptGameInvite = useCallback(
    async (inviteId, lobbyId) => {
      if (!user?.id || !lobbyId) return;

      // Add self to lobby players
      await set(ref(db, `gameLobbies/${lobbyId}/players/${user.id}`), {
        name: user.displayName || "Player",
        avatar: `https://api.dicebear.com/7.x/avataaars/png?seed=${user.id}`,
        status: "in-lobby",
        joinedAt: serverTimestamp(),
      });

      // Update invited status
      await set(ref(db, `gameLobbies/${lobbyId}/invited/${user.id}/status`), "accepted");

      // Remove the invite
      await remove(ref(db, `gameInvites/${user.id}/${inviteId}`));

      // Read lobby data and set as active
      const lobbySnapshot = await get(ref(db, `gameLobbies/${lobbyId}`));
      const lobbyData = lobbySnapshot.val();
      if (lobbyData) {
        setActiveLobby(lobbyData);
      }

      return lobbyId;
    },
    [user]
  );

  // ─── Decline game invite ───
  const declineGameInvite = useCallback(
    async (inviteId, lobbyId) => {
      if (!user?.id) return;

      // Remove the invite
      await remove(ref(db, `gameInvites/${user.id}/${inviteId}`));

      // Update invited status in lobby
      if (lobbyId) {
        await set(ref(db, `gameLobbies/${lobbyId}/invited/${user.id}/status`), "declined");
      }
    },
    [user?.id]
  );

  // ─── Leave lobby ───
  const leaveLobby = useCallback(
    async () => {
      if (!user?.id || !activeLobby?.lobbyId) return;
      await remove(ref(db, `gameLobbies/${activeLobby.lobbyId}/players/${user.id}`));
      setActiveLobby(null);
    },
    [user?.id, activeLobby?.lobbyId]
  );

  // ─── Search users by display name ───
  const searchUsers = useCallback(
    async (queryStr) => {
      const normalized = queryStr?.trim() || "";
      if (normalized.length < 2) {
        setSearchResults([]);
        setSearching(false);
        return;
      }

      setSearching(true);
      try {
        const lowerQuery = normalized.toLowerCase();
        const usersRef = ref(db, "users");
        const snapshot = await get(usersRef);
        const data = snapshot.val() || {};

        const results = Object.entries(data)
          .filter(([uid, profile]) => {
            if (uid === user?.id) return false;
            const name = profile.displayNameLower || profile.displayName?.toLowerCase() || "";
            return name.includes(lowerQuery);
          })
          .map(([uid, profile]) => ({
            id: uid,
            displayName: profile.displayName,
            displayNameLower: profile.displayNameLower || profile.displayName?.toLowerCase() || "",
            avatar: profile.avatar,
          }))
          .sort((a, b) => {
            const distA = levenshtein(a.displayNameLower, lowerQuery);
            const distB = levenshtein(b.displayNameLower, lowerQuery);
            return distA - distB;
          });

        setSearchResults(results);
      } catch (err) {
        console.warn("Search error:", err);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    },
    [user?.id]
  );

  // ─── Send friend request ───
  const sendFriendRequest = useCallback(
    async (targetUid, targetProfile) => {
      if (!user?.id || !targetUid) return;
      if (friends[targetUid]) return; // Already friends

      // Check if already sent
      const existing = outgoingRequests.find((r) => r.to === targetUid);
      if (existing) return;

      // Write to target's incoming requests
      const reqRef = ref(db, `friendRequests/${targetUid}`);
      const newReq = push(reqRef);
      await set(newReq, {
        from: user.id,
        fromName: user.displayName || "Player",
        fromAvatar: `https://api.dicebear.com/7.x/avataaars/png?seed=${user.id}`,
        timestamp: serverTimestamp(),
      });

      // Write to our outgoing
      const outRef = ref(db, `outgoingRequests/${user.id}`);
      const newOut = push(outRef);
      await set(newOut, {
        to: targetUid,
        toName: targetProfile?.displayName || "Player",
        toAvatar: targetProfile?.avatar || "",
        timestamp: serverTimestamp(),
      });
    },
    [user, friends, outgoingRequests]
  );

  // ─── Accept friend request ───
  const acceptRequest = useCallback(
    async (requestId, fromUid) => {
      if (!user?.id || !fromUid) return;

      // Add to both friends lists
      await set(ref(db, `friends/${user.id}/${fromUid}`), true);
      await set(ref(db, `friends/${fromUid}/${user.id}`), true);

      // Remove the incoming request
      await remove(ref(db, `friendRequests/${user.id}/${requestId}`));

      // Remove from sender's outgoing requests
      const outRef = ref(db, `outgoingRequests/${fromUid}`);
      const snapshot = await get(outRef);
      const data = snapshot.val();
      if (data) {
        for (const [key, val] of Object.entries(data)) {
          if (val.to === user.id) {
            await remove(ref(db, `outgoingRequests/${fromUid}/${key}`));
          }
        }
      }

      // Notify sender that request was accepted
      const notifRef = ref(db, `notifications/${fromUid}`);
      const newNotif = push(notifRef);
      await set(newNotif, {
        type: "friend_accepted",
        from: user.id,
        fromName: user.displayName || "Player",
        fromAvatar: `https://api.dicebear.com/7.x/avataaars/png?seed=${user.id}`,
        timestamp: serverTimestamp(),
      });
    },
    [user?.id, user?.displayName]
  );

  const clearNotification = useCallback(
    async (notificationId) => {
      if (!user?.id || !notificationId) return;
      await remove(ref(db, `notifications/${user.id}/${notificationId}`));
    },
    [user?.id]
  );

  // ─── Decline friend request ───
  const declineRequest = useCallback(
    async (requestId, fromUid) => {
      if (!user?.id) return;

      // Remove the incoming request
      await remove(ref(db, `friendRequests/${user.id}/${requestId}`));

      // Remove from sender's outgoing requests
      if (fromUid) {
        const outRef = ref(db, `outgoingRequests/${fromUid}`);
        const snapshot = await get(outRef);
        const data = snapshot.val();
        if (data) {
          for (const [key, val] of Object.entries(data)) {
            if (val.to === user.id) {
              await remove(ref(db, `outgoingRequests/${fromUid}/${key}`));
            }
          }
        }
      }
    },
    [user?.id]
  );

  // ─── Cancel outgoing request ───
  const cancelRequest = useCallback(
    async (requestId, toUid) => {
      if (!user?.id) return;

      // Remove our outgoing
      await remove(ref(db, `outgoingRequests/${user.id}/${requestId}`));

      // Remove from target's incoming
      if (toUid) {
        const inRef = ref(db, `friendRequests/${toUid}`);
        const snapshot = await get(inRef);
        const data = snapshot.val();
        if (data) {
          for (const [key, val] of Object.entries(data)) {
            if (val.from === user.id) {
              await remove(ref(db, `friendRequests/${toUid}/${key}`));
            }
          }
        }
      }
    },
    [user?.id]
  );

  // ─── Remove friend ───
  const removeFriend = useCallback(
    async (friendUid) => {
      if (!user?.id) return;
      await remove(ref(db, `friends/${user.id}/${friendUid}`));
      await remove(ref(db, `friends/${friendUid}/${user.id}`));
    },
    [user?.id]
  );

  // ─── Get friend profile with presence ───
  const getFriendStatus = useCallback(
    (friendUid) => {
      const presence = presenceMap[friendUid];
      return presence?.online ? "online" : "offline";
    },
    [presenceMap]
  );

  // ─── Friends list as array with profiles ───
  const friendsList = useMemo(() => {
    return Object.keys(friends).map((uid) => {
      const profile = allUsers[uid] || {};
      return {
        id: uid,
        displayName: profile.displayName || uid,
        avatar: profile.avatar || `https://api.dicebear.com/7.x/avataaars/png?seed=${uid}`,
        status: getFriendStatus(uid),
        gamesPlayed: 0,
        hoursPlayed: 0,
      };
    });
  }, [friends, allUsers, getFriendStatus]);

  // ─── Fetch profiles of friends ───
  useEffect(() => {
    const friendUids = Object.keys(friends);
    if (friendUids.length === 0) return;

    friendUids.forEach((uid) => {
      const userRef = ref(db, `users/${uid}`);
      get(userRef).then((snapshot) => {
        const data = snapshot.val();
        if (data) {
          setAllUsers((prev) => ({ ...prev, [uid]: data }));
        }
      });
    });
  }, [friends]);

  // Also fetch profiles of incoming request senders
  useEffect(() => {
    incomingRequests.forEach((req) => {
      if (!allUsers[req.from]) {
        const userRef = ref(db, `users/${req.from}`);
        get(userRef).then((snapshot) => {
          const data = snapshot.val();
          if (data) {
            setAllUsers((prev) => ({ ...prev, [req.from]: data }));
          }
        });
      }
    });
  }, [incomingRequests]);

  const value = useMemo(
    () => ({
      friends: friendsList,
      friendsMap: friends,
      incomingRequests,
      outgoingRequests,
      notifications,
      presenceMap,
      searchResults,
      searching,
      searchUsers,
      sendFriendRequest,
      acceptRequest,
      declineRequest,
      cancelRequest,
      clearNotification,
      removeFriend,
      getFriendStatus,
      registerUserProfile,
      gameInvites,
      activeLobby,
      sendGameInvite,
      acceptGameInvite,
      declineGameInvite,
      leaveLobby,
      setActiveLobby,
    }),
    [
      friendsList,
      friends,
      incomingRequests,
      outgoingRequests,
      notifications,
      presenceMap,
      searchResults,
      searching,
      searchUsers,
      sendFriendRequest,
      acceptRequest,
      declineRequest,
      cancelRequest,
      clearNotification,
      removeFriend,
      getFriendStatus,
      registerUserProfile,
      gameInvites,
      activeLobby,
      sendGameInvite,
      acceptGameInvite,
      declineGameInvite,
      leaveLobby,
    ]
  );

  return (
    <FriendsContext.Provider value={value}>{children}</FriendsContext.Provider>
  );
}

export function useFriends() {
  return useContext(FriendsContext);
}

# Fun4Four — Game Integration Guide

> **Purpose**: This document describes the complete architecture for adding a new game to the Fun4Four launcher. Every game shares the same lobby system, invite flow, notification system, and UI patterns. Read this before implementing any new game.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Firebase Realtime Database Schema](#4-firebase-realtime-database-schema)
5. [Game Data Model](#5-game-data-model)
6. [Full User Flow: Game Selection → Lobby → Start](#6-full-user-flow)
7. [Adding a New Game — Step by Step](#7-adding-a-new-game--step-by-step)
8. [Shared Systems Reference](#8-shared-systems-reference)
9. [Design System & Styling](#9-design-system--styling)
10. [Key Files Reference](#10-key-files-reference)
11. [Navigation Architecture](#11-navigation-architecture)
12. [Icon System](#12-icon-system)
13. [Important Rules & Gotchas](#13-important-rules--gotchas)

---

## 1. Project Overview

**Fun4Four** is a React Native (Expo) multiplayer game launcher where players:
- Browse a library of 2-player games
- Add friends and see their online status
- Invite a friend to play a specific game
- Wait together in a lobby until both are ready
- The host starts the game, and both players enter the same game screen

Every game uses **the same lobby, invite, and notification pipeline**. Games only differ in their actual gameplay screen.

---

## 2. Tech Stack

| Layer          | Technology                                         |
|----------------|-----------------------------------------------------|
| Framework      | React Native 0.81.5 + Expo ~54.0.33                |
| Navigation     | @react-navigation/native-stack + bottom-tabs        |
| Backend        | Firebase 12.9.0 (Realtime Database + Auth)          |
| Auth           | Firebase Auth (email/password + Google sign-in)      |
| Icons          | Custom SVG icons via react-native-svg (no Ionicons)  |
| State          | React Context (AuthContext, FriendsContext)          |
| Styling        | StyleSheet.create with a shared color system        |

---

## 3. Project Structure

```
game-launcher-native/
├── App.js                          # Root: AuthProvider → FriendsProvider → RootNavigator
├── app.json                        # Expo config (scheme, Google client IDs)
├── assets/games/                   # Game cover images (local .jpg files)
├── src/
│   ├── components/
│   │   ├── game/
│   │   │   ├── GameCard.js          # Card in the carousel
│   │   │   ├── GameCarousel.js      # Horizontal game slider on Home
│   │   │   ├── GameDetailModal.js   # Modal: game info + partner picker → sends invite
│   │   │   ├── GameFocusOptions.js  # Focused game options
│   │   │   └── GameMenu.js          # Game menu (achievements, friends, etc.)
│   │   ├── layout/
│   │   │   ├── Header.js            # App header with bell icon (notifications + game invites)
│   │   │   ├── PageContainer.js     # Safe-area wrapper
│   │   │   └── PageTitle.js         # Section title component
│   │   ├── partner/
│   │   │   └── PartnerCard.js       # Friend card with online dot
│   │   └── ui/
│   │       ├── Avatar.js            # Avatar with URI or fallback
│   │       ├── Button.js            # Primary/secondary/outline/ghost button
│   │       ├── Card.js              # White rounded card with shadow
│   │       └── Icon.js              # Custom SVG icon component (15+ icons)
│   ├── context/
│   │   ├── AuthContext.js           # Firebase Auth: login, register, logout, Google
│   │   └── FriendsContext.js        # Friends, presence, search, game invites, lobby
│   ├── data/
│   │   └── mockData.js              # Game definitions (mockGames array)
│   ├── lib/
│   │   └── firebase.js              # Firebase app init, exports auth & db
│   ├── navigation/
│   │   ├── AuthStack.js             # Login → Register stack
│   │   ├── MainTabs.js              # Bottom tabs: Home, Partners, Profile
│   │   └── RootNavigator.js         # Auth check → MainStack (Tabs + GameLobby)
│   ├── screens/
│   │   ├── GameLobbyScreen.js       # Shared lobby: player cards, waiting state, start
│   │   ├── HomeScreen.js            # Game carousel + friends list
│   │   ├── LoginScreen.js
│   │   ├── PartnersScreen.js        # Friends / Requests / Discover tabs
│   │   ├── ProfileScreen.js
│   │   └── RegisterScreen.js
│   └── utils/
│       ├── colors.js                # Shared color palette
│       ├── constants.js             # App name, etc.
│       └── useResponsive.js         # Responsive scaling hook
```

---

## 4. Firebase Realtime Database Schema

```
firebase-rtdb/
├── users/{uid}/
│   ├── displayName: string
│   ├── displayNameLower: string
│   ├── email: string
│   ├── emailLower: string
│   ├── avatar: string (URL)
│   ├── createdAt: timestamp
│   └── updatedAt: timestamp
│
├── presence/{uid}/
│   ├── online: boolean
│   └── lastSeen: timestamp
│
├── friends/{uid}/{friendUid}: true
│
├── friendRequests/{toUid}/{requestId}/
│   ├── from: uid
│   ├── fromName: string
│   ├── fromAvatar: string
│   └── timestamp: timestamp
│
├── outgoingRequests/{fromUid}/{requestId}/
│   ├── to: uid
│   ├── toName: string
│   ├── toAvatar: string
│   └── timestamp: timestamp
│
├── notifications/{uid}/{notifId}/
│   ├── type: "friend_accepted" | ...
│   ├── from: uid
│   ├── fromName: string
│   ├── fromAvatar: string
│   └── timestamp: timestamp
│
├── gameInvites/{targetUid}/{inviteId}/
│   ├── type: "game_invite"
│   ├── lobbyId: string
│   ├── gameId: string
│   ├── gameTitle: string
│   ├── from: uid
│   ├── fromName: string
│   ├── fromAvatar: string
│   └── timestamp: timestamp
│
├── gameLobbies/{lobbyId}/
│   ├── lobbyId: string
│   ├── gameId: string
│   ├── gameTitle: string
│   ├── hostId: uid
│   ├── hostName: string
│   ├── createdAt: timestamp
│   ├── players/
│   │   └── {uid}/
│   │       ├── name: string
│   │       ├── avatar: string
│   │       ├── status: "in-lobby"
│   │       └── joinedAt: timestamp
│   └── invited/
│       └── {uid}/
│           ├── name: string
│           ├── avatar: string
│           ├── status: "pending" | "accepted" | "declined"
│           └── invitedAt: timestamp
│
├── userStats/{uid}/
│   └── ... (game statistics)
│
└── gameStats/{uid}/
    └── {gameId}/
        └── ... (per-game statistics)
```

---

## 5. Game Data Model

Every game in the launcher is defined in `src/data/mockData.js` with this shape:

```javascript
{
  id: "unique-string",           // Unique game identifier
  title: "Game Name",            // Display name
  coverImage: require("..."),    // Local image or { uri: "https://..." }
  description: "Short text.",    // One-liner for cards
  longDescription: "...",        // Full description for detail modal
  genre: ["Tag1", "Tag2"],       // Genre chips shown in modal
  players: 2,                    // Number of players (always 2 for now)
  status: "idle" | "playing",    // Current play status
  achievements: {
    total: 14,                   // Total achievement count
    unlocked: 6,                 // User's unlocked count
  },
}
```

### To add a new game to the launcher:
1. Add a cover image to `assets/games/`
2. Import it in `mockData.js` via `require()`
3. Add a new object to the `mockGames` array with a unique `id`

---

## 6. Full User Flow

This is the **universal flow** that every game follows. No exceptions.

### Step 1: Browse & Select Game
- **Screen**: `HomeScreen.js`
- User sees the game carousel on the home screen
- Taps a game card → `GameDetailModal` opens

### Step 2: Game Detail Modal
- **Component**: `GameDetailModal.js`
- Shows: cover image, title, stats (players, trophies, completion %), genre tags, description, achievement progress bar
- Two buttons at bottom: **"Play with Partner"** and **"Invite"**

### Step 3: Choose Partner
- User taps **"Play with Partner"**
- Modal swaps description area for a **partner picker**:
  - Shows friends list with online/offline status dots
  - Search bar to find non-friends (sends friend request, not game invite)
  - Tap a friend to select them (checkmark appears)
- Button changes to: **"Play with [Friend Name]"**

### Step 4: Send Game Invite
- User taps **"Play with [Name]"**
- Calls `friendsCtx.sendGameInvite(targetUid, targetProfile, game)`
- This function:
  1. Creates a lobby at `gameLobbies/{lobbyId}` with the sender as first player
  2. Writes an invite to `gameInvites/{targetUid}` 
  3. Sets `activeLobby` in context
  4. Returns the `lobbyId`
- Modal closes, user navigates to `GameLobbyScreen` with `{ lobbyId }`

### Step 5: Invited Player Receives Notification
- The bell icon in `Header.js` shows a badge count
- Notification panel shows: **"[Name] invited you to play [Game Title]"**
- Two buttons: **"Join"** (red) and **"Decline"**

### Step 6: Accept Invite → Join Lobby
- Invited player taps **"Join"**
- Calls `friendsCtx.acceptGameInvite(inviteId, lobbyId)`
- This function:
  1. Adds the player to `gameLobbies/{lobbyId}/players/`
  2. Updates `invited/{uid}/status` to `"accepted"`
  3. Removes the invite from `gameInvites/`
  4. Sets `activeLobby` in context
- Navigates to `GameLobbyScreen` with `{ lobbyId }`

### Step 7: Game Lobby Screen
- **Screen**: `GameLobbyScreen.js`
- **Both players see the same screen in real-time** (Firebase onValue listener)
- Shows:
  - Header: "GAME LOBBY" + game title
  - Status bar: "X in lobby" / "X pending"
  - Player cards side-by-side (avatar, name, status dot, host badge)
  - Empty dashed slot for pending invites
  - Waiting message: "Waiting for partner..." or "Everyone's here!"
- **Host sees "Start Game" button** when all players are in-lobby (≥2 players)
- Both players can "Leave Lobby"

### Step 8: Start Game (TODO — per-game implementation)
- Host taps **"Start Game"**
- This should:
  1. Write game state to Firebase (e.g., `gameLobbies/{lobbyId}/status: "started"`)
  2. Navigate both players to the actual game screen
  3. The game screen reads `lobbyId` and `gameId` from params
  4. Both players are now in the game

---

## 7. Adding a New Game — Step by Step

### 7.1 Define the Game
```javascript
// src/data/mockData.js — add to mockGames array
{
  id: "your-game-id",
  title: "Your Game Name",
  coverImage: require("../../assets/games/your-game.jpg"),
  description: "Short description.",
  longDescription: "Full description with more detail.",
  genre: ["Category1", "Category2"],
  players: 2,
  status: "idle",
  achievements: { total: 0, unlocked: 0 },
}
```

### 7.2 Create the Game Screen
```javascript
// src/screens/YourGameScreen.js
import React, { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { useFriends } from "../context/FriendsContext";
import { useAuth } from "../context/AuthContext";
import { db } from "../lib/firebase";
import { ref, onValue, set } from "firebase/database";

export function YourGameScreen({ route }) {
  const { lobbyId } = route.params;
  const { user } = useAuth();
  const friendsCtx = useFriends();
  const lobby = friendsCtx?.activeLobby;

  // The lobby object contains:
  // - lobby.lobbyId
  // - lobby.gameId
  // - lobby.gameTitle
  // - lobby.hostId (who can control the game)
  // - lobby.players (object of { uid: { name, avatar, status } })
  
  // Your game state should be stored at:
  // gameLobbies/{lobbyId}/gameState/...
  // Both players listen to this path for real-time sync

  return (
    <View>
      <Text>Your Game Here</Text>
    </View>
  );
}
```

### 7.3 Register the Screen in Navigation
```javascript
// src/navigation/RootNavigator.js — add to MainStack
import { YourGameScreen } from "../screens/YourGameScreen";

// Inside <Stack.Navigator>:
<Stack.Screen
  name="YourGame"
  component={YourGameScreen}
  options={{ animation: "slide_from_bottom" }}
/>
```

### 7.4 Wire "Start Game" in GameLobbyScreen
The "Start Game" button in `GameLobbyScreen.js` currently has a `// TODO`. To make it work for your game:

```javascript
// In GameLobbyScreen.js, the Start Game onPress:
onPress={() => {
  // Write started status to lobby
  set(ref(db, `gameLobbies/${lobby.lobbyId}/status`), "started");
  
  // Navigate to the game screen
  // The gameId determines which screen to open
  const gameId = lobby.gameId;
  
  // Map gameId to screen name
  const gameScreenMap = {
    "1": "Battleship",           // gameId → screen name
    "your-game-id": "YourGame",
  };
  
  const screenName = gameScreenMap[gameId];
  if (screenName) {
    navigation.replace(screenName, { lobbyId: lobby.lobbyId });
  }
}
```

Both players should listen to `gameLobbies/{lobbyId}/status` and navigate when it becomes `"started"`.

### 7.5 Game State Pattern
Store all game state under the lobby:

```
gameLobbies/{lobbyId}/gameState/
  ├── turn: uid              # Whose turn it is
  ├── round: number
  ├── board/                 # Game-specific state
  └── ...whatever your game needs
```

Both players listen with `onValue(ref(db, 'gameLobbies/{lobbyId}/gameState'))` for real-time sync.

---

## 8. Shared Systems Reference

### 8.1 FriendsContext API (src/context/FriendsContext.js)

Access via `const ctx = useFriends();`

| Property/Method           | Type       | Description                                          |
|---------------------------|------------|------------------------------------------------------|
| `friends`                 | Array      | Friends list with profiles `[{ id, displayName, avatar, status }]` |
| `friendsMap`              | Object     | Raw friends map `{ uid: true }`                      |
| `presenceMap`             | Object     | `{ uid: { online, lastSeen } }`                      |
| `gameInvites`             | Array      | Incoming game invites                                |
| `activeLobby`             | Object     | Current lobby data (real-time synced)                |
| `sendGameInvite(uid, profile, game)` | Function | Creates lobby + sends invite → returns lobbyId |
| `acceptGameInvite(inviteId, lobbyId)` | Function | Joins lobby → returns lobbyId            |
| `declineGameInvite(inviteId, lobbyId)` | Function | Removes invite, marks declined          |
| `leaveLobby()`            | Function   | Removes self from lobby players                     |
| `setActiveLobby(data)`    | Function   | Manually set active lobby (used on accept)           |
| `searchUsers(query)`      | Function   | Fuzzy search users by displayName                    |
| `sendFriendRequest(uid, profile)` | Function | Send friend request                           |
| `acceptRequest(reqId, fromUid)` | Function | Accept friend request                           |
| `declineRequest(reqId, fromUid)` | Function | Decline friend request                         |
| `clearNotification(id)`   | Function   | Dismiss a notification                               |
| `getFriendStatus(uid)`    | Function   | Returns "online" or "offline"                        |

### 8.2 AuthContext API (src/context/AuthContext.js)

Access via `const { user, login, register, logout } = useAuth();`

| Property        | Type     | Description                        |
|-----------------|----------|------------------------------------|
| `user`          | Object   | `{ id, email, displayName }` or null |
| `loading`       | boolean  | Auth state loading                 |
| `login(email, pass)` | Function | Firebase email/password sign-in |
| `register(email, pass, name)` | Function | Create account          |
| `logout()`      | Function | Sign out                           |
| `loginWithGoogle()` | Function | Google OAuth sign-in            |

### 8.3 Lobby Object Shape

```javascript
{
  lobbyId: "senderId_targetId_timestamp",
  gameId: "1",
  gameTitle: "Battleship",
  hostId: "firebase-uid",
  hostName: "Player",
  createdAt: serverTimestamp,
  players: {
    "uid1": { name: "Player1", avatar: "url", status: "in-lobby", joinedAt: ts },
    "uid2": { name: "Player2", avatar: "url", status: "in-lobby", joinedAt: ts },
  },
  invited: {
    "uid2": { name: "Player2", avatar: "url", status: "accepted", invitedAt: ts },
  },
}
```

---

## 9. Design System & Styling

### Color Palette (src/utils/colors.js)

| Token         | Hex       | Usage                              |
|---------------|-----------|-------------------------------------|
| `brandRed`    | `#E11D48` | Primary buttons, accents, badges   |
| `brandRedDark`| `#BE123C` | Pressed/active states              |
| `gray50`      | `#F8FAFC` | Subtle backgrounds                 |
| `gray100`     | `#F1F5F9` | Page background, input bg          |
| `gray200`     | `#E2E8F0` | Borders, dividers                  |
| `gray300`     | `#CBD5F5` | Disabled states                    |
| `gray400`     | `#94A3B8` | Placeholder text, labels           |
| `gray500`     | `#64748B` | Secondary text                     |
| `gray600`     | `#475569` | Body text                          |
| `gray700`     | `#334155` | Strong text                        |
| `gray900`     | `#111827` | Titles, headings                   |
| `white`       | `#FFFFFF` | Card backgrounds                   |
| `success`     | `#10B981` | Success states                     |

### Consistent Design Patterns

- **Border radius**: 16–20px for cards, 12px for buttons/inputs, 999px for pills
- **Cards**: White background, `borderRadius: 20`, `borderWidth: 1`, `borderColor: gray200`, subtle shadow
- **Buttons**: `borderRadius: 16`, `paddingVertical: 14`, full-width flex
- **Primary button**: `backgroundColor: brandRed`, white text, red shadow glow
- **Secondary button**: white bg, `borderWidth: 1`, `borderColor: gray200`, red text
- **Page background**: `colors.gray100`
- **Header**: white bg with bottom border, logo + bell icon
- **Status dots**: green `#22C55E` (online), amber `#F59E0B` (in-game), gray (offline)
- **Typography**: System font, weights 600–800, sizes 9–20px (responsive via `useResponsive`)

### Responsive Scaling

```javascript
import { useResponsive } from "../utils/useResponsive";
const { scale, hScale, vScale, width, height } = useResponsive();
// scale(12) → scales proportionally to screen
// hScale(6) → scales horizontally only
// vScale(8) → scales vertically only
```

---

## 10. Key Files Reference

| File | Purpose | When to modify |
|------|---------|----------------|
| `src/data/mockData.js` | Game definitions | Adding a new game |
| `src/navigation/RootNavigator.js` | Screen registration | Adding a new game screen |
| `src/screens/GameLobbyScreen.js` | Shared lobby (DO NOT DUPLICATE) | Wiring "Start Game" to route to correct game |
| `src/context/FriendsContext.js` | Invite + lobby logic (DO NOT DUPLICATE) | Never for new games |
| `src/components/game/GameDetailModal.js` | Game info + partner picker (shared) | Never for new games |
| `src/components/layout/Header.js` | Notifications bell (shared) | Never for new games |
| `src/components/ui/Icon.js` | SVG icon set | Adding new icons for a game |
| `src/utils/colors.js` | Color tokens | If game needs new colors |

---

## 11. Navigation Architecture

```
App.js
 └─ AuthProvider
     └─ FriendsProvider
         └─ RootNavigator
              ├─ (no user) → AuthStack (NativeStackNavigator)
              │                ├─ Login
              │                └─ Register
              └─ (user) → MainStack (NativeStackNavigator)
                            ├─ Tabs (BottomTabNavigator)
                            │    ├─ Home
                            │    ├─ Partners
                            │    └─ Profile
                            ├─ GameLobby        ← shared lobby screen
                            └─ [YourGameScreen]  ← add new game screens here
```

**Navigation to lobby**: `navigation.navigate("GameLobby", { lobbyId })`
**Navigation to game**: `navigation.replace("YourGame", { lobbyId })`

---

## 12. Icon System

Custom SVG icons in `src/components/ui/Icon.js`. Usage:

```jsx
import { Icon } from "../components/ui/Icon";
<Icon name="play" size={16} color={colors.white} />
```

Available icons: `search`, `close`, `check`, `play`, `lock`, `people`, `bell`, `bell-off`, `mail`, `mail-unread`, `send`, `link`, `globe`, `trophy`, `clock`, `home`, `joystick`, `user`

To add a new icon: add a `case "your-icon":` in the switch statement with an SVG `<Path>`.

---

## 13. Important Rules & Gotchas

1. **Every game uses the SAME lobby**. Never create a separate lobby system for a new game.
2. **Every game uses the SAME invite notification**. The bell icon handles all game invites identically.
3. **The GameDetailModal is shared**. All games show the same modal with the same partner picker.
4. **Game screens receive `lobbyId` as a route param**. Use it to read lobby data and game state from Firebase.
5. **The host controls the game start**. Only `user.id === lobby.hostId` sees the "Start Game" button.
6. **React hooks must be called before any early returns**. Always put `useWindowDimensions()`, `useSafeAreaInsets()`, etc. before `if (!data) return null`.
7. **No emoji icons**. Use the custom `<Icon>` component everywhere.
8. **Firebase v12.9.0** — import from `"firebase/database"`, not `"firebase/database/react-native"`.
9. **All game state should live under** `gameLobbies/{lobbyId}/gameState/` so both players sync in real-time.
10. **Lobby cleanup**: When both players leave, the lobby data remains in Firebase. Consider adding a cleanup function or TTL.

---

## Quick Reference: Minimal New Game Checklist

- [ ] Add cover image to `assets/games/`
- [ ] Add game object to `mockGames` in `src/data/mockData.js`
- [ ] Create game screen at `src/screens/YourGameScreen.js`
- [ ] Register screen in `src/navigation/RootNavigator.js` inside `MainStack`
- [ ] Add `gameId → screenName` mapping in `GameLobbyScreen.js` "Start Game" handler
- [ ] Store game state at `gameLobbies/{lobbyId}/gameState/`
- [ ] Both players listen to `gameState` with `onValue` for real-time sync
- [ ] Game screen reads `lobbyId` from `route.params`
- [ ] Use `colors.js` palette and `<Icon>` component for consistent UI

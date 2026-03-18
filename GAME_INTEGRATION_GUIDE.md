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
13. [Game Options System](#13-game-options-system)
14. [Match History System](#14-match-history-system)
15. [Adding Game-Specific Data for Options](#15-adding-game-specific-data-for-options)
16. [Important Rules & Gotchas](#16-important-rules--gotchas)

---

## 1. Project Overview

**Fun4Four** is a React Native (Expo) multiplayer game launcher where players:
- Browse a library of games supporting **2–4 players**
- Add friends and see their online status
- Invite one or more friends to play a specific game (up to `players - 1`)
- Wait together in a lobby until enough players join
- The host starts the game, and all players enter the same game screen

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
│   │   │   ├── GameFocusOptions.js  # Focused game options (tappable menu items)
│   │   │   ├── GameMenu.js          # Game menu (achievements, friends, etc.)
│   │   │   └── GameOptionModal.js   # Modal for each game option with unique content
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
│   ├── players/                         # 2–4 players
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
├── matchHistory/{uid}/{pushId}/
│   ├── lobbyId: string
│   ├── gameId: string
│   ├── gameTitle: string
│   ├── winnerId: uid
│   ├── loserId: uid
│   ├── players/
│   │   └── {uid}/
│   │       ├── name: string
│   │       ├── hits: number
│   │       └── misses: number
│   ├── startedAt: timestamp
│   ├── endedAt: timestamp
│   └── durationMs: number
│
├── userStats/{uid}/
│   └── ... (game statistics)
│
├── gameStats/{uid}/
│   └── {gameId}/
│       └── ... (per-game statistics)
│
├── ludoStats/{uid}/
│   ├── gamesPlayed: number
│   ├── gamesWon: number
│   └── totalCaptures: number
│
└── achievements/{uid}/{gameId}/{achievementId}/
    └── unlockedAt: timestamp
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
  players: 2,                    // Max players (2, 3, or 4) — controls partner picker limit
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
- **Invite button behavior**: pressing **"Invite"** closes the modal and opens the existing friend-adding flow in `PartnersScreen` on the **Discover** tab.

### Step 3: Choose Partner(s)
- User taps **"Play with Partner"** (or **"Play with Partners (up to N)"** for multi-player games)
- Modal swaps description area for a **partner picker**:
  - Shows friends list with online/offline status dots
  - Search bar to find non-friends (sends friend request, not game invite)
  - **Single-select** for 2-player games: tap a friend to select them (checkmark appears)
  - **Multi-select** for 3–4 player games: tap to toggle friends (up to `game.players - 1`), a counter shows **"N/max selected"**
- Button changes to: **"Play with [Friend Name]"** (1 selected) or **"Play with N friends"** (2+ selected)

### Step 4: Send Game Invite(s)
- User taps **"Play with [Name]"** or **"Play with N friends"**
- Calls `friendsCtx.sendGameInvite(partnersArray, game)` (new multi-player API)
  - Also supports the legacy call: `sendGameInvite(targetUid, targetProfile, game)` for 2-player
- This function:
  1. Creates a lobby at `gameLobbies/{lobbyId}` with the sender as first player
  2. Adds **all** selected partners to `invited/` in the lobby
  3. Writes an invite to `gameInvites/{targetUid}` **for each** selected partner
  4. Sets `activeLobby` in context
  5. Returns the `lobbyId`
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
- **All players see the same screen in real-time** (Firebase onValue listener)
- Shows:
  - Header: "GAME LOBBY" + game title
  - Status bar: "X/maxPlayers in lobby" / "X pending"
  - Player cards in a responsive layout (side-by-side for 2P, 2×2 grid for 4P)
  - Empty dashed slots for pending invites
  - Waiting message: "Waiting for players..." or "Everyone's here!"
  - **Invite button** inside the lobby to add more friends (for 3–4 player games)
- **Host sees "Start Game" button** when at least 2 players are in-lobby
- All players can "Leave Lobby"

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
  players: 2,             // Max players: 2, 3, or 4
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
| `matchHistory`            | Array      | All match records for the current user, sorted by most recent first |
| `gameInvites`             | Array      | Incoming game invites                                |
| `activeLobby`             | Object     | Current lobby data (real-time synced)                |
| `sendGameInvite(partners, game)` | Function | Creates lobby + sends invites to all partners → returns lobbyId. Also accepts legacy `(uid, profile, game)` for backwards compat. |
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
  gameId: "4",
  gameTitle: "Ludo",
  hostId: "firebase-uid",
  hostName: "Player",
  createdAt: serverTimestamp,
  players: {
    "uid1": { name: "Player1", avatar: "url", status: "in-lobby", joinedAt: ts },
    "uid2": { name: "Player2", avatar: "url", status: "in-lobby", joinedAt: ts },
    "uid3": { name: "Player3", avatar: "url", status: "in-lobby", joinedAt: ts },
  },
  invited: {
    "uid2": { name: "Player2", avatar: "url", status: "accepted", invitedAt: ts },
    "uid3": { name: "Player3", avatar: "url", status: "accepted", invitedAt: ts },
    "uid4": { name: "Player4", avatar: "url", status: "pending", invitedAt: ts },
  },
}
```

---

## 9. Design System & Styling

### CRITICAL RULE: Launcher vs Game Themes

There are **two separate theming zones** in this project. Mixing them up is the most common styling mistake.

#### Zone 1 — Game Launcher (LIGHT theme)

**Applies to:** HomeScreen, ProfileScreen, PartnersScreen, GameLobbyScreen, Header, PageContainer, all shared UI components, modals, cards, notifications.

**These screens are part of the launcher app itself — NOT part of any individual game.** They must all use the shared light color palette from `src/utils/colors.js`.

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

**Launcher design rules:**
- **Page background**: `colors.gray100` (light gray)
- **Cards**: `colors.white` bg, `borderRadius: 20`, `borderColor: colors.gray200`, subtle shadow
- **Buttons**: `colors.brandRed` primary, white secondary with red text
- **Header**: white bg with `colors.gray200` bottom border
- **Text**: `colors.gray900` headings, `colors.gray500` secondary, `colors.gray400` muted
- **Status dots**: `colors.success` (online), `#F59E0B` (in-game/joining), `colors.gray400` (offline)
- **VS badge / invite accent**: `colors.brandRed`
- **Import**: `import { colors } from "../utils/colors";`

```javascript
// ✅ CORRECT — Launcher screen (GameLobbyScreen, HomeScreen, etc.)
import { colors } from "../utils/colors";
// Use: colors.gray100, colors.brandRed, colors.white, etc.
```

```javascript
// ❌ WRONG — Never use a custom dark palette in launcher screens
const C = { bg: "#0B0F1A", card: "#151A2D" }; // This is game-level theming!
```

#### Zone 2 — Individual Game Screens (GAME-SPECIFIC dark themes)

**Applies to:** BattleshipScreen, SlagalicaScreen, LudoScreen, and any future game screen.

Each game defines its **own self-contained color palette** as constants at the top of its file. Games do NOT use `PageContainer`, `Header`, or other shared launcher components. Games are full-screen immersive experiences with their own visual identity.

| Game        | Background  | Accent    | Theme Description              |
|-------------|-------------|-----------|--------------------------------|
| Battleship  | `#040E1A`   | `#3B82F6` | Dark navy blue, ocean feel     |
| Slagalica   | `#0D0221`   | `#7C3AED` | Deep purple/gold, quiz show    |
| Ludo        | `#0F172A`   | per-player| Dark slate, 4 player colors    |

**Game theming rules:**
- Each game defines colors as local constants (NOT in `colors.js`)
- Games use dark backgrounds for an immersive feel
- Games can import `colors` for minor shared values (e.g., `colors.success` for win states) but their main palette is self-contained
- Games manage their own header/back button — they do NOT use `<Header />`
- Games do NOT wrap in `<PageContainer>` — they use `flex: 1` with their own background

```javascript
// ✅ CORRECT — Game screen with its own palette
// BattleshipScreen.js
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#040E1A" }, // Game's own dark bg
});

// ✅ CORRECT — Ludo with per-player colors defined locally
const PLAYER_COLORS = {
  0: { main: "#DC2626", light: "#FEE2E2", dark: "#991B1B", name: "Red" },
  1: { main: "#EAB308", light: "#FEF9C3", dark: "#A16207", name: "Yellow" },
  // ...
};
```

### Summary: When to use what

| Screen / Component         | Theme zone | Background      | Import                        |
|---------------------------|------------|-----------------|-------------------------------|
| HomeScreen                | Launcher   | `colors.gray100`| `import { colors } from ...` |
| ProfileScreen             | Launcher   | `colors.gray100`| `import { colors } from ...` |
| PartnersScreen            | Launcher   | `colors.gray100`| `import { colors } from ...` |
| GameLobbyScreen           | Launcher   | `colors.gray100`| `import { colors } from ...` |
| LoginScreen / Register    | Launcher   | `colors.gray100`| `import { colors } from ...` |
| Header, PageContainer     | Launcher   | `colors.white`  | `import { colors } from ...` |
| Card, Button, Avatar      | Launcher   | `colors.white`  | `import { colors } from ...` |
| BattleshipScreen          | Game       | `#040E1A`       | local constants               |
| SlagalicaScreen           | Game       | `#0D0221`       | local constants               |
| LudoScreen                | Game       | `#0F172A`       | local constants               |
| Any new game screen       | Game       | custom dark     | local constants               |

### Consistent Launcher Design Patterns

- **Border radius**: 16–20px for cards, 12px for buttons/inputs, 999px for pills
- **Cards**: White background, `borderRadius: 20`, `borderWidth: 1`, `borderColor: gray200`, subtle shadow
- **Buttons**: `borderRadius: 16`, `paddingVertical: 14`, full-width flex
- **Primary button**: `backgroundColor: brandRed`, white text, red shadow glow
- **Secondary button**: white bg, `borderWidth: 1`, `borderColor: gray200`, red text
- **Header**: white bg with bottom border, logo + bell icon
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
| `src/components/game/GameOptionModal.js` | Game option modals (Achievements, Friends, News, Rules, Guide, Info) | Adding game-specific data for a new game (4 constants) |
| `src/navigation/RootNavigator.js` | Screen registration | Adding a new game screen |
| `src/screens/GameLobbyScreen.js` | Shared lobby (DO NOT DUPLICATE) | Wiring "Start Game" to route to correct game |
| `src/context/FriendsContext.js` | Invite + lobby + match history logic (DO NOT DUPLICATE) | Never for new games |
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

## 13. Game Options System

Every game in the carousel has a set of 6 tappable options that appear when the game card is focused. Each option opens a modal (`GameOptionModal.js`) with unique, game-specific content. **Every new game must provide data for all 6 options.**

### 13.1 Option List

| Option | Data Source | Description |
|--------|------------|-------------|
| **Achievements** | `GAME_ACHIEVEMENTS[gameId]` constant | List of game-specific achievements with labels, descriptions, and icons |
| **Friends** | Live Firebase data (`useFriends()`, `useAuth()`) | Real friends list with match history together for this game (wins, losses, match cards) |
| **News** | `GAME_NEWS[gameId]` constant | Game-specific news articles with titles, descriptions, dates, and category tags |
| **Game Rules** | `GAME_RULES[gameId]` constant | Real rules for the game: overview text + sections with numbered rules |
| **Guide** | `GAME_GUIDE[gameId]` constant | Strategy tips organized in sections with numbered tips |
| **Info** | Live Firebase data + game object | Game details card (title, players, genre, status) + personal statistics computed from match history |

### 13.2 How Options Flow

```
User taps game card → GameFocusOptions appears (red dropdown)
  ↓
User taps an option (e.g. "Achievements")
  ↓
GameCarousel sets optionModal = { visible: true, option: "Achievements" }
  ↓
GameOptionModal renders with:
  - Blurred hero image background at top
  - Title overlay on the hero image
  - White content card with the selected option's content
  - Close button (X icon)
```

### 13.3 Component Architecture

```
GameCarousel.js
  ├── GameFocusOptions (red dropdown menu)
  │     └── onOptionPress → sets optionModal state
  └── GameOptionModal (full-screen modal)
        └── Renders one of:
              ├── AchievementsContent (game)
              ├── FriendsContent (game)      ← uses Firebase live data
              ├── NewsContent (game)
              ├── GameRulesContent (game)
              ├── GuideContent (game)
              └── InfoContent (game)          ← uses Firebase live data
```

### 13.4 Data Constants Structure

All game-specific constants live at the top of `src/components/game/GameOptionModal.js`, keyed by game ID.

#### GAME_ACHIEVEMENTS

```javascript
const GAME_ACHIEVEMENTS = {
  "your-game-id": [
    {
      id: "unique_id",       // Unique identifier for the achievement
      label: "Display Name", // Short achievement name
      desc: "Description",   // What the player needs to do
      icon: "trophy",        // Icon name from Icon.js (trophy, play, check, clock, people, search, globe)
    },
    // ... more achievements
  ],
};
```

The first N achievements (matching `game.achievements.unlocked`) are shown as unlocked, the rest as locked. A progress bar shows the percentage.

#### GAME_NEWS

```javascript
const GAME_NEWS = {
  "your-game-id": [
    {
      id: 1,
      title: "News Title",
      desc: "Full description text.",
      date: "Mar 15, 2026",      // Display date string
      tag: "Update",              // Category: Update | Event | Patch | Tournament | Cosmetics | Season
    },
    // ... more news items
  ],
};
```

Tags get automatic color coding:
- Update → blue `#3B82F6`
- Event → purple `#8B5CF6`
- Patch → amber `#F59E0B`
- Tournament → red `#E11D48`
- Cosmetics → pink `#EC4899`
- Season → green `#10B981`

#### GAME_RULES

```javascript
const GAME_RULES = {
  "your-game-id": {
    overview: "One-paragraph description of the game and its objective.",
    sections: [
      {
        title: "Section Name",     // e.g. "Setup", "Gameplay", "Winning"
        rules: [
          "Rule 1 text.",
          "Rule 2 text.",
          // Each rule gets a numbered circle in the UI
        ],
      },
      // ... more sections
    ],
  },
};
```

#### GAME_GUIDE

```javascript
const GAME_GUIDE = {
  "your-game-id": {
    sections: [
      {
        title: "Strategy Section Name",
        tips: [
          "Tip 1 text.",
          "Tip 2 text.",
          // Each tip gets a numbered bullet in the UI
        ],
      },
      // ... more sections
    ],
  },
};
```

### 13.5 Friends & Info Options (Live Data)

These two options do **not** use constants — they use real Firebase data at render time:

**Friends Option:**
- Reads `useFriends().friends` for the friends list
- Reads `useFriends().matchHistory` and filters by `game.id` to show per-friend match history
- Reads `useFriends().presenceMap` for online/offline status dots
- Shows: friend avatar, name, online dot, games played count, W/L record
- Expandable: tap a friend to see match cards with WIN/LOSS tag, hits, misses, duration, accuracy bar

**Info Option:**
- Reads `useFriends().matchHistory` and filters by `game.id`
- Computes: games played, wins, losses, win rate, total hits, total misses, accuracy, time played
- Shows: game details card (title, players, genre, status, achievements) + computed personal stats

---

## 14. Match History System

### 14.1 Firebase Path

```
matchHistory/{uid}/{pushId}/
  ├── lobbyId: string            // Lobby where the match was played
  ├── gameId: string             // Game identifier (e.g. "1" for Battleship)
  ├── gameTitle: string          // Display name (e.g. "Battleship")
  ├── winnerId: uid              // UID of the winner
  ├── loserId: uid               // UID of the loser
  ├── players/
  │   ├── {player1Uid}/
  │   │   ├── name: string       // Display name
  │   │   ├── hits: number       // Game-specific hit count
  │   │   └── misses: number     // Game-specific miss count
  │   └── {player2Uid}/
  │       ├── name: string
  │       ├── hits: number
  │       └── misses: number
  ├── startedAt: timestamp       // When the lobby was created
  ├── endedAt: timestamp         // When the game finished
  └── durationMs: number         // Duration in milliseconds
```

### 14.2 How to Record Match History in a New Game

Every game screen must save a match record when the game finishes. Here is the exact pattern from `BattleshipScreen.js`:

```javascript
import { ref, push, set } from "firebase/database";
import { db } from "../lib/firebase";

// Inside your game component:
const matchSavedRef = useRef(false);

useEffect(() => {
  // Only run when the game is in "finished" phase
  if (
    gameState?.phase !== "finished" ||
    !gameState?.winnerId ||
    !myId ||
    !opponentId ||
    !lobbyId ||
    matchSavedRef.current
  )
    return;

  // Only the winner writes (prevents duplicate records)
  if (gameState.winnerId !== myId) return;
  matchSavedRef.current = true;

  // Compute game-specific stats
  // Replace these with your game's stat calculation
  const myHits = /* calculate my hits */;
  const myMisses = /* calculate my misses */;
  const oppHits = /* calculate opponent hits */;
  const oppMisses = /* calculate opponent misses */;

  const startedAt = lobby?.createdAt || Date.now();
  const endedAt = Date.now();

  const record = {
    lobbyId,
    gameId: lobby?.gameId || "your-game-id",
    gameTitle: lobby?.gameTitle || "Your Game Title",
    winnerId: gameState.winnerId,
    loserId: opponentId,
    players: {
      [myId]: { name: myName, hits: myHits, misses: myMisses },
      [opponentId]: { name: oppName, hits: oppHits, misses: oppMisses },
    },
    startedAt,
    endedAt,
    durationMs: endedAt - (typeof startedAt === "number" ? startedAt : endedAt),
  };

  // Write to BOTH players' match history
  const myHistRef = push(ref(db, `matchHistory/${myId}`));
  const oppHistRef = push(ref(db, `matchHistory/${opponentId}`));
  set(myHistRef, record);
  set(oppHistRef, record);
}, [gameState?.phase, gameState?.winnerId, myId, opponentId, lobbyId]);
```

### 14.3 Key Rules for Match History

1. **Only the winner writes** — this prevents duplicate records from both players writing simultaneously.
2. **Use `matchSavedRef`** — a `useRef(false)` guard that prevents the effect from running twice.
3. **Write to ALL players' paths** — `matchHistory/{uid}` for every participant so everyone can read their history.
4. **Use `push()`** — generates a unique key for each record.
5. **Include `gameId`** — the Info and Friends options in `GameOptionModal` filter by this to show per-game stats.
6. **`hits` and `misses` are game-specific** — for Battleship it's shot results; for a racing game it could be checkpoints hit/missed; adapt to your game.
7. **Multi-player games**: The `players` object should include ALL participants (not just winner and one loser). For 3–4 player games, iterate over all player UIDs and write the record to each one's `matchHistory/{uid}` path.

### 14.4 How Match History Is Read

`FriendsContext.js` listens to `matchHistory/{uid}` for the authenticated user:

```javascript
useEffect(() => {
  if (!user?.id) return;
  const histRef = ref(db, `matchHistory/${user.id}`);
  const unsub = onValue(histRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) { setMatchHistory([]); return; }
    const list = Object.entries(data)
      .map(([id, val]) => ({ id, ...val }))
      .sort((a, b) => (b.endedAt || 0) - (a.endedAt || 0));
    setMatchHistory(list);
  });
  return () => unsub();
}, [user?.id]);
```

Components access it via: `const { matchHistory } = useFriends();`

---

## 15. Adding Game-Specific Data for Options

When you add a new game, you must add entries to **4 constants** in `src/components/game/GameOptionModal.js`:

### Step-by-Step

#### Step 1: Add your game ID to GAME_ACHIEVEMENTS

```javascript
const GAME_ACHIEVEMENTS = {
  "1": [ /* Battleship achievements */ ],
  "11": [ /* Runbound Rivals achievements */ ],
  "your-game-id": [
    { id: "first_game", label: "First Game", desc: "Play your first match", icon: "play" },
    { id: "first_win", label: "First Win", desc: "Win your first match", icon: "trophy" },
    // Add 10-20 achievements with varied icons
  ],
};
```

Make sure `game.achievements.total` in `mockData.js` matches the array length.

#### Step 2: Add your game ID to GAME_NEWS

```javascript
const GAME_NEWS = {
  "1": [ /* Battleship news */ ],
  "11": [ /* Runbound Rivals news */ ],
  "your-game-id": [
    { id: 1, title: "Launch Announcement", desc: "...", date: "Mar 15, 2026", tag: "Update" },
    // Add 3-5 news items with varied tags
  ],
};
```

#### Step 3: Add your game ID to GAME_RULES

```javascript
const GAME_RULES = {
  "1": { /* Battleship rules */ },
  "11": { /* Runbound Rivals rules */ },
  "your-game-id": {
    overview: "Describe the game in one paragraph.",
    sections: [
      { title: "Setup", rules: ["Rule 1.", "Rule 2."] },
      { title: "Gameplay", rules: ["Rule 1.", "Rule 2."] },
      { title: "Winning", rules: ["Rule 1."] },
    ],
  },
};
```

#### Step 4: Add your game ID to GAME_GUIDE

```javascript
const GAME_GUIDE = {
  "1": { /* Battleship guide */ },
  "11": { /* Runbound Rivals guide */ },
  "your-game-id": {
    sections: [
      { title: "Beginner Tips", tips: ["Tip 1.", "Tip 2."] },
      { title: "Advanced Strategy", tips: ["Tip 1.", "Tip 2."] },
    ],
  },
};
```

#### Step 5: Record match history in your game screen

Follow the pattern in [Section 14.2](#142-how-to-record-match-history-in-a-new-game). The Friends and Info options automatically pick up match history data — no extra wiring needed.

### What Happens Automatically

Once you add these 4 constants + match history recording:
- **Achievements** renders your achievement list with progress bar
- **Friends** automatically shows friends with match history for your game (filtered by `gameId`)
- **News** renders your news feed with colored category tags
- **Game Rules** renders your rules with numbered sections
- **Guide** renders your strategy tips
- **Info** computes personal statistics (games played, wins, losses, win rate, accuracy, time played) from match history

---

## 16. Important Rules & Gotchas

1. **Every game uses the SAME lobby**. Never create a separate lobby system for a new game.
2. **Every game uses the SAME invite notification**. The bell icon handles all game invites identically.
3. **The GameDetailModal is shared**. All games show the same modal with the same partner picker. It auto-switches between single-select (2P) and multi-select (3–4P) based on `game.players`.
4. **Game screens receive `lobbyId` as a route param**. Use it to read lobby data and game state from Firebase.
5. **The host controls the game start**. Only `user.id === lobby.hostId` sees the "Start Game" button.
6. **Multi-player games** (3–4P) allow the host to start with 2+ players. Not all slots need to be filled.
7. **React hooks must be called before any early returns**. Always put `useWindowDimensions()`, `useSafeAreaInsets()`, etc. before `if (!data) return null`.
8. **No emoji icons**. Use the custom `<Icon>` component everywhere.
9. **Firebase v12.9.0** — import from `"firebase/database"`, not `"firebase/database/react-native"`.
10. **All game state should live under** `gameLobbies/{lobbyId}/gameState/` so all players sync in real-time.
11. **Lobby cleanup**: When all players leave, the lobby data remains in Firebase. Consider adding a cleanup function or TTL.
12. **`sendGameInvite`** now accepts an array of partner objects `[{ id, displayName, avatar }]` as the first argument, creating invites for all selected partners at once.

---

## Quick Reference: Minimal New Game Checklist

**Game Definition:**
- [ ] Add cover image to `assets/games/`
- [ ] Add game object to `mockGames` in `src/data/mockData.js` (set `achievements.total` to match your achievements array length)

**Navigation & Lobby:**
- [ ] Create game screen at `src/screens/YourGameScreen.js`
- [ ] Register screen in `src/navigation/RootNavigator.js` inside `MainStack`
- [ ] Add `gameId → screenName` mapping in `GameLobbyScreen.js` "Start Game" handler

**Game State:**
- [ ] Store game state at `gameLobbies/{lobbyId}/gameState/`
- [ ] Both players listen to `gameState` with `onValue` for real-time sync
- [ ] Game screen reads `lobbyId` from `route.params`

**Game Options (GameOptionModal.js):**
- [ ] Add achievements array to `GAME_ACHIEVEMENTS["your-game-id"]` (10–20 items)
- [ ] Add news array to `GAME_NEWS["your-game-id"]` (3–5 items)
- [ ] Add rules object to `GAME_RULES["your-game-id"]` (overview + 2–3 sections)
- [ ] Add guide object to `GAME_GUIDE["your-game-id"]` (2–3 sections with tips)

**Match History:**
- [ ] Add match history recording effect (winner writes to both players' `matchHistory/{uid}`)
- [ ] Use `matchSavedRef` guard to prevent double-writes
- [ ] Include `gameId`, `winnerId`, `loserId`, player stats, timestamps, and `durationMs`

**Styling:**
- [ ] Use `colors.js` palette and `<Icon>` component for consistent UI

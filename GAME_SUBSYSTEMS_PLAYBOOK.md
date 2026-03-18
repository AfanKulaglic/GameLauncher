# Fun4Four Game Subsystems Playbook

Purpose: This file is the implementation contract for adding any new game to this project without breaking shared systems. Pin this file when building new games.

## 1. Architecture Contract

This project uses shared multiplayer infrastructure. A new game must plug into it, not replace it.

Shared systems that all games must reuse:
- Auth and user identity from src/context/AuthContext.js
- Friends and invites from src/context/FriendsContext.js
- Shared lobby from src/screens/GameLobbyScreen.js
- Game start trigger from GameLobby Start Game button
- Navigation stack from src/navigation/RootNavigator.js

Rule:
- Do not build a separate invite system.
- Do not build a separate lobby system.
- Do not duplicate auth/session logic.

## 2. Current Backend Model (Project-Accurate)

This repository is currently wired to Firebase Realtime Database, not Firestore.

Core paths:
- users/{uid}
- presence/{uid}
- friends/{uid}/{friendUid}
- friendRequests/{toUid}/{requestId}
- outgoingRequests/{fromUid}/{requestId}
- notifications/{uid}/{notificationId}
- gameInvites/{targetUid}/{inviteId}
- gameLobbies/{lobbyId}

Per-game state path (required):
- gameLobbies/{lobbyId}/gameState

## 3. Lifecycle For Every Game

1. Player picks game from Home
2. Invite sent via FriendsContext sendGameInvite (supports 1–3 partners depending on game.players)
3. All invited users join shared lobby
4. Host presses Start Game (requires at least 2 players in lobby)
5. Lobby writes status started and all users navigate to game screen
6. Game screen initializes gameState if missing
7. All users subscribe to gameLobbies/{lobbyId}
8. Game progresses through phase state machine
9. Game writes winner/result
10. User exits to lobby or rematch resets gameState

## 4. Required State Machine

Every game should implement a clear phase state:
- waiting
- setup
- in_progress
- finished

Minimal required fields under gameState:
- phase: string
- players: object keyed by uid (supports 2–4 players)
- currentTurn: uid or null
- winnerId: uid or null
- lastAction: object or null
- updatedAt: number timestamp
- playerOrder: array of uids (for turn rotation in multi-player games)

## 5. File Touchpoints For New Game

Mandatory edits:
1. Add game metadata in src/data/mockData.js
2. Create screen: src/screens/YourGameScreen.js
3. Register route in src/navigation/RootNavigator.js
4. Add gameId -> route mapping in src/screens/GameLobbyScreen.js
5. Store all game data under gameLobbies/{lobbyId}/gameState

Never required for normal game additions:
- src/context/FriendsContext.js (only if adding new shared multiplayer features)
- src/components/layout/Header.js (only if changing notification UX)

## 6. Navigation Contract

Input to game screen:
- route.params.lobbyId is required

Output transitions:
- Back to lobby: navigation.replace("GameLobby", { lobbyId })
- Optional finish screen: navigation.replace("YourGameOver", { lobbyId })

## 7. Multiplayer Write Rules (Application Layer)

Before writing game actions, always validate client-side:
- user is in lobby players
- phase allows action
- if turn-based, currentTurn equals user.id
- target cell/action not already consumed
- for multi-player captures/interactions, check against ALL opponents (not just one)

Host-only actions:
- initial game setup (if gameState missing)
- rematch reset (recommended)

Multi-player specific:
- Use playerOrder array for turn rotation (getNextTurnId helper)
- Track captures/actions against all opponents, not a single "opponent"
- Match history should be written for ALL players (winner writes records for every participant)

## 8. Realtime Subscription Pattern

Use one onValue listener per active match:
- subscribe to gameLobbies/{lobbyId}
- derive gameState from lobby.gameState
- derive all player data from lobby.players (supports 2–4 players)
- clean up listener on unmount

Avoid:
- separate listeners for many deep nodes unless needed
- writing local-only state that diverges from Firebase source of truth

## 9. UI/UX Contract

All game screens should:
- respect safe area insets
- fit on mobile without requiring accidental page scrolling
- use shared color tokens from src/utils/colors.js unless game needs custom accents
- keep actionable buttons reachable on small screens

Recommended visual sections:
- Header (title, phase)
- Status card (turn/action information)
- Main play area (board/canvas)
- Controls row
- Exit/Back action

## 10. Performance Guidelines

- Keep board/cell components lightweight
- Memoize derived data with useMemo
- Avoid full state rewrites when partial update works
- Prefer update() for RTDB partial writes

## 11. Error Handling Contract

- Show real Firebase error codes in UI while developing
- Keep action guards silent for invalid taps (or show small hint)
- Use Alert only for significant user-blocking errors

## 12. Security Rules Baseline (RTDB)

Ensure rules allow only lobby participants to read/write gameState:
- read/write allowed when auth uid is one of gameLobbies/{lobbyId}/players keys

Host-only write restrictions (recommended):
- only host can write setup transitions

## 13. New Game Checklist (Copy/Paste)

- [ ] Added metadata in src/data/mockData.js (set players to 2, 3, or 4)
- [ ] Added screen in src/screens
- [ ] Registered route in RootNavigator
- [ ] Added gameId route mapping in GameLobbyScreen
- [ ] Implemented phase state machine in gameState
- [ ] Added turn/action validation
- [ ] Added winner/end flow
- [ ] Added back-to-lobby flow
- [ ] Multi-player: uses playerOrder for turn rotation
- [ ] Multi-player: captures/interactions check ALL opponents
- [ ] Multi-player: match history written for ALL players
- [ ] Verified behavior with real users
- [ ] Verified no broken shared invite/lobby behavior

## 15. Multi-Player Support (3–4 Players)

### Partner Selection
- `GameDetailModal` reads `game.players` to determine max partners (`game.players - 1`)
- 2-player games: single-select partner picker (tap one friend)
- 3–4 player games: multi-select partner picker with toggle (checkmark per friend, counter shows "N/max selected")
- Button text adapts: "Play with [Name]" for 1, "Play with N friends" for 2+

### Invite System
- `sendGameInvite(partnersArray, game)` accepts an array of `{ id, displayName, avatar }` objects
- Creates a single lobby with ALL selected partners in the `invited/` map
- Sends a `gameInvites/{uid}` notification to EACH invited partner
- Legacy API `sendGameInvite(uid, profile, game)` still works for backwards compatibility

### Lobby
- `GameLobbyScreen` uses `gameMaxPlayers` map to determine max player count per game ID
- Player cards use a 2×2 grid layout for 4-player games
- Status shows "N/maxPlayers in lobby"
- Host can invite more friends via in-lobby invite button
- Host can start the game with 2+ players (not all slots need to be filled)

### Game State
- Use `playerOrder` array for turn cycling instead of hardcoded 2-player alternation
- Use dynamic player maps (`playerMap`) for color/role assignment
- Check captures and interactions against ALL opponents
- Match history must be written for ALL participants, not just winner and one loser

### Current Multi-Player Games
- **Ludo** (id: "4"): Supports 2–4 players, clockwise 52-cell board with 4 color quadrants

## 16. Battleship Reference In This Project

Battleship implementation file:
- src/screens/BattleshipScreen.js

Current Battleship features:
- placement phase
- ready state
- turn-based firing
- hit/miss resolution
- winner detection

Use this as implementation reference for future games.

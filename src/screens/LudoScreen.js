import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../components/ui/Icon";
import { colors } from "../utils/colors";
import { useAuth } from "../context/AuthContext";
import { db } from "../lib/firebase";
import { get, onValue, push, ref, set, update } from "firebase/database";

/* ═══════════════════════════════════════════════════════════════
   CONSTANTS & HELPERS
   ═══════════════════════════════════════════════════════════════ */
const PLAYER_COLORS = {
  0: { main: "#DC2626", light: "#FEE2E2", dark: "#991B1B", accent: "#FCA5A5", name: "Red" },
  1: { main: "#EAB308", light: "#FEF9C3", dark: "#A16207", accent: "#FDE68A", name: "Yellow" },
  2: { main: "#2563EB", light: "#DBEAFE", dark: "#1E40AF", accent: "#93C5FD", name: "Blue" },
  3: { main: "#16A34A", light: "#DCFCE7", dark: "#166534", accent: "#86EFAC", name: "Green" },
};

const BOARD_GRID = 15;
const TOKENS_PER_PLAYER = 4;

// 52-cell main path (row, col) on the 15×15 grid — clockwise from Red start
// Red enters at index 0, Blue enters at index 26
const MAIN_PATH_COORDS = (() => {
  const p = [];
  // Left arm top row, going right: [6,1]→[6,5]
  for (let c = 1; c <= 5; c++) p.push([6, c]);
  // Top arm left col, going up: [5,6]→[0,6]
  for (let r = 5; r >= 0; r--) p.push([r, 6]);
  // Top edge, going right: [0,7]→[0,8]
  p.push([0, 7], [0, 8]);
  // Top arm right col, going down: [1,8]→[5,8]
  for (let r = 1; r <= 5; r++) p.push([r, 8]);
  // Right arm top row, going right: [6,9]→[6,13]
  for (let c = 9; c <= 13; c++) p.push([6, c]);
  // Right edge, going down: [6,14]→[8,14]
  p.push([6, 14], [7, 14], [8, 14]);
  // Right arm bottom row, going left: [8,13]→[8,9]
  for (let c = 13; c >= 9; c--) p.push([8, c]);
  // Bottom arm right col, going down: [9,8]→[14,8]
  for (let r = 9; r <= 14; r++) p.push([r, 8]);
  // Bottom edge, going left: [14,7]→[14,6]
  p.push([14, 7], [14, 6]);
  // Bottom arm left col, going up: [13,6]→[9,6]
  for (let r = 13; r >= 9; r--) p.push([r, 6]);
  // Left arm bottom row, going left: [8,5]→[8,1]
  for (let c = 5; c >= 1; c--) p.push([8, c]);
  // Left edge, going up: [8,0]→[6,0]
  p.push([8, 0], [7, 0], [6, 0]);
  return p; // 52 cells total
})();

// Home columns (the final 6 cells before reaching the center)
const HOME_COLS = {
  0: [[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],       // Red (left→center)
  1: [[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],       // Yellow (top→center)
  2: [[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]],   // Blue (right→center)
  3: [[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]],   // Green (bottom→center)
};

// Entry indices on the main path
const ENTRY_INDEX = { 0: 0, 1: 13, 2: 26, 3: 39 };

// Safe squares (star positions) — indices on the main path
const SAFE_INDICES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

// Base positions (where tokens sit before entering the board)
const BASE_POSITIONS = {
  0: [[1,1],[1,3],[3,1],[3,3]],          // Red: top-left
  1: [[1,11],[1,13],[3,11],[3,13]],      // Yellow: top-right
  2: [[11,11],[11,13],[13,11],[13,13]],  // Blue: bottom-right
  3: [[11,1],[11,3],[13,1],[13,3]],      // Green: bottom-left
};

// Maps number of players to color indices used
const PLAYER_INDEX_MAP = {
  2: [0, 2],       // Red, Blue (opposite corners)
  3: [0, 1, 2],    // Red, Yellow, Blue
  4: [0, 1, 2, 3], // All four
};

/* ── Token position model ───
   Each token has: { state, pathIndex, homeIndex }
   state: "base" | "active" | "home_col" | "home"
   pathIndex: 0-51 index on MAIN_PATH_COORDS (when active)
   homeIndex: 0-5 index on HOME_COLS (when in home_col)
*/

function createInitialTokens() {
  return Array.from({ length: TOKENS_PER_PLAYER }, () => ({
    state: "base",
    pathIndex: -1,
    homeIndex: -1,
  }));
}

function getTokenCoords(playerIndex, token, tokenIdx) {
  if (token.state === "base") {
    return BASE_POSITIONS[playerIndex][tokenIdx];
  }
  if (token.state === "active") {
    // Calculate actual position on main path relative to this player's entry
    const entry = ENTRY_INDEX[playerIndex];
    const actualIdx = (entry + token.pathIndex) % MAIN_PATH_COORDS.length;
    return MAIN_PATH_COORDS[actualIdx];
  }
  if (token.state === "home_col") {
    return HOME_COLS[playerIndex][token.homeIndex];
  }
  if (token.state === "home") {
    return [7, 7]; // center
  }
  return BASE_POSITIONS[playerIndex][tokenIdx];
}

function getAbsolutePathIndex(playerIndex, relativeIndex) {
  return (ENTRY_INDEX[playerIndex] + relativeIndex) % MAIN_PATH_COORDS.length;
}

// Check if a move is valid for a token given a dice roll
function canMoveToken(token, diceValue, playerIndex, allTokens) {
  if (token.state === "home") return false;

  if (token.state === "base") {
    return diceValue === 6;
  }

  if (token.state === "active") {
    const stepsToHomeEntry = MAIN_PATH_COORDS.length - token.pathIndex;
    if (stepsToHomeEntry <= 0) {
      // Should already be in home_col
      return false;
    }
    if (diceValue < stepsToHomeEntry) {
      // Still on main path
      return true;
    }
    if (diceValue === stepsToHomeEntry) {
      // Enter home column at index 0
      return true;
    }
    // Overshoot into home column
    const homeSteps = diceValue - stepsToHomeEntry;
    return homeSteps <= 6; // max 6 home col cells
  }

  if (token.state === "home_col") {
    const newHomeIndex = token.homeIndex + diceValue;
    if (newHomeIndex === 6) return true; // exact landing = home
    if (newHomeIndex < 6) return true; // still in home col
    return false; // overshoot
  }

  return false;
}

function moveToken(token, diceValue, playerIndex) {
  if (token.state === "base" && diceValue === 6) {
    return { state: "active", pathIndex: 0, homeIndex: -1 };
  }

  if (token.state === "active") {
    const newPathIndex = token.pathIndex + diceValue;
    const stepsToHomeEntry = MAIN_PATH_COORDS.length;

    if (newPathIndex < stepsToHomeEntry) {
      return { state: "active", pathIndex: newPathIndex, homeIndex: -1 };
    }
    if (newPathIndex === stepsToHomeEntry) {
      return { state: "home_col", pathIndex: -1, homeIndex: 0 };
    }
    const homeSteps = newPathIndex - stepsToHomeEntry;
    if (homeSteps === 6) {
      return { state: "home", pathIndex: -1, homeIndex: 6 };
    }
    if (homeSteps < 6) {
      return { state: "home_col", pathIndex: -1, homeIndex: homeSteps };
    }
    return token; // invalid, shouldn't happen
  }

  if (token.state === "home_col") {
    const newHomeIndex = token.homeIndex + diceValue;
    if (newHomeIndex === 6) {
      return { state: "home", pathIndex: -1, homeIndex: 6 };
    }
    if (newHomeIndex < 6) {
      return { state: "home_col", pathIndex: -1, homeIndex: newHomeIndex };
    }
    return token; // overshoot
  }

  return token;
}

// Check if landing on opponent's token at a given absolute path index
function checkCapture(absIdx, opponentTokens, opponentIndex) {
  if (SAFE_INDICES.has(absIdx)) return []; // safe square, no capture

  const captured = [];
  for (let i = 0; i < opponentTokens.length; i++) {
    const opp = opponentTokens[i];
    if (opp.state === "active") {
      const oppAbs = getAbsolutePathIndex(opponentIndex, opp.pathIndex);
      if (oppAbs === absIdx) {
        captured.push(i);
      }
    }
  }
  return captured;
}

function hasAnyValidMove(tokens, diceValue, playerIndex) {
  return tokens.some((t) => canMoveToken(t, diceValue, playerIndex, tokens));
}

function allTokensHome(tokens) {
  return tokens.every((t) => t.state === "home");
}

/* ═══════════════════════════════════════════════════════════════
   DICE COMPONENT
   ═══════════════════════════════════════════════════════════════ */
function DiceFace({ value, size = 60, color = "#1a1a2e" }) {
  const dotSize = size * 0.15;
  const r = dotSize / 2;
  const positions = {
    tl: { top: size * 0.18, left: size * 0.18 },
    tc: { top: size * 0.18, left: size / 2 - r },
    tr: { top: size * 0.18, right: size * 0.18 },
    ml: { top: size / 2 - r, left: size * 0.18 },
    mc: { top: size / 2 - r, left: size / 2 - r },
    mr: { top: size / 2 - r, right: size * 0.18 },
    bl: { bottom: size * 0.18, left: size * 0.18 },
    bc: { bottom: size * 0.18, left: size / 2 - r },
    br: { bottom: size * 0.18, right: size * 0.18 },
  };

  const dotLayouts = {
    1: ["mc"],
    2: ["tl", "br"],
    3: ["tl", "mc", "br"],
    4: ["tl", "tr", "bl", "br"],
    5: ["tl", "tr", "mc", "bl", "br"],
    6: ["tl", "tr", "ml", "mr", "bl", "br"],
  };

  const dots = dotLayouts[value] || [];

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.2,
        backgroundColor: "#FAFAFA",
        borderWidth: 1.5,
        borderColor: "rgba(0,0,0,0.06)",
        shadowColor: "#000",
        shadowOpacity: 0.18,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
      }}
    >
      {/* Top highlight */}
      <View
        style={{
          position: "absolute",
          top: 2,
          left: size * 0.15,
          right: size * 0.15,
          height: size * 0.12,
          borderRadius: size * 0.1,
          backgroundColor: "rgba(255,255,255,0.9)",
        }}
      />
      {dots.map((pos) => (
        <View
          key={pos}
          style={{
            position: "absolute",
            width: dotSize,
            height: dotSize,
            borderRadius: r,
            backgroundColor: color,
            shadowColor: color,
            shadowOpacity: 0.3,
            shadowRadius: 2,
            shadowOffset: { width: 0, height: 1 },
            ...positions[pos],
          }}
        />
      ))}
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ANIMATED DICE
   ═══════════════════════════════════════════════════════════════ */
function AnimatedDice({ value, rolling, size = 60, color, onRollFinish }) {
  const bounceAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const [displayFace, setDisplayFace] = useState(value || 1);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (rolling) {
      // Rapid face cycling while rolling
      intervalRef.current = setInterval(() => {
        setDisplayFace(Math.floor(Math.random() * 6) + 1);
      }, 70);

      // Reset
      shakeAnim.setValue(0);
      spinAnim.setValue(0);
      bounceAnim.setValue(0.75);

      Animated.parallel([
        // Spin — 2 full rotations
        Animated.timing(spinAnim, {
          toValue: 2,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        // Shake — left-right rattle that decays
        Animated.sequence([
          Animated.timing(shakeAnim, { toValue: 1, duration: 55, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -1, duration: 55, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -1, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 0.6, duration: 45, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -0.6, duration: 45, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 0.3, duration: 40, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -0.3, duration: 40, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 0, duration: 35, useNativeDriver: true }),
        ]),
        // Scale pop
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: 1.2,
            duration: 200,
            easing: Easing.out(Easing.back(2)),
            useNativeDriver: true,
          }),
          Animated.spring(bounceAnim, {
            toValue: 1,
            friction: 3,
            tension: 180,
            useNativeDriver: true,
          }),
        ]),
      ]).start();

      // Land on final value
      const landTimer = setTimeout(() => {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        setDisplayFace(value || 1);

        bounceAnim.setValue(1.25);
        shakeAnim.setValue(0);

        Animated.parallel([
          Animated.spring(bounceAnim, {
            toValue: 1,
            friction: 3,
            tension: 250,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 0.25, duration: 55, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -0.25, duration: 55, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 45, useNativeDriver: true }),
          ]),
        ]).start(() => {
          if (onRollFinish) onRollFinish();
        });
      }, 650);

      return () => {
        clearTimeout(landTimer);
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    } else if (value) {
      setDisplayFace(value);
    }
  }, [rolling, value]);

  const rotate = shakeAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ["-22deg", "0deg", "22deg"],
  });

  const spin = spinAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: ["0deg", "360deg", "720deg"],
  });

  return (
    <Animated.View
      style={{
        transform: rolling
          ? [
              { rotate: spin },
              { rotate },
              { scale: bounceAnim },
            ]
          : [{ scale: 1 }],
      }}
    >
      <DiceFace value={displayFace} size={size} color={color} />
    </Animated.View>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TOKEN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
function TokenPiece({ color, size = 20, highlight = false, count = 1 }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (highlight) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.18, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [highlight]);

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        transform: [{ scale: highlight ? pulseAnim : 1 }],
      }}
    >
      {/* Outer shadow ring */}
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          borderWidth: highlight ? 2 : 1.5,
          borderColor: highlight ? "#FBBF24" : "rgba(0,0,0,0.15)",
          shadowColor: highlight ? "#FBBF24" : "#000",
          shadowOpacity: highlight ? 0.6 : 0.25,
          shadowRadius: highlight ? 6 : 3,
          shadowOffset: { width: 0, height: 2 },
          elevation: highlight ? 6 : 3,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {/* Inner shine */}
        <View
          style={{
            position: "absolute",
            top: size * 0.08,
            left: size * 0.15,
            width: size * 0.35,
            height: size * 0.2,
            borderRadius: size * 0.15,
            backgroundColor: "rgba(255,255,255,0.45)",
          }}
        />
        {/* Inner dark ring for depth */}
        <View
          style={{
            width: size * 0.55,
            height: size * 0.55,
            borderRadius: size * 0.3,
            backgroundColor: "rgba(0,0,0,0.12)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {count > 1 && (
            <Text style={{ fontSize: size * 0.35, fontWeight: "900", color: "#FFF" }}>
              {count}
            </Text>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

/* ═══════════════════════════════════════════════════════════════
   BOARD COMPONENT
   ═══════════════════════════════════════════════════════════════ */
function LudoBoard({
  getCellDim,
  playerTokens, // { 0: [...tokens], 1: [...tokens] }
  onTokenPress,
  highlightedTokens, // Set of "playerIdx-tokenIdx"
  lastCapture, // { row, col } for animation
}) {
  // Build a grid of what each cell is
  const grid = useMemo(() => {
    const g = Array.from({ length: BOARD_GRID }, () =>
      Array.from({ length: BOARD_GRID }, () => ({
        type: "empty",
        color: null,
        isSafe: false,
        isCenter: false,
      }))
    );

    // Mark main path cells
    MAIN_PATH_COORDS.forEach((coord, idx) => {
      const [r, c] = coord;
      g[r][c] = {
        type: "path",
        color: null,
        isSafe: SAFE_INDICES.has(idx),
        isCenter: false,
        pathIndex: idx,
      };
    });

    // Mark home columns
    Object.entries(HOME_COLS).forEach(([pIdx, cells]) => {
      cells.forEach(([r, c]) => {
        g[r][c] = {
          type: "home_col",
          color: PLAYER_COLORS[pIdx].main,
          isSafe: true,
          isCenter: false,
        };
      });
    });

    // Mark center
    g[7][7] = { type: "center", color: null, isSafe: true, isCenter: true };

    // Mark bases
    Object.entries(BASE_POSITIONS).forEach(([pIdx, cells]) => {
      cells.forEach(([r, c]) => {
        g[r][c] = {
          type: "base",
          color: PLAYER_COLORS[pIdx].main,
          isSafe: true,
          isCenter: false,
        };
      });
    });

    // Color the base quadrants
    // Red: rows 0-5, cols 0-5
    for (let r = 0; r <= 5; r++) {
      for (let c = 0; c <= 5; c++) {
        if (g[r][c].type === "empty") {
          g[r][c] = { type: "base_area", color: PLAYER_COLORS[0].light, isSafe: false, isCenter: false };
        }
      }
    }
    // Yellow: rows 0-5, cols 9-14
    for (let r = 0; r <= 5; r++) {
      for (let c = 9; c <= 14; c++) {
        if (g[r][c].type === "empty") {
          g[r][c] = { type: "base_area", color: PLAYER_COLORS[1].light, isSafe: false, isCenter: false };
        }
      }
    }
    // Green: rows 9-14, cols 0-5
    for (let r = 9; r <= 14; r++) {
      for (let c = 0; c <= 5; c++) {
        if (g[r][c].type === "empty") {
          g[r][c] = { type: "base_area", color: PLAYER_COLORS[3].light, isSafe: false, isCenter: false };
        }
      }
    }
    // Blue: rows 9-14, cols 9-14
    for (let r = 9; r <= 14; r++) {
      for (let c = 9; c <= 14; c++) {
        if (g[r][c].type === "empty") {
          g[r][c] = { type: "base_area", color: PLAYER_COLORS[2].light, isSafe: false, isCenter: false };
        }
      }
    }

    // Color the entry squares with each player's color
    Object.entries(ENTRY_INDEX).forEach(([pIdx, entryIdx]) => {
      if (MAIN_PATH_COORDS[entryIdx]) {
        const [er, ec] = MAIN_PATH_COORDS[entryIdx];
        g[er][ec].color = PLAYER_COLORS[pIdx].main;
      }
    });

    return g;
  }, []);

  // Build token position map: { "row-col": [{ playerIdx, tokenIdx, token }] }
  const tokenPositionMap = useMemo(() => {
    const map = {};
    Object.entries(playerTokens).forEach(([pIdx, tokens]) => {
      const pi = parseInt(pIdx, 10);
      tokens.forEach((token, tIdx) => {
        const [r, c] = getTokenCoords(pi, token, tIdx);
        const key = `${r}-${c}`;
        if (!map[key]) map[key] = [];
        map[key].push({ playerIdx: pi, tokenIdx: tIdx, token });
      });
    });
    return map;
  }, [playerTokens]);

  const getCellBg = (cell) => {
    if (cell.isCenter) return "#F8FAFC";
    if (cell.type === "base_area") return cell.color || "#FAFAFA";
    if (cell.type === "base") return cell.color;
    if (cell.type === "home_col") return cell.color + "25";
    if (cell.type === "path") {
      if (cell.color) return cell.color + "22";
      return "#FFFFFF";
    }
    return "#F1F5F9";
  };

  const getCellBorder = (cell) => {
    if (cell.type === "empty" || cell.type === "base_area" || cell.type === "base") return "transparent";
    if (cell.type === "home_col") return cell.color + "20";
    return "rgba(0,0,0,0.08)";
  };

  return (
    <View
      style={{
        borderRadius: 12,
        overflow: "hidden",
        borderWidth: 2.5,
        borderColor: "rgba(100,116,139,0.3)",
        shadowColor: "#000",
        shadowOpacity: 0.3,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 12,
        backgroundColor: "#F1F5F9",
      }}
    >
      {grid.map((row, rIdx) => (
        <View key={rIdx} style={{ flexDirection: "row" }}>
          {row.map((cell, cIdx) => {
            const key = `${rIdx}-${cIdx}`;
            const tokensHere = tokenPositionMap[key] || [];
            const cw = getCellDim(cIdx);
            const ch = getCellDim(rIdx);
            const cs = Math.min(cw, ch);

            // Detect if this is a base cell (token parking spot) for prettier rendering
            const isBaseSpot = cell.type === "base";
            const isSafePath = cell.isSafe && cell.type === "path";
            const isEntrySquare = cell.type === "path" && cell.color;

            return (
              <Pressable
                key={key}
                onPress={() => {
                  if (tokensHere.length > 0 && onTokenPress) {
                    const highlighted = tokensHere.find(
                      (t) => highlightedTokens?.has(`${t.playerIdx}-${t.tokenIdx}`)
                    );
                    const picked = highlighted || tokensHere[0];
                    onTokenPress(picked.playerIdx, picked.tokenIdx);
                  }
                }}
                style={{
                  width: cw,
                  height: ch,
                  backgroundColor: getCellBg(cell),
                  borderWidth: (cell.type === "empty" || cell.type === "base_area" || cell.type === "base") ? 0 : 0.5,
                  borderColor: getCellBorder(cell),
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {/* Center target */}
                {cell.isCenter && (
                  <View style={{
                    position: "absolute",
                    width: cs * 0.7,
                    height: cs * 0.7,
                    borderRadius: cs * 0.35,
                    borderWidth: 2,
                    borderColor: "rgba(100,116,139,0.2)",
                    backgroundColor: "rgba(100,116,139,0.06)",
                  }} />
                )}

                {/* Safe square star */}
                {isSafePath && (
                  <View style={{ position: "absolute", alignItems: "center", justifyContent: "center" }}>
                    <View style={{
                      width: cs * 0.38,
                      height: cs * 0.38,
                      transform: [{ rotate: "45deg" }],
                      backgroundColor: "rgba(234,179,8,0.2)",
                      borderRadius: 2,
                    }} />
                    <View style={{
                      position: "absolute",
                      width: cs * 0.2,
                      height: cs * 0.2,
                      transform: [{ rotate: "45deg" }],
                      backgroundColor: "rgba(234,179,8,0.35)",
                      borderRadius: 1,
                    }} />
                  </View>
                )}

                {/* Entry square indicator dot */}
                {isEntrySquare && !isSafePath && (
                  <View style={{
                    position: "absolute",
                    width: cs * 0.22,
                    height: cs * 0.22,
                    borderRadius: cs * 0.11,
                    backgroundColor: cell.color + "40",
                  }} />
                )}

                {/* Base spot circle */}
                {isBaseSpot && tokensHere.length === 0 && (
                  <View style={{
                    width: cs * 0.62,
                    height: cs * 0.62,
                    borderRadius: cs * 0.31,
                    backgroundColor: "rgba(255,255,255,0.45)",
                    borderWidth: 2,
                    borderColor: "rgba(255,255,255,0.7)",
                    shadowColor: "rgba(0,0,0,0.15)",
                    shadowOpacity: 1,
                    shadowRadius: 3,
                    shadowOffset: { width: 0, height: 1 },
                    elevation: 2,
                  }} />
                )}

                {/* Home column directional dot */}
                {cell.type === "home_col" && tokensHere.length === 0 && (
                  <View style={{
                    width: cs * 0.18,
                    height: cs * 0.18,
                    borderRadius: cs * 0.09,
                    backgroundColor: cell.color + "40",
                  }} />
                )}

                {tokensHere.length > 0 && (() => {
                  const grouped = {};
                  tokensHere.forEach((t) => {
                    const k = t.playerIdx;
                    if (!grouped[k]) grouped[k] = [];
                    grouped[k].push(t);
                  });
                  const entries = Object.entries(grouped);
                  
                  if (entries.length === 1) {
                    const [pIdx, toks] = entries[0];
                    const isHighlighted = toks.some(
                      (t) => highlightedTokens?.has(`${t.playerIdx}-${t.tokenIdx}`)
                    );
                    return (
                      <TokenPiece
                        color={PLAYER_COLORS[pIdx].main}
                        size={cs * 0.72}
                        highlight={isHighlighted}
                        count={toks.length}
                      />
                    );
                  }
                  return entries.map(([pIdx, toks]) => (
                    <TokenPiece
                      key={pIdx}
                      color={PLAYER_COLORS[pIdx].main}
                      size={cs * 0.5}
                      count={toks.length}
                    />
                  ));
                })()}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN LUDO SCREEN
   ═══════════════════════════════════════════════════════════════ */
export function LudoScreen({ route }) {
  const { lobbyId } = route?.params || {};
  const navigation = useNavigation();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const [lobby, setLobby] = useState(null);
  const [diceValue, setDiceValue] = useState(null);
  const [rolling, setRolling] = useState(false);
  const [hasRolled, setHasRolled] = useState(false);
  const [showingResult, setShowingResult] = useState(false);
  const [rollAttempt, setRollAttempt] = useState(0);
  const [consecutiveSixes, setConsecutiveSixes] = useState(0);
  const [message, setMessage] = useState("");

  const matchSavedRef = useRef(false);
  const quitSavedRef = useRef(false);

  // Firebase listener
  useEffect(() => {
    if (!lobbyId) return;
    const lobbyRef = ref(db, `gameLobbies/${lobbyId}`);
    const unsub = onValue(lobbyRef, (snap) => {
      setLobby(snap.val() || null);
    });
    return () => unsub();
  }, [lobbyId]);

  const gameState = lobby?.gameState;
  const players = lobby?.players || {};
  const playerIds = Object.keys(players);
  const numPlayers = playerIds.length;
  const myId = user?.id;
  const myName = user?.displayName || user?.username || "You";

  // Player order and color mapping (set by host on init)
  const playerOrder = gameState?.playerOrder || [];
  const playerMap = gameState?.playerMap || {};
  const myColorIndex = playerMap[myId] ?? 0;

  const getPlayerName = useCallback((uid) => {
    if (uid === myId) return myName;
    return players[uid]?.name || "Player";
  }, [myId, myName, players]);

  const getNextTurnId = useCallback((currentId) => {
    if (playerOrder.length === 0) return currentId;
    const idx = playerOrder.indexOf(currentId);
    return playerOrder[(idx + 1) % playerOrder.length];
  }, [playerOrder]);

  const gameId = lobby?.gameId || "4";
  const isMyTurn = gameState?.currentTurn === myId;
  const currentTurnName = getPlayerName(gameState?.currentTurn);
  const phase = gameState?.phase;
  const isPaused = !!gameState?.pausedBy;

  // Initialize game state (host only) — starts with color_pick phase
  useEffect(() => {
    if (!lobbyId || !myId || !lobby) return;
    if (lobby.hostId !== myId) return;
    if (gameState) return;
    if (numPlayers < 2) return;

    const sorted = [myId, ...playerIds.filter(id => id !== myId)];

    const initState = {
      phase: "color_pick",
      currentTurn: null,
      winnerId: null,
      pausedBy: null,
      playerOrder: sorted,
      playerMap: {},
      colorPicks: {},
      consecutiveSixes: {},
      capturesMade: {},
      tokens: {},
      lastAction: null,
      updatedAt: Date.now(),
    };

    set(ref(db, `gameLobbies/${lobbyId}/gameState`), initState);
  }, [lobbyId, myId, lobby?.hostId, numPlayers]);

  // Get my tokens
  const myTokens = useMemo(() => {
    if (!gameState?.tokens?.[myId]) return createInitialTokens();
    return gameState.tokens[myId].map((t) => ({ ...t }));
  }, [gameState?.tokens, myId]);

  // Build playerTokens map using color indices for ALL players
  const playerTokensMap = useMemo(() => {
    const map = {};
    playerOrder.forEach((uid) => {
      const colorIdx = playerMap[uid];
      if (colorIdx != null) {
        const toks = gameState?.tokens?.[uid] || createInitialTokens();
        map[colorIdx] = toks.map((t) => ({ ...t }));
      }
    });
    return map;
  }, [gameState?.tokens, playerOrder, playerMap]);

  // Check if player has no tokens on the field (all base or home)
  const hasNoTokensOnField = useMemo(() => {
    return myTokens.every((t) => t.state === "base" || t.state === "home");
  }, [myTokens]);

  const maxRollAttempts = hasNoTokensOnField ? 3 : 1;

  // Determine which tokens can be moved
  const movableTokens = useMemo(() => {
    if (!isMyTurn || !hasRolled || !diceValue) return new Set();
    const set_ = new Set();
    myTokens.forEach((token, idx) => {
      if (canMoveToken(token, diceValue, myColorIndex, myTokens)) {
        set_.add(`${myColorIndex}-${idx}`);
      }
    });
    return set_;
  }, [isMyTurn, hasRolled, diceValue, myTokens, myColorIndex]);

  // Reset hasRolled when turn changes
  useEffect(() => {
    if (gameState?.currentTurn !== myId) {
      setHasRolled(false);
      setDiceValue(null);
      setRollAttempt(0);
    }
  }, [gameState?.currentTurn, myId]);

  // Update message
  useEffect(() => {
    if (!gameState) return;
    if (gameState.phase === "finished") {
      setMessage(gameState.winnerId === myId ? "You win!" : (gameState.winnerId ? `${getPlayerName(gameState.winnerId)} won!` : "Game over!"));
      return;
    }
    if (isPaused) {
      setMessage("Game paused");
      return;
    }
    if (isMyTurn) {
      if (!hasRolled) {
        if (hasNoTokensOnField && rollAttempt > 0) {
          setMessage(`No 6 yet — roll again (${rollAttempt}/${maxRollAttempts})`);
        } else if (hasNoTokensOnField) {
          setMessage("No tokens out — roll a 6! (3 attempts)");
        } else {
          setMessage("Your turn — roll the dice!");
        }
      } else if (movableTokens.size > 0) {
        setMessage("Tap a highlighted token to move");
      } else {
        setMessage("No valid moves — passing turn...");
      }
    } else {
      setMessage(`${currentTurnName}'s turn...`);
    }
  }, [isMyTurn, hasRolled, movableTokens.size, isPaused, gameState?.phase, hasNoTokensOnField, rollAttempt, maxRollAttempts, currentTurnName]);

  // Auto-pass when no valid moves
  useEffect(() => {
    if (!isMyTurn || !hasRolled || !diceValue) return;
    if (movableTokens.size > 0) return;
    if (gameState?.phase !== "in_progress") return;

    const timer = setTimeout(async () => {
      await update(ref(db, `gameLobbies/${lobbyId}/gameState`), {
        currentTurn: getNextTurnId(myId),
        consecutiveSixes: {
          ...gameState.consecutiveSixes,
          [myId]: 0,
        },
        updatedAt: Date.now(),
      });
      setHasRolled(false);
      setDiceValue(null);
    }, 1200);

    return () => clearTimeout(timer);
  }, [isMyTurn, hasRolled, diceValue, movableTokens.size]);

  // ── Dice roll ──
  const handleRoll = useCallback(async () => {
    if (!isMyTurn || hasRolled || rolling || showingResult || isPaused) return;
    if (gameState?.phase !== "in_progress") return;

    setRolling(true);

    const roll = Math.floor(Math.random() * 6) + 1;

    const currentSixes = gameState?.consecutiveSixes?.[myId] || 0;

    // 3 consecutive sixes = lose turn
    if (roll === 6 && currentSixes >= 2) {
      setDiceValue(roll);
      setMessage("Three 6s! Turn lost.");
      // Unlock triple_six achievement
      get(ref(db, `achievements/${myId}/4/triple_six`)).then(snap => {
        if (!snap.exists()) {
          set(ref(db, `achievements/${myId}/4/triple_six`), { unlockedAt: Date.now() });
        }
      });
      setTimeout(async () => {
        await update(ref(db, `gameLobbies/${lobbyId}/gameState`), {
          currentTurn: getNextTurnId(myId),
          lastAction: {
            by: myId,
            type: "three_sixes",
            diceValue: roll,
            at: Date.now(),
          },
          consecutiveSixes: {
            ...gameState.consecutiveSixes,
            [myId]: 0,
          },
          updatedAt: Date.now(),
        });
        setRolling(false);
        setHasRolled(false);
        setDiceValue(null);
        setRollAttempt(0);
      }, 1500);
      return;
    }

    const newAttempt = rollAttempt + 1;
    setDiceValue(roll);
    setRollAttempt(newAttempt);

    // If no tokens on field and didn't roll 6, allow re-roll (up to 3)
    if (hasNoTokensOnField && roll !== 6 && newAttempt < maxRollAttempts) {
      setShowingResult(true);
      setRolling(false);
      setMessage(`Rolled ${roll} — try again (${newAttempt}/${maxRollAttempts})`);
      setTimeout(() => {
        setShowingResult(false);
      }, 1000);
      return;
    }

    setHasRolled(true);

    if (roll === 6) {
      setConsecutiveSixes(currentSixes + 1);
    } else {
      setConsecutiveSixes(0);
    }

    setRolling(false);
  }, [isMyTurn, hasRolled, rolling, showingResult, isPaused, gameState, myId, lobbyId, rollAttempt, hasNoTokensOnField, maxRollAttempts, getNextTurnId]);

  // Animation complete callback (no-op, logic handled in handleRoll)
  const handleRollFinish = useCallback(() => {}, []);

  // ── Token move ──
  const handleTokenPress = useCallback(
    async (playerIdx, tokenIdx) => {
      if (!isMyTurn || !hasRolled || !diceValue) return;
      if (playerIdx !== myColorIndex) return;
      if (gameState?.phase !== "in_progress") return;

      const token = myTokens[tokenIdx];
      if (!canMoveToken(token, diceValue, myColorIndex, myTokens)) return;

      const newToken = moveToken(token, diceValue, myColorIndex);
      const newTokens = [...myTokens];
      newTokens[tokenIdx] = newToken;

      let anyCaptured = false;
      const tokenUpdates = {};
      tokenUpdates[`tokens/${myId}`] = newTokens;

      // Check for capture against ALL opponents
      let captureCount = 0;
      if (newToken.state === "active") {
        const absIdx = getAbsolutePathIndex(myColorIndex, newToken.pathIndex);

        playerOrder.forEach((uid) => {
          if (uid === myId) return;
          const oppColorIdx = playerMap[uid];
          const oppToks = (gameState?.tokens?.[uid] || []).map(t => ({...t}));
          const captured = checkCapture(absIdx, oppToks, oppColorIdx);
          if (captured.length > 0) {
            anyCaptured = true;
            captureCount += captured.length;
            captured.forEach((i) => {
              oppToks[i] = { state: "base", pathIndex: -1, homeIndex: -1 };
            });
          }
          tokenUpdates[`tokens/${uid}`] = oppToks;
        });
      } else {
        // No capture possible, still write other tokens unchanged
        playerOrder.forEach((uid) => {
          if (uid === myId) return;
          tokenUpdates[`tokens/${uid}`] = gameState?.tokens?.[uid] || createInitialTokens();
        });
      }

      // Check win
      const didWin = allTokensHome(newTokens);

      // Determine next turn
      const gotSix = diceValue === 6;
      const didCapture = anyCaptured;
      const gotBonusTurn = gotSix || didCapture;

      const currentSixCount = gameState?.consecutiveSixes?.[myId] || 0;

      const payload = {
        ...tokenUpdates,
        lastAction: {
          by: myId,
          type: didCapture ? "capture" : "move",
          tokenIdx,
          diceValue,
          at: Date.now(),
        },
        updatedAt: Date.now(),
      };

      if (captureCount > 0) {
        payload[`capturesMade/${myId}`] = (gameState?.capturesMade?.[myId] || 0) + captureCount;
      }

      if (didWin) {
        payload.phase = "finished";
        payload.winnerId = myId;
      } else if (gotBonusTurn) {
        payload.currentTurn = myId;
        payload[`consecutiveSixes/${myId}`] = gotSix ? currentSixCount + 1 : 0;
      } else {
        payload.currentTurn = getNextTurnId(myId);
        payload[`consecutiveSixes/${myId}`] = 0;
      }

      await update(ref(db, `gameLobbies/${lobbyId}/gameState`), payload);

      setHasRolled(false);
      setDiceValue(null);
      setRollAttempt(0);

      if (didCapture) {
        setMessage("Captured! Bonus turn!");
      } else if (gotSix) {
        setMessage("Rolled 6! Bonus turn!");
      }
    },
    [isMyTurn, hasRolled, diceValue, myTokens, myColorIndex, gameState, myId, playerOrder, playerMap, lobbyId, getNextTurnId]
  );

  // ── Record match history ──
  useEffect(() => {
    if (gameState?.phase !== "finished" || !gameState?.winnerId || matchSavedRef.current) return;
    if (gameState.winnerId !== myId) return;
    matchSavedRef.current = true;

    const playersRecord = {};
    playerOrder.forEach((uid) => {
      const colorIdx = playerMap[uid];
      const tokensHome = (gameState.tokens?.[uid] || []).filter(t => t.state === "home").length;
      playersRecord[uid] = {
        name: getPlayerName(uid),
        tokensHome,
        color: PLAYER_COLORS[colorIdx]?.name || "Unknown",
      };
    });

    const record = {
      lobbyId,
      gameId,
      gameTitle: "Ludo",
      winnerId: gameState.winnerId,
      result: gameState.quitBy ? "quit" : "completed",
      quitBy: gameState.quitBy || null,
      players: playersRecord,
      startedAt: lobby?.createdAt || Date.now(),
      endedAt: Date.now(),
      durationMs: Date.now() - (lobby?.createdAt || Date.now()),
    };

    const writes = playerOrder.map((uid) =>
      set(push(ref(db, `matchHistory/${uid}`)), record)
    );
    Promise.all(writes);
  }, [gameState?.phase, gameState?.winnerId, myId]);

  // ── Check & unlock achievements ──
  const achievementsSavedRef = useRef(false);
  useEffect(() => {
    if (gameState?.phase !== "finished" || achievementsSavedRef.current) return;
    if (!myId) return;
    achievementsSavedRef.current = true;

    const didIWin = gameState.winnerId === myId;
    const myCaps = gameState.capturesMade?.[myId] || 0;
    const duration = Date.now() - (lobby?.startedAt || lobby?.createdAt || Date.now());

    (async () => {
      try {
        // Read current stats
        const statsSnap = await get(ref(db, `ludoStats/${myId}`));
        const stats = statsSnap.val() || { gamesPlayed: 0, gamesWon: 0, totalCaptures: 0 };

        const newStats = {
          gamesPlayed: stats.gamesPlayed + 1,
          gamesWon: stats.gamesWon + (didIWin ? 1 : 0),
          totalCaptures: stats.totalCaptures + myCaps,
        };
        await set(ref(db, `ludoStats/${myId}`), newStats);

        // Read already-unlocked achievements
        const achieveSnap = await get(ref(db, `achievements/${myId}/4`));
        const unlocked = achieveSnap.val() || {};

        const toUnlock = [];
        const check = (id, condition) => {
          if (!unlocked[id] && condition) toUnlock.push(id);
        };

        check("first_game", true);
        check("first_win", didIWin);
        check("wins_5", newStats.gamesWon >= 5);
        check("wins_10", newStats.gamesWon >= 10);
        check("wins_25", newStats.gamesWon >= 25);
        check("first_capture", newStats.totalCaptures >= 1);
        check("capture_10", newStats.totalCaptures >= 10);
        check("played_10", newStats.gamesPlayed >= 10);
        check("played_25", newStats.gamesPlayed >= 25);
        check("play_friend", true); // always playing against friends
        check("speed_win", didIWin && duration < 5 * 60 * 1000);

        // Check "all_home" — win without any capture made against me
        if (didIWin) {
          const othersCapturedMe = playerOrder
            .filter(uid => uid !== myId)
            .some(uid => (gameState.capturesMade?.[uid] || 0) > 0);
          // Simplified: check if no opponent captured any token (not just mine)
          // A more precise check would track per-opponent-per-target captures
          check("all_home", !othersCapturedMe);
        }

        for (const id of toUnlock) {
          await set(ref(db, `achievements/${myId}/4/${id}`), { unlockedAt: Date.now() });
        }
      } catch (err) {
        console.warn("Achievement check failed:", err);
      }
    })();
  }, [gameState?.phase, myId]);

  // ── Pause ──
  const handlePause = useCallback(async () => {
    if (!gameState || gameState.phase === "finished") return;
    const wasPaused = !!gameState.pausedBy;
    await update(ref(db, `gameLobbies/${lobbyId}/gameState`), {
      pausedBy: wasPaused ? null : myId,
      pausedAt: wasPaused ? null : Date.now(),
    });
  }, [gameState, lobbyId, myId]);

  // ── Quit ──
  const handleQuit = useCallback(async () => {
    if (quitSavedRef.current) return;
    
    Alert.alert("Quit Game", "Are you sure? You'll lose this match.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Quit",
        style: "destructive",
        onPress: async () => {
          quitSavedRef.current = true;

          const otherPlayers = playerOrder.filter(id => id !== myId);
          const winnerId = otherPlayers.length === 1 ? otherPlayers[0] : null;

          const playersRecord = {};
          playerOrder.forEach((uid) => {
            playersRecord[uid] = {
              name: getPlayerName(uid),
              tokensHome: 0,
              color: PLAYER_COLORS[playerMap[uid]]?.name || "Unknown",
            };
          });

          const record = {
            lobbyId,
            gameId,
            gameTitle: "Ludo",
            winnerId,
            result: "quit",
            quitBy: myId,
            players: playersRecord,
            startedAt: lobby?.createdAt || Date.now(),
            endedAt: Date.now(),
            durationMs: Date.now() - (lobby?.createdAt || Date.now()),
          };

          const writes = playerOrder.map((uid) =>
            set(push(ref(db, `matchHistory/${uid}`)), record)
          );
          await Promise.all(writes);

          await update(ref(db, `gameLobbies/${lobbyId}/gameState`), {
            phase: "finished",
            winnerId,
            quitBy: myId,
          });
        },
      },
    ]);
  }, [lobbyId, myId, playerOrder, playerMap, getPlayerName, gameId, lobby?.createdAt]);

  // ── Color pick (pre-game phase) ──
  const colorPicks = gameState?.colorPicks || {};
  const myPick = colorPicks[myId] ?? null;
  const takenColors = useMemo(() => {
    const map = {};
    Object.entries(colorPicks).forEach(([uid, idx]) => { map[idx] = uid; });
    return map;
  }, [colorPicks]);
  const allPicked = playerOrder.length > 0 && playerOrder.every(uid => colorPicks[uid] != null);

  const handleColorPick = useCallback(async (colorIdx) => {
    if (!lobbyId || !myId) return;
    // Check if color is taken by someone else
    const currentPicks = gameState?.colorPicks || {};
    const takenBy = Object.entries(currentPicks).find(([, v]) => v === colorIdx);
    if (takenBy && takenBy[0] !== myId) return;
    await update(ref(db, `gameLobbies/${lobbyId}/gameState/colorPicks`), { [myId]: colorIdx });
  }, [lobbyId, myId, gameState?.colorPicks]);

  const handleStartFromColorPick = useCallback(async () => {
    if (!lobbyId || !myId || lobby?.hostId !== myId) return;
    const picks = gameState?.colorPicks || {};
    if (!playerOrder.every(uid => picks[uid] != null)) return;

    const newPlayerMap = {};
    const newTokens = {};
    const newConsecutiveSixes = {};
    const newCapturesMade = {};
    playerOrder.forEach((uid) => {
      const cIdx = picks[uid];
      newPlayerMap[uid] = cIdx;
      newTokens[uid] = createInitialTokens();
      newConsecutiveSixes[uid] = 0;
      newCapturesMade[uid] = 0;
    });

    await update(ref(db, `gameLobbies/${lobbyId}/gameState`), {
      phase: "in_progress",
      currentTurn: playerOrder[0],
      playerMap: newPlayerMap,
      tokens: newTokens,
      consecutiveSixes: newConsecutiveSixes,
      capturesMade: newCapturesMade,
      updatedAt: Date.now(),
    });
  }, [lobbyId, myId, lobby?.hostId, gameState?.colorPicks, playerOrder]);

  // ── Navigate back ──
  const handleBack = useCallback(() => {
    if (gameState?.phase === "finished") {
      if (navigation.canGoBack()) {
        navigation.popToTop();
      } else {
        navigation.replace("Tabs");
      }
    } else {
      handleQuit();
    }
  }, [gameState?.phase, navigation, handleQuit]);

  // ── Layout ── (account for header~58, infoStrip~44, message~28, bottom~80, insets)
  const usableHeight = height - insets.top - insets.bottom - 210;
  const boardArea = Math.min(width - 28, usableHeight);
  // Non-uniform cell sizes: base rows/cols smaller, path rows/cols larger
  const PATH_RATIO = 1.25;
  const baseCellSize = Math.floor(boardArea / (12 + 3 * PATH_RATIO));
  const pathCellSize = Math.floor(baseCellSize * PATH_RATIO);
  const getCellDim = (idx) => (idx >= 6 && idx <= 8) ? pathCellSize : baseCellSize;
  const actualBoardSize = baseCellSize * 12 + pathCellSize * 3;

  const isFinished = gameState?.phase === "finished";
  const didWin = isFinished && gameState?.winnerId === myId;

  // Score: tokens home
  const myScore = myTokens.filter((t) => t.state === "home").length;

  if (!lobby) {
    return (
      <View style={[s.container, { paddingTop: insets.top }]}>
        <View style={s.centered}>
          <Icon name="clock" size={32} color="#94A3B8" />
          <Text style={s.loadingText}>Loading game...</Text>
        </View>
      </View>
    );
  }

  /* ── Color Pick Phase ── */
  if (phase === "color_pick") {
    const isHost = lobby?.hostId === myId;
    return (
      <View style={[s.container, { paddingTop: insets.top }]}>
        <View style={[s.bgOrb, s.bgOrb1]} />
        <View style={[s.bgOrb, s.bgOrb2]} />
        <View style={[s.bgOrb, s.bgOrb3]} />
        <View style={[s.bgOrb, s.bgOrb4]} />

        <View style={s.header}>
          <Pressable onPress={handleQuit} style={s.headerBtn}>
            <Icon name="close" size={16} color="#E2E8F0" />
          </Pressable>
          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>LUDO</Text>
            <View style={s.phaseBadge}>
              <Text style={s.phaseBadgeText}>CHOOSE COLOR</Text>
            </View>
          </View>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView
          style={s.cpScroll}
          contentContainerStyle={s.cpContainer}
          showsVerticalScrollIndicator={false}
        >
          <Text style={s.cpTitle}>Pick Your Color</Text>
          <Text style={s.cpSubtitle}>
            {allPicked
              ? isHost ? "All players ready!" : "Waiting for host to start..."
              : `${Object.keys(colorPicks).length}/${playerOrder.length} players picked`}
          </Text>

          <View style={s.cpGrid}>
            {[0, 1, 2, 3].map((colorIdx) => {
              const pc = PLAYER_COLORS[colorIdx];
              const ownerUid = takenColors[colorIdx];
              const isMine = ownerUid === myId;
              const isTaken = !!ownerUid && !isMine;
              const isSelected = myPick === colorIdx;

              return (
                <Pressable
                  key={colorIdx}
                  style={[
                    s.cpOption,
                    { borderColor: isTaken ? "rgba(255,255,255,0.04)" : pc.main },
                    isSelected && { borderColor: pc.main, borderWidth: 2.5, backgroundColor: `${pc.main}15` },
                    isTaken && s.cpOptionDisabled,
                  ]}
                  onPress={() => !isTaken && handleColorPick(colorIdx)}
                  disabled={isTaken}
                >
                  <View
                    style={[
                      s.cpDot,
                      { backgroundColor: pc.main },
                      isTaken && { opacity: 0.25 },
                    ]}
                  >
                    {isSelected && (
                      <View style={[s.cpDotInner, { backgroundColor: pc.light }]} />
                    )}
                  </View>
                  <Text style={[s.cpColorName, isTaken && { color: "#475569" }]}>
                    {pc.name}
                  </Text>
                  {ownerUid && (
                    <Text style={[s.cpTakenBy, isMine && { color: pc.accent }]}>
                      {isMine ? "You" : getPlayerName(ownerUid)}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* Players status */}
          <View style={s.cpPlayersWrap}>
            {playerOrder.map((uid) => {
              const picked = colorPicks[uid] != null;
              const pc = picked ? PLAYER_COLORS[colorPicks[uid]] : null;
              return (
                <View key={uid} style={s.cpPlayerRow}>
                  <View style={[s.cpPlayerDot, { backgroundColor: picked ? pc.main : "#334155" }]} />
                  <Text style={s.cpPlayerName}>{uid === myId ? "You" : getPlayerName(uid)}</Text>
                  {picked ? (
                    <Text style={[s.cpPlayerStatus, { color: pc.main }]}>{pc.name}</Text>
                  ) : (
                    <Text style={s.cpPlayerStatus}>Picking...</Text>
                  )}
                </View>
              );
            })}
          </View>

          {isHost && allPicked && (
            <Pressable
              style={({ pressed }) => [s.cpStartBtn, pressed && { opacity: 0.85 }]}
              onPress={handleStartFromColorPick}
            >
              <Text style={s.cpStartBtnText}>Start Game</Text>
            </Pressable>
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Background orbs */}
      <View style={[s.bgOrb, s.bgOrb1]} />
      <View style={[s.bgOrb, s.bgOrb2]} />
      <View style={[s.bgOrb, s.bgOrb3]} />
      <View style={[s.bgOrb, s.bgOrb4]} />

      {/* ── Header ── */}
      <View style={s.header}>
        <Pressable onPress={handleBack} style={s.headerBtn}>
          <Icon
            name={isFinished ? "close" : isPaused ? "play" : "clock"}
            size={16}
            color="#E2E8F0"
          />
        </Pressable>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>LUDO</Text>
          <View style={[s.phaseBadge, isFinished && s.phaseBadgeFinished]}>
            <Text style={s.phaseBadgeText}>
              {isFinished ? (didWin ? "VICTORY" : "DEFEAT") : isPaused ? "PAUSED" : "IN GAME"}
            </Text>
          </View>
        </View>
        {!isFinished ? (
          <Pressable onPress={handlePause} style={s.headerBtn}>
            <Icon name={isPaused ? "play" : "clock"} size={16} color="#E2E8F0" />
          </Pressable>
        ) : (
          <View style={{ width: 34 }} />
        )}
      </View>

      {/* ── Info Strip ── */}
      <View style={s.infoStrip}>
        <View style={s.infoItem}>
          <Text style={s.infoLabel}>TURN</Text>
          <Text style={s.infoValue}>{isMyTurn ? "You" : currentTurnName}</Text>
        </View>
        {playerOrder.map((uid) => {
          const colorIdx = playerMap[uid];
          const pc = PLAYER_COLORS[colorIdx];
          const toks = gameState?.tokens?.[uid] || [];
          const homeCount = toks.filter(t => t.state === "home").length;
          return (
            <View key={uid} style={s.infoItem}>
              <Text style={s.infoLabel}>{pc?.name?.toUpperCase() || "?"}</Text>
              <Text style={[s.infoValue, { color: pc?.main }]}>{homeCount}/4</Text>
            </View>
          );
        })}
      </View>

      {/* ── Message ── */}
      <View style={s.messageBar}>
        <Text style={s.messageText}>{message}</Text>
      </View>

      {/* ── Board ── */}
      <View style={s.boardWrap}>
        <LudoBoard
          getCellDim={getCellDim}
          playerTokens={playerTokensMap}
          onTokenPress={handleTokenPress}
          highlightedTokens={movableTokens}
        />
      </View>

      {/* ── Dice & Actions ── */}
      <View style={s.bottomSection}>
        {isFinished ? (
          <View style={s.resultArea}>
            <View style={[s.resultBanner, didWin ? s.resultWin : s.resultLose]}>
              <Icon
                name={didWin ? "trophy" : "close"}
                size={28}
                color={didWin ? "#FFD700" : "#EF4444"}
              />
              <Text style={[s.resultTitle, didWin ? s.resultTitleWin : s.resultTitleLose]}>
                {didWin ? "VICTORY!" : "DEFEAT"}
              </Text>
              <Text style={s.resultSub}>
                {didWin
                  ? "All your tokens made it home!"
                  : gameState?.quitBy
                  ? "Game ended by quit"
                  : `${getPlayerName(gameState?.winnerId)} got all tokens home first`}
              </Text>
            </View>
            <Pressable
              style={({ pressed }) => [s.lobbyBtn, pressed && { opacity: 0.85 }]}
              onPress={handleBack}
            >
              <Text style={s.lobbyBtnText}>Back to Lobby</Text>
            </Pressable>
          </View>
        ) : (
          <View style={s.diceArea}>
            <AnimatedDice
              value={diceValue}
              rolling={rolling}
              size={Math.min(56, width * 0.14)}
              color={PLAYER_COLORS[myColorIndex].dark}
              onRollFinish={handleRollFinish}
            />
            <Pressable
              style={({ pressed }) => [
                s.rollBtn,
                (!isMyTurn || hasRolled || rolling || isPaused || showingResult) && s.rollBtnDisabled,
                pressed && { opacity: 0.85 },
              ]}
              onPress={handleRoll}
              disabled={!isMyTurn || hasRolled || rolling || isPaused || showingResult}
            >
              <Text style={s.rollBtnText}>
                {rolling
                  ? "Rolling..."
                  : showingResult
                  ? `Rolled ${diceValue}`
                  : hasRolled
                  ? `Rolled ${diceValue}`
                  : isMyTurn
                  ? "Roll Dice"
                  : "Wait..."}
              </Text>
            </Pressable>
            {!isFinished && (
              <Pressable onPress={handleQuit} style={s.quitBtn}>
                <Text style={s.quitBtnText}>Quit</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════════════ */
const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B1121",
    paddingHorizontal: 14,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: "#94A3B8",
    fontSize: 15,
    fontWeight: "600",
  },

  // Background
  bgOrb: {
    position: "absolute",
    borderRadius: 999,
    opacity: 0.06,
  },
  bgOrb1: {
    width: 300,
    height: 300,
    backgroundColor: "#DC2626",
    top: -80,
    left: -100,
  },
  bgOrb2: {
    width: 240,
    height: 240,
    backgroundColor: "#2563EB",
    bottom: 20,
    right: -80,
  },
  bgOrb3: {
    width: 200,
    height: 200,
    backgroundColor: "#EAB308",
    top: -50,
    right: -70,
  },
  bgOrb4: {
    width: 180,
    height: 180,
    backgroundColor: "#16A34A",
    bottom: -40,
    left: -50,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  headerBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    alignItems: "center",
    gap: 5,
  },
  headerTitle: {
    color: "#F1F5F9",
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 3,
  },
  phaseBadge: {
    backgroundColor: "rgba(37,99,235,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.15)",
  },
  phaseBadgeFinished: {
    backgroundColor: "rgba(255,215,0,0.1)",
    borderColor: "rgba(255,215,0,0.15)",
  },
  phaseBadgeText: {
    color: "#7BA3CF",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.2,
  },

  // Info strip
  infoStrip: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    paddingVertical: 6,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  infoItem: {
    alignItems: "center",
    gap: 2,
  },
  infoLabel: {
    color: "#64748B",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  infoValue: {
    color: "#E2E8F0",
    fontSize: 13,
    fontWeight: "800",
  },

  // Message bar
  messageBar: {
    alignItems: "center",
    paddingVertical: 3,
    marginHorizontal: 10,
  },
  messageText: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    fontStyle: "italic",
  },

  // Board
  boardWrap: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingVertical: 2,
  },

  // Bottom
  bottomSection: {
    paddingBottom: 8,
  },
  diceArea: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 8,
  },
  rollBtn: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: "#2563EB",
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  rollBtnDisabled: {
    backgroundColor: "rgba(37,99,235,0.25)",
    shadowOpacity: 0,
    elevation: 0,
  },
  rollBtnText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  quitBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  quitBtnText: {
    color: "#EF4444",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
  },

  // Result
  resultArea: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  resultBanner: {
    alignItems: "center",
    gap: 6,
    padding: 14,
    borderRadius: 16,
    width: "100%",
  },
  resultWin: {
    backgroundColor: "rgba(255,215,0,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.18)",
  },
  resultLose: {
    backgroundColor: "rgba(239,68,68,0.06)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.18)",
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 3,
  },
  resultTitleWin: {
    color: "#FFD700",
  },
  resultTitleLose: {
    color: "#EF4444",
  },
  resultSub: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },
  lobbyBtn: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: "#2563EB",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  lobbyBtnText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  // Color pick phase
  cpScroll: {
    flex: 1,
  },
  cpContainer: {
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 14,
  },
  cpTitle: {
    color: "#F1F5F9",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  cpSubtitle: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  cpGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    width: "100%",
  },
  cpOption: {
    width: "47%",
    aspectRatio: 1.25,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  cpOptionDisabled: {
    opacity: 0.4,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  cpDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  cpDotInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    opacity: 0.7,
  },
  cpColorName: {
    color: "#E2E8F0",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  cpTakenBy: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "600",
  },
  cpPlayersWrap: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 14,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  cpPlayerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cpPlayerDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  cpPlayerName: {
    color: "#CBD5E1",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  cpPlayerStatus: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "600",
  },
  cpStartBtn: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: "#2563EB",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  cpStartBtnText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});

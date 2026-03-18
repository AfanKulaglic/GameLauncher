import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  useWindowDimensions,
  Animated,
  Easing,
  PanResponder,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../components/ui/Icon";
import { colors } from "../utils/colors";
import { useAuth } from "../context/AuthContext";
import { db } from "../lib/firebase";
import { get, onValue, push, ref, set, update } from "firebase/database";

const ROW_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
const LABEL_W = 18;

const BOARD_SIZE = 10;
const SHIPS = [
  { name: "Carrier", size: 5 },
  { name: "Battleship", size: 4 },
  { name: "Cruiser", size: 3 },
  { name: "Submarine", size: 3 },
  { name: "Destroyer", size: 2 },
];

function createEmptyBoard() {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));
}

function cloneBoard(board) {
  return board.map((row) => [...row]);
}

function canPlaceShip(board, row, col, size, orientation) {
  for (let i = 0; i < size; i += 1) {
    const r = orientation === "vertical" ? row + i : row;
    const c = orientation === "horizontal" ? col + i : col;
    if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) return false;
    if (board[r][c] !== 0) return false;
  }
  return true;
}

function placeShip(board, row, col, size, orientation) {
  const next = cloneBoard(board);
  for (let i = 0; i < size; i += 1) {
    const r = orientation === "vertical" ? row + i : row;
    const c = orientation === "horizontal" ? col + i : col;
    next[r][c] = 1;
  }
  return next;
}

function countShipCells(board) {
  return board.flat().filter((cell) => cell === 1).length;
}

function FlameOverlay({ size = 24 }) {
  const master = React.useRef(new Animated.Value(0)).current;
  const phaseDelay = React.useRef(Math.floor(Math.random() * 220)).current;

  useEffect(() => {
    let sequence;
    const timer = setTimeout(() => {
      sequence = Animated.loop(
        Animated.sequence([
          Animated.timing(master, {
            toValue: 1,
            duration: 320,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(master, {
            toValue: 0,
            duration: 300,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );
      sequence.start();
    }, phaseDelay);

    return () => {
      clearTimeout(timer);
      if (sequence) sequence.stop();
    };
  }, [master, phaseDelay]);

  const lift = master.interpolate({
    inputRange: [0, 1],
    outputRange: [1, -2.5],
  });
  const flameScale = master.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1.06],
  });
  const innerScale = master.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1.04],
  });
  const glowOpacity = master.interpolate({
    inputRange: [0, 1],
    outputRange: [0.28, 0.48],
  });
  const swayRotate = master.interpolate({
    inputRange: [0, 1],
    outputRange: ["-4deg", "4deg"],
  });
  const smokeRise = master.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -size * 0.42],
  });
  const smokeOpacity = master.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0.08, 0.22, 0.08],
  });
  const sparkRise = master.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -size * 0.48],
  });
  const sparkOpacity = master.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.1, 0.7, 0.1],
  });

  return (
    <View pointerEvents="none" style={[styles.flameWrap, { width: size, height: size }]}>
      <Animated.View
        style={[
          styles.flameGlow,
          {
            width: size * 0.95,
            height: size * 0.95,
            borderRadius: (size * 0.95) / 2,
            opacity: glowOpacity,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.flameSmoke,
          {
            width: size * 0.72,
            height: size * 0.62,
            borderRadius: size * 0.3,
            opacity: smokeOpacity,
            transform: [{ translateY: smokeRise }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.flameTongueLarge,
          {
            width: size * 0.62,
            height: size * 0.72,
            borderRadius: size * 0.34,
            transform: [{ rotate: swayRotate }, { scale: flameScale }, { translateY: lift }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.flameTongueMedium,
          {
            width: size * 0.44,
            height: size * 0.54,
            borderRadius: size * 0.2,
            transform: [{ rotate: swayRotate }, { scale: innerScale }, { translateY: lift }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.flameTongueTip,
          {
            width: size * 0.2,
            height: size * 0.3,
            borderRadius: size * 0.12,
            transform: [{ rotate: swayRotate }, { translateY: lift }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.flameSpark,
          {
            width: size * 0.09,
            height: size * 0.09,
            borderRadius: (size * 0.09) / 2,
            opacity: sparkOpacity,
            transform: [{ translateY: sparkRise }, { translateX: size * 0.06 }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.flameSparkTwo,
          {
            width: size * 0.08,
            height: size * 0.08,
            borderRadius: (size * 0.08) / 2,
            opacity: sparkOpacity,
            transform: [{ translateY: sparkRise }, { translateX: -size * 0.08 }],
          },
        ]}
      />
    </View>
  );
}

/* ─── Confetti overlay for victory ─── */
const CONFETTI_COLORS = ["#FCD34D", "#F59E0B", "#EF4444", "#3B82F6", "#10B981", "#EC4899", "#8B5CF6", "#F97316"];
const CONFETTI_COUNT = 50;

function ConfettiPiece({ screenW, screenH, delay }) {
  const fall = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const startX = useRef(Math.random() * screenW).current;
  const drift = useRef((Math.random() - 0.5) * screenW * 0.6).current;
  const size = useRef(6 + Math.random() * 8).current;
  const color = useRef(CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]).current;
  const isCircle = useRef(Math.random() > 0.5).current;
  const duration = useRef(2200 + Math.random() * 1800).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.loop(
        Animated.parallel([
          Animated.timing(fall, { toValue: 1, duration: duration, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          Animated.timing(spin, { toValue: 1, duration: duration * 0.7, easing: Easing.linear, useNativeDriver: true }),
        ])
      ).start();
    }, delay);
    return () => clearTimeout(timer);
  }, [fall, spin, delay, duration]);

  const translateY = fall.interpolate({ inputRange: [0, 1], outputRange: [-30, screenH + 30] });
  const translateX = fall.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, drift * 0.6, drift] });
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "720deg"] });
  const opacity = fall.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: startX,
        top: 0,
        width: size,
        height: isCircle ? size : size * 1.6,
        borderRadius: isCircle ? size / 2 : 2,
        backgroundColor: color,
        opacity,
        transform: [{ translateY }, { translateX }, { rotate }],
      }}
    />
  );
}

function ConfettiOverlay({ screenW, screenH }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
        key: i,
        delay: Math.random() * 1200,
      })),
    []
  );

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p) => (
        <ConfettiPiece key={p.key} screenW={screenW} screenH={screenH} delay={p.delay} />
      ))}
    </View>
  );
}

/* ─── Animated wave background for boards ─── */
function WaveOverlay() {
  const w1 = React.useRef(new Animated.Value(0)).current;
  const w2 = React.useRef(new Animated.Value(0)).current;
  const w3 = React.useRef(new Animated.Value(0)).current;
  const w4 = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const loop = (anim, dur) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      );
    const a = loop(w1, 3200);
    const b = loop(w2, 4600);
    const c = loop(w3, 5800);
    const d = loop(w4, 3800);
    a.start(); b.start(); c.start(); d.start();
    return () => { a.stop(); b.stop(); c.stop(); d.stop(); };
  }, [w1, w2, w3, w4]);

  const band = (anim, top, height, delay) => ({
    position: "absolute",
    left: -10,
    right: -10,
    height: `${height}%`,
    top: `${top}%`,
    borderRadius: 999,
    backgroundColor: "rgba(96, 165, 250, 0.055)",
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [-6, 6],
        }),
      },
      {
        scaleX: anim.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [1, 1.08, 1],
        }),
      },
    ],
    opacity: anim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.35, 0.85, 0.35],
    }),
  });

  return (
    <View style={wavStyles.container} pointerEvents="none">
      <Animated.View style={band(w1, 5, 18)} />
      <Animated.View style={band(w2, 28, 22)} />
      <Animated.View style={band(w3, 55, 20)} />
      <Animated.View style={band(w4, 78, 16)} />
    </View>
  );
}

const wavStyles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
  },
});

/* ─── Pulse dot for turn indicator ─── */
function PulseDot() {
  const anim = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.35, duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);
  return <Animated.View style={[styles.pulseDot, { opacity: anim }]} />;
}

/* ─── Draggable Ship Card ─── */
function DraggableShipCard({
  ship,
  cellSize,
  orientation: parentOrientation,
  onOrientationChange,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDragCancel,
  isSelected,
}) {
  const pan = useRef(new Animated.ValueXY()).current;
  const dragScale = useRef(new Animated.Value(1)).current;
  const [isDragging, setIsDragging] = useState(false);
  const [localOri, setLocalOri] = useState(parentOrientation);
  const currentOri = useRef(parentOrientation);
  const startPos = useRef({ x: 0, y: 0 });
  const lastTap = useRef(0);
  const cardRef = useRef(null);
  const centerOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!isDragging) {
      setLocalOri(parentOrientation);
      currentOri.current = parentOrientation;
    }
  }, [parentOrientation, isDragging]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 5 || Math.abs(g.dy) > 5,
      onPanResponderGrant: (evt) => {
        const now = Date.now();
        // Double-tap to rotate
        if (now - lastTap.current < 300) {
          const newOri = currentOri.current === "horizontal" ? "vertical" : "horizontal";
          currentOri.current = newOri;
          setLocalOri(newOri);
          onOrientationChange(newOri);
          lastTap.current = 0;
          return;
        }
        lastTap.current = now;

        // Where on the card the finger touched
        const touchLocalX = evt.nativeEvent.locationX;
        const touchLocalY = evt.nativeEvent.locationY;

        // Measure card to find its center
        if (cardRef.current) {
          cardRef.current.measure?.((x, y, w, h) => {
            centerOffset.current = {
              x: w / 2 - touchLocalX,
              y: h / 2 - touchLocalY,
            };
            // Apply immediately so card snaps to center under finger
            pan.setValue(centerOffset.current);
          });
        } else {
          centerOffset.current = { x: 0, y: 0 };
        }

        startPos.current = {
          x: evt.nativeEvent.pageX,
          y: evt.nativeEvent.pageY,
        };
        onDragStart(ship);
        setIsDragging(true);
        pan.setValue(centerOffset.current);
        Animated.spring(dragScale, {
          toValue: 1.1,
          speed: 30,
          bounciness: 4,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderMove: (evt, g) => {
        pan.setValue({
          x: g.dx + centerOffset.current.x,
          y: g.dy + centerOffset.current.y,
        });
        onDragMove(
          ship,
          startPos.current.x + g.dx,
          startPos.current.y + g.dy,
          currentOri.current
        );
      },
      onPanResponderRelease: (evt, g) => {
        setIsDragging(false);
        Animated.spring(dragScale, {
          toValue: 1,
          speed: 30,
          bounciness: 4,
          useNativeDriver: true,
        }).start();

        const dropX = startPos.current.x + g.dx;
        const dropY = startPos.current.y + g.dy;
        const moved = Math.abs(g.dx) > 8 || Math.abs(g.dy) > 8;

        if (moved) {
          onDragEnd(ship, dropX, dropY, currentOri.current);
        } else {
          onDragCancel();
        }

        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          speed: 20,
          bounciness: 6,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderTerminate: () => {
        setIsDragging(false);
        onDragCancel();
        Animated.spring(dragScale, {
          toValue: 1,
          speed: 30,
          bounciness: 4,
          useNativeDriver: true,
        }).start();
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          speed: 20,
          bounciness: 6,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  const blockSize = Math.max(cellSize * 0.55, 10);
  const isH = localOri === "horizontal";

  return (
    <Animated.View
      ref={cardRef}
      {...panResponder.panHandlers}
      style={[
        styles.shipCard,
        isSelected && styles.shipCardActive,
        isDragging && styles.shipCardDragging,
        {
          transform: [
            ...pan.getTranslateTransform(),
            { scale: dragScale },
          ],
          zIndex: isDragging ? 999 : 1,
        },
      ]}
    >
      <View style={styles.shipCardHeader}>
        <Text
          style={[
            styles.shipCardName,
            isSelected && styles.shipCardNameActive,
          ]}
        >
          {ship.name}
        </Text>
        <Pressable
          style={[styles.rotateBtn, isSelected && styles.rotateBtnActive]}
          onPress={() => {
            const newOri = localOri === "horizontal" ? "vertical" : "horizontal";
            currentOri.current = newOri;
            setLocalOri(newOri);
            onOrientationChange(newOri);
          }}
          hitSlop={8}
        >
          <Text style={styles.rotateBtnText}>{isH ? "↻" : "↻"}</Text>
        </Pressable>
      </View>
      <View style={[styles.shipBlocks, !isH && styles.shipBlocksVertical]}>
        {Array.from({ length: ship.size }, (_, i) => (
          <View
            key={i}
            style={[
              styles.shipBlock,
              isSelected && styles.shipBlockActive,
              { width: blockSize, height: blockSize },
            ]}
          />
        ))}
      </View>
      <Text style={styles.shipCardHint}>
        {isH ? "Horizontal" : "Vertical"}
      </Text>
    </Animated.View>
  );
}

/* ─── Grid with coordinate labels ─── */
function Grid({
  board,
  onCellPress,
  showShips = false,
  isEnemy = false,
  cellSize = 28,
  impact,
  onImpactEnd,
  previewCells,
}) {
  const shellX = React.useRef(new Animated.Value(0)).current;
  const shellY = React.useRef(new Animated.Value(-48)).current;
  const shellOpacity = React.useRef(new Animated.Value(0)).current;
  const fxX = React.useRef(new Animated.Value(0)).current;
  const fxY = React.useRef(new Animated.Value(0)).current;
  const fxScale = React.useRef(new Animated.Value(0.2)).current;
  const fxOpacity = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!impact) return;

    const targetX = impact.col * cellSize + cellSize / 2 - 6;
    const targetY = impact.row * cellSize + cellSize / 2 - 6;
    const startX = targetX;
    const gridHeight = BOARD_SIZE * cellSize;
    const fxTargetX = impact.col * cellSize + cellSize / 2 - 14;
    const fxTargetY = impact.row * cellSize + cellSize / 2 - 14;

    shellX.setValue(startX);
    shellY.setValue(-gridHeight - 40);
    shellOpacity.setValue(1);
    fxX.setValue(fxTargetX);
    fxY.setValue(fxTargetY);
    fxScale.setValue(0.2);
    fxOpacity.setValue(0);

    Animated.sequence([
      Animated.parallel([
        Animated.timing(shellX, {
          toValue: targetX,
          duration: 760,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(shellY, {
          toValue: targetY,
          duration: 760,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(shellOpacity, {
          toValue: 0,
          duration: 120,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(fxOpacity, {
            toValue: 1,
            duration: 70,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.parallel([
            Animated.timing(fxScale, {
              toValue: impact.result === "hit" ? 1.55 : 1.9,
              duration: impact.result === "hit" ? 540 : 620,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(fxOpacity, {
              toValue: 0,
              duration: impact.result === "hit" ? 540 : 620,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]),
    ]).start(() => {
      onImpactEnd?.();
    });
  }, [impact, cellSize, shellOpacity, shellX, shellY, fxOpacity, fxScale, fxX, fxY, onImpactEnd]);

  return (
    <View>
      {/* Column headers */}
      <View style={[styles.colHeaders, { paddingLeft: LABEL_W }]}>
        {Array.from({ length: BOARD_SIZE }, (_, i) => (
          <View key={`ch-${i}`} style={{ width: cellSize, alignItems: "center" }}>
            <Text style={styles.coordLabel}>{i + 1}</Text>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: "row" }}>
        {/* Row labels */}
        <View style={{ width: LABEL_W }}>
          {ROW_LABELS.map((label, i) => (
            <View key={`rh-${i}`} style={{ height: cellSize, justifyContent: "center", alignItems: "center" }}>
              <Text style={styles.coordLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Board cells */}
        <View style={styles.gridWrap}>
          <WaveOverlay />
          {board.map((row, rowIndex) => (
            <View key={`r-${rowIndex}`} style={styles.gridRow}>
              {row.map((cell, colIndex) => {
                const isShip = cell === 1;
                const isHit = cell === 2;
                const isMiss = cell === 3;
                const isPreview = previewCells?.cells?.some((p) => p.r === rowIndex && p.c === colIndex);
                const previewValid = isPreview && previewCells?.valid;
                const previewInvalid = isPreview && !previewCells?.valid;
                const bg = isHit
                  ? "#7F1D1D"
                  : isMiss
                    ? "#0F3460"
                    : previewValid
                      ? "rgba(59, 130, 246, 0.45)"
                      : previewInvalid
                        ? "rgba(239, 68, 68, 0.35)"
                        : showShips && isShip
                          ? "#1D4ED8"
                          : "#0B2545";
                return (
                  <Pressable
                    key={`c-${rowIndex}-${colIndex}`}
                    onPress={() => onCellPress?.(rowIndex, colIndex)}
                    disabled={!onCellPress}
                    style={({ pressed }) => [
                      styles.cell,
                      { width: cellSize, height: cellSize, backgroundColor: bg },
                      isPreview && { borderColor: previewValid ? "rgba(59,130,246,0.6)" : "rgba(239,68,68,0.5)", borderWidth: 1 },
                      pressed && onCellPress ? { opacity: 0.7 } : null,
                    ]}
                  >
                    {isHit ? <FlameOverlay size={cellSize} /> : null}
                    {isMiss ? <View style={styles.missDot} /> : null}
                    {showShips && isShip && !isHit ? (
                      <View style={styles.shipMarker} />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          ))}

          {impact ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.shell,
                {
                  opacity: shellOpacity,
                  transform: [{ translateX: shellX }, { translateY: shellY }],
                },
              ]}
            >
              <View style={styles.shellCore} />
            </Animated.View>
          ) : null}

          {impact ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.impactFx,
                impact.result === "hit" ? styles.impactFxHit : styles.impactFxMiss,
                {
                  opacity: fxOpacity,
                  transform: [{ translateX: fxX }, { translateY: fxY }, { scale: fxScale }],
                },
              ]}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}

export function BattleshipScreen({ route }) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { user } = useAuth();
  const { lobbyId } = route?.params || {};
  const [lobby, setLobby] = useState(null);
  const [orientation, setOrientation] = useState("horizontal");
  const [selectedShipName, setSelectedShipName] = useState(SHIPS[0].name);
  const [dragState, setDragState] = useState(null);
  const [showInfo, setShowInfo] = useState(false);
  const [previewCells, setPreviewCells] = useState(null);
  const gridRef = useRef(null);
  const gridLayoutRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const [battleView, setBattleView] = useState("attack");
  const [attackImpact, setAttackImpact] = useState(null);
  const [defenseImpact, setDefenseImpact] = useState(null);
  const [shotPopup, setShotPopup] = useState(null);
  const viewLocked = useRef(false);
  const pendingView = useRef(null);
  const pendingActionInfo = useRef(null);
  const [defenseMaskedCell, setDefenseMaskedCell] = useState(null);
  const [attackMaskedCell, setAttackMaskedCell] = useState(null);
  const firingRef = useRef(false);
  const popupOpacity = useRef(new Animated.Value(0)).current;
  const quitSavedRef = useRef(false);

  useEffect(() => {
    if (!lobbyId) return;
    const lobbyRef = ref(db, `gameLobbies/${lobbyId}`);
    const unsub = onValue(lobbyRef, (snapshot) => {
      setLobby(snapshot.val() || null);
    });
    return () => unsub();
  }, [lobbyId]);

  const gameState = lobby?.gameState || null;
  const players = lobby?.players || {};
  const playerIds = Object.keys(players);
  const myId = user?.id;
  const opponentId = playerIds.find((id) => id !== myId);
  const myState = myId && gameState?.players ? gameState.players[myId] : null;
  const oppState = opponentId && gameState?.players ? gameState.players[opponentId] : null;

  const myName = myId && players[myId]?.name ? players[myId].name : "You";
  const oppName = opponentId && players[opponentId]?.name ? players[opponentId].name : "Opponent";

  // ─── Save match history when game finishes ───
  const matchSavedRef = useRef(false);
  useEffect(() => {
    if (
      gameState?.phase !== "finished" ||
      !gameState?.winnerId ||
      !myId ||
      !opponentId ||
      !lobbyId ||
      matchSavedRef.current
    )
      return;
    // Only the winner writes the record to avoid duplicates
    if (gameState.winnerId !== myId) return;
    matchSavedRef.current = true;

    const myHits = (gameState.players?.[myId]?.shots || [])
      .flat()
      .filter((c) => c === 2).length;
    const myMisses = (gameState.players?.[myId]?.shots || [])
      .flat()
      .filter((c) => c === 3).length;
    const oppHits = (gameState.players?.[opponentId]?.shots || [])
      .flat()
      .filter((c) => c === 2).length;
    const oppMisses = (gameState.players?.[opponentId]?.shots || [])
      .flat()
      .filter((c) => c === 3).length;

    const startedAt = lobby?.createdAt || Date.now();
    const endedAt = Date.now();

    const record = {
      lobbyId,
      gameId: lobby?.gameId || "1",
      gameTitle: lobby?.gameTitle || "Battleship",
      winnerId: gameState.winnerId,
      loserId: opponentId,
      result: gameState.quitBy ? "quit" : "completed",
      quitBy: gameState.quitBy || null,
      quitAtTurn: gameState.quitAtTurn || null,
      quitAtShots: gameState.quitAtShots || null,
      players: {
        [myId]: { name: myName, hits: myHits, misses: myMisses },
        [opponentId]: { name: oppName, hits: oppHits, misses: oppMisses },
      },
      startedAt,
      endedAt,
      durationMs: endedAt - (typeof startedAt === "number" ? startedAt : endedAt),
    };

    // Write to both players' match history
    const myHistRef = push(ref(db, `matchHistory/${myId}`));
    const oppHistRef = push(ref(db, `matchHistory/${opponentId}`));
    set(myHistRef, record);
    set(oppHistRef, record);
  }, [gameState?.phase, gameState?.winnerId, myId, opponentId, lobbyId]);

  // ─── Toggle pause for both players ───
  const handleTogglePause = useCallback(async () => {
    if (!lobbyId || !gameState || !myId) return;
    if (gameState.phase !== "in_progress") return;

    const isPaused = !!gameState.pausedBy;
    if (isPaused) {
      // Only the player who paused (or either) can resume
      await update(ref(db, `gameLobbies/${lobbyId}/gameState`), {
        pausedBy: null,
        pausedAt: null,
        updatedAt: Date.now(),
      });
    } else {
      await update(ref(db, `gameLobbies/${lobbyId}/gameState`), {
        pausedBy: myId,
        pausedAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  }, [lobbyId, gameState, myId]);

  // ─── Quit game (counts as a loss) ───
  const handleQuit = useCallback(async () => {
    if (!lobbyId || !myId || !opponentId || !gameState) return;
    if (quitSavedRef.current) return;
    quitSavedRef.current = true;

    // Count total shots fired by both players
    const myShots_ = gameState.players?.[myId]?.shots || createEmptyBoard();
    const oppShots_ = gameState.players?.[opponentId]?.shots || createEmptyBoard();
    const myTotalShots = myShots_.flat().filter((c) => c === 2 || c === 3).length;
    const oppTotalShots = oppShots_.flat().filter((c) => c === 2 || c === 3).length;
    const totalTurns = myTotalShots + oppTotalShots;

    // Compute hit/miss breakdown
    const myHitsQ = myShots_.flat().filter((c) => c === 2).length;
    const myMissesQ = myShots_.flat().filter((c) => c === 3).length;
    const oppHitsQ = oppShots_.flat().filter((c) => c === 2).length;
    const oppMissesQ = oppShots_.flat().filter((c) => c === 3).length;

    const startedAt = lobby?.createdAt || Date.now();
    const endedAt = Date.now();

    const record = {
      lobbyId,
      gameId: lobby?.gameId || "1",
      gameTitle: lobby?.gameTitle || "Battleship",
      winnerId: opponentId,
      loserId: myId,
      result: "quit",
      quitBy: myId,
      quitAtTurn: totalTurns,
      quitAtShots: { [myId]: myTotalShots, [opponentId]: oppTotalShots },
      players: {
        [myId]: { name: myName, hits: myHitsQ, misses: myMissesQ },
        [opponentId]: { name: oppName, hits: oppHitsQ, misses: oppMissesQ },
      },
      startedAt,
      endedAt,
      durationMs: endedAt - (typeof startedAt === "number" ? startedAt : endedAt),
    };

    // Write match history to both players
    const myHistRef = push(ref(db, `matchHistory/${myId}`));
    const oppHistRef = push(ref(db, `matchHistory/${opponentId}`));
    await Promise.all([set(myHistRef, record), set(oppHistRef, record)]);

    // Update game state so both players see the result
    await update(ref(db, `gameLobbies/${lobbyId}/gameState`), {
      phase: "finished",
      winnerId: opponentId,
      quitBy: myId,
      quitAtTurn: totalTurns,
      quitAtShots: { [myId]: myTotalShots, [opponentId]: oppTotalShots },
      pausedBy: null,
      pausedAt: null,
      updatedAt: Date.now(),
    });
  }, [lobbyId, myId, opponentId, gameState, lobby, myName, oppName]);

  const confirmQuit = useCallback(() => {
    Alert.alert(
      "Quit Game",
      "This will count as a loss. Are you sure you want to quit?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Quit", style: "destructive", onPress: handleQuit },
      ]
    );
  }, [handleQuit]);

  const isPaused = !!gameState?.pausedBy;
  const pausedByMe = gameState?.pausedBy === myId;
  const pauserName = gameState?.pausedBy === myId ? "You" : oppName;

  const showPopup = useCallback((who, result) => {
    setShotPopup({ who, result });
    viewLocked.current = true;
    popupOpacity.setValue(0);
    Animated.timing(popupOpacity, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [popupOpacity]);

  const dismissPopup = useCallback(() => {
    Animated.timing(popupOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShotPopup(null);
      viewLocked.current = false;
      if (pendingView.current) {
        setBattleView(pendingView.current);
        pendingView.current = null;
      }
    });
  }, [popupOpacity]);

  const myBoard = myState?.board || createEmptyBoard();
  const myShots = myState?.shots || createEmptyBoard();

  // Board with the latest opponent shot masked out until animation finishes.
  const defenseBoardDisplay = useMemo(() => {
    if (!defenseMaskedCell) return myBoard;
    const { row, col, original } = defenseMaskedCell;
    const copy = cloneBoard(myBoard);
    copy[row][col] = original;
    return copy;
  }, [myBoard, defenseMaskedCell]);

  // Board with the latest attack shot masked out until animation finishes.
  const attackBoardDisplay = useMemo(() => {
    if (!attackMaskedCell) return myShots;
    const { row, col } = attackMaskedCell;
    const copy = cloneBoard(myShots);
    copy[row][col] = 0;
    return copy;
  }, [myShots, attackMaskedCell]);
  const myShipsToPlace = useMemo(() => {
    if (!myState) return SHIPS;

    const raw = myState.shipsToPlace;
    if (Array.isArray(raw)) return raw;

    // RTDB can serialize empty arrays as null and arrays as keyed objects.
    if (raw && typeof raw === "object") return Object.values(raw);

    return [];
  }, [myState]);

  useEffect(() => {
    if (!gameState || !myShipsToPlace.length) return;
    const exists = myShipsToPlace.some((s) => s.name === selectedShipName);
    if (!exists) {
      setSelectedShipName(myShipsToPlace[0].name);
    }
  }, [gameState, myShipsToPlace, selectedShipName]);

  const initializeGameState = useCallback(async () => {
    if (!lobbyId || !lobby || !myId) return;
    if (lobby.gameState) return;
    if (lobby.hostId !== myId) return;

    const initialPlayers = {};
    Object.keys(lobby.players || {}).forEach((uid) => {
      initialPlayers[uid] = {
        ready: false,
        board: createEmptyBoard(),
        shots: createEmptyBoard(),
        shipsToPlace: SHIPS.map((ship) => ({ ...ship })),
      };
    });

    const initialState = {
      phase: "placement",
      boardSize: BOARD_SIZE,
      currentTurn: lobby.hostId,
      winnerId: null,
      lastAction: null,
      players: initialPlayers,
      updatedAt: Date.now(),
    };

    const gsRef = ref(db, `gameLobbies/${lobbyId}/gameState`);
    const snap = await get(gsRef);
    if (!snap.exists()) {
      await set(gsRef, initialState);
    }
  }, [lobbyId, lobby, myId]);

  useEffect(() => {
    initializeGameState();
  }, [initializeGameState]);

  const handlePlaceShip = async (row, col) => {
    if (!lobbyId || !myId || !gameState) return;
    if (gameState.phase !== "placement") return;
    const ship = myShipsToPlace.find((s) => s.name === selectedShipName);
    if (!ship) return;

    if (!canPlaceShip(myBoard, row, col, ship.size, orientation)) {
      return;
    }

    const nextBoard = placeShip(myBoard, row, col, ship.size, orientation);
    const nextShips = myShipsToPlace.filter((s) => s.name !== ship.name);

    await update(ref(db, `gameLobbies/${lobbyId}/gameState/players/${myId}`), {
      board: nextBoard,
      shipsToPlace: nextShips,
      updatedAt: Date.now(),
    });
  };

  const handleDropShip = useCallback(async (ship, pageX, pageY, dropOrientation) => {
    if (!lobbyId || !myId || !gameState) return;
    if (gameState.phase !== "placement") return;

    const g = gridLayoutRef.current;
    // Offset so the ship is centered on the finger, not placed from its start
    const halfOffset = Math.floor(ship.size / 2);
    const rawCol = Math.floor((pageX - g.x) / placementCellSize);
    const rawRow = Math.floor((pageY - g.y) / placementCellSize);
    const col = dropOrientation === "horizontal" ? rawCol - halfOffset : rawCol;
    const row = dropOrientation === "vertical" ? rawRow - halfOffset : rawRow;

    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return;
    if (!canPlaceShip(myBoard, row, col, ship.size, dropOrientation)) return;

    const nextBoard = placeShip(myBoard, row, col, ship.size, dropOrientation);
    const nextShips = myShipsToPlace.filter((s) => s.name !== ship.name);

    await update(ref(db, `gameLobbies/${lobbyId}/gameState/players/${myId}`), {
      board: nextBoard,
      shipsToPlace: nextShips,
      updatedAt: Date.now(),
    });
  }, [lobbyId, myId, gameState, myBoard, myShipsToPlace, placementCellSize]);

  const calcPreview = useCallback((ship, pageX, pageY, dragOri) => {
    const g = gridLayoutRef.current;
    const halfOffset = Math.floor(ship.size / 2);
    const rawCol = Math.floor((pageX - g.x) / placementCellSize);
    const rawRow = Math.floor((pageY - g.y) / placementCellSize);
    const col = dragOri === "horizontal" ? rawCol - halfOffset : rawCol;
    const row = dragOri === "vertical" ? rawRow - halfOffset : rawRow;

    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
      setPreviewCells(null);
      return;
    }

    const valid = canPlaceShip(myBoard, row, col, ship.size, dragOri);
    const cells = [];
    for (let i = 0; i < ship.size; i++) {
      const r = dragOri === "vertical" ? row + i : row;
      const c = dragOri === "horizontal" ? col + i : col;
      if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
        cells.push({ r, c });
      }
    }
    setPreviewCells({ cells, valid });
  }, [myBoard, placementCellSize]);

  const handleReady = async () => {
    if (!lobbyId || !myId || !gameState) return;
    if (myShipsToPlace.length > 0) {
      Alert.alert("Place all ships", "You must place all ships before readying up.");
      return;
    }

    await update(ref(db, `gameLobbies/${lobbyId}/gameState/players/${myId}`), {
      ready: true,
      updatedAt: Date.now(),
    });

    const latestSnap = await get(ref(db, `gameLobbies/${lobbyId}/gameState`));
    const latest = latestSnap.val();
    const allReady = Object.values(latest?.players || {}).every((p) => p.ready);

    if (allReady && lobby?.hostId === myId && latest?.phase === "placement") {
      await update(ref(db, `gameLobbies/${lobbyId}/gameState`), {
        phase: "in_progress",
        currentTurn: lobby.hostId,
        updatedAt: Date.now(),
      });
    }
  };

  const handleFire = async (row, col) => {
    if (!lobbyId || !myId || !opponentId || !gameState) return;
    if (gameState.phase !== "in_progress") return;
    if (gameState.currentTurn !== myId) return;
    if (myShots[row][col] === 2 || myShots[row][col] === 3) return;
    if (firingRef.current || viewLocked.current || isPaused) return;
    firingRef.current = true;

    const freshSnapshot = await get(ref(db, `gameLobbies/${lobbyId}/gameState`));
    const liveState = freshSnapshot.val();
    if (!liveState || liveState.phase !== "in_progress" || liveState.currentTurn !== myId) {
      firingRef.current = false;
      return;
    }

    const myLiveShots = liveState.players?.[myId]?.shots || createEmptyBoard();
    if (myLiveShots[row]?.[col] === 2 || myLiveShots[row]?.[col] === 3) {
      firingRef.current = false;
      return;
    }

    const oppBoard = liveState.players?.[opponentId]?.board || createEmptyBoard();
    const nextOppBoard = cloneBoard(oppBoard);
    const nextMyShots = cloneBoard(myLiveShots);

    const isHit = nextOppBoard[row][col] === 1;
    nextOppBoard[row][col] = isHit ? 2 : 3;
    nextMyShots[row][col] = isHit ? 2 : 3;

    const remaining = countShipCells(nextOppBoard);
    const didWin = remaining === 0;

    const payload = {
      [`players/${opponentId}/board`]: nextOppBoard,
      [`players/${myId}/shots`]: nextMyShots,
      lastAction: {
        by: myId,
        row,
        col,
        result: isHit ? "hit" : "miss",
        at: Date.now(),
      },
      updatedAt: Date.now(),
    };

    if (didWin) {
      payload.phase = "finished";
      payload.winnerId = myId;
    } else {
      payload.currentTurn = opponentId;
    }

    // Write to Firebase first — both players react via lastAction listener
    await update(ref(db, `gameLobbies/${lobbyId}/gameState`), payload);
    firingRef.current = false;
  };

  useEffect(() => {
    const action = gameState?.lastAction;
    if (!action || !myId) return;

    const isMine = action.by === myId;
    const who = isMine ? myName : oppName;

    pendingActionInfo.current = { who, result: action.result };
    viewLocked.current = true;

    if (isMine) {
      // Attacker: show on attack board, mask the shot cell
      setAttackMaskedCell({ row: action.row, col: action.col });
      setBattleView("attack");
      setAttackImpact({
        id: `${action.at}-${action.row}-${action.col}`,
        row: action.row,
        col: action.col,
        result: action.result,
      });
    } else {
      // Defender: show on defense board, mask the hit cell
      setDefenseMaskedCell({ row: action.row, col: action.col, original: action.result === "hit" ? 1 : 0 });
      setBattleView("defense");
      setDefenseImpact({
        id: `${action.at}-${action.row}-${action.col}`,
        row: action.row,
        col: action.col,
        result: action.result,
      });
    }
  }, [gameState?.lastAction, myId, myName, oppName]);

  const onAttackImpactEnd = useCallback(() => {
    setAttackImpact(null);
    setAttackMaskedCell(null);
    const info = pendingActionInfo.current;
    if (info) {
      pendingActionInfo.current = null;
      showPopup(info.who, info.result);
      setTimeout(() => dismissPopup(), 4000);
    } else {
      viewLocked.current = false;
    }
  }, [showPopup, dismissPopup]);

  const onDefenseImpactEnd = useCallback(() => {
    setDefenseImpact(null);
    setDefenseMaskedCell(null);
    const info = pendingActionInfo.current;
    if (info) {
      pendingActionInfo.current = null;
      showPopup(info.who, info.result);
      setTimeout(() => dismissPopup(), 4000);
    } else {
      viewLocked.current = false;
    }
  }, [showPopup, dismissPopup]);

  const phaseLabel = useMemo(() => {
    if (!gameState) return "Loading";
    if (gameState.phase === "placement") return "Ship Placement";
    if (gameState.phase === "in_progress") return "Battle";
    if (gameState.phase === "finished") return "Game Over";
    return "Battleship";
  }, [gameState]);

  const statusText = useMemo(() => {
    if (!gameState || !myId) return "Syncing game state...";
    if (gameState.phase === "placement") {
      if (myShipsToPlace.length > 0) {
        return `Place ships: ${myShipsToPlace.map((s) => `${s.name}(${s.size})`).join(", ")}`;
      }
      return myState?.ready ? "Waiting for opponent to get ready..." : "All ships placed. Mark ready.";
    }
    if (gameState.phase === "in_progress") {
      if (gameState.pausedBy) return "Game paused";
      return gameState.currentTurn === myId ? "Your turn: fire on the enemy grid." : "Opponent turn...";
    }
    if (gameState.phase === "finished") {
      if (gameState.quitBy) {
        return gameState.quitBy === myId ? "You quit the game." : `${oppName} quit the game.`;
      }
      return gameState.winnerId === myId ? "Victory! You sank all enemy ships." : "Defeat. Your fleet was destroyed.";
    }
    return "";
  }, [gameState, myId, myShipsToPlace, myState?.ready]);

  useEffect(() => {
    if (!lobbyId || !gameState || !lobby || !myId) return;
    if (gameState.phase !== "placement") return;
    if (lobby.hostId !== myId) return;

    const allReady = Object.values(gameState.players || {}).every((p) => p?.ready);
    if (!allReady) return;

    update(ref(db, `gameLobbies/${lobbyId}/gameState`), {
      phase: "in_progress",
      currentTurn: lobby.hostId,
      updatedAt: Date.now(),
    });
  }, [lobbyId, gameState, lobby, myId]);

  useEffect(() => {
    if (!gameState || !myId) return;
    if (gameState.phase !== "in_progress") return;
    const nextView = gameState.currentTurn === myId ? "attack" : "defense";
    if (viewLocked.current) {
      pendingView.current = nextView;
      return;
    }
    setBattleView(nextView);
  }, [gameState?.phase, gameState?.currentTurn, myId]);

  const compactLayout = height < 760;
  const usableWidth = width - 52 - LABEL_W;
  const baseCellByWidth = Math.floor(usableWidth / BOARD_SIZE);

  const approxHeader = 56;
  const approxInfoBar = 60;
  const approxBottomButton = 48;
  const approxOuterGaps = 42;
  const mainHeight =
    height - insets.top - insets.bottom - approxHeader - approxInfoBar - approxBottomButton - approxOuterGaps;

  const placementCellByHeight = Math.floor((mainHeight - 130) / BOARD_SIZE);
  const battleCellByHeight = Math.floor((mainHeight - 116) / BOARD_SIZE);

  const placementCellSize = Math.max(18, Math.min(30, Math.min(baseCellByWidth, placementCellByHeight)));
  const battleCellSize = Math.max(14, Math.min(24, Math.min(baseCellByWidth, battleCellByHeight)));

  const isMyTurn = gameState?.phase === "in_progress" && gameState?.currentTurn === myId;
  const isFinished = gameState?.phase === "finished";
  const didWin = isFinished && gameState?.winnerId === myId;

  return (
    <View style={[styles.container, { paddingTop: insets.top + (compactLayout ? 4 : 8), paddingBottom: insets.bottom + (compactLayout ? 4 : 8) }]}>
      {/* Background orbs */}
      <View style={styles.bgOrbOne} />
      <View style={styles.bgOrbTwo} />
      <View style={styles.bgOrbThree} />

      {/* ─── Header ─── */}
      <View style={[styles.headerRow, compactLayout && styles.headerRowCompact]}>
        <View style={styles.headerLeft}>
          <Pressable style={styles.closeBtn} onPress={() => navigation.replace("GameLobby", { lobbyId })}>
            <Icon name="close" size={16} color="#94A3B8" />
          </Pressable>
          {gameState?.phase === "in_progress" && !isFinished ? (
            <Pressable style={[styles.backBtn, isPaused && styles.pauseBtnActive]} onPress={handleTogglePause}>
              <Icon name={isPaused ? "play" : "pause"} size={16} color={isPaused ? "#60A5FA" : "#94A3B8"} />
            </Pressable>
          ) : null}
        </View>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>BATTLESHIP</Text>
          <View style={[styles.phaseBadge, isPaused && styles.phaseBadgePaused, isFinished && (didWin ? styles.phaseBadgeWin : styles.phaseBadgeLose)]}>
            <Text style={[styles.phaseBadgeText, isPaused && styles.phaseBadgeTextPaused, isFinished && styles.phaseBadgeTextFinish]}>
              {isPaused ? "Paused" : phaseLabel}
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Pressable style={styles.infoBtn} onPress={() => setShowInfo(v => !v)}>
            <Icon name="info" size={16} color="#94A3B8" />
          </Pressable>
        </View>
      </View>

      {/* ─── Info Dropdown ─── */}
      {showInfo ? (
        <Pressable style={styles.infoDropdownBackdrop} onPress={() => setShowInfo(false)}>
          <View style={[styles.infoDropdown, { top: insets.top + (compactLayout ? 46 : 52) }]}>
            <View style={styles.infoDropdownRow}>
              <Text style={styles.infoDropdownLabel}>STATUS</Text>
              <View style={styles.infoDropdownValueRow}>
                {isMyTurn ? <PulseDot /> : null}
                <Text style={[styles.infoDropdownValue, isMyTurn && styles.infoDropdownValueActive]} numberOfLines={2}>
                  {statusText}
                </Text>
              </View>
            </View>
            {gameState?.lastAction ? (
              <View style={styles.infoDropdownRow}>
                <Text style={styles.infoDropdownLabel}>LAST SHOT</Text>
                <Text style={styles.infoDropdownValue}>
                  {ROW_LABELS[gameState.lastAction.row]}{gameState.lastAction.col + 1}{" "}
                  <Text style={gameState.lastAction.result === "hit" ? styles.hitText : styles.missText}>
                    {gameState.lastAction.result.toUpperCase()}
                  </Text>
                </Text>
              </View>
            ) : null}
          </View>
        </Pressable>
      ) : null}

      {/* ─── Main Area ─── */}
      <ScrollView
        style={[styles.mainArea, compactLayout && styles.mainAreaCompact]}
        contentContainerStyle={styles.mainAreaContent}
        scrollEnabled={gameState?.phase !== "placement" || !dragState}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >

        {/* ── Placement Phase ── */}
        {gameState?.phase === "placement" ? (
          <View style={[styles.section, compactLayout && styles.sectionCompact]}>
            <Text style={styles.sectionTitle}>DEPLOY YOUR FLEET</Text>

            <View
              style={styles.gridCenter}
              ref={gridRef}
              onLayout={() => {
                gridRef.current?.measureInWindow((x, y, w, h) => {
                  gridLayoutRef.current = { x: x + LABEL_W, y: y + 16, width: w - LABEL_W, height: h - 16 };
                });
              }}
            >
              <Grid
                board={myBoard}
                onCellPress={handlePlaceShip}
                showShips
                cellSize={placementCellSize}
                previewCells={previewCells}
              />
            </View>

            {/* Ship selector — draggable */}
            <Text style={styles.dragHint}>Drag a ship onto the board · Tap ship to rotate</Text>
            <View style={styles.shipSelector}>
              {myShipsToPlace.map((ship) => (
                <DraggableShipCard
                  key={ship.name}
                  ship={ship}
                  cellSize={placementCellSize}
                  orientation={orientation}
                  onOrientationChange={setOrientation}
                  onDragStart={(s) => { setSelectedShipName(s.name); }}
                  onDragMove={(s, x, y, ori) => calcPreview(s, x, y, ori)}
                  onDragEnd={(s, x, y, ori) => {
                    setPreviewCells(null);
                    setDragState(null);
                    handleDropShip(s, x, y, ori);
                  }}
                  onDragCancel={() => { setPreviewCells(null); setDragState(null); }}
                  isSelected={selectedShipName === ship.name}
                />
              ))}
            </View>

            {/* Actions row */}
            <View style={styles.rowActions}>
              <Pressable
                style={[styles.actionBtn, styles.primaryBtn, myState?.ready && styles.disabled]}
                onPress={handleReady}
                disabled={Boolean(myState?.ready)}
              >
                <Text style={styles.primaryBtnText}>
                  {myState?.ready ? "✓ Ready" : "Mark Ready"}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* ── Battle / Finished Phase ── */}
        {gameState?.phase === "in_progress" || gameState?.phase === "finished" ? (
          <View style={[styles.section, compactLayout && styles.sectionCompact]}>

            {/* Victory / Defeat banner */}
            {isFinished ? (
              <View style={[styles.resultBanner, didWin ? styles.resultBannerWin : styles.resultBannerLose]}>
                <Icon name="trophy" size={18} color={didWin ? "#FCD34D" : "#94A3B8"} />
                <Text style={[styles.resultBannerText, didWin ? styles.resultWinText : styles.resultLoseText]}>
                  {didWin ? "VICTORY" : "DEFEAT"}
                </Text>
              </View>
            ) : null}

            {/* Tab switcher */}
            <View style={styles.viewTabs}>
              <Pressable
                style={[styles.viewTab, battleView === "attack" && styles.viewTabActive]}
                onPress={() => { if (!viewLocked.current) setBattleView("attack"); }}
              >
                <Text style={[styles.viewTabText, battleView === "attack" && styles.viewTabTextActive]}>
                  ⊕ Attack
                </Text>
              </Pressable>
              <Pressable
                style={[styles.viewTab, battleView === "defense" && styles.viewTabActive]}
                onPress={() => { if (!viewLocked.current) setBattleView("defense"); }}
              >
                <Text style={[styles.viewTabText, battleView === "defense" && styles.viewTabTextActive]}>
                  ⊘ Defense
                </Text>
              </Pressable>
            </View>

            <Text style={styles.sectionTitle}>
              {battleView === "attack" ? "ENEMY WATERS" : "YOUR FLEET"}
            </Text>

            <View style={styles.gridCenter}>
              {battleView === "attack" ? (
                <Grid
                  board={attackBoardDisplay}
                  onCellPress={gameState?.phase === "in_progress" ? handleFire : undefined}
                  isEnemy
                  cellSize={battleCellSize}
                  impact={attackImpact}
                  onImpactEnd={onAttackImpactEnd}
                />
              ) : (
                <Grid
                  board={defenseBoardDisplay}
                  showShips
                  cellSize={battleCellSize}
                  impact={defenseImpact}
                  onImpactEnd={onDefenseImpactEnd}
                />
              )}
            </View>

            {/* Shot Popup */}
            {shotPopup ? (
              <Animated.View style={[styles.shotPopup, { opacity: popupOpacity }]}>
                <View style={[
                  styles.shotPopupInner,
                  shotPopup.result === "hit" ? styles.shotPopupHit : styles.shotPopupMiss,
                ]}>
                  {shotPopup.result === "hit" ? (
                    <Text style={styles.shotPopupIcon}>{"\uD83D\uDCA5"}</Text>
                  ) : (
                    <View style={styles.shotPopupXWrap}>
                      <Icon name="close" size={28} color="#F87171" />
                    </View>
                  )}
                  <Text style={styles.shotPopupTitle}>
                    {shotPopup.result === "hit" ? "DIRECT HIT!" : "MISS!"}
                  </Text>
                  <Text style={styles.shotPopupWho}>
                    {shotPopup.who} {shotPopup.result === "hit" ? "hit a ship" : "missed"}
                  </Text>
                </View>
              </Animated.View>
            ) : null}

            {/* Legend */}
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#EF4444" }]} />
                <Text style={styles.legendText}>Hit</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#60A5FA" }]} />
                <Text style={styles.legendText}>Miss</Text>
              </View>
              {battleView === "defense" ? (
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: "#3B82F6" }]} />
                  <Text style={styles.legendText}>Ship</Text>
                </View>
              ) : null}
            </View>

            {/* Pause Overlay */}
            {isPaused && !isFinished ? (
              <View style={styles.pauseOverlay}>
                <View style={styles.pauseCard}>
                  <View style={styles.pauseIconWrap}>
                    <Icon name="pause" size={24} color="#60A5FA" />
                  </View>
                  <Text style={styles.pauseTitle}>GAME PAUSED</Text>
                  <Text style={styles.pauseSub}>{pauserName} paused the game</Text>

                  <View style={styles.pauseMenu}>
                    <Pressable style={styles.pauseMenuBtn} onPress={handleTogglePause}>
                      <Icon name="play" size={16} color="#34D399" />
                      <Text style={[styles.pauseMenuText, { color: "#34D399" }]}>Resume</Text>
                    </Pressable>

                    <View style={styles.pauseDivider} />

                    <Pressable style={styles.pauseMenuBtn} onPress={confirmQuit}>
                      <Icon name="close" size={16} color="#F87171" />
                      <Text style={[styles.pauseMenuText, { color: "#F87171" }]}>Quit Game</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ) : null}

            {/* Quit result banner */}
            {isFinished && gameState?.quitBy ? (
              <View style={styles.quitBanner}>
                <Icon name="close" size={14} color="#F59E0B" />
                <Text style={styles.quitBannerText}>
                  {gameState.quitBy === myId ? "You quit the game" : `${oppName} quit the game`}
                  {gameState.quitAtTurn ? ` at turn ${gameState.quitAtTurn}` : ""}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      {/* ─── Confetti for winner ─── */}
      {didWin ? <ConfettiOverlay screenW={width} screenH={height} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  /* ─── Container & Background ─── */
  container: {
    flex: 1,
    backgroundColor: "#040E1A",
    paddingHorizontal: 14,
    position: "relative",
  },
  bgOrbOne: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(30, 80, 180, 0.12)",
    top: -80,
    right: -60,
  },
  bgOrbTwo: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(10, 50, 120, 0.18)",
    bottom: -60,
    left: -40,
  },
  bgOrbThree: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(59, 130, 246, 0.06)",
    top: "45%",
    left: "30%",
  },

  /* ─── Header ─── */
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  headerRowCompact: { marginBottom: 4 },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minWidth: 80,
  },
  headerRight: {
    alignItems: "flex-end",
    minWidth: 36,
  },
  infoBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  infoDropdownBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  infoDropdown: {
    position: "absolute",
    right: 14,
    backgroundColor: "rgba(8, 28, 54, 0.95)",
    borderWidth: 1,
    borderColor: "rgba(56, 130, 255, 0.2)",
    borderRadius: 12,
    padding: 12,
    minWidth: 180,
    gap: 10,
    zIndex: 101,
  },
  infoDropdownRow: {
    gap: 3,
  },
  infoDropdownLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#4A6C8F",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  infoDropdownValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoDropdownValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94A3B8",
  },
  infoDropdownValueActive: {
    color: "#F59E0B",
    fontWeight: "700",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: { alignItems: "center", gap: 4 },
  headerTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#E2E8F0",
    letterSpacing: 3,
  },
  phaseBadge: {
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  phaseBadgeWin: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderColor: "rgba(16, 185, 129, 0.4)",
  },
  phaseBadgeLose: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderColor: "rgba(239, 68, 68, 0.4)",
  },
  phaseBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#60A5FA",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  phaseBadgeTextFinish: {
    color: "#F8FAFC",
  },

  /* ─── Info Strip ─── */
  infoStrip: {
    flexDirection: "row",
    backgroundColor: "rgba(8, 28, 54, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(56, 130, 255, 0.12)",
    borderRadius: 14,
    padding: 10,
    gap: 12,
    marginBottom: 6,
    zIndex: 2,
  },
  infoStripCompact: { padding: 6, marginBottom: 4 },
  infoItem: { flex: 1, gap: 3 },
  infoItemRight: { alignItems: "flex-end", gap: 3 },
  infoLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#4A6C8F",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  infoValueRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  infoValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94A3B8",
  },
  infoValueActive: {
    color: "#F59E0B",
    fontWeight: "700",
  },
  hitText: { color: "#EF4444", fontWeight: "800" },
  missText: { color: "#60A5FA", fontWeight: "800" },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F59E0B",
  },

  /* ─── Main Area ─── */
  mainArea: {
    flex: 1,
    marginTop: 6,
    zIndex: 2,
  },
  mainAreaContent: {
    flexGrow: 1,
  },
  mainAreaCompact: { marginTop: 4 },

  /* ─── Section Card ─── */
  section: {
    marginTop: 4,
    backgroundColor: "rgba(8, 28, 54, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(56, 130, 255, 0.12)",
    borderRadius: 16,
    padding: 10,
    overflow: "hidden",
  },
  sectionCompact: { padding: 6, marginTop: 2 },
  sectionFill: { flex: 1 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#7BA3CF",
    marginBottom: 6,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },

  /* ─── Grid ─── */
  colHeaders: { flexDirection: "row", marginBottom: 2 },
  coordLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#4A6C8F",
  },
  gridCenter: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  gridWrap: {
    borderWidth: 1,
    borderColor: "rgba(30, 80, 140, 0.4)",
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
  },
  gridRow: { flexDirection: "row" },
  cell: {
    borderWidth: 0.5,
    borderColor: "rgba(30, 80, 140, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  missDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(96, 165, 250, 0.5)",
  },
  shipMarker: {
    width: "60%",
    height: "60%",
    borderRadius: 2,
    backgroundColor: "rgba(147, 197, 253, 0.18)",
  },

  /* ─── Shell & Impact ─── */
  shell: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#F59E0B",
    shadowOpacity: 0.5,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  shellCore: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#F59E0B",
  },
  impactFx: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  impactFxHit: {
    backgroundColor: "rgba(239, 68, 68, 0.45)",
    borderWidth: 2,
    borderColor: "rgba(251, 146, 60, 0.9)",
    shadowColor: "#F97316",
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
  },
  impactFxMiss: {
    backgroundColor: "rgba(59, 130, 246, 0.18)",
    borderWidth: 2,
    borderColor: "rgba(96, 165, 250, 0.7)",
  },

  /* ─── Flame (unchanged) ─── */
  flameWrap: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  flameGlow: {
    position: "absolute",
    backgroundColor: "rgba(249,115,22,0.55)",
  },
  flameSmoke: {
    position: "absolute",
    backgroundColor: "rgba(30,41,59,0.45)",
    bottom: 7,
  },
  flameTongueLarge: {
    position: "absolute",
    backgroundColor: "rgba(239,68,68,0.96)",
    bottom: 2,
  },
  flameTongueMedium: {
    position: "absolute",
    backgroundColor: "rgba(251,146,60,0.96)",
    bottom: 4,
  },
  flameTongueTip: {
    position: "absolute",
    backgroundColor: "rgba(254,243,199,0.98)",
    bottom: 8,
  },
  flameSpark: {
    position: "absolute",
    backgroundColor: "rgba(254,240,138,1)",
    bottom: 10,
  },
  flameSparkTwo: {
    position: "absolute",
    backgroundColor: "rgba(255,255,255,0.95)",
    bottom: 9,
  },

  /* ─── Ship Selector ─── */
  shipSelector: {
    marginTop: 6,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "center",
  },
  dragHint: {
    marginTop: 8,
    fontSize: 10,
    fontWeight: "600",
    color: "#4A6C8F",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  shipCard: {
    backgroundColor: "rgba(15, 52, 96, 0.5)",
    borderWidth: 1,
    borderColor: "rgba(30, 80, 140, 0.3)",
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 3,
    minWidth: 64,
    alignItems: "center",
  },
  shipCardActive: {
    backgroundColor: "rgba(29, 78, 216, 0.3)",
    borderColor: "#3B82F6",
  },
  shipCardDragging: {
    backgroundColor: "rgba(29, 78, 216, 0.5)",
    borderColor: "#60A5FA",
    shadowColor: "#3B82F6",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  shipCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  shipCardName: {
    fontSize: 10,
    fontWeight: "700",
    color: "#7BA3CF",
  },
  shipCardNameActive: {
    color: "#93C5FD",
  },
  rotateBtn: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  rotateBtnActive: {
    backgroundColor: "rgba(59, 130, 246, 0.3)",
  },
  rotateBtnText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#60A5FA",
  },
  shipBlocks: {
    flexDirection: "row",
    gap: 2,
  },
  shipBlocksVertical: {
    flexDirection: "column",
  },
  shipBlock: {
    width: 8,
    height: 8,
    borderRadius: 2,
    backgroundColor: "rgba(59, 130, 246, 0.3)",
  },
  shipBlockActive: {
    backgroundColor: "#3B82F6",
  },
  shipCardHint: {
    fontSize: 7,
    fontWeight: "600",
    color: "#4A6C8F",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  /* ─── Action Buttons ─── */
  rowActions: {
    marginTop: 8,
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtn: {
    backgroundColor: "rgba(15, 52, 96, 0.5)",
    borderWidth: 1,
    borderColor: "rgba(30, 80, 140, 0.35)",
  },
  secondaryBtnText: {
    color: "#7BA3CF",
    fontWeight: "700",
    fontSize: 11,
  },
  primaryBtn: {
    backgroundColor: "#1D4ED8",
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 12,
  },
  disabled: { opacity: 0.5 },

  /* ─── Battle Tabs ─── */
  viewTabs: {
    flexDirection: "row",
    backgroundColor: "rgba(11, 37, 69, 0.6)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(30, 80, 140, 0.25)",
    padding: 3,
    marginBottom: 8,
  },
  viewTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 7,
  },
  viewTabActive: {
    backgroundColor: "#1D4ED8",
  },
  viewTabText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4A6C8F",
  },
  viewTabTextActive: {
    color: "#FFFFFF",
  },

  /* ─── Result Banner ─── */
  resultBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 8,
  },
  resultBannerWin: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  resultBannerLose: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.25)",
  },
  resultBannerText: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 3,
  },
  resultWinText: { color: "#34D399" },
  resultLoseText: { color: "#F87171" },

  /* ─── Legend ─── */
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#4A6C8F",
  },

  /* ─── Shot Popup ─── */
  shotPopup: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
    backgroundColor: "rgba(4, 14, 26, 0.55)",
    borderRadius: 16,
  },
  shotPopupInner: {
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 28,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  shotPopupHit: {
    backgroundColor: "rgba(127, 29, 29, 0.85)",
    borderColor: "rgba(239, 68, 68, 0.5)",
  },
  shotPopupMiss: {
    backgroundColor: "rgba(11, 37, 69, 0.85)",
    borderColor: "rgba(96, 165, 250, 0.4)",
  },
  shotPopupIcon: {
    fontSize: 32,
    marginBottom: 2,
  },
  shotPopupXWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(248,113,113,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  shotPopupTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#F8FAFC",
    letterSpacing: 2,
  },
  shotPopupWho: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94A3B8",
    marginTop: 2,
  },

  /* ─── Pause Overlay ─── */
  pauseOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(4, 14, 26, 0.82)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 30,
    borderRadius: 16,
  },
  pauseCard: {
    backgroundColor: "rgba(11, 37, 69, 0.95)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)",
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 32,
    alignItems: "center",
    minWidth: 220,
    shadowColor: "#1D4ED8",
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  pauseIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(59, 130, 246, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  pauseTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#F8FAFC",
    letterSpacing: 3,
    marginBottom: 4,
  },
  pauseSub: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 20,
  },
  pauseMenu: {
    width: "100%",
    backgroundColor: "rgba(15, 52, 96, 0.5)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(30, 80, 140, 0.3)",
    overflow: "hidden",
  },
  pauseMenuBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
  },
  pauseMenuText: {
    fontSize: 14,
    fontWeight: "700",
  },
  pauseDivider: {
    height: 1,
    backgroundColor: "rgba(30, 80, 140, 0.3)",
  },
  pauseBtnActive: {
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    borderColor: "rgba(59, 130, 246, 0.4)",
  },
  phaseBadgePaused: {
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderColor: "rgba(245, 158, 11, 0.3)",
  },
  phaseBadgeTextPaused: {
    color: "#F59E0B",
  },
  quitBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "rgba(245, 158, 11, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.2)",
  },
  quitBannerText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#F59E0B",
  },

  /* ─── Exit Button ─── */
  exitBtn: {
    marginTop: 8,
    backgroundColor: "rgba(15, 52, 96, 0.5)",
    borderWidth: 1,
    borderColor: "rgba(30, 80, 140, 0.3)",
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  exitBtnCompact: { marginTop: 4, paddingVertical: 8 },
  exitBtnText: {
    color: "#94A3B8",
    fontWeight: "700",
    fontSize: 13,
  },
});

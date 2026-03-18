import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Alert,
  ScrollView,
  useWindowDimensions,
  Animated,
  TextInput,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../utils/colors";
import { Icon } from "../components/ui/Icon";
import { useAuth } from "../context/AuthContext";
import { db } from "../lib/firebase";
import { ref, onValue, update, set, push, get } from "firebase/database";

/* ══════════════════════════════════════════════════════════════
   Constants
   ══════════════════════════════════════════════════════════════ */

const ROUNDS = [
  { key: "slagalica", label: "Slagalica", icon: "mail", desc: "Letters" },
  { key: "moj_broj", label: "Moj Broj", icon: "search", desc: "Numbers" },
  { key: "skocko", label: "Skočko", icon: "lock", desc: "Mastermind" },
  { key: "spojnice", label: "Spojnice", icon: "link", desc: "Connections" },
  { key: "ko_zna_zna", label: "Ko zna zna", icon: "globe", desc: "Quiz" },
  { key: "asocijacije", label: "Asocijacije", icon: "people", desc: "Associations" },
];

const ROUND_TIME = {
  slagalica: 60,
  moj_broj: 90,
  skocko: 0, // turn-based, no global timer
  spojnice: 60,
  ko_zna_zna: 0, // reaction-based
  asocijacije: 120,
};

// Serbian-friendly letter set (balanced vowels/consonants)
const VOWELS = "AAAEEEIIIOOU";
const CONSONANTS = "BBCČĆDDĐFFGHJKLLJMNNJPPRSŠTTZVŽ";

function generateLetters() {
  const letters = [];
  const vowelCount = 4 + Math.floor(Math.random() * 2); // 4-5 vowels
  for (let i = 0; i < vowelCount; i++) {
    letters.push(VOWELS[Math.floor(Math.random() * VOWELS.length)]);
  }
  for (let i = letters.length; i < 12; i++) {
    letters.push(CONSONANTS[Math.floor(Math.random() * CONSONANTS.length)]);
  }
  // shuffle
  for (let i = letters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }
  return letters;
}

function generateMojBrojData() {
  const target = 100 + Math.floor(Math.random() * 900); // 100-999
  const singles = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const mids = [10, 15, 20];
  const bigs = [25, 50, 75, 100];
  const numbers = [];
  // 4 single-digit
  for (let i = 0; i < 4; i++) {
    numbers.push(singles[Math.floor(Math.random() * singles.length)]);
  }
  // 1 mid
  numbers.push(mids[Math.floor(Math.random() * mids.length)]);
  // 1 big
  numbers.push(bigs[Math.floor(Math.random() * bigs.length)]);
  return { target, numbers };
}

// Safe math expression evaluator (only +, -, *, /)
function evaluateExpression(expr) {
  try {
    const sanitized = expr.replace(/×/g, "*").replace(/÷/g, "/");
    // Only allow digits, operators, parentheses, spaces, dots
    if (/[^0-9+\-*/().\s]/.test(sanitized)) return null;
    // Prevent empty or operator-only expressions
    if (!/\d/.test(sanitized)) return null;
    const result = Function('"use strict"; return (' + sanitized + ')')();
    if (!isFinite(result)) return null;
    return Math.round(result);
  } catch {
    return null;
  }
}

// Skočko symbols
const SKOCKO_SYMBOLS = ["♠", "♥", "♦", "♣", "★", "🎯"];
const SKOCKO_COLORS = {
  "♠": "#1E293B",
  "♥": "#E11D48",
  "♦": "#3B82F6",
  "♣": "#10B981",
  "★": "#F59E0B",
  "🎯": "#8B5CF6",
};

function generateSkockoCode() {
  const code = [];
  for (let i = 0; i < 4; i++) {
    code.push(SKOCKO_SYMBOLS[Math.floor(Math.random() * SKOCKO_SYMBOLS.length)]);
  }
  return code;
}

function checkSkockoGuess(guess, code) {
  const exact = [];
  const partial = [];
  const codeRemain = [...code];
  const guessRemain = [];

  guess.forEach((g, i) => {
    if (g === code[i]) {
      exact.push(i);
      codeRemain[i] = null;
    } else {
      guessRemain.push({ symbol: g, index: i });
    }
  });

  guessRemain.forEach(({ symbol }) => {
    const idx = codeRemain.indexOf(symbol);
    if (idx !== -1) {
      partial.push(idx);
      codeRemain[idx] = null;
    }
  });

  return { exact: exact.length, partial: partial.length };
}

// Spojnice data generator
const SPOJNICE_SETS = [
  {
    theme: "Countries & Capitals",
    pairs: [
      ["France", "Paris"],
      ["Germany", "Berlin"],
      ["Japan", "Tokyo"],
      ["Brazil", "Brasília"],
      ["Egypt", "Cairo"],
      ["Canada", "Ottawa"],
      ["Italy", "Rome"],
      ["Spain", "Madrid"],
      ["India", "New Delhi"],
      ["Australia", "Canberra"],
    ],
  },
  {
    theme: "Elements & Symbols",
    pairs: [
      ["Gold", "Au"],
      ["Silver", "Ag"],
      ["Iron", "Fe"],
      ["Copper", "Cu"],
      ["Lead", "Pb"],
      ["Tin", "Sn"],
      ["Sodium", "Na"],
      ["Potassium", "K"],
      ["Mercury", "Hg"],
      ["Oxygen", "O"],
    ],
  },
  {
    theme: "Authors & Works",
    pairs: [
      ["Shakespeare", "Hamlet"],
      ["Tolkien", "The Hobbit"],
      ["Orwell", "1984"],
      ["Twain", "Tom Sawyer"],
      ["Hemingway", "Old Man & Sea"],
      ["Dostoevsky", "Crime & Punish"],
      ["Brontë", "Jane Eyre"],
      ["Dickens", "Oliver Twist"],
      ["Austen", "Pride & Prej"],
      ["Hugo", "Les Misérables"],
    ],
  },
];

function generateSpojniceData() {
  const setData =
    SPOJNICE_SETS[Math.floor(Math.random() * SPOJNICE_SETS.length)];
  const left = setData.pairs.map((p) => p[0]);
  const right = [...setData.pairs.map((p) => p[1])];
  // shuffle right side
  for (let i = right.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [right[i], right[j]] = [right[j], right[i]];
  }
  return {
    theme: setData.theme,
    left,
    right,
    correctMap: Object.fromEntries(setData.pairs),
  };
}

// Ko zna zna questions
const QUIZ_BANK = [
  {
    q: "What is the largest planet in our solar system?",
    options: ["Mars", "Jupiter", "Saturn", "Neptune"],
    answer: 1,
  },
  {
    q: "In what year did World War II end?",
    options: ["1943", "1944", "1945", "1946"],
    answer: 2,
  },
  {
    q: "What is the chemical formula for water?",
    options: ["CO2", "H2O", "NaCl", "O2"],
    answer: 1,
  },
  {
    q: "Which country has the longest coastline?",
    options: ["Russia", "Australia", "Indonesia", "Canada"],
    answer: 3,
  },
  {
    q: "Who painted the Mona Lisa?",
    options: ["Michelangelo", "Da Vinci", "Raphael", "Donatello"],
    answer: 1,
  },
  {
    q: "What is the speed of light approximately?",
    options: ["300,000 m/s", "300,000 km/s", "150,000 km/s", "600,000 km/s"],
    answer: 1,
  },
  {
    q: "Which element has atomic number 1?",
    options: ["Helium", "Oxygen", "Hydrogen", "Carbon"],
    answer: 2,
  },
  {
    q: "What is the capital of Australia?",
    options: ["Sydney", "Melbourne", "Canberra", "Brisbane"],
    answer: 2,
  },
  {
    q: "How many chromosomes do humans have?",
    options: ["44", "46", "48", "42"],
    answer: 1,
  },
  {
    q: "Which planet is known as the Red Planet?",
    options: ["Venus", "Mars", "Jupiter", "Mercury"],
    answer: 1,
  },
  {
    q: "Who wrote 'Romeo and Juliet'?",
    options: ["Dickens", "Shakespeare", "Chaucer", "Milton"],
    answer: 1,
  },
  {
    q: "What is the tallest mountain in the world?",
    options: ["K2", "Kangchenjunga", "Everest", "Lhotse"],
    answer: 2,
  },
  {
    q: "Which ocean is the largest?",
    options: ["Atlantic", "Indian", "Arctic", "Pacific"],
    answer: 3,
  },
  {
    q: "What is 7 × 8?",
    options: ["54", "56", "58", "64"],
    answer: 1,
  },
  {
    q: "How many bones are in the adult human body?",
    options: ["196", "206", "216", "186"],
    answer: 1,
  },
  {
    q: "What is the currency of Japan?",
    options: ["Yuan", "Won", "Yen", "Ringgit"],
    answer: 2,
  },
  {
    q: "Who discovered penicillin?",
    options: ["Pasteur", "Fleming", "Koch", "Lister"],
    answer: 1,
  },
  {
    q: "What is the longest river in the world?",
    options: ["Amazon", "Nile", "Yangtze", "Mississippi"],
    answer: 1,
  },
  {
    q: "In which year did the Berlin Wall fall?",
    options: ["1987", "1988", "1989", "1990"],
    answer: 2,
  },
  {
    q: "What is the hardest natural substance?",
    options: ["Quartz", "Topaz", "Diamond", "Sapphire"],
    answer: 2,
  },
];

function pickQuizQuestions(count) {
  const shuffled = [...QUIZ_BANK].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// Asocijacije data
const ASOCIJACIJE_SETS = [
  {
    columns: [
      {
        label: "A",
        clues: ["Sahara", "Gobi", "Mojave", "Kalahari"],
        answer: "Desert",
      },
      {
        label: "B",
        clues: ["Pacific", "Atlantic", "Indian", "Arctic"],
        answer: "Ocean",
      },
      {
        label: "C",
        clues: ["Everest", "K2", "Kilimanjaro", "Denali"],
        answer: "Mountain",
      },
      {
        label: "D",
        clues: ["Amazon", "Nile", "Danube", "Thames"],
        answer: "River",
      },
    ],
    finalAnswer: "Geography",
  },
  {
    columns: [
      {
        label: "A",
        clues: ["Violin", "Cello", "Guitar", "Harp"],
        answer: "String",
      },
      {
        label: "B",
        clues: ["Trumpet", "Trombone", "Horn", "Tuba"],
        answer: "Brass",
      },
      {
        label: "C",
        clues: ["Drum", "Cymbal", "Triangle", "Maracas"],
        answer: "Percussion",
      },
      {
        label: "D",
        clues: ["Flute", "Clarinet", "Oboe", "Bassoon"],
        answer: "Woodwind",
      },
    ],
    finalAnswer: "Instruments",
  },
  {
    columns: [
      {
        label: "A",
        clues: ["Red", "Yellow", "Green", "Brake"],
        answer: "Traffic Light",
      },
      {
        label: "B",
        clues: ["Knight", "Bishop", "Rook", "Pawn"],
        answer: "Chess",
      },
      {
        label: "C",
        clues: ["Ace", "King", "Queen", "Jack"],
        answer: "Cards",
      },
      {
        label: "D",
        clues: ["Monopoly", "Ludo", "Risk", "Clue"],
        answer: "Board Game",
      },
    ],
    finalAnswer: "Games",
  },
];

function pickAsocijacije() {
  return ASOCIJACIJE_SETS[
    Math.floor(Math.random() * ASOCIJACIJE_SETS.length)
  ];
}

/* ══════════════════════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════════════════════ */

export function SlagalicaScreen({ route }) {
  const { lobbyId } = route.params;
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { user } = useAuth();

  const [lobby, setLobby] = useState(null);
  const matchSavedRef = useRef(false);
  const timerRef = useRef(null);

  // ── Firebase listener ──
  useEffect(() => {
    if (!lobbyId) return;
    const lobbyRef = ref(db, `gameLobbies/${lobbyId}`);
    const unsub = onValue(lobbyRef, (snap) => {
      setLobby(snap.val() || null);
    });
    return () => unsub();
  }, [lobbyId]);

  const gameState = lobby?.gameState;
  const myId = user?.id;
  const players = lobby?.players || {};
  const playerIds = Object.keys(players);
  const opponentId = playerIds.find((id) => id !== myId);
  const hostId = lobby?.hostId;
  const isHost = myId === hostId;
  const myName = players[myId]?.name || "You";
  const opponentName = players[opponentId]?.name || "Opponent";

  // ── Local UI state ──
  const [timer, setTimer] = useState(0);
  const [localInput, setLocalInput] = useState("");

  // Skočko local state
  const [skockoGuess, setSkockoGuess] = useState([]);

  // Spojnice local state
  const [selectedLeft, setSelectedLeft] = useState(null);

  // Ko zna zna local state
  const [buzzed, setBuzzed] = useState(false);

  // Asocijacije local state
  const [revealedClues, setRevealedClues] = useState({});
  const [asoGuessCol, setAsoGuessCol] = useState(null);

  // Animation
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // ── Initialize game (host only) ──
  useEffect(() => {
    if (!isHost || !lobbyId || !myId || !opponentId || gameState) return;

    const playerOrder = [myId, opponentId];
    const initState = {
      phase: "round_active",
      currentRound: 0,
      playerOrder,
      scores: { [myId]: 0, [opponentId]: 0 },
      currentTurn: myId,
      winnerId: null,
      updatedAt: Date.now(),
      rounds: {
        slagalica: {
          letters: generateLetters(),
          submissions: {},
          done: false,
        },
        moj_broj: {
          ...generateMojBrojData(),
          submissions: {},
          done: false,
        },
        skocko: {
          code: generateSkockoCode(),
          guesses: {},
          attempts: { [myId]: 0, [opponentId]: 0 },
          currentPlayer: myId,
          done: false,
        },
        spojnice: {
          ...generateSpojniceData(),
          matched: {},
          currentPlayer: myId,
          currentIndex: 0,
          scores: { [myId]: 0, [opponentId]: 0 },
          done: false,
        },
        ko_zna_zna: {
          questions: pickQuizQuestions(10),
          currentQ: 0,
          buzzedBy: null,
          scores: { [myId]: 0, [opponentId]: 0 },
          answered: {},
          done: false,
        },
        asocijacije: {
          ...pickAsocijacije(),
          revealed: {},
          guessedColumns: {},
          guessedFinal: null,
          currentPlayer: myId,
          scores: { [myId]: 0, [opponentId]: 0 },
          done: false,
        },
      },
    };

    set(ref(db, `gameLobbies/${lobbyId}/gameState`), initState);
  }, [isHost, lobbyId, myId, opponentId, gameState]);

  // ── Timer ──
  const currentRoundKey = ROUNDS[gameState?.currentRound || 0]?.key;
  const roundTime = ROUND_TIME[currentRoundKey] || 0;

  useEffect(() => {
    if (!gameState || gameState.phase !== "round_active" || roundTime <= 0)
      return;
    setTimer(roundTime);
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    timerRef.current = interval;
    return () => clearInterval(interval);
  }, [gameState?.currentRound, gameState?.phase, roundTime]);

  // Auto-submit when timer runs out (for timed rounds)
  useEffect(() => {
    if (timer !== 0 || !gameState || gameState.phase !== "round_active") return;
    if (roundTime <= 0) return;
    // auto-submit for simultaneous rounds
    if (
      currentRoundKey === "slagalica" ||
      currentRoundKey === "moj_broj" ||
      currentRoundKey === "spojnice" ||
      currentRoundKey === "asocijacije"
    ) {
      handleTimeUp();
    }
  }, [timer]);

  // ── Round transition animation ──
  useEffect(() => {
    if (!gameState) return;
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
    // Reset local state on round change
    setLocalInput("");
    setSkockoGuess([]);
    setSelectedLeft(null);
    setBuzzed(false);
    setRevealedClues({});
    setAsoGuessCol(null);
  }, [gameState?.currentRound]);

  // ── Match history ──
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
    if (gameState.winnerId !== myId) return;
    matchSavedRef.current = true;

    const scores = gameState.scores || {};
    const startedAt = lobby?.createdAt || Date.now();
    const endedAt = Date.now();

    const record = {
      lobbyId,
      gameId: lobby?.gameId || "3",
      gameTitle: lobby?.gameTitle || "Slagalica",
      winnerId: gameState.winnerId,
      loserId: opponentId,
      players: {
        [myId]: {
          name: myName,
          hits: scores[myId] || 0,
          misses: 0,
        },
        [opponentId]: {
          name: opponentName,
          hits: scores[opponentId] || 0,
          misses: 0,
        },
      },
      startedAt,
      endedAt,
      durationMs:
        endedAt - (typeof startedAt === "number" ? startedAt : endedAt),
    };

    const myHistRef = push(ref(db, `matchHistory/${myId}`));
    const oppHistRef = push(ref(db, `matchHistory/${opponentId}`));
    set(myHistRef, record);
    set(oppHistRef, record);
  }, [gameState?.phase, gameState?.winnerId, myId, opponentId, lobbyId]);

  /* ════════════════════════════════════════════════════════════
     Handlers
     ════════════════════════════════════════════════════════════ */

  const advanceRound = useCallback(async () => {
    if (!lobbyId || !gameState) return;
    const nextRound = (gameState.currentRound || 0) + 1;
    if (nextRound >= ROUNDS.length) {
      // Game over — determine winner
      const scores = gameState.scores || {};
      const s1 = scores[playerIds[0]] || 0;
      const s2 = scores[playerIds[1]] || 0;
      const winner = s1 > s2 ? playerIds[0] : s1 < s2 ? playerIds[1] : playerIds[0]; // tie goes to host
      await update(ref(db, `gameLobbies/${lobbyId}/gameState`), {
        phase: "finished",
        winnerId: winner,
        updatedAt: Date.now(),
      });
    } else {
      await update(ref(db, `gameLobbies/${lobbyId}/gameState`), {
        currentRound: nextRound,
        phase: "round_active",
        updatedAt: Date.now(),
      });
    }
  }, [lobbyId, gameState, playerIds]);

  const handleTimeUp = useCallback(async () => {
    if (!isHost) return;
    const roundData = gameState?.rounds?.[currentRoundKey];
    if (!roundData || roundData.done) return;

    await update(
      ref(db, `gameLobbies/${lobbyId}/gameState/rounds/${currentRoundKey}`),
      { done: true }
    );

    // Short delay then advance
    setTimeout(() => advanceRound(), 2000);
  }, [isHost, lobbyId, gameState, currentRoundKey, advanceRound]);

  // ── SLAGALICA ──
  const handleSlagalicaSubmit = useCallback(async () => {
    if (!myId || !lobbyId || !gameState) return;
    const roundData = gameState.rounds?.slagalica;
    if (!roundData || roundData.done) return;
    if (roundData.submissions?.[myId]) return;

    const word = localInput.trim().toUpperCase();
    if (!word) return;

    // Validate word uses only available letters
    const available = [...roundData.letters];
    let valid = true;
    for (const ch of word) {
      const idx = available.indexOf(ch);
      if (idx === -1) {
        valid = false;
        break;
      }
      available.splice(idx, 1);
    }

    const submission = valid ? word : "";
    const points = valid ? word.length : 0;

    await update(
      ref(
        db,
        `gameLobbies/${lobbyId}/gameState/rounds/slagalica/submissions/${myId}`
      ),
      { word: submission, points, submittedAt: Date.now() }
    );

    // Check if both submitted
    const snap = await get(
      ref(db, `gameLobbies/${lobbyId}/gameState/rounds/slagalica/submissions`)
    );
    const subs = snap.val() || {};
    if (Object.keys(subs).length >= 2 || (subs[myId] && timer <= 0)) {
      // Both done — calculate scores
      const updates = {};
      let p1Points = subs[playerIds[0]]?.points || 0;
      let p2Points = subs[playerIds[1]]?.points || 0;

      // Bonus for longest word
      if (p1Points > p2Points) p1Points += 5;
      else if (p2Points > p1Points) p2Points += 5;

      updates[`scores/${playerIds[0]}`] =
        (gameState.scores?.[playerIds[0]] || 0) + p1Points;
      updates[`scores/${playerIds[1]}`] =
        (gameState.scores?.[playerIds[1]] || 0) + p2Points;
      updates[`rounds/slagalica/done`] = true;
      updates["updatedAt"] = Date.now();

      await update(
        ref(db, `gameLobbies/${lobbyId}/gameState`),
        updates
      );

      if (isHost) setTimeout(() => advanceRound(), 1500);
    }

    setLocalInput("");
  }, [myId, lobbyId, gameState, localInput, timer, playerIds, isHost, advanceRound]);

  // ── MOJ BROJ ──
  const handleMojBrojSubmit = useCallback(async () => {
    if (!myId || !lobbyId || !gameState) return;
    const roundData = gameState.rounds?.moj_broj;
    if (!roundData || roundData.done) return;
    if (roundData.submissions?.[myId]) return;

    const parsed = evaluateExpression(localInput);
    if (parsed === null) return;

    const diff = Math.abs(roundData.target - parsed);
    let points = 0;
    if (diff === 0) points = 20;
    else if (diff <= 5) points = 15;
    else if (diff <= 10) points = 10;
    else if (diff <= 25) points = 5;

    await update(
      ref(
        db,
        `gameLobbies/${lobbyId}/gameState/rounds/moj_broj/submissions/${myId}`
      ),
      { result: parsed, diff, points, submittedAt: Date.now() }
    );

    const snap = await get(
      ref(db, `gameLobbies/${lobbyId}/gameState/rounds/moj_broj/submissions`)
    );
    const subs = snap.val() || {};
    if (Object.keys(subs).length >= 2 || timer <= 0) {
      const updates = {};
      const p1Pts = subs[playerIds[0]]?.points || 0;
      const p2Pts = subs[playerIds[1]]?.points || 0;
      updates[`scores/${playerIds[0]}`] =
        (gameState.scores?.[playerIds[0]] || 0) + p1Pts;
      updates[`scores/${playerIds[1]}`] =
        (gameState.scores?.[playerIds[1]] || 0) + p2Pts;
      updates[`rounds/moj_broj/done`] = true;
      updates["updatedAt"] = Date.now();

      await update(
        ref(db, `gameLobbies/${lobbyId}/gameState`),
        updates
      );

      if (isHost) setTimeout(() => advanceRound(), 1500);
    }

    setLocalInput("");
  }, [myId, lobbyId, gameState, localInput, timer, playerIds, isHost, advanceRound]);

  // ── SKOČKO ──
  const handleSkockoGuess = useCallback(async () => {
    if (!myId || !lobbyId || !gameState) return;
    const roundData = gameState.rounds?.skocko;
    if (!roundData || roundData.done) return;
    if (roundData.currentPlayer !== myId) return;
    if (skockoGuess.length !== 4) return;

    const result = checkSkockoGuess(skockoGuess, roundData.code);
    const myAttempts = (roundData.attempts?.[myId] || 0) + 1;

    const guessKey = `${myId}_${myAttempts}`;
    const updates = {};
    updates[`rounds/skocko/guesses/${guessKey}`] = {
      player: myId,
      guess: skockoGuess,
      exact: result.exact,
      partial: result.partial,
      attempt: myAttempts,
    };
    updates[`rounds/skocko/attempts/${myId}`] = myAttempts;

    if (result.exact === 4) {
      // Solved!
      const points = Math.max(1, 7 - myAttempts) * 3;
      updates[`scores/${myId}`] = (gameState.scores?.[myId] || 0) + points;
      updates[`rounds/skocko/done`] = true;
      updates["updatedAt"] = Date.now();
      await update(ref(db, `gameLobbies/${lobbyId}/gameState`), updates);
      if (isHost) setTimeout(() => advanceRound(), 2500);
    } else if (myAttempts >= 6) {
      // Switch to other player or end
      const otherAttempts = roundData.attempts?.[opponentId] || 0;
      if (otherAttempts >= 6 || roundData.currentPlayer === opponentId) {
        // Both exhausted
        updates[`rounds/skocko/done`] = true;
        updates["updatedAt"] = Date.now();
        await update(
          ref(db, `gameLobbies/${lobbyId}/gameState`),
          updates
        );
        if (isHost) setTimeout(() => advanceRound(), 2500);
      } else {
        updates[`rounds/skocko/currentPlayer`] = opponentId;
        updates["updatedAt"] = Date.now();
        await update(
          ref(db, `gameLobbies/${lobbyId}/gameState`),
          updates
        );
      }
    } else {
      updates["updatedAt"] = Date.now();
      await update(
        ref(db, `gameLobbies/${lobbyId}/gameState`),
        updates
      );
    }

    setSkockoGuess([]);
  }, [myId, opponentId, lobbyId, gameState, skockoGuess, isHost, advanceRound]);

  // ── SPOJNICE ──
  const handleSpojniceMatch = useCallback(
    async (rightItem) => {
      if (!myId || !lobbyId || !gameState) return;
      const roundData = gameState.rounds?.spojnice;
      if (!roundData || roundData.done) return;
      if (roundData.currentPlayer !== myId) return;
      if (selectedLeft === null) return;

      const leftItem = roundData.left[selectedLeft];
      const correct = roundData.correctMap[leftItem] === rightItem;
      const points = correct ? 2 : 0;

      const updates = {};

      if (correct) {
        // Store only correct matches permanently
        updates[`rounds/spojnice/matched/${selectedLeft}`] = {
          left: leftItem,
          right: rightItem,
          correct: true,
          player: myId,
        };
        updates[`rounds/spojnice/scores/${myId}`] =
          (roundData.scores?.[myId] || 0) + points;
        updates[`scores/${myId}`] =
          (gameState.scores?.[myId] || 0) + points;

        const correctCount = Object.values(roundData.matched || {}).filter((m) => m.correct).length + 1;
        if (correctCount >= 10) {
          updates[`rounds/spojnice/done`] = true;
          updates["updatedAt"] = Date.now();
          await update(ref(db, `gameLobbies/${lobbyId}/gameState`), updates);
          if (isHost) setTimeout(() => advanceRound(), 1500);
          setSelectedLeft(null);
          return;
        }
      } else {
        // Wrong — switch to other player, don't store in matched
        if (roundData.currentPlayer === myId && opponentId) {
          updates[`rounds/spojnice/currentPlayer`] = opponentId;
        } else {
          updates[`rounds/spojnice/done`] = true;
          if (isHost) setTimeout(() => advanceRound(), 1500);
        }
      }

      updates["updatedAt"] = Date.now();

      await update(
        ref(db, `gameLobbies/${lobbyId}/gameState`),
        updates
      );
      setSelectedLeft(null);
    },
    [myId, opponentId, lobbyId, gameState, selectedLeft, isHost, advanceRound]
  );

  // ── KO ZNA ZNA ──
  const handleBuzz = useCallback(async () => {
    if (!myId || !lobbyId || !gameState) return;
    const roundData = gameState.rounds?.ko_zna_zna;
    if (!roundData || roundData.done) return;
    if (roundData.buzzedBy) return;

    await update(
      ref(db, `gameLobbies/${lobbyId}/gameState/rounds/ko_zna_zna`),
      { buzzedBy: myId }
    );
    setBuzzed(true);
  }, [myId, lobbyId, gameState]);

  const handleQuizAnswer = useCallback(
    async (answerIdx) => {
      if (!myId || !lobbyId || !gameState) return;
      const roundData = gameState.rounds?.ko_zna_zna;
      if (!roundData || roundData.done) return;
      if (roundData.buzzedBy !== myId) return;

      const currentQ = roundData.currentQ || 0;
      const question = roundData.questions?.[currentQ];
      if (!question) return;

      const correct = answerIdx === question.answer;
      const points = correct ? 10 : -5;

      const updates = {};
      updates[`rounds/ko_zna_zna/scores/${myId}`] =
        (roundData.scores?.[myId] || 0) + points;
      updates[`scores/${myId}`] =
        (gameState.scores?.[myId] || 0) + points;
      updates[`rounds/ko_zna_zna/answered/${currentQ}`] = {
        player: myId,
        correct,
        answer: answerIdx,
      };

      const nextQ = currentQ + 1;
      if (nextQ >= (roundData.questions?.length || 10)) {
        updates[`rounds/ko_zna_zna/done`] = true;
        updates["updatedAt"] = Date.now();
        await update(
          ref(db, `gameLobbies/${lobbyId}/gameState`),
          updates
        );
        if (isHost) setTimeout(() => advanceRound(), 2500);
      } else {
        updates[`rounds/ko_zna_zna/currentQ`] = nextQ;
        updates[`rounds/ko_zna_zna/buzzedBy`] = null;
        updates["updatedAt"] = Date.now();
        await update(
          ref(db, `gameLobbies/${lobbyId}/gameState`),
          updates
        );
      }

      setBuzzed(false);
    },
    [myId, lobbyId, gameState, isHost, advanceRound]
  );

  // ── ASOCIJACIJE ──
  const handleRevealClue = useCallback(
    async (colIdx, clueIdx) => {
      if (!myId || !lobbyId || !gameState) return;
      const roundData = gameState.rounds?.asocijacije;
      if (!roundData || roundData.done) return;
      if (roundData.currentPlayer !== myId) return;

      const key = `${colIdx}_${clueIdx}`;
      if (roundData.revealed?.[key]) return;

      await update(
        ref(db, `gameLobbies/${lobbyId}/gameState/rounds/asocijacije/revealed`),
        { [key]: true }
      );
    },
    [myId, lobbyId, gameState]
  );

  const handleAsoColumnGuess = useCallback(
    async (colIdx, guess) => {
      if (!myId || !lobbyId || !gameState) return;
      const roundData = gameState.rounds?.asocijacije;
      if (!roundData || roundData.done) return;
      if (roundData.currentPlayer !== myId) return;
      // Allow re-guessing if previous guess was wrong
      if (roundData.guessedColumns?.[colIdx]?.correct) return;

      const column = roundData.columns?.[colIdx];
      if (!column) return;

      const correct =
        guess.trim().toLowerCase() === column.answer.toLowerCase();
      const points = correct ? 5 : 0;

      const updates = {};
      updates[`rounds/asocijacije/guessedColumns/${colIdx}`] = {
        player: myId,
        guess,
        correct,
      };

      if (correct) {
        updates[`rounds/asocijacije/scores/${myId}`] =
          (roundData.scores?.[myId] || 0) + points;
        updates[`scores/${myId}`] =
          (gameState.scores?.[myId] || 0) + points;
      } else {
        // Switch turn
        updates[`rounds/asocijacije/currentPlayer`] =
          roundData.currentPlayer === myId ? opponentId : myId;
      }

      updates["updatedAt"] = Date.now();
      await update(
        ref(db, `gameLobbies/${lobbyId}/gameState`),
        updates
      );
      setAsoGuessCol(null);
      setLocalInput("");
    },
    [myId, opponentId, lobbyId, gameState]
  );

  const handleAsoFinalGuess = useCallback(
    async (guess) => {
      if (!myId || !lobbyId || !gameState) return;
      const roundData = gameState.rounds?.asocijacije;
      if (!roundData || roundData.done) return;
      if (roundData.currentPlayer !== myId) return;

      const correct =
        guess.trim().toLowerCase() === roundData.finalAnswer.toLowerCase();
      const points = correct ? 10 : 0;

      const updates = {};

      if (correct) {
        updates[`rounds/asocijacije/guessedFinal`] = {
          player: myId,
          guess,
          correct: true,
        };
        updates[`rounds/asocijacije/scores/${myId}`] =
          (roundData.scores?.[myId] || 0) + points;
        updates[`scores/${myId}`] =
          (gameState.scores?.[myId] || 0) + points;
        updates[`rounds/asocijacije/done`] = true;
        updates["updatedAt"] = Date.now();
        await update(
          ref(db, `gameLobbies/${lobbyId}/gameState`),
          updates
        );
        if (isHost) setTimeout(() => advanceRound(), 1500);
      } else {
        // Wrong final guess — switch turn, don't end round
        updates[`rounds/asocijacije/lastFinalGuess`] = {
          player: myId,
          guess,
        };
        updates[`rounds/asocijacije/currentPlayer`] =
          roundData.currentPlayer === myId ? opponentId : myId;
        updates["updatedAt"] = Date.now();
        await update(
          ref(db, `gameLobbies/${lobbyId}/gameState`),
          updates
        );
      }

      setLocalInput("");
    },
    [myId, opponentId, lobbyId, gameState, isHost, advanceRound]
  );

  // ── Navigation ──
  const handleQuit = useCallback(async () => {
    if (!lobbyId || !myId) return;
    Alert.alert("Quit Game", "Are you sure you want to quit?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Quit",
        style: "destructive",
        onPress: async () => {
          await update(ref(db, `gameLobbies/${lobbyId}/gameState`), {
            phase: "finished",
            winnerId: opponentId,
            updatedAt: Date.now(),
          });
        },
      },
    ]);
  }, [lobbyId, myId, opponentId]);

  const handleBackToLobby = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.popToTop();
    } else {
      navigation.replace("Tabs");
    }
  }, [navigation]);

  /* ════════════════════════════════════════════════════════════
     Auto-advance when round is done (for non-host)
     ════════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (!isHost || !gameState || gameState.phase !== "round_active") return;
    const rk = ROUNDS[gameState.currentRound]?.key;
    if (!rk) return;
    const rd = gameState.rounds?.[rk];
    if (rd?.done && gameState.phase === "round_active") {
      const t = setTimeout(() => advanceRound(), 1500);
      return () => clearTimeout(t);
    }
  }, [
    isHost,
    gameState?.phase,
    gameState?.currentRound,
    gameState?.rounds,
    advanceRound,
  ]);

  /* ════════════════════════════════════════════════════════════
     Auto-finalize simultaneous rounds when both players submit
     (catches race conditions where the handler's get() didn't
      see both submissions yet)
     ════════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (!isHost || !gameState || gameState.phase !== "round_active") return;
    const rk = ROUNDS[gameState.currentRound]?.key;
    if (rk !== "slagalica" && rk !== "moj_broj") return;
    const rd = gameState.rounds?.[rk];
    if (!rd || rd.done) return;
    const subs = rd.submissions || {};
    if (Object.keys(subs).length < 2) return;

    // Both submitted but round not yet marked done — finalize now
    const updates = {};
    if (rk === "slagalica") {
      let p1Pts = subs[playerIds[0]]?.points || 0;
      let p2Pts = subs[playerIds[1]]?.points || 0;
      if (p1Pts > p2Pts) p1Pts += 5;
      else if (p2Pts > p1Pts) p2Pts += 5;
      updates[`scores/${playerIds[0]}`] = (gameState.scores?.[playerIds[0]] || 0) + p1Pts;
      updates[`scores/${playerIds[1]}`] = (gameState.scores?.[playerIds[1]] || 0) + p2Pts;
    } else {
      updates[`scores/${playerIds[0]}`] = (gameState.scores?.[playerIds[0]] || 0) + (subs[playerIds[0]]?.points || 0);
      updates[`scores/${playerIds[1]}`] = (gameState.scores?.[playerIds[1]] || 0) + (subs[playerIds[1]]?.points || 0);
    }
    updates[`rounds/${rk}/done`] = true;
    updates["updatedAt"] = Date.now();
    update(ref(db, `gameLobbies/${lobbyId}/gameState`), updates);
  }, [
    isHost,
    gameState?.phase,
    gameState?.currentRound,
    gameState?.rounds,
    playerIds,
    lobbyId,
  ]);

  /* ════════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════════ */

  if (!lobby || !gameState) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.centered}>
          <Icon name="clock" size={36} color="#7C3AED" />
          <Text style={styles.loadingText}>Preparing the show...</Text>
        </View>
      </View>
    );
  }

  const currentRound = gameState.currentRound || 0;
  const roundInfo = ROUNDS[currentRound];
  const scores = gameState.scores || {};
  const myScore = scores[myId] || 0;
  const oppScore = scores[opponentId] || 0;

  const isFinished = gameState.phase === "finished";
  const isWinner = isFinished ? gameState.winnerId === myId : false;

  // ── Active round rendering ──
  const roundData = gameState.rounds?.[roundInfo?.key];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── Result Modal Popup ── */}
      <Modal
        visible={isFinished}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View
              style={[
                styles.resultBanner,
                { backgroundColor: isWinner ? "#10B981" : "#7C3AED" },
              ]}
            >
              <Icon
                name={isWinner ? "trophy" : "close"}
                size={32}
                color="#FFFFFF"
              />
              <Text style={styles.resultTitle}>
                {isWinner ? "VICTORY!" : "DEFEAT"}
              </Text>
            </View>

            <View style={styles.finalScoreCard}>
              <Text style={styles.finalScoreLabel}>Final Score</Text>
              <View style={styles.finalScoreRow}>
                <View style={styles.finalPlayerCol}>
                  <Text style={styles.finalPlayerName} numberOfLines={1}>
                    {myName}
                  </Text>
                  <Text
                    style={[
                      styles.finalPlayerScore,
                      isWinner && { color: "#10B981" },
                    ]}
                  >
                    {myScore}
                  </Text>
                </View>
                <Text style={styles.finalVs}>vs</Text>
                <View style={styles.finalPlayerCol}>
                  <Text style={styles.finalPlayerName} numberOfLines={1}>
                    {opponentName}
                  </Text>
                  <Text
                    style={[
                      styles.finalPlayerScore,
                      !isWinner && { color: "#10B981" },
                    ]}
                  >
                    {oppScore}
                  </Text>
                </View>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && { opacity: 0.85 },
              ]}
              onPress={handleBackToLobby}
            >
              <Text style={styles.primaryBtnText}>Back to Lobby</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Pressable onPress={handleQuit} style={styles.quitBtn}>
          <Icon name="close" size={16} color="#A78BFA" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerShowTitle}>SLAGALICA</Text>
          <View style={styles.headerRoundBadge}>
            <Text style={styles.headerRound}>
              Round {currentRound + 1}/6
            </Text>
          </View>
        </View>
        <View style={{ width: 38 }} />
      </View>

      {/* ── Round name bar ── */}
      <View style={styles.roundNameBar}>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {roundInfo?.label}
        </Text>
      </View>

      {/* ── Scoreboard ── */}
      <View style={styles.scoreBoard}>
        <View style={styles.scorePlayer}>
          <Text style={styles.scorePlayerName} numberOfLines={1}>
            {myName}
          </Text>
          <Text style={styles.scoreValue}>{myScore}</Text>
        </View>

        <View style={styles.centerColumn}>
          {roundTime > 0 && (
            <View style={[styles.timerWrap, timer <= 10 && styles.timerWrapUrgent]}>
              <Text
                style={[
                  styles.timerText,
                  timer <= 10 && styles.timerTextUrgent,
                ]}
              >
                {timer}
              </Text>
            </View>
          )}
          <View style={styles.vsBadge}>
            <Text style={styles.vsText}>VS</Text>
          </View>
        </View>

        <View style={styles.scorePlayer}>
          <Text style={styles.scorePlayerName} numberOfLines={1}>
            {opponentName}
          </Text>
          <Text style={styles.scoreValue}>{oppScore}</Text>
        </View>
      </View>

      {/* ── Round progress dots ── */}
      <View style={styles.roundDots}>
        {ROUNDS.map((r, i) => (
          <View
            key={r.key}
            style={[
              styles.roundDot,
              i === currentRound && styles.roundDotActive,
              i < currentRound && styles.roundDotDone,
            ]}
          />
        ))}
      </View>

      {/* ── Game area ── */}
      <Animated.View
        style={[
          styles.gameArea,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <ScrollView
          contentContainerStyle={styles.gameContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {roundInfo?.key === "slagalica" && (
            <SlagalicaRound
              data={roundData}
              myId={myId}
              input={localInput}
              setInput={setLocalInput}
              onSubmit={handleSlagalicaSubmit}
              players={players}
              opponentId={opponentId}
            />
          )}
          {roundInfo?.key === "moj_broj" && (
            <MojBrojRound
              data={roundData}
              myId={myId}
              input={localInput}
              setInput={setLocalInput}
              onSubmit={handleMojBrojSubmit}
              players={players}
              opponentId={opponentId}
            />
          )}
          {roundInfo?.key === "skocko" && (
            <SkockoRound
              data={roundData}
              myId={myId}
              guess={skockoGuess}
              setGuess={setSkockoGuess}
              onSubmit={handleSkockoGuess}
              opponentId={opponentId}
              players={players}
            />
          )}
          {roundInfo?.key === "spojnice" && (
            <SpojniceRound
              data={roundData}
              myId={myId}
              selectedLeft={selectedLeft}
              setSelectedLeft={setSelectedLeft}
              onMatch={handleSpojniceMatch}
              opponentId={opponentId}
              players={players}
            />
          )}
          {roundInfo?.key === "ko_zna_zna" && (
            <KoZnaZnaRound
              data={roundData}
              myId={myId}
              onBuzz={handleBuzz}
              onAnswer={handleQuizAnswer}
              opponentId={opponentId}
              players={players}
            />
          )}
          {roundInfo?.key === "asocijacije" && (
            <AsocijacijeRound
              data={roundData}
              myId={myId}
              onRevealClue={handleRevealClue}
              onColumnGuess={handleAsoColumnGuess}
              onFinalGuess={handleAsoFinalGuess}
              asoGuessCol={asoGuessCol}
              setAsoGuessCol={setAsoGuessCol}
              input={localInput}
              setInput={setLocalInput}
              width={width}
              opponentId={opponentId}
              players={players}
            />
          )}

          {roundData?.done && (
            <View style={styles.doneOverlay}>
              <Icon name="check" size={28} color="#10B981" />
              <Text style={styles.doneText}>Round Complete!</Text>
              <Text style={styles.doneSubtext}>
                Next round starting...
              </Text>
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

/* ══════════════════════════════════════════════════════════════
   ROUND COMPONENTS
   ══════════════════════════════════════════════════════════════ */

function SlagalicaRound({ data, myId, input, setInput, onSubmit, players, opponentId }) {
  if (!data) return null;
  const letters = data.letters || [];
  const mySubmission = data.submissions?.[myId];
  const oppSubmission = data.submissions?.[opponentId];

  return (
    <View style={rs.container}>
      <Text style={rs.roundDesc}>
        Form the longest word from these 12 letters
      </Text>
      <View style={rs.letterGrid}>
        {letters.map((letter, i) => (
          <Pressable
            key={i}
            style={rs.letterTile}
            onPress={() => setInput((prev) => prev + letter)}
          >
            <Text style={rs.letterText}>{letter}</Text>
          </Pressable>
        ))}
      </View>

      {!mySubmission ? (
        <>
          <View style={rs.inputRow}>
            <TextInput
              style={rs.input}
              value={input}
              onChangeText={setInput}
              placeholder="Type your word..."
              placeholderTextColor="#6D5B9E"
              autoCapitalize="characters"
              maxLength={12}
            />
            {input.length > 0 && (
              <Pressable onPress={() => setInput("")} style={rs.clearBtn}>
                <Icon name="close" size={14} color="#A78BFA" />
              </Pressable>
            )}
          </View>
          <Text style={rs.charCount}>{input.length} letters</Text>
          <Pressable
            style={({ pressed }) => [
              rs.submitBtn,
              !input.trim() && rs.submitBtnDisabled,
              pressed && { opacity: 0.85 },
            ]}
            onPress={onSubmit}
            disabled={!input.trim()}
          >
            <Text style={rs.submitBtnText}>Submit Word</Text>
          </Pressable>
        </>
      ) : (
        <View style={rs.submittedWrap}>
          <Icon name="check" size={18} color="#10B981" />
          <Text style={rs.submittedText}>
            Submitted: {mySubmission.word} ({mySubmission.points} pts)
          </Text>
          {oppSubmission ? (
            <Text style={rs.oppText}>
              {players[opponentId]?.name}: {oppSubmission.word} ({oppSubmission.points} pts)
            </Text>
          ) : (
            <Text style={rs.waitingText}>Waiting for opponent...</Text>
          )}
        </View>
      )}
    </View>
  );
}

function MojBrojRound({ data, myId, input, setInput, onSubmit, players, opponentId }) {
  if (!data) return null;
  const mySubmission = data.submissions?.[myId];
  const oppSubmission = data.submissions?.[opponentId];
  const numbers = data.numbers || [];

  // Track which source numbers have been used (by index)
  const [usedNumbers, setUsedNumbers] = useState([]);

  // Reset used numbers when round changes
  useEffect(() => {
    setUsedNumbers([]);
  }, [data.target]);

  const computedResult = useMemo(() => {
    if (!input.trim()) return null;
    return evaluateExpression(input);
  }, [input]);

  const handleNumberTap = (num, idx) => {
    if (usedNumbers.includes(idx)) return;
    setInput((prev) => prev + String(num));
    setUsedNumbers((prev) => [...prev, idx]);
  };

  const handleOpTap = (op) => {
    if (!input) return;
    const last = input[input.length - 1];
    // Don't allow consecutive operators
    if (["+", "-", "×", "÷", "("].includes(last)) return;
    setInput((prev) => prev + " " + op + " ");
  };

  const handleParenTap = (paren) => {
    if (paren === "(") {
      setInput((prev) => prev + "(");
    } else {
      setInput((prev) => prev + ")");
    }
  };

  const handleBackspace = () => {
    setInput((prev) => {
      if (!prev) return prev;
      // Check if we're deleting a number (might be multi-digit)
      const trimmed = prev.trimEnd();
      // If last chars are " op ", remove the operator + spaces
      const opMatch = trimmed.match(/(.*?)\s[+\-×÷]\s?$/);
      if (opMatch) {
        return opMatch[1];
      }
      // If last char is a paren, just remove it
      if (trimmed.endsWith("(") || trimmed.endsWith(")")) {
        return trimmed.slice(0, -1);
      }
      // Otherwise remove the last number token and free its used index
      const numMatch = trimmed.match(/(.*?)(\d+)$/);
      if (numMatch) {
        const removedNum = parseInt(numMatch[2], 10);
        // Find and free the last used index for this number
        setUsedNumbers((prevUsed) => {
          const idx = [...prevUsed].reverse().find((i) => numbers[i] === removedNum);
          if (idx !== undefined) return prevUsed.filter((_, j) => j !== prevUsed.lastIndexOf(idx));
          return prevUsed;
        });
        return numMatch[1];
      }
      return trimmed.slice(0, -1);
    });
  };

  const handleClear = () => {
    setInput("");
    setUsedNumbers([]);
  };

  return (
    <View style={rs.container}>
      <View style={rs.targetWrap}>
        <Text style={rs.targetLabel}>TARGET</Text>
        <Text style={rs.targetNumber}>{data.target}</Text>
      </View>

      {!mySubmission ? (
        <>
          {/* Source numbers */}
          <View style={rs.numberRow}>
            {numbers.map((n, i) => {
              const used = usedNumbers.includes(i);
              return (
                <Pressable
                  key={i}
                  style={[rs.numberTile, used && rs.numberTileUsed]}
                  onPress={() => handleNumberTap(n, i)}
                  disabled={used}
                >
                  <Text style={[rs.numberText, used && rs.numberTextUsed]}>{n}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Expression display */}
          <View style={rs.exprDisplayWrap}>
            <View style={rs.exprDisplay}>
              <Text style={rs.exprText} numberOfLines={2}>
                {input || "Tap numbers and operations..."}
              </Text>
              {input.length > 0 && computedResult !== null && (
                <Text style={rs.exprResult}>= {computedResult}</Text>
              )}
              {input.length > 0 && computedResult === null && (
                <Text style={[rs.exprResult, { color: "#6D5B9E" }]}>= ?</Text>
              )}
            </View>
          </View>

          {/* Operation buttons */}
          <View style={rs.opsRow}>
            {["+", "-", "×", "÷"].map((op) => (
              <Pressable
                key={op}
                style={({ pressed }) => [rs.opBtn, pressed && { opacity: 0.7 }]}
                onPress={() => handleOpTap(op)}
              >
                <Text style={rs.opBtnText}>{op}</Text>
              </Pressable>
            ))}
            <Pressable
              style={({ pressed }) => [rs.opBtn, rs.opBtnAlt, pressed && { opacity: 0.7 }]}
              onPress={() => handleParenTap("(")}
            >
              <Text style={rs.opBtnAltText}>(</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [rs.opBtn, rs.opBtnAlt, pressed && { opacity: 0.7 }]}
              onPress={() => handleParenTap(")")}
            >
              <Text style={rs.opBtnAltText}>)</Text>
            </Pressable>
          </View>

          {/* Action buttons */}
          <View style={rs.calcActions}>
            <Pressable
              style={({ pressed }) => [rs.calcActionBtn, pressed && { opacity: 0.7 }]}
              onPress={handleBackspace}
              disabled={!input}
            >
              <Icon name="back" size={18} color={!input ? "#2D1B69" : "#C4B5FD"} />
            </Pressable>
            <Pressable
              style={({ pressed }) => [rs.calcActionBtn, rs.calcClearBtn, pressed && { opacity: 0.7 }]}
              onPress={handleClear}
              disabled={!input}
            >
              <Text style={[rs.calcClearText, !input && { color: "#2D1B69" }]}>C</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                rs.submitBtn,
                { flex: 1 },
                computedResult === null && rs.submitBtnDisabled,
                pressed && { opacity: 0.85 },
              ]}
              onPress={onSubmit}
              disabled={computedResult === null}
            >
              <Text style={rs.submitBtnText}>Submit = {computedResult ?? "?"}</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <View style={rs.submittedWrap}>
          <Icon name="check" size={18} color="#10B981" />
          <Text style={rs.submittedText}>
            Submitted: {mySubmission.result} (off by {mySubmission.diff}, {mySubmission.points} pts)
          </Text>
          {oppSubmission ? (
            <Text style={rs.oppText}>
              {players[opponentId]?.name}: {oppSubmission.result} (off by {oppSubmission.diff}, {oppSubmission.points} pts)
            </Text>
          ) : (
            <Text style={rs.waitingText}>Waiting for opponent...</Text>
          )}
        </View>
      )}
    </View>
  );
}

function SkockoRound({ data, myId, guess, setGuess, onSubmit, opponentId, players }) {
  if (!data) return null;
  const isMyTurn = data.currentPlayer === myId;
  const guesses = data.guesses || {};
  const myGuesses = Object.values(guesses).filter((g) => g.player === myId);
  const oppGuesses = Object.values(guesses).filter((g) => g.player !== myId);
  const opponentName = players?.[opponentId]?.name || "Opponent";

  const renderGuessRows = (rows) =>
    rows.map((g, i) => (
      <View key={i} style={rs.skockoRow}>
        <View style={rs.skockoGuessSymbols}>
          {g.guess.map((s, j) => (
            <View key={j} style={[rs.skockoSymbol, { backgroundColor: SKOCKO_COLORS[s] + "20" }]}>
              <Text style={[rs.skockoSymbolText, { color: SKOCKO_COLORS[s] }]}>{s}</Text>
            </View>
          ))}
        </View>
        <View style={rs.skockoFeedback}>
          {Array.from({ length: g.exact }).map((_, k) => (
            <View key={`e${k}`} style={[rs.feedbackDot, { backgroundColor: "#10B981" }]} />
          ))}
          {Array.from({ length: g.partial }).map((_, k) => (
            <View key={`p${k}`} style={[rs.feedbackDot, { backgroundColor: "#F59E0B" }]} />
          ))}
        </View>
      </View>
    ));

  return (
    <View style={rs.container}>
      <Text style={rs.roundDesc}>
        Guess the 4-symbol combination. You have 6 attempts.
      </Text>

      {/* My guesses */}
      {myGuesses.length > 0 && (
        <>
          {(oppGuesses.length > 0 || !isMyTurn) && (
            <Text style={rs.sectionLabel}>Your guesses</Text>
          )}
          {renderGuessRows(myGuesses)}
        </>
      )}

      {/* Current guess input */}
      {isMyTurn && !data.done && (
        <>
          <View style={rs.skockoCurrentGuess}>
            {[0, 1, 2, 3].map((i) => (
              <Pressable
                key={i}
                style={[rs.skockoSlot, guess[i] && { backgroundColor: SKOCKO_COLORS[guess[i]] + "20" }]}
                onPress={() => {
                  if (guess[i]) {
                    setGuess((prev) => prev.filter((_, idx) => idx !== i));
                  }
                }}
              >
                <Text style={rs.skockoSlotText}>{guess[i] || "?"}</Text>
              </Pressable>
            ))}
          </View>

          <View style={rs.skockoPicker}>
            {SKOCKO_SYMBOLS.map((s) => (
              <Pressable
                key={s}
                style={[rs.skockoPickerItem, { backgroundColor: SKOCKO_COLORS[s] + "15" }]}
                onPress={() => {
                  if (guess.length < 4) {
                    setGuess((prev) => [...prev, s]);
                  }
                }}
              >
                <Text style={[rs.skockoPickerText, { color: SKOCKO_COLORS[s] }]}>{s}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            style={({ pressed }) => [
              rs.submitBtn,
              guess.length < 4 && rs.submitBtnDisabled,
              pressed && { opacity: 0.85 },
            ]}
            onPress={onSubmit}
            disabled={guess.length < 4}
          >
            <Text style={rs.submitBtnText}>Submit Guess</Text>
          </Pressable>
        </>
      )}

      {/* Opponent's guesses — live spectator view */}
      {oppGuesses.length > 0 && (
        <>
          <Text style={rs.sectionLabel}>{opponentName}'s guesses</Text>
          {renderGuessRows(oppGuesses)}
        </>
      )}

      {!isMyTurn && !data.done && (
        <View style={rs.watchingBanner}>
          <Icon name="play" size={14} color="#A78BFA" />
          <Text style={rs.watchingText}>{opponentName} is playing...</Text>
        </View>
      )}
    </View>
  );
}

function SpojniceRound({ data, myId, selectedLeft, setSelectedLeft, onMatch, opponentId, players }) {
  if (!data) return null;
  const isMyTurn = data.currentPlayer === myId;
  const matched = data.matched || {};
  const opponentName = players?.[opponentId]?.name || "Opponent";

  // Only correctly matched items are locked
  const correctMatches = Object.entries(matched).filter(([, m]) => m.correct);
  const matchedLeftIndices = new Set(correctMatches.map(([k]) => Number(k)));
  const matchedRightItems = new Set(correctMatches.map(([, m]) => m.right));

  return (
    <View style={rs.container}>
      <Text style={rs.roundDesc}>
        {data.theme} — Match items from left to right
      </Text>

      <View style={rs.spojniceWrap}>
        {/* Left column */}
        <View style={rs.spojniceCol}>
          {(data.left || []).map((item, i) => {
            const isMatched = matchedLeftIndices.has(i);
            return (
              <Pressable
                key={i}
                style={[
                  rs.spojniceItem,
                  selectedLeft === i && rs.spojniceItemSelected,
                  isMatched && {
                    backgroundColor: "rgba(16,185,129,0.12)",
                    borderColor: "#10B981",
                  },
                ]}
                onPress={() => {
                  if (!isMatched && isMyTurn && !data.done) setSelectedLeft(i);
                }}
                disabled={isMatched || !isMyTurn || data.done}
              >
                <Text
                  style={[
                    rs.spojniceItemText,
                    isMatched && { color: "#059669" },
                  ]}
                  numberOfLines={1}
                >
                  {item}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Right column */}
        <View style={rs.spojniceCol}>
          {(data.right || []).map((item, i) => {
            const isMatched = matchedRightItems.has(item);
            return (
              <Pressable
                key={i}
                style={[
                  rs.spojniceItem,
                  isMatched && { opacity: 0.4, backgroundColor: "rgba(16,185,129,0.12)", borderColor: "#10B981" },
                ]}
                onPress={() => {
                  if (!isMatched && selectedLeft !== null && isMyTurn && !data.done) {
                    onMatch(item);
                  }
                }}
                disabled={isMatched || selectedLeft === null || !isMyTurn || data.done}
              >
                <Text style={[rs.spojniceItemText, isMatched && { color: "#059669" }]} numberOfLines={1}>
                  {item}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {!isMyTurn && !data.done && (
        <View style={rs.watchingBanner}>
          <Icon name="play" size={14} color="#A78BFA" />
          <Text style={rs.watchingText}>{opponentName} is matching...</Text>
        </View>
      )}
    </View>
  );
}

function KoZnaZnaRound({ data, myId, onBuzz, onAnswer, opponentId, players }) {
  if (!data) return null;
  const currentQ = data.currentQ || 0;
  const question = data.questions?.[currentQ];
  const buzzedBy = data.buzzedBy;
  const myBuzzed = buzzedBy === myId;
  const answered = data.answered || {};

  if (!question) return null;

  return (
    <View style={rs.container}>
      <View style={rs.questionCounter}>
        <Text style={rs.questionCounterText}>{currentQ + 1}</Text>
        <Text style={rs.questionCounterSlash}>/</Text>
        <Text style={rs.questionCounterTotal}>10</Text>
      </View>

      <View style={rs.quizQuestionWrap}>
        <Text style={rs.quizQuestion}>{question.q}</Text>
      </View>

      {!buzzedBy && !data.done && (
        <Pressable
          style={({ pressed }) => [
            rs.buzzBtn,
            pressed && { opacity: 0.85 },
          ]}
          onPress={onBuzz}
        >
          <Text style={rs.buzzBtnText}>⚡ BUZZ!</Text>
        </Pressable>
      )}

      {myBuzzed && !data.done && (
        <View style={rs.quizOptions}>
          {question.options.map((opt, i) => (
            <Pressable
              key={i}
              style={({ pressed }) => [
                rs.quizOption,
                pressed && { backgroundColor: "rgba(124,58,237,0.08)" },
              ]}
              onPress={() => onAnswer(i)}
            >
              <View style={rs.quizOptionBadge}>
                <Text style={rs.quizOptionBadgeText}>
                  {String.fromCharCode(65 + i)}
                </Text>
              </View>
              <Text style={rs.quizOptionText}>{opt}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {buzzedBy && buzzedBy !== myId && !data.done && (
        <>
          <View style={rs.watchingBanner}>
            <Icon name="play" size={14} color="#A78BFA" />
            <Text style={rs.watchingText}>
              {players?.[opponentId]?.name || "Opponent"} is answering...
            </Text>
          </View>
          <View style={[rs.quizOptions, { opacity: 0.5 }]}>
            {question.options.map((opt, i) => (
              <View key={i} style={rs.quizOption}>
                <View style={[rs.quizOptionBadge, { backgroundColor: "#2D1B69" }]}>
                  <Text style={rs.quizOptionBadgeText}>
                    {String.fromCharCode(65 + i)}
                  </Text>
                </View>
                <Text style={rs.quizOptionText}>{opt}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Score in round */}
      <View style={rs.roundScoreRow}>
        <Text style={rs.roundScoreLabel}>Round Score:</Text>
        <Text style={rs.roundScoreValue}>
          {data.scores?.[myId] || 0} pts
        </Text>
      </View>
    </View>
  );
}

function AsocijacijeRound({
  data,
  myId,
  onRevealClue,
  onColumnGuess,
  onFinalGuess,
  asoGuessCol,
  setAsoGuessCol,
  input,
  setInput,
  width,
  opponentId,
  players,
}) {
  if (!data) return null;
  const columns = data.columns || [];
  const revealed = data.revealed || {};
  const guessedColumns = data.guessedColumns || {};
  const isMyTurn = data.currentPlayer === myId;
  const colWidth = (width - 48) / 2;

  return (
    <View style={rs.container}>
      <Text style={rs.roundDesc}>
        Reveal clues and guess each column's word, then the final answer
      </Text>

      <View style={rs.asoGrid}>
        {columns.map((col, ci) => {
          const colGuess = guessedColumns[ci];
          return (
            <View key={ci} style={[rs.asoColumn, { width: colWidth }]}>
              <View style={rs.asoColHeader}>
                <Text style={rs.asoColLabel}>{col.label}</Text>
                {colGuess?.correct && (
                  <Icon name="check" size={12} color="#10B981" />
                )}
              </View>
              {col.clues.map((clue, ri) => {
                const isRevealed = revealed[`${ci}_${ri}`];
                return (
                  <Pressable
                    key={ri}
                    style={[
                      rs.asoClue,
                      isRevealed && rs.asoClueRevealed,
                    ]}
                    onPress={() => {
                      if (!isRevealed && isMyTurn && !data.done) {
                        onRevealClue(ci, ri);
                      }
                    }}
                    disabled={isRevealed || !isMyTurn || data.done}
                  >
                    <Text
                      style={[
                        rs.asoClueText,
                        !isRevealed && { color: "#6D5B9E" },
                      ]}
                      numberOfLines={1}
                    >
                      {isRevealed ? clue : "???"}
                    </Text>
                  </Pressable>
                );
              })}
              {!colGuess?.correct && isMyTurn && !data.done && (
                <Pressable
                  style={rs.asoGuessBtn}
                  onPress={() => setAsoGuessCol(ci)}
                >
                  <Text style={rs.asoGuessBtnText}>Guess</Text>
                </Pressable>
              )}
              {colGuess && (
                <Text
                  style={[
                    rs.asoColAnswer,
                    { color: colGuess.correct ? "#10B981" : "#EF4444" },
                  ]}
                >
                  {colGuess.correct ? col.answer : `✗ ${colGuess.guess}`}
                </Text>
              )}
            </View>
          );
        })}
      </View>

      {/* Column guess input */}
      {asoGuessCol !== null && isMyTurn && !data.done && (
        <View style={rs.asoInputWrap}>
          <Text style={rs.asoInputLabel}>
            Guess for column {columns[asoGuessCol]?.label}:
          </Text>
          <TextInput
            style={rs.input}
            value={input}
            onChangeText={setInput}
            placeholder="Type your guess..."
            placeholderTextColor="#6D5B9E"
            autoCapitalize="words"
          />
          <View style={rs.asoInputBtns}>
            <Pressable
              style={rs.asoInputCancel}
              onPress={() => {
                setAsoGuessCol(null);
                setInput("");
              }}
            >
              <Text style={rs.asoInputCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                rs.submitBtn,
                !input.trim() && rs.submitBtnDisabled,
                pressed && { opacity: 0.85 },
                { flex: 1 },
              ]}
              onPress={() => onColumnGuess(asoGuessCol, input)}
              disabled={!input.trim()}
            >
              <Text style={rs.submitBtnText}>Submit</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Final answer */}
      {!data.guessedFinal?.correct &&
        asoGuessCol === null &&
        isMyTurn &&
        !data.done && (
          <View style={rs.asoInputWrap}>
            <Text style={rs.asoInputLabel}>Final Answer:</Text>
            {data.lastFinalGuess && (
              <Text style={{ fontSize: 12, fontWeight: "600", color: "#EF4444" }}>
                Last guess: ✗ {data.lastFinalGuess.guess}
              </Text>
            )}
            <TextInput
              style={rs.input}
              value={input}
              onChangeText={setInput}
              placeholder="What connects all four?"
              placeholderTextColor="#6D5B9E"
              autoCapitalize="words"
            />
            <Pressable
              style={({ pressed }) => [
                rs.submitBtn,
                !input.trim() && rs.submitBtnDisabled,
                pressed && { opacity: 0.85 },
              ]}
              onPress={() => onFinalGuess(input)}
              disabled={!input.trim()}
            >
              <Text style={rs.submitBtnText}>Submit Final Answer</Text>
            </Pressable>
          </View>
        )}

      {data.guessedFinal?.correct && (
        <View style={rs.submittedWrap}>
          <Text
            style={[
              rs.submittedText,
              { color: "#10B981" },
            ]}
          >
            Final: {data.guessedFinal.guess} (Correct!)
          </Text>
        </View>
      )}

      {!isMyTurn && !data.done && (
        <View style={rs.watchingBanner}>
          <Icon name="play" size={14} color="#A78BFA" />
          <Text style={rs.watchingText}>
            {players?.[opponentId]?.name || "Opponent"}'s turn...
          </Text>
        </View>
      )}
    </View>
  );
}

/* ══════════════════════════════════════════════════════════════
   STYLES
   ══════════════════════════════════════════════════════════════ */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D0221",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: "#A78BFA",
    fontWeight: "700",
    letterSpacing: 1,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#1A0A3E",
  },
  quitBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(167,139,250,0.1)",
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  headerShowTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#FBBF24",
    letterSpacing: 4,
    textTransform: "uppercase",
  },
  headerRoundBadge: {
    backgroundColor: "rgba(251,191,36,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.2)",
  },
  headerRound: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FBBF24",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },

  // Round name bar
  roundNameBar: {
    backgroundColor: "#2D1B69",
    paddingVertical: 8,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "#FBBF24",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#E9D5FF",
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  // Scoreboard
  scoreBoard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#1A0A3E",
  },
  scorePlayer: {
    alignItems: "center",
    flex: 1,
  },
  scorePlayerName: {
    fontSize: 11,
    fontWeight: "700",
    color: "#A78BFA",
    maxWidth: 90,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: "900",
    color: "#FBBF24",
    textShadowColor: "rgba(251,191,36,0.3)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  centerColumn: {
    alignItems: "center",
    gap: 4,
  },
  timerWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(251,191,36,0.1)",
    borderWidth: 2,
    borderColor: "#FBBF24",
    alignItems: "center",
    justifyContent: "center",
  },
  timerWrapUrgent: {
    borderColor: "#EF4444",
    backgroundColor: "rgba(239,68,68,0.15)",
  },
  timerText: {
    fontSize: 20,
    fontWeight: "900",
    color: "#FBBF24",
  },
  timerTextUrgent: {
    color: "#EF4444",
  },
  vsBadge: {
    backgroundColor: "#7C3AED",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  vsText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 2,
  },

  // Round dots
  roundDots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    backgroundColor: "#1A0A3E",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  roundDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(167,139,250,0.2)",
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.15)",
  },
  roundDotActive: {
    backgroundColor: "#FBBF24",
    width: 24,
    borderRadius: 5,
    borderColor: "#FBBF24",
    shadowColor: "#FBBF24",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
  },
  roundDotDone: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },

  // Game area
  gameArea: {
    flex: 1,
  },
  gameContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // Done overlay
  doneOverlay: {
    alignItems: "center",
    padding: 24,
    gap: 10,
    marginTop: 16,
    backgroundColor: "rgba(16,185,129,0.1)",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "rgba(16,185,129,0.3)",
  },
  doneText: {
    fontSize: 22,
    fontWeight: "900",
    color: "#10B981",
    letterSpacing: 1,
  },
  doneSubtext: {
    fontSize: 13,
    color: "#34D399",
    fontWeight: "600",
  },

  // Finished modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(13,2,33,0.85)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalContent: {
    width: "100%",
    backgroundColor: "#1A0A3E",
    borderRadius: 28,
    padding: 24,
    gap: 18,
    alignItems: "center",
    maxWidth: 380,
    borderWidth: 2,
    borderColor: "#FBBF24",
    shadowColor: "#FBBF24",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 16,
  },
  resultBanner: {
    alignItems: "center",
    paddingVertical: 26,
    paddingHorizontal: 32,
    borderRadius: 20,
    gap: 10,
    width: "100%",
  },
  resultTitle: {
    fontSize: 32,
    fontWeight: "900",
    color: colors.white,
    letterSpacing: 4,
  },
  finalScoreCard: {
    backgroundColor: "rgba(124,58,237,0.1)",
    borderRadius: 20,
    padding: 22,
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.2)",
  },
  finalScoreLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#A78BFA",
    textTransform: "uppercase",
    letterSpacing: 2,
    textAlign: "center",
    marginBottom: 14,
  },
  finalScoreRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  finalPlayerCol: {
    alignItems: "center",
    flex: 1,
  },
  finalPlayerName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#C4B5FD",
    maxWidth: 100,
  },
  finalPlayerScore: {
    fontSize: 42,
    fontWeight: "900",
    color: "#FBBF24",
  },
  finalVs: {
    fontSize: 13,
    fontWeight: "900",
    color: "#7C3AED",
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  primaryBtn: {
    backgroundColor: "#FBBF24",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: "100%",
    alignItems: "center",
    shadowColor: "#FBBF24",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0D0221",
    letterSpacing: 1,
  },
});

// ── Round-specific styles ──
const rs = StyleSheet.create({
  container: {
    gap: 16,
  },
  roundDesc: {
    fontSize: 13,
    fontWeight: "700",
    color: "#A78BFA",
    textAlign: "center",
    marginBottom: 2,
    letterSpacing: 0.3,
  },

  // Letter grid
  letterGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  letterTile: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: "#2D1B69",
    borderWidth: 2,
    borderColor: "#FBBF24",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FBBF24",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  letterText: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  // Input
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    backgroundColor: "#1A0A3E",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#2D1B69",
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  clearBtn: {
    marginLeft: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(167,139,250,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  charCount: {
    fontSize: 11,
    color: "#7C3AED",
    fontWeight: "700",
    textAlign: "right",
  },

  // Submit
  submitBtn: {
    backgroundColor: "#7C3AED",
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitBtnDisabled: {
    opacity: 0.35,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },

  // Submitted
  submittedWrap: {
    alignItems: "center",
    gap: 8,
    padding: 18,
    backgroundColor: "rgba(16,185,129,0.08)",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "rgba(16,185,129,0.25)",
  },
  submittedText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#34D399",
  },
  oppText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#A78BFA",
  },
  waitingText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6D5B9E",
  },
  waitWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },

  // Spectator view
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#7C3AED",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginTop: 10,
    marginBottom: 4,
  },
  watchingBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: "rgba(124,58,237,0.1)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.25)",
  },
  watchingText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#A78BFA",
  },

  // Moj Broj
  targetWrap: {
    alignItems: "center",
    padding: 20,
    backgroundColor: "#1A0A3E",
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#FBBF24",
    shadowColor: "#FBBF24",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  targetLabel: {
    fontSize: 10,
    fontWeight: "900",
    color: "#FBBF24",
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  targetNumber: {
    fontSize: 48,
    fontWeight: "900",
    color: "#FBBF24",
    textShadowColor: "rgba(251,191,36,0.3)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  numberRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  numberTile: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: "#2D1B69",
    borderWidth: 1.5,
    borderColor: "#A78BFA",
    alignItems: "center",
    justifyContent: "center",
  },
  numberTileUsed: {
    opacity: 0.2,
    borderColor: "#2D1B69",
    backgroundColor: "#0D0221",
  },
  numberText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  numberTextUsed: {
    color: "#6D5B9E",
  },

  // Expression display
  exprDisplayWrap: {
    marginTop: 4,
  },
  exprDisplay: {
    backgroundColor: "#1A0A3E",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#2D1B69",
    paddingHorizontal: 18,
    paddingVertical: 16,
    minHeight: 60,
    justifyContent: "center",
  },
  exprText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#E9D5FF",
    letterSpacing: 1,
  },
  exprResult: {
    fontSize: 24,
    fontWeight: "900",
    color: "#34D399",
    marginTop: 4,
  },

  // Operation buttons
  opsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  opBtn: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  opBtnText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  opBtnAlt: {
    backgroundColor: "#2D1B69",
    shadowColor: "#000",
    shadowOpacity: 0.1,
  },
  opBtnAltText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#C4B5FD",
  },

  // Calculator actions
  calcActions: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  calcActionBtn: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: "#1A0A3E",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#2D1B69",
  },
  calcClearBtn: {
    backgroundColor: "rgba(239,68,68,0.1)",
    borderColor: "rgba(239,68,68,0.3)",
  },
  calcClearText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#F87171",
  },

  // Skočko
  skockoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "#1A0A3E",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2D1B69",
  },
  skockoGuessSymbols: {
    flexDirection: "row",
    gap: 6,
  },
  skockoSymbol: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  skockoSymbolText: {
    fontSize: 20,
  },
  skockoFeedback: {
    flexDirection: "row",
    gap: 5,
  },
  feedbackDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 2,
  },
  skockoCurrentGuess: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginTop: 8,
  },
  skockoSlot: {
    width: 54,
    height: 54,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#7C3AED",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1A0A3E",
  },
  skockoSlotText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#6D5B9E",
  },
  skockoPicker: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 10,
    flexWrap: "wrap",
  },
  skockoPickerItem: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.15)",
  },
  skockoPickerText: {
    fontSize: 24,
  },

  // Spojnice
  spojniceWrap: {
    flexDirection: "row",
    gap: 12,
  },
  spojniceCol: {
    flex: 1,
    gap: 7,
  },
  spojniceItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#1A0A3E",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#2D1B69",
  },
  spojniceItemSelected: {
    borderColor: "#FBBF24",
    backgroundColor: "rgba(251,191,36,0.08)",
    shadowColor: "#FBBF24",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  spojniceItemText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#E9D5FF",
  },

  // Quiz - Ko Zna Zna
  questionCounter: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 2,
    marginBottom: 4,
  },
  questionCounterText: {
    fontSize: 28,
    fontWeight: "900",
    color: "#FBBF24",
  },
  questionCounterSlash: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6D5B9E",
    marginHorizontal: 2,
  },
  questionCounterTotal: {
    fontSize: 18,
    fontWeight: "700",
    color: "#6D5B9E",
  },
  quizQuestionWrap: {
    backgroundColor: "#2D1B69",
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderColor: "#7C3AED",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  quizQuestion: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 28,
  },
  buzzBtn: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FBBF24",
    paddingVertical: 22,
    borderRadius: 20,
    shadowColor: "#FBBF24",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  buzzBtnText: {
    fontSize: 24,
    fontWeight: "900",
    color: "#0D0221",
    letterSpacing: 4,
  },
  quizOptions: {
    gap: 8,
  },
  quizOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "#1A0A3E",
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#2D1B69",
  },
  quizOptionBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FBBF24",
    alignItems: "center",
    justifyContent: "center",
  },
  quizOptionBadgeText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0D0221",
  },
  quizOptionText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#E9D5FF",
    flex: 1,
  },
  roundScoreRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 18,
    backgroundColor: "rgba(251,191,36,0.06)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.15)",
  },
  roundScoreLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#A78BFA",
  },
  roundScoreValue: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FBBF24",
  },

  // Asocijacije
  asoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  asoColumn: {
    backgroundColor: "#1A0A3E",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    borderColor: "#2D1B69",
    gap: 6,
    marginBottom: 6,
  },
  asoColHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 4,
    paddingBottom: 6,
    borderBottomWidth: 2,
    borderBottomColor: "#FBBF24",
  },
  asoColLabel: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FBBF24",
    letterSpacing: 1,
  },
  asoClue: {
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "#0D0221",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.1)",
  },
  asoClueRevealed: {
    backgroundColor: "rgba(124,58,237,0.12)",
    borderColor: "rgba(124,58,237,0.25)",
  },
  asoClueText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#C4B5FD",
  },
  asoGuessBtn: {
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#7C3AED",
    marginTop: 4,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  asoGuessBtnText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.8,
  },
  asoColAnswer: {
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 4,
  },
  asoInputWrap: {
    gap: 10,
    marginTop: 10,
    backgroundColor: "#1A0A3E",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#2D1B69",
  },
  asoInputLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#C4B5FD",
  },
  asoInputBtns: {
    flexDirection: "row",
    gap: 8,
  },
  asoInputCancel: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: "#0D0221",
    borderWidth: 1,
    borderColor: "#2D1B69",
  },
  asoInputCancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#A78BFA",
  },
});

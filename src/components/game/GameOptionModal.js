import React, { useState, useEffect } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  View,
  Image,
  ImageBackground,
  TouchableOpacity,
  useWindowDimensions,
  ScrollView,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../utils/colors";
import { db } from "../../lib/firebase";
import { ref, onValue } from "firebase/database";
import { Icon } from "../ui/Icon";
import { Avatar } from "../ui/Avatar";
import { useFriends } from "../../context/FriendsContext";
import { useAuth } from "../../context/AuthContext";

/* ══════════════════════════════════════════════════════════════
   Game-specific data
   ══════════════════════════════════════════════════════════════ */

const GAME_ACHIEVEMENTS = {
  "1": [ // Battleship
    { id: "first_game", label: "First Voyage", desc: "Play your first game of Battleship", icon: "play" },
    { id: "first_win", label: "First Blood", desc: "Win your first Battleship match", icon: "trophy" },
    { id: "wins_5", label: "Fleet Commander", desc: "Win 5 matches", icon: "trophy" },
    { id: "wins_10", label: "Admiral", desc: "Win 10 matches", icon: "trophy" },
    { id: "wins_25", label: "Legend of the Sea", desc: "Win 25 matches", icon: "trophy" },
    { id: "perfect_game", label: "Perfect Storm", desc: "Win without missing a single shot", icon: "check" },
    { id: "sink_carrier", label: "Carrier Down", desc: "Sink the enemy Carrier first", icon: "play" },
    { id: "comeback", label: "Against All Odds", desc: "Win after losing 3 ships first", icon: "trophy" },
    { id: "speed_win", label: "Blitzkrieg", desc: "Win a match in under 3 minutes", icon: "clock" },
    { id: "played_10", label: "Seasoned Sailor", desc: "Play 10 matches total", icon: "play" },
    { id: "played_25", label: "Veteran Captain", desc: "Play 25 matches total", icon: "play" },
    { id: "no_miss_streak", label: "Sharpshooter", desc: "Hit 5 shots in a row", icon: "check" },
    { id: "sink_all_fast", label: "Total Annihilation", desc: "Sink all ships in under 20 moves", icon: "trophy" },
    { id: "play_friend", label: "Friendly Fire", desc: "Play a match against a friend", icon: "people" },
  ],
  "11": [ // Runbound Rivals
    { id: "first_game", label: "On Your Marks", desc: "Complete your first race", icon: "play" },
    { id: "first_win", label: "Podium Finish", desc: "Win your first race", icon: "trophy" },
    { id: "wins_5", label: "Speed Demon", desc: "Win 5 races", icon: "trophy" },
    { id: "wins_10", label: "Racing Legend", desc: "Win 10 races", icon: "trophy" },
    { id: "perfect_run", label: "Flawless Run", desc: "Complete a race without hitting any obstacles", icon: "check" },
    { id: "boost_master", label: "Boost Master", desc: "Use 50 boosts total", icon: "play" },
    { id: "shortcut", label: "Shortcut King", desc: "Discover all hidden shortcuts", icon: "search" },
    { id: "duo_record", label: "Dynamic Duo", desc: "Set a new duo time record", icon: "people" },
    { id: "played_10", label: "Track Regular", desc: "Complete 10 races", icon: "play" },
    { id: "played_25", label: "Marathon Runner", desc: "Complete 25 races", icon: "play" },
    { id: "speed_run", label: "Lightning Lap", desc: "Finish a race in under 60 seconds", icon: "clock" },
    { id: "all_tracks", label: "World Tour", desc: "Race on every available track", icon: "globe" },
    { id: "wins_25", label: "Unstoppable", desc: "Win 25 races", icon: "trophy" },
    { id: "chain_3", label: "Chain Runner", desc: "Chain 3 perfect boosts in a row", icon: "check" },
    { id: "play_friend", label: "Rivalry", desc: "Race against a friend", icon: "people" },
    { id: "comeback_win", label: "Last Second", desc: "Win after being behind the whole race", icon: "trophy" },
    { id: "no_boost", label: "Pure Skill", desc: "Win without using any boosts", icon: "check" },
    { id: "total_time", label: "Time Invested", desc: "Spend 5 hours racing total", icon: "clock" },
  ],
  "4": [ // Ludo
    { id: "first_game", label: "First Roll", desc: "Play your first Ludo match", icon: "play" },
    { id: "first_win", label: "Home Sweet Home", desc: "Win your first Ludo match", icon: "trophy" },
    { id: "wins_5", label: "Board Master", desc: "Win 5 Ludo matches", icon: "trophy" },
    { id: "wins_10", label: "Ludo Legend", desc: "Win 10 Ludo matches", icon: "trophy" },
    { id: "wins_25", label: "Unbeatable", desc: "Win 25 Ludo matches", icon: "trophy" },
    { id: "first_capture", label: "Got You!", desc: "Capture an opponent's token for the first time", icon: "play" },
    { id: "capture_10", label: "Hunter", desc: "Capture 10 opponent tokens total", icon: "play" },
    { id: "all_home", label: "Perfect Run", desc: "Get all 4 tokens home without any being captured", icon: "check" },
    { id: "triple_six", label: "Lucky Streak", desc: "Roll three 6s in a row", icon: "play" },
    { id: "comeback", label: "Never Give Up", desc: "Win after having 0 tokens out while opponent had 3+", icon: "trophy" },
    { id: "speed_win", label: "Speed Runner", desc: "Win a match in under 5 minutes", icon: "clock" },
    { id: "played_10", label: "Regular Roller", desc: "Play 10 matches total", icon: "play" },
    { id: "played_25", label: "Dice Veteran", desc: "Play 25 matches total", icon: "play" },
    { id: "play_friend", label: "Friendly Match", desc: "Play a Ludo match against a friend", icon: "people" },
  ],
  "3": [ // Slagalica
    { id: "first_game", label: "First Show", desc: "Play your first Slagalica match", icon: "play" },
    { id: "first_win", label: "Quiz Champion", desc: "Win your first Slagalica match", icon: "trophy" },
    { id: "wins_5", label: "Regular Contestant", desc: "Win 5 Slagalica matches", icon: "trophy" },
    { id: "wins_10", label: "Quiz Master", desc: "Win 10 Slagalica matches", icon: "trophy" },
    { id: "wins_25", label: "Grand Champion", desc: "Win 25 Slagalica matches", icon: "trophy" },
    { id: "perfect_word", label: "Wordsmith", desc: "Find the longest possible word in Slagalica round", icon: "check" },
    { id: "exact_number", label: "Exact Match", desc: "Hit the exact target number in Moj Broj", icon: "check" },
    { id: "skocko_first", label: "Code Breaker", desc: "Crack the Sko\u010Dko code on your first attempt", icon: "play" },
    { id: "spojnice_perfect", label: "Perfect Links", desc: "Match all 10 Spojnice pairs correctly", icon: "check" },
    { id: "quiz_streak", label: "Know It All", desc: "Answer 5 Ko zna zna questions correctly in a row", icon: "globe" },
    { id: "aso_final", label: "Association Master", desc: "Guess the final answer in Asocijacije", icon: "search" },
    { id: "speed_win", label: "Speed Round", desc: "Win a match in under 10 minutes", icon: "clock" },
    { id: "played_10", label: "TV Regular", desc: "Play 10 Slagalica matches", icon: "play" },
    { id: "played_25", label: "Studio Veteran", desc: "Play 25 Slagalica matches", icon: "play" },
    { id: "high_score", label: "High Scorer", desc: "Score 100+ points in a single match", icon: "trophy" },
    { id: "play_friend", label: "Friendly Rivalry", desc: "Play Slagalica against a friend", icon: "people" },
  ],
};

const GAME_NEWS = {
  "1": [
    { id: 1, title: "New Fleet Formation Mode", desc: "A new game mode where you can deploy ships in custom formations is coming next month. Pre-register now to get early access!", date: "Mar 15, 2026", tag: "Update" },
    { id: 2, title: "Weekend Double XP Event", desc: "All matches this weekend award double experience points. Climb the leaderboards faster and unlock achievements quicker!", date: "Mar 14, 2026", tag: "Event" },
    { id: 3, title: "Balance Patch v2.1", desc: "Submarine detection range reduced. Destroyer now has improved sonar ping radius. Carrier placement rules slightly adjusted for fairness.", date: "Mar 10, 2026", tag: "Patch" },
    { id: 4, title: "Community Tournament #3", desc: "Sign up for the third community Battleship tournament. Top 3 players receive exclusive ship skins and profile badges.", date: "Mar 8, 2026", tag: "Tournament" },
    { id: 5, title: "New Animated Ship Skins", desc: "Check out the new neon and stealth ship skin packs. Customize your fleet and stand out on the battlefield!", date: "Mar 5, 2026", tag: "Cosmetics" },
  ],
  "11": [
    { id: 1, title: "Neon Highway Track Revealed", desc: "A brand new track set on a glowing neon highway is dropping next update. Prepare for sharp turns and gravity-defying loops!", date: "Mar 15, 2026", tag: "Update" },
    { id: 2, title: "Season 4 Launch", desc: "Season 4 brings new rewards, challenges, and a fresh leaderboard. Compete for the coveted Golden Runner title!", date: "Mar 12, 2026", tag: "Season" },
    { id: 3, title: "Obstacle Remix Update", desc: "Existing tracks now feature randomized obstacle patterns each race, ensuring no two runs feel the same.", date: "Mar 9, 2026", tag: "Patch" },
    { id: 4, title: "Co-op Challenge Mode", desc: "Team up with your partner to complete timed challenges. Earn exclusive duo badges and unlock special boost particles.", date: "Mar 6, 2026", tag: "Event" },
  ],
  "4": [
    { id: 1, title: "Classic Ludo Now Live!", desc: "The timeless board game has arrived! Roll dice, move tokens, capture opponents, and race to get all four tokens home first.", date: "Mar 18, 2026", tag: "Launch" },
    { id: 2, title: "New Token Skins Available", desc: "Customize your tokens with brand new animated skins. Show off your style on the board!", date: "Mar 16, 2026", tag: "Cosmetics" },
    { id: 3, title: "Weekend Ludo Tournament", desc: "Join the first-ever Ludo tournament this weekend. Top players earn exclusive dice skins and profile frames.", date: "Mar 14, 2026", tag: "Tournament" },
    { id: 4, title: "Strategy Guide Released", desc: "Check out the official strategy guide with tips on when to play aggressively and when to defend your tokens.", date: "Mar 12, 2026", tag: "Guide" },
  ],
  "3": [
    { id: 1, title: "Slagalica Now Live!", desc: "The legendary Serbian quiz show experience has arrived! Compete across 6 mini-games testing your words, math, logic, and knowledge.", date: "Mar 18, 2026", tag: "Update" },
    { id: 2, title: "New Question Packs", desc: "Fresh trivia questions and association puzzles added to Ko zna zna and Asocijacije rounds. Over 200 new questions!", date: "Mar 16, 2026", tag: "Update" },
    { id: 3, title: "Weekend Quiz Tournament", desc: "Join the first Slagalica tournament this weekend. Top scorers earn exclusive profile badges and bragging rights!", date: "Mar 14, 2026", tag: "Tournament" },
    { id: 4, title: "Sko\u010Dko Balance Update", desc: "Mastermind round now shows clearer feedback indicators. Green for exact position, yellow for correct symbol in wrong spot.", date: "Mar 12, 2026", tag: "Patch" },
    { id: 5, title: "Season 1 Leaderboard", desc: "The first competitive season is here! Climb the ranks across all 6 mini-games and prove you're the ultimate quiz champion.", date: "Mar 10, 2026", tag: "Season" },
  ],
};

const GAME_RULES = {
  "1": {
    overview: "Battleship is a classic naval strategy game where two players compete to locate and sink each other's fleet of warships on a 10×10 grid.",
    sections: [
      {
        title: "Setup",
        rules: [
          "Each player has a 10×10 grid labeled A-J (rows) and 1-10 (columns).",
          "Place your fleet of 5 ships on the grid: Carrier (5 cells), Battleship (4 cells), Cruiser (3 cells), Submarine (3 cells), and Destroyer (2 cells).",
          "Ships can be placed horizontally or vertically, but cannot overlap or go off the grid.",
          "Once both players have placed all ships, the battle begins.",
        ],
      },
      {
        title: "Gameplay",
        rules: [
          "Players take turns firing at the opponent's grid by selecting a coordinate.",
          "The opponent must report whether the shot is a Hit (struck a ship) or Miss (hit open water).",
          "Hits are marked in red, misses in gray on your tracking board.",
          "When all cells of a ship are hit, that ship is sunk.",
          "The game continues until one player sinks all of the opponent's ships.",
        ],
      },
      {
        title: "Winning",
        rules: [
          "The first player to sink all 5 of the opponent's ships wins the match.",
          "The game tracks your hits, misses, accuracy, and time for statistics.",
        ],
      },
    ],
  },
  "11": {
    overview: "Runbound Rivals is a fast-paced co-op racing game where you and your partner sprint through obstacle courses, chain boosts, and compete for the fastest time.",
    sections: [
      {
        title: "How to Race",
        rules: [
          "Swipe to change lanes, tap to jump over obstacles, and hold to slide under barriers.",
          "Collect boost orbs scattered throughout the track to fill your boost meter.",
          "Activate boosts at the right moment for maximum speed gain.",
          "Chain perfect boosts together to trigger a combo multiplier.",
        ],
      },
      {
        title: "Co-op Mode",
        rules: [
          "Both partners race on parallel tracks simultaneously.",
          "Pass boost charges to your partner by timing your boosts together.",
          "Your combined time determines your duo score and ranking.",
          "Communication is key — coordinate jumps and slides for synchronized bonuses.",
        ],
      },
      {
        title: "Scoring",
        rules: [
          "Your finish time is the primary score. Lower is better.",
          "Bonus points for obstacle avoidance streaks and perfect boosts.",
          "Duo time records are saved to the global leaderboard.",
        ],
      },
    ],
  },
  "4": {
    overview: "Ludo is a classic board game where 2 players race to move all four of their tokens from the starting base to the home center, navigating a shared path while capturing opponents along the way.",
    sections: [
      {
        title: "Getting Started",
        rules: [
          "Each player has 4 tokens that start in their colored base.",
          "Roll a 6 to move a token from your base onto the starting square.",
          "Players take turns rolling a single die and moving one token.",
          "Tokens move clockwise around the board's outer track.",
        ],
      },
      {
        title: "Movement & Captures",
        rules: [
          "Move a token forward by the number shown on the die.",
          "Landing on an opponent's token sends it back to their base (capture).",
          "Star squares are safe — tokens on star squares cannot be captured.",
          "Capturing an opponent earns you a bonus turn.",
        ],
      },
      {
        title: "Bonus Turns & Penalties",
        rules: [
          "Rolling a 6 gives you a bonus turn after moving.",
          "Rolling three consecutive 6s forfeits your turn as a penalty.",
          "If you have no tokens on the board, you get 3 attempts to roll a 6.",
          "If no valid moves are available, your turn is automatically skipped.",
        ],
      },
      {
        title: "Winning",
        rules: [
          "After completing the outer loop, tokens enter the colored home column.",
          "Tokens must reach the center home square with an exact roll.",
          "The first player to get all 4 tokens home wins the game.",
        ],
      },
    ],
  },
  "3": {
    overview: "Slagalica is a multi-round competitive quiz game inspired by the legendary Serbian TV show. Two players battle across 6 mini-games, each awarding points. The player with the highest total score at the end wins.",
    sections: [
      {
        title: "Round 1: Slagalica (Letters)",
        rules: [
          "12 random letters are generated (balanced vowels and consonants).",
          "Both players simultaneously form the longest word they can using only the available letters.",
          "Each letter in the word scores 1 point. The longest word earns a 5-point bonus.",
          "You have 60 seconds to submit your word.",
        ],
      },
      {
        title: "Round 2: Moj Broj (Numbers)",
        rules: [
          "A 3-digit target number and 6 source numbers are generated.",
          "Use the 6 numbers with basic math operations (+, -, \u00d7, \u00f7) to reach the target.",
          "Submit your closest result within 90 seconds.",
          "Exact match = 20 pts, within 5 = 15 pts, within 10 = 10 pts, within 25 = 5 pts.",
        ],
      },
      {
        title: "Round 3: Sko\u010Dko (Mastermind)",
        rules: [
          "A secret 4-symbol combination is generated from 6 possible symbols.",
          "Each player gets up to 6 attempts to guess the combination.",
          "Green dot = correct symbol in correct position. Yellow dot = correct symbol, wrong position.",
          "Solving it earns points based on how few attempts you used.",
        ],
      },
      {
        title: "Round 4: Spojnice (Connections)",
        rules: [
          "10 pairs of items are displayed in two columns with a theme.",
          "Tap a left item, then tap its matching right item to score 2 points per correct pair.",
          "If you make a wrong match, the turn passes to your opponent for remaining pairs.",
          "You have 60 seconds total.",
        ],
      },
      {
        title: "Round 5: Ko zna zna (Quiz)",
        rules: [
          "10 general knowledge questions are asked one at a time.",
          "Buzz in first to get the chance to answer.",
          "Correct answer = +10 points. Wrong answer = -5 points.",
          "If you don't buzz, your opponent can answer instead.",
        ],
      },
      {
        title: "Round 6: Asocijacije (Associations)",
        rules: [
          "4 columns of clues are presented. Each column has 4 hidden clues.",
          "Reveal clues one at a time to figure out each column's answer word.",
          "Guess column answers for 5 points each, and the final connecting answer for 10 points.",
          "Players take turns. You have 120 seconds total.",
        ],
      },
    ],
  },
};

const GAME_GUIDE = {
  "1": {
    sections: [
      {
        title: "Ship Placement Strategy",
        tips: [
          "Spread ships across the board — clustering makes you an easy target.",
          "Place ships along edges occasionally; most players start firing in the center.",
          "Mix horizontal and vertical orientations to be unpredictable.",
          "Avoid placing ships adjacent to each other if you can.",
        ],
      },
      {
        title: "Firing Strategy",
        tips: [
          "Use a checkerboard pattern when searching — it covers the board efficiently.",
          "Once you get a hit, fire in a cross pattern (up, down, left, right) around it.",
          "After finding a ship's orientation, follow it in both directions until sunk.",
          "Prioritize areas where larger ships could still fit.",
          "Track which ships you've sunk to know what sizes remain.",
        ],
      },
      {
        title: "Advanced Tactics",
        tips: [
          "Remember the smallest unsunk ship — eliminate impossible positions.",
          "Pay attention to probability: center cells are statistically more likely to contain ships.",
          "If your opponent places predictably, exploit their patterns in future games.",
          "Time management matters — the faster you make decisions, the more pressure on your opponent.",
        ],
      },
    ],
  },
  "11": {
    sections: [
      {
        title: "Racing Basics",
        tips: [
          "Learn the track layout in your first run — don't worry about time.",
          "Focus on clean runs before going for speed. Hitting obstacles costs more time than being cautious.",
          "Master the timing of your jump. Tap slightly early for higher obstacles.",
        ],
      },
      {
        title: "Boost Mastery",
        tips: [
          "Save boosts for straight sections where you'll gain the most distance.",
          "Chain boosts by activating within 0.5 seconds of each other for a combo.",
          "Share boosts with your partner — a synchronized boost gives both players extra speed.",
        ],
      },
      {
        title: "Duo Tips",
        tips: [
          "Communicate verbally with your partner about upcoming obstacles.",
          "Take turns leading — the leader can spot hazards for the follower.",
          "Practice on the same tracks together; consistency comes from familiarity.",
        ],
      },
    ],
  },
  "4": {
    sections: [
      {
        title: "Opening Strategy",
        tips: [
          "Always bring a new token out when you roll a 6 — having multiple tokens on the board gives you more options.",
          "Don't rely on a single token to win. Spread your tokens across the board.",
          "In the early game, focus on getting all 4 tokens out of base.",
        ],
      },
      {
        title: "Capture & Defense",
        tips: [
          "Keep your tokens on safe squares (stars) whenever possible.",
          "If your opponent's token is close behind you, move that token to safety.",
          "Prioritize capturing opponents who are close to their home column.",
          "A capture gives you a bonus turn — use it strategically to get tokens out.",
        ],
      },
      {
        title: "Endgame Tips",
        tips: [
          "Once a token enters the home column, it's completely safe from capture.",
          "You need an exact roll to land in the home center — plan accordingly.",
          "If you have tokens in the home column almost home, save smaller rolls for them.",
          "Don't forget: rolling a 6 when all movable tokens are in the home column still gives a bonus turn.",
        ],
      },
    ],
  },
  "3": {
    sections: [
      {
        title: "Slagalica (Letters) Tips",
        tips: [
          "Look for common prefixes and suffixes first (UN-, RE-, -ING, -TION).",
          "Start with longer words — you can always shorten if stuck.",
          "Tap letters directly from the grid to avoid typos.",
          "Don't wait until the last second — submit early and move on.",
        ],
      },
      {
        title: "Moj Broj (Numbers) Tips",
        tips: [
          "Start with the big number closest to the target and adjust from there.",
          "Multiplication and division can get you closer faster than addition.",
          "Even if you can't hit the exact target, getting within 5 still scores well.",
          "Try working backwards from the target to find useful combinations.",
        ],
      },
      {
        title: "Skočko & Quiz Tips",
        tips: [
          "In Skočko, use process of elimination based on feedback from previous guesses.",
          "Place different symbols in each slot on your first guess to gather maximum info.",
          "In Ko zna zna, only buzz if you're confident — wrong answers cost 5 points.",
          "Speed matters in the quiz, but accuracy matters more.",
        ],
      },
      {
        title: "Spojnice & Asocijacije Tips",
        tips: [
          "In Spojnice, start with the pairs you're most confident about.",
          "One wrong match passes the turn — be careful!",
          "In Asocijacije, reveal clues strategically before guessing.",
          "Try to guess the final answer early for maximum points (10 pts).",
        ],
      },
    ],
  },
};

/* ══════════════════════════════════════════════════════════════
   Helper — format duration
   ══════════════════════════════════════════════════════════════ */
function formatDuration(ms) {
  if (!ms || ms <= 0) return "—";
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min === 0) return `${sec}s`;
  return `${min}m ${sec}s`;
}

function formatDate(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/* ══════════════════════════════════════════════════════════════
   Content renderers — each unique
   ══════════════════════════════════════════════════════════════ */

function AchievementsContent({ game }) {
  const { user } = useAuth();
  const achievements = GAME_ACHIEVEMENTS[game.id] || [];
  const total = achievements.length || game.achievements?.total || 0;
  const [unlockedSet, setUnlockedSet] = useState(new Set());

  useEffect(() => {
    if (!user?.id || !game?.id) return;
    const achieveRef = ref(db, `achievements/${user.id}/${game.id}`);
    const unsub = onValue(achieveRef, (snap) => {
      const data = snap.val() || {};
      setUnlockedSet(new Set(Object.keys(data)));
    });
    return () => unsub();
  }, [user?.id, game?.id]);

  const unlockedCount = unlockedSet.size;
  const progress = total > 0 ? unlockedCount / total : 0;

  return (
    <>
      <View style={s.sectionHeader}>
        <Icon name="trophy" size={18} color={colors.brandRed} />
        <Text style={s.sectionTitle}>Achievements</Text>
        <View style={s.badge}>
          <Text style={s.badgeText}>{unlockedCount}/{total}</Text>
        </View>
      </View>

      <View style={s.progressRow}>
        <View style={s.progressBarTrack}>
          <View style={[s.progressBarFill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
        <Text style={s.progressLabel}>{Math.round(progress * 100)}%</Text>
      </View>

      <ScrollView style={s.scrollArea} showsVerticalScrollIndicator={false}>
        {achievements.map((a) => {
          const done = unlockedSet.has(a.id);
          return (
            <View key={a.id} style={[s.achieveRow, done && s.achieveRowDone]}>
              <View style={[s.achieveIcon, done ? s.achieveIconDone : s.achieveIconLocked]}>
                <Icon name={done ? a.icon : "lock"} size={14} color={done ? colors.white : colors.gray400} />
              </View>
              <View style={s.achieveInfo}>
                <Text style={[s.achieveLabel, !done && s.achieveLabelLocked]}>{a.label}</Text>
                <Text style={s.achieveDesc}>{a.desc}</Text>
              </View>
              {done && <Icon name="check" size={14} color={colors.success} />}
            </View>
          );
        })}
      </ScrollView>
    </>
  );
}

function FriendsContent({ game }) {
  const { user } = useAuth();
  const friendsCtx = useFriends();
  const friendsList = friendsCtx?.friends || [];
  const matchHistory = friendsCtx?.matchHistory || [];
  const presenceMap = friendsCtx?.presenceMap || {};
  const [expandedFriend, setExpandedFriend] = useState(null);

  // Get matches for this game
  const gameMatches = matchHistory.filter((m) => m.gameId === game.id);

  // Build friend stats — how many times played together, wins, losses
  const friendStats = friendsList.map((friend) => {
    const matches = gameMatches.filter(
      (m) => m.players && m.players[friend.id]
    );
    const wins = matches.filter((m) => m.winnerId === user?.id).length;
    const losses = matches.filter((m) => m.loserId === user?.id).length;
    return { ...friend, matches, totalGames: matches.length, wins, losses };
  });

  return (
    <>
      <View style={s.sectionHeader}>
        <Icon name="people" size={18} color={colors.brandRed} />
        <Text style={s.sectionTitle}>Friends</Text>
        <View style={s.badge}>
          <Text style={s.badgeText}>{friendsList.length}</Text>
        </View>
      </View>

      <ScrollView style={s.scrollArea} showsVerticalScrollIndicator={false}>
        {friendStats.length === 0 ? (
          <View style={s.emptyState}>
            <Icon name="people" size={36} color={colors.gray300} />
            <Text style={s.emptyTitle}>No friends yet</Text>
            <Text style={s.emptySub}>Add friends to see your match history together.</Text>
          </View>
        ) : (
          friendStats.map((friend) => (
            <View key={friend.id}>
              <Pressable
                style={s.friendRow}
                onPress={() =>
                  setExpandedFriend(expandedFriend === friend.id ? null : friend.id)
                }
              >
                <View style={s.friendAvatarWrap}>
                  <Avatar uri={friend.avatar} size={36} />
                  <View
                    style={[
                      s.presenceDot,
                      { backgroundColor: presenceMap[friend.id]?.online ? "#22C55E" : colors.gray300 },
                    ]}
                  />
                </View>
                <View style={s.friendInfo}>
                  <Text style={s.friendName}>{friend.displayName}</Text>
                  <Text style={s.friendStat}>
                    {friend.totalGames} {friend.totalGames === 1 ? "game" : "games"} played
                    {friend.totalGames > 0
                      ? ` · ${friend.wins}W / ${friend.losses}L`
                      : ""}
                  </Text>
                </View>
                <Icon
                  name={expandedFriend === friend.id ? "close" : "play"}
                  size={12}
                  color={colors.gray400}
                />
              </Pressable>

              {expandedFriend === friend.id && (
                <View style={s.matchList}>
                  {friend.matches.length === 0 ? (
                    <Text style={s.noMatches}>No {game.title} matches yet.</Text>
                  ) : (
                    friend.matches.map((m, idx) => {
                      const won = m.winnerId === user?.id;
                      const wasQuit = m.result === "quit";
                      const quitterName = m.quitBy === user?.id ? "You" : friend.displayName;
                      const myStats = m.players?.[user?.id];
                      const oppStats = m.players?.[friend.id];
                      return (
                        <View key={m.id || idx} style={s.matchCard}>
                          <View style={s.matchHeader}>
                            <View style={[s.resultTag, won ? s.resultWin : s.resultLoss]}>
                              <Text style={s.resultTagText}>
                                {wasQuit ? "QUIT" : won ? "WIN" : "LOSS"}
                              </Text>
                            </View>
                            <Text style={s.matchDate}>{formatDate(m.endedAt)}</Text>
                          </View>
                          {wasQuit ? (
                            <View style={s.quitInfo}>
                              <Text style={s.quitInfoText}>
                                {quitterName} quit{m.quitAtTurn ? ` at turn ${m.quitAtTurn}` : ""}
                              </Text>
                            </View>
                          ) : null}
                          <View style={s.matchStats}>
                            <View style={s.matchStatCol}>
                              <Text style={s.matchStatLabel}>Your Hits</Text>
                              <Text style={s.matchStatValue}>{myStats?.hits ?? "—"}</Text>
                            </View>
                            <View style={s.matchStatCol}>
                              <Text style={s.matchStatLabel}>Your Misses</Text>
                              <Text style={s.matchStatValue}>{myStats?.misses ?? "—"}</Text>
                            </View>
                            <View style={s.matchStatCol}>
                              <Text style={s.matchStatLabel}>Opp Hits</Text>
                              <Text style={s.matchStatValue}>{oppStats?.hits ?? "—"}</Text>
                            </View>
                            <View style={s.matchStatCol}>
                              <Text style={s.matchStatLabel}>Duration</Text>
                              <Text style={s.matchStatValue}>{formatDuration(m.durationMs)}</Text>
                            </View>
                          </View>
                          {myStats && (
                            <View style={s.accuracyRow}>
                              <Text style={s.accuracyLabel}>Accuracy</Text>
                              <View style={s.accuracyBarTrack}>
                                <View
                                  style={[
                                    s.accuracyBarFill,
                                    {
                                      width: `${
                                        myStats.hits + myStats.misses > 0
                                          ? Math.round((myStats.hits / (myStats.hits + myStats.misses)) * 100)
                                          : 0
                                      }%`,
                                    },
                                  ]}
                                />
                              </View>
                              <Text style={s.accuracyValue}>
                                {myStats.hits + myStats.misses > 0
                                  ? Math.round((myStats.hits / (myStats.hits + myStats.misses)) * 100)
                                  : 0}
                                %
                              </Text>
                            </View>
                          )}
                        </View>
                      );
                    })
                  )}
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </>
  );
}

function NewsContent({ game }) {
  const news = GAME_NEWS[game.id] || GAME_NEWS["1"];

  const tagColors = {
    Update: "#3B82F6",
    Event: "#8B5CF6",
    Patch: "#F59E0B",
    Tournament: colors.brandRed,
    Cosmetics: "#EC4899",
    Season: "#10B981",
  };

  return (
    <>
      <View style={s.sectionHeader}>
        <Icon name="bell" size={18} color={colors.brandRed} />
        <Text style={s.sectionTitle}>News</Text>
      </View>
      <ScrollView style={s.scrollArea} showsVerticalScrollIndicator={false}>
        {news.map((n) => (
          <View key={n.id} style={s.newsCard}>
            <View style={s.newsTop}>
              <View style={[s.newsTag, { backgroundColor: (tagColors[n.tag] || colors.brandRed) + "18" }]}>
                <Text style={[s.newsTagText, { color: tagColors[n.tag] || colors.brandRed }]}>{n.tag}</Text>
              </View>
              <Text style={s.newsDate}>{n.date}</Text>
            </View>
            <Text style={s.newsTitle}>{n.title}</Text>
            <Text style={s.newsDesc}>{n.desc}</Text>
          </View>
        ))}
      </ScrollView>
    </>
  );
}

function GameRulesContent({ game }) {
  const rules = GAME_RULES[game.id] || GAME_RULES["1"];

  return (
    <>
      <View style={s.sectionHeader}>
        <Icon name="globe" size={18} color={colors.brandRed} />
        <Text style={s.sectionTitle}>Game Rules</Text>
      </View>
      <ScrollView style={s.scrollArea} showsVerticalScrollIndicator={false}>
        <Text style={s.rulesOverview}>{rules.overview}</Text>
        {rules.sections.map((sec, si) => (
          <View key={si} style={s.rulesSection}>
            <Text style={s.rulesSectionTitle}>{sec.title}</Text>
            {sec.rules.map((rule, ri) => (
              <View key={ri} style={s.ruleItem}>
                <View style={s.ruleNumber}>
                  <Text style={s.ruleNumberText}>{ri + 1}</Text>
                </View>
                <Text style={s.ruleBody}>{rule}</Text>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </>
  );
}

function GuideContent({ game }) {
  const guide = GAME_GUIDE[game.id] || GAME_GUIDE["1"];

  return (
    <>
      <View style={s.sectionHeader}>
        <Icon name="search" size={18} color={colors.brandRed} />
        <Text style={s.sectionTitle}>Guide</Text>
      </View>
      <ScrollView style={s.scrollArea} showsVerticalScrollIndicator={false}>
        {guide.sections.map((sec, si) => (
          <View key={si} style={s.guideSection}>
            <View style={s.guideSectionHeader}>
              <View style={s.guideSectionDot} />
              <Text style={s.guideSectionTitle}>{sec.title}</Text>
            </View>
            {sec.tips.map((tip, ti) => (
              <View key={ti} style={s.tipRow}>
                <View style={s.tipBullet}>
                  <Text style={s.tipBulletText}>{ti + 1}</Text>
                </View>
                <Text style={s.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </>
  );
}

function InfoContent({ game }) {
  const { user } = useAuth();
  const friendsCtx = useFriends();
  const matchHistory = friendsCtx?.matchHistory || [];
  const gameMatches = matchHistory.filter((m) => m.gameId === game.id);

  const totalPlayed = gameMatches.length;
  const totalWins = gameMatches.filter((m) => m.winnerId === user?.id).length;
  const totalLosses = totalPlayed - totalWins;
  const winRate = totalPlayed > 0 ? Math.round((totalWins / totalPlayed) * 100) : 0;
  const totalHits = gameMatches.reduce((sum, m) => sum + (m.players?.[user?.id]?.hits || 0), 0);
  const totalMisses = gameMatches.reduce((sum, m) => sum + (m.players?.[user?.id]?.misses || 0), 0);
  const accuracy = totalHits + totalMisses > 0 ? Math.round((totalHits / (totalHits + totalMisses)) * 100) : 0;
  const totalDuration = gameMatches.reduce((sum, m) => sum + (m.durationMs || 0), 0);

  const unlocked = game.achievements?.unlocked ?? 0;
  const total = (GAME_ACHIEVEMENTS[game.id] || []).length || game.achievements?.total || 0;

  return (
    <>
      <View style={s.sectionHeader}>
        <Icon name="globe" size={18} color={colors.brandRed} />
        <Text style={s.sectionTitle}>Info</Text>
      </View>
      <ScrollView style={s.scrollArea} showsVerticalScrollIndicator={false}>
        {/* Game details card */}
        <View style={s.infoCard}>
          <InfoRow label="Title" value={game.title} />
          <InfoRow label="Players" value={String(game.players)} />
          <InfoRow label="Genre" value={game.genre?.join(", ")} />
          <InfoRow label="Status" value={game.status === "playing" ? "Now Playing" : "Available"} />
          <InfoRow label="Achievements" value={`${unlocked} / ${total}`} last />
        </View>

        {/* Your stats card */}
        <Text style={s.infoSubtitle}>Your Statistics</Text>
        <View style={s.infoCard}>
          <InfoRow label="Games Played" value={String(totalPlayed)} />
          <InfoRow label="Wins" value={String(totalWins)} />
          <InfoRow label="Losses" value={String(totalLosses)} />
          <InfoRow label="Win Rate" value={`${winRate}%`} />
          <InfoRow label="Total Hits" value={String(totalHits)} />
          <InfoRow label="Total Misses" value={String(totalMisses)} />
          <InfoRow label="Accuracy" value={`${accuracy}%`} />
          <InfoRow label="Time Played" value={formatDuration(totalDuration)} last />
        </View>

        {/* Description */}
        <Text style={s.infoSubtitle}>About</Text>
        <Text style={s.infoDesc}>
          {game.longDescription ?? game.description}
        </Text>
      </ScrollView>
    </>
  );
}

function InfoRow({ label, value, last }) {
  return (
    <View style={[s.infoRow, !last && s.infoRowBorder]}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  );
}

/* ══════════════════════════════════════════════════════════════
   Main modal
   ══════════════════════════════════════════════════════════════ */

export function GameOptionModal({ game, option, visible, onClose }) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  if (!game || !option) return null;

  const isTiny = height < 600;
  const isSmall = height < 700;

  const renderContent = () => {
    switch (option) {
      case "Achievements":
        return <AchievementsContent game={game} />;
      case "Friends":
        return <FriendsContent game={game} />;
      case "News":
        return <NewsContent game={game} />;
      case "Game Rules":
        return <GameRulesContent game={game} />;
      case "Guide":
        return <GuideContent game={game} />;
      case "Info":
        return <InfoContent game={game} />;
      default:
        return null;
    }
  };

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
            <TouchableOpacity onPress={onClose} style={styles.backBtn} activeOpacity={0.7}>
              <Icon name="close" size={18} color={colors.white} />
            </TouchableOpacity>
            <Text style={styles.topTitle} numberOfLines={1}>{option}</Text>
            <View style={{ width: 36 }} />
          </View>

          {/* ── Hero cover ── */}
          <View style={[styles.heroWrap, { height: isTiny ? 100 : isSmall ? 130 : 160 }]}>
            <Image source={game.coverImage} style={styles.heroImage} resizeMode="cover" />
            <View style={styles.heroGradient} />
            <View style={styles.heroTitleOverlay}>
              <Text style={styles.heroTitleText} numberOfLines={1}>{game.title}</Text>
            </View>
          </View>

          {/* ── Content card ── */}
          <View style={styles.contentCard}>
            {renderContent()}
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════════
   Styles
   ══════════════════════════════════════════════════════════════ */

const styles = StyleSheet.create({
  root: { flex: 1 },
  bgTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
  },
  safe: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: "flex-start",
  },
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
  heroWrap: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 12,
  },
  heroImage: { width: "100%", height: "100%" },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  heroTitleOverlay: {
    position: "absolute",
    bottom: 10,
    left: 14,
    right: 14,
  },
  heroTitleText: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.white,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  contentCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.gray200,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
});

/* ── Content styles ── */
const s = StyleSheet.create({
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.gray900,
    letterSpacing: -0.3,
    flex: 1,
  },
  badge: {
    backgroundColor: "rgba(225,29,72,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.brandRed,
  },

  /* progress */
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  progressBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.gray200,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: colors.brandRed,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.gray500,
  },

  scrollArea: { flex: 1 },

  /* achievements */
  achieveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  achieveRowDone: {
    backgroundColor: "rgba(16,185,129,0.04)",
  },
  achieveIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  achieveIconDone: {
    backgroundColor: colors.brandRed,
  },
  achieveIconLocked: {
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  achieveInfo: { flex: 1 },
  achieveLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.gray900,
  },
  achieveLabelLocked: {
    color: colors.gray400,
  },
  achieveDesc: {
    fontSize: 11,
    color: colors.gray400,
    marginTop: 1,
  },

  /* friends */
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  friendAvatarWrap: { position: "relative" },
  presenceDot: {
    position: "absolute",
    bottom: 0,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  friendInfo: { flex: 1 },
  friendName: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.gray900,
  },
  friendStat: {
    fontSize: 11,
    color: colors.gray400,
    marginTop: 1,
  },

  /* match list */
  matchList: {
    paddingLeft: 12,
    paddingBottom: 8,
  },
  noMatches: {
    fontSize: 12,
    color: colors.gray400,
    fontStyle: "italic",
    paddingVertical: 8,
    paddingLeft: 4,
  },
  matchCard: {
    backgroundColor: colors.gray50,
    borderRadius: 12,
    padding: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  matchHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  resultTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  resultWin: { backgroundColor: "rgba(16,185,129,0.15)" },
  resultLoss: { backgroundColor: "rgba(225,29,72,0.12)" },
  resultTagText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  quitInfo: {
    backgroundColor: "rgba(245,158,11,0.08)",
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 6,
  },
  quitInfoText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#F59E0B",
  },
  matchDate: {
    fontSize: 10,
    color: colors.gray400,
  },
  matchStats: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  matchStatCol: {
    alignItems: "center",
    flex: 1,
  },
  matchStatLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: colors.gray400,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  matchStatValue: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.gray900,
    marginTop: 2,
  },
  accuracyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  accuracyLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.gray400,
  },
  accuracyBarTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.gray200,
    overflow: "hidden",
  },
  accuracyBarFill: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: colors.brandRed,
  },
  accuracyValue: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.gray700,
  },

  /* empty state */
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingTop: 40,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.gray700,
    marginTop: 4,
  },
  emptySub: {
    fontSize: 12,
    color: colors.gray400,
    textAlign: "center",
    paddingHorizontal: 20,
  },

  /* news */
  newsCard: {
    backgroundColor: colors.gray50,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  newsTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  newsTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  newsTagText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  newsDate: {
    fontSize: 10,
    color: colors.gray400,
  },
  newsTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.gray900,
    marginBottom: 4,
  },
  newsDesc: {
    fontSize: 12,
    color: colors.gray500,
    lineHeight: 18,
  },

  /* rules */
  rulesOverview: {
    fontSize: 13,
    color: colors.gray600,
    lineHeight: 20,
    marginBottom: 14,
  },
  rulesSection: {
    marginBottom: 16,
  },
  rulesSectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.gray900,
    marginBottom: 8,
  },
  ruleItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 8,
  },
  ruleNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.brandRed,
    alignItems: "center",
    justifyContent: "center",
  },
  ruleNumberText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.white,
  },
  ruleBody: {
    flex: 1,
    fontSize: 12,
    color: colors.gray700,
    lineHeight: 18,
  },

  /* guide */
  guideSection: {
    marginBottom: 18,
  },
  guideSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  guideSectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brandRed,
  },
  guideSectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.gray900,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 10,
    paddingLeft: 4,
  },
  tipBullet: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(225,29,72,0.08)",
    borderWidth: 1,
    borderColor: "rgba(225,29,72,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  tipBulletText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.brandRed,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    color: colors.gray700,
    lineHeight: 18,
  },

  /* info */
  infoCard: {
    backgroundColor: colors.gray50,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  infoSubtitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.gray900,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.gray400,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.gray900,
  },
  infoDesc: {
    fontSize: 13,
    color: colors.gray500,
    lineHeight: 20,
  },
});

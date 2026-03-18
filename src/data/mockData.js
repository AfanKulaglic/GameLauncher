const localImages = {
  battleship: require("../../assets/games/battleship.jpg"),
  runbound: require("../../assets/games/Runbound Rivals.jpg"),
  ludo: require("../../assets/games/Ludo.jpg"),
  slagalica: require("../../assets/games/slagalica.jpg"),
};

export const mockGames = [
  {
    id: "1",
    title: "Battleship",
    coverImage: localImages.battleship,
    description: "Command your fleet and outmaneuver your rival on the open seas.",
    longDescription:
      "Coordinate with your partner to locate and sink the enemy fleet before they find yours. Use sonar pings, decoys, and precise strikes to dominate the grid and secure victory.",
    genre: ["Strategy", "Board Game"],
    players: 2,
    status: "playing",
    achievements: {
      total: 14,
      unlocked: 6,
    },
  },
  {
    id: "11",
    title: "Runbound Rivals",
    coverImage: localImages.runbound,
    description: "Race together through neon tracks and shifting obstacles.",
    longDescription:
      "Sprint, slide, and boost through co-op obstacle courses with your partner. Chain perfect runs, unlock shortcuts, and set new duo records in fast-paced races.",
    genre: ["Racing", "Action"],
    players: 2,
    status: "idle",
    achievements: {
      total: 18,
      unlocked: 3,
    },
  },
  {
    id: "2",
    title: "Zelda: Breath of the Wild",
    coverImage: {
      uri: "https://images.unsplash.com/photo-1593642532842-98d0fd5ebc1a?w=400&h=600&fit=crop",
    },
    description: "Explore the wilds of Hyrule in this open-air adventure.",
    longDescription:
      "Step into a world of discovery, exploration, and adventure in The Legend of Zelda: Breath of the Wild.",
    genre: ["Action", "Adventure", "RPG"],
    players: 2,
    status: "idle",
    achievements: {
      total: 24,
      unlocked: 8,
    },
  },
  {
    id: "3",
    title: "Slagalica",
    coverImage: localImages.slagalica,
    description: "Compete across 6 quiz rounds — letters, numbers, logic, and more!",
    longDescription:
      "TV Slagalica is a multi-round competitive quiz game inspired by the legendary Serbian TV show. Two players battle across 6 mini-games: form words from random letters, solve math puzzles, crack Mastermind codes, match connections, answer trivia, and solve association puzzles. Each round awards points, and the final score crowns the winner.",
    genre: ["Quiz", "Puzzle", "Strategy"],
    players: 2,
    status: "idle",
    achievements: {
      total: 16,
      unlocked: 0,
    },
  },
  {
    id: "4",
    title: "Ludo",
    coverImage: localImages.ludo,
    description: "Roll the dice and race your tokens home!",
    longDescription:
      "A classic board game of strategy and luck. Roll the dice, move your tokens around the board, capture opponents, and be the first to get all four tokens safely home.",
    genre: ["Board Game", "Strategy"],
    players: 4,
    status: "idle",
    achievements: {
      total: 14,
      unlocked: 0,
    },
  },
];

export const mockPartners = [
  {
    id: "p1",
    username: "player123",
    displayName: "Player One",
    avatar: "https://api.dicebear.com/7.x/avataaars/png?seed=player1",
    status: "online",
    currentGame: "Super Mario Odyssey",
    friendship: "accepted",
    gamesPlayed: 12,
    hoursPlayed: 48,
  },
  {
    id: "p2",
    username: "gamerpro",
    displayName: "Pro Gamer",
    avatar: "https://api.dicebear.com/7.x/avataaars/png?seed=gamer",
    status: "in-game",
    currentGame: "Zelda: Breath of the Wild",
    friendship: "accepted",
    gamesPlayed: 8,
    hoursPlayed: 32,
  },
  {
    id: "p3",
    username: "coopking",
    displayName: "Co-op King",
    avatar: "https://api.dicebear.com/7.x/avataaars/png?seed=king",
    status: "offline",
    friendship: "accepted",
    gamesPlayed: 15,
    hoursPlayed: 62,
  },
  {
    id: "p4",
    username: "newbie_gamer",
    displayName: "NewbieGamer",
    avatar: "https://api.dicebear.com/7.x/avataaars/png?seed=newbie",
    status: "offline",
    friendship: "pending",
    gamesPlayed: 2,
    hoursPlayed: 5,
  },
];

export const mockUserStats = {
  totalGames: 15,
  totalAchievements: 47,
  achievementPoints: 675,
  hoursPlayed: 142,
  gamesCompleted: 5,
  favoriteGenre: "Action",
};

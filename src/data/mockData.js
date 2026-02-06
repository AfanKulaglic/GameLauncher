const localImages = {
  battleship: require("../../assets/games/battleship.jpg"),
  runbound: require("../../assets/games/Runbound Rivals.jpg"),
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
    title: "Xenoblade Chronicles",
    coverImage: {
      uri: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&h=600&fit=crop",
    },
    description: "Discover origins of Shulk and clash against mechanical menace.",
    genre: ["RPG", "Action"],
    players: 2,
    status: "idle",
    achievements: {
      total: 30,
      unlocked: 15,
    },
  },
  {
    id: "4",
    title: "Animal Crossing: New Horizons",
    coverImage: {
      uri: "https://images.unsplash.com/photo-1547638375-8da5e26ca054?w=400&h=600&fit=crop",
    },
    description: "Create your island paradise with a friend!",
    genre: ["Simulation", "Life Sim"],
    players: 2,
    status: "idle",
    achievements: {
      total: 20,
      unlocked: 5,
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

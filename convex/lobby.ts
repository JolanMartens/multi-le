import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ANSWERS } from "../lib/words";

const ADMIN_USER_ID = "user_39tAgbbp5T1RKVStVJOsgvU8geI";

// Helper to generate a 6-character random room code
function generateShortCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}


export const createLobby = mutation({
  args: { hostName: v.string() },
  handler: async (ctx, args) => {
    const shortCode = generateShortCode(); 
    
    await ctx.db.insert("lobbies", {
      host: args.hostName,
      status: "waiting",
      isPublic: false,
      selectedGame: "wordle",
      players: [args.hostName],
      playerStats: [{ name: args.hostName, wins: 0, bestTime: 0 }],
      startTime: 0,
      shortCode: shortCode,
    });
    
    return shortCode; 
  },
});

export const kickPlayer = mutation({
  args: { lobbyId: v.id("lobbies"), playerNameToRemove: v.string() },
  handler: async (ctx, args) => {
    const lobby = await ctx.db.get(args.lobbyId);
    if (!lobby) throw new Error("Lobby not found");

    // Just remove them from the active players list
    const updatedPlayers = lobby.players.filter((p: string) => p !== args.playerNameToRemove);
    await ctx.db.patch(args.lobbyId, { players: updatedPlayers });
  },
});

export const leaveLobby = mutation({
  args: { lobbyId: v.id("lobbies"), playerName: v.string() },
  handler: async (ctx, args) => {
    const lobby = await ctx.db.get(args.lobbyId);
    if (!lobby) return;

    // Remove the player from the active list
    const updatedPlayers = lobby.players.filter((p: string) => p !== args.playerName);

    if (updatedPlayers.length === 0) {
      // 1. Everyone left! We can safely close down the lobby.
      await ctx.db.delete(args.lobbyId);
    } else if (lobby.host === args.playerName) {
      // 2. The host left, but others are still here. Pass the crown!
      const newHost = updatedPlayers[0]; // Give it to the next person in line
      await ctx.db.patch(args.lobbyId, { 
        players: updatedPlayers,
        host: newHost 
      });
    } else {
      // 3. A regular player left. Just update the player list.
      await ctx.db.patch(args.lobbyId, { players: updatedPlayers });
    }
  },
});
// Find a lobby by its short code
export const getLobbyByCode = query({
  args: { shortCode: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("lobbies")
      .filter((q) => q.eq(q.field("shortCode"), args.shortCode))
      .first();
  },
});

// Join lobby (Updated to prevent duplicate names)
export const joinLobby = mutation({
  args: { lobbyId: v.id("lobbies"), playerName: v.string() },
  handler: async (ctx, args) => {
    const lobby = await ctx.db.get(args.lobbyId);
    if (!lobby) throw new Error("Lobby not found");
    
    // 1. Add to active players if they aren't already in it
    let updatedPlayers = lobby.players;
    if (!lobby.players.includes(args.playerName)) {
      updatedPlayers = [...lobby.players, args.playerName];
    }

    // 2. Add to stats ONLY if they don't already have a stats profile
    let updatedStats = lobby.playerStats || [];
    const hasStats = updatedStats.some((p: any) => p.name === args.playerName);
    
    if (!hasStats) {
      console.log(`Creating stats profile for ${args.playerName}`);
      updatedStats.push({ name: args.playerName, wins: 0, bestTime: 0 });
    }

    // 3. Push both updates to the database in one go
    await ctx.db.patch(args.lobbyId, {
      players: updatedPlayers,
      playerStats: updatedStats
    });
  },
});

export const startGame = mutation({
  args: { lobbyId: v.id("lobbies") },
  handler: async (ctx, args) => {
    const lobby = await ctx.db.get(args.lobbyId);
    if (!lobby) throw new Error("Lobby not found");

    // Fetch all APPROVED reported words
    const reportedWords = await ctx.db
      .query("reportedWords")
      .filter((q) => q.eq(q.field("approved"), true))
      .collect();

    // Create a Set of bad words for super fast lookups
    const badWordsSet = new Set(reportedWords.map(r => r.word));

    // Filter the ANSWERS array to remove the bad words
    const safeWords = ANSWERS.filter(word => !badWordsSet.has(word));

    // Fallback: If somehow EVERY word is reported, use the original array so the game doesn't crash
    const wordPool = safeWords.length > 0 ? safeWords : ANSWERS;

    // Pick a random word from the safe pool
    const randomWord = wordPool[Math.floor(Math.random() * wordPool.length)];

    await ctx.db.patch(args.lobbyId, {
      status: "playing",
      startTime: Date.now(), 
      targetWord: randomWord, 
      scores: [], 
    });
  },
});

// Let the host change the game
export const updateSelectedGame = mutation({
  args: { lobbyId: v.id("lobbies"), game: v.string() },
  handler: async (ctx, args) => {
    const lobby = await ctx.db.get(args.lobbyId);
    if (!lobby) throw new Error("Lobby not found");

    await ctx.db.patch(args.lobbyId, { selectedGame: args.game });
  },
});

// Updated submitScore to handle wins, fails, and best times
export const submitScore = mutation({
  args: { lobbyId: v.id("lobbies"), playerName: v.string(), guesses: v.number(), solved: v.boolean() },
  handler: async (ctx, args) => {
    const lobby = await ctx.db.get(args.lobbyId);
    if (!lobby || !lobby.startTime) return;

    const timeMs = Date.now() - lobby.startTime;
    const currentScores = lobby.scores || [];
    let stats = lobby.playerStats || [];

    if (!currentScores.find((s: any) => s.playerName === args.playerName)) {
      currentScores.push({ playerName: args.playerName, timeMs, guesses: args.guesses, solved: args.solved });
      
      // Sort: Solved games first, then by time
      currentScores.sort((a: any, b: any) => {
        if (a.solved && !b.solved) return -1;
        if (!a.solved && b.solved) return 1;
        return a.timeMs - b.timeMs;
      });

      // Update their personal best time if they solved it!
      if (args.solved) {
        stats = stats.map((p: any) => {
          if (p.name === args.playerName) {
            const best = p.bestTime === 0 ? timeMs : Math.min(p.bestTime, timeMs);
            return { ...p, bestTime: best };
          }
          return p;
        });
      }

      await ctx.db.patch(args.lobbyId, { scores: currentScores, playerStats: stats });
    }
  },
});

// Ends the round, gives the winner a point, and sends everyone to the lobby
export const endRound = mutation({
  args: { lobbyId: v.id("lobbies") },
  handler: async (ctx, args) => {
    const lobby = await ctx.db.get(args.lobbyId);
    if (!lobby) return;

    let stats = lobby.playerStats || [];
    
    // Find the speedrun winner (fastest time who solved it)
    const solvers = lobby.scores.filter((s: any) => s.solved);
    if (solvers.length > 0) {
      const winnerName = solvers[0].playerName;
      stats = stats.map((p: any) => p.name === winnerName ? { ...p, wins: p.wins + 1 } : p);
    }

    // Reset the lobby for the next game
    await ctx.db.patch(args.lobbyId, {
      status: "waiting",
      playerStats: stats,
      scores: [], 
    });
  }
});


export const getPublicLobbies = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("lobbies")
      .filter((q) => q.and(q.eq(q.field("isPublic"), true), q.eq(q.field("status"), "waiting")))
      .collect();
  },
});

export const changeIsPublic = mutation({
  args: { lobbyId: v.id("lobbies"), isPublic: v.boolean() },
  handler: async (ctx, args) => {
    const lobby = await ctx.db.get(args.lobbyId);
    if (!lobby) throw new Error("Lobby not found");
    await ctx.db.patch(args.lobbyId, { isPublic: args.isPublic });
  },
});

export const reportWord = mutation({
  args: { reporter: v.string(), reportedWord: v.string() },
  handler: async (ctx, args) => {
    
    await ctx.db.insert("reportedWords", {
      reporter: args.reporter,
      word: args.reportedWord,
      approved: false,
    });
    
  },
});

export const getPendingReportedWords = query({
  handler: async (ctx) => {
    // Fetch all words that haven't been approved yet
    return await ctx.db
      .query("reportedWords")
      .filter((q) => q.eq(q.field("approved"), false))
      .collect();
  },
});

export const approveReportedWord = mutation({
  args: { reportId: v.id("reportedWords") },
  handler: async (ctx, args) => {
    // Grab the user's identity token
    const identity = await ctx.auth.getUserIdentity();

    // Check if they are logged in at all
    if (!identity) {
      throw new Error("Unauthenticated: You must be logged in.");
    }

    // Check if their ID matches the Admin ID
    if (identity.subject !== ADMIN_USER_ID) {
      throw new Error("Unauthorized: Only admins can perform this action.");
    }

    // If they pass the checks, approve the word!
    await ctx.db.patch(args.reportId, { approved: true });
  },
});

export const removeReportWord = mutation({
  args: { reportId: v.id("reportedWords") },
  handler: async (ctx, args) => {
    // Grab the user's identity token
    const identity = await ctx.auth.getUserIdentity();

    // Check if they are logged in at all
    if (!identity) {
      throw new Error("Unauthenticated: You must be logged in.");
    }

    // Check if their ID matches the Admin ID
    if (identity.subject !== ADMIN_USER_ID) {
      throw new Error("Unauthorized: Only admins can perform this action.");
    }

    // If they pass the checks, approve the word!
    await ctx.db.delete(args.reportId);
  },
});

export const getBannedWords = query({
  handler: async (ctx) => {
    // Fetch all words that have been approved (i.e., banned)
    return await ctx.db
      .query("reportedWords")
      .filter((q) => q.eq(q.field("approved"), true))
      .collect();
  },
});
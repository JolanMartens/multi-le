import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ANSWERS } from "../lib/words";

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

    if (lobby.host === args.playerName) {
      await ctx.db.patch(args.lobbyId, { status: "canceled" });
    } else {
      const updatedPlayers = lobby.players.filter((p: string) => p !== args.playerName);
      await ctx.db.patch(args.lobbyId, { players: updatedPlayers });
    }
  },
});

// New Query: Find a lobby by its short code
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
    
    // Only add the player if they aren't already in the list
    if (!lobby.players.includes(args.playerName)) {
      await ctx.db.patch(args.lobbyId, {
        players: [...lobby.players, args.playerName]
      });
    }
    if (!lobby.players.includes(args.playerName)) {
      const stats = lobby.playerStats || [];
      stats.push({ name: args.playerName, wins: 0, bestTime: 0 }); // NEW: Add new player to stats
      
      await ctx.db.patch(args.lobbyId, {
        players: [...lobby.players, args.playerName],
        playerStats: stats
      });
    }
  },
});

export const startGame = mutation({
  args: { lobbyId: v.id("lobbies") },
  handler: async (ctx, args) => {
    const lobby = await ctx.db.get(args.lobbyId);
    if (!lobby) throw new Error("Lobby not found");

    // Pick a random word from your answers array!
    const randomWord = ANSWERS[Math.floor(Math.random() * ANSWERS.length)];

    await ctx.db.patch(args.lobbyId, {
      status: "playing",
      startTime: Date.now(), 
      targetWord: randomWord, // Store the answer secretly on the server
      scores: [], // Reset the scoreboard!
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
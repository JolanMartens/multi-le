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

// New mutation to record a player's finish time
export const submitScore = mutation({
  args: { 
    lobbyId: v.id("lobbies"), 
    playerName: v.string(), 
    guesses: v.number() 
  },
  handler: async (ctx, args) => {
    const lobby = await ctx.db.get(args.lobbyId);
    if (!lobby || !lobby.startTime) return;

    // Calculate exactly how many milliseconds it took them
    const timeMs = Date.now() - lobby.startTime;
    const currentScores = lobby.scores || [];

    // Make sure they haven't already submitted a score
    if (!currentScores.find((s: any) => s.playerName === args.playerName)) {
      currentScores.push({
        playerName: args.playerName,
        timeMs: timeMs,
        guesses: args.guesses
      });

      // Sort the scoreboard so the fastest times are always at the top!
      currentScores.sort((a: any, b: any) => a.timeMs - b.timeMs);

      await ctx.db.patch(args.lobbyId, { scores: currentScores });
    }
  },
});
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Helper to generate a 6-character random room code
function generateShortCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export const createLobby = mutation({
  args: { hostName: v.string() },
  handler: async (ctx, args) => {
    const shortCode = generateShortCode(); // e.g., "X9A2BF"
    
    await ctx.db.insert("lobbies", {
      host: args.hostName,
      status: "waiting",
      players: [args.hostName],
      kickedPlayers: [],
      startTime: 0,
      shortCode: shortCode, // Save the code to the database!
    });
    
    return shortCode; // Return the SHORT code to the frontend, not the long ID
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

export const kickPlayer = mutation({
  args: { lobbyId: v.id("lobbies"), playerNameToRemove: v.string() },
  handler: async (ctx, args) => {
    const lobby = await ctx.db.get(args.lobbyId);
    if (!lobby) throw new Error("Lobby not found");

    const updatedPlayers = lobby.players.filter((p: string) => p !== args.playerNameToRemove);
    // Add them to the kicked list
    const updatedKicked = [...(lobby.kickedPlayers || []), args.playerNameToRemove];

    await ctx.db.patch(args.lobbyId, { 
      players: updatedPlayers,
      kickedPlayers: updatedKicked 
    });
  },
});

export const leaveLobby = mutation({
  args: { lobbyId: v.id("lobbies"), playerName: v.string() },
  handler: async (ctx, args) => {
    const lobby = await ctx.db.get(args.lobbyId);
    if (!lobby) return;

    if (lobby.host === args.playerName) {
      // If the host leaves, shut down the whole lobby
      await ctx.db.patch(args.lobbyId, { status: "canceled" });
    } else {
      // If a regular player leaves, remove them and prevent auto-rejoin
      const updatedPlayers = lobby.players.filter((p: string) => p !== args.playerName);
      const updatedKicked = [...(lobby.kickedPlayers || []), args.playerName];
      
      await ctx.db.patch(args.lobbyId, { 
        players: updatedPlayers,
        kickedPlayers: updatedKicked
      });
    }
  },
});
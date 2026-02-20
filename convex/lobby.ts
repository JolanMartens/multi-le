import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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



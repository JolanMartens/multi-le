import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// 1. Function to create a game lobby
export const createLobby = mutation({
  args: { hostName: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("lobbies", {
      host: args.hostName,
      status: "waiting", // waiting, playing, finished
      players: [args.hostName],
      startTime: 0
    });
  },
});

// 2. Function to join a lobby (Real-time!)
export const joinLobby = mutation({
  args: { lobbyId: v.id("lobbies"), playerName: v.string() },
  handler: async (ctx, args) => {
    const lobby = await ctx.db.get(args.lobbyId);
    if (!lobby) throw new Error("Lobby not found");
    
    // Add player to the array
    await ctx.db.patch(args.lobbyId, {
      players: [...lobby.players, args.playerName]
    });
  },
});

// 3. Function to get lobby details (Auto-updates frontend!)
export const getLobby = query({
  args: { lobbyId: v.id("lobbies") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.lobbyId);
  },
});
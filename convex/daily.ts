// convex/daily.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ANSWERS } from "../lib/words";

// Helper: Get YYYY-MM-DD
function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

// 1. Get or Create Today's Word
export const getOrCreateTodayWord = mutation({
  handler: async (ctx) => {
    const date = getTodayStr();
    
    // Check if a word is already saved for today
    const existingWord = await ctx.db
      .query("dailyWords")
      .filter((q) => q.eq(q.field("date"), date))
      .first();

    if (existingWord) return existingWord.word;

    // If no word exists, pick a random one deterministically based on the date
    let hash = 0;
    for (let i = 0; i < date.length; i++) {
      hash = date.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % ANSWERS.length;
    const newWord = ANSWERS[index];

    // Save it to the database so everyone gets this exact word today
    await ctx.db.insert("dailyWords", { date, word: newWord });
    
    return newWord;
  },
});

// 2. Submit the Score
export const submitDailyScore = mutation({
  args: { 
    playerName: v.string(), 
    guesses: v.array(v.string()), 
    solved: v.boolean(),
    timeMs: v.number()
  },
  handler: async (ctx, args) => {
    const date = getTodayStr();
    
    // Prevent double submissions
    const existing = await ctx.db
      .query("dailyScores")
      .filter((q) => q.and(
        q.eq(q.field("playerName"), args.playerName),
        q.eq(q.field("date"), date)
      ))
      .first();

    if (existing) return;

    // Get the target word to save with the score for easy history viewing later
    const dailyWordRecord = await ctx.db
      .query("dailyWords")
      .filter((q) => q.eq(q.field("date"), date))
      .first();

    await ctx.db.insert("dailyScores", {
      playerName: args.playerName,
      date: date,
      guesses: args.guesses,
      solved: args.solved,
      timeMs: args.timeMs,
      targetWord: dailyWordRecord?.word || "error", 
    });
  },
});

// 3. Get the Leaderboard
export const getTodayLeaderboard = query({
  handler: async (ctx) => {
    const date = getTodayStr();
    const scores = await ctx.db
      .query("dailyScores")
      .filter((q) => q.eq(q.field("date"), date))
      .collect();

    // Sort: Solvers first, then fewest guesses, then fastest time
    return scores.sort((a, b) => {
      if (a.solved && !b.solved) return -1;
      if (!a.solved && b.solved) return 1;
      if (a.guesses.length !== b.guesses.length) return a.guesses.length - b.guesses.length;
      return a.timeMs - b.timeMs;
    });
  },
});

// 4. Check if the user already played
export const getUserTodayScore = query({
  args: { playerName: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!args.playerName) return null;
    const date = getTodayStr();
    return await ctx.db
      .query("dailyScores")
      .filter((q) => q.and(
        q.eq(q.field("playerName"), args.playerName),
        q.eq(q.field("date"), date)
      ))
      .first();
  },
});
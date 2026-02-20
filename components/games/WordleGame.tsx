"use client";
import { Button } from "@/components/ui/button";
import { useWordle } from "@/hooks/useWordle";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";

// Hardcoded solution for now! We will sync this to Convex later.
const SOLUTION = "react";

export default function WordleGame({
  lobby,
  onLeave,
}: {
  lobby: any;
  onLeave: () => void;
}) {
  const { user } = useUser();
  const submitScore = useMutation(api.lobby.submitScore);

  // Pass the server-generated target word to the hook!
  const { guesses, currentGuess, isGameOver, isGameWon, errorMsg } = useWordle(
    lobby.targetWord,
  );

  // When the game is won, automatically send their score to Convex
  useEffect(() => {
    if (isGameWon && user) {
      submitScore({
        lobbyId: lobby._id,
        playerName: user.firstName || "Anonymous",
        guesses: guesses.length,
      });
    }
  }, [isGameWon, user, lobby._id, submitScore, guesses.length]);

  // Helper to figure out the box color...
  const getLetterColor = (letter: string, index: number) => {
    // Make sure we compare against the lobby.targetWord!
    if (lobby.targetWord[index] === letter)
      return "bg-green-500 text-white border-green-500";
    if (lobby.targetWord.includes(letter))
      return "bg-yellow-500 text-white border-yellow-500";
    return "bg-zinc-500 text-white border-zinc-500";
  };

  return (
    <div className="flex flex-col items-center gap-8 p-10 mt-10 w-full focus:outline-none">
      <div className="flex justify-between w-full max-w-md items-center">
        <h1 className="text-3xl font-bold tracking-tight">
          Wordle<span className="text-primary">Run</span>
        </h1>
        <Button variant="destructive" size="sm" onClick={onLeave}>
          Quit
        </Button>
      </div>

      {/* Game Over Message */}
      {isGameOver && (
        <div className="text-xl font-bold text-center animate-bounce">
          {isGameWon
            ? "🎉 You got it! Waiting for others..."
            : `💀 Game Over! The word was ${SOLUTION.toUpperCase()}`}
        </div>
      )}

      {/* Error Message (e.g., "Not in word list") */}
      {errorMsg && (
        <div className="text-red-500 font-bold bg-red-100 px-4 py-2 rounded-md animate-pulse">
          {errorMsg}
        </div>
      )}

      {/* Live Scoreboard */}
      {lobby.scores && lobby.scores.length > 0 && (
        <div className="w-full max-w-md bg-secondary/30 p-4 rounded-lg border">
          <h2 className="text-lg font-bold mb-2">Live Leaderboard 🏆</h2>
          <div className="flex flex-col gap-1">
            {lobby.scores.map((score: any, index: number) => (
              <div
                key={index}
                className="flex justify-between items-center bg-background p-2 rounded border-sm"
              >
                <span className="font-semibold">
                  {index === 0
                    ? "🥇"
                    : index === 1
                      ? "🥈"
                      : index === 2
                        ? "🥉"
                        : `${index + 1}.`}{" "}
                  {score.playerName}
                </span>
                <span className="text-muted-foreground text-sm">
                  {score.guesses} guesses • {(score.timeMs / 1000).toFixed(2)}s
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* The Wordle Grid */}
      <div className="grid grid-rows-6 gap-2">
        {Array.from({ length: 6 }).map((_, rowIndex) => {
          // Are we rendering a past guess, the current active typing row, or a future blank row?
          const isCurrentRow = rowIndex === guesses.length;
          const isPastRow = rowIndex < guesses.length;
          const rowWord = isPastRow
            ? guesses[rowIndex]
            : isCurrentRow
              ? currentGuess
              : "";

          return (
            <div key={rowIndex} className="grid grid-cols-5 gap-2">
              {Array.from({ length: 5 }).map((_, colIndex) => {
                const letter = rowWord[colIndex] || "";

                // Only color the box if the row has been submitted (isPastRow)
                const colorClass = isPastRow
                  ? getLetterColor(letter, colIndex)
                  : "border-border bg-background text-foreground";

                // Add a border highlight if this box currently has a typed letter in the active row
                const activeClass =
                  isCurrentRow && letter ? "border-primary" : "";

                return (
                  <div
                    key={colIndex}
                    className={`w-14 h-14 sm:w-16 sm:h-16 border-2 flex items-center justify-center text-3xl font-bold uppercase transition-all duration-300 ${colorClass} ${activeClass}`}
                  >
                    {letter}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

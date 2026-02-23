// app/daily/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useWordle } from "@/hooks/useWordle";
import Keyboard from "@/components/games/Keyboard"; // Adjust path if needed

export default function DailyPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const getOrCreateTodayWord = useMutation(api.daily.getOrCreateTodayWord);
  const submitDailyScore = useMutation(api.daily.submitDailyScore);

  const [targetWord, setTargetWord] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [timeStr, setTimeStr] = useState("0.0s");

  // Fetch or initialize the daily word when the page loads
  useEffect(() => {
    if (isLoaded && user) {
      getOrCreateTodayWord().then((word) => {
        setTargetWord(word);
        setStartTime(Date.now());
      });
    } else if (isLoaded && !user) {
      router.push("/"); // Boot them if they aren't logged in
    }
  }, [isLoaded, user, getOrCreateTodayWord, router]);

  // Hook into your Wordle logic
  const { guesses, currentGuess, isGameOver, isGameWon, errorMsg, onKeyPress } =
    useWordle(targetWord || "     "); // Pass dummy spaces until word loads

  // Timer logic
  useEffect(() => {
    if (isGameOver || !startTime) return;
    const interval = setInterval(() => {
      setTimeStr(((Date.now() - startTime) / 1000).toFixed(1) + "s");
    }, 100);
    return () => clearInterval(interval);
  }, [startTime, isGameOver]);

  // Submit score when game finishes
  useEffect(() => {
    if (isGameOver && user && startTime) {
      submitDailyScore({
        playerName: user.username || user.id,
        guesses: guesses, // Now passing the actual array of guesses
        solved: isGameWon,
        timeMs: Date.now() - startTime,
      }).then(() => {
        // Send them back to the homepage after 3 seconds so they can see the leaderboard
        setTimeout(() => router.push("/"), 5000);
      });
    }
  }, [isGameOver]);

  // Reusing your row color algorithm
  const getRowColors = (guess: string, target: string) => {
    const colors = Array(5).fill("bg-zinc-500 text-white border-zinc-500");
    if (!guess || !target) return colors;

    const targetLetters: (string | null)[] = target.split("");
    const guessLetters: (string | null)[] = guess.split("");

    for (let i = 0; i < 5; i++) {
      if (guessLetters[i] === targetLetters[i]) {
        colors[i] = "bg-green-500 text-white border-green-500";
        targetLetters[i] = null;
        guessLetters[i] = null;
      }
    }

    for (let i = 0; i < 5; i++) {
      if (guessLetters[i] !== null) {
        const targetIdx = targetLetters.indexOf(guessLetters[i]);
        if (targetIdx !== -1) {
          colors[i] = "bg-yellow-500 text-white border-yellow-500";
          targetLetters[targetIdx] = null;
        }
      }
    }
    return colors;
  };

  if (!targetWord) {
    return (
      <div className="flex justify-center items-center min-h-screen font-bold text-2xl animate-pulse">
        Loading Daily Word...
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 p-4 sm:p-10 mt-2 sm:mt-5 w-full focus:outline-none min-h-screen bg-background">
      <div className="flex justify-between w-full max-w-md items-center">
        <h1 className="text-3xl font-bold tracking-tight">Daily Wordle</h1>
        <div className="text-2xl font-mono font-bold text-primary">
          {timeStr}
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push("/")}>
          Back
        </Button>
      </div>

      {isGameOver && (
        <div className="text-xl font-bold text-center animate-bounce">
          {isGameWon
            ? "You got it! Saving score..."
            : `Game Over! The word was ${targetWord.toUpperCase()}`}
        </div>
      )}

      {/* The Wordle Grid */}
      <div className="grid grid-rows-6 gap-2">
        {Array.from({ length: 6 }).map((_, rowIndex) => {
          const isCurrentRow = rowIndex === guesses.length;
          const isPastRow = rowIndex < guesses.length;
          const rowWord = isPastRow
            ? guesses[rowIndex]
            : isCurrentRow
              ? currentGuess
              : "";
          const rowColors = isPastRow ? getRowColors(rowWord, targetWord) : [];

          return (
            <div key={rowIndex} className="grid grid-cols-5 gap-2">
              {Array.from({ length: 5 }).map((_, colIndex) => {
                const letter = rowWord[colIndex] || "";
                const colorClass = isPastRow
                  ? rowColors[colIndex]
                  : "border-border bg-background text-foreground";
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

      <Keyboard
        onKeyPress={onKeyPress}
        guesses={guesses}
        targetWord={targetWord}
      />
    </div>
  );
}

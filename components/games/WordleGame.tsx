"use client";
import { Button } from "@/components/ui/button";
import { useWordle } from "@/hooks/useWordle";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Keyboard from "./Keyboard";

export default function WordleGame({
  lobby,
  onLeave,
}: {
  lobby: any;
  onLeave: () => void;
}) {
  const { user } = useUser();
  const submitScore = useMutation(api.lobby.submitScore);
  const endRound = useMutation(api.lobby.endRound);
  const reportWord = useMutation(api.lobby.reportWord);

  // 3. Extract onKeyPress!
  const { guesses, currentGuess, isGameOver, isGameWon, errorMsg, onKeyPress } =
    useWordle(lobby.targetWord);

  // State to track if the word has been reported
  const [reported, setReported] = useState(false);

  const [showReportPopup, setShowReportPopup] = useState(false);
  const [reportProgress, setReportProgress] = useState(100);

  useEffect(() => {
    if (isGameOver && !reported) {
      setShowReportPopup(true);
      setReportProgress(100);

      const duration = 10000; // 10 seconds
      const startTime = Date.now();

      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remainingPercentage = Math.max(
          0,
          100 - (elapsed / duration) * 100,
        );

        setReportProgress(remainingPercentage);

        // Hide popup and clear interval when time is up
        if (elapsed >= duration) {
          setShowReportPopup(false);
          clearInterval(interval);
        }
      }, 16); // ~60fps for a silky smooth progress bar

      return () => clearInterval(interval);
    }
  }, [isGameOver, reported]);

  // 4. The Live Timer State
  const [timeStr, setTimeStr] = useState("0.0s");

  useEffect(() => {
    if (isGameOver) return; // Stop timer when they finish
    const interval = setInterval(() => {
      setTimeStr(((Date.now() - lobby.startTime) / 1000).toFixed(1) + "s");
    }, 100);
    return () => clearInterval(interval);
  }, [lobby.startTime, isGameOver]);

  // 5. Submit Score on Game Over (Win OR Fail)
  useEffect(() => {
    if (isGameOver && user) {
      submitScore({
        lobbyId: lobby._id,
        playerName: user.username || user.id,
        guesses: guesses.length,
        solved: isGameWon, // Let the database know if they failed
      });
    }
  }, [isGameOver]);

  const isHost = lobby.host === (user?.username || user?.id);

  // Helper to figure out the box color...
  // NEW: Two-pass algorithm for correct Wordle coloring
  const getRowColors = (guess: string, target: string) => {
    const colors = Array(5).fill("bg-zinc-500 text-white border-zinc-500"); // Default to gray
    if (!guess) return colors;

    const targetLetters: (string | null)[] = target.split("");
    const guessLetters: (string | null)[] = guess.split("");

    // Pass 1: Find all Greens
    for (let i = 0; i < 5; i++) {
      if (guessLetters[i] === targetLetters[i]) {
        colors[i] = "bg-green-500 text-white border-green-500";
        targetLetters[i] = null; // Remove from available target letters
        guessLetters[i] = null; // Mark guess letter as resolved
      }
    }

    // Pass 2: Find Yellows from the remaining letters
    for (let i = 0; i < 5; i++) {
      if (guessLetters[i] !== null) {
        const targetIdx = targetLetters.indexOf(guessLetters[i]);
        if (targetIdx !== -1) {
          colors[i] = "bg-yellow-500 text-white border-yellow-500";
          targetLetters[targetIdx] = null; // Consume the available letter
        }
      }
    }

    return colors;
  };

  return (
    <div className="flex flex-col items-center gap-6 p-4 sm:p-10 mt-2 sm:mt-5 w-full focus:outline-none">
      <div className="flex justify-between w-full max-w-md items-center">
        <h1 className="text-3xl font-bold tracking-tight">
          Wordle<span className="text-primary">Run</span>
        </h1>

        {/* 7. The Live Timer UI */}
        <div className="text-2xl font-mono font-bold text-primary">
          {timeStr}
        </div>

        <Button variant="destructive" size="sm" onClick={onLeave}>
          Quit
        </Button>
      </div>

      {isGameOver && (
        <div className="text-xl font-bold text-center animate-bounce">
          {isGameWon
            ? "You got it!"
            : `Game Over! The word was ${lobby.targetWord.toUpperCase()}`}
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

          // NEW: Get the colors for the whole row at once!
          const rowColors = isPastRow
            ? getRowColors(rowWord, lobby.targetWord)
            : [];

          return (
            <div key={rowIndex} className="grid grid-cols-5 gap-2">
              {Array.from({ length: 5 }).map((_, colIndex) => {
                const letter = rowWord[colIndex] || "";

                // NEW: Read the color from our rowColors array
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

      {errorMsg && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-60 max-w-md px-4 text-center">
          <Alert className="font-bold bg-red-200 px-4 py-2 rounded-md animate-pulse shadow-lg border border-red-400">
            <AlertDescription className="text-red-500">
              {errorMsg}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Render the Keyboard */}
      <Keyboard
        onKeyPress={onKeyPress}
        guesses={guesses}
        targetWord={lobby.targetWord}
      />

      {showReportPopup && !reported && (
        <div className="fixed bottom-6 right-6 z-50 w-64 bg-background border shadow-xl rounded-lg overflow-hidden animate-in slide-in-from-bottom-8 fade-in duration-300">
          <div className="p-4 flex flex-col gap-2">
            <p className="text-sm font-medium text-muted-foreground text-center">
              Notice a problem with this word?
            </p>
            <Button
              className="w-full font-bold hover:bg-red-500"
              variant="destructive"
              onClick={async () => {
                if (!user) return;
                await reportWord({
                  reporter: user.username || user.id,
                  reportedWord: lobby.targetWord,
                });
                setReported(true);
                setShowReportPopup(false); // Hide immediately on click
              }}
            >
              Report Word
            </Button>
          </div>
          {/* The Timer Bar */}
          <div className="h-1.5 w-full bg-secondary">
            <div
              className="h-full bg-primary transition-none"
              style={{ width: `${reportProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Host Control: End Round Manually */}
      {isHost && (
        <Button
          className="w-full max-w-md mt-4 font-bold"
          size="lg"
          onClick={() => endRound({ lobbyId: lobby._id })}
        >
          End Round & Return to Lobby
        </Button>
      )}
      <div className="fixed right-4 top-30 w-90 hidden xl:block">
        {lobby.scores && lobby.scores.length > 0 && (
          <div className="w-full max-w-md bg-secondary/30 p-4 rounded-lg border">
            <h2 className="text-lg font-bold mb-2">Live Leaderboard</h2>
            <div className="flex flex-col gap-1">
              {lobby.scores.map((score: any, index: number) => (
                <div
                  key={index}
                  className="flex justify-between items-center bg-background p-2 rounded border-sm"
                >
                  <span className="font-semibold flex">
                    {index === 0 ? (
                      <p className="text-yellow-500 w-10">1st</p>
                    ) : index === 1 ? (
                      <p className="text-zinc-400 w-10">2nd</p>
                    ) : index === 2 ? (
                      <p className="text-amber-800 w-10">3rd</p>
                    ) : (
                      <p className="text-muted-foreground w-10">
                        {index + 1}th
                      </p>
                    )}{" "}
                    {score.playerName}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    {score.solved
                      ? `${score.guesses} guesses • ${(score.timeMs / 1000).toFixed(2)}s`
                      : "Failed"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
